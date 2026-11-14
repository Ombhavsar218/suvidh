import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function ToastContainer() {
  const { toasts, dismissToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const Icon =
          toast.type === 'danger'
            ? AlertCircle
            : toast.type === 'info'
            ? Info
            : CheckCircle2;
        const borderClass =
          toast.type === 'danger'
            ? 'border-red-200 dark:border-red-800'
            : toast.type === 'info'
            ? 'border-[#081F62]/30 dark:border-blue-800'
            : 'border-emerald-200 dark:border-emerald-800';
        const iconClass =
          toast.type === 'danger'
            ? 'text-red-600 dark:text-red-400'
            : toast.type === 'info'
            ? 'text-[#081F62] dark:text-blue-400'
            : 'text-emerald-600 dark:text-emerald-400';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 bg-[#FEFEFE] dark:bg-slate-900 border ${borderClass} rounded-lg shadow-lg`}
          >
            <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconClass}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#051747] dark:text-slate-100">
                {toast.title}
              </p>
              {toast.message && (
                <p className="text-xs text-[#535F80] dark:text-slate-400 mt-0.5">
                  {toast.message}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="text-[#535F80] hover:text-[#051747] dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
