import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { ROUTE_LABELS } from './navigationConfig';
import { useTranslation } from '../../i18n/LanguageContext';

export function Breadcrumbs() {
  const { t } = useTranslation();
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  if (segments.length === 0 || (segments.length === 1 && segments[0] === 'dashboard')) {
    return (
      <nav className="flex items-center gap-1.5 text-xs text-[#535F80] dark:text-slate-400">
        <Home className="w-3.5 h-3.5 text-[#535F80]" />
        <ChevronRight className="w-3.5 h-3.5 text-[#535F80]/50 dark:text-slate-600" />
        <span className="font-medium text-[#051747] dark:text-slate-200">
          {t('nav.dashboard', 'Dashboard')}
        </span>
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
        let label = t(`routes.${seg}`, ROUTE_LABELS[seg] || decodeURIComponent(seg));
        if (seg === 'new') {
          const prevSeg = index > 0 ? segments[index - 1] : '';
          label =
            prevSeg === 'bom'
              ? t('routes.newBom', 'New BOM')
              : prevSeg === 'products'
              ? t('routes.newProduct', 'New Product')
              : prevSeg === 'stock-inward' || prevSeg === 'inward'
              ? t('routes.newGrn', 'New GRN Entry')
              : prevSeg === 'stock-outward' || prevSeg === 'outward'
              ? t('routes.issueMaterial', 'Issue Raw Material')
              : prevSeg === 'stock-reservation' || prevSeg === 'reservation'
              ? t('routes.recordReservation', 'Record Stock Reservation')
              : prevSeg === 'suppliers'
              ? t('routes.newSupplier', 'New Supplier')
              : prevSeg === 'materials'
              ? t('routes.newMaterial', 'New Raw Material')
              : t('routes.newCustomer', 'New Customer');
        } else if (seg === 'edit') {
          const parentSeg = index > 1 ? segments[index - 2] : '';
          label =
            parentSeg === 'bom'
              ? t('routes.editBom', 'Edit BOM')
              : parentSeg === 'products'
              ? t('routes.editProduct', 'Edit Product')
              : parentSeg === 'suppliers'
              ? t('routes.editSupplier', 'Edit Supplier')
              : parentSeg === 'materials'
              ? t('routes.editMaterial', 'Edit Raw Material')
              : t('routes.editCustomer', 'Edit Customer');
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
