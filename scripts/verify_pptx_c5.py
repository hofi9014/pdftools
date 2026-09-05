#!/usr/bin/env python3
"""Independent C5 writer verification via python-pptx.

Reads test-output/epz-C5.pptx (all 3 slides, each with a real table) and the
negative deck test-output/raport-neg-C5.pptx, and reports from the FILE itself:
per-slide table count, rows × grid columns, table bounds, colW (tblGrid) vs the
IR columnWidths, the specific merged cells identified during step 1
(r00 [1x3] anchors, r01c6 [1x2], r03c0 [2x1], r05 [1x4]), and sample cell text.

Merges are read from the raw a:tbl XML: anchors carry gridSpan/rowSpan, cover
cells carry hMerge/vMerge (=1); a covered position under an anchor is NOT an
independent anchor, so r05's two detector anchors c4/c5 (both [1x4]) collapse
into the single c4 anchor in the emitted file - the writer dedups merged
regions by coverage (pptxgenjs "lopsided rows" contract).
"""
import sys
from pptx import Presentation
from pptx.oxml.ns import qn

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

PPTX = sys.argv[1] if len(sys.argv) > 1 else "test-output/epz-C5.pptx"
NEG = sys.argv[2] if len(sys.argv) > 2 else "test-output/raport-neg-C5.pptx"
EMU_PER_PT = 12700.0

errors = []
def check(name, ok, detail=""):
    print("  [PASS] " if ok else "  [FAIL] ", end="")
    print(name + ((" — " + str(detail)) if detail else ""))
    if not ok:
        errors.append(name)

def pt(v_emu):
    return v_emu / EMU_PER_PT if v_emu is not None else None

def iter_tables(slide):
    for sh in slide.shapes:
        if sh.has_table:
            yield sh

def table_structure(tbl_xml):
    """Return (rows, colW_emu, anchors, note) parsed from a:tbl."""
    ns = qn  # helper returns '{ns}tag'
    trs = tbl_xml.findall(qn("a:tr"))
    grid = tbl_xml.find(qn("a:tblGrid"))
    colw = [int(g.get("w")) for g in grid.findall(qn("a:gridCol"))] if grid is not None else []
    anchors = []
    note = None
    for r, tr in enumerate(trs):
        c = 0
        for tc in tr.findall(qn("a:tc")):
            is_cont = tc.get("hMerge") or tc.get("vMerge")
            rowspan = int(tc.get("rowSpan") or 1)
            colspan = int(tc.get("gridSpan") or 1)
            texts = tc.findall(".//" + qn("a:t"))
            text = "".join(t.text or "" for t in texts)
            if not is_cont:
                anchors.append({"r": r, "c": c, "rowspan": rowspan, "colspan": colspan, "text": text})
            else:
                if note is None:
                    note = f"first continuation hMerge={tc.get('hMerge')} vMerge={tc.get('vMerge')} at (r={r},c={c})"
            c += colspan
    return trs, colw, anchors, note

def find_anchor(anchors, r, c):
    for a in anchors:
        if a["r"] == r and a["c"] == c:
            return a
    return None

# ---------------- epz positive deck ----------------
print(f"=== python-pptx C5 verification of {PPTX} ===")
prs = Presentation(PPTX)
check("3 slides", len(prs.slides) == 3, f"{len(prs.slides)}")

expected_rows = [104, 106, 106]
expected_w_pt = [262.1, 144.6, 144.6]
expected_x_pt = [50.5, 50.16, 50.16]
expected_y_pt = [66.5, 66.22, 66.22]
expected_col0_pt = [38.73, 20.9, 20.9]

for si, slide in enumerate(prs.slides):
    tables = list(iter_tables(slide))
    check(f"slide {si+1}: exactly 1 table", len(tables) == 1, f"{len(tables)}")
    if not tables:
        continue
    gf = tables[0]
    tbl_xml = gf.table._tbl
    trs, colw, anchors, note = table_structure(tbl_xml)

    check(f"slide {si+1}: rows == {expected_rows[si]}", len(trs) == expected_rows[si], f"{len(trs)}")
    check(f"slide {si+1}: grid cols == 7", len(colw) == 7, f"{len(colw)}")
    check(f"slide {si+1}: col sum ≈ {expected_w_pt[si]}pt", abs(pt(sum(colw)) - expected_w_pt[si]) < 1.5,
          f"{pt(sum(colw)):.2f}pt")
    check(f"slide {si+1}: colW[0] ≈ {expected_col0_pt[si]}pt", abs(pt(colw[0]) - expected_col0_pt[si]) < 1.0,
          f"{pt(colw[0]):.2f}pt")
    check(f"slide {si+1}: pos x/y ≈ {expected_x_pt[si]}/{expected_y_pt[si]}",
          abs(pt(gf.left) - expected_x_pt[si]) < 2 and abs(pt(gf.top) - expected_y_pt[si]) < 2,
          f"({pt(gf.left):.2f},{pt(gf.top):.2f})")
    check(f"slide {si+1}: size w/h ≈ {expected_w_pt[si]}/{expected_y_pt[si] + 702}",
          abs(pt(gf.width) - expected_w_pt[si]) < 2 and abs(pt(gf.height) - 708.0) < 8,
          f"({pt(gf.width):.2f}x{pt(gf.height):.2f})pt")

    a00 = find_anchor(anchors, 0, 0)
    norm = lambda s: s.replace(" ", "")
    check(f"slide {si+1}: r00c0 anchor non-empty (identity cell)", a00 is not None and a00["colspan"] == 1 and bool(a00["text"]),
          "text=" + (a00["text"][:40] if a00 else "MISSING"))
    if si == 0:
        a04 = find_anchor(anchors, 0, 4)
        a05 = find_anchor(anchors, 0, 5)
        check("slide 1: r00c4/c5 [1x3] anchors", a04 is not None and a04["rowspan"] == 3 and a05 is not None and a05["rowspan"] == 3 and bool(a04["text"]) and bool(a05["text"]),
              "c4=" + (a04["text"][:26] if a04 else "MISSING") + " | c5=" + (a05["text"][:26] if a05 else "MISSING"))
    else:
        n_row0_span3 = sum(1 for a in anchors if a["r"] == 0 and a["c"] in (0, 1, 2, 3) and a["rowspan"] == 3)
        check(f"slide {si+1}: r00 c0-3 all [1x3] anchors", n_row0_span3 == 4, f"{n_row0_span3}")
        a03 = find_anchor(anchors, 1, 6)
        check(f"slide {si+1}: r01c6 [1x2] anchor (Dodatkowe informacje)", a03 is not None and a03["rowspan"] == 2 and a03["colspan"] == 1 and "Dodatkowe" in norm(a03["text"]),
              "text=" + (a03["text"][:40] if a03 else "MISSING"))
        a30 = find_anchor(anchors, 3, 0)
        check(f"slide {si+1}: r03c0 [2x1] anchor (date, colspan=2)", a30 is not None and a30["rowspan"] == 1 and a30["colspan"] == 2 and "2026" in a30["text"],
              "text=" + (a30["text"][:30] if a30 else "MISSING"))
        r5_span4 = [a for a in anchors if a["r"] == 5 and a["rowspan"] == 4]
        check(f"slide {si+1}: r05 c4+c5 [1x4] rowspan anchors", len(r5_span4) == 2 and all(a["colspan"] == 1 for a in r5_span4) and all(bool(a["text"]) for a in r5_span4),
              "texts=" + " / ".join(a["text"][:18] for a in r5_span4))
    if note:
        print(f"      (note: {note})")

# ---------------- negative deck ----------------
print(f"\n=== python-pptx C5 negative check of {NEG} ===")
prs_neg = Presentation(NEG)
check("27 slides", len(prs_neg.slides) == 27, f"{len(prs_neg.slides)}")
n_tables_total = 0
for si, slide in enumerate(prs_neg.slides):
    n_tables_total += len(list(iter_tables(slide)))
check("zero a:tbl tables across ALL 27 slides", n_tables_total == 0, f"{n_tables_total}")

print("")
if errors:
    print(f"FAILURES PRESENT ({len(errors)})")
    sys.exit(1)
print("ALL PASS")