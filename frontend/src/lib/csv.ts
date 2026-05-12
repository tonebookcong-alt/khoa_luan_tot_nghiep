type Cell = string | number | boolean | null | undefined | Date;

const escape = (v: Cell): string => {
  if (v === null || v === undefined) return '';
  const s = v instanceof Date ? v.toISOString() : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

export function exportCsv<T>(opts: {
  filename: string;
  columns: { header: string; value: (row: T) => Cell }[];
  rows: T[];
}) {
  const { filename, columns, rows } = opts;
  const headerLine = columns.map((c) => escape(c.header)).join(',');
  const bodyLines = rows.map((r) => columns.map((c) => escape(c.value(r))).join(','));
  const csv = [headerLine, ...bodyLines].join('\r\n');
  // BOM giúp Excel hiểu UTF-8 (tiếng Việt không bị lỗi font)
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `${filename}-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
