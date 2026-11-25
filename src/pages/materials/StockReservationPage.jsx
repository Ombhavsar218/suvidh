import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookmarkCheck,
  Calendar,
  Clock,
  ExternalLink,
  Eye,
  Filter,
  Layers,
  Lock,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Unlock,
  Warehouse,
  X,
  AlertTriangle,
  ArrowUpFromLine,
  Factory,
  Package,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { StatCard } from '../../components/dashboard/StatCard';
import { DataTable } from '../../components/tables/DataTable';
import { useTableState } from '../../hooks/useTableState';
import { SearchInput } from '../../components/forms/Filters';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PrimaryButton, SecondaryButton } from '../../components/common/Buttons';
import { Tooltip } from '../../components/common/Tooltip';
import { Modal } from '../../components/common/Modal';
import { FormSelect, FormInput, FormTextarea } from '../../components/forms/FormFields';
import { useErpData } from '../../context/ErpDataContext';
import { formatNumber, formatDate } from '../../utils/formatters';
import {
  STATUS_STYLES,
  PRIORITY_STYLES,
  isReservationExpired,
} from './reservationUtils';

const RELEASE_REASONS = [
  'Production Plan Cancelled or Postponed',
  'Engineering Change / Alternate Material Selected',
  'Production Requirement Reduced',
  'Excess Material Reserved in Error',
  'Other / Custom Reason',
];

export function StockReservationPage() {
  const navigate = useNavigate();
  const {
    materials = [],
    productionPlans = [],
    stockReservations = [],
    releaseStockReservation,
  } = useErpData();

  // Modals state
  const [viewModalTarget, setViewModalTarget] = useState(null);
  const [releaseModalTarget, setReleaseModalTarget] = useState(null);
  const [releaseReason, setReleaseReason] = useState(RELEASE_REASONS[0]);
  const [customReleaseReason, setCustomReleaseReason] = useState('');
  const [isReleasing, setIsReleasing] = useState(false);

  // Filters state
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedPlan, setSelectedPlan] = useState('All');
  const [selectedMaterial, setSelectedMaterial] = useState('All');

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Compute live expiration flags for display
  const enrichedReservations = useMemo(() => {
    return stockReservations.map((res) => {
      const expired = res.status !== 'Released' && isReservationExpired(res.expiryDate);
      const computedStatus = expired && res.status !== 'Released' ? 'Expired' : res.status;
      return {
        ...res,
        isExpired: expired,
        displayStatus: computedStatus,
      };
    });
  }, [stockReservations]);

  // Filtered reservations
  const filteredReservations = useMemo(() => {
    return enrichedReservations.filter((res) => {
      if (selectedStatus !== 'All' && res.displayStatus !== selectedStatus) return false;
      if (selectedPlan !== 'All' && res.productionPlanNumber !== selectedPlan && res.planId !== selectedPlan) return false;
      if (selectedMaterial !== 'All' && res.materialId !== selectedMaterial) return false;
      return true;
    });
  }, [enrichedReservations, selectedStatus, selectedPlan, selectedMaterial]);

  // KPI Calculations
  const activeReservationsCount = useMemo(() => {
    return enrichedReservations.filter((r) => r.displayStatus === 'Active').length;
  }, [enrichedReservations]);

  const totalReservedStockQty = useMemo(() => {
    return enrichedReservations
      .filter((r) => r.displayStatus === 'Active' || r.displayStatus === 'Partially Consumed')
      .reduce((sum, r) => sum + Number(r.remainingQuantity || r.reservedQuantity || 0), 0);
  }, [enrichedReservations]);

  const partiallyConsumedCount = useMemo(() => {
    return enrichedReservations.filter((r) => r.displayStatus === 'Partially Consumed').length;
  }, [enrichedReservations]);

  const expiringOrExpiredCount = useMemo(() => {
    return enrichedReservations.filter((r) => {
      if (r.displayStatus === 'Expired') return true;
      if (r.displayStatus === 'Active' || r.displayStatus === 'Partially Consumed') {
        if (!r.expiryDate) return false;
        const diffDays = Math.ceil((new Date(r.expiryDate) - new Date(todayStr)) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 3;
      }
      return false;
    }).length;
  }, [enrichedReservations, todayStr]);

  // Table State
  const tableState = useTableState(filteredReservations, {
    initialPageSize: 10,
    initialSortKey: 'reservationDate',
    initialSortDir: 'desc',
    searchFields: [
      'reservationNumber',
      'workOrderNumber',
      'productionPlanNumber',
      'materialName',
      'materialCode',
      'materialGrade',
      'reservedBy',
      'productName',
    ],
  });

  // Table Columns
  const columns = [
    {
      key: 'reservationNumber',
      label: 'Reservation #',
      sortable: true,
      width: '130px',
      render: (r) => (
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              r.priority === 'Urgent'
                ? 'bg-rose-500 ring-2 ring-rose-200'
                : r.priority === 'High'
                ? 'bg-amber-500 ring-2 ring-amber-200'
                : 'bg-slate-300'
            }`}
            title={`${r.priority || 'Normal'} Priority`}
          />
          <span className="font-mono text-xs font-bold text-[#081F62] dark:text-blue-400">
            {r.reservationNumber}
          </span>
        </div>
      ),
    },
    {
      key: 'reservationDate',
      label: 'Date',
      sortable: true,
      width: '100px',
      render: (r) => (
        <span className="text-xs tabular-nums text-slate-600 dark:text-slate-300">
          {formatDate(r.reservationDate)}
        </span>
      ),
    },
    {
      key: 'materialName',
      label: 'Material Item & Grade',
      sortable: true,
      render: (r) => (
        <div className="min-w-0">
          <div className="text-xs font-semibold text-[#051747] dark:text-slate-100 truncate">
            {r.materialName}
          </div>
          <div className="text-[11px] text-[#535F80] dark:text-slate-400 font-mono">
            {r.materialCode} {r.materialGrade ? `· ${r.materialGrade}` : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'productionPlanNumber',
      label: 'Plan #',
      sortable: true,
      width: '110px',
      render: (r) => (
        <span className="font-mono text-xs font-medium text-slate-800 dark:text-slate-200">
          {r.productionPlanNumber || r.planId || '—'}
        </span>
      ),
    },
    {
      key: 'workOrderNumber',
      label: 'Work Order #',
      sortable: true,
      width: '110px',
      render: (r) => (
        <span className="font-mono text-xs font-semibold text-[#081F62] dark:text-blue-400">
          {r.workOrderNumber || '—'}
        </span>
      ),
    },
    {
      key: 'reservedQuantity',
      label: 'Reserved Qty',
      sortable: true,
      align: 'right',
      numeric: true,
      render: (r) => (
        <span className="font-semibold text-xs tabular-nums text-slate-800 dark:text-slate-200">
          {formatNumber(r.reservedQuantity)} {r.unit}
        </span>
      ),
    },
    {
      key: 'consumedQuantity',
      label: 'Consumed',
      sortable: true,
      align: 'right',
      numeric: true,
      render: (r) => (
        <span className="font-semibold text-xs tabular-nums text-blue-600 dark:text-blue-400">
          {formatNumber(r.consumedQuantity || 0)} {r.unit}
        </span>
      ),
    },
    {
      key: 'remainingQuantity',
      label: 'Remaining',
      sortable: true,
      align: 'right',
      numeric: true,
      render: (r) => (
        <span
          className={`font-bold text-xs tabular-nums ${
            r.displayStatus === 'Released'
              ? 'text-slate-400 line-through'
              : 'text-emerald-600 dark:text-emerald-400'
          }`}
        >
          {formatNumber(r.remainingQuantity !== undefined ? r.remainingQuantity : r.reservedQuantity)} {r.unit}
        </span>
      ),
    },
    {
      key: 'reservedBy',
      label: 'Reserved By',
      sortable: true,
      render: (r) => (
        <span className="text-xs text-[#535F80] dark:text-slate-400 truncate block max-w-[120px]">
          {r.reservedBy}
        </span>
      ),
    },
    {
      key: 'expiryDate',
      label: 'Expiry',
      sortable: true,
      width: '100px',
      render: (r) => {
        const isExp = r.isExpired;
        return (
          <span
            className={`text-xs tabular-nums font-mono ${
              isExp ? 'text-rose-600 font-bold' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            {formatDate(r.expiryDate)}
          </span>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (r) => {
        const style = STATUS_STYLES[r.displayStatus] || STATUS_STYLES.Active;
        return (
          <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${style}`}>
            {r.displayStatus}
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (r) => {
        const canRelease = r.displayStatus === 'Active' || r.displayStatus === 'Partially Consumed';
        return (
          <div className="flex items-center justify-end gap-1">
            <Tooltip content="Quick View Audit Details">
              <button
                type="button"
                onClick={() => setViewModalTarget(r)}
                className="p-1.5 rounded hover:bg-[#E7E9F0]/70 dark:hover:bg-slate-800 text-[#535F80] hover:text-[#081F62] cursor-pointer"
                aria-label="View Details"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
            </Tooltip>

            {canRelease && (
              <>
                <Tooltip content="Issue Material from this Reservation">
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/stock-outward/new?planId=${r.productionPlanNumber || r.planId}&materialId=${r.materialId}`
                      )
                    }
                    className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/40 text-blue-600 hover:text-blue-800 cursor-pointer"
                    aria-label="Issue Material"
                  >
                    <ArrowUpFromLine className="w-3.5 h-3.5" />
                  </button>
                </Tooltip>

                <Tooltip content="Release Remaining Reserved Stock">
                  <button
                    type="button"
                    onClick={() => {
                      setReleaseModalTarget(r);
                      setReleaseReason(RELEASE_REASONS[0]);
                      setCustomReleaseReason('');
                    }}
                    className="p-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-900/40 text-rose-600 hover:text-rose-800 cursor-pointer"
                    aria-label="Release Stock"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                  </button>
                </Tooltip>
              </>
            )}
          </div>
        );
      },
    },
  ];

  // Handle release submission
  const handleConfirmRelease = () => {
    if (!releaseModalTarget) return;
    setIsReleasing(true);
    const finalReason =
      releaseReason === 'Other / Custom Reason'
        ? customReleaseReason || 'Manual release'
        : releaseReason;

    releaseStockReservation(releaseModalTarget.id, finalReason);
    setIsReleasing(false);
    setReleaseModalTarget(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Reservations"
        badge={
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
            <Lock className="w-3.5 h-3.5" />
            Inventory Allocation & Lock
          </span>
        }
        description="Manage dedicated raw material reservations allocated to scheduled Work Orders and Production Plans. Safeguard shop floor material availability without double-subtraction."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <SecondaryButton
              size="sm"
              icon={ArrowUpFromLine}
              onClick={() => navigate('/stock-outward/new')}
            >
              Issue Material
            </SecondaryButton>
            <PrimaryButton
              size="sm"
              icon={Plus}
              onClick={() => navigate('/stock-reservation/new')}
            >
              Reserve Material
            </PrimaryButton>
          </div>
        }
      />

      {/* 4 Summary StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Reservations"
          value={`${activeReservationsCount} Active`}
          trend={`${enrichedReservations.length} total recorded`}
          trendDirection="neutral"
          sublabel="Locked for scheduled runs"
          icon={BookmarkCheck}
          tone="emerald"
        />
        <StatCard
          label="Total Locked Inventory"
          value={`${formatNumber(totalReservedStockQty)} Units`}
          trend="Exclusive to active work orders"
          trendDirection="up"
          sublabel="Deducted from net available stock"
          icon={Lock}
          tone="blue"
        />
        <StatCard
          label="Partially Consumed"
          value={`${partiallyConsumedCount} Orders`}
          trend="In-process material issues"
          trendDirection="neutral"
          sublabel="Remaining balance held in store"
          icon={Layers}
          tone="amber"
        />
        <StatCard
          label="Expiring / Expired"
          value={`${expiringOrExpiredCount} Flagged`}
          trend={expiringOrExpiredCount > 0 ? 'Requires store review' : 'All valid'}
          trendDirection={expiringOrExpiredCount > 0 ? 'down' : 'up'}
          sublabel="Releasable to free pool"
          icon={Clock}
          tone={expiringOrExpiredCount > 0 ? 'rose' : 'green'}
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-[280px]">
            <SearchInput
              value={tableState.search}
              onChange={tableState.setSearch}
              placeholder="Search by RES #, work order, plan #, material name, or user..."
              className="w-full sm:w-96 md:w-[420px]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-md border border-[#535F80]/30 dark:border-slate-700 bg-[#FEFEFE] dark:bg-slate-900 text-[#051747] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#081F62]"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Partially Consumed">Partially Consumed</option>
              <option value="Released">Released</option>
              <option value="Expired">Expired</option>
            </select>

            {/* Plan Filter */}
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-md border border-[#535F80]/30 dark:border-slate-700 bg-[#FEFEFE] dark:bg-slate-900 text-[#051747] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#081F62]"
            >
              <option value="All">All Production Plans</option>
              {productionPlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id}
                </option>
              ))}
            </select>

            {/* Material Filter */}
            <select
              value={selectedMaterial}
              onChange={(e) => setSelectedMaterial(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-md border border-[#535F80]/30 dark:border-slate-700 bg-[#FEFEFE] dark:bg-slate-900 text-[#051747] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#081F62]"
            >
              <option value="All">All Materials</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.code} — {m.name}
                </option>
              ))}
            </select>

            {(selectedStatus !== 'All' || selectedPlan !== 'All' || selectedMaterial !== 'All' || tableState.search) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedStatus('All');
                  setSelectedPlan('All');
                  setSelectedMaterial('All');
                  tableState.setSearch('');
                }}
                className="px-2.5 py-1.5 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md font-medium inline-flex items-center gap-1 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-[#535F80] dark:text-slate-400 pt-2 border-t border-[#E7E9F0] dark:border-slate-800">
          <span>
            Showing <strong className="text-[#051747] dark:text-slate-200">{tableState.totalItems}</strong> matching stock reservation{tableState.totalItems === 1 ? '' : 's'}
          </span>
          <span className="font-mono text-[11px]">
            Locked Stock: <strong>{formatNumber(totalReservedStockQty)} Units</strong>
          </span>
        </div>
      </div>

      {/* Reservation Data Table */}
      <DataTable
        columns={columns}
        data={tableState.paginatedData}
        totalItems={tableState.totalItems}
        page={tableState.page}
        pageSize={tableState.pageSize}
        onPageChange={tableState.setPage}
        onPageSizeChange={tableState.setPageSize}
        sortKey={tableState.sortKey}
        sortDir={tableState.sortDir}
        onSort={tableState.handleSort}
        emptyMessage="No stock reservations match the current filter criteria."
      />

      {/* Quick View / Audit Modal */}
      {viewModalTarget && (
        <Modal
          isOpen={Boolean(viewModalTarget)}
          onClose={() => setViewModalTarget(null)}
          title="Stock Reservation Details"
          subtitle={`Audit trail & allocation record for ${viewModalTarget.reservationNumber}`}
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-[#535F80] dark:text-slate-400">
                Created: {viewModalTarget.createdAt || viewModalTarget.reservationDate}
              </span>
              <div className="flex items-center gap-2">
                {(viewModalTarget.displayStatus === 'Active' || viewModalTarget.displayStatus === 'Partially Consumed') && (
                  <SecondaryButton
                    icon={ArrowUpFromLine}
                    onClick={() => {
                      const t = viewModalTarget;
                      setViewModalTarget(null);
                      navigate(`/stock-outward/new?planId=${t.productionPlanNumber || t.planId}&materialId=${t.materialId}`);
                    }}
                  >
                    Issue Against Reservation
                  </SecondaryButton>
                )}
                <PrimaryButton onClick={() => setViewModalTarget(null)}>
                  Close
                </PrimaryButton>
              </div>
            </div>
          }
        >
          <div className="space-y-4 text-xs py-1">
            {/* Header Status Bar */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-[#E7E9F0] dark:border-slate-800">
              <div>
                <span className="text-[#535F80] dark:text-slate-400 block font-medium">Reservation Number</span>
                <span className="font-mono text-base font-bold text-[#081F62] dark:text-blue-400">
                  {viewModalTarget.reservationNumber}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[#535F80] dark:text-slate-400 block font-medium">Current Status</span>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLES[viewModalTarget.displayStatus]}`}>
                  {viewModalTarget.displayStatus}
                </span>
              </div>
            </div>

            {/* Production & Material Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg border border-[#E7E9F0] dark:border-slate-800">
              <div>
                <span className="text-[#535F80] dark:text-slate-400 block">Work Order Number</span>
                <span className="font-mono font-semibold text-[#051747] dark:text-slate-100">
                  {viewModalTarget.workOrderNumber || '—'}
                </span>
              </div>
              <div>
                <span className="text-[#535F80] dark:text-slate-400 block">Production Plan</span>
                <span className="font-mono font-semibold text-[#051747] dark:text-slate-100">
                  {viewModalTarget.productionPlanNumber || viewModalTarget.planId || '—'}
                </span>
              </div>
              <div>
                <span className="text-[#535F80] dark:text-slate-400 block">Target Product</span>
                <span className="font-semibold text-[#051747] dark:text-slate-100">
                  {viewModalTarget.productName || 'Direct'}
                </span>
              </div>
              <div>
                <span className="text-[#535F80] dark:text-slate-400 block">Material Code & Name</span>
                <span className="font-semibold text-[#051747] dark:text-slate-100">
                  {viewModalTarget.materialName} ({viewModalTarget.materialCode})
                </span>
              </div>
              <div>
                <span className="text-[#535F80] dark:text-slate-400 block">Grade / Spec</span>
                <span className="font-medium text-[#051747] dark:text-slate-100">
                  {viewModalTarget.materialGrade || 'Standard'}
                </span>
              </div>
              <div>
                <span className="text-[#535F80] dark:text-slate-400 block">Warehouse Location</span>
                <span className="text-[#051747] dark:text-slate-100">
                  {viewModalTarget.warehouse || 'Central Warehouse'} ({viewModalTarget.storageLocation || 'Zone A'})
                </span>
              </div>
              <div>
                <span className="text-[#535F80] dark:text-slate-400 block">Batch / Heat Number</span>
                <span className="font-mono font-semibold text-[#051747] dark:text-slate-100">
                  {viewModalTarget.batchNumber || 'ALL-APPROVED'}
                </span>
              </div>
              <div>
                <span className="text-[#535F80] dark:text-slate-400 block">Priority Level</span>
                <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${PRIORITY_STYLES[viewModalTarget.priority || 'Normal']}`}>
                  {viewModalTarget.priority || 'Normal'}
                </span>
              </div>
              <div>
                <span className="text-[#535F80] dark:text-slate-400 block">Reservation Expiry Date</span>
                <span className="font-mono font-medium text-[#051747] dark:text-slate-100">
                  {formatDate(viewModalTarget.expiryDate)}
                </span>
              </div>
            </div>

            {/* Quantities breakdown */}
            <div className="grid grid-cols-3 gap-3 p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 text-center">
              <div>
                <span className="text-[11px] text-[#535F80] dark:text-slate-400 block font-medium">Initially Reserved</span>
                <span className="text-base font-bold text-[#081F62] dark:text-blue-400">
                  {formatNumber(viewModalTarget.reservedQuantity)} {viewModalTarget.unit}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[#535F80] dark:text-slate-400 block font-medium">Consumed via Outward</span>
                <span className="text-base font-bold text-blue-600 dark:text-blue-300">
                  {formatNumber(viewModalTarget.consumedQuantity || 0)} {viewModalTarget.unit}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[#535F80] dark:text-slate-400 block font-medium">Currently Held</span>
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                  {formatNumber(viewModalTarget.remainingQuantity !== undefined ? viewModalTarget.remainingQuantity : viewModalTarget.reservedQuantity)} {viewModalTarget.unit}
                </span>
              </div>
            </div>

            {/* Release Audit Info if Released */}
            {viewModalTarget.displayStatus === 'Released' && (
              <div className="p-3 bg-slate-100 dark:bg-slate-800/80 rounded-lg border border-slate-300 dark:border-slate-700 space-y-1">
                <span className="text-slate-700 dark:text-slate-300 font-semibold block">
                  Release Audit Record
                </span>
                <p className="text-[#535F80] dark:text-slate-400">
                  Released by: <strong>{viewModalTarget.releasedBy || 'Store Manager'}</strong> on{' '}
                  <strong>{formatDate(viewModalTarget.releaseDate || viewModalTarget.lastUpdated)}</strong>
                </p>
                <p className="text-[#535F80] dark:text-slate-400">
                  Release Reason: <em>{viewModalTarget.releaseReason || viewModalTarget.statusNote || 'Manual release'}</em>
                </p>
              </div>
            )}

            {/* Remarks */}
            <div>
              <span className="text-[#535F80] dark:text-slate-400 block font-medium mb-1">
                Reservation Remarks & Justification
              </span>
              <p className="p-2.5 rounded bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                {viewModalTarget.remarks || 'No specific remarks recorded.'}
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* Release Confirmation & Reason Modal */}
      {releaseModalTarget && (
        <Modal
          isOpen={Boolean(releaseModalTarget)}
          onClose={() => setReleaseModalTarget(null)}
          title="Release Stock Reservation"
          subtitle={`Unlock held inventory for ${releaseModalTarget.reservationNumber}`}
          size="md"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <SecondaryButton onClick={() => setReleaseModalTarget(null)}>
                Cancel
              </SecondaryButton>
              <PrimaryButton
                variant="danger"
                icon={Unlock}
                onClick={handleConfirmRelease}
                disabled={isReleasing}
              >
                {isReleasing ? 'Releasing...' : 'Confirm Release & Return Stock'}
              </PrimaryButton>
            </div>
          }
        >
          <div className="space-y-4 text-xs py-2">
            <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-900 dark:text-amber-200">
                  Returning Stock to Available Pool
                </h4>
                <p className="text-amber-800 dark:text-amber-300 mt-0.5">
                  Releasing this reservation will immediately unlock{' '}
                  <strong>
                    {formatNumber(
                      Math.max(
                        0,
                        Number(releaseModalTarget.reservedQuantity || 0) -
                          Number(releaseModalTarget.consumedQuantity || 0)
                      )
                    )}{' '}
                    {releaseModalTarget.unit}
                  </strong>{' '}
                  of <strong>{releaseModalTarget.materialName}</strong> and return it to the net available inventory pool for other production orders.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-[#E7E9F0] dark:border-slate-800">
              <div>
                <span className="text-[#535F80] dark:text-slate-400 block">Work Order:</span>
                <span className="font-semibold text-[#051747] dark:text-slate-200">
                  {releaseModalTarget.workOrderNumber}
                </span>
              </div>
              <div>
                <span className="text-[#535F80] dark:text-slate-400 block">Material:</span>
                <span className="font-semibold text-[#051747] dark:text-slate-200">
                  {releaseModalTarget.materialCode}
                </span>
              </div>
            </div>

            <FormSelect
              label="Reason for Release"
              name="releaseReason"
              value={releaseReason}
              onChange={(e) => setReleaseReason(e.target.value)}
              options={RELEASE_REASONS}
              required
              helperText="Mandatory reason for the stock release audit trail"
            />

            {releaseReason === 'Other / Custom Reason' && (
              <FormInput
                label="Custom Release Explanation"
                name="customReleaseReason"
                value={customReleaseReason}
                onChange={(e) => setCustomReleaseReason(e.target.value)}
                placeholder="Explain why reservation is being released..."
                required
              />
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
