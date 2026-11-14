import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, PackagePlus, Send, XCircle } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { PrimaryButton, SecondaryButton } from '../../components/common/Buttons';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/States';
import { DataTable } from '../../components/tables/DataTable';
import { FormInput, FormSelect } from '../../components/forms/FormFields';
import { useErpData } from '../../context/ErpDataContext';
import { formatCurrency, formatDate, formatNumber } from '../../utils/formatters';

export function PurchaseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    purchaseOrders,
    suppliers,
    materials,
    updatePurchaseStatus,
    receivePurchaseItems,
  } = useErpData();

  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveForm, setReceiveForm] = useState({
    materialId: '',
    receivedQty: '',
    grnNumber: '',
  });

  const po = purchaseOrders.find((p) => p.id === id);

  if (!po) {
    return (
      <EmptyState
        title="Purchase Order not found"
        action={<SecondaryButton onClick={() => navigate('/purchases')}>Back to Purchases</SecondaryButton>}
      />
    );
  }

  const supplier = suppliers.find((s) => s.id === po.supplierId);

  const openReceiveModal = () => {
    const pendingItem = po.items.find((i) => i.receivedQty < i.orderedQty) || po.items[0];
    setReceiveForm({
      materialId: pendingItem?.materialId || '',
      receivedQty: pendingItem
        ? String(Math.max(1, pendingItem.orderedQty - pendingItem.receivedQty))
        : '',
      grnNumber: `GRN-${Math.floor(885 + Math.random() * 100)}`,
    });
    setReceiveOpen(true);
  };

  const handleReceive = (e) => {
    e.preventDefault();
    receivePurchaseItems(po.id, receiveForm);
    setReceiveOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Purchase Order ${po.poNumber}`}
        description={`Supplier: ${supplier?.name || po.supplierId} · Ordered ${formatDate(po.orderDate)} · Expected ${formatDate(po.expectedArrival)}`}
        badge={<StatusBadge status={po.status} />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SecondaryButton icon={ArrowLeft} onClick={() => navigate('/purchases')}>
              Back
            </SecondaryButton>
            {po.status === 'Draft' && (
              <PrimaryButton
                icon={Send}
                onClick={() => updatePurchaseStatus(po.id, 'Pending Approval')}
              >
                Submit for Approval
              </PrimaryButton>
            )}
            {po.status === 'Pending Approval' && (
              <PrimaryButton
                variant="success"
                icon={CheckCircle2}
                onClick={() => updatePurchaseStatus(po.id, 'Approved')}
              >
                Approve PO
              </PrimaryButton>
            )}
            {po.status === 'Approved' && (
              <PrimaryButton
                icon={Send}
                onClick={() => updatePurchaseStatus(po.id, 'Ordered')}
              >
                Mark Ordered
              </PrimaryButton>
            )}
            {(po.status === 'Ordered' || po.status === 'Partially Received') && (
              <PrimaryButton icon={PackagePlus} onClick={openReceiveModal}>
                Receive Materials (GRN)
              </PrimaryButton>
            )}
            {po.status !== 'Received' && po.status !== 'Cancelled' && (
              <SecondaryButton
                onClick={() => updatePurchaseStatus(po.id, 'Cancelled')}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                Cancel PO
              </SecondaryButton>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-4">
          <p className="text-xs text-slate-500">Supplier Details</p>
          <p className="text-sm font-semibold mt-1">{supplier?.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">{supplier?.contactPerson} · {supplier?.phone}</p>
        </div>
        <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-4">
          <p className="text-xs text-slate-500">Order Value</p>
          <p className="text-xl font-bold mt-1 tabular-nums">{formatCurrency(po.totalAmount)}</p>
          <p className="text-xs text-slate-500 mt-0.5">{po.items.length} line item(s)</p>
        </div>
        <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-4">
          <p className="text-xs text-slate-500">Notes</p>
          <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
            {po.notes || 'No remarks recorded.'}
          </p>
        </div>
      </div>

      {/* Material-wise Line Items */}
      <div>
        <h3 className="text-sm font-semibold text-[#051747] dark:text-slate-100 mb-3">
          Material-wise Order Breakdown
        </h3>
        <DataTable
          data={po.items}
          columns={[
            {
              key: 'materialId',
              label: 'Material Code',
              render: (r) => (
                <span className="font-mono text-xs font-semibold">
                  {materials.find((m) => m.id === r.materialId)?.code || r.materialId}
                </span>
              ),
            },
            {
              key: 'materialName',
              label: 'Material Name',
              render: (r) => materials.find((m) => m.id === r.materialId)?.name || '—',
            },
            { key: 'orderedQty', label: 'Ordered', align: 'right', numeric: true, render: (r) => `${formatNumber(r.orderedQty)} ${r.uom}` },
            { key: 'receivedQty', label: 'Received', align: 'right', numeric: true, render: (r) => `${formatNumber(r.receivedQty)} ${r.uom}` },
            {
              key: 'pending',
              label: 'Pending',
              align: 'right',
              numeric: true,
              render: (r) => (
                <span className={r.orderedQty - r.receivedQty > 0 ? 'text-amber-600 font-semibold' : 'text-emerald-600'}>
                  {formatNumber(Math.max(0, r.orderedQty - r.receivedQty))} {r.uom}
                </span>
              ),
            },
            { key: 'unitPrice', label: 'Unit Rate', align: 'right', numeric: true, render: (r) => formatCurrency(r.unitPrice) },
            {
              key: 'subtotal',
              label: 'Line Total',
              align: 'right',
              numeric: true,
              render: (r) => <span className="font-semibold">{formatCurrency(r.orderedQty * r.unitPrice)}</span>,
            },
          ]}
        />
      </div>

      {/* Receiving History */}
      <div>
        <h3 className="text-sm font-semibold text-[#051747] dark:text-slate-100 mb-3">
          Receiving & GRN History ({po.receivingHistory?.length || 0})
        </h3>
        <DataTable
          data={po.receivingHistory || []}
          emptyTitle="No goods received yet"
          emptyDescription="Use 'Receive Materials (GRN)' when shipment arrives to queue incoming QC inspection."
          columns={[
            { key: 'grnNumber', label: 'GRN No.', render: (r) => <span className="font-mono text-xs font-semibold">{r.grnNumber}</span> },
            {
              key: 'materialId',
              label: 'Material',
              render: (r) => materials.find((m) => m.id === r.materialId)?.name || r.materialId,
            },
            { key: 'receivedQty', label: 'Received Qty', align: 'right', numeric: true },
            { key: 'receivedDate', label: 'Received Timestamp', render: (r) => <span className="text-xs tabular-nums">{r.receivedDate}</span> },
            { key: 'receivedBy', label: 'Received By' },
            { key: 'qcStatus', label: 'QC Status', render: (r) => <StatusBadge status={r.qcStatus} size="xs" /> },
          ]}
        />
      </div>

      <Modal
        isOpen={receiveOpen}
        onClose={() => setReceiveOpen(false)}
        title="Receive Material against PO (GRN)"
        subtitle="Received quantity enters Pending Inspection queue until Quality Control approves."
        footer={
          <>
            <SecondaryButton onClick={() => setReceiveOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={handleReceive}>Record GRN & Queue QC</PrimaryButton>
          </>
        }
      >
        <form onSubmit={handleReceive} className="space-y-4">
          <FormSelect
            label="Material Line Item"
            name="materialId"
            required
            value={receiveForm.materialId}
            onChange={(e) => setReceiveForm({ ...receiveForm, materialId: e.target.value })}
            options={po.items.map((i) => {
              const m = materials.find((mat) => mat.id === i.materialId);
              return {
                value: i.materialId,
                label: `${m?.code} — ${m?.name} (Pending: ${Math.max(0, i.orderedQty - i.receivedQty)} ${i.uom})`,
              };
            })}
          />
          <FormInput
            label="GRN Number"
            name="grnNumber"
            required
            value={receiveForm.grnNumber}
            onChange={(e) => setReceiveForm({ ...receiveForm, grnNumber: e.target.value })}
          />
          <FormInput
            label="Received Quantity"
            name="receivedQty"
            type="number"
            min="1"
            required
            value={receiveForm.receivedQty}
            onChange={(e) => setReceiveForm({ ...receiveForm, receivedQty: e.target.value })}
          />
        </form>
      </Modal>
    </div>
  );
}
