import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const TONE_CLASSES = {
  blue: 'bg-blue-50 text-[#2563EB] dark:bg-blue-950/60 dark:text-blue-400',
  green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400',
  red: 'bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400',
  slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

export function StatCard({
  label,
  value,
  sublabel,
  trend,
  trendDirection = 'neutral', // 'up' | 'down' | 'neutral'
  icon: Icon,
  tone = 'blue',
  onClick,
}) {
  const TrendIcon =
    trendDirection === 'up'
      ? TrendingUp
      : trendDirection === 'down'
      ? TrendingDown
      : Minus;

  const trendColor =
    trendDirection === 'up'
      ? 'text-emerald-600 dark:text-emerald-400'
      : trendDirection === 'down'
      ? 'text-red-600 dark:text-red-400'
      : 'text-[#535F80] dark:text-slate-400';

  return (
    <div
      onClick={onClick}
      className={`bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-3.5 sm:p-4 shadow-2xs transition-colors print-card ${
        onClick ? 'cursor-pointer hover:border-[#081F62]/50' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[#535F80] dark:text-slate-400 truncate">
            {label}
          </p>
          <p className="text-xl sm:text-2xl font-bold text-[#051747] dark:text-slate-100 mt-1 sm:mt-1.5 tabular-nums tracking-tight truncate">
            {value}
          </p>
        </div>
        {Icon && (
          <div className={`p-2 rounded-md shrink-0 ${TONE_CLASSES[tone] || TONE_CLASSES.blue}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      {(trend || sublabel) && (
        <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-[#E7E9F0] dark:border-slate-800/80 text-[11px]">
          {trend ? (
            <span className={`inline-flex items-center gap-1 font-medium ${trendColor}`}>
              <TrendIcon className="w-3 h-3" />
              {trend}
            </span>
          ) : (
            <span />
          )}
          {sublabel && (
            <span className="text-[#535F80] dark:text-slate-400 truncate">{sublabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
