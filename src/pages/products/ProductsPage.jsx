import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Edit2 } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { PrimaryButton } from '../../components/common/Buttons';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { DataTable } from '../../components/tables/DataTable';
import { SearchInput, FilterDropdown } from '../../components/forms/Filters';
import { FormInput, FormSelect, FormTextarea } from '../../components/forms/FormFields';
import { useErpData } from '../../context/ErpDataContext';
import { useTableState } from '../../hooks/useTableState';
import { validateRequired } from '../../utils/validators';
import { formatCurrency } from '../../utils/formatters';

const EMPTY_FORM = {
  code: '',
  name: '',
  category: 'Castings & Housings',
  description: '',
  uom: 'Nos',
  unitPrice: 0,
  standardCycleMinutes: 10,
  status: 'Active',
};

export function ProductsPage() {
  const navigate = useNavigate();
  const { products, boms, saveProduct } = useErpData();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category))),
    [products]
  );

  const table = useTableState(products, {
    initialPageSize: 8,
    initialSortKey: 'code',
    searchFields: ['code', 'name', 'category', 'description'],
  });

  const openAdd = () => {
    setForm({
      ...EMPTY_FORM,
      code: `PRD-NEW-${String(products.length + 101)}`,
    });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (prod, e) => {
    e?.stopPropagation();
    setForm(prod);
    setErrors({});
    setModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const nextErrors = {
      code: validateRequired(form.code, 'Product code'),
      name: validateRequired(form.name, 'Product name'),
      category: validateRequired(form.category, 'Category'),
      uom: validateRequired(form.uom, 'Unit of measurement'),
    };
    const filtered = Object.fromEntries(
      Object.entries(nextErrors).filter(([, v]) => Boolean(v))
    );
    if (Object.keys(filtered).length > 0) {
      setErrors(filtered);
      return;
    }

    saveProduct({
      ...form,
      unitPrice: Number(form.unitPrice || 0),
      standardCycleMinutes: Number(form.standardCycleMinutes || 10),
    });
    setModalOpen(false);
  };

  const columns = [
    {
      key: 'code',
      label: 'Product Code',
      sortable: true,
      render: (r) => (
        <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
          {r.code}
        </span>
      ),
    },
    {
      key: 'name',
      label: 'Product Name',
      sortable: true,
      render: (r) => (
        <div>
          <div className="font-medium text-slate-900 dark:text-slate-100">{r.name}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Rate: {formatCurrency(r.unitPrice)} · Cycle: {r.standardCycleMinutes} min
          </div>
        </div>
      ),
    },
    { key: 'category', label: 'Category', sortable: true },
    {
      key: 'description',
      label: 'Description',
      render: (r) => (
        <span className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 max-w-[260px]">
          {r.description}
        </span>
      ),
    },
    {
      key: 'uom',
      label: 'UOM',
      render: (r) => (
        <span className="px-2 py-0.5 text-xs rounded bg-slate-100 dark:bg-slate-800 font-medium">
          {r.uom}
        </span>
      ),
    },
    {
      key: 'bom',
      label: 'BOM',
      render: (r) => {
        const bom = boms.find((b) => b.productId === r.id);
        return bom ? (
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            {bom.version} ({bom.items.length} items)
          </span>
        ) : (
          <span className="text-xs text-amber-600">No BOM</span>
        );
      },
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
            onClick={() => navigate(`/products/${r.id}`)}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-[#2563EB] cursor-pointer"
            title="View Product Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => openEdit(r, e)}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-[#2563EB] cursor-pointer"
            title="Edit Product"
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
        title="Products"
        description="Finished goods catalog, standard cycle specifications, units of measurement, and BOM links."
        actions={
          <PrimaryButton icon={Plus} onClick={openAdd}>
            Add Product
          </PrimaryButton>
        }
      />

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 mb-4 flex flex-wrap items-center justify-between gap-3">
        <SearchInput
          value={table.search}
          onChange={table.setSearch}
          placeholder="Search product code, name, description..."
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
        onRowClick={(r) => navigate(`/products/${r.id}`)}
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
        title={form.id ? 'Edit Product' : 'Add New Product'}
        subtitle="Configure finished product master record."
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
              {form.id ? 'Update Product' : 'Create Product'}
            </PrimaryButton>
          </>
        }
      >
        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput
            label="Product Code"
            name="code"
            required
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            error={errors.code}
          />
          <FormInput
            label="Product Name"
            name="name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={errors.name}
          />
          <FormSelect
            label="Category"
            name="category"
            required
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            options={[
              'Castings & Housings',
              'Turned Shafts',
              'Valve Assemblies',
              'Manifolds',
              'Flanges & Couplings',
              'Linear Components',
              'Bushes & Bearings',
            ]}
            error={errors.category}
          />
          <FormSelect
            label="Unit of Measurement"
            name="uom"
            required
            value={form.uom}
            onChange={(e) => setForm({ ...form, uom: e.target.value })}
            options={['Nos', 'Set', 'Kg', 'Mtr']}
            error={errors.uom}
          />
          <FormInput
            label="Standard Rate (INR)"
            name="unitPrice"
            type="number"
            min="0"
            value={form.unitPrice}
            onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
          />
          <FormSelect
            label="Status"
            name="status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            options={['Active', 'Inactive']}
          />
          <FormTextarea
            label="Technical Description"
            name="description"
            className="sm:col-span-2"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </form>
      </Modal>
    </div>
  );
}
