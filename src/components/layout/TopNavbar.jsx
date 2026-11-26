import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Menu,
  Search,
  HelpCircle,
  Sun,
  Moon,
  // Shield,
  ArrowRight,
  Tag,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useErpData } from '../../context/ErpDataContext';
import { Breadcrumbs } from './Breadcrumbs';
import { NotificationPanel } from './NotificationPanel';
import { UserDropdown } from './UserDropdown';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useTranslation } from '../../i18n/LanguageContext';
import { NAVIGATION_GROUPS } from './navigationConfig';
import { /* ROLES, */ hasModuleAccess } from '../../utils/permissions';
import { Tooltip } from '../common/Tooltip';
import { CURRENT_VERSION, CURRENT_RELEASE_NAME } from '../../data/changelogData';

export function TopNavbar({ onOpenHelp, onOpenChangelog }) {
  const {
    theme,
    toggleTheme,
    setMobileMenuOpen,
    activeRole,
    // switchRole,
    globalSearch,
    setGlobalSearch,
  } = useApp();
  const { t } = useTranslation();
  const { customers, products, materials, machines, purchaseOrders, productionPlans } =
    useErpData();

  const [searchFocused, setSearchFocused] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const mobileSearchRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(e.target) &&
        (!mobileSearchRef.current || !mobileSearchRef.current.contains(e.target))
      ) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchResults = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (!q) return [];

    const results = [];
    NAVIGATION_GROUPS.flatMap((g) => g.items)
      .filter((item) => hasModuleAccess(activeRole, item.key))
      .forEach((item) => {
        if (item.label.toLowerCase().includes(q)) {
          results.push({ type: 'Module', label: item.label, sub: item.path, path: item.path });
        }
      });

    if (hasModuleAccess(activeRole, 'customers')) {
      customers.forEach((c) => {
        if (c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)) {
          results.push({
            type: 'Customer',
            label: c.name,
            sub: c.code,
            path: `/customers/${c.id}`,
          });
        }
      });
    }

    if (hasModuleAccess(activeRole, 'products')) {
      products.forEach((p) => {
        if (p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)) {
          results.push({
            type: 'Product',
            label: p.name,
            sub: p.code,
            path: `/products/${p.id}`,
          });
        }
      });
    }

    if (hasModuleAccess(activeRole, 'inventory')) {
      materials.forEach((m) => {
        if (m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q)) {
          results.push({
            type: 'Raw Material',
            label: m.name,
            sub: m.code,
            path: '/inventory',
          });
        }
      });
    }

    if (hasModuleAccess(activeRole, 'machines')) {
      machines.forEach((m) => {
        if (m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q)) {
          results.push({
            type: 'Machine',
            label: m.name,
            sub: m.code,
            path: `/machines/${m.id}`,
          });
        }
      });
    }

    if (hasModuleAccess(activeRole, 'purchases')) {
      purchaseOrders.forEach((p) => {
        if (p.poNumber.toLowerCase().includes(q)) {
          results.push({
            type: 'Purchase Order',
            label: p.poNumber,
            sub: p.status,
            path: `/purchases/${p.id}`,
          });
        }
      });
    }

    if (hasModuleAccess(activeRole, 'production-planning')) {
      productionPlans.forEach((p) => {
        if (p.id.toLowerCase().includes(q)) {
          results.push({
            type: 'Production Plan',
            label: p.id,
            sub: p.status,
            path: '/production-planning',
          });
        }
      });
    }

    return results.slice(0, 8);
  }, [
    globalSearch,
    activeRole,
    customers,
    products,
    materials,
    machines,
    purchaseOrders,
    productionPlans,
  ]);

  return (
    <header className="sticky top-0 z-30 h-14 bg-[#FEFEFE] dark:bg-slate-900 border-b border-[#535F80]/20 dark:border-slate-800 px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-2 sm:gap-3 shrink-0">
      {mobileSearchOpen ? (
        /* Mobile Search Bar View */
        <div className="flex-1 flex items-center gap-2" ref={mobileSearchRef}>
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[#535F80] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              autoFocus
              value={globalSearch}
              onFocus={() => setSearchFocused(true)}
              onChange={(e) => {
                setGlobalSearch(e.target.value);
                setSearchFocused(true);
              }}
              placeholder={t('common.searchPlaceholder', 'Search ERP modules, codes...')}
              className="w-full pl-8 pr-8 py-1.5 text-xs rounded-md border border-[#081F62] bg-[#FEFEFE] dark:bg-slate-900 text-[#051747] dark:text-slate-100 placeholder:text-[#535F80]/70 focus:outline-none"
            />
            {globalSearch && (
              <button
                type="button"
                onClick={() => setGlobalSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#535F80] hover:text-[#051747] cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {searchFocused && globalSearch.trim() && (
              <div className="absolute left-0 right-0 mt-1.5 bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/25 dark:border-slate-800 rounded-lg shadow-xl z-50 overflow-hidden max-h-72 overflow-y-auto">
                {searchResults.length === 0 ? (
                  <div className="px-3.5 py-3 text-xs text-[#535F80] dark:text-slate-400">
                    No matching records found for "{globalSearch}".
                  </div>
                ) : (
                  <div className="divide-y divide-[#E7E9F0] dark:divide-slate-800">
                    {searchResults.map((res, idx) => (
                      <button
                        key={`${res.path}-${idx}`}
                        type="button"
                        onClick={() => {
                          navigate(res.path);
                          setSearchFocused(false);
                          setMobileSearchOpen(false);
                          setGlobalSearch('');
                        }}
                        className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-[#E7E9F0]/60 dark:hover:bg-slate-800/70 cursor-pointer"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-[#051747] dark:text-slate-100 truncate">
                            {res.label}
                          </div>
                          <div className="text-[11px] text-[#535F80] truncate">
                            {res.type} · {res.sub}
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-[#535F80] shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setMobileSearchOpen(false);
              setSearchFocused(false);
            }}
            className="px-2 py-1 text-xs font-semibold text-[#081F62] dark:text-blue-400 hover:text-[#051747] cursor-pointer whitespace-nowrap"
          >
            Cancel
          </button>
        </div>
      ) : (
        <>
          {/* Left: Mobile Menu + Breadcrumbs */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-1 sm:-ml-2 rounded-md text-[#535F80] hover:text-[#051747] dark:text-slate-400 dark:hover:text-slate-200 hover:bg-[#E7E9F0]/70 dark:hover:bg-slate-800 cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="hidden sm:block min-w-0">
              <Breadcrumbs />
            </div>
          </div>

          {/* Center/Right: Global Search + Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Mobile Search Toggle Icon */}
            <button
              type="button"
              onClick={() => {
                setMobileSearchOpen(true);
                setSearchFocused(true);
              }}
              className="sm:hidden p-2 rounded-md text-[#535F80] dark:text-slate-400 hover:text-[#051747] dark:hover:text-slate-200 hover:bg-[#E7E9F0]/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Desktop Global Search */}
            <div className="relative hidden sm:block w-48 sm:w-56 md:w-72" ref={searchRef}>
              <Search className="w-3.5 h-3.5 text-[#535F80] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={globalSearch}
                onFocus={() => setSearchFocused(true)}
                onChange={(e) => {
                  setGlobalSearch(e.target.value);
                  setSearchFocused(true);
                }}
                placeholder={t('common.searchPlaceholder', 'Search ERP modules, codes...')}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-[#535F80]/25 dark:border-slate-700 bg-[#E7E9F0]/60 dark:bg-slate-800/70 text-[#051747] dark:text-slate-100 placeholder:text-[#535F80]/70 focus:outline-none focus:bg-[#FEFEFE] dark:focus:bg-slate-900 focus:border-[#081F62]"
              />

              {searchFocused && globalSearch.trim() && (
                <div className="absolute left-0 right-0 mt-1.5 bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/25 dark:border-slate-800 rounded-lg shadow-xl z-50 overflow-hidden">
                  {searchResults.length === 0 ? (
                    <div className="px-3.5 py-3 text-xs text-[#535F80] dark:text-slate-400">
                      No matching records found for "{globalSearch}".
                    </div>
                  ) : (
                    <div className="divide-y divide-[#E7E9F0] dark:divide-slate-800 max-h-72 overflow-y-auto">
                      {searchResults.map((res, idx) => (
                        <button
                          key={`${res.path}-${idx}`}
                          type="button"
                          onClick={() => {
                            navigate(res.path);
                            setSearchFocused(false);
                            setGlobalSearch('');
                          }}
                          className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-[#E7E9F0]/60 dark:hover:bg-slate-800/70 cursor-pointer"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-[#051747] dark:text-slate-100 truncate">
                              {res.label}
                            </div>
                            <div className="text-[11px] text-[#535F80] truncate">
                              {res.type} · {res.sub}
                            </div>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-[#535F80] shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Version / Changelog Popup Trigger */}
            <Tooltip
              content={`View Changelog · v${CURRENT_VERSION} "${CURRENT_RELEASE_NAME}"`}
              placement="bottom"
            >
              <button
                type="button"
                onClick={() => onOpenChangelog?.()}
                className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[#535F80]/25 dark:border-slate-700 bg-[#E7E9F0]/60 dark:bg-slate-800/60 text-[11px] font-semibold text-[#051747] dark:text-slate-200 hover:border-[#081F62]/45 hover:bg-[#E7E9F0] dark:hover:bg-slate-800 transition-colors tabular-nums cursor-pointer"
                aria-label="Open Changelog Popup"
              >
                <Tag className="w-3 h-3 text-[#081F62] dark:text-slate-300" />
                <span>v{CURRENT_VERSION}</span>
              </button>
            </Tooltip>

            {/* Multi-Language Selector */}
            <LanguageSwitcher />

        {/* Demo Role Quick Selector (Commented out)
        <Tooltip content="Demo role switcher (UI preview only)" placement="bottom">
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#535F80]/25 dark:border-slate-700 bg-[#E7E9F0]/60 dark:bg-slate-800/60">
            <Shield className="w-3.5 h-3.5 text-[#081F62]" />
            <span className="text-[11px] font-medium text-[#535F80] dark:text-slate-400">
              Role:
            </span>
            <select
              value={activeRole}
              onChange={(e) => switchRole(e.target.value)}
              className="text-xs font-semibold text-[#051747] dark:text-slate-100 bg-transparent focus:outline-none cursor-pointer"
            >
              {Object.values(ROLES).map((role) => (
                <option key={role} value={role} className="dark:bg-slate-900">
                  {role}
                </option>
              ))}
            </select>
          </div>
        </Tooltip>
        */}

        {/* Theme Toggle */}
        <Tooltip
          content={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          placement="bottom"
        >
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-md text-[#535F80] dark:text-slate-400 hover:text-[#051747] dark:hover:text-slate-200 hover:bg-[#E7E9F0]/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Toggle color theme"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        </Tooltip>

        {/* Help Button */}
        <Tooltip content="ERP Documentation & Demo Guide" placement="bottom">
          <button
            type="button"
            onClick={onOpenHelp}
            className="hidden sm:inline-flex p-2 rounded-md text-[#535F80] dark:text-slate-400 hover:text-[#051747] dark:hover:text-slate-200 hover:bg-[#E7E9F0]/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Help"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </Tooltip>

        {/* Notifications */}
        <NotificationPanel />

        {/* User Profile Dropdown */}
        <UserDropdown onOpenChangelog={onOpenChangelog} />
      </div>
    </>
  )}
</header>
  );
}
