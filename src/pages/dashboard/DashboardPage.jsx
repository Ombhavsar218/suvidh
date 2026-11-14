import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Boxes,
  ClipboardList,
  Factory,
  Truck,
  AlertTriangle,
  ArrowRight,
  Wallet,
  Receipt,
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
  // PieChart,
  // Pie,
  // Cell,
} from 'recharts';
import { PageHeader } from '../../components/layout/PageHeader';
import { StatCard } from '../../components/dashboard/StatCard';
import { ChartCard } from '../../components/charts/ChartCard';
import { StatusBadge } from '../../components/common/StatusBadge';
// import { SecondaryButton } from '../../components/common/Buttons';
import { useErpData } from '../../context/ErpDataContext';
import { getMaterialComputedFields } from '../../services/erpService';
import { monthlyProductionTrend } from '../../data/productionData';
import { formatNumber, formatDate, formatCurrency, getDaysRemaining } from '../../utils/formatters';

/*
const ORDER_COLORS = {
  Pending: '#D97706',
  'In Production': '#2563EB',
  Completed: '#16A34A',
  Dispatched: '#4F46E5',
};
*/

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
    financeTransactions,
    billingDocuments,
    // salesOrders,
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

  const companyFunds = useMemo(() => {
    const settledInflow = financeTransactions
      .filter((t) => t.type === 'Income' && t.paymentStatus !== 'Pending')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const settledOutflow = financeTransactions
      .filter((t) => t.type === 'Expense' && t.paymentStatus === 'Paid')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const pendingReceivable = financeTransactions
      .filter((t) => t.type === 'Income' && t.paymentStatus === 'Pending')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const pendingPayable = financeTransactions
      .filter((t) => t.type === 'Expense' && t.paymentStatus !== 'Paid')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const remainingCash = settledInflow - settledOutflow;
    const netProjected = remainingCash + pendingReceivable - pendingPayable;

    return {
      settledInflow,
      settledOutflow,
      pendingReceivable,
      pendingPayable,
      remainingCash,
      netProjected,
    };
  }, [financeTransactions]);

  const pendingBilling = useMemo(() => {
    const items = billingDocuments
      .map((bill) => {
        const amount = Number(bill.amount || 0);
        const paid = Number(bill.paidAmount || 0);
        const balance = Math.max(0, amount - paid);
        const cust = customers.find((c) => c.id === bill.customerId);
        return {
          ...bill,
          customerName: cust?.name || bill.customerId,
          balance,
        };
      })
      .filter((bill) => bill.balance > 0)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    const totalDue = items.reduce((sum, bill) => sum + bill.balance, 0);
    return { items, totalDue };
  }, [billingDocuments, customers]);

  // Summary metrics
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

  /* Chart 4: Order Status Distribution (Commented out)
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
  */

  const upcomingDeliveries = useMemo(() => {
    return [...pendingDeliverySchedules]
      .sort((a, b) => new Date(a.requiredDate) - new Date(b.requiredDate))
      .slice(0, 5);
  }, [pendingDeliverySchedules]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Real-time local overview of production plans, raw material availability, company funds, pending billing, and customer deliveries."
      />
      {/*
        Commented header quick-action buttons:
        <SecondaryButton size="sm" onClick={() => navigate('/production-planning')}>
          Production Planning
        </SecondaryButton>
        <SecondaryButton size="sm" onClick={() => navigate('/reports')}>
          View Reports
        </SecondaryButton>
      */}

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* 3 Recharts Analytics Cards (3-column layout on desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ChartCard
          title="Production Overview"
          subtitle="Planned requirement vs actual & rejected units"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={productionOverviewData} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748B' }} />
              <YAxis width={34} tick={{ fontSize: 10, fill: '#64748B' }} />
              <Tooltip
                contentStyle={{
                  fontSize: '12px',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
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
            <div className="inline-flex rounded-md border border-[#535F80]/30 dark:border-slate-700 overflow-hidden text-xs">
              {['3M', '6M'].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHorizonFilter(h)}
                  className={`px-2 py-0.5 font-medium cursor-pointer ${
                    horizonFilter === h
                      ? 'bg-[#081F62] text-white'
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
            <AreaChart data={trendData} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748B' }} />
              <YAxis width={36} tick={{ fontSize: 10, fill: '#64748B' }} />
              <Tooltip
                contentStyle={{
                  fontSize: '12px',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
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
          subtitle="Available unreserved stock, reserved & shortages"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={inventoryChartData} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748B' }} />
              <YAxis width={36} tick={{ fontSize: 10, fill: '#64748B' }} />
              <Tooltip
                contentStyle={{
                  fontSize: '12px',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="Available" fill="#16A34A" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Reserved" fill="#2563EB" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Shortage" fill="#DC2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Order Status Distribution (Commented out)
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
                innerRadius={38}
                outerRadius={62}
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
              <Legend wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        */}
      </div>

      {/* 6 Additional Operational Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* 1. Company Funds Remaining */}
        <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-4 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#051747] dark:text-slate-100 flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-[#081F62]" />
              Company Funds Remaining
            </h3>
            <button
              type="button"
              onClick={() => navigate('/finance')}
              className="text-xs font-medium text-[#081F62] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              Finance <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="rounded-md bg-[#E7E9F0]/60 dark:bg-slate-800/50 border border-[#535F80]/15 dark:border-slate-800 px-3 py-2.5 mb-2 flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-medium text-[#535F80] dark:text-slate-400">
                Available Cash Balance
              </p>
              <p
                className={`text-lg font-bold tabular-nums mt-0.5 ${
                  companyFunds.remainingCash >= 0
                    ? 'text-[#051747] dark:text-slate-100'
                    : 'text-red-600'
                }`}
              >
                {formatCurrency(companyFunds.remainingCash)}
              </p>
            </div>
            <div className="text-right">
              <span
                className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-md border whitespace-nowrap ${
                  companyFunds.remainingCash >= 0
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60'
                    : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800/60'
                }`}
              >
                {companyFunds.remainingCash >= 0 ? 'Positive Cash' : 'Deficit'}
              </span>
              <p className="text-[10px] text-[#535F80] dark:text-slate-400 mt-1 tabular-nums">
                Net: {formatCurrency(companyFunds.netProjected)}
              </p>
            </div>
          </div>

          <div className="divide-y divide-[#E7E9F0] dark:divide-slate-800 text-xs flex-1">
            <div className="py-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-[#051747] dark:text-slate-100">Settled Receipts</p>
                <p className="text-[11px] text-[#535F80] dark:text-slate-400">
                  Paid &amp; partial customer inflows
                </p>
              </div>
              <span className="font-semibold text-emerald-600 tabular-nums shrink-0">
                + {formatCurrency(companyFunds.settledInflow)}
              </span>
            </div>

            <div className="py-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-[#051747] dark:text-slate-100">Expenses Paid</p>
                <p className="text-[11px] text-[#535F80] dark:text-slate-400">
                  Material, power &amp; maintenance paid
                </p>
              </div>
              <span className="font-semibold text-red-600 tabular-nums shrink-0">
                - {formatCurrency(companyFunds.settledOutflow)}
              </span>
            </div>

            <div className="py-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-[#051747] dark:text-slate-100">
                  Pending Receivables
                </p>
                <p className="text-[11px] text-[#535F80] dark:text-slate-400">
                  Expected client settlements
                </p>
              </div>
              <span className="font-semibold text-[#081F62] dark:text-blue-400 tabular-nums shrink-0">
                + {formatCurrency(companyFunds.pendingReceivable)}
              </span>
            </div>

            <div className="py-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-[#051747] dark:text-slate-100">
                  Pending Payables
                </p>
                <p className="text-[11px] text-[#535F80] dark:text-slate-400">
                  Unsettled vendor &amp; tooling dues
                </p>
              </div>
              <span className="font-semibold text-amber-600 tabular-nums shrink-0">
                - {formatCurrency(companyFunds.pendingPayable)}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Upcoming Delivery Schedules */}
        <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-4 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#051747] dark:text-slate-100">
              Upcoming Delivery Schedules
            </h3>
            <button
              type="button"
              onClick={() => navigate('/schedules')}
              className="text-xs font-medium text-[#081F62] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              Schedules <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-[#E7E9F0] dark:divide-slate-800 text-xs flex-1">
            {upcomingDeliveries.map((sch) => {
              const cust = customers.find((c) => c.id === sch.customerId);
              const prod = products.find((p) => p.id === sch.productId);
              const daysLeft = getDaysRemaining(sch.requiredDate);
              return (
                <div key={sch.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-[#051747] dark:text-slate-100 truncate">
                      {cust?.name || sch.customerId}
                    </p>
                    <p className="text-[11px] text-[#535F80] dark:text-slate-400 truncate">
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
        <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-4 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#051747] dark:text-slate-100 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Low-Stock Materials
            </h3>
            <button
              type="button"
              onClick={() => navigate('/inventory')}
              className="text-xs font-medium text-[#081F62] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              Inventory <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-[#E7E9F0] dark:divide-slate-800 text-xs flex-1">
            {lowStockMaterials.length === 0 ? (
              <p className="text-xs text-slate-500 py-4">All usable material stocks exceed reorder levels.</p>
            ) : (
              lowStockMaterials.map((mat) => (
                <div key={mat.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-[#051747] dark:text-slate-100 truncate">
                      {mat.name}
                    </p>
                    <p className="text-[11px] text-[#535F80] dark:text-slate-400">
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

        {/* 4. Recent Production Activity */}
        <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-4 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#051747] dark:text-slate-100">
              Recent Production Activity
            </h3>
            <button
              type="button"
              onClick={() => navigate('/production-execution')}
              className="text-xs font-medium text-[#081F62] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-[#E7E9F0] dark:divide-slate-800 text-xs flex-1">
            {productionEntries.slice(0, 4).map((entry) => {
              const prod = products.find((p) => p.id === entry.productId);
              const mach = machines.find((m) => m.id === entry.machineId);
              return (
                <div key={entry.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-[#051747] dark:text-slate-100 truncate">
                      {prod?.name || entry.productId}
                    </p>
                    <p className="text-[11px] text-[#535F80] dark:text-slate-400">
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

        {/* 5. Pending Billing & Invoices */}
        <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-4 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#051747] dark:text-slate-100 flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-[#081F62]" />
              Pending Billing &amp; Invoices
            </h3>
            <button
              type="button"
              onClick={() => navigate('/billing')}
              className="text-xs font-medium text-[#081F62] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              Billing <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="rounded-md bg-[#E7E9F0]/60 dark:bg-slate-800/50 border border-[#535F80]/15 dark:border-slate-800 px-3 py-2 mb-2 flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-[#535F80] dark:text-slate-400">
              Total Outstanding ({pendingBilling.items.length}{' '}
              {pendingBilling.items.length === 1 ? 'bill' : 'bills'})
            </span>
            <span className="text-sm font-bold text-[#051747] dark:text-slate-100 tabular-nums">
              {formatCurrency(pendingBilling.totalDue)}
            </span>
          </div>

          <div className="divide-y divide-[#E7E9F0] dark:divide-slate-800 text-xs flex-1">
            {pendingBilling.items.length === 0 ? (
              <p className="text-xs text-slate-500 py-4">
                All customer billing documents are settled.
              </p>
            ) : (
              pendingBilling.items.slice(0, 4).map((bill) => (
                <div
                  key={bill.id}
                  onClick={() => navigate('/billing')}
                  className="py-2.5 flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 -mx-1 px-1 rounded"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-[#051747] dark:text-slate-100 truncate">
                      {bill.customerName}
                    </p>
                    <p className="text-[11px] text-[#535F80] dark:text-slate-400">
                      {bill.documentNumber} · Due {formatDate(bill.dueDate)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold text-amber-600 tabular-nums">
                      {formatCurrency(bill.balance)}
                    </div>
                    <StatusBadge status={bill.status} size="xs" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 6. Recent Purchase Orders */}
        <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-4 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#051747] dark:text-slate-100">
              Recent Purchase Orders
            </h3>
            <button
              type="button"
              onClick={() => navigate('/purchases')}
              className="text-xs font-medium text-[#081F62] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              Purchases <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-[#E7E9F0] dark:divide-slate-800 text-xs flex-1">
            {purchaseOrders.slice(0, 4).map((po) => (
              <div
                key={po.id}
                onClick={() => navigate(`/purchases/${po.id}`)}
                className="py-2.5 flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 -mx-1 px-1 rounded"
              >
                <div className="min-w-0">
                  <p className="font-medium text-[#051747] dark:text-slate-100">
                    {po.poNumber}
                  </p>
                  <p className="text-[11px] text-[#535F80] dark:text-slate-400">
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
