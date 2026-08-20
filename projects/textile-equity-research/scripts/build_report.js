const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, AlignmentType, PageOrientation, PageBreak,
  Header, Footer, PageNumber, LevelFormat, convertInchesToTwip,
  VerticalAlign, PositionalTab, PositionalTabAlignment, PositionalTabLeader, PositionalTabRelativeTo,
} = require("docx");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const DATA_PATH = path.join(PROJECT_ROOT, "data", "textile_peer_data.json");
const OUT_DOCX = path.join(PROJECT_ROOT, "reports", "Textile_Industry_Equity_Research_Report.docx");

const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
const { industry, companies } = data;

const NAVY = "1F3864";
const MID_BLUE = "2E5395";
const LIGHT_FILL = "EEF2FA";
const GREY = "595959";
const HEADING_FONT = "Georgia";
const BODY_FONT = "Calibri";

const A4_WIDTH = 11907;
const A4_HEIGHT = 16840;
const MARGIN = convertInchesToTwip(0.8);

function fmtNum(v, decimals = 1) {
  if (v === null || v === undefined) return "n/a";
  return v.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function fmtInt(v) {
  if (v === null || v === undefined) return "n/a";
  return Math.round(v).toLocaleString("en-IN");
}
function fmtPct(v, decimals = 1) {
  if (v === null || v === undefined) return "n/a";
  return `${fmtNum(v, decimals)}%`;
}
function fmtRs(v) {
  if (v === null || v === undefined) return "n/a";
  return `₹${fmtNum(v, 2)}`;
}
function fmtCr(v) {
  if (v === null || v === undefined) return "n/a";
  return `₹${fmtInt(v)} Cr`;
}

function body(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 160, line: 300 },
    children: [new TextRun({ text, font: BODY_FONT, size: 21, ...opts })],
  });
}
function bullet(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 90, line: 280 },
    children: [new TextRun({ text, font: BODY_FONT, size: 21 })],
  });
}
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: NAVY, space: 4 } },
    children: [new TextRun({ text, font: HEADING_FONT, bold: true, color: NAVY, size: 30 })],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 140 },
    children: [new TextRun({ text, font: HEADING_FONT, bold: true, color: MID_BLUE, size: 25 })],
  });
}
function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, font: BODY_FONT, bold: true, color: NAVY, size: 22 })],
  });
}
function tocEntry(text, page, { indent = false } = {}) {
  return new Paragraph({
    spacing: { after: 100 },
    indent: indent ? { left: 360 } : undefined,
    children: [
      new TextRun({
        text,
        font: BODY_FONT,
        size: indent ? 19 : 21,
        bold: !indent,
        color: indent ? "000000" : NAVY,
      }),
      new TextRun({
        children: [
          new PositionalTab({
            alignment: PositionalTabAlignment.RIGHT,
            relativeTo: PositionalTabRelativeTo.MARGIN,
            leader: PositionalTabLeader.DOT,
          }),
        ],
      }),
      new TextRun({ text: String(page), font: BODY_FONT, size: indent ? 19 : 21 }),
    ],
  });
}
function caption(text) {
  return new Paragraph({
    spacing: { after: 160 },
    children: [new TextRun({ text, font: BODY_FONT, italics: true, color: GREY, size: 18 })],
  });
}

function statCell(text, { header = false, width, shaded = false, align = AlignmentType.LEFT } = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: shaded ? { type: ShadingType.CLEAR, fill: LIGHT_FILL } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [new Paragraph({
      alignment: align,
      children: [new TextRun({
        text, font: BODY_FONT, size: header ? 16 : 16, bold: header,
        color: header ? "FFFFFF" : "000000",
      })],
    })],
    shading: header ? { type: ShadingType.CLEAR, fill: NAVY } : (shaded ? { type: ShadingType.CLEAR, fill: LIGHT_FILL } : undefined),
  });
}

// ---------------------------------------------------------------- Masthead / research-note chrome
const DISCLOSURE_LINE = "Practice report prepared for CA articleship purposes — not investment research under SEBI (Research Analysts) Regulations, 2014. Not a recommendation to buy, sell, or hold any security.";

function pageHeader() {
  return new Header({
    children: [new Paragraph({
      alignment: AlignmentType.RIGHT,
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF", space: 4 } },
      children: [new TextRun({ text: "INDIA  |  TEXTILES, APPAREL & HOME TEXTILES  —  EQUITY RESEARCH", font: BODY_FONT, size: 14, bold: true, color: GREY })],
    })],
  });
}

function pageFooter() {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 20 },
        children: [new TextRun({ text: DISCLOSURE_LINE, font: BODY_FONT, size: 11, italics: true, color: "8C8C8C" })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Page ", font: BODY_FONT, size: 15, color: GREY }), new TextRun({ children: [PageNumber.CURRENT], font: BODY_FONT, size: 15, color: GREY })],
      }),
    ],
  });
}

function bannerLine(text) {
  return new Paragraph({
    shading: { type: ShadingType.CLEAR, fill: NAVY },
    spacing: { before: 0, after: 0 },
    children: [new TextRun({ text: `  ${text}`, font: BODY_FONT, size: 17, bold: true, color: "FFFFFF" })],
  });
}

function statTile(value, label, width) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: LIGHT_FILL },
    margins: { top: 140, bottom: 140, left: 100, right: 100 },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" },
    },
    children: [
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: value, font: HEADING_FONT, size: value.length > 9 ? 19 : 26, bold: true, color: NAVY })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: label, font: BODY_FONT, size: 14, color: GREY })] }),
    ],
  });
}

function sectorSnapshotStrip() {
  const validPE = companies.map((c) => c.peRatio).filter((v) => v != null);
  const validROE = companies.map((c) => c.roePercent).filter((v) => v != null);
  const validOPM = companies.map((c) => c.opmPercent).filter((v) => v != null);
  const totalMcap = companies.reduce((sum, c) => sum + (c.marketCapCr || 0), 0);
  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

  const tiles = [
    [String(companies.length), "Companies Covered"],
    [fmtCr(totalMcap), "Combined Market Cap"],
    [fmtNum(avg(validPE), 1) + "x", "Average P/E"],
    [fmtPct(avg(validROE)), "Average ROE"],
    [fmtPct(avg(validOPM)), "Average OPM"],
  ];
  const w = 1920;
  return new Table({
    width: { size: w * tiles.length, type: WidthType.DXA },
    columnWidths: tiles.map(() => w),
    rows: [new TableRow({ children: tiles.map(([v, l]) => statTile(v, l, w)) })],
  });
}

// ---------------------------------------------------------------- Peer table (landscape)
const peerCols = [
  { key: "companyName", label: "Company", width: 1500, align: AlignmentType.LEFT, fmt: (v) => v },
  { key: "nseTicker", label: "Ticker", width: 900, align: AlignmentType.LEFT, fmt: (v) => v },
  { key: "cmp", label: "CMP (₹)", width: 900, align: AlignmentType.RIGHT, fmt: fmtRs },
  { key: "marketCapCr", label: "Mkt Cap (₹Cr)", width: 1100, align: AlignmentType.RIGHT, fmt: fmtInt },
  { key: "peRatio", label: "P/E (x)", width: 800, align: AlignmentType.RIGHT, fmt: (v) => (v == null ? "n/a" : fmtNum(v, 1) + "x") },
  { key: "revenueCr", label: "Revenue (₹Cr)", width: 1050, align: AlignmentType.RIGHT, fmt: fmtInt },
  { key: "netProfitCr", label: "PAT (₹Cr)", width: 950, align: AlignmentType.RIGHT, fmt: fmtInt },
  { key: "opmPercent", label: "OPM", width: 750, align: AlignmentType.RIGHT, fmt: fmtPct },
  { key: "npmPercent", label: "NPM", width: 750, align: AlignmentType.RIGHT, fmt: fmtPct },
  { key: "roePercent", label: "ROE", width: 750, align: AlignmentType.RIGHT, fmt: fmtPct },
  { key: "rocePercent", label: "ROCE", width: 750, align: AlignmentType.RIGHT, fmt: fmtPct },
  { key: "debtToEquity", label: "D/E (x)", width: 800, align: AlignmentType.RIGHT, fmt: (v) => (v == null ? "n/a" : fmtNum(v, 2) + "x") },
  { key: "dividendYieldPercent", label: "Div Yld", width: 800, align: AlignmentType.RIGHT, fmt: fmtPct },
];

const peerHeaderRow = new TableRow({
  tableHeader: true,
  children: peerCols.map((c) => statCell(c.label, { header: true, width: c.width, align: c.align })),
});
const peerRows = companies.map((comp, i) => new TableRow({
  children: peerCols.map((c) => statCell(c.fmt(comp[c.key]), { width: c.width, shaded: i % 2 === 1, align: c.align })),
}));

const peerTable = new Table({
  width: { size: peerCols.reduce((a, c) => a + c.width, 0), type: WidthType.DXA },
  columnWidths: peerCols.map((c) => c.width),
  rows: [peerHeaderRow, ...peerRows],
});

// ---------------------------------------------------------------- Company snapshot: sidebar stat box
const SIDEBAR_WIDTH = 3100;
const MAIN_WIDTH = 6300;

function sidebarRow(label, value) {
  const labelW = 1350;
  const valueW = SIDEBAR_WIDTH - 260 - labelW;
  return new TableRow({
    children: [
      new TableCell({
        width: { size: labelW, type: WidthType.DXA },
        margins: { top: 55, bottom: 55, left: 0, right: 40 },
        borders: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "D9D9D9" } },
        children: [new Paragraph({ children: [new TextRun({ text: label, font: BODY_FONT, size: 15, color: GREY })] })],
      }),
      new TableCell({
        width: { size: valueW, type: WidthType.DXA },
        margins: { top: 55, bottom: 55, left: 0, right: 0 },
        borders: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "D9D9D9" } },
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: value, font: BODY_FONT, size: 17, bold: true })] })],
      }),
    ],
  });
}

function sidebarStatBox(c) {
  const rows = [
    ["Exchange", `NSE: ${c.nseTicker}`],
    ["CMP", fmtRs(c.cmp)],
    ["52W Range", `${fmtRs(c.week52Low)} – ${fmtRs(c.week52High)}`],
    ["Market Cap", fmtCr(c.marketCapCr)],
    ["P/E", c.peRatio == null ? "n/a" : fmtNum(c.peRatio, 1) + "x"],
    ["Revenue", fmtCr(c.revenueCr)],
    ["Net Profit", fmtCr(c.netProfitCr)],
    ["OPM", fmtPct(c.opmPercent)],
    ["NPM", fmtPct(c.npmPercent)],
    ["ROE", fmtPct(c.roePercent)],
    ["ROCE", fmtPct(c.rocePercent)],
    ["D/E", c.debtToEquity == null ? "n/a" : fmtNum(c.debtToEquity, 2) + "x"],
    ["Sales CAGR (3Y)", fmtPct(c.salesGrowth3yPercent)],
    ["Profit CAGR (3Y)", fmtPct(c.profitGrowth3yPercent)],
    ["Div Yield", fmtPct(c.dividendYieldPercent)],
    ["Promoter Holding", fmtPct(c.promoterHoldingPercent)],
  ];
  const innerTable = new Table({
    width: { size: SIDEBAR_WIDTH - 260, type: WidthType.DXA },
    columnWidths: [1350, SIDEBAR_WIDTH - 260 - 1350],
    rows: rows.map(([l, v]) => sidebarRow(l, v)),
  });
  return new TableCell({
    width: { size: SIDEBAR_WIDTH, type: WidthType.DXA },
    margins: { top: 0, bottom: 0, left: 260, right: 0 },
    borders: { left: { style: BorderStyle.SINGLE, size: 12, color: NAVY } },
    children: [
      new Paragraph({
        shading: { type: ShadingType.CLEAR, fill: NAVY },
        spacing: { after: 100 },
        children: [new TextRun({ text: "  KEY STATISTICS", font: BODY_FONT, size: 16, bold: true, color: "FFFFFF" })],
      }),
      innerTable,
      new Paragraph({
        spacing: { before: 100 },
        children: [new TextRun({ text: c.fiscalYear || "latest FY", font: BODY_FONT, size: 13, italics: true, color: GREY })],
      }),
    ],
  });
}

function companyMainCell(c) {
  return new TableCell({
    width: { size: MAIN_WIDTH, type: WidthType.DXA },
    margins: { top: 0, bottom: 0, left: 0, right: 200 },
    children: [
      h2(c.companyName),
      new Paragraph({
        spacing: { after: 160 },
        children: [new TextRun({ text: c.segment, font: BODY_FONT, italics: true, color: GREY, size: 18 })],
      }),
      h3("Business"),
      body(c.businessSummary),
      h3("Recent Developments"),
      body(c.recentDevelopments),
      h3("Key Risks"),
      body(c.keyRisks),
    ],
  });
}

function companySection(c) {
  const els = [];
  els.push(new Table({
    width: { size: MAIN_WIDTH + SIDEBAR_WIDTH, type: WidthType.DXA },
    columnWidths: [MAIN_WIDTH, SIDEBAR_WIDTH],
    rows: [new TableRow({ cantSplit: false, children: [companyMainCell(c), sidebarStatBox(c)] })],
  }));
  if (c.confidenceNotes) {
    els.push(new Paragraph({
      spacing: { before: 120, after: 200 },
      children: [new TextRun({ text: "Data notes: " + c.confidenceNotes, font: BODY_FONT, italics: true, color: GREY, size: 16 })],
    }));
  }
  return els;
}

// ---------------------------------------------------------------- Industry list helpers
function listSection(title, items) {
  const els = [h3(title)];
  (items || []).forEach((it) => els.push(bullet(it)));
  return els;
}

// ---------------------------------------------------------------- Investment considerations
function extreme(field, mode) {
  const valid = companies.filter((c) => c[field] != null);
  if (!valid.length) return null;
  return valid.reduce((best, c) => {
    if (!best) return c;
    if (mode === "max") return c[field] > best[field] ? c : best;
    return c[field] < best[field] ? c : best;
  }, null);
}

function investmentConsiderations() {
  const cheapest = extreme("peRatio", "min");
  const priciest = extreme("peRatio", "max");
  const bestROE = extreme("roePercent", "max");
  const bestROCE = extreme("rocePercent", "max");
  const bestSalesGrowth = extreme("salesGrowth3yPercent", "max");
  const bestProfitGrowth = extreme("profitGrowth3yPercent", "max");
  const mostLevered = extreme("debtToEquity", "max");
  const leastLevered = extreme("debtToEquity", "min");
  const bestDivYield = extreme("dividendYieldPercent", "max");

  const els = [];
  els.push(h1("Investment Considerations"));
  els.push(body("The observations below are purely comparative — how the eight companies in this peer set stack up against each other on the metrics gathered. They are descriptive positioning within the sample, not a ranking, rating, or recommendation; see the Disclaimer & Methodology section before drawing any conclusion from them."));

  els.push(h2("Valuation Spread"));
  if (cheapest && priciest) {
    els.push(body(`Trailing P/E across the peer set spans roughly ${fmtNum(cheapest.peRatio, 1)}x (${cheapest.companyName}) to ${fmtNum(priciest.peRatio, 1)}x (${priciest.companyName}) — a wide range that reflects the mix in this sample: commodity-linked spinners and integrated manufacturers tend to sit at the lower end, while branded consumer names and businesses coming off a low or transitional profit base tend to sit at the higher end. A low P/E on its own does not mean "cheap" — it can also reflect lower growth, thinner margins, or higher perceived risk; the same caveat applies in reverse for a high P/E.`));
  }

  els.push(h2("Profitability & Returns"));
  if (bestROE && bestROCE) {
    const sameCompany = bestROE.companyName === bestROCE.companyName;
    const returnsSentence = sameCompany
      ? `${bestROE.companyName} posts the highest return on both equity (${fmtPct(bestROE.roePercent)}) and capital employed (${fmtPct(bestROCE.rocePercent)}) in the set.`
      : `${bestROE.companyName} posts the highest return on equity in the set at ${fmtPct(bestROE.roePercent)}, and ${bestROCE.companyName} the highest return on capital employed at ${fmtPct(bestROCE.rocePercent)} — a reminder that ROE and ROCE can favor different companies depending on leverage and how capital-intensive the business is.`;
    els.push(body(`${returnsSentence} Businesses with an asset-light, brand-licensing or export-manufacturing model generally screen higher on both measures than integrated spinning/weaving operations, which carry heavier fixed-asset bases.`));
  }

  els.push(h2("Growth"));
  if (bestSalesGrowth && bestProfitGrowth) {
    const sameGrower = bestSalesGrowth.companyName === bestProfitGrowth.companyName;
    const growthSentence = sameGrower
      ? `On trailing 3-year CAGR, ${bestSalesGrowth.companyName} shows both the strongest revenue growth (${fmtPct(bestSalesGrowth.salesGrowth3yPercent)}) and the strongest profit growth (${fmtPct(bestProfitGrowth.profitGrowth3yPercent)}) in the sample.`
      : `On trailing 3-year CAGR, ${bestSalesGrowth.companyName} shows the strongest revenue growth (${fmtPct(bestSalesGrowth.salesGrowth3yPercent)}) and ${bestProfitGrowth.companyName} the strongest profit growth (${fmtPct(bestProfitGrowth.profitGrowth3yPercent)}) in the sample.`;
    els.push(body(`${growthSentence} Growth figures for a couple of companies in this set are flagged "n/a" where a reliable 3-year figure could not be sourced — see their Company Notes entry rather than reading the absence as zero growth.`));
  }

  els.push(h2("Leverage & Balance Sheet"));
  if (mostLevered && leastLevered) {
    els.push(body(`Debt-to-equity ranges from ${fmtNum(leastLevered.debtToEquity, 2)}x (${leastLevered.companyName}) to ${fmtNum(mostLevered.debtToEquity, 2)}x (${mostLevered.companyName}). None of the eight carry what would typically be considered heavy leverage, but the names with acquisition-funded expansion or capex-heavy capacity build-outs (see each company's Recent Developments) carry meaningfully more balance-sheet risk than the more conservatively financed names in the set.`));
  }
  if (bestDivYield) {
    els.push(body(`${bestDivYield.companyName} carries the highest trailing dividend yield in the set at ${fmtPct(bestDivYield.dividendYieldPercent)}; yields across the rest of the peer group are modest, consistent with a sector where most listed players are still prioritizing capacity expansion and working-capital needs over payout.`));
  }

  els.push(h2("How to use this section"));
  els.push(bullet("Cross-reference any single metric against the company's own Business and Recent Developments notes — a metric in isolation (e.g. a low P/E, or a high ROE) can be misleading without that context."));
  els.push(bullet("Treat 3-year CAGR and margin figures as backward-looking; the Industry Overview section covers forward-looking demand, tariff and policy drivers that could change the picture for export-facing names in particular."));
  els.push(bullet("Verify any figure you intend to rely on against the company's own filings or a live market data source before using it — see the Disclaimer & Methodology section for why."));

  return els;
}

// ---------------------------------------------------------------- Cover page
const coverUniverseCols = [
  { key: "companyName", label: "Company", width: 2600, align: AlignmentType.LEFT, fmt: (v) => v },
  { key: "nseTicker", label: "Ticker", width: 1300, align: AlignmentType.LEFT, fmt: (v) => v },
  { key: "cmp", label: "CMP (₹)", width: 1300, align: AlignmentType.RIGHT, fmt: fmtRs },
  { key: "peRatio", label: "P/E (x)", width: 1150, align: AlignmentType.RIGHT, fmt: (v) => (v == null ? "n/a" : fmtNum(v, 1) + "x") },
  { key: "marketCapCr", label: "Mkt Cap (₹Cr)", width: 1600, align: AlignmentType.RIGHT, fmt: fmtInt },
];
const coverUniverseTable = new Table({
  width: { size: coverUniverseCols.reduce((a, c) => a + c.width, 0), type: WidthType.DXA },
  columnWidths: coverUniverseCols.map((c) => c.width),
  rows: [
    new TableRow({ tableHeader: true, children: coverUniverseCols.map((c) => statCell(c.label, { header: true, width: c.width, align: c.align })) }),
    ...companies.map((comp, i) => new TableRow({
      children: coverUniverseCols.map((c) => statCell(c.fmt(comp[c.key]), { width: c.width, shaded: i % 2 === 1, align: c.align })),
    })),
  ],
});

const coverChildren = [
  bannerLine("EQUITY RESEARCH  |  INDIA  |  TEXTILES, APPAREL & HOME TEXTILES"),
  new Paragraph({
    spacing: { before: 500, after: 60 },
    children: [new TextRun({ text: "SECTOR NOTE — INITIATION", font: BODY_FONT, size: 18, bold: true, color: GREY })],
  }),
  new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun({ text: "Indian Textile Industry", font: HEADING_FONT, size: 52, bold: true, color: NAVY })],
  }),
  new Paragraph({
    spacing: { after: 400 },
    children: [new TextRun({ text: "Industry Overview, Peer Comparison & Company Profiles", font: BODY_FONT, size: 23, color: MID_BLUE })],
  }),
  new Paragraph({
    spacing: { after: 60 },
    children: [new TextRun({ text: `Prepared by: Jaimin  |  CA Articleship practice report  |  ${data.asOf}`, font: BODY_FONT, size: 19 })],
  }),
  new Paragraph({
    spacing: { after: 300 },
    children: [new TextRun({ text: "Coverage: not a SEBI-registered Research Analyst — see Disclaimer & Methodology", font: BODY_FONT, size: 16, italics: true, color: GREY })],
  }),
  new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text: "COVERAGE UNIVERSE", font: BODY_FONT, size: 16, bold: true, color: NAVY })],
  }),
  coverUniverseTable,
  new Paragraph({
    spacing: { before: 300 },
    border: { top: { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF", space: 8 } },
    children: [new TextRun({
      text: "This is a practice document, not investment advice or investment research. See the Disclaimer & Methodology section for data sources and limitations.",
      font: BODY_FONT, size: 17, italics: true, color: GREY,
    })],
  }),
  new Paragraph({ children: [new PageBreak()] }),
];

// ---------------------------------------------------------------- Build doc
const doc = new Document({
  features: { updateFields: true },
  numbering: {
    config: [{
      reference: "bullets",
      levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 420, hanging: 260 } } } }],
    }],
  },
  styles: {
    default: {
      document: { run: { font: BODY_FONT, size: 21 } },
    },
  },
  sections: [
    // Section 1: Cover (portrait, no header/footer)
    {
      properties: {
        page: { size: { width: A4_WIDTH, height: A4_HEIGHT }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } },
      },
      children: coverChildren,
    },
    // Section 2: TOC + Executive Summary + Industry Overview (portrait)
    {
      properties: {
        page: { size: { width: A4_WIDTH, height: A4_HEIGHT }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } },
      },
      headers: { default: pageHeader() },
      footers: { default: pageFooter() },
      children: [
        h1("Table of Contents"),
        tocEntry("Executive Summary", 3),
        tocEntry("Industry Overview", 3),
        tocEntry("Peer Comparison — League Table", 8),
        tocEntry("Investment Considerations", 9),
        tocEntry("Company Snapshots", 10),
        tocEntry("Vardhman Textiles Ltd", 11, { indent: true }),
        tocEntry("Trident Limited", 13, { indent: true }),
        tocEntry("Welspun Living Ltd", 15, { indent: true }),
        tocEntry("Raymond Lifestyle Ltd", 17, { indent: true }),
        tocEntry("Arvind Limited", 20, { indent: true }),
        tocEntry("K.P.R. Mill Limited", 22, { indent: true }),
        tocEntry("Page Industries Limited", 24, { indent: true }),
        tocEntry("Gokaldas Exports Ltd", 26, { indent: true }),
        tocEntry("Disclaimer & Methodology", 28),
        new Paragraph({ children: [new PageBreak()] }),

        h1("Executive Summary"),
        sectorSnapshotStrip(),
        new Paragraph({ spacing: { before: 220 }, children: [] }),
        body(`This report covers the Indian listed textile and apparel industry: the industry-level backdrop, and a peer comparison of eight listed companies spanning yarn/spinning, home textiles, branded apparel, denim, knitwear, innerwear and garment exports — Vardhman Textiles, Trident, Welspun Living, Raymond Lifestyle, Arvind, KPR Mill, Page Industries and Gokaldas Exports.`),
        body(industry.growthOutlook),
        body(`Valuations across the peer set vary widely (P/E roughly ${fmtNum(Math.min(...companies.map(c=>c.peRatio).filter(v=>v!=null)),0)}x to ${fmtNum(Math.max(...companies.map(c=>c.peRatio).filter(v=>v!=null)),0)}x), reflecting the mix of commodity-linked spinners, branded consumer names and export-facing manufacturers in the sample — see the Peer Comparison section for the full set of metrics, and the accompanying workbook (Textile_Peer_Comparison.xlsx) for a sortable version of the same data.`),

        h1("Industry Overview"),
        h2("Market Size & Structure"),
        body(industry.marketSizeUsd),
        body(industry.domesticVsExportSplit),
        h2("Exports"),
        body(industry.exportValueUsd),
        h2("Growth Outlook"),
        body(industry.growthOutlook),
        h2("Competitive Landscape"),
        body(industry.competitiveLandscape),
        h2("Raw Material Trends"),
        body(industry.rawMaterialTrends),
        ...listSection("Key Demand Drivers", industry.keyDemandDrivers),
        ...listSection("Government Policy Support", industry.governmentPolicy),
        ...listSection("Key Industry Risks", industry.keyRisks),
      ],
    },
    // Section 3: Peer comparison table (landscape)
    {
      properties: {
        page: {
          size: { width: A4_WIDTH, height: A4_HEIGHT, orientation: PageOrientation.LANDSCAPE },
          margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
        },
      },
      headers: { default: pageHeader() },
      footers: { default: pageFooter() },
      children: [
        h1("Peer Comparison — League Table"),
        caption(`Figures are per-company latest available fiscal year; market data (CMP, market cap, P/E) as of ${data.asOf}. Full detail with 52-week range, CAGR and sources is in Textile_Peer_Comparison.xlsx.`),
        peerTable,
        new Paragraph({
          spacing: { before: 140 },
          children: [new TextRun({ text: "Source: company results, exchange filings, and financial news, compiled via web research; see Company Snapshots and Disclaimer & Methodology for per-figure sourcing and caveats.", font: BODY_FONT, size: 15, italics: true, color: GREY })],
        }),
      ],
    },
    // Section 4: Investment Considerations + Company snapshots (portrait)
    {
      properties: {
        page: { size: { width: A4_WIDTH, height: A4_HEIGHT }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } },
      },
      headers: { default: pageHeader() },
      footers: { default: pageFooter() },
      children: [
        ...investmentConsiderations(),
        h1("Company Snapshots"),
        ...companies.flatMap((c) => [
          new Paragraph({ children: [new PageBreak()] }),
          ...companySection(c),
        ]),
      ],
    },
    // Section 5: Disclaimer & methodology (portrait)
    {
      properties: {
        page: { size: { width: A4_WIDTH, height: A4_HEIGHT }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } },
      },
      headers: { default: pageHeader() },
      footers: { default: pageFooter() },
      children: [
        h1("Disclaimer & Methodology"),
        h2("Purpose"),
        body("This report was prepared as a CA articleship practice exercise in equity research and peer benchmarking. It is not investment advice, a recommendation to buy or sell any security, or a substitute for a professional research report. Nothing in this document should be relied upon for an investment decision."),
        h2("Data sources"),
        body(data.disclaimer),
        body("Company- and industry-level figures were compiled from public secondary sources — financial news, brokerage result notes, exchange filings referenced by news coverage, and data aggregators — gathered via web search. Where primary data aggregators were unreachable, figures were cross-checked across multiple secondary sources for internal consistency (e.g. market cap against CMP × shares outstanding). Company-specific caveats are noted under “Data notes” in each company's snapshot, and full source URLs are listed in the accompanying data/textile_peer_data.json file and in the Textile_Peer_Comparison.xlsx workbook's Company Notes sheet."),
        h2("Limitations"),
        bullet("Figures are a point-in-time snapshot (see “As of” dates) and will go stale as companies report new quarters and prices move."),
        bullet("Ratios (ROE, ROCE, margins) can vary by source depending on trailing-period and calculation methodology; where sources disagreed materially, this is flagged in the relevant company's data notes."),
        bullet("This report does not constitute a fairness opinion, valuation, or audit and has not been reviewed by a qualified financial professional."),
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(OUT_DOCX, buffer);
  console.log("Saved docx");
});
