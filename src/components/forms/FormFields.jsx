import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export function FormInput({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  required = false,
  disabled = false,
  min,
  max,
  step,
  helperText,
  className = '',
}) {
  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={name}
          className="block text-xs font-medium text-[#051747] dark:text-slate-300 mb-1.5"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        id={name}
        name={name}
        type={type}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        className={`w-full px-3 py-2 text-sm rounded-md border bg-[#FEFEFE] dark:bg-slate-900 text-[#051747] dark:text-slate-100 placeholder:text-[#535F80]/60 focus:outline-none focus:ring-2 focus:ring-[#081F62]/15 transition-colors disabled:bg-[#E7E9F0]/60 dark:disabled:bg-slate-800 disabled:text-[#535F80] ${
          error
            ? 'border-red-400 focus:border-red-500'
            : 'border-[#535F80]/30 dark:border-slate-700 focus:border-[#081F62]'
        }`}
      />
      {error ? (
        <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">{error}</p>
      ) : (
        helperText && (
          <p className="text-[11px] text-[#535F80] dark:text-slate-400 mt-1">{helperText}</p>
        )
      )}
    </div>
  );
}

export function FormSelect({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  error,
  required = false,
  disabled = false,
  helperText,
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    if (open) {
      document.addEventListener('mousedown', handleOutside);
      document.addEventListener('keydown', handleKey);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const normalizedOptions = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === 'object' && opt !== null) {
        return { label: String(opt.label), value: String(opt.value) };
      }
      return { label: String(opt), value: String(opt) };
    });
  }, [options]);

  const currentVal = value !== null && value !== undefined ? String(value) : '';
  const selectedOpt = normalizedOptions.find((opt) => opt.value === currentVal);
  const displayLabel = selectedOpt ? selectedOpt.label : (placeholder || 'Select an option');
  const isSelected = Boolean(selectedOpt);

  const handleSelect = (val) => {
    if (disabled) return;
    onChange({ target: { name, value: val } });
    setOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label
          htmlFor={name}
          className="block text-xs font-medium text-[#051747] dark:text-slate-300 mb-1.5"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <button
        id={name}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full px-3 py-2 text-xs rounded-md border flex items-center justify-between gap-2 bg-[#FEFEFE] dark:bg-slate-900 transition-colors text-left disabled:bg-[#E7E9F0]/60 dark:disabled:bg-slate-800 disabled:cursor-not-allowed cursor-pointer ${
          error
            ? 'border-red-400 focus:border-red-500 ring-1 ring-red-400/20'
            : open
            ? 'border-[#081F62] ring-2 ring-[#081F62]/15'
            : 'border-[#535F80]/30 dark:border-slate-700 hover:border-[#081F62]/60'
        } ${isSelected ? 'text-[#051747] dark:text-slate-100 font-medium' : 'text-[#535F80]/70 dark:text-slate-400'}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#535F80] transition-transform duration-200 shrink-0 ${
            open ? 'rotate-180 text-[#081F62] dark:text-slate-200' : ''
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute top-full left-0 mt-1 w-full bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-700 rounded-lg shadow-xl py-1 z-50 max-h-60 overflow-y-auto"
        >
          {placeholder && (
            <button
              type="button"
              role="option"
              aria-selected={!currentVal}
              onClick={() => handleSelect('')}
              className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-left text-slate-500 dark:text-slate-400 hover:bg-[#E7E9F0]/60 dark:hover:bg-slate-800 cursor-pointer"
            >
              <span>{placeholder}</span>
              {!currentVal && <Check className="w-3.5 h-3.5 shrink-0" />}
            </button>
          )}
          {normalizedOptions.map((opt) => {
            const isOptSelected = opt.value === currentVal;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isOptSelected}
                onClick={() => handleSelect(opt.value)}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left transition-colors cursor-pointer ${
                  isOptSelected
                    ? 'bg-[#081F62] text-[#FEFEFE] font-medium'
                    : 'text-[#051747] dark:text-slate-200 hover:bg-[#E7E9F0]/70 dark:hover:bg-slate-800/80'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isOptSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}

      {error ? (
        <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">{error}</p>
      ) : (
        helperText && (
          <p className="text-[11px] text-[#535F80] dark:text-slate-400 mt-1">{helperText}</p>
        )
      )}
    </div>
  );
}

export function FormTextarea({
  label,
  name,
  value,
  onChange,
  placeholder,
  rows = 3,
  error,
  required = false,
  className = '',
}) {
  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={name}
          className="block text-xs font-medium text-[#051747] dark:text-slate-300 mb-1.5"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <textarea
        id={name}
        name={name}
        rows={rows}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full px-3 py-2 text-sm rounded-md border bg-[#FEFEFE] dark:bg-slate-900 text-[#051747] dark:text-slate-100 placeholder:text-[#535F80]/60 focus:outline-none focus:ring-2 focus:ring-[#081F62]/15 transition-colors ${
          error
            ? 'border-red-400 focus:border-red-500'
            : 'border-[#535F80]/30 dark:border-slate-700 focus:border-[#081F62]'
        }`}
      />
      {error && <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">{error}</p>}
    </div>
  );
}
