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
  Power,
  ShieldAlert,
  Ruler,
  DollarSign,
  Truck,
  Building2,
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
import { useErpData } from '../../context/ErpDataContext';
import { useApp } from '../../context/AppContext';
import { getMaterialComputedFields } from '../../services/erpService';
import { useTableState } from '../../hooks/useTableState';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import {
  CATEGORY_STYLES,
  TYPE_STYLES,
  getMaterialInitials,
  formatDimensions,
} from './materialUtils';

export function MaterialsPage() {
  const navigate = useNavigate();
  const { addToast } = useApp();
  const {
    materials = [],
    suppliers = [],
    purchaseOrders = [],
    materialTransactions = [],
    boms = [],
    saveMaterial,
    deleteMaterial,
  } = useErpData();

  const [viewTarget, setViewTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'

  // Map supplier ID to supplier object for rapid display
  const supplierMap = useMemo(() => {
    const map = {};
    suppliers.forEach((s) => {
      map[s.id] = s;
    });
    return map;
  }, [suppliers]);

  const computedMaterials = useMemo(
    () => materials.map(getMaterialComputedFields),
    [materials]
  );

  // Top KPI Metrics
  const healthyCount = useMemo(
    () => computedMaterials.filter((m) => !m.isLowStock && m.status !== 'Inactive').length,
    [computedMaterials]
  );

  const lowStockCount = useMemo(
    () => computedMaterials.filter((m) => m.isLowStock && m.status !== 'Inactive').length,
    [computedMaterials]
  );

  const totalValuation = useMemo(() => {
    return computedMaterials.reduce((acc, m) => {
      const usable = Number(m.availableQty || 0);
      const cost = Number(m.unitCost || 0);
      return acc + usable * cost;
    }, 0);
  }, [computedMaterials]);

  // Unique Filter Lists
  const categories = useMemo(
    () => Array.from(new Set(materials.map((m) => m.category).filter(Boolean))),
    [materials]
  );

  const uniqueGrades = useMemo(
    () => Array.from(new Set(materials.map((m) => m.grade).filter(Boolean))),
    [materials]
  );

  const table = useTableState(computedMaterials, {
    initialPageSize: 8,
    initialSortKey: 'code',
    searchFields: ['code', 'name', 'category', 'grade', 'spec', 'location'],
  });

  // Filter application
  const filteredMaterials = useMemo(() => {
    return computedMaterials.filter((m) => {
      // Grade filter
      if (table.filters.grade && m.grade !== table.filters.grade) {
        return false;
      }
      // Status filter (Active / Inactive)
      if (table.filters.status && (m.status || 'Active') !== table.filters.status) {
        return false;
      }
      // Category filter
      if (table.filters.category && m.category !== table.filters.category) {
        return false;
      }
      // Stock health filter
      if (table.filters.stockStatus && m.stockStatus !== table.filters.stockStatus) {
        return false;
      }
      return true;
    });
  }, [computedMaterials, table.filters]);

  const hasActiveFilters = Boolean(
    table.search ||
      table.filters.category ||
      table.filters.grade ||
      table.filters.status ||
      table.filters.stockStatus
  );

  // Navigation handlers for Add and Edit
  const openAdd = () => {
    navigate('/materials/new');
  };

  const openEdit = (mat, e) => {
    e?.stopPropagation();
    navigate(`/materials/${mat.id}/edit`);
  };

  // Toggle Active / Inactive Status
  const handleToggleStatus = (mat, e) => {
    e?.stopPropagation();
    const nextStatus = mat.status === 'Inactive' ? 'Active' : 'Inactive';
    saveMaterial({
      ...mat,
      status: nextStatus,
    });
    addToast({
      title: `Material ${nextStatus}`,
      message: `"${mat.name}" (${mat.code}) is now ${nextStatus}.`,
      type: nextStatus === 'Active' ? 'success' : 'info',
    });
  };

  // Check if deleteTarget is referenced by active records
  const deleteTargetReferences = useMemo(() => {
    if (!deleteTarget) return [];
    const reasons = [];

    const poMatches = purchaseOrders.filter(
      (po) =>
        po.materialId === deleteTarget.id ||
        po.items?.some((i) => i.materialId === deleteTarget.id)
    );
    if (poMatches.length > 0) {
      reasons.push(`${poMatches.length} purchase order(s)`);
    }

    const txnMatches = materialTransactions.filter(
      (t) => t.materialId === deleteTarget.id
    );
    if (txnMatches.length > 0) {
      reasons.push(`${txnMatches.length} inventory transaction(s)`);
    }

    const bomMatches = boms.filter((b) =>
      b.items?.some((item) => item.materialId === deleteTarget.id)
    );
    if (bomMatches.length > 0) {
      reasons.push(`${bomMatches.length} Bill of Materials (BOM)`);
    }

    const hasStock =
      (deleteTarget.approvedPhysicalQty || 0) > 0 ||
      (deleteTarget.reservedQty || 0) > 0;
    if (hasStock) {
      reasons.push('physical or reserved warehouse stock');
    }

    return reasons;
  }, [deleteTarget, purchaseOrders, materialTransactions, boms]);

  // Table Columns
  const columns = [
    {
      key: 'code',
      label: 'Material Code',
      sortable: true,
      width: '130px',
      cellClassName: 'whitespace-nowrap',
      render: (r) => (
        <span className="font-mono text-xs font-semibold text-[#081F62] dark:text-blue-400 whitespace-nowrap inline-block">
          {r.code}
        </span>
      ),
    },
    {
      key: 'name',
      label: 'Material Name & Description',
      sortable: true,
      render: (r) => (
        <div>
          <div className="font-medium text-[#051747] dark:text-slate-100 flex items-center gap-1.5">
            <span>{r.name}</span>
            {r.status === 'Inactive' && (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                Inactive
              </span>
            )}
          </div>
          <div className="text-[11px] text-[#535F80] dark:text-slate-400 line-clamp-1 mt-0.5">
            {r.description || r.spec}
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Category & Type',
      sortable: true,
      render: (r) => (
        <div className="flex flex-col items-start gap-1">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${
              CATEGORY_STYLES[r.category] || 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            {r.category}
          </span>
          {r.materialType && (
            <span
              className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                TYPE_STYLES[r.materialType] || TYPE_STYLES['Raw Material']
              }`}
            >
              {r.materialType}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'grade',
      label: 'Material Grade',
      sortable: true,
      render: (r) => (
        <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
          {r.grade || '—'}
        </span>
      ),
    },
    {
      key: 'supplier',
      label: 'Preferred Vendor',
      render: (r) => {
        const sup = supplierMap[r.preferredSupplierId];
        return sup ? (
          <div className="text-xs">
            <span className="font-medium text-[#051747] dark:text-slate-200 block truncate max-w-[150px]">
              {sup.name}
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {sup.code} {r.leadTimeDays ? `· ${r.leadTimeDays}d lead` : ''}
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-400 font-mono">Unassigned</span>
        );
      },
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
      label: 'Stock Health',
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

          <Tooltip content={r.status === 'Inactive' ? 'Activate Material' : 'Deactivate Material'}>
            <button
              type="button"
              onClick={(e) => handleToggleStatus(r, e)}
              className={`p-1.5 rounded cursor-pointer transition-colors ${
                r.status === 'Inactive'
                  ? 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                  : 'text-emerald-600 hover:text-slate-500 hover:bg-slate-100'
              }`}
              aria-label="Toggle Status"
            >
              <Power className="w-3.5 h-3.5" />
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
        description="Material grade specifications, standard rates, storage locations, preferred vendors, and safety reorder triggers."
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
          sublabel="Master catalog items"
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
            placeholder="Search code, name, category, grade, bin, vendor..."
            className="w-full sm:w-80 md:w-96 lg:w-[420px]"
          />
          <FilterDropdown
            label="Category"
            value={table.filters.category}
            onChange={(val) => table.setFilter('category', val)}
            options={categories}
          />
          <FilterDropdown
            label="Grade"
            value={table.filters.grade}
            onChange={(val) => table.setFilter('grade', val)}
            options={uniqueGrades}
          />
          <FilterDropdown
            label="Catalog Status"
            value={table.filters.status}
            onChange={(val) => table.setFilter('status', val)}
            options={['Active', 'Inactive']}
          />
          <FilterDropdown
            label="Stock Health"
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
            Showing <strong className="text-[#051747] dark:text-slate-200">{filteredMaterials.length}</strong> raw material{filteredMaterials.length === 1 ? '' : 's'}
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
        filteredMaterials.length === 0 ? (
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
              {filteredMaterials.map((mat) => {
                const isLow = mat.isLowStock;
                const ratio =
                  mat.reorderLevel > 0
                    ? Math.min(100, Math.round((mat.availableQty / (mat.reorderLevel * 2)) * 100))
                    : 100;
                const sup = supplierMap[mat.preferredSupplierId];

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
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">
                                {mat.code}
                              </span>
                              {mat.grade && (
                                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                  {mat.grade}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <StatusBadge status={mat.stockStatus} />
                      </div>

                      {/* Category, Form, & Location Badges */}
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                            CATEGORY_STYLES[mat.category] ||
                            'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {mat.category}
                        </span>
                        {mat.materialForm && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {mat.materialForm}
                          </span>
                        )}
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

                      {/* Preferred Supplier Box if available */}
                      {sup && (
                        <div className="text-xs p-2 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/40 mb-3 flex items-center justify-between">
                          <span className="text-[11px] text-slate-500">Preferred Vendor:</span>
                          <span className="font-medium text-[#081F62] dark:text-blue-300 truncate max-w-[170px]">
                            {sup.name}
                          </span>
                        </div>
                      )}

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

                        <Tooltip content={mat.status === 'Inactive' ? 'Activate Material' : 'Deactivate Material'}>
                          <button
                            type="button"
                            onClick={(e) => handleToggleStatus(mat, e)}
                            className={`p-1.5 rounded cursor-pointer transition-colors ${
                              mat.status === 'Inactive'
                                ? 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                                : 'text-emerald-600 hover:text-slate-500 hover:bg-slate-100'
                            }`}
                            aria-label="Toggle Status"
                          >
                            <Power className="w-3.5 h-3.5" />
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
          </div>
        )
      ) : (
        <DataTable
          columns={columns}
          data={filteredMaterials}
          sortKey={table.sortKey}
          sortDir={table.sortDir}
          onSort={table.handleSort}
          pagination={{
            page: table.page,
            totalPages: Math.ceil(filteredMaterials.length / table.pageSize) || 1,
            totalItems: filteredMaterials.length,
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
                  <div className="flex flex-wrap items-center gap-2 mt-1">
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
                    {viewTarget.grade && (
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-100/70 text-[#081F62] dark:bg-blue-950 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800">
                        {viewTarget.grade}
                      </span>
                    )}
                    <StatusBadge status={viewTarget.status || 'Active'} size="xs" />
                  </div>
                </div>
              </div>
              <StatusBadge status={viewTarget.stockStatus} />
            </div>

            {/* Procurement & Commercial Details */}
            <div className="p-3.5 rounded-lg border border-[#535F80]/20 dark:border-slate-800 bg-[#FEFEFE] dark:bg-slate-900 space-y-2.5">
              <span className="text-xs font-bold text-[#081F62] dark:text-blue-400 block uppercase tracking-wider">
                Procurement &amp; Commercial Terms
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Standard Unit Cost</span>
                  <strong className="text-sm font-semibold text-[#051747] dark:text-slate-100">
                    {formatCurrency(viewTarget.unitCost)} / {viewTarget.uom}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Preferred Supplier</span>
                  <strong className="font-medium text-slate-800 dark:text-slate-200 block truncate">
                    {supplierMap[viewTarget.preferredSupplierId]?.name || 'Unassigned'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Lead Time</span>
                  <strong className="font-medium text-slate-800 dark:text-slate-200">
                    {viewTarget.leadTimeDays ? `${viewTarget.leadTimeDays} Days` : '7 Days'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Brand / Manufacturer</span>
                  <strong className="font-medium text-slate-800 dark:text-slate-200">
                    {viewTarget.brand || 'OEM Standard'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Inventory Thresholds */}
            <div className="p-3.5 rounded-lg border border-[#535F80]/20 dark:border-slate-800 bg-[#FEFEFE] dark:bg-slate-900 space-y-2.5">
              <span className="text-xs font-bold text-[#081F62] dark:text-blue-400 block uppercase tracking-wider">
                Inventory Configuration &amp; Thresholds
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Reorder Trigger</span>
                  <span className="font-bold text-[#081F62] dark:text-blue-400">
                    {formatNumber(viewTarget.reorderLevel)} {viewTarget.uom}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Min Stock Level</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatNumber(viewTarget.minStock || 0)} {viewTarget.uom}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Max Stock Level</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatNumber(viewTarget.maxStock || 0)} {viewTarget.uom}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Safety Buffer</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatNumber(viewTarget.safetyStock || 0)} {viewTarget.uom}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Location / Bin</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#081F62]" />
                    {viewTarget.location || 'Unassigned'}
                  </span>
                </div>
              </div>
            </div>

            {/* Technical Specifications & Dimensions */}
            <div className="p-3.5 rounded-lg border border-[#535F80]/20 dark:border-slate-800 bg-[#FEFEFE] dark:bg-slate-900 space-y-2.5">
              <span className="text-xs font-bold text-[#081F62] dark:text-blue-400 block uppercase tracking-wider">
                Technical Specifications &amp; Quality Parameters
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Standard</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {viewTarget.standard || 'ASTM / ASME'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Material Form</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {viewTarget.materialForm || 'Bar'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Tolerance</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {viewTarget.tolerance || 'Standard'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Density</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {viewTarget.density || '7.85 g/cm³'}
                  </span>
                </div>
              </div>

              {/* Form Dimensions Formatted */}
              {viewTarget.dimensions && (
                <div className="p-2 rounded bg-slate-50 dark:bg-slate-800 text-xs">
                  <span className="text-slate-500 block text-[11px]">Calculated Geometry:</span>
                  <span className="font-mono font-semibold text-[#051747] dark:text-slate-200">
                    {formatDimensions(viewTarget.dimensions, viewTarget.materialForm) || viewTarget.dimensions.notes || 'Custom dimensions'}
                  </span>
                </div>
              )}

              {/* Quality Tracking Flags */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 mr-1">Compliance:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                  viewTarget.requireQc ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  QC Quarantine: {viewTarget.requireQc ? 'Required' : 'Bypass'}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                  viewTarget.batchTracking ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  Batch Tracking: {viewTarget.batchTracking ? 'Enforced' : 'Off'}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                  viewTarget.heatNumberTracking ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  Heat Traceability: {viewTarget.heatNumberTracking ? 'Mandatory' : 'Optional'}
                </span>
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
              <strong className="text-sm font-bold font-mono">
                {formatCurrency((viewTarget.availableQty || 0) * (viewTarget.unitCost || 0))}
              </strong>
            </div>
          </div>
        </Modal>
      )}

      {/* Protective Dialog: Delete Raw Material */}
      {deleteTarget && (
        deleteTargetReferences.length > 0 ? (
          <Modal
            isOpen={Boolean(deleteTarget)}
            onClose={() => setDeleteTarget(null)}
            title="Cannot Delete Raw Material"
            size="sm"
            footer={
              <div className="flex items-center justify-end gap-2 w-full">
                <SecondaryButton onClick={() => setDeleteTarget(null)}>
                  Keep Active
                </SecondaryButton>
                <PrimaryButton
                  variant="primary"
                  onClick={() => {
                    handleToggleStatus(deleteTarget);
                    setDeleteTarget(null);
                  }}
                >
                  Deactivate Material Instead
                </PrimaryButton>
              </div>
            }
          >
            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">Active Manufacturing Records Exist</strong>
                  <span>
                    Material <strong>"{deleteTarget.name}" ({deleteTarget.code})</strong> is referenced by{' '}
                    <strong>{deleteTargetReferences.join(' and ')}</strong>.
                  </span>
                </div>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Permanent deletion is blocked to prevent breaking purchase order history, inventory batch records, or bill of materials formulations. You can deactivate this material to prevent future purchasing.
              </p>
            </div>
          </Modal>
        ) : (
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
            message={`Are you sure you want to permanently delete material "${deleteTarget?.code}" (${deleteTarget?.name})? This will remove the material from your master catalog.`}
            confirmLabel="Delete Material"
            cancelLabel="Keep Material"
            variant="danger"
          />
        )
      )}
    </div>
  );
}
