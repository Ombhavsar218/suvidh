import { useState, useMemo, useEffect } from 'react';
import { Download, Printer, FileBarChart } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { PrimaryButton, SecondaryButton } from '../../components/common/Buttons';
import { StatusBadge } from '../../components/common/StatusBadge';
import { DataTable } from '../../components/tables/DataTable';
import { SearchInput, FilterDropdown, DateRangeFilter } from '../../components/forms/Filters';
import { useApp } from '../../context/AppContext';
import { useErpData } from '../../context/ErpDataContext';
import { getMaterialComputedFields, getFinishedGoodComputedFields } from '../../services/erpService';
import { exportToCsv, triggerPrint } from '../../services/exportService';
import { formatCurrency, formatDate, formatNumber } from '../../utils/formatters';

const REPORT_TYPES = [
  { key: 'production', label: 'Production Report' },
  { key: 'machine-production', label: 'Machine-wise Production Report' },
  { key: 'raw-material-stock', label: 'Raw Material Stock Report' },
  { key: 'material-shortage', label: 'Material Shortage Report' },
  { key: 'purchase', label: 'Purchase Report' },
  { key: 'quality-inspection', label: 'Quality Inspection Report' },
  { key: 'rejection', label: 'Rejection Report' },
  { key: 'finished-goods', label: 'Finished Goods Report' },
  { key: 'sales', label: 'Sales Report' },
  { key: 'dispatch', label: 'Dispatch Report' },
  { key: 'pending-delivery', label: 'Pending Delivery Report' },
];

const STORE_RESTRICTED_REPORT_KEYS = ['production', 'machine-production', 'sales'];

export function ReportsPage() {
  const {
    customers,
    products,
    materials,
    machines,
    suppliers,
    schedules,
    purchaseOrders,
    productionEntries,
    qualityInspections,
    finishedGoods,
    salesOrders,
    dispatches,
  } = useErpData();

  const { activeRole } = useApp();

  const availableReports = useMemo(() => {
    if (activeRole === 'Store') {
      return REPORT_TYPES.filter((rt) => !STORE_RESTRICTED_REPORT_KEYS.includes(rt.key));
    }
    return REPORT_TYPES;
  }, [activeRole]);

  const [reportKey, setReportKey] = useState(() =>
    activeRole === 'Store' ? 'raw-material-stock' : 'production'
  );

  useEffect(() => {
    if (activeRole === 'Store' && STORE_RESTRICTED_REPORT_KEYS.includes(reportKey)) {
      setReportKey('raw-material-stock');
    }
  }, [activeRole, reportKey]);

  const effectiveReportKey =
    activeRole === 'Store' && STORE_RESTRICTED_REPORT_KEYS.includes(reportKey)
      ? 'raw-material-stock'
      : reportKey;

  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [customerFilter, setCustomerFilter] = useState('All');
  const [productFilter, setProductFilter] = useState('All');
  const [machineFilter, setMachineFilter] = useState('All');

  const computedMaterials = useMemo(() => materials.map(getMaterialComputedFields), [materials]);
  const computedFg = useMemo(() => finishedGoods.map(getFinishedGoodComputedFields), [finishedGoods]);

  const reportConfig = useMemo(() => {
    const withinDate = (dateStr) => {
      if (!dateStr) return true;
      const d = String(dateStr).slice(0, 10);
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      return true;
    };

    switch (effectiveReportKey) {
      case 'production': {
        const rows = productionEntries
          .filter((e) => withinDate(e.productionDate))
          .filter((e) => productFilter === 'All' || e.productId === productFilter)
          .filter((e) => machineFilter === 'All' || e.machineId === machineFilter)
          .map((e) => ({
            id: e.id,
            planId: e.planId,
            productName: products.find((p) => p.id === e.productId)?.name || e.productId,
            machineCode: machines.find((m) => m.id === e.machineId)?.code || e.machineId,
            date: e.productionDate,
            plannedQty: e.plannedQty,
            actualQty: e.actualQty,
            rejectedQty: e.rejectedQty,
            goodOutput: e.goodOutput,
            status: e.status,
          }));
        return {
          title: 'Production Report',
          columns: [
            { key: 'id', label: 'Entry ID' },
            { key: 'planId', label: 'Plan ID' },
            { key: 'productName', label: 'Product' },
            { key: 'machineCode', label: 'Machine' },
            { key: 'date', label: 'Date', render: (r) => formatDate(r.date) },
            { key: 'plannedQty', label: 'Planned', align: 'right', numeric: true },
            { key: 'actualQty', label: 'Actual', align: 'right', numeric: true },
            { key: 'rejectedQty', label: 'Rejected', align: 'right', numeric: true },
            { key: 'goodOutput', label: 'Good Output', align: 'right', numeric: true },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} size="xs" /> },
          ],
          rows,
        };
      }

      case 'machine-production': {
        const rows = machines
          .filter((m) => machineFilter === 'All' || m.id === machineFilter)
          .map((m) => {
            const entries = productionEntries.filter(
              (e) => e.machineId === m.id && withinDate(e.productionDate)
            );
            const actual = entries.reduce((s, e) => s + e.actualQty, 0);
            const good = entries.reduce((s, e) => s + e.goodOutput, 0);
            const rejected = entries.reduce((s, e) => s + e.rejectedQty, 0);
            return {
              id: m.id,
              code: m.code,
              name: m.name,
              category: m.category,
              dailyCapacity: m.dailyCapacity,
              efficiency: `${m.efficiency}%`,
              actual,
              good,
              rejected,
              status: m.status,
            };
          });
        return {
          title: 'Machine-wise Production Report',
          columns: [
            { key: 'code', label: 'Machine Code' },
            { key: 'name', label: 'Machine Name' },
            { key: 'category', label: 'Category' },
            { key: 'dailyCapacity', label: 'Daily Cap.', align: 'right', numeric: true },
            { key: 'efficiency', label: 'Efficiency', align: 'right', numeric: true },
            { key: 'actual', label: 'Produced Qty', align: 'right', numeric: true },
            { key: 'good', label: 'Good Output', align: 'right', numeric: true },
            { key: 'rejected', label: 'Rejected', align: 'right', numeric: true },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} size="xs" /> },
          ],
          rows,
        };
      }

      case 'raw-material-stock': {
        const rows = computedMaterials.map((m) => ({
          id: m.id,
          code: m.code,
          name: m.name,
          category: m.category,
          usableStock: m.usableStock,
          reservedQty: m.reservedQty,
          availableQty: m.availableQty,
          pendingInspectionQty: m.pendingInspectionQty,
          rejectedQty: m.rejectedQty,
          uom: m.uom,
          stockStatus: m.stockStatus,
        }));
        return {
          title: 'Raw Material Stock Report',
          columns: [
            { key: 'code', label: 'Code' },
            { key: 'name', label: 'Material Name' },
            { key: 'category', label: 'Category' },
            { key: 'usableStock', label: 'Approved Usable', align: 'right', numeric: true },
            { key: 'reservedQty', label: 'Reserved', align: 'right', numeric: true },
            { key: 'availableQty', label: 'Avail Unreserved', align: 'right', numeric: true },
            { key: 'pendingInspectionQty', label: 'Pending QC', align: 'right', numeric: true },
            { key: 'rejectedQty', label: 'Rejected', align: 'right', numeric: true },
            { key: 'uom', label: 'Unit' },
            { key: 'stockStatus', label: 'Status', render: (r) => <StatusBadge status={r.stockStatus} size="xs" /> },
          ],
          rows,
        };
      }

      case 'material-shortage': {
        const rows = computedMaterials
          .filter((m) => m.isLowStock || m.availableQty < m.reorderLevel)
          .map((m) => ({
            id: m.id,
            code: m.code,
            name: m.name,
            availableQty: m.availableQty,
            reorderLevel: m.reorderLevel,
            shortfall: Math.max(0, m.reorderLevel - m.availableQty),
            pendingInspectionQty: m.pendingInspectionQty,
            uom: m.uom,
          }));
        return {
          title: 'Material Shortage Report',
          columns: [
            { key: 'code', label: 'Code' },
            { key: 'name', label: 'Material Name' },
            { key: 'availableQty', label: 'Available Usable', align: 'right', numeric: true },
            { key: 'reorderLevel', label: 'Reorder Level', align: 'right', numeric: true },
            {
              key: 'shortfall',
              label: 'Shortfall',
              align: 'right',
              numeric: true,
              render: (r) => <span className="font-semibold text-red-600">{formatNumber(r.shortfall)}</span>,
            },
            { key: 'pendingInspectionQty', label: 'In QC Queue', align: 'right', numeric: true },
            { key: 'uom', label: 'Unit' },
          ],
          rows,
        };
      }

      case 'purchase': {
        const rows = purchaseOrders
          .filter((po) => withinDate(po.orderDate))
          .map((po) => ({
            id: po.id,
            poNumber: po.poNumber,
            supplier: suppliers.find((s) => s.id === po.supplierId)?.name || po.supplierId,
            orderDate: po.orderDate,
            expectedArrival: po.expectedArrival,
            itemCount: po.items.length,
            totalAmount: po.totalAmount,
            status: po.status,
          }));
        return {
          title: 'Purchase Order Report',
          columns: [
            { key: 'poNumber', label: 'PO Number' },
            { key: 'supplier', label: 'Supplier' },
            { key: 'orderDate', label: 'Order Date', render: (r) => formatDate(r.orderDate) },
            { key: 'expectedArrival', label: 'ETA', render: (r) => formatDate(r.expectedArrival) },
            { key: 'itemCount', label: 'Items', align: 'right', numeric: true },
            { key: 'totalAmount', label: 'Amount', align: 'right', numeric: true, render: (r) => formatCurrency(r.totalAmount) },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} size="xs" /> },
          ],
          rows,
        };
      }

      case 'quality-inspection': {
        const rows = qualityInspections
          .filter((q) => withinDate(q.inspectionDate))
          .map((q) => ({
            id: q.id,
            itemType: q.itemType,
            itemName: q.itemName,
            batchNumber: q.batchNumber,
            inspectionDate: q.inspectionDate,
            inspectedQty: q.inspectedQty,
            acceptedQty: q.acceptedQty,
            rejectedQty: q.rejectedQty,
            inspector: q.inspector,
            status: q.status,
          }));
        return {
          title: 'Quality Inspection Report',
          columns: [
            { key: 'id', label: 'QC ID' },
            { key: 'itemType', label: 'Type' },
            { key: 'itemName', label: 'Item' },
            { key: 'batchNumber', label: 'Batch' },
            { key: 'inspectionDate', label: 'Date', render: (r) => formatDate(r.inspectionDate) },
            { key: 'inspectedQty', label: 'Inspected', align: 'right', numeric: true },
            { key: 'acceptedQty', label: 'Accepted', align: 'right', numeric: true },
            { key: 'rejectedQty', label: 'Rejected', align: 'right', numeric: true },
            { key: 'inspector', label: 'Inspector' },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} size="xs" /> },
          ],
          rows,
        };
      }

      case 'rejection': {
        const rows = qualityInspections
          .filter((q) => q.rejectedQty > 0 && withinDate(q.inspectionDate))
          .map((q) => ({
            id: q.id,
            itemType: q.itemType,
            itemName: q.itemName,
            batchNumber: q.batchNumber,
            inspectionDate: q.inspectionDate,
            inspectedQty: q.inspectedQty,
            rejectedQty: q.rejectedQty,
            rejectionRate: `${Math.round((q.rejectedQty / Math.max(1, q.inspectedQty)) * 100)}%`,
            notes: q.notes,
          }));
        return {
          title: 'Rejection Report',
          columns: [
            { key: 'id', label: 'QC ID' },
            { key: 'itemType', label: 'Category' },
            { key: 'itemName', label: 'Item' },
            { key: 'batchNumber', label: 'Batch' },
            { key: 'inspectedQty', label: 'Inspected', align: 'right', numeric: true },
            { key: 'rejectedQty', label: 'Rejected', align: 'right', numeric: true, render: (r) => <span className="text-red-600 font-semibold">{r.rejectedQty}</span> },
            { key: 'rejectionRate', label: 'Rej %', align: 'right', numeric: true },
            { key: 'notes', label: 'Root Cause / Notes' },
          ],
          rows,
        };
      }

      case 'finished-goods': {
        const rows = computedFg
          .filter((f) => productFilter === 'All' || f.productId === productFilter)
          .map((f) => ({
            id: f.id,
            productName: products.find((p) => p.id === f.productId)?.name || f.productId,
            batchNumber: f.batchNumber,
            producedQty: f.producedQty,
            acceptedQty: f.acceptedQty,
            rejectedQty: f.rejectedQty,
            availableQty: f.availableQty,
            reservedQty: f.reservedQty,
            storageLocation: f.storageLocation,
          }));
        return {
          title: 'Finished Goods Report',
          columns: [
            { key: 'productName', label: 'Product' },
            { key: 'batchNumber', label: 'Batch Number' },
            { key: 'producedQty', label: 'Produced', align: 'right', numeric: true },
            { key: 'acceptedQty', label: 'Accepted (Usable)', align: 'right', numeric: true },
            { key: 'rejectedQty', label: 'Rejected', align: 'right', numeric: true },
            { key: 'availableQty', label: 'Available', align: 'right', numeric: true },
            { key: 'reservedQty', label: 'Reserved', align: 'right', numeric: true },
            { key: 'storageLocation', label: 'Location' },
          ],
          rows,
        };
      }

      case 'sales': {
        const rows = salesOrders
          .filter((s) => withinDate(s.orderDate))
          .filter((s) => customerFilter === 'All' || s.customerId === customerFilter)
          .filter((s) => productFilter === 'All' || s.productId === productFilter)
          .map((s) => ({
            id: s.id,
            soNumber: s.soNumber,
            customer: customers.find((c) => c.id === s.customerId)?.name || s.customerId,
            product: products.find((p) => p.id === s.productId)?.name || s.productId,
            orderDate: s.orderDate,
            quantity: s.quantity,
            dispatchedQty: s.dispatchedQty || 0,
            value: s.quantity * (s.unitPrice || 0),
            status: s.status,
          }));
        return {
          title: 'Sales Report',
          columns: [
            { key: 'soNumber', label: 'Sales Order' },
            { key: 'customer', label: 'Customer' },
            { key: 'product', label: 'Product' },
            { key: 'orderDate', label: 'Order Date', render: (r) => formatDate(r.orderDate) },
            { key: 'quantity', label: 'Qty', align: 'right', numeric: true },
            { key: 'dispatchedQty', label: 'Dispatched', align: 'right', numeric: true },
            { key: 'value', label: 'Order Value', align: 'right', numeric: true, render: (r) => formatCurrency(r.value) },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} size="xs" /> },
          ],
          rows,
        };
      }

      case 'dispatch': {
        const rows = dispatches
          .filter((d) => withinDate(d.dispatchDate))
          .filter((d) => customerFilter === 'All' || d.customerId === customerFilter)
          .filter((d) => productFilter === 'All' || d.productId === productFilter)
          .map((d) => ({
            id: d.id,
            dispatchNumber: d.dispatchNumber,
            customer: customers.find((c) => c.id === d.customerId)?.name || d.customerId,
            product: products.find((p) => p.id === d.productId)?.name || d.productId,
            dispatchQty: d.dispatchQty,
            dispatchDate: d.dispatchDate,
            vehicleNumber: d.vehicleNumber,
            deliveryStatus: d.deliveryStatus,
          }));
        return {
          title: 'Dispatch Report',
          columns: [
            { key: 'dispatchNumber', label: 'Dispatch No.' },
            { key: 'customer', label: 'Customer' },
            { key: 'product', label: 'Product' },
            { key: 'dispatchQty', label: 'Qty', align: 'right', numeric: true },
            { key: 'dispatchDate', label: 'Date', render: (r) => formatDate(r.dispatchDate) },
            { key: 'vehicleNumber', label: 'Vehicle' },
            { key: 'deliveryStatus', label: 'Status', render: (r) => <StatusBadge status={r.deliveryStatus} size="xs" /> },
          ],
          rows,
        };
      }

      case 'pending-delivery':
      default: {
        const rows = schedules
          .filter((s) => s.pendingQty > 0 && withinDate(s.requiredDate))
          .filter((s) => customerFilter === 'All' || s.customerId === customerFilter)
          .filter((s) => productFilter === 'All' || s.productId === productFilter)
          .map((s) => ({
            id: s.id,
            scheduleNumber: s.scheduleNumber,
            customer: customers.find((c) => c.id === s.customerId)?.name || s.customerId,
            product: products.find((p) => p.id === s.productId)?.name || s.productId,
            scheduledQty: s.scheduledQty,
            deliveredQty: s.deliveredQty,
            pendingQty: s.pendingQty,
            requiredDate: s.requiredDate,
            priority: s.priority,
          }));
        return {
          title: 'Pending Delivery Report',
          columns: [
            { key: 'scheduleNumber', label: 'Schedule No.' },
            { key: 'customer', label: 'Customer' },
            { key: 'product', label: 'Product' },
            { key: 'scheduledQty', label: 'Scheduled', align: 'right', numeric: true },
            { key: 'deliveredQty', label: 'Delivered', align: 'right', numeric: true },
            { key: 'pendingQty', label: 'Pending Qty', align: 'right', numeric: true, render: (r) => <span className="font-semibold text-amber-600">{r.pendingQty}</span> },
            { key: 'requiredDate', label: 'Required Date', render: (r) => formatDate(r.requiredDate) },
            { key: 'priority', label: 'Priority', render: (r) => <StatusBadge status={r.priority} size="xs" /> },
          ],
          rows,
        };
      }
    }
  }, [
    effectiveReportKey,
    fromDate,
    toDate,
    customerFilter,
    productFilter,
    machineFilter,
    productionEntries,
    products,
    machines,
    computedMaterials,
    purchaseOrders,
    suppliers,
    qualityInspections,
    computedFg,
    salesOrders,
    customers,
    dispatches,
    schedules,
  ]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return reportConfig.rows;
    const q = search.trim().toLowerCase();
    return reportConfig.rows.filter((row) =>
      Object.values(row).some((val) => String(val ?? '').toLowerCase().includes(q))
    );
  }, [reportConfig.rows, search]);

  const handleExportCsv = () => {
    const headers = reportConfig.columns.map((c) => c.label);
    const dataRows = filteredRows.map((row) =>
      reportConfig.columns.map((c) => row[c.key] ?? '')
    );
    exportToCsv(`Suvidh_${effectiveReportKey}_Report.csv`, headers, dataRows);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Operational Exports"
        description="Generate, filter, export (CSV), and print operational reports across production, inventory, QC, purchasing, and deliveries."
        actions={
          <div className="flex items-center gap-2 no-print">
            <SecondaryButton icon={Printer} onClick={triggerPrint}>
              Print Report
            </SecondaryButton>
            <PrimaryButton icon={Download} onClick={handleExportCsv}>
              Export CSV
            </PrimaryButton>
          </div>
        }
      />

      {/* Report Selector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-3 space-y-1 no-print">
          <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <FileBarChart className="w-3.5 h-3.5" />
            Available Reports ({availableReports.length})
          </div>
          {availableReports.map((rt, idx) => (
            <button
              key={rt.key}
              type="button"
              onClick={() => setReportKey(rt.key)}
              className={`w-full text-left px-3 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                effectiveReportKey === rt.key
                  ? 'bg-blue-50 text-[#081F62] dark:bg-blue-950/60 dark:text-blue-400 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {idx + 1}. {rt.label}
            </button>
          ))}
        </div>

        <div className="lg:col-span-3 space-y-4">
          {/* Filters Toolbar */}
          <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-4 space-y-3 no-print">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-[#051747] dark:text-slate-100">
                {reportConfig.title} ({filteredRows.length} records)
              </h3>
              <DateRangeFilter
                fromDate={fromDate}
                toDate={toDate}
                onFromChange={setFromDate}
                onToChange={setToDate}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Filter rows..."
                className="w-full sm:w-60"
              />
              <FilterDropdown
                label="Customer"
                value={customerFilter}
                onChange={setCustomerFilter}
                options={customers.map((c) => ({ value: c.id, label: c.name }))}
              />
              <FilterDropdown
                label="Product"
                value={productFilter}
                onChange={setProductFilter}
                options={products.map((p) => ({ value: p.id, label: p.code }))}
              />
              <FilterDropdown
                label="Machine"
                value={machineFilter}
                onChange={setMachineFilter}
                options={machines.map((m) => ({ value: m.id, label: m.code }))}
              />
            </div>
          </div>

          <DataTable columns={reportConfig.columns} data={filteredRows} />
        </div>
      </div>
    </div>
  );
}
