import { describe, expect, it } from 'vitest';
import { parseCsv, parseCsvRecords } from './csvParsing';
import { serializeCsv } from './csvSerialization';

describe('parseCsv', () => {
  it('handles BOM, CRLF, quotes, embedded commas and line breaks', () => {
    const text = '﻿a,b\r\n"x,1","He said ""hi"""\r\n"multi\nline",z\r\n\r\n';
    expect(parseCsv(text)).toEqual([
      ['a', 'b'],
      ['x,1', 'He said "hi"'],
      ['multi\nline', 'z'],
    ]);
  });

  it('keeps a last row without trailing newline', () => {
    expect(parseCsv('a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('returns no rows for empty text', () => {
    expect(parseCsv('')).toEqual([]);
  });
});

describe('parseCsvRecords', () => {
  it('keys cells by header, trims, and numbers source rows from the header as line 1', () => {
    const { headers, records } = parseCsvRecords('id, name\n1, Anna \n2\n');
    expect(headers).toEqual(['id', 'name']);
    expect(records).toEqual([
      { sourceRow: 2, values: { id: '1', name: 'Anna' } },
      { sourceRow: 3, values: { id: '2', name: '' } },
    ]);
  });
});

describe('serializeCsv', () => {
  it('writes BOM, CRLF and quotes only when needed', () => {
    const csv = serializeCsv([
      ['Name', 'Note'],
      ['Anna', 'a,b'],
      ['Ivan', 'say "x"'],
    ]);
    expect(csv).toBe('﻿Name,Note\r\nAnna,"a,b"\r\nIvan,"say ""x"""\r\n');
  });

  it('round-trips through the parser', () => {
    const rows = [
      ['a', 'b,c'],
      ['"q"', 'line\nbreak'],
    ];
    expect(parseCsv(serializeCsv(rows))).toEqual(rows);
  });
});
