import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Edit2 } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { PrimaryButton, SecondaryButton } from '../../components/common/Buttons';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { DataTable } from '../../components/tables/DataTable';
import { SearchInput, FilterDropdown } from '../../components/forms/Filters';
import { FormInput, FormSelect } from '../../components/forms/FormFields';
import { useErpData } from '../../context/ErpDataContext';
import { useTableState } from '../../hooks/useTableState';
import { validateRequired } from '../../utils/validators';

const EMPTY_FORM = {
  code: '',
  name: '',
  category: 'VMC / CNC Milling',
  supportedProductIds: [],
  dailyCapacity: 100,
  efficiency: 90,
  status: 'Available',
  bay: 'Shop Floor Bay A',
  operator: '',
};

export function MachinesPage() {
  const navigate = useNavigate();
  const { machines, products, saveMachine } = useErpData();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const categories = useMemo(
    () => Array.from(new Set(machines.map((m) => m.category))),
    [machines]
  );

  const table = useTableState(machines, {
    initialPageSize: 8,
    initialSortKey: 'code',
    searchFields: ['code', 'name', 'category', 'bay', 'operator'],
  });

  const openAdd = () => {
    setForm({
      ...EMPTY_FORM,
      code: `MC-CNC-0${machines.length + 1}`,
    });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (mach, e) => {
    e?.stopPropagation();
    setForm(mach);
    setErrors({});
    setModalOpen(true);
  };

  const toggleSupportedProduct = (prodId) => {
    setForm((prev) => {
      const current = prev.supportedProductIds || [];
      const next = current.includes(prodId)
        ? current.filter((id) => id !== prodId)
        : [...current, prodId];
      return { ...prev, supportedProductIds: next };
    });
  };

  const handleSave = (e) => {
    e.preventDefault();
    const nextErrors = {
      code: validateRequired(form.code, 'Machine code'),
      name: validateRequired(form.name, 'Machine name'),
    };
    const filtered = Object.fromEntries(Object.entries(nextErrors).filter(([, v]) => Boolean(v)));
    if (Object.keys(filtered).length > 0) {
      setErrors(filtered);
      return;
    }

    saveMachine({
      ...form,
      dailyCapacity: Number(form.dailyCapacity || 0),
      efficiency: Number(form.efficiency || 85),
    });
    setModalOpen(false);
  };

  const columns = [
    {
      key: 'code',
      label: 'Machine Code',
      sortable: true,
      render: (r) => <span className="font-mono text-xs font-semibold">{r.code}</span>,
    },
    {
      key: 'name',
      label: 'Machine Name',
      sortable: true,
      render: (r) => (
        <div>
          <div className="font-medium text-slate-900 dark:text-slate-100">{r.name}</div>
          <div className="text-[11px] text-slate-500">{r.bay} · Operator: {r.operator || 'Unassigned'}</div>
        </div>
      ),
    },
    { key: 'category', label: 'Category', sortable: true },
    {
      key: 'supportedProductIds',
      label: 'Supported Products',
      render: (r) => (
        <div className="flex flex-wrap gap-1 max-w-[230px]">
          {(r.supportedProductIds || []).map((pid) => {
            const p = products.find((item) => item.id === pid);
            return (
              <span
                key={pid}
                className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                {p ? p.code.replace('PRD-', '') : pid}
              </span>
            );
          })}
        </div>
      ),
    },
    {
      key: 'dailyCapacity',
      label: 'Daily Capacity',
      sortable: true,
      align: 'right',
      numeric: true,
      render: (r) => `${r.dailyCapacity} units/day`,
    },
    {
      key: 'efficiency',
      label: 'Efficiency',
      sortable: true,
      align: 'right',
      numeric: true,
      render: (r) => (
        <div className="inline-flex items-center gap-2">
          <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#2563EB]"
              style={{ width: `${Math.min(100, r.efficiency)}%` }}
            />
          </div>
          <span className="text-xs font-medium">{r.efficiency}%</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Availability Status',
      sortable: true,
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (r) => (
        <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => navigate(`/machines/${r.id}`)}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-[#2563EB] cursor-pointer"
            title="View Machine Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => openEdit(r, e)}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-[#2563EB] cursor-pointer"
            title="Edit Machine"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Machine Management"
        description="Shop floor CNC work centers, daily capacities, compatible product matrices, and availability status."
        actions={
          <PrimaryButton icon={Plus} onClick={openAdd}>
            Add Machine
          </PrimaryButton>
        }
      />

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 mb-4 flex flex-wrap items-center justify-between gap-3">
        <SearchInput
          value={table.search}
          onChange={table.setSearch}
          placeholder="Search machine code, name, bay..."
          className="w-full sm:w-80"
        />
        <div className="flex flex-wrap items-center gap-3">
          <FilterDropdown
            label="Category"
            value={table.filters.category}
            onChange={(val) => table.setFilter('category', val)}
            options={categories}
          />
          <FilterDropdown
            label="Status"
            value={table.filters.status}
            onChange={(val) => table.setFilter('status', val)}
            options={['Available', 'In Use', 'Maintenance', 'Inactive']}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={table.paginatedData}
        sortKey={table.sortKey}
        sortDir={table.sortDir}
        onSort={table.handleSort}
        onRowClick={(r) => navigate(`/machines/${r.id}`)}
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
        title={form.id ? 'Edit Machine' : 'Add Machine'}
        size="lg"
        footer={
          <>
            <SecondaryButton onClick={() => setModalOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={handleSave}>Save Machine</PrimaryButton>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput
              label="Machine Code"
              name="code"
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              error={errors.code}
            />
            <FormInput
              label="Machine Name"
              name="name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              error={errors.name}
            />
            <FormSelect
              label="Machine Category"
              name="category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              options={['VMC / CNC Milling', 'CNC Turning', 'HMC', 'Precision Grinding', 'Broaching & Slotting']}
            />
            <FormSelect
              label="Availability Status"
              name="status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={['Available', 'In Use', 'Maintenance', 'Inactive']}
            />
            <FormInput
              label="Daily Production Capacity (Units)"
              name="dailyCapacity"
              type="number"
              min="1"
              value={form.dailyCapacity}
              onChange={(e) => setForm({ ...form, dailyCapacity: e.target.value })}
            />
            <FormInput
              label="Efficiency (%)"
              name="efficiency"
              type="number"
              min="1"
              max="100"
              value={form.efficiency}
              onChange={(e) => setForm({ ...form, efficiency: e.target.value })}
            />
            <FormInput
              label="Shop Floor Bay"
              name="bay"
              value={form.bay}
              onChange={(e) => setForm({ ...form, bay: e.target.value })}
            />
            <FormInput
              label="Assigned Operator"
              name="operator"
              value={form.operator}
              onChange={(e) => setForm({ ...form, operator: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
              Supported Compatible Products
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto p-2.5 border border-slate-200 dark:border-slate-700 rounded-md">
              {products.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={(form.supportedProductIds || []).includes(p.id)}
                    onChange={() => toggleSupportedProduct(p.id)}
                  />
                  <span className="font-mono text-[11px] text-slate-500">{p.code}</span>
                  <span className="truncate">{p.name}</span>
                </label>
              ))}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
