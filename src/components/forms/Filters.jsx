import { Search, X, Calendar } from 'lucide-react';

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search records...',
  className = '',
}) {
  return (
    <div className={`relative ${className}`}>
      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-1.5 text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export function FilterDropdown({
  label,
  value,
  onChange,
  options = [],
  className = '',
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {label && (
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
          {label}:
        </span>
      )}
      <select
        value={value || 'All'}
        onChange={(e) => onChange(e.target.value)}
        className="px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#2563EB]"
      >
        <option value="All">All</option>
        {options.map((opt) => {
          const val = typeof opt === 'object' ? opt.value : opt;
          const lbl = typeof opt === 'object' ? opt.label : opt;
          return (
            <option key={val} value={val}>
              {lbl}
            </option>
          );
        })}
      </select>
    </div>
  );
}

export function DateRangeFilter({
  fromDate,
  toDate,
  onFromChange,
  onToChange,
  className = '',
}) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <Calendar className="w-3.5 h-3.5" />
        <span>Date:</span>
      </div>
      <input
        type="date"
        value={fromDate || ''}
        onChange={(e) => onFromChange(e.target.value)}
        className="px-2 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#2563EB]"
      />
      <span className="text-xs text-slate-400">to</span>
      <input
        type="date"
        value={toDate || ''}
        onChange={(e) => onToChange(e.target.value)}
        className="px-2 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#2563EB]"
      />
    </div>
  );
}
