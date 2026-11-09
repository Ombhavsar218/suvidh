import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Layers, Cpu, PackageCheck } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { SecondaryButton } from '../../components/common/Buttons';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/States';
import { DataTable } from '../../components/tables/DataTable';
import { useErpData } from '../../context/ErpDataContext';
import { getFinishedGoodComputedFields } from '../../services/erpService';
import { formatCurrency, formatNumber } from '../../utils/formatters';

export function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, boms, materials, machines, finishedGoods } = useErpData();

  const product = products.find((p) => p.id === id);

  if (!product) {
    return (
      <EmptyState
        title="Product not found"
        description="The requested product record is unavailable."
        action={<SecondaryButton onClick={() => navigate('/products')}>Back to Products</SecondaryButton>}
      />
    );
  }

  const bom = boms.find((b) => b.productId === product.id);
  const compatibleMachines = machines.filter((m) =>
    (m.supportedProductIds || []).includes(product.id)
  );
  const fgBatches = finishedGoods
    .filter((fg) => fg.productId === product.id)
    .map(getFinishedGoodComputedFields);

  return (
    <div className="space-y-6">
      <PageHeader
        title={product.name}
        description={`${product.code} · ${product.category} · UOM: ${product.uom}`}
        badge={<StatusBadge status={product.status} />}
        actions={
          <SecondaryButton icon={ArrowLeft} onClick={() => navigate('/products')}>
            Back to Products
          </SecondaryButton>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Product Specifications
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {product.description}
          </p>
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Standard Unit Price</span>
              <span className="font-semibold tabular-nums">{formatCurrency(product.unitPrice)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Standard Cycle Time</span>
              <span className="font-semibold tabular-nums">{product.standardCycleMinutes} min / {product.uom}</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#2563EB]" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Compatible Machines ({compatibleMachines.length})
              </h3>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {compatibleMachines.map((m) => (
              <div
                key={m.id}
                onClick={() => navigate(`/machines/${m.id}`)}
                className="p-3 rounded-md border border-slate-200 dark:border-slate-800 hover:border-[#2563EB]/60 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-semibold text-[#2563EB]">{m.code}</span>
                  <StatusBadge status={m.status} size="xs" />
                </div>
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 mt-1">
                  {m.name}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                  Capacity: {m.dailyCapacity}/day · Efficiency: {m.efficiency}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BOM Breakdown */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#2563EB]" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Bill of Materials {bom ? `(${bom.version})` : ''}
            </h3>
          </div>
          <SecondaryButton size="sm" onClick={() => navigate('/bom')}>
            Manage BOMs
          </SecondaryButton>
        </div>
        <DataTable
          data={bom?.items || []}
          emptyTitle="No BOM defined"
          emptyDescription="Create a Bill of Materials in the BOM module to link raw materials."
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
              label: 'Raw Material',
              render: (r) => materials.find((m) => m.id === r.materialId)?.name || '—',
            },
            {
              key: 'qtyPerUnit',
              label: `Qty / ${product.uom}`,
              numeric: true,
              align: 'right',
            },
            { key: 'uom', label: 'Unit' },
            { key: 'specification', label: 'Material Specification' },
          ]}
        />
      </div>

      {/* Finished Goods Stock */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <PackageCheck className="w-4 h-4 text-[#2563EB]" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Finished Goods Batches ({fgBatches.length})
          </h3>
        </div>
        <DataTable
          data={fgBatches}
          columns={[
            { key: 'batchNumber', label: 'Batch Number' },
            { key: 'producedQty', label: 'Produced', numeric: true, align: 'right', render: (r) => formatNumber(r.producedQty) },
            { key: 'acceptedQty', label: 'Accepted (Usable)', numeric: true, align: 'right', render: (r) => <span className="font-semibold text-emerald-600">{formatNumber(r.acceptedQty)}</span> },
            { key: 'rejectedQty', label: 'Rejected', numeric: true, align: 'right', render: (r) => <span className="text-red-600">{formatNumber(r.rejectedQty)}</span> },
            { key: 'availableQty', label: 'Available', numeric: true, align: 'right', render: (r) => <span className="font-semibold">{formatNumber(r.availableQty)}</span> },
            { key: 'storageLocation', label: 'Storage Location' },
          ]}
        />
      </div>
    </div>
  );
}
