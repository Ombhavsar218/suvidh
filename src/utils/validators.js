export function validateRequired(value, label) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return `${label} is required.`;
  }
  return '';
}

export function validateEmail(email) {
  if (!email) return 'Email is required.';
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).trim()) ? '' : 'Enter a valid email address.';
}

export function validatePositiveNumber(value, label, allowZero = false) {
  const num = Number(value);
  if (Number.isNaN(num)) return `${label} must be a valid number.`;
  if (allowZero ? num < 0 : num <= 0) {
    return allowZero
      ? `${label} cannot be negative.`
      : `${label} must be greater than zero.`;
  }
  return '';
}

export function validateScheduleRow(row, customers, products, existingSchedules) {
  const errors = [];
  const warnings = [];

  if (!row.scheduleNumber || !String(row.scheduleNumber).trim()) {
    errors.push('Missing Schedule Number');
  }
  const customerMatch = customers.find(
    (c) =>
      c.code.toLowerCase() === String(row.customerCode || '').trim().toLowerCase() ||
      c.name.toLowerCase() === String(row.customerName || '').trim().toLowerCase()
  );
  if (!customerMatch) {
    errors.push(`Unknown Customer (${row.customerCode || row.customerName || 'Empty'})`);
  }

  const productMatch = products.find(
    (p) =>
      p.code.toLowerCase() === String(row.productCode || '').trim().toLowerCase() ||
      p.name.toLowerCase() === String(row.productName || '').trim().toLowerCase()
  );
  if (!productMatch) {
    errors.push(`Unknown Product (${row.productCode || row.productName || 'Empty'})`);
  } else if (productMatch.status === 'Inactive') {
    warnings.push(`Product ${productMatch.code} is Inactive`);
  }

  const qty = Number(row.scheduledQty);
  if (Number.isNaN(qty) || qty <= 0) {
    errors.push(`Invalid Quantity (${row.scheduledQty})`);
  }

  const dateVal = new Date(row.requiredDate);
  if (!row.requiredDate || Number.isNaN(dateVal.getTime())) {
    errors.push(`Invalid Delivery Date (${row.requiredDate || 'Empty'})`);
  }

  const duplicateInExisting = existingSchedules.some(
    (s) =>
      s.scheduleNumber.toLowerCase() === String(row.scheduleNumber || '').trim().toLowerCase()
  );

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    isDuplicateExisting: duplicateInExisting,
    customerId: customerMatch?.id || null,
    customerName: customerMatch?.name || row.customerName || row.customerCode,
    productId: productMatch?.id || null,
    productName: productMatch?.name || row.productName || row.productCode,
  };
}
