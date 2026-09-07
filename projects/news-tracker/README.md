# news-tracker

Two phone-friendly news dashboards, with the data stored in this repository:

| Dashboard | What it tracks | Page |
| --- | --- | --- |
| **ET Prime & Mint** | Economic Times Prime stories, read from the ET Prime home page and its eleven section pages, plus Mint's companies, markets and money feeds | `et-prime/` |
| **Startups & Tech** | The CapTable, YourStory, StartupTalky, Entrackr and TechCrunch (The CapTable and Entrackr have no public feed and are read via Google News) | `website-news/` |

Each dashboard has a publication bar at the top (the `group` of each
source, plus a **★ Valuation desk** tab and a **★ Saved** tab), a search box,
a Filters drawer (time range, unread, section, topic and source), and a list
of stories that expand on tap. The first story opens as the front-page
splash. A light/dark toggle sits in the dateline.

- **Save to read later**: tap the ☆ on any headline. Saved stories live in
  the ★ Saved tab, are kept on the device (so they stay readable after the
  feed's retention window), and ignore the time-range filter.
- **Ask AI**: inside an expanded story, ✦ Ask AI builds a prompt (summarise,
  valuation angle, or research further) with the headline, source, link and
  summary. Two ways to use it:
  - **Answer here**: paste a Gemini API key once (free from
    aistudio.google.com/app/apikey; stored only in that phone's browser) and
    the answer appears inside the panel. "Research further" uses Gemini's
    Google Search grounding and lists the sources. Every story then gets a
    one-tap "✦ Summarise here" button.
  - **Open in an app**: "Share prompt" uses the phone's share sheet, which
    drops the question into Gemini, Claude or ChatGPT. The Claude, ChatGPT
    and Perplexity buttons open with the question prefilled; Gemini cannot
    take a question from a link.

Every story is tagged with CA-relevant topics (Insolvency / IBC, GST, Income
tax, MCA / ROC, SEBI, RBI, Audit, Valuation, Budget) so you can filter to what
matters for an engagement. Read marks, saved stories and "new since last visit"
are stored on your phone only.

## How it works

```
sources.json  ──►  scripts/fetch_news.py  ──►  data/et-prime.json
(list of feeds)    (runs in GitHub Actions      data/website-news.json
                    every 30 minutes)                │
                                                     ▼
                              et-prime/index.html  +  website-news/index.html
                              (static pages, read the JSON with fetch())
```

- `sources.json` — the feeds to watch and the topic keywords. Edit this to add
  or remove sources; no code changes needed. A source is either an RSS/Atom
  feed (`"type": "rss"`) or an ordinary web page (`"type": "html"`) from which
  every link matching `link_pattern` is taken as a story. ET Prime has no
  public feed and is paywalled, so its dashboard reads the section pages
  directly; those stories are dated when the tracker first saw them, and the
  headline links open on economictimes.com where your ET Prime login applies.
- `scripts/fetch_news.py` — Python, standard library only. Fetches every feed,
  cleans the text, tags topics, removes duplicates and merges into the existing
  data so the JSON becomes a rolling 21-day archive.
- `data/*.json` — the tracked stories. Committed by the workflow
  `.github/workflows/news-tracker.yml`.
- `assets/` — one stylesheet and one script shared by both dashboards. No build
  step, no frameworks.

## Public links (GitHub Pages)

The pages are plain HTML, so GitHub Pages can serve them straight from the
repository. This is a one-time setting:

1. Open the repository on GitHub → **Settings** → **Pages**.
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. Choose branch **main** and folder **/ (root)**, then **Save**.
4. Wait a minute or two. The links become:

   - https://jaiminsolanki799-jpg.github.io/jaimin/projects/news-tracker/
   - https://jaiminsolanki799-jpg.github.io/jaimin/projects/news-tracker/et-prime/
   - https://jaiminsolanki799-jpg.github.io/jaimin/projects/news-tracker/website-news/

On iPhone: open a link in Safari → **Share** → **Add to Home Screen**. It then
opens full-screen like an app. The pages are public — anyone with the link can
read them, but they contain only news headlines, never client data.

## Refreshing the data

The workflow runs on its own every 30 minutes on `main`. To refresh right now:
GitHub → **Actions** → **News tracker refresh** → **Run workflow**.

To run it on your own computer:

```bash
cd projects/news-tracker
python scripts/fetch_news.py            # both dashboards
python scripts/fetch_news.py et-prime   # just one
python scripts/fetch_news.py --dry-run  # fetch and report, don't write
```

The script prints one line per source (`ok` or `ERR` with the reason). The same
status appears at the bottom of each dashboard under **Source status**.

## Viewing locally

The pages load the JSON with `fetch()`, which browsers block for files opened
straight from disk. Serve the folder instead:

```bash
cd projects/news-tracker
python -m http.server 8000
```

Then open http://localhost:8000/ in a browser.

## Tests

```bash
cd projects/news-tracker
pip install pytest
pytest
```

The tests are offline: they check feed parsing (RSS and Atom), HTML cleaning,
date handling, topic tagging, the ET Prime link filter, de-duplication and the
`sources.json` structure. CI runs them on every pull request.

## Adding a source

Add an entry to the matching dashboard in `sources.json`:

```json
{"name": "Display name", "category": "Group", "type": "rss",
 "url": "https://example.com/feed.xml"}
```

For a site without an RSS feed, a Google News search feed works well (this is
also the workaround for sites that block automated readers with HTTP 403, as
Business Standard, Financial Express, PIB and Moneycontrol's stale feed do):

```
https://news.google.com/rss/search?q=site:example.com+when:2d&hl=en-IN&gl=IN&ceid=IN:en
```

Or read a listing page directly:

```json
{"name": "Display name", "category": "Group", "type": "html",
 "url": "https://example.com/section", "link_pattern": "/articles/"}
```
