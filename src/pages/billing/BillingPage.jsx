import { useState, useMemo } from 'react';
import { Plus, Eye, Printer, CreditCard } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { PrimaryButton, SecondaryButton } from '../../components/common/Buttons';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { DataTable } from '../../components/tables/DataTable';
import { SearchInput, FilterDropdown } from '../../components/forms/Filters';
import { FormInput, FormSelect, FormTextarea } from '../../components/forms/FormFields';
import { useErpData } from '../../context/ErpDataContext';
import { useTableState } from '../../hooks/useTableState';
import { triggerPrint } from '../../services/exportService';
import { formatCurrency, formatDate } from '../../utils/formatters';

export function BillingPage() {
  const {
    billingDocuments,
    customers,
    salesOrders,
    dispatches,
    products,
    settings,
    createBillingDocument,
    recordBillingPayment,
  } = useErpData();

  const [createOpen, setCreateOpen] = useState(false);
  const [proofDoc, setProofDoc] = useState(null);
  const [payAmount, setPayAmount] = useState('');

  const [form, setForm] = useState({
    documentType: 'Internal Dispatch Note & Billing Proof',
    customerId: '',
    salesOrderId: '',
    dispatchId: '',
    issueDate: '2026-11-09',
    dueDate: '2026-12-09',
    amount: 0,
    notes: '',
  });

  const enrichedDocs = useMemo(() => {
    return billingDocuments.map((b) => {
      const cust = customers.find((c) => c.id === b.customerId);
      const so = salesOrders.find((s) => s.id === b.salesOrderId);
      const disp = dispatches.find((d) => d.id === b.dispatchId);
      return {
        ...b,
        customerName: cust?.name || b.customerId,
        customerAddress: cust?.address || '',
        soNumber: so?.soNumber || b.salesOrderId,
        dispatchNumber: disp?.dispatchNumber || b.dispatchId,
        balance: Math.max(0, Number(b.amount || 0) - Number(b.paidAmount || 0)),
      };
    });
  }, [billingDocuments, customers, salesOrders, dispatches]);

  const table = useTableState(enrichedDocs, {
    initialPageSize: 8,
    initialSortKey: 'issueDate',
    initialSortDir: 'desc',
    searchFields: ['documentNumber', 'customerName', 'soNumber', 'dispatchNumber'],
  });

  const openCreate = () => {
    const firstDispatch = dispatches[0];
    const so = salesOrders.find((s) => s.id === firstDispatch?.salesOrderId);
    const prod = products.find((p) => p.id === firstDispatch?.productId);
    const estAmount =
      (firstDispatch?.dispatchQty || 0) * (so?.unitPrice || prod?.unitPrice || 0);

    setForm({
      documentType: 'Internal Dispatch Note & Billing Proof',
      customerId: firstDispatch?.customerId || customers[0]?.id || '',
      salesOrderId: firstDispatch?.salesOrderId || '',
      dispatchId: firstDispatch?.id || '',
      issueDate: '2026-11-09',
      dueDate: '2026-12-09',
      amount: estAmount,
      notes: '',
    });
    setCreateOpen(true);
  };

  const handleCreate = (e) => {
    e.preventDefault();
    const disp = dispatches.find((d) => d.id === form.dispatchId);
    const prod = products.find((p) => p.id === disp?.productId);
    createBillingDocument({
      ...form,
      amount: Number(form.amount || 0),
      paidAmount: 0,
      status: 'Pending Settlement',
      items: [
        {
          description: prod?.name || 'Manufactured Component Lot',
          qty: disp?.dispatchQty || 1,
          uom: prod?.uom || 'Nos',
          unitRate:
            disp?.dispatchQty > 0
              ? Math.round(Number(form.amount) / disp.dispatchQty)
              : Number(form.amount),
        },
      ],
    });
    setCreateOpen(false);
  };

  const columns = [
    {
      key: 'documentNumber',
      label: 'Document No.',
      sortable: true,
      render: (r) => <span className="font-mono text-xs font-semibold text-[#081F62]">{r.documentNumber}</span>,
    },
    {
      key: 'customerName',
      label: 'Customer',
      sortable: true,
      render: (r) => (
        <div>
          <div className="font-medium text-xs">{r.customerName}</div>
          <div className="text-[11px] text-slate-400">{r.documentType}</div>
        </div>
      ),
    },
    { key: 'dispatchNumber', label: 'Dispatch Ref' },
    { key: 'issueDate', label: 'Issue Date', sortable: true, render: (r) => formatDate(r.issueDate) },
    {
      key: 'amount',
      label: 'Document Amount',
      align: 'right',
      numeric: true,
      render: (r) => <span className="font-semibold">{formatCurrency(r.amount)}</span>,
    },
    {
      key: 'balance',
      label: 'Outstanding',
      align: 'right',
      numeric: true,
      render: (r) => (
        <span className={r.balance > 0 ? 'text-amber-600 font-semibold' : 'text-emerald-600'}>
          {formatCurrency(r.balance)}
        </span>
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
        <button
          type="button"
          onClick={() => {
            setProofDoc(r);
            setPayAmount(String(r.balance || ''));
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded border border-[#535F80]/30 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
        >
          <Eye className="w-3 h-3" />
          Proof Doc
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Internal Billing & Dispatch Proof"
        description="Generate internal billing slips, delivery proof notes, and track commercial settlement status (non-statutory internal billing)."
        actions={
          <PrimaryButton icon={Plus} onClick={openCreate}>
            Generate Billing Proof
          </PrimaryButton>
        }
      />

      <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-3.5 mb-4 flex flex-wrap items-center justify-between gap-3">
        <SearchInput
          value={table.search}
          onChange={table.setSearch}
          placeholder="Search document no., customer, dispatch..."
          className="w-full sm:w-80"
        />
        <FilterDropdown
          label="Status"
          value={table.filters.status}
          onChange={(val) => table.setFilter('status', val)}
          options={['Pending Settlement', 'Partially Paid', 'Settled']}
        />
      </div>

      <DataTable
        columns={columns}
        data={table.paginatedData}
        sortKey={table.sortKey}
        sortDir={table.sortDir}
        onSort={table.handleSort}
        onRowClick={(r) => {
          setProofDoc(r);
          setPayAmount(String(r.balance || ''));
        }}
        pagination={{
          page: table.page,
          totalPages: table.totalPages,
          totalItems: table.totalItems,
          pageSize: table.pageSize,
          onPageChange: table.setPage,
          onPageSizeChange: table.setPageSize,
        }}
      />

      {/* Create Proof Modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Generate Internal Billing & Proof Document"
        footer={
          <>
            <SecondaryButton onClick={() => setCreateOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={handleCreate}>Create Document</PrimaryButton>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <FormSelect
            label="Document Type"
            name="documentType"
            value={form.documentType}
            onChange={(e) => setForm({ ...form, documentType: e.target.value })}
            options={[
              'Internal Dispatch Note & Billing Proof',
              'Proforma Dispatch Proof',
              'Material Delivery Memo',
            ]}
          />
          <FormSelect
            label="Dispatch Reference"
            name="dispatchId"
            value={form.dispatchId}
            onChange={(e) => {
              const d = dispatches.find((item) => item.id === e.target.value);
              const so = salesOrders.find((s) => s.id === d?.salesOrderId);
              const prod = products.find((p) => p.id === d?.productId);
              setForm({
                ...form,
                dispatchId: e.target.value,
                customerId: d?.customerId || '',
                salesOrderId: d?.salesOrderId || '',
                amount: (d?.dispatchQty || 0) * (so?.unitPrice || prod?.unitPrice || 0),
              });
            }}
            options={dispatches.map((d) => ({
              value: d.id,
              label: `${d.dispatchNumber} — ${d.dispatchQty} units`,
            }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Issue Date"
              name="issueDate"
              type="date"
              value={form.issueDate}
              onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
            />
            <FormInput
              label="Total Document Amount (INR)"
              name="amount"
              type="number"
              min="0"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>
          <FormTextarea
            label="Notes"
            name="notes"
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </form>
      </Modal>

      {/* Printable Proof Document Preview Modal */}
      <Modal
        isOpen={Boolean(proofDoc)}
        onClose={() => setProofDoc(null)}
        title={`Internal Proof Document — ${proofDoc?.documentNumber || ''}`}
        size="lg"
        footer={
          <>
            <SecondaryButton icon={Printer} onClick={triggerPrint}>
              Print Proof Slip
            </SecondaryButton>
            <SecondaryButton onClick={() => setProofDoc(null)}>Close</SecondaryButton>
          </>
        }
      >
        {proofDoc && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-md border border-[#535F80]/30 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
              <div className="flex justify-between items-start border-b border-[#535F80]/30 dark:border-slate-700 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-[#051747] dark:text-slate-100">
                    {settings.companyName}
                  </h4>
                  <p className="text-slate-500">{settings.address}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{proofDoc.documentType}</p>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-sm text-[#081F62]">
                    {proofDoc.documentNumber}
                  </div>
                  <div className="text-slate-500">Issued: {formatDate(proofDoc.issueDate)}</div>
                  <StatusBadge status={proofDoc.status} size="xs" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-semibold">Bill / Deliver To</span>
                  <p className="font-semibold text-[#051747] dark:text-slate-100 mt-0.5">
                    {proofDoc.customerName}
                  </p>
                  <p className="text-slate-500">{proofDoc.customerAddress}</p>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 uppercase text-[10px] font-semibold">References</span>
                  <p className="mt-0.5">SO: <strong>{proofDoc.soNumber}</strong></p>
                  <p>Dispatch: <strong>{proofDoc.dispatchNumber}</strong></p>
                </div>
              </div>

              <table className="w-full text-left border-collapse border border-[#535F80]/30 dark:border-slate-700">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800">
                    <th className="p-2 border-b border-[#535F80]/30 dark:border-slate-700">Item Description</th>
                    <th className="p-2 border-b border-[#535F80]/30 dark:border-slate-700 text-right">Qty</th>
                    <th className="p-2 border-b border-[#535F80]/30 dark:border-slate-700 text-right">Rate</th>
                    <th className="p-2 border-b border-[#535F80]/30 dark:border-slate-700 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(proofDoc.items || []).map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-2">{it.description}</td>
                      <td className="p-2 text-right tabular-nums">{it.qty} {it.uom}</td>
                      <td className="p-2 text-right tabular-nums">{formatCurrency(it.unitRate)}</td>
                      <td className="p-2 text-right tabular-nums font-semibold">
                        {formatCurrency(it.qty * it.unitRate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-between items-center pt-2">
                <span className="text-slate-500 italic">{proofDoc.notes}</span>
                <div className="text-right space-y-0.5 tabular-nums">
                  <div>Total: <strong>{formatCurrency(proofDoc.amount)}</strong></div>
                  <div>Settled: <strong className="text-emerald-600">{formatCurrency(proofDoc.paidAmount)}</strong></div>
                  <div>Balance: <strong className="text-amber-600">{formatCurrency(proofDoc.balance)}</strong></div>
                </div>
              </div>
            </div>

            {proofDoc.balance > 0 && (
              <div className="flex items-end gap-3 p-3 rounded-md border border-[#535F80]/30 dark:border-slate-700 no-print">
                <FormInput
                  label="Record Payment Settlement (INR)"
                  name="payAmount"
                  type="number"
                  min="1"
                  max={proofDoc.balance}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="flex-1"
                />
                <PrimaryButton
                  icon={CreditCard}
                  onClick={() => {
                    recordBillingPayment(proofDoc.id, payAmount);
                    setProofDoc(null);
                  }}
                >
                  Record Settlement
                </PrimaryButton>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
