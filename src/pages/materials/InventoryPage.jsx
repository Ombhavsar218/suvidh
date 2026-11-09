import { useState, useMemo } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  SlidersHorizontal,
  Lock,
  ShieldAlert,
  History,
  Boxes,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { PrimaryButton, SecondaryButton } from '../../components/common/Buttons';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { Tabs } from '../../components/common/Tabs';
import { StatCard } from '../../components/dashboard/StatCard';
import { DataTable } from '../../components/tables/DataTable';
import { SearchInput, FilterDropdown } from '../../components/forms/Filters';
import { FormInput, FormSelect, FormTextarea } from '../../components/forms/FormFields';
import { useErpData } from '../../context/ErpDataContext';
import { getMaterialComputedFields } from '../../services/erpService';
import { useTableState } from '../../hooks/useTableState';
import { formatNumber } from '../../utils/formatters';

export function InventoryPage() {
  const { materials, materialTransactions, recordMaterialTransaction } = useErpData();
  const [activeTab, setActiveTab] = useState('stock');
  const [txnModal, setTxnModal] = useState({ open: false, type: 'Inward', materialId: '' });
  const [txnForm, setTxnForm] = useState({
    materialId: '',
    quantity: '',
    reference: '',
    remarks: '',
    requireQc: true,
  });

  const computedMaterials = useMemo(
    () => materials.map(getMaterialComputedFields),
    [materials]
  );

  const summary = useMemo(() => {
    return computedMaterials.reduce(
      (acc, m) => {
        acc.totalPhysical += m.totalPhysicalStock;
        acc.usableApproved += m.usableStock;
        acc.availableUnreserved += m.availableQty;
        acc.reserved += m.reservedQty;
        acc.pendingQc += m.pendingInspectionQty;
        acc.rejected += m.rejectedQty;
        if (m.isLowStock) acc.lowStockCount += 1;
        return acc;
      },
      {
        totalPhysical: 0,
        usableApproved: 0,
        availableUnreserved: 0,
        reserved: 0,
        pendingQc: 0,
        rejected: 0,
        lowStockCount: 0,
      }
    );
  }, [computedMaterials]);

  const stockTable = useTableState(computedMaterials, {
    initialPageSize: 10,
    initialSortKey: 'code',
    searchFields: ['code', 'name', 'category'],
  });

  const txnTable = useTableState(materialTransactions, {
    initialPageSize: 10,
    initialSortKey: 'timestamp',
    initialSortDir: 'desc',
    searchFields: ['id', 'reference', 'remarks', 'performedBy'],
  });

  const openTxnModal = (type, materialId = '') => {
    setTxnModal({ open: true, type });
    setTxnForm({
      materialId: materialId || materials[0]?.id || '',
      quantity: '',
      reference: '',
      remarks: '',
      requireQc: type === 'Inward',
    });
  };

  const handleTxnSubmit = (e) => {
    e.preventDefault();
    const ok = recordMaterialTransaction({
      materialId: txnForm.materialId,
      type: txnModal.type,
      quantity: Number(txnForm.quantity),
      reference: txnForm.reference,
      remarks: txnForm.remarks,
      requireQc: txnForm.requireQc,
    });
    if (ok) {
      setTxnModal({ open: false, type: 'Inward' });
    }
  };

  const selectedMat = computedMaterials.find((m) => m.id === txnForm.materialId);

  const stockColumns = [
    {
      key: 'code',
      label: 'Material Code',
      sortable: true,
      render: (r) => <span className="font-mono text-xs font-semibold">{r.code}</span>,
    },
    {
      key: 'name',
      label: 'Material Name',
      sortable: true,
      render: (r) => (
        <div>
          <div className="font-medium text-slate-900 dark:text-slate-100">{r.name}</div>
          <div className="text-[11px] text-slate-500">
            Physical Total: {formatNumber(r.totalPhysicalStock)} · Approved Usable: {formatNumber(r.usableStock)}
          </div>
        </div>
      ),
    },
    { key: 'category', label: 'Category', sortable: true },
    {
      key: 'availableQty',
      label: 'Available Qty',
      sortable: true,
      align: 'right',
      numeric: true,
      render: (r) => (
        <div>
          <span className={`font-semibold ${r.isLowStock ? 'text-red-600' : 'text-emerald-600'}`}>
            {formatNumber(r.availableQty)}
          </span>
          <div className="text-[10px] text-slate-400">Min: {formatNumber(r.reorderLevel)}</div>
        </div>
      ),
    },
    {
      key: 'reservedQty',
      label: 'Reserved Qty',
      sortable: true,
      align: 'right',
      numeric: true,
      render: (r) => (
        <span className="font-medium text-[#2563EB] dark:text-blue-400">
          {formatNumber(r.reservedQty)}
        </span>
      ),
    },
    {
      key: 'pendingInspectionQty',
      label: 'Pending QC / Rejected',
      align: 'right',
      render: (r) => (
        <div className="text-xs tabular-nums space-y-0.5">
          {r.pendingInspectionQty > 0 && (
            <div className="text-amber-600 font-medium">QC Hold: {formatNumber(r.pendingInspectionQty)}</div>
          )}
          {r.rejectedQty > 0 && (
            <div className="text-red-600">Rejected: {formatNumber(r.rejectedQty)}</div>
          )}
          {r.pendingInspectionQty === 0 && r.rejectedQty === 0 && (
            <span className="text-slate-400">—</span>
          )}
        </div>
      ),
    },
    { key: 'uom', label: 'Unit' },
    {
      key: 'stockStatus',
      label: 'Stock Status',
      sortable: true,
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          <StatusBadge status={r.stockStatus} size="xs" />
          {r.pendingInspectionQty > 0 && <StatusBadge status="Pending Inspection" size="xs" />}
          {r.rejectedQty > 0 && <StatusBadge status="Rejected" size="xs" />}
        </div>
      ),
    },
    {
      key: 'lastUpdated',
      label: 'Last Updated',
      sortable: true,
      render: (r) => <span className="text-xs text-slate-500 tabular-nums">{r.lastUpdated}</span>,
    },
    {
      key: 'actions',
      label: 'Quick Actions',
      align: 'right',
      render: (r) => (
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => openTxnModal('Inward', r.id)}
            className="px-2 py-1 text-[11px] font-medium rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            Inward
          </button>
          <button
            type="button"
            onClick={() => openTxnModal('Reservation', r.id)}
            className="px-2 py-1 text-[11px] font-medium rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            Reserve
          </button>
        </div>
      ),
    },
  ];

  const txnColumns = [
    {
      key: 'id',
      label: 'Txn ID',
      sortable: true,
      render: (r) => <span className="font-mono text-xs font-semibold">{r.id}</span>,
    },
    {
      key: 'materialId',
      label: 'Material',
      render: (r) => {
        const m = materials.find((item) => item.id === r.materialId);
        return (
          <div>
            <div className="font-medium text-xs">{m?.name || r.materialId}</div>
            <div className="text-[11px] font-mono text-slate-400">{m?.code}</div>
          </div>
        );
      },
    },
    { key: 'type', label: 'Transaction Type', sortable: true },
    {
      key: 'quantity',
      label: 'Quantity',
      align: 'right',
      numeric: true,
      render: (r) => {
        const m = materials.find((item) => item.id === r.materialId);
        return `${r.quantity > 0 ? '+' : ''}${formatNumber(r.quantity)} ${m?.uom || ''}`;
      },
    },
    { key: 'reference', label: 'Reference' },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <StatusBadge status={r.status} size="xs" />,
    },
    { key: 'performedBy', label: 'Performed By' },
    {
      key: 'timestamp',
      label: 'Timestamp',
      sortable: true,
      render: (r) => <span className="text-xs tabular-nums text-slate-500">{r.timestamp}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Raw Material Inventory"
        description="Track usable quality-approved stock separately from reserved, pending-inspection, and rejected material."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SecondaryButton size="sm" icon={ArrowDownToLine} onClick={() => openTxnModal('Inward')}>
              Stock Inward
            </SecondaryButton>
            <SecondaryButton size="sm" icon={ArrowUpFromLine} onClick={() => openTxnModal('Outward')}>
              Stock Outward
            </SecondaryButton>
            <SecondaryButton size="sm" icon={SlidersHorizontal} onClick={() => openTxnModal('Adjustment')}>
              Adjustment
            </SecondaryButton>
            <PrimaryButton size="sm" icon={Lock} onClick={() => openTxnModal('Reservation')}>
              Reserve Material
            </PrimaryButton>
          </div>
        }
      />

      {/* Business Rule Distinction KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Total Physical Stock"
          value={formatNumber(summary.totalPhysical)}
          sublabel="Approved + QC Hold + Rejected"
          icon={Boxes}
          tone="slate"
        />
        <StatCard
          label="Usable Approved Stock"
          value={formatNumber(summary.usableApproved)}
          sublabel="Quality-approved only"
          icon={CheckCircle2}
          tone="green"
        />
        <StatCard
          label="Available (Unreserved)"
          value={formatNumber(summary.availableUnreserved)}
          trend={`${summary.lowStockCount} low stock`}
          trendDirection={summary.lowStockCount > 0 ? 'down' : 'up'}
          sublabel="Excludes reserved qty"
          icon={Lock}
          tone="blue"
        />
        <StatCard
          label="Pending Inspection"
          value={formatNumber(summary.pendingQc)}
          sublabel="Not usable until QC pass"
          icon={ShieldAlert}
          tone="amber"
        />
        <StatCard
          label="Rejected / Quarantine"
          value={formatNumber(summary.rejected)}
          sublabel="Excluded from usable stock"
          icon={XCircle}
          tone="red"
        />
      </div>

      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { key: 'stock', label: 'Current Warehouse Stock', count: computedMaterials.length, icon: Boxes },
          { key: 'qc-hold', label: 'Pending Inspection & Rejected', count: computedMaterials.filter((m) => m.pendingInspectionQty > 0 || m.rejectedQty > 0).length, icon: ShieldAlert },
          { key: 'history', label: 'Material Transaction History', count: materialTransactions.length, icon: History },
        ]}
      />

      {activeTab === 'stock' && (
        <>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3">
            <SearchInput
              value={stockTable.search}
              onChange={stockTable.setSearch}
              placeholder="Search material code, name, category..."
              className="w-full sm:w-80"
            />
            <div className="flex flex-wrap items-center gap-3">
              <FilterDropdown
                label="Status"
                value={stockTable.filters.stockStatus}
                onChange={(val) => stockTable.setFilter('stockStatus', val)}
                options={['Available', 'Low Stock', 'Reserved']}
              />
            </div>
          </div>

          <DataTable
            columns={stockColumns}
            data={stockTable.paginatedData}
            sortKey={stockTable.sortKey}
            sortDir={stockTable.sortDir}
            onSort={stockTable.handleSort}
            pagination={{
              page: stockTable.page,
              totalPages: stockTable.totalPages,
              totalItems: stockTable.totalItems,
              pageSize: stockTable.pageSize,
              onPageChange: stockTable.setPage,
              onPageSizeChange: stockTable.setPageSize,
            }}
          />
        </>
      )}

      {activeTab === 'qc-hold' && (
        <DataTable
          data={computedMaterials.filter((m) => m.pendingInspectionQty > 0 || m.rejectedQty > 0)}
          columns={[
            { key: 'code', label: 'Material Code', render: (r) => <span className="font-mono text-xs font-semibold">{r.code}</span> },
            { key: 'name', label: 'Material Name' },
            {
              key: 'pendingInspectionQty',
              label: 'Pending Inspection Qty',
              align: 'right',
              numeric: true,
              render: (r) => (
                <span className="font-semibold text-amber-600">
                  {formatNumber(r.pendingInspectionQty)} {r.uom}
                </span>
              ),
            },
            {
              key: 'rejectedQty',
              label: 'Rejected Qty',
              align: 'right',
              numeric: true,
              render: (r) => (
                <span className="font-semibold text-red-600">
                  {formatNumber(r.rejectedQty)} {r.uom}
                </span>
              ),
            },
            {
              key: 'usableStock',
              label: 'Usable Approved Qty',
              align: 'right',
              numeric: true,
              render: (r) => `${formatNumber(r.usableStock)} ${r.uom}`,
            },
            {
              key: 'status',
              label: 'Quarantine Badges',
              render: (r) => (
                <div className="flex gap-1.5">
                  {r.pendingInspectionQty > 0 && <StatusBadge status="Pending Inspection" size="xs" />}
                  {r.rejectedQty > 0 && <StatusBadge status="Rejected" size="xs" />}
                </div>
              ),
            },
          ]}
        />
      )}

      {activeTab === 'history' && (
        <>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3">
            <SearchInput
              value={txnTable.search}
              onChange={txnTable.setSearch}
              placeholder="Search reference, remarks, user..."
              className="w-full sm:w-80"
            />
            <FilterDropdown
              label="Type"
              value={txnTable.filters.type}
              onChange={(val) => txnTable.setFilter('type', val)}
              options={['Inward', 'Outward', 'Reservation', 'Adjustment', 'QC Inspection']}
            />
          </div>

          <DataTable
            columns={txnColumns}
            data={txnTable.paginatedData}
            sortKey={txnTable.sortKey}
            sortDir={txnTable.sortDir}
            onSort={txnTable.handleSort}
            pagination={{
              page: txnTable.page,
              totalPages: txnTable.totalPages,
              totalItems: txnTable.totalItems,
              pageSize: txnTable.pageSize,
              onPageChange: txnTable.setPage,
              onPageSizeChange: txnTable.setPageSize,
            }}
          />
        </>
      )}

      {/* Stock Movement Modal */}
      <Modal
        isOpen={txnModal.open}
        onClose={() => setTxnModal({ open: false, type: 'Inward' })}
        title={`Record Stock ${txnModal.type}`}
        subtitle="Local warehouse ledger update."
        footer={
          <>
            <SecondaryButton onClick={() => setTxnModal({ open: false, type: 'Inward' })}>
              Cancel
            </SecondaryButton>
            <PrimaryButton onClick={handleTxnSubmit}>Confirm {txnModal.type}</PrimaryButton>
          </>
        }
      >
        <form onSubmit={handleTxnSubmit} className="space-y-4">
          <FormSelect
            label="Raw Material"
            name="materialId"
            required
            value={txnForm.materialId}
            onChange={(e) => setTxnForm({ ...txnForm, materialId: e.target.value })}
            options={computedMaterials.map((m) => ({
              value: m.id,
              label: `${m.code} — ${m.name} (Avail: ${m.availableQty} ${m.uom})`,
            }))}
          />

          {selectedMat && (
            <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-slate-500 block">Approved Usable</span>
                <strong className="tabular-nums">{selectedMat.usableStock} {selectedMat.uom}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Reserved</span>
                <strong className="tabular-nums text-[#2563EB]">{selectedMat.reservedQty} {selectedMat.uom}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Unreserved Avail</span>
                <strong className="tabular-nums text-emerald-600">{selectedMat.availableQty} {selectedMat.uom}</strong>
              </div>
            </div>
          )}

          <FormInput
            label={
              txnModal.type === 'Adjustment'
                ? `Adjustment Delta (${selectedMat?.uom || 'Units'}, use negative to deduct)`
                : `Quantity (${selectedMat?.uom || 'Units'})`
            }
            name="quantity"
            type="number"
            required
            value={txnForm.quantity}
            onChange={(e) => setTxnForm({ ...txnForm, quantity: e.target.value })}
          />

          {txnModal.type === 'Inward' && (
            <label className="flex items-start gap-2.5 p-3 rounded-md border border-amber-200 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/30 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={txnForm.requireQc}
                onChange={(e) => setTxnForm({ ...txnForm, requireQc: e.target.checked })}
                className="mt-0.5"
              />
              <div>
                <div className="font-semibold text-amber-900 dark:text-amber-200">
                  Hold in Pending Inspection Queue (Recommended Rule)
                </div>
                <div className="text-amber-700 dark:text-amber-300 mt-0.5">
                  Material will not count as usable stock until approved in Quality Control.
                </div>
              </div>
            </label>
          )}

          <FormInput
            label="Reference (PO / GRN / Plan ID)"
            name="reference"
            value={txnForm.reference}
            onChange={(e) => setTxnForm({ ...txnForm, reference: e.target.value })}
            placeholder="e.g., PO-2026-042 / PLAN-2026-011"
          />

          <FormTextarea
            label="Remarks"
            name="remarks"
            rows={2}
            value={txnForm.remarks}
            onChange={(e) => setTxnForm({ ...txnForm, remarks: e.target.value })}
          />
        </form>
      </Modal>
    </div>
  );
}
