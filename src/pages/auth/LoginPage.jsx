import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  Factory,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Info,
} from 'lucide-react';
import { useApp, ROLE_PROFILES } from '../../context/AppContext';

const ROLE_SUMMARIES = {
  Admin: 'Full Plant & ERP Access',
  Store: 'Materials, Inventory & Dispatch',
  Production: 'Planning, Machines & Shop Floor',
  Quality: 'QC Inspections & Approvals',
};

export function LoginPage() {
  const { isAuthenticated, login } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedRole, setSelectedRole] = useState('Admin');
  const [email, setEmail] = useState(ROLE_PROFILES.Admin.email);
  const [password, setPassword] = useState('suvidh@2026');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberWorkstation, setRememberWorkstation] = useState(true);
  const [error, setError] = useState('');
  const [showAdminNotice, setShowAdminNotice] = useState(false);

  const fromState = location.state?.from;
  const redirectTo =
    typeof fromState === 'string' && fromState !== '/login'
      ? fromState
      : fromState?.pathname || '/dashboard';

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleSelectRolePreset = (roleKey) => {
    const profile = ROLE_PROFILES[roleKey];
    if (!profile) return;
    setSelectedRole(roleKey);
    setEmail(profile.email);
    setPassword('suvidh@2026');
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const result = login({
      email,
      password,
      role: selectedRole,
      remember: rememberWorkstation,
    });

    if (!result.ok) {
      setError(result.error);
      return;
    }

    navigate(redirectTo, { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#E7E9F0] text-[#051747] flex flex-col justify-center items-center px-4 py-4 sm:px-6 selection:bg-[#081F62] selection:text-[#FEFEFE]">
      <div className="w-full max-w-[440px] bg-[#FEFEFE] rounded-xl border border-[#535F80]/25 shadow-[0_18px_40px_-14px_rgba(5,23,71,0.14)] p-5 sm:p-7">
        {/* Brand Header */}
        <div className="flex items-center gap-2.5 pb-4 border-b border-[#E7E9F0]">
          <div className="w-9 h-9 rounded-lg bg-[#081F62] text-[#FEFEFE] flex items-center justify-center shadow-xs shrink-0">
            <Factory className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm sm:text-[15px] font-bold tracking-tight text-[#051747] leading-tight">
              Suvidh Engineering Industries ERP
            </div>
            <div className="text-[11px] text-[#535F80] mt-0.5">
              Manufacturing &amp; Production Suite
            </div>
          </div>
        </div>

        <div className="mt-4">
          <h1 className="text-lg sm:text-xl font-semibold text-[#051747] tracking-tight">
            Sign in to your account
          </h1>
          <p className="text-xs text-[#535F80] mt-1">
            Enter your employee credentials to access the ERP workspace.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-3.5 p-2.5 rounded-lg bg-[#E7E9F0] border border-[#051747]/35 flex items-start gap-2 text-xs text-[#051747]"
          >
            <AlertCircle className="w-4 h-4 text-[#081F62] shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3" noValidate>
          {/* Work Email Field */}
          <div>
            <label
              htmlFor="login-email"
              className="block text-xs font-semibold text-[#051747] mb-1"
            >
              Work Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#535F80] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                placeholder="name@suvidherp.in"
                className="w-full pl-9 pr-3 py-2 text-sm bg-[#FEFEFE] text-[#051747] placeholder:text-[#535F80]/60 border border-[#535F80]/35 rounded-lg focus:outline-none focus:border-[#081F62] focus:ring-2 focus:ring-[#081F62]/15 transition-colors"
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-[#051747]"
              >
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowAdminNotice((prev) => !prev)}
                className="text-[11px] font-medium text-[#535F80] hover:text-[#081F62] transition-colors cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#535F80] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Enter your password"
                className="w-full pl-9 pr-9 py-2 text-sm bg-[#FEFEFE] text-[#051747] placeholder:text-[#535F80]/60 border border-[#535F80]/35 rounded-lg focus:outline-none focus:border-[#081F62] focus:ring-2 focus:ring-[#081F62]/15 transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#535F80] hover:text-[#051747] p-0.5 transition-colors cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {showAdminNotice && (
            <div className="p-2 rounded-lg bg-[#E7E9F0]/80 border border-[#535F80]/25 flex items-start gap-2 text-[11px] text-[#051747]">
              <Info className="w-3.5 h-3.5 text-[#081F62] shrink-0 mt-0.5" />
              <span>
                Accounts and password resets are managed by your Plant IT Administrator.
              </span>
            </div>
          )}

          {/* Workstation Persistence Checkbox */}
          <div className="flex items-center justify-between">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberWorkstation}
                onChange={(e) => setRememberWorkstation(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-[#535F80]/50 accent-[#081F62] cursor-pointer"
              />
              <span className="text-xs text-[#535F80]">
                Keep me signed in on this workstation
              </span>
            </label>
          </div>

          {/* Primary Sign In CTA */}
          <button
            type="submit"
            className="w-full py-2 px-4 rounded-lg bg-[#081F62] hover:bg-[#051747] active:bg-[#051747] text-[#FEFEFE] text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <span>Sign In to Suvidh ERP</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Role Selector */}
        <div className="mt-4 p-3 rounded-lg bg-[#E7E9F0]/75 border border-[#535F80]/20">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#051747]">
              Demo Workstation Profiles
            </span>
            <span className="text-[10px] font-medium text-[#535F80]">
              Click to pre-fill
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {Object.keys(ROLE_PROFILES).map((roleKey) => {
              const active = selectedRole === roleKey;
              return (
                <button
                  key={roleKey}
                  type="button"
                  onClick={() => handleSelectRolePreset(roleKey)}
                  className={`px-2 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#081F62] text-[#FEFEFE] border-[#081F62]'
                      : 'bg-[#FEFEFE] text-[#051747] border-[#535F80]/25 hover:border-[#081F62]/50'
                  }`}
                >
                  {roleKey}
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-[#535F80] mt-1.5 truncate">
            <span className="font-medium text-[#051747]">{selectedRole}:</span>{' '}
            {ROLE_SUMMARIES[selectedRole]}
          </p>
        </div>

        <p className="text-[11px] text-[#535F80] text-center mt-3.5">
          Frontend simulation — session stored locally in browser.
        </p>
      </div>
    </div>
  );
}
