import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Eye,
  Edit2,
  Trash2,
  LayoutGrid,
  List,
  Building2,
  ShieldCheck,
  Clock,
  Star,
  User,
  Mail,
  Phone,
  MapPin,
  X,
  Truck,
  ShoppingBag,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { PrimaryButton, SecondaryButton } from '../../components/common/Buttons';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { Tooltip } from '../../components/common/Tooltip';
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog';
import { DataTable } from '../../components/tables/DataTable';
import { SearchInput, FilterDropdown } from '../../components/forms/Filters';
import { StatCard } from '../../components/dashboard/StatCard';
import { Pagination } from '../../components/common/Pagination';
import { EmptyState } from '../../components/common/States';
import { FormInput, FormSelect, FormTextarea } from '../../components/forms/FormFields';
import { useErpData } from '../../context/ErpDataContext';
import { useTableState } from '../../hooks/useTableState';
import { validateRequired, validateEmail } from '../../utils/validators';
import { formatCurrency, formatNumber } from '../../utils/formatters';

const CATEGORY_STYLES = {
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
};

function getSupplierInitials(name) {
  if (!name) return 'SP';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const EMPTY_FORM = {
  code: '',
  name: '',
  contactPerson: '',
  email: '',
  phone: '',
  address: '',
  category: 'Alloy & Stainless Steel',
  leadTimeDays: 5,
  rating: 4.5,
  status: 'Active',
};

export function SuppliersPage() {
  const navigate = useNavigate();
  const {
    suppliers = [],
    purchaseOrders = [],
    saveSupplier,
    deleteSupplier,
  } = useErpData();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [viewTarget, setViewTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'

  // KPI Metrics
  const activeCount = useMemo(
    () => suppliers.filter((s) => s.status === 'Active').length,
    [suppliers]
  );

  const avgLeadTime = useMemo(() => {
    if (suppliers.length === 0) return 0;
    const total = suppliers.reduce((acc, s) => acc + (Number(s.leadTimeDays) || 0), 0);
    return Math.round((total / suppliers.length) * 10) / 10;
  }, [suppliers]);

  const avgRating = useMemo(() => {
    if (suppliers.length === 0) return 0;
    const total = suppliers.reduce((acc, s) => acc + (Number(s.rating) || 0), 0);
    return (total / suppliers.length).toFixed(1);
  }, [suppliers]);

  const categories = useMemo(
    () => Array.from(new Set(suppliers.map((s) => s.category).filter(Boolean))),
    [suppliers]
  );

  const table = useTableState(suppliers, {
    initialPageSize: 8,
    initialSortKey: 'name',
    searchFields: ['code', 'name', 'contactPerson', 'category', 'email', 'phone', 'address'],
  });

  const hasActiveFilters = Boolean(
    table.search || table.filters.category || table.filters.status
  );

  const openAdd = () => {
    setForm({
      ...EMPTY_FORM,
      code: `SUP-NEW-${String(suppliers.length + 1).padStart(2, '0')}`,
    });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (sup, e) => {
    e?.stopPropagation();
    setForm(sup);
    setErrors({});
    setModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const nextErrors = {
      code: validateRequired(form.code, 'Supplier code'),
      name: validateRequired(form.name, 'Supplier name'),
      contactPerson: validateRequired(form.contactPerson, 'Contact person'),
      email: validateEmail(form.email),
    };
    const filtered = Object.fromEntries(
      Object.entries(nextErrors).filter(([, v]) => Boolean(v))
    );
    if (Object.keys(filtered).length > 0) {
      setErrors(filtered);
      return;
    }

    saveSupplier({
      ...form,
      leadTimeDays: Number(form.leadTimeDays || 5),
      rating: Number(form.rating || 4.5),
    });
    setModalOpen(false);
  };

  const columns = [
    {
      key: 'code',
      label: 'Supplier Code',
      sortable: true,
      width: '130px',
      cellClassName: 'whitespace-nowrap',
      render: (r) => (
        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap inline-block">
          {r.code}
        </span>
      ),
    },
    {
      key: 'name',
      label: 'Supplier Name & Category',
      sortable: true,
      render: (r) => (
        <div>
          <div className="font-medium text-[#051747] dark:text-slate-100">{r.name}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                CATEGORY_STYLES[r.category] ||
                'bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              {r.category}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'contactPerson',
      label: 'Contact Person',
      sortable: true,
      render: (r) => (
        <div className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
          <User className="w-3.5 h-3.5 text-[#535F80]" />
          <span>{r.contactPerson}</span>
        </div>
      ),
    },
    {
      key: 'contactInfo',
      label: 'Contact Details',
      render: (r) => (
        <div className="text-xs space-y-0.5">
          <div className="text-slate-600 dark:text-slate-300 font-mono text-[11px] truncate max-w-[190px]">
            {r.email}
          </div>
          <div className="text-[#535F80] dark:text-slate-400 tabular-nums">
            {r.phone}
          </div>
        </div>
      ),
    },
    {
      key: 'leadTimeDays',
      label: 'Lead Time',
      sortable: true,
      align: 'right',
      numeric: true,
      render: (r) => (
        <div className="inline-flex items-center gap-1 text-xs text-slate-700 dark:text-slate-300 tabular-nums">
          <Clock className="w-3.5 h-3.5 text-[#535F80]" />
          <span>{r.leadTimeDays} days</span>
        </div>
      ),
    },
    {
      key: 'rating',
      label: 'Rating',
      sortable: true,
      align: 'right',
      numeric: true,
      render: (r) => (
        <span className="inline-flex items-center gap-1 text-xs font-semibold tabular-nums text-amber-700 dark:text-amber-400">
          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          {r.rating?.toFixed(1) || '4.0'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'left',
      render: (r) => (
        <div
          className="inline-flex items-center justify-start gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Tooltip content="Quick View Supplier">
            <button
              type="button"
              onClick={() => setViewTarget(r)}
              className="p-1.5 rounded hover:bg-[#E7E9F0]/70 dark:hover:bg-slate-800 text-[#535F80] hover:text-[#081F62] cursor-pointer"
              aria-label="View Supplier Details"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <Tooltip content="Edit Supplier">
            <button
              type="button"
              onClick={(e) => openEdit(r, e)}
              className="p-1.5 rounded hover:bg-[#E7E9F0]/70 dark:hover:bg-slate-800 text-[#535F80] hover:text-[#081F62] cursor-pointer"
              aria-label="Edit Supplier"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <Tooltip content="Delete Supplier">
            <button
              type="button"
              onClick={() => setDeleteTarget(r)}
              className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 cursor-pointer"
              aria-label="Delete Supplier"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Suppliers & Vendors"
        description="Approved raw material vendors, delivery lead times, supply categories, and performance ratings."
        actions={
          <div className="flex items-center gap-2">
            <SecondaryButton icon={ShoppingBag} onClick={() => navigate('/purchases')}>
              Purchase Orders
            </SecondaryButton>
            <PrimaryButton icon={Plus} onClick={openAdd}>
              Add Supplier
            </PrimaryButton>
          </div>
        }
      />

      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Vendors"
          value={suppliers.length}
          sublabel="Approved supplier partners"
          icon={Building2}
          tone="navy"
        />
        <StatCard
          label="Active Suppliers"
          value={activeCount}
          sublabel={`${
            suppliers.length > 0 ? Math.round((activeCount / suppliers.length) * 100) : 0
          }% ready for procurement`}
          icon={ShieldCheck}
          tone="emerald"
        />
        <StatCard
          label="Avg Lead Time"
          value={`${avgLeadTime}d`}
          sublabel="Procurement fulfillment days"
          icon={Clock}
          tone="slate"
        />
        <StatCard
          label="Avg Performance"
          value={`${avgRating} ★`}
          sublabel="Quality & timeliness score"
          icon={Star}
          tone="amber"
        />
      </div>

      {/* Control & Filter Toolbar */}
      <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <SearchInput
            value={table.search}
            onChange={table.setSearch}
            placeholder="Search supplier code, name, category, contact, email, address..."
            className="w-full sm:w-96 md:w-[420px] lg:w-[480px]"
          />
          <FilterDropdown
            label="Category"
            value={table.filters.category}
            onChange={(val) => table.setFilter('category', val)}
            options={categories}
          />
          <FilterDropdown
            label="Status"
            value={table.filters.status}
            onChange={(val) => table.setFilter('status', val)}
            options={['Active', 'Inactive']}
          />
          {hasActiveFilters && (
            <button
              type="button"
              onClick={table.resetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 bg-[#E7E9F0]/60 dark:bg-slate-800 rounded-md cursor-pointer transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-[#535F80] dark:text-slate-400 hidden sm:inline">
            Showing <strong className="text-[#051747] dark:text-slate-200">{table.totalItems}</strong> supplier{table.totalItems === 1 ? '' : 's'}
          </span>
          <div className="inline-flex items-center rounded-lg border border-[#535F80]/25 dark:border-slate-800 p-0.5 bg-[#FEFEFE] dark:bg-slate-900">
            <Tooltip content="Table View">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                  viewMode === 'table'
                    ? 'bg-[#051747] text-[#FEFEFE] shadow-2xs'
                    : 'text-[#535F80] hover:text-[#051747] dark:hover:text-slate-200'
                }`}
                aria-label="Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </Tooltip>
            <Tooltip content="Card View">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-[#051747] text-[#FEFEFE] shadow-2xs'
                    : 'text-[#535F80] hover:text-[#051747] dark:hover:text-slate-200'
                }`}
                aria-label="Card View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Main Content: Card Grid View or Table View */}
      {viewMode === 'grid' ? (
        table.paginatedData.length === 0 ? (
          <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-xl p-8">
            <EmptyState
              icon={Truck}
              title="No suppliers match your criteria"
              description="Try adjusting your search terms or clearing your filters to view registered suppliers."
              action={
                hasActiveFilters ? (
                  <SecondaryButton onClick={table.resetFilters}>
                    Clear Filters
                  </SecondaryButton>
                ) : (
                  <PrimaryButton icon={Plus} onClick={openAdd}>
                    Add Supplier
                  </PrimaryButton>
                )
              }
            />
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {table.paginatedData.map((sup) => {
                const linkedPos = purchaseOrders.filter((po) => po.supplierId === sup.id);

                return (
                  <div
                    key={sup.id}
                    className="group relative bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 hover:border-[#081F62]/60 dark:hover:border-blue-500/60 rounded-xl p-5 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#051747] dark:bg-blue-900/60 text-[#FEFEFE] flex items-center justify-center font-bold text-xs tracking-wider shrink-0 shadow-2xs">
                            {getSupplierInitials(sup.name)}
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm text-[#051747] dark:text-slate-100 group-hover:text-[#081F62] transition-colors leading-tight line-clamp-1">
                              {sup.name}
                            </h3>
                            <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap inline-block mt-0.5">
                              {sup.code}
                            </span>
                          </div>
                        </div>
                        <StatusBadge status={sup.status} />
                      </div>

                      {/* Category Badge */}
                      <div className="mb-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                            CATEGORY_STYLES[sup.category] ||
                            'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {sup.category}
                        </span>
                      </div>

                      {/* Contact & Location Info Card */}
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 mb-4">
                        <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
                          <User className="w-3.5 h-3.5 text-[#535F80] shrink-0" />
                          <span className="truncate">{sup.contactPerson}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-[#535F80] shrink-0" />
                          <span className="font-mono text-[11px] truncate">{sup.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-[#535F80] shrink-0" />
                          <span className="tabular-nums">{sup.phone}</span>
                        </div>
                        {sup.address && (
                          <div className="flex items-start gap-2 pt-1 border-t border-slate-200 dark:border-slate-700/60 text-[11px] text-[#535F80] dark:text-slate-400">
                            <MapPin className="w-3.5 h-3.5 text-[#535F80] shrink-0 mt-0.5" />
                            <span className="line-clamp-1">{sup.address}</span>
                          </div>
                        )}
                      </div>

                      {/* 3-Column Micro Metrics */}
                      <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/15 dark:border-slate-800 mb-4 text-center">
                        <div>
                          <div className="text-[10px] text-[#535F80] dark:text-slate-400 font-medium">
                            Lead Time
                          </div>
                          <div className="text-xs font-bold text-[#051747] dark:text-slate-200 tabular-nums mt-0.5">
                            {sup.leadTimeDays}d
                          </div>
                        </div>
                        <div className="border-x border-[#535F80]/15 dark:border-slate-800">
                          <div className="text-[10px] text-[#535F80] dark:text-slate-400 font-medium">
                            Rating
                          </div>
                          <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 inline-flex items-center justify-center gap-0.5 mt-0.5">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                            <span>{sup.rating?.toFixed(1) || '4.0'}</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-[#535F80] dark:text-slate-400 font-medium">
                            Purchase Orders
                          </div>
                          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 tabular-nums mt-0.5">
                            {linkedPos.length}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="pt-3 border-t border-[#535F80]/15 dark:border-slate-800 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setViewTarget(sup)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#081F62] hover:text-[#051747] dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Quick View
                      </button>

                      <div className="flex items-center gap-1">
                        <Tooltip content="Edit Supplier">
                          <button
                            type="button"
                            onClick={(e) => openEdit(sup, e)}
                            className="p-1.5 rounded hover:bg-[#E7E9F0]/70 dark:hover:bg-slate-800 text-[#535F80] hover:text-[#081F62] cursor-pointer"
                            aria-label="Edit Supplier"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </Tooltip>
                        <Tooltip content="Delete Supplier">
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(sup)}
                            className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 cursor-pointer"
                            aria-label="Delete Supplier"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4">
              <Pagination
                page={table.page}
                totalPages={table.totalPages}
                totalItems={table.totalItems}
                pageSize={table.pageSize}
                onPageChange={table.setPage}
                onPageSizeChange={table.setPageSize}
              />
            </div>
          </div>
        )
      ) : (
        <DataTable
          columns={columns}
          data={table.paginatedData}
          sortKey={table.sortKey}
          sortDir={table.sortDir}
          onSort={table.handleSort}
          pagination={{
            page: table.page,
            totalPages: table.totalPages,
            totalItems: table.totalItems,
            pageSize: table.pageSize,
            onPageChange: table.setPage,
            onPageSizeChange: table.setPageSize,
          }}
        />
      )}

      {/* Quick View Modal */}
      {viewTarget && (
        <Modal
          isOpen={Boolean(viewTarget)}
          onClose={() => setViewTarget(null)}
          title="Supplier Profile & Details"
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <SecondaryButton onClick={() => setViewTarget(null)}>
                Close
              </SecondaryButton>
              <div className="flex items-center gap-2">
                <SecondaryButton
                  icon={ShoppingBag}
                  onClick={() => {
                    setViewTarget(null);
                    navigate('/purchases');
                  }}
                >
                  View Purchase Orders
                </SecondaryButton>
                <PrimaryButton
                  icon={Edit2}
                  onClick={() => {
                    const target = viewTarget;
                    setViewTarget(null);
                    openEdit(target);
                  }}
                >
                  Edit Supplier
                </PrimaryButton>
              </div>
            </div>
          }
        >
          <div className="space-y-5">
            {/* Header info card */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#051747] dark:bg-blue-900/60 text-[#FEFEFE] flex items-center justify-center font-bold text-sm tracking-wider shadow-sm">
                  {getSupplierInitials(viewTarget.name)}
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#051747] dark:text-slate-100">
                    {viewTarget.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700 text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {viewTarget.code}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${
                        CATEGORY_STYLES[viewTarget.category] ||
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {viewTarget.category}
                    </span>
                  </div>
                </div>
              </div>
              <StatusBadge status={viewTarget.status} />
            </div>

            {/* Contact Person & Address */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-lg border border-[#535F80]/20 dark:border-slate-800 bg-[#FEFEFE] dark:bg-slate-900 space-y-2">
                <span className="text-xs font-semibold text-[#535F80] dark:text-slate-400 block uppercase tracking-wider">
                  Contact Information
                </span>
                <div className="text-sm font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <User className="w-4 h-4 text-[#081F62]" />
                  <span>{viewTarget.contactPerson}</span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#535F80]" />
                  <span className="font-mono">{viewTarget.email}</span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#535F80]" />
                  <span className="tabular-nums">{viewTarget.phone}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-[#535F80]/20 dark:border-slate-800 bg-[#FEFEFE] dark:bg-slate-900 space-y-2">
                <span className="text-xs font-semibold text-[#535F80] dark:text-slate-400 block uppercase tracking-wider">
                  Plant & Office Location
                </span>
                <div className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2 leading-relaxed">
                  <MapPin className="w-4 h-4 text-[#081F62] shrink-0 mt-0.5" />
                  <span>{viewTarget.address || 'Address not registered'}</span>
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-[#535F80]">Standard Lead Time:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {viewTarget.leadTimeDays} days
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#535F80]">Vendor Score:</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    {viewTarget.rating?.toFixed(1) || '4.0'} / 5.0
                  </span>
                </div>
              </div>
            </div>

            {/* Linked Purchase Orders Summary */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#051747] dark:text-slate-200 mb-2.5">
                Procurement History & Orders
              </h4>
              {purchaseOrders.filter((po) => po.supplierId === viewTarget.id).length === 0 ? (
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs text-center text-slate-500">
                  No purchase orders recorded with this supplier yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {purchaseOrders
                    .filter((po) => po.supplierId === viewTarget.id)
                    .map((po) => (
                      <div
                        key={po.id}
                        className="p-2.5 rounded-lg border border-[#535F80]/15 dark:border-slate-800 flex items-center justify-between text-xs bg-[#FEFEFE] dark:bg-slate-900"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                            {po.poNumber}
                          </span>
                          <span className="text-slate-500">{po.orderDate}</span>
                          <span className="text-slate-600 dark:text-slate-300">
                            ({po.items?.length || 0} line items)
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-[#051747] dark:text-slate-200">
                            {formatCurrency(po.totalAmount)}
                          </span>
                          <StatusBadge status={po.status} />
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Add / Edit Supplier Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? 'Edit Supplier' : 'Add Supplier'}
        size="lg"
        footer={
          <>
            <SecondaryButton onClick={() => setModalOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={handleSave}>Save Supplier</PrimaryButton>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput
              label="Supplier Code"
              name="code"
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              error={errors.code}
            />
            <FormInput
              label="Supplier Name"
              name="name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              error={errors.name}
            />
            <FormSelect
              label="Supply Category"
              name="category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              options={[
                'Alloy & Stainless Steel',
                'Grey Iron Castings',
                'Aluminum & Bronze',
                'Seals, O-Rings & Fasteners',
                'Hard Chrome Rods & Consumables',
              ]}
            />
            <FormSelect
              label="Partner Status"
              name="status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={['Active', 'Inactive']}
            />
            <FormInput
              label="Contact Person"
              name="contactPerson"
              required
              value={form.contactPerson}
              onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
              error={errors.contactPerson}
            />
            <FormInput
              label="Email Address"
              name="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              error={errors.email}
            />
            <FormInput
              label="Phone Number"
              name="phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <FormInput
              label="Standard Lead Time (Days)"
              name="leadTimeDays"
              type="number"
              min="1"
              value={form.leadTimeDays}
              onChange={(e) => setForm({ ...form, leadTimeDays: e.target.value })}
            />
            <FormInput
              label="Quality Rating (0 - 5.0)"
              name="rating"
              type="number"
              step="0.1"
              min="0"
              max="5"
              value={form.rating}
              onChange={(e) => setForm({ ...form, rating: e.target.value })}
            />
          </div>

          <FormTextarea
            label="Plant / Facility Address"
            name="address"
            rows={2}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="e.g. MIDC Chakan Phase I, Pune 410501"
          />
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteSupplier(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        title="Delete Supplier"
        message={`Are you sure you want to delete supplier "${deleteTarget?.code}" (${deleteTarget?.name})? This will remove the vendor from your local records.`}
        confirmLabel="Delete Supplier"
        cancelLabel="Keep Supplier"
        variant="danger"
      />
    </div>
  );
}
