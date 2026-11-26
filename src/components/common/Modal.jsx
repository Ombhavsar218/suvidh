import { useEffect } from 'react';
import { X } from 'lucide-react';

const MAX_WIDTHS = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-5xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'lg',
}) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-[#051747]/45 backdrop-blur-[1px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className={`w-full ${MAX_WIDTHS[size] || MAX_WIDTHS.lg} bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/25 dark:border-slate-800 rounded-lg shadow-xl flex flex-col max-h-[92vh] sm:max-h-[90vh]`}
      >
        <div className="flex items-start justify-between gap-4 px-4 py-3 sm:px-5 sm:py-4 border-b border-[#E7E9F0] dark:border-slate-800">
          <div>
            <h3 className="text-base font-semibold text-[#051747] dark:text-slate-100">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-[#535F80] dark:text-slate-400 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-[#535F80] hover:text-[#051747] dark:hover:text-slate-200 hover:bg-[#E7E9F0]/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-3 sm:px-5 sm:py-4 overflow-y-auto flex-1">{children}</div>

        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 px-4 py-3 sm:px-5 sm:py-3.5 border-t border-[#E7E9F0] dark:border-slate-800 bg-[#E7E9F0]/55 dark:bg-slate-900/50 rounded-b-lg">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
