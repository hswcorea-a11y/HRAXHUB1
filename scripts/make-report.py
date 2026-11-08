"""샘플 월간 인사보고서(엑셀) 생성
실행: python3 scripts/make-report.py
assets/data.js의 샘플 데이터를 읽어 reports/HR_monthly_report_2026-10.xlsx를 만듭니다.
"""
import json
from datetime import date
from pathlib import Path

from openpyxl import Workbook
from openpyxl.chart import BarChart, LineChart, Reference
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

ROOT = Path(__file__).resolve().parent.parent
raw = (ROOT / "assets/data.js").read_text(encoding="utf-8")
data = json.loads(raw[raw.index("{"): raw.rindex("}") + 1])

meta = data["meta"]
emps = [dict(zip(data["fields"], r)) for r in data["employees"]]
as_of, start = meta["asOf"], meta["start"]
grades = meta["grades"]
divs = data["org"]
hq_name = {q["id"]: q["name"] for d in divs for q in d["hqs"]}
team_name = {t["id"]: t["name"] for d in divs for q in d["hqs"] for t in q["teams"]}
div_name = {d["id"]: d["name"] for d in divs}


def last_day(key):
    y, m = map(int, key.split("-"))
    nxt = date(y + (m == 12), m % 12 + 1, 1)
    return (date.fromordinal(nxt.toordinal() - 1)).isoformat()


points = [start] + [last_day(k) for k in meta["months"]]
active = lambda e, d: e["hire"] <= d and (not e["exit"] or e["exit"] > d)

NAVY = "1F3A5F"
head_font = Font(bold=True, color="FFFFFF")
head_fill = PatternFill("solid", fgColor=NAVY)
thin = Side(style="thin", color="D0D4DA")
border = Border(bottom=thin)


def write_table(ws, row, headers, rows, widths=None):
    for c, h in enumerate(headers, 1):
        cell = ws.cell(row=row, column=c, value=h)
        cell.font, cell.fill = head_font, head_fill
        cell.alignment = Alignment(horizontal="center", vertical="center")
    for r, vals in enumerate(rows, row + 1):
        for c, v in enumerate(vals, 1):
            cell = ws.cell(row=r, column=c, value=v)
            cell.border = border
    if widths:
        for i, w in enumerate(widths, 1):
            ws.column_dimensions[get_column_letter(i)].width = w
    return row + len(rows)


wb = Workbook()

# 1. 요약
ws = wb.active
ws.title = "요약"
ws["A1"] = f"월간 인사보고서 — {as_of[:4]}년 {int(as_of[5:7])}월"
ws["A1"].font = Font(bold=True, size=16, color=NAVY)
ws["A2"] = f"{meta['company']} · 기준일 {as_of} · 가상 샘플 데이터"
ws["A2"].font = Font(color="777777")
hc = [sum(active(e, d) for e in emps) for d in points]
exits12 = [e for e in emps if e["exit"] and start < e["exit"] <= as_of]
hires12 = [e for e in emps if start < e["hire"] <= as_of]
avg_hc = sum(hc) / len(hc)
summary = [
    ("총인원", hc[-1], "명"),
    ("전월 대비", hc[-1] - hc[-2], "명"),
    ("전년 동월 대비", hc[-1] - hc[0], "명"),
    ("최근 12개월 입사", len(hires12), "명"),
    ("최근 12개월 퇴사", len(exits12), "명"),
    ("연환산 퇴직률", round(len(exits12) / avg_hc, 4), "%"),
    ("자발적 퇴직률", round(sum(1 for e in exits12 if e["voluntary"]) / avg_hc, 4), "%"),
    ("채용 진행 포지션", len(data["positions"]), "개"),
]
write_table(ws, 4, ["지표", "값", "단위"], summary, [24, 14, 8])
for r in range(5, 5 + len(summary)):
    if ws.cell(row=r, column=3).value == "%":
        ws.cell(row=r, column=2).number_format = "0.0%"
        ws.cell(row=r, column=3).value = ""
    else:
        ws.cell(row=r, column=2).number_format = "#,##0;[Red]-#,##0"

# 2. 월별 추이
ws = wb.create_sheet("월별 추이")
rows = []
for i, key in enumerate(meta["months"]):
    a, b = points[i], points[i + 1]
    h = sum(1 for e in emps if a < e["hire"] <= b)
    x = sum(1 for e in emps if e["exit"] and a < e["exit"] <= b)
    rows.append([key, hc[i + 1], h, x, round(x / ((hc[i] + hc[i + 1]) / 2), 4)])
end = write_table(ws, 1, ["월", "월말 인원", "입사", "퇴사", "월 퇴직률"], rows, [12, 12, 10, 10, 12])
for r in range(2, end + 1):
    ws.cell(row=r, column=5).number_format = "0.00%"
bar = BarChart()
bar.title, bar.y_axis.title = "월별 입사 · 퇴사", "명"
bar.add_data(Reference(ws, min_col=3, max_col=4, min_row=1, max_row=end), titles_from_data=True)
bar.set_categories(Reference(ws, min_col=1, min_row=2, max_row=end))
bar.height, bar.width = 8, 16
ws.add_chart(bar, "G2")
line = LineChart()
line.title = "월말 인원"
line.add_data(Reference(ws, min_col=2, min_row=1, max_row=end), titles_from_data=True)
line.set_categories(Reference(ws, min_col=1, min_row=2, max_row=end))
line.height, line.width = 8, 16
ws.add_chart(line, "G19")

# 3. 조직별 인원
ws = wb.create_sheet("조직별 인원")
rows = []
for d in divs:
    for q in d["hqs"]:
        for t in q["teams"]:
            act = [e for e in emps if e["team"] == t["id"] and active(e, as_of)]
            ex = [e for e in exits12 if e["team"] == t["id"]]
            rows.append([d["name"], q["name"], t["name"], len(act), sum(1 for e in act if e["contract"]), len(ex)])
write_table(ws, 1, ["부문", "본부", "팀", "현재 인원", "계약직", "12개월 퇴사"], rows, [16, 20, 16, 12, 10, 12])

# 4. 채용 포지션
ws = wb.create_sheet("채용 포지션")
rows = [[p["title"], div_name[p["div"]], hq_name[p["hq"]], team_name[p["team"]], p["grade"], p["heads"], p["opened"], p["daysOpen"], p["stage"],
         p["funnel"]["applied"], p["funnel"]["screened"], p["funnel"]["interview"]] for p in data["positions"]]
write_table(ws, 1, ["포지션", "부문", "본부", "팀", "직급", "채용 인원", "오픈일", "경과일", "진행 단계", "지원", "서류 통과", "면접"], rows,
            [22, 14, 18, 14, 8, 10, 12, 8, 12, 8, 10, 8])

# 5. 퇴사자 목록
ws = wb.create_sheet("퇴사자(12개월)")
rows = [[e["id"], e["name"], div_name[e["div"]], hq_name.get(e["hq"], ""), team_name.get(e["team"], ""), grades[e["grade"]],
         e["hire"], e["exit"], e["exitReason"], "자발" if e["voluntary"] else "비자발"] for e in sorted(exits12, key=lambda e: e["exit"])]
write_table(ws, 1, ["사번", "이름", "부문", "본부", "팀", "직급", "입사일", "퇴사일", "사유", "유형"], rows, [10, 10, 14, 18, 14, 8, 12, 12, 20, 8])

for s in wb.worksheets:
    s.freeze_panes = "A2" if s.title != "요약" else None

out = ROOT / "reports/HR_monthly_report_2026-10.xlsx"
out.parent.mkdir(exist_ok=True)
wb.save(out)
print("saved", out.relative_to(ROOT))
