import { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useErpData } from '../../context/ErpDataContext';
import { Tooltip } from '../common/Tooltip';

export function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const { notifications, markNotificationRead, markAllNotificationsRead } = useErpData();

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <Tooltip content="Plant Alerts & Notifications" placement="bottom" disabled={open}>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="relative p-2 rounded-md text-[#535F80] dark:text-slate-400 hover:text-[#051747] dark:hover:text-slate-200 hover:bg-[#E7E9F0]/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Notifications"
        >
          <Bell className="w-4.5 h-4.5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-bold tabular-nums">
              {unreadCount}
            </span>
          )}
        </button>
      </Tooltip>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/25 dark:border-slate-800 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E7E9F0] dark:border-slate-800">
            <div>
              <h4 className="text-xs font-semibold text-[#051747] dark:text-slate-100">
                Plant Alerts & Notifications
              </h4>
              <p className="text-[11px] text-[#535F80] dark:text-slate-400">
                {unreadCount} unread alert{unreadCount === 1 ? '' : 's'}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllNotificationsRead}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[#081F62] hover:text-[#051747] cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-[#E7E9F0] dark:divide-slate-800">
            {notifications.slice(0, 6).map((item) => {
              const Icon =
                item.severity === 'danger'
                  ? AlertCircle
                  : item.severity === 'warning'
                  ? AlertTriangle
                  : Info;
              const iconColor =
                item.severity === 'danger'
                  ? 'text-red-600 dark:text-red-400'
                  : item.severity === 'warning'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-[#081F62] dark:text-blue-400';

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    markNotificationRead(item.id);
                    setOpen(false);
                    if (item.link) navigate(item.link);
                  }}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-[#E7E9F0]/55 dark:hover:bg-slate-800/60 transition-colors cursor-pointer ${
                    !item.read ? 'bg-[#E7E9F0]/40 dark:bg-blue-950/20' : ''
                  }`}
                >
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconColor}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#051747] dark:text-slate-100 truncate">
                        {item.title}
                      </span>
                      {!item.read && (
                        <span className="w-2 h-2 rounded-full bg-[#081F62] shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-[#535F80] dark:text-slate-400 mt-0.5 line-clamp-2">
                      {item.message}
                    </p>
                    <p className="text-[10px] text-[#535F80]/80 mt-1 tabular-nums">
                      {item.category} · {item.timestamp}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="px-4 py-2.5 border-t border-[#E7E9F0] dark:border-slate-800 bg-[#E7E9F0]/45 dark:bg-slate-900/50 text-center">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate('/notifications');
              }}
              className="text-xs font-medium text-[#081F62] hover:text-[#051747] cursor-pointer"
            >
              View All Notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
