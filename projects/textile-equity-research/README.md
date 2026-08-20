# textile-equity-research

An equity research report on the Indian listed textile industry, built as a
practice exercise. It covers an industry overview and a peer comparison of
eight listed textile companies spanning yarn/spinning, home textiles, branded
apparel, denim, knitwear, innerwear, and garment exports.

This is **not investment advice**. It is a CA articleship practice project:
data was gathered from public sources (screener.in, moneycontrol.com,
company filings, industry body reports) at a point in time and may be out of
date by the time you read it. Always verify figures against the company's
own filings and a current market data source before relying on them.

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
├── Textile_Peer_Comparison.xlsx    peer comparison workbook
└── reports/
    └── Textile_Industry_Equity_Research_Report.docx
```

## How it was built

1. Financial and business data for the industry and each company was gathered
   from public sources (screener.in, moneycontrol.com, NSE/BSE filings,
   company investor relations pages, CRISIL/ICRA/CITI industry reports).
2. The raw findings were saved to `data/textile_peer_data.json`.
3. `Textile_Peer_Comparison.xlsx` turns that data into a sortable peer
   comparison table (valuation, profitability, growth, leverage).
4. `reports/Textile_Industry_Equity_Research_Report.docx` is the narrative
   report: industry overview, peer comparison, company snapshots, investment
   considerations, risks, and a disclaimer.

## Updating the data

Figures go stale quickly. To refresh:

1. Re-check each company's latest quarterly/annual results and current
   market price (screener.in or moneycontrol.com are quick sources).
2. Update `data/textile_peer_data.json`.
3. Regenerate the spreadsheet and report from the updated JSON.
