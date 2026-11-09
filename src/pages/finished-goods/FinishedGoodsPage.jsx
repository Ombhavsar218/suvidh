import { useState, useMemo } from 'react';
import { PackageCheck, CheckCircle2, XCircle, Layers, History } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { SecondaryButton } from '../../components/common/Buttons';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { StatCard } from '../../components/dashboard/StatCard';
import { DataTable } from '../../components/tables/DataTable';
import { SearchInput, FilterDropdown } from '../../components/forms/Filters';
import { useErpData } from '../../context/ErpDataContext';
import { getFinishedGoodComputedFields } from '../../services/erpService';
import { useTableState } from '../../hooks/useTableState';
import { formatDate, formatNumber } from '../../utils/formatters';

export function FinishedGoodsPage() {
  const { finishedGoods, products } = useErpData();
  const [selectedBatch, setSelectedBatch] = useState(null);

  const enrichedFg = useMemo(() => {
    return finishedGoods.map((fg) => {
      const comp = getFinishedGoodComputedFields(fg);
      const prod = products.find((p) => p.id === fg.productId);
      return {
        ...comp,
        productName: prod?.name || fg.productId,
        productCode: prod?.code || '',
        uom: prod?.uom || 'Nos',
        availabilityStatus:
          comp.acceptedQty === 0
            ? 'Rejected'
            : comp.availableQty > 0
            ? 'Available'
            : 'Reserved',
      };
    });
  }, [finishedGoods, products]);

  const totals = useMemo(() => {
    return enrichedFg.reduce(
      (acc, r) => {
        acc.produced += r.producedQty;
        acc.accepted += r.acceptedQty;
        acc.rejected += r.rejectedQty;
        acc.available += r.availableQty;
        return acc;
      },
      { produced: 0, accepted: 0, rejected: 0, available: 0 }
    );
  }, [enrichedFg]);

  const table = useTableState(enrichedFg, {
    initialPageSize: 8,
    initialSortKey: 'batchNumber',
    searchFields: ['productName', 'productCode', 'batchNumber', 'storageLocation'],
  });

  const columns = [
    {
      key: 'productName',
      label: 'Product',
      sortable: true,
      render: (r) => (
        <div>
          <div className="font-medium text-slate-900 dark:text-slate-100">{r.productName}</div>
          <div className="text-[11px] font-mono text-slate-400">{r.productCode}</div>
        </div>
      ),
    },
    {
      key: 'batchNumber',
      label: 'Batch Number',
      sortable: true,
      render: (r) => <span className="font-mono text-xs font-semibold">{r.batchNumber}</span>,
    },
    {
      key: 'producedQty',
      label: 'Produced Qty',
      align: 'right',
      numeric: true,
      render: (r) => formatNumber(r.producedQty),
    },
    {
      key: 'acceptedQty',
      label: 'Accepted (Usable)',
      align: 'right',
      numeric: true,
      render: (r) => (
        <span className="font-semibold text-emerald-600">{formatNumber(r.acceptedQty)}</span>
      ),
    },
    {
      key: 'rejectedQty',
      label: 'Rejected Qty',
      align: 'right',
      numeric: true,
      render: (r) => (
        <span className={r.rejectedQty > 0 ? 'text-red-600 font-medium' : 'text-slate-400'}>
          {formatNumber(r.rejectedQty)}
        </span>
      ),
    },
    {
      key: 'availableQty',
      label: 'Available Qty',
      align: 'right',
      numeric: true,
      sortable: true,
      render: (r) => (
        <span className="font-bold text-slate-900 dark:text-slate-100">
          {formatNumber(r.availableQty)} {r.uom}
        </span>
      ),
    },
    {
      key: 'reservedQty',
      label: 'Reserved Qty',
      align: 'right',
      numeric: true,
      render: (r) => <span className="text-[#2563EB] font-medium">{formatNumber(r.reservedQty)}</span>,
    },
    { key: 'storageLocation', label: 'Storage Location' },
    {
      key: 'availabilityStatus',
      label: 'Availability',
      render: (r) => <StatusBadge status={r.availabilityStatus} size="xs" />,
    },
    {
      key: 'actions',
      label: 'History',
      align: 'right',
      render: (r) => (
        <button
          type="button"
          onClick={() => setSelectedBatch(r)}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
        >
          <History className="w-3 h-3" />
          Batch
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finished Goods Inventory"
        description="Batch-wise finished goods tracking. Only QC-accepted quantities contribute to usable and dispatchable inventory."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Produced Units"
          value={formatNumber(totals.produced)}
          sublabel="Gross production output"
          icon={Layers}
          tone="slate"
        />
        <StatCard
          label="Accepted (Usable FG)"
          value={formatNumber(totals.accepted)}
          sublabel="Passed QC inspection"
          icon={CheckCircle2}
          tone="green"
        />
        <StatCard
          label="Available to Dispatch"
          value={formatNumber(totals.available)}
          sublabel="Accepted minus reserved"
          icon={PackageCheck}
          tone="blue"
        />
        <StatCard
          label="Rejected / Quarantined"
          value={formatNumber(totals.rejected)}
          sublabel="Excluded from usable stock"
          icon={XCircle}
          tone="red"
        />
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3">
        <SearchInput
          value={table.search}
          onChange={table.setSearch}
          placeholder="Search product, batch number, storage zone..."
          className="w-full sm:w-80"
        />
        <FilterDropdown
          label="Availability"
          value={table.filters.availabilityStatus}
          onChange={(val) => table.setFilter('availabilityStatus', val)}
          options={['Available', 'Reserved', 'Rejected']}
        />
      </div>

      <DataTable
        columns={columns}
        data={table.paginatedData}
        sortKey={table.sortKey}
        sortDir={table.sortDir}
        onSort={table.handleSort}
        onRowClick={(r) => setSelectedBatch(r)}
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
        isOpen={Boolean(selectedBatch)}
        onClose={() => setSelectedBatch(null)}
        title={`Batch Details — ${selectedBatch?.batchNumber || ''}`}
        subtitle={`${selectedBatch?.productName || ''} · ${selectedBatch?.storageLocation || ''}`}
        footer={<SecondaryButton onClick={() => setSelectedBatch(null)}>Close</SecondaryButton>}
      >
        {selectedBatch && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-2.5 rounded border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 block">Produced</span>
                <strong className="text-sm tabular-nums">{selectedBatch.producedQty}</strong>
              </div>
              <div className="p-2.5 rounded border border-emerald-200 dark:border-emerald-800">
                <span className="text-emerald-600 block">Usable Accepted</span>
                <strong className="text-sm tabular-nums text-emerald-600">{selectedBatch.acceptedQty}</strong>
              </div>
              <div className="p-2.5 rounded border border-blue-200 dark:border-blue-800">
                <span className="text-[#2563EB] block">Available</span>
                <strong className="text-sm tabular-nums text-[#2563EB]">{selectedBatch.availableQty}</strong>
              </div>
              <div className="p-2.5 rounded border border-red-200 dark:border-red-800">
                <span className="text-red-600 block">Rejected</span>
                <strong className="text-sm tabular-nums text-red-600">{selectedBatch.rejectedQty}</strong>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">
                Batch Stock History
              </h4>
              <div className="divide-y divide-slate-200 dark:divide-slate-700 border border-slate-200 dark:border-slate-700 rounded-md">
                {(selectedBatch.history || []).map((h, i) => (
                  <div key={i} className="px-3 py-2 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-slate-800 dark:text-slate-100">{h.action}</span>
                      <span className="text-slate-400 ml-2 font-mono">{h.ref}</span>
                    </div>
                    <div className="text-right tabular-nums">
                      <span className="font-semibold">{h.qty} {selectedBatch.uom}</span>
                      <span className="text-slate-400 ml-2">{formatDate(h.date)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
