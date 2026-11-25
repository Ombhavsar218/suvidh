import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { ROUTE_LABELS } from './navigationConfig';

export function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  if (segments.length === 0 || (segments.length === 1 && segments[0] === 'dashboard')) {
    return (
      <nav className="flex items-center gap-1.5 text-xs text-[#535F80] dark:text-slate-400">
        <Home className="w-3.5 h-3.5 text-[#535F80]" />
        <ChevronRight className="w-3.5 h-3.5 text-[#535F80]/50 dark:text-slate-600" />
        <span className="font-medium text-[#051747] dark:text-slate-200">Dashboard</span>
      </nav>
    );
  }

  return (
    <nav className="flex items-center gap-1.5 text-xs text-[#535F80] dark:text-slate-400 min-w-0">
      <Link
        to="/dashboard"
        className="text-[#535F80] hover:text-[#051747] dark:hover:text-slate-200 transition-colors shrink-0"
      >
        <Home className="w-3.5 h-3.5" />
      </Link>
      {segments.map((seg, index) => {
        const path = `/${segments.slice(0, index + 1).join('/')}`;
        const isLast = index === segments.length - 1;
        let label = ROUTE_LABELS[seg] || decodeURIComponent(seg);
        if (seg === 'new') {
          const prevSeg = index > 0 ? segments[index - 1] : '';
          label =
            prevSeg === 'bom'
              ? 'New BOM'
              : prevSeg === 'products'
              ? 'New Product'
              : prevSeg === 'stock-inward' || prevSeg === 'inward'
              ? 'New GRN Entry'
              : prevSeg === 'stock-outward' || prevSeg === 'outward'
              ? 'Issue Raw Material'
              : prevSeg === 'stock-reservation' || prevSeg === 'reservation'
              ? 'Record Stock Reservation'
              : prevSeg === 'suppliers'
              ? 'New Supplier'
              : prevSeg === 'materials'
              ? 'New Raw Material'
              : 'New Customer';
        } else if (seg === 'edit') {
          const parentSeg = index > 1 ? segments[index - 2] : '';
          label =
            parentSeg === 'bom'
              ? 'Edit BOM'
              : parentSeg === 'products'
              ? 'Edit Product'
              : parentSeg === 'suppliers'
              ? 'Edit Supplier'
              : parentSeg === 'materials'
              ? 'Edit Raw Material'
              : 'Edit Customer';
        }

        return (
          <div key={path} className="flex items-center gap-1.5 min-w-0">
            <ChevronRight className="w-3.5 h-3.5 text-[#535F80]/50 dark:text-slate-600 shrink-0" />
            {isLast ? (
              <span className="font-medium text-[#051747] dark:text-slate-200 truncate">
                {label}
              </span>
            ) : (
              <Link
                to={seg === 'analytics' ? '/reports' : path}
                className="hover:text-[#051747] dark:hover:text-slate-200 transition-colors truncate"
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
