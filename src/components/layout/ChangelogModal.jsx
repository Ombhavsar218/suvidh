import { useState, useMemo, useEffect } from 'react';
import {
  History,
  Tag,
  Search,
  X,
  ExternalLink,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PrimaryButton, SecondaryButton } from '../common/Buttons';
import {
  CURRENT_VERSION,
  CURRENT_RELEASE_NAME,
  CHANGELOG_ENTRIES,
} from '../../data/changelogData';

const CATEGORY_BADGE_STYLES = {
  Added:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
  Improved:
    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
  Styled:
    'bg-[#E7E9F0] text-[#051747] border-[#535F80]/25 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
  Fixed:
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
};

const CATEGORIES = ['All', 'Added', 'Improved', 'Styled', 'Fixed'];

export function ChangelogToolbar({
  search,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
      <div className="relative flex-1 min-w-0">
        <Search className="w-3.5 h-3.5 text-[#535F80] dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search updates, dates, versions, codenames..."
          className="w-full h-8 pl-8 pr-7 text-xs rounded-lg border border-[#535F80]/25 dark:border-slate-700 bg-[#FEFEFE] dark:bg-slate-900 text-[#051747] dark:text-slate-100 placeholder:text-[#535F80]/65 focus:outline-none focus:border-[#081F62] transition-colors"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#535F80] hover:text-[#051747] dark:hover:text-slate-200 cursor-pointer"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div
        role="tablist"
        aria-label="Filter changelog by category"
        className="inline-flex items-center p-0.5 rounded-lg bg-[#E7E9F0] dark:bg-slate-800 border border-[#535F80]/15 dark:border-slate-700 shrink-0 overflow-x-auto"
      >
        {CATEGORIES.map((cat) => {
          const active = categoryFilter === cat;
          return (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onCategoryChange(cat)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap ${
                active
                  ? 'bg-[#FEFEFE] dark:bg-slate-900 text-[#051747] dark:text-slate-100 font-semibold shadow-2xs'
                  : 'text-[#535F80] dark:text-slate-400 hover:text-[#051747] dark:hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ChangelogTimeline({ search = '', categoryFilter = 'All' }) {
  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();

    return CHANGELOG_ENTRIES.map((entry) => {
      const matchedSections = entry.sections
        .filter((sec) => categoryFilter === 'All' || sec.category === categoryFilter)
        .map((sec) => ({
          ...sec,
          items: sec.items.filter(
            (item) =>
              !q ||
              item.title.toLowerCase().includes(q) ||
              item.detail.toLowerCase().includes(q) ||
              entry.version.toLowerCase().includes(q) ||
              entry.name.toLowerCase().includes(q) ||
              entry.date.toLowerCase().includes(q) ||
              entry.summary.toLowerCase().includes(q)
          ),
        }))
        .filter((sec) => sec.items.length > 0);

      const headerMatches =
        !q ||
        entry.version.toLowerCase().includes(q) ||
        entry.name.toLowerCase().includes(q) ||
        entry.date.toLowerCase().includes(q) ||
        entry.summary.toLowerCase().includes(q);

      if (matchedSections.length === 0 && !(categoryFilter === 'All' && headerMatches)) {
        return null;
      }

      return {
        ...entry,
        sections: matchedSections.length > 0 ? matchedSections : entry.sections,
      };
    }).filter(Boolean);
  }, [search, categoryFilter]);

  if (filteredEntries.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="w-10 h-10 rounded-full bg-[#E7E9F0] dark:bg-slate-800 text-[#535F80] mx-auto flex items-center justify-center mb-2.5">
          <History className="w-5 h-5" />
        </div>
        <p className="text-sm font-semibold text-[#051747] dark:text-slate-100">
          No matching release notes
        </p>
        <p className="text-xs text-[#535F80] dark:text-slate-400 mt-1">
          Try clearing your search or switching back to &ldquo;All&rdquo;.
        </p>
      </div>
    );
  }

  return (
    <div>
      {filteredEntries.map((entry, entryIdx) => {
        const isLast = entryIdx === filteredEntries.length - 1;
        const isLatest = entry.tag === 'Latest';
        const isBaseline = entry.tag === 'Baseline';

        const flatItems = entry.sections.flatMap((sec) =>
          sec.items.map((item) => ({
            ...item,
            category: sec.category,
          }))
        );

        return (
          <article
            key={entry.version}
            className={`relative pl-7 ${isLast ? 'pb-1' : 'pb-7'}`}
          >
            {/* Vertical Timeline Connector */}
            {!isLast && (
              <span
                aria-hidden="true"
                className="absolute left-[7px] top-4 bottom-0 w-px bg-[#E7E9F0] dark:bg-slate-800"
              />
            )}

            {/* Timeline Node Dot */}
            {isLatest ? (
              <span
                aria-hidden="true"
                className="absolute left-0 top-1 w-4 h-4 rounded-full bg-[#081F62]/15 dark:bg-blue-400/20 flex items-center justify-center"
              >
                <span className="w-2 h-2 rounded-full bg-[#081F62] dark:bg-blue-400" />
              </span>
            ) : (
              <span
                aria-hidden="true"
                className="absolute left-[3px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#FEFEFE] dark:bg-slate-900 border-2 border-[#535F80]/45 dark:border-slate-600"
              />
            )}

            {/* Milestone Header */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center flex-wrap gap-2">
                <span
                  className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-bold tabular-nums ${
                    isLatest
                      ? 'bg-[#081F62] text-[#FEFEFE]'
                      : 'bg-[#E7E9F0] dark:bg-slate-800 text-[#051747] dark:text-slate-200'
                  }`}
                >
                  v{entry.version}
                </span>

                <h3 className="text-sm font-bold text-[#051747] dark:text-slate-100 tracking-tight">
                  {entry.name}
                </h3>

                {isLatest && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
                    Latest
                  </span>
                )}
                {isBaseline && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#E7E9F0]/80 text-[#535F80] border border-[#535F80]/20 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                    Baseline
                  </span>
                )}
              </div>

              <time className="text-[11px] font-medium text-[#535F80] dark:text-slate-400 tabular-nums">
                {entry.date}
              </time>
            </div>

            {/* Summary */}
            <p className="text-xs text-[#535F80] dark:text-slate-300 mt-1.5 leading-relaxed">
              {entry.summary}
            </p>

            {/* Change Items */}
            <ul className="mt-3 space-y-1">
              {flatItems.map((item, idx) => {
                const badgeClass =
                  CATEGORY_BADGE_STYLES[item.category] || CATEGORY_BADGE_STYLES.Added;

                return (
                  <li
                    key={`${item.title}-${idx}`}
                    className="flex flex-col sm:flex-row sm:items-start gap-1.5 sm:gap-3 px-2.5 py-2 -mx-2.5 rounded-lg hover:bg-[#E7E9F0]/45 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <span
                      className={`w-[70px] shrink-0 text-center py-0.5 rounded text-[10px] font-semibold border ${badgeClass}`}
                    >
                      {item.category}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-semibold text-[#051747] dark:text-slate-100">
                        {item.title}
                      </span>
                      <p className="text-xs text-[#535F80] dark:text-slate-400 mt-0.5 leading-relaxed">
                        {item.detail}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </article>
        );
      })}
    </div>
  );
}

export function ChangelogFeed({ compact = false }) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  return (
    <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
      <div
        className={`${
          compact ? 'px-4 py-3' : 'px-5 py-3.5'
        } border-b border-[#E7E9F0] dark:border-slate-800 bg-[#E7E9F0]/35 dark:bg-slate-800/30`}
      >
        <ChangelogToolbar
          search={search}
          onSearchChange={setSearch}
          categoryFilter={categoryFilter}
          onCategoryChange={setCategoryFilter}
        />
      </div>

      <div className={compact ? 'p-4' : 'p-6'}>
        <ChangelogTimeline search={search} categoryFilter={categoryFilter} />
      </div>
    </div>
  );
}

export function ChangelogModal({ isOpen, onClose }) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const navigate = useNavigate();
  const location = useLocation();
  const alreadyOnPage = location.pathname === '/changelog';

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setCategoryFilter('All');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const oldestVersion = CHANGELOG_ENTRIES[CHANGELOG_ENTRIES.length - 1]?.version;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="changelog-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#051747]/45 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="w-full max-w-3xl bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/25 dark:border-slate-800 rounded-xl shadow-[0_24px_60px_-15px_rgba(5,23,71,0.28)] flex flex-col max-h-[86vh] overflow-hidden">
        {/* Clean Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-[#E7E9F0] dark:border-slate-800 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center flex-wrap gap-2.5">
              <h2
                id="changelog-modal-title"
                className="text-base font-bold text-[#051747] dark:text-slate-100 tracking-tight"
              >
                Release Notes
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#081F62] text-[#FEFEFE] text-[11px] font-semibold tabular-nums">
                <Tag className="w-3 h-3" />
                v{CURRENT_VERSION} · {CURRENT_RELEASE_NAME}
              </span>
            </div>
            <p className="text-xs text-[#535F80] dark:text-slate-400 mt-1">
              Day-wise release history across Suvidh ERP modules, navigation, and interface styling.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#535F80] hover:text-[#051747] dark:hover:text-slate-200 hover:bg-[#E7E9F0]/70 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            aria-label="Close changelog modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sticky Filter & Search Toolbar */}
        <div className="px-6 py-3 border-b border-[#E7E9F0] dark:border-slate-800 bg-[#E7E9F0]/35 dark:bg-slate-800/30 shrink-0">
          <ChangelogToolbar
            search={search}
            onSearchChange={setSearch}
            categoryFilter={categoryFilter}
            onCategoryChange={setCategoryFilter}
          />
        </div>

        {/* Scrollable Vertical Timeline */}
        <div className="px-6 py-5 overflow-y-auto flex-1">
          <ChangelogTimeline search={search} categoryFilter={categoryFilter} />
        </div>

        {/* Clean Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-3 border-t border-[#E7E9F0] dark:border-slate-800 bg-[#E7E9F0]/30 dark:bg-slate-900/60 shrink-0">
          <span className="text-[11px] font-medium text-[#535F80] dark:text-slate-400 tabular-nums">
            {CHANGELOG_ENTRIES.length}{' '}
            {CHANGELOG_ENTRIES.length === 1 ? 'daily release' : 'daily releases'} · v{oldestVersion} – v
            {CURRENT_VERSION}
          </span>

          <div className="flex items-center gap-2">
            {!alreadyOnPage && (
              <SecondaryButton
                size="sm"
                icon={ExternalLink}
                onClick={() => {
                  onClose?.();
                  navigate('/changelog');
                }}
              >
                Open Full Page
              </SecondaryButton>
            )}
            <PrimaryButton size="sm" onClick={onClose}>
              Done
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}
