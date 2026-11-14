import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

export function Tooltip({
  content,
  children,
  placement = 'top',
  disabled = false,
  className = 'inline-flex',
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, resolvedPlacement: placement });
  const triggerRef = useRef(null);

  const computePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    let resolved = placement;
    if (placement === 'top' && rect.top < 48) resolved = 'bottom';
    else if (placement === 'bottom' && window.innerHeight - rect.bottom < 48) resolved = 'top';
    else if (placement === 'left' && rect.left < 140) resolved = 'right';
    else if (placement === 'right' && window.innerWidth - rect.right < 140) resolved = 'left';

    const gap = 8;
    let top = 0;
    let left = 0;

    if (resolved === 'top') {
      top = rect.top - gap;
      left = Math.min(Math.max(rect.left + rect.width / 2, 16), window.innerWidth - 16);
    } else if (resolved === 'bottom') {
      top = rect.bottom + gap;
      left = Math.min(Math.max(rect.left + rect.width / 2, 16), window.innerWidth - 16);
    } else if (resolved === 'right') {
      top = rect.top + rect.height / 2;
      left = rect.right + gap;
    } else {
      top = rect.top + rect.height / 2;
      left = rect.left - gap;
    }

    setPosition({ top, left, resolvedPlacement: resolved });
  }, [placement]);

  const show = () => {
    if (disabled || !content) return;
    computePosition();
    setOpen(true);
  };

  const hide = () => setOpen(false);

  useEffect(() => {
    if (!open) return undefined;
    const handleDismiss = () => setOpen(false);
    window.addEventListener('scroll', handleDismiss, true);
    window.addEventListener('resize', handleDismiss);
    return () => {
      window.removeEventListener('scroll', handleDismiss, true);
      window.removeEventListener('resize', handleDismiss);
    };
  }, [open]);

  if (disabled || !content) {
    return children;
  }

  const transformClass =
    position.resolvedPlacement === 'top'
      ? '-translate-x-1/2 -translate-y-full'
      : position.resolvedPlacement === 'bottom'
      ? '-translate-x-1/2'
      : position.resolvedPlacement === 'right'
      ? '-translate-y-1/2'
      : '-translate-x-full -translate-y-1/2';

  const arrowClass =
    position.resolvedPlacement === 'top'
      ? '-bottom-1 left-1/2 -translate-x-1/2 border-r border-b'
      : position.resolvedPlacement === 'bottom'
      ? '-top-1 left-1/2 -translate-x-1/2 border-l border-t'
      : position.resolvedPlacement === 'right'
      ? '-left-1 top-1/2 -translate-y-1/2 border-l border-b'
      : '-right-1 top-1/2 -translate-y-1/2 border-r border-t';

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={hide}
        className={className}
      >
        {children}
      </span>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="tooltip"
            style={{ top: `${position.top}px`, left: `${position.left}px` }}
            className={`fixed z-[100] pointer-events-none ${transformClass}`}
          >
            <div className="relative px-2.5 py-1.5 rounded-md bg-[#FEFEFE] text-[#051747] border border-[#535F80]/30 shadow-[0_10px_24px_-6px_rgba(5,23,71,0.18)] text-[11px] font-medium leading-tight whitespace-nowrap">
              <span>{content}</span>
              <span
                aria-hidden="true"
                className={`absolute w-2 h-2 rotate-45 bg-[#FEFEFE] border-[#535F80]/30 ${arrowClass}`}
              />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
