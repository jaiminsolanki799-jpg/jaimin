#!/usr/bin/env python3
"""Fetch RSS/Atom feeds listed in sources.json and write one JSON file per dashboard.

Uses only the Python standard library so it runs anywhere (GitHub Actions,
Google Colab, a laptop) without installing packages.

Usage:
    python scripts/fetch_news.py                 # refresh every dashboard
    python scripts/fetch_news.py et-prime        # refresh one dashboard
    python scripts/fetch_news.py --dry-run       # fetch, report, don't write

Each run merges the freshly fetched items into the existing data file, so the
JSON in the repository becomes a rolling archive (bounded by retention_days and
max_items in sources.json).
"""

from __future__ import annotations

import hashlib
import html
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCES_FILE = ROOT / "sources.json"
DATA_DIR = ROOT / "data"

USER_AGENT = (
    "Mozilla/5.0 (compatible; jaimin-news-tracker/1.0; "
    "+https://github.com/jaiminsolanki799-jpg/jaimin)"
)
TIMEOUT_SECONDS = 25
SUMMARY_MAX_CHARS = 320

ATOM_NS = "{http://www.w3.org/2005/Atom}"
CONTENT_NS = "{http://purl.org/rss/1.0/modules/content/}"
DC_NS = "{http://purl.org/dc/elements/1.1/}"
MEDIA_NS = "{http://search.yahoo.com/mrss/}"

TRACKING_PARAMS = {
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "fbclid", "gclid", "ref", "from",
}


# --------------------------------------------------------------------------- #
# Text helpers
# --------------------------------------------------------------------------- #

_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")


def clean_text(value: str | None, max_chars: int | None = None) -> str:
    """Strip HTML tags and entities, collapse whitespace, optionally truncate."""
    if not value:
        return ""
    text = html.unescape(_TAG_RE.sub(" ", value))
    text = _WS_RE.sub(" ", text).strip()
    if max_chars and len(text) > max_chars:
        text = text[: max_chars - 1].rstrip() + "…"
    return text


def canonical_link(link: str) -> str:
    """Drop tracking query parameters and fragments so the same story dedupes."""
    link = (link or "").strip()
    if not link:
        return ""
    parts = urllib.parse.urlsplit(link)
    query = [
        (k, v)
        for k, v in urllib.parse.parse_qsl(parts.query, keep_blank_values=True)
        if k.lower() not in TRACKING_PARAMS
    ]
    return urllib.parse.urlunsplit(
        (parts.scheme, parts.netloc.lower(), parts.path, urllib.parse.urlencode(query), "")
    )


def item_id(link: str, title: str) -> str:
    key = canonical_link(link) or title.strip().lower()
    return hashlib.sha1(key.encode("utf-8")).hexdigest()[:16]


def parse_date(value: str | None) -> datetime | None:
    """Parse RFC 822 (RSS) or ISO 8601 (Atom) dates into aware UTC datetimes."""
    if not value:
        return None
    value = value.strip()
    try:
        dt = parsedate_to_datetime(value)
    except (TypeError, ValueError, IndexError):
        dt = None
    if dt is None:
        iso = value.replace("Z", "+00:00")
        try:
            dt = datetime.fromisoformat(iso)
        except ValueError:
            return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def tag_topics(text: str, topics: dict[str, list[str]]) -> list[str]:
    """Return the topic names whose keywords appear in text (whole-word match)."""
    lowered = text.lower()
    found = []
    for topic, keywords in topics.items():
        for kw in keywords:
            pattern = r"(?<![a-z0-9])" + re.escape(kw.lower()) + r"(?![a-z0-9])"
            if re.search(pattern, lowered):
                found.append(topic)
                break
    return found


# --------------------------------------------------------------------------- #
# Feed parsing
# --------------------------------------------------------------------------- #

def _first_text(el: ET.Element, *names: str) -> str | None:
    for name in names:
        child = el.find(name)
        if child is not None:
            if child.text and child.text.strip():
                return child.text
            # Atom <link href="..."/> and <content src="..."/>
            href = child.get("href") or child.get("src")
            if href:
                return href
    return None


def _atom_link(entry: ET.Element) -> str | None:
    alternate = None
    for link in entry.findall(ATOM_NS + "link"):
        rel = link.get("rel", "alternate")
        if rel == "alternate":
            alternate = link.get("href")
            break
        alternate = alternate or link.get("href")
    return alternate


def _image(el: ET.Element) -> str | None:
    for name in (MEDIA_NS + "content", MEDIA_NS + "thumbnail", "enclosure"):
        node = el.find(name)
        if node is not None:
            url = node.get("url")
            if url and ("image" in (node.get("type") or "image") or name != "enclosure"):
                return url
    return None


def parse_feed(xml_bytes: bytes) -> list[dict]:
    """Parse RSS 2.0 / RSS 1.0 / Atom bytes into a list of raw item dicts."""
    root = ET.fromstring(xml_bytes)
    items: list[dict] = []

    if root.tag == ATOM_NS + "feed":
        for entry in root.findall(ATOM_NS + "entry"):
            items.append({
                "title": _first_text(entry, ATOM_NS + "title"),
                "link": _atom_link(entry),
                "summary": _first_text(entry, ATOM_NS + "summary", ATOM_NS + "content"),
                "published": _first_text(entry, ATOM_NS + "published", ATOM_NS + "updated"),
                "author": _first_text(entry, ATOM_NS + "author/" + ATOM_NS + "name"),
                "image": _image(entry),
            })
        return items

    # RSS 2.0 puts <item> under <channel>; RSS 1.0 (RDF) puts <item> at the root.
    for item in root.iter():
        if item.tag not in ("item", "{http://purl.org/rss/1.0/}item"):
            continue
        ns = "{http://purl.org/rss/1.0/}" if item.tag.startswith("{") else ""
        items.append({
            "title": _first_text(item, ns + "title"),
            "link": _first_text(item, ns + "link", "guid"),
            "summary": _first_text(item, ns + "description", CONTENT_NS + "encoded"),
            "published": _first_text(item, "pubDate", DC_NS + "date", "published"),
            "author": _first_text(item, DC_NS + "creator", "author"),
            "image": _image(item),
        })
    return items


def fetch_bytes(url: str) -> bytes:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
        },
    )
    with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
        return response.read()


def normalise_items(raw_items: list[dict], source: dict, topics: dict, fetched_at: datetime) -> list[dict]:
    """Turn raw parsed items into the dashboard's item shape."""
    out = []
    for raw in raw_items:
        title = clean_text(raw.get("title"))
        link = (raw.get("link") or "").strip()
        if not title or not link:
            continue
        if source.get("prime_only") and "/prime/" not in link.lower():
            continue
        summary = clean_text(raw.get("summary"), SUMMARY_MAX_CHARS)
        published = parse_date(raw.get("published")) or fetched_at
        out.append({
            "id": item_id(link, title),
            "title": title,
            "link": link,
            "summary": summary,
            "published": published.isoformat(),
            "source": source["name"],
            "category": source.get("category", "General"),
            "author": clean_text(raw.get("author")) or None,
            "image": raw.get("image"),
            "topics": tag_topics(f"{title} {summary}", topics),
            "first_seen": fetched_at.isoformat(),
        })
    return out


def fetch_source(source: dict, topics: dict, fetched_at: datetime) -> tuple[list[dict], dict]:
    """Fetch one source. Never raises: errors are reported in the status dict."""
    status = {
        "name": source["name"],
        "url": source["url"],
        "category": source.get("category", "General"),
        "ok": False,
        "items": 0,
        "error": None,
        "checked_at": fetched_at.isoformat(),
    }
    try:
        raw = parse_feed(fetch_bytes(source["url"]))
        items = normalise_items(raw, source, topics, fetched_at)
        status.update(ok=True, items=len(items))
        return items, status
    except urllib.error.HTTPError as exc:
        status["error"] = f"HTTP {exc.code}"
    except urllib.error.URLError as exc:
        status["error"] = f"Network error: {exc.reason}"
    except ET.ParseError as exc:
        status["error"] = f"Not valid RSS/Atom XML: {exc}"
    except Exception as exc:  # noqa: BLE001 - one bad feed must not stop the run
        status["error"] = f"{type(exc).__name__}: {exc}"
    return [], status


# --------------------------------------------------------------------------- #
# Merging with the existing archive
# --------------------------------------------------------------------------- #

def merge_items(existing: list[dict], fresh: list[dict], now: datetime,
                retention_days: int, max_items: int) -> list[dict]:
    """Merge fresh items into existing ones, keyed by id. Newest first."""
    by_id: dict[str, dict] = {item["id"]: item for item in existing}
    for item in fresh:
        old = by_id.get(item["id"])
        if old:
            # Keep the first-seen timestamp and any read/bookmark-free fields,
            # but refresh title/summary in case the publisher edited them.
            item = {**old, **item, "first_seen": old.get("first_seen", item["first_seen"])}
        by_id[item["id"]] = item

    cutoff = now - timedelta(days=retention_days)
    kept = [
        item for item in by_id.values()
        if (parse_date(item.get("published")) or now) >= cutoff
    ]
    kept.sort(key=lambda item: item.get("published", ""), reverse=True)
    return kept[:max_items]


def load_json(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def build_dashboard(key: str, config: dict, sources_cfg: dict, now: datetime,
                    dry_run: bool = False) -> dict:
    topics = sources_cfg.get("topics", {})
    retention_days = int(sources_cfg.get("retention_days", 21))
    max_items = int(sources_cfg.get("max_items", 1500))
    data_file = DATA_DIR / f"{key}.json"
    existing = load_json(data_file)

    with ThreadPoolExecutor(max_workers=6) as pool:
        results = list(pool.map(
            lambda src: fetch_source(src, topics, now), config.get("sources", [])
        ))

    fresh: list[dict] = []
    statuses: list[dict] = []
    for items, status in results:
        fresh.extend(items)
        statuses.append(status)

    merged = merge_items(existing.get("items", []), fresh, now, retention_days, max_items)
    new_ids = {i["id"] for i in fresh} - {i["id"] for i in existing.get("items", [])}

    payload = {
        "dashboard": key,
        "title": config.get("title", key),
        "generated_at": now.isoformat(),
        "retention_days": retention_days,
        "sources": statuses,
        "topics": list(topics.keys()),
        "new_since_last_run": len(new_ids),
        "items": merged,
    }

    ok = sum(1 for s in statuses if s["ok"])
    print(f"[{key}] {ok}/{len(statuses)} sources ok, {len(fresh)} fetched, "
          f"{len(new_ids)} new, {len(merged)} kept")
    for s in statuses:
        flag = "ok " if s["ok"] else "ERR"
        detail = f"{s['items']} items" if s["ok"] else s["error"]
        print(f"   {flag} {s['name']}: {detail}")

    if not dry_run:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        data_file.write_text(
            json.dumps(payload, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
        )
    return payload


def main(argv: list[str]) -> int:
    dry_run = "--dry-run" in argv
    wanted = [a for a in argv if not a.startswith("--")]
    sources_cfg = json.loads(SOURCES_FILE.read_text(encoding="utf-8"))
    dashboards = sources_cfg["dashboards"]
    if wanted:
        unknown = [w for w in wanted if w not in dashboards]
        if unknown:
            print(f"Unknown dashboard(s): {', '.join(unknown)}. "
                  f"Known: {', '.join(dashboards)}", file=sys.stderr)
            return 2
        dashboards = {k: dashboards[k] for k in wanted}

    now = datetime.now(timezone.utc).replace(microsecond=0)
    for key, config in dashboards.items():
        build_dashboard(key, config, sources_cfg, now, dry_run=dry_run)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
