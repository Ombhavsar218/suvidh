import { useState } from 'react';
import { Plus, Edit2 /* , Shield */ } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { PrimaryButton, SecondaryButton } from '../../components/common/Buttons';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { Tooltip } from '../../components/common/Tooltip';
import { DataTable } from '../../components/tables/DataTable';
import { SearchInput, FilterDropdown } from '../../components/forms/Filters';
import { FormInput, FormSelect } from '../../components/forms/FormFields';
import { useErpData } from '../../context/ErpDataContext';
// import { useApp } from '../../context/AppContext';
import { useTableState } from '../../hooks/useTableState';
// import { ROLES, ROLE_DESCRIPTIONS } from '../../utils/permissions';
import { validateRequired, validateEmail } from '../../utils/validators';

const EMPTY_USER = {
  name: '',
  email: '',
  phone: '',
  role: 'Production',
  department: '',
  status: 'Active',
};

export function UsersPage() {
  const { users, saveUser } = useErpData();
  // const { activeRole, switchRole } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_USER);
  const [errors, setErrors] = useState({});

  const table = useTableState(users, {
    initialPageSize: 8,
    initialSortKey: 'name',
    searchFields: ['name', 'email', 'role', 'department'],
  });

  const openAdd = () => {
    setForm(EMPTY_USER);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (user) => {
    setForm(user);
    setErrors({});
    setModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const nextErrors = {
      name: validateRequired(form.name, 'Full name'),
      email: validateEmail(form.email),
      department: validateRequired(form.department, 'Department'),
    };
    const filtered = Object.fromEntries(Object.entries(nextErrors).filter(([, v]) => Boolean(v)));
    if (Object.keys(filtered).length > 0) {
      setErrors(filtered);
      return;
    }
    saveUser(form);
    setModalOpen(false);
  };

  const columns = [
    {
      key: 'name',
      label: 'User',
      sortable: true,
      render: (r) => (
        <div>
          <div className="font-medium text-[#051747] dark:text-slate-100">{r.name}</div>
          <div className="text-[11px] text-slate-500">{r.email}</div>
        </div>
      ),
    },
    { key: 'department', label: 'Department', sortable: true },
    {
      key: 'role',
      label: 'Assigned Role',
      sortable: true,
      render: (r) => (
        <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-50 text-[#081F62] dark:bg-blue-950/60 dark:text-blue-300">
          {r.role}
        </span>
      ),
    },
    { key: 'phone', label: 'Phone', render: (r) => <span className="tabular-nums text-xs">{r.phone}</span> },
    { key: 'lastActive', label: 'Last Active', render: (r) => <span className="tabular-nums text-xs text-slate-500">{r.lastActive}</span> },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} size="xs" /> },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (r) => (
        <Tooltip content="Edit User">
          <button
            type="button"
            onClick={() => openEdit(r)}
            className="p-1.5 rounded hover:bg-[#E7E9F0]/70 dark:hover:bg-slate-800 text-[#535F80] hover:text-[#081F62] cursor-pointer"
            aria-label="Edit User"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </Tooltip>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management & Role Preview"
        description="Manage ERP user accounts and preview frontend role-based navigation visibility."
        actions={
          <PrimaryButton icon={Plus} onClick={openAdd}>
            Add User
          </PrimaryButton>
        }
      />

      {/* Demo Role Switcher Card (Commented out)
      <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#051747] dark:text-slate-100">
              <Shield className="w-4 h-4 text-[#081F62]" />
              Demo Role Switcher (Frontend UI Demonstration)
            </div>
            <p className="text-xs text-[#535F80] dark:text-slate-400 mt-1">
              Preview how sidebar modules adapt per operational role. Note: Frontend role checks are for UI demonstration only; real permissions must be enforced by the backend API.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {Object.values(ROLES).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => switchRole(role)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md border transition-colors cursor-pointer ${
                  activeRole === role
                    ? 'bg-[#081F62] text-white border-[#081F62]'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-[#535F80]/30 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          {Object.entries(ROLE_DESCRIPTIONS).map(([role, desc]) => (
            <div
              key={role}
              className={`p-3 rounded-md border text-xs ${
                activeRole === role
                  ? 'border-[#081F62] bg-blue-50/50 dark:bg-blue-950/20'
                  : 'border-[#535F80]/20 dark:border-slate-800'
              }`}
            >
              <div className="font-semibold text-[#051747] dark:text-slate-100">{role}</div>
              <p className="text-[11px] text-[#535F80] dark:text-slate-400 mt-1">{desc}</p>
            </div>
          ))}
        </div>
      </div>
      */}

      <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3">
        <SearchInput
          value={table.search}
          onChange={table.setSearch}
          placeholder="Search user name, email, department..."
          className="w-full sm:w-80"
        />
        <div className="flex flex-wrap items-center gap-3">
          <FilterDropdown
            label="Role"
            value={table.filters.role}
            onChange={(val) => table.setFilter('role', val)}
            options={['Admin', 'Store', 'Production', 'Quality']}
          />
          <FilterDropdown
            label="Status"
            value={table.filters.status}
            onChange={(val) => table.setFilter('status', val)}
            options={['Active', 'Inactive']}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={table.paginatedData}
        sortKey={table.sortKey}
        sortDir={table.sortDir}
        onSort={table.handleSort}
        pagination={{
          page: table.page,
          totalPages: table.totalPages,
          totalItems: table.totalItems,
          pageSize: table.pageSize,
          onPageChange: table.setPage,
          onPageSizeChange: table.setPageSize,
        }}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? 'Edit User Account' : 'Add ERP User'}
        footer={
          <>
            <SecondaryButton onClick={() => setModalOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={handleSave}>Save User</PrimaryButton>
          </>
        }
      >
        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput
            label="Full Name"
            name="name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={errors.name}
          />
          <FormInput
            label="Email Address"
            name="email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            error={errors.email}
          />
          <FormInput
            label="Phone"
            name="phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <FormInput
            label="Department"
            name="department"
            required
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
            error={errors.department}
          />
          <FormSelect
            label="Role"
            name="role"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            options={['Admin', 'Store', 'Production', 'Quality']}
          />
          <FormSelect
            label="Status"
            name="status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            options={['Active', 'Inactive']}
          />
        </form>
      </Modal>
    </div>
  );
}
