export function PrimaryButton({
  children,
  onClick,
  type = 'button',
  disabled = false,
  icon: Icon,
  size = 'md',
  variant = 'primary',
  className = '',
}) {
  const sizeClasses =
    size === 'sm'
      ? 'px-3 py-1.5 text-xs'
      : 'px-4 py-2 text-sm';

  const variantClasses =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white border-red-600'
      : variant === 'success'
      ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
      : 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-[#2563EB]';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 font-medium rounded-md border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${sizeClasses} ${variantClasses} ${className}`}
    >
      {Icon && <Icon className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />}
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  type = 'button',
  disabled = false,
  icon: Icon,
  size = 'md',
  className = '',
}) {
  const sizeClasses =
    size === 'sm'
      ? 'px-3 py-1.5 text-xs'
      : 'px-4 py-2 text-sm';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/70 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${sizeClasses} ${className}`}
    >
      {Icon && <Icon className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />}
      {children}
    </button>
  );
}
