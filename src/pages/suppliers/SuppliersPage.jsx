import { useState } from 'react';
import { Plus, Edit2, Star } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { PrimaryButton } from '../../components/common/Buttons';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
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
  category: 'Alloy & Stainless Steel',
  leadTimeDays: 5,
  rating: 4.5,
  status: 'Active',
};

export function SuppliersPage() {
  const { suppliers, saveSupplier } = useErpData();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const table = useTableState(suppliers, {
    initialPageSize: 8,
    initialSortKey: 'name',
    searchFields: ['code', 'name', 'contactPerson', 'category', 'email'],
  });

  const openAdd = () => {
    setForm({
      ...EMPTY_FORM,
      code: `SUP-NEW-${String(suppliers.length + 1).padStart(2, '0')}`,
    });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (sup) => {
    setForm(sup);
    setErrors({});
    setModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const nextErrors = {
      code: validateRequired(form.code, 'Supplier code'),
      name: validateRequired(form.name, 'Supplier name'),
      contactPerson: validateRequired(form.contactPerson, 'Contact person'),
      email: validateEmail(form.email),
    };
    const filtered = Object.fromEntries(Object.entries(nextErrors).filter(([, v]) => Boolean(v)));
    if (Object.keys(filtered).length > 0) {
      setErrors(filtered);
      return;
    }

    saveSupplier({
      ...form,
      leadTimeDays: Number(form.leadTimeDays || 5),
      rating: Number(form.rating || 4.5),
    });
    setModalOpen(false);
  };

  const columns = [
    {
      key: 'code',
      label: 'Code',
      sortable: true,
      render: (r) => <span className="font-mono text-xs font-semibold">{r.code}</span>,
    },
    {
      key: 'name',
      label: 'Supplier Name',
      sortable: true,
      render: (r) => (
        <div>
          <div className="font-medium text-slate-900 dark:text-slate-100">{r.name}</div>
          <div className="text-[11px] text-slate-500">{r.category}</div>
        </div>
      ),
    },
    { key: 'contactPerson', label: 'Contact', sortable: true },
    {
      key: 'email',
      label: 'Contact Info',
      render: (r) => (
        <div className="text-xs">
          <div>{r.email}</div>
          <div className="text-slate-500 tabular-nums">{r.phone}</div>
        </div>
      ),
    },
    {
      key: 'leadTimeDays',
      label: 'Lead Time',
      align: 'right',
      numeric: true,
      render: (r) => `${r.leadTimeDays} days`,
    },
    {
      key: 'rating',
      label: 'Rating',
      render: (r) => (
        <span className="inline-flex items-center gap-1 text-xs font-medium tabular-nums">
          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          {r.rating}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (r) => (
        <button
          type="button"
          onClick={() => openEdit(r)}
          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-[#2563EB] cursor-pointer"
          title="Edit Supplier"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Suppliers"
        description="Approved raw material vendors, lead times, and supply categories."
        actions={
          <PrimaryButton icon={Plus} onClick={openAdd}>
            Add Supplier
          </PrimaryButton>
        }
      />

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 mb-4 flex flex-wrap items-center justify-between gap-3">
        <SearchInput
          value={table.search}
          onChange={table.setSearch}
          placeholder="Search supplier name, code, category..."
          className="w-full sm:w-80"
        />
        <FilterDropdown
          label="Status"
          value={table.filters.status}
          onChange={(val) => table.setFilter('status', val)}
          options={['Active', 'Inactive']}
        />
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
        title={form.id ? 'Edit Supplier' : 'Add Supplier'}
        footer={
          <>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-md border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <PrimaryButton onClick={handleSave}>Save Supplier</PrimaryButton>
          </>
        }
      >
        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput
            label="Supplier Code"
            name="code"
            required
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            error={errors.code}
          />
          <FormInput
            label="Supplier Name"
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
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <FormInput
            label="Material Category"
            name="category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
          <FormInput
            label="Standard Lead Time (Days)"
            name="leadTimeDays"
            type="number"
            min="1"
            value={form.leadTimeDays}
            onChange={(e) => setForm({ ...form, leadTimeDays: e.target.value })}
          />
          <FormSelect
            label="Status"
            name="status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            options={['Active', 'Inactive']}
          />
          <FormTextarea
            label="Address"
            name="address"
            className="sm:col-span-2"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </form>
      </Modal>
    </div>
  );
}
