import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpFromLine,
  Boxes,
  ClipboardList,
  Factory,
  Lock,
  Plus,
  Eye,
  Warehouse,
  AlertTriangle,
  Layers,
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
import { useErpData } from '../../context/ErpDataContext';
import { getMaterialComputedFields } from '../../services/erpService';
import { formatNumber, formatDate } from '../../utils/formatters';

export function StockOutwardPage() {
  const navigate = useNavigate();
  const {
    materials,
    materialTransactions = [],
    productionPlans = [],
    machines = [],
    products = [],
  } = useErpData();

  const [detailModalTarget, setDetailModalTarget] = useState(null);

  const computedMaterials = useMemo(
    () => materials.map(getMaterialComputedFields),
    [materials]
  );

  // Outward transactions only
  const outwardTransactions = useMemo(
    () => materialTransactions.filter((txn) => txn.type === 'Outward'),
    [materialTransactions]
  );

  // Active production plans needing material issuance
  const activePlans = useMemo(
    () => productionPlans.filter((p) => p.status !== 'Completed'),
    [productionPlans]
  );

  const totalIssuedUnits = useMemo(
    () =>
      outwardTransactions.reduce((sum, t) => sum + Math.abs(Number(t.quantity || 0)), 0),
    [outwardTransactions]
  );

  const totalReservedUnits = useMemo(
    () => computedMaterials.reduce((sum, m) => sum + (m.reservedQty || 0), 0),
    [computedMaterials]
  );

  const totalAvailableStock = useMemo(
    () => computedMaterials.reduce((sum, m) => sum + (m.availableQty || 0), 0),
    [computedMaterials]
  );

  const tableState = useTableState(outwardTransactions, {
    initialPageSize: 10,
    initialSortKey: 'timestamp',
    initialSortDir: 'desc',
    searchFields: ['id', 'reference', 'remarks', 'performedBy'],
  });

  const columns = [
    {
      key: 'id',
      label: 'MIN / Trans ID',
      sortable: true,
      width: '120px',
      render: (r) => (
        <span className="font-mono text-xs font-semibold text-[#081F62] dark:text-blue-400">
          {r.id}
        </span>
      ),
    },
    {
      key: 'reference',
      label: 'Work Order / Plan #',
      sortable: true,
      render: (r) => (
        <span className="font-mono text-xs font-medium text-slate-800 dark:text-slate-200">
          {r.reference || '—'}
        </span>
      ),
    },
    {
      key: 'materialId',
      label: 'Material Item',
      sortable: true,
      render: (r) => {
        const mat = materials.find((m) => m.id === r.materialId);
        return (
          <div className="min-w-0">
            <div className="text-xs font-semibold text-[#051747] dark:text-slate-100 truncate">
              {mat?.name || r.materialId}
            </div>
            <div className="text-[11px] text-[#535F80] dark:text-slate-400 font-mono">
              {mat?.code} · {mat?.category}
            </div>
          </div>
        );
      },
    },
    {
      key: 'quantity',
      label: 'Issued Qty',
      sortable: true,
      align: 'right',
      numeric: true,
      render: (r) => {
        const mat = materials.find((m) => m.id === r.materialId);
        return (
          <span className="font-semibold text-xs tabular-nums text-blue-600 dark:text-blue-400">
            -{formatNumber(Math.abs(r.quantity))} {mat?.uom || 'Kg'}
          </span>
        );
      },
    },
    {
      key: 'status',
      label: 'Issue Status',
      sortable: true,
      render: (r) => <StatusBadge status={r.status || 'Issued'} size="xs" />,
    },
    {
      key: 'performedBy',
      label: 'Issued By',
      sortable: true,
      render: (r) => (
        <span className="text-xs text-[#535F80] dark:text-slate-400">{r.performedBy}</span>
      ),
    },
    {
      key: 'timestamp',
      label: 'Issue Time',
      sortable: true,
      render: (r) => (
        <span className="text-xs tabular-nums text-slate-500 font-mono">{r.timestamp}</span>
      ),
    },
    {
      key: 'actions',
      label: 'Audit',
      align: 'right',
      render: (r) => (
        <Tooltip content="Inspect Material Issue">
          <button
            type="button"
            onClick={() => setDetailModalTarget(r)}
            className="p-1.5 rounded hover:bg-[#E7E9F0]/70 dark:hover:bg-slate-800 text-[#535F80] hover:text-[#081F62] cursor-pointer"
            aria-label="View Outward details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </Tooltip>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Outward"
        badge={
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-md bg-blue-50 dark:bg-blue-950/60 text-[#081F62] dark:text-blue-400 border border-[#081F62]/20 dark:border-blue-800/40">
            <ArrowUpFromLine className="w-3.5 h-3.5" />
            Material Issue Note (MIN)
          </span>
        }
        description="Issue approved raw materials from store racks to shop floor CNC machines, work orders, or record authorized write-offs."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <SecondaryButton
              size="sm"
              icon={ClipboardList}
              onClick={() => navigate('/production-planning')}
            >
              Production Plans
            </SecondaryButton>
            <PrimaryButton
              size="sm"
              icon={Plus}
              onClick={() => navigate('/stock-outward/new')}
            >
              Issue Material
            </PrimaryButton>
          </div>
        }
      />

      {/* 4 Summary StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Material Issued"
          value={`${formatNumber(totalIssuedUnits)} Units`}
          trend={`${outwardTransactions.length} issues recorded`}
          trendDirection="up"
          sublabel="Issued to shop floor CNCs"
          icon={ArrowUpFromLine}
          tone="blue"
        />
        <StatCard
          label="Reserved for Production"
          value={`${formatNumber(totalReservedUnits)} Units`}
          trend="Allocated to active batches"
          trendDirection="neutral"
          sublabel="Held against production work orders"
          icon={Lock}
          tone="amber"
          onClick={() => navigate('/inventory')}
        />
        <StatCard
          label="Net Usable Available"
          value={`${formatNumber(totalAvailableStock)} Units`}
          trend="Unreserved & ready for issue"
          trendDirection="up"
          sublabel="In warehouse racks"
          icon={Warehouse}
          tone="green"
          onClick={() => navigate('/inventory')}
        />
        <StatCard
          label="Active Production Plans"
          value={`${activePlans.length} Plans`}
          trend="Scheduled on shop floor"
          trendDirection="neutral"
          sublabel="Open manufacturing batches"
          icon={Factory}
          tone="blue"
          onClick={() => navigate('/production-planning')}
        />
      </div>

      {/* Active Work Orders Needing Material Issuance */}
      {activePlans.length > 0 && (
        <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E7E9F0] dark:border-slate-800">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-[#081F62] dark:text-blue-400" />
              <h2 className="text-sm font-semibold text-[#051747] dark:text-slate-100">
                Active Production Work Orders Needing Store Issuance
              </h2>
            </div>
            <span className="text-xs text-[#535F80] dark:text-slate-400">
              {activePlans.length} plans in progress
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activePlans.slice(0, 3).map((plan) => {
              const prod = products.find((p) => p.id === plan.productId);
              const targetMach = machines.find((m) => m.id === plan.assignedMachineId);

              return (
                <div
                  key={plan.id}
                  className="p-3.5 rounded-lg border border-[#535F80]/20 dark:border-slate-800 bg-[#E7E9F0]/30 dark:bg-slate-800/40 flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-[#081F62] dark:text-blue-400">
                        {plan.id}
                      </span>
                      <StatusBadge status={plan.status} size="xs" />
                    </div>
                    <div className="text-xs font-semibold text-[#051747] dark:text-slate-100 mt-1 truncate">
                      {prod?.name || plan.productId}
                    </div>
                    <div className="text-[11px] text-[#535F80] dark:text-slate-400 mt-0.5">
                      Req: <strong>{plan.manufacturingRequirement} units</strong> · {targetMach?.name || 'Machine Allocated'}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#535F80]/10 dark:border-slate-700">
                    <span className="text-[11px] font-medium text-[#535F80] dark:text-slate-400">
                      Target: {formatDate(plan.targetDate)}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate(`/stock-outward/new?planId=${plan.id}`)}
                      className="px-2.5 py-1 text-xs font-semibold rounded bg-[#081F62] hover:bg-[#051747] text-[#FEFEFE] cursor-pointer inline-flex items-center gap-1 transition-colors"
                    >
                      <ArrowUpFromLine className="w-3 h-3" />
                      Issue to Plan
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Outward Movement Ledger */}
      <div className="space-y-3">
        <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            <SearchInput
              value={tableState.search}
              onChange={tableState.setSearch}
              placeholder="Search by MIN #, work order reference, remarks, or issuer..."
              className="w-full sm:w-96 md:w-[420px]"
            />
          </div>
          <span className="text-xs text-[#535F80] dark:text-slate-400">
            Showing <strong className="text-[#051747] dark:text-slate-200">{tableState.totalItems}</strong> outward issuance{tableState.totalItems === 1 ? '' : 's'}
          </span>
        </div>

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
          emptyMessage="No stock outward issuances found."
        />
      </div>

      {/* Transaction Audit Modal */}
      {detailModalTarget && (
        <Modal
          isOpen={Boolean(detailModalTarget)}
          onClose={() => setDetailModalTarget(null)}
          title="Outward Issuance Details"
          subtitle={`Audit trail for Material Issue Note ${detailModalTarget.id}`}
          size="md"
          footer={
            <SecondaryButton onClick={() => setDetailModalTarget(null)}>
              Close
            </SecondaryButton>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-[#535F80] dark:text-slate-400 block font-medium">Transaction ID</span>
                <span className="font-mono font-semibold text-[#081F62] dark:text-blue-400">{detailModalTarget.id}</span>
              </div>
              <div>
                <span className="text-[#535F80] dark:text-slate-400 block font-medium">Reference</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{detailModalTarget.reference || '—'}</span>
              </div>
              <div>
                <span className="text-[#535F80] dark:text-slate-400 block font-medium">Issued Quantity</span>
                <span className="font-bold text-blue-600">-{formatNumber(Math.abs(detailModalTarget.quantity))} Units</span>
              </div>
              <div>
                <span className="text-[#535F80] dark:text-slate-400 block font-medium">Status</span>
                <StatusBadge status={detailModalTarget.status} size="xs" />
              </div>
            </div>

            <div>
              <span className="text-[#535F80] dark:text-slate-400 block font-medium mb-1">Remarks / Destination Notes</span>
              <p className="p-2.5 rounded bg-[#E7E9F0]/60 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                {detailModalTarget.remarks || 'No notes attached to this transaction.'}
              </p>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#535F80] dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800">
              <span>Issued by: <strong>{detailModalTarget.performedBy}</strong></span>
              <span className="font-mono">{detailModalTarget.timestamp}</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
