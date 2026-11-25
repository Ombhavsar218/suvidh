import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Edit2, Trash2 } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { PrimaryButton, SecondaryButton } from '../../components/common/Buttons';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { Tooltip } from '../../components/common/Tooltip';
import { DataTable } from '../../components/tables/DataTable';
import { SearchInput, FilterDropdown } from '../../components/forms/Filters';
import { FormInput, FormSelect, FormTextarea } from '../../components/forms/FormFields';
import { useErpData } from '../../context/ErpDataContext';
import { useTableState } from '../../hooks/useTableState';
import { formatCurrency, formatDate, formatNumber } from '../../utils/formatters';

export function PurchasesPage() {
  const navigate = useNavigate();
  const { purchaseOrders, suppliers, materials, savePurchaseOrder } = useErpData();
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState('');

  const [form, setForm] = useState({
    id: '',
    poNumber: '',
    supplierId: '',
    orderDate: '2026-11-09',
    expectedArrival: '2026-11-15',
    status: 'Draft',
    notes: '',
    items: [],
  });

  const enrichedPOs = useMemo(() => {
    return purchaseOrders.map((po) => {
      const sup = suppliers.find((s) => s.id === po.supplierId);
      const firstMat = materials.find((m) => m.id === po.items?.[0]?.materialId);
      const totalQty = (po.items || []).reduce((s, i) => s + Number(i.orderedQty || 0), 0);
      const materialLabel =
        po.items?.length > 1
          ? `${firstMat?.name || 'Material'} (+${po.items.length - 1} more)`
          : firstMat?.name || '—';
      return {
        ...po,
        supplierName: sup?.name || po.supplierId,
        materialLabel,
        totalQty,
        uom: firstMat?.uom || '',
      };
    });
  }, [purchaseOrders, suppliers, materials]);

  const table = useTableState(enrichedPOs, {
    initialPageSize: 8,
    initialSortKey: 'orderDate',
    initialSortDir: 'desc',
    searchFields: ['poNumber', 'supplierName', 'materialLabel', 'status'],
  });

  const activeSuppliers = useMemo(
    () => suppliers.filter((s) => s.status === 'Active'),
    [suppliers]
  );

  const activeMaterials = useMemo(
    () => materials.filter((m) => m.status !== 'Inactive'),
    [materials]
  );

  const openCreate = () => {
    const firstMat = activeMaterials[0] || materials[0];
    setForm({
      id: '',
      poNumber: `PO-2026-0${47 + purchaseOrders.length}`,
      supplierId: activeSuppliers[0]?.id || suppliers[0]?.id || '',
      orderDate: '2026-11-09',
      expectedArrival: '2026-11-15',
      status: 'Draft',
      notes: '',
      items: firstMat
        ? [
            {
              id: `POI-${Date.now()}`,
              materialId: firstMat.id,
              orderedQty: 100,
              receivedQty: 0,
              uom: firstMat.uom,
              unitPrice: firstMat.unitCost,
            },
          ]
        : [],
    });
    setFormError('');
    setModalOpen(true);
  };

  const openEditDraft = (po, e) => {
    e?.stopPropagation();
    setForm({
      ...po,
      items: po.items.map((i) => ({ ...i })),
    });
    setFormError('');
    setModalOpen(true);
  };

  const addLineItem = () => {
    const firstMat = activeMaterials[0] || materials[0];
    if (!firstMat) return;
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: `POI-${Date.now()}-${prev.items.length}`,
          materialId: firstMat.id,
          orderedQty: 50,
          receivedQty: 0,
          uom: firstMat.uom,
          unitPrice: firstMat.unitCost,
        },
      ],
    }));
  };

  const updateLineItem = (idx, field, val) => {
    setForm((prev) => {
      const items = prev.items.map((item, i) => {
        if (i !== idx) return item;
        if (field === 'materialId') {
          const mat = materials.find((m) => m.id === val);
          return {
            ...item,
            materialId: val,
            uom: mat?.uom || item.uom,
            unitPrice: mat?.unitCost ?? item.unitPrice,
          };
        }
        return { ...item, [field]: val };
      });
      return { ...prev, items };
    });
  };

  const removeLineItem = (idx) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.supplierId) {
      setFormError('Select a supplier.');
      return;
    }
    if (form.items.length === 0) {
      setFormError('Add at least one material line item.');
      return;
    }
    savePurchaseOrder({
      ...form,
      items: form.items.map((i) => ({
        ...i,
        orderedQty: Number(i.orderedQty),
        unitPrice: Number(i.unitPrice),
      })),
    });
    setModalOpen(false);
  };

  const draftTotal = form.items.reduce(
    (sum, i) => sum + Number(i.orderedQty || 0) * Number(i.unitPrice || 0),
    0
  );

  const columns = [
    {
      key: 'poNumber',
      label: 'PO Number',
      sortable: true,
      render: (r) => <span className="font-mono text-xs font-semibold text-[#081F62]">{r.poNumber}</span>,
    },
    { key: 'supplierName', label: 'Supplier', sortable: true },
    {
      key: 'orderDate',
      label: 'Order Date',
      sortable: true,
      render: (r) => formatDate(r.orderDate),
    },
    {
      key: 'expectedArrival',
      label: 'Expected Arrival',
      sortable: true,
      render: (r) => formatDate(r.expectedArrival),
    },
    { key: 'materialLabel', label: 'Material(s)' },
    {
      key: 'totalQty',
      label: 'Quantity',
      align: 'right',
      numeric: true,
      render: (r) => `${formatNumber(r.totalQty)} ${r.items.length === 1 ? r.uom : 'units'}`,
    },
    {
      key: 'totalAmount',
      label: 'Amount',
      align: 'right',
      numeric: true,
      sortable: true,
      render: (r) => <span className="font-semibold">{formatCurrency(r.totalAmount)}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (r) => (
        <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Tooltip content="View PO Details">
            <button
              type="button"
              onClick={() => navigate(`/purchases/${r.id}`)}
              className="p-1.5 rounded hover:bg-[#E7E9F0]/70 dark:hover:bg-slate-800 text-[#535F80] hover:text-[#081F62] cursor-pointer"
              aria-label="View PO Details"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          {r.status === 'Draft' && (
            <Tooltip content="Edit Draft PO">
              <button
                type="button"
                onClick={(e) => openEditDraft(r, e)}
                className="p-1.5 rounded hover:bg-[#E7E9F0]/70 dark:hover:bg-slate-800 text-[#535F80] hover:text-[#081F62] cursor-pointer"
                aria-label="Edit Draft PO"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Purchase Management"
        description="Create multi-item supplier purchase orders, manage approvals, and receive raw materials into inspection."
        actions={
          <PrimaryButton icon={Plus} onClick={openCreate}>
            Create Purchase Order
          </PrimaryButton>
        }
      />

      <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-3.5 mb-4 flex flex-wrap items-center justify-between gap-3">
        <SearchInput
          value={table.search}
          onChange={table.setSearch}
          placeholder="Search PO number, supplier, material..."
          className="w-full sm:w-80"
        />
        <FilterDropdown
          label="Status"
          value={table.filters.status}
          onChange={(val) => table.setFilter('status', val)}
          options={[
            'Draft',
            'Pending Approval',
            'Approved',
            'Ordered',
            'Partially Received',
            'Received',
            'Cancelled',
          ]}
        />
      </div>

      <DataTable
        columns={columns}
        data={table.paginatedData}
        sortKey={table.sortKey}
        sortDir={table.sortDir}
        onSort={table.handleSort}
        onRowClick={(r) => navigate(`/purchases/${r.id}`)}
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
        title={form.id ? `Edit Draft PO — ${form.poNumber}` : 'Create Purchase Order'}
        size="xl"
        footer={
          <>
            <SecondaryButton onClick={() => setModalOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={handleSave}>Save Purchase Order</PrimaryButton>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <FormInput
              label="PO Number"
              name="poNumber"
              required
              value={form.poNumber}
              onChange={(e) => setForm({ ...form, poNumber: e.target.value })}
            />
            <FormSelect
              label="Supplier"
              name="supplierId"
              required
              value={form.supplierId}
              onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
              options={activeSuppliers.map((s) => ({ value: s.id, label: `${s.name} (${s.code})` }))}
            />
            <FormInput
              label="Order Date"
              name="orderDate"
              type="date"
              value={form.orderDate}
              onChange={(e) => setForm({ ...form, orderDate: e.target.value })}
            />
            <FormInput
              label="Expected Arrival"
              name="expectedArrival"
              type="date"
              value={form.expectedArrival}
              onChange={(e) => setForm({ ...form, expectedArrival: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect
              label="Initial Status"
              name="status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={['Draft', 'Pending Approval', 'Approved', 'Ordered']}
            />
            <FormTextarea
              label="Order Notes"
              name="notes"
              rows={1}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Material Line Items
              </h4>
              <SecondaryButton size="sm" icon={Plus} onClick={addLineItem}>
                Add Material
              </SecondaryButton>
            </div>
            <div className="border border-[#535F80]/30 dark:border-slate-700 rounded-md overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 border-b border-[#535F80]/30 dark:border-slate-700">
                    <th className="px-3 py-2 font-semibold">Raw Material</th>
                    <th className="px-3 py-2 font-semibold w-28">Quantity</th>
                    <th className="px-3 py-2 font-semibold w-20">Unit</th>
                    <th className="px-3 py-2 font-semibold w-28">Unit Rate</th>
                    <th className="px-3 py-2 font-semibold text-right w-28">Subtotal</th>
                    <th className="px-3 py-2 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {form.items.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td className="p-2">
                        <select
                          value={item.materialId}
                          onChange={(e) => updateLineItem(idx, 'materialId', e.target.value)}
                          className="w-full px-2 py-1.5 rounded border border-[#535F80]/30 dark:border-slate-700 bg-[#FEFEFE] dark:bg-slate-900 text-xs"
                        >
                          {activeMaterials.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.code} — {m.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="1"
                          value={item.orderedQty}
                          onChange={(e) => updateLineItem(idx, 'orderedQty', e.target.value)}
                          className="w-full px-2 py-1.5 rounded border border-[#535F80]/30 dark:border-slate-700 bg-[#FEFEFE] dark:bg-slate-900 text-xs tabular-nums"
                        />
                      </td>
                      <td className="p-2 text-slate-500 font-medium">{item.uom}</td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) => updateLineItem(idx, 'unitPrice', e.target.value)}
                          className="w-full px-2 py-1.5 rounded border border-[#535F80]/30 dark:border-slate-700 bg-[#FEFEFE] dark:bg-slate-900 text-xs tabular-nums"
                        />
                      </td>
                      <td className="p-2 text-right font-semibold tabular-nums">
                        {formatCurrency(Number(item.orderedQty || 0) * Number(item.unitPrice || 0))}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeLineItem(idx)}
                          className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end mt-3 text-sm font-semibold text-[#051747] dark:text-slate-100 tabular-nums">
              Total PO Amount: {formatCurrency(draftTotal)}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
