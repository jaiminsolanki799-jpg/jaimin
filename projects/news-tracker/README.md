# news-tracker

Two phone-friendly news dashboards, with the data stored in this repository:

| Dashboard | What it tracks | Page |
| --- | --- | --- |
| **ET Prime** | Economic Times Prime stories (markets, economy, industry, wealth, tax) | `et-prime/` |
| **Website news** | Moneycontrol, Mint, Business Standard, BusinessLine, Financial Express, Taxguru, RBI, SEBI, PIB, plus Google News searches for IBC, GST, income tax and MCA | `website-news/` |

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
  or remove sources; no code changes needed.
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

`"prime_only": true` keeps only links containing `/prime/` — used to pull ET
Prime stories out of Economic Times' general feeds. For a site without an RSS
feed, a Google News search feed works well:

```
https://news.google.com/rss/search?q=site:example.com&hl=en-IN&gl=IN&ceid=IN:en
```
