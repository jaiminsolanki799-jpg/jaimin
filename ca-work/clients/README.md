# clients

**Everything in this folder is git-ignored and is never pushed.**

Put client-specific work here — working papers with real figures, statements,
and correspondence. Only this README is tracked by git.

To confirm nothing here is staged before you commit:

```bash
git status --short ca-work/clients/
git check-ignore -v ca-work/clients/<file>
```

Suggested layout inside this folder:

```
clients/
└── <client-name>/
    └── FY2025-26/
        ├── audit/
        ├── gst/
        └── income-tax/
```

Because this folder is not backed up by git, keep your own backup of it.
