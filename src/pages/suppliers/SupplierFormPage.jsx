import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  RotateCcw,
  Plus,
  Building2,
  User,
  Phone,
  Mail,
  Receipt,
  MapPin,
  CreditCard,
  Truck,
  Star,
  Copy,
  ExternalLink,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { PrimaryButton, SecondaryButton } from '../../components/common/Buttons';
import { FormInput, FormSelect } from '../../components/forms/FormFields';
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog';
import { StatusBadge } from '../../components/common/StatusBadge';
import { StatCard } from '../../components/dashboard/StatCard';
import { EmptyState } from '../../components/common/States';
import { useErpData } from '../../context/ErpDataContext';
import { useApp } from '../../context/AppContext';
import {
  validateRequired,
  validateEmail,
  validatePhone,
  validateGstin,
  validatePan,
  validateUrl,
} from '../../utils/validators';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import {
  SUPPLIER_TYPES,
  SUPPLIER_CATEGORIES,
  PAYMENT_TERMS_OPTIONS,
  TRANSPORT_OPTIONS,
  CURRENCY_OPTIONS,
  TYPE_STYLES,
  formatAddress,
  createEmptySupplierForm,
  computeSupplierPerformance,
} from './supplierUtils';

export function SupplierFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useApp();
  const {
    suppliers = [],
    purchaseOrders = [],
    qualityInspections = [],
    saveSupplier,
  } = useErpData();

  const isEdit = Boolean(id);
  const existingSupplier = useMemo(() => {
    return isEdit ? suppliers.find((s) => s.id === id) : null;
  }, [isEdit, id, suppliers]);

  const [form, setForm] = useState(() => createEmptySupplierForm(suppliers));
  const [errors, setErrors] = useState({});
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  // Load existing supplier details into form state
  useEffect(() => {
    if (isEdit && existingSupplier) {
      const plantAddr =
        typeof existingSupplier.plantAddress === 'object' && existingSupplier.plantAddress !== null
          ? existingSupplier.plantAddress
          : {
              line1: existingSupplier.address || '',
              city: 'Pune',
              state: 'Maharashtra',
              pincode: '411036',
              country: 'India',
            };

      const billingAddr =
        typeof existingSupplier.billingAddress === 'object' && existingSupplier.billingAddress !== null
          ? existingSupplier.billingAddress
          : { ...plantAddr };

      const shippingAddr =
        typeof existingSupplier.shippingAddress === 'object' && existingSupplier.shippingAddress !== null
          ? existingSupplier.shippingAddress
          : { ...plantAddr };

      const cats =
        Array.isArray(existingSupplier.categories) && existingSupplier.categories.length > 0
          ? existingSupplier.categories
          : existingSupplier.category
          ? [existingSupplier.category]
          : ['Alloy & Stainless Steel'];

      setForm({
        ...createEmptySupplierForm(suppliers),
        ...existingSupplier,
        supplierType: existingSupplier.supplierType || 'Manufacturer',
        categories: cats,
        category: cats[0] || 'Alloy & Stainless Steel',
        plantAddress: plantAddr,
        billingAddress: billingAddr,
        shippingAddress: shippingAddr,
        address: existingSupplier.address || formatAddress(plantAddr),
        leadTimeDays: existingSupplier.leadTimeDays ?? 5,
        moq: existingSupplier.moq ?? '',
        paymentTerms: existingSupplier.paymentTerms || 'Net 30 Days',
        customPaymentDays: existingSupplier.customPaymentDays || 30,
        creditLimit: existingSupplier.creditLimit ?? '',
        currency: existingSupplier.currency || 'INR',
        transportResponsibility: existingSupplier.transportResponsibility || 'Supplier',
        rating: existingSupplier.rating ?? 4.5,
        status: existingSupplier.status || 'Active',
      });
      setErrors({});
    }
  }, [isEdit, existingSupplier, suppliers]);

  // Performance calculations for existing supplier
  const performance = useMemo(() => {
    return isEdit && existingSupplier
      ? computeSupplierPerformance(existingSupplier, purchaseOrders, qualityInspections)
      : null;
  }, [isEdit, existingSupplier, purchaseOrders, qualityInspections]);

  // If in edit mode and supplier doesn't exist in data
  if (isEdit && !existingSupplier) {
    return (
      <EmptyState
        title="Supplier Partner Not Found"
        description="The supplier profile you are attempting to edit does not exist or has been removed."
        action={
          <SecondaryButton icon={ArrowLeft} onClick={() => navigate('/suppliers')}>
            Back to Supplier Directory
          </SecondaryButton>
        }
      />
    );
  }

  // Copy Addresses Helpers
  const copyPlantToBilling = () => {
    setForm((prev) => ({
      ...prev,
      billingAddress: { ...prev.plantAddress },
    }));
    addToast({
      title: 'Address Copied',
      message: 'Billing address updated from Plant address.',
      type: 'info',
    });
  };

  const copyBillingToShipping = () => {
    setForm((prev) => ({
      ...prev,
      shippingAddress: { ...prev.billingAddress },
    }));
    addToast({
      title: 'Address Copied',
      message: 'Shipping/Pickup address updated from Billing address.',
      type: 'info',
    });
  };

  // Toggle Category Checkbox
  const toggleCategory = (cat) => {
    setForm((prev) => {
      const current = prev.categories || [];
      const exists = current.includes(cat);
      const next = exists
        ? current.filter((c) => c !== cat)
        : [...current, cat];

      return {
        ...prev,
        categories: next,
        category: next[0] || '',
      };
    });

    if (errors.categories) {
      setErrors((prev) => ({ ...prev, categories: undefined }));
    }
  };

  // Validation Routine
  const validateForm = () => {
    const errs = {};

    // 1. Basic Info
    const codeErr = validateRequired(form.code, 'Supplier Code');
    if (codeErr) errs.code = codeErr;

    // Check duplicate code
    const isDuplicate = suppliers.some(
      (s) =>
        s.id !== form.id &&
        s.code?.trim().toLowerCase() === form.code?.trim().toLowerCase()
    );
    if (isDuplicate) {
      errs.code = `Supplier Code "${form.code}" is already assigned to another vendor.`;
    }

    const nameErr = validateRequired(form.name, 'Supplier Name');
    if (nameErr) errs.name = nameErr;

    if (!form.categories || form.categories.length === 0) {
      errs.categories = 'Please select at least one supply category.';
    }

    // 2. Contact Info
    const contactErr = validateRequired(form.contactPerson, 'Contact Person');
    if (contactErr) errs.contactPerson = contactErr;

    const phoneErr = validatePhone(form.phone, 'Phone Number', true);
    if (phoneErr) errs.phone = phoneErr;

    if (form.email) {
      const emailErr = validateEmail(form.email);
      if (emailErr) errs.email = emailErr;
    }

    if (form.alternatePhone) {
      const altPhoneErr = validatePhone(form.alternatePhone, 'Alternate Phone', false);
      if (altPhoneErr) errs.alternatePhone = altPhoneErr;
    }

    if (form.accountsEmail) {
      const accEmailErr = validateEmail(form.accountsEmail);
      if (accEmailErr) errs.accountsEmail = accEmailErr;
    }

    // 3. Tax Info
    if (form.gstin) {
      const gstinErr = validateGstin(form.gstin);
      if (gstinErr) errs.gstin = gstinErr;
    }

    if (form.pan) {
      const panErr = validatePan(form.pan);
      if (panErr) errs.pan = panErr;
    }

    if (form.website) {
      const webErr = validateUrl(form.website);
      if (webErr) errs.website = webErr;
    }

    // 4. Terms
    if (
      form.leadTimeDays === '' ||
      form.leadTimeDays === null ||
      Number(form.leadTimeDays) < 0
    ) {
      errs.leadTimeDays = 'Lead time must be a non-negative whole number.';
    }

    if (form.moq !== '' && form.moq !== null && Number(form.moq) <= 0) {
      errs.moq = 'MOQ must be greater than zero when provided.';
    }

    if (
      form.creditLimit !== '' &&
      form.creditLimit !== null &&
      Number(form.creditLimit) < 0
    ) {
      errs.creditLimit = 'Credit limit cannot be a negative amount.';
    }

    if (form.paymentTerms === 'Custom') {
      if (!form.customPaymentDays || Number(form.customPaymentDays) <= 0) {
        errs.customPaymentDays = 'Please specify credit days for custom terms.';
      }
    }

    return errs;
  };

  // Submit Handler
  const handleSave = (e, shouldAddAnother = false) => {
    e?.preventDefault();
    const nextErrors = validateForm();

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      addToast({
        title: 'Validation Failed',
        message: 'Please review and resolve the highlighted errors in the form.',
        type: 'danger',
      });
      return;
    }

    const cleanPlantAddress = formatAddress(form.plantAddress);
    const primaryCat = form.categories[0] || form.category || 'Alloy & Stainless Steel';

    const payload = {
      ...form,
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      gstin: form.gstin ? form.gstin.trim().toUpperCase() : '',
      pan: form.pan ? form.pan.trim().toUpperCase() : '',
      category: primaryCat,
      categories: form.categories.length > 0 ? form.categories : [primaryCat],
      address: cleanPlantAddress || form.address,
      leadTimeDays: Number(form.leadTimeDays || 0),
      moq: form.moq ? Number(form.moq) : undefined,
      creditLimit: form.creditLimit ? Number(form.creditLimit) : 0,
      customPaymentDays:
        form.paymentTerms === 'Custom' ? Number(form.customPaymentDays || 30) : undefined,
      rating: Number(form.rating || 4.5),
    };

    if (isEdit && existingSupplier) {
      payload.id = existingSupplier.id;
    }

    saveSupplier(payload);

    if (shouldAddAnother) {
      const nextForm = createEmptySupplierForm([...suppliers, payload]);
      setForm(nextForm);
      setErrors({});
      addToast({
        title: 'Supplier Added',
        message: `${payload.name} saved. Ready for next supplier entry.`,
        type: 'success',
      });
    } else {
      addToast({
        title: isEdit ? 'Supplier Updated' : 'Supplier Created',
        message: `${payload.name} (${payload.code}) saved successfully.`,
        type: 'success',
      });
      navigate('/suppliers');
    }
  };

  // Reset Confirmation Handler
  const handleConfirmReset = () => {
    setForm(createEmptySupplierForm(suppliers));
    setErrors({});
    addToast({
      title: 'Form Reset',
      message: 'All entries have been cleared back to defaults.',
      type: 'info',
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        title={isEdit ? `Edit Supplier — ${existingSupplier?.name}` : 'Add New Supplier Partner'}
        badge={
          isEdit ? (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${
                TYPE_STYLES[form.supplierType] || TYPE_STYLES.Other
              }`}
            >
              {form.supplierType}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-md bg-blue-50 dark:bg-blue-950/60 text-[#081F62] dark:text-blue-400 border border-[#081F62]/20 dark:border-blue-800/40">
              <Building2 className="w-3.5 h-3.5" />
              Vendor Registration
            </span>
          )
        }
        description={
          isEdit
            ? `Update partner credentials, multiple supply categories, facility locations, and procurement credit terms for ${existingSupplier?.code}.`
            : 'Register a new raw material manufacturer, distributor, or service provider with verified contact details, tax compliance, and commercial terms.'
        }
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <SecondaryButton
              size="sm"
              icon={ArrowLeft}
              onClick={() => {
                if (form.name || form.contactPerson) {
                  setConfirmCancelOpen(true);
                } else {
                  navigate('/suppliers');
                }
              }}
            >
              Back to Suppliers
            </SecondaryButton>
            {!isEdit && (
              <>
                <SecondaryButton
                  size="sm"
                  icon={RotateCcw}
                  onClick={() => setConfirmResetOpen(true)}
                >
                  Reset Form
                </SecondaryButton>
                <SecondaryButton
                  size="sm"
                  icon={Plus}
                  onClick={(e) => handleSave(e, true)}
                >
                  Save &amp; Add Another
                </SecondaryButton>
              </>
            )}
            <PrimaryButton
              size="sm"
              icon={Save}
              onClick={(e) => handleSave(e, false)}
            >
              {isEdit ? 'Update Supplier' : 'Save Supplier'}
            </PrimaryButton>
          </div>
        }
      />

      {/* Verified Performance Metrics (Edit Mode Only) */}
      {isEdit && performance && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Purchase Orders"
            value={`${performance.totalPurchaseOrders} Orders`}
            trend="Procurement Volume"
            trendDirection="neutral"
            sublabel="Issued purchase orders"
            icon={ShoppingBag}
            tone="blue"
          />
          <StatCard
            label="Total Procurement Value"
            value={formatCurrency(performance.totalPurchaseValue)}
            trend="Lifetime Business"
            trendDirection="up"
            sublabel="Cumulative billed value"
            icon={CreditCard}
            tone="green"
          />
          <StatCard
            label="Last Purchase Date"
            value={performance.lastPurchaseDate}
            trend="Fulfillment Recency"
            trendDirection="neutral"
            sublabel="Most recent order date"
            icon={Receipt}
            tone="slate"
          />
          <StatCard
            label="Delivery Performance"
            value={performance.deliveryPerformance}
            trend="On-time fulfillment rate"
            trendDirection="up"
            sublabel="Based on actual gate GRNs"
            icon={Truck}
            tone="amber"
          />
        </div>
      )}

      {/* Main Form Sections */}
      <form onSubmit={(e) => handleSave(e, false)} className="space-y-6">
        {/* SECTION 1: BASIC SUPPLIER IDENTIFICATION */}
        <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E7E9F0] dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#081F62] dark:text-blue-400" />
              <h2 className="text-sm font-semibold text-[#051747] dark:text-slate-100">
                1. Basic Supplier Information
              </h2>
            </div>
            <StatusBadge status={form.status} size="xs" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <FormInput
              label="Supplier Code"
              name="code"
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              error={errors.code}
              placeholder="e.g. SUP-2026-06"
            />

            <div className="sm:col-span-2">
              <FormInput
                label="Supplier Legal / Commercial Name"
                name="name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                error={errors.name}
                placeholder="e.g. Kalyani Specialty Steels Ltd."
              />
            </div>

            <FormSelect
              label="Supplier Type"
              name="supplierType"
              required
              value={form.supplierType}
              onChange={(e) => setForm({ ...form, supplierType: e.target.value })}
              options={SUPPLIER_TYPES}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <FormSelect
              label="Partner Status"
              name="status"
              required
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={['Active', 'Inactive']}
              hint="Inactive suppliers will not appear in new PO creation selectors"
            />
          </div>

          {/* Supply Categories as Checkboxes */}
          <div className="pt-2 border-t border-[#E7E9F0] dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Supply Categories <span className="text-red-500">*</span>
                <span className="text-slate-400 font-normal ml-1.5">
                  (Check all categories provided by this supplier)
                </span>
              </label>
              <span className="text-[11px] font-mono text-[#535F80] dark:text-slate-400">
                {form.categories?.length || 0} selected
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
              {SUPPLIER_CATEGORIES.map((cat) => {
                const isChecked = Boolean(form.categories?.includes(cat));
                return (
                  <label
                    key={cat}
                    className={`flex items-center gap-2.5 p-2.5 rounded-md border text-xs cursor-pointer transition-colors select-none ${
                      isChecked
                        ? 'border-[#081F62] bg-[#E7E9F0]/60 dark:bg-blue-950/30 font-medium'
                        : 'border-[#535F80]/20 dark:border-slate-800 hover:bg-[#E7E9F0]/35 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleCategory(cat)}
                      className="rounded border-[#535F80]/40 text-[#081F62] focus:ring-[#081F62] w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs text-[#051747] dark:text-slate-100">
                      {cat}
                    </span>
                  </label>
                );
              })}
            </div>

            {errors.categories && (
              <p className="text-xs text-red-500 mt-1.5">{errors.categories}</p>
            )}
          </div>
        </div>

        {/* SECTION 2: CONTACT DETAILS & ACCOUNTS */}
        <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E7E9F0] dark:border-slate-800">
            <User className="w-4 h-4 text-[#081F62] dark:text-blue-400" />
            <h2 className="text-sm font-semibold text-[#051747] dark:text-slate-100">
              2. Contact Information &amp; Department Contacts
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormInput
              label="Primary Contact Person"
              name="contactPerson"
              required
              value={form.contactPerson}
              onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
              error={errors.contactPerson}
              placeholder="e.g. Milind Deshpande"
            />

            <FormInput
              label="Primary Phone Number"
              name="phone"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              error={errors.phone}
              placeholder="e.g. +91 98221 67010"
            />

            <FormInput
              label="Primary Email Address"
              name="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              error={errors.email}
              placeholder="sales@supplier.com"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <FormInput
              label="Alternate Contact Person (Optional)"
              name="alternateContactPerson"
              value={form.alternateContactPerson}
              onChange={(e) => setForm({ ...form, alternateContactPerson: e.target.value })}
              placeholder="e.g. Prakash Shinde"
            />

            <FormInput
              label="Alternate Phone Number (Optional)"
              name="alternatePhone"
              value={form.alternatePhone}
              onChange={(e) => setForm({ ...form, alternatePhone: e.target.value })}
              error={errors.alternatePhone}
              placeholder="e.g. +91 98221 67099"
            />

            <FormInput
              label="Accounts / Billing Contact Email (Optional)"
              name="accountsEmail"
              type="email"
              value={form.accountsEmail}
              onChange={(e) => setForm({ ...form, accountsEmail: e.target.value })}
              error={errors.accountsEmail}
              placeholder="accounts@supplier.com"
            />
          </div>
        </div>

        {/* SECTION 3: BUSINESS & TAX INFORMATION */}
        <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E7E9F0] dark:border-slate-800">
            <Receipt className="w-4 h-4 text-[#081F62] dark:text-blue-400" />
            <h2 className="text-sm font-semibold text-[#051747] dark:text-slate-100">
              3. Business, Tax &amp; Web Credentials (Optional)
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormInput
              label="GSTIN (15 Digits)"
              name="gstin"
              value={form.gstin}
              onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
              error={errors.gstin}
              placeholder="e.g. 27AAACK1234M1Z5"
            />

            <FormInput
              label="PAN Number (10 Digits)"
              name="pan"
              value={form.pan}
              onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })}
              error={errors.pan}
              placeholder="e.g. AAACK1234M"
            />

            <FormInput
              label="Official Website URL"
              name="website"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              error={errors.website}
              placeholder="https://kalyanispecialtysteels.com"
            />
          </div>
        </div>

        {/* SECTION 4: STRUCTURED ADDRESSES */}
        <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-5 shadow-2xs space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E7E9F0] dark:border-slate-800">
            <MapPin className="w-4 h-4 text-[#081F62] dark:text-blue-400" />
            <h2 className="text-sm font-semibold text-[#051747] dark:text-slate-100">
              4. Facility &amp; Logistic Locations
            </h2>
          </div>

          {/* Plant / Facility Address */}
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-xs font-semibold text-[#051747] dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#081F62]" />
                <span>Plant / Manufacturing Facility Address (Primary)</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="sm:col-span-2 lg:col-span-2">
                <FormInput
                  label="Address Line 1"
                  name="plantAddress.line1"
                  value={form.plantAddress?.line1 || ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      plantAddress: { ...form.plantAddress, line1: e.target.value },
                    })
                  }
                  placeholder="Plot 44, Mundhwa Industrial Estate"
                />
              </div>
              <FormInput
                label="City"
                name="plantAddress.city"
                value={form.plantAddress?.city || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    plantAddress: { ...form.plantAddress, city: e.target.value },
                  })
                }
                placeholder="Pune"
              />
              <FormInput
                label="State"
                name="plantAddress.state"
                value={form.plantAddress?.state || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    plantAddress: { ...form.plantAddress, state: e.target.value },
                  })
                }
                placeholder="Maharashtra"
              />
              <FormInput
                label="PIN Code"
                name="plantAddress.pincode"
                value={form.plantAddress?.pincode || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    plantAddress: { ...form.plantAddress, pincode: e.target.value },
                  })
                }
                placeholder="411036"
              />
            </div>
          </div>

          {/* Billing Address */}
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-xs font-semibold text-[#051747] dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-[#081F62]" />
                <span>Billing Address (Invoicing)</span>
              </span>
              <button
                type="button"
                onClick={copyPlantToBilling}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 hover:border-[#081F62] text-xs font-semibold text-[#081F62] dark:text-blue-400 cursor-pointer transition-colors"
              >
                <Copy className="w-3 h-3" />
                Copy from Plant Address
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="sm:col-span-2 lg:col-span-2">
                <FormInput
                  label="Address Line 1"
                  name="billingAddress.line1"
                  value={form.billingAddress?.line1 || ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      billingAddress: { ...form.billingAddress, line1: e.target.value },
                    })
                  }
                  placeholder="Plot 44, Mundhwa Industrial Estate"
                />
              </div>
              <FormInput
                label="City"
                name="billingAddress.city"
                value={form.billingAddress?.city || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    billingAddress: { ...form.billingAddress, city: e.target.value },
                  })
                }
                placeholder="Pune"
              />
              <FormInput
                label="State"
                name="billingAddress.state"
                value={form.billingAddress?.state || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    billingAddress: { ...form.billingAddress, state: e.target.value },
                  })
                }
                placeholder="Maharashtra"
              />
              <FormInput
                label="PIN Code"
                name="billingAddress.pincode"
                value={form.billingAddress?.pincode || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    billingAddress: { ...form.billingAddress, pincode: e.target.value },
                  })
                }
                placeholder="411036"
              />
            </div>
          </div>

          {/* Shipping / Pickup Address */}
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-xs font-semibold text-[#051747] dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-[#081F62]" />
                <span>Shipping / Logistics Pickup Address</span>
              </span>
              <button
                type="button"
                onClick={copyBillingToShipping}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 hover:border-[#081F62] text-xs font-semibold text-[#081F62] dark:text-blue-400 cursor-pointer transition-colors"
              >
                <Copy className="w-3 h-3" />
                Copy from Billing Address
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="sm:col-span-2 lg:col-span-2">
                <FormInput
                  label="Address Line 1"
                  name="shippingAddress.line1"
                  value={form.shippingAddress?.line1 || ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      shippingAddress: { ...form.shippingAddress, line1: e.target.value },
                    })
                  }
                  placeholder="Gate 2 Logistics Bay, Mundhwa"
                />
              </div>
              <FormInput
                label="City"
                name="shippingAddress.city"
                value={form.shippingAddress?.city || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    shippingAddress: { ...form.shippingAddress, city: e.target.value },
                  })
                }
                placeholder="Pune"
              />
              <FormInput
                label="State"
                name="shippingAddress.state"
                value={form.shippingAddress?.state || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    shippingAddress: { ...form.shippingAddress, state: e.target.value },
                  })
                }
                placeholder="Maharashtra"
              />
              <FormInput
                label="PIN Code"
                name="shippingAddress.pincode"
                value={form.shippingAddress?.pincode || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    shippingAddress: { ...form.shippingAddress, pincode: e.target.value },
                  })
                }
                placeholder="411036"
              />
            </div>
          </div>
        </div>

        {/* SECTION 5: PURCHASE & PAYMENT TERMS */}
        <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E7E9F0] dark:border-slate-800">
            <CreditCard className="w-4 h-4 text-[#081F62] dark:text-blue-400" />
            <h2 className="text-sm font-semibold text-[#051747] dark:text-slate-100">
              5. Purchase, Payment &amp; Logistics Agreements
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormInput
              label="Standard Lead Time (Days)"
              name="leadTimeDays"
              type="number"
              min="0"
              required
              value={form.leadTimeDays}
              onChange={(e) => setForm({ ...form, leadTimeDays: e.target.value })}
              error={errors.leadTimeDays}
              placeholder="5"
            />

            <FormInput
              label="Minimum Order Quantity (MOQ)"
              name="moq"
              type="number"
              min="1"
              value={form.moq}
              onChange={(e) => setForm({ ...form, moq: e.target.value })}
              error={errors.moq}
              placeholder="e.g. 100"
            />

            <FormSelect
              label="Payment Terms"
              name="paymentTerms"
              required
              value={form.paymentTerms}
              onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
              options={PAYMENT_TERMS_OPTIONS}
            />
          </div>

          {form.paymentTerms === 'Custom' && (
            <div className="p-3.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/40 border border-[#081F62]/20">
              <FormInput
                label="Custom Credit Days (Period)"
                name="customPaymentDays"
                type="number"
                min="1"
                required
                value={form.customPaymentDays}
                onChange={(e) => setForm({ ...form, customPaymentDays: e.target.value })}
                error={errors.customPaymentDays}
                placeholder="e.g. 75"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <FormInput
                label="Credit Limit (Amount)"
                name="creditLimit"
                type="number"
                min="0"
                value={form.creditLimit}
                onChange={(e) => setForm({ ...form, creditLimit: e.target.value })}
                error={errors.creditLimit}
                placeholder="e.g. 2500000"
              />
              {form.creditLimit && Number(form.creditLimit) > 0 && (
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium block mt-1">
                  Limit: {formatCurrency(Number(form.creditLimit))}
                </span>
              )}
            </div>

            <FormSelect
              label="Preferred Currency"
              name="currency"
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              options={CURRENCY_OPTIONS}
            />

            <FormSelect
              label="Transport Responsibility"
              name="transportResponsibility"
              value={form.transportResponsibility}
              onChange={(e) => setForm({ ...form, transportResponsibility: e.target.value })}
              options={TRANSPORT_OPTIONS}
            />
          </div>
        </div>

        {/* SECTION 6: PROCUREMENT HISTORY (EDIT MODE ONLY) */}
        {isEdit && performance?.linkedPos && performance.linkedPos.length > 0 && (
          <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E7E9F0] dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[#081F62] dark:text-blue-400" />
                <h2 className="text-sm font-semibold text-[#051747] dark:text-slate-100">
                  6. Linked Purchase Order History ({performance.linkedPos.length})
                </h2>
              </div>
              <span className="text-xs text-slate-500">Live Procurement Ledger</span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {performance.linkedPos.map((po) => (
                <div
                  key={po.id}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs bg-slate-50/50 dark:bg-slate-800/30"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {po.poNumber}
                    </span>
                    <span className="text-slate-500">Order: {po.orderDate}</span>
                    <span className="text-slate-600 dark:text-slate-300">
                      ({po.items?.length || 0} line item{po.items?.length === 1 ? '' : 's'})
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-[#051747] dark:text-slate-200">
                      {formatCurrency(po.totalAmount)}
                    </span>
                    <StatusBadge status={po.status} size="xs" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Form Actions Bar */}
        <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <SecondaryButton
            type="button"
            icon={ArrowLeft}
            onClick={() => {
              if (form.name || form.contactPerson) {
                setConfirmCancelOpen(true);
              } else {
                navigate('/suppliers');
              }
            }}
          >
            Cancel &amp; Return to Directory
          </SecondaryButton>

          <div className="flex flex-wrap items-center gap-2.5">
            {!isEdit && (
              <>
                <SecondaryButton
                  type="button"
                  icon={RotateCcw}
                  onClick={() => setConfirmResetOpen(true)}
                >
                  Reset Form
                </SecondaryButton>
                <SecondaryButton
                  type="button"
                  icon={Plus}
                  onClick={(e) => handleSave(e, true)}
                >
                  Save &amp; Add Another
                </SecondaryButton>
              </>
            )}
            <PrimaryButton
              type="submit"
              icon={Save}
            >
              {isEdit ? 'Update Supplier Partner' : 'Save Supplier Partner'}
            </PrimaryButton>
          </div>
        </div>
      </form>

      {/* Confirmation Dialog: Reset Form */}
      <ConfirmationDialog
        isOpen={confirmResetOpen}
        onClose={() => setConfirmResetOpen(false)}
        onConfirm={handleConfirmReset}
        title="Reset Supplier Form"
        confirmLabel="Clear All Fields"
        variant="danger"
        message="Are you sure you want to reset this form? All entered supplier information will be cleared."
      />

      {/* Confirmation Dialog: Cancel Form */}
      <ConfirmationDialog
        isOpen={confirmCancelOpen}
        onClose={() => setConfirmCancelOpen(false)}
        onConfirm={() => navigate('/suppliers')}
        title="Discard Unsaved Changes"
        confirmLabel="Leave Page"
        variant="danger"
        message="Are you sure you want to return to the supplier directory? Any unsaved entries will be discarded."
      />
    </div>
  );
}
