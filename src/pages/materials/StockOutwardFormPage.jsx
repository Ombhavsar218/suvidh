import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpFromLine,
  Boxes,
  FileText,
  Layers,
  Lock,
  Unlock,
  Save,
  RotateCcw,
  AlertTriangle,
  Info,
  Warehouse,
  Calendar,
  Building2,
  Package,
  MapPin,
  Check,
  CheckCircle2,
  Factory,
  Cpu,
  Clock,
  User,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { StatCard } from '../../components/dashboard/StatCard';
import { PrimaryButton, SecondaryButton } from '../../components/common/Buttons';
import { FormInput, FormSelect, FormTextarea } from '../../components/forms/FormFields';
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Tooltip } from '../../components/common/Tooltip';
import { useApp } from '../../context/AppContext';
import { useErpData } from '../../context/ErpDataContext';
import { storageService } from '../../services/storageService';
import { getMaterialComputedFields } from '../../services/erpService';
import { formatNumber, formatDate } from '../../utils/formatters';

const DRAFT_STORAGE_KEY = 'suvidh_stock_outward_draft';

const WAREHOUSE_OPTIONS = [
  'Main Raw Material Store (Zone A)',
  'Heavy Bar & Billet Yard (Zone B)',
  'Alloy & Stainless Steel Store (Zone C)',
  'General Consumables & Fasteners Store (Zone D)',
];

const RACK_OPTIONS = [
  'Rack A-01 / Bay 1',
  'Rack A-02 / Bay 2',
  'Rack A-05 / Bay 3',
  'Rack A-08 / Ground Bay',
  'Yard B-04 / Skid 1',
  'Yard B-05 / Skid 2',
  'Rack C-02 / Precision Bay',
  'Rack C-03 / High Strength',
  'Rack C-06 / Non-Ferrous Bay',
  'Bin D-04 / Hardware Drawer',
  'Bin D-12 / Seals Compartment',
  'Chem Bay E-01 / Coolant Staging',
];

const PRODUCTION_EMPLOYEES = [
  { id: 'EMP-01', name: 'Sandeep More', title: 'Production Supervisor / PPC In-Charge' },
  { id: 'EMP-02', name: 'Mahesh Shinde', title: 'CNC Turning Operator (Bay A)' },
  { id: 'EMP-03', name: 'Pravin Jadhav', title: 'VMC Machinist (Bay B)' },
  { id: 'EMP-04', name: 'Santosh Gaikwad', title: 'HMC Senior Machinist' },
  { id: 'EMP-05', name: 'Ganesh Bhosale', title: 'Surface Grinding Specialist' },
  { id: 'EMP-06', name: 'Ajay Salunkhe', title: 'CNC Setter & Machinist' },
];

const OPERATION_OPTIONS = [
  'OP-10: Facing & Center Drilling',
  'OP-20: CNC Rough Turning & Profiling',
  'OP-30: VMC Multi-Axis Milling & Bore Profiling',
  'OP-40: Spline Hobbing & Keyway Broaching',
  'OP-50: Precision Cylindrical Grinding',
  'OP-60: Final Deburring & Pre-Assembly',
];

// Seed approved material batches with physical locations and certified heats
const SEED_APPROVED_BATCHES = {
  'MAT-001': [
    {
      batchNumber: 'HEAT-4140-B880',
      warehouse: 'Main Raw Material Store (Zone A)',
      location: 'Rack A-01 / Bay 1',
      approvedQty: 2000,
      qcCert: 'TISCO-EN19-4140-772',
      status: 'Approved',
    },
    {
      batchNumber: 'HEAT-4140-B845',
      warehouse: 'Main Raw Material Store (Zone A)',
      location: 'Rack A-02 / Bay 2',
      approvedQty: 1850,
      qcCert: 'JSW-4140-629-MTC',
      status: 'Approved',
    },
  ],
  'MAT-002': [
    {
      batchNumber: 'HEAT-CI-260-A1',
      warehouse: 'Heavy Bar & Billet Yard (Zone B)',
      location: 'Yard B-04 / Skid 1',
      approvedQty: 380,
      qcCert: 'KIRL-FG260-CAST-084',
      status: 'Approved',
    },
    {
      batchNumber: 'HEAT-CI-260-A2',
      warehouse: 'Heavy Bar & Billet Yard (Zone B)',
      location: 'Yard B-05 / Skid 2',
      approvedQty: 260,
      qcCert: 'KIRL-FG260-CAST-091',
      status: 'Approved',
    },
  ],
  'MAT-003': [
    {
      batchNumber: 'HEAT-AL-6061-X1',
      warehouse: 'Alloy & Stainless Steel Store (Zone C)',
      location: 'Rack C-02 / Precision Bay',
      approvedQty: 350,
      qcCert: 'HINDALCO-6061-T6-993',
      status: 'Approved',
    },
    {
      batchNumber: 'HEAT-AL-6061-X2',
      warehouse: 'Alloy & Stainless Steel Store (Zone C)',
      location: 'Rack C-03 / High Strength',
      approvedQty: 230,
      qcCert: 'HINDALCO-6061-T6-998',
      status: 'Approved',
    },
  ],
  'MAT-004': [
    {
      batchNumber: 'HEAT-SS316-902',
      warehouse: 'Main Raw Material Store (Zone A)',
      location: 'Rack A-05 / Bay 3',
      approvedQty: 800,
      qcCert: 'VIRAJ-316L-ROD-882',
      status: 'Approved',
    },
    {
      batchNumber: 'HEAT-SS316-875',
      warehouse: 'Main Raw Material Store (Zone A)',
      location: 'Rack A-05 / Bay 3',
      approvedQty: 680,
      qcCert: 'VIRAJ-316L-ROD-850',
      status: 'Approved',
    },
  ],
  'MAT-005': [
    {
      batchNumber: 'HEAT-PB2-301',
      warehouse: 'Alloy & Stainless Steel Store (Zone C)',
      location: 'Rack C-06 / Non-Ferrous Bay',
      approvedQty: 240,
      qcCert: 'MET-BRZ-PB2-221',
      status: 'Approved',
    },
  ],
  'MAT-006': [
    {
      batchNumber: 'LOT-VTN-2026-09',
      warehouse: 'General Consumables & Fasteners Store (Zone D)',
      location: 'Bin D-12 / Seals Compartment',
      approvedQty: 250,
      qcCert: 'FKM-75-DURO-QC-112',
      status: 'Approved',
    },
    {
      batchNumber: 'LOT-VTN-2026-10',
      warehouse: 'General Consumables & Fasteners Store (Zone D)',
      location: 'Bin D-12 / Seals Compartment',
      approvedQty: 180,
      qcCert: 'FKM-75-DURO-QC-118',
      status: 'Approved',
    },
  ],
  'MAT-007': [
    {
      batchNumber: 'HEAT-CR-32-114',
      warehouse: 'Main Raw Material Store (Zone A)',
      location: 'Rack A-08 / Ground Bay',
      approvedQty: 480,
      qcCert: 'CK45-CHROME-ISO-901',
      status: 'Approved',
    },
  ],
  'MAT-008': [
    {
      batchNumber: 'LOT-CLT-SYN-04',
      warehouse: 'Main Raw Material Store (Zone A)',
      location: 'Chem Bay E-01 / Coolant Staging',
      approvedQty: 820,
      qcCert: 'SYN-COOL-BATCH-44',
      status: 'Approved',
    },
  ],
  'MAT-009': [
    {
      batchNumber: 'LOT-BLT-M12-88',
      warehouse: 'General Consumables & Fasteners Store (Zone D)',
      location: 'Bin D-04 / Hardware Drawer',
      approvedQty: 2400,
      qcCert: 'DIN-912-12.9-TEST-77',
      status: 'Approved',
    },
    {
      batchNumber: 'LOT-BLT-M12-92',
      warehouse: 'General Consumables & Fasteners Store (Zone D)',
      location: 'Bin D-04 / Hardware Drawer',
      approvedQty: 1800,
      qcCert: 'DIN-912-12.9-TEST-81',
      status: 'Approved',
    },
  ],
};

export function StockOutwardFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planIdParam = searchParams.get('planId');

  const { currentUser, addToast } = useApp();
  const {
    materials = [],
    materialTransactions = [],
    productionPlans = [],
    machines = [],
    products = [],
    boms = [],
    qualityInspections = [],
    recordStockOutward,
  } = useErpData();

  const computedMaterials = useMemo(
    () => materials.map(getMaterialComputedFields),
    [materials]
  );

  // Active production plans needing material issuance
  const activePlans = useMemo(
    () => productionPlans.filter((p) => p.status !== 'Completed'),
    [productionPlans]
  );

  // Auto-generate next MIN Issue sequence
  const generatedIssueNumber = useMemo(() => {
    const existingDraft = storageService.loadPreference(DRAFT_STORAGE_KEY, null);
    if (existingDraft?.issueInfo?.issueNumber) {
      return existingDraft.issueInfo.issueNumber;
    }
    const seed = 2845 + Math.floor(Math.random() * 50);
    return `ISSUE-${seed}`;
  }, []);

  const currentDateTimeStr = useMemo(() => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }, []);

  // Form State: 1. Issue Information
  const [issueInfo, setIssueInfo] = useState({
    issueNumber: generatedIssueNumber,
    issueDateTime: currentDateTimeStr,
    issuedBy: `${currentUser?.name || 'Ramesh Pawar'} (${currentUser?.role || 'Store'})`,
    receivedBy: `${PRODUCTION_EMPLOYEES[0].name} (${PRODUCTION_EMPLOYEES[0].title})`,
    warehouse: WAREHOUSE_OPTIONS[0],
  });

  // Form State: 2. Production Reference
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
    department: 'Shop Floor Bay A — VMC Milling Division',
    operation: OPERATION_OPTIONS[1],
  });

  // Form State: 3. Material Information
  const [materialInfo, setMaterialInfo] = useState({
    materialId: materials[0]?.id || '',
    materialCode: materials[0]?.code || '',
    materialName: materials[0]?.name || '',
    materialGrade: materials[0]?.spec || '',
    uom: materials[0]?.uom || 'Kg',
    batchNumber: '',
    storageLocation: materials[0]?.location || RACK_OPTIONS[0],
  });

  // Form State: 4. Quantity Details
  const [quantityInfo, setQuantityInfo] = useState({
    issueQty: '',
  });

  // Form State: 5. Remarks
  const [remarks, setRemarks] = useState('');

  // Dialog State
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [successModalData, setSuccessModalData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Restore draft on mount if available (unless explicitly following a plan URL param)
  useEffect(() => {
    if (planIdParam) return;
    const savedDraft = storageService.loadPreference(DRAFT_STORAGE_KEY, null);
    if (savedDraft) {
      if (savedDraft.issueInfo) setIssueInfo(savedDraft.issueInfo);
      if (savedDraft.productionRef) setProductionRef(savedDraft.productionRef);
      if (savedDraft.materialInfo) setMaterialInfo(savedDraft.materialInfo);
      if (savedDraft.quantityInfo) setQuantityInfo(savedDraft.quantityInfo);
      if (savedDraft.remarks) setRemarks(savedDraft.remarks);
      setDraftLoaded(true);
    }
  }, [planIdParam]);

  // Derived selected plan object
  const currentPlan = useMemo(() => {
    return productionPlans.find((p) => p.id === productionRef.planId) || null;
  }, [productionPlans, productionRef.planId]);

  // Derived selected product
  const currentProduct = useMemo(() => {
    if (!currentPlan) return null;
    return products.find((p) => p.id === currentPlan.productId) || null;
  }, [products, currentPlan]);

  // Derived assigned machine
  const currentMachine = useMemo(() => {
    if (!productionRef.machineId) return null;
    return machines.find((m) => m.id === productionRef.machineId) || null;
  }, [machines, productionRef.machineId]);

  // Selected material computed details
  const selectedMaterial = useMemo(() => {
    return computedMaterials.find((m) => m.id === materialInfo.materialId) || null;
  }, [computedMaterials, materialInfo.materialId]);

  // BOM items for the selected product
  const planBom = useMemo(() => {
    if (!currentPlan) return null;
    return boms.find((b) => b.productId === currentPlan.productId) || null;
  }, [boms, currentPlan]);

  // Handle plan change: auto-populate product, machine, department, and default remarks
  const handlePlanChange = useCallback(
    (selectedPlanId) => {
      const plan = productionPlans.find((p) => p.id === selectedPlanId);
      if (!plan) return;

      const prod = products.find((p) => p.id === plan.productId);
      const mach = machines.find((m) => m.id === plan.assignedMachineId);
      const woNum = `WO-${plan.id.replace('PLAN-', '')}`;

      const dept = mach?.bay
        ? `${mach.bay} — ${mach.category || 'Machining Division'}`
        : 'Shop Floor Bay A — CNC Machining';

      setProductionRef({
        planId: plan.id,
        workOrderNumber: woNum,
        productId: prod?.id || plan.productId,
        productName: prod?.name || plan.productId,
        machineId: mach?.id || plan.assignedMachineId || '',
        machineName: mach?.name || 'Assigned Machine',
        department: dept,
        operation: OPERATION_OPTIONS[1],
      });

      // Suggest BOM material for this product if available
      const bom = boms.find((b) => b.productId === plan.productId);
      if (bom && bom.items && bom.items.length > 0) {
        const firstBomItem = bom.items[0];
        const mat = materials.find((m) => m.id === firstBomItem.materialId);
        if (mat) {
          const defaultBatches = SEED_APPROVED_BATCHES[mat.id] || [];
          const firstBatch = defaultBatches[0];
          setMaterialInfo({
            materialId: mat.id,
            materialCode: mat.code,
            materialName: mat.name,
            materialGrade: mat.spec,
            uom: mat.uom,
            batchNumber: firstBatch?.batchNumber || `HEAT-${mat.code.slice(-4)}-01`,
            storageLocation: firstBatch?.location || mat.location || RACK_OPTIONS[0],
          });
          if (firstBatch?.warehouse) {
            setIssueInfo((prev) => ({ ...prev, warehouse: firstBatch.warehouse }));
          }
        }
      }

      setRemarks(
        `Issued to Machine ${mach?.code || mach?.name || 'CNC'} for ${prod?.name || plan.productId} production run (${woNum}).`
      );
    },
    [productionPlans, products, machines, boms, materials]
  );

  // Initialize production reference fields on initialPlan change if not set
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

      const defaultBatches = SEED_APPROVED_BATCHES[mat.id] || [];
      const firstBatch = defaultBatches[0];

      setMaterialInfo({
        materialId: mat.id,
        materialCode: mat.code,
        materialName: mat.name,
        materialGrade: mat.spec,
        uom: mat.uom,
        batchNumber: firstBatch?.batchNumber || `HEAT-${mat.code.slice(-4)}-01`,
        storageLocation: firstBatch?.location || mat.location || RACK_OPTIONS[0],
      });

      if (firstBatch?.warehouse) {
        setIssueInfo((prev) => ({ ...prev, warehouse: firstBatch.warehouse }));
      }
    },
    [materials]
  );

  // Eligible Quality-Approved Batches for the current material
  // Business Rule: ONLY show quality-approved and eligible stock batches for selection.
  // Filter out pending QC (quarantine hold) and rejected lots.
  const approvedBatches = useMemo(() => {
    if (!materialInfo.materialId) return [];
    const matId = materialInfo.materialId;

    // Batches from seed approved list
    const seedBatches = SEED_APPROVED_BATCHES[matId] || [];

    // Additional approved batches from dynamic qualityInspections in context
    const dynamicQcApproved = qualityInspections
      .filter(
        (qc) =>
          qc.itemType === 'Raw Material' &&
          qc.itemId === matId &&
          (qc.status === 'Approved' || qc.acceptedQty > 0)
      )
      .map((qc) => ({
        batchNumber: qc.batchNumber,
        warehouse: issueInfo.warehouse,
        location: selectedMaterial?.location || RACK_OPTIONS[0],
        approvedQty: qc.acceptedQty || qc.inspectedQty,
        qcCert: qc.reference || `QC-CERT-${qc.id}`,
        status: 'Approved',
      }));

    // Combine and deduplicate by batchNumber
    const map = new Map();
    [...seedBatches, ...dynamicQcApproved].forEach((b) => {
      if (!map.has(b.batchNumber)) map.set(b.batchNumber, b);
    });

    return Array.from(map.values());
  }, [materialInfo.materialId, qualityInspections, issueInfo.warehouse, selectedMaterial]);

  // Count of in-quarantine batches for information banner
  const pendingQcBatchesCount = useMemo(() => {
    if (!materialInfo.materialId) return 0;
    return qualityInspections.filter(
      (qc) =>
        qc.itemType === 'Raw Material' &&
        qc.itemId === materialInfo.materialId &&
        (qc.status === 'Pending' || qc.status === 'In Inspection')
    ).length;
  }, [materialInfo.materialId, qualityInspections]);

  // Handle batch selection
  const handleBatchSelect = (batchNum) => {
    const found = approvedBatches.find((b) => b.batchNumber === batchNum);
    setMaterialInfo((prev) => ({
      ...prev,
      batchNumber: batchNum,
      storageLocation: found?.location || prev.storageLocation,
    }));
    if (found?.warehouse) {
      setIssueInfo((prev) => ({ ...prev, warehouse: found.warehouse }));
    }
  };

  // -------------------------------------------------------------
  // QUANTITY & RESERVATION CALCULATIONS
  // -------------------------------------------------------------
  const quantityCalculations = useMemo(() => {
    if (!selectedMaterial) {
      return {
        requiredQty: 0,
        previouslyIssuedQty: 0,
        remainingRequirement: 0,
        approvedStock: 0,
        totalReserved: 0,
        netAvailableStock: 0,
        woReservedQty: 0,
        otherReservedStock: 0,
        eligibleAvailableStock: 0,
        issueQtyNum: 0,
        balanceStockAfterIssue: 0,
        physicalApprovedRemaining: 0,
        remainingReqAfterIssue: 0,
      };
    }

    // 1. Required Quantity for this Production Plan
    let requiredQty = 0;
    if (currentPlan) {
      const bomItem = planBom?.items.find((it) => it.materialId === selectedMaterial.id);
      if (bomItem) {
        requiredQty = Number(
          (bomItem.qtyPerUnit * (currentPlan.manufacturingRequirement || currentPlan.requiredQty || 1)).toFixed(2)
        );
      } else {
        requiredQty = Number(currentPlan.manufacturingRequirement || 50);
      }
    }

    // 2. Previously Issued Quantity to this Work Order / Plan
    const planIdKey = currentPlan?.id || '';
    const woNumKey = productionRef.workOrderNumber || '';
    const prevOutwardTxns = materialTransactions.filter(
      (t) =>
        t.type === 'Outward' &&
        t.materialId === selectedMaterial.id &&
        ((planIdKey && t.reference?.includes(planIdKey)) ||
          (woNumKey && t.reference?.includes(woNumKey)) ||
          (currentPlan?.scheduleNumber && t.reference?.includes(currentPlan.scheduleNumber)))
    );
    const previouslyIssuedQty = prevOutwardTxns.reduce(
      (sum, t) => sum + Math.abs(Number(t.quantity || 0)),
      0
    );

    // 3. Remaining Requirement = Required Quantity − Previously Issued Quantity
    const remainingRequirement = Math.max(
      0,
      Number((requiredQty - previouslyIssuedQty).toFixed(2))
    );

    // 4. Warehouse Stock Status
    const approvedStock = Number(selectedMaterial.approvedPhysicalQty || 0);
    const totalReserved = Number(selectedMaterial.reservedQty || 0);

    // 5. Reservation for THIS Work Order
    const woReservationTxns = materialTransactions.filter(
      (t) =>
        t.type === 'Reservation' &&
        t.materialId === selectedMaterial.id &&
        ((planIdKey && t.reference?.includes(planIdKey)) ||
          (woNumKey && t.reference?.includes(woNumKey)))
    );
    const rawWoReservation = woReservationTxns.reduce(
      (sum, t) => sum + Math.abs(Number(t.quantity || 0)),
      0
    );
    // Reservation held for this WO minus what has already been consumed
    const woReservedQty = Math.max(
      0,
      Math.min(totalReserved, rawWoReservation - previouslyIssuedQty)
    );

    // 6. Other Work Orders' reservations (cannot be consumed by this WO)
    const otherReservedStock = Math.max(0, totalReserved - woReservedQty);

    // 7. Unreserved / Net Available Stock
    const netAvailableStock = Math.max(0, approvedStock - totalReserved);

    // 8. Eligible Available Stock for THIS Work Order
    // Formula: Net Available Stock + Reservation for THIS Work Order = Approved Stock - Other Reservations
    // Notice: Does NOT double-subtract reservations!
    const eligibleAvailableStock = netAvailableStock + woReservedQty;

    // 9. Balance Stock After Issue
    const issueQtyNum = Number(quantityInfo.issueQty || 0);
    const balanceStockAfterIssue = Math.max(0, eligibleAvailableStock - issueQtyNum);
    const physicalApprovedRemaining = Math.max(0, approvedStock - issueQtyNum);
    const remainingReqAfterIssue = Math.max(0, remainingRequirement - issueQtyNum);

    return {
      requiredQty,
      previouslyIssuedQty,
      remainingRequirement,
      approvedStock,
      totalReserved,
      netAvailableStock,
      woReservedQty,
      otherReservedStock,
      eligibleAvailableStock,
      issueQtyNum,
      balanceStockAfterIssue,
      physicalApprovedRemaining,
      remainingReqAfterIssue,
    };
  }, [
    selectedMaterial,
    currentPlan,
    planBom,
    productionRef.workOrderNumber,
    materialTransactions,
    quantityInfo.issueQty,
  ]);

  // Validations and Warning Flags
  const isOverRequirement =
    quantityCalculations.issueQtyNum > 0 &&
    quantityCalculations.issueQtyNum > quantityCalculations.remainingRequirement;

  const isExceedingEligibleStock =
    quantityCalculations.issueQtyNum > quantityCalculations.eligibleAvailableStock;

  const validationErrors = useMemo(() => {
    const errs = [];
    if (!productionRef.planId) {
      errs.push('Production Plan / Work Order reference is required.');
    }
    if (!materialInfo.materialId) {
      errs.push('Raw Material to issue is required.');
    }
    if (!materialInfo.batchNumber) {
      errs.push('A valid quality-approved batch number is required.');
    }
    if (!issueInfo.warehouse) {
      errs.push('Source warehouse must be specified.');
    }
    if (!issueInfo.receivedBy) {
      errs.push('Receiving production employee must be specified.');
    }
    if (!quantityInfo.issueQty || Number(quantityInfo.issueQty) <= 0) {
      errs.push('Issue quantity must be greater than zero.');
    }
    if (isExceedingEligibleStock) {
      errs.push(
        `Issue quantity (${quantityCalculations.issueQtyNum} ${materialInfo.uom}) exceeds total eligible stock (${quantityCalculations.eligibleAvailableStock} ${materialInfo.uom}).`
      );
    }
    return errs;
  }, [
    productionRef.planId,
    materialInfo.materialId,
    materialInfo.batchNumber,
    materialInfo.uom,
    issueInfo.warehouse,
    issueInfo.receivedBy,
    quantityInfo.issueQty,
    isExceedingEligibleStock,
    quantityCalculations.issueQtyNum,
    quantityCalculations.eligibleAvailableStock,
  ]);

  // Save as Draft
  const handleSaveDraft = () => {
    const draftPayload = {
      issueInfo,
      productionRef,
      materialInfo,
      quantityInfo,
      remarks,
      savedAt: new Date().toISOString(),
    };
    storageService.savePreference(DRAFT_STORAGE_KEY, draftPayload);
    addToast({
      title: 'Draft Saved Locally',
      message: `Stock Outward draft ${issueInfo.issueNumber} saved. You can resume later.`,
      type: 'success',
    });
    setDraftLoaded(true);
  };

  // Clear / Discard Draft
  const handleClearDraft = () => {
    storageService.removePreference(DRAFT_STORAGE_KEY);
    setDraftLoaded(false);
    addToast({
      title: 'Draft Cleared',
      message: 'Local draft has been removed.',
      type: 'info',
    });
  };

  // Reset Form
  const handleConfirmReset = () => {
    storageService.removePreference(DRAFT_STORAGE_KEY);
    setDraftLoaded(false);
    setIssueInfo({
      issueNumber: `ISSUE-${Math.floor(2850 + Math.random() * 50)}`,
      issueDateTime: currentDateTimeStr,
      issuedBy: `${currentUser?.name || 'Ramesh Pawar'} (${currentUser?.role || 'Store'})`,
      receivedBy: `${PRODUCTION_EMPLOYEES[0].name} (${PRODUCTION_EMPLOYEES[0].title})`,
      warehouse: WAREHOUSE_OPTIONS[0],
    });
    if (initialPlan) {
      handlePlanChange(initialPlan.id);
    }
    setQuantityInfo({ issueQty: '' });
    setRemarks('');
    addToast({
      title: 'Form Reset',
      message: 'All fields have been reset to initial baseline values.',
      type: 'info',
    });
  };

  // Submit Issue: Open Confirmation Dialog
  const handleOpenSubmitConfirm = (e) => {
    e.preventDefault();
    if (validationErrors.length > 0) {
      addToast({
        title: 'Validation Failed',
        message: validationErrors[0],
        type: 'danger',
      });
      return;
    }
    setConfirmSubmitOpen(true);
  };

  // Final Issue Posting
  const handleFinalSubmit = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const ok = recordStockOutward({
        issueNumber: issueInfo.issueNumber.trim(),
        issueDateTime: issueInfo.issueDateTime.replace('T', ' '),
        issuedBy: issueInfo.issuedBy,
        receivedBy: issueInfo.receivedBy,
        warehouse: issueInfo.warehouse,
        planId: productionRef.planId,
        planNumber: currentPlan?.id || productionRef.planId,
        workOrderNumber: productionRef.workOrderNumber,
        productId: productionRef.productId,
        productName: productionRef.productName,
        machineId: productionRef.machineId,
        machineName: productionRef.machineName,
        operation: productionRef.operation,
        department: productionRef.department,
        materialId: materialInfo.materialId,
        batchNumber: materialInfo.batchNumber,
        storageLocation: materialInfo.storageLocation,
        quantity: Number(quantityInfo.issueQty),
        woReservedQty: quantityCalculations.woReservedQty,
        remarks: remarks.trim(),
      });

      if (ok) {
        // Clear draft on successful issue
        storageService.removePreference(DRAFT_STORAGE_KEY);
        setDraftLoaded(false);

        // Display Success Modal
        setSuccessModalData({
          issueNumber: issueInfo.issueNumber,
          workOrderNumber: productionRef.workOrderNumber,
          materialName: materialInfo.materialName,
          materialCode: materialInfo.materialCode,
          batchNumber: materialInfo.batchNumber,
          issuedQty: Number(quantityInfo.issueQty),
          uom: materialInfo.uom,
          machineName: productionRef.machineName,
          receivedBy: issueInfo.receivedBy,
          warehouse: issueInfo.warehouse,
          storageLocation: materialInfo.storageLocation,
          timestamp: issueInfo.issueDateTime.replace('T', ' '),
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        title="Issue Raw Material (Stock Outward)"
        badge={
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-md bg-blue-50 dark:bg-blue-950/60 text-[#081F62] dark:text-blue-400 border border-[#081F62]/20 dark:border-blue-800/40">
            <ArrowUpFromLine className="w-3.5 h-3.5" />
            Material Issue Note (MIN)
          </span>
        }
        description="Transfer quality-approved raw materials from warehouse racks to production CNC machines and active manufacturing work orders."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <SecondaryButton
              size="sm"
              icon={ArrowLeft}
              onClick={() => {
                if (quantityInfo.issueQty) {
                  setConfirmCancelOpen(true);
                } else {
                  navigate('/stock-outward');
                }
              }}
            >
              Back to Outward Listing
            </SecondaryButton>
            {draftLoaded && (
              <SecondaryButton
                size="sm"
                icon={RotateCcw}
                onClick={handleClearDraft}
              >
                Discard Draft
              </SecondaryButton>
            )}
            <SecondaryButton
              size="sm"
              icon={Save}
              onClick={handleSaveDraft}
            >
              Save as Draft
            </SecondaryButton>
          </div>
        }
      />

      {/* Draft Notification Banner */}
      {draftLoaded && (
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-[#081F62]/20 dark:border-blue-800/60 flex items-center justify-between text-xs text-[#081F62] dark:text-blue-300">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0 text-[#081F62] dark:text-blue-400" />
            <span>
              <strong>Draft Restored:</strong> An unsaved Stock Outward draft was auto-loaded from local memory.
            </span>
          </div>
          <button
            type="button"
            onClick={handleClearDraft}
            className="text-[11px] font-semibold underline hover:text-[#051747] cursor-pointer"
          >
            Clear Draft
          </button>
        </div>
      )}

      {/* 4 Stock Summary StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Physical Approved Stock"
          value={`${formatNumber(quantityCalculations.approvedStock)} ${materialInfo.uom}`}
          trend="Passed QC Inspection"
          trendDirection="up"
          sublabel="Usable stock on hand"
          icon={ShieldCheck}
          tone="blue"
        />
        <StatCard
          label="Total Reserved Stock"
          value={`${formatNumber(quantityCalculations.totalReserved)} ${materialInfo.uom}`}
          trend="Allocated across shop floor"
          trendDirection="neutral"
          sublabel="Held against work orders"
          icon={Lock}
          tone="amber"
        />
        <StatCard
          label="Reserved for THIS Work Order"
          value={`${formatNumber(quantityCalculations.woReservedQty)} ${materialInfo.uom}`}
          trend={quantityCalculations.woReservedQty > 0 ? 'Exclusively usable by this WO' : 'No specific reservation'}
          trendDirection={quantityCalculations.woReservedQty > 0 ? 'up' : 'neutral'}
          sublabel={`Tagged to ${productionRef.workOrderNumber || 'Plan'}`}
          icon={Unlock}
          tone={quantityCalculations.woReservedQty > 0 ? 'green' : 'slate'}
        />
        <StatCard
          label="Eligible Usable Stock"
          value={`${formatNumber(quantityCalculations.eligibleAvailableStock)} ${materialInfo.uom}`}
          trend="Net Avail + WO Reserved"
          trendDirection="up"
          sublabel="Maximum issuable for this issue"
          icon={Warehouse}
          tone="green"
        />
      </div>

      {/* Main Two-Column Form Layout */}
      <form onSubmit={handleOpenSubmitConfirm}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Form Sections (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Receipt / Issue Information Section */}
            <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-4 sm:p-5 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-[#E7E9F0] dark:border-slate-800">
                <FileText className="w-4 h-4 text-[#081F62] dark:text-blue-400" />
                <h2 className="text-sm font-semibold text-[#051747] dark:text-slate-100">
                  1. Issue Information
                </h2>
                <span className="ml-auto text-xs font-mono font-bold text-[#081F62] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-[#081F62]/20">
                  {issueInfo.issueNumber}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Issue Number (MIN #) <span className="text-slate-400">(Auto-Generated)</span>
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-[#081F62] dark:text-blue-400">
                    <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{issueInfo.issueNumber}</span>
                  </div>
                </div>

                <FormInput
                  label="Issue Date & Time"
                  name="issueDateTime"
                  type="datetime-local"
                  required
                  value={issueInfo.issueDateTime}
                  onChange={(e) =>
                    setIssueInfo({ ...issueInfo, issueDateTime: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Issued By <span className="text-slate-400">(Logged-in Store Issuer)</span>
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300">
                    <User className="w-3.5 h-3.5 text-[#081F62] dark:text-blue-400 shrink-0" />
                    <span>{issueInfo.issuedBy}</span>
                  </div>
                </div>

                <FormSelect
                  label="Received By (Production Employee)"
                  name="receivedBy"
                  required
                  value={issueInfo.receivedBy}
                  onChange={(e) =>
                    setIssueInfo({ ...issueInfo, receivedBy: e.target.value })
                  }
                  options={PRODUCTION_EMPLOYEES.map((emp) => ({
                    value: `${emp.name} (${emp.title})`,
                    label: `${emp.name} — ${emp.title}`,
                  }))}
                />
              </div>

              <FormSelect
                label="Source Warehouse / Store"
                name="warehouse"
                required
                value={issueInfo.warehouse}
                onChange={(e) =>
                  setIssueInfo({ ...issueInfo, warehouse: e.target.value })
                }
                options={WAREHOUSE_OPTIONS.map((w) => ({
                  value: w,
                  label: w,
                }))}
              />
            </div>

            {/* 2. Production Reference Section */}
            <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-4 sm:p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E7E9F0] dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Factory className="w-4 h-4 text-[#081F62] dark:text-blue-400" />
                  <h2 className="text-sm font-semibold text-[#051747] dark:text-slate-100">
                    2. Production Reference (Work Order &amp; Plan)
                  </h2>
                </div>
                {currentPlan && (
                  <StatusBadge status={currentPlan.status} size="xs" />
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormSelect
                  label="Production Plan Reference"
                  name="planId"
                  required
                  value={productionRef.planId}
                  onChange={(e) => handlePlanChange(e.target.value)}
                  options={productionPlans.map((p) => {
                    const prod = products.find((pr) => pr.id === p.productId);
                    return {
                      value: p.id,
                      label: `${p.id} — ${prod?.name || p.productId} (${p.status})`,
                    };
                  })}
                />

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Work Order Number <span className="text-slate-400">(Auto-Linked)</span>
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                    <Layers className="w-3.5 h-3.5 text-[#081F62] dark:text-blue-400 shrink-0" />
                    <span>{productionRef.workOrderNumber || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Read-Only Plan Context Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs">
                <div>
                  <span className="text-[#535F80] dark:text-slate-400 block font-medium">
                    Target Finished Product
                  </span>
                  <strong className="text-[#051747] dark:text-slate-100 block mt-0.5">
                    {productionRef.productName || 'No Product Linked'}
                  </strong>
                  <span className="text-[11px] text-[#535F80] dark:text-slate-400 font-mono">
                    Part #{productionRef.productId}
                  </span>
                </div>

                <div>
                  <span className="text-[#535F80] dark:text-slate-400 block font-medium">
                    Assigned Shop Floor Machine
                  </span>
                  <strong className="text-[#051747] dark:text-slate-100 block mt-0.5">
                    {productionRef.machineName || 'Machine Allocated'}
                  </strong>
                  <span className="text-[11px] text-[#535F80] dark:text-slate-400 font-mono">
                    {currentMachine?.code || 'MC'} · {currentMachine?.category || 'CNC'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormSelect
                  label="Operation / Machining Process"
                  name="operation"
                  value={productionRef.operation}
                  onChange={(e) =>
                    setProductionRef({ ...productionRef, operation: e.target.value })
                  }
                  options={OPERATION_OPTIONS.map((op) => ({
                    value: op,
                    label: op,
                  }))}
                />

                <FormInput
                  label="Production Department / Bay"
                  name="department"
                  value={productionRef.department}
                  onChange={(e) =>
                    setProductionRef({ ...productionRef, department: e.target.value })
                  }
                />
              </div>
            </div>

            {/* 3. Material Information Section */}
            <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-4 sm:p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E7E9F0] dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-[#081F62] dark:text-blue-400" />
                  <h2 className="text-sm font-semibold text-[#051747] dark:text-slate-100">
                    3. Material Information &amp; Approved Batch Selection
                  </h2>
                </div>
                {selectedMaterial && (
                  <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                    ✓ QC Passed
                  </span>
                )}
              </div>

              {/* Raw Material Selector */}
              <FormSelect
                label="Raw Material to Issue"
                name="materialId"
                required
                value={materialInfo.materialId}
                onChange={(e) => handleMaterialChange(e.target.value)}
                options={computedMaterials.map((m) => {
                  const isBomReq = planBom?.items.some((it) => it.materialId === m.id);
                  return {
                    value: m.id,
                    label: `${m.code} — ${m.name} ${
                      isBomReq ? '★ [BOM Required]' : ''
                    } (Approved: ${formatNumber(m.usableStock)} ${m.uom} | Net Avail: ${formatNumber(m.availableQty)} ${m.uom})`,
                  };
                })}
              />

              {/* Auto-Populated Read-Only Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs">
                <div>
                  <span className="text-[#535F80] dark:text-slate-400 block font-medium">Material Code</span>
                  <span className="font-mono font-bold text-[#081F62] dark:text-blue-400">{materialInfo.materialCode}</span>
                </div>
                <div>
                  <span className="text-[#535F80] dark:text-slate-400 block font-medium">Category / Grade</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedMaterial?.category || 'Raw Material'}</span>
                </div>
                <div>
                  <span className="text-[#535F80] dark:text-slate-400 block font-medium">Standard Unit (UOM)</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{materialInfo.uom}</span>
                </div>
                <div>
                  <span className="text-[#535F80] dark:text-slate-400 block font-medium">Reorder Level</span>
                  <span className="font-mono text-slate-600 dark:text-slate-300">{selectedMaterial?.reorderLevel || 0} {materialInfo.uom}</span>
                </div>
              </div>

              {/* Batch & Storage Location Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Quality-Approved Batch / Heat # <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={materialInfo.batchNumber}
                    onChange={(e) => handleBatchSelect(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-[#535F80]/30 dark:border-slate-700 bg-[#FEFEFE] dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#081F62]/30"
                  >
                    {approvedBatches.map((b) => (
                      <option key={b.batchNumber} value={b.batchNumber}>
                        {b.batchNumber} (Approved: {formatNumber(b.approvedQty)} {materialInfo.uom}) — {b.location}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    Only QC-approved and verified heat lots are displayed.
                  </p>
                </div>

                <FormSelect
                  label="Warehouse Storage Location (Rack / Bin)"
                  name="storageLocation"
                  required
                  value={materialInfo.storageLocation}
                  onChange={(e) =>
                    setMaterialInfo({ ...materialInfo, storageLocation: e.target.value })
                  }
                  options={RACK_OPTIONS.map((r) => ({
                    value: r,
                    label: r,
                  }))}
                />
              </div>

              {/* Quarantine Notice */}
              {pendingQcBatchesCount > 0 && (
                <div className="p-2.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    <strong>Quarantine Exclusion:</strong> {pendingQcBatchesCount} uninspected batch lot(s) are currently on quarantine hold and cannot be issued until released by Quality Control.
                  </span>
                </div>
              )}
            </div>

            {/* 4. Outward Remarks & Destination Section */}
            <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-4 sm:p-5 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-[#E7E9F0] dark:border-slate-800">
                <FileText className="w-4 h-4 text-[#081F62] dark:text-blue-400" />
                <h2 className="text-sm font-semibold text-[#051747] dark:text-slate-100">
                  4. Outward Remarks &amp; Destination Details
                </h2>
              </div>

              <FormTextarea
                label="Destination & Issuance Notes"
                name="remarks"
                rows={3}
                placeholder="e.g. Issued to Machine MC-CNC-01 for 4-Port Manifold production run (WO-2026-011)."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />

              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#535F80] dark:text-slate-400 pt-1">
                <span className="font-medium">Quick Presets:</span>
                <button
                  type="button"
                  onClick={() =>
                    setRemarks(
                      `Issued to Machine ${productionRef.machineName} for ${productionRef.productName} production run (${productionRef.workOrderNumber}).`
                    )
                  }
                  className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Machine Production Run
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setRemarks(
                      `Setup bar cut issuance for ${productionRef.workOrderNumber} (CNC facing and kerf test).`
                    )
                  }
                  className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Setup Kerf &amp; Pilot Test
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setRemarks(
                      `Additional authorized material issued for Work Order ${productionRef.workOrderNumber} under supervisor sign-off.`
                    )
                  }
                  className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Authorized Excess Issue
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Quantity Details, Real-Time Balance & Actions (5 Cols - Sticky) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-4">
            {/* Quantity Details & Real-Time Calculation Card */}
            <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-5 shadow-2xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#E7E9F0] dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#081F62] dark:text-blue-400" />
                  <h3 className="text-sm font-semibold text-[#051747] dark:text-slate-100">
                    Quantity Details &amp; Balance
                  </h3>
                </div>
                <span className="text-xs font-mono font-medium text-[#535F80]">
                  Unit: {materialInfo.uom}
                </span>
              </div>

              {/* Requirement & Previous Issuance Progress */}
              <div className="space-y-2 p-3 rounded-lg bg-blue-50/70 dark:bg-blue-950/40 border border-[#081F62]/15">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#081F62] dark:text-blue-300">
                    Work Order Requirement
                  </span>
                  <span className="font-mono font-bold text-[#081F62] dark:text-blue-200">
                    {formatNumber(quantityCalculations.requiredQty)} {materialInfo.uom}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-[#081F62]/10">
                  <div>
                    <span className="text-slate-600 dark:text-slate-400 block">Previously Issued:</span>
                    <strong className="font-mono text-slate-800 dark:text-slate-200">
                      {formatNumber(quantityCalculations.previouslyIssuedQty)} {materialInfo.uom}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-600 dark:text-slate-400 block">Remaining Need:</span>
                    <strong className="font-mono text-[#081F62] dark:text-blue-400">
                      {formatNumber(quantityCalculations.remainingRequirement)} {materialInfo.uom}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Stock Reservation Ledger Analysis */}
              <div className="space-y-2 text-xs">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Stock Availability Breakdown
                </div>
                <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400">Approved Physical Stock:</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {formatNumber(quantityCalculations.approvedStock)} {materialInfo.uom}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-amber-600 dark:text-amber-400">
                    <span>Reserved for OTHER Work Orders:</span>
                    <span className="font-mono font-semibold">
                      -{formatNumber(quantityCalculations.otherReservedStock)} {materialInfo.uom}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-blue-600 dark:text-blue-400">
                    <span>Reserved for THIS Work Order:</span>
                    <span className="font-mono font-semibold">
                      +{formatNumber(quantityCalculations.woReservedQty)} {materialInfo.uom}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700 font-bold">
                    <span className="text-[#051747] dark:text-slate-100">Eligible Available Stock:</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                      {formatNumber(quantityCalculations.eligibleAvailableStock)} {materialInfo.uom}
                    </span>
                  </div>
                </div>
              </div>

              {/* Issue Quantity Input Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Issue Quantity ({materialInfo.uom}) <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    {quantityCalculations.remainingRequirement > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setQuantityInfo({
                            issueQty: String(
                              Math.min(
                                quantityCalculations.remainingRequirement,
                                quantityCalculations.eligibleAvailableStock
                              )
                            ),
                          })
                        }
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 hover:bg-blue-200 text-[#081F62] cursor-pointer"
                      >
                        Fill Remaining
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setQuantityInfo({
                          issueQty: String(quantityCalculations.eligibleAvailableStock),
                        })
                      }
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 cursor-pointer"
                    >
                      Fill Max Eligible
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    placeholder="Enter quantity to issue..."
                    value={quantityInfo.issueQty}
                    onChange={(e) => setQuantityInfo({ issueQty: e.target.value })}
                    className={`w-full px-3 py-2.5 rounded-md border text-sm font-semibold tabular-nums focus:outline-hidden focus:ring-2 ${
                      isExceedingEligibleStock
                        ? 'border-red-500 bg-red-50/50 text-red-900 focus:ring-red-400'
                        : 'border-[#535F80]/30 dark:border-slate-700 bg-[#FEFEFE] dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-[#081F62]/30'
                    }`}
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400">
                    {materialInfo.uom}
                  </span>
                </div>
              </div>

              {/* Real-Time Balance After Issue Calculation Card */}
              <div className="p-3.5 rounded-lg bg-slate-900 text-[#FEFEFE] space-y-2.5">
                <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-1.5">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">
                    Projected Stock After Issue
                  </span>
                  <span className="font-mono text-[11px] text-blue-400">Auto-Calculated</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">Balance Eligible Stock:</span>
                  <span className="font-mono font-bold text-sm text-emerald-400">
                    {formatNumber(quantityCalculations.balanceStockAfterIssue)} {materialInfo.uom}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">Balance Physical Usable:</span>
                  <span className="font-mono font-semibold text-slate-200">
                    {formatNumber(quantityCalculations.physicalApprovedRemaining)} {materialInfo.uom}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-800">
                  <span className="text-slate-300">Remaining WO Need:</span>
                  <span className="font-mono font-semibold text-amber-300">
                    {formatNumber(quantityCalculations.remainingReqAfterIssue)} {materialInfo.uom}
                  </span>
                </div>
              </div>

              {/* Warning / Validation Alerts */}
              {isOverRequirement && !isExceedingEligibleStock && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <strong>Over-Requirement Notice:</strong> Requested issue quantity exceeds the remaining work order requirement by{' '}
                    <strong>
                      {formatNumber(
                        quantityCalculations.issueQtyNum - quantityCalculations.remainingRequirement
                      )}{' '}
                      {materialInfo.uom}
                    </strong>
                    . Allowed under eligible unreserved stock.
                  </div>
                </div>
              )}

              {isExceedingEligibleStock && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-xs text-red-800 dark:text-red-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                  <div>
                    <strong>Cannot Issue:</strong> Requested quantity exceeds maximum eligible stock (
                    {formatNumber(quantityCalculations.eligibleAvailableStock)} {materialInfo.uom}). Please reduce quantity or release reservations.
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <PrimaryButton
                  type="submit"
                  size="md"
                  icon={ArrowUpFromLine}
                  disabled={validationErrors.length > 0 || isSubmitting}
                  className="w-full justify-center"
                >
                  {isSubmitting ? 'Posting Issue...' : 'Issue Material to Production'}
                </PrimaryButton>

                <div className="grid grid-cols-2 gap-2">
                  <SecondaryButton
                    type="button"
                    size="sm"
                    icon={Save}
                    onClick={handleSaveDraft}
                    className="w-full justify-center"
                  >
                    Save as Draft
                  </SecondaryButton>
                  <SecondaryButton
                    type="button"
                    size="sm"
                    icon={RotateCcw}
                    onClick={() => setConfirmResetOpen(true)}
                    className="w-full justify-center"
                  >
                    Reset Form
                  </SecondaryButton>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (quantityInfo.issueQty) {
                      setConfirmCancelOpen(true);
                    } else {
                      navigate('/stock-outward');
                    }
                  }}
                  className="w-full text-center py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  Cancel &amp; Return to Listing
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Confirmation Dialog: Submit Issue */}
      <ConfirmationDialog
        isOpen={confirmSubmitOpen}
        onClose={() => setConfirmSubmitOpen(false)}
        onConfirm={handleFinalSubmit}
        title="Confirm Stock Outward Issuance"
        confirmLabel="Confirm & Issue Material"
        variant="primary"
        message={`Are you sure you want to issue ${quantityCalculations.issueQtyNum} ${materialInfo.uom} of ${materialInfo.materialName} (Batch: ${materialInfo.batchNumber}) from ${issueInfo.warehouse} to ${productionRef.workOrderNumber} on machine ${productionRef.machineName}? This action will deduct stock from the warehouse ledger.`}
      />

      {/* Confirmation Dialog: Reset Form */}
      <ConfirmationDialog
        isOpen={confirmResetOpen}
        onClose={() => setConfirmResetOpen(false)}
        onConfirm={handleConfirmReset}
        title="Reset Stock Outward Form"
        confirmLabel="Clear All Fields"
        variant="danger"
        message="Are you sure you want to reset this Issue Raw Material form? All unsaved inputs, selected batches, and local draft records will be cleared."
      />

      {/* Confirmation Dialog: Cancel Form */}
      <ConfirmationDialog
        isOpen={confirmCancelOpen}
        onClose={() => setConfirmCancelOpen(false)}
        onConfirm={() => navigate('/stock-outward')}
        title="Discard Changes"
        confirmLabel="Leave Page"
        variant="danger"
        message="Are you sure you want to leave this page? Any unsaved material issue quantities will be lost unless saved as a draft."
      />

      {/* Success Modal: Material Issued */}
      {successModalData && (
        <Modal
          isOpen={Boolean(successModalData)}
          onClose={() => navigate('/stock-outward')}
          title="Stock Outward Transaction Recorded"
          subtitle={`Material Issue Note ${successModalData.issueNumber} posted to inventory ledger`}
          size="md"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <SecondaryButton
                onClick={() => {
                  setSuccessModalData(null);
                  handleConfirmReset();
                }}
              >
                Issue Another Material
              </SecondaryButton>
              <PrimaryButton onClick={() => navigate('/stock-outward')}>
                View Outward Ledger
              </PrimaryButton>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <strong className="block font-semibold">Inventory Ledger Updated Successfully</strong>
                <span>
                  Issued <strong>{formatNumber(successModalData.issuedQty)} {successModalData.uom}</strong> to <strong>{successModalData.workOrderNumber}</strong>.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-[#535F80] dark:text-slate-400 block font-medium">Issue Note (MIN #)</span>
                <span className="font-mono font-bold text-[#081F62] dark:text-blue-400">{successModalData.issueNumber}</span>
              </div>
              <div>
                <span className="text-[#535F80] dark:text-slate-400 block font-medium">Work Order Number</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{successModalData.workOrderNumber}</span>
              </div>
              <div>
                <span className="text-[#535F80] dark:text-slate-400 block font-medium">Raw Material</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{successModalData.materialName}</span>
              </div>
              <div>
                <span className="text-[#535F80] dark:text-slate-400 block font-medium">Heat / Batch Lot</span>
                <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{successModalData.batchNumber}</span>
              </div>
              <div>
                <span className="text-[#535F80] dark:text-slate-400 block font-medium">Target Machine</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{successModalData.machineName}</span>
              </div>
              <div>
                <span className="text-[#535F80] dark:text-slate-400 block font-medium">Received By</span>
                <span className="text-slate-700 dark:text-slate-300">{successModalData.receivedBy}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#535F80] dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
              <span>Source: <strong>{successModalData.warehouse}</strong> ({successModalData.storageLocation})</span>
              <span className="font-mono">{successModalData.timestamp}</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
