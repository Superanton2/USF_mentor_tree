const BYTE_ORDER_MARK = '﻿';
const SPECIAL_CHARACTERS = /[",\r\n]/;

function escapeCell(value: string): string {
  return SPECIAL_CHARACTERS.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/** RFC 4180 CSV with BOM so that Excel opens Cyrillic correctly. */
export function serializeCsv(rows: readonly (readonly string[])[]): string {
  return BYTE_ORDER_MARK + rows.map((row) => row.map(escapeCell).join(',')).join('\r\n') + '\r\n';
}
