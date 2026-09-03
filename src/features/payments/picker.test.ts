import { describe, expect, it } from 'vitest';
import { resolveBudgetLine, type PickableLine } from './picker';

const LINES: PickableLine[] = [
  { id: '1', code: 'BG077', name: 'Bridal necklace set' },
  { id: '2', code: 'BG082', name: 'Wedding rings (pair)' },
  { id: '3', code: 'BG083', name: "Bride's brother ring" },
  { id: '4', code: null, name: 'Extra: welcome drinks' },
];

describe('resolveBudgetLine', () => {
  it('treats a blank query as nothing chosen yet', () => {
    expect(resolveBudgetLine(LINES, '')).toEqual({ status: 'empty' });
    expect(resolveBudgetLine(LINES, '   ')).toEqual({ status: 'empty' });
  });

  it('resolves an exact workbook code', () => {
    const r = resolveBudgetLine(LINES, 'BG082');
    expect(r.status).toBe('found');
    expect(r.status === 'found' && r.line.id).toBe('2');
  });

  it('does not care about the case of a code', () => {
    const r = resolveBudgetLine(LINES, 'bg082');
    expect(r.status === 'found' && r.line.id).toBe('2');
  });

  it('ignores surrounding whitespace, which pasting tends to add', () => {
    const r = resolveBudgetLine(LINES, '  BG082 ');
    expect(r.status === 'found' && r.line.id).toBe('2');
  });

  it('resolves a name when it identifies exactly one line', () => {
    const r = resolveBudgetLine(LINES, 'necklace');
    expect(r.status === 'found' && r.line.id).toBe('1');
  });

  /** The AC: an unknown code is rejected, not silently ignored. */
  it('rejects a code that does not exist', () => {
    expect(resolveBudgetLine(LINES, 'BG999')).toEqual({ status: 'unknown' });
  });

  it('rejects text that matches nothing', () => {
    expect(resolveBudgetLine(LINES, 'helicopter')).toEqual({ status: 'unknown' });
  });

  it('reports ambiguity rather than guessing', () => {
    const r = resolveBudgetLine(LINES, 'ring');
    expect(r.status).toBe('ambiguous');
    // "Wedding rings (pair)" and "Bride's brother ring"
    expect(r.status === 'ambiguous' && r.matches.map((l) => l.id)).toEqual(['2', '3']);
  });

  /**
   * A code is an identifier and a name is a description, so an exact code match
   * must win even when the same text appears inside another line's name.
   */
  it('prefers an exact code over a name that contains the same text', () => {
    const lines: PickableLine[] = [
      { id: 'a', code: 'RING', name: 'Something else' },
      { id: 'b', code: 'BG001', name: 'A ring for the bride' },
    ];
    const r = resolveBudgetLine(lines, 'ring');
    expect(r.status === 'found' && r.line.id).toBe('a');
  });

  it('can still resolve a line that has no code', () => {
    const r = resolveBudgetLine(LINES, 'welcome drinks');
    expect(r.status === 'found' && r.line.id).toBe('4');
  });
});
