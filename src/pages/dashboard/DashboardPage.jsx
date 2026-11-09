import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Package,
  Boxes,
  ClipboardList,
  Factory,
  Truck,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { PageHeader } from '../../components/layout/PageHeader';
import { StatCard } from '../../components/dashboard/StatCard';
import { ChartCard } from '../../components/charts/ChartCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { SecondaryButton } from '../../components/common/Buttons';
import { useErpData } from '../../context/ErpDataContext';
import { getMaterialComputedFields } from '../../services/erpService';
import { monthlyProductionTrend } from '../../data/productionData';
import { formatNumber, formatDate, formatCurrency, getDaysRemaining } from '../../utils/formatters';

const ORDER_COLORS = {
  Pending: '#D97706',
  'In Production': '#2563EB',
  Completed: '#16A34A',
  Dispatched: '#4F46E5',
};

export function DashboardPage() {
  const navigate = useNavigate();
  const {
    customers,
    products,
    materials,
    machines,
    schedules,
    purchaseOrders,
    productionPlans,
    productionEntries,
    qualityInspections,
    salesOrders,
  } = useErpData();

  const [horizonFilter, setHorizonFilter] = useState('6M');

  const computedMaterials = useMemo(
    () => materials.map(getMaterialComputedFields),
    [materials]
  );

  const lowStockMaterials = useMemo(
    () => computedMaterials.filter((m) => m.isLowStock),
    [computedMaterials]
  );

  const pendingInspections = useMemo(
    () =>
      qualityInspections.filter(
        (q) => q.status === 'Pending' || q.status === 'In Inspection'
      ),
    [qualityInspections]
  );

  // Summary metrics
  const activeCustomersCount = customers.filter((c) => c.status === 'Active').length;
  const activeProductsCount = products.filter((p) => p.status === 'Active').length;
  const totalUsableAvailableMaterial = computedMaterials.reduce(
    (sum, m) => sum + m.availableQty,
    0
  );
  const pendingProductionPlans = productionPlans.filter(
    (p) => p.status !== 'Completed'
  );
  const pendingProductionQty = pendingProductionPlans.reduce(
    (sum, p) => sum + Number(p.manufacturingRequirement || 0),
    0
  );
  const todayEntries = productionEntries.filter((e) => e.productionDate === '2026-11-09');
  const completedTodayQty = todayEntries.reduce((sum, e) => sum + Number(e.goodOutput || 0), 0);
  const pendingDeliverySchedules = schedules.filter((s) => s.pendingQty > 0);
  const pendingDeliveriesTotalQty = pendingDeliverySchedules.reduce(
    (sum, s) => sum + Number(s.pendingQty || 0),
    0
  );

  // Chart 1: Production Overview (Planned vs Actual vs Rejected by Plan)
  const productionOverviewData = useMemo(() => {
    return productionPlans.slice(0, 6).map((plan) => {
      const entries = productionEntries.filter((e) => e.planId === plan.id);
      const actual = entries.reduce((sum, e) => sum + Number(e.actualQty || 0), 0);
      const rejected = entries.reduce((sum, e) => sum + Number(e.rejectedQty || 0), 0);
      const prod = products.find((p) => p.id === plan.productId);
      return {
        name: prod ? prod.code.replace('PRD-', '') : plan.id,
        Planned: plan.manufacturingRequirement,
        Actual: actual,
        Rejected: rejected,
      };
    });
  }, [productionPlans, productionEntries, products]);

  // Chart 2: Monthly Production Trend
  const trendData = useMemo(() => {
    return horizonFilter === '3M'
      ? monthlyProductionTrend.slice(-3)
      : monthlyProductionTrend;
  }, [horizonFilter]);

  // Chart 3: Inventory Overview (Available vs Reserved vs Shortage)
  const inventoryChartData = useMemo(() => {
    return computedMaterials.slice(0, 6).map((m) => ({
      name: m.code.replace('RM-', ''),
      Available: m.availableQty,
      Reserved: m.reservedQty,
      Shortage: Math.max(0, m.reorderLevel - m.availableQty),
    }));
  }, [computedMaterials]);

  // Chart 4: Order Status Distribution
  const orderStatusData = useMemo(() => {
    const counts = {
      Pending: 0,
      'In Production': 0,
      Completed: 0,
      Dispatched: 0,
    };
    salesOrders.forEach((so) => {
      if (so.status === 'Draft' || so.status === 'Pending') counts.Pending += 1;
      else if (counts[so.status] !== undefined) counts[so.status] += 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [salesOrders]);

  const upcomingDeliveries = useMemo(() => {
    return [...pendingDeliverySchedules]
      .sort((a, b) => new Date(a.requiredDate) - new Date(b.requiredDate))
      .slice(0, 5);
  }, [pendingDeliverySchedules]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manufacturing Operations Dashboard"
        description="Real-time local overview of production plans, raw material availability, quality queue, and customer deliveries."
        actions={
          <>
            <SecondaryButton size="sm" onClick={() => navigate('/production-planning')}>
              Production Planning
            </SecondaryButton>
            <SecondaryButton size="sm" onClick={() => navigate('/reports')}>
              View Reports
            </SecondaryButton>
          </>
        }
      />

      {/* 6 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          label="Total Customers"
          value={customers.length}
          trend={`${activeCustomersCount} active`}
          trendDirection="up"
          sublabel="OEM accounts"
          icon={Users}
          tone="blue"
          onClick={() => navigate('/customers')}
        />
        <StatCard
          label="Active Products"
          value={activeProductsCount}
          trend={`${products.length} total SKUs`}
          trendDirection="neutral"
          sublabel="BOM linked"
          icon={Package}
          tone="green"
          onClick={() => navigate('/products')}
        />
        <StatCard
          label="Raw Material Stock"
          value={formatNumber(totalUsableAvailableMaterial)}
          trend={`${lowStockMaterials.length} low stock`}
          trendDirection={lowStockMaterials.length > 0 ? 'down' : 'up'}
          sublabel="Usable unreserved"
          icon={Boxes}
          tone={lowStockMaterials.length > 0 ? 'amber' : 'green'}
          onClick={() => navigate('/inventory')}
        />
        <StatCard
          label="Pending Production Orders"
          value={pendingProductionPlans.length}
          trend={`${formatNumber(pendingProductionQty)} units`}
          trendDirection="neutral"
          sublabel="Active plans"
          icon={ClipboardList}
          tone="blue"
          onClick={() => navigate('/production-planning')}
        />
        <StatCard
          label="Completed Today"
          value={formatNumber(completedTodayQty)}
          trend={`${todayEntries.length} shift logs`}
          trendDirection="up"
          sublabel="Good output (Nos)"
          icon={Factory}
          tone="green"
          onClick={() => navigate('/production-execution')}
        />
        <StatCard
          label="Pending Deliveries"
          value={pendingDeliverySchedules.length}
          trend={`${formatNumber(pendingDeliveriesTotalQty)} units`}
          trendDirection="down"
          sublabel="Open schedules"
          icon={Truck}
          tone="amber"
          onClick={() => navigate('/dispatch')}
        />
      </div>

      {/* 4 Recharts Analytics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Production Overview"
          subtitle="Planned manufacturing requirement vs actual & rejected units"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={productionOverviewData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
              <Tooltip
                contentStyle={{
                  fontSize: '12px',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="Planned" fill="#2563EB" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Actual" fill="#16A34A" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Rejected" fill="#DC2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Monthly Production Trend"
          subtitle="Month-wise total output vs planned volume"
          actions={
            <div className="inline-flex rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden text-xs">
              {['3M', '6M'].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHorizonFilter(h)}
                  className={`px-2.5 py-1 font-medium cursor-pointer ${
                    horizonFilter === h
                      ? 'bg-[#2563EB] text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
              <Tooltip
                contentStyle={{
                  fontSize: '12px',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Area
                type="monotone"
                dataKey="planned"
                name="Planned"
                stroke="#64748B"
                fill="#E2E8F0"
                fillOpacity={0.4}
              />
              <Area
                type="monotone"
                dataKey="actual"
                name="Actual Output"
                stroke="#2563EB"
                fill="#2563EB"
                fillOpacity={0.18}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Inventory Overview"
          subtitle="Available unreserved stock, reserved allocations, and reorder shortages"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={inventoryChartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
              <Tooltip
                contentStyle={{
                  fontSize: '12px',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="Available" fill="#16A34A" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Reserved" fill="#2563EB" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Shortage" fill="#DC2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Order Status Distribution"
          subtitle="Sales order lifecycle breakdown"
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={orderStatusData}
                cx="50%"
                cy="50%"
                innerRadius={58}
                outerRadius={92}
                paddingAngle={3}
                dataKey="value"
              >
                {orderStatusData.map((entry) => (
                  <Cell key={entry.name} fill={ORDER_COLORS[entry.name] || '#64748B'} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  fontSize: '12px',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* 6 Additional Operational Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* 1. Recent Production Activity */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Recent Production Activity
            </h3>
            <button
              type="button"
              onClick={() => navigate('/production-execution')}
              className="text-xs font-medium text-[#2563EB] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs flex-1">
            {productionEntries.slice(0, 4).map((entry) => {
              const prod = products.find((p) => p.id === entry.productId);
              const mach = machines.find((m) => m.id === entry.machineId);
              return (
                <div key={entry.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 dark:text-slate-100 truncate">
                      {prod?.name || entry.productId}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {mach?.code} · {formatDate(entry.productionDate)} · {entry.operator}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold text-emerald-600 tabular-nums">
                      {entry.goodOutput} good
                    </div>
                    <StatusBadge status={entry.status} size="xs" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Upcoming Delivery Schedules */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Upcoming Delivery Schedules
            </h3>
            <button
              type="button"
              onClick={() => navigate('/schedules')}
              className="text-xs font-medium text-[#2563EB] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              Schedules <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs flex-1">
            {upcomingDeliveries.map((sch) => {
              const cust = customers.find((c) => c.id === sch.customerId);
              const prod = products.find((p) => p.id === sch.productId);
              const daysLeft = getDaysRemaining(sch.requiredDate);
              return (
                <div key={sch.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 dark:text-slate-100 truncate">
                      {cust?.name || sch.customerId}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {prod?.name} · {sch.pendingQty} pending
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-medium tabular-nums text-slate-700 dark:text-slate-200">
                      {formatDate(sch.requiredDate)}
                    </div>
                    <span
                      className={`text-[11px] font-medium ${
                        daysLeft <= 3 ? 'text-red-600' : 'text-amber-600'
                      }`}
                    >
                      {daysLeft <= 0 ? 'Due today' : `In ${daysLeft}d`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Low-Stock Materials */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Low-Stock Materials
            </h3>
            <button
              type="button"
              onClick={() => navigate('/inventory')}
              className="text-xs font-medium text-[#2563EB] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              Inventory <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs flex-1">
            {lowStockMaterials.length === 0 ? (
              <p className="text-xs text-slate-500 py-4">All usable material stocks exceed reorder levels.</p>
            ) : (
              lowStockMaterials.map((mat) => (
                <div key={mat.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 dark:text-slate-100 truncate">
                      {mat.name}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {mat.code} · Reorder: {mat.reorderLevel} {mat.uom}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold text-red-600 tabular-nums">
                      {mat.availableQty} {mat.uom}
                    </div>
                    <StatusBadge status="Low Stock" size="xs" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 4. Pending Quality Inspections */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-[#2563EB]" />
              Pending Quality Inspections
            </h3>
            <button
              type="button"
              onClick={() => navigate('/quality-control')}
              className="text-xs font-medium text-[#2563EB] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              QC Queue <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs flex-1">
            {pendingInspections.slice(0, 4).map((qc) => (
              <div key={qc.id} className="py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 dark:text-slate-100 truncate">
                    {qc.itemName}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {qc.itemType} · Batch {qc.batchNumber}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-medium tabular-nums">
                    {qc.inspectedQty} {qc.uom}
                  </div>
                  <StatusBadge status={qc.status} size="xs" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Machine Availability */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Machine Availability
            </h3>
            <button
              type="button"
              onClick={() => navigate('/machines')}
              className="text-xs font-medium text-[#2563EB] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              Machines <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs flex-1">
            {machines.slice(0, 5).map((mach) => (
              <div key={mach.id} className="py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 dark:text-slate-100 truncate">
                    {mach.code} — {mach.name}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Cap: {mach.dailyCapacity}/day · Eff: {mach.efficiency}%
                  </p>
                </div>
                <StatusBadge status={mach.status} size="xs" />
              </div>
            ))}
          </div>
        </div>

        {/* 6. Recent Purchase Orders */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Recent Purchase Orders
            </h3>
            <button
              type="button"
              onClick={() => navigate('/purchases')}
              className="text-xs font-medium text-[#2563EB] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              Purchases <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs flex-1">
            {purchaseOrders.slice(0, 4).map((po) => (
              <div
                key={po.id}
                onClick={() => navigate(`/purchases/${po.id}`)}
                className="py-2.5 flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 -mx-1 px-1 rounded"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 dark:text-slate-100">
                    {po.poNumber}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    ETA: {formatDate(po.expectedArrival)} · {po.items.length} line item(s)
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-semibold tabular-nums">
                    {formatCurrency(po.totalAmount)}
                  </div>
                  <StatusBadge status={po.status} size="xs" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
