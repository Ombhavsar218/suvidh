import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Eye,
  Edit2,
  Power,
  Trash2,
  LayoutGrid,
  List,
  Package,
  ShieldCheck,
  Layers,
  Clock,
  ArrowRight,
  X,
  Building2,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { PrimaryButton, SecondaryButton } from '../../components/common/Buttons';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { Tooltip } from '../../components/common/Tooltip';
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog';
import { DataTable } from '../../components/tables/DataTable';
import { SearchInput, FilterDropdown } from '../../components/forms/Filters';
import { StatCard } from '../../components/dashboard/StatCard';
import { Pagination } from '../../components/common/Pagination';
import { EmptyState } from '../../components/common/States';
import { FormInput, FormSelect, FormTextarea } from '../../components/forms/FormFields';
import { useErpData } from '../../context/ErpDataContext';
import { useTableState } from '../../hooks/useTableState';
import { validateRequired } from '../../utils/validators';
import { formatCurrency } from '../../utils/formatters';

function getInitials(name) {
  if (!name) return 'PR';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const CATEGORY_STYLES = {
  'Castings & Housings': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50',
  'Turned Shafts': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50',
  'Valve Assemblies': 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50',
  'Manifolds': 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/50',
  'Flanges & Couplings': 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/50',
  'Linear Components': 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-900/50',
  'Bushes & Bearings': 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/50',
};

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
  const {
    products = [],
    boms = [],
    saveProduct,
    toggleProductStatus,
    deleteProduct,
  } = useErpData();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'

  // KPI Metrics
  const activeCount = useMemo(
    () => products.filter((p) => p.status === 'Active').length,
    [products]
  );

  const bomConfiguredCount = useMemo(() => {
    const productIdsWithBom = new Set(boms.map((b) => b.productId));
    return products.filter((p) => productIdsWithBom.has(p.id)).length;
  }, [products, boms]);

  const avgCycleTime = useMemo(() => {
    if (products.length === 0) return 0;
    const total = products.reduce((acc, p) => acc + (Number(p.standardCycleMinutes) || 0), 0);
    return Math.round(total / products.length);
  }, [products]);

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category))),
    [products]
  );

  const table = useTableState(products, {
    initialPageSize: 8,
    initialSortKey: 'code',
    searchFields: ['code', 'name', 'category', 'description'],
  });

  const hasActiveFilters = Boolean(table.search || table.filters.category || table.filters.status);

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
      width: '130px',
      cellClassName: 'whitespace-nowrap',
      render: (r) => (
        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap inline-block">
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
          <div className="font-medium text-[#051747] dark:text-slate-100">{r.name}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                CATEGORY_STYLES[r.category] || 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              {r.category}
            </span>
            <span className="text-[11px] text-[#535F80] dark:text-slate-400">
              UOM: {r.uom}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'unitPrice',
      label: 'Standard Rate',
      sortable: true,
      numeric: true,
      render: (r) => (
        <span className="font-semibold text-xs text-[#051747] dark:text-slate-200 tabular-nums">
          {formatCurrency(r.unitPrice)}
        </span>
      ),
    },
    {
      key: 'standardCycleMinutes',
      label: 'Cycle Time',
      sortable: true,
      numeric: true,
      render: (r) => (
        <div className="text-xs text-slate-600 dark:text-slate-300 tabular-nums flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-[#535F80]" />
          <span>{r.standardCycleMinutes} min</span>
        </div>
      ),
    },
    {
      key: 'bom',
      label: 'BOM Status',
      render: (r) => {
        const bom = boms.find((b) => b.productId === r.id);
        return bom ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60">
            <Layers className="w-3 h-3 text-emerald-600" />
            <span>{bom.version}</span>
            <span className="text-emerald-600/70">({bom.items.length})</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60">
            No BOM
          </span>
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
      align: 'left',
      render: (r) => (
        <div className="inline-flex items-center justify-start gap-1" onClick={(e) => e.stopPropagation()}>
          <Tooltip content="View Product Details">
            <button
              type="button"
              onClick={() => navigate(`/products/${r.id}`)}
              className="p-1.5 rounded hover:bg-[#E7E9F0]/70 dark:hover:bg-slate-800 text-[#535F80] hover:text-[#081F62] cursor-pointer"
              aria-label="View Product Details"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <Tooltip content="Edit Product">
            <button
              type="button"
              onClick={(e) => openEdit(r, e)}
              className="p-1.5 rounded hover:bg-[#E7E9F0]/70 dark:hover:bg-slate-800 text-[#535F80] hover:text-[#081F62] cursor-pointer"
              aria-label="Edit Product"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <Tooltip content={r.status === 'Active' ? 'Deactivate Product' : 'Activate Product'}>
            <button
              type="button"
              onClick={() => setConfirmTarget(r)}
              className={`p-1.5 rounded hover:bg-[#E7E9F0]/70 dark:hover:bg-slate-800 cursor-pointer ${
                r.status === 'Active' ? 'text-emerald-600 hover:text-amber-600' : 'text-[#535F80] hover:text-emerald-600'
              }`}
              aria-label={r.status === 'Active' ? 'Deactivate Product' : 'Activate Product'}
            >
              <Power className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <Tooltip content="Delete Product">
            <button
              type="button"
              onClick={() => setDeleteTarget(r)}
              className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 cursor-pointer"
              aria-label="Delete Product"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Products Catalog"
        description="Finished goods catalog, standard cycle specifications, units of measurement, and BOM links."
        actions={
          <PrimaryButton icon={Plus} onClick={openAdd}>
            Add Product
          </PrimaryButton>
        }
      />

      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Catalog"
          value={products.length}
          sublabel="Finished goods items"
          icon={Package}
          tone="navy"
        />
        <StatCard
          label="Active Production"
          value={activeCount}
          sublabel={`${products.length > 0 ? Math.round((activeCount / products.length) * 100) : 0}% active catalog`}
          icon={ShieldCheck}
          tone="emerald"
        />
        <StatCard
          label="BOM Configured"
          value={`${bomConfiguredCount}/${products.length}`}
          sublabel="Engineering structures"
          icon={Layers}
          tone="amber"
        />
        <StatCard
          label="Avg Cycle Time"
          value={`${avgCycleTime}m`}
          sublabel="Standard run time / unit"
          icon={Clock}
          tone="slate"
        />
      </div>

      {/* Control & Filter Toolbar */}
      <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <SearchInput
            value={table.search}
            onChange={table.setSearch}
            placeholder="Search product code, name, category, description..."
            className="w-full sm:w-96 md:w-[420px] lg:w-[480px]"
          />
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
          {hasActiveFilters && (
            <button
              type="button"
              onClick={table.resetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 bg-[#E7E9F0]/60 dark:bg-slate-800 rounded-md cursor-pointer transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-[#535F80] dark:text-slate-400 hidden sm:inline">
            Showing <strong className="text-[#051747] dark:text-slate-200">{table.totalItems}</strong> product{table.totalItems === 1 ? '' : 's'}
          </span>
          <div className="inline-flex items-center rounded-lg border border-[#535F80]/25 dark:border-slate-800 p-0.5 bg-[#FEFEFE] dark:bg-slate-900">
            <Tooltip content="Card View">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-[#051747] text-[#FEFEFE] shadow-2xs'
                    : 'text-[#535F80] hover:text-[#051747] dark:hover:text-slate-200'
                }`}
                aria-label="Card View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </Tooltip>
            <Tooltip content="Table View">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                  viewMode === 'table'
                    ? 'bg-[#051747] text-[#FEFEFE] shadow-2xs'
                    : 'text-[#535F80] hover:text-[#051747] dark:hover:text-slate-200'
                }`}
                aria-label="Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Main Content: Card Grid View or Table View */}
      {viewMode === 'grid' ? (
        table.paginatedData.length === 0 ? (
          <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-xl p-8">
            <EmptyState
              icon={Package}
              title="No products match your criteria"
              description="Try adjusting your search terms or clearing your filters to see catalog products."
              action={
                hasActiveFilters ? (
                  <SecondaryButton onClick={table.resetFilters}>
                    Clear Filters
                  </SecondaryButton>
                ) : (
                  <PrimaryButton icon={Plus} onClick={openAdd}>
                    Add Product
                  </PrimaryButton>
                )
              }
            />
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {table.paginatedData.map((p) => {
                const bom = boms.find((b) => b.productId === p.id);
                return (
                  <div
                    key={p.id}
                    className="group relative bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 hover:border-[#081F62]/60 dark:hover:border-blue-500/60 rounded-xl p-5 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Row: Category Avatar, Name, Code, Status */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-[#051747] dark:bg-slate-800 text-[#FEFEFE] dark:text-slate-100 font-bold text-xs flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                            {getInitials(p.name)}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-sm text-[#051747] dark:text-slate-100 group-hover:text-[#081F62] dark:group-hover:text-blue-400 transition-colors truncate" title={p.name}>
                              {p.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-[11px] font-semibold text-[#535F80] dark:text-slate-400 bg-[#E7E9F0]/60 dark:bg-slate-800/80 px-2 py-0.5 rounded whitespace-nowrap inline-block">
                                {p.code}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                          <StatusBadge status={p.status} />
                        </div>
                      </div>

                      {/* Category & UOM Badges */}
                      <div className="mt-3.5 flex items-center justify-between gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${CATEGORY_STYLES[p.category] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                          {p.category}
                        </span>
                        <span className="text-[11px] font-medium text-[#535F80] dark:text-slate-400 font-mono bg-[#E7E9F0]/60 dark:bg-slate-800 px-2 py-0.5 rounded">
                          UOM: {p.uom}
                        </span>
                      </div>

                      {/* Technical Description */}
                      <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed" title={p.description}>
                        {p.description || 'Precision engineering component catalog specification.'}
                      </p>

                      {/* Micro-Stats: Rate, Cycle Time, BOM */}
                      <div className="mt-4 bg-[#E7E9F0]/40 dark:bg-slate-800/60 border border-[#535F80]/10 dark:border-slate-800 rounded-lg p-2.5 grid grid-cols-3 gap-2 text-center">
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase font-semibold text-[#535F80] dark:text-slate-400 truncate">Rate</p>
                          <p className="text-xs font-bold text-[#051747] dark:text-slate-100 tabular-nums mt-0.5 truncate" title={formatCurrency(p.unitPrice)}>
                            {formatCurrency(p.unitPrice)}
                          </p>
                        </div>
                        <div className="min-w-0 border-x border-[#535F80]/15 dark:border-slate-700/60 px-1">
                          <p className="text-[10px] uppercase font-semibold text-[#535F80] dark:text-slate-400 truncate flex items-center justify-center gap-1">
                            <Clock className="w-3 h-3 text-[#535F80]" /> Cycle
                          </p>
                          <p className="text-xs font-bold text-[#051747] dark:text-slate-100 tabular-nums mt-0.5">
                            {p.standardCycleMinutes} min
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase font-semibold text-[#535F80] dark:text-slate-400 truncate flex items-center justify-center gap-1">
                            <Layers className="w-3 h-3 text-[#535F80]" /> BOM
                          </p>
                          <p className="text-xs font-bold text-[#051747] dark:text-slate-100 tabular-nums mt-0.5 truncate" title={bom ? `${bom.version} (${bom.items.length} items)` : 'No BOM'}>
                            {bom ? `${bom.version}` : 'None'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div
                      className="mt-4 pt-3 border-t border-[#E7E9F0] dark:border-slate-800 flex items-center justify-between gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => navigate(`/products/${p.id}`)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#081F62] hover:text-[#051747] dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer"
                      >
                        <span>Product 360°</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </button>

                      <div className="inline-flex items-center gap-1">
                        <Tooltip content="Edit Product">
                          <button
                            type="button"
                            onClick={(e) => openEdit(p, e)}
                            className="p-1.5 rounded hover:bg-[#E7E9F0]/80 dark:hover:bg-slate-800 text-[#535F80] hover:text-[#081F62] cursor-pointer"
                            aria-label="Edit Product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </Tooltip>
                        <Tooltip content={p.status === 'Active' ? 'Deactivate Product' : 'Activate Product'}>
                          <button
                            type="button"
                            onClick={() => setConfirmTarget(p)}
                            className={`p-1.5 rounded hover:bg-[#E7E9F0]/80 dark:hover:bg-slate-800 cursor-pointer ${
                              p.status === 'Active' ? 'text-emerald-600 hover:text-amber-600' : 'text-[#535F80] hover:text-emerald-600'
                            }`}
                            aria-label={p.status === 'Active' ? 'Deactivate Product' : 'Activate Product'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        </Tooltip>
                        <Tooltip content="Delete Product">
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(p)}
                            className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 cursor-pointer"
                            aria-label="Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls for Card View */}
            <div className="mt-5 bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg overflow-hidden shadow-2xs">
              <Pagination
                page={table.page}
                totalPages={table.totalPages}
                totalItems={table.totalItems}
                pageSize={table.pageSize}
                onPageChange={table.setPage}
                onPageSizeChange={table.setPageSize}
              />
            </div>
          </div>
        )
      ) : (
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
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? `Edit Product — ${form.code}` : 'Add New Product'}
        subtitle="Configure finished product master record and manufacturing specifications."
        footer={
          <>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-md border border-[#535F80]/30 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <PrimaryButton onClick={handleSave}>
              {form.id ? 'Save Changes' : 'Create Product'}
            </PrimaryButton>
          </>
        }
      >
        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput
            label="Product Code"
            name="code"
            required
            placeholder="e.g. PRD-HYD-101"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            error={errors.code}
          />
          <FormInput
            label="Product Name"
            name="name"
            required
            placeholder="e.g. Hydraulic Pump Housing"
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
            placeholder="Material grades, dimensional tolerances, finishes..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </form>
      </Modal>

      {/* Status Toggle Confirmation */}
      <ConfirmationDialog
        isOpen={Boolean(confirmTarget)}
        onClose={() => setConfirmTarget(null)}
        onConfirm={() => {
          if (confirmTarget) {
            toggleProductStatus(confirmTarget.id);
            setConfirmTarget(null);
          }
        }}
        title={
          confirmTarget?.status === 'Active'
            ? 'Deactivate Product Catalog Item'
            : 'Activate Product Catalog Item'
        }
        message={`Are you sure you want to ${
          confirmTarget?.status === 'Active' ? 'deactivate' : 'activate'
        } "${confirmTarget?.name}" (${confirmTarget?.code})?`}
        confirmLabel={confirmTarget?.status === 'Active' ? 'Deactivate' : 'Activate'}
        variant={confirmTarget?.status === 'Active' ? 'danger' : 'primary'}
      />

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteProduct(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        title="Delete Product Item"
        message={`Are you sure you want to permanently delete product "${deleteTarget?.name}" (${deleteTarget?.code})? This will remove the catalog item from local demo storage.`}
        confirmLabel="Delete Product"
        variant="danger"
      />
    </div>
  );
}
