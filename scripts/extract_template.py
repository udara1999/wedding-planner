#!/usr/bin/env python3
"""
Extract template content from the workbook into seed SQL (ticket 1.3).

    python3 scripts/extract_template.py --locale poruwa > out.sql

Why a script rather than hand-written SQL: the workbook holds the content
already, and the due dates are formulas relative to a named `WeddingDate`
cell (`=WeddingDate-360`), which is exactly the `offset_days` the schema wants.
Extraction is mechanical, so it should be repeatable — a workbook edit becomes
a re-run and a reviewable diff rather than a transcription exercise.

Only Python's standard library is used, deliberately: this is a build-time
tool, and an xlsx dependency would have to be carried by the app forever.

Output is deterministic (stable ordering, no timestamps) so that re-running it
against an unchanged workbook produces a byte-identical file.

Phase 1 extracts three sheets. Later phases add their own as the tables they
write to are created:
    00 Lists      -> template.lookups   (the user-extensible lists only)
    07 Tasks      -> template.tasks
    08 Countdown  -> template.countdown_checks
"""

from __future__ import annotations

import argparse
import re
import sys
import xml.etree.ElementTree as ET
import zipfile
from dataclasses import dataclass

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"

WORKBOOK = "docs/Wedding PLanner.xlsx"

# 00 Lists columns that code branches on are state machines and belong in
# Postgres enums, not in a lookup table (plan §4.3). Only these are seeded as
# user-extensible lookups.
EXTENSIBLE_LISTS = {"Owner", "PayMethod", "Ownership"}

# Priorities the workbook uses, mapped to the task_priority enum.
PRIORITY = {
    "critical": "critical",
    "high": "high",
    "medium": "medium",
    "low": "low",
}


def col_index(ref: str) -> int:
    """'C7' -> 2 (zero-based column)."""
    m = re.match(r"([A-Z]+)", ref or "")
    if not m:
        return 0
    n = 0
    for ch in m.group(1):
        n = n * 26 + (ord(ch) - 64)
    return n - 1


@dataclass
class Cell:
    value: str
    formula: str


class Workbook:
    """Just enough of the xlsx format to read values, formulas and named ranges."""

    def __init__(self, path: str) -> None:
        self.z = zipfile.ZipFile(path)

        self.shared: list[str] = []
        if "xl/sharedStrings.xml" in self.z.namelist():
            root = ET.fromstring(self.z.read("xl/sharedStrings.xml"))
            for si in root.findall(f"{NS}si"):
                self.shared.append("".join(t.text or "" for t in si.iter(f"{NS}t")))

        wb = ET.fromstring(self.z.read("xl/workbook.xml"))
        rels = ET.fromstring(self.z.read("xl/_rels/workbook.xml.rels"))
        target = {r.get("Id"): r.get("Target") for r in rels}

        self.parts: dict[str, str] = {}
        for sh in wb.find(f"{NS}sheets"):
            t = (target[sh.get(f"{REL}id")] or "").lstrip("/")
            if not t.startswith("xl/"):
                t = "xl/" + t
            self.parts[sh.get("name")] = t

        self.names: dict[str, str] = {}
        dn = wb.find(f"{NS}definedNames")
        if dn is not None:
            for d in dn:
                if d.text:
                    self.names[d.get("name")] = d.text

    def rows(self, sheet: str) -> list[list[Cell]]:
        root = ET.fromstring(self.z.read(self.parts[sheet]))
        out: list[list[Cell]] = []
        for row in root.iter(f"{NS}row"):
            cells: dict[int, Cell] = {}
            for c in row.findall(f"{NS}c"):
                v = c.find(f"{NS}v")
                inline = c.find(f"{NS}is")
                f = c.find(f"{NS}f")
                if c.get("t") == "s" and v is not None and v.text is not None:
                    value = self.shared[int(v.text)]
                elif inline is not None:
                    value = "".join(t.text or "" for t in inline.iter(f"{NS}t"))
                else:
                    value = (v.text or "") if v is not None else ""
                cells[col_index(c.get("r") or "")] = Cell(
                    value.strip(), (f.text or "").strip() if f is not None else ""
                )
            width = max(cells) + 1 if cells else 0
            out.append([cells.get(i, Cell("", "")) for i in range(width)])
        return out


def offset_from_formula(formula: str, date_name: str = "WeddingDate") -> int | None:
    """'=WeddingDate-360' -> -360.  'WeddingDate' -> 0.  Anything else -> None."""
    if not formula:
        return None
    m = re.fullmatch(rf"\s*{date_name}\s*([+-])\s*(\d+)\s*", formula)
    if m:
        n = int(m.group(2))
        return -n if m.group(1) == "-" else n
    if re.fullmatch(rf"\s*{date_name}\s*", formula):
        return 0
    return None


def q(value: str | None) -> str:
    """SQL literal."""
    if value is None or value == "":
        return "null"
    return "'" + value.replace("'", "''") + "'"


def header_index(rows: list[list[Cell]], must_contain: str) -> int:
    for i, r in enumerate(rows):
        if any(c.value == must_contain for c in r):
            return i
    raise SystemExit(f"could not find a header row containing {must_contain!r}")


def columns(rows: list[list[Cell]], header_row: int) -> dict[str, int]:
    return {c.value: i for i, c in enumerate(rows[header_row]) if c.value}


def extract_tasks(wb: Workbook, locale: str) -> list[str]:
    rows = wb.rows("07 Tasks")
    h = header_index(rows, "Task")
    col = columns(rows, h)
    need = ("Category", "Task", "Owner", "Priority", "Due date")
    missing = [n for n in need if n not in col]
    if missing:
        raise SystemExit(f"07 Tasks is missing column(s): {missing}")

    values, skipped = [], []
    seq = 0
    for r in rows[h + 1 :]:
        def cell(name: str) -> Cell:
            i = col[name]
            return r[i] if i < len(r) else Cell("", "")

        task = cell("Task").value
        if not task:
            continue
        offset = offset_from_formula(cell("Due date").formula)
        if offset is None:
            # A hardcoded date carries no offset, so re-dating (1.7) could not
            # move it. Better to drop it loudly than to seed a task that
            # silently refuses to move when the wedding date changes.
            skipped.append(task)
            continue
        priority = PRIORITY.get(cell("Priority").value.lower())
        seq += 1
        values.append(
            f"  ({q(locale)}, {seq}, {q(cell('Category').value)}, {q(task)}, "
            f"{q(cell('Owner').value)}, {q(priority)}, {offset})"
        )

    if skipped:
        print(
            f"-- WARNING: {len(skipped)} task(s) skipped for having no WeddingDate "
            f"formula: {'; '.join(skipped[:3])}"
            + ("…" if len(skipped) > 3 else ""),
            file=sys.stderr,
        )

    if not values:
        raise SystemExit("07 Tasks produced no rows")

    return [
        "insert into template.tasks",
        "  (locale, seq, category, task, owner_default, priority, offset_days)",
        "values",
        ",\n".join(values) + ";",
        "",
    ]


def extract_countdown(wb: Workbook, locale: str) -> list[str]:
    rows = wb.rows("08 Countdown")
    h = header_index(rows, "Check")
    col = columns(rows, h)
    for n in ("Window", "Date", "Check"):
        if n not in col:
            raise SystemExit(f"08 Countdown is missing column {n!r}")

    values = []
    seq = 0
    window = ""
    for r in rows[h + 1 :]:
        def cell(name: str) -> Cell:
            i = col[name]
            return r[i] if i < len(r) else Cell("", "")

        check = cell("Check").value
        if not check:
            continue
        # The window label is only written on the first row of each block.
        window = cell("Window").value or window
        offset = offset_from_formula(cell("Date").formula)
        if offset is None:
            continue
        owner = cell("Owner").value if "Owner" in col else ""
        seq += 1
        values.append(
            f"  ({q(locale)}, {seq}, {q(window)}, {offset}, {q(check)}, {q(owner)})"
        )

    if not values:
        raise SystemExit("08 Countdown produced no rows")

    return [
        "insert into template.countdown_checks",
        "  (locale, seq, window_label, offset_days, check_text, owner_default)",
        "values",
        ",\n".join(values) + ";",
        "",
    ]


def extract_lookups(wb: Workbook, locale: str) -> list[str]:
    rows = wb.rows("00 Lists")
    h = header_index(rows, "Applicability")
    col = columns(rows, h)

    values = []
    for kind in sorted(EXTENSIBLE_LISTS):
        if kind not in col:
            raise SystemExit(f"00 Lists is missing the {kind!r} column")
        i = col[kind]
        order = 0
        for r in rows[h + 1 :]:
            v = r[i].value if i < len(r) else ""
            if not v:
                continue
            order += 1
            values.append(f"  ({q(locale)}, {q(kind)}, {q(v)}, {order})")

    if not values:
        raise SystemExit("00 Lists produced no rows")

    return [
        "insert into template.lookups (locale, kind, value, sort_order)",
        "values",
        ",\n".join(values) + ";",
        "",
    ]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--workbook", default=WORKBOOK)
    ap.add_argument("--locale", default="poruwa")
    ap.add_argument("--label", default="Poruwa (Sinhala Buddhist)")
    ap.add_argument("--version", type=int, default=1)
    args = ap.parse_args()

    wb = Workbook(args.workbook)
    if "WeddingDate" not in wb.names:
        raise SystemExit("the workbook has no WeddingDate named range to date tasks from")

    out: list[str] = [
        "-- =============================================================================",
        f"-- Template content for locale '{args.locale}'  (ticket 1.3)",
        "-- =============================================================================",
        "-- GENERATED by scripts/extract_template.py from the workbook in docs/.",
        "-- Do not edit by hand: re-run the script and commit the diff. Content changes",
        "-- ship as a NEW migration plus a template.locales.version bump, because a",
        "-- migration that has already been applied cannot be rewritten.",
        "-- =============================================================================",
        "",
        "insert into template.locales (code, label, language, tradition, version)",
        f"values ({q(args.locale)}, {q(args.label)}, 'en', {q(args.locale)}, {args.version})",
        "on conflict (code) do update set label = excluded.label, version = excluded.version;",
        "",
    ]
    out += extract_lookups(wb, args.locale)
    out += extract_tasks(wb, args.locale)
    out += extract_countdown(wb, args.locale)

    sys.stdout.write("\n".join(out))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
