/**
 * A CSV reader, written here rather than pulled in as a dependency.
 *
 * The file this has to read is whatever the couple's spreadsheet exported —
 * Excel, Numbers, Google Sheets — so it follows RFC 4180 and then handles the
 * three things real exports add on top: a UTF-8 BOM, CRLF line endings, and a
 * locale that writes semicolons because the comma is its decimal separator.
 */

const CANDIDATE_DELIMITERS = [',', ';', '\t', '|'] as const;

/**
 * Splits CSV text into a grid of raw strings. Nothing here interprets a value:
 * numbers, booleans and dates are still text, because deciding what a column
 * means is the mapping step's job, not the reader's.
 *
 * A blank line in the middle is preserved as a one-empty-field row so that the
 * row number an error is reported against matches the line the person sees in
 * their spreadsheet. Only a trailing newline is dropped.
 */
export function parseCsv(text: string, delimiter?: string): string[][] {
  const cleaned = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  if (cleaned.trim() === '') return [];

  const delim = delimiter ?? sniffDelimiter(cleaned);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let hadQuotes = false;

  const endField = () => {
    // Quoted values are taken literally — someone who wrote spaces inside
    // quotes meant them. Unquoted padding around a value is an artefact of how
    // the file was written, not data.
    row.push(hadQuotes ? field : field.trim());
    field = '';
    hadQuotes = false;
  };

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];

    if (quoted) {
      if (ch === '"') {
        if (cleaned[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      quoted = true;
      hadQuotes = true;
    } else if (ch === delim) {
      endField();
    } else if (ch === '\n') {
      endField();
      rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }

  endField();
  rows.push(row);

  // Exactly one: the newline that ends the last real line. A blank line in the
  // middle stays, so reported row numbers line up with the spreadsheet.
  const last = rows[rows.length - 1];
  if (last && last.length === 1 && last[0] === '') rows.pop();

  return rows;
}

/**
 * Picks whichever delimiter splits the header into the most columns. Parsing
 * the whole file once per candidate is the only way to get this right when a
 * quoted field contains one of the other candidates — 'Perera, Nimal' in a
 * semicolon file would otherwise look like evidence for the comma.
 */
function sniffDelimiter(text: string): string {
  let best = ',';
  let bestWidth = 0;
  for (const candidate of CANDIDATE_DELIMITERS) {
    const header = parseCsv(text, candidate)[0];
    const width = header?.length ?? 0;
    if (width > bestWidth) {
      best = candidate;
      bestWidth = width;
    }
  }
  return best;
}
