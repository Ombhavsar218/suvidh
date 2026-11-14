import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  SlidersHorizontal,
  Lock,
  ShieldAlert,
  History,
  Boxes,
  CheckCircle2,
  XCircle,
  LayoutGrid,
  List,
  Eye,
  MapPin,
  X,
  TrendingUp,
  AlertTriangle,
  Layers,
  ExternalLink,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { PrimaryButton, SecondaryButton } from '../../components/common/Buttons';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { Tooltip } from '../../components/common/Tooltip';
import { Tabs } from '../../components/common/Tabs';
import { StatCard } from '../../components/dashboard/StatCard';
import { DataTable } from '../../components/tables/DataTable';
import { SearchInput, FilterDropdown } from '../../components/forms/Filters';
import { Pagination } from '../../components/common/Pagination';
import { EmptyState } from '../../components/common/States';
import { FormInput, FormSelect, FormTextarea } from '../../components/forms/FormFields';
import { useErpData } from '../../context/ErpDataContext';
import { getMaterialComputedFields } from '../../services/erpService';
import { useTableState } from '../../hooks/useTableState';
import { formatNumber, formatCurrency } from '../../utils/formatters';

const CATEGORY_STYLES = {
  'Alloy Steel':
    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50',
  'Stainless Steel':
    'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-900/50',
  Castings:
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50',
  'Non-Ferrous':
    'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/50',
  'Seals & Fasteners':
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50',
  Consumables:
    'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/50',
};

function getMaterialInitials(code, name) {
  if (code && code.startsWith('RM-')) {
    const parts = code.split('-');
    if (parts.length >= 2) return parts[1].slice(0, 3).toUpperCase();
  }
  if (!name) return 'RM';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function InventoryPage() {
  const navigate = useNavigate();
  const { materials = [], materialTransactions = [], recordMaterialTransaction } = useErpData();

  const [activeTab, setActiveTab] = useState('stock');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [viewTarget, setViewTarget] = useState(null);

  const [txnModal, setTxnModal] = useState({ open: false, type: 'Inward', materialId: '' });
  const [txnForm, setTxnForm] = useState({
    materialId: '',
    quantity: '',
    reference: '',
    remarks: '',
    requireQc: true,
  });

  const computedMaterials = useMemo(
    () => materials.map(getMaterialComputedFields),
    [materials]
  );

  const summary = useMemo(() => {
    return computedMaterials.reduce(
      (acc, m) => {
        acc.totalPhysical += m.totalPhysicalStock;
        acc.usableApproved += m.usableStock;
        acc.availableUnreserved += m.availableQty;
        acc.reserved += m.reservedQty;
        acc.pendingQc += m.pendingInspectionQty;
        acc.rejected += m.rejectedQty;
        acc.totalValuation += (m.availableQty || 0) * (m.unitCost || 0);
        if (m.isLowStock) acc.lowStockCount += 1;
        return acc;
      },
      {
        totalPhysical: 0,
        usableApproved: 0,
        availableUnreserved: 0,
        reserved: 0,
        pendingQc: 0,
        rejected: 0,
        totalValuation: 0,
        lowStockCount: 0,
      }
    );
  }, [computedMaterials]);

  const categories = useMemo(() => {
    return Array.from(new Set(materials.map((m) => m.category).filter(Boolean)));
  }, [materials]);

  const stockTable = useTableState(computedMaterials, {
    initialPageSize: 10,
    initialSortKey: 'code',
    searchFields: ['code', 'name', 'category', 'location', 'spec'],
  });

  const qcTable = useTableState(
    computedMaterials.filter((m) => m.pendingInspectionQty > 0 || m.rejectedQty > 0),
    {
      initialPageSize: 10,
      initialSortKey: 'pendingInspectionQty',
      initialSortDir: 'desc',
      searchFields: ['code', 'name', 'category'],
    }
  );

  const txnTable = useTableState(materialTransactions, {
    initialPageSize: 10,
    initialSortKey: 'timestamp',
    initialSortDir: 'desc',
    searchFields: ['id', 'reference', 'remarks', 'performedBy', 'type'],
  });

  const hasActiveStockFilters = Boolean(
    stockTable.search || stockTable.filters.category || stockTable.filters.stockStatus
  );

  const openTxnModal = (type, materialId = '') => {
    setTxnModal({ open: true, type });
    setTxnForm({
      materialId: materialId || materials[0]?.id || '',
      quantity: '',
      reference: '',
      remarks: '',
      requireQc: type === 'Inward',
    });
  };

  const handleTxnSubmit = (e) => {
    e.preventDefault();
    const ok = recordMaterialTransaction({
      materialId: txnForm.materialId,
      type: txnModal.type,
      quantity: Number(txnForm.quantity),
      reference: txnForm.reference,
      remarks: txnForm.remarks,
      requireQc: txnForm.requireQc,
    });
    if (ok) {
      setTxnModal({ open: false, type: 'Inward' });
    }
  };

  const selectedMat = computedMaterials.find((m) => m.id === txnForm.materialId);

  const stockColumns = [
    {
      key: 'code',
      label: 'Material Code',
      sortable: true,
      width: '140px',
      cellClassName: 'whitespace-nowrap',
      render: (r) => (
        <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap inline-block">
          {r.code}
        </span>
      ),
    },
    {
      key: 'name',
      label: 'Material & Specification',
      sortable: true,
      render: (r) => (
        <div>
          <div className="font-medium text-[#051747] dark:text-slate-100">{r.name}</div>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#535F80] dark:text-slate-400">
            <span className="flex items-center gap-1 font-mono">
              <MapPin className="w-3 h-3 text-[#535F80]" />
              {r.location || 'Unassigned'}
            </span>
            <span>·</span>
            <span className="line-clamp-1">{r.spec}</span>
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
      key: 'usableStock',
      label: 'Approved Usable',
      sortable: true,
      align: 'right',
      numeric: true,
      render: (r) => (
        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
          {formatNumber(r.usableStock)} {r.uom}
        </span>
      ),
    },
    {
      key: 'reservedQty',
      label: 'Reserved',
      sortable: true,
      align: 'right',
      numeric: true,
      render: (r) => (
        <span className="text-xs font-semibold text-[#081F62] dark:text-blue-400 tabular-nums">
          {formatNumber(r.reservedQty)} {r.uom}
        </span>
      ),
    },
    {
      key: 'availableQty',
      label: 'Net Available',
      sortable: true,
      align: 'right',
      numeric: true,
      render: (r) => (
        <div>
          <div
            className={`text-xs font-bold tabular-nums ${
              r.isLowStock ? 'text-red-600' : 'text-emerald-600'
            }`}
          >
            {formatNumber(r.availableQty)} {r.uom}
          </div>
          <div className="text-[10px] text-[#535F80] dark:text-slate-400 tabular-nums">
            Min: {formatNumber(r.reorderLevel)}
          </div>
        </div>
      ),
    },
    {
      key: 'qcHold',
      label: 'QC / Quarantine',
      align: 'right',
      render: (r) => (
        <div className="text-xs tabular-nums space-y-0.5">
          {r.pendingInspectionQty > 0 && (
            <div className="text-amber-600 font-semibold text-[11px]">
              QC: {formatNumber(r.pendingInspectionQty)} {r.uom}
            </div>
          )}
          {r.rejectedQty > 0 && (
            <div className="text-red-600 font-semibold text-[11px]">
              Scrap: {formatNumber(r.rejectedQty)} {r.uom}
            </div>
          )}
          {r.pendingInspectionQty === 0 && r.rejectedQty === 0 && (
            <span className="text-slate-400">—</span>
          )}
        </div>
      ),
    },
    {
      key: 'stockStatus',
      label: 'Stock Status',
      sortable: true,
      render: (r) => <StatusBadge status={r.stockStatus} size="xs" />,
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
          <Tooltip content="Quick Audit / Details">
            <button
              type="button"
              onClick={() => setViewTarget(r)}
              className="p-1.5 rounded hover:bg-[#E7E9F0]/70 dark:hover:bg-slate-800 text-[#535F80] hover:text-[#081F62] cursor-pointer"
              aria-label="View Stock Details"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <Tooltip content="Stock Inward">
            <button
              type="button"
              onClick={() => openTxnModal('Inward', r.id)}
              className="p-1.5 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 hover:text-emerald-700 cursor-pointer"
              aria-label="Stock Inward"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <Tooltip content="Reserve for Production">
            <button
              type="button"
              onClick={() => openTxnModal('Reservation', r.id)}
              className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-950/40 text-[#081F62] dark:text-blue-400 cursor-pointer"
              aria-label="Reserve Material"
            >
              <Lock className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <Tooltip content="Adjust Stock">
            <button
              type="button"
              onClick={() => openTxnModal('Adjustment', r.id)}
              className="p-1.5 rounded hover:bg-[#E7E9F0]/70 dark:hover:bg-slate-800 text-[#535F80] hover:text-[#081F62] cursor-pointer"
              aria-label="Adjust Stock"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
        </div>
      ),
    },
  ];

  const txnColumns = [
    {
      key: 'id',
      label: 'Txn ID',
      sortable: true,
      width: '130px',
      cellClassName: 'whitespace-nowrap',
      render: (r) => (
        <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap inline-block">
          {r.id}
        </span>
      ),
    },
    {
      key: 'materialId',
      label: 'Material',
      render: (r) => {
        const m = materials.find((item) => item.id === r.materialId);
        return (
          <div>
            <div className="font-medium text-xs text-[#051747] dark:text-slate-100">{m?.name || r.materialId}</div>
            <div className="text-[11px] font-mono text-[#535F80] dark:text-slate-400">{m?.code}</div>
          </div>
        );
      },
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (r) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
            r.type === 'Inward'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : r.type === 'Outward'
              ? 'bg-amber-50 text-amber-700 border border-amber-200'
              : r.type === 'Reservation'
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'bg-purple-50 text-purple-700 border border-purple-200'
          }`}
        >
          {r.type}
        </span>
      ),
    },
    {
      key: 'quantity',
      label: 'Quantity',
      align: 'right',
      numeric: true,
      sortable: true,
      render: (r) => {
        const m = materials.find((item) => item.id === r.materialId);
        return (
          <span
            className={`font-semibold text-xs tabular-nums ${
              r.quantity > 0 ? 'text-emerald-600' : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            {r.quantity > 0 ? '+' : ''}
            {formatNumber(r.quantity)} {m?.uom || ''}
          </span>
        );
      },
    },
    {
      key: 'reference',
      label: 'Reference',
      render: (r) => (
        <span className="font-mono text-xs text-slate-700 dark:text-slate-300">{r.reference || '—'}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <StatusBadge status={r.status} size="xs" />,
    },
    {
      key: 'performedBy',
      label: 'Performed By',
      render: (r) => <span className="text-xs text-[#535F80] dark:text-slate-400">{r.performedBy}</span>,
    },
    {
      key: 'timestamp',
      label: 'Timestamp',
      sortable: true,
      render: (r) => (
        <span className="text-xs tabular-nums text-slate-500 font-mono">{r.timestamp}</span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Warehouse Inventory & Stock Ledger"
        description="Monitor physical stock distribution, quality approval holds, production reservations, and ledger movements."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SecondaryButton icon={ArrowDownToLine} onClick={() => openTxnModal('Inward')}>
              Stock Inward
            </SecondaryButton>
            <SecondaryButton icon={ArrowUpFromLine} onClick={() => openTxnModal('Outward')}>
              Stock Outward
            </SecondaryButton>
            <SecondaryButton icon={SlidersHorizontal} onClick={() => openTxnModal('Adjustment')}>
              Adjustment
            </SecondaryButton>
            <PrimaryButton icon={Lock} onClick={() => openTxnModal('Reservation')}>
              Reserve Material
            </PrimaryButton>
          </div>
        }
      />

      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Physical Stock"
          value={`${formatNumber(summary.totalPhysical)} u`}
          sublabel="Approved + QC Hold + Scrap"
          icon={Boxes}
          tone="navy"
        />
        <StatCard
          label="Usable Approved Stock"
          value={`${formatNumber(summary.usableApproved)} u`}
          sublabel="Quality-verified usable"
          icon={CheckCircle2}
          tone="emerald"
        />
        <StatCard
          label="Net Available (Unreserved)"
          value={`${formatNumber(summary.availableUnreserved)} u`}
          sublabel={`${summary.lowStockCount} below reorder level`}
          icon={Lock}
          tone={summary.lowStockCount > 0 ? 'rose' : 'slate'}
        />
        <StatCard
          label="QC Hold & Quarantine"
          value={`${formatNumber(summary.pendingQc + summary.rejected)} u`}
          sublabel={`${formatNumber(summary.pendingQc)} pending · ${formatNumber(summary.rejected)} rejected`}
          icon={ShieldAlert}
          tone={summary.pendingQc + summary.rejected > 0 ? 'amber' : 'slate'}
        />
      </div>

      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          {
            key: 'stock',
            label: 'Current Warehouse Stock',
            count: computedMaterials.length,
            icon: Boxes,
          },
          {
            key: 'qc-hold',
            label: 'QC Hold & Quarantine',
            count: computedMaterials.filter((m) => m.pendingInspectionQty > 0 || m.rejectedQty > 0).length,
            icon: ShieldAlert,
          },
          {
            key: 'history',
            label: 'Transaction History',
            count: materialTransactions.length,
            icon: History,
          },
        ]}
      />

      {activeTab === 'stock' && (
        <div className="space-y-4">
          {/* Control & Filter Toolbar */}
          <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
              <SearchInput
                value={stockTable.search}
                onChange={stockTable.setSearch}
                placeholder="Search material code, name, category, location..."
                className="w-full sm:w-96 md:w-[420px] lg:w-[480px]"
              />
              <FilterDropdown
                label="Category"
                value={stockTable.filters.category}
                onChange={(val) => stockTable.setFilter('category', val)}
                options={categories}
              />
              <FilterDropdown
                label="Status"
                value={stockTable.filters.stockStatus}
                onChange={(val) => stockTable.setFilter('stockStatus', val)}
                options={['Available', 'Low Stock', 'Reserved']}
              />
              {hasActiveStockFilters && (
                <button
                  type="button"
                  onClick={stockTable.resetFilters}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 bg-[#E7E9F0]/60 dark:bg-slate-800 rounded-md cursor-pointer transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Reset Filters
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-[#535F80] dark:text-slate-400 hidden sm:inline">
                Showing <strong className="text-[#051747] dark:text-slate-200">{stockTable.totalItems}</strong> item{stockTable.totalItems === 1 ? '' : 's'}
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
            stockTable.paginatedData.length === 0 ? (
              <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-xl p-8">
                <EmptyState
                  icon={Boxes}
                  title="No inventory records match your criteria"
                  description="Try adjusting your search terms or clearing your filters to see warehouse stock."
                  action={
                    hasActiveStockFilters ? (
                      <SecondaryButton onClick={stockTable.resetFilters}>
                        Clear Filters
                      </SecondaryButton>
                    ) : (
                      <PrimaryButton icon={ArrowDownToLine} onClick={() => openTxnModal('Inward')}>
                        Stock Inward
                      </PrimaryButton>
                    )
                  }
                />
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {stockTable.paginatedData.map((mat) => {
                    const isLow = mat.isLowStock;
                    const totalPhys = Math.max(1, mat.totalPhysicalStock);
                    const availPct = Math.round(((mat.availableQty || 0) / totalPhys) * 100);
                    const resPct = Math.round(((mat.reservedQty || 0) / totalPhys) * 100);
                    const qcPct = Math.round(
                      (((mat.pendingInspectionQty || 0) + (mat.rejectedQty || 0)) / totalPhys) * 100
                    );

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
                            <StatusBadge status={mat.stockStatus} size="xs" />
                          </div>

                          {/* Category & Location */}
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

                          {/* Multi-Segment Inventory Bar */}
                          <div className="space-y-1.5 mb-4">
                            <div className="flex items-center justify-between text-[11px] text-[#535F80] dark:text-slate-400">
                              <span>Allocation Breakdown</span>
                              <span className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                                Total: {formatNumber(mat.totalPhysicalStock)} {mat.uom}
                              </span>
                            </div>
                            <div className="w-full bg-[#E7E9F0] dark:bg-slate-800 rounded-full h-2 overflow-hidden flex">
                              <div
                                title={`Available: ${mat.availableQty}`}
                                className={`h-full ${isLow ? 'bg-red-500' : 'bg-emerald-500'}`}
                                style={{ width: `${availPct}%` }}
                              />
                              <div
                                title={`Reserved: ${mat.reservedQty}`}
                                className="h-full bg-blue-600"
                                style={{ width: `${resPct}%` }}
                              />
                              <div
                                title={`QC / Scrap: ${mat.pendingInspectionQty + mat.rejectedQty}`}
                                className="h-full bg-amber-500"
                                style={{ width: `${qcPct}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-[#535F80] dark:text-slate-400 pt-0.5">
                              <span className="flex items-center gap-1">
                                <span className={`w-1.5 h-1.5 rounded-full ${isLow ? 'bg-red-500' : 'bg-emerald-500'}`} />
                                Avail: {formatNumber(mat.availableQty)}
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                                Res: {formatNumber(mat.reservedQty)}
                              </span>
                              {(mat.pendingInspectionQty > 0 || mat.rejectedQty > 0) && (
                                <span className="flex items-center gap-1 text-amber-600">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                  QC: {formatNumber(mat.pendingInspectionQty)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* 3-Column Micro Metrics */}
                          <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/15 dark:border-slate-800 mb-4 text-center">
                            <div>
                              <div className="text-[10px] text-[#535F80] dark:text-slate-400 font-medium">
                                Approved Usable
                              </div>
                              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 tabular-nums mt-0.5">
                                {formatNumber(mat.usableStock)} {mat.uom}
                              </div>
                            </div>
                            <div className="border-x border-[#535F80]/15 dark:border-slate-800">
                              <div className="text-[10px] text-[#535F80] dark:text-slate-400 font-medium">
                                Reserved
                              </div>
                              <div className="text-xs font-semibold text-[#081F62] dark:text-blue-400 tabular-nums mt-0.5">
                                {formatNumber(mat.reservedQty)} {mat.uom}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] text-[#535F80] dark:text-slate-400 font-medium">
                                Net Avail
                              </div>
                              <div
                                className={`text-xs font-bold tabular-nums mt-0.5 ${
                                  isLow ? 'text-red-600' : 'text-emerald-600'
                                }`}
                              >
                                {formatNumber(mat.availableQty)} {mat.uom}
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
                            Audit View
                          </button>

                          <div className="flex items-center gap-1">
                            <Tooltip content="Stock Inward">
                              <button
                                type="button"
                                onClick={() => openTxnModal('Inward', mat.id)}
                                className="p-1.5 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 hover:text-emerald-700 cursor-pointer"
                                aria-label="Stock Inward"
                              >
                                <ArrowDownToLine className="w-3.5 h-3.5" />
                              </button>
                            </Tooltip>
                            <Tooltip content="Reserve for Production">
                              <button
                                type="button"
                                onClick={() => openTxnModal('Reservation', mat.id)}
                                className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-950/40 text-[#081F62] dark:text-blue-400 cursor-pointer"
                                aria-label="Reserve Material"
                              >
                                <Lock className="w-3.5 h-3.5" />
                              </button>
                            </Tooltip>
                            <Tooltip content="Adjust Stock">
                              <button
                                type="button"
                                onClick={() => openTxnModal('Adjustment', mat.id)}
                                className="p-1.5 rounded hover:bg-[#E7E9F0]/70 dark:hover:bg-slate-800 text-[#535F80] hover:text-[#081F62] cursor-pointer"
                                aria-label="Adjust Stock"
                              >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
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
                    page={stockTable.page}
                    totalPages={stockTable.totalPages}
                    totalItems={stockTable.totalItems}
                    pageSize={stockTable.pageSize}
                    onPageChange={stockTable.setPage}
                    onPageSizeChange={stockTable.setPageSize}
                  />
                </div>
              </div>
            )
          ) : (
            <DataTable
              columns={stockColumns}
              data={stockTable.paginatedData}
              sortKey={stockTable.sortKey}
              sortDir={stockTable.sortDir}
              onSort={stockTable.handleSort}
              pagination={{
                page: stockTable.page,
                totalPages: stockTable.totalPages,
                totalItems: stockTable.totalItems,
                pageSize: stockTable.pageSize,
                onPageChange: stockTable.setPage,
                onPageSizeChange: stockTable.setPageSize,
              }}
            />
          )}
        </div>
      )}

      {activeTab === 'qc-hold' && (
        <DataTable
          data={qcTable.paginatedData}
          columns={[
            {
              key: 'code',
              label: 'Material Code',
              width: '140px',
              cellClassName: 'whitespace-nowrap',
              render: (r) => (
                <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap inline-block">
                  {r.code}
                </span>
              ),
            },
            {
              key: 'name',
              label: 'Material Name',
              render: (r) => (
                <div className="font-medium text-xs text-[#051747] dark:text-slate-100">{r.name}</div>
              ),
            },
            {
              key: 'pendingInspectionQty',
              label: 'QC Inspection Hold',
              align: 'right',
              numeric: true,
              render: (r) => (
                <span className="font-bold text-xs text-amber-600 tabular-nums">
                  {formatNumber(r.pendingInspectionQty)} {r.uom}
                </span>
              ),
            },
            {
              key: 'rejectedQty',
              label: 'Quarantine / Scrap',
              align: 'right',
              numeric: true,
              render: (r) => (
                <span className="font-bold text-xs text-red-600 tabular-nums">
                  {formatNumber(r.rejectedQty)} {r.uom}
                </span>
              ),
            },
            {
              key: 'usableStock',
              label: 'Approved Usable Stock',
              align: 'right',
              numeric: true,
              render: (r) => (
                <span className="text-xs text-slate-700 dark:text-slate-300 tabular-nums">
                  {formatNumber(r.usableStock)} {r.uom}
                </span>
              ),
            },
            {
              key: 'status',
              label: 'Quarantine Badges',
              render: (r) => (
                <div className="flex items-center gap-1.5">
                  {r.pendingInspectionQty > 0 && (
                    <StatusBadge status="Pending Inspection" size="xs" />
                  )}
                  {r.rejectedQty > 0 && <StatusBadge status="Rejected" size="xs" />}
                </div>
              ),
            },
          ]}
          pagination={{
            page: qcTable.page,
            totalPages: qcTable.totalPages,
            totalItems: qcTable.totalItems,
            pageSize: qcTable.pageSize,
            onPageChange: qcTable.setPage,
            onPageSizeChange: qcTable.setPageSize,
          }}
        />
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <SearchInput
              value={txnTable.search}
              onChange={txnTable.setSearch}
              placeholder="Search reference, remarks, material, user..."
              className="w-full sm:w-96 md:w-[420px] lg:w-[480px]"
            />
            <FilterDropdown
              label="Type"
              value={txnTable.filters.type}
              onChange={(val) => txnTable.setFilter('type', val)}
              options={['Inward', 'Outward', 'Reservation', 'Adjustment', 'QC Inspection']}
            />
          </div>

          <DataTable
            columns={txnColumns}
            data={txnTable.paginatedData}
            sortKey={txnTable.sortKey}
            sortDir={txnTable.sortDir}
            onSort={txnTable.handleSort}
            pagination={{
              page: txnTable.page,
              totalPages: txnTable.totalPages,
              totalItems: txnTable.totalItems,
              pageSize: txnTable.pageSize,
              onPageChange: txnTable.setPage,
              onPageSizeChange: txnTable.setPageSize,
            }}
          />
        </div>
      )}

      {/* Quick Audit / Details Modal */}
      {viewTarget && (
        <Modal
          isOpen={Boolean(viewTarget)}
          onClose={() => setViewTarget(null)}
          title="Warehouse Stock Audit & Allocation"
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <SecondaryButton onClick={() => setViewTarget(null)}>Close</SecondaryButton>
              <div className="flex items-center gap-2">
                <SecondaryButton
                  icon={Lock}
                  onClick={() => {
                    const id = viewTarget.id;
                    setViewTarget(null);
                    openTxnModal('Reservation', id);
                  }}
                >
                  Reserve Stock
                </SecondaryButton>
                <PrimaryButton
                  icon={ArrowDownToLine}
                  onClick={() => {
                    const id = viewTarget.id;
                    setViewTarget(null);
                    openTxnModal('Inward', id);
                  }}
                >
                  Stock Inward
                </PrimaryButton>
              </div>
            </div>
          }
        >
          <div className="space-y-5">
            {/* Header info */}
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

            {/* Storage Location & Rate */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-lg border border-[#535F80]/20 dark:border-slate-800 bg-[#FEFEFE] dark:bg-slate-900 space-y-1.5">
                <span className="text-xs font-semibold text-[#535F80] dark:text-slate-400 block uppercase tracking-wider">
                  Location & Spec
                </span>
                <div className="text-xs flex items-center gap-1.5 font-mono text-slate-800 dark:text-slate-200">
                  <MapPin className="w-3.5 h-3.5 text-[#081F62]" />
                  <span>Storage: {viewTarget.location || 'Unassigned'}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                  {viewTarget.spec || 'Standard grade'}
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-[#535F80]/20 dark:border-slate-800 bg-[#FEFEFE] dark:bg-slate-900 space-y-2">
                <span className="text-xs font-semibold text-[#535F80] dark:text-slate-400 block uppercase tracking-wider">
                  Valuation & Threshold
                </span>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#535F80]">Reorder Trigger:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatNumber(viewTarget.reorderLevel)} {viewTarget.uom}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#535F80]">Total Available Valuation:</span>
                  <span className="font-bold text-[#051747] dark:text-slate-100">
                    {formatCurrency((viewTarget.availableQty || 0) * (viewTarget.unitCost || 0))}
                  </span>
                </div>
              </div>
            </div>

            {/* 5-Block Physical Stock Breakdown */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#051747] dark:text-slate-200 mb-2.5">
                Detailed Physical Stock Distribution
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] text-[#535F80] dark:text-slate-400 font-medium">
                    Physical Approved
                  </div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1 tabular-nums">
                    {formatNumber(viewTarget.approvedPhysicalQty || 0)} {viewTarget.uom}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] text-[#535F80] dark:text-slate-400 font-medium">
                    Reserved
                  </div>
                  <div className="text-sm font-bold text-[#081F62] dark:text-blue-400 mt-1 tabular-nums">
                    {formatNumber(viewTarget.reservedQty || 0)} {viewTarget.uom}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                    Net Available
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
                    QC Inspection Hold
                  </div>
                  <div className="text-sm font-bold text-amber-600 mt-1 tabular-nums">
                    {formatNumber(viewTarget.pendingInspectionQty || 0)} {viewTarget.uom}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Stock Movement Modal */}
      <Modal
        isOpen={txnModal.open}
        onClose={() => setTxnModal({ open: false, type: 'Inward' })}
        title={`Record Stock ${txnModal.type}`}
        subtitle="Local warehouse ledger transaction update."
        size="lg"
        footer={
          <>
            <SecondaryButton onClick={() => setTxnModal({ open: false, type: 'Inward' })}>
              Cancel
            </SecondaryButton>
            <PrimaryButton onClick={handleTxnSubmit}>Confirm {txnModal.type}</PrimaryButton>
          </>
        }
      >
        <form onSubmit={handleTxnSubmit} className="space-y-4">
          <FormSelect
            label="Raw Material"
            name="materialId"
            required
            value={txnForm.materialId}
            onChange={(e) => setTxnForm({ ...txnForm, materialId: e.target.value })}
            options={computedMaterials.map((m) => ({
              value: m.id,
              label: `${m.code} — ${m.name} (Avail: ${formatNumber(m.availableQty)} ${m.uom})`,
            }))}
          />

          {selectedMat && (
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 grid grid-cols-3 gap-2 text-xs text-center">
              <div>
                <span className="text-[#535F80] dark:text-slate-400 block font-medium">
                  Approved Usable
                </span>
                <strong className="tabular-nums text-slate-800 dark:text-slate-200">
                  {formatNumber(selectedMat.usableStock)} {selectedMat.uom}
                </strong>
              </div>
              <div className="border-x border-slate-200 dark:border-slate-700">
                <span className="text-[#535F80] dark:text-slate-400 block font-medium">
                  Reserved
                </span>
                <strong className="tabular-nums text-[#081F62] dark:text-blue-400">
                  {formatNumber(selectedMat.reservedQty)} {selectedMat.uom}
                </strong>
              </div>
              <div>
                <span className="text-[#535F80] dark:text-slate-400 block font-medium">
                  Net Available
                </span>
                <strong className="tabular-nums text-emerald-600">
                  {formatNumber(selectedMat.availableQty)} {selectedMat.uom}
                </strong>
              </div>
            </div>
          )}

          <FormInput
            label={
              txnModal.type === 'Adjustment'
                ? `Adjustment Delta (${selectedMat?.uom || 'Units'}, negative to deduct)`
                : `Quantity (${selectedMat?.uom || 'Units'})`
            }
            name="quantity"
            type="number"
            required
            value={txnForm.quantity}
            onChange={(e) => setTxnForm({ ...txnForm, quantity: e.target.value })}
          />

          {txnModal.type === 'Inward' && (
            <label className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/30 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={txnForm.requireQc}
                onChange={(e) => setTxnForm({ ...txnForm, requireQc: e.target.checked })}
                className="mt-0.5 accent-[#051747]"
              />
              <div>
                <div className="font-semibold text-amber-900 dark:text-amber-200">
                  Hold in Pending Inspection Queue (Standard Quality Rule)
                </div>
                <div className="text-amber-700 dark:text-amber-300 mt-0.5">
                  Material will not count as usable stock until approved by Quality Control.
                </div>
              </div>
            </label>
          )}

          <FormInput
            label="Reference (PO / GRN / Plan ID)"
            name="reference"
            value={txnForm.reference}
            onChange={(e) => setTxnForm({ ...txnForm, reference: e.target.value })}
            placeholder="e.g., PO-2026-042 / PLAN-2026-011"
          />

          <FormTextarea
            label="Remarks"
            name="remarks"
            rows={2}
            value={txnForm.remarks}
            onChange={(e) => setTxnForm({ ...txnForm, remarks: e.target.value })}
            placeholder="Add ledger notes..."
          />
        </form>
      </Modal>
    </div>
  );
}
