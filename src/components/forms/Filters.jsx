import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Calendar, ChevronDown, Check } from 'lucide-react';

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search records...',
  className = '',
}) {
  return (
    <div className={`relative ${className}`}>
      <Search className="w-4 h-4 text-[#535F80] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-1.5 text-sm rounded-md border border-[#535F80]/30 dark:border-slate-700 bg-[#FEFEFE] dark:bg-slate-900 text-[#051747] dark:text-slate-100 placeholder:text-[#535F80]/60 focus:outline-none focus:border-[#081F62] focus:ring-2 focus:ring-[#081F62]/15"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#535F80] hover:text-[#051747] cursor-pointer"
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
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const allOptions = useMemo(() => {
    const list = options.map((opt) => {
      if (typeof opt === 'object' && opt !== null) {
        return { label: String(opt.label), value: String(opt.value) };
      }
      return { label: String(opt), value: String(opt) };
    });
    const hasAll = list.some((item) => item.value === 'All');
    return hasAll ? list : [{ label: 'All', value: 'All' }, ...list];
  }, [options]);

  const currentVal = value ? String(value) : 'All';
  const selectedOption = allOptions.find((opt) => opt.value === currentVal) || {
    label: currentVal,
    value: currentVal,
  };
  const isFiltered = currentVal !== 'All' && currentVal !== '';

  return (
    <div className={`relative inline-flex items-center gap-2 ${className}`} ref={dropdownRef}>
      {label && (
        <span className="text-xs font-medium text-[#535F80] dark:text-slate-400 whitespace-nowrap">
          {label}:
        </span>
      )}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`inline-flex items-center justify-between gap-2.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-all cursor-pointer select-none ${
          isFiltered
            ? 'border-[#081F62] bg-[#E7E9F0]/60 dark:bg-slate-800 text-[#081F62] dark:text-blue-400 font-semibold shadow-2xs ring-1 ring-[#081F62]/20'
            : 'border-[#535F80]/30 dark:border-slate-700 bg-[#FEFEFE] dark:bg-slate-900 text-[#051747] dark:text-slate-200 hover:border-[#081F62]/60 hover:bg-[#E7E9F0]/30'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={label ? `${label} filter: ${selectedOption.label}` : `Filter: ${selectedOption.label}`}
      >
        <span className="truncate">{selectedOption.label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#535F80] transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-[#081F62] dark:text-slate-200' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute top-full left-0 mt-1 min-w-[140px] w-max max-w-[220px] bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-700 rounded-lg shadow-xl py-1 z-50 overflow-hidden"
        >
          {allOptions.map((opt) => {
            const isSelected = opt.value === currentVal;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-3 px-3 py-1.5 text-xs text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#081F62] text-[#FEFEFE] font-medium'
                    : 'text-[#051747] dark:text-slate-200 hover:bg-[#E7E9F0]/70 dark:hover:bg-slate-800/80'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
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
      <div className="inline-flex items-center gap-1.5 text-xs text-[#535F80] dark:text-slate-400">
        <Calendar className="w-3.5 h-3.5" />
        <span>Date:</span>
      </div>
      <input
        type="date"
        value={fromDate || ''}
        onChange={(e) => onFromChange(e.target.value)}
        className="px-2 py-1 text-xs rounded-md border border-[#535F80]/30 dark:border-slate-700 bg-[#FEFEFE] dark:bg-slate-900 text-[#051747] dark:text-slate-200 focus:outline-none focus:border-[#081F62]"
      />
      <span className="text-xs text-[#535F80]">to</span>
      <input
        type="date"
        value={toDate || ''}
        onChange={(e) => onToChange(e.target.value)}
        className="px-2 py-1 text-xs rounded-md border border-[#535F80]/30 dark:border-slate-700 bg-[#FEFEFE] dark:bg-slate-900 text-[#051747] dark:text-slate-200 focus:outline-none focus:border-[#081F62]"
      />
    </div>
  );
}
