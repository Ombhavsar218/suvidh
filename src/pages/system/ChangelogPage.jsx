import { Tag, Calendar, Layers } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { ChangelogFeed } from '../../components/layout/ChangelogModal';
import {
  CURRENT_VERSION,
  CURRENT_RELEASE_NAME,
  CHANGELOG_ENTRIES,
} from '../../data/changelogData';

export function ChangelogPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Release Changelog"
        description="Track day-wise release versions, Oceanic codenames, UI refinements, and module updates across Suvidh ERP."
        badge={
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#081F62] text-[#FEFEFE] text-xs font-semibold tabular-nums">
            <Tag className="w-3 h-3" />
            v{CURRENT_VERSION} · {CURRENT_RELEASE_NAME}
          </span>
        }
      />

      {/* Compact Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between gap-3">
          <div>
            <span className="text-xs font-medium text-[#535F80] dark:text-slate-400">
              Current Active Build
            </span>
            <div className="mt-1 text-lg font-bold text-[#051747] dark:text-slate-100 tabular-nums">
              v{CURRENT_VERSION}
            </div>
            <div className="text-xs text-[#535F80] dark:text-slate-400 mt-0.5">
              Codename:{' '}
              <strong className="text-[#051747] dark:text-slate-200">
                {CURRENT_RELEASE_NAME}
              </strong>
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-[#E7E9F0] dark:bg-slate-800 text-[#081F62] dark:text-slate-200 shrink-0">
            <Tag className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between gap-3">
          <div>
            <span className="text-xs font-medium text-[#535F80] dark:text-slate-400">
              Daily Releases
            </span>
            <div className="mt-1 text-lg font-bold text-[#051747] dark:text-slate-100 tabular-nums">
              {CHANGELOG_ENTRIES.length}
            </div>
            <div className="text-xs text-[#535F80] dark:text-slate-400 mt-0.5">
              Day-wise versioning (
              <span className="font-mono font-semibold text-[#051747] dark:text-slate-200">
                1.0.0
              </span>
              +)
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-[#E7E9F0] dark:bg-slate-800 text-[#081F62] dark:text-slate-200 shrink-0">
            <Layers className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between gap-3">
          <div>
            <span className="text-xs font-medium text-[#535F80] dark:text-slate-400">
              Last Updated
            </span>
            <div className="mt-1 text-lg font-bold text-[#051747] dark:text-slate-100 tabular-nums">
              {CHANGELOG_ENTRIES[0]?.date}
            </div>
            <div className="text-xs text-[#535F80] dark:text-slate-400 mt-0.5">
              Synced with{' '}
              <span className="font-mono font-semibold text-[#051747] dark:text-slate-200">
                CHANGELOG.md
              </span>
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-[#E7E9F0] dark:bg-slate-800 text-[#081F62] dark:text-slate-200 shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
        </div>
      </div>

      <ChangelogFeed />
    </div>
  );
}
