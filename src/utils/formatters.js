export function formatCurrency(amount, currency = 'INR') {
  const num = Number(amount || 0);
  if (currency === 'INR') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(num);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatNumber(val, decimals = 0) {
  const num = Number(val || 0);
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getDaysRemaining(dateStr) {
  if (!dateStr) return 0;
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

/**
 * Exact Production Planning Priority Weightage:
 * - Delivery urgency: 40%
 * - Customer priority: 25%
 * - Material readiness: 20%
 * - Machine availability/efficiency: 15%
 */
export function calculateProductionPriority({
  deliveryUrgencyScore = 0, // 0 - 100
  customerPriorityScore = 0, // 0 - 100
  materialReadinessScore = 0, // 0 - 100
  machineEfficiencyScore = 0, // 0 - 100
}) {
  const deliveryWeighted = Number((deliveryUrgencyScore * 0.4).toFixed(1));
  const customerWeighted = Number((customerPriorityScore * 0.25).toFixed(1));
  const materialWeighted = Number((materialReadinessScore * 0.2).toFixed(1));
  const machineWeighted = Number((machineEfficiencyScore * 0.15).toFixed(1));
  const totalScore = Math.round(
    deliveryWeighted + customerWeighted + materialWeighted + machineWeighted
  );

  let level = 'Low';
  if (totalScore >= 80) level = 'Critical';
  else if (totalScore >= 65) level = 'High';
  else if (totalScore >= 45) level = 'Medium';

  return {
    totalScore,
    level,
    breakdown: [
      { key: 'delivery', label: 'Delivery Urgency', weight: 40, raw: deliveryUrgencyScore, weighted: deliveryWeighted },
      { key: 'customer', label: 'Customer Priority', weight: 25, raw: customerPriorityScore, weighted: customerWeighted },
      { key: 'material', label: 'Material Readiness', weight: 20, raw: materialReadinessScore, weighted: materialWeighted },
      { key: 'machine', label: 'Machine Availability / Efficiency', weight: 15, raw: machineEfficiencyScore, weighted: machineWeighted },
    ],
  };
}

export function generateId(prefix, existingList = []) {
  const nums = existingList
    .map((item) => {
      const match = String(item.id || '').match(/(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}-${String(next).padStart(3, '0')}`;
}
