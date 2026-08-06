# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Who you are working with

- Address the user as **Jaimin**.
- Jaimin is a **CA article assistant** (chartered accountancy articleship).
- Jaimin's principal is **Dharmendra Dhelariya**.

Jaimin works in an accounting and audit context rather than a full-time
software engineering one, so prefer plain explanations over jargon, and spell
out the commands to run rather than assuming familiarity with build tooling.

## Repository conventions

This repository is a workspace of small, self-contained projects.

- Every project lives in its own directory under `projects/`.
- Every project has its own `README.md` covering setup, how to run it, and how
  to test it.
- New projects are added to the table in the root `README.md`.

## Layout

```
.
├── README.md                    index of the projects
├── CLAUDE.md
├── .gitignore
├── .github/workflows/ci.yml     CI
└── projects/
    ├── python-playground/       src/ + tests/ + requirements.txt
    ├── web-starter/             index.html + css/ + js/
    └── notes/                   Markdown reference notes
```

## Testing

`python-playground` uses pytest:

```bash
cd projects/python-playground
pip install -r requirements.txt
pytest
```

CI runs this suite on every pull request and on every push to `main`, so the
tests must pass before merging.

## Working agreements

- Branch for changes rather than committing directly to `main`, and open a pull
  request.
- Keep each project dependency-light. `web-starter` in particular has no build
  step and no package manager, and should stay that way.
