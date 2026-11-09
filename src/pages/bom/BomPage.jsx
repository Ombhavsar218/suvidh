import { useState, useMemo } from 'react';
import { Plus, Eye, Edit2, Trash2, Layers } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { PrimaryButton, SecondaryButton } from '../../components/common/Buttons';
import { Modal } from '../../components/common/Modal';
import { DataTable } from '../../components/tables/DataTable';
import { SearchInput } from '../../components/forms/Filters';
import { FormInput, FormSelect, FormTextarea } from '../../components/forms/FormFields';
import { useErpData } from '../../context/ErpDataContext';
import { useTableState } from '../../hooks/useTableState';
import { formatDate } from '../../utils/formatters';

export function BomPage() {
  const { boms, products, materials, saveBom } = useErpData();
  const [editorOpen, setEditorOpen] = useState(false);
  const [viewerBom, setViewerBom] = useState(null);
  const [formError, setFormError] = useState('');

  const [form, setForm] = useState({
    id: '',
    productId: '',
    version: 'Rev 1.0',
    notes: '',
    items: [],
  });

  const enrichedBoms = useMemo(() => {
    return boms.map((b) => {
      const prod = products.find((p) => p.id === b.productId);
      return {
        ...b,
        productCode: prod?.code || b.productId,
        productName: prod?.name || 'Unknown Product',
        productUom: prod?.uom || 'Nos',
        componentCount: b.items.length,
      };
    });
  }, [boms, products]);

  const table = useTableState(enrichedBoms, {
    initialPageSize: 8,
    initialSortKey: 'productCode',
    searchFields: ['productCode', 'productName', 'version', 'notes'],
  });

  const openCreate = () => {
    const firstMaterial = materials[0];
    setForm({
      id: '',
      productId: products.find((p) => !boms.some((b) => b.productId === p.id))?.id || products[0]?.id || '',
      version: 'Rev 1.0',
      notes: '',
      items: firstMaterial
        ? [
            {
              id: `BI-${Date.now()}`,
              materialId: firstMaterial.id,
              qtyPerUnit: 1,
              uom: firstMaterial.uom,
              specification: firstMaterial.spec || '',
            },
          ]
        : [],
    });
    setFormError('');
    setEditorOpen(true);
  };

  const openEdit = (bom, e) => {
    e?.stopPropagation();
    setForm({
      id: bom.id,
      productId: bom.productId,
      version: bom.version,
      notes: bom.notes || '',
      items: bom.items.map((i) => ({ ...i })),
    });
    setFormError('');
    setEditorOpen(true);
  };

  const addBomRow = () => {
    const unused = materials.find(
      (m) => !form.items.some((item) => item.materialId === m.id)
    ) || materials[0];
    if (!unused) return;
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: `BI-${Date.now()}-${prev.items.length}`,
          materialId: unused.id,
          qtyPerUnit: 1,
          uom: unused.uom,
          specification: unused.spec || '',
        },
      ],
    }));
  };

  const updateBomRow = (index, field, value) => {
    setForm((prev) => {
      const nextItems = prev.items.map((row, idx) => {
        if (idx !== index) return row;
        if (field === 'materialId') {
          const mat = materials.find((m) => m.id === value);
          return {
            ...row,
            materialId: value,
            uom: mat?.uom || row.uom,
            specification: mat?.spec || row.specification,
          };
        }
        return { ...row, [field]: value };
      });
      return { ...prev, items: nextItems };
    });
  };

  const removeBomRow = (index) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.productId) {
      setFormError('Please select a finished product.');
      return;
    }
    if (form.items.length === 0) {
      setFormError('At least one raw material component row is required.');
      return;
    }
    const invalidRow = form.items.find((i) => !i.materialId || Number(i.qtyPerUnit) <= 0);
    if (invalidRow) {
      setFormError('All BOM component rows must have a valid material and quantity > 0.');
      return;
    }

    saveBom({
      ...form,
      items: form.items.map((i) => ({
        ...i,
        qtyPerUnit: Number(i.qtyPerUnit),
      })),
    });
    setEditorOpen(false);
  };

  const columns = [
    {
      key: 'id',
      label: 'BOM ID',
      sortable: true,
      render: (r) => <span className="font-mono text-xs font-semibold">{r.id}</span>,
    },
    {
      key: 'productName',
      label: 'Finished Product',
      sortable: true,
      render: (r) => (
        <div>
          <div className="font-medium text-slate-900 dark:text-slate-100">{r.productName}</div>
          <div className="text-[11px] font-mono text-slate-500">{r.productCode}</div>
        </div>
      ),
    },
    {
      key: 'version',
      label: 'Revision',
      render: (r) => (
        <span className="px-2 py-0.5 text-xs rounded bg-blue-50 text-[#2563EB] dark:bg-blue-950/60 dark:text-blue-300 font-medium">
          {r.version}
        </span>
      ),
    },
    {
      key: 'componentCount',
      label: 'Raw Materials',
      align: 'center',
      numeric: true,
      render: (r) => `${r.componentCount} item${r.componentCount === 1 ? '' : 's'}`,
    },
    {
      key: 'updatedAt',
      label: 'Last Updated',
      sortable: true,
      render: (r) => formatDate(r.updatedAt),
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (r) => (
        <div className="inline-flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setViewerBom(r)}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-[#2563EB] cursor-pointer"
            title="View BOM"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => openEdit(r, e)}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-[#2563EB] cursor-pointer"
            title="Edit BOM"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Bill of Materials (BOM)"
        description="Define exact raw material quantities and specifications required per unit of finished product."
        actions={
          <PrimaryButton icon={Plus} onClick={openCreate}>
            Create BOM
          </PrimaryButton>
        }
      />

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 mb-4 flex flex-wrap items-center justify-between gap-3">
        <SearchInput
          value={table.search}
          onChange={table.setSearch}
          placeholder="Search finished product, BOM revision..."
          className="w-full sm:w-80"
        />
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Used automatically in Production Planning for BOM material requirement & shortage checks.
        </span>
      </div>

      <DataTable
        columns={columns}
        data={table.paginatedData}
        sortKey={table.sortKey}
        sortDir={table.sortDir}
        onSort={table.handleSort}
        onRowClick={(r) => setViewerBom(r)}
        pagination={{
          page: table.page,
          totalPages: table.totalPages,
          totalItems: table.totalItems,
          pageSize: table.pageSize,
          onPageChange: table.setPage,
          onPageSizeChange: table.setPageSize,
        }}
      />

      {/* Editable BOM Modal */}
      <Modal
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={form.id ? `Edit BOM (${form.id})` : 'Create Bill of Materials'}
        subtitle="Add or remove raw material rows and specify unit consumption."
        size="xl"
        footer={
          <>
            <SecondaryButton onClick={() => setEditorOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={handleSave}>Save BOM</PrimaryButton>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect
              label="Finished Product"
              name="productId"
              required
              value={form.productId}
              onChange={(e) => setForm({ ...form, productId: e.target.value })}
              options={products.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))}
            />
            <FormInput
              label="BOM Revision"
              name="version"
              required
              value={form.version}
              onChange={(e) => setForm({ ...form, version: e.target.value })}
            />
          </div>

          <FormTextarea
            label="Engineering Notes"
            name="notes"
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Required Raw Materials (Per 1 Unit Output)
              </h4>
              <SecondaryButton size="sm" icon={Plus} onClick={addBomRow}>
                Add Material Row
              </SecondaryButton>
            </div>

            <div className="border border-slate-200 dark:border-slate-700 rounded-md overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                    <th className="px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Raw Material</th>
                    <th className="px-3 py-2 font-semibold text-slate-600 dark:text-slate-300 w-28">Qty / Product</th>
                    <th className="px-3 py-2 font-semibold text-slate-600 dark:text-slate-300 w-20">Unit</th>
                    <th className="px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Material Specifications</th>
                    <th className="px-3 py-2 w-12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {form.items.map((row, idx) => (
                    <tr key={row.id || idx}>
                      <td className="p-2">
                        <select
                          value={row.materialId}
                          onChange={(e) => updateBomRow(idx, 'materialId', e.target.value)}
                          className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                        >
                          {materials.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.code} — {m.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={row.qtyPerUnit}
                          onChange={(e) => updateBomRow(idx, 'qtyPerUnit', e.target.value)}
                          className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs tabular-nums"
                        />
                      </td>
                      <td className="p-2">
                        <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                          {row.uom}
                        </span>
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.specification}
                          onChange={(e) => updateBomRow(idx, 'specification', e.target.value)}
                          placeholder="Tolerance, cut length, grade..."
                          className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeBomRow(idx)}
                          className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                          title="Remove row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </form>
      </Modal>

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
                const target = viewerBom;
                setViewerBom(null);
                openEdit(target);
              }}
            >
              Edit BOM
            </PrimaryButton>
          </>
        }
      >
        {viewerBom && (
          <div className="space-y-4">
            <div className="flex items-start gap-2.5 p-3 rounded-md bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-600 dark:text-slate-300">
              <Layers className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  Engineering Notes:
                </span>{' '}
                {viewerBom.notes || 'Standard production BOM.'}
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-700 rounded-md overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                    <th className="px-3 py-2 font-semibold">Material Code</th>
                    <th className="px-3 py-2 font-semibold">Raw Material</th>
                    <th className="px-3 py-2 font-semibold text-right">Qty / Unit</th>
                    <th className="px-3 py-2 font-semibold">Unit</th>
                    <th className="px-3 py-2 font-semibold">Specifications</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {viewerBom.items.map((item) => {
                    const mat = materials.find((m) => m.id === item.materialId);
                    return (
                      <tr key={item.id}>
                        <td className="px-3 py-2.5 font-mono font-semibold">{mat?.code}</td>
                        <td className="px-3 py-2.5 font-medium">{mat?.name}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-semibold">
                          {item.qtyPerUnit}
                        </td>
                        <td className="px-3 py-2.5">{item.uom}</td>
                        <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">
                          {item.specification}
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
    </div>
  );
}
