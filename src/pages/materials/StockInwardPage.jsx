import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDownToLine,
  Boxes,
  Truck,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Plus,
  Eye,
  FileText,
  Warehouse,
  ShoppingBag,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { StatCard } from '../../components/dashboard/StatCard';
import { DataTable } from '../../components/tables/DataTable';
import { useTableState } from '../../hooks/useTableState';
import { SearchInput, FilterDropdown } from '../../components/forms/Filters';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PrimaryButton, SecondaryButton } from '../../components/common/Buttons';
import { Tooltip } from '../../components/common/Tooltip';
import { Modal } from '../../components/common/Modal';
import { FormInput, FormSelect, FormTextarea } from '../../components/forms/FormFields';
import { useErpData } from '../../context/ErpDataContext';
import { getMaterialComputedFields } from '../../services/erpService';
import { formatNumber, formatDate, formatCurrency, getDaysRemaining } from '../../utils/formatters';

export function StockInwardPage() {
  const navigate = useNavigate();
  const {
    materials,
    materialTransactions = [],
    purchaseOrders = [],
    suppliers = [],
    recordMaterialTransaction,
  } = useErpData();

  const [inwardModalOpen, setInwardModalOpen] = useState(false);
  const [detailModalTarget, setDetailModalTarget] = useState(null);
  const [form, setForm] = useState({
    materialId: materials[0]?.id || '',
    quantity: '',
    reference: '',
    remarks: '',
    requireQc: true,
  });

  const computedMaterials = useMemo(
    () => materials.map(getMaterialComputedFields),
    [materials]
  );

  // Inward transactions only
  const inwardTransactions = useMemo(
    () => materialTransactions.filter((txn) => txn.type === 'Inward'),
    [materialTransactions]
  );

  // Open Purchase Orders awaiting receipt
  const pendingReceiptPOs = useMemo(
    () =>
      purchaseOrders
        .filter((po) => po.status !== 'Received' && po.status !== 'Cancelled')
        .sort((a, b) => new Date(a.expectedArrival) - new Date(b.expectedArrival)),
    [purchaseOrders]
  );

  const pendingUnitsCount = useMemo(
    () =>
      pendingReceiptPOs.reduce((sum, po) => {
        const poPending = (po.items || []).reduce(
          (itemSum, it) => itemSum + Math.max(0, (it.orderedQty || 0) - (it.receivedQty || 0)),
          0
        );
        return sum + poPending;
      }, 0),
    [pendingReceiptPOs]
  );

  const totalInwardUnits = useMemo(
    () =>
      inwardTransactions.reduce((sum, t) => sum + Math.abs(Number(t.quantity || 0)), 0),
    [inwardTransactions]
  );

  const totalQuarantineQty = useMemo(
    () =>
      computedMaterials.reduce((sum, m) => sum + (m.pendingInspectionQty || 0), 0),
    [computedMaterials]
  );

  const totalApprovedStock = useMemo(
    () => computedMaterials.reduce((sum, m) => sum + (m.usableStock || 0), 0),
    [computedMaterials]
  );

  const tableState = useTableState(inwardTransactions, {
    initialPageSize: 10,
    initialSortKey: 'timestamp',
    initialSortDir: 'desc',
    searchFields: ['id', 'reference', 'remarks', 'performedBy'],
  });

  const selectedMaterial = computedMaterials.find((m) => m.id === form.materialId);

  const openInwardModalWithPO = (po, item) => {
    const mat = materials.find((m) => m.id === item?.materialId) || materials[0];
    const pendingQty = item ? Math.max(0, (item.orderedQty || 0) - (item.receivedQty || 0)) : '';
    setForm({
      materialId: mat?.id || '',
      quantity: pendingQty ? String(pendingQty) : '',
      reference: `${po.poNumber} / GRN-${Date.now().toString().slice(-4)}`,
      remarks: `Gate receipt against PO ${po.poNumber}.`,
      requireQc: true,
    });
    setInwardModalOpen(true);
  };

  const handleOpenNewInward = () => {
    setForm({
      materialId: materials[0]?.id || '',
      quantity: '',
      reference: `GRN-${Date.now().toString().slice(-4)}`,
      remarks: '',
      requireQc: true,
    });
    setInwardModalOpen(true);
  };

  const handleSubmitInward = (e) => {
    e.preventDefault();
    if (!form.materialId || !form.quantity || Number(form.quantity) <= 0) return;

    const ok = recordMaterialTransaction({
      materialId: form.materialId,
      type: 'Inward',
      quantity: Number(form.quantity),
      reference: form.reference,
      remarks: form.remarks,
      requireQc: form.requireQc,
    });

    if (ok) {
      setInwardModalOpen(false);
    }
  };

  const columns = [
    {
      key: 'id',
      label: 'GRN / Trans ID',
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
      label: 'Reference / PO #',
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
      label: 'Received Qty',
      sortable: true,
      align: 'right',
      numeric: true,
      render: (r) => {
        const mat = materials.find((m) => m.id === r.materialId);
        return (
          <span className="font-semibold text-xs tabular-nums text-emerald-600 dark:text-emerald-400">
            +{formatNumber(Math.abs(r.quantity))} {mat?.uom || 'Kg'}
          </span>
        );
      },
    },
    {
      key: 'status',
      label: 'QC Status',
      sortable: true,
      render: (r) => <StatusBadge status={r.status || 'Received'} size="xs" />,
    },
    {
      key: 'performedBy',
      label: 'Received By',
      sortable: true,
      render: (r) => (
        <span className="text-xs text-[#535F80] dark:text-slate-400">{r.performedBy}</span>
      ),
    },
    {
      key: 'timestamp',
      label: 'Receipt Time',
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
        <Tooltip content="Inspect GRN Transaction">
          <button
            type="button"
            onClick={() => setDetailModalTarget(r)}
            className="p-1.5 rounded hover:bg-[#E7E9F0]/70 dark:hover:bg-slate-800 text-[#535F80] hover:text-[#081F62] cursor-pointer"
            aria-label="View Inward details"
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
        title="Stock Inward"
        badge={
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
            <ArrowDownToLine className="w-3.5 h-3.5" />
            Gate Receipts &amp; GRN
          </span>
        }
        description="Record incoming vendor shipments, gate entries, Goods Receipt Notes (GRN), and route lots for Quality Control inspection."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <SecondaryButton
              size="sm"
              icon={ShoppingBag}
              onClick={() => navigate('/purchases')}
            >
              Purchase Orders
            </SecondaryButton>
            <PrimaryButton
              size="sm"
              icon={Plus}
              onClick={handleOpenNewInward}
            >
              New Inward Receipt
            </PrimaryButton>
          </div>
        }
      />

      {/* 4 Summary StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Inward Received"
          value={`${formatNumber(totalInwardUnits)} Units`}
          trend={`${inwardTransactions.length} receipts recorded`}
          trendDirection="up"
          sublabel="Cumulative gate receipts"
          icon={ArrowDownToLine}
          tone="green"
        />
        <StatCard
          label="Pending PO Deliveries"
          value={`${pendingReceiptPOs.length} Open POs`}
          trend={`${formatNumber(pendingUnitsCount)} units en route`}
          trendDirection="neutral"
          sublabel="Awaiting supplier gate arrival"
          icon={Truck}
          tone={pendingReceiptPOs.length > 0 ? 'amber' : 'green'}
          onClick={() => navigate('/purchases')}
        />
        <StatCard
          label="Quarantine / QC Hold"
          value={`${formatNumber(totalQuarantineQty)} Units`}
          trend="Awaiting QA clearance"
          trendDirection="neutral"
          sublabel="Isolated from usable stock"
          icon={ShieldCheck}
          tone={totalQuarantineQty > 0 ? 'amber' : 'blue'}
          onClick={() => navigate('/inventory')}
        />
        <StatCard
          label="Approved Stock in Store"
          value={`${formatNumber(totalApprovedStock)} Units`}
          trend="Ready for production issue"
          trendDirection="up"
          sublabel="Passed inspection & unreserved"
          icon={Warehouse}
          tone="blue"
          onClick={() => navigate('/inventory')}
        />
      </div>

      {/* Pending Vendor Receipts Awaiting Inward */}
      {pendingReceiptPOs.length > 0 && (
        <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E7E9F0] dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#081F62] dark:text-blue-400" />
              <h2 className="text-sm font-semibold text-[#051747] dark:text-slate-100">
                Pending Vendor Shipments Ready for Inward (Gate Entry)
              </h2>
            </div>
            <span className="text-xs text-[#535F80] dark:text-slate-400">
              {pendingReceiptPOs.length} purchase orders awaiting GRN receipt
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingReceiptPOs.slice(0, 3).map((po) => {
              const sup = suppliers.find((s) => s.id === po.supplierId);
              const daysLeft = getDaysRemaining(po.expectedArrival);
              const firstItem = po.items?.[0];
              const mat = materials.find((m) => m.id === firstItem?.materialId);
              const pendingQty = firstItem
                ? Math.max(0, (firstItem.orderedQty || 0) - (firstItem.receivedQty || 0))
                : 0;

              return (
                <div
                  key={po.id}
                  className="p-3.5 rounded-lg border border-[#535F80]/20 dark:border-slate-800 bg-[#E7E9F0]/30 dark:bg-slate-800/40 flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-[#081F62] dark:text-blue-400">
                        {po.poNumber}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          daysLeft <= 1
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {daysLeft <= 0 ? 'Due Today' : `In ${daysLeft}d`}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-[#051747] dark:text-slate-100 mt-1 truncate">
                      {sup?.name || po.supplierId}
                    </div>
                    <div className="text-[11px] text-[#535F80] dark:text-slate-400 mt-0.5">
                      Item: <strong>{mat?.name || 'Raw Material'}</strong> ({pendingQty} {firstItem?.uom || 'Kg'} pending)
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#535F80]/10 dark:border-slate-700">
                    <span className="text-xs font-bold tabular-nums text-slate-700 dark:text-slate-200">
                      {formatCurrency(po.totalAmount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => openInwardModalWithPO(po, firstItem)}
                      className="px-2.5 py-1 text-xs font-semibold rounded bg-[#081F62] hover:bg-[#051747] text-[#FEFEFE] cursor-pointer inline-flex items-center gap-1 transition-colors"
                    >
                      <ArrowDownToLine className="w-3 h-3" />
                      Receive GRN
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Inward Movement Ledger */}
      <div className="space-y-3">
        <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            <SearchInput
              value={tableState.search}
              onChange={tableState.setSearch}
              placeholder="Search by GRN #, reference PO, remarks, or receiver..."
              className="w-full sm:w-96 md:w-[420px]"
            />
          </div>
          <span className="text-xs text-[#535F80] dark:text-slate-400">
            Showing <strong className="text-[#051747] dark:text-slate-200">{tableState.totalItems}</strong> inward transaction{tableState.totalItems === 1 ? '' : 's'}
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
          emptyMessage="No stock inward receipts found."
        />
      </div>

      {/* Record Stock Inward Modal */}
      <Modal
        isOpen={inwardModalOpen}
        onClose={() => setInwardModalOpen(false)}
        title="Record Stock Inward (GRN Entry)"
        subtitle="Log gate receipt of raw material, increment stock ledger, and optionally route to QC inspection."
        size="lg"
        footer={
          <>
            <SecondaryButton onClick={() => setInwardModalOpen(false)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton onClick={handleSubmitInward}>
              Confirm &amp; Record Inward
            </PrimaryButton>
          </>
        }
      >
        <form onSubmit={handleSubmitInward} className="space-y-4">
          <FormSelect
            label="Raw Material Grade / Item"
            name="materialId"
            required
            value={form.materialId}
            onChange={(e) => setForm({ ...form, materialId: e.target.value })}
            options={computedMaterials.map((m) => ({
              value: m.id,
              label: `${m.code} — ${m.name} (In Store: ${formatNumber(m.totalPhysicalStock)} ${m.uom})`,
            }))}
          />

          {selectedMaterial && (
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 grid grid-cols-3 gap-2 text-xs text-center">
              <div>
                <span className="text-[#535F80] dark:text-slate-400 block font-medium">
                  Physical Stock
                </span>
                <strong className="tabular-nums text-slate-800 dark:text-slate-200">
                  {formatNumber(selectedMaterial.totalPhysicalStock)} {selectedMaterial.uom}
                </strong>
              </div>
              <div className="border-x border-slate-200 dark:border-slate-700">
                <span className="text-[#535F80] dark:text-slate-400 block font-medium">
                  Pending QC
                </span>
                <strong className="tabular-nums text-amber-600">
                  {formatNumber(selectedMaterial.pendingInspectionQty)} {selectedMaterial.uom}
                </strong>
              </div>
              <div>
                <span className="text-[#535F80] dark:text-slate-400 block font-medium">
                  Net Available
                </span>
                <strong className="tabular-nums text-emerald-600">
                  {formatNumber(selectedMaterial.availableQty)} {selectedMaterial.uom}
                </strong>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput
              label={`Received Quantity (${selectedMaterial?.uom || 'Kg / Units'})`}
              name="quantity"
              type="number"
              required
              min="1"
              placeholder="e.g. 500"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />

            <FormInput
              label="Reference (PO # / Vendor Invoice / GRN)"
              name="reference"
              required
              placeholder="e.g. PO-2026-041 / GRN-902"
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
            />
          </div>

          <label className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/30 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={form.requireQc}
              onChange={(e) => setForm({ ...form, requireQc: e.target.checked })}
              className="mt-0.5 accent-[#051747]"
            />
            <div>
              <div className="font-semibold text-amber-900 dark:text-amber-200">
                Route Lot to Quality Inspection Queue (Quarantine Hold)
              </div>
              <div className="text-amber-700 dark:text-amber-300 mt-0.5">
                Standard ISO procedure: Material is physically held in the receiving quarantine bay and cannot be issued to CNC lines until accepted by Quality Control.
              </div>
            </div>
          </label>

          <FormTextarea
            label="Inward Remarks / Delivery Notes"
            name="remarks"
            rows={2}
            placeholder="e.g. Received from Kalyani Specialty Steels with mill test certificate. Transferred to Bay 2."
            value={form.remarks}
            onChange={(e) => setForm({ ...form, remarks: e.target.value })}
          />
        </form>
      </Modal>

      {/* Transaction Audit Modal */}
      {detailModalTarget && (
        <Modal
          isOpen={Boolean(detailModalTarget)}
          onClose={() => setDetailModalTarget(null)}
          title="Inward Receipt Details"
          subtitle={`Audit trail for Goods Receipt Note ${detailModalTarget.id}`}
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
                <span className="text-[#535F80] dark:text-slate-400 block font-medium">Received Quantity</span>
                <span className="font-bold text-emerald-600">+{formatNumber(Math.abs(detailModalTarget.quantity))} Units</span>
              </div>
              <div>
                <span className="text-[#535F80] dark:text-slate-400 block font-medium">QC Status</span>
                <StatusBadge status={detailModalTarget.status} size="xs" />
              </div>
            </div>

            <div>
              <span className="text-[#535F80] dark:text-slate-400 block font-medium mb-1">Remarks / Inward Log</span>
              <p className="p-2.5 rounded bg-[#E7E9F0]/60 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                {detailModalTarget.remarks || 'No notes attached to this transaction.'}
              </p>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#535F80] dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800">
              <span>Performed by: <strong>{detailModalTarget.performedBy}</strong></span>
              <span className="font-mono">{detailModalTarget.timestamp}</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
