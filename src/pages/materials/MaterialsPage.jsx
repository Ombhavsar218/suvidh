import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Eye,
  Edit2,
  Trash2,
  LayoutGrid,
  List,
  Boxes,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  MapPin,
  Warehouse,
  X,
  ExternalLink,
  Layers,
  ArrowRight,
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
import { FormInput, FormSelect } from '../../components/forms/FormFields';
import { useErpData } from '../../context/ErpDataContext';
import { getMaterialComputedFields } from '../../services/erpService';
import { useTableState } from '../../hooks/useTableState';
import { validateRequired } from '../../utils/validators';
import { formatCurrency, formatNumber } from '../../utils/formatters';

const CATEGORY_STYLES = {
  'Alloy Steel': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50',
  'Stainless Steel': 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-900/50',
  'Castings': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50',
  'Non-Ferrous': 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/50',
  'Seals & Fasteners': 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50',
  'Consumables': 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/50',
};

function getMaterialInitials(code, name) {
  if (code && code.startsWith('RM-')) {
    const parts = code.split('-');
    if (parts.length >= 2) return parts[1].slice(0, 3).toUpperCase();
  }
  if (!name) return 'RM';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

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
  const { materials = [], saveMaterial, deleteMaterial } = useErpData();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [viewTarget, setViewTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'

  const computedMaterials = useMemo(
    () => materials.map(getMaterialComputedFields),
    [materials]
  );

  // Top KPI Metrics
  const healthyCount = useMemo(
    () => computedMaterials.filter((m) => !m.isLowStock).length,
    [computedMaterials]
  );

  const lowStockCount = useMemo(
    () => computedMaterials.filter((m) => m.isLowStock).length,
    [computedMaterials]
  );

  const totalValuation = useMemo(() => {
    return computedMaterials.reduce((acc, m) => {
      const usable = Number(m.availableQty || 0);
      const cost = Number(m.unitCost || 0);
      return acc + usable * cost;
    }, 0);
  }, [computedMaterials]);

  const categories = useMemo(
    () => Array.from(new Set(materials.map((m) => m.category).filter(Boolean))),
    [materials]
  );

  const table = useTableState(computedMaterials, {
    initialPageSize: 8,
    initialSortKey: 'code',
    searchFields: ['code', 'name', 'category', 'spec', 'location'],
  });

  const hasActiveFilters = Boolean(
    table.search || table.filters.category || table.filters.stockStatus
  );

  const openAdd = () => {
    setForm({
      ...EMPTY_FORM,
      code: `RM-NEW-${String(materials.length + 10)}`,
    });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (mat, e) => {
    e?.stopPropagation();
    setForm(mat);
    setErrors({});
    setModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const nextErrors = {
      code: validateRequired(form.code, 'Material code'),
      name: validateRequired(form.name, 'Material name'),
      uom: validateRequired(form.uom, 'Unit of measurement'),
    };
    const filtered = Object.fromEntries(
      Object.entries(nextErrors).filter(([, v]) => Boolean(v))
    );
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
      label: 'Material Name & Spec',
      sortable: true,
      render: (r) => (
        <div>
          <div className="font-medium text-[#051747] dark:text-slate-100">{r.name}</div>
          <div className="text-[11px] text-[#535F80] dark:text-slate-400 line-clamp-1">
            {r.spec}
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      sortable: true,
      render: (r) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${
            CATEGORY_STYLES[r.category] || 'bg-slate-100 text-slate-700 border-slate-200'
          }`}
        >
          {r.category}
        </span>
      ),
    },
    {
      key: 'location',
      label: 'Bin / Rack',
      sortable: true,
      render: (r) => (
        <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-mono">
          <MapPin className="w-3.5 h-3.5 text-[#535F80]" />
          <span>{r.location || 'Unassigned'}</span>
        </div>
      ),
    },
    {
      key: 'unitCost',
      label: 'Std Rate',
      sortable: true,
      align: 'right',
      numeric: true,
      render: (r) => (
        <span className="font-semibold text-xs text-[#051747] dark:text-slate-200 tabular-nums">
          {formatCurrency(r.unitCost)} / {r.uom}
        </span>
      ),
    },
    {
      key: 'reorderLevel',
      label: 'Reorder Level',
      sortable: true,
      align: 'right',
      numeric: true,
      render: (r) => (
        <span className="text-xs text-slate-600 dark:text-slate-300 tabular-nums">
          {formatNumber(r.reorderLevel)} {r.uom}
        </span>
      ),
    },
    {
      key: 'availableQty',
      label: 'Available Usable',
      sortable: true,
      align: 'right',
      numeric: true,
      render: (r) => (
        <span
          className={`text-xs font-bold tabular-nums ${
            r.isLowStock ? 'text-red-600' : 'text-emerald-600'
          }`}
        >
          {formatNumber(r.availableQty)} {r.uom}
        </span>
      ),
    },
    {
      key: 'stockStatus',
      label: 'Status',
      sortable: true,
      render: (r) => <StatusBadge status={r.stockStatus} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'left',
      render: (r) => (
        <div
          className="inline-flex items-center justify-start gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Tooltip content="Quick View Material">
            <button
              type="button"
              onClick={() => setViewTarget(r)}
              className="p-1.5 rounded hover:bg-[#E7E9F0]/70 dark:hover:bg-slate-800 text-[#535F80] hover:text-[#081F62] cursor-pointer"
              aria-label="View Material Details"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <Tooltip content="Edit Material">
            <button
              type="button"
              onClick={(e) => openEdit(r, e)}
              className="p-1.5 rounded hover:bg-[#E7E9F0]/70 dark:hover:bg-slate-800 text-[#535F80] hover:text-[#081F62] cursor-pointer"
              aria-label="Edit Material"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <Tooltip content="Delete Material">
            <button
              type="button"
              onClick={() => setDeleteTarget(r)}
              className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 cursor-pointer"
              aria-label="Delete Material"
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
        title="Raw Materials Master"
        description="Material grade specifications, standard rates, storage locations, and safety reorder triggers."
        actions={
          <div className="flex items-center gap-2">
            <SecondaryButton icon={Warehouse} onClick={() => navigate('/inventory')}>
              Warehouse Stock
            </SecondaryButton>
            <PrimaryButton icon={Plus} onClick={openAdd}>
              Add Raw Material
            </PrimaryButton>
          </div>
        }
      />

      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Materials"
          value={materials.length}
          sublabel="Master inventory codes"
          icon={Boxes}
          tone="navy"
        />
        <StatCard
          label="Healthy Stock"
          value={healthyCount}
          sublabel={`${
            materials.length > 0 ? Math.round((healthyCount / materials.length) * 100) : 0
          }% above reorder level`}
          icon={ShieldCheck}
          tone="emerald"
        />
        <StatCard
          label="Low Stock Alerts"
          value={lowStockCount}
          sublabel="Below safety trigger"
          icon={AlertTriangle}
          tone="rose"
        />
        <StatCard
          label="Inventory Value"
          value={formatCurrency(totalValuation)}
          sublabel="Usable approved valuation"
          icon={TrendingUp}
          tone="slate"
        />
      </div>

      {/* Control & Filter Toolbar */}
      <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <SearchInput
            value={table.search}
            onChange={table.setSearch}
            placeholder="Search material code, name, category, spec, bin..."
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
            value={table.filters.stockStatus}
            onChange={(val) => table.setFilter('stockStatus', val)}
            options={['Available', 'Low Stock', 'Reserved']}
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
            Showing <strong className="text-[#051747] dark:text-slate-200">{table.totalItems}</strong> raw material{table.totalItems === 1 ? '' : 's'}
          </span>
          <div className="inline-flex items-center rounded-lg border border-[#535F80]/25 dark:border-slate-800 p-0.5 bg-[#FEFEFE] dark:bg-slate-900">
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
          </div>
        </div>
      </div>

      {/* Main Content: Card Grid View or Table View */}
      {viewMode === 'grid' ? (
        table.paginatedData.length === 0 ? (
          <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-xl p-8">
            <EmptyState
              icon={Boxes}
              title="No raw materials match your criteria"
              description="Try adjusting your search terms or clearing your filters to see catalog materials."
              action={
                hasActiveFilters ? (
                  <SecondaryButton onClick={table.resetFilters}>
                    Clear Filters
                  </SecondaryButton>
                ) : (
                  <PrimaryButton icon={Plus} onClick={openAdd}>
                    Add Raw Material
                  </PrimaryButton>
                )
              }
            />
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {table.paginatedData.map((mat) => {
                const isLow = mat.isLowStock;
                const ratio =
                  mat.reorderLevel > 0
                    ? Math.min(100, Math.round((mat.availableQty / (mat.reorderLevel * 2)) * 100))
                    : 100;

                return (
                  <div
                    key={mat.id}
                    className="group relative bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 hover:border-[#081F62]/60 dark:hover:border-blue-500/60 rounded-xl p-5 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#051747] dark:bg-blue-900/60 text-[#FEFEFE] flex items-center justify-center font-bold text-xs tracking-wider shrink-0 shadow-2xs">
                            {getMaterialInitials(mat.code, mat.name)}
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm text-[#051747] dark:text-slate-100 group-hover:text-[#081F62] transition-colors leading-tight line-clamp-1">
                              {mat.name}
                            </h3>
                            <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap inline-block mt-0.5">
                              {mat.code}
                            </span>
                          </div>
                        </div>
                        <StatusBadge status={mat.stockStatus} />
                      </div>

                      {/* Category & Location Badges */}
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                            CATEGORY_STYLES[mat.category] ||
                            'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {mat.category}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono text-[#535F80] dark:text-slate-400 bg-[#E7E9F0]/60 dark:bg-slate-800">
                          <MapPin className="w-3 h-3 text-[#535F80]" />
                          {mat.location || 'Rack -'}
                        </span>
                      </div>

                      {/* Technical Specification Box */}
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 leading-snug mb-3">
                        <span className="font-semibold text-[#051747] dark:text-slate-200 block text-[10px] uppercase tracking-wider mb-0.5">
                          Technical Specification
                        </span>
                        <p className="line-clamp-2 italic font-sans text-slate-700 dark:text-slate-300">
                          {mat.spec || 'Standard engineering raw material'}
                        </p>
                      </div>

                      {/* Stock Visual Indicator */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-[11px] font-medium text-[#535F80] dark:text-slate-400 mb-1">
                          <span>Stock Level</span>
                          <span className={isLow ? 'text-red-600 font-semibold' : 'text-emerald-600 font-semibold'}>
                            {isLow ? 'Safety Alert' : 'Normal'}
                          </span>
                        </div>
                        <div className="w-full bg-[#E7E9F0] dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isLow ? 'bg-red-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.max(8, ratio)}%` }}
                          />
                        </div>
                      </div>

                      {/* 3-Column Micro Stats */}
                      <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/15 dark:border-slate-800 mb-4 text-center">
                        <div>
                          <div className="text-[10px] text-[#535F80] dark:text-slate-400 font-medium">
                            Available
                          </div>
                          <div
                            className={`text-xs font-bold tabular-nums mt-0.5 ${
                              isLow ? 'text-red-600' : 'text-emerald-600'
                            }`}
                          >
                            {formatNumber(mat.availableQty)} {mat.uom}
                          </div>
                        </div>
                        <div className="border-x border-[#535F80]/15 dark:border-slate-800">
                          <div className="text-[10px] text-[#535F80] dark:text-slate-400 font-medium">
                            Threshold
                          </div>
                          <div className="text-xs font-semibold text-[#051747] dark:text-slate-200 tabular-nums mt-0.5">
                            {formatNumber(mat.reorderLevel)} {mat.uom}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-[#535F80] dark:text-slate-400 font-medium">
                            Std Rate
                          </div>
                          <div className="text-xs font-semibold text-[#051747] dark:text-slate-200 tabular-nums mt-0.5">
                            {formatCurrency(mat.unitCost)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="pt-3 border-t border-[#535F80]/15 dark:border-slate-800 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setViewTarget(mat)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#081F62] hover:text-[#051747] dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Quick View
                      </button>

                      <div className="flex items-center gap-1">
                        <Tooltip content="Edit Material">
                          <button
                            type="button"
                            onClick={(e) => openEdit(mat, e)}
                            className="p-1.5 rounded hover:bg-[#E7E9F0]/70 dark:hover:bg-slate-800 text-[#535F80] hover:text-[#081F62] cursor-pointer"
                            aria-label="Edit Material"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </Tooltip>
                        <Tooltip content="Delete Material">
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(mat)}
                            className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 cursor-pointer"
                            aria-label="Delete Material"
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

            <div className="mt-4">
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

      {/* Quick View Modal */}
      {viewTarget && (
        <Modal
          isOpen={Boolean(viewTarget)}
          onClose={() => setViewTarget(null)}
          title="Raw Material Master Details"
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <SecondaryButton onClick={() => setViewTarget(null)}>
                Close
              </SecondaryButton>
              <div className="flex items-center gap-2">
                <SecondaryButton
                  icon={Warehouse}
                  onClick={() => {
                    setViewTarget(null);
                    navigate('/inventory');
                  }}
                >
                  Open in Inventory
                </SecondaryButton>
                <PrimaryButton
                  icon={Edit2}
                  onClick={() => {
                    const target = viewTarget;
                    setViewTarget(null);
                    openEdit(target);
                  }}
                >
                  Edit Material
                </PrimaryButton>
              </div>
            </div>
          }
        >
          <div className="space-y-5">
            {/* Header info card */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#051747] dark:bg-blue-900/60 text-[#FEFEFE] flex items-center justify-center font-bold text-sm tracking-wider shadow-sm">
                  {getMaterialInitials(viewTarget.code, viewTarget.name)}
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#051747] dark:text-slate-100">
                    {viewTarget.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700 text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {viewTarget.code}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${
                        CATEGORY_STYLES[viewTarget.category] ||
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {viewTarget.category}
                    </span>
                  </div>
                </div>
              </div>
              <StatusBadge status={viewTarget.stockStatus} />
            </div>

            {/* Spec & Storage Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-lg border border-[#535F80]/20 dark:border-slate-800 bg-[#FEFEFE] dark:bg-slate-900">
                <span className="text-xs font-semibold text-[#535F80] dark:text-slate-400 block uppercase tracking-wider mb-1">
                  Technical Specification
                </span>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                  {viewTarget.spec || 'Standard specification not specified'}
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-[#535F80]/20 dark:border-slate-800 bg-[#FEFEFE] dark:bg-slate-900 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#535F80] dark:text-slate-400">Storage Location:</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#081F62]" />
                    {viewTarget.location || 'Unassigned'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#535F80] dark:text-slate-400">Unit Rate:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatCurrency(viewTarget.unitCost)} / {viewTarget.uom}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#535F80] dark:text-slate-400">Reorder Trigger:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatNumber(viewTarget.reorderLevel)} {viewTarget.uom}
                  </span>
                </div>
              </div>
            </div>

            {/* Physical Inventory Distribution */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#051747] dark:text-slate-200 mb-2.5">
                Current Warehouse Stock Breakdown
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] text-[#535F80] dark:text-slate-400 font-medium">
                    Approved Physical
                  </div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1 tabular-nums">
                    {formatNumber(viewTarget.approvedPhysicalQty || 0)} {viewTarget.uom}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] text-[#535F80] dark:text-slate-400 font-medium">
                    Reserved for Production
                  </div>
                  <div className="text-sm font-bold text-amber-600 mt-1 tabular-nums">
                    {formatNumber(viewTarget.reservedQty || 0)} {viewTarget.uom}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                    Net Usable Available
                  </div>
                  <div
                    className={`text-sm font-bold mt-1 tabular-nums ${
                      viewTarget.isLowStock ? 'text-red-600' : 'text-emerald-700'
                    }`}
                  >
                    {formatNumber(viewTarget.availableQty || 0)} {viewTarget.uom}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] text-[#535F80] dark:text-slate-400 font-medium">
                    Pending QC
                  </div>
                  <div className="text-sm font-bold text-blue-600 mt-1 tabular-nums">
                    {formatNumber(viewTarget.pendingInspectionQty || 0)} {viewTarget.uom}
                  </div>
                </div>
              </div>
            </div>

            {/* Valuation note */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#E7E9F0]/50 dark:bg-slate-800 text-xs text-[#051747] dark:text-slate-200">
              <span className="font-medium">Total Available Usable Valuation:</span>
              <strong className="text-sm font-bold">
                {formatCurrency((viewTarget.availableQty || 0) * (viewTarget.unitCost || 0))}
              </strong>
            </div>
          </div>
        </Modal>
      )}

      {/* Add / Edit Material Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? 'Edit Raw Material' : 'Add Raw Material'}
        size="lg"
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
            options={[
              'Alloy Steel',
              'Stainless Steel',
              'Castings',
              'Non-Ferrous',
              'Seals & Fasteners',
              'Consumables',
            ]}
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
            label="Storage Location / Bin"
            name="location"
            placeholder="e.g. Rack A-01, Yard B-04"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
          <FormInput
            label="Technical Specification"
            name="spec"
            placeholder="e.g. Dia 50mm, Bright Drawn, Tensile 850 MPa"
            value={form.spec}
            onChange={(e) => setForm({ ...form, spec: e.target.value })}
          />
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMaterial(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        title="Delete Raw Material"
        message={`Are you sure you want to delete material "${deleteTarget?.code}" (${deleteTarget?.name})? This will remove the material from your local master catalog.`}
        confirmLabel="Delete Material"
        cancelLabel="Keep Material"
        variant="danger"
      />
    </div>
  );
}
