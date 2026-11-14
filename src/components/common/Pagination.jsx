import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Check } from 'lucide-react';

function PageSizeDropdown({ value, onChange, options = [5, 8, 12, 20] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-1.5 border border-[#535F80]/30 dark:border-slate-700 bg-[#FEFEFE] dark:bg-slate-800 text-[#051747] dark:text-slate-200 rounded px-2.5 py-1 text-xs font-medium hover:border-[#081F62] cursor-pointer transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{value} / page</span>
        <ChevronDown
          className={`w-3 h-3 text-[#535F80] transition-transform duration-150 ${
            open ? 'rotate-180 text-[#081F62] dark:text-slate-200' : ''
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute bottom-full mb-1 left-0 bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-700 rounded-md shadow-lg py-1 z-50 min-w-[96px] overflow-hidden"
        >
          {options.map((sz) => {
            const isSelected = sz === value;
            return (
              <button
                key={sz}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(sz);
                  setOpen(false);
                }}
                className={`w-full text-left px-2.5 py-1 text-xs cursor-pointer flex items-center justify-between transition-colors ${
                  isSelected
                    ? 'bg-[#081F62] text-[#FEFEFE] font-semibold'
                    : 'text-[#051747] dark:text-slate-200 hover:bg-[#E7E9F0]/70 dark:hover:bg-slate-800'
                }`}
              >
                <span>{sz} / page</span>
                {isSelected && <Check className="w-3 h-3 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) {
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(totalItems, page * pageSize);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-[#E7E9F0] dark:border-slate-800 text-xs text-[#535F80] dark:text-slate-400">
      <div className="flex items-center gap-3">
        <span className="tabular-nums">
          Showing <strong className="text-[#051747] dark:text-slate-200">{start}</strong>–
          <strong className="text-[#051747] dark:text-slate-200">{end}</strong> of{' '}
          <strong className="text-[#051747] dark:text-slate-200">{totalItems}</strong> records
        </span>
        {onPageSizeChange && (
          <PageSizeDropdown
            value={pageSize}
            onChange={(sz) => {
              onPageSizeChange(sz);
              onPageChange(1);
            }}
          />
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#535F80]/25 dark:border-slate-700 bg-[#FEFEFE] dark:bg-slate-800 text-[#051747] dark:text-slate-200 hover:bg-[#E7E9F0]/60 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Prev
        </button>
        <span className="px-2 tabular-nums font-medium text-[#051747] dark:text-slate-200">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#535F80]/25 dark:border-slate-700 bg-[#FEFEFE] dark:bg-slate-800 text-[#051747] dark:text-slate-200 hover:bg-[#E7E9F0]/60 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          Next
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
