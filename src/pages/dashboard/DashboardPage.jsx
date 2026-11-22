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
  CheckCircle2,
  Lock,
  ShoppingBag,
  Warehouse,
  Clock,
  ArrowDownToLine,
  ExternalLink,
  ShieldCheck,
  Star,
  Layers,
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
} from 'recharts';
import { PageHeader } from '../../components/layout/PageHeader';
import { StatCard } from '../../components/dashboard/StatCard';
import { ChartCard } from '../../components/charts/ChartCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { SecondaryButton } from '../../components/common/Buttons';
import { useApp } from '../../context/AppContext';
import { useErpData } from '../../context/ErpDataContext';
import { getMaterialComputedFields } from '../../services/erpService';
import { monthlyProductionTrend } from '../../data/productionData';
import { formatNumber, formatDate, formatCurrency, getDaysRemaining } from '../../utils/formatters';

export function DashboardPage() {
  const navigate = useNavigate();
  const { activeRole } = useApp();
  const isStoreRole = activeRole === 'Store';
  const [adminPerspective, setAdminPerspective] = useState('executive'); // 'executive' | 'store'
  const isStoreView = isStoreRole || adminPerspective === 'store';

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
    materialTransactions = [],
    suppliers = [],
    finishedGoods = [],
  } = useErpData();

  const [horizonFilter, setHorizonFilter] = useState('6M');

  // Computed materials for real-time inventory calculations
  const computedMaterials = useMemo(
    () => materials.map(getMaterialComputedFields),
    [materials]
  );

  const lowStockMaterials = useMemo(
    () => computedMaterials.filter((m) => m.isLowStock),
    [computedMaterials]
  );

  // ---------------------------------------------------------------------------
  // STORE DASHBOARD METRICS & DATA
  // ---------------------------------------------------------------------------
  const totalPhysicalStock = useMemo(
    () => computedMaterials.reduce((sum, m) => sum + (m.totalPhysicalStock || 0), 0),
    [computedMaterials]
  );

  const totalUsableAvailableMaterial = useMemo(
    () => computedMaterials.reduce((sum, m) => sum + (m.availableQty || 0), 0),
    [computedMaterials]
  );

  const totalReservedMaterial = useMemo(
    () => computedMaterials.reduce((sum, m) => sum + (m.reservedQty || 0), 0),
    [computedMaterials]
  );

  const totalInventoryValuation = useMemo(
    () =>
      computedMaterials.reduce(
        (sum, m) => sum + (m.totalPhysicalStock || 0) * (Number(m.unitCost) || 0),
        0
      ),
    [computedMaterials]
  );

  const qcQuarantineMaterials = useMemo(
    () =>
      computedMaterials.filter(
        (m) => (m.pendingInspectionQty || 0) > 0 || (m.rejectedQty || 0) > 0
      ),
    [computedMaterials]
  );

  const openPurchaseOrders = useMemo(
    () =>
      (purchaseOrders || [])
        .filter((po) => po.status !== 'Received' && po.status !== 'Cancelled')
        .sort((a, b) => new Date(a.expectedArrival) - new Date(b.expectedArrival)),
    [purchaseOrders]
  );

  const pendingInwardUnits = useMemo(
    () =>
      openPurchaseOrders.reduce((sum, po) => {
        const poPending = (po.items || []).reduce(
          (itemSum, it) => itemSum + Math.max(0, (it.orderedQty || 0) - (it.receivedQty || 0)),
          0
        );
        return sum + poPending;
      }, 0),
    [openPurchaseOrders]
  );

  // Store Chart 1: Raw Material Stock Allocation by Grade
  const storeAllocationData = useMemo(() => {
    return computedMaterials.slice(0, 6).map((m) => ({
      name: m.code.replace('RM-', ''),
      fullName: m.name,
      Available: m.availableQty,
      Reserved: m.reservedQty,
      'QC Hold': (m.pendingInspectionQty || 0) + (m.rejectedQty || 0),
    }));
  }, [computedMaterials]);

  // Store Chart 2: Inventory Valuation by Material Category
  const categoryValuationData = useMemo(() => {
    const map = {};
    computedMaterials.forEach((m) => {
      const cat = m.category || 'General';
      const val = (m.totalPhysicalStock || 0) * (Number(m.unitCost) || 0);
      map[cat] = (map[cat] || 0) + val;
    });
    return Object.entries(map).map(([name, valuation]) => ({
      name: name.length > 13 ? name.slice(0, 11) + '…' : name,
      fullName: name,
      Valuation: valuation,
    }));
  }, [computedMaterials]);

  // Store Chart 3: Stock Movement Volume Ledger
  const storeMovementData = useMemo(() => {
    const counts = { Inward: 0, Outward: 0, Reservation: 0, Adjustment: 0 };
    (materialTransactions || []).forEach((txn) => {
      const type = txn.type || 'Adjustment';
      const qty = Math.abs(Number(txn.quantity || 0));
      if (counts[type] !== undefined) {
        counts[type] += qty;
      } else {
        counts[type] = (counts[type] || 0) + qty;
      }
    });
    return [
      { name: 'Inward (GRN)', Units: counts.Inward, fill: '#10B981' },
      { name: 'Issued (Out)', Units: counts.Outward, fill: '#2563EB' },
      { name: 'Reserved', Units: counts.Reservation, fill: '#6366F1' },
      { name: 'Adjusted', Units: counts.Adjustment, fill: '#F59E0B' },
    ];
  }, [materialTransactions]);

  // ---------------------------------------------------------------------------
  // EXECUTIVE DASHBOARD METRICS & DATA (FOR ADMIN OVERVIEW ONLY)
  // ---------------------------------------------------------------------------
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

  const pendingProductionPlans = productionPlans.filter((p) => p.status !== 'Completed');
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

  const trendData = useMemo(() => {
    return horizonFilter === '3M' ? monthlyProductionTrend.slice(-3) : monthlyProductionTrend;
  }, [horizonFilter]);

  const inventoryChartData = useMemo(() => {
    return computedMaterials.slice(0, 6).map((m) => ({
      name: m.code.replace('RM-', ''),
      Available: m.availableQty,
      Reserved: m.reservedQty,
      Shortage: Math.max(0, m.reorderLevel - m.availableQty),
    }));
  }, [computedMaterials]);

  const upcomingDeliveries = useMemo(() => {
    return [...pendingDeliverySchedules]
      .sort((a, b) => new Date(a.requiredDate) - new Date(b.requiredDate))
      .slice(0, 5);
  }, [pendingDeliverySchedules]);

  // Perspective Switcher Button Group (Visible when Admin views the dashboard)
  const perspectiveSwitcher = activeRole === 'Admin' && (
    <div className="inline-flex rounded-lg border border-[#535F80]/25 dark:border-slate-800 p-0.5 bg-[#E7E9F0]/60 dark:bg-slate-800/60 text-xs shrink-0">
      <button
        type="button"
        onClick={() => setAdminPerspective('executive')}
        className={`px-3 py-1 font-medium rounded-md transition-colors cursor-pointer ${
          adminPerspective === 'executive'
            ? 'bg-[#081F62] text-[#FEFEFE] shadow-2xs'
            : 'text-[#535F80] dark:text-slate-400 hover:text-[#051747] dark:hover:text-slate-200'
        }`}
      >
        Executive Overview
      </button>
      <button
        type="button"
        onClick={() => setAdminPerspective('store')}
        className={`px-3 py-1 font-medium rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
          adminPerspective === 'store'
            ? 'bg-[#081F62] text-[#FEFEFE] shadow-2xs'
            : 'text-[#535F80] dark:text-slate-400 hover:text-[#051747] dark:hover:text-slate-200'
        }`}
      >
        <Warehouse className="w-3.5 h-3.5" />
        Store Operations
      </button>
    </div>
  );

  // ===========================================================================
  // RENDER: STORE OPERATIONS DASHBOARD
  // Only store, inventory, supplier, purchase receipt, and warehouse items
  // ===========================================================================
  if (isStoreView) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Store & Warehouse Operations"
          badge={
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-md bg-[#081F62]/10 dark:bg-blue-950/60 text-[#081F62] dark:text-blue-400 border border-[#081F62]/20 dark:border-blue-800/40">
              <Warehouse className="w-3.5 h-3.5" />
              Store Operations
            </span>
          }
          description="Real-time raw material stock, inventory valuation, vendor inwards, QC quarantine holds, and stock movements."
          actions={
            <div className="flex flex-wrap items-center gap-2.5">
              {perspectiveSwitcher}
              <SecondaryButton
                size="sm"
                icon={ArrowDownToLine}
                onClick={() => navigate('/stock-inward')}
              >
                Stock Inward
              </SecondaryButton>
              <SecondaryButton
                size="sm"
                icon={ShoppingBag}
                onClick={() => navigate('/purchases')}
              >
                Purchase Orders
              </SecondaryButton>
            </div>
          }
        />

        {/* 4 Store Summary StatCards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Physical Stock"
            value={`${formatNumber(totalPhysicalStock)} Units`}
            trend={`${lowStockMaterials.length} low stock alerts`}
            trendDirection={lowStockMaterials.length > 0 ? 'down' : 'up'}
            sublabel={`${materials.length} raw material grades in warehouse`}
            icon={Boxes}
            tone={lowStockMaterials.length > 0 ? 'amber' : 'blue'}
            onClick={() => navigate('/inventory')}
          />
          <StatCard
            label="Net Usable Available"
            value={`${formatNumber(totalUsableAvailableMaterial)} Units`}
            trend={`Valuation: ${formatCurrency(totalInventoryValuation)}`}
            trendDirection="up"
            sublabel="Unreserved & ready for issuance"
            icon={CheckCircle2}
            tone="green"
            onClick={() => navigate('/inventory')}
          />
          <StatCard
            label="Reserved for Production"
            value={`${formatNumber(totalReservedMaterial)} Units`}
            trend="Allocated to shop floor batches"
            trendDirection="neutral"
            sublabel="Quarantine & reserved stock held"
            icon={Lock}
            tone="blue"
            onClick={() => navigate('/inventory')}
          />
          <StatCard
            label="Pending Vendor Receipts"
            value={`${openPurchaseOrders.length} Open POs`}
            trend={`${formatNumber(pendingInwardUnits)} units awaiting delivery`}
            trendDirection={pendingInwardUnits > 0 ? 'neutral' : 'up'}
            sublabel="Incoming vendor shipments"
            icon={Truck}
            tone={openPurchaseOrders.length > 0 ? 'amber' : 'green'}
            onClick={() => navigate('/purchases')}
          />
        </div>

        {/* 3 Store Recharts Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Chart 1: Raw Material Stock Allocation by Grade */}
          <ChartCard
            title="Raw Material Allocation by Grade"
            subtitle="Available unreserved vs production reserved vs QC hold"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={storeAllocationData}
                margin={{ top: 6, right: 6, left: 0, bottom: 0 }}
              >
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
                <Bar dataKey="Available" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Reserved" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="QC Hold" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Chart 2: Inventory Valuation by Material Category */}
          <ChartCard
            title="Inventory Valuation by Category"
            subtitle="Current warehouse stock value (₹) grouped by category"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryValuationData}
                margin={{ top: 6, right: 6, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis
                  width={44}
                  tick={{ fontSize: 10, fill: '#64748B' }}
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(val) => [formatCurrency(val), 'Valuation']}
                  contentStyle={{
                    fontSize: '12px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                  }}
                />
                <Bar dataKey="Valuation" fill="#081F62" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Chart 3: Stock Movement Volume Ledger */}
          <ChartCard
            title="Store Movement Activity"
            subtitle="Units processed by transaction type"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={storeMovementData}
                margin={{ top: 6, right: 6, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis width={36} tick={{ fontSize: 10, fill: '#64748B' }} />
                <Tooltip
                  formatter={(val) => [`${formatNumber(val)} Units`, 'Volume']}
                  contentStyle={{
                    fontSize: '12px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                  }}
                />
                <Bar dataKey="Units" fill="#6366F1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* 6 Store Operational Widget Sections (3x2 Grid) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* 1. Low-Stock & Reorder Alerts */}
          <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-4 shadow-2xs flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#051747] dark:text-slate-100 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Low-Stock &amp; Reorder Alerts
              </h3>
              <button
                type="button"
                onClick={() => navigate('/inventory')}
                className="text-xs font-medium text-[#081F62] dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                Inventory <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="divide-y divide-[#E7E9F0] dark:divide-slate-800 text-xs flex-1">
              {lowStockMaterials.length === 0 ? (
                <div className="py-6 text-center text-slate-500">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                  <p>All raw material stocks exceed minimum reorder thresholds.</p>
                </div>
              ) : (
                lowStockMaterials.map((mat) => {
                  const shortage = Math.max(0, mat.reorderLevel - mat.availableQty);
                  return (
                    <div
                      key={mat.id}
                      onClick={() => navigate('/inventory')}
                      className="py-2.5 flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 -mx-1 px-1 rounded transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-[#051747] dark:text-slate-100 truncate">
                          {mat.name}
                        </p>
                        <p className="text-[11px] text-[#535F80] dark:text-slate-400">
                          {mat.code} · Reorder: {mat.reorderLevel} {mat.uom}
                          {shortage > 0 && ` (Deficit: ${shortage})`}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-semibold text-red-600 tabular-nums">
                          {mat.availableQty} {mat.uom}
                        </div>
                        <StatusBadge status="Low Stock" size="xs" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 2. Incoming Vendor Shipments (Open POs) */}
          <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-4 shadow-2xs flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#051747] dark:text-slate-100 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-[#081F62] dark:text-blue-400" />
                Incoming Vendor Shipments
              </h3>
              <button
                type="button"
                onClick={() => navigate('/purchases')}
                className="text-xs font-medium text-[#081F62] dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                Purchases <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="divide-y divide-[#E7E9F0] dark:divide-slate-800 text-xs flex-1">
              {openPurchaseOrders.length === 0 ? (
                <div className="py-6 text-center text-slate-500">
                  <Truck className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                  <p>No open purchase orders pending delivery.</p>
                </div>
              ) : (
                openPurchaseOrders.slice(0, 4).map((po) => {
                  const sup = suppliers.find((s) => s.id === po.supplierId);
                  const daysLeft = getDaysRemaining(po.expectedArrival);
                  return (
                    <div
                      key={po.id}
                      onClick={() => navigate(`/purchases/${po.id}`)}
                      className="py-2.5 flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 -mx-1 px-1 rounded transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-[#051747] dark:text-slate-100 truncate">
                          {po.poNumber} — {sup?.name || po.supplierId}
                        </p>
                        <p className="text-[11px] text-[#535F80] dark:text-slate-400">
                          ETA: {formatDate(po.expectedArrival)} · {po.items?.length || 0} line item(s)
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                          {formatCurrency(po.totalAmount)}
                        </div>
                        <span
                          className={`text-[10px] font-medium block ${
                            daysLeft <= 2 ? 'text-red-600' : 'text-amber-600'
                          }`}
                        >
                          {daysLeft <= 0 ? 'Due today' : `In ${daysLeft}d`}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 3. QC Inspection Holds & Quarantine Store */}
          <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-4 shadow-2xs flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#051747] dark:text-slate-100 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                QC Quarantine &amp; Inspection Holds
              </h3>
              <button
                type="button"
                onClick={() => navigate('/inventory')}
                className="text-xs font-medium text-[#081F62] dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                Inventory <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="divide-y divide-[#E7E9F0] dark:divide-slate-800 text-xs flex-1">
              {qcQuarantineMaterials.length === 0 ? (
                <div className="py-6 text-center text-slate-500">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                  <p>No raw materials currently in QC hold or quarantine bay.</p>
                </div>
              ) : (
                qcQuarantineMaterials.slice(0, 4).map((mat) => (
                  <div
                    key={mat.id}
                    onClick={() => navigate('/inventory')}
                    className="py-2.5 flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 -mx-1 px-1 rounded transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-[#051747] dark:text-slate-100 truncate">
                        {mat.name}
                      </p>
                      <p className="text-[11px] text-[#535F80] dark:text-slate-400">
                        {mat.code} · Location: {mat.location || 'Rack Q-01'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {mat.pendingInspectionQty > 0 && (
                        <span className="text-[11px] font-semibold text-amber-600 block tabular-nums">
                          {mat.pendingInspectionQty} {mat.uom} In QC
                        </span>
                      )}
                      {mat.rejectedQty > 0 && (
                        <span className="text-[11px] font-semibold text-red-600 block tabular-nums">
                          {mat.rejectedQty} {mat.uom} Scrap
                        </span>
                      )}
                      <StatusBadge
                        status={mat.rejectedQty > 0 ? 'Rejected' : 'Pending Inspection'}
                        size="xs"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 4. Recent Store Movements (Stock Ledger) */}
          <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-4 shadow-2xs flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#051747] dark:text-slate-100 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#081F62] dark:text-blue-400" />
                Recent Store Movements
              </h3>
              <button
                type="button"
                onClick={() => navigate('/inventory')}
                className="text-xs font-medium text-[#081F62] dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                View Ledger <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="divide-y divide-[#E7E9F0] dark:divide-slate-800 text-xs flex-1">
              {(materialTransactions || []).slice(0, 4).map((txn) => {
                const mat = materials.find((m) => m.id === txn.materialId);
                const isInward = txn.type === 'Inward';
                const isOutward = txn.type === 'Outward';
                return (
                  <div key={txn.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-[#051747] dark:text-slate-100 truncate">
                        {txn.reference || txn.id} — {mat?.name || txn.materialId}
                      </p>
                      <p className="text-[11px] text-[#535F80] dark:text-slate-400 truncate">
                        {txn.timestamp} · {txn.performedBy}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div
                        className={`font-semibold tabular-nums ${
                          isInward
                            ? 'text-emerald-600'
                            : isOutward
                            ? 'text-blue-600'
                            : 'text-[#051747] dark:text-slate-200'
                        }`}
                      >
                        {txn.quantity > 0 ? `+${txn.quantity}` : txn.quantity} {mat?.uom || 'Kg'}
                      </div>
                      <StatusBadge status={txn.type} size="xs" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. Approved Suppliers & Lead Times */}
          <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-4 shadow-2xs flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#051747] dark:text-slate-100 flex items-center gap-1.5">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                Approved Suppliers &amp; Lead Times
              </h3>
              <button
                type="button"
                onClick={() => navigate('/suppliers')}
                className="text-xs font-medium text-[#081F62] dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                Suppliers <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="divide-y divide-[#E7E9F0] dark:divide-slate-800 text-xs flex-1">
              {(suppliers || []).slice(0, 4).map((sup) => (
                <div
                  key={sup.id}
                  onClick={() => navigate('/suppliers')}
                  className="py-2.5 flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 -mx-1 px-1 rounded transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-[#051747] dark:text-slate-100 truncate">
                      {sup.name}
                    </p>
                    <p className="text-[11px] text-[#535F80] dark:text-slate-400">
                      {sup.category} · {sup.leadTimeDays}d lead time
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold text-amber-600 tabular-nums">
                      {sup.rating} ★
                    </div>
                    <StatusBadge status={sup.status || 'Active'} size="xs" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 6. Warehouse Finished Goods Stock */}
          <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-4 shadow-2xs flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#051747] dark:text-slate-100 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#081F62] dark:text-blue-400" />
                Warehouse Finished Goods Stock
              </h3>
              <button
                type="button"
                onClick={() => navigate('/finished-goods')}
                className="text-xs font-medium text-[#081F62] dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                Finished Goods <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="divide-y divide-[#E7E9F0] dark:divide-slate-800 text-xs flex-1">
              {(finishedGoods || []).slice(0, 4).map((fg) => {
                const prod = products.find((p) => p.id === fg.productId);
                return (
                  <div
                    key={fg.id}
                    onClick={() => navigate('/finished-goods')}
                    className="py-2.5 flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 -mx-1 px-1 rounded transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-[#051747] dark:text-slate-100 truncate">
                        {prod?.name || fg.productId}
                      </p>
                      <p className="text-[11px] text-[#535F80] dark:text-slate-400">
                        Batch: {fg.batchNumber} · Loc: {fg.storageLocation}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold text-emerald-600 tabular-nums">
                        {fg.acceptedQty} Nos
                      </div>
                      <StatusBadge status="Accepted" size="xs" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // RENDER: EXECUTIVE OVERVIEW DASHBOARD (ADMIN DEFAULT)
  // ===========================================================================
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Real-time plant overview of production plans, raw material availability, company funds, pending billing, and customer deliveries."
        actions={perspectiveSwitcher}
      />

      {/* 4 Executive Summary Cards */}
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

      {/* 3 Executive Recharts Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ChartCard
          title="Production Overview"
          subtitle="Planned requirement vs actual & rejected units"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={productionOverviewData}
              margin={{ top: 6, right: 6, left: 0, bottom: 0 }}
            >
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
            <BarChart
              data={inventoryChartData}
              margin={{ top: 6, right: 6, left: 0, bottom: 0 }}
            >
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
      </div>

      {/* 6 Executive Operational Sections */}
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
              <p className="text-xs text-slate-500 py-4">
                All usable material stocks exceed reorder levels.
              </p>
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
