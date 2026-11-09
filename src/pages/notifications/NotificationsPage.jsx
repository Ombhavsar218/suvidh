import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  AlertCircle,
  AlertTriangle,
  Info,
  ArrowRight,
  Check,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { PrimaryButton, SecondaryButton } from '../../components/common/Buttons';
import { EmptyState } from '../../components/common/States';
import { FilterDropdown } from '../../components/forms/Filters';
import { useErpData } from '../../context/ErpDataContext';

export function NotificationsPage() {
  const navigate = useNavigate();
  const { notifications, markNotificationRead, markAllNotificationsRead } = useErpData();
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const categories = useMemo(
    () => Array.from(new Set(notifications.map((n) => n.category))),
    [notifications]
  );

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (categoryFilter !== 'All' && n.category !== categoryFilter) return false;
      if (statusFilter === 'Unread' && n.read) return false;
      if (statusFilter === 'Read' && !n.read) return false;
      return true;
    });
  }, [notifications, categoryFilter, statusFilter]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications & Alerts"
        description="Operational alerts for low material stock, shortages, delivery deadlines, delayed production, and pending approvals."
        actions={
          <PrimaryButton
            icon={CheckCheck}
            disabled={unreadCount === 0}
            onClick={markAllNotificationsRead}
          >
            Mark All as Read ({unreadCount})
          </PrimaryButton>
        }
      />

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <FilterDropdown
            label="Category"
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={categories}
          />
          <FilterDropdown
            label="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={['Unread', 'Read']}
          />
        </div>
        <span className="text-xs text-slate-500">
          Showing {filtered.length} of {notifications.length} alerts
        </span>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-200 dark:divide-slate-800">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No alerts match the selected filters"
            description="Adjust the category or read-status filter to review older notifications."
          />
        ) : (
          filtered.map((n) => {
            const Icon =
              n.severity === 'danger'
                ? AlertCircle
                : n.severity === 'warning'
                ? AlertTriangle
                : Info;
            const iconStyle =
              n.severity === 'danger'
                ? 'text-red-600 bg-red-50 dark:bg-red-950/50'
                : n.severity === 'warning'
                ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/50'
                : 'text-[#2563EB] bg-blue-50 dark:bg-blue-950/50';

            return (
              <div
                key={n.id}
                className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                  !n.read ? 'bg-blue-50/30 dark:bg-blue-950/15' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-md shrink-0 ${iconStyle}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {n.title}
                      </h4>
                      {!n.read && (
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-blue-100 text-[#2563EB] dark:bg-blue-950 dark:text-blue-300">
                          Unread
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{n.message}</p>
                    <p className="text-[11px] text-slate-400 mt-1 tabular-nums">
                      {n.category} · {n.timestamp}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!n.read && (
                    <SecondaryButton
                      size="sm"
                      icon={Check}
                      onClick={() => markNotificationRead(n.id)}
                    >
                      Mark Read
                    </SecondaryButton>
                  )}
                  {n.link && (
                    <SecondaryButton
                      size="sm"
                      onClick={() => {
                        markNotificationRead(n.id);
                        navigate(n.link);
                      }}
                    >
                      Open Module
                      <ArrowRight className="w-3.5 h-3.5" />
                    </SecondaryButton>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
