import { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';

export function LanguageSwitcher({ compact = false }) {
  const { language, setLanguage, languages, currentLanguage, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };

    if (open) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[#535F80]/25 dark:border-slate-700 bg-[#E7E9F0]/60 dark:bg-slate-800/60 hover:bg-[#E7E9F0] dark:hover:bg-slate-800 text-xs font-semibold text-[#051747] dark:text-slate-200 transition-colors cursor-pointer select-none focus:outline-none focus:ring-1 focus:ring-[#081F62]"
        aria-expanded={open}
        aria-haspopup="true"
        title={t('common.selectLanguage', 'Select Language')}
      >
        <Globe className="w-3.5 h-3.5 text-[#081F62] dark:text-blue-400 shrink-0" />
        <span className="hidden sm:inline font-medium">{currentLanguage.nativeName}</span>
        <span className="sm:hidden font-mono uppercase text-[11px]">{currentLanguage.shortCode}</span>
        <ChevronDown
          className={`w-3 h-3 text-[#535F80] transition-transform duration-150 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-44 rounded-lg bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 shadow-xl z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-[#535F80] dark:text-slate-400 border-b border-[#E7E9F0] dark:border-slate-800 uppercase tracking-wider">
            {t('common.language', 'Language')} / भाषा
          </div>
          <div className="divide-y divide-[#E7E9F0]/60 dark:divide-slate-800/60">
            {languages.map((lang) => {
              const isSelected = language === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    setLanguage(lang.code);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors cursor-pointer text-left ${
                    isSelected
                      ? 'bg-[#081F62]/10 dark:bg-blue-950/50 text-[#081F62] dark:text-blue-300 font-bold'
                      : 'text-[#051747] dark:text-slate-200 hover:bg-[#E7E9F0]/70 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-xs">{lang.nativeName}</span>
                    <span className="text-[10px] text-[#535F80] dark:text-slate-400 font-normal">
                      {lang.label}
                    </span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-[#081F62] dark:text-blue-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
