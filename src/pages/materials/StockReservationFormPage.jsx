import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  BookmarkCheck,
  Calendar,
  Clock,
  Factory,
  Layers,
  Lock,
  Package,
  RotateCcw,
  Save,
  ShieldCheck,
  Warehouse,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Sparkles,
  MapPin,
  Tag,
  User,
  Zap,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { StatCard } from '../../components/dashboard/StatCard';
import { PrimaryButton, SecondaryButton } from '../../components/common/Buttons';
import { FormInput, FormSelect, FormTextarea } from '../../components/forms/FormFields';
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog';
import { Modal } from '../../components/common/Modal';
import { useApp } from '../../context/AppContext';
import { useErpData } from '../../context/ErpDataContext';
import { storageService } from '../../services/storageService';
import { getMaterialComputedFields } from '../../services/erpService';
import { formatNumber, formatDate } from '../../utils/formatters';
import {
  RESERVATION_STATUSES,
  RESERVATION_PRIORITIES,
  RESERVATION_WAREHOUSES,
} from '../../data/reservationsData';
import {
  STATUS_STYLES,
  PRIORITY_STYLES,
  APPROVED_BATCHES_MAP,
  generateReservationNumber,
  calculateRemainingProductionRequirement,
  calculateRemainingAvailableStock,
} from './reservationUtils';

const DRAFT_STORAGE_KEY = 'suvidh_stock_reservation_draft';

const RESERVATION_REASONS = [
  'Scheduled Production Run',
  'Customer Priority Schedule',
  'Trial Production Batch',
  'Critical Order Allocation',
  'Breakdown Maintenance Buffer',
  'Other / Custom Reason',
];

const RACK_LOCATIONS = [
  'Rack A-01 / Shelf 2',
  'Rack A-01 / Shelf 4',
  'Rack A-05 / Bay 1',
  'Rack A-05 / Bay 3',
  'Rack A-08 / Ground Bay',
  'Yard B-04 / Staging Floor',
  'Rack C-02 / Shelf 1',
  'Rack C-06 / Non-Ferrous Bay',
  'Bin D-12 / Seals Compartment',
  'Chem Bay E-01 / Coolant Staging',
  'Bin D-04 / Hardware Drawer',
];

export function StockReservationFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planIdParam = searchParams.get('planId');
  const materialIdParam = searchParams.get('materialId');

  const { currentUser, addToast } = useApp();
  const {
    materials = [],
    materialTransactions = [],
    productionPlans = [],
    machines = [],
    products = [],
    boms = [],
    stockReservations = [],
    createStockReservation,
  } = useErpData();

  const computedMaterials = useMemo(
    () => materials.map(getMaterialComputedFields),
    [materials]
  );

  const activePlans = useMemo(
    () => productionPlans.filter((p) => p.status !== 'Completed'),
    [productionPlans]
  );

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Expiry date default: 7 days from today
  const defaultExpiryStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  }, []);

  // Auto-generate next unique reservation number
  const generatedReservationNumber = useMemo(() => {
    return generateReservationNumber(stockReservations);
  }, [stockReservations]);

  // Section 1: Reservation Info
  const [reservationInfo, setReservationInfo] = useState({
    reservationNumber: generatedReservationNumber,
    reservationDate: todayStr,
    reservedBy: `${currentUser?.name || 'Ramesh Pawar'} (${currentUser?.role || 'Store'})`,
    status: 'Active',
  });

  // Section 2: Production Reference
  const initialPlan = useMemo(() => {
    if (planIdParam) {
      const match = productionPlans.find((p) => p.id === planIdParam);
      if (match) return match;
    }
    return activePlans[0] || productionPlans[0] || null;
  }, [planIdParam, activePlans, productionPlans]);

  const [productionRef, setProductionRef] = useState({
    planId: initialPlan?.id || '',
    workOrderNumber: initialPlan ? `WO-${initialPlan.id.replace('PLAN-', '')}` : '',
    productId: initialPlan?.productId || '',
    productName: '',
    machineId: initialPlan?.assignedMachineId || '',
    machineName: '',
    requiredProductionQuantity: initialPlan?.manufacturingRequirement || initialPlan?.requiredQty || 100,
    requiredByDate: initialPlan?.plannedStartDate || todayStr,
  });

  // Section 3: Material Information
  const initialMaterial = useMemo(() => {
    if (materialIdParam) {
      const match = materials.find((m) => m.id === materialIdParam);
      if (match) return match;
    }
    return materials[0] || null;
  }, [materialIdParam, materials]);

  const [materialInfo, setMaterialInfo] = useState({
    materialId: initialMaterial?.id || '',
    materialCode: initialMaterial?.code || '',
    materialName: initialMaterial?.name || '',
    materialGrade: initialMaterial?.spec || '',
    unit: initialMaterial?.uom || 'Kg',
    warehouse: RESERVATION_WAREHOUSES[0],
    batchNumber: 'ALL-APPROVED',
    storageLocation: initialMaterial?.location || RACK_LOCATIONS[0],
  });

  // Section 4: Quantity Details
  const [newReservationQty, setNewReservationQty] = useState('');

  // Section 5: Validity & Priority
  const [validityInfo, setValidityInfo] = useState({
    expiryDate: defaultExpiryStr,
    priority: 'Normal',
  });

  // Section 6: Remarks
  const [remarksInfo, setRemarksInfo] = useState({
    reason: RESERVATION_REASONS[0],
    customReason: '',
    notes: '',
  });

  // Dialog & state flags
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [successModalData, setSuccessModalData] = useState(null);
  const [errors, setErrors] = useState({});

  // Restore draft from localStorage if present
  useEffect(() => {
    if (planIdParam || materialIdParam) return;
    const savedDraft = storageService.loadPreference(DRAFT_STORAGE_KEY, null);
    if (savedDraft) {
      if (savedDraft.reservationInfo) setReservationInfo(savedDraft.reservationInfo);
      if (savedDraft.productionRef) setProductionRef(savedDraft.productionRef);
      if (savedDraft.materialInfo) setMaterialInfo(savedDraft.materialInfo);
      if (savedDraft.newReservationQty !== undefined) setNewReservationQty(savedDraft.newReservationQty);
      if (savedDraft.validityInfo) setValidityInfo(savedDraft.validityInfo);
      if (savedDraft.remarksInfo) setRemarksInfo(savedDraft.remarksInfo);
      setDraftLoaded(true);
    }
  }, [planIdParam, materialIdParam]);

  // Handle plan selection change
  const handlePlanChange = useCallback(
    (selectedPlanId) => {
      const plan = productionPlans.find((p) => p.id === selectedPlanId);
      if (!plan) return;

      const prod = products.find((p) => p.id === plan.productId);
      const mach = machines.find((m) => m.id === plan.assignedMachineId);
      const woNum = `WO-${plan.id.replace('PLAN-', '')}`;

      setProductionRef({
        planId: plan.id,
        workOrderNumber: woNum,
        productId: prod?.id || plan.productId,
        productName: prod?.name || plan.productId,
        machineId: mach?.id || plan.assignedMachineId || '',
        machineName: mach?.name || 'Assigned Machine',
        requiredProductionQuantity: plan.manufacturingRequirement || plan.requiredQty || 0,
        requiredByDate: plan.plannedStartDate || plan.plannedCompletionDate || todayStr,
      });

      // Suggest expiry date matching planned completion date
      if (plan.plannedCompletionDate && plan.plannedCompletionDate >= todayStr) {
        setValidityInfo((prev) => ({ ...prev, expiryDate: plan.plannedCompletionDate }));
      }

      // Check BOM for material recommendation
      const bom = boms.find((b) => b.productId === plan.productId);
      if (bom && bom.items && bom.items.length > 0) {
        const firstBomItem = bom.items[0];
        const mat = materials.find((m) => m.id === firstBomItem.materialId);
        if (mat) {
          const defaultBatches = APPROVED_BATCHES_MAP[mat.id] || [];
          const firstBatch = defaultBatches[0];
          setMaterialInfo({
            materialId: mat.id,
            materialCode: mat.code,
            materialName: mat.name,
            materialGrade: mat.spec || '',
            unit: mat.uom || 'Kg',
            warehouse: firstBatch?.warehouse || RESERVATION_WAREHOUSES[0],
            batchNumber: 'ALL-APPROVED',
            storageLocation: firstBatch?.location || mat.location || RACK_LOCATIONS[0],
          });
        }
      }
    },
    [productionPlans, products, machines, boms, materials, todayStr]
  );

  // Initialize production reference on mount if productName is blank
  useEffect(() => {
    if (initialPlan && !productionRef.productName) {
      handlePlanChange(initialPlan.id);
    }
  }, [initialPlan, productionRef.productName, handlePlanChange]);

  // Handle material selection change
  const handleMaterialChange = useCallback(
    (matId) => {
      const mat = materials.find((m) => m.id === matId);
      if (!mat) return;

      const defaultBatches = APPROVED_BATCHES_MAP[mat.id] || [];
      const firstBatch = defaultBatches[0];

      setMaterialInfo({
        materialId: mat.id,
        materialCode: mat.code,
        materialName: mat.name,
        materialGrade: mat.spec || '',
        unit: mat.uom || 'Kg',
        warehouse: firstBatch?.warehouse || RESERVATION_WAREHOUSES[0],
        batchNumber: 'ALL-APPROVED',
        storageLocation: firstBatch?.location || mat.location || RACK_LOCATIONS[0],
      });
    },
    [materials]
  );

  // Selected material computed record
  const selectedMaterial = useMemo(() => {
    return computedMaterials.find((m) => m.id === materialInfo.materialId) || null;
  }, [computedMaterials, materialInfo.materialId]);

  // Available batches for selected material
  const approvedBatches = useMemo(() => {
    if (!materialInfo.materialId) return [];
    return APPROVED_BATCHES_MAP[materialInfo.materialId] || [];
  }, [materialInfo.materialId]);

  // Selected BOM item for ratio calculation
  const currentPlanBom = useMemo(() => {
    if (!productionRef.productId) return null;
    return boms.find((b) => b.productId === productionRef.productId) || null;
  }, [boms, productionRef.productId]);

  const bomItemForMaterial = useMemo(() => {
    if (!currentPlanBom || !materialInfo.materialId) return null;
    return currentPlanBom.items?.find((item) => item.materialId === materialInfo.materialId) || null;
  }, [currentPlanBom, materialInfo.materialId]);

  // Calculate Required Material Quantity for this Work Order
  const totalRequiredQuantity = useMemo(() => {
    const plannedUnits = Number(productionRef.requiredProductionQuantity) || 0;
    if (bomItemForMaterial) {
      return Number(bomItemForMaterial.quantity) * plannedUnits;
    }
    // Fallback: estimate from standard ratio or plan size
    return plannedUnits * 10;
  }, [productionRef.requiredProductionQuantity, bomItemForMaterial]);

  // Calculate previously reserved quantity for this WO/Plan & Material
  const previouslyReservedQuantity = useMemo(() => {
    if (!materialInfo.materialId || (!productionRef.workOrderNumber && !productionRef.planId)) return 0;
    return stockReservations
      .filter(
        (r) =>
          (r.status === 'Active' || r.status === 'Partially Consumed') &&
          r.materialId === materialInfo.materialId &&
          ((productionRef.workOrderNumber && r.workOrderNumber === productionRef.workOrderNumber) ||
            (productionRef.planId && (r.productionPlanNumber === productionRef.planId || r.planId === productionRef.planId)))
      )
      .reduce((sum, r) => sum + Math.max(0, Number(r.reservedQuantity || 0) - Number(r.consumedQuantity || 0)), 0);
  }, [stockReservations, materialInfo.materialId, productionRef.workOrderNumber, productionRef.planId]);

  // Calculate previously issued quantity for this WO/Plan & Material
  const previouslyIssuedQuantity = useMemo(() => {
    if (!materialInfo.materialId || (!productionRef.workOrderNumber && !productionRef.planId)) return 0;
    return materialTransactions
      .filter(
        (t) =>
          t.type === 'Outward' &&
          t.materialId === materialInfo.materialId &&
          ((productionRef.workOrderNumber && t.workOrderNumber === productionRef.workOrderNumber) ||
            (productionRef.planId && t.planId === productionRef.planId) ||
            (productionRef.workOrderNumber && t.reference?.includes(productionRef.workOrderNumber)))
      )
      .reduce((sum, t) => sum + Math.abs(Number(t.quantity || 0)), 0);
  }, [materialTransactions, materialInfo.materialId, productionRef.workOrderNumber, productionRef.planId]);

  // Remaining production requirement
  const remainingProductionRequirement = useMemo(() => {
    return calculateRemainingProductionRequirement(
      totalRequiredQuantity,
      previouslyReservedQuantity,
      previouslyIssuedQuantity
    );
  }, [totalRequiredQuantity, previouslyReservedQuantity, previouslyIssuedQuantity]);

  // Physical stock values
  const approvedUsableStock = Number(selectedMaterial?.approvedPhysicalQty || 0);
  const existingReservedStock = Number(selectedMaterial?.reservedQty || 0);
  const netAvailableStock = Math.max(0, approvedUsableStock - existingReservedStock);

  // Remaining available stock after user entered reservation qty
  const enteredQtyNum = Number(newReservationQty) || 0;
  const remainingAvailableStockAfter = useMemo(() => {
    return calculateRemainingAvailableStock(netAvailableStock, enteredQtyNum);
  }, [netAvailableStock, enteredQtyNum]);

  // Live validations
  const validationWarnings = useMemo(() => {
    const list = [];
    if (enteredQtyNum > 0 && enteredQtyNum > remainingProductionRequirement && remainingProductionRequirement > 0) {
      list.push(
        `Reservation quantity (${enteredQtyNum} ${materialInfo.unit}) exceeds remaining production requirement (${remainingProductionRequirement} ${materialInfo.unit}). This may over-allocate inventory.`
      );
    }
    if (enteredQtyNum > netAvailableStock) {
      list.push(
        `Requested reservation exceeds net available stock of ${formatNumber(netAvailableStock)} ${materialInfo.unit}.`
      );
    }
    return list;
  }, [enteredQtyNum, remainingProductionRequirement, netAvailableStock, materialInfo.unit]);

  // Validate form before submission
  const validateForm = useCallback(() => {
    const errs = {};
    if (!productionRef.planId) {
      errs.planId = 'Production Plan is required.';
    }
    if (!productionRef.workOrderNumber) {
      errs.workOrderNumber = 'Work Order reference is required.';
    }
    if (!materialInfo.materialId) {
      errs.materialId = 'Raw material selection is required.';
    }
    if (!newReservationQty || enteredQtyNum <= 0) {
      errs.newReservationQty = 'Please enter a valid reservation quantity greater than 0.';
    } else if (enteredQtyNum > netAvailableStock) {
      errs.newReservationQty = `Reservation quantity cannot exceed net available stock (${formatNumber(netAvailableStock)} ${materialInfo.unit}).`;
    }

    if (!validityInfo.expiryDate) {
      errs.expiryDate = 'Reservation expiry date is required.';
    } else if (validityInfo.expiryDate < reservationInfo.reservationDate) {
      errs.expiryDate = 'Expiry date cannot be earlier than reservation date.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [
    productionRef.planId,
    productionRef.workOrderNumber,
    materialInfo.materialId,
    newReservationQty,
    enteredQtyNum,
    netAvailableStock,
    materialInfo.unit,
    validityInfo.expiryDate,
    reservationInfo.reservationDate,
  ]);

  // Save as draft to localStorage
  const handleSaveDraft = useCallback(() => {
    const draft = {
      reservationInfo,
      productionRef,
      materialInfo,
      newReservationQty,
      validityInfo,
      remarksInfo,
      savedAt: new Date().toISOString(),
    };
    storageService.savePreference(DRAFT_STORAGE_KEY, draft);
    setDraftLoaded(true);
    addToast({
      title: 'Draft Saved Locally',
      message: `Reservation draft for ${materialInfo.materialName || 'material'} has been saved. Inventory remains untouched.`,
      type: 'info',
    });
  }, [
    reservationInfo,
    productionRef,
    materialInfo,
    newReservationQty,
    validityInfo,
    remarksInfo,
    addToast,
  ]);

  // Reset form
  const handleResetForm = useCallback(() => {
    storageService.savePreference(DRAFT_STORAGE_KEY, null);
    setDraftLoaded(false);
    setNewReservationQty('');
    setErrors({});
    if (initialPlan) {
      handlePlanChange(initialPlan.id);
    }
    setValidityInfo({
      expiryDate: defaultExpiryStr,
      priority: 'Normal',
    });
    setRemarksInfo({
      reason: RESERVATION_REASONS[0],
      customReason: '',
      notes: '',
    });
    addToast({
      title: 'Form Reset',
      message: 'Reservation form restored to initial default state.',
      type: 'info',
    });
  }, [initialPlan, handlePlanChange, defaultExpiryStr, addToast]);

  // Submit confirmed
  const handleConfirmReservation = useCallback(() => {
    const finalReason =
      remarksInfo.reason === 'Other / Custom Reason'
        ? remarksInfo.customReason || 'Custom reservation'
        : remarksInfo.reason;

    const fullRemarks = [
      finalReason,
      `Work Order: ${productionRef.workOrderNumber}`,
      `Plan: ${productionRef.planId}`,
      `Product: ${productionRef.productName}`,
      remarksInfo.notes ? `Notes: ${remarksInfo.notes}` : '',
    ]
      .filter(Boolean)
      .join(' · ');

    const payload = {
      reservationNumber: reservationInfo.reservationNumber,
      reservationDate: reservationInfo.reservationDate,
      reservedBy: reservationInfo.reservedBy,
      productionPlanNumber: productionRef.planId,
      planId: productionRef.planId,
      workOrderNumber: productionRef.workOrderNumber,
      productName: productionRef.productName,
      machineNumber: productionRef.machineName || productionRef.machineId,
      requiredProductionQuantity: productionRef.requiredProductionQuantity,
      requiredByDate: productionRef.requiredByDate,
      materialId: materialInfo.materialId,
      materialCode: materialInfo.materialCode,
      materialName: materialInfo.materialName,
      materialGrade: materialInfo.materialGrade,
      unit: materialInfo.unit,
      warehouse: materialInfo.warehouse,
      batchNumber: materialInfo.batchNumber,
      storageLocation: materialInfo.storageLocation,
      approvedUsableStock,
      existingReservedQuantity: existingReservedStock,
      netAvailableStock,
      requiredQuantity: totalRequiredQuantity,
      previouslyReservedQuantity,
      previouslyIssuedQuantity,
      remainingRequirement: remainingProductionRequirement,
      reservedQuantity: enteredQtyNum,
      remainingAvailableStockAfterReservation: remainingAvailableStockAfter,
      expiryDate: validityInfo.expiryDate,
      priority: validityInfo.priority,
      remarks: fullRemarks,
    };

    const success = createStockReservation(payload);
    if (success) {
      // Clear draft on successful reservation
      storageService.savePreference(DRAFT_STORAGE_KEY, null);
      setSuccessModalData(payload);
    }
  }, [
    remarksInfo,
    productionRef,
    reservationInfo,
    materialInfo,
    approvedUsableStock,
    existingReservedStock,
    netAvailableStock,
    totalRequiredQuantity,
    previouslyReservedQuantity,
    previouslyIssuedQuantity,
    remainingProductionRequirement,
    enteredQtyNum,
    remainingAvailableStockAfter,
    validityInfo,
    createStockReservation,
  ]);

  // Click handler for primary submission
  const handleSubmitClick = (e) => {
    e.preventDefault();
    if (validateForm()) {
      setConfirmSubmitOpen(true);
    } else {
      addToast({
        title: 'Validation Errors Found',
        message: 'Please review the highlighted fields in red before submitting.',
        type: 'error',
      });
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <PageHeader
        title="Record Stock Reservation"
        subtitle="Lock and allocate quality-approved raw material stock for scheduled production plans and work orders."
        breadcrumbs={[
          { label: 'Inventory', to: '/inventory' },
          { label: 'Stock Reservations', to: '/stock-reservation' },
          { label: 'New Stock Reservation' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <SecondaryButton
              icon={ArrowLeft}
              onClick={() => {
                if (enteredQtyNum > 0) {
                  setConfirmCancelOpen(true);
                } else {
                  navigate('/stock-reservation');
                }
              }}
            >
              Back to List
            </SecondaryButton>
            <SecondaryButton icon={Save} onClick={handleSaveDraft}>
              Save Draft
            </SecondaryButton>
            <SecondaryButton icon={RotateCcw} onClick={() => setConfirmResetOpen(true)}>
              Reset
            </SecondaryButton>
            <PrimaryButton icon={BookmarkCheck} onClick={handleSubmitClick}>
              Reserve Material
            </PrimaryButton>
          </div>
        }
      />

      {/* Draft Notification Banner */}
      {draftLoaded && (
        <div className="flex items-center justify-between p-3.5 bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-900 dark:text-blue-200">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>
              <strong>Draft Loaded:</strong> An autosaved reservation draft was restored from your local session. Review values before confirming.
            </span>
          </div>
          <button
            type="button"
            onClick={handleResetForm}
            className="text-xs font-semibold underline text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100"
          >
            Clear Draft
          </button>
        </div>
      )}

      {/* Live KPI Quick Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Approved Usable Stock"
          value={`${formatNumber(approvedUsableStock)} ${materialInfo.unit}`}
          subtitle="Physical QC-cleared inventory"
          icon={ShieldCheck}
        />
        <StatCard
          title="Existing Reserved Qty"
          value={`${formatNumber(existingReservedStock)} ${materialInfo.unit}`}
          subtitle="Locked for other production orders"
          icon={Lock}
        />
        <StatCard
          title="Net Available to Reserve"
          value={`${formatNumber(netAvailableStock)} ${materialInfo.unit}`}
          subtitle="Approved usable minus existing locks"
          icon={Package}
          color={netAvailableStock > 0 ? 'emerald' : 'rose'}
        />
        <StatCard
          title="Est. Balance After Reservation"
          value={`${formatNumber(Math.max(0, remainingAvailableStockAfter))} ${materialInfo.unit}`}
          subtitle={
            remainingAvailableStockAfter < 0
              ? 'Deficit! Exceeds available stock'
              : 'Remaining free stock'
          }
          icon={Layers}
          color={remainingAvailableStockAfter >= 0 ? 'blue' : 'rose'}
        />
      </div>

      {/* Main Reservation Form */}
      <form onSubmit={handleSubmitClick} className="space-y-6">
        {/* Section 1: Reservation Information */}
        <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#E7E9F0] dark:border-slate-800 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E7E9F0] dark:border-slate-800">
            <div className="flex items-center gap-2">
              <BookmarkCheck className="w-5 h-5 text-[#081F62] dark:text-blue-400" />
              <h2 className="text-sm font-semibold text-[#051747] dark:text-slate-100">
                1. Reservation Information
              </h2>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
              Status: Active (New)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <FormInput
              label="Reservation Number"
              name="reservationNumber"
              value={reservationInfo.reservationNumber}
              disabled
              helperText="Auto-generated sequential identifier"
            />
            <FormInput
              label="Reservation Date"
              name="reservationDate"
              type="date"
              value={reservationInfo.reservationDate}
              onChange={(e) =>
                setReservationInfo((prev) => ({ ...prev, reservationDate: e.target.value }))
              }
              required
              helperText="Defaults to today"
            />
            <FormInput
              label="Reserved By"
              name="reservedBy"
              value={reservationInfo.reservedBy}
              disabled
              helperText="Logged-in store in-charge"
            />
            <FormInput
              label="Reservation Status"
              name="status"
              value={reservationInfo.status}
              disabled
              helperText="Controlled by transaction lifecycle"
            />
          </div>
        </div>

        {/* Section 2: Production Reference */}
        <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#E7E9F0] dark:border-slate-800 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E7E9F0] dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Factory className="w-5 h-5 text-[#081F62] dark:text-blue-400" />
              <h2 className="text-sm font-semibold text-[#051747] dark:text-slate-100">
                2. Production Reference
              </h2>
            </div>
            <span className="text-xs text-[#535F80] dark:text-slate-400">
              Mandatory plan linkage for material traceability
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormSelect
              label="Production Plan"
              name="planId"
              value={productionRef.planId}
              onChange={(e) => handlePlanChange(e.target.value)}
              options={productionPlans.map((p) => {
                const prod = products.find((pr) => pr.id === p.productId);
                return {
                  value: p.id,
                  label: `${p.id} — ${prod?.name || p.productId} (${p.status})`,
                };
              })}
              required
              error={errors.planId}
              helperText="Select the active manufacturing plan"
            />

            <FormInput
              label="Work Order Number"
              name="workOrderNumber"
              value={productionRef.workOrderNumber}
              onChange={(e) =>
                setProductionRef((prev) => ({ ...prev, workOrderNumber: e.target.value }))
              }
              required
              error={errors.workOrderNumber}
              helperText="Auto-populated from selected production plan"
            />

            <FormInput
              label="Target Product"
              name="productName"
              value={productionRef.productName}
              disabled
              helperText="Product to be manufactured"
            />

            <FormInput
              label="Assigned Machine / Cell"
              name="machineName"
              value={productionRef.machineName || 'Unassigned'}
              disabled
              helperText="Machine assigned in production plan"
            />

            <FormInput
              label="Required Production Quantity"
              name="requiredProductionQuantity"
              type="number"
              value={productionRef.requiredProductionQuantity}
              disabled
              helperText="Planned batch volume (Nos)"
            />

            <FormInput
              label="Required By Date"
              name="requiredByDate"
              type="date"
              value={productionRef.requiredByDate}
              onChange={(e) =>
                setProductionRef((prev) => ({ ...prev, requiredByDate: e.target.value }))
              }
              helperText="Target date when production starts"
            />
          </div>
        </div>

        {/* Section 3: Material Information */}
        <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#E7E9F0] dark:border-slate-800 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E7E9F0] dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-[#081F62] dark:text-blue-400" />
              <h2 className="text-sm font-semibold text-[#051747] dark:text-slate-100">
                3. Raw Material Information
              </h2>
            </div>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Quality-approved lots only
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormSelect
              label="Select Raw Material"
              name="materialId"
              value={materialInfo.materialId}
              onChange={(e) => handleMaterialChange(e.target.value)}
              options={materials.map((m) => ({
                value: m.id,
                label: `${m.code} — ${m.name} (${m.spec || m.category})`,
              }))}
              required
              error={errors.materialId}
              helperText="Material requirement derived from Product BOM"
            />

            <FormInput
              label="Material Code"
              name="materialCode"
              value={materialInfo.materialCode}
              disabled
              helperText="Standard ERP item identifier"
            />

            <FormInput
              label="Material Name"
              name="materialName"
              value={materialInfo.materialName}
              disabled
              helperText="Description from master catalogue"
            />

            <FormInput
              label="Material Grade / Specification"
              name="materialGrade"
              value={materialInfo.materialGrade || 'Standard'}
              disabled
              helperText="Certified metallurgical grade"
            />

            <FormInput
              label="Unit of Measurement (UOM)"
              name="unit"
              value={materialInfo.unit}
              disabled
              helperText="Base stocking measurement unit"
            />

            <FormSelect
              label="Source Warehouse / Store"
              name="warehouse"
              value={materialInfo.warehouse}
              onChange={(e) =>
                setMaterialInfo((prev) => ({ ...prev, warehouse: e.target.value }))
              }
              options={RESERVATION_WAREHOUSES}
              required
              helperText="Primary storage zone"
            />

            <FormSelect
              label="Batch / Heat Number (QC Approved)"
              name="batchNumber"
              value={materialInfo.batchNumber}
              onChange={(e) => {
                const bVal = e.target.value;
                const matchedBatch = approvedBatches.find((b) => b.batchNumber === bVal);
                setMaterialInfo((prev) => ({
                  ...prev,
                  batchNumber: bVal,
                  storageLocation: matchedBatch?.location || prev.storageLocation,
                  warehouse: matchedBatch?.warehouse || prev.warehouse,
                }));
              }}
              options={[
                { value: 'ALL-APPROVED', label: 'ALL-APPROVED (Reserve from any approved lot)' },
                ...approvedBatches.map((b) => ({
                  value: b.batchNumber,
                  label: `${b.batchNumber} (${b.approvedQty} ${materialInfo.unit} available · ${b.location})`,
                })),
              ]}
              helperText="Only QC-passed batches are eligible for reservation"
            />

            <FormSelect
              label="Storage Location (Rack / Bay)"
              name="storageLocation"
              value={materialInfo.storageLocation}
              onChange={(e) =>
                setMaterialInfo((prev) => ({ ...prev, storageLocation: e.target.value }))
              }
              options={RACK_LOCATIONS}
              helperText="Bin or rack where material is held"
            />
          </div>
        </div>

        {/* Section 4: Quantity Details & Calculations */}
        <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#E7E9F0] dark:border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E7E9F0] dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#081F62] dark:text-blue-400" />
              <h2 className="text-sm font-semibold text-[#051747] dark:text-slate-100">
                4. Quantity Details & Live Calculation
              </h2>
            </div>
            <span className="text-xs text-[#535F80] dark:text-slate-400">
              Double-subtraction protection active
            </span>
          </div>

          {/* Requirement breakdown cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-[#F8F9FC] dark:bg-slate-800/50 p-4 rounded-lg border border-[#E7E9F0] dark:border-slate-800">
            <div>
              <p className="text-[11px] font-medium text-[#535F80] dark:text-slate-400">
                BOM Required Quantity
              </p>
              <p className="text-base font-bold text-[#051747] dark:text-slate-100 mt-0.5">
                {formatNumber(totalRequiredQuantity)} {materialInfo.unit}
              </p>
              <p className="text-[10px] text-[#535F80] dark:text-slate-400 mt-0.5">
                Total needed for {productionRef.requiredProductionQuantity} units
              </p>
            </div>

            <div>
              <p className="text-[11px] font-medium text-[#535F80] dark:text-slate-400">
                Previously Reserved
              </p>
              <p className="text-base font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                {formatNumber(previouslyReservedQuantity)} {materialInfo.unit}
              </p>
              <p className="text-[10px] text-[#535F80] dark:text-slate-400 mt-0.5">
                Active reservations for this WO
              </p>
            </div>

            <div>
              <p className="text-[11px] font-medium text-[#535F80] dark:text-slate-400">
                Previously Issued (Outward)
              </p>
              <p className="text-base font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                {formatNumber(previouslyIssuedQuantity)} {materialInfo.unit}
              </p>
              <p className="text-[10px] text-[#535F80] dark:text-slate-400 mt-0.5">
                Already dispatched to shop floor
              </p>
            </div>

            <div>
              <p className="text-[11px] font-medium text-[#535F80] dark:text-slate-400">
                Remaining Requirement
              </p>
              <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatNumber(remainingProductionRequirement)} {materialInfo.unit}
              </p>
              <p className="text-[10px] text-[#535F80] dark:text-slate-400 mt-0.5">
                Required − Reserved − Issued
              </p>
            </div>
          </div>

          {/* User input row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-2">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[#051747] dark:text-slate-300">
                  New Reservation Quantity ({materialInfo.unit}) <span className="text-red-500">*</span>
                </label>
                {remainingProductionRequirement > 0 && netAvailableStock > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const fill = Math.min(remainingProductionRequirement, netAvailableStock);
                      setNewReservationQty(String(fill));
                    }}
                    className="text-[11px] font-semibold text-[#081F62] dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <Zap className="w-3 h-3" />
                    Fill Remaining ({Math.min(remainingProductionRequirement, netAvailableStock)})
                  </button>
                )}
              </div>
              <FormInput
                name="newReservationQty"
                type="number"
                min="0.01"
                step="0.01"
                max={netAvailableStock}
                value={newReservationQty}
                onChange={(e) => setNewReservationQty(e.target.value)}
                placeholder="Enter quantity to lock..."
                error={errors.newReservationQty}
                required
              />
            </div>

            <FormInput
              label="Net Available Stock Before Reservation"
              name="netAvailableStock"
              value={`${formatNumber(netAvailableStock)} ${materialInfo.unit}`}
              disabled
              helperText="Usable physical stock minus existing locks"
            />

            <FormInput
              label="Remaining Free Stock After Reservation"
              name="remainingAvailableStockAfter"
              value={`${formatNumber(remainingAvailableStockAfter)} ${materialInfo.unit}`}
              disabled
              className={remainingAvailableStockAfter < 0 ? 'text-red-600 font-bold' : ''}
              helperText={
                remainingAvailableStockAfter < 0
                  ? 'Exceeds available stock!'
                  : 'Free stock remaining for other plans'
              }
            />
          </div>

          {/* Warning and validation messages */}
          {validationWarnings.length > 0 && (
            <div className="space-y-2 pt-2">
              {validationWarnings.map((warning, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-200"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-xs text-[#535F80] dark:text-slate-400">
            <Info className="w-4 h-4 text-[#081F62] dark:text-blue-400 shrink-0" />
            <span>
              <strong>Inventory Integrity Note:</strong> Reserving material does not decrease physical warehouse stock immediately. It marks stock as <em>Reserved</em>, preventing it from being issued to other work orders until consumed by an Outward Issue or Released.
            </span>
          </div>
        </div>

        {/* Section 5: Validity & Priority */}
        <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#E7E9F0] dark:border-slate-800 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E7E9F0] dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#081F62] dark:text-blue-400" />
              <h2 className="text-sm font-semibold text-[#051747] dark:text-slate-100">
                5. Validity & Priority
              </h2>
            </div>
            <span className="text-xs text-[#535F80] dark:text-slate-400">
              Expiry & queue scheduling controls
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormInput
              label="Reservation Expiry Date"
              name="expiryDate"
              type="date"
              min={reservationInfo.reservationDate}
              value={validityInfo.expiryDate}
              onChange={(e) =>
                setValidityInfo((prev) => ({ ...prev, expiryDate: e.target.value }))
              }
              required
              error={errors.expiryDate}
              helperText="Date after which unused reservation auto-expires"
            />

            <FormSelect
              label="Allocation Priority"
              name="priority"
              value={validityInfo.priority}
              onChange={(e) =>
                setValidityInfo((prev) => ({ ...prev, priority: e.target.value }))
              }
              options={RESERVATION_PRIORITIES}
              required
              helperText="Urgent orders take precedence during picking"
            />

            <div className="flex flex-col justify-center">
              <span className="text-xs font-medium text-[#051747] dark:text-slate-300 mb-1.5">
                Priority Indicator
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold border ${
                    PRIORITY_STYLES[validityInfo.priority] || PRIORITY_STYLES.Normal
                  }`}
                >
                  {validityInfo.priority} Priority
                </span>
                <span className="text-xs text-[#535F80] dark:text-slate-400">
                  {validityInfo.priority === 'Urgent'
                    ? 'Immediate dispatch priority on shop floor'
                    : validityInfo.priority === 'High'
                    ? 'Scheduled ahead of standard runs'
                    : 'Standard manufacturing schedule'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 6: Remarks & Reason */}
        <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#E7E9F0] dark:border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E7E9F0] dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-[#081F62] dark:text-blue-400" />
              <h2 className="text-sm font-semibold text-[#051747] dark:text-slate-100">
                6. Remarks & Reservation Reason
              </h2>
            </div>
            <span className="text-xs text-[#535F80] dark:text-slate-400">
              Audit log notes for store and planning teams
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormSelect
              label="Reservation Reason"
              name="reason"
              value={remarksInfo.reason}
              onChange={(e) =>
                setRemarksInfo((prev) => ({ ...prev, reason: e.target.value }))
              }
              options={RESERVATION_REASONS}
              required
              helperText="Primary justification for holding inventory"
            />

            {remarksInfo.reason === 'Other / Custom Reason' && (
              <FormInput
                label="Custom Reason Description"
                name="customReason"
                value={remarksInfo.customReason}
                onChange={(e) =>
                  setRemarksInfo((prev) => ({ ...prev, customReason: e.target.value }))
                }
                placeholder="Specify custom reason..."
                required
              />
            )}
          </div>

          <FormTextarea
            label="Special Handling / Additional Notes"
            name="notes"
            value={remarksInfo.notes}
            onChange={(e) =>
              setRemarksInfo((prev) => ({ ...prev, notes: e.target.value }))
            }
            placeholder="e.g. Special heat-treatment requirement, customer inspection hold, pallet storage tag #44..."
            rows={3}
            helperText="Optional notes preserved in ERP reservation audit log"
          />
        </div>

        {/* Bottom Form Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-[#E7E9F0] dark:border-slate-800">
          <div className="flex items-center gap-2">
            <SecondaryButton
              icon={ArrowLeft}
              onClick={() => {
                if (enteredQtyNum > 0) {
                  setConfirmCancelOpen(true);
                } else {
                  navigate('/stock-reservation');
                }
              }}
            >
              Cancel
            </SecondaryButton>
            <SecondaryButton icon={RotateCcw} onClick={() => setConfirmResetOpen(true)}>
              Reset Form
            </SecondaryButton>
          </div>

          <div className="flex items-center gap-3">
            <SecondaryButton icon={Save} onClick={handleSaveDraft}>
              Save as Draft
            </SecondaryButton>
            <PrimaryButton icon={BookmarkCheck} onClick={handleSubmitClick}>
              Reserve Material
            </PrimaryButton>
          </div>
        </div>
      </form>

      {/* Confirmation Dialog before Submitting */}
      <ConfirmationDialog
        isOpen={confirmSubmitOpen}
        onClose={() => setConfirmSubmitOpen(false)}
        onConfirm={handleConfirmReservation}
        title="Confirm Stock Reservation"
        message={`Are you sure you want to reserve ${enteredQtyNum} ${materialInfo.unit} of ${materialInfo.materialName} (${materialInfo.materialCode}) for Work Order ${productionRef.workOrderNumber}? This will deduct ${enteredQtyNum} ${materialInfo.unit} from net available stock and lock it exclusively for this production order.`}
        confirmLabel="Confirm & Lock Stock"
        cancelLabel="Review Details"
        variant="primary"
      />

      {/* Reset Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmResetOpen}
        onClose={() => setConfirmResetOpen(false)}
        onConfirm={handleResetForm}
        title="Reset Form"
        message="Are you sure you want to clear this reservation form? Any unsaved inputs and local drafts will be permanently cleared."
        confirmLabel="Reset Form"
        cancelLabel="Keep Editing"
        variant="danger"
      />

      {/* Cancel Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmCancelOpen}
        onClose={() => setConfirmCancelOpen(false)}
        onConfirm={() => navigate('/stock-reservation')}
        title="Discard Unsaved Changes?"
        message="You have entered reservation quantities. Are you sure you want to leave without reserving stock or saving a draft?"
        confirmLabel="Discard & Leave"
        cancelLabel="Continue Editing"
        variant="danger"
      />

      {/* Success Modal */}
      {successModalData && (
        <Modal
          isOpen={Boolean(successModalData)}
          onClose={() => {
            setSuccessModalData(null);
            navigate('/stock-reservation');
          }}
          title="Stock Successfully Reserved"
          subtitle={`Reference: ${successModalData.reservationNumber}`}
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <SecondaryButton
                icon={RotateCcw}
                onClick={() => {
                  setSuccessModalData(null);
                  handleResetForm();
                }}
              >
                Reserve Another Material
              </SecondaryButton>
              <div className="flex items-center gap-2">
                <SecondaryButton
                  onClick={() => {
                    setSuccessModalData(null);
                    navigate(`/stock-outward/new?planId=${successModalData.planId}`);
                  }}
                >
                  Issue Material Now
                </SecondaryButton>
                <PrimaryButton
                  onClick={() => {
                    setSuccessModalData(null);
                    navigate('/stock-reservation');
                  }}
                >
                  View All Reservations
                </PrimaryButton>
              </div>
            </div>
          }
        >
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                  {successModalData.reservationNumber} Created & Locked
                </h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                  Reserved {successModalData.reservedQuantity} {successModalData.unit} of{' '}
                  {successModalData.materialName} for Work Order {successModalData.workOrderNumber}.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-800/60 p-4 rounded-lg border border-[#E7E9F0] dark:border-slate-800">
              <div>
                <span className="text-[#535F80] dark:text-slate-400">Work Order:</span>
                <p className="font-semibold text-[#051747] dark:text-slate-200">
                  {successModalData.workOrderNumber} ({successModalData.productionPlanNumber})
                </p>
              </div>
              <div>
                <span className="text-[#535F80] dark:text-slate-400">Product:</span>
                <p className="font-semibold text-[#051747] dark:text-slate-200">
                  {successModalData.productName}
                </p>
              </div>
              <div>
                <span className="text-[#535F80] dark:text-slate-400">Material & Grade:</span>
                <p className="font-semibold text-[#051747] dark:text-slate-200">
                  {successModalData.materialName} ({successModalData.materialGrade || 'Std'})
                </p>
              </div>
              <div>
                <span className="text-[#535F80] dark:text-slate-400">Batch / Heat:</span>
                <p className="font-semibold text-[#051747] dark:text-slate-200">
                  {successModalData.batchNumber}
                </p>
              </div>
              <div>
                <span className="text-[#535F80] dark:text-slate-400">Expiry Date:</span>
                <p className="font-semibold text-[#051747] dark:text-slate-200">
                  {formatDate(successModalData.expiryDate)}
                </p>
              </div>
              <div>
                <span className="text-[#535F80] dark:text-slate-400">Priority:</span>
                <p className="font-semibold text-[#051747] dark:text-slate-200">
                  {successModalData.priority} Priority
                </p>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
