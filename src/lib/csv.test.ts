import { describe, expect, it } from 'vitest';
import { parseCsv } from './csv';

describe('parseCsv', () => {
  it('reads a plain grid', () => {
    expect(parseCsv('a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('keeps commas inside quotes', () => {
    expect(parseCsv('name,city\n"Perera, Nimal",Kandy')).toEqual([
      ['name', 'city'],
      ['Perera, Nimal', 'Kandy'],
    ]);
  });

  it('keeps newlines inside quotes', () => {
    expect(parseCsv('a\n"one\ntwo"')).toEqual([['a'], ['one\ntwo']]);
  });

  it('unescapes a doubled quote', () => {
    expect(parseCsv('a\n"say ""hi"""')).toEqual([['a'], ['say "hi"']]);
  });

  it('handles CRLF the way Excel writes it', () => {
    expect(parseCsv('a,b\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('strips a UTF-8 BOM from the first header', () => {
    // Excel on Windows writes one, and it otherwise becomes part of column 1's
    // name — which silently breaks header matching.
    expect(parseCsv('﻿name,city\nA,B')[0]).toEqual(['name', 'city']);
  });

  it('drops a trailing newline rather than emitting a blank row', () => {
    expect(parseCsv('a\n1\n')).toEqual([['a'], ['1']]);
  });

  it('keeps a genuinely blank row in the middle, so row numbers stay true', () => {
    expect(parseCsv('a\n\n1')).toEqual([['a'], [''], ['1']]);
  });

  it('keeps empty trailing fields', () => {
    expect(parseCsv('a,b,c\n1,,')).toEqual([
      ['a', 'b', 'c'],
      ['1', '', ''],
    ]);
  });

  it('trims unquoted whitespace but not quoted whitespace', () => {
    expect(parseCsv('a,b\n  x  ,"  y  "')).toEqual([
      ['a', 'b'],
      ['x', '  y  '],
    ]);
  });

  it('accepts semicolons when the file uses them', () => {
    // A Sri Lankan Excel install set to a European locale exports semicolons.
    expect(parseCsv('a;b\n1;2', ';')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('returns nothing for an empty file', () => {
    expect(parseCsv('')).toEqual([]);
    expect(parseCsv('   \n  ')).toEqual([]);
  });
});

describe('parseCsv delimiter sniffing', () => {
  it('picks the delimiter that yields the most columns in the header', () => {
    expect(parseCsv('name;city;phone\nA;B;C')[0]).toEqual(['name', 'city', 'phone']);
    expect(parseCsv('name,city,phone\nA,B,C')[0]).toEqual(['name', 'city', 'phone']);
    expect(parseCsv('name\tcity\tphone\nA\tB\tC')[0]).toEqual(['name', 'city', 'phone']);
  });

  it('is not fooled by a comma inside a quoted field of a semicolon file', () => {
    expect(parseCsv('name;city\n"Perera, Nimal";Kandy')).toEqual([
      ['name', 'city'],
      ['Perera, Nimal', 'Kandy'],
    ]);
  });
});
