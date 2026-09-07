# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Who you are working with

- Address the user as **Jaimin**.
- Jaimin is a **CA article assistant** (chartered accountancy articleship).
- Jaimin's principal is **Dharmendra Dhelariya**.

Jaimin works in an accounting and audit context rather than a full-time
software engineering one, so prefer plain explanations over jargon, and spell
out the commands to run rather than assuming familiarity with build tooling.

## Client confidentiality

`ca-work/` holds the articleship work structure. Client data must never be
committed to this repository — no financial statements, ledgers, bank
statements, PAN/TAN/GSTIN/DIN numbers, audit evidence, or portal credentials.

`ca-work/clients/` is excluded by `.gitignore` and is where real client work
belongs. Before committing anything under `ca-work/`, check that it carries no
client identity and no figures. If asked to add client data to a tracked path,
say so and put it in `ca-work/clients/` instead.

This applies with particular force while the repository is public.

## Repository conventions

This repository is a workspace of small, self-contained projects.

- Every project lives in its own directory under `projects/`.
- Every project has its own `README.md` covering setup, how to run it, and how
  to test it.
- New projects are added to the table in the root `README.md`.
- `ca-work/` follows its own structure, documented in `ca-work/README.md`.

## Layout

```
.
├── README.md                    index of the projects
├── CLAUDE.md
├── .gitignore
├── .nojekyll
├── .github/workflows/
│   ├── ci.yml                   CI (pytest for python-playground and news-tracker)
│   └── news-tracker.yml         refreshes the news dashboards every 30 min
└── projects/
    ├── python-playground/       src/ + tests/ + requirements.txt
    ├── web-starter/             index.html + css/ + js/
    ├── notes/                   Markdown reference notes
    └── news-tracker/            ET Prime + website news dashboards (GitHub Pages)
```

## Testing

`python-playground` and `news-tracker` use pytest:

```bash
cd projects/python-playground
pip install -r requirements.txt
pytest

cd ../news-tracker
pip install pytest
pytest
```

CI runs both suites on every pull request and on every push to `main`, so the
tests must pass before merging.

## Working agreements

- Branch for changes rather than committing directly to `main`, and open a pull
  request.
- Keep each project dependency-light. `web-starter` in particular has no build
  step and no package manager, and should stay that way.
