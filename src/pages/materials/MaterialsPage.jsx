import { useState, useMemo } from 'react';
import { Plus, Edit2, Warehouse } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { PrimaryButton, SecondaryButton } from '../../components/common/Buttons';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { DataTable } from '../../components/tables/DataTable';
import { SearchInput, FilterDropdown } from '../../components/forms/Filters';
import { FormInput, FormSelect } from '../../components/forms/FormFields';
import { useErpData } from '../../context/ErpDataContext';
import { getMaterialComputedFields } from '../../services/erpService';
import { useTableState } from '../../hooks/useTableState';
import { validateRequired } from '../../utils/validators';
import { formatCurrency, formatNumber } from '../../utils/formatters';

const EMPTY_FORM = {
  code: '',
  name: '',
  category: 'Alloy Steel',
  spec: '',
  uom: 'Kg',
  unitCost: 100,
  reorderLevel: 200,
  location: 'Rack A-01',
};

export function MaterialsPage() {
  const navigate = useNavigate();
  const { materials, saveMaterial } = useErpData();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const computedMaterials = useMemo(
    () => materials.map(getMaterialComputedFields),
    [materials]
  );

  const categories = useMemo(
    () => Array.from(new Set(materials.map((m) => m.category))),
    [materials]
  );

  const table = useTableState(computedMaterials, {
    initialPageSize: 8,
    initialSortKey: 'code',
    searchFields: ['code', 'name', 'category', 'spec', 'location'],
  });

  const openAdd = () => {
    setForm({
      ...EMPTY_FORM,
      code: `RM-NEW-${String(materials.length + 10)}`,
    });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (mat) => {
    setForm(mat);
    setErrors({});
    setModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const nextErrors = {
      code: validateRequired(form.code, 'Material code'),
      name: validateRequired(form.name, 'Material name'),
      uom: validateRequired(form.uom, 'Unit'),
    };
    const filtered = Object.fromEntries(Object.entries(nextErrors).filter(([, v]) => Boolean(v)));
    if (Object.keys(filtered).length > 0) {
      setErrors(filtered);
      return;
    }

    saveMaterial({
      ...form,
      unitCost: Number(form.unitCost || 0),
      reorderLevel: Number(form.reorderLevel || 0),
    });
    setModalOpen(false);
  };

  const columns = [
    {
      key: 'code',
      label: 'Material Code',
      sortable: true,
      render: (r) => <span className="font-mono text-xs font-semibold">{r.code}</span>,
    },
    {
      key: 'name',
      label: 'Material Name & Spec',
      sortable: true,
      render: (r) => (
        <div>
          <div className="font-medium text-slate-900 dark:text-slate-100">{r.name}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">{r.spec}</div>
        </div>
      ),
    },
    { key: 'category', label: 'Category', sortable: true },
    { key: 'location', label: 'Bin / Rack' },
    {
      key: 'unitCost',
      label: 'Std Rate',
      align: 'right',
      numeric: true,
      render: (r) => `${formatCurrency(r.unitCost)} / ${r.uom}`,
    },
    {
      key: 'reorderLevel',
      label: 'Reorder Threshold',
      align: 'right',
      numeric: true,
      render: (r) => `${formatNumber(r.reorderLevel)} ${r.uom}`,
    },
    {
      key: 'availableQty',
      label: 'Available Usable',
      align: 'right',
      numeric: true,
      render: (r) => (
        <span className={r.isLowStock ? 'font-semibold text-red-600' : 'font-semibold text-emerald-600'}>
          {formatNumber(r.availableQty)} {r.uom}
        </span>
      ),
    },
    {
      key: 'stockStatus',
      label: 'Status',
      render: (r) => <StatusBadge status={r.stockStatus} />,
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
          title="Edit Material Master"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Raw Materials Master"
        description="Material grade specifications, unit rates, storage locations, and reorder thresholds."
        actions={
          <>
            <SecondaryButton icon={Warehouse} onClick={() => navigate('/inventory')}>
              Open Warehouse Inventory
            </SecondaryButton>
            <PrimaryButton icon={Plus} onClick={openAdd}>
              Add Raw Material
            </PrimaryButton>
          </>
        }
      />

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 mb-4 flex flex-wrap items-center justify-between gap-3">
        <SearchInput
          value={table.search}
          onChange={table.setSearch}
          placeholder="Search material code, grade, specification..."
          className="w-full sm:w-80"
        />
        <FilterDropdown
          label="Category"
          value={table.filters.category}
          onChange={(val) => table.setFilter('category', val)}
          options={categories}
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
        title={form.id ? 'Edit Raw Material' : 'Add Raw Material'}
        footer={
          <>
            <SecondaryButton onClick={() => setModalOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={handleSave}>Save Material</PrimaryButton>
          </>
        }
      >
        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput
            label="Material Code"
            name="code"
            required
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            error={errors.code}
          />
          <FormInput
            label="Material Name"
            name="name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={errors.name}
          />
          <FormSelect
            label="Category"
            name="category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            options={['Alloy Steel', 'Stainless Steel', 'Castings', 'Non-Ferrous', 'Seals & Fasteners', 'Consumables']}
          />
          <FormSelect
            label="Unit of Measurement"
            name="uom"
            required
            value={form.uom}
            onChange={(e) => setForm({ ...form, uom: e.target.value })}
            options={['Kg', 'Nos', 'Mtr', 'Ltr', 'Set']}
            error={errors.uom}
          />
          <FormInput
            label="Standard Unit Cost (INR)"
            name="unitCost"
            type="number"
            min="0"
            value={form.unitCost}
            onChange={(e) => setForm({ ...form, unitCost: e.target.value })}
          />
          <FormInput
            label="Reorder Threshold"
            name="reorderLevel"
            type="number"
            min="0"
            value={form.reorderLevel}
            onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
          />
          <FormInput
            label="Storage Location"
            name="location"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
          <FormInput
            label="Technical Specification"
            name="spec"
            value={form.spec}
            onChange={(e) => setForm({ ...form, spec: e.target.value })}
          />
        </form>
      </Modal>
    </div>
  );
}
