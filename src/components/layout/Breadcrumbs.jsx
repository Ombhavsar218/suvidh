import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { ROUTE_LABELS } from './navigationConfig';

export function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  if (segments.length === 0 || (segments.length === 1 && segments[0] === 'dashboard')) {
    return (
      <nav className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <Home className="w-3.5 h-3.5 text-slate-400" />
        <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
        <span className="font-medium text-slate-800 dark:text-slate-200">Dashboard</span>
      </nav>
    );
  }

  return (
    <nav className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 min-w-0">
      <Link
        to="/dashboard"
        className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors shrink-0"
      >
        <Home className="w-3.5 h-3.5" />
      </Link>
      {segments.map((seg, index) => {
        const path = `/${segments.slice(0, index + 1).join('/')}`;
        const isLast = index === segments.length - 1;
        const label = ROUTE_LABELS[seg] || decodeURIComponent(seg);

        return (
          <div key={path} className="flex items-center gap-1.5 min-w-0">
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
            {isLast ? (
              <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                {label}
              </span>
            ) : (
              <Link
                to={seg === 'analytics' ? '/reports' : path}
                className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors truncate"
              >
                {label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
