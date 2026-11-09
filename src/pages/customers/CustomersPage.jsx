import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Edit2, Power } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { PrimaryButton } from '../../components/common/Buttons';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog';
import { DataTable } from '../../components/tables/DataTable';
import { SearchInput, FilterDropdown } from '../../components/forms/Filters';
import { FormInput, FormSelect, FormTextarea } from '../../components/forms/FormFields';
import { useErpData } from '../../context/ErpDataContext';
import { useTableState } from '../../hooks/useTableState';
import { validateRequired, validateEmail } from '../../utils/validators';

const EMPTY_FORM = {
  code: '',
  name: '',
  contactPerson: '',
  email: '',
  phone: '',
  address: '',
  priorityTier: 'High',
  priorityScore: 80,
  status: 'Active',
};

export function CustomersPage() {
  const navigate = useNavigate();
  const { customers, saveCustomer, toggleCustomerStatus } = useErpData();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [confirmTarget, setConfirmTarget] = useState(null);

  const table = useTableState(customers, {
    initialPageSize: 8,
    initialSortKey: 'name',
    searchFields: ['name', 'code', 'contactPerson', 'email', 'phone'],
  });

  const openAddModal = () => {
    setForm({
      ...EMPTY_FORM,
      code: `CUS-NEW-${String(customers.length + 1).padStart(2, '0')}`,
    });
    setErrors({});
    setModalOpen(true);
  };

  const openEditModal = (customer, e) => {
    e?.stopPropagation();
    setForm(customer);
    setErrors({});
    setModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const nextErrors = {
      code: validateRequired(form.code, 'Customer code'),
      name: validateRequired(form.name, 'Customer name'),
      contactPerson: validateRequired(form.contactPerson, 'Contact person'),
      email: validateEmail(form.email),
      phone: validateRequired(form.phone, 'Phone'),
      address: validateRequired(form.address, 'Address'),
    };
    const filtered = Object.fromEntries(
      Object.entries(nextErrors).filter(([, v]) => Boolean(v))
    );
    if (Object.keys(filtered).length > 0) {
      setErrors(filtered);
      return;
    }

    const tierScoreMap = { Critical: 95, High: 82, Medium: 68, Low: 45 };
    saveCustomer({
      ...form,
      priorityScore: tierScoreMap[form.priorityTier] || 75,
    });
    setModalOpen(false);
  };

  const columns = [
    {
      key: 'code',
      label: 'Code',
      sortable: true,
      render: (r) => <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">{r.code}</span>,
    },
    {
      key: 'name',
      label: 'Customer Name',
      sortable: true,
      render: (r) => (
        <div>
          <div className="font-medium text-slate-900 dark:text-slate-100">{r.name}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">Priority: {r.priorityTier}</div>
        </div>
      ),
    },
    { key: 'contactPerson', label: 'Contact Person', sortable: true },
    {
      key: 'email',
      label: 'Email & Phone',
      render: (r) => (
        <div className="text-xs">
          <div className="text-slate-700 dark:text-slate-200">{r.email}</div>
          <div className="text-slate-500 dark:text-slate-400 tabular-nums">{r.phone}</div>
        </div>
      ),
    },
    {
      key: 'address',
      label: 'Address',
      render: (r) => (
        <span className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 max-w-[220px]">
          {r.address}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (r) => (
        <div className="inline-flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => navigate(`/customers/${r.id}`)}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-[#2563EB] cursor-pointer"
            title="View Customer Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => openEditModal(r, e)}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-[#2563EB] cursor-pointer"
            title="Edit Customer"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setConfirmTarget(r)}
            className={`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer ${
              r.status === 'Active' ? 'text-emerald-600 hover:text-amber-600' : 'text-slate-400 hover:text-emerald-600'
            }`}
            title={r.status === 'Active' ? 'Deactivate Customer' : 'Activate Customer'}
          >
            <Power className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Manage OEM customer accounts, contacts, delivery addresses, and priority tiers."
        actions={
          <PrimaryButton icon={Plus} onClick={openAddModal}>
            Add Customer
          </PrimaryButton>
        }
      />

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 mb-4 flex flex-wrap items-center justify-between gap-3">
        <SearchInput
          value={table.search}
          onChange={table.setSearch}
          placeholder="Search customer name, code, contact, email..."
          className="w-full sm:w-80"
        />
        <div className="flex flex-wrap items-center gap-3">
          <FilterDropdown
            label="Status"
            value={table.filters.status}
            onChange={(val) => table.setFilter('status', val)}
            options={['Active', 'Inactive']}
          />
          <FilterDropdown
            label="Priority"
            value={table.filters.priorityTier}
            onChange={(val) => table.setFilter('priorityTier', val)}
            options={['Critical', 'High', 'Medium', 'Low']}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={table.paginatedData}
        sortKey={table.sortKey}
        sortDir={table.sortDir}
        onSort={table.handleSort}
        onRowClick={(r) => navigate(`/customers/${r.id}`)}
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
        title={form.id ? 'Edit Customer' : 'Add New Customer'}
        subtitle="Changes are saved locally in browser LocalStorage (demo mode)."
        footer={
          <>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <PrimaryButton onClick={handleSave}>
              {form.id ? 'Save Changes' : 'Create Customer'}
            </PrimaryButton>
          </>
        }
      >
        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput
            label="Customer Code"
            name="code"
            required
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            error={errors.code}
          />
          <FormInput
            label="Customer Name"
            name="name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={errors.name}
          />
          <FormInput
            label="Contact Person"
            name="contactPerson"
            required
            value={form.contactPerson}
            onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
            error={errors.contactPerson}
          />
          <FormInput
            label="Email"
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
            required
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            error={errors.phone}
          />
          <FormSelect
            label="Priority Tier"
            name="priorityTier"
            value={form.priorityTier}
            onChange={(e) => setForm({ ...form, priorityTier: e.target.value })}
            options={['Critical', 'High', 'Medium', 'Low']}
          />
          <FormSelect
            label="Status"
            name="status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            options={['Active', 'Inactive']}
          />
          <FormTextarea
            label="Plant / Billing Address"
            name="address"
            required
            className="sm:col-span-2"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            error={errors.address}
          />
        </form>
      </Modal>

      <ConfirmationDialog
        isOpen={Boolean(confirmTarget)}
        onClose={() => setConfirmTarget(null)}
        onConfirm={() => confirmTarget && toggleCustomerStatus(confirmTarget.id)}
        title={
          confirmTarget?.status === 'Active'
            ? 'Deactivate Customer Account'
            : 'Activate Customer Account'
        }
        message={`Are you sure you want to ${
          confirmTarget?.status === 'Active' ? 'deactivate' : 'activate'
        } ${confirmTarget?.name}?`}
        confirmLabel={confirmTarget?.status === 'Active' ? 'Deactivate' : 'Activate'}
        variant={confirmTarget?.status === 'Active' ? 'danger' : 'primary'}
      />
    </div>
  );
}
