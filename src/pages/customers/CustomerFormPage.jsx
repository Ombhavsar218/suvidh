import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Building2, UserCheck, Package } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { PrimaryButton, SecondaryButton } from '../../components/common/Buttons';
import { EmptyState } from '../../components/common/States';
import { FormInput, FormSelect, FormTextarea } from '../../components/forms/FormFields';
import { useErpData } from '../../context/ErpDataContext';
import { validateRequired, validateEmail } from '../../utils/validators';

export function CustomerFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { customers, products, saveCustomer } = useErpData();

  const isEdit = Boolean(id);
  const existingCustomer = isEdit ? customers.find((c) => c.id === id) : null;

  const [form, setForm] = useState(() => {
    if (existingCustomer) {
      return {
        code: existingCustomer.code || '',
        name: existingCustomer.name || '',
        contactPerson: existingCustomer.contactPerson || '',
        email: existingCustomer.email || '',
        phone: existingCustomer.phone || '',
        address: existingCustomer.address || '',
        priorityTier: existingCustomer.priorityTier || 'High',
        status: existingCustomer.status || 'Active',
        associatedProductIds: existingCustomer.associatedProductIds || [],
      };
    }
    return {
      code: `CUS-NEW-${String(customers.length + 1).padStart(2, '0')}`,
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      priorityTier: 'High',
      status: 'Active',
      associatedProductIds: [],
    };
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isEdit && existingCustomer) {
      setForm({
        code: existingCustomer.code || '',
        name: existingCustomer.name || '',
        contactPerson: existingCustomer.contactPerson || '',
        email: existingCustomer.email || '',
        phone: existingCustomer.phone || '',
        address: existingCustomer.address || '',
        priorityTier: existingCustomer.priorityTier || 'High',
        status: existingCustomer.status || 'Active',
        associatedProductIds: existingCustomer.associatedProductIds || [],
      });
    }
  }, [isEdit, existingCustomer]);

  if (isEdit && !existingCustomer) {
    return (
      <EmptyState
        title="Customer Not Found"
        description="The customer account you are attempting to edit does not exist in local demo data."
        action={
          <SecondaryButton icon={ArrowLeft} onClick={() => navigate('/customers')}>
            Back to Customers
          </SecondaryButton>
        }
      />
    );
  }

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const toggleProduct = (productId) => {
    setForm((prev) => {
      const exists = prev.associatedProductIds.includes(productId);
      return {
        ...prev,
        associatedProductIds: exists
          ? prev.associatedProductIds.filter((pId) => pId !== productId)
          : [...prev.associatedProductIds, productId],
      };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const codeError =
      validateRequired(form.code, 'Customer code') ||
      (customers.some(
        (c) =>
          (!isEdit || c.id !== id) &&
          c.code.toLowerCase() === form.code.trim().toLowerCase()
      )
        ? 'A customer with this code already exists.'
        : '');

    const nextErrors = {
      code: codeError,
      name: validateRequired(form.name, 'Customer name'),
      contactPerson: validateRequired(form.contactPerson, 'Contact person'),
      email: validateEmail(form.email),
      phone: validateRequired(form.phone, 'Phone'),
      address: validateRequired(form.address, 'Address'),
    };

    const filtered = Object.fromEntries(
      Object.entries(nextErrors).filter(([, v]) => Boolean(v))
    );
    if (Object.keys(filtered).length > 0) {
      setErrors(filtered);
      return;
    }

    const tierScoreMap = { Critical: 95, High: 82, Medium: 68, Low: 45 };
    const payload = {
      ...(existingCustomer || {}),
      ...form,
      code: form.code.trim(),
      name: form.name.trim(),
      contactPerson: form.contactPerson.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      priorityScore: tierScoreMap[form.priorityTier] || 75,
    };

    if (isEdit) {
      payload.id = existingCustomer.id;
    }

    saveCustomer(payload);
    navigate(isEdit ? `/customers/${existingCustomer.id}` : '/customers');
  };

  const backDestination = isEdit ? `/customers/${existingCustomer.id}` : '/customers';

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? `Edit Customer — ${existingCustomer.name}` : 'Add New Customer'}
        description={
          isEdit
            ? `Update account details, point of contact, and supplied products for ${existingCustomer.code}.`
            : 'Create a new OEM customer account, primary point of contact, billing address, and product links.'
        }
        actions={
          <SecondaryButton icon={ArrowLeft} onClick={() => navigate(backDestination)}>
            {isEdit ? 'Back to Details' : 'Back to Customers'}
          </SecondaryButton>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Primary Account & Contact Form */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-5 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 pb-2.5 border-b border-[#E7E9F0] dark:border-slate-800">
                <Building2 className="w-4 h-4 text-[#081F62] dark:text-blue-400" />
                <h2 className="text-sm font-semibold text-[#051747] dark:text-slate-100">
                  Account &amp; Classification
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormInput
                  label="Customer Code"
                  name="code"
                  required
                  placeholder="e.g. CUS-BFL-09"
                  value={form.code}
                  onChange={(e) => updateField('code', e.target.value)}
                  error={errors.code}
                />
                <FormInput
                  label="Customer Name"
                  name="name"
                  required
                  placeholder="e.g. Bharat Forge Components"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  error={errors.name}
                />
                <FormSelect
                  label="Priority Tier"
                  name="priorityTier"
                  placeholder={null}
                  value={form.priorityTier}
                  onChange={(e) => updateField('priorityTier', e.target.value)}
                  options={['Critical', 'High', 'Medium', 'Low']}
                />
                <FormSelect
                  label="Account Status"
                  name="status"
                  placeholder={null}
                  value={form.status}
                  onChange={(e) => updateField('status', e.target.value)}
                  options={['Active', 'Inactive']}
                />
              </div>
            </div>

            <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-5 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 pb-2.5 border-b border-[#E7E9F0] dark:border-slate-800">
                <UserCheck className="w-4 h-4 text-[#081F62] dark:text-blue-400" />
                <h2 className="text-sm font-semibold text-[#051747] dark:text-slate-100">
                  Contact Details &amp; Address
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormInput
                  label="Contact Person"
                  name="contactPerson"
                  required
                  placeholder="Full name"
                  value={form.contactPerson}
                  onChange={(e) => updateField('contactPerson', e.target.value)}
                  error={errors.contactPerson}
                />
                <FormInput
                  label="Work Email"
                  name="email"
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  error={errors.email}
                />
                <FormInput
                  label="Phone Number"
                  name="phone"
                  required
                  placeholder="+91 98XXX XXXXX"
                  value={form.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  error={errors.phone}
                />
                <FormTextarea
                  label="Plant / Billing Address"
                  name="address"
                  required
                  rows={3}
                  className="sm:col-span-2"
                  placeholder="Street, MIDC / Industrial Area, City, PIN Code"
                  value={form.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  error={errors.address}
                />
              </div>
            </div>
          </div>

          {/* Linked Products Sidebar */}
          <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-5 shadow-2xs flex flex-col self-start h-fit">
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#E7E9F0] dark:border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-[#081F62] dark:text-blue-400" />
                <h2 className="text-sm font-semibold text-[#051747] dark:text-slate-100">
                  Supplied Products
                </h2>
              </div>
              <span className="text-[11px] font-medium text-[#535F80] dark:text-slate-400 tabular-nums">
                {form.associatedProductIds.length} selected
              </span>
            </div>

            <p className="text-xs text-[#535F80] dark:text-slate-400 mb-3">
              Optionally link finished components supplied to this customer.
            </p>

            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {products.map((prod) => {
                const checked = form.associatedProductIds.includes(prod.id);
                return (
                  <label
                    key={prod.id}
                    className={`flex items-start gap-2.5 p-2.5 rounded-md border text-xs cursor-pointer transition-colors ${
                      checked
                        ? 'border-[#081F62] bg-[#E7E9F0]/60 dark:bg-blue-950/30'
                        : 'border-[#535F80]/20 dark:border-slate-800 hover:bg-[#E7E9F0]/35 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleProduct(prod.id)}
                      className="mt-0.5 rounded border-[#535F80]/40 text-[#081F62] focus:ring-[#081F62]"
                    />
                    <div className="min-w-0">
                      <div className="font-medium text-[#051747] dark:text-slate-100 truncate">
                        {prod.name}
                      </div>
                      <div className="text-[11px] text-[#535F80] dark:text-slate-400 font-mono">
                        {prod.code} · {prod.category}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg px-5 py-3.5 flex items-center justify-between gap-3">
          <span className="text-xs text-[#535F80] dark:text-slate-400">
            Fields marked with <span className="text-red-500">*</span> are required. Saved locally in browser LocalStorage.
          </span>
          <div className="flex items-center gap-2.5 shrink-0">
            <SecondaryButton onClick={() => navigate(backDestination)}>Cancel</SecondaryButton>
            <PrimaryButton type="submit" icon={Save}>
              {isEdit ? 'Save Changes' : 'Create Customer'}
            </PrimaryButton>
          </div>
        </div>
      </form>
    </div>
  );
}
