import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Eye,
  Edit2,
  Power,
  Trash2,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  Copy,
  LayoutGrid,
  List,
  Building2,
  ShieldCheck,
  Sparkles,
  CalendarClock,
  Package,
  Receipt,
  MapPin,
  User,
  Mail,
  Phone,
  ArrowRight,
  X,
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
import { useTableState } from '../../hooks/useTableState';
import { validateCustomerImportRow } from '../../utils/validators';
import { parseSpreadsheetFile, mapCustomerSheetRows } from '../../utils/excelParser';
import { downloadSampleCustomerXlsx } from '../../services/exportService';
import { formatCurrency } from '../../utils/formatters';

function getInitials(name) {
  if (!name) return 'CU';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const TIER_CONFIG = {
  Critical: {
    badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50',
    bar: 'bg-rose-500',
  },
  High: {
    badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50',
    bar: 'bg-amber-500',
  },
  Medium: {
    badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50',
    bar: 'bg-blue-500',
  },
  Low: {
    badge: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    bar: 'bg-slate-400',
  },
};

function PriorityBadge({ tier = 'Medium', className = '' }) {
  const isCritical = tier === 'Critical';
  const isHigh = tier === 'High';
  const isMedium = tier === 'Medium';

  const badgeClass = isCritical
    ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-900/60 font-semibold'
    : isHigh
    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900/60 font-medium'
    : isMedium
    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900/60 font-medium'
    : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border whitespace-nowrap ${badgeClass} ${className}`}
    >
      {isCritical && (
        <span className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-400 animate-pulse" />
      )}
      {tier}
    </span>
  );
}

const SAMPLE_CUSTOMER_IMPORT_ROWS = [
  {
    code: 'CUS-BFL-09',
    name: 'Bharat Forge Components',
    contactPerson: 'Siddharth Deshpande',
    email: 's.deshpande@bharatforge-demo.in',
    phone: '+91 98231 55410',
    address: 'Mundhwa Industrial Estate, Pune, Maharashtra 411036',
    priorityTier: 'Critical',
    status: 'Active',
  },
  {
    code: 'CUS-CUM-10',
    name: 'Cummins India Drivetrain',
    contactPerson: 'Priya Gokhale',
    email: 'priya.gokhale@cummins-demo.in',
    phone: '+91 97640 88219',
    address: 'Kothrud Industrial Area, Pune, Maharashtra 411038',
    priorityTier: 'High',
    status: 'Active',
  },
  {
    code: 'CUS-BHL-01',
    name: 'Bharat Hydraulics Ltd.',
    contactPerson: 'Rajesh Kulkarni',
    email: 'r.kulkarni@bharathydraulics.in',
    phone: '+91 98220 44120',
    address: 'Plot E-14, MIDC Bhosari, Pune, Maharashtra 411026',
    priorityTier: 'Critical',
    status: 'Active',
  },
  {
    code: 'CUS-ERR-11',
    name: 'Invalid Email Sample Co.',
    contactPerson: 'Test Contact',
    email: 'not-an-email',
    phone: '+91 98000 00000',
    address: 'MIDC Chakan, Pune',
    priorityTier: 'Medium',
    status: 'Active',
  },
];

export function CustomersPage() {
  const navigate = useNavigate();
  const {
    customers = [],
    schedules = [],
    billingDocuments = [],
    deleteCustomer,
    toggleCustomerStatus,
    importCustomersBatch,
  } = useErpData();

  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [parseError, setParseError] = useState('');
  const [previewRows, setPreviewRows] = useState([]);
  const [confirmImportOpen, setConfirmImportOpen] = useState(false);

  // Top summary KPIs
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((c) => c.status === 'Active').length;
  const strategicAccounts = customers.filter(
    (c) => c.priorityTier === 'Critical' || c.priorityTier === 'High'
  ).length;
  const totalActiveSchedules = schedules.filter(
    (s) => s.pendingQty > 0 || s.status !== 'Completed'
  ).length;
  const activePct = totalCustomers > 0 ? Math.round((activeCustomers / totalCustomers) * 100) : 0;

  // Precomputed customer metrics for cards
  const customerMetricsMap = useMemo(() => {
    const map = new Map();
    const schedList = schedules || [];
    const billList = billingDocuments || [];

    customers.forEach((c) => {
      const custSchedules = schedList.filter((s) => s.customerId === c.id);
      const activeSchedCount = custSchedules.filter(
        (s) => s.pendingQty > 0 || s.status !== 'Completed'
      ).length;
      const custBills = billList.filter((b) => b.customerId === c.id);
      const balanceDue = custBills.reduce((acc, b) => acc + (Number(b.balanceDue) || 0), 0);
      const productsCount = (c.associatedProductIds || []).length;

      map.set(c.id, {
        activeSchedules: activeSchedCount,
        totalSchedules: custSchedules.length,
        balanceDue,
        productsCount,
      });
    });
    return map;
  }, [customers, schedules, billingDocuments]);

  const table = useTableState(customers, {
    initialPageSize: 8,
    initialSortKey: 'name',
    searchFields: ['name', 'code', 'contactPerson', 'email', 'phone', 'address'],
  });

  const hasActiveFilters = Boolean(
    table.search || table.filters.status || table.filters.priorityTier
  );

  const openAddPage = () => {
    navigate('/customers/new');
  };

  const openImportModal = () => {
    setUploadedFileName('');
    setParseError('');
    setPreviewRows([]);
    setDragOver(false);
    setImportModalOpen(true);
  };

  const handleFilePicked = async (file) => {
    if (!file) return;
    setParseError('');
    setUploadedFileName(file.name);
    try {
      const { rows } = await parseSpreadsheetFile(file);
      if (!rows || rows.length === 0) {
        setPreviewRows([]);
        setParseError(
          'No data rows were found in the uploaded sheet. Verify the first row contains column headers (Customer Code, Customer Name, Contact Person, Email, Phone, Address).'
        );
        return;
      }
      setPreviewRows(mapCustomerSheetRows(rows));
    } catch (err) {
      setPreviewRows([]);
      setParseError(err?.message || 'Unable to parse the selected spreadsheet.');
    }
  };

  const loadSamplePreview = () => {
    setParseError('');
    setUploadedFileName('Suvidh_Customers_Sample.xlsx');
    setPreviewRows(SAMPLE_CUSTOMER_IMPORT_ROWS);
  };

  const validatedPreview = useMemo(() => {
    const seenCodes = new Set();
    const seenNames = new Set();

    return previewRows.map((row, idx) => {
      const check = validateCustomerImportRow(row, customers);
      const codeKey = String(row.code || '').trim().toLowerCase();
      const nameKey = String(row.name || '').trim().toLowerCase();

      const dupInFile =
        (codeKey && seenCodes.has(codeKey)) || (nameKey && seenNames.has(nameKey));
      if (codeKey) seenCodes.add(codeKey);
      if (nameKey) seenNames.add(nameKey);

      const isDuplicate = check.isDuplicateExisting || dupInFile;
      return {
        ...row,
        rowIndex: idx + 1,
        ...check,
        isDuplicate,
        canImport: check.isValid && !isDuplicate,
      };
    });
  }, [previewRows, customers]);

  const importSummary = useMemo(() => {
    const totalRows = validatedPreview.length;
    const validRows = validatedPreview.filter((r) => r.canImport);
    const errorRows = validatedPreview.filter((r) => !r.isValid).length;
    const duplicateRows = validatedPreview.filter((r) => r.isValid && r.isDuplicate).length;
    return {
      fileName: uploadedFileName || 'Customer_Import.xlsx',
      totalRows,
      validCount: validRows.length,
      errorRows,
      duplicateRows,
      validRows,
    };
  }, [validatedPreview, uploadedFileName]);

  const handleConfirmImport = () => {
    if (importSummary.validRows.length === 0) return;
    importCustomersBatch(importSummary.validRows, { fileName: importSummary.fileName });
    setConfirmImportOpen(false);
    setImportModalOpen(false);
    setPreviewRows([]);
    setUploadedFileName('');
    setParseError('');
  };

  const columns = [
    {
      key: 'code',
      label: 'Code',
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
      label: 'Customer Name',
      sortable: true,
      render: (r) => {
        const tier = r.priorityTier || 'Medium';
        const isCritical = tier === 'Critical';
        return (
          <div>
            <div className="font-medium text-[#051747] dark:text-slate-100">{r.name}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`text-[11px] ${
                  isCritical
                    ? 'font-semibold text-red-600 dark:text-red-400'
                    : 'text-[#535F80] dark:text-slate-400'
                }`}
              >
                Priority:
              </span>
              <PriorityBadge tier={tier} />
            </div>
          </div>
        );
      },
    },
    { key: 'contactPerson', label: 'Contact Person', sortable: true },
    {
      key: 'email',
      label: 'Email & Phone',
      render: (r) => (
        <div className="text-xs">
          <div className="text-slate-700 dark:text-slate-200">{r.email}</div>
          <div className="text-[#535F80] dark:text-slate-400 tabular-nums">{r.phone}</div>
        </div>
      ),
    },
    {
      key: 'address',
      label: 'Address',
      render: (r) => (
        <span className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 max-w-[220px]">
          {r.address}
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
        <div className="inline-flex items-center justify-start gap-1" onClick={(e) => e.stopPropagation()}>
          <Tooltip content="View Customer Details">
            <button
              type="button"
              onClick={() => navigate(`/customers/${r.id}`)}
              className="p-1.5 rounded hover:bg-[#E7E9F0]/70 dark:hover:bg-slate-800 text-[#535F80] hover:text-[#081F62] cursor-pointer"
              aria-label="View Customer Details"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <Tooltip content="Edit Customer">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/customers/${r.id}/edit`);
              }}
              className="p-1.5 rounded hover:bg-[#E7E9F0]/70 dark:hover:bg-slate-800 text-[#535F80] hover:text-[#081F62] cursor-pointer"
              aria-label="Edit Customer"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <Tooltip content={r.status === 'Active' ? 'Deactivate Customer' : 'Activate Customer'}>
            <button
              type="button"
              onClick={() => setConfirmTarget(r)}
              className={`p-1.5 rounded hover:bg-[#E7E9F0]/70 dark:hover:bg-slate-800 cursor-pointer ${
                r.status === 'Active' ? 'text-emerald-600 hover:text-amber-600' : 'text-[#535F80] hover:text-emerald-600'
              }`}
              aria-label={r.status === 'Active' ? 'Deactivate Customer' : 'Activate Customer'}
            >
              <Power className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <Tooltip content="Delete Customer">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget(r);
              }}
              className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 cursor-pointer"
              aria-label="Delete Customer"
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
        title="Customers"
        description="Manage OEM customer accounts, contacts, delivery schedules, and priority tiers."
        actions={
          <>
            <SecondaryButton icon={Upload} onClick={openImportModal}>
              Import Excel
            </SecondaryButton>
            <PrimaryButton icon={Plus} onClick={openAddPage}>
              Add Customer
            </PrimaryButton>
          </>
        }
      />

      {/* Top Customer KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Customers"
          value={totalCustomers}
          sublabel="Registered OEM accounts"
          icon={Building2}
          tone="blue"
        />
        <StatCard
          label="Active Accounts"
          value={`${activeCustomers} / ${totalCustomers}`}
          sublabel={`${activePct}% operational coverage`}
          icon={ShieldCheck}
          tone="green"
        />
        <StatCard
          label="Critical & High Tier"
          value={strategicAccounts}
          sublabel="Strategic SLA accounts"
          icon={Sparkles}
          tone="amber"
        />
        <StatCard
          label="Active Schedules"
          value={totalActiveSchedules}
          sublabel="Open delivery pipelines"
          icon={CalendarClock}
          tone="slate"
        />
      </div>

      {/* Control & Filter Toolbar */}
      <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <SearchInput
            value={table.search}
            onChange={table.setSearch}
            placeholder="Search customer name, code, contact, email..."
            className="w-full sm:w-96 md:w-[420px] lg:w-[480px]"
          />
          <FilterDropdown
            label="Status"
            value={table.filters.status}
            onChange={(val) => table.setFilter('status', val)}
            options={['Active', 'Inactive']}
          />
          <FilterDropdown
            label="Priority"
            value={table.filters.priorityTier}
            onChange={(val) => table.setFilter('priorityTier', val)}
            options={['Critical', 'High', 'Medium', 'Low']}
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
            Showing <strong className="text-[#051747] dark:text-slate-200">{table.totalItems}</strong> customer{table.totalItems === 1 ? '' : 's'}
          </span>
          <div className="inline-flex items-center rounded-lg border border-[#535F80]/25 dark:border-slate-800 p-0.5 bg-[#FEFEFE] dark:bg-slate-900">
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
          </div>
        </div>
      </div>

      {/* Main Content: Card Grid View or Table View */}
      {viewMode === 'grid' ? (
        table.paginatedData.length === 0 ? (
          <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-xl p-8">
            <EmptyState
              icon={Building2}
              title="No customers match your criteria"
              description="Try adjusting your search terms or clearing your filters to see registered customer accounts."
              action={
                hasActiveFilters ? (
                  <SecondaryButton onClick={table.resetFilters}>
                    Clear Filters
                  </SecondaryButton>
                ) : (
                  <PrimaryButton icon={Plus} onClick={openAddPage}>
                    Add Customer
                  </PrimaryButton>
                )
              }
            />
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {table.paginatedData.map((c) => {
                const metrics = customerMetricsMap.get(c.id) || {
                  activeSchedules: 0,
                  totalSchedules: 0,
                  balanceDue: 0,
                  productsCount: (c.associatedProductIds || []).length,
                };
                const tierCfg = TIER_CONFIG[c.priorityTier] || TIER_CONFIG.Medium;

                return (
                  <div
                    key={c.id}
                    onClick={() => navigate(`/customers/${c.id}`)}
                    className="group relative bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 hover:border-[#081F62]/60 dark:hover:border-blue-500/60 rounded-xl p-5 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between cursor-pointer"
                  >
                    <div>
                      {/* Top Row: Initials Badge, Name, Code, Status */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-[#051747] dark:bg-slate-800 text-[#FEFEFE] dark:text-slate-100 font-bold text-xs flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                            {getInitials(c.name)}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-sm text-[#051747] dark:text-slate-100 group-hover:text-[#081F62] dark:group-hover:text-blue-400 transition-colors truncate">
                              {c.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-[11px] font-semibold text-[#535F80] dark:text-slate-400 bg-[#E7E9F0]/60 dark:bg-slate-800/80 px-2 py-0.5 rounded whitespace-nowrap inline-block">
                                {c.code}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                          <StatusBadge status={c.status} />
                        </div>
                      </div>

                      {/* Priority Tier & Meter */}
                      <div className="mt-3.5 flex items-center justify-between gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold border ${tierCfg.badge}`}>
                          <Sparkles className="w-3 h-3" />
                          {c.priorityTier} Priority
                        </span>
                        <span className="text-[11px] font-medium text-[#535F80] dark:text-slate-400 tabular-nums">
                          Score: <strong className="text-[#051747] dark:text-slate-200">{c.priorityScore || 75}</strong>/100
                        </span>
                      </div>
                      <div className="w-full bg-[#E7E9F0] dark:bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${tierCfg.bar}`}
                          style={{ width: `${Math.min(100, Math.max(12, c.priorityScore || 75))}%` }}
                        />
                      </div>

                      {/* Contact & Location Details */}
                      <div className="mt-4 pt-3 border-t border-[#E7E9F0]/80 dark:border-slate-800 space-y-2 text-xs">
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                          <User className="w-3.5 h-3.5 text-[#535F80] shrink-0" />
                          <span className="font-medium truncate">{c.contactPerson || 'No contact specified'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <Mail className="w-3.5 h-3.5 text-[#535F80] shrink-0" />
                          <a
                            href={`mailto:${c.email}`}
                            onClick={(e) => e.stopPropagation()}
                            className="hover:text-[#081F62] dark:hover:text-blue-400 hover:underline truncate"
                          >
                            {c.email}
                          </a>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <Phone className="w-3.5 h-3.5 text-[#535F80] shrink-0" />
                          <a
                            href={`tel:${c.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="hover:text-[#081F62] dark:hover:text-blue-400 hover:underline truncate tabular-nums"
                          >
                            {c.phone}
                          </a>
                        </div>
                        <div className="flex items-start gap-2 text-slate-500 dark:text-slate-400">
                          <MapPin className="w-3.5 h-3.5 text-[#535F80] shrink-0 mt-0.5" />
                          <span className="line-clamp-2 leading-relaxed" title={c.address}>
                            {c.address}
                          </span>
                        </div>
                      </div>

                      {/* Operational Micro-Stats: Products, Schedules, Receivables */}
                      <div className="mt-4 bg-[#E7E9F0]/40 dark:bg-slate-800/60 border border-[#535F80]/10 dark:border-slate-800 rounded-lg p-2.5 grid grid-cols-3 gap-2 text-center">
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase font-semibold text-[#535F80] dark:text-slate-400 truncate flex items-center justify-center gap-1">
                            <Package className="w-3 h-3 text-[#535F80]" /> Products
                          </p>
                          <p className="text-sm font-bold text-[#051747] dark:text-slate-100 tabular-nums mt-0.5">
                            {metrics.productsCount}
                          </p>
                        </div>
                        <div className="min-w-0 border-x border-[#535F80]/15 dark:border-slate-700/60 px-1">
                          <p className="text-[10px] uppercase font-semibold text-[#535F80] dark:text-slate-400 truncate flex items-center justify-center gap-1">
                            <CalendarClock className="w-3 h-3 text-[#535F80]" /> Schedules
                          </p>
                          <p className="text-sm font-bold text-[#051747] dark:text-slate-100 tabular-nums mt-0.5">
                            {metrics.activeSchedules}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase font-semibold text-[#535F80] dark:text-slate-400 truncate flex items-center justify-center gap-1">
                            <Receipt className="w-3 h-3 text-[#535F80]" /> Due
                          </p>
                          <p
                            className="text-xs font-bold text-[#051747] dark:text-slate-100 tabular-nums mt-1 truncate"
                            title={formatCurrency(metrics.balanceDue)}
                          >
                            {metrics.balanceDue > 0 ? formatCurrency(metrics.balanceDue) : '₹0'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div
                      className="mt-4 pt-3 border-t border-[#E7E9F0] dark:border-slate-800 flex items-center justify-between gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => navigate(`/customers/${c.id}`)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#081F62] hover:text-[#051747] dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer"
                      >
                        <span>Customer 360°</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </button>

                      <div className="inline-flex items-center gap-1">
                        <Tooltip content="Edit Customer">
                          <button
                            type="button"
                            onClick={() => navigate(`/customers/${c.id}/edit`)}
                            className="p-1.5 rounded hover:bg-[#E7E9F0]/80 dark:hover:bg-slate-800 text-[#535F80] hover:text-[#081F62] cursor-pointer"
                            aria-label="Edit Customer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </Tooltip>
                        <Tooltip content={c.status === 'Active' ? 'Deactivate Customer' : 'Activate Customer'}>
                          <button
                            type="button"
                            onClick={() => setConfirmTarget(c)}
                            className={`p-1.5 rounded hover:bg-[#E7E9F0]/80 dark:hover:bg-slate-800 cursor-pointer ${
                              c.status === 'Active'
                                ? 'text-emerald-600 hover:text-amber-600'
                                : 'text-[#535F80] hover:text-emerald-600'
                            }`}
                            aria-label={c.status === 'Active' ? 'Deactivate Customer' : 'Activate Customer'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        </Tooltip>
                        <Tooltip content="Delete Customer">
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(c)}
                            className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 cursor-pointer"
                            aria-label="Delete Customer"
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

            {/* Pagination Controls for Card View */}
            <div className="mt-5 bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg overflow-hidden shadow-2xs">
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

      {/* Import Customers Excel / CSV Modal */}
      <Modal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="Import Customers from Excel / CSV"
        subtitle="Upload an .xlsx, .xls (XML/HTML), or .csv sheet to validate customer records and skip duplicates before saving."
        size="2xl"
        footer={
          <>
            <SecondaryButton onClick={() => setImportModalOpen(false)}>Close</SecondaryButton>
            <PrimaryButton
              disabled={importSummary.validCount === 0}
              onClick={() => setConfirmImportOpen(true)}
            >
              Import {importSummary.validCount} Valid Customer{importSummary.validCount === 1 ? '' : 's'}
            </PrimaryButton>
          </>
        }
      >
        <div className="space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              handleFilePicked(file);
            }}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragOver
                ? 'border-[#081F62] bg-blue-50/50 dark:bg-blue-950/20'
                : 'border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/30'
            }`}
          >
            <Upload className="w-7 h-7 text-[#535F80] mx-auto mb-2" />
            <p className="text-sm font-medium text-[#051747] dark:text-slate-100">
              Drag &amp; drop your customer Excel (.xlsx) or CSV sheet here
            </p>
            <p className="text-xs text-[#535F80] dark:text-slate-400 mt-1">
              {uploadedFileName ? (
                <span>
                  Loaded: <strong className="text-[#081F62] dark:text-blue-300">{uploadedFileName}</strong>
                </span>
              ) : (
                'Expected columns: Customer Code, Customer Name, Contact Person, Email, Phone, Address, Priority Tier, Status'
              )}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2.5 mt-4">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-white dark:bg-slate-800 border border-[#535F80]/30 dark:border-slate-700 text-[#051747] dark:text-slate-200 hover:bg-slate-50 cursor-pointer">
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#081F62] dark:text-blue-300" />
                Select Excel / CSV File
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    handleFilePicked(file);
                  }}
                />
              </label>

              <SecondaryButton size="sm" onClick={loadSamplePreview}>
                Load Sample Preview
              </SecondaryButton>

              <SecondaryButton size="sm" icon={Download} onClick={downloadSampleCustomerXlsx}>
                Download Excel Template (.xlsx)
              </SecondaryButton>
            </div>
          </div>

          {parseError && (
            <div className="p-3 rounded-md border border-red-200 dark:border-red-800/60 bg-red-50/70 dark:bg-red-950/30 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{parseError}</span>
            </div>
          )}

          {validatedPreview.length > 0 && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-md border border-[#535F80]/30 dark:border-slate-700 bg-[#FEFEFE] dark:bg-slate-900">
                  <div className="text-[11px] text-slate-500">Total Rows</div>
                  <div className="text-lg font-bold tabular-nums">{importSummary.totalRows}</div>
                </div>
                <div className="p-3 rounded-md border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20">
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Ready to Import
                  </div>
                  <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                    {importSummary.validCount}
                  </div>
                </div>
                <div className="p-3 rounded-md border border-red-200 dark:border-red-800/60 bg-red-50/50 dark:bg-red-950/20">
                  <div className="text-[11px] text-red-700 dark:text-red-300 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Validation Errors
                  </div>
                  <div className="text-lg font-bold text-red-700 dark:text-red-300 tabular-nums">
                    {importSummary.errorRows}
                  </div>
                </div>
                <div className="p-3 rounded-md border border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20">
                  <div className="text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-1">
                    <Copy className="w-3 h-3" /> Duplicates Skipped
                  </div>
                  <div className="text-lg font-bold text-amber-700 dark:text-amber-300 tabular-nums">
                    {importSummary.duplicateRows}
                  </div>
                </div>
              </div>

              <div className="border border-[#535F80]/30 dark:border-slate-700 rounded-md overflow-x-auto max-h-64">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 border-b border-[#535F80]/30 dark:border-slate-700">
                      <th className="px-3 py-2 font-semibold">#</th>
                      <th className="px-3 py-2 font-semibold">Code</th>
                      <th className="px-3 py-2 font-semibold">Customer Name</th>
                      <th className="px-3 py-2 font-semibold">Contact</th>
                      <th className="px-3 py-2 font-semibold">Email &amp; Phone</th>
                      <th className="px-3 py-2 font-semibold">Priority</th>
                      <th className="px-3 py-2 font-semibold">Validation Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {validatedPreview.map((row) => (
                      <tr
                        key={row.rowIndex}
                        className={
                          !row.isValid
                            ? 'bg-red-50/50 dark:bg-red-950/20'
                            : row.isDuplicate
                            ? 'bg-amber-50/50 dark:bg-amber-950/20'
                            : ''
                        }
                      >
                        <td className="px-3 py-2 tabular-nums text-slate-500">{row.rowIndex}</td>
                        <td className="px-3 py-2 font-mono font-semibold whitespace-nowrap">{row.code || '—'}</td>
                        <td className="px-3 py-2 font-medium text-[#051747] dark:text-slate-100">{row.name || '—'}</td>
                        <td className="px-3 py-2">{row.contactPerson || '—'}</td>
                        <td className="px-3 py-2">
                          <div>{row.email || '—'}</div>
                          <div className="text-[11px] text-slate-500 tabular-nums">{row.phone || '—'}</div>
                        </td>
                        <td className="px-3 py-2">
                          <PriorityBadge tier={row.priorityTier || 'Medium'} />
                        </td>
                        <td className="px-3 py-2">
                          {!row.isValid ? (
                            <span className="text-red-600 font-medium">
                              Error: {row.errors.join('; ')}
                            </span>
                          ) : row.isDuplicate ? (
                            <span className="text-amber-700 font-medium">
                              Duplicate customer (skipped)
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-medium">Valid</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </Modal>

      <ConfirmationDialog
        isOpen={confirmImportOpen}
        onClose={() => setConfirmImportOpen(false)}
        onConfirm={handleConfirmImport}
        title="Confirm Customer Import"
        message={`Import ${importSummary.validCount} valid customer record(s) from ${importSummary.fileName} into local ERP storage? ${importSummary.errorRows} error row(s) and ${importSummary.duplicateRows} duplicate(s) will be skipped.`}
        confirmLabel="Confirm Import"
      />

      <ConfirmationDialog
        isOpen={Boolean(confirmTarget)}
        onClose={() => setConfirmTarget(null)}
        onConfirm={() => confirmTarget && toggleCustomerStatus(confirmTarget.id)}
        title={
          confirmTarget?.status === 'Active'
            ? 'Deactivate Customer Account'
            : 'Activate Customer Account'
        }
        message={`Are you sure you want to ${
          confirmTarget?.status === 'Active' ? 'deactivate' : 'activate'
        } ${confirmTarget?.name}?`}
        confirmLabel={confirmTarget?.status === 'Active' ? 'Deactivate' : 'Activate'}
        variant={confirmTarget?.status === 'Active' ? 'danger' : 'primary'}
      />

      <ConfirmationDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteCustomer(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        title="Delete Customer Account"
        message={`Are you sure you want to permanently delete customer "${deleteTarget?.name}" (${deleteTarget?.code})? This will remove the record from local demo storage.`}
        confirmLabel="Delete Customer"
        variant="danger"
      />
    </div>
  );
}
