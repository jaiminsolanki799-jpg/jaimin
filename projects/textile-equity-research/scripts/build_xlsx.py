import json
from pathlib import Path
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.comments import Comment
from openpyxl.chart import BarChart, Reference
from openpyxl.chart.label import DataLabelList

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = PROJECT_ROOT / 'data' / 'textile_peer_data.json'
OUT_PATH = PROJECT_ROOT / 'Textile_Peer_Comparison.xlsx'

with open(DATA_PATH) as f:
    data = json.load(f)

industry = data['industry']
companies = data['companies']

FONT_NAME = 'Arial'
NAVY = '1F3864'
LIGHT_BLUE = 'D9E2F3'
INPUT_BLUE = Font(name=FONT_NAME, size=10, color='0000FF')
HEADER_FONT = Font(name=FONT_NAME, size=10, bold=True, color='FFFFFF')
TITLE_FONT = Font(name=FONT_NAME, size=16, bold=True, color=NAVY)
SUBTITLE_FONT = Font(name=FONT_NAME, size=10, italic=True, color='595959')
SECTION_FONT = Font(name=FONT_NAME, size=12, bold=True, color=NAVY)
LABEL_FONT = Font(name=FONT_NAME, size=10, bold=True)
BODY_FONT = Font(name=FONT_NAME, size=10)
FORMULA_FONT = Font(name=FONT_NAME, size=10, bold=True)
HEADER_FILL = PatternFill('solid', fgColor=NAVY)
ALT_FILL = PatternFill('solid', fgColor='F2F2F2')
STAT_FILL = PatternFill('solid', fgColor=LIGHT_BLUE)
THIN = Side(style='thin', color='BFBFBF')
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)

wb = Workbook()

# ---------------------------------------------------------------- Cover sheet
cover = wb.active
cover.title = 'Cover'
cover.sheet_view.showGridLines = False
cover.column_dimensions['A'].width = 4
cover.column_dimensions['B'].width = 100

cover['B2'] = 'Indian Textile Industry'
cover['B2'].font = Font(name=FONT_NAME, size=22, bold=True, color=NAVY)
cover['B3'] = 'Equity Research – Peer Comparison Workbook'
cover['B3'].font = Font(name=FONT_NAME, size=14, color='595959')
cover['B5'] = f"As of: {data['asOf']}"
cover['B5'].font = BODY_FONT
cover['B6'] = 'Companies covered: ' + ', '.join(c['companyName'] for c in companies)
cover['B6'].font = BODY_FONT
cover['B6'].alignment = Alignment(wrap_text=True, vertical='top')
cover.row_dimensions[6].height = 45

cover['B8'] = 'Disclaimer'
cover['B8'].font = LABEL_FONT
cover['B9'] = data['disclaimer']
cover['B9'].font = BODY_FONT
cover['B9'].alignment = Alignment(wrap_text=True, vertical='top')
cover.row_dimensions[9].height = 90

cover['B11'] = 'Sheets in this workbook'
cover['B11'].font = LABEL_FONT
sheet_notes = [
    '1. Peer Comparison – valuation, profitability, growth and leverage across all 8 companies, with comparison charts',
    '2. Industry Overview – market size, export data, demand drivers, risks and government policy',
    '3. Company Notes – business summary, recent developments, key risks and sources per company',
]
for i, note in enumerate(sheet_notes):
    cell = cover.cell(row=12 + i, column=2, value=note)
    cell.font = BODY_FONT

# ---------------------------------------------------------- Peer Comparison
ws = wb.create_sheet('Peer Comparison')
ws.sheet_view.showGridLines = False

headers = [
    ('Company', 22), ('NSE Ticker', 12), ('Segment', 28), ('Fiscal Year', 14),
    ('CMP (₹)', 12), ('Market Cap (₹ Cr)', 15), ('P/E (x)', 9),
    ('P/S (x)', 9), ('52W High (₹)', 12), ('52W Low (₹)', 12),
    ('Revenue (₹ Cr)', 14), ('Net Profit (₹ Cr)', 14),
    ('OPM (%)', 9), ('NPM (%)', 9), ('ROE (%)', 9), ('ROCE (%)', 9),
    ('D/E (x)', 9), ('Sales CAGR 3Y (%)', 12), ('Profit CAGR 3Y (%)', 12),
    ('Div Yield (%)', 11), ('Promoter Hold (%)', 12),
]

ws['A1'] = 'Peer Comparison – Indian Listed Textile Companies'
ws['A1'].font = SECTION_FONT
ws.merge_cells('A1:U1')
ws['A2'] = f"Figures are per-company latest available fiscal year (see column D); market data (CMP, market cap, P/E, 52-week range) as of {data['asOf']}. Blue cells are sourced inputs – see the Company Notes sheet for sources and confidence notes."
ws['A2'].font = SUBTITLE_FONT
ws.merge_cells('A2:U2')
ws.row_dimensions[2].height = 28
ws['A2'].alignment = Alignment(wrap_text=True, vertical='top')

HEADER_ROW = 4
for col, (name, width) in enumerate(headers, start=1):
    c = ws.cell(row=HEADER_ROW, column=col, value=name)
    c.font = HEADER_FONT
    c.fill = HEADER_FILL
    c.alignment = Alignment(wrap_text=True, vertical='center', horizontal='center')
    c.border = BORDER
    ws.column_dimensions[get_column_letter(col)].width = width
ws.row_dimensions[HEADER_ROW].height = 30

FIELD_COLS = {
    'companyName': 1, 'nseTicker': 2, 'segment': 3, 'fiscalYear': 4,
    'cmp': 5, 'marketCapCr': 6, 'peRatio': 7,
    # 'P/S' col 8 is a formula
    'week52High': 9, 'week52Low': 10,
    'revenueCr': 11, 'netProfitCr': 12,
    'opmPercent': 13, 'npmPercent': 14, 'roePercent': 15, 'rocePercent': 16,
    'debtToEquity': 17, 'salesGrowth3yPercent': 18, 'profitGrowth3yPercent': 19,
    'dividendYieldPercent': 20, 'promoterHoldingPercent': 21,
}
PCT_FIELDS = {'opmPercent', 'npmPercent', 'roePercent', 'rocePercent',
              'salesGrowth3yPercent', 'profitGrowth3yPercent', 'dividendYieldPercent',
              'promoterHoldingPercent'}

first_data_row = HEADER_ROW + 1
for i, comp in enumerate(companies):
    row = first_data_row + i
    fill = ALT_FILL if i % 2 else PatternFill(fill_type=None)
    for field, col in FIELD_COLS.items():
        val = comp.get(field)
        cell = ws.cell(row=row, column=col)
        if val is None:
            cell.value = 'n/a'
            cell.font = Font(name=FONT_NAME, size=10, italic=True, color='999999')
            note = comp.get('confidenceNotes', '')
            if note:
                cell.comment = Comment(note[:800], 'Research agent')
        else:
            cell.value = (val / 100.0) if field in PCT_FIELDS else val
            cell.font = INPUT_BLUE if field not in ('companyName', 'nseTicker', 'segment', 'fiscalYear') else Font(name=FONT_NAME, size=10)
        cell.fill = fill
        cell.border = BORDER
        cell.alignment = Alignment(vertical='center', wrap_text=(field == 'segment'))

    # P/S ratio computed via formula: Market Cap / Revenue
    ps_cell = ws.cell(row=row, column=8, value=f'=IFERROR(F{row}/K{row},"n/a")')
    ps_cell.font = FORMULA_FONT
    ps_cell.fill = fill
    ps_cell.border = BORDER
    ps_cell.number_format = '0.0"x"'

    ws.cell(row=row, column=5).number_format = '₹#,##0.00'
    ws.cell(row=row, column=6).number_format = '₹#,##0'
    ws.cell(row=row, column=7).number_format = '0.0"x"'
    ws.cell(row=row, column=9).number_format = '₹#,##0.00'
    ws.cell(row=row, column=10).number_format = '₹#,##0.00'
    ws.cell(row=row, column=11).number_format = '₹#,##0'
    ws.cell(row=row, column=12).number_format = '₹#,##0'
    for pct_col in (13, 14, 15, 16, 18, 19, 20, 21):
        ws.cell(row=row, column=pct_col).number_format = '0.0%'
    ws.cell(row=row, column=17).number_format = '0.00"x"'

last_data_row = first_data_row + len(companies) - 1

# Summary rows: Average and Median across numeric columns (D&E excluded from stats, text cols skipped)
NUMERIC_COLS = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]
stat_rows = [('Average', 'AVERAGE'), ('Median', 'MEDIAN')]
for j, (label, fn) in enumerate(stat_rows):
    row = last_data_row + 1 + j
    lbl_cell = ws.cell(row=row, column=1, value=label)
    lbl_cell.font = LABEL_FONT
    lbl_cell.fill = STAT_FILL
    lbl_cell.border = BORDER
    for col in range(2, 22):
        cell = ws.cell(row=row, column=col)
        cell.fill = STAT_FILL
        cell.border = BORDER
        if col in NUMERIC_COLS:
            col_letter = get_column_letter(col)
            cell.value = f'={fn}({col_letter}{first_data_row}:{col_letter}{last_data_row})'
            cell.font = FORMULA_FONT
            cell.number_format = ws.cell(row=first_data_row, column=col).number_format

ws.freeze_panes = ws.cell(row=first_data_row, column=2).coordinate

# ---------------------------------------------------------- Charts
CHART_TITLE_FONT = Font(name=FONT_NAME, size=10, bold=True, color='595959')
chart_caption_row = last_data_row + 4
ws.cell(row=chart_caption_row, column=1, value='Peer Comparison Charts').font = SECTION_FONT


def add_bar_chart(title, y_title, y_fmt, cols, anchor):
    chart = BarChart()
    chart.type = 'col'
    chart.grouping = 'clustered'
    chart.title = title
    chart.y_axis.title = y_title
    chart.y_axis.numFmt = y_fmt
    chart.x_axis.title = None
    chart.height = 9
    chart.width = 22
    chart.style = 10
    cats = Reference(ws, min_col=1, min_row=first_data_row, max_row=last_data_row)
    for col in cols:
        data = Reference(ws, min_col=col, min_row=HEADER_ROW, max_row=last_data_row)
        chart.add_data(data, titles_from_data=True)
    chart.set_categories(cats)
    chart.dataLabels = DataLabelList()
    chart.dataLabels.showVal = True
    chart.dataLabels.showCatName = False
    chart.dataLabels.showSerName = False
    chart.dataLabels.showLegendKey = False
    chart.dataLabels.showPercent = False
    chart.dataLabels.showBubbleSize = False
    chart.dataLabels.numFmt = y_fmt
    chart.legend.position = 'b'
    chart.legend.overlay = False
    ws.add_chart(chart, anchor)


chart_row = chart_caption_row + 2
add_bar_chart('Valuation – P/E by Company', 'P/E (x)', '0.0"x"', [7], f'A{chart_row}')
add_bar_chart('Profitability – OPM vs NPM', 'Margin (%)', '0%', [13, 14], f'L{chart_row}')
chart_row += 19
add_bar_chart('Returns – ROE vs ROCE', 'Return (%)', '0%', [15, 16], f'A{chart_row}')
add_bar_chart('Growth – Revenue vs Net Profit (₹ Cr)', 'Amount (₹ Cr)', '₹#,##0', [11, 12], f'L{chart_row}')

# ---------------------------------------------------------- Industry Overview
ind = wb.create_sheet('Industry Overview')
ind.sheet_view.showGridLines = False
ind.column_dimensions['A'].width = 26
ind.column_dimensions['B'].width = 95

ind['A1'] = 'Indian Textile & Apparel Industry – Overview'
ind['A1'].font = SECTION_FONT
ind.merge_cells('A1:B1')

stat_rows_ind = [
    ('Domestic Market Size', industry.get('marketSizeUsd')),
    ('Export Value', industry.get('exportValueUsd')),
    ('Domestic vs Export Split', industry.get('domesticVsExportSplit')),
    ('Growth Outlook', industry.get('growthOutlook')),
    ('Competitive Landscape', industry.get('competitiveLandscape')),
    ('Raw Material Trends', industry.get('rawMaterialTrends')),
]
r = 3
for label, val in stat_rows_ind:
    lc = ind.cell(row=r, column=1, value=label)
    lc.font = LABEL_FONT
    lc.alignment = Alignment(vertical='top', wrap_text=True)
    lc.fill = STAT_FILL
    lc.border = BORDER
    vc = ind.cell(row=r, column=2, value=val or 'n/a')
    vc.font = INPUT_BLUE
    vc.alignment = Alignment(vertical='top', wrap_text=True)
    vc.border = BORDER
    ind.row_dimensions[r].height = max(30, 15 * (len(val or '') // 90 + 1))
    r += 1

r += 1


def write_list_section(title, items, r):
    tc = ind.cell(row=r, column=1, value=title)
    tc.font = LABEL_FONT
    ind.merge_cells(start_row=r, start_column=1, end_row=r, end_column=2)
    tc.fill = STAT_FILL
    tc.border = BORDER
    ind.cell(row=r, column=2).border = BORDER
    r += 1
    for item in items or []:
        c = ind.cell(row=r, column=1, value='•')
        c.alignment = Alignment(horizontal='center', vertical='top')
        c.border = BORDER
        vc = ind.cell(row=r, column=2, value=item)
        vc.font = INPUT_BLUE
        vc.alignment = Alignment(wrap_text=True, vertical='top')
        vc.border = BORDER
        ind.row_dimensions[r].height = max(15, 15 * (len(item) // 90 + 1))
        r += 1
    return r + 1


r = write_list_section('Key Demand Drivers', industry.get('keyDemandDrivers'), r)
r = write_list_section('Key Risks', industry.get('keyRisks'), r)
r = write_list_section('Government Policy Support', industry.get('governmentPolicy'), r)

r += 1
sc = ind.cell(row=r, column=1, value='Sources')
sc.font = LABEL_FONT
r += 1
for src in industry.get('sources', []):
    ind.cell(row=r, column=1, value=src).font = Font(name=FONT_NAME, size=9, color='0563C1')
    ind.merge_cells(start_row=r, start_column=1, end_row=r, end_column=2)
    r += 1

# ---------------------------------------------------------- Company Notes
notes = wb.create_sheet('Company Notes')
notes.sheet_view.showGridLines = False
notes.column_dimensions['A'].width = 22
notes.column_dimensions['B'].width = 100

notes['A1'] = 'Company Notes – Business Summary, Developments, Risks & Sources'
notes['A1'].font = SECTION_FONT
notes.merge_cells('A1:B1')

r = 3
for comp in companies:
    hc = notes.cell(row=r, column=1, value=comp['companyName'])
    hc.font = Font(name=FONT_NAME, size=12, bold=True, color='FFFFFF')
    hc.fill = HEADER_FILL
    notes.merge_cells(start_row=r, start_column=1, end_row=r, end_column=2)
    notes.cell(row=r, column=2).fill = HEADER_FILL
    r += 1

    fields = [
        ('Business Summary', comp.get('businessSummary')),
        ('Recent Developments', comp.get('recentDevelopments')),
        ('Key Risks', comp.get('keyRisks')),
        ('Data As Of', comp.get('dataAsOf')),
        ('Confidence Notes', comp.get('confidenceNotes')),
    ]
    for label, val in fields:
        lc = notes.cell(row=r, column=1, value=label)
        lc.font = LABEL_FONT
        lc.alignment = Alignment(vertical='top', wrap_text=True)
        lc.fill = STAT_FILL
        lc.border = BORDER
        vc = notes.cell(row=r, column=2, value=val or 'n/a')
        vc.font = BODY_FONT
        vc.alignment = Alignment(vertical='top', wrap_text=True)
        vc.border = BORDER
        notes.row_dimensions[r].height = max(15, 13.5 * ((len(val or '')) // 95 + 1))
        r += 1

    sc = notes.cell(row=r, column=1, value='Sources')
    sc.font = LABEL_FONT
    sc.alignment = Alignment(vertical='top')
    sc.fill = STAT_FILL
    sc.border = BORDER
    srcs = '\n'.join(comp.get('sources', []))
    vc = notes.cell(row=r, column=2, value=srcs)
    vc.font = Font(name=FONT_NAME, size=9, color='0563C1')
    vc.alignment = Alignment(vertical='top', wrap_text=True)
    vc.border = BORDER
    notes.row_dimensions[r].height = max(15, 12 * (len(comp.get('sources', [])) ))
    r += 2

wb.save(OUT_PATH)
print('Saved', OUT_PATH)
