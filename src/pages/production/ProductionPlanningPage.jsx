import { useState, useMemo } from 'react';
import {
  Plus,
  Edit2,
  History,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Calendar,
  Boxes,
  ClipboardList,
  BarChart2,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { PrimaryButton, SecondaryButton } from '../../components/common/Buttons';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { StatCard } from '../../components/dashboard/StatCard';
import { DataTable } from '../../components/tables/DataTable';
import { SearchInput, FilterDropdown } from '../../components/forms/Filters';
import { FormInput, FormSelect, FormTextarea } from '../../components/forms/FormFields';
import { useErpData } from '../../context/ErpDataContext';
import { useTableState } from '../../hooks/useTableState';
import {
  computePlanMaterialRequirements,
  computeMachineCapacityCheck,
  getFinishedGoodComputedFields,
} from '../../services/erpService';
import {
  calculateProductionPriority,
  formatDate,
  formatNumber,
  getDaysRemaining,
} from '../../utils/formatters';

export function ProductionPlanningPage() {
  const {
    productionPlans,
    customers,
    products,
    boms,
    materials,
    machines,
    finishedGoods,
    schedules,
    saveProductionPlan,
  } = useErpData();

  const [modalOpen, setModalOpen] = useState(false);
  const [revisionModalPlan, setRevisionModalPlan] = useState(null);
  const [priorityModalPlan, setPriorityModalPlan] = useState(null);
  const [formError, setFormError] = useState('');

  const [form, setForm] = useState({
    id: '',
    customerId: '',
    productId: '',
    scheduleNumber: '',
    requiredQty: 100,
    availableFinishedStock: 0,
    assignedMachineId: '',
    plannedStartDate: '2026-11-10',
    plannedCompletionDate: '2026-11-12',
    deliveryUrgencyScore: 75,
    status: 'Planned',
    notes: '',
    revisionNote: '',
  });

  // Available accepted finished stock per product
  const fgAvailableByProduct = useMemo(() => {
    const map = {};
    finishedGoods.forEach((fg) => {
      const comp = getFinishedGoodComputedFields(fg);
      map[fg.productId] = (map[fg.productId] || 0) + comp.availableQty;
    });
    return map;
  }, [finishedGoods]);

  const enrichedPlans = useMemo(() => {
    return productionPlans.map((plan) => {
      const cust = customers.find((c) => c.id === plan.customerId);
      const prod = products.find((p) => p.id === plan.productId);
      const mach = machines.find((m) => m.id === plan.assignedMachineId);
      const matCheck = computePlanMaterialRequirements(
        plan.productId,
        plan.manufacturingRequirement,
        boms,
        materials
      );
      const capCheck = computeMachineCapacityCheck(
        mach,
        plan.plannedStartDate,
        plan.plannedCompletionDate,
        plan.manufacturingRequirement
      );
      const isCompatible = mach
        ? (mach.supportedProductIds || []).includes(plan.productId)
        : false;
      const priority = calculateProductionPriority({
        deliveryUrgencyScore: plan.deliveryUrgencyScore ?? 75,
        customerPriorityScore: plan.customerPriorityScore ?? cust?.priorityScore ?? 75,
        materialReadinessScore: matCheck.hasBom
          ? matCheck.readinessScore
          : plan.materialReadinessScore ?? 80,
        machineEfficiencyScore: mach?.efficiency ?? plan.machineEfficiencyScore ?? 85,
      });

      return {
        ...plan,
        customerName: cust?.name || plan.customerId,
        productName: prod?.name || plan.productId,
        productCode: prod?.code || '',
        machineCode: mach?.code || 'Unassigned',
        machineName: mach?.name || '',
        machineCapacity: mach?.dailyCapacity || 0,
        isCompatible,
        matCheck,
        capCheck,
        priority,
      };
    });
  }, [productionPlans, customers, products, machines, boms, materials]);

  // Planning dashboard summary stats
  const summaryStats = useMemo(() => {
    const pendingPlans = enrichedPlans.filter((p) => p.status !== 'Completed');
    const totalPendingUnits = pendingPlans.reduce(
      (s, p) => s + Number(p.manufacturingRequirement || 0),
      0
    );
    const shortagePlans = pendingPlans.filter((p) => p.matCheck.hasShortage).length;
    const availableMachines = machines.filter((m) => m.status === 'Available').length;
    const plannedQtyTotal = enrichedPlans.reduce(
      (s, p) => s + Number(p.manufacturingRequirement || 0),
      0
    );
    const upcomingDeadlines = schedules.filter(
      (s) => s.pendingQty > 0 && getDaysRemaining(s.requiredDate) <= 7
    ).length;

    return {
      totalPendingUnits,
      pendingPlansCount: pendingPlans.length,
      shortagePlans,
      availableMachines,
      totalActiveMachines: machines.filter((m) => m.status !== 'Inactive').length,
      plannedQtyTotal,
      upcomingDeadlines,
    };
  }, [enrichedPlans, machines, schedules]);

  const table = useTableState(enrichedPlans, {
    initialPageSize: 8,
    initialSortKey: 'plannedStartDate',
    searchFields: ['id', 'customerName', 'productName', 'productCode', 'machineCode', 'status'],
  });

  const openCreateModal = () => {
    const defaultProd = products.find((p) => p.status === 'Active') || products[0];
    const defaultCust = customers.find((c) => c.status === 'Active') || customers[0];
    const compatibleMach =
      machines.find(
        (m) =>
          m.status !== 'Inactive' &&
          (m.supportedProductIds || []).includes(defaultProd?.id)
      ) || machines[0];

    setForm({
      id: '',
      customerId: defaultCust?.id || '',
      productId: defaultProd?.id || '',
      scheduleNumber: '',
      requiredQty: 120,
      availableFinishedStock: fgAvailableByProduct[defaultProd?.id] || 0,
      assignedMachineId: compatibleMach?.id || '',
      plannedStartDate: '2026-11-10',
      plannedCompletionDate: '2026-11-12',
      deliveryUrgencyScore: 80,
      status: 'Planned',
      notes: '',
      revisionNote: 'Initial production plan created.',
    });
    setFormError('');
    setModalOpen(true);
  };

  const openReviseModal = (plan) => {
    setForm({
      ...plan,
      revisionNote: '',
    });
    setFormError('');
    setModalOpen(true);
  };

  // Live form validations inside Create/Revise modal
  const formMfgRequirement = Math.max(
    0,
    Number(form.requiredQty || 0) - Number(form.availableFinishedStock || 0)
  );
  const selectedMachine = machines.find((m) => m.id === form.assignedMachineId);
  const isFormMachineCompatible = selectedMachine
    ? (selectedMachine.supportedProductIds || []).includes(form.productId)
    : false;
  const formCapacityCheck = computeMachineCapacityCheck(
    selectedMachine,
    form.plannedStartDate,
    form.plannedCompletionDate,
    formMfgRequirement
  );
  const formMaterialCheck = computePlanMaterialRequirements(
    form.productId,
    formMfgRequirement,
    boms,
    materials
  );
  const formCustomer = customers.find((c) => c.id === form.customerId);
  const formPriorityPreview = calculateProductionPriority({
    deliveryUrgencyScore: Number(form.deliveryUrgencyScore || 0),
    customerPriorityScore: formCustomer?.priorityScore || 75,
    materialReadinessScore: formMaterialCheck.readinessScore,
    machineEfficiencyScore: selectedMachine?.efficiency || 85,
  });

  const handleSavePlan = (e) => {
    e.preventDefault();
    if (!form.customerId || !form.productId || !form.assignedMachineId) {
      setFormError('Customer, Product, and Assigned Machine are required.');
      return;
    }
    if (selectedMachine?.status === 'Inactive' || selectedMachine?.status === 'Maintenance') {
      setFormError(
        `Machine ${selectedMachine.code} is currently ${selectedMachine.status}. Select an Available or In Use machine.`
      );
      return;
    }
    if (!isFormMachineCompatible) {
      setFormError(
        `Compatibility check failed: ${selectedMachine?.code} does not support the selected product.`
      );
      return;
    }
    if (!formCapacityCheck.valid) {
      setFormError(formCapacityCheck.message);
      return;
    }

    const nextStatus =
      formMaterialCheck.hasShortage && form.status === 'Planned'
        ? 'Material Shortage'
        : form.status;

    saveProductionPlan(
      {
        id: form.id || undefined,
        customerId: form.customerId,
        productId: form.productId,
        scheduleNumber: form.scheduleNumber,
        requiredQty: Number(form.requiredQty),
        availableFinishedStock: Number(form.availableFinishedStock),
        manufacturingRequirement: formMfgRequirement,
        assignedMachineId: form.assignedMachineId,
        plannedStartDate: form.plannedStartDate,
        plannedCompletionDate: form.plannedCompletionDate,
        deliveryUrgencyScore: Number(form.deliveryUrgencyScore),
        customerPriorityScore: formCustomer?.priorityScore || 75,
        materialReadinessScore: formMaterialCheck.readinessScore,
        machineEfficiencyScore: selectedMachine?.efficiency || 85,
        status: nextStatus,
        notes: form.notes,
      },
      form.revisionNote || (form.id ? 'Revised plan schedule & resource allocation.' : 'Initial plan created.')
    );
    setModalOpen(false);
  };

  const columns = [
    {
      key: 'id',
      label: 'Plan ID',
      sortable: true,
      render: (r) => (
        <div>
          <span className="font-mono text-xs font-semibold text-[#2563EB]">{r.id}</span>
          <div className="text-[10px] text-slate-400">Rev {r.revision || 1}</div>
        </div>
      ),
    },
    { key: 'customerName', label: 'Customer', sortable: true },
    {
      key: 'productName',
      label: 'Product',
      sortable: true,
      render: (r) => (
        <div>
          <div className="font-medium text-xs text-slate-900 dark:text-slate-100">{r.productName}</div>
          <div className="text-[10px] font-mono text-slate-400">{r.productCode}</div>
        </div>
      ),
    },
    {
      key: 'requiredQty',
      label: 'Req. Qty',
      align: 'right',
      numeric: true,
      render: (r) => formatNumber(r.requiredQty),
    },
    {
      key: 'availableFinishedStock',
      label: 'FG Stock',
      align: 'right',
      numeric: true,
      render: (r) => <span className="text-slate-500">{formatNumber(r.availableFinishedStock)}</span>,
    },
    {
      key: 'manufacturingRequirement',
      label: 'Mfg Req.',
      align: 'right',
      numeric: true,
      sortable: true,
      render: (r) => (
        <div>
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {formatNumber(r.manufacturingRequirement)}
          </span>
          {r.matCheck.hasShortage && (
            <div className="text-[10px] text-red-600 font-medium flex items-center justify-end gap-0.5">
              <AlertTriangle className="w-2.5 h-2.5" /> Material Short
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'machineCode',
      label: 'Assigned Machine',
      render: (r) => (
        <div>
          <div className="font-mono text-xs font-semibold">{r.machineCode}</div>
          <div className="text-[10px] text-slate-500">
            {r.capCheck.utilizationPct}% cap · {r.isCompatible ? 'Compatible' : 'Check Compat!'}
          </div>
        </div>
      ),
    },
    {
      key: 'plannedStartDate',
      label: 'Planned Start',
      sortable: true,
      render: (r) => <span className="text-xs tabular-nums">{formatDate(r.plannedStartDate)}</span>,
    },
    {
      key: 'plannedCompletionDate',
      label: 'Completion',
      sortable: true,
      render: (r) => <span className="text-xs tabular-nums">{formatDate(r.plannedCompletionDate)}</span>,
    },
    {
      key: 'priority',
      label: 'Priority Score',
      render: (r) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setPriorityModalPlan(r);
          }}
          className="text-left group cursor-pointer"
          title="Click to inspect priority score breakdown (40/25/20/15)"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold tabular-nums text-slate-900 dark:text-slate-100 group-hover:text-[#2563EB]">
              {r.priority.totalScore}
            </span>
            <StatusBadge status={r.priority.level} size="xs" />
          </div>
          <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex mt-1">
            <div style={{ width: `${r.priority.breakdown[0].weighted}%` }} className="bg-[#2563EB]" />
            <div style={{ width: `${r.priority.breakdown[1].weighted}%` }} className="bg-indigo-500" />
            <div style={{ width: `${r.priority.breakdown[2].weighted}%` }} className="bg-emerald-500" />
            <div style={{ width: `${r.priority.breakdown[3].weighted}%` }} className="bg-amber-500" />
          </div>
        </button>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (r) => <StatusBadge status={r.status} size="xs" />,
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (r) => (
        <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => openReviseModal(r)}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-[#2563EB] cursor-pointer"
            title="Revise Production Plan"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setRevisionModalPlan(r)}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-[#2563EB] cursor-pointer"
            title="View Plan Revisions"
          >
            <History className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Production Planning"
        description="Schedule manufacturing batches with machine compatibility, capacity validation, BOM material checks, and weighted priority scoring."
        actions={
          <PrimaryButton icon={Plus} onClick={openCreateModal}>
            Create Production Plan
          </PrimaryButton>
        }
      />

      {/* 5 Planning Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Total Pending Production"
          value={formatNumber(summaryStats.totalPendingUnits)}
          sublabel={`${summaryStats.pendingPlansCount} active plans`}
          icon={ClipboardList}
          tone="blue"
        />
        <StatCard
          label="Material Shortages"
          value={summaryStats.shortagePlans}
          sublabel="Plans with BOM gaps"
          icon={Boxes}
          tone={summaryStats.shortagePlans > 0 ? 'red' : 'green'}
        />
        <StatCard
          label="Available Machines"
          value={`${summaryStats.availableMachines} / ${summaryStats.totalActiveMachines}`}
          sublabel="Ready for allocation"
          icon={Cpu}
          tone="green"
        />
        <StatCard
          label="Planned Production Qty"
          value={formatNumber(summaryStats.plannedQtyTotal)}
          sublabel="Total mfg requirement"
          icon={BarChart2}
          tone="slate"
        />
        <StatCard
          label="Upcoming Deadlines"
          value={summaryStats.upcomingDeadlines}
          sublabel="Due within 7 days"
          icon={Calendar}
          tone="amber"
        />
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3">
        <SearchInput
          value={table.search}
          onChange={table.setSearch}
          placeholder="Search plan ID, customer, product, machine..."
          className="w-full sm:w-80"
        />
        <FilterDropdown
          label="Status"
          value={table.filters.status}
          onChange={(val) => table.setFilter('status', val)}
          options={['Planned', 'In Progress', 'Material Shortage', 'Completed']}
        />
      </div>

      <DataTable
        columns={columns}
        data={table.paginatedData}
        sortKey={table.sortKey}
        sortDir={table.sortDir}
        onSort={table.handleSort}
        onRowClick={(r) => setPriorityModalPlan(r)}
        pagination={{
          page: table.page,
          totalPages: table.totalPages,
          totalItems: table.totalItems,
          pageSize: table.pageSize,
          onPageChange: table.setPage,
          onPageSizeChange: table.setPageSize,
        }}
      />

      {/* Create / Revise Production Plan Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? `Revise Production Plan — ${form.id}` : 'Create Production Plan'}
        subtitle="Validates machine compatibility, window capacity, and raw material BOM availability."
        size="2xl"
        footer={
          <>
            <SecondaryButton onClick={() => setModalOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={handleSavePlan}>
              {form.id ? 'Save Plan Revision' : 'Create Production Plan'}
            </PrimaryButton>
          </>
        }
      >
        <form onSubmit={handleSavePlan} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormSelect
              label="Customer"
              name="customerId"
              required
              value={form.customerId}
              onChange={(e) => setForm({ ...form, customerId: e.target.value })}
              options={customers.map((c) => ({
                value: c.id,
                label: `${c.name} (${c.priorityTier})`,
              }))}
            />
            <FormSelect
              label="Product"
              name="productId"
              required
              value={form.productId}
              onChange={(e) => {
                const pid = e.target.value;
                const compat = machines.find(
                  (m) => m.status !== 'Inactive' && (m.supportedProductIds || []).includes(pid)
                );
                setForm({
                  ...form,
                  productId: pid,
                  availableFinishedStock: fgAvailableByProduct[pid] || 0,
                  assignedMachineId: compat?.id || form.assignedMachineId,
                });
              }}
              options={products.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))}
            />
            <FormSelect
              label="Assigned Machine"
              name="assignedMachineId"
              required
              value={form.assignedMachineId}
              onChange={(e) => setForm({ ...form, assignedMachineId: e.target.value })}
              options={machines.map((m) => {
                const ok = (m.supportedProductIds || []).includes(form.productId);
                return {
                  value: m.id,
                  label: `${m.code} (${m.dailyCapacity}/day, ${m.status})${ok ? ' ✓' : ' ⚠ Incompatible'}`,
                };
              })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <FormInput
              label="Required Quantity"
              name="requiredQty"
              type="number"
              min="1"
              required
              value={form.requiredQty}
              onChange={(e) => setForm({ ...form, requiredQty: e.target.value })}
            />
            <FormInput
              label="Available FG Stock"
              name="availableFinishedStock"
              type="number"
              min="0"
              value={form.availableFinishedStock}
              onChange={(e) => setForm({ ...form, availableFinishedStock: e.target.value })}
            />
            <div className="p-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <span className="text-[11px] font-medium text-slate-500 block">
                Mfg Requirement
              </span>
              <span className="text-lg font-bold text-[#2563EB] tabular-nums">
                {formatNumber(formMfgRequirement)} units
              </span>
            </div>
            <FormInput
              label="Delivery Urgency (0–100)"
              name="deliveryUrgencyScore"
              type="number"
              min="0"
              max="100"
              value={form.deliveryUrgencyScore}
              onChange={(e) => setForm({ ...form, deliveryUrgencyScore: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormInput
              label="Planned Start Date"
              name="plannedStartDate"
              type="date"
              required
              value={form.plannedStartDate}
              onChange={(e) => setForm({ ...form, plannedStartDate: e.target.value })}
            />
            <FormInput
              label="Planned Completion Date"
              name="plannedCompletionDate"
              type="date"
              required
              value={form.plannedCompletionDate}
              onChange={(e) => setForm({ ...form, plannedCompletionDate: e.target.value })}
            />
            <FormSelect
              label="Plan Status"
              name="status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={['Planned', 'In Progress', 'Material Shortage', 'Completed']}
            />
          </div>

          {/* Compatibility & Capacity Validation Box */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div
              className={`p-3 rounded-md border text-xs ${
                isFormMachineCompatible && formCapacityCheck.valid
                  ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20'
                  : 'border-red-200 dark:border-red-800/60 bg-red-50/50 dark:bg-red-950/20'
              }`}
            >
              <div className="font-semibold flex items-center gap-1.5 mb-1">
                {isFormMachineCompatible && formCapacityCheck.valid ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                )}
                Machine Compatibility & Capacity Check
              </div>
              <p className="text-slate-600 dark:text-slate-300">
                Compatibility:{' '}
                <strong>{isFormMachineCompatible ? 'Supported' : 'Incompatible Product'}</strong>
              </p>
              <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                {formCapacityCheck.message}
              </p>
            </div>

            <div className="p-3 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 text-xs">
              <div className="font-semibold text-slate-800 dark:text-slate-100 mb-1">
                Priority Score Preview: {formPriorityPreview.totalScore}/100 ({formPriorityPreview.level})
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600 dark:text-slate-400">
                {formPriorityPreview.breakdown.map((b) => (
                  <div key={b.key} className="tabular-nums">
                    {b.label.split(' ')[0]} ({b.weight}%): <strong>{b.weighted}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* BOM Material Availability Check Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                BOM Material Availability Check (For {formatNumber(formMfgRequirement)} Units)
              </h4>
              {formMaterialCheck.hasShortage && (
                <span className="text-xs font-semibold text-red-600 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Material Shortage Detected
                </span>
              )}
            </div>
            {!formMaterialCheck.hasBom ? (
              <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 text-xs text-amber-800 dark:text-amber-300">
                No Bill of Materials defined for this product yet.
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-slate-700 rounded-md overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                      <th className="px-3 py-2 font-semibold">Material</th>
                      <th className="px-3 py-2 font-semibold text-right">Required</th>
                      <th className="px-3 py-2 font-semibold text-right">Usable Avail</th>
                      <th className="px-3 py-2 font-semibold text-right">Shortage</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {formMaterialCheck.items.map((item) => (
                      <tr key={item.materialId}>
                        <td className="px-3 py-2 font-medium">{item.materialName}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {item.requiredQty} {item.uom}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {item.availableQty} {item.uom}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold text-red-600">
                          {item.shortageQty > 0 ? `${item.shortageQty} ${item.uom}` : '0'}
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge
                            status={item.isSufficient ? 'Available' : 'Low Stock'}
                            size="xs"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <FormTextarea
            label={form.id ? 'Revision Reason / Summary' : 'Planning Notes'}
            name="revisionNote"
            rows={2}
            value={form.id ? form.revisionNote : form.notes}
            onChange={(e) =>
              form.id
                ? setForm({ ...form, revisionNote: e.target.value })
                : setForm({ ...form, notes: e.target.value })
            }
          />
        </form>
      </Modal>

      {/* Priority Breakdown Modal */}
      <Modal
        isOpen={Boolean(priorityModalPlan)}
        onClose={() => setPriorityModalPlan(null)}
        title={`Priority Breakdown — ${priorityModalPlan?.id || ''}`}
        subtitle={`${priorityModalPlan?.customerName || ''} · ${priorityModalPlan?.productName || ''}`}
        size="md"
        footer={<SecondaryButton onClick={() => setPriorityModalPlan(null)}>Close</SecondaryButton>}
      >
        {priorityModalPlan && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div>
                <div className="text-xs text-slate-500">Weighted Priority Score</div>
                <div className="text-2xl font-bold tabular-nums">
                  {priorityModalPlan.priority.totalScore} / 100
                </div>
              </div>
              <StatusBadge status={priorityModalPlan.priority.level} />
            </div>

            <div className="space-y-3">
              {priorityModalPlan.priority.breakdown.map((item) => (
                <div key={item.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {item.label} ({item.weight}% weight)
                    </span>
                    <span className="tabular-nums text-slate-600 dark:text-slate-300">
                      Raw {item.raw}/100 → <strong>+{item.weighted} pts</strong>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#2563EB]"
                      style={{ width: `${Math.min(100, item.raw)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {priorityModalPlan.matCheck.items.length > 0 && (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Material Readiness Details
                </h4>
                <div className="space-y-1.5 text-xs">
                  {priorityModalPlan.matCheck.items.map((m) => (
                    <div key={m.materialId} className="flex justify-between">
                      <span>{m.materialName}</span>
                      <span
                        className={`tabular-nums font-medium ${
                          m.isSufficient ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {m.isSufficient
                          ? `Ready (${m.availableQty}/${m.requiredQty} ${m.uom})`
                          : `Short ${m.shortageQty} ${m.uom}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Previous Plan Revisions Modal */}
      <Modal
        isOpen={Boolean(revisionModalPlan)}
        onClose={() => setRevisionModalPlan(null)}
        title={`Plan Revision History — ${revisionModalPlan?.id || ''}`}
        subtitle={`Current Version: Rev ${revisionModalPlan?.revision || 1}`}
        footer={<SecondaryButton onClick={() => setRevisionModalPlan(null)}>Close</SecondaryButton>}
      >
        {revisionModalPlan && (
          <div className="space-y-3">
            {(revisionModalPlan.revisions || []).map((rev) => (
              <div
                key={rev.version}
                className="p-3 rounded-md border border-slate-200 dark:border-slate-700 text-xs"
              >
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-[#2563EB]">Revision {rev.version}</span>
                  <span className="text-slate-400 tabular-nums">{rev.date}</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 mt-1">{rev.note}</p>
                <p className="text-[11px] text-slate-400 mt-1">Updated by: {rev.changedBy}</p>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
