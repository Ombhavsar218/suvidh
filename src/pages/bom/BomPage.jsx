import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Eye,
  Edit2,
  Trash2,
  Layers,
  ShieldCheck,
  Boxes,
  Clock,
  LayoutGrid,
  List,
  ArrowRight,
  X,
  Sparkles,
  Package,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { PrimaryButton, SecondaryButton } from '../../components/common/Buttons';
import { Modal } from '../../components/common/Modal';
import { Tooltip } from '../../components/common/Tooltip';
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog';
import { DataTable } from '../../components/tables/DataTable';
import { SearchInput, FilterDropdown } from '../../components/forms/Filters';
import { StatCard } from '../../components/dashboard/StatCard';
import { Pagination } from '../../components/common/Pagination';
import { EmptyState } from '../../components/common/States';
import { useErpData } from '../../context/ErpDataContext';
import { useTableState } from '../../hooks/useTableState';
import { formatDate } from '../../utils/formatters';

function getInitials(name) {
  if (!name) return 'BM';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function BomPage() {
  const navigate = useNavigate();
  const { boms = [], products = [], materials = [], deleteBom } = useErpData();
  const [viewerBom, setViewerBom] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'

  // Enriched BOM records
  const enrichedBoms = useMemo(() => {
    return boms.map((b) => {
      const prod = products.find((p) => p.id === b.productId);
      const materialNames = b.items
        .map((i) => {
          const m = materials.find((mat) => mat.id === i.materialId);
          return m ? `${m.name} (${i.qtyPerUnit} ${i.uom})` : null;
        })
        .filter(Boolean);

      return {
        ...b,
        productCode: prod?.code || b.productId,
        productName: prod?.name || 'Unknown Product',
        productCategory: prod?.category || 'Standard',
        productUom: prod?.uom || 'Nos',
        componentCount: b.items.length,
        materialsPreview: materialNames.join(' · '),
      };
    });
  }, [boms, products, materials]);

  // KPI Calculations
  const uniqueMaterialsCount = useMemo(() => {
    const matIds = new Set();
    boms.forEach((b) => b.items.forEach((i) => matIds.add(i.materialId)));
    return matIds.size;
  }, [boms]);

  const avgComponents = useMemo(() => {
    if (boms.length === 0) return 0;
    const total = boms.reduce((acc, b) => acc + b.items.length, 0);
    return (total / boms.length).toFixed(1);
  }, [boms]);

  const productCategories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter(Boolean))),
    [products]
  );

  const table = useTableState(enrichedBoms, {
    initialPageSize: 8,
    initialSortKey: 'productCode',
    searchFields: ['id', 'productCode', 'productName', 'productCategory', 'version', 'notes'],
  });

  const hasActiveFilters = Boolean(table.search || table.filters.productCategory);

  const columns = [
    {
      key: 'id',
      label: 'BOM ID',
      sortable: true,
      width: '130px',
      cellClassName: 'whitespace-nowrap',
      render: (r) => (
        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap inline-block">
          {r.id}
        </span>
      ),
    },
    {
      key: 'productName',
      label: 'Finished Product',
      sortable: true,
      render: (r) => (
        <div>
          <div className="font-medium text-[#051747] dark:text-slate-100">{r.productName}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="font-mono text-[11px] text-[#535F80] dark:text-slate-400">
              {r.productCode}
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded border border-[#535F80]/15 bg-[#E7E9F0]/60 text-[#051747] dark:bg-slate-800 dark:text-slate-300">
              {r.productCategory}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'version',
      label: 'Revision',
      render: (r) => (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-[#081F62] border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900/60">
          {r.version}
        </span>
      ),
    },
    {
      key: 'componentCount',
      label: 'Raw Materials',
      render: (r) => (
        <div className="text-xs max-w-xs">
          <div className="font-semibold text-[#051747] dark:text-slate-200 flex items-center gap-1">
            <Boxes className="w-3.5 h-3.5 text-[#535F80]" />
            <span>{r.componentCount} components</span>
          </div>
          <div className="text-[11px] text-[#535F80] dark:text-slate-400 truncate mt-0.5" title={r.materialsPreview}>
            {r.materialsPreview || 'No components assigned'}
          </div>
        </div>
      ),
    },
    {
      key: 'updatedAt',
      label: 'Last Updated',
      sortable: true,
      render: (r) => (
        <div className="text-xs text-slate-600 dark:text-slate-300 tabular-nums flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-[#535F80]" />
          <span>{formatDate(r.updatedAt)}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'left',
      render: (r) => (
        <div className="inline-flex items-center justify-start gap-1" onClick={(e) => e.stopPropagation()}>
          <Tooltip content="View BOM Structure">
            <button
              type="button"
              onClick={() => setViewerBom(r)}
              className="p-1.5 rounded hover:bg-[#E7E9F0]/70 dark:hover:bg-slate-800 text-[#535F80] hover:text-[#081F62] cursor-pointer"
              aria-label="View BOM Structure"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <Tooltip content="Edit BOM">
            <button
              type="button"
              onClick={() => navigate(`/bom/${r.id}/edit`)}
              className="p-1.5 rounded hover:bg-[#E7E9F0]/70 dark:hover:bg-slate-800 text-[#535F80] hover:text-[#081F62] cursor-pointer"
              aria-label="Edit BOM"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <Tooltip content="Delete BOM">
            <button
              type="button"
              onClick={() => setDeleteTarget(r)}
              className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 cursor-pointer"
              aria-label="Delete BOM"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Bill of Materials (BOM)"
        description="Engineering product structures, multi-level raw material consumption, and unit production specifications."
        actions={
          <PrimaryButton icon={Plus} onClick={() => navigate('/bom/new')}>
            Create BOM
          </PrimaryButton>
        }
      />

      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active BOMs"
          value={boms.length}
          sublabel="Configured structures"
          icon={Layers}
          tone="navy"
        />
        <StatCard
          label="Catalog Coverage"
          value={`${boms.length}/${products.length}`}
          sublabel={`${products.length > 0 ? Math.round((boms.length / products.length) * 100) : 0}% products configured`}
          icon={ShieldCheck}
          tone="emerald"
        />
        <StatCard
          label="Raw Materials Linked"
          value={uniqueMaterialsCount}
          sublabel="Unique raw component types"
          icon={Boxes}
          tone="amber"
        />
        <StatCard
          label="Avg Parts / Product"
          value={avgComponents}
          sublabel="Components per assembly"
          icon={Sparkles}
          tone="slate"
        />
      </div>

      {/* Control & Filter Toolbar */}
      <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <SearchInput
            value={table.search}
            onChange={table.setSearch}
            placeholder="Search BOM ID, finished product, revision, notes..."
            className="w-full sm:w-96 md:w-[420px] lg:w-[480px]"
          />
          <FilterDropdown
            label="Product Category"
            value={table.filters.productCategory}
            onChange={(val) => table.setFilter('productCategory', val)}
            options={productCategories}
          />
          {hasActiveFilters && (
            <button
              type="button"
              onClick={table.resetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 bg-[#E7E9F0]/60 dark:bg-slate-800 rounded-md cursor-pointer transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-[#535F80] dark:text-slate-400 hidden sm:inline">
            Showing <strong className="text-[#051747] dark:text-slate-200">{table.totalItems}</strong> BOM structure{table.totalItems === 1 ? '' : 's'}
          </span>
          <div className="inline-flex items-center rounded-lg border border-[#535F80]/25 dark:border-slate-800 p-0.5 bg-[#FEFEFE] dark:bg-slate-900">
            <Tooltip content="Card View">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-[#051747] text-[#FEFEFE] shadow-2xs'
                    : 'text-[#535F80] hover:text-[#051747] dark:hover:text-slate-200'
                }`}
                aria-label="Card View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </Tooltip>
            <Tooltip content="Table View">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                  viewMode === 'table'
                    ? 'bg-[#051747] text-[#FEFEFE] shadow-2xs'
                    : 'text-[#535F80] hover:text-[#051747] dark:hover:text-slate-200'
                }`}
                aria-label="Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Main Content: Card Grid View or Table View */}
      {viewMode === 'grid' ? (
        table.paginatedData.length === 0 ? (
          <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-xl p-8">
            <EmptyState
              icon={Layers}
              title="No Bill of Materials match your criteria"
              description="Try adjusting your search terms or clearing your filters to see configured BOM records."
              action={
                hasActiveFilters ? (
                  <SecondaryButton onClick={table.resetFilters}>
                    Clear Filters
                  </SecondaryButton>
                ) : (
                  <PrimaryButton icon={Plus} onClick={() => navigate('/bom/new')}>
                    Create BOM
                  </PrimaryButton>
                )
              }
            />
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {table.paginatedData.map((b) => {
                return (
                  <div
                    key={b.id}
                    className="group relative bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 hover:border-[#081F62]/60 dark:hover:border-blue-500/60 rounded-xl p-5 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Row: Product Initials, Name, BOM ID & Rev */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-[#051747] dark:bg-slate-800 text-[#FEFEFE] dark:text-slate-100 font-bold text-xs flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                            {getInitials(b.productName)}
                          </div>
                          <div className="min-w-0">
                            <h3
                              className="font-semibold text-sm text-[#051747] dark:text-slate-100 group-hover:text-[#081F62] dark:group-hover:text-blue-400 transition-colors truncate"
                              title={b.productName}
                            >
                              {b.productName}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-[11px] font-semibold text-[#535F80] dark:text-slate-400 bg-[#E7E9F0]/60 dark:bg-slate-800/80 px-2 py-0.5 rounded whitespace-nowrap inline-block">
                                {b.id}
                              </span>
                              <span className="font-mono text-[11px] text-slate-500 truncate">
                                {b.productCode}
                              </span>
                            </div>
                          </div>
                        </div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-[#081F62] border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900/60 shrink-0">
                          {b.version}
                        </span>
                      </div>

                      {/* Product Category & Engineering Notes */}
                      <div className="mt-3.5 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#E7E9F0]/70 text-[#051747] dark:bg-slate-800 dark:text-slate-300 border border-[#535F80]/15">
                          {b.productCategory}
                        </span>
                        <span className="text-[11px] font-medium text-[#535F80] dark:text-slate-400 font-mono bg-[#E7E9F0]/60 dark:bg-slate-800 px-2 py-0.5 rounded">
                          Unit: 1 {b.productUom}
                        </span>
                      </div>

                      {/* Notes Box */}
                      <div className="mt-3 p-2.5 rounded-lg bg-[#E7E9F0]/40 dark:bg-slate-800/50 border border-[#535F80]/10 dark:border-slate-800 flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <Layers className="w-3.5 h-3.5 text-[#081F62] shrink-0 mt-0.5" />
                        <span className="line-clamp-2 leading-relaxed" title={b.notes}>
                          {b.notes || 'Standard manufacturing assembly structure with raw material bill.'}
                        </span>
                      </div>

                      {/* Micro-Stats: Component Count, Unit, Last Update */}
                      <div className="mt-4 bg-[#E7E9F0]/40 dark:bg-slate-800/60 border border-[#535F80]/10 dark:border-slate-800 rounded-lg p-2.5 grid grid-cols-3 gap-2 text-center">
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase font-semibold text-[#535F80] dark:text-slate-400 truncate flex items-center justify-center gap-1">
                            <Boxes className="w-3 h-3 text-[#535F80]" /> Materials
                          </p>
                          <p className="text-xs font-bold text-[#051747] dark:text-slate-100 tabular-nums mt-0.5">
                            {b.items.length} items
                          </p>
                        </div>
                        <div className="min-w-0 border-x border-[#535F80]/15 dark:border-slate-700/60 px-1">
                          <p className="text-[10px] uppercase font-semibold text-[#535F80] dark:text-slate-400 truncate flex items-center justify-center gap-1">
                            <Package className="w-3 h-3 text-[#535F80]" /> Output
                          </p>
                          <p className="text-xs font-bold text-[#051747] dark:text-slate-100 tabular-nums mt-0.5 truncate">
                            1 {b.productUom}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase font-semibold text-[#535F80] dark:text-slate-400 truncate flex items-center justify-center gap-1">
                            <Clock className="w-3 h-3 text-[#535F80]" /> Updated
                          </p>
                          <p className="text-xs font-bold text-[#051747] dark:text-slate-100 tabular-nums mt-0.5 truncate" title={formatDate(b.updatedAt)}>
                            {formatDate(b.updatedAt)}
                          </p>
                        </div>
                      </div>

                      {/* Top 3 Component Chips */}
                      <div className="mt-3 space-y-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#535F80] dark:text-slate-400">
                          Raw Component Inputs:
                        </span>
                        <div className="space-y-1">
                          {b.items.slice(0, 3).map((item) => {
                            const mat = materials.find((m) => m.id === item.materialId);
                            return (
                              <div
                                key={item.id}
                                className="flex items-center justify-between text-xs px-2 py-1 rounded bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/15"
                              >
                                <span className="font-medium text-[#051747] dark:text-slate-200 truncate max-w-[180px]">
                                  {mat?.name || item.materialId}
                                </span>
                                <span className="font-mono text-[11px] text-[#535F80] dark:text-slate-400 font-semibold tabular-nums">
                                  {item.qtyPerUnit} {item.uom}
                                </span>
                              </div>
                            );
                          })}
                          {b.items.length > 3 && (
                            <div className="text-[11px] text-[#535F80] dark:text-slate-400 font-medium pl-1">
                              +{b.items.length - 3} more component{b.items.length - 3 === 1 ? '' : 's'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div
                      className="mt-4 pt-3 border-t border-[#E7E9F0] dark:border-slate-800 flex items-center justify-between gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => setViewerBom(b)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#081F62] hover:text-[#051747] dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer"
                      >
                        <span>View Structure</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </button>

                      <div className="inline-flex items-center gap-1">
                        <Tooltip content="Edit BOM">
                          <button
                            type="button"
                            onClick={() => navigate(`/bom/${b.id}/edit`)}
                            className="p-1.5 rounded hover:bg-[#E7E9F0]/80 dark:hover:bg-slate-800 text-[#535F80] hover:text-[#081F62] cursor-pointer"
                            aria-label="Edit BOM"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </Tooltip>
                        <Tooltip content="Delete BOM">
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(b)}
                            className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 cursor-pointer"
                            aria-label="Delete BOM"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls for Card View */}
            <div className="mt-5 bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg overflow-hidden shadow-2xs">
              <Pagination
                page={table.page}
                totalPages={table.totalPages}
                totalItems={table.totalItems}
                pageSize={table.pageSize}
                onPageChange={table.setPage}
                onPageSizeChange={table.setPageSize}
              />
            </div>
          </div>
        )
      ) : (
        <DataTable
          columns={columns}
          data={table.paginatedData}
          sortKey={table.sortKey}
          sortDir={table.sortDir}
          onSort={table.handleSort}
          pagination={{
            page: table.page,
            totalPages: table.totalPages,
            totalItems: table.totalItems,
            pageSize: table.pageSize,
            onPageChange: table.setPage,
            onPageSizeChange: table.setPageSize,
          }}
        />
      )}

      {/* View BOM Modal */}
      <Modal
        isOpen={Boolean(viewerBom)}
        onClose={() => setViewerBom(null)}
        title={`BOM Structure — ${viewerBom?.productName || ''}`}
        subtitle={`${viewerBom?.productCode || ''} · ${viewerBom?.version || ''}`}
        size="lg"
        footer={
          <>
            <SecondaryButton onClick={() => setViewerBom(null)}>Close</SecondaryButton>
            <PrimaryButton
              icon={Edit2}
              onClick={() => {
                const targetId = viewerBom.id;
                setViewerBom(null);
                navigate(`/bom/${targetId}/edit`);
              }}
            >
              Edit BOM
            </PrimaryButton>
          </>
        }
      >
        {viewerBom && (
          <div className="space-y-4">
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#E7E9F0]/55 dark:bg-slate-800/50 border border-[#535F80]/15 text-xs text-slate-600 dark:text-slate-300">
              <Layers className="w-4 h-4 text-[#081F62] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-[#051747] dark:text-slate-100">
                  Engineering Notes:
                </span>{' '}
                {viewerBom.notes || 'Standard manufacturing assembly structure with raw material consumption specification.'}
              </div>
            </div>

            <div className="border border-[#535F80]/20 dark:border-slate-700 rounded-lg overflow-hidden shadow-2xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#E7E9F0]/70 dark:bg-slate-800 border-b border-[#535F80]/20 dark:border-slate-700">
                    <th className="px-3 py-2.5 font-semibold text-[#051747] dark:text-slate-200">Material Code</th>
                    <th className="px-3 py-2.5 font-semibold text-[#051747] dark:text-slate-200">Raw Material</th>
                    <th className="px-3 py-2.5 font-semibold text-[#051747] dark:text-slate-200 text-right">Qty / Unit</th>
                    <th className="px-3 py-2.5 font-semibold text-[#051747] dark:text-slate-200">Unit</th>
                    <th className="px-3 py-2.5 font-semibold text-[#051747] dark:text-slate-200">Specifications</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E9F0] dark:divide-slate-700">
                  {viewerBom.items.map((item) => {
                    const mat = materials.find((m) => m.id === item.materialId);
                    return (
                      <tr key={item.id} className="hover:bg-[#E7E9F0]/30 dark:hover:bg-slate-800/30">
                        <td className="px-3 py-2.5 font-mono font-semibold text-[#081F62] dark:text-blue-400">
                          {mat?.code || '—'}
                        </td>
                        <td className="px-3 py-2.5 font-medium text-[#051747] dark:text-slate-100">
                          {mat?.name || item.materialId}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-bold text-[#051747] dark:text-slate-200">
                          {item.qtyPerUnit}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-slate-500">{item.uom}</td>
                        <td className="px-3 py-2.5 text-[#535F80] dark:text-slate-400">
                          {item.specification || 'Standard cut specification'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteBom(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        title="Delete Bill of Materials"
        message={`Are you sure you want to permanently delete BOM structure "${deleteTarget?.id}" for "${deleteTarget?.productName}"?`}
        confirmLabel="Delete BOM"
        variant="danger"
      />
    </div>
  );
}
