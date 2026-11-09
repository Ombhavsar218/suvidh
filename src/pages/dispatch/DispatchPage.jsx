import { useState, useMemo } from 'react';
import { Plus, Eye, Truck, Clock } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { PrimaryButton, SecondaryButton } from '../../components/common/Buttons';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { Tabs } from '../../components/common/Tabs';
import { DataTable } from '../../components/tables/DataTable';
import { SearchInput, FilterDropdown } from '../../components/forms/Filters';
import { FormInput, FormSelect, FormTextarea } from '../../components/forms/FormFields';
import { useErpData } from '../../context/ErpDataContext';
import { useTableState } from '../../hooks/useTableState';
import { formatDate, formatNumber } from '../../utils/formatters';

export function DispatchPage() {
  const {
    dispatches,
    salesOrders,
    customers,
    products,
    createDispatchRecord,
    updateDispatchStatus,
  } = useErpData();

  const [activeTab, setActiveTab] = useState('dispatches');
  const [modalOpen, setModalOpen] = useState(false);
  const [detailDispatch, setDetailDispatch] = useState(null);

  const [form, setForm] = useState({
    salesOrderId: '',
    customerId: '',
    productId: '',
    dispatchQty: 50,
    dispatchDate: '2026-11-09',
    vehicleNumber: '',
    driverName: '',
    deliveryStatus: 'Pending Dispatch',
    remarks: '',
  });

  const enrichedDispatches = useMemo(() => {
    return dispatches.map((d) => {
      const cust = customers.find((c) => c.id === d.customerId);
      const so = salesOrders.find((s) => s.id === d.salesOrderId);
      const prod = products.find((p) => p.id === d.productId);
      return {
        ...d,
        customerName: cust?.name || d.customerId,
        soNumber: so?.soNumber || d.salesOrderId,
        productName: prod?.name || d.productId,
      };
    });
  }, [dispatches, customers, salesOrders, products]);

  const pendingDeliveries = useMemo(() => {
    return salesOrders
      .filter((so) => so.quantity - (so.dispatchedQty || 0) > 0 && so.status !== 'Draft')
      .map((so) => ({
        ...so,
        customerName: customers.find((c) => c.id === so.customerId)?.name || so.customerId,
        productName: products.find((p) => p.id === so.productId)?.name || so.productId,
        pendingQty: so.quantity - (so.dispatchedQty || 0),
      }));
  }, [salesOrders, customers, products]);

  const table = useTableState(enrichedDispatches, {
    initialPageSize: 8,
    initialSortKey: 'dispatchDate',
    initialSortDir: 'desc',
    searchFields: ['dispatchNumber', 'customerName', 'soNumber', 'productName', 'vehicleNumber'],
  });

  const openCreate = (presetSo = null) => {
    const so = presetSo || pendingDeliveries[0] || salesOrders[0];
    setForm({
      salesOrderId: so?.id || '',
      customerId: so?.customerId || '',
      productId: so?.productId || '',
      dispatchQty: so ? Math.max(1, so.quantity - (so.dispatchedQty || 0)) : 50,
      dispatchDate: '2026-11-09',
      vehicleNumber: 'MH-14-HG-4821',
      driverName: 'Santosh Kamble',
      deliveryStatus: 'Pending Dispatch',
      remarks: '',
    });
    setModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    createDispatchRecord(form);
    setModalOpen(false);
  };

  const columns = [
    {
      key: 'dispatchNumber',
      label: 'Dispatch No.',
      sortable: true,
      render: (r) => <span className="font-mono text-xs font-semibold text-[#2563EB]">{r.dispatchNumber}</span>,
    },
    { key: 'customerName', label: 'Customer', sortable: true },
    {
      key: 'soNumber',
      label: 'Sales Order',
      render: (r) => <span className="font-mono text-xs">{r.soNumber}</span>,
    },
    { key: 'productName', label: 'Product', sortable: true },
    {
      key: 'dispatchQty',
      label: 'Dispatch Qty',
      align: 'right',
      numeric: true,
      render: (r) => <span className="font-semibold">{formatNumber(r.dispatchQty)}</span>,
    },
    {
      key: 'dispatchDate',
      label: 'Dispatch Date',
      sortable: true,
      render: (r) => formatDate(r.dispatchDate),
    },
    {
      key: 'deliveryStatus',
      label: 'Delivery Status',
      sortable: true,
      render: (r) => <StatusBadge status={r.deliveryStatus} size="xs" />,
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (r) => (
        <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setDetailDispatch(r)}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-[#2563EB] cursor-pointer"
            title="View Dispatch Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          {r.deliveryStatus === 'Pending Dispatch' && (
            <button
              type="button"
              onClick={() => updateDispatchStatus(r.id, 'In Transit')}
              className="px-2 py-1 text-[11px] font-medium rounded border border-blue-200 bg-blue-50 text-[#2563EB] cursor-pointer"
            >
              Ship
            </button>
          )}
          {r.deliveryStatus === 'In Transit' && (
            <button
              type="button"
              onClick={() => updateDispatchStatus(r.id, 'Delivered')}
              className="px-2 py-1 text-[11px] font-medium rounded border border-emerald-200 bg-emerald-50 text-emerald-700 cursor-pointer"
            >
              Mark Delivered
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dispatch Management"
        description="Coordinate outbound shipments, vehicle challans, pending deliveries, and proof of delivery status."
        actions={
          <PrimaryButton icon={Plus} onClick={() => openCreate()}>
            Create Dispatch Record
          </PrimaryButton>
        }
      />

      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { key: 'dispatches', label: 'Dispatch History', count: dispatches.length, icon: Truck },
          { key: 'pending', label: 'Pending Deliveries', count: pendingDeliveries.length, icon: Clock },
        ]}
      />

      {activeTab === 'dispatches' && (
        <>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3">
            <SearchInput
              value={table.search}
              onChange={table.setSearch}
              placeholder="Search dispatch no., customer, SO, vehicle..."
              className="w-full sm:w-80"
            />
            <FilterDropdown
              label="Delivery Status"
              value={table.filters.deliveryStatus}
              onChange={(val) => table.setFilter('deliveryStatus', val)}
              options={['Pending Dispatch', 'In Transit', 'Delivered']}
            />
          </div>

          <DataTable
            columns={columns}
            data={table.paginatedData}
            sortKey={table.sortKey}
            sortDir={table.sortDir}
            onSort={table.handleSort}
            onRowClick={(r) => setDetailDispatch(r)}
            pagination={{
              page: table.page,
              totalPages: table.totalPages,
              totalItems: table.totalItems,
              pageSize: table.pageSize,
              onPageChange: table.setPage,
              onPageSizeChange: table.setPageSize,
            }}
          />
        </>
      )}

      {activeTab === 'pending' && (
        <DataTable
          data={pendingDeliveries}
          columns={[
            { key: 'soNumber', label: 'Sales Order', render: (r) => <span className="font-mono text-xs font-semibold">{r.soNumber}</span> },
            { key: 'customerName', label: 'Customer' },
            { key: 'productName', label: 'Product' },
            { key: 'quantity', label: 'Ordered', align: 'right', numeric: true },
            { key: 'dispatchedQty', label: 'Dispatched', align: 'right', numeric: true },
            {
              key: 'pendingQty',
              label: 'Pending Qty',
              align: 'right',
              numeric: true,
              render: (r) => <span className="font-semibold text-amber-600">{formatNumber(r.pendingQty)}</span>,
            },
            { key: 'deliveryDate', label: 'Due Date', render: (r) => formatDate(r.deliveryDate) },
            {
              key: 'action',
              label: 'Action',
              align: 'right',
              render: (r) => (
                <PrimaryButton size="sm" onClick={() => openCreate(r)}>
                  Dispatch Lot
                </PrimaryButton>
              ),
            },
          ]}
        />
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create Dispatch Record"
        footer={
          <>
            <SecondaryButton onClick={() => setModalOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={handleSave}>Save Dispatch</PrimaryButton>
          </>
        }
      >
        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormSelect
            label="Sales Order"
            name="salesOrderId"
            required
            value={form.salesOrderId}
            onChange={(e) => {
              const so = salesOrders.find((s) => s.id === e.target.value);
              setForm({
                ...form,
                salesOrderId: e.target.value,
                customerId: so?.customerId || '',
                productId: so?.productId || '',
                dispatchQty: so ? Math.max(1, so.quantity - (so.dispatchedQty || 0)) : form.dispatchQty,
              });
            }}
            options={salesOrders.map((s) => ({
              value: s.id,
              label: `${s.soNumber} (${s.quantity - (s.dispatchedQty || 0)} pending)`,
            }))}
          />
          <FormInput
            label="Dispatch Quantity"
            name="dispatchQty"
            type="number"
            min="1"
            required
            value={form.dispatchQty}
            onChange={(e) => setForm({ ...form, dispatchQty: e.target.value })}
          />
          <FormInput
            label="Dispatch Date"
            name="dispatchDate"
            type="date"
            required
            value={form.dispatchDate}
            onChange={(e) => setForm({ ...form, dispatchDate: e.target.value })}
          />
          <FormSelect
            label="Initial Status"
            name="deliveryStatus"
            value={form.deliveryStatus}
            onChange={(e) => setForm({ ...form, deliveryStatus: e.target.value })}
            options={['Pending Dispatch', 'In Transit', 'Delivered']}
          />
          <FormInput
            label="Vehicle Number"
            name="vehicleNumber"
            value={form.vehicleNumber}
            onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })}
          />
          <FormInput
            label="Driver / Carrier"
            name="driverName"
            value={form.driverName}
            onChange={(e) => setForm({ ...form, driverName: e.target.value })}
          />
          <FormTextarea
            label="Dispatch Remarks"
            name="remarks"
            className="sm:col-span-2"
            rows={2}
            value={form.remarks}
            onChange={(e) => setForm({ ...form, remarks: e.target.value })}
          />
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(detailDispatch)}
        onClose={() => setDetailDispatch(null)}
        title={`Dispatch Details — ${detailDispatch?.dispatchNumber || ''}`}
        subtitle={`${detailDispatch?.customerName || ''} · SO: ${detailDispatch?.soNumber || ''}`}
        footer={<SecondaryButton onClick={() => setDetailDispatch(null)}>Close</SecondaryButton>}
      >
        {detailDispatch && (
          <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex justify-between">
              <span>Product</span>
              <strong className="text-slate-900 dark:text-slate-100">{detailDispatch.productName}</strong>
            </div>
            <div className="flex justify-between">
              <span>Dispatched Quantity</span>
              <strong className="tabular-nums">{detailDispatch.dispatchQty} units</strong>
            </div>
            <div className="flex justify-between">
              <span>Dispatch Date</span>
              <span>{formatDate(detailDispatch.dispatchDate)}</span>
            </div>
            <div className="flex justify-between">
              <span>Vehicle & Driver</span>
              <span>{detailDispatch.vehicleNumber} ({detailDispatch.driverName})</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Delivery Status</span>
              <StatusBadge status={detailDispatch.deliveryStatus} size="xs" />
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
              <span className="text-slate-500 block mb-1">Remarks</span>
              <p>{detailDispatch.remarks || 'Standard delivery challan attached.'}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
