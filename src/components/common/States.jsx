import { Inbox, AlertCircle, RefreshCw } from 'lucide-react';
import { SecondaryButton } from './Buttons';

export function EmptyState({
  icon: Icon = Inbox,
  title = 'No matching records',
  description = 'Try adjusting your search or filter criteria, or create a new record.',
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-11 h-11 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3">
        <Icon className="w-5 h-5" />
      </div>
      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h4>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingState({ message = 'Loading ERP records...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-7 h-7 border-2 border-slate-200 dark:border-slate-700 border-t-[#2563EB] rounded-full animate-spin mb-3" />
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );
}

export function ErrorState({
  title = 'Unable to load records',
  message = 'A simulated local state error occurred while reading module records.',
  onRetry,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-11 h-11 rounded-lg bg-red-50 dark:bg-red-950/50 flex items-center justify-center text-red-600 dark:text-red-400 mb-3">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h4>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">{message}</p>
      {onRetry && (
        <div className="mt-4">
          <SecondaryButton size="sm" icon={RefreshCw} onClick={onRetry}>
            Retry
          </SecondaryButton>
        </div>
      )}
    </div>
  );
}
