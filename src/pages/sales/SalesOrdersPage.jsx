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
import { formatCurrency, formatDate, formatNumber } from '../../utils/formatters';

export function SalesOrdersPage() {
  const { salesOrders, customers, products, dispatches, saveSalesOrder } = useErpData();
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState(null);

  const [form, setForm] = useState({
    id: '',
    soNumber: '',
    customerId: '',
    orderDate: '2026-11-09',
    productId: '',
    quantity: 100,
    deliveryDate: '2026-11-22',
    unitPrice: 0,
    status: 'Draft',
    notes: '',
  });

  const enrichedOrders = useMemo(() => {
    return salesOrders.map((so) => {
      const cust = customers.find((c) => c.id === so.customerId);
      const prod = products.find((p) => p.id === so.productId);
      const progressPct =
        so.quantity > 0 ? Math.min(100, Math.round(((so.dispatchedQty || 0) / so.quantity) * 100)) : 0;
      return {
        ...so,
        customerName: cust?.name || so.customerId,
        productName: prod?.name || so.productId,
        productCode: prod?.code || '',
        totalValue: Number(so.quantity || 0) * Number(so.unitPrice || prod?.unitPrice || 0),
        progressPct,
      };
    });
  }, [salesOrders, customers, products]);

  const table = useTableState(enrichedOrders, {
    initialPageSize: 8,
    initialSortKey: 'orderDate',
    initialSortDir: 'desc',
    searchFields: ['soNumber', 'customerName', 'productName', 'status'],
  });

  const openAdd = () => {
    const firstProd = products[0];
    setForm({
      id: '',
      soNumber: `SO-2026-${301 + salesOrders.length}`,
      customerId: customers[0]?.id || '',
      orderDate: '2026-11-09',
      productId: firstProd?.id || '',
      quantity: 100,
      deliveryDate: '2026-11-22',
      unitPrice: firstProd?.unitPrice || 0,
      status: 'Draft',
      notes: '',
    });
    setModalOpen(true);
  };

  const openEdit = (so, e) => {
    e?.stopPropagation();
    setForm(so);
    setModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    saveSalesOrder({
      ...form,
      quantity: Number(form.quantity),
      unitPrice: Number(form.unitPrice),
    });
    setModalOpen(false);
  };

  const columns = [
    {
      key: 'soNumber',
      label: 'Sales Order No.',
      sortable: true,
      render: (r) => <span className="font-mono text-xs font-semibold text-[#2563EB]">{r.soNumber}</span>,
    },
    { key: 'customerName', label: 'Customer', sortable: true },
    {
      key: 'orderDate',
      label: 'Order Date',
      sortable: true,
      render: (r) => formatDate(r.orderDate),
    },
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
      key: 'quantity',
      label: 'Quantity',
      align: 'right',
      numeric: true,
      render: (r) => (
        <div>
          <span className="font-semibold">{formatNumber(r.quantity)}</span>
          <div className="text-[10px] text-slate-500">{r.dispatchedQty || 0} dispatched</div>
        </div>
      ),
    },
    {
      key: 'progressPct',
      label: 'Fulfillment',
      render: (r) => (
        <div className="w-24">
          <div className="text-[11px] tabular-nums mb-1">{r.progressPct}%</div>
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-[#2563EB]" style={{ width: `${r.progressPct}%` }} />
          </div>
        </div>
      ),
    },
    {
      key: 'deliveryDate',
      label: 'Delivery Date',
      sortable: true,
      render: (r) => formatDate(r.deliveryDate),
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
            onClick={() => setDetailOrder(r)}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-[#2563EB] cursor-pointer"
            title="View Order Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          {r.status === 'Draft' && (
            <button
              type="button"
              onClick={(e) => openEdit(r, e)}
              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-[#2563EB] cursor-pointer"
              title="Edit Draft Order"
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
        title="Sales Orders"
        description="Track OEM customer sales orders, order progress, and delivery commitments."
        actions={
          <PrimaryButton icon={Plus} onClick={openAdd}>
            Create Sales Order
          </PrimaryButton>
        }
      />

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 mb-4 flex flex-wrap items-center justify-between gap-3">
        <SearchInput
          value={table.search}
          onChange={table.setSearch}
          placeholder="Search SO number, customer, product..."
          className="w-full sm:w-80"
        />
        <FilterDropdown
          label="Status"
          value={table.filters.status}
          onChange={(val) => table.setFilter('status', val)}
          options={['Draft', 'Pending', 'In Production', 'Completed', 'Dispatched']}
        />
      </div>

      <DataTable
        columns={columns}
        data={table.paginatedData}
        sortKey={table.sortKey}
        sortDir={table.sortDir}
        onSort={table.handleSort}
        onRowClick={(r) => setDetailOrder(r)}
        pagination={{
          page: table.page,
          totalPages: table.totalPages,
          totalItems: table.totalItems,
          pageSize: table.pageSize,
          onPageChange: table.setPage,
          onPageSizeChange: table.setPageSize,
        }}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? `Edit Draft Order — ${form.soNumber}` : 'Create Sales Order'}
        footer={
          <>
            <SecondaryButton onClick={() => setModalOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={handleSave}>Save Sales Order</PrimaryButton>
          </>
        }
      >
        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput
            label="Sales Order Number"
            name="soNumber"
            required
            value={form.soNumber}
            onChange={(e) => setForm({ ...form, soNumber: e.target.value })}
          />
          <FormSelect
            label="Customer"
            name="customerId"
            required
            value={form.customerId}
            onChange={(e) => setForm({ ...form, customerId: e.target.value })}
            options={customers.map((c) => ({ value: c.id, label: c.name }))}
          />
          <FormSelect
            label="Product"
            name="productId"
            required
            value={form.productId}
            onChange={(e) => {
              const p = products.find((item) => item.id === e.target.value);
              setForm({ ...form, productId: e.target.value, unitPrice: p?.unitPrice || 0 });
            }}
            options={products.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))}
          />
          <FormInput
            label="Order Quantity"
            name="quantity"
            type="number"
            min="1"
            required
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          />
          <FormInput
            label="Order Date"
            name="orderDate"
            type="date"
            value={form.orderDate}
            onChange={(e) => setForm({ ...form, orderDate: e.target.value })}
          />
          <FormInput
            label="Delivery Date"
            name="deliveryDate"
            type="date"
            value={form.deliveryDate}
            onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })}
          />
          <FormInput
            label="Unit Rate (INR)"
            name="unitPrice"
            type="number"
            min="0"
            value={form.unitPrice}
            onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
          />
          <FormSelect
            label="Status"
            name="status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            options={['Draft', 'Pending', 'In Production', 'Completed']}
          />
          <FormTextarea
            label="Order Notes"
            name="notes"
            className="sm:col-span-2"
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(detailOrder)}
        onClose={() => setDetailOrder(null)}
        title={`Sales Order — ${detailOrder?.soNumber || ''}`}
        subtitle={`${detailOrder?.customerName || ''} · ${detailOrder?.productName || ''}`}
        footer={<SecondaryButton onClick={() => setDetailOrder(null)}>Close</SecondaryButton>}
      >
        {detailOrder && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 block">Ordered Qty</span>
                <strong className="text-base tabular-nums">{detailOrder.quantity}</strong>
              </div>
              <div className="p-3 rounded border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 block">Dispatched</span>
                <strong className="text-base tabular-nums text-[#2563EB]">{detailOrder.dispatchedQty || 0}</strong>
              </div>
              <div className="p-3 rounded border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 block">Order Value</span>
                <strong className="text-base tabular-nums">{formatCurrency(detailOrder.totalValue)}</strong>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Linked Dispatches</h4>
              {dispatches.filter((d) => d.salesOrderId === detailOrder.id).length === 0 ? (
                <p className="text-slate-500">No dispatches recorded for this sales order yet.</p>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-700 border border-slate-200 dark:border-slate-700 rounded">
                  {dispatches
                    .filter((d) => d.salesOrderId === detailOrder.id)
                    .map((d) => (
                      <div key={d.id} className="p-2.5 flex justify-between items-center">
                        <span>
                          <strong className="font-mono">{d.dispatchNumber}</strong> · {formatDate(d.dispatchDate)}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="tabular-nums font-medium">{d.dispatchQty} Nos</span>
                          <StatusBadge status={d.deliveryStatus} size="xs" />
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
