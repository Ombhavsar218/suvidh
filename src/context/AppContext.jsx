import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storageService } from '../services/storageService';
import { ROLES } from '../utils/permissions';

const AppContext = createContext(null);

const ROLE_PROFILES = {
  Admin: {
    id: 'USR-001',
    name: 'Vikram Deshmukh',
    email: 'vikram.d@suvidherp.in',
    phone: '+91 98220 11001',
    role: 'Admin',
    department: 'Plant Operations & Management',
    initials: 'VD',
  },
  Store: {
    id: 'USR-002',
    name: 'Ramesh Pawar',
    email: 'ramesh.p@suvidherp.in',
    phone: '+91 98220 11002',
    role: 'Store',
    department: 'Raw Material & FG Stores',
    initials: 'RP',
  },
  Production: {
    id: 'USR-003',
    name: 'Sandeep More',
    email: 'sandeep.m@suvidherp.in',
    phone: '+91 98220 11003',
    role: 'Production',
    department: 'CNC Shop Floor & PPC',
    initials: 'SM',
  },
  Quality: {
    id: 'USR-004',
    name: 'Kavita Sawant',
    email: 'kavita.s@suvidherp.in',
    phone: '+91 98220 11004',
    role: 'Quality',
    department: 'Quality Assurance & Metrology',
    initials: 'KS',
  },
};

export function AppProvider({ children }) {
  const [theme, setTheme] = useState(() => storageService.loadPreference('theme', 'light'));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    storageService.loadPreference('sidebar_collapsed', false)
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeRole, setActiveRole] = useState(() =>
    storageService.loadPreference('demo_role', ROLES.ADMIN)
  );
  const [profileOverrides, setProfileOverrides] = useState(() =>
    storageService.loadPreference('profile_overrides', {})
  );
  const [globalSearch, setGlobalSearch] = useState('');
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    storageService.savePreference('theme', theme);
  }, [theme]);

  useEffect(() => {
    storageService.savePreference('sidebar_collapsed', sidebarCollapsed);
  }, [sidebarCollapsed]);

  useEffect(() => {
    storageService.savePreference('demo_role', activeRole);
  }, [activeRole]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const addToast = useCallback(({ title, message, type = 'success' }) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const switchRole = useCallback(
    (role) => {
      setActiveRole(role);
      addToast({
        title: `Switched Demo Role: ${role}`,
        message: 'Navigation and permissions updated for local UI preview.',
        type: 'info',
      });
    },
    [addToast]
  );

  const baseProfile = ROLE_PROFILES[activeRole] || ROLE_PROFILES.Admin;
  const currentUser = {
    ...baseProfile,
    ...(profileOverrides[activeRole] || {}),
  };

  const updateCurrentUserProfile = useCallback(
    (updates) => {
      setProfileOverrides((prev) => {
        const next = {
          ...prev,
          [activeRole]: {
            ...(prev[activeRole] || {}),
            ...updates,
          },
        };
        storageService.savePreference('profile_overrides', next);
        return next;
      });
      addToast({
        title: 'Profile updated locally',
        message: 'Saved in browser LocalStorage (demo mode).',
        type: 'success',
      });
    },
    [activeRole, addToast]
  );

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        sidebarCollapsed,
        setSidebarCollapsed,
        toggleSidebar,
        mobileMenuOpen,
        setMobileMenuOpen,
        activeRole,
        switchRole,
        currentUser,
        updateCurrentUserProfile,
        globalSearch,
        setGlobalSearch,
        toasts,
        addToast,
        dismissToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
