export const STATUS_STYLES = {
  'Active': 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  'Partially Consumed': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  'Released': 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  'Expired': 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
};

export const PRIORITY_STYLES = {
  'Normal': 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  'High': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  'Urgent': 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
};

// Approved, eligible batches per raw material (excluding quarantined & rejected stock)
export const APPROVED_BATCHES_MAP = {
  'MAT-001': [
    {
      batchNumber: 'HEAT-2026-1105-A',
      warehouse: 'Main Raw Material Warehouse (Zone A)',
      location: 'Rack A-01 / Shelf 2',
      approvedQty: 1850,
      qcStatus: 'Approved',
      heatCertificate: 'MTC-KSS-4140-8891',
    },
    {
      batchNumber: 'HEAT-2026-1028-B',
      warehouse: 'Main Raw Material Warehouse (Zone A)',
      location: 'Rack A-01 / Shelf 4',
      approvedQty: 2000,
      qcStatus: 'Approved',
      heatCertificate: 'MTC-KSS-4140-8742',
    },
  ],
  'MAT-002': [
    {
      batchNumber: 'LOT-2026-FG260-03',
      warehouse: 'Castings Yard B',
      location: 'Yard B-04 / Staging Floor',
      approvedQty: 640,
      qcStatus: 'Approved',
      heatCertificate: 'DFC-FOUNDRY-FG260-31',
    },
  ],
  'MAT-003': [
    {
      batchNumber: 'LOT-ALU-6061-02',
      warehouse: 'Alloy & Stainless Steel Store (Zone C)',
      location: 'Rack C-02 / Shelf 1',
      approvedQty: 580,
      qcStatus: 'Approved',
      heatCertificate: 'HND-ALU-6061-T6-99',
    },
  ],
  'MAT-004': [
    {
      batchNumber: 'HEAT-2026-SS-19A',
      warehouse: 'Main Raw Material Warehouse (Zone A)',
      location: 'Rack A-05 / Bay 1',
      approvedQty: 800,
      qcStatus: 'Approved',
      heatCertificate: 'JSL-SS316L-BAR-401',
    },
    {
      batchNumber: 'HEAT-SS316-875',
      warehouse: 'Main Raw Material Warehouse (Zone A)',
      location: 'Rack A-05 / Bay 3',
      approvedQty: 680,
      qcStatus: 'Approved',
      heatCertificate: 'VIRAJ-316L-ROD-850',
    },
  ],
  'MAT-005': [
    {
      batchNumber: 'HEAT-PB2-301',
      warehouse: 'Alloy & Stainless Steel Store (Zone C)',
      location: 'Rack C-06 / Non-Ferrous Bay',
      approvedQty: 240,
      qcStatus: 'Approved',
      heatCertificate: 'MET-BRZ-PB2-221',
    },
  ],
  'MAT-006': [
    {
      batchNumber: 'LOT-VTN-2026-09',
      warehouse: 'General Consumables & Fasteners Store (Zone D)',
      location: 'Bin D-12 / Seals Compartment',
      approvedQty: 250,
      qcStatus: 'Approved',
      heatCertificate: 'FKM-75-DURO-QC-112',
    },
    {
      batchNumber: 'LOT-VTN-2026-10',
      warehouse: 'General Consumables & Fasteners Store (Zone D)',
      location: 'Bin D-12 / Seals Compartment',
      approvedQty: 180,
      qcStatus: 'Approved',
      heatCertificate: 'FKM-75-DURO-QC-118',
    },
  ],
  'MAT-007': [
    {
      batchNumber: 'HEAT-CR-32-114',
      warehouse: 'Main Raw Material Warehouse (Zone A)',
      location: 'Rack A-08 / Ground Bay',
      approvedQty: 480,
      qcStatus: 'Approved',
      heatCertificate: 'CK45-CHROME-ISO-901',
    },
  ],
  'MAT-008': [
    {
      batchNumber: 'LOT-CLT-SYN-04',
      warehouse: 'Main Raw Material Warehouse (Zone A)',
      location: 'Chem Bay E-01 / Coolant Staging',
      approvedQty: 820,
      qcStatus: 'Approved',
      heatCertificate: 'SYN-COOL-BATCH-44',
    },
  ],
  'MAT-009': [
    {
      batchNumber: 'LOT-BLT-M12-88',
      warehouse: 'General Consumables & Fasteners Store (Zone D)',
      location: 'Bin D-04 / Hardware Drawer',
      approvedQty: 2400,
      qcStatus: 'Approved',
      heatCertificate: 'DIN-912-12.9-TEST-77',
    },
  ],
};

export function generateReservationNumber(existingReservations = []) {
  const nextNum = existingReservations.length + 1;
  const currentYear = new Date().getFullYear();
  return `RES-${currentYear}-${String(nextNum).padStart(4, '0')}`;
}

/**
 * Calculates remaining production requirement for the selected Work Order
 */
export function calculateRemainingProductionRequirement(requiredQty = 0, previouslyReserved = 0, previouslyIssued = 0) {
  const req = Number(requiredQty) || 0;
  const res = Number(previouslyReserved) || 0;
  const iss = Number(previouslyIssued) || 0;
  return Math.max(0, req - res - iss);
}

/**
 * Calculates remaining available stock after new reservation quantity
 */
export function calculateRemainingAvailableStock(netAvailableStock = 0, newReservationQty = 0) {
  const avail = Number(netAvailableStock) || 0;
  const resQty = Number(newReservationQty) || 0;
  return avail - resQty;
}

/**
 * Evaluates whether a reservation has expired based on current date
 */
export function isReservationExpired(expiryDate) {
  if (!expiryDate) return false;
  const today = new Date().toISOString().slice(0, 10);
  return expiryDate < today;
}
