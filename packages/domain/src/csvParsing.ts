const BYTE_ORDER_MARK = '﻿';

/**
 * Parses RFC 4180 CSV text into rows of cells. Tolerates a leading BOM, CRLF line endings
 * and quoted cells containing commas, quotes and line breaks. Blank lines are dropped.
 */
export function parseCsv(text: string): string[][] {
  const source = text.startsWith(BYTE_ORDER_MARK) ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let isInsideQuotes = false;

  const finishCell = () => {
    row.push(cell);
    cell = '';
  };
  const finishRow = () => {
    finishCell();
    const isBlankLine = row.length === 1 && row[0] === '';
    if (!isBlankLine) rows.push(row);
    row = [];
  };

  for (let position = 0; position < source.length; position++) {
    const character = source[position];
    if (isInsideQuotes) {
      if (character === '"' && source[position + 1] === '"') {
        cell += '"';
        position++;
      } else if (character === '"') {
        isInsideQuotes = false;
      } else {
        cell += character;
      }
    } else if (character === '"') {
      isInsideQuotes = true;
    } else if (character === ',') {
      finishCell();
    } else if (character === '\n') {
      finishRow();
    } else if (character !== '\r') {
      cell += character;
    }
  }
  if (cell !== '' || row.length > 0) finishRow();
  return rows;
}

export interface CsvRecord {
  /** 1-based line number in the source file, header being line 1. */
  sourceRow: number;
  values: Record<string, string>;
}

/** Turns parsed CSV into records keyed by header name. Cell values are trimmed. */
export function parseCsvRecords(text: string): { headers: string[]; records: CsvRecord[] } {
  const [headers = [], ...bodyRows] = parseCsv(text);
  const trimmedHeaders = headers.map((header) => header.trim());
  const records = bodyRows.map((cells, index) => ({
    sourceRow: index + 2,
    values: Object.fromEntries(
      trimmedHeaders.map((header, column) => [header, (cells[column] ?? '').trim()]),
    ),
  }));
  return { headers: trimmedHeaders, records };
}
