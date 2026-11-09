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
          className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
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
        className={`w-full px-3 py-2 text-sm rounded-md border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-500 ${
          error
            ? 'border-red-400 focus:border-red-500'
            : 'border-slate-200 dark:border-slate-700 focus:border-[#2563EB]'
        }`}
      />
      {error ? (
        <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">{error}</p>
      ) : (
        helperText && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{helperText}</p>
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
  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={name}
          className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select
        id={name}
        name={name}
        value={value ?? ''}
        onChange={onChange}
        disabled={disabled}
        className={`w-full px-3 py-2 text-sm rounded-md border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:bg-slate-50 dark:disabled:bg-slate-800 ${
          error
            ? 'border-red-400 focus:border-red-500'
            : 'border-slate-200 dark:border-slate-700 focus:border-[#2563EB]'
        }`}
      >
        {placeholder && <option value="">{placeholder}</option>}
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
      {error ? (
        <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">{error}</p>
      ) : (
        helperText && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{helperText}</p>
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
          className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
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
        className={`w-full px-3 py-2 text-sm rounded-md border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors ${
          error
            ? 'border-red-400 focus:border-red-500'
            : 'border-slate-200 dark:border-slate-700 focus:border-[#2563EB]'
        }`}
      />
      {error && <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">{error}</p>}
    </div>
  );
}
