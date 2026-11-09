import { useMemo } from 'react';
import { Boxes, AlertTriangle, PackageCheck, ShieldAlert } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { PageHeader } from '../../components/layout/PageHeader';
import { StatCard } from '../../components/dashboard/StatCard';
import { ChartCard } from '../../components/charts/ChartCard';
import { DataTable } from '../../components/tables/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useErpData } from '../../context/ErpDataContext';
import { getMaterialComputedFields, getFinishedGoodComputedFields } from '../../services/erpService';
import { formatCurrency, formatNumber } from '../../utils/formatters';

export function InventoryAnalyticsPage() {
  const { materials, finishedGoods, products } = useErpData();

  const computedMaterials = useMemo(() => materials.map(getMaterialComputedFields), [materials]);
  const computedFg = useMemo(() => finishedGoods.map(getFinishedGoodComputedFields), [finishedGoods]);

  const metrics = useMemo(() => {
    const usableStockValue = computedMaterials.reduce(
      (s, m) => s + m.usableStock * m.unitCost,
      0
    );
    const lowStockCount = computedMaterials.filter((m) => m.isLowStock).length;
    const qcHoldCount = computedMaterials.filter((m) => m.pendingInspectionQty > 0).length;
    const usableFgTotal = computedFg.reduce((s, f) => s + f.availableQty, 0);

    return { usableStockValue, lowStockCount, qcHoldCount, usableFgTotal };
  }, [computedMaterials, computedFg]);

  const stockChartData = useMemo(() => {
    return computedMaterials.map((m) => ({
      name: m.code.replace('RM-', ''),
      Available: m.availableQty,
      Reserved: m.reservedQty,
      PendingQC: m.pendingInspectionQty,
    }));
  }, [computedMaterials]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Analytics"
        description="Usable stock valuation, reservation allocation ratios, pending inspection holds, and finished goods readiness."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Usable Material Valuation"
          value={formatCurrency(metrics.usableStockValue)}
          sublabel="Quality-approved stock value"
          icon={Boxes}
          tone="blue"
        />
        <StatCard
          label="Low-Stock Materials"
          value={metrics.lowStockCount}
          sublabel="Below reorder threshold"
          icon={AlertTriangle}
          tone="red"
        />
        <StatCard
          label="Materials in QC Hold"
          value={metrics.qcHoldCount}
          sublabel="Awaiting inspection release"
          icon={ShieldAlert}
          tone="amber"
        />
        <StatCard
          label="Available Finished Goods"
          value={formatNumber(metrics.usableFgTotal)}
          sublabel="Accepted & unreserved FG"
          icon={PackageCheck}
          tone="green"
        />
      </div>

      <ChartCard
        title="Material Stock Allocation Breakdown"
        subtitle="Available unreserved vs reserved vs pending QC inspection"
        height="h-80"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stockChartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
            <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="Available" stackId="a" fill="#16A34A" />
            <Bar dataKey="Reserved" stackId="a" fill="#2563EB" />
            <Bar dataKey="PendingQC" name="Pending QC" stackId="a" fill="#D97706" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
          Finished Goods Usable Availability Summary
        </h3>
        <DataTable
          data={computedFg.map((f) => ({
            ...f,
            productName: products.find((p) => p.id === f.productId)?.name || f.productId,
          }))}
          columns={[
            { key: 'productName', label: 'Product' },
            { key: 'batchNumber', label: 'Batch' },
            { key: 'acceptedQty', label: 'Usable Accepted', align: 'right', numeric: true },
            { key: 'reservedQty', label: 'Reserved', align: 'right', numeric: true },
            { key: 'availableQty', label: 'Available', align: 'right', numeric: true },
            {
              key: 'status',
              label: 'Status',
              render: (r) => (
                <StatusBadge
                  status={r.acceptedQty === 0 ? 'Rejected' : r.availableQty > 0 ? 'Available' : 'Reserved'}
                  size="xs"
                />
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
