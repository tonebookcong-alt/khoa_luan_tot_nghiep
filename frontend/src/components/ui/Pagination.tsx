'use client';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  total?: number;
  pageSize?: number;
  onChange: (page: number) => void;
}

function buildPageRange(current: number, total: number): (number | 'gap')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | 'gap')[] = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);
  if (left > 2) out.push('gap');
  for (let i = left; i <= right; i++) out.push(i);
  if (right < total - 1) out.push('gap');
  out.push(total);
  return out;
}

export function Pagination({ page, totalPages, total, pageSize, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;
  const range = buildPageRange(page, totalPages);
  const goto = (p: number) => {
    const next = Math.min(Math.max(1, p), totalPages);
    if (next !== page) onChange(next);
  };

  const showSummary = total !== undefined && pageSize !== undefined;
  const from = showSummary ? (page - 1) * pageSize! + 1 : 0;
  const to = showSummary ? Math.min(page * pageSize!, total!) : 0;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
      {showSummary && (
        <p className="text-xs text-gray-500">
          Hiển thị <span className="font-medium text-gray-700">{from}–{to}</span> / <span className="font-medium text-gray-700">{total}</span> kết quả
        </p>
      )}
      <div className="flex items-center gap-1 ml-auto">
        <button
          type="button"
          onClick={() => goto(1)}
          disabled={page === 1}
          aria-label="Trang đầu"
          className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => goto(page - 1)}
          disabled={page === 1}
          aria-label="Trang trước"
          className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {range.map((item, idx) =>
          item === 'gap' ? (
            <span key={`gap-${idx}`} className="px-2 text-gray-400 text-sm">…</span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => goto(item)}
              aria-current={item === page ? 'page' : undefined}
              className={`h-8 min-w-[2rem] px-2 inline-flex items-center justify-center rounded-md border text-sm font-medium transition ${
                item === page
                  ? 'border-primary bg-primary text-white shadow-sm'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => goto(page + 1)}
          disabled={page === totalPages}
          aria-label="Trang tiếp"
          className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => goto(totalPages)}
          disabled={page === totalPages}
          aria-label="Trang cuối"
          className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
