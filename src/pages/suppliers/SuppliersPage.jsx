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
  ShoppingBag,
  CheckCircle2,
  AlertTriangle,
  Globe,
  CreditCard,
  Receipt,
  ExternalLink,
  Power,
  ShieldAlert,
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
import { useErpData } from '../../context/ErpDataContext';
import { useApp } from '../../context/AppContext';
import { useTableState } from '../../hooks/useTableState';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  SUPPLIER_TYPES,
  SUPPLIER_CATEGORIES,
  CATEGORY_STYLES,
  TYPE_STYLES,
  getSupplierInitials,
  formatAddress,
  computeSupplierPerformance,
} from './supplierUtils';

export function SuppliersPage() {
  const navigate = useNavigate();
  const { addToast } = useApp();
  const {
    suppliers = [],
    purchaseOrders = [],
    qualityInspections = [],
    saveSupplier,
    deleteSupplier,
  } = useErpData();

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

  // Dynamic filter lists
  const availableTypes = useMemo(() => SUPPLIER_TYPES, []);

  const availableCategories = useMemo(() => {
    const set = new Set(SUPPLIER_CATEGORIES);
    suppliers.forEach((s) => {
      if (s.category) set.add(s.category);
      if (Array.isArray(s.categories)) s.categories.forEach((c) => set.add(c));
    });
    return Array.from(set);
  }, [suppliers]);

  // Enhanced table state with multi-field search
  const table = useTableState(suppliers, {
    initialPageSize: 8,
    initialSortKey: 'name',
    searchFields: [
      'code',
      'name',
      'supplierType',
      'contactPerson',
      'category',
      'email',
      'phone',
      'gstin',
      'pan',
      'address',
    ],
  });

  // Filter application
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      // Type filter
      if (table.filters.supplierType && s.supplierType !== table.filters.supplierType) {
        return false;
      }
      // Category filter
      if (table.filters.category) {
        const matchesCategory =
          s.category === table.filters.category ||
          (Array.isArray(s.categories) && s.categories.includes(table.filters.category));
        if (!matchesCategory) return false;
      }
      // Status filter
      if (table.filters.status && s.status !== table.filters.status) {
        return false;
      }
      return true;
    });
  }, [suppliers, table.filters]);

  const hasActiveFilters = Boolean(
    table.search ||
      table.filters.category ||
      table.filters.status ||
      table.filters.supplierType
  );

  // Navigate to Add Supplier Page
  const openAdd = () => {
    navigate('/suppliers/new');
  };

  // Navigate to Edit Supplier Page
  const openEdit = (sup, e) => {
    e?.stopPropagation();
    navigate(`/suppliers/${sup.id}/edit`);
  };

  // Toggle Active / Inactive Partner Status
  const handleToggleStatus = (sup, e) => {
    e?.stopPropagation();
    const nextStatus = sup.status === 'Active' ? 'Inactive' : 'Active';
    saveSupplier({
      ...sup,
      status: nextStatus,
    });
    addToast({
      title: `Supplier ${nextStatus}`,
      message: `"${sup.name}" is now marked as ${nextStatus}.`,
      type: nextStatus === 'Active' ? 'success' : 'info',
    });
  };

  // Delete Click: Check if referenced in POs or Transactions
  const handleDeleteClick = (sup, e) => {
    e?.stopPropagation();
    setDeleteTarget(sup);
  };

  // Check if deleteTarget is protected by active references
  const deleteTargetLinkedPos = useMemo(() => {
    if (!deleteTarget) return [];
    return purchaseOrders.filter((po) => po.supplierId === deleteTarget.id);
  }, [deleteTarget, purchaseOrders]);

  // Columns definition for DataTable
  const columns = [
    {
      key: 'code',
      label: 'Supplier Code',
      sortable: true,
      width: '130px',
      cellClassName: 'whitespace-nowrap',
      render: (r) => (
        <span className="font-mono text-xs font-semibold text-[#081F62] dark:text-blue-400 whitespace-nowrap inline-block">
          {r.code}
        </span>
      ),
    },
    {
      key: 'name',
      label: 'Supplier Name & Type',
      sortable: true,
      render: (r) => (
        <div>
          <div className="font-medium text-[#051747] dark:text-slate-100">{r.name}</div>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                TYPE_STYLES[r.supplierType] || TYPE_STYLES.Other
              }`}
            >
              {r.supplierType || 'Manufacturer'}
            </span>
            <span
              className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                CATEGORY_STYLES[r.category] ||
                'bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              {r.category}
            </span>
            {Array.isArray(r.categories) && r.categories.length > 1 && (
              <span className="text-[10px] text-slate-500 font-medium">
                +{r.categories.length - 1} more
              </span>
            )}
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
      label: 'Quality Rating',
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
      label: 'Partner Status',
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
          <Tooltip content="View Supplier Profile">
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
          <Tooltip content={r.status === 'Active' ? 'Deactivate Partner' : 'Activate Partner'}>
            <button
              type="button"
              onClick={(e) => handleToggleStatus(r, e)}
              className={`p-1.5 rounded cursor-pointer transition-colors ${
                r.status === 'Active'
                  ? 'hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-600'
                  : 'hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600'
              }`}
              aria-label={r.status === 'Active' ? 'Deactivate' : 'Activate'}
            >
              <Power className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <Tooltip content="Delete Supplier">
            <button
              type="button"
              onClick={(e) => handleDeleteClick(r, e)}
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

  // Calculated Performance for the ViewTarget Modal
  const viewTargetPerformance = useMemo(() => {
    return computeSupplierPerformance(viewTarget, purchaseOrders, qualityInspections);
  }, [viewTarget, purchaseOrders, qualityInspections]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Suppliers &amp; Vendors"
        description="Approved raw material manufacturers, distributors, dealers, tax credentials, payment terms, and procurement performance."
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
            placeholder="Search supplier code, name, type, contact person, email, GSTIN, PAN..."
            className="w-full sm:w-80 md:w-[380px]"
          />
          <FilterDropdown
            label="Supplier Type"
            value={table.filters.supplierType}
            onChange={(val) => table.setFilter('supplierType', val)}
            options={availableTypes}
          />
          <FilterDropdown
            label="Category"
            value={table.filters.category}
            onChange={(val) => table.setFilter('category', val)}
            options={availableCategories}
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
            Showing <strong className="text-[#051747] dark:text-slate-200">{filteredSuppliers.length}</strong> supplier{filteredSuppliers.length === 1 ? '' : 's'}
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
                const perf = computeSupplierPerformance(sup, purchaseOrders, qualityInspections);

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
                            <span className="font-mono text-xs font-semibold text-[#081F62] dark:text-blue-400 whitespace-nowrap inline-block mt-0.5">
                              {sup.code}
                            </span>
                          </div>
                        </div>
                        <StatusBadge status={sup.status} />
                      </div>

                      {/* Type & Category Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                            TYPE_STYLES[sup.supplierType] || TYPE_STYLES.Other
                          }`}
                        >
                          {sup.supplierType || 'Manufacturer'}
                        </span>
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
                            {perf?.totalPurchaseOrders || 0}
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
                        View Profile
                      </button>

                      <div className="flex items-center gap-1">
                        <Tooltip content={sup.status === 'Active' ? 'Deactivate Partner' : 'Activate Partner'}>
                          <button
                            type="button"
                            onClick={(e) => handleToggleStatus(sup, e)}
                            className={`p-1.5 rounded cursor-pointer transition-colors ${
                              sup.status === 'Active'
                                ? 'hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-600'
                                : 'hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600'
                            }`}
                            aria-label={sup.status === 'Active' ? 'Deactivate' : 'Activate'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        </Tooltip>
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
                            onClick={(e) => handleDeleteClick(sup, e)}
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

      {/* ============================================================== */}
      {/* QUICK VIEW / SUPPLIER DETAILS MODAL                           */}
      {/* ============================================================== */}
      {viewTarget && (
        <Modal
          isOpen={Boolean(viewTarget)}
          onClose={() => setViewTarget(null)}
          title="Supplier Profile &amp; Business Information"
          size="xl"
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
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-[#081F62] dark:text-blue-300">
                      {viewTarget.code}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${
                        TYPE_STYLES[viewTarget.supplierType] || TYPE_STYLES.Other
                      }`}
                    >
                      {viewTarget.supplierType || 'Manufacturer'}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${
                        CATEGORY_STYLES[viewTarget.category] ||
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {viewTarget.category}
                    </span>
                    {Array.isArray(viewTarget.categories) &&
                      viewTarget.categories
                        .filter((c) => c !== viewTarget.category)
                        .map((c) => (
                          <span
                            key={c}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                          >
                            {c}
                          </span>
                        ))}
                  </div>
                </div>
              </div>
              <StatusBadge status={viewTarget.status} />
            </div>

            {/* Performance Metrics Cards */}
            <div>
              <span className="text-xs font-semibold text-[#535F80] dark:text-slate-400 block uppercase tracking-wider mb-2">
                Procurement Performance (Calculated from Records)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#FEFEFE] dark:bg-slate-900 text-center">
                  <span className="text-[10px] text-slate-500 font-medium block">Total Purchase Orders</span>
                  <strong className="text-sm font-bold text-[#051747] dark:text-slate-200 tabular-nums">
                    {viewTargetPerformance?.totalPurchaseOrders || 0}
                  </strong>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#FEFEFE] dark:bg-slate-900 text-center">
                  <span className="text-[10px] text-slate-500 font-medium block">Total Purchase Value</span>
                  <strong className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatCurrency(viewTargetPerformance?.totalPurchaseValue || 0)}
                  </strong>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#FEFEFE] dark:bg-slate-900 text-center">
                  <span className="text-[10px] text-slate-500 font-medium block">Last Purchase Date</span>
                  <strong className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {viewTargetPerformance?.lastPurchaseDate || 'No Data'}
                  </strong>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#FEFEFE] dark:bg-slate-900 text-center">
                  <span className="text-[10px] text-slate-500 font-medium block">Delivery Performance</span>
                  <strong className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                    {viewTargetPerformance?.deliveryPerformance || 'No Data'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Contact Person & Tax Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-lg border border-[#535F80]/20 dark:border-slate-800 bg-[#FEFEFE] dark:bg-slate-900 space-y-2 text-xs">
                <span className="text-xs font-semibold text-[#535F80] dark:text-slate-400 block uppercase tracking-wider">
                  Contact Information
                </span>
                <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-[#081F62]" />
                  <span>{viewTarget.contactPerson}</span>
                  <span className="text-[10px] font-normal text-slate-400">(Primary)</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Phone className="w-3.5 h-3.5 text-[#535F80]" />
                  <span className="tabular-nums font-mono">{viewTarget.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Mail className="w-3.5 h-3.5 text-[#535F80]" />
                  <span className="font-mono">{viewTarget.email}</span>
                </div>

                {viewTarget.alternateContactPerson && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-medium">Alternate Contact</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{viewTarget.alternateContactPerson}</span>
                    {viewTarget.alternatePhone && (
                      <span className="text-slate-500 block font-mono mt-0.5">{viewTarget.alternatePhone}</span>
                    )}
                  </div>
                )}

                {viewTarget.accountsEmail && (
                  <div className="pt-1 text-[11px] text-slate-500">
                    <span>Accounts / Billing Email: </span>
                    <strong className="font-mono text-slate-700 dark:text-slate-300">{viewTarget.accountsEmail}</strong>
                  </div>
                )}
              </div>

              {/* Tax & Commercial Info */}
              <div className="p-3.5 rounded-lg border border-[#535F80]/20 dark:border-slate-800 bg-[#FEFEFE] dark:bg-slate-900 space-y-2 text-xs">
                <span className="text-xs font-semibold text-[#535F80] dark:text-slate-400 block uppercase tracking-wider">
                  Tax &amp; Commercial Terms
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">GSTIN:</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {viewTarget.gstin || 'Not Provided'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">PAN Number:</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {viewTarget.pan || 'Not Provided'}
                  </span>
                </div>
                {viewTarget.website && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Website:</span>
                    <a
                      href={viewTarget.website.startsWith('http') ? viewTarget.website : `https://${viewTarget.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#081F62] dark:text-blue-400 hover:underline flex items-center gap-1 font-mono text-[11px]"
                    >
                      <span>{viewTarget.website}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-slate-500">Payment Terms:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {viewTarget.paymentTerms === 'Custom'
                      ? `Custom (${viewTarget.customPaymentDays || 30} Days)`
                      : viewTarget.paymentTerms || 'Net 30 Days'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Credit Limit:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {viewTarget.creditLimit ? formatCurrency(viewTarget.creditLimit) : 'No Limit / Not Set'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Lead Time &amp; MOQ:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {viewTarget.leadTimeDays} days {viewTarget.moq ? `· MOQ: ${viewTarget.moq} units` : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Transport:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {viewTarget.transportResponsibility || 'Supplier'}
                  </span>
                </div>
              </div>
            </div>

            {/* Addresses Display */}
            <div className="p-3.5 rounded-lg border border-[#535F80]/20 dark:border-slate-800 bg-[#FEFEFE] dark:bg-slate-900 text-xs space-y-3">
              <span className="text-xs font-semibold text-[#535F80] dark:text-slate-400 block uppercase tracking-wider">
                Facility &amp; Logistic Locations
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    🏭 Plant / Facility Address
                  </span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    {formatAddress(viewTarget.plantAddress) || viewTarget.address || 'Not registered'}
                  </p>
                </div>
                <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    📑 Billing Address
                  </span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    {formatAddress(viewTarget.billingAddress) || 'Same as plant address'}
                  </p>
                </div>
                <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    🚚 Shipping / Pickup Address
                  </span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    {formatAddress(viewTarget.shippingAddress) || 'Same as plant address'}
                  </p>
                </div>
              </div>
            </div>

            {/* Linked Purchase Orders Summary */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#051747] dark:text-slate-200 mb-2.5">
                Procurement History &amp; Orders ({viewTargetPerformance?.linkedPos?.length || 0})
              </h4>
              {!viewTargetPerformance?.linkedPos || viewTargetPerformance.linkedPos.length === 0 ? (
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs text-center text-slate-500">
                  No purchase orders recorded with this supplier yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {viewTargetPerformance.linkedPos.map((po) => (
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

      {/* Protective Dialog: Delete Supplier */}
      {deleteTarget && (
        deleteTargetLinkedPos.length > 0 ? (
          <Modal
            isOpen={Boolean(deleteTarget)}
            onClose={() => setDeleteTarget(null)}
            title="Cannot Delete Supplier Partner"
            size="sm"
            footer={
              <div className="flex items-center justify-end gap-2 w-full">
                <SecondaryButton onClick={() => setDeleteTarget(null)}>
                  Keep Active
                </SecondaryButton>
                <PrimaryButton
                  variant="primary"
                  onClick={() => {
                    handleToggleStatus(deleteTarget);
                    setDeleteTarget(null);
                  }}
                >
                  Deactivate Supplier Instead
                </PrimaryButton>
              </div>
            }
          >
            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">Active Procurement Records Exist</strong>
                  <span>
                    Supplier <strong>"{deleteTarget.name}" ({deleteTarget.code})</strong> is referenced by{' '}
                    <strong>{deleteTargetLinkedPos.length} purchase order(s)</strong> and inventory receipts.
                  </span>
                </div>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Permanent deletion is blocked to preserve manufacturing ledger integrity. You can deactivate this supplier so they no longer appear in new purchase order selections.
              </p>
            </div>
          </Modal>
        ) : (
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
            message={`Are you sure you want to permanently delete supplier "${deleteTarget?.code}" (${deleteTarget?.name})? This will remove the vendor from your records.`}
            confirmLabel="Delete Supplier"
            cancelLabel="Keep Supplier"
            variant="danger"
          />
        )
      )}
    </div>
  );
}