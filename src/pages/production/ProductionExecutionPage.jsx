import { useState, useMemo } from 'react';
import { Plus, Eye, Edit2 } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { PrimaryButton, SecondaryButton } from '../../components/common/Buttons';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { DataTable } from '../../components/tables/DataTable';
import { SearchInput, FilterDropdown } from '../../components/forms/Filters';
import { FormInput, FormSelect, FormTextarea } from '../../components/forms/FormFields';
import { useErpData } from '../../context/ErpDataContext';
import { useTableState } from '../../hooks/useTableState';
import { formatDate, formatNumber } from '../../utils/formatters';

export function ProductionExecutionPage() {
  const {
    productionEntries,
    productionPlans,
    machines,
    products,
    saveProductionEntry,
  } = useErpData();

  const [modalOpen, setModalOpen] = useState(false);
  const [detailEntry, setDetailEntry] = useState(null);
  const [formError, setFormError] = useState('');

  const [form, setForm] = useState({
    id: '',
    planId: '',
    machineId: '',
    productId: '',
    plannedQty: 50,
    actualQty: 48,
    rejectedQty: 2,
    productionDate: '2026-11-09',
    shift: 'Shift A (07:00 - 15:30)',
    operator: '',
    status: 'Draft',
    remarks: '',
  });

  const enrichedEntries = useMemo(() => {
    return productionEntries.map((entry) => {
      const mach = machines.find((m) => m.id === entry.machineId);
      const prod = products.find((p) => p.id === entry.productId);
      const progressPct =
        entry.plannedQty > 0
          ? Math.min(100, Math.round((entry.actualQty / entry.plannedQty) * 100))
          : 0;
      return {
        ...entry,
        machineCode: mach?.code || entry.machineId,
        machineName: mach?.name || '',
        productName: prod?.name || entry.productId,
        productCode: prod?.code || '',
        progressPct,
      };
    });
  }, [productionEntries, machines, products]);

  const table = useTableState(enrichedEntries, {
    initialPageSize: 8,
    initialSortKey: 'productionDate',
    initialSortDir: 'desc',
    searchFields: ['id', 'planId', 'machineCode', 'productName', 'operator'],
  });

  const openAdd = () => {
    const activePlan =
      productionPlans.find((p) => p.status === 'In Progress') || productionPlans[0];
    const mach = machines.find((m) => m.id === activePlan?.assignedMachineId);
    setForm({
      id: '',
      planId: activePlan?.id || '',
      machineId: activePlan?.assignedMachineId || machines[0]?.id || '',
      productId: activePlan?.productId || products[0]?.id || '',
      plannedQty: 60,
      actualQty: 58,
      rejectedQty: 2,
      productionDate: '2026-11-09',
      shift: 'Shift A (07:00 - 15:30)',
      operator: mach?.operator || 'Mahesh Shinde',
      status: 'Draft',
      remarks: '',
    });
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (entry, e) => {
    e?.stopPropagation();
    setForm(entry);
    setFormError('');
    setModalOpen(true);
  };

  const goodOutputPreview = Math.max(
    0,
    Number(form.actualQty || 0) - Number(form.rejectedQty || 0)
  );

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.planId || !form.machineId || !form.productId) {
      setFormError('Production Plan, Machine, and Product are required.');
      return;
    }
    if (Number(form.rejectedQty) > Number(form.actualQty)) {
      setFormError('Rejected quantity cannot exceed actual produced quantity.');
      return;
    }
    saveProductionEntry({
      ...form,
      plannedQty: Number(form.plannedQty),
      actualQty: Number(form.actualQty),
      rejectedQty: Number(form.rejectedQty),
    });
    setModalOpen(false);
  };

  const columns = [
    {
      key: 'id',
      label: 'Entry ID',
      sortable: true,
      render: (r) => <span className="font-mono text-xs font-semibold">{r.id}</span>,
    },
    {
      key: 'planId',
      label: 'Production Plan',
      sortable: true,
      render: (r) => <span className="font-mono text-xs text-[#2563EB]">{r.planId}</span>,
    },
    { key: 'machineCode', label: 'Machine', sortable: true },
    {
      key: 'productName',
      label: 'Product',
      sortable: true,
      render: (r) => (
        <div>
          <div className="font-medium text-xs">{r.productName}</div>
          <div className="text-[10px] font-mono text-slate-400">{r.productCode}</div>
        </div>
      ),
    },
    {
      key: 'plannedQty',
      label: 'Planned vs Actual',
      render: (r) => (
        <div className="w-36">
          <div className="flex justify-between text-[11px] tabular-nums mb-1">
            <span>
              <strong>{r.actualQty}</strong> / {r.plannedQty}
            </span>
            <span className="text-slate-500">{r.progressPct}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${
                r.progressPct >= 95 ? 'bg-emerald-600' : 'bg-[#2563EB]'
              }`}
              style={{ width: `${r.progressPct}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'rejectedQty',
      label: 'Rejected',
      align: 'right',
      numeric: true,
      render: (r) => (
        <span className={r.rejectedQty > 0 ? 'text-red-600 font-medium' : 'text-slate-400'}>
          {formatNumber(r.rejectedQty)}
        </span>
      ),
    },
    {
      key: 'goodOutput',
      label: 'Good Output',
      align: 'right',
      numeric: true,
      sortable: true,
      render: (r) => <span className="font-semibold text-emerald-600">{formatNumber(r.goodOutput)}</span>,
    },
    {
      key: 'productionDate',
      label: 'Date',
      sortable: true,
      render: (r) => formatDate(r.productionDate),
    },
    { key: 'operator', label: 'Operator' },
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
            onClick={() => setDetailEntry(r)}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-[#2563EB] cursor-pointer"
            title="View Production Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          {r.status === 'Draft' && (
            <button
              type="button"
              onClick={(e) => openEdit(r, e)}
              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-[#2563EB] cursor-pointer"
              title="Edit Draft Entry"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Production Execution"
        description="Log daily shift production output, rejections, and planned vs actual progress."
        actions={
          <PrimaryButton icon={Plus} onClick={openAdd}>
            Add Daily Production Entry
          </PrimaryButton>
        }
      />

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 mb-4 flex flex-wrap items-center justify-between gap-3">
        <SearchInput
          value={table.search}
          onChange={table.setSearch}
          placeholder="Search entry ID, plan, machine, operator..."
          className="w-full sm:w-80"
        />
        <FilterDropdown
          label="Status"
          value={table.filters.status}
          onChange={(val) => table.setFilter('status', val)}
          options={['Draft', 'Submitted', 'Verified']}
        />
      </div>

      <DataTable
        columns={columns}
        data={table.paginatedData}
        sortKey={table.sortKey}
        sortDir={table.sortDir}
        onSort={table.handleSort}
        onRowClick={(r) => setDetailEntry(r)}
        pagination={{
          page: table.page,
          totalPages: table.totalPages,
          totalItems: table.totalItems,
          pageSize: table.pageSize,
          onPageChange: table.setPage,
          onPageSizeChange: table.setPageSize,
        }}
      />

      {/* Add / Edit Draft Entry Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? `Edit Draft Entry — ${form.id}` : 'Add Daily Production Entry'}
        subtitle="Submitted entries automatically queue finished goods for Quality Control inspection."
        footer={
          <>
            <SecondaryButton onClick={() => setModalOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={handleSave}>Save Production Entry</PrimaryButton>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect
              label="Production Plan"
              name="planId"
              required
              value={form.planId}
              onChange={(e) => {
                const pl = productionPlans.find((p) => p.id === e.target.value);
                setForm({
                  ...form,
                  planId: e.target.value,
                  machineId: pl?.assignedMachineId || form.machineId,
                  productId: pl?.productId || form.productId,
                });
              }}
              options={productionPlans.map((p) => ({
                value: p.id,
                label: `${p.id} (${p.manufacturingRequirement} req)`,
              }))}
            />
            <FormSelect
              label="Machine"
              name="machineId"
              required
              value={form.machineId}
              onChange={(e) => setForm({ ...form, machineId: e.target.value })}
              options={machines.map((m) => ({ value: m.id, label: `${m.code} — ${m.name}` }))}
            />
            <FormSelect
              label="Product"
              name="productId"
              required
              value={form.productId}
              onChange={(e) => setForm({ ...form, productId: e.target.value })}
              options={products.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))}
            />
            <FormInput
              label="Production Date"
              name="productionDate"
              type="date"
              required
              value={form.productionDate}
              onChange={(e) => setForm({ ...form, productionDate: e.target.value })}
            />
            <FormInput
              label="Planned Shift Quantity"
              name="plannedQty"
              type="number"
              min="1"
              required
              value={form.plannedQty}
              onChange={(e) => setForm({ ...form, plannedQty: e.target.value })}
            />
            <FormInput
              label="Actual Produced Quantity"
              name="actualQty"
              type="number"
              min="0"
              required
              value={form.actualQty}
              onChange={(e) => setForm({ ...form, actualQty: e.target.value })}
            />
            <FormInput
              label="Rejected Quantity"
              name="rejectedQty"
              type="number"
              min="0"
              value={form.rejectedQty}
              onChange={(e) => setForm({ ...form, rejectedQty: e.target.value })}
            />
            <div className="p-2.5 rounded-md border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20">
              <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 block">
                Calculated Good Output
              </span>
              <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                {formatNumber(goodOutputPreview)} units
              </span>
            </div>
            <FormInput
              label="Operator Name"
              name="operator"
              value={form.operator}
              onChange={(e) => setForm({ ...form, operator: e.target.value })}
            />
            <FormSelect
              label="Entry Status"
              name="status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={['Draft', 'Submitted', 'Verified']}
            />
          </div>

          <FormTextarea
            label="Shift Remarks"
            name="remarks"
            rows={2}
            value={form.remarks}
            onChange={(e) => setForm({ ...form, remarks: e.target.value })}
          />
        </form>
      </Modal>

      {/* View Detail Modal */}
      <Modal
        isOpen={Boolean(detailEntry)}
        onClose={() => setDetailEntry(null)}
        title={`Production Log — ${detailEntry?.id || ''}`}
        subtitle={`${detailEntry?.productName || ''} · ${detailEntry?.machineCode || ''}`}
        footer={<SecondaryButton onClick={() => setDetailEntry(null)}>Close</SecondaryButton>}
      >
        {detailEntry && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 block">Planned Qty</span>
                <strong className="text-base tabular-nums">{detailEntry.plannedQty}</strong>
              </div>
              <div className="p-3 rounded border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 block">Actual Qty</span>
                <strong className="text-base tabular-nums text-[#2563EB]">{detailEntry.actualQty}</strong>
              </div>
              <div className="p-3 rounded border border-emerald-200 dark:border-emerald-800">
                <span className="text-emerald-600 block">Good Output</span>
                <strong className="text-base tabular-nums text-emerald-600">{detailEntry.goodOutput}</strong>
              </div>
            </div>
            <div className="space-y-1.5 text-slate-600 dark:text-slate-300">
              <div><strong>Plan ID:</strong> {detailEntry.planId}</div>
              <div><strong>Date & Shift:</strong> {formatDate(detailEntry.productionDate)} ({detailEntry.shift})</div>
              <div><strong>Operator:</strong> {detailEntry.operator}</div>
              <div><strong>Rejected Units:</strong> {detailEntry.rejectedQty}</div>
              <div><strong>Remarks:</strong> {detailEntry.remarks || 'None'}</div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
