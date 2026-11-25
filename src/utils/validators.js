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

export function validatePhone(phone, label = 'Phone Number', isRequired = true) {
  if (!phone || String(phone).trim() === '') {
    return isRequired ? `${label} is required.` : '';
  }
  const clean = String(phone).replace(/[\s\-()]/g, '');
  const digits = clean.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) {
    return 'Enter a valid phone number (7-15 digits).';
  }
  return '';
}

export function validateGstin(gstin) {
  if (!gstin || String(gstin).trim() === '') return '';
  const val = String(gstin).trim().toUpperCase();
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!gstinRegex.test(val)) {
    return 'Enter a valid 15-digit GSTIN (e.g. 27AAACK1234M1Z5).';
  }
  return '';
}

export function validatePan(pan) {
  if (!pan || String(pan).trim() === '') return '';
  const val = String(pan).trim().toUpperCase();
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  if (!panRegex.test(val)) {
    return 'Enter a valid 10-character PAN (e.g. AAACK1234M).';
  }
  return '';
}

export function validateUrl(url) {
  if (!url || String(url).trim() === '') return '';
  const val = String(url).trim();
  const urlPattern = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/;
  if (!urlPattern.test(val)) {
    return 'Enter a valid website URL (e.g. https://supplier.com).';
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

const ALLOWED_PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
const ALLOWED_CUSTOMER_STATUSES = ['Active', 'Inactive'];

export function validateCustomerImportRow(row, existingCustomers = []) {
  const errors = [];

  const code = String(row.code || '').trim();
  const name = String(row.name || '').trim();
  const contactPerson = String(row.contactPerson || '').trim();
  const email = String(row.email || '').trim();
  const phone = String(row.phone || '').trim();
  const address = String(row.address || '').trim();
  const priorityTier = String(row.priorityTier || 'High').trim();
  const status = String(row.status || 'Active').trim();

  if (!code) errors.push('Missing Customer Code');
  if (!name) errors.push('Missing Customer Name');
  if (!contactPerson) errors.push('Missing Contact Person');

  const emailErr = validateEmail(email);
  if (emailErr) errors.push(emailErr.replace(/\.$/, ''));

  if (!phone) errors.push('Missing Phone');
  if (!address) errors.push('Missing Address');

  if (!ALLOWED_PRIORITIES.includes(priorityTier)) {
    errors.push(`Invalid Priority (${priorityTier})`);
  }
  if (!ALLOWED_CUSTOMER_STATUSES.includes(status)) {
    errors.push(`Invalid Status (${status})`);
  }

  const duplicateInExisting = existingCustomers.some(
    (c) =>
      (code && c.code.toLowerCase() === code.toLowerCase()) ||
      (name && c.name.toLowerCase() === name.toLowerCase())
  );

  return {
    isValid: errors.length === 0,
    errors,
    isDuplicateExisting: duplicateInExisting,
  };
}
