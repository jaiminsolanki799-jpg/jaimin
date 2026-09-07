"""Offline tests for the feed fetcher. No network access is needed."""

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

import fetch_news as fn  # noqa: E402

RSS_SAMPLE = b"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
<channel>
  <title>Sample</title>
  <item>
    <title>GST Council eases &amp; simplifies rules</title>
    <link>https://example.com/news/gst?utm_source=rss&amp;id=7</link>
    <description><![CDATA[<p>The <b>GST</b> Council met today.&nbsp;More soon.</p>]]></description>
    <pubDate>Mon, 07 Sep 2026 09:30:00 +0530</pubDate>
    <media:content url="https://example.com/img.jpg" type="image/jpeg"/>
  </item>
  <item>
    <title>ET Prime story</title>
    <link>https://economictimes.indiatimes.com/prime/money-and-markets/abc/articleshow/1.cms</link>
    <description>NCLT admits insolvency plea</description>
    <pubDate>Mon, 07 Sep 2026 08:00:00 +0530</pubDate>
  </item>
  <item>
    <title>No link item</title>
    <description>should be skipped</description>
  </item>
</channel>
</rss>"""

ATOM_SAMPLE = b"""<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom sample</title>
  <entry>
    <title>SEBI tightens insider trading norms</title>
    <link rel="alternate" href="https://example.com/sebi"/>
    <summary>Regulator update</summary>
    <updated>2026-09-06T12:00:00Z</updated>
    <author><name>Desk</name></author>
  </entry>
</feed>"""

TOPICS = {
    "GST": ["gst"],
    "Insolvency / IBC": ["nclt", "insolvency"],
    "SEBI / markets regulation": ["sebi", "insider trading"],
}
NOW = datetime(2026, 9, 7, 10, 0, tzinfo=timezone.utc)


def test_parse_rss_extracts_fields():
    items = fn.parse_feed(RSS_SAMPLE)
    assert len(items) == 3
    assert items[0]["title"] == "GST Council eases & simplifies rules"
    assert items[0]["image"] == "https://example.com/img.jpg"
    assert items[0]["published"].startswith("Mon, 07 Sep 2026")


def test_parse_atom_extracts_fields():
    items = fn.parse_feed(ATOM_SAMPLE)
    assert len(items) == 1
    assert items[0]["link"] == "https://example.com/sebi"
    assert items[0]["author"] == "Desk"
    assert items[0]["published"] == "2026-09-06T12:00:00Z"


def test_clean_text_strips_html_and_truncates():
    assert fn.clean_text("<p>The <b>GST</b> Council&nbsp;met.</p>") == "The GST Council met."
    long = "word " * 200
    assert len(fn.clean_text(long, 50)) <= 50
    assert fn.clean_text(long, 50).endswith("…")


def test_canonical_link_drops_tracking_params():
    link = "https://Example.com/a?utm_source=rss&id=7&fbclid=x#top"
    assert fn.canonical_link(link) == "https://example.com/a?id=7"


def test_parse_date_handles_rfc822_and_iso():
    rfc = fn.parse_date("Mon, 07 Sep 2026 09:30:00 +0530")
    assert rfc == datetime(2026, 9, 7, 4, 0, tzinfo=timezone.utc)
    iso = fn.parse_date("2026-09-06T12:00:00Z")
    assert iso == datetime(2026, 9, 6, 12, 0, tzinfo=timezone.utc)
    assert fn.parse_date("not a date") is None
    assert fn.parse_date(None) is None


def test_tag_topics_uses_whole_words():
    assert fn.tag_topics("GST Council meets", TOPICS) == ["GST"]
    # 'gst' inside another word must not match
    assert fn.tag_topics("Kingston upon Thames", TOPICS) == []
    tags = fn.tag_topics("NCLT admits insolvency plea; SEBI reacts", TOPICS)
    assert tags == ["Insolvency / IBC", "SEBI / markets regulation"]


def test_normalise_items_skips_untitled_and_tags_topics():
    source = {"name": "Sample", "category": "Business"}
    items = fn.normalise_items(fn.parse_feed(RSS_SAMPLE), source, TOPICS, NOW)
    assert [i["title"] for i in items] == ["GST Council eases & simplifies rules", "ET Prime story"]
    assert items[0]["topics"] == ["GST"]
    assert items[0]["published"] == "2026-09-07T04:00:00+00:00"
    assert items[0]["source"] == "Sample"
    assert items[1]["topics"] == ["Insolvency / IBC"]


def test_prime_only_keeps_only_prime_links():
    source = {"name": "ET", "category": "ET Prime", "prime_only": True}
    items = fn.normalise_items(fn.parse_feed(RSS_SAMPLE), source, TOPICS, NOW)
    assert [i["title"] for i in items] == ["ET Prime story"]


def test_merge_dedupes_and_keeps_first_seen():
    old = {"id": "a", "title": "Old title", "published": (NOW - timedelta(days=1)).isoformat(),
           "first_seen": "2026-09-01T00:00:00+00:00"}
    fresh = {"id": "a", "title": "New title", "published": (NOW - timedelta(days=1)).isoformat(),
             "first_seen": NOW.isoformat()}
    stale = {"id": "b", "title": "Stale", "published": (NOW - timedelta(days=40)).isoformat(),
             "first_seen": "2026-07-01T00:00:00+00:00"}
    merged = fn.merge_items([old, stale], [fresh], NOW, retention_days=21, max_items=100)
    assert len(merged) == 1
    assert merged[0]["title"] == "New title"
    assert merged[0]["first_seen"] == "2026-09-01T00:00:00+00:00"


def test_merge_sorts_newest_first_and_caps():
    items = [
        {"id": str(i), "title": str(i), "published": (NOW - timedelta(hours=i)).isoformat(),
         "first_seen": NOW.isoformat()}
        for i in range(10)
    ]
    merged = fn.merge_items([], list(reversed(items)), NOW, retention_days=21, max_items=5)
    assert [i["id"] for i in merged] == ["0", "1", "2", "3", "4"]


def test_fetch_source_reports_errors_instead_of_raising(monkeypatch):
    def boom(url):
        raise fn.urllib.error.URLError("no route")
    monkeypatch.setattr(fn, "fetch_bytes", boom)
    items, status = fn.fetch_source({"name": "Down", "url": "https://x"}, TOPICS, NOW)
    assert items == []
    assert status["ok"] is False
    assert "no route" in status["error"]


def test_sources_config_is_valid():
    cfg = fn.json.loads(fn.SOURCES_FILE.read_text(encoding="utf-8"))
    assert set(cfg["dashboards"]) == {"et-prime", "website-news"}
    for key, dash in cfg["dashboards"].items():
        assert dash["sources"], f"{key} has no sources"
        for src in dash["sources"]:
            assert src["name"] and src["url"].startswith("https://")
