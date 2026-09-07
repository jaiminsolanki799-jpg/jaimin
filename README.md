# jaimin

A workspace holding several small, self-contained projects. Each project lives
in its own directory under `projects/` with its own README, source layout, and
run instructions.

## Projects

| Project | Description | Stack |
| --- | --- | --- |
| [python-playground](projects/python-playground) | Python practice code with a tested calculator module | Python 3.9+ |
| [web-starter](projects/web-starter) | Static single-page site scaffold | HTML / CSS / JS |
| [notes](projects/notes) | Reference notes and cheatsheets | Markdown |
| [news-tracker](projects/news-tracker) | ET Prime and website news dashboards, refreshed by GitHub Actions and served by GitHub Pages | HTML / CSS / JS + Python |

## Work folders

[ca-work/](ca-work) holds the folder structure for chartered accountancy
articleship work — audit, income tax, GST, ROC compliance, templates,
checklists, and a statutory due-date calendar.

Client data is never committed. `ca-work/clients/` is excluded by `.gitignore`;
see [ca-work/README.md](ca-work/README.md) before putting anything there.

## Continuous integration

Every push to `main` and every pull request runs the `python-playground` and
`news-tracker` test suites via GitHub Actions — see
[.github/workflows/ci.yml](.github/workflows/ci.yml).

A second workflow, [news-tracker.yml](.github/workflows/news-tracker.yml),
refreshes the news dashboards' data every 30 minutes.

## Public dashboards (GitHub Pages)

Once GitHub Pages is enabled for this repository (see
[projects/news-tracker/README.md](projects/news-tracker/README.md)), the
dashboards are available at:

- https://jaiminsolanki799-jpg.github.io/jaimin/projects/news-tracker/ — index
- https://jaiminsolanki799-jpg.github.io/jaimin/projects/news-tracker/et-prime/ — ET Prime
- https://jaiminsolanki799-jpg.github.io/jaimin/projects/news-tracker/website-news/ — Website news

## Layout

```
.
├── README.md
├── CLAUDE.md
├── .gitignore
├── .nojekyll                    lets GitHub Pages serve files as-is
├── .github/workflows/
│   ├── ci.yml
│   └── news-tracker.yml
└── projects/
    ├── python-playground/
    ├── web-starter/
    ├── notes/
    └── news-tracker/
```

## Getting started

Clone the repository and move into the project you want to work on:

```bash
git clone https://github.com/jaiminsolanki799-jpg/jaimin.git
cd jaimin/projects/python-playground
```

Each project's README covers how to run it.

## Adding a project

1. Create a directory under `projects/`.
2. Add a `README.md` describing what it is and how to run it.
3. Add a row to the table above.
