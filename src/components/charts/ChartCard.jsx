export function ChartCard({
  title,
  subtitle,
  actions,
  children,
  height = 'h-48',
  className = '',
}) {
  return (
    <div
      className={`bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-4 shadow-2xs flex flex-col print-card ${className}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-[#051747] dark:text-slate-100">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-[#535F80] dark:text-slate-400 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      <div className={`w-full ${height} min-w-0`}>{children}</div>
    </div>
  );
}
