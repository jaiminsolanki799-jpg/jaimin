# ca-work

Working folders for chartered accountancy articleship work.

## ⚠️ Client confidentiality — read this first

**This repository is public.** Anyone on the internet can read anything
committed to it.

Client data must never be committed here. That includes:

- Financial statements, trial balances, ledgers, and bank statements
- PAN, TAN, GSTIN, Aadhaar, DIN, and account numbers
- Audit evidence, working papers containing client figures, and signed reports
- Login credentials for the income tax, GST, MCA, or TRACES portals
- Anything received from a client under an engagement

`ca-work/clients/` is excluded by `.gitignore` for this reason — files placed
there stay on your machine and are never pushed. Keep real client work in that
folder, or outside the repository entirely.

What belongs here instead: blank templates, checklists, formats, due-date
references, and notes with no client identity or figures in them.

If this repository is later made private, that lowers the risk but does not
remove the professional obligation — client data still should not be stored in
a general-purpose code repository.

## Folders

| Folder | What goes in it |
| --- | --- |
| [audit/](audit) | Audit programmes, checklists, and formats by audit type |
| [income-tax/](income-tax) | ITR, TDS/TCS, advance tax, and assessment work |
| [gst/](gst) | Registration, returns, annual return, and reconciliation |
| [accounting/](accounting) | Bookkeeping, bank reconciliation, and finalisation |
| [roc-compliance/](roc-compliance) | Company law and MCA filings |
| [templates/](templates) | Blank letters and working paper formats |
| [checklists/](checklists) | Reusable checklists |
| [due-dates/](due-dates) | Statutory compliance calendar |
| [articleship/](articleship) | Work diary and ICAI forms |
| [clients/](clients) | Client-specific work — **git-ignored, never pushed** |

## Naming

Keep filenames predictable so they sort usefully:

```
FY2025-26_<client-or-topic>_<document>.<ext>
2026-08-06_<topic>_notes.md
```

Use financial years as `FY2025-26`, and assessment years as `AY2026-27`, so the
two are never confused.
