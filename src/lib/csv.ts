/**
 * CSV export helpers for admin reports.
 *
 * - RFC 4180 quoting: cells containing a comma, quote, CR or LF are wrapped in quotes and inner quotes doubled,
 *   so a product called "Porcelain Tile, 60x60" stays in one column.
 * - Formula-injection guard: text that spreadsheet apps would run as a formula (starts with = + - @, tab or CR)
 *   is prefixed with an apostrophe. Numbers are written as numbers and are never altered, so negative values stay valid.
 */
export type CsvCell = string | number | boolean | null | undefined;

export function csvCell(value: CsvCell): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: CsvCell[][]): string {
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}

/** UTF-8 byte order mark so Excel reads non-ASCII names correctly. */
export const CSV_BOM = '\uFEFF';
