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


def test_naive_dates_are_treated_as_ist():
    # RBI's feed gives times without a timezone; they are IST.
    dt = fn.parse_date("Mon, 07 Sep 2026 10:45:00")
    assert dt == datetime(2026, 9, 7, 5, 15, tzinfo=timezone.utc)


def test_split_publisher_from_google_news_title():
    assert fn.split_publisher("Can slow IPOs revive markets? - The Economic Times") == \
        ("Can slow IPOs revive markets?", "The Economic Times")
    assert fn.split_publisher("Plain title") == ("Plain title", None)


def test_google_news_items_are_cleaned_and_section_pages_skipped():
    xml = b"""<rss version="2.0"><channel>
      <item><title>Story one - economictimes.indiatimes.com</title>
        <link>https://news.google.com/rss/articles/abc</link>
        <description>&lt;ol&gt;&lt;li&gt;related&lt;/li&gt;&lt;/ol&gt;</description>
        <pubDate>Sun, 06 Sep 2026 22:30:00 GMT</pubDate></item>
      <item><title>The Economic Times - economictimes.indiatimes.com</title>
        <link>https://news.google.com/rss/articles/def</link>
        <pubDate>Sun, 06 Sep 2026 22:30:00 GMT</pubDate></item>
    </channel></rss>"""
    items = fn.normalise_items(fn.parse_feed(xml), {"name": "GN"}, TOPICS, NOW)
    assert len(items) == 1
    assert items[0]["title"] == "Story one"
    assert items[0]["publisher"] == "economictimes.indiatimes.com"
    assert items[0]["summary"] == ""


def test_future_dates_are_clamped_to_fetch_time():
    xml = b"""<rss version="2.0"><channel><item><title>T</title>
      <link>https://example.com/t</link><pubDate>Tue, 08 Sep 2026 10:00:00 +0000</pubDate>
    </item></channel></rss>"""
    items = fn.normalise_items(fn.parse_feed(xml), {"name": "S"}, TOPICS, NOW)
    assert items[0]["published"] == NOW.isoformat()


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


HTML_SAMPLE = b"""<html><body>
<a href="/prime/money-and-markets/why-banks-are-nervous/primearticleshow/1001.cms"><img src="x.jpg"></a>
<a href="/prime/money-and-markets/why-banks-are-nervous/primearticleshow/1001.cms">Why banks are nervous about the new liquidity rules</a>
<a href="https://economictimes.indiatimes.com/prime/consumer/fmcg-slowdown/primearticleshow/1002.cms" title="FMCG slowdown: what the numbers say">
  <span>FMCG &amp; more</span></a>
<a href="/markets/stocks/news/plain-story/articleshow/1003.cms">Not a Prime story</a>
<a href="/prime/money-and-markets">Section link</a>
</body></html>"""


def test_parse_html_links_extracts_prime_articles():
    items = fn.parse_html_links(HTML_SAMPLE, "https://economictimes.indiatimes.com/prime", r"/prime/.*articleshow")
    links = {i["link"]: i["title"] for i in items}
    assert links == {
        "https://economictimes.indiatimes.com/prime/money-and-markets/why-banks-are-nervous/primearticleshow/1001.cms":
            "Why banks are nervous about the new liquidity rules",
        "https://economictimes.indiatimes.com/prime/consumer/fmcg-slowdown/primearticleshow/1002.cms":
            "FMCG slowdown: what the numbers say",
    }


def test_html_source_items_get_fetch_time_as_published():
    source = {"name": "ET Prime home", "category": "ET Prime", "type": "html"}
    raw = fn.parse_html_links(HTML_SAMPLE, "https://economictimes.indiatimes.com/prime", r"/prime/.*articleshow")
    items = fn.normalise_items(raw, source, TOPICS, NOW)
    assert len(items) == 2
    assert all(i["published"] == NOW.isoformat() for i in items)


def test_parse_date_handles_sebi_style():
    assert fn.parse_date("04 Sep, 2026 +0530") == datetime(2026, 9, 3, 18, 30, tzinfo=timezone.utc)
    assert fn.parse_date("04 Sep, 2026") == datetime(2026, 9, 3, 18, 30, tzinfo=timezone.utc)


def test_category_from_path():
    assert fn.category_from_path("https://economictimes.indiatimes.com/prime/money-and-markets/x/primearticleshow/1.cms") == "Money and markets"
    assert fn.category_from_path("https://economictimes.indiatimes.com/prime/fintech-and-bfsi/x/primearticleshow/1.cms") == "Fintech and BFSI"
    assert fn.category_from_path("https://economictimes.indiatimes.com/markets/x/articleshow/1.cms") is None


def test_drop_stale_by_id():
    items = [{"id": "a", "link": "https://x/primearticleshow/133841363.cms"},
             {"id": "b", "link": "https://x/primearticleshow/133000000.cms"},
             {"id": "c", "link": "https://x/primearticleshow/98102486.cms"},
             {"id": "d", "link": "https://x/no-id"}]
    kept = fn.drop_stale_by_id(items, r"articleshow/(\d+)", 1500000)
    assert [i["id"] for i in kept] == ["a", "b", "d"]


def test_merge_keeps_old_date_when_fresh_date_unknown():
    old = {"id": "a", "title": "T", "published": (NOW - timedelta(days=2)).isoformat(),
           "first_seen": (NOW - timedelta(days=2)).isoformat(), "date_known": False}
    fresh = {"id": "a", "title": "T", "published": NOW.isoformat(),
             "first_seen": NOW.isoformat(), "date_known": False}
    merged = fn.merge_items([old], [fresh], NOW, retention_days=14, max_items=100)
    assert merged[0]["published"] == old["published"]
    # but a real date from the feed does replace the placeholder
    fresh["date_known"] = True
    merged = fn.merge_items([old], [fresh], NOW, retention_days=14, max_items=100)
    assert merged[0]["published"] == NOW.isoformat()
