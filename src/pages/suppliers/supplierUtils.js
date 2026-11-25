export const SUPPLIER_TYPES = [
  'Manufacturer',
  'Distributor',
  'Dealer',
  'Service Provider',
  'Other',
];

export const SUPPLIER_CATEGORIES = [
  'Alloy & Stainless Steel',
  'Grey Iron Castings',
  'Aluminum & Bronze',
  'Seals, O-Rings & Fasteners',
  'Hard Chrome Rods & Consumables',
  'Cutting Tools & Inserts',
  'Machining Consumables & Coolants',
  'Electrical & Fasteners',
  'Other',
];

export const PAYMENT_TERMS_OPTIONS = [
  'Advance Payment',
  'Immediate Payment',
  'Net 15 Days',
  'Net 30 Days',
  'Net 45 Days',
  'Net 60 Days',
  'Custom',
];

export const TRANSPORT_OPTIONS = ['Supplier', 'Buyer', 'Third Party'];

export const CURRENCY_OPTIONS = ['INR', 'USD', 'EUR', 'GBP'];

export const CATEGORY_STYLES = {
  'Alloy & Stainless Steel':
    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50',
  'Grey Iron Castings':
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50',
  'Aluminum & Bronze':
    'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/50',
  'Seals, O-Rings & Fasteners':
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50',
  'Hard Chrome Rods & Consumables':
    'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/50',
  'Cutting Tools & Inserts':
    'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50',
  'Machining Consumables & Coolants':
    'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-900/50',
  'Electrical & Fasteners':
    'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/50',
  Other:
    'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
};

export const TYPE_STYLES = {
  Manufacturer:
    'bg-blue-50 text-[#081F62] border-[#081F62]/20 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/60',
  Distributor:
    'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800/60',
  Dealer:
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60',
  'Service Provider':
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60',
  Other:
    'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
};

export function getSupplierInitials(name) {
  if (!name) return 'SP';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function formatAddress(addr) {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  return [addr.line1, addr.city, addr.state, addr.pincode, addr.country]
    .filter(Boolean)
    .join(', ');
}

export function createEmptySupplierForm(existingSuppliers = []) {
  const nextNum = existingSuppliers.length + 1;
  const currentYear = new Date().getFullYear();
  const autoCode = `SUP-${currentYear}-${String(nextNum).padStart(2, '0')}`;

  return {
    id: '',
    code: autoCode,
    name: '',
    supplierType: 'Manufacturer',
    categories: ['Alloy & Stainless Steel'],
    category: 'Alloy & Stainless Steel',
    status: 'Active',
    contactPerson: '',
    email: '',
    phone: '',
    alternateContactPerson: '',
    alternatePhone: '',
    accountsEmail: '',
    gstin: '',
    pan: '',
    website: '',
    plantAddress: {
      line1: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
    },
    billingAddress: {
      line1: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
    },
    shippingAddress: {
      line1: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
    },
    address: '',
    leadTimeDays: 5,
    moq: '',
    paymentTerms: 'Net 30 Days',
    customPaymentDays: 30,
    creditLimit: '',
    currency: 'INR',
    transportResponsibility: 'Supplier',
    rating: 4.5,
  };
}

export function computeSupplierPerformance(supplier, purchaseOrders = [], qualityInspections = []) {
  if (!supplier) return null;

  const linkedPos = purchaseOrders.filter(
    (po) => po.supplierId === supplier.id && po.status !== 'Cancelled'
  );

  const totalPurchaseOrders = linkedPos.length;
  const totalPurchaseValue = linkedPos.reduce(
    (sum, po) => sum + (Number(po.totalAmount) || 0),
    0
  );

  // Last purchase date from actual POs
  let lastPurchaseDate = 'No Data';
  if (linkedPos.length > 0) {
    const sortedPos = [...linkedPos].sort(
      (a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
    );
    lastPurchaseDate = sortedPos[0].orderDate || 'No Data';
  }

  // Delivery performance calculated from received/delivered POs
  const receivedPos = linkedPos.filter(
    (po) => po.status === 'Received' || (Array.isArray(po.receivingHistory) && po.receivingHistory.length > 0)
  );

  let deliveryPerformance = 'No Data';
  if (receivedPos.length > 0) {
    let onTimeCount = 0;
    receivedPos.forEach((po) => {
      const expected = new Date(po.expectedArrival).getTime();
      const actual = po.receivingHistory?.[0]?.receivedDate
        ? new Date(po.receivingHistory[0].receivedDate).getTime()
        : new Date(po.orderDate).getTime();

      // On-time if received on or before expected date, or status is verified Received
      if (!Number.isNaN(expected) && !Number.isNaN(actual)) {
        if (actual <= expected || po.status === 'Received') {
          onTimeCount++;
        }
      } else {
        onTimeCount++;
      }
    });
    const pct = Math.round((onTimeCount / receivedPos.length) * 100);
    deliveryPerformance = `${pct}% On-Time (${receivedPos.length} order${receivedPos.length > 1 ? 's' : ''})`;
  }

  // Quality rating derived from QC inspection history
  const supplierQc = qualityInspections.filter(
    (qc) =>
      qc.itemType === 'Raw Material' &&
      linkedPos.some(
        (po) =>
          (qc.reference && qc.reference.includes(po.poNumber)) ||
          (po.items && po.items.some((it) => it.materialId === qc.itemId))
      )
  );

  let qualityRating = 'No Data';
  let qualityRatingScore = null;

  if (supplierQc.length > 0) {
    const totalInspected = supplierQc.reduce((sum, q) => sum + (Number(q.inspectedQty) || 0), 0);
    const totalAccepted = supplierQc.reduce((sum, q) => sum + (Number(q.acceptedQty) || 0), 0);
    if (totalInspected > 0) {
      const score = Number(((totalAccepted / totalInspected) * 5).toFixed(1));
      qualityRatingScore = score;
      qualityRating = `${score.toFixed(1)} / 5.0 (${Math.round((totalAccepted / totalInspected) * 100)}% QC Pass)`;
    }
  }

  // Fall back to recorded audited rating if no live QC logs match yet
  if (qualityRating === 'No Data' && supplier.rating) {
    qualityRatingScore = Number(supplier.rating);
    qualityRating = `${qualityRatingScore.toFixed(1)} / 5.0 (Audited Baseline)`;
  }

  return {
    totalPurchaseOrders,
    totalPurchaseValue,
    lastPurchaseDate,
    deliveryPerformance,
    qualityRating,
    qualityRatingScore,
    linkedPos,
  };
}
