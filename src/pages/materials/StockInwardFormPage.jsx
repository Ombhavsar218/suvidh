import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowDownToLine,
  Boxes,
  FileText,
  Truck,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Lock,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  AlertTriangle,
  Info,
  Warehouse,
  Calendar,
  Building2,
  Package,
  Layers,
  MapPin,
  Check,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { StatCard } from '../../components/dashboard/StatCard';
import { PrimaryButton, SecondaryButton } from '../../components/common/Buttons';
import { FormInput, FormSelect, FormTextarea } from '../../components/forms/FormFields';
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog';
import { Tooltip } from '../../components/common/Tooltip';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useApp } from '../../context/AppContext';
import { useErpData } from '../../context/ErpDataContext';
import { storageService } from '../../services/storageService';
import { getMaterialComputedFields } from '../../services/erpService';
import { formatNumber, formatDate } from '../../utils/formatters';

const DRAFT_STORAGE_KEY = 'suvidh_grn_draft';

const WAREHOUSE_OPTIONS = [
  'Main Raw Material Store (Zone A)',
  'Heavy Bar & Billet Yard (Zone B)',
  'Alloy & Stainless Steel Store (Zone C)',
  'Receiving Dock Quarantine Bay (Dock 1)',
];

const RACK_OPTIONS = [
  'Rack A-01 / Bay 1',
  'Rack A-02 / Bay 2',
  'Rack B-01 / Floor Skid 3',
  'Rack B-04 / Heavy Bay',
  'Rack C-01 / High Security',
  'Dock Quarantine Bin Q-1',
];

export function StockInwardFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const poIdParam = searchParams.get('poId');

  const { currentUser, addToast } = useApp();
  const {
    materials = [],
    purchaseOrders = [],
    suppliers = [],
    recordGrnReceipt,
  } = useErpData();

  const computedMaterials = useMemo(
    () => materials.map(getMaterialComputedFields),
    [materials]
  );

  // Auto-generate consistent next GRN sequence
  const generatedGrnNumber = useMemo(() => {
    const existingDraft = storageService.loadPreference(DRAFT_STORAGE_KEY, null);
    if (existingDraft?.receiptInfo?.grnNumber) {
      return existingDraft.receiptInfo.grnNumber;
    }
    const seedNum = 884 + Math.floor(Math.random() * 30);
    return `GRN-2026-${String(seedNum).padStart(4, '0')}`;
  }, []);

  const todayDateStr = useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  // Form State
  const [receiptInfo, setReceiptInfo] = useState({
    grnNumber: generatedGrnNumber,
    receiptDate: todayDateStr,
    poId: poIdParam || '',
    supplierId: '',
    supplierInvoice: '',
    deliveryChallan: '',
    receivedBy: `${currentUser?.name || 'Ramesh Pawar'} (${currentUser?.role || 'Store'})`,
    vehicleNumber: '',
  });

  const [items, setItems] = useState(() => {
    const firstMat = materials[0];
    return [
      {
        id: `line-${Date.now()}-1`,
        materialId: firstMat?.id || '',
        batchNumber: `HEAT-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-A`,
        warehouse: WAREHOUSE_OPTIONS[0],
        location: firstMat?.location || RACK_OPTIONS[0],
        orderedQty: 0,
        previouslyReceivedQty: 0,
        receivedQty: '',
        damagedQty: 0,
        requireQc: true,
      },
    ];
  });

  const [remarks, setRemarks] = useState('');
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [errors, setErrors] = useState({});
  const [lineErrors, setLineErrors] = useState({});

  // Dialog State
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  // Restore draft if available and not explicitly following a PO link
  useEffect(() => {
    if (poIdParam) return;
    const savedDraft = storageService.loadPreference(DRAFT_STORAGE_KEY, null);
    if (savedDraft) {
      if (savedDraft.receiptInfo) setReceiptInfo(savedDraft.receiptInfo);
      if (Array.isArray(savedDraft.items) && savedDraft.items.length > 0) {
        setItems(savedDraft.items);
      }
      if (savedDraft.remarks) setRemarks(savedDraft.remarks);
      setDraftLoaded(true);
    }
  }, [poIdParam]);

  // Handle PO selection: auto-populate supplier and line items
  const handlePoChange = useCallback(
    (selectedPoId) => {
      setReceiptInfo((prev) => {
        const po = purchaseOrders.find((p) => p.id === selectedPoId);
        return {
          ...prev,
          poId: selectedPoId,
          supplierId: po?.supplierId || prev.supplierId,
        };
      });

      if (!selectedPoId) return;

      const targetPo = purchaseOrders.find((p) => p.id === selectedPoId);
      if (targetPo && targetPo.items?.length > 0) {
        const newLines = targetPo.items.map((it, idx) => {
          const mat = materials.find((m) => m.id === it.materialId) || materials[0];
          const prevReceived = Number(it.receivedQty || 0);
          const ordered = Number(it.orderedQty || 0);
          const remaining = Math.max(0, ordered - prevReceived);

          return {
            id: `line-${Date.now()}-${idx + 1}`,
            materialId: it.materialId,
            batchNumber: `HEAT-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${String.fromCharCode(65 + idx)}`,
            warehouse: WAREHOUSE_OPTIONS[0],
            location: mat?.location || RACK_OPTIONS[0],
            orderedQty: ordered,
            previouslyReceivedQty: prevReceived,
            receivedQty: remaining > 0 ? String(remaining) : '',
            damagedQty: 0,
            requireQc: true,
          };
        });
        setItems(newLines);
        addToast({
          title: 'Purchase Order Linked',
          message: `Auto-populated ${newLines.length} material line(s) from ${targetPo.poNumber}.`,
          type: 'info',
        });
      }
    },
    [purchaseOrders, materials, addToast]
  );

  // Automatically trigger PO population if arriving via `?poId=...`
  useEffect(() => {
    if (poIdParam) {
      handlePoChange(poIdParam);
    }
  }, [poIdParam, handlePoChange]);

  // Stock Summary calculations across the whole warehouse
  const totalPhysicalStock = useMemo(
    () => computedMaterials.reduce((sum, m) => sum + (m.totalPhysicalStock || 0), 0),
    [computedMaterials]
  );

  const totalPendingQc = useMemo(
    () => computedMaterials.reduce((sum, m) => sum + (m.pendingInspectionQty || 0), 0),
    [computedMaterials]
  );

  const totalApprovedStock = useMemo(
    () => computedMaterials.reduce((sum, m) => sum + (m.usableStock || 0), 0),
    [computedMaterials]
  );

  const totalReservedStock = useMemo(
    () => computedMaterials.reduce((sum, m) => sum + (m.reservedQty || 0), 0),
    [computedMaterials]
  );

  const totalAvailableStock = useMemo(
    () => computedMaterials.reduce((sum, m) => sum + (m.availableQty || 0), 0),
    [computedMaterials]
  );

  // Add a new blank material line
  const handleAddLine = () => {
    const firstMat = materials[0];
    const newIdx = items.length + 1;
    setItems((prev) => [
      ...prev,
      {
        id: `line-${Date.now()}-${newIdx}`,
        materialId: firstMat?.id || '',
        batchNumber: `HEAT-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${String.fromCharCode(64 + newIdx)}`,
        warehouse: WAREHOUSE_OPTIONS[0],
        location: firstMat?.location || RACK_OPTIONS[0],
        orderedQty: 0,
        previouslyReceivedQty: 0,
        receivedQty: '',
        damagedQty: 0,
        requireQc: true,
      },
    ]);
  };

  // Remove a material line
  const handleRemoveLine = (lineId) => {
    if (items.length <= 1) {
      addToast({
        title: 'Action Prohibited',
        message: 'A Goods Receipt Note must have at least one material line item.',
        type: 'danger',
      });
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== lineId));
    setLineErrors((prev) => {
      const copy = { ...prev };
      delete copy[lineId];
      return copy;
    });
  };

  // Update a single line field
  const handleUpdateLine = (lineId, field, value) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== lineId) return item;
        const updated = { ...item, [field]: value };

        // When material changes, auto-populate location if material has standard location
        if (field === 'materialId') {
          const mat = materials.find((m) => m.id === value);
          if (mat?.location) {
            updated.location = mat.location;
          }
        }

        return updated;
      })
    );

    // Clear line error for this field
    if (lineErrors[lineId]?.[field]) {
      setLineErrors((prev) => ({
        ...prev,
        [lineId]: { ...prev[lineId], [field]: null },
      }));
    }
  };

  // Validation
  const validateForm = () => {
    const nextErrors = {};
    const nextLineErrors = {};

    if (!receiptInfo.grnNumber?.trim()) {
      nextErrors.grnNumber = 'GRN Number is required.';
    }
    if (!receiptInfo.receiptDate) {
      nextErrors.receiptDate = 'Receipt date is required.';
    }
    if (!receiptInfo.supplierId) {
      nextErrors.supplierId = 'Please select the delivering supplier.';
    }
    if (!receiptInfo.supplierInvoice?.trim() && !receiptInfo.deliveryChallan?.trim()) {
      nextErrors.supplierInvoice = 'Provide at least a Supplier Invoice or Delivery Challan #.';
    }

    if (!items || items.length === 0) {
      nextErrors.items = 'At least one material line item is required.';
    } else {
      items.forEach((item, index) => {
        const itemErr = {};
        if (!item.materialId) {
          itemErr.materialId = 'Material selection is required.';
        }
        if (!item.batchNumber?.trim()) {
          itemErr.batchNumber = 'Heat/Batch number is required for traceability.';
        }
        if (!item.warehouse) {
          itemErr.warehouse = 'Warehouse selection is required.';
        }
        if (!item.location?.trim()) {
          itemErr.location = 'Rack/Bin location is required.';
        }

        const received = Number(item.receivedQty);
        const damaged = Number(item.damagedQty || 0);

        if (Number.isNaN(received) || received <= 0) {
          itemErr.receivedQty = 'Received quantity must be greater than zero.';
        }
        if (Number.isNaN(damaged) || damaged < 0) {
          itemErr.damagedQty = 'Damaged quantity cannot be negative.';
        } else if (damaged > received) {
          itemErr.damagedQty = 'Damaged quantity cannot exceed received quantity.';
        }

        if (Object.keys(itemErr).length > 0) {
          nextLineErrors[item.id] = itemErr;
        }
      });
    }

    setErrors(nextErrors);
    setLineErrors(nextLineErrors);

    const hasErrors =
      Object.keys(nextErrors).length > 0 || Object.keys(nextLineErrors).length > 0;

    if (hasErrors) {
      addToast({
        title: 'Validation Incomplete',
        message: 'Please resolve the highlighted issues before submitting the GRN.',
        type: 'danger',
      });
    }

    return !hasErrors;
  };

  // Save as Draft
  const handleSaveDraft = () => {
    storageService.savePreference(DRAFT_STORAGE_KEY, {
      receiptInfo,
      items,
      remarks,
      savedAt: new Date().toISOString(),
    });
    setDraftLoaded(true);
    addToast({
      title: 'Draft Saved Locally',
      message: `GRN draft preserved in browser storage (${items.length} line item(s)).`,
      type: 'info',
    });
  };

  // Reset Form
  const handleConfirmReset = () => {
    storageService.savePreference(DRAFT_STORAGE_KEY, null);
    setDraftLoaded(false);
    const firstMat = materials[0];
    setReceiptInfo({
      grnNumber: `GRN-2026-${String(890 + Math.floor(Math.random() * 30)).padStart(4, '0')}`,
      receiptDate: todayDateStr,
      poId: '',
      supplierId: '',
      supplierInvoice: '',
      deliveryChallan: '',
      receivedBy: `${currentUser?.name || 'Ramesh Pawar'} (${currentUser?.role || 'Store'})`,
      vehicleNumber: '',
    });
    setItems([
      {
        id: `line-${Date.now()}-1`,
        materialId: firstMat?.id || '',
        batchNumber: `HEAT-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-A`,
        warehouse: WAREHOUSE_OPTIONS[0],
        location: firstMat?.location || RACK_OPTIONS[0],
        orderedQty: 0,
        previouslyReceivedQty: 0,
        receivedQty: '',
        damagedQty: 0,
        requireQc: true,
      },
    ]);
    setRemarks('');
    setErrors({});
    setLineErrors({});
    addToast({
      title: 'Form Reset',
      message: 'All unsaved entries and draft cache cleared.',
      type: 'info',
    });
  };

  // Pre-Submit: trigger validation & open dialog
  const handlePreSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      setConfirmSubmitOpen(true);
    }
  };

  // Final Submit
  const handleFinalSubmit = () => {
    const linkedPo = purchaseOrders.find((p) => p.id === receiptInfo.poId);
    const selectedSupplier = suppliers.find((s) => s.id === receiptInfo.supplierId);

    const payload = {
      grnNumber: receiptInfo.grnNumber.trim(),
      receiptDate: receiptInfo.receiptDate,
      poId: receiptInfo.poId || undefined,
      poNumber: linkedPo?.poNumber || receiptInfo.poId || undefined,
      supplierId: receiptInfo.supplierId,
      supplierName: selectedSupplier?.name || 'Unknown Vendor',
      supplierInvoice: receiptInfo.supplierInvoice.trim(),
      deliveryChallan: receiptInfo.deliveryChallan.trim(),
      vehicleNumber: receiptInfo.vehicleNumber.trim(),
      receivedBy: receiptInfo.receivedBy.trim(),
      remarks: remarks.trim(),
      items: items.map((line) => {
        const mat = materials.find((m) => m.id === line.materialId);
        const rec = Number(line.receivedQty);
        const dam = Number(line.damagedQty || 0);
        const net = Math.max(0, rec - dam);

        return {
          materialId: line.materialId,
          materialCode: mat?.code || '',
          materialName: mat?.name || '',
          materialGrade: mat?.grade || mat?.category || '',
          uom: mat?.uom || 'Kg',
          batchNumber: line.batchNumber.trim(),
          warehouse: line.warehouse,
          location: line.location.trim(),
          orderedQty: Number(line.orderedQty || 0),
          previouslyReceivedQty: Number(line.previouslyReceivedQty || 0),
          receivedQty: rec,
          damagedQty: dam,
          netReceivedQty: net,
          requireQc: line.requireQc,
        };
      }),
    };

    const success = recordGrnReceipt(payload);

    if (success) {
      storageService.savePreference(DRAFT_STORAGE_KEY, null);
      navigate('/stock-inward');
    }
  };

  // Summary counts for the modal
  const submissionSummary = useMemo(() => {
    const totalLines = items.length;
    const totalNetQty = items.reduce((sum, line) => {
      const rec = Number(line.receivedQty || 0);
      const dam = Number(line.damagedQty || 0);
      return sum + Math.max(0, rec - dam);
    }, 0);
    const qcLinesCount = items.filter((line) => line.requireQc).length;
    const sup = suppliers.find((s) => s.id === receiptInfo.supplierId);

    return { totalLines, totalNetQty, qcLinesCount, supplierName: sup?.name };
  }, [items, suppliers, receiptInfo.supplierId]);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Stock Inward — New GRN Entry"
        badge={
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
            <ArrowDownToLine className="w-3.5 h-3.5" />
            Goods Receipt Note
          </span>
        }
        description="Record incoming vendor deliveries, verify purchase order quantities, assign warehouse racks, and route lots to Quality Inspection Quarantine."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SecondaryButton
              size="sm"
              icon={ArrowLeft}
              onClick={() => setConfirmCancelOpen(true)}
            >
              Back to Inward Listing
            </SecondaryButton>
            <SecondaryButton
              size="sm"
              icon={RotateCcw}
              onClick={() => setConfirmResetOpen(true)}
            >
              Reset Form
            </SecondaryButton>
            <SecondaryButton
              size="sm"
              icon={Save}
              onClick={handleSaveDraft}
            >
              Save as Draft
            </SecondaryButton>
            <PrimaryButton
              size="sm"
              icon={ArrowDownToLine}
              onClick={handlePreSubmit}
            >
              Submit Inward
            </PrimaryButton>
          </div>
        }
      />

      {/* Draft Notification Banner */}
      {draftLoaded && (
        <div className="p-3.5 rounded-lg border border-blue-200 dark:border-blue-800/60 bg-blue-50/70 dark:bg-blue-950/30 flex items-center justify-between text-xs text-blue-900 dark:text-blue-200">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>
              Restored active draft from local storage. You can continue editing, clear it, or submit.
            </span>
          </div>
          <button
            type="button"
            onClick={handleConfirmReset}
            className="text-xs font-semibold text-blue-700 dark:text-blue-300 underline hover:no-underline cursor-pointer"
          >
            Clear Draft
          </button>
        </div>
      )}

      {/* 5 Stock Summary Cards (Section 6) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <StatCard
          label="Physical Stock"
          value={`${formatNumber(totalPhysicalStock)} Units`}
          sublabel="Total on-hand in warehouse"
          icon={Boxes}
          tone="slate"
        />
        <StatCard
          label="Pending QC"
          value={`${formatNumber(totalPendingQc)} Units`}
          sublabel="Quarantine inspection hold"
          icon={ShieldAlert}
          tone={totalPendingQc > 0 ? 'amber' : 'green'}
          trend="Not usable for PPC"
          trendDirection="neutral"
        />
        <StatCard
          label="Quality Approved"
          value={`${formatNumber(totalApprovedStock)} Units`}
          sublabel="Passed QC inspection"
          icon={ShieldCheck}
          tone="green"
        />
        <StatCard
          label="Reserved Stock"
          value={`${formatNumber(totalReservedStock)} Units`}
          sublabel="Committed to shop floor"
          icon={Lock}
          tone="blue"
        />
        <StatCard
          label="Available Stock"
          value={`${formatNumber(totalAvailableStock)} Units`}
          sublabel="Approved minus reserved"
          icon={CheckCircle2}
          tone="green"
          trend="Usable for production"
          trendDirection="up"
        />
      </div>

      <form onSubmit={handlePreSubmit} className="space-y-6">
        {/* SECTION 1: Receipt Information */}
        <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E7E9F0] dark:border-slate-800">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#081F62] dark:text-blue-400" />
              <h2 className="text-sm font-semibold text-[#051747] dark:text-slate-100">
                1. Receipt &amp; Consignment Information
              </h2>
            </div>
            <span className="text-[11px] text-[#535F80] dark:text-slate-400 font-mono">
              Auto-Generated GRN
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <FormInput
              label="GRN Number"
              name="grnNumber"
              required
              readOnly
              value={receiptInfo.grnNumber}
              className="bg-slate-50 dark:bg-slate-800/60 font-mono font-semibold"
              error={errors.grnNumber}
            />

            <FormInput
              label="Receipt Date"
              name="receiptDate"
              type="date"
              required
              value={receiptInfo.receiptDate}
              onChange={(e) => setReceiptInfo({ ...receiptInfo, receiptDate: e.target.value })}
              error={errors.receiptDate}
            />

            <FormSelect
              label="Purchase Order Reference"
              name="poId"
              value={receiptInfo.poId}
              onChange={(e) => handlePoChange(e.target.value)}
              options={[
                { value: '', label: 'Direct / Ad-hoc Inward (Without PO)' },
                ...purchaseOrders.map((p) => {
                  const sup = suppliers.find((s) => s.id === p.supplierId);
                  return {
                    value: p.id,
                    label: `${p.poNumber} — ${sup?.name || p.supplierId} (${p.status})`,
                  };
                }),
              ]}
            />

            <FormSelect
              label="Supplier"
              name="supplierId"
              required
              value={receiptInfo.supplierId}
              onChange={(e) => setReceiptInfo({ ...receiptInfo, supplierId: e.target.value })}
              options={[
                { value: '', label: 'Select Vendor...' },
                ...suppliers.map((s) => ({
                  value: s.id,
                  label: `${s.code} — ${s.name}`,
                })),
              ]}
              error={errors.supplierId}
            />

            <FormInput
              label="Supplier Invoice Number"
              name="supplierInvoice"
              placeholder="e.g. INV-2026-9041"
              value={receiptInfo.supplierInvoice}
              onChange={(e) => setReceiptInfo({ ...receiptInfo, supplierInvoice: e.target.value })}
              error={errors.supplierInvoice}
            />

            <FormInput
              label="Delivery Challan Number"
              name="deliveryChallan"
              placeholder="e.g. DC-Pune-8812"
              value={receiptInfo.deliveryChallan}
              onChange={(e) => setReceiptInfo({ ...receiptInfo, deliveryChallan: e.target.value })}
            />

            <FormInput
              label="Received By"
              name="receivedBy"
              required
              value={receiptInfo.receivedBy}
              onChange={(e) => setReceiptInfo({ ...receiptInfo, receivedBy: e.target.value })}
            />

            <FormInput
              label="Vehicle Number (Optional)"
              name="vehicleNumber"
              placeholder="e.g. MH-12-RN-8834"
              value={receiptInfo.vehicleNumber}
              onChange={(e) => setReceiptInfo({ ...receiptInfo, vehicleNumber: e.target.value })}
            />
          </div>
        </div>

        {/* SECTION 2 & 3 & 4 & 5: Material Line Items */}
        <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-5 shadow-2xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#E7E9F0] dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Boxes className="w-4 h-4 text-[#081F62] dark:text-blue-400" />
              <h2 className="text-sm font-semibold text-[#051747] dark:text-slate-100">
                2. Material Receipt Line Items ({items.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={handleAddLine}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#081F62] hover:bg-[#051747] text-[#FEFEFE] cursor-pointer transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Material Line
            </button>
          </div>

          {errors.items && (
            <p className="text-xs font-semibold text-red-600 dark:text-red-400">
              {errors.items}
            </p>
          )}

          {/* Line Item Cards */}
          <div className="space-y-4">
            {items.map((line, index) => {
              const currentMat = materials.find((m) => m.id === line.materialId);
              const remainingPoQty = Math.max(
                0,
                Number(line.orderedQty || 0) - Number(line.previouslyReceivedQty || 0)
              );
              const receivedNum = Number(line.receivedQty || 0);
              const damagedNum = Number(line.damagedQty || 0);
              const netReceivedQty = Math.max(0, receivedNum - damagedNum);
              const isOverDelivery = line.orderedQty > 0 && receivedNum > remainingPoQty;
              const lineError = lineErrors[line.id] || {};

              return (
                <div
                  key={line.id}
                  className="rounded-lg border border-[#535F80]/20 dark:border-slate-800 bg-[#E7E9F0]/25 dark:bg-slate-800/30 p-4 space-y-4 transition-all"
                >
                  {/* Line Item Header */}
                  <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-[#535F80]/15 dark:border-slate-700">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-6 h-6 rounded-full bg-[#081F62] text-[#FEFEFE] flex items-center justify-center text-xs font-bold shrink-0">
                        {index + 1}
                      </span>
                      <span className="text-xs font-bold text-[#051747] dark:text-slate-100">
                        {currentMat ? `${currentMat.code} — ${currentMat.name}` : 'Select Raw Material'}
                      </span>
                      {currentMat?.grade && (
                        <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-slate-200/70 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-mono">
                          Grade: {currentMat.grade}
                        </span>
                      )}
                      <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-blue-50 dark:bg-blue-950/40 text-[#081F62] dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                        UoM: {currentMat?.uom || 'Kg'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Tooltip content="Remove Material Line">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(line.id)}
                          className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer transition-colors"
                          aria-label="Remove line item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </Tooltip>
                    </div>
                  </div>

                  {/* Material & Batch Selection Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <FormSelect
                      label="Raw Material Grade / Item"
                      name={`mat-${line.id}`}
                      required
                      value={line.materialId}
                      onChange={(e) => handleUpdateLine(line.id, 'materialId', e.target.value)}
                      options={materials
                        .filter((m) => m.status !== 'Inactive' || m.id === line.materialId)
                        .map((m) => ({
                          value: m.id,
                          label: `${m.code} — ${m.name} (${m.uom})`,
                        }))}
                      error={lineError.materialId}
                    />

                    <FormInput
                      label="Heat / Batch Number"
                      name={`batch-${line.id}`}
                      required
                      placeholder="e.g. HEAT-2611-08A"
                      value={line.batchNumber}
                      onChange={(e) => handleUpdateLine(line.id, 'batchNumber', e.target.value)}
                      error={lineError.batchNumber}
                    />

                    <FormSelect
                      label="Storage Warehouse / Store"
                      name={`warehouse-${line.id}`}
                      required
                      value={line.warehouse}
                      onChange={(e) => handleUpdateLine(line.id, 'warehouse', e.target.value)}
                      options={WAREHOUSE_OPTIONS}
                      error={lineError.warehouse}
                    />

                    <FormInput
                      label="Rack / Bin Location"
                      name={`location-${line.id}`}
                      required
                      placeholder="e.g. Rack A-02 / Bin 4"
                      value={line.location}
                      onChange={(e) => handleUpdateLine(line.id, 'location', e.target.value)}
                      error={lineError.location}
                    />
                  </div>

                  {/* Quantity Calculations Panel */}
                  <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-3.5 space-y-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#535F80] dark:text-slate-400 flex items-center justify-between">
                      <span>3. Quantity Ledger &amp; Inspection Calculations</span>
                      {line.orderedQty > 0 && (
                        <span className="font-mono text-slate-700 dark:text-slate-300 normal-case">
                          PO Balance: {formatNumber(remainingPoQty)} {currentMat?.uom} remaining
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                      {/* PO Ordered */}
                      <div className="p-2.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                        <span className="text-[11px] text-[#535F80] dark:text-slate-400 block font-medium">
                          PO Ordered
                        </span>
                        <span className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-200 mt-0.5 block">
                          {line.orderedQty > 0 ? `${formatNumber(line.orderedQty)} ${currentMat?.uom}` : '—'}
                        </span>
                      </div>

                      {/* Previously Received */}
                      <div className="p-2.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                        <span className="text-[11px] text-[#535F80] dark:text-slate-400 block font-medium">
                          Prev. Received
                        </span>
                        <span className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-200 mt-0.5 block">
                          {line.previouslyReceivedQty > 0 ? `${formatNumber(line.previouslyReceivedQty)} ${currentMat?.uom}` : '0'}
                        </span>
                      </div>

                      {/* Remaining PO Qty */}
                      <div className="p-2.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                        <span className="text-[11px] text-[#535F80] dark:text-slate-400 block font-medium">
                          Remaining PO
                        </span>
                        <span className="text-sm font-semibold tabular-nums text-[#081F62] dark:text-blue-400 mt-0.5 block">
                          {line.orderedQty > 0 ? `${formatNumber(remainingPoQty)} ${currentMat?.uom}` : 'Direct'}
                        </span>
                      </div>

                      {/* Received Qty Input */}
                      <div>
                        <label className="text-[11px] font-semibold text-[#051747] dark:text-slate-200 block mb-1">
                          Received Qty <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          required
                          placeholder="e.g. 500"
                          value={line.receivedQty}
                          onChange={(e) => handleUpdateLine(line.id, 'receivedQty', e.target.value)}
                          className={`w-full px-2.5 py-1.5 text-xs rounded-md border font-semibold tabular-nums ${
                            lineError.receivedQty
                              ? 'border-red-500 bg-red-50 dark:bg-red-950/30'
                              : 'border-[#535F80]/30 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-[#081F62]'
                          }`}
                        />
                        {lineError.receivedQty && (
                          <span className="text-[10px] text-red-600 block mt-0.5">
                            {lineError.receivedQty}
                          </span>
                        )}
                      </div>

                      {/* Damaged Qty Input */}
                      <div>
                        <label className="text-[11px] font-semibold text-[#051747] dark:text-slate-200 block mb-1">
                          Damaged Qty
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0"
                          value={line.damagedQty}
                          onChange={(e) => handleUpdateLine(line.id, 'damagedQty', e.target.value)}
                          className={`w-full px-2.5 py-1.5 text-xs rounded-md border tabular-nums ${
                            lineError.damagedQty
                              ? 'border-red-500 bg-red-50 dark:bg-red-950/30'
                              : 'border-[#535F80]/30 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-[#081F62]'
                          }`}
                        />
                        {lineError.damagedQty && (
                          <span className="text-[10px] text-red-600 block mt-0.5">
                            {lineError.damagedQty}
                          </span>
                        )}
                      </div>

                      {/* Net Received Qty (Calculation: Received - Damaged) */}
                      <div className="p-2.5 rounded border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/30">
                        <span className="text-[11px] text-emerald-800 dark:text-emerald-300 block font-semibold">
                          Net Usable/Hold
                        </span>
                        <span className="text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-300 mt-0.5 block">
                          +{formatNumber(netReceivedQty)} {currentMat?.uom}
                        </span>
                      </div>
                    </div>

                    {/* Quantity Validation Alerts */}
                    {isOverDelivery && (
                      <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                        <span>
                          Notice: Received quantity ({receivedNum} {currentMat?.uom}) exceeds remaining PO balance ({remainingPoQty} {currentMat?.uom}) by {formatNumber(receivedNum - remainingPoQty)} {currentMat?.uom}.
                        </span>
                      </div>
                    )}

                    {damagedNum > 0 && (
                      <div className="p-2 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-xs text-red-800 dark:text-red-200 flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-600" />
                        <span>
                          Damaged Notice: {damagedNum} {currentMat?.uom} marked as damaged. This quantity will be isolated for scrap disposition and excluded from usable inventory.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Quality Inspection & Quarantine Hold Controls */}
                  <div className="p-3.5 rounded-lg border border-[#535F80]/20 dark:border-slate-800 bg-[#FEFEFE] dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={line.requireQc}
                        onChange={(e) => handleUpdateLine(line.id, 'requireQc', e.target.checked)}
                        className="mt-0.5 rounded border-[#535F80]/40 text-[#081F62] focus:ring-[#081F62] accent-[#081F62]"
                      />
                      <div>
                        <div className="font-semibold text-[#051747] dark:text-slate-100 flex items-center gap-1.5">
                          Route Lot to Quality Inspection Queue (Quarantine Hold)
                        </div>
                        <div className="text-[11px] text-[#535F80] dark:text-slate-400 mt-0.5">
                          Standard Rule: Stock will be placed in quarantine hold and will NOT be usable for production until inspected and approved by QA.
                        </div>
                      </div>
                    </label>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-medium text-[#535F80] dark:text-slate-400">
                        QC Status:
                      </span>
                      <StatusBadge
                        status={line.requireQc ? 'Pending Inspection' : 'Approved'}
                        size="xs"
                      />
                      {line.requireQc && (
                        <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded">
                          Quarantine Hold
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 7: Inward Remarks & Observations */}
        <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-5 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-[#E7E9F0] dark:border-slate-800">
            <FileText className="w-4 h-4 text-[#081F62] dark:text-blue-400" />
            <h2 className="text-sm font-semibold text-[#051747] dark:text-slate-100">
              3. Delivery Observations &amp; Inward Remarks
            </h2>
          </div>

          <FormTextarea
            label="Inward Remarks"
            name="remarks"
            rows={3}
            placeholder="Document vehicle condition, weighbridge slip number, mill test certificate details, packaging integrity, or reasons for damaged units..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </div>

        {/* SECTION 8: Form Actions Footer Bar */}
        <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs text-[#535F80] dark:text-slate-400">
            Fields marked with <span className="text-red-500">*</span> are mandatory. Material will be immediately reflected in the warehouse ledger.
          </span>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <SecondaryButton
              type="button"
              onClick={() => setConfirmCancelOpen(true)}
            >
              Cancel
            </SecondaryButton>
            <SecondaryButton
              type="button"
              icon={RotateCcw}
              onClick={() => setConfirmResetOpen(true)}
            >
              Reset
            </SecondaryButton>
            <SecondaryButton
              type="button"
              icon={Save}
              onClick={handleSaveDraft}
            >
              Save as Draft
            </SecondaryButton>
            <PrimaryButton
              type="submit"
              icon={ArrowDownToLine}
            >
              Submit Inward (GRN)
            </PrimaryButton>
          </div>
        </div>
      </form>

      {/* Confirmation Dialog: Submit Inward */}
      <ConfirmationDialog
        isOpen={confirmSubmitOpen}
        onClose={() => setConfirmSubmitOpen(false)}
        onConfirm={handleFinalSubmit}
        title="Confirm Stock Inward Submission"
        confirmLabel="Confirm & Record GRN"
        variant="primary"
        message={`Are you sure you want to record Goods Receipt Note ${receiptInfo.grnNumber}? This will log ${submissionSummary.totalLines} material line(s) totaling ${formatNumber(submissionSummary.totalNetQty)} units from ${submissionSummary.supplierName || 'selected vendor'} into warehouse inventory and route ${submissionSummary.qcLinesCount} item(s) to Quality Quarantine.`}
      />

      {/* Confirmation Dialog: Reset Form */}
      <ConfirmationDialog
        isOpen={confirmResetOpen}
        onClose={() => setConfirmResetOpen(false)}
        onConfirm={handleConfirmReset}
        title="Reset GRN Form"
        confirmLabel="Clear All Fields"
        variant="danger"
        message="Are you sure you want to reset this Goods Receipt Note? All entered quantities, line items, and local drafts will be cleared."
      />

      {/* Confirmation Dialog: Cancel Form */}
      <ConfirmationDialog
        isOpen={confirmCancelOpen}
        onClose={() => setConfirmCancelOpen(false)}
        onConfirm={() => navigate('/stock-inward')}
        title="Discard Changes"
        confirmLabel="Leave Page"
        variant="danger"
        message="Are you sure you want to leave this page? Any unsaved material entries will be lost unless saved as draft."
      />
    </div>
  );
}
