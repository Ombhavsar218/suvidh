import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  RotateCcw,
  Plus,
  Boxes,
  ShieldCheck,
  Building2,
  DollarSign,
  Warehouse,
  Layers,
  Ruler,
  AlertTriangle,
  FileText,
  Tag,
  CheckCircle2,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { PrimaryButton, SecondaryButton } from '../../components/common/Buttons';
import { FormInput, FormSelect, FormTextarea } from '../../components/forms/FormFields';
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog';
import { StatusBadge } from '../../components/common/StatusBadge';
import { StatCard } from '../../components/dashboard/StatCard';
import { useErpData } from '../../context/ErpDataContext';
import { useApp } from '../../context/AppContext';
import {
  validateRequired,
  validatePositiveNumber,
} from '../../utils/validators';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import {
  MATERIAL_TYPES,
  MATERIAL_CATEGORIES,
  MATERIAL_FORMS,
  COMMON_GRADES_BY_CATEGORY,
  COMMON_STANDARDS,
  UOM_OPTIONS,
  CATEGORY_STYLES,
  TYPE_STYLES,
  createEmptyMaterialForm,
  formatDimensions,
} from './materialUtils';

export function MaterialFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useApp();
  const {
    materials = [],
    suppliers = [],
    saveMaterial,
  } = useErpData();

  const isEdit = Boolean(id);
  const existingMaterial = useMemo(() => {
    return isEdit ? materials.find((m) => m.id === id) : null;
  }, [isEdit, id, materials]);

  // Active suppliers for procurement dropdown
  const activeSuppliers = useMemo(() => {
    return suppliers.filter((s) => s.status === 'Active');
  }, [suppliers]);

  const [form, setForm] = useState(() => createEmptyMaterialForm(materials));
  const [errors, setErrors] = useState({});
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  // Load existing material into form state
  useEffect(() => {
    if (isEdit && existingMaterial) {
      setForm({
        ...createEmptyMaterialForm(materials),
        ...existingMaterial,
        materialType: existingMaterial.materialType || 'Raw Material',
        grade: existingMaterial.grade || '',
        description: existingMaterial.description || '',
        brand: existingMaterial.brand || '',
        preferredSupplierId: existingMaterial.preferredSupplierId || '',
        leadTimeDays: existingMaterial.leadTimeDays ?? 7,
        unitCost: existingMaterial.unitCost ?? 0,
        reorderLevel: existingMaterial.reorderLevel ?? 200,
        minStock: existingMaterial.minStock ?? 100,
        maxStock: existingMaterial.maxStock ?? 2000,
        safetyStock: existingMaterial.safetyStock ?? 50,
        location: existingMaterial.location || 'Rack A-01',
        standard: existingMaterial.standard || 'ASTM / ASME',
        materialForm: existingMaterial.materialForm || 'Bar',
        dimensions: {
          diameter: existingMaterial.dimensions?.diameter ?? '',
          length: existingMaterial.dimensions?.length ?? '',
          width: existingMaterial.dimensions?.width ?? '',
          thickness: existingMaterial.dimensions?.thickness ?? '',
          outerDiameter: existingMaterial.dimensions?.outerDiameter ?? '',
          wallThickness: existingMaterial.dimensions?.wallThickness ?? '',
          notes: existingMaterial.dimensions?.notes || '',
        },
        tolerance: existingMaterial.tolerance || '',
        density: existingMaterial.density || '',
        spec: existingMaterial.spec || '',
        requireQc: existingMaterial.requireQc !== false,
        batchTracking: existingMaterial.batchTracking !== false,
        heatNumberTracking: Boolean(existingMaterial.heatNumberTracking),
        status: existingMaterial.status || 'Active',
      });
    }
  }, [isEdit, existingMaterial, materials]);

  // Suggested grades for the selected category
  const suggestedGrades = useMemo(() => {
    return COMMON_GRADES_BY_CATEGORY[form.category] || [];
  }, [form.category]);

  // Validation Routine
  const validateForm = () => {
    const errs = {};

    // 1. Basic Material Info
    const codeErr = validateRequired(form.code, 'Material Code');
    if (codeErr) errs.code = codeErr;

    // Check duplicate material code
    const isDuplicate = materials.some(
      (m) =>
        m.id !== form.id &&
        m.code?.trim().toLowerCase() === form.code?.trim().toLowerCase()
    );
    if (isDuplicate) {
      errs.code = `Material Code "${form.code}" is already assigned to another catalog item.`;
    }

    const nameErr = validateRequired(form.name, 'Material Name');
    if (nameErr) errs.name = nameErr;

    const catErr = validateRequired(form.category, 'Category');
    if (catErr) errs.category = catErr;

    const uomErr = validateRequired(form.uom, 'Unit of Measurement');
    if (uomErr) errs.uom = uomErr;

    // 2. Cost and Procurement
    if (form.unitCost === '' || form.unitCost === null || Number(form.unitCost) < 0) {
      errs.unitCost = 'Standard unit cost must not be negative.';
    }

    if (
      form.leadTimeDays !== '' &&
      form.leadTimeDays !== null &&
      (Number(form.leadTimeDays) < 0 || !Number.isInteger(Number(form.leadTimeDays)))
    ) {
      errs.leadTimeDays = 'Lead time must be a non-negative whole number of days.';
    }

    // 3. Inventory Configuration
    if (form.reorderLevel === '' || form.reorderLevel === null || Number(form.reorderLevel) < 0) {
      errs.reorderLevel = 'Reorder threshold must be greater than or equal to zero.';
    }

    if (form.minStock !== '' && form.minStock !== null && Number(form.minStock) < 0) {
      errs.minStock = 'Minimum stock level cannot be negative.';
    }

    if (form.maxStock !== '' && form.maxStock !== null) {
      if (Number(form.maxStock) < 0) {
        errs.maxStock = 'Maximum stock level cannot be negative.';
      } else if (
        form.minStock !== '' &&
        form.minStock !== null &&
        Number(form.maxStock) < Number(form.minStock)
      ) {
        errs.maxStock = 'Maximum stock level cannot be lower than the Minimum stock level.';
      }
    }

    if (form.safetyStock !== '' && form.safetyStock !== null && Number(form.safetyStock) < 0) {
      errs.safetyStock = 'Safety stock cannot be negative.';
    }

    return errs;
  };

  // Save handler
  const handleSave = (e, shouldAddAnother = false) => {
    e?.preventDefault();
    const nextErrors = validateForm();

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      addToast({
        title: 'Validation Error',
        message: 'Please resolve the highlighted errors before saving.',
        type: 'danger',
      });
      return;
    }

    // Synthesize concise technical spec if empty
    let specText = form.spec?.trim();
    if (!specText) {
      const dimStr = formatDimensions(form.dimensions, form.materialForm);
      const gradePart = form.grade ? `${form.grade}` : '';
      const formPart = form.materialForm ? `${form.materialForm}` : '';
      const standardPart = form.standard ? `${form.standard}` : '';
      specText = [gradePart, formPart, dimStr, standardPart].filter(Boolean).join(' · ');
    }

    const payload = {
      ...form,
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      grade: form.grade?.trim() || '',
      brand: form.brand?.trim() || '',
      unitCost: Number(form.unitCost || 0),
      reorderLevel: Number(form.reorderLevel || 0),
      minStock: form.minStock !== '' ? Number(form.minStock) : 0,
      maxStock: form.maxStock !== '' ? Number(form.maxStock) : 0,
      safetyStock: form.safetyStock !== '' ? Number(form.safetyStock) : 0,
      leadTimeDays: form.leadTimeDays !== '' ? Number(form.leadTimeDays) : 7,
      spec: specText,
      dimensions: {
        diameter: form.dimensions?.diameter !== '' ? Number(form.dimensions.diameter) : '',
        length: form.dimensions?.length !== '' ? Number(form.dimensions.length) : '',
        width: form.dimensions?.width !== '' ? Number(form.dimensions.width) : '',
        thickness: form.dimensions?.thickness !== '' ? Number(form.dimensions.thickness) : '',
        outerDiameter: form.dimensions?.outerDiameter !== '' ? Number(form.dimensions.outerDiameter) : '',
        wallThickness: form.dimensions?.wallThickness !== '' ? Number(form.dimensions.wallThickness) : '',
        notes: form.dimensions?.notes || '',
      },
    };

    if (isEdit && existingMaterial) {
      payload.id = existingMaterial.id;
    }

    saveMaterial(payload);

    if (shouldAddAnother) {
      const nextForm = createEmptyMaterialForm([...materials, payload]);
      setForm(nextForm);
      setErrors({});
      addToast({
        title: 'Material Added',
        message: `${payload.name} saved. Ready for next material.`,
        type: 'success',
      });
    } else {
      addToast({
        title: isEdit ? 'Material Updated' : 'Material Created',
        message: `${payload.name} (${payload.code}) saved successfully.`,
        type: 'success',
      });
      navigate('/materials');
    }
  };

  // Reset confirmation handler
  const handleConfirmReset = () => {
    setForm(createEmptyMaterialForm(materials));
    setErrors({});
    addToast({
      title: 'Form Reset',
      message: 'All entries have been cleared back to defaults.',
      type: 'info',
    });
  };

  // Dimension field change helper
  const handleDimensionChange = (key, val) => {
    setForm((prev) => ({
      ...prev,
      dimensions: {
        ...prev.dimensions,
        [key]: val,
      },
    }));
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        title={isEdit ? `Edit Raw Material — ${existingMaterial?.name}` : 'Add New Raw Material'}
        badge={
          isEdit ? (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${
                TYPE_STYLES[form.materialType] || TYPE_STYLES['Raw Material']
              }`}
            >
              {form.materialType}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-md bg-blue-50 dark:bg-blue-950/60 text-[#081F62] dark:text-blue-400 border border-[#081F62]/20 dark:border-blue-800/40">
              <Boxes className="w-3.5 h-3.5 text-[#081F62]" />
              Master Catalog Entry
            </span>
          )
        }
        description={
          isEdit
            ? `Update material grade specifications, procurement supplier parameters, technical dimensions, and safety reorder rules for ${existingMaterial?.code}.`
            : 'Configure a new engineering raw material, consumable, or component with standard unit costs, verified storage locations, and quality inspection rules.'
        }
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <SecondaryButton
              size="sm"
              icon={ArrowLeft}
              onClick={() => {
                if (form.name || form.grade) {
                  setConfirmCancelOpen(true);
                } else {
                  navigate('/materials');
                }
              }}
            >
              Back to Catalog
            </SecondaryButton>

            <SecondaryButton
              size="sm"
              icon={RotateCcw}
              onClick={() => setConfirmResetOpen(true)}
            >
              Reset
            </SecondaryButton>

            {!isEdit && (
              <SecondaryButton
                size="sm"
                icon={Plus}
                onClick={(e) => handleSave(e, true)}
              >
                Save &amp; Add Another
              </SecondaryButton>
            )}

            <PrimaryButton
              size="sm"
              icon={Save}
              onClick={(e) => handleSave(e, false)}
            >
              {isEdit ? 'Update Material' : 'Save Material'}
            </PrimaryButton>
          </div>
        }
      />

      {/* Edit Mode: Real-time Physical Stock Ledger Banner */}
      {isEdit && existingMaterial && (
        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Warehouse className="w-4 h-4 text-[#081F62] dark:text-blue-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Warehouse Stock Distribution (Read-Only Ledger Status)
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              Last Transaction: {existingMaterial.lastUpdated || 'Recent'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700">
              <span className="text-[11px] text-slate-500 block">Approved Physical Stock</span>
              <span className="text-lg font-bold font-mono text-[#081F62] dark:text-blue-400">
                {formatNumber(existingMaterial.approvedPhysicalQty || 0)} {existingMaterial.uom}
              </span>
            </div>

            <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700">
              <span className="text-[11px] text-slate-500 block">Active Production Reservations</span>
              <span className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400">
                {formatNumber(existingMaterial.reservedQty || 0)} {existingMaterial.uom}
              </span>
            </div>

            <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800/60">
              <span className="text-[11px] text-emerald-700 dark:text-emerald-300 block font-medium">
                Net Usable Available Stock
              </span>
              <span className="text-lg font-bold font-mono text-emerald-700 dark:text-emerald-300">
                {formatNumber(
                  Math.max(
                    0,
                    (existingMaterial.approvedPhysicalQty || 0) - (existingMaterial.reservedQty || 0)
                  )
                )}{' '}
                {existingMaterial.uom}
              </span>
            </div>

            <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700">
              <span className="text-[11px] text-slate-500 block">Pending QC Quarantine</span>
              <span className="text-lg font-bold font-mono text-blue-600 dark:text-blue-400">
                {formatNumber(existingMaterial.pendingInspectionQty || 0)} {existingMaterial.uom}
              </span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#081F62] dark:text-blue-400" />
            <span>
              <strong>Inventory Integrity Rule:</strong> Physical, approved, reserved, and quarantine quantities are auto-updated exclusively via GRN receipts and production issue notes.
            </span>
          </div>
        </div>
      )}

      {/* Main Form Body */}
      <form onSubmit={(e) => handleSave(e, false)} className="space-y-6">
        {/* SECTION 1: BASIC MATERIAL INFORMATION */}
        <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E7E9F0] dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Boxes className="w-4 h-4 text-[#081F62] dark:text-blue-400" />
              <h2 className="text-sm font-semibold text-[#051747] dark:text-slate-100">
                1. Basic Material Information
              </h2>
            </div>
            <StatusBadge status={form.status} size="xs" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <FormInput
              label="Material Code"
              name="code"
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              error={errors.code}
              placeholder="e.g. RM-2026-010"
              hint={isEdit ? 'Unique master code' : 'Auto-suggested identifier'}
            />

            <div className="sm:col-span-2">
              <FormInput
                label="Material Name"
                name="name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                error={errors.name}
                placeholder="e.g. EN19 / AISI 4140 Alloy Steel Bar"
              />
            </div>

            <FormSelect
              label="Material Type"
              name="materialType"
              required
              value={form.materialType}
              onChange={(e) => setForm({ ...form, materialType: e.target.value })}
              options={MATERIAL_TYPES}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
            <FormSelect
              label="Category"
              name="category"
              required
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              options={MATERIAL_CATEGORIES}
              error={errors.category}
            />

            <div>
              <FormInput
                label="Material Grade"
                name="grade"
                value={form.grade}
                onChange={(e) => setForm({ ...form, grade: e.target.value })}
                placeholder="e.g. EN19, EN24, AISI 4140, SS316L"
                hint="Alloy grade or specification code"
              />
              {suggestedGrades.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 mt-1.5">
                  <span className="text-[10px] text-slate-400 font-medium">Common:</span>
                  {suggestedGrades.slice(0, 4).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, grade: g }))}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-[#E7E9F0] text-slate-600 dark:text-slate-300 font-mono"
                    >
                      {g}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <FormSelect
              label="Unit of Measurement (UOM)"
              name="uom"
              required
              value={form.uom}
              onChange={(e) => setForm({ ...form, uom: e.target.value })}
              options={UOM_OPTIONS}
              error={errors.uom}
            />

            <FormInput
              label="Manufacturer / Brand (Optional)"
              name="brand"
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              placeholder="e.g. Kalyani Steels, Jindal, Hindalco"
            />
          </div>

          <div className="pt-1">
            <FormTextarea
              label="Material Description &amp; Usage Overview"
              name="description"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Detailed description of the material, intended applications, and general handling guidelines..."
            />
          </div>
        </div>

        {/* SECTION 2: COST & PROCUREMENT INFORMATION */}
        <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E7E9F0] dark:border-slate-800">
            <DollarSign className="w-4 h-4 text-[#081F62] dark:text-blue-400" />
            <h2 className="text-sm font-semibold text-[#051747] dark:text-slate-100">
              2. Cost &amp; Procurement Information
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <FormInput
                label={`Standard Unit Cost (₹ / ${form.uom})`}
                name="unitCost"
                type="number"
                min="0"
                step="0.01"
                required
                value={form.unitCost}
                onChange={(e) => setForm({ ...form, unitCost: e.target.value })}
                error={errors.unitCost}
                placeholder="0.00"
                hint="Standard costing rate applied for inventory valuation"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Preferred Supplier Partner
              </label>
              <select
                value={form.preferredSupplierId}
                onChange={(e) => setForm({ ...form, preferredSupplierId: e.target.value })}
                className="w-full text-xs rounded-md border border-[#535F80]/30 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#081F62]"
              >
                <option value="">— Select Preferred Vendor —</option>
                {activeSuppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {s.name} ({s.supplierType || 'Supplier'})
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                Default vendor proposed when issuing automated PO requisitions
              </span>
            </div>

            <div>
              <FormInput
                label="Procurement Lead Time (Days)"
                name="leadTimeDays"
                type="number"
                min="0"
                step="1"
                value={form.leadTimeDays}
                onChange={(e) => setForm({ ...form, leadTimeDays: e.target.value })}
                error={errors.leadTimeDays}
                placeholder="7"
                hint="Turnaround time from PO release to receipt in dock"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: INVENTORY CONFIGURATION */}
        <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E7E9F0] dark:border-slate-800">
            <Warehouse className="w-4 h-4 text-[#081F62] dark:text-blue-400" />
            <h2 className="text-sm font-semibold text-[#051747] dark:text-slate-100">
              3. Inventory Thresholds &amp; Storage Configuration
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <FormInput
                label={`Reorder Threshold (${form.uom})`}
                name="reorderLevel"
                type="number"
                min="0"
                required
                value={form.reorderLevel}
                onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
                error={errors.reorderLevel}
                hint="Triggers PO replenishment alert when available stock falls below"
              />
            </div>

            <div>
              <FormInput
                label={`Minimum Stock Level (${form.uom})`}
                name="minStock"
                type="number"
                min="0"
                value={form.minStock}
                onChange={(e) => setForm({ ...form, minStock: e.target.value })}
                error={errors.minStock}
                hint="Critical threshold below which production faces starvation"
              />
            </div>

            <div>
              <FormInput
                label={`Maximum Stock Level (${form.uom})`}
                name="maxStock"
                type="number"
                min="0"
                value={form.maxStock}
                onChange={(e) => setForm({ ...form, maxStock: e.target.value })}
                error={errors.maxStock}
                hint="Upper ceiling to avoid capital lock-up & storage congestion"
              />
            </div>

            <div>
              <FormInput
                label={`Safety Buffer Stock (${form.uom})`}
                name="safetyStock"
                type="number"
                min="0"
                value={form.safetyStock}
                onChange={(e) => setForm({ ...form, safetyStock: e.target.value })}
                error={errors.safetyStock}
                hint="Dedicated reserve to cushion supplier delivery delays"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <FormInput
              label="Primary Storage Location / Bin"
              name="location"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="e.g. Rack A-01, Yard B-04, Bay C-02"
              hint="Designated rack, aisle, bin, or warehouse yard sector"
            />

            <div className="p-3 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-[#081F62] dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <strong>Operational Control Note:</strong> Reorder Threshold initiates purchasing, whereas Minimum Stock Level marks an urgent stockout emergency. Master data never records physical stock directly.
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: TECHNICAL SPECIFICATIONS & DYNAMIC DIMENSIONS */}
        <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E7E9F0] dark:border-slate-800">
            <Ruler className="w-4 h-4 text-[#081F62] dark:text-blue-400" />
            <h2 className="text-sm font-semibold text-[#051747] dark:text-slate-100">
              4. Technical Specifications &amp; Dimensions
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <FormSelect
              label="Applicable Standard"
              name="standard"
              value={form.standard}
              onChange={(e) => setForm({ ...form, standard: e.target.value })}
              options={COMMON_STANDARDS}
            />

            <FormSelect
              label="Material Form / Geometry"
              name="materialForm"
              value={form.materialForm}
              onChange={(e) => setForm({ ...form, materialForm: e.target.value })}
              options={MATERIAL_FORMS}
            />

            <FormInput
              label="Machining Tolerance (Optional)"
              name="tolerance"
              value={form.tolerance}
              onChange={(e) => setForm({ ...form, tolerance: e.target.value })}
              placeholder="e.g. ±0.05 mm, h8, f7"
              hint="Dimensional tolerance class"
            />

            <FormInput
              label="Material Density (Optional)"
              name="density"
              value={form.density}
              onChange={(e) => setForm({ ...form, density: e.target.value })}
              placeholder="e.g. 7.85 g/cm³"
              hint="Useful for automatic weight calculations"
            />
          </div>

          {/* Conditional Dimension Fields Based on Material Form */}
          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
            <span className="text-xs font-semibold text-[#081F62] dark:text-blue-400 block uppercase tracking-wider">
              Dimensional Geometry Configuration ({form.materialForm} Profile)
            </span>

            {(form.materialForm === 'Bar' || form.materialForm === 'Rod') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <FormInput
                  label="Diameter (mm)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.dimensions.diameter}
                  onChange={(e) => handleDimensionChange('diameter', e.target.value)}
                  placeholder="e.g. 50"
                />
                <FormInput
                  label="Standard Length (mm)"
                  type="number"
                  min="0"
                  step="1"
                  value={form.dimensions.length}
                  onChange={(e) => handleDimensionChange('length', e.target.value)}
                  placeholder="e.g. 3000"
                />
                <FormInput
                  label="Profile Notes"
                  value={form.dimensions.notes}
                  onChange={(e) => handleDimensionChange('notes', e.target.value)}
                  placeholder="e.g. Bright Drawn / Peeled Round Bar"
                />
              </div>
            )}

            {(form.materialForm === 'Sheet' || form.materialForm === 'Plate') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <FormInput
                  label="Thickness (mm)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.dimensions.thickness}
                  onChange={(e) => handleDimensionChange('thickness', e.target.value)}
                  placeholder="e.g. 12"
                />
                <FormInput
                  label="Width (mm)"
                  type="number"
                  min="0"
                  step="1"
                  value={form.dimensions.width}
                  onChange={(e) => handleDimensionChange('width', e.target.value)}
                  placeholder="e.g. 1250"
                />
                <FormInput
                  label="Length (mm)"
                  type="number"
                  min="0"
                  step="1"
                  value={form.dimensions.length}
                  onChange={(e) => handleDimensionChange('length', e.target.value)}
                  placeholder="e.g. 2500"
                />
                <FormInput
                  label="Sheet Notes"
                  value={form.dimensions.notes}
                  onChange={(e) => handleDimensionChange('notes', e.target.value)}
                  placeholder="e.g. Hot Rolled Pickled & Oiled (HRPO)"
                />
              </div>
            )}

            {(form.materialForm === 'Pipe' || form.materialForm === 'Tube') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <FormInput
                  label="Outer Diameter (OD mm)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.dimensions.outerDiameter}
                  onChange={(e) => handleDimensionChange('outerDiameter', e.target.value)}
                  placeholder="e.g. 65"
                />
                <FormInput
                  label="Wall Thickness (WT mm)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.dimensions.wallThickness}
                  onChange={(e) => handleDimensionChange('wallThickness', e.target.value)}
                  placeholder="e.g. 15"
                />
                <FormInput
                  label="Length (mm)"
                  type="number"
                  min="0"
                  step="1"
                  value={form.dimensions.length}
                  onChange={(e) => handleDimensionChange('length', e.target.value)}
                  placeholder="e.g. 1000"
                />
                <FormInput
                  label="Tube Notes"
                  value={form.dimensions.notes}
                  onChange={(e) => handleDimensionChange('notes', e.target.value)}
                  placeholder="e.g. Seamless Honed Tube"
                />
              </div>
            )}

            {form.materialForm === 'Other' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormInput
                  label="Dimensions / Geometry Description"
                  value={form.dimensions.notes}
                  onChange={(e) => handleDimensionChange('notes', e.target.value)}
                  placeholder="e.g. 220 × 180 × 110mm Cored Casting Blank, or M12×45mm Screw"
                />
                <FormInput
                  label="Critical Size Reference"
                  value={form.dimensions.thickness}
                  onChange={(e) => handleDimensionChange('thickness', e.target.value)}
                  placeholder="e.g. 110mm Height / Size"
                />
              </div>
            )}
          </div>

          <div className="pt-1">
            <FormTextarea
              label="Engineering Specification String (Auto-Generated or Custom)"
              name="spec"
              rows={2}
              value={form.spec}
              onChange={(e) => setForm({ ...form, spec: e.target.value })}
              placeholder="e.g. Dia 50mm, Bright Drawn, Tensile 850-1000 MPa, EN19 / AISI 4140"
              hint="Shown in BOM tables, Purchase Orders, and dispatch invoices"
            />
          </div>
        </div>

        {/* SECTION 5: QUALITY & MATERIAL TRACKING */}
        <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E7E9F0] dark:border-slate-800">
            <ShieldCheck className="w-4 h-4 text-[#081F62] dark:text-blue-400" />
            <h2 className="text-sm font-semibold text-[#051747] dark:text-slate-100">
              5. Quality Compliance, Traceability &amp; Status
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* QC Inspection Required */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                  QC Inspection Required
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Routes incoming shipments to Quarantine inspection queue
                </span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, requireQc: true })}
                  className={`flex-1 py-1 px-2 text-xs font-semibold rounded cursor-pointer transition-colors ${
                    form.requireQc
                      ? 'bg-[#081F62] text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-600 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, requireQc: false })}
                  className={`flex-1 py-1 px-2 text-xs font-semibold rounded cursor-pointer transition-colors ${
                    !form.requireQc
                      ? 'bg-[#081F62] text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-600 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  No
                </button>
              </div>
            </div>

            {/* Batch Tracking */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                  Batch Tracking Required
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Enforces unique lot identification on receipt &amp; issue
                </span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, batchTracking: true })}
                  className={`flex-1 py-1 px-2 text-xs font-semibold rounded cursor-pointer transition-colors ${
                    form.batchTracking
                      ? 'bg-[#081F62] text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-600 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, batchTracking: false })}
                  className={`flex-1 py-1 px-2 text-xs font-semibold rounded cursor-pointer transition-colors ${
                    !form.batchTracking
                      ? 'bg-[#081F62] text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-600 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  No
                </button>
              </div>
            </div>

            {/* Heat Number Tracking */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                  Heat Number Tracking
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Mill test certificate &amp; heat chemistry traceability
                </span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, heatNumberTracking: true })}
                  className={`flex-1 py-1 px-2 text-xs font-semibold rounded cursor-pointer transition-colors ${
                    form.heatNumberTracking
                      ? 'bg-[#081F62] text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-600 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, heatNumberTracking: false })}
                  className={`flex-1 py-1 px-2 text-xs font-semibold rounded cursor-pointer transition-colors ${
                    !form.heatNumberTracking
                      ? 'bg-[#081F62] text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-600 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  No
                </button>
              </div>
            </div>

            {/* Material Status */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                  Master Material Status
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Inactive materials cannot be ordered on new POs
                </span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, status: 'Active' })}
                  className={`flex-1 py-1 px-2 text-xs font-semibold rounded cursor-pointer transition-colors ${
                    form.status === 'Active'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-600 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, status: 'Inactive' })}
                  className={`flex-1 py-1 px-2 text-xs font-semibold rounded cursor-pointer transition-colors ${
                    form.status === 'Inactive'
                      ? 'bg-slate-700 text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-600 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Inactive
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Form Action Buttons Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-lg bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 shadow-2xs">
          <SecondaryButton
            type="button"
            icon={ArrowLeft}
            onClick={() => {
              if (form.name || form.grade) {
                setConfirmCancelOpen(true);
              } else {
                navigate('/materials');
              }
            }}
          >
            Cancel &amp; Return
          </SecondaryButton>

          <div className="flex items-center gap-2.5">
            <SecondaryButton
              type="button"
              icon={RotateCcw}
              onClick={() => setConfirmResetOpen(true)}
            >
              Reset Form
            </SecondaryButton>

            {!isEdit && (
              <SecondaryButton
                type="button"
                icon={Plus}
                onClick={(e) => handleSave(e, true)}
              >
                Save &amp; Add Another
              </SecondaryButton>
            )}

            <PrimaryButton
              type="submit"
              icon={Save}
            >
              {isEdit ? 'Update Material' : 'Save Material'}
            </PrimaryButton>
          </div>
        </div>
      </form>

      {/* Confirmation Dialog: Reset Form */}
      <ConfirmationDialog
        isOpen={confirmResetOpen}
        onClose={() => setConfirmResetOpen(false)}
        onConfirm={handleConfirmReset}
        title="Reset Material Form"
        confirmLabel="Clear All Fields"
        variant="danger"
        message="Are you sure you want to reset this form? All entered specifications and unsaved inputs will be cleared."
      />

      {/* Confirmation Dialog: Cancel */}
      <ConfirmationDialog
        isOpen={confirmCancelOpen}
        onClose={() => setConfirmCancelOpen(false)}
        onConfirm={() => navigate('/materials')}
        title="Discard Unsaved Changes?"
        confirmLabel="Discard &amp; Exit"
        cancelLabel="Continue Editing"
        variant="warning"
        message="You have unsaved material configurations. If you leave now, your entered information will be lost."
      />
    </div>
  );
}
