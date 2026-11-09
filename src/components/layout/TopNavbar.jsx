import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Menu,
  PanelLeft,
  Search,
  HelpCircle,
  Sun,
  Moon,
  Shield,
  ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useErpData } from '../../context/ErpDataContext';
import { Breadcrumbs } from './Breadcrumbs';
import { NotificationPanel } from './NotificationPanel';
import { UserDropdown } from './UserDropdown';
import { NAVIGATION_GROUPS } from './navigationConfig';
import { ROLES, hasModuleAccess } from '../../utils/permissions';

export function TopNavbar({ onOpenHelp }) {
  const {
    theme,
    toggleTheme,
    toggleSidebar,
    setMobileMenuOpen,
    activeRole,
    switchRole,
    globalSearch,
    setGlobalSearch,
  } = useApp();
  const { customers, products, materials, machines, purchaseOrders, productionPlans } =
    useErpData();

  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
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
    <header className="sticky top-0 z-30 h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 lg:px-6 flex items-center justify-between gap-3 shrink-0">
      {/* Left: Sidebar Toggle + Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="lg:hidden p-2 -ml-2 rounded-md text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={toggleSidebar}
          className="hidden lg:inline-flex p-1.5 rounded-md text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          title="Toggle sidebar"
          aria-label="Toggle sidebar"
        >
          <PanelLeft className="w-4.5 h-4.5" />
        </button>

        <div className="hidden sm:block min-w-0">
          <Breadcrumbs />
        </div>
      </div>

      {/* Center/Right: Global Search + Demo Role + Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Global Search */}
        <div className="relative w-44 sm:w-64 md:w-72" ref={searchRef}>
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={globalSearch}
            onFocus={() => setSearchFocused(true)}
            onChange={(e) => {
              setGlobalSearch(e.target.value);
              setSearchFocused(true);
            }}
            placeholder="Search ERP modules, codes..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-[#2563EB]"
          />

          {searchFocused && globalSearch.trim() && (
            <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl z-50 overflow-hidden">
              {searchResults.length === 0 ? (
                <div className="px-3.5 py-3 text-xs text-slate-500 dark:text-slate-400">
                  No matching records found for "{globalSearch}".
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
                  {searchResults.map((res, idx) => (
                    <button
                      key={`${res.path}-${idx}`}
                      type="button"
                      onClick={() => {
                        navigate(res.path);
                        setSearchFocused(false);
                        setGlobalSearch('');
                      }}
                      className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/70 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-slate-800 dark:text-slate-100 truncate">
                          {res.label}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {res.type} · {res.sub}
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Demo Role Quick Selector */}
        <div
          className="hidden xl:flex items-center gap-1.5 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60"
          title="Demo role switcher (UI preview only)"
        >
          <Shield className="w-3.5 h-3.5 text-[#2563EB]" />
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Role:
          </span>
          <select
            value={activeRole}
            onChange={(e) => switchRole(e.target.value)}
            className="text-xs font-semibold text-slate-800 dark:text-slate-100 bg-transparent focus:outline-none cursor-pointer"
          >
            {Object.values(ROLES).map((role) => (
              <option key={role} value={role} className="dark:bg-slate-900">
                {role}
              </option>
            ))}
          </select>
        </div>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          aria-label="Toggle color theme"
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        {/* Help Button */}
        <button
          type="button"
          onClick={onOpenHelp}
          className="hidden sm:inline-flex p-2 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="ERP Documentation & Demo Guide"
          aria-label="Help"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Notifications */}
        <NotificationPanel />

        {/* User Profile Dropdown */}
        <UserDropdown />
      </div>
    </header>
  );
}
