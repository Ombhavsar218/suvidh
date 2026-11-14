import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Layers,
  Boxes,
  Package,
  AlertCircle,
  Sparkles,
  Info,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { PrimaryButton, SecondaryButton } from '../../components/common/Buttons';
import { FormInput, FormSelect, FormTextarea } from '../../components/forms/FormFields';
import { Tooltip } from '../../components/common/Tooltip';
import { useErpData } from '../../context/ErpDataContext';
import { formatCurrency } from '../../utils/formatters';

export function BomFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const { boms = [], products = [], materials = [], saveBom } = useErpData();

  const existingBom = useMemo(() => {
    if (!isEdit) return null;
    return boms.find((b) => b.id === id);
  }, [boms, id, isEdit]);

  const [form, setForm] = useState({
    id: '',
    productId: '',
    version: 'Rev 1.0',
    notes: '',
    items: [],
  });

  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');

  // Initialize form state
  useEffect(() => {
    if (isEdit) {
      if (existingBom) {
        setForm({
          id: existingBom.id,
          productId: existingBom.productId,
          version: existingBom.version || 'Rev 1.0',
          notes: existingBom.notes || '',
          items: existingBom.items ? existingBom.items.map((i) => ({ ...i })) : [],
        });
      }
    } else {
      const firstAvailableProd =
        products.find((p) => !boms.some((b) => b.productId === p.id))?.id ||
        products[0]?.id ||
        '';
      const firstMat = materials[0];

      setForm({
        id: '',
        productId: firstAvailableProd,
        version: 'Rev 1.0',
        notes: '',
        items: firstMat
          ? [
              {
                id: `BI-${Date.now()}`,
                materialId: firstMat.id,
                qtyPerUnit: 1,
                uom: firstMat.uom,
                specification: firstMat.spec || '',
              },
            ]
          : [],
      });
    }
  }, [isEdit, existingBom, products, boms, materials]);

  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === form.productId);
  }, [products, form.productId]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
    setFormError('');
  };

  const addBomRow = () => {
    const unused =
      materials.find((m) => !form.items.some((item) => item.materialId === m.id)) || materials[0];
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
    setFormError('');
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
    setFormError('');
  };

  const removeBomRow = (index) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }));
    setFormError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.productId) {
      setFormError('Please select a finished product.');
      return;
    }

    if (!form.version?.trim()) {
      setFormError('BOM Revision code is required (e.g. Rev 1.0).');
      return;
    }

    if (form.items.length === 0) {
      setFormError('At least one raw material component row is required.');
      return;
    }

    const invalidRow = form.items.find((i) => !i.materialId || Number(i.qtyPerUnit) <= 0);
    if (invalidRow) {
      setFormError('All component rows must specify a valid raw material and consumption quantity > 0.');
      return;
    }

    saveBom({
      ...form,
      items: form.items.map((i) => ({
        ...i,
        qtyPerUnit: Number(i.qtyPerUnit),
      })),
    });

    navigate('/bom');
  };

  if (isEdit && !existingBom && boms.length > 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="BOM Not Found"
          description="The requested Bill of Materials structure does not exist in local demo data."
          actions={
            <SecondaryButton icon={ArrowLeft} onClick={() => navigate('/bom')}>
              Back to Bill of Materials
            </SecondaryButton>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          isEdit
            ? `Edit Bill of Materials — ${form.id || id}`
            : 'Create Bill of Materials'
        }
        description={
          isEdit
            ? `Update engineering components, unit consumption ratios, and manufacturing notes for ${selectedProduct?.name || form.productId}.`
            : 'Define exact raw material consumption, component ratios, and engineering assembly notes for finished product manufacturing.'
        }
        actions={
          <SecondaryButton icon={ArrowLeft} onClick={() => navigate('/bom')}>
            Back to Bill of Materials
          </SecondaryButton>
        }
      />

      {formError && (
        <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-start gap-2.5 shadow-2xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Finished Product & Header Info */}
          <div className="space-y-5">
            <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-5 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 pb-2.5 border-b border-[#E7E9F0] dark:border-slate-800">
                <Package className="w-4 h-4 text-[#081F62] dark:text-blue-400" />
                <h2 className="text-sm font-semibold text-[#051747] dark:text-slate-100">
                  Target Product
                </h2>
              </div>

              <FormSelect
                label="Finished Product"
                name="productId"
                required
                value={form.productId}
                onChange={(e) => updateField('productId', e.target.value)}
                options={products.map((p) => ({
                  value: p.id,
                  label: `${p.code} — ${p.name}`,
                }))}
              />

              <FormInput
                label="BOM Revision"
                name="version"
                required
                placeholder="e.g. Rev 1.0"
                value={form.version}
                onChange={(e) => updateField('version', e.target.value)}
              />

              <FormTextarea
                label="Engineering Notes"
                name="notes"
                rows={3}
                placeholder="Standard cutting allowance, tolerance specifications, or assembly instructions..."
                value={form.notes}
                onChange={(e) => updateField('notes', e.target.value)}
              />
            </div>

            {/* Product Specification Quick Card */}
            {selectedProduct && (
              <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-5 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 pb-2.5 border-b border-[#E7E9F0] dark:border-slate-800">
                  <Sparkles className="w-4 h-4 text-[#081F62] dark:text-blue-400" />
                  <h3 className="text-sm font-semibold text-[#051747] dark:text-slate-100">
                    Product Specification
                  </h3>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#535F80] dark:text-slate-400">Category:</span>
                    <span className="font-medium text-[#051747] dark:text-slate-200">
                      {selectedProduct.category}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#535F80] dark:text-slate-400">Output Unit:</span>
                    <span className="font-mono font-semibold text-[#051747] dark:text-slate-200">
                      1 {selectedProduct.uom}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#535F80] dark:text-slate-400">Standard Cycle:</span>
                    <span className="font-semibold text-[#051747] dark:text-slate-200 tabular-nums">
                      {selectedProduct.standardCycleMinutes} min
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#535F80] dark:text-slate-400">Catalog Rate:</span>
                    <span className="font-bold text-[#051747] dark:text-slate-100 tabular-nums">
                      {formatCurrency(selectedProduct.unitPrice)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Raw Materials Component Grid (Takes 2 columns) */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-5 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-[#E7E9F0] dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-[#081F62] dark:text-blue-400" />
                  <h2 className="text-sm font-semibold text-[#051747] dark:text-slate-100">
                    Required Raw Materials (Per 1 Unit Output)
                  </h2>
                </div>
                <SecondaryButton size="sm" icon={Plus} onClick={addBomRow}>
                  Add Component Row
                </SecondaryButton>
              </div>

              <div className="border border-[#535F80]/20 dark:border-slate-700 rounded-lg overflow-x-auto shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#E7E9F0]/70 dark:bg-slate-800 border-b border-[#535F80]/20 dark:border-slate-700">
                      <th className="px-3.5 py-3 font-semibold text-[#051747] dark:text-slate-200">
                        Raw Material
                      </th>
                      <th className="px-3.5 py-3 font-semibold text-[#051747] dark:text-slate-200 w-28">
                        Qty / Unit
                      </th>
                      <th className="px-3.5 py-3 font-semibold text-[#051747] dark:text-slate-200 w-20">
                        Unit
                      </th>
                      <th className="px-3.5 py-3 font-semibold text-[#051747] dark:text-slate-200">
                        Material Specifications
                      </th>
                      <th className="px-3.5 py-3 w-12 text-center" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E9F0] dark:divide-slate-700">
                    {form.items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500">
                          No raw material components added yet. Click &quot;Add Component Row&quot; above.
                        </td>
                      </tr>
                    ) : (
                      form.items.map((row, idx) => (
                        <tr
                          key={row.id || idx}
                          className="hover:bg-[#E7E9F0]/30 dark:hover:bg-slate-800/40"
                        >
                          <td className="p-2.5">
                            <select
                              value={row.materialId}
                              onChange={(e) => updateBomRow(idx, 'materialId', e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-md border border-[#535F80]/30 dark:border-slate-700 bg-[#FEFEFE] dark:bg-slate-900 text-[#051747] dark:text-slate-100 text-xs focus:outline-none focus:border-[#081F62]"
                            >
                              {materials.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.code} — {m.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2.5">
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={row.qtyPerUnit}
                              onChange={(e) => updateBomRow(idx, 'qtyPerUnit', e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-md border border-[#535F80]/30 dark:border-slate-700 bg-[#FEFEFE] dark:bg-slate-900 text-[#051747] dark:text-slate-100 text-xs tabular-nums focus:outline-none focus:border-[#081F62]"
                            />
                          </td>
                          <td className="p-2.5">
                            <span className="px-2 py-1 rounded bg-[#E7E9F0]/80 dark:bg-slate-800 text-[#051747] dark:text-slate-300 font-mono font-semibold">
                              {row.uom}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={row.specification}
                              onChange={(e) => updateBomRow(idx, 'specification', e.target.value)}
                              placeholder="Tolerance, cut length, grade..."
                              className="w-full px-2.5 py-1.5 rounded-md border border-[#535F80]/30 dark:border-slate-700 bg-[#FEFEFE] dark:bg-slate-900 text-[#051747] dark:text-slate-100 text-xs focus:outline-none focus:border-[#081F62]"
                            />
                          </td>
                          <td className="p-2.5 text-center">
                            <Tooltip content="Remove row">
                              <button
                                type="button"
                                onClick={() => removeBomRow(idx)}
                                className="p-1.5 text-[#535F80] hover:text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer transition-colors"
                                aria-label="Remove component row"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </Tooltip>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Component Summary Footer */}
              <div className="p-3.5 rounded-lg bg-[#E7E9F0]/40 dark:bg-slate-800/50 border border-[#535F80]/15 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#081F62]" />
                  <span>
                    Total Components: <strong className="text-[#051747] dark:text-slate-100">{form.items.length}</strong> raw material{form.items.length === 1 ? '' : 's'}
                  </span>
                </div>
                <span className="text-[11px] text-[#535F80] dark:text-slate-400">
                  Applied in Material Requirements Planning (MRP)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg px-5 py-3.5 flex items-center justify-between gap-3 shadow-2xs">
          <span className="text-xs text-[#535F80] dark:text-slate-400">
            Fields marked with <span className="text-red-500">*</span> are required. Saved locally in browser LocalStorage.
          </span>
          <div className="flex items-center gap-2.5 shrink-0">
            <SecondaryButton onClick={() => navigate('/bom')}>Cancel</SecondaryButton>
            <PrimaryButton type="submit" icon={Save}>
              {isEdit ? 'Update BOM Structure' : 'Create BOM Structure'}
            </PrimaryButton>
          </div>
        </div>
      </form>
    </div>
  );
}
