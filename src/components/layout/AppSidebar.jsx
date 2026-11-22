import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  ChevronDown,
  ChevronLeft,
  PanelLeftOpen,
  X,
} from 'lucide-react';
import { NAVIGATION_GROUPS } from './navigationConfig';
import { useApp } from '../../context/AppContext';
import { useErpData } from '../../context/ErpDataContext';
import { hasModuleAccess } from '../../utils/permissions';
import { Tooltip } from '../common/Tooltip';
import { CURRENT_VERSION } from '../../data/changelogData';

function SuvidhLogoMark() {
  return (
    <div className="w-8 h-8 rounded-md bg-[#081F62] flex items-center justify-center shrink-0">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M4 7.5L12 3L20 7.5V16.5L12 21L4 16.5V7.5Z"
          stroke="#FEFEFE"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M12 12L20 7.5M12 12V21M12 12L4 7.5"
          stroke="#FEFEFE"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function AppSidebar({ onOpenChangelog }) {
  const {
    sidebarCollapsed,
    toggleSidebar,
    mobileMenuOpen,
    setMobileMenuOpen,
    activeRole,
  } = useApp();
  const { settings, notifications } = useErpData();
  const location = useLocation();

  const [expandedGroups, setExpandedGroups] = useState({
    overview: true,
    master: true,
    operations: true,
    business: true,
    analytics: true,
    system: true,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const toggleGroup = (key) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const visibleGroups = NAVIGATION_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => hasModuleAccess(activeRole, item.key)),
  })).filter((group) => group.items.length > 0);

  const renderNavContent = (isMobile = false) => {
    const collapsed = isMobile ? false : sidebarCollapsed;

    return (
      <div className="flex flex-col h-full bg-[#FEFEFE] dark:bg-slate-900 border-r border-[#535F80]/20 dark:border-slate-800 select-none">
        {/* Brand Header */}
        <div
          className={`h-14 flex items-center border-b border-[#E7E9F0] dark:border-slate-800 shrink-0 ${
            collapsed ? 'justify-center px-2' : 'justify-between px-4'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {!isMobile && collapsed ? (
              <Tooltip content="Expand sidebar" placement="right">
                <button
                  type="button"
                  onClick={toggleSidebar}
                  className="group relative w-8 h-8 rounded-md flex items-center justify-center cursor-pointer focus:outline-none"
                  aria-label="Expand sidebar"
                >
                  <span className="transition-opacity duration-150 group-hover:opacity-0">
                    <SuvidhLogoMark />
                  </span>
                  <span className="absolute inset-0 rounded-md bg-[#E7E9F0] dark:bg-slate-800 border border-[#535F80]/30 dark:border-slate-700 text-[#081F62] dark:text-slate-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <PanelLeftOpen className="w-4 h-4" />
                  </span>
                </button>
              </Tooltip>
            ) : (
              <SuvidhLogoMark />
            )}
            {!collapsed && (
              <div className="min-w-0 leading-tight">
                <div className="text-sm font-bold text-[#051747] dark:text-slate-100 tracking-tight truncate">
                  Suvidh ERP
                </div>
                <div className="text-[11px] text-[#535F80] dark:text-slate-400 truncate">
                  {settings.companyName?.split(' ')[0] || 'Precision'} Mfg.
                </div>
              </div>
            )}
          </div>

          {isMobile ? (
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="p-1.5 rounded-md text-[#535F80] hover:text-[#051747] dark:hover:text-slate-200 hover:bg-[#E7E9F0]/70 dark:hover:bg-slate-800 cursor-pointer"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            !collapsed && (
              <Tooltip content="Collapse sidebar" placement="right">
                <button
                  type="button"
                  onClick={toggleSidebar}
                  className="p-1 rounded-md text-[#535F80] hover:text-[#051747] dark:hover:text-slate-200 hover:bg-[#E7E9F0]/70 dark:hover:bg-slate-800 cursor-pointer"
                  aria-label="Collapse sidebar"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </Tooltip>
            )
          )}
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-3">
          {visibleGroups.map((group) => {
            const isExpanded = expandedGroups[group.key] !== false;

            return (
              <div key={group.key}>
                {!collapsed ? (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.key)}
                    className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#535F80] dark:text-slate-400 hover:text-[#051747] dark:hover:text-slate-200 cursor-pointer"
                  >
                    <span>{group.label}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-150 ${
                        isExpanded ? '' : '-rotate-90'
                      }`}
                    />
                  </button>
                ) : (
                  <div className="h-px bg-[#E7E9F0] dark:bg-slate-800 mx-2 my-1" />
                )}

                {(collapsed || isExpanded) && (
                  <div className="mt-1 space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive =
                        location.pathname === item.path ||
                        (item.path !== '/inventory' && location.pathname.startsWith(`${item.path}/`)) ||
                        (item.key === 'stock-inward' && (location.pathname === '/inventory/inward' || location.pathname.startsWith('/inventory/inward/'))) ||
                        (item.key === 'stock-outward' && (location.pathname === '/inventory/outward' || location.pathname.startsWith('/inventory/outward/')));
                      const isChangelogItem = item.key === 'changelog';

                      return (
                        <Tooltip
                          key={item.key}
                          content={item.label}
                          placement="right"
                          disabled={!collapsed}
                          className="block w-full"
                        >
                          <div className="relative flex items-center">
                            <NavLink
                              to={item.path}
                              onClick={() => isMobile && setMobileMenuOpen(false)}
                              className={`group relative flex-1 flex items-center gap-2.5 rounded-md text-[13px] font-medium transition-colors ${
                                collapsed
                                  ? 'justify-center p-2.5'
                                  : isChangelogItem
                                  ? 'pl-2.5 pr-16 py-2'
                                  : 'px-2.5 py-2'
                              } ${
                                isActive
                                  ? 'bg-[#081F62] text-[#FEFEFE] shadow-2xs'
                                  : 'text-[#051747]/85 dark:text-slate-400 hover:bg-[#E7E9F0]/75 dark:hover:bg-slate-800/60 hover:text-[#051747] dark:hover:text-slate-100'
                              }`}
                            >
                              <Icon
                                className={`w-4 h-4 shrink-0 ${
                                  isActive
                                    ? 'text-[#FEFEFE]'
                                    : 'text-[#535F80] dark:text-slate-500 group-hover:text-[#051747] dark:group-hover:text-slate-300'
                                }`}
                              />
                              {!collapsed && (
                                <span className="truncate flex-1">{item.label}</span>
                              )}
                              {!collapsed && item.key === 'notifications' && unreadCount > 0 && (
                                <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-300 tabular-nums">
                                  {unreadCount}
                                </span>
                              )}
                            </NavLink>

                            {!collapsed && isChangelogItem && (
                              <div className="absolute right-2 flex items-center">
                                <Tooltip content="Open changelog popup" placement="right">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isMobile) setMobileMenuOpen(false);
                                      onOpenChangelog?.();
                                    }}
                                    className={`px-1.5 py-0.5 text-[10px] font-semibold rounded tabular-nums transition-colors cursor-pointer ${
                                      isActive
                                        ? 'bg-[#FEFEFE]/20 hover:bg-[#FEFEFE]/30 text-[#FEFEFE]'
                                        : 'bg-[#E7E9F0] hover:bg-[#081F62] hover:text-[#FEFEFE] text-[#051747] dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-[#081F62] dark:hover:text-[#FEFEFE]'
                                    }`}
                                    aria-label="Open changelog popup"
                                  >
                                    v{CURRENT_VERSION}
                                  </button>
                                </Tooltip>
                              </div>
                            )}
                          </div>
                        </Tooltip>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 transition-[width] duration-200 ease-in-out ${
          sidebarCollapsed ? 'w-[68px]' : 'w-64'
        }`}
      >
        <div className="sticky top-0 h-screen">{renderNavContent(false)}</div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-[1px]"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-64 max-w-[85vw] h-full z-10 shadow-2xl">
            {renderNavContent(true)}
          </aside>
        </div>
      )}
    </>
  );
}
