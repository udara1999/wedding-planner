import { describe, expect, it } from 'vitest';
import { buildXlsx, columnName, type Sheet } from './xlsx';

/** Reads the local file headers well enough to assert on what went in. */
function entries(bytes: Uint8Array): Map<string, string> {
  const text = new TextDecoder('latin1').decode(bytes);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out = new Map<string, string>();
  let i = 0;
  while (true) {
    const at = text.indexOf('PK', i);
    if (at === -1) break;
    const size = view.getUint32(at + 18, true);
    const nameLen = view.getUint16(at + 26, true);
    const extraLen = view.getUint16(at + 28, true);
    const name = text.slice(at + 30, at + 30 + nameLen);
    const start = at + 30 + nameLen + extraLen;
    out.set(name, text.slice(start, start + size));
    i = start + size;
  }
  return out;
}

const simple: Sheet[] = [
  {
    name: 'One',
    columns: [{ header: 'Name' }, { header: 'Amount' }],
    rows: [
      ['Nayana nanda', 1000],
      ['Anusha nanda', 2500],
    ],
  },
];

describe('columnName', () => {
  it('counts A to Z then AA', () => {
    expect(columnName(0)).toBe('A');
    expect(columnName(25)).toBe('Z');
    expect(columnName(26)).toBe('AA');
    expect(columnName(27)).toBe('AB');
    expect(columnName(51)).toBe('AZ');
    expect(columnName(52)).toBe('BA');
    // The source workbook has columns past Z, so this is not hypothetical.
    expect(columnName(701)).toBe('ZZ');
    expect(columnName(702)).toBe('AAA');
  });
});

describe('buildXlsx', () => {
  it('produces a zip starting with the local file header signature', () => {
    const bytes = buildXlsx(simple);
    expect(bytes[0]).toBe(0x50); // P
    expect(bytes[1]).toBe(0x4b); // K
    expect(bytes[2]).toBe(0x03);
    expect(bytes[3]).toBe(0x04);
  });

  it('contains every part a reader needs to open it', () => {
    const files = entries(buildXlsx(simple));
    for (const part of [
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/workbook.xml',
      'xl/_rels/workbook.xml.rels',
      'xl/styles.xml',
      'xl/worksheets/sheet1.xml',
    ]) {
      expect(files.has(part), `missing ${part}`).toBe(true);
    }
  });

  it('writes one worksheet part per sheet, and declares each in the workbook', () => {
    const files = entries(
      buildXlsx([
        { name: 'First', columns: [{ header: 'A' }], rows: [['x']] },
        { name: 'Second', columns: [{ header: 'B' }], rows: [['y']] },
      ]),
    );
    expect(files.has('xl/worksheets/sheet1.xml')).toBe(true);
    expect(files.has('xl/worksheets/sheet2.xml')).toBe(true);
    expect(files.get('xl/workbook.xml')).toContain('name="First"');
    expect(files.get('xl/workbook.xml')).toContain('name="Second"');
  });

  it('writes text as an inline string and numbers as numbers', () => {
    const sheet = entries(buildXlsx(simple)).get('xl/worksheets/sheet1.xml')!;
    expect(sheet).toContain('t="inlineStr"');
    expect(sheet).toContain('Nayana nanda');
    // A number must not be quoted as a string, or every total in the file
    // becomes text and nothing sums.
    expect(sheet).toContain('<c r="B2"><v>1000</v></c>');
  });

  it('escapes the XML characters', () => {
    const sheet = entries(
      buildXlsx([
        { name: 'Escapes', columns: [{ header: 'H' }], rows: [['Ben & Jerry <"quoted">']] },
      ]),
    ).get('xl/worksheets/sheet1.xml')!;
    expect(sheet).toContain('&amp;');
    expect(sheet).toContain('&lt;');
    expect(sheet).toContain('&gt;');
    expect(sheet).not.toContain('Jerry <"');
  });

  it('strips control characters rather than writing an unopenable file', () => {
    // Excel rejects a whole workbook for one stray control byte, so a note
    // pasted out of a PDF must not be able to break the export.
    const sheet = entries(
      buildXlsx([{ name: 'Ctrl', columns: [{ header: 'H' }], rows: [['badvalue']] }]),
    ).get('xl/worksheets/sheet1.xml')!;
    expect(sheet).toContain('badvalue');
  });

  it('renders null and undefined as an empty cell, not as the word null', () => {
    const sheet = entries(
      buildXlsx([
        { name: 'Blanks', columns: [{ header: 'A' }, { header: 'B' }], rows: [[null, undefined]] },
      ]),
    ).get('xl/worksheets/sheet1.xml')!;
    expect(sheet).not.toContain('null');
    expect(sheet).not.toContain('undefined');
  });

  it('writes booleans as yes and no, which is what the workbook uses', () => {
    const sheet = entries(
      buildXlsx([
        { name: 'Bools', columns: [{ header: 'A' }, { header: 'B' }], rows: [[true, false]] },
      ]),
    ).get('xl/worksheets/sheet1.xml')!;
    expect(sheet).toContain('Yes');
    expect(sheet).toContain('No');
  });

  it('puts the headers in row 1 with the bold style', () => {
    const sheet = entries(buildXlsx(simple)).get('xl/worksheets/sheet1.xml')!;
    expect(sheet).toContain('<c r="A1" t="inlineStr" s="1">');
    expect(sheet).toContain('Name');
  });

  it('trims a sheet name to the 31 characters Excel allows', () => {
    const long = 'A name far longer than Excel will accept in a tab';
    const wb = entries(buildXlsx([{ name: long, columns: [{ header: 'x' }], rows: [] }])).get(
      'xl/workbook.xml',
    )!;
    const match = /name="([^"]*)"/.exec(wb);
    expect(match?.[1].length).toBeLessThanOrEqual(31);
  });

  it('removes the characters Excel forbids in a sheet name', () => {
    const wb = entries(
      buildXlsx([{ name: 'Bad:/\\?*[]name', columns: [{ header: 'x' }], rows: [] }]),
    ).get('xl/workbook.xml')!;
    const match = /name="([^"]*)"/.exec(wb);
    expect(match?.[1]).toBe('Badname');
  });

  it('makes duplicate sheet names unique, because Excel refuses them', () => {
    const wb = entries(
      buildXlsx([
        { name: 'Same', columns: [{ header: 'x' }], rows: [] },
        { name: 'Same', columns: [{ header: 'x' }], rows: [] },
      ]),
    ).get('xl/workbook.xml')!;
    const names = [...wb.matchAll(/name="([^"]*)"/g)].map((m) => m[1]);
    expect(new Set(names).size).toBe(names.length);
  });

  it('handles a sheet with no rows at all', () => {
    const bytes = buildXlsx([{ name: 'Empty', columns: [{ header: 'H' }], rows: [] }]);
    expect(bytes.length).toBeGreaterThan(0);
    expect(entries(bytes).get('xl/worksheets/sheet1.xml')).toContain('H');
  });

  it('refuses to build a workbook with no sheets', () => {
    // An empty zip opens to nothing and looks exactly like data loss.
    expect(() => buildXlsx([])).toThrow(/at least one sheet/i);
  });
});
