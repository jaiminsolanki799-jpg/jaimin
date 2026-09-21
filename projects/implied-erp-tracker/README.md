# implied-erp-tracker

A single-page tracker for the **implied equity risk premium (ERP)** of the
Sensex and the Nifty 50. You enter one reading per index per day (the closing
level plus three assumptions); the page solves for the implied cost of equity,
charts the ERP over time, and gives a plain-English read on where the market
is heading.

No build step, no package manager, no dependencies beyond two Google Fonts.

## Layout

```
implied-erp-tracker/
├── README.md
└── index.html      page, styles and script in one file
```

## Run

Open `index.html` directly in a browser, or serve the folder:

```bash
cd projects/implied-erp-tracker
python3 -m http.server 8000
```

Then visit http://localhost:8000.

Opened this way, readings are saved in that browser's local storage only. The
same page is also published as a Claude artifact with a shared database, which
is the copy to use on a phone: readings entered on any device appear on every
device. The artifact link lives with whoever published it; republish
`index.html` if you change the page.

## Daily use

1. Pick the index (Nifty 50 or Sensex).
2. Enter the date and the closing level.
3. Leave the cash flow, growth and risk-free fields as they are unless you have
   revised them. They carry over from the last saved reading for that index.
4. Save. Saving the same index and date twice updates that day's reading.

Inputs per reading:

| Field | Meaning |
| --- | --- |
| Closing level | Index close in points |
| Trailing 12-month cash flow | Dividends plus buybacks per index point, in points |
| Expected earnings growth | Consensus growth, % p.a., applied for five years |
| Risk-free rate | 10-year G-Sec yield, % |

## Method

Damodaran's two-stage implied ERP. Cash flow per index point grows at the
expected growth rate for five years, then at the risk-free rate in perpetuity.
The page solves the cost of equity `Ke` by bisection from

```
Level = Σ(t=1..5) CF_t / (1+Ke)^t  +  CF_5 (1+Rf) / ((Ke − Rf)(1+Ke)^5)
ERP   = Ke − Rf
```

The index level enters only through the cash yield (cash flow ÷ level), so the
daily close moves the ERP while the assumptions stay fixed until revised.

Signals on the index cards:

- **Trend** compares the latest close with the average of the last 20
  readings, with a ±0.5% band for "Sideways".
- **Valuation** places the latest ERP within that index's own history: bottom
  quartile reads as priced rich, top quartile as priced cheap.

Both are rules of thumb for reading direction, not recommendations.

## Test

There is no automated test. To check the solver by hand, enter a reading with
cash flow 1.36% of the level, growth 12.00% and risk-free 6.60%. The preview
should show a cost of equity of about 8.44% and an implied ERP of about 1.84%.
