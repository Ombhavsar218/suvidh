import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Cpu, Package, ClipboardList } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { SecondaryButton } from '../../components/common/Buttons';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/States';
import { DataTable } from '../../components/tables/DataTable';
import { useErpData } from '../../context/ErpDataContext';
import { formatDate, formatNumber } from '../../utils/formatters';

const SCHEDULE_DATES = [
  '2026-11-08',
  '2026-11-09',
  '2026-11-10',
  '2026-11-11',
  '2026-11-12',
  '2026-11-13',
  '2026-11-14',
];

export function MachineDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { machines, products, productionPlans, productionEntries } = useErpData();

  const machine = machines.find((m) => m.id === id);

  if (!machine) {
    return (
      <EmptyState
        title="Machine not found"
        description="The selected machine record does not exist."
        action={<SecondaryButton onClick={() => navigate('/machines')}>Back to Machines</SecondaryButton>}
      />
    );
  }

  const compatibleProducts = products.filter((p) =>
    (machine.supportedProductIds || []).includes(p.id)
  );
  const assignedPlans = productionPlans.filter((p) => p.assignedMachineId === machine.id);
  const currentPlan = assignedPlans.find((p) => p.status === 'In Progress') || assignedPlans[0];
  const historyEntries = productionEntries.filter((e) => e.machineId === machine.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${machine.code} — ${machine.name}`}
        description={`${machine.category} · ${machine.bay} · Operator: ${machine.operator || 'Unassigned'}`}
        badge={<StatusBadge status={machine.status} />}
        actions={
          <SecondaryButton icon={ArrowLeft} onClick={() => navigate('/machines')}>
            Back to Machines
          </SecondaryButton>
        }
      />

      {/* Info + Current Assignment + Compatible Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#2563EB]" />
            <h3 className="text-sm font-semibold">Machine Specifications</h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Daily Capacity</span>
              <strong className="tabular-nums">{machine.dailyCapacity} units/day</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Rated Efficiency</span>
              <strong className="tabular-nums">{machine.efficiency}%</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Last Maintenance</span>
              <span className="tabular-nums">{formatDate(machine.lastMaintenance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Next Preventive Due</span>
              <span className="tabular-nums">{formatDate(machine.nextMaintenance)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-[#2563EB]" />
            <h3 className="text-sm font-semibold">Current Production Assignment</h3>
          </div>
          {currentPlan ? (
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold text-[#2563EB]">{currentPlan.id}</span>
                <StatusBadge status={currentPlan.status} size="xs" />
              </div>
              <p className="font-medium text-slate-800 dark:text-slate-100">
                {products.find((p) => p.id === currentPlan.productId)?.name}
              </p>
              <p className="text-slate-500 tabular-nums">
                Target Qty: {formatNumber(currentPlan.manufacturingRequirement)} units
              </p>
              <p className="text-slate-500 tabular-nums">
                Window: {formatDate(currentPlan.plannedStartDate)} → {formatDate(currentPlan.plannedCompletionDate)}
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-500">No active production plan assigned.</p>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-[#2563EB]" />
            <h3 className="text-sm font-semibold">Compatible Products ({compatibleProducts.length})</h3>
          </div>
          <div className="space-y-2">
            {compatibleProducts.map((p) => (
              <div
                key={p.id}
                onClick={() => navigate(`/products/${p.id}`)}
                className="flex items-center justify-between text-xs p-2 rounded border border-slate-100 dark:border-slate-800 hover:border-[#2563EB]/60 cursor-pointer"
              >
                <span className="font-medium truncate">{p.name}</span>
                <span className="font-mono text-[11px] text-slate-500 shrink-0 ml-2">{p.code}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Availability Calendar / Weekly Schedule View */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-[#2563EB]" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            7-Day Availability Schedule
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {SCHEDULE_DATES.map((date) => {
            const activeOnDate = assignedPlans.find(
              (pl) =>
                pl.status !== 'Completed' &&
                date >= pl.plannedStartDate &&
                date <= pl.plannedCompletionDate
            );
            const isMaintenance = machine.status === 'Maintenance';
            const isInactive = machine.status === 'Inactive';

            return (
              <div
                key={date}
                className={`p-3 rounded-md border text-xs ${
                  isInactive
                    ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                    : isMaintenance
                    ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60'
                    : activeOnDate
                    ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/60'
                    : 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50'
                }`}
              >
                <div className="font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                  {formatDate(date)}
                </div>
                <div className="mt-1.5">
                  {isInactive ? (
                    <span className="text-slate-500">Inactive</span>
                  ) : isMaintenance ? (
                    <span className="text-amber-700 dark:text-amber-300 font-medium">Maintenance</span>
                  ) : activeOnDate ? (
                    <div>
                      <div className="font-mono text-[11px] font-semibold text-[#2563EB]">
                        {activeOnDate.id}
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                        {products.find((p) => p.id === activeOnDate.productId)?.name}
                      </div>
                    </div>
                  ) : (
                    <span className="text-emerald-700 dark:text-emerald-300 font-medium">Available Slot</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Production History */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
          Production Execution History ({historyEntries.length})
        </h3>
        <DataTable
          data={historyEntries}
          columns={[
            { key: 'id', label: 'Entry ID', render: (r) => <span className="font-mono text-xs">{r.id}</span> },
            { key: 'planId', label: 'Plan ID' },
            {
              key: 'productId',
              label: 'Product',
              render: (r) => products.find((p) => p.id === r.productId)?.name || r.productId,
            },
            { key: 'productionDate', label: 'Date', render: (r) => formatDate(r.productionDate) },
            { key: 'plannedQty', label: 'Planned', numeric: true, align: 'right' },
            { key: 'actualQty', label: 'Actual', numeric: true, align: 'right' },
            { key: 'goodOutput', label: 'Good Output', numeric: true, align: 'right', render: (r) => <span className="font-semibold text-emerald-600">{r.goodOutput}</span> },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          ]}
        />
      </div>
    </div>
  );
}
