import { useState, useMemo } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, Plus, Clock } from 'lucide-react';
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
import { formatDate, formatNumber } from '../../utils/formatters';

export function QualityControlPage() {
  const {
    qualityInspections,
    materials,
    products,
    processQualityInspection,
    createQualityInspection,
  } = useErpData();

  const [inspectTarget, setInspectTarget] = useState(null);
  const [inspectForm, setInspectForm] = useState({
    acceptedQty: 0,
    rejectedQty: 0,
    inspector: 'Kavita Sawant',
    notes: '',
  });
  const [inspectError, setInspectError] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [newForm, setNewForm] = useState({
    itemType: 'Raw Material',
    itemId: '',
    batchNumber: '',
    inspectedQty: 100,
    inspector: 'Kavita Sawant',
    reference: '',
    notes: '',
  });

  const stats = useMemo(() => {
    const fgInspections = qualityInspections.filter((q) => q.itemType === 'Finished Goods');
    const producedTotal = fgInspections.reduce((s, q) => s + Number(q.inspectedQty || 0), 0);
    const acceptedTotal = fgInspections.reduce((s, q) => s + Number(q.acceptedQty || 0), 0);
    const rejectedTotal = fgInspections.reduce((s, q) => s + Number(q.rejectedQty || 0), 0);
    const pendingCount = qualityInspections.filter(
      (q) => q.status === 'Pending' || q.status === 'In Inspection'
    ).length;

    return { producedTotal, acceptedTotal, rejectedTotal, pendingCount };
  }, [qualityInspections]);

  const table = useTableState(qualityInspections, {
    initialPageSize: 10,
    initialSortKey: 'inspectionDate',
    initialSortDir: 'desc',
    searchFields: ['id', 'itemName', 'batchNumber', 'inspector', 'reference'],
  });

  const openInspectModal = (qc) => {
    setInspectTarget(qc);
    setInspectForm({
      acceptedQty: qc.acceptedQty || qc.inspectedQty,
      rejectedQty: qc.rejectedQty || 0,
      inspector: qc.inspector === 'Pending Assignment' ? 'Kavita Sawant' : qc.inspector,
      notes: qc.notes || '',
    });
    setInspectError('');
  };

  const handleDecision = (decisionType) => {
    if (!inspectTarget) return;
    let acc = Number(inspectForm.acceptedQty || 0);
    let rej = Number(inspectForm.rejectedQty || 0);

    if (decisionType === 'accept-all') {
      acc = inspectTarget.inspectedQty;
      rej = 0;
    } else if (decisionType === 'reject-all') {
      acc = 0;
      rej = inspectTarget.inspectedQty;
    }

    if (acc + rej !== inspectTarget.inspectedQty) {
      setInspectError(
        `Accepted (${acc}) + Rejected (${rej}) must equal Inspected Quantity (${inspectTarget.inspectedQty}).`
      );
      return;
    }

    const status =
      acc === inspectTarget.inspectedQty
        ? 'Accepted'
        : rej === inspectTarget.inspectedQty
        ? 'Rejected'
        : 'Partially Accepted';

    processQualityInspection(inspectTarget.id, {
      acceptedQty: acc,
      rejectedQty: rej,
      status,
      notes: inspectForm.notes,
      inspector: inspectForm.inspector,
    });
    setInspectTarget(null);
  };

  const handleCreateQc = (e) => {
    e.preventDefault();
    const list = newForm.itemType === 'Raw Material' ? materials : products;
    const item = list.find((i) => i.id === newForm.itemId) || list[0];
    if (!item) return;

    createQualityInspection({
      itemType: newForm.itemType,
      itemId: item.id,
      itemName: item.name,
      batchNumber: newForm.batchNumber || `BTH-${Date.now().toString().slice(-5)}`,
      inspectedQty: Number(newForm.inspectedQty || 0),
      acceptedQty: 0,
      rejectedQty: 0,
      uom: item.uom,
      inspector: newForm.inspector,
      status: 'Pending',
      reference: newForm.reference || 'Manual QC Queue',
      notes: newForm.notes,
    });
    setCreateOpen(false);
  };

  const columns = [
    {
      key: 'id',
      label: 'Inspection ID',
      sortable: true,
      render: (r) => <span className="font-mono text-xs font-semibold">{r.id}</span>,
    },
    {
      key: 'itemName',
      label: 'Product / Material',
      sortable: true,
      render: (r) => (
        <div>
          <div className="font-medium text-xs text-[#051747] dark:text-slate-100">{r.itemName}</div>
          <div className="text-[11px] text-slate-500">{r.itemType} · Ref: {r.reference}</div>
        </div>
      ),
    },
    {
      key: 'batchNumber',
      label: 'Batch Number',
      render: (r) => <span className="font-mono text-xs">{r.batchNumber}</span>,
    },
    {
      key: 'inspectionDate',
      label: 'Date',
      sortable: true,
      render: (r) => formatDate(r.inspectionDate),
    },
    {
      key: 'inspectedQty',
      label: 'Inspected',
      align: 'right',
      numeric: true,
      render: (r) => `${formatNumber(r.inspectedQty)} ${r.uom}`,
    },
    {
      key: 'acceptedQty',
      label: 'Accepted',
      align: 'right',
      numeric: true,
      render: (r) => (
        <span className="font-semibold text-emerald-600">
          {formatNumber(r.acceptedQty)} {r.uom}
        </span>
      ),
    },
    {
      key: 'rejectedQty',
      label: 'Rejected',
      align: 'right',
      numeric: true,
      render: (r) => (
        <span className={r.rejectedQty > 0 ? 'font-semibold text-red-600' : 'text-slate-400'}>
          {formatNumber(r.rejectedQty)} {r.uom}
        </span>
      ),
    },
    { key: 'inspector', label: 'Inspector' },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (r) => <StatusBadge status={r.status} size="xs" />,
    },
    {
      key: 'actions',
      label: 'Action',
      align: 'right',
      render: (r) => {
        const finalized = ['Accepted', 'Rejected', 'Partially Accepted'].includes(r.status);
        return (
          <button
            type="button"
            onClick={() => openInspectModal(r)}
            className={`px-2.5 py-1 text-xs font-medium rounded border cursor-pointer ${
              finalized
                ? 'border-[#535F80]/30 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                : 'border-[#081F62] bg-blue-50 text-[#081F62] hover:bg-blue-100'
            }`}
          >
            {finalized ? 'View' : 'Inspect'}
          </button>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quality Control"
        description="Inspect incoming raw materials and produced finished goods. Only accepted quantities enter usable stock."
        actions={
          <PrimaryButton
            icon={Plus}
            onClick={() => {
              setNewForm({
                itemType: 'Raw Material',
                itemId: materials[0]?.id || '',
                batchNumber: `QC-BTH-${Date.now().toString().slice(-4)}`,
                inspectedQty: 100,
                inspector: 'Kavita Sawant',
                reference: '',
                notes: '',
              });
              setCreateOpen(true);
            }}
          >
            Record Inspection
          </PrimaryButton>
        }
      />

      {/* Business Rule Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Pending QC Queue"
          value={stats.pendingCount}
          sublabel="Batches awaiting disposition"
          icon={Clock}
          tone="amber"
        />
        <StatCard
          label="Produced FG Inspected"
          value={formatNumber(stats.producedTotal)}
          sublabel="Total produced units tested"
          icon={ShieldCheck}
          tone="blue"
        />
        <StatCard
          label="Usable Accepted FG"
          value={formatNumber(stats.acceptedTotal)}
          sublabel="Counted in usable stock"
          icon={CheckCircle2}
          tone="green"
        />
        <StatCard
          label="Rejected FG Units"
          value={formatNumber(stats.rejectedTotal)}
          sublabel="Excluded from usable inventory"
          icon={XCircle}
          tone="red"
        />
      </div>

      <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3">
        <SearchInput
          value={table.search}
          onChange={table.setSearch}
          placeholder="Search inspection ID, batch, material/product..."
          className="w-full sm:w-80"
        />
        <div className="flex flex-wrap items-center gap-3">
          <FilterDropdown
            label="Category"
            value={table.filters.itemType}
            onChange={(val) => table.setFilter('itemType', val)}
            options={['Raw Material', 'Finished Goods']}
          />
          <FilterDropdown
            label="Status"
            value={table.filters.status}
            onChange={(val) => table.setFilter('status', val)}
            options={['Pending', 'In Inspection', 'Accepted', 'Partially Accepted', 'Rejected']}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={table.paginatedData}
        sortKey={table.sortKey}
        sortDir={table.sortDir}
        onSort={table.handleSort}
        pagination={{
          page: table.page,
          totalPages: table.totalPages,
          totalItems: table.totalItems,
          pageSize: table.pageSize,
          onPageChange: table.setPage,
          onPageSizeChange: table.setPageSize,
        }}
      />

      {/* Inspection Disposition Modal */}
      <Modal
        isOpen={Boolean(inspectTarget)}
        onClose={() => setInspectTarget(null)}
        title={`Quality Inspection — ${inspectTarget?.id || ''}`}
        subtitle={`${inspectTarget?.itemType || ''}: ${inspectTarget?.itemName || ''} · Batch ${inspectTarget?.batchNumber || ''}`}
        footer={
          inspectTarget &&
          !['Accepted', 'Rejected', 'Partially Accepted'].includes(inspectTarget.status) ? (
            <>
              <SecondaryButton onClick={() => setInspectTarget(null)}>Cancel</SecondaryButton>
              <PrimaryButton variant="danger" onClick={() => handleDecision('reject-all')}>
                Reject All
              </PrimaryButton>
              <SecondaryButton onClick={() => handleDecision('partial')}>
                Confirm Split Decision
              </SecondaryButton>
              <PrimaryButton variant="success" onClick={() => handleDecision('accept-all')}>
                Accept All ({inspectTarget.inspectedQty} {inspectTarget.uom})
              </PrimaryButton>
            </>
          ) : (
            <SecondaryButton onClick={() => setInspectTarget(null)}>Close</SecondaryButton>
          )
        }
      >
        {inspectTarget && (
          <div className="space-y-4">
            {inspectError && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
                {inspectError}
              </div>
            )}

            <div className="p-3 rounded-md bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200">
              {inspectTarget.itemType === 'Raw Material'
                ? 'Approving moves quantity from Pending Inspection into Quality-Approved Usable Raw Material stock.'
                : 'Approving adds Accepted units to Usable Finished Goods stock. Rejected units remain quarantined.'}
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded border border-[#535F80]/30 dark:border-slate-700">
                <span className="text-slate-500 block">Inspected Qty</span>
                <strong className="text-base tabular-nums">
                  {inspectTarget.inspectedQty} {inspectTarget.uom}
                </strong>
              </div>
              <FormInput
                label="Accepted Qty"
                name="acceptedQty"
                type="number"
                min="0"
                max={inspectTarget.inspectedQty}
                disabled={['Accepted', 'Rejected', 'Partially Accepted'].includes(
                  inspectTarget.status
                )}
                value={inspectForm.acceptedQty}
                onChange={(e) => {
                  const val = Math.min(inspectTarget.inspectedQty, Math.max(0, Number(e.target.value)));
                  setInspectForm({
                    ...inspectForm,
                    acceptedQty: val,
                    rejectedQty: inspectTarget.inspectedQty - val,
                  });
                }}
              />
              <FormInput
                label="Rejected Qty"
                name="rejectedQty"
                type="number"
                min="0"
                max={inspectTarget.inspectedQty}
                disabled={['Accepted', 'Rejected', 'Partially Accepted'].includes(
                  inspectTarget.status
                )}
                value={inspectForm.rejectedQty}
                onChange={(e) => {
                  const val = Math.min(inspectTarget.inspectedQty, Math.max(0, Number(e.target.value)));
                  setInspectForm({
                    ...inspectForm,
                    rejectedQty: val,
                    acceptedQty: inspectTarget.inspectedQty - val,
                  });
                }}
              />
            </div>

            <FormInput
              label="Inspector"
              name="inspector"
              value={inspectForm.inspector}
              onChange={(e) => setInspectForm({ ...inspectForm, inspector: e.target.value })}
            />
            <FormTextarea
              label="Inspection Observations & Measurements"
              name="notes"
              rows={3}
              value={inspectForm.notes}
              onChange={(e) => setInspectForm({ ...inspectForm, notes: e.target.value })}
            />
          </div>
        )}
      </Modal>

      {/* Create Manual QC Entry Modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Queue New Quality Inspection"
        footer={
          <>
            <SecondaryButton onClick={() => setCreateOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={handleCreateQc}>Create Inspection</PrimaryButton>
          </>
        }
      >
        <form onSubmit={handleCreateQc} className="space-y-4">
          <FormSelect
            label="Inspection Category"
            name="itemType"
            value={newForm.itemType}
            onChange={(e) => {
              const t = e.target.value;
              const list = t === 'Raw Material' ? materials : products;
              setNewForm({ ...newForm, itemType: t, itemId: list[0]?.id || '' });
            }}
            options={['Raw Material', 'Finished Goods']}
          />
          <FormSelect
            label={newForm.itemType}
            name="itemId"
            value={newForm.itemId}
            onChange={(e) => setNewForm({ ...newForm, itemId: e.target.value })}
            options={(newForm.itemType === 'Raw Material' ? materials : products).map((i) => ({
              value: i.id,
              label: `${i.code} — ${i.name}`,
            }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Batch Number"
              name="batchNumber"
              value={newForm.batchNumber}
              onChange={(e) => setNewForm({ ...newForm, batchNumber: e.target.value })}
            />
            <FormInput
              label="Inspected Quantity"
              name="inspectedQty"
              type="number"
              min="1"
              value={newForm.inspectedQty}
              onChange={(e) => setNewForm({ ...newForm, inspectedQty: e.target.value })}
            />
          </div>
          <FormInput
            label="Inspector"
            name="inspector"
            value={newForm.inspector}
            onChange={(e) => setNewForm({ ...newForm, inspector: e.target.value })}
          />
          <FormTextarea
            label="Inspection Notes"
            name="notes"
            rows={2}
            value={newForm.notes}
            onChange={(e) => setNewForm({ ...newForm, notes: e.target.value })}
          />
        </form>
      </Modal>
    </div>
  );
}
