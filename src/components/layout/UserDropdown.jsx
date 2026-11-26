import { useState, useRef, useEffect } from 'react';
import { ChevronDown, User, Settings, Shield, RotateCcw, LogOut, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useErpData } from '../../context/ErpDataContext';
import { useTranslation } from '../../i18n/LanguageContext';
import { ROLES } from '../../utils/permissions';
import { CURRENT_VERSION } from '../../data/changelogData';

export function UserDropdown({ onOpenChangelog }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const { currentUser, activeRole, switchRole, logout } = useApp();
  const { resetAllDemoData } = useErpData();
  const { t } = useTranslation();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2.5 pl-2 pr-2.5 py-1.5 rounded-md border border-transparent hover:border-[#535F80]/25 dark:hover:border-slate-700 hover:bg-[#E7E9F0]/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
      >
        <div className="w-7 h-7 rounded-md bg-[#081F62] text-[#FEFEFE] flex items-center justify-center text-xs font-semibold shrink-0">
          {currentUser.initials}
        </div>
        <div className="hidden md:block text-left leading-tight">
          <div className="text-xs font-semibold text-[#051747] dark:text-slate-100">
            {currentUser.name}
          </div>
          <div className="text-[11px] text-[#535F80] dark:text-slate-400">
            {activeRole} Role
          </div>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-[#535F80] hidden sm:block" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-1.5rem)] bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/25 dark:border-slate-800 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E7E9F0] dark:border-slate-800">
            <p className="text-xs font-semibold text-[#051747] dark:text-slate-100">
              {currentUser.name}
            </p>
            <p className="text-[11px] text-[#535F80] dark:text-slate-400 truncate">
              {currentUser.email}
            </p>
            <p className="text-[10px] text-[#535F80]/80 mt-1">{currentUser.department}</p>
          </div>

          <div className="px-3 py-2.5 border-b border-[#E7E9F0] dark:border-slate-800 bg-[#E7E9F0]/60 dark:bg-slate-800/40">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#535F80] dark:text-slate-400 mb-2 px-1">
              <Shield className="w-3 h-3 text-[#081F62]" />
              Role Switcher
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.values(ROLES).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => switchRole(role)}
                  className={`px-2 py-1 text-xs font-medium rounded border transition-colors cursor-pointer ${
                    activeRole === role
                      ? 'bg-[#081F62] text-[#FEFEFE] border-[#081F62]'
                      : 'bg-[#FEFEFE] dark:bg-slate-900 text-[#051747] dark:text-slate-300 border-[#535F80]/25 dark:border-slate-700 hover:bg-[#E7E9F0]/70 dark:hover:bg-slate-800'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <div className="py-1.5">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate('/settings');
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-[#051747] dark:text-slate-200 hover:bg-[#E7E9F0]/60 dark:hover:bg-slate-800 cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-[#535F80]" />
              {t('common.profile', 'User Profile')}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate('/settings');
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-[#051747] dark:text-slate-200 hover:bg-[#E7E9F0]/60 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-[#535F80]" />
              {t('nav.settings', 'System Settings')}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                if (onOpenChangelog) {
                  onOpenChangelog();
                } else {
                  navigate('/changelog');
                }
              }}
              className="w-full flex items-center justify-between gap-2.5 px-4 py-2 text-xs text-[#051747] dark:text-slate-200 hover:bg-[#E7E9F0]/60 dark:hover:bg-slate-800 cursor-pointer"
            >
              <span className="inline-flex items-center gap-2.5">
                <History className="w-3.5 h-3.5 text-[#535F80]" />
                Changelog
              </span>
              <span className="px-1.5 py-0.5 rounded bg-[#E7E9F0] dark:bg-slate-800 text-[#051747] dark:text-slate-300 text-[10px] font-semibold tabular-nums">
                v{CURRENT_VERSION}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                resetAllDemoData();
                setOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Demo Data
            </button>
          </div>

          <div className="py-1.5 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                logout();
                navigate('/login', { replace: true });
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              {t('common.signOut', 'Sign Out')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
