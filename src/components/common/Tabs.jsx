export function Tabs({ tabs, activeTab, onChange }) {
  return (
    <div className="flex items-center gap-1 border-b border-[#535F80]/20 dark:border-slate-800 overflow-x-auto touch-pan-x scrollbar-none scroll-smooth">
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer shrink-0 ${
              isActive
                ? 'border-[#081F62] text-[#081F62] dark:text-blue-400'
                : 'border-transparent text-[#535F80] dark:text-slate-400 hover:text-[#051747] dark:hover:text-slate-200 hover:border-[#535F80]/40'
            }`}
          >
            {Icon && <Icon className="w-4 h-4" />}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`px-1.5 py-0.5 text-[11px] rounded-full tabular-nums ${
                  isActive
                    ? 'bg-[#081F62] text-[#FEFEFE] dark:bg-blue-950/60 dark:text-blue-300'
                    : 'bg-[#E7E9F0] text-[#535F80] dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
