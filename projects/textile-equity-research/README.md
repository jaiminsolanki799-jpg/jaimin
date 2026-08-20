# textile-equity-research

An equity research report on the Indian listed textile industry, built as a
practice exercise. It covers an industry overview and a peer comparison of
eight listed textile companies spanning yarn/spinning, home textiles, branded
apparel, denim, knitwear, innerwear, and garment exports.

This is **not investment advice**. It is a CA articleship practice project:
data was gathered via web search from public secondary sources (financial
news, brokerage result notes, industry body reports, and data aggregators —
screener.in and moneycontrol.com were unreachable from the build
environment, so figures are estimates reconciled across sources rather than
direct pulls) at a point in time, and may be out of date by the time you
read it. Always verify figures against the company's own filings and a
current market data source before relying on them.

## Companies covered

| Company | Segment |
| --- | --- |
| Vardhman Textiles Ltd | Yarn & spinning, fabric |
| Trident Ltd | Home textiles (terry towels, bed linen), paper |
| Welspun Living Ltd | Home textiles (towels, bed & bath), flooring |
| Raymond Lifestyle Ltd | Branded apparel & fabric (menswear) |
| Arvind Ltd | Denim, woven fabric, advanced materials |
| KPR Mill Ltd | Yarn, knitted garments, sugar |
| Page Industries Ltd | Innerwear & athleisure (Jockey licensee) |
| Gokaldas Exports Ltd | Garment exports (woven & knits) |

## Layout

```
textile-equity-research/
├── README.md
├── data/
│   └── textile_peer_data.json      raw structured data gathered for the report
├── scripts/
│   ├── build_xlsx.py               regenerates Textile_Peer_Comparison.xlsx
│   ├── build_report.js             regenerates the .docx report
│   ├── requirements.txt            Python deps for build_xlsx.py
│   └── package.json                Node deps for build_report.js
├── Textile_Peer_Comparison.xlsx    peer comparison workbook
└── reports/
    ├── Textile_Industry_Equity_Research_Report.docx
    └── Textile_Industry_Equity_Research_Report.pdf
```

## How it was built

1. Financial and business data for the industry and each company was gathered
   from public sources (financial news, brokerage result notes, industry body
   reports, and data aggregators) via web search — screener.in and
   moneycontrol.com were unreachable from the build environment, so several
   figures are estimates reconciled across secondary sources rather than
   direct pulls. See each company's `confidenceNotes` for specifics.
2. The raw findings were saved to `data/textile_peer_data.json`.
3. `Textile_Peer_Comparison.xlsx` turns that data into a peer comparison
   workbook (valuation, profitability, growth, leverage), with a computed
   P/S column and average/median rows driven by real formulas, comparison
   charts (P/E, margins, returns, revenue/profit), an Industry Overview
   sheet, and a Company Notes sheet with sources.
4. `reports/Textile_Industry_Equity_Research_Report.docx` (and the matching
   `.pdf`) is the narrative report: executive summary, industry overview,
   a landscape peer comparison table, an Investment Considerations section
   that auto-synthesizes the peer data (valuation spread, profitability,
   growth, leverage — comparative only, not a recommendation), one snapshot
   per company, and a disclaimer & methodology section covering data
   sources and limitations.

## Updating the data

Figures go stale quickly. To refresh:

1. Re-check each company's latest quarterly/annual results and current
   market price (screener.in or moneycontrol.com are quick sources).
2. Update `data/textile_peer_data.json`, keeping its existing shape (see
   `industry` and `companies` in that file for the fields expected).
3. Regenerate the workbook:
   ```bash
   cd scripts
   pip install -r requirements.txt
   python3 build_xlsx.py
   ```
   The script writes formulas but not their cached values — recalculate with
   LibreOffice so the numbers show up when opened outside Excel:
   ```bash
   soffice --headless --convert-to xlsx --outdir .. ../Textile_Peer_Comparison.xlsx
   ```
4. Regenerate the report:
   ```bash
   cd scripts
   npm install
   node build_report.js
   ```
   Then export a fresh PDF alongside the `.docx`:
   ```bash
   soffice --headless --convert-to pdf --outdir ../reports \
     ../reports/Textile_Industry_Equity_Research_Report.docx
   ```

Both scripts require LibreOffice (`soffice`) to be installed for the
recalculation/PDF-export steps above — on this environment that meant
installing `libreoffice-calc`, `libreoffice-writer`, and `poppler-utils`
(only `libreoffice-core` ships by default).
