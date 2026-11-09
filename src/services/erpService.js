/**
 * Frontend Service Layer (DRF-Ready Architecture)
 * -------------------------------------------------
 * All data transformations and business calculations live here so that
 * when connecting to a Django REST Framework backend later, these methods
 * can swap local state mutations for REST endpoints (/api/v1/...).
 */

export function getMaterialComputedFields(material) {
  const approvedPhysicalQty = Number(material.approvedPhysicalQty || 0);
  const reservedQty = Number(material.reservedQty || 0);
  const pendingInspectionQty = Number(material.pendingInspectionQty || 0);
  const rejectedQty = Number(material.rejectedQty || 0);

  // Business Rule: Reserved material is NOT counted as available.
  // Only quality-approved stock is usable stock.
  const usableStock = approvedPhysicalQty;
  const availableQty = Math.max(0, approvedPhysicalQty - reservedQty);
  const totalPhysicalStock = approvedPhysicalQty + pendingInspectionQty + rejectedQty;
  const isLowStock = availableQty <= Number(material.reorderLevel || 0);

  let stockStatus = 'Available';
  if (availableQty <= 0 && reservedQty > 0) stockStatus = 'Reserved';
  else if (isLowStock) stockStatus = 'Low Stock';

  return {
    ...material,
    usableStock,
    availableQty,
    totalPhysicalStock,
    isLowStock,
    stockStatus,
  };
}

export function getFinishedGoodComputedFields(fg) {
  const producedQty = Number(fg.producedQty || 0);
  const acceptedQty = Number(fg.acceptedQty || 0);
  const rejectedQty = Number(fg.rejectedQty || 0);
  const reservedQty = Number(fg.reservedQty || 0);

  // Business Rule: Only accepted finished goods count as usable finished stock.
  const usableQty = acceptedQty;
  const availableQty = Math.max(0, acceptedQty - reservedQty);

  return {
    ...fg,
    producedQty,
    acceptedQty,
    rejectedQty,
    usableQty,
    availableQty,
  };
}

export function computePlanMaterialRequirements(productId, manufacturingQty, boms, materials) {
  const bom = boms.find((b) => b.productId === productId);
  if (!bom) {
    return { hasBom: false, items: [], hasShortage: false, readinessScore: 0 };
  }

  let sufficientCount = 0;
  const items = bom.items.map((item) => {
    const matRaw = materials.find((m) => m.id === item.materialId);
    const mat = matRaw ? getMaterialComputedFields(matRaw) : null;
    const requiredQty = Number((item.qtyPerUnit * manufacturingQty).toFixed(2));
    const availableQty = mat ? mat.availableQty : 0;
    const shortageQty = Math.max(0, Number((requiredQty - availableQty).toFixed(2)));
    const isSufficient = shortageQty === 0;
    if (isSufficient) sufficientCount += 1;

    return {
      materialId: item.materialId,
      materialCode: mat?.code || item.materialId,
      materialName: mat?.name || 'Unknown Material',
      uom: item.uom,
      qtyPerUnit: item.qtyPerUnit,
      requiredQty,
      availableQty,
      pendingInspectionQty: mat?.pendingInspectionQty || 0,
      shortageQty,
      isSufficient,
    };
  });

  const hasShortage = items.some((i) => !i.isSufficient);
  const readinessScore = items.length ? Math.round((sufficientCount / items.length) * 100) : 100;

  return {
    hasBom: true,
    bomVersion: bom.version,
    items,
    hasShortage,
    readinessScore,
  };
}

export function computeMachineCapacityCheck(machine, startDate, endDate, plannedQty) {
  if (!machine) {
    return { valid: false, days: 0, maxCapacity: 0, utilizationPct: 0, message: 'No machine selected.' };
  }
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return { valid: false, days: 0, maxCapacity: 0, utilizationPct: 0, message: 'Completion date must be on or after start date.' };
  }
  const days = Math.max(1, Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1);
  const maxCapacity = machine.dailyCapacity * days;
  const utilizationPct = maxCapacity > 0 ? Math.round((Number(plannedQty || 0) / maxCapacity) * 100) : 0;
  const exceeds = Number(plannedQty || 0) > maxCapacity;

  return {
    valid: !exceeds,
    days,
    maxCapacity,
    utilizationPct,
    exceeds,
    message: exceeds
      ? `Planned quantity (${plannedQty}) exceeds ${days}-day machine capacity (${maxCapacity} units). Extend schedule or reduce batch size.`
      : `Capacity utilization: ${utilizationPct}% (${plannedQty} of ${maxCapacity} max units over ${days} day${days > 1 ? 's' : ''}).`,
  };
}

// Generic helper simulating API endpoint readiness for future Django REST integration
export const apiEndpointMap = {
  customers: '/api/v1/customers/',
  products: '/api/v1/products/',
  boms: '/api/v1/boms/',
  materials: '/api/v1/materials/',
  machines: '/api/v1/machines/',
  suppliers: '/api/v1/suppliers/',
  schedules: '/api/v1/schedules/',
  purchases: '/api/v1/purchase-orders/',
  productionPlans: '/api/v1/production-plans/',
  productionEntries: '/api/v1/production-entries/',
  qualityInspections: '/api/v1/quality-inspections/',
  finishedGoods: '/api/v1/finished-goods/',
  salesOrders: '/api/v1/sales-orders/',
  dispatches: '/api/v1/dispatches/',
  billing: '/api/v1/billing-documents/',
  finance: '/api/v1/finance-transactions/',
};
