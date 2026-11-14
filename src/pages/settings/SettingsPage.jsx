import { useState } from 'react';
import { User, Building2, Bell, Sliders, Lock, RotateCcw } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { PrimaryButton, SecondaryButton } from '../../components/common/Buttons';
import { Tabs } from '../../components/common/Tabs';
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog';
import { FormInput, FormSelect, FormTextarea } from '../../components/forms/FormFields';
import { useApp } from '../../context/AppContext';
import { useErpData } from '../../context/ErpDataContext';

export function SettingsPage() {
  const { currentUser, updateCurrentUserProfile, addToast, theme, toggleTheme } = useApp();
  const { settings, updateSettings, resetAllDemoData } = useErpData();

  const [activeTab, setActiveTab] = useState('profile');
  const [resetOpen, setResetOpen] = useState(false);

  const [profileForm, setProfileForm] = useState({
    name: currentUser.name,
    email: currentUser.email,
    phone: currentUser.phone,
    department: currentUser.department,
    avatarUrl: currentUser.avatarUrl || '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [companyForm, setCompanyForm] = useState({ ...settings });

  const handleSaveProfile = (e) => {
    e.preventDefault();
    const initials = profileForm.name
      .split(' ')
      .map((s) => s[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    updateCurrentUserProfile({ ...profileForm, initials });
  };

  const handleSavePassword = (e) => {
    e.preventDefault();
    if (!passwordForm.newPassword || passwordForm.newPassword !== passwordForm.confirmPassword) {
      addToast({
        title: 'Password mismatch',
        message: 'New password and confirmation must match.',
        type: 'danger',
      });
      return;
    }
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    addToast({
      title: 'Password Form Validated (Demo Only)',
      message: 'No backend authentication server is connected in this frontend demo.',
      type: 'info',
    });
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    updateSettings(companyForm);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings & User Profile"
        description="Manage personal profile, notification preferences, company plant details, and local demo system settings."
      />

      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { key: 'profile', label: 'User Profile & Security', icon: User },
          { key: 'notifications', label: 'Notification Preferences', icon: Bell },
          { key: 'company', label: 'Company Information', icon: Building2 },
          { key: 'system', label: 'System Preferences', icon: Sliders },
        ]}
      />

      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <form
            onSubmit={handleSaveProfile}
            className="lg:col-span-2 bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-5 space-y-4"
          >
            <div className="flex items-center gap-4 pb-4 border-b border-[#535F80]/20 dark:border-slate-800">
              {profileForm.avatarUrl ? (
                <img
                  src={profileForm.avatarUrl}
                  alt={profileForm.name}
                  className="w-14 h-14 rounded-lg object-cover border border-slate-200"
                />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-[#081F62] text-white flex items-center justify-center text-lg font-bold">
                  {currentUser.initials}
                </div>
              )}
              <div>
                <h3 className="text-sm font-semibold">{currentUser.name}</h3>
                <p className="text-xs text-slate-500">
                  {currentUser.role} Role · {currentUser.department}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput
                label="Full Name"
                name="name"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
              />
              <FormInput
                label="Email Address"
                name="email"
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
              />
              <FormInput
                label="Phone"
                name="phone"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
              />
              <FormInput
                label="Department"
                name="department"
                value={profileForm.department}
                onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
              />
              <FormInput
                label="Profile Image URL (Optional)"
                name="avatarUrl"
                className="sm:col-span-2"
                placeholder="https://..."
                value={profileForm.avatarUrl}
                onChange={(e) => setProfileForm({ ...profileForm, avatarUrl: e.target.value })}
              />
            </div>

            <div className="flex justify-end pt-2">
              <PrimaryButton type="submit">Save Profile Changes</PrimaryButton>
            </div>
          </form>

          {/* Password UI Form */}
          <form
            onSubmit={handleSavePassword}
            className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-5 space-y-4 h-fit"
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Lock className="w-4 h-4 text-[#081F62]" />
              Change Password (UI Demo)
            </div>
            <FormInput
              label="Current Password"
              name="currentPassword"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) =>
                setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
              }
            />
            <FormInput
              label="New Password"
              name="newPassword"
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) =>
                setPasswordForm({ ...passwordForm, newPassword: e.target.value })
              }
            />
            <FormInput
              label="Confirm New Password"
              name="confirmPassword"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) =>
                setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
              }
            />
            <SecondaryButton type="submit" className="w-full">
              Update Password (Demo)
            </SecondaryButton>
          </form>
        </div>
      )}

      {activeTab === 'notifications' && (
        <form
          onSubmit={handleSaveSettings}
          className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-5 space-y-4 max-w-2xl"
        >
          <h3 className="text-sm font-semibold">Alert & Digest Preferences</h3>
          <div className="space-y-3 text-xs">
            <label className="flex items-center justify-between p-3 rounded border border-[#535F80]/20 dark:border-slate-800 cursor-pointer">
              <div>
                <div className="font-medium">Low-Stock & Material Shortage Alerts</div>
                <div className="text-slate-500">Notify when available unreserved material drops below reorder threshold.</div>
              </div>
              <input
                type="checkbox"
                checked={companyForm.lowStockAlertEnabled}
                onChange={(e) =>
                  setCompanyForm({ ...companyForm, lowStockAlertEnabled: e.target.checked })
                }
              />
            </label>
            <label className="flex items-center justify-between p-3 rounded border border-[#535F80]/20 dark:border-slate-800 cursor-pointer">
              <div>
                <div className="font-medium">In-App Toast & Badge Alerts</div>
                <div className="text-slate-500">Show unread alert count in the top navigation bar.</div>
              </div>
              <input
                type="checkbox"
                checked={companyForm.inAppAlerts}
                onChange={(e) =>
                  setCompanyForm({ ...companyForm, inAppAlerts: e.target.checked })
                }
              />
            </label>
            <label className="flex items-center justify-between p-3 rounded border border-[#535F80]/20 dark:border-slate-800 cursor-pointer">
              <div>
                <div className="font-medium">Email Notification Digest</div>
                <div className="text-slate-500">Configured summary cadence for future backend worker.</div>
              </div>
              <input
                type="checkbox"
                checked={companyForm.emailNotifications}
                onChange={(e) =>
                  setCompanyForm({ ...companyForm, emailNotifications: e.target.checked })
                }
              />
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput
              label="Delivery Alert Lead Time (Days Before Due)"
              name="deliveryAlertDaysBefore"
              type="number"
              min="1"
              max="14"
              value={companyForm.deliveryAlertDaysBefore}
              onChange={(e) =>
                setCompanyForm({ ...companyForm, deliveryAlertDaysBefore: Number(e.target.value) })
              }
            />
            <FormSelect
              label="Summary Digest Schedule"
              name="digestFrequency"
              value={companyForm.digestFrequency}
              onChange={(e) => setCompanyForm({ ...companyForm, digestFrequency: e.target.value })}
              options={['Real-time', 'Daily 08:00 AM', 'Weekly Monday']}
            />
          </div>
          <div className="flex justify-end">
            <PrimaryButton type="submit">Save Preferences</PrimaryButton>
          </div>
        </form>
      )}

      {activeTab === 'company' && (
        <form
          onSubmit={handleSaveSettings}
          className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-5 space-y-4 max-w-2xl"
        >
          <h3 className="text-sm font-semibold">Company & Plant Profile</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput
              label="Company Name"
              name="companyName"
              value={companyForm.companyName}
              onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })}
            />
            <FormInput
              label="Plant Code"
              name="plantCode"
              value={companyForm.plantCode}
              onChange={(e) => setCompanyForm({ ...companyForm, plantCode: e.target.value })}
            />
            <FormInput
              label="Operations Email"
              name="contactEmail"
              value={companyForm.contactEmail}
              onChange={(e) => setCompanyForm({ ...companyForm, contactEmail: e.target.value })}
            />
            <FormInput
              label="Plant Contact Phone"
              name="contactPhone"
              value={companyForm.contactPhone}
              onChange={(e) => setCompanyForm({ ...companyForm, contactPhone: e.target.value })}
            />
            <FormTextarea
              label="Factory Address"
              name="address"
              className="sm:col-span-2"
              rows={2}
              value={companyForm.address}
              onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
            />
          </div>
          <div className="flex justify-end">
            <PrimaryButton type="submit">Save Company Info</PrimaryButton>
          </div>
        </form>
      )}

      {activeTab === 'system' && (
        <div className="space-y-4 max-w-2xl">
          <form
            onSubmit={handleSaveSettings}
            className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-5 space-y-4"
          >
            <h3 className="text-sm font-semibold">System & Shop Floor Preferences</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormSelect
                label="Display Currency"
                name="currency"
                value={companyForm.currency}
                onChange={(e) => setCompanyForm({ ...companyForm, currency: e.target.value })}
                options={['INR', 'USD', 'EUR']}
              />
              <FormInput
                label="Standard Shift Duration (Hours)"
                name="defaultShiftHours"
                type="number"
                min="4"
                max="12"
                value={companyForm.defaultShiftHours}
                onChange={(e) =>
                  setCompanyForm({ ...companyForm, defaultShiftHours: Number(e.target.value) })
                }
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded border border-[#535F80]/20 dark:border-slate-800 text-xs">
              <div>
                <div className="font-medium">Interface Color Theme</div>
                <div className="text-slate-500">Current: {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</div>
              </div>
              <SecondaryButton size="sm" onClick={toggleTheme}>
                Switch to {theme === 'dark' ? 'Light' : 'Dark'} Theme
              </SecondaryButton>
            </div>

            <div className="flex justify-end">
              <PrimaryButton type="submit">Save System Preferences</PrimaryButton>
            </div>
          </form>

          <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-amber-200 dark:border-amber-800/60 rounded-lg p-5 flex items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-semibold text-[#051747] dark:text-slate-100">
                Reset Local Demo Data
              </h4>
              <p className="text-xs text-[#535F80] dark:text-slate-400 mt-0.5">
                Restore all customers, BOMs, warehouse balances, plans, and transactions in LocalStorage back to the initial manufacturing seed dataset.
              </p>
            </div>
            <SecondaryButton icon={RotateCcw} onClick={() => setResetOpen(true)}>
              Reset Data
            </SecondaryButton>
          </div>
        </div>
      )}

      <ConfirmationDialog
        isOpen={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={resetAllDemoData}
        title="Reset Local Demo Data"
        message="This will overwrite any local edits stored in your browser and restore the default Suvidh ERP seed dataset. Continue?"
        confirmLabel="Reset Demo Data"
        variant="danger"
      />
    </div>
  );
}
