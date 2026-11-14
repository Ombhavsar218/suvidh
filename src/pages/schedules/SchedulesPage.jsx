import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  Plus,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Copy,
  Download,
  History,
  Edit2,
  Trash2,
  Eye,
  LayoutGrid,
  List,
  Calendar,
  Boxes,
  Clock,
  AlertTriangle,
  TrendingUp,
  X,
  User,
  Layers,
  Building2,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { PrimaryButton, SecondaryButton } from '../../components/common/Buttons';
import { Tooltip } from '../../components/common/Tooltip';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog';
import { Tabs } from '../../components/common/Tabs';
import { DataTable } from '../../components/tables/DataTable';
import { SearchInput, FilterDropdown } from '../../components/forms/Filters';
import { StatCard } from '../../components/dashboard/StatCard';
import { Pagination } from '../../components/common/Pagination';
import { EmptyState } from '../../components/common/States';
import { FormInput, FormSelect } from '../../components/forms/FormFields';
import { useErpData } from '../../context/ErpDataContext';
import { useTableState } from '../../hooks/useTableState';
import { validateScheduleRow } from '../../utils/validators';
import { downloadSampleScheduleCsv } from '../../services/exportService';
import { formatDate, formatNumber } from '../../utils/formatters';

const MOCK_EXCEL_PREVIEW_ROWS = [
  {
    scheduleNumber: 'BHL-SCH-2026-1140',
    customerCode: 'CUS-BHL-01',
    productCode: 'PRD-HYD-101',
    scheduledQty: 150,
    requiredDate: '2026-11-22',
    priority: 'High',
  },
  {
    scheduleNumber: 'TAC-SCH-2026-1141',
    customerCode: 'CUS-TAC-04',
    productCode: 'PRD-SHF-204',
    scheduledQty: 280,
    requiredDate: '2026-11-25',
    priority: 'Critical',
  },
  {
    scheduleNumber: 'BHL-SCH-2026-1101',
    customerCode: 'CUS-BHL-01',
    productCode: 'PRD-HYD-101',
    scheduledQty: 300,
    requiredDate: '2026-11-12',
    priority: 'Critical',
  },
  {
    scheduleNumber: 'ERR-SCH-2026-1142',
    customerCode: 'CUS-UNKNOWN',
    productCode: 'PRD-VLV-308',
    scheduledQty: -45,
    requiredDate: '2026-99-99',
    priority: 'Medium',
  },
];

function getCustomerInitials(name) {
  if (!name) return 'CU';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function SchedulesPage() {
  const navigate = useNavigate();
  const {
    schedules = [],
    scheduleRevisions = [],
    scheduleImports = [],
    customers = [],
    products = [],
    addSchedulesBatch,
    saveSchedule,
    deleteSchedule,
  } = useErpData();

  const [activeTab, setActiveTab] = useState('schedules');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [viewTarget, setViewTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [previewRows, setPreviewRows] = useState([]);
  const [confirmImportOpen, setConfirmImportOpen] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [form, setForm] = useState({
    scheduleNumber: '',
    customerId: '',
    productId: '',
    scheduledQty: 100,
    requiredDate: '2026-11-20',
    priority: 'High',
    status: 'Scheduled',
    revisionNote: '',
  });

  const enrichedSchedules = useMemo(() => {
    return schedules.map((s) => {
      const cust = customers.find((c) => c.id === s.customerId);
      const prod = products.find((p) => p.id === s.productId);
      return {
        ...s,
        customerName: cust?.name || s.customerId,
        customerCode: cust?.code || '',
        productName: prod?.name || s.productId,
        productCode: prod?.code || '',
      };
    });
  }, [schedules, customers, products]);

  // KPI Metrics
  const totalCommitmentQty = useMemo(() => {
    return schedules.reduce((acc, s) => acc + (Number(s.scheduledQty) || 0), 0);
  }, [schedules]);

  const pendingFulfillmentQty = useMemo(() => {
    return schedules.reduce((acc, s) => acc + (Number(s.pendingQty) || 0), 0);
  }, [schedules]);

  const criticalSchedulesCount = useMemo(() => {
    return schedules.filter((s) => s.priority === 'Critical').length;
  }, [schedules]);

  const fulfillmentPct = useMemo(() => {
    if (totalCommitmentQty === 0) return 100;
    const delivered = totalCommitmentQty - pendingFulfillmentQty;
    return Math.round((delivered / totalCommitmentQty) * 100);
  }, [totalCommitmentQty, pendingFulfillmentQty]);

  const customerOptions = useMemo(() => {
    return Array.from(new Set(enrichedSchedules.map((s) => s.customerName).filter(Boolean)));
  }, [enrichedSchedules]);

  const table = useTableState(enrichedSchedules, {
    initialPageSize: 8,
    initialSortKey: 'requiredDate',
    searchFields: ['scheduleNumber', 'customerName', 'customerCode', 'productName', 'productCode'],
  });

  const hasActiveFilters = Boolean(
    table.search ||
      table.filters.customerName ||
      table.filters.priority ||
      table.filters.status
  );

  const validatedPreview = useMemo(() => {
    const seenInBatch = new Set();
    return previewRows.map((row, idx) => {
      const check = validateScheduleRow(row, customers, products, schedules);
      const key = String(row.scheduleNumber || '').trim().toLowerCase();
      const isDuplicateInFile = key && seenInBatch.has(key);
      if (key) seenInBatch.add(key);

      const isDuplicate = check.isDuplicateExisting || isDuplicateInFile;
      return {
        ...row,
        rowIndex: idx + 1,
        ...check,
        isDuplicate,
        canImport: check.isValid && !isDuplicate,
      };
    });
  }, [previewRows, customers, products, schedules]);

  const importSummary = useMemo(() => {
    const totalRows = validatedPreview.length;
    const validRows = validatedPreview.filter((r) => r.canImport);
    const errorRows = validatedPreview.filter((r) => !r.isValid).length;
    const duplicateRows = validatedPreview.filter((r) => r.isDuplicate).length;
    return {
      fileName: uploadedFileName || 'Sample_Customer_Schedule.xlsx',
      totalRows,
      validCount: validRows.length,
      errorRows,
      duplicateRows,
      validRows,
    };
  }, [validatedPreview, uploadedFileName]);

  const parseCsvText = (text) => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) return MOCK_EXCEL_PREVIEW_ROWS;

    const rows = [];
    for (let i = 1; i < lines.length; i += 1) {
      const cols = lines[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim());
      if (cols.length >= 5) {
        rows.push({
          scheduleNumber: cols[0] || '',
          customerCode: cols[1] || '',
          productCode: cols[2] || '',
          scheduledQty: cols[3] || '',
          requiredDate: cols[4] || '',
          priority: cols[5] || 'Medium',
        });
      }
    }
    return rows.length > 0 ? rows : MOCK_EXCEL_PREVIEW_ROWS;
  };

  const handleFilePicked = (file) => {
    if (!file) return;
    setUploadedFileName(file.name);
    if (file.name.toLowerCase().endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPreviewRows(parseCsvText(String(ev.target?.result || '')));
      };
      reader.readAsText(file);
    } else {
      setPreviewRows(MOCK_EXCEL_PREVIEW_ROWS);
    }
  };

  const loadSamplePreview = () => {
    setUploadedFileName('Nov_2026_OEM_Schedule_Sample.xlsx');
    setPreviewRows(MOCK_EXCEL_PREVIEW_ROWS);
  };

  const handleConfirmImport = () => {
    if (importSummary.validRows.length === 0) return;
    addSchedulesBatch(importSummary.validRows, {
      fileName: importSummary.fileName,
      totalRows: importSummary.totalRows,
      errorRows: importSummary.errorRows,
      duplicateRows: importSummary.duplicateRows,
    });
    setConfirmImportOpen(false);
    setUploadOpen(false);
    setPreviewRows([]);
    setUploadedFileName('');
  };

  const openEditSchedule = (sch, e) => {
    e?.stopPropagation();
    setForm({
      ...sch,
      revisionNote: '',
    });
    setEditModalOpen(true);
  };

  const openAddSchedule = () => {
    setForm({
      scheduleNumber: `SCH-2026-${1125 + schedules.length}`,
      customerId: customers[0]?.id || '',
      productId: products[0]?.id || '',
      scheduledQty: 100,
      requiredDate: '2026-11-24',
      priority: 'High',
      status: 'Scheduled',
      revisionNote: 'New manual schedule entry',
    });
    setEditModalOpen(true);
  };

  const handleSaveSchedule = (e) => {
    e.preventDefault();
    saveSchedule(form);
    setEditModalOpen(false);
  };

  // Strictly single line schedule number column
  const columns = [
    {
      key: 'scheduleNumber',
      label: 'Schedule No.',
      sortable: true,
      width: '180px',
      cellClassName: 'whitespace-nowrap',
      render: (r) => (
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap inline-block">
            {r.scheduleNumber}
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700 whitespace-nowrap inline-block">
            {r.revision || 'Rev 1'}
          </span>
        </div>
      ),
    },
    {
      key: 'customerName',
      label: 'Customer',
      sortable: true,
      render: (r) => (
        <div>
          <div className="font-medium text-xs text-[#051747] dark:text-slate-100">{r.customerName}</div>
          {r.customerCode && (
            <div className="text-[10px] font-mono text-slate-400">{r.customerCode}</div>
          )}
        </div>
      ),
    },
    {
      key: 'productName',
      label: 'Finished Product',
      sortable: true,
      render: (r) => (
        <div>
          <div className="font-medium text-xs text-[#051747] dark:text-slate-100 line-clamp-1">
            {r.productName}
          </div>
          <div className="text-[10px] font-mono text-[#535F80] dark:text-slate-400">
            {r.productCode}
          </div>
        </div>
      ),
    },
    {
      key: 'scheduledQty',
      label: 'Scheduled',
      align: 'right',
      numeric: true,
      sortable: true,
      render: (r) => (
        <span className="font-medium text-xs tabular-nums text-slate-700 dark:text-slate-300">
          {formatNumber(r.scheduledQty)}
        </span>
      ),
    },
    {
      key: 'deliveredQty',
      label: 'Delivered',
      align: 'right',
      numeric: true,
      sortable: true,
      render: (r) => (
        <span className="font-medium text-xs tabular-nums text-slate-700 dark:text-slate-300">
          {formatNumber(r.deliveredQty)}
        </span>
      ),
    },
    {
      key: 'pendingQty',
      label: 'Pending',
      align: 'right',
      numeric: true,
      sortable: true,
      render: (r) => (
        <span
          className={`text-xs font-bold tabular-nums ${
            r.pendingQty > 0 ? 'text-amber-600' : 'text-emerald-600'
          }`}
        >
          {formatNumber(r.pendingQty)}
        </span>
      ),
    },
    {
      key: 'requiredDate',
      label: 'Required Delivery',
      sortable: true,
      render: (r) => (
        <span className="text-xs text-slate-700 dark:text-slate-300 tabular-nums">
          {formatDate(r.requiredDate)}
        </span>
      ),
    },
    {
      key: 'priority',
      label: 'Priority',
      sortable: true,
      render: (r) =>
        r.priority === 'Critical' ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800/80 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-400" />
            Critical
          </span>
        ) : (
          <StatusBadge status={r.priority} size="xs" />
        ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (r) => <StatusBadge status={r.status} size="xs" />,
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
          <Tooltip content="Quick View Schedule">
            <button
              type="button"
              onClick={() => setViewTarget(r)}
              className="p-1.5 rounded hover:bg-[#E7E9F0]/70 dark:hover:bg-slate-800 text-[#535F80] hover:text-[#081F62] cursor-pointer"
              aria-label="View Schedule Details"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <Tooltip content="Revise / Edit Schedule">
            <button
              type="button"
              onClick={(e) => openEditSchedule(r, e)}
              className="p-1.5 rounded hover:bg-[#E7E9F0]/70 dark:hover:bg-slate-800 text-[#535F80] hover:text-[#081F62] cursor-pointer"
              aria-label="Revise Schedule"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <Tooltip content="Delete Schedule">
            <button
              type="button"
              onClick={() => setDeleteTarget(r)}
              className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 cursor-pointer"
              aria-label="Delete Schedule"
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
        title="Customer Schedule Management"
        description="Manage OEM customer delivery schedules, simulate Excel schedule imports with validation, and track delivery revisions."
        actions={
          <div className="flex items-center gap-2">
            <SecondaryButton icon={Plus} onClick={openAddSchedule}>
              Add Schedule
            </SecondaryButton>
            <PrimaryButton
              icon={Upload}
              onClick={() => {
                setPreviewRows([]);
                setUploadedFileName('');
                setUploadOpen(true);
              }}
            >
              Upload Excel Schedule
            </PrimaryButton>
          </div>
        }
      />

      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Schedules"
          value={schedules.length}
          sublabel="Active OEM call-offs"
          icon={Calendar}
          tone="navy"
        />
        <StatCard
          label="Scheduled Volume"
          value={`${formatNumber(totalCommitmentQty)} u`}
          sublabel="Total contracted pieces"
          icon={Boxes}
          tone="slate"
        />
        <StatCard
          label="Pending Delivery"
          value={`${formatNumber(pendingFulfillmentQty)} u`}
          sublabel={`${100 - fulfillmentPct}% awaiting dispatch`}
          icon={Clock}
          tone="amber"
        />
        <StatCard
          label="Critical Priority"
          value={criticalSchedulesCount}
          sublabel="High-urgency call-offs"
          icon={AlertTriangle}
          tone={criticalSchedulesCount > 0 ? 'rose' : 'slate'}
        />
      </div>

      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          {
            key: 'schedules',
            label: 'Delivery Schedules',
            count: schedules.length,
            icon: FileSpreadsheet,
          },
          {
            key: 'revisions',
            label: 'Revision History',
            count: scheduleRevisions.length,
            icon: History,
          },
          {
            key: 'imports',
            label: 'Import Summary Log',
            count: scheduleImports.length,
            icon: Upload,
          },
        ]}
      />

      {activeTab === 'schedules' && (
        <div className="space-y-4">
          {/* Control & Filter Toolbar */}
          <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
              <SearchInput
                value={table.search}
                onChange={table.setSearch}
                placeholder="Search schedule no., customer, product, code..."
                className="w-full sm:w-96 md:w-[420px] lg:w-[480px]"
              />
              <FilterDropdown
                label="Customer"
                value={table.filters.customerName}
                onChange={(val) => table.setFilter('customerName', val)}
                options={customerOptions}
              />
              <FilterDropdown
                label="Priority"
                value={table.filters.priority}
                onChange={(val) => table.setFilter('priority', val)}
                options={['Critical', 'High', 'Medium', 'Low']}
              />
              <FilterDropdown
                label="Status"
                value={table.filters.status}
                onChange={(val) => table.setFilter('status', val)}
                options={['Scheduled', 'In Progress', 'Pending', 'Completed']}
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
                Showing <strong className="text-[#051747] dark:text-slate-200">{table.totalItems}</strong> schedule{table.totalItems === 1 ? '' : 's'}
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
                  icon={Calendar}
                  title="No delivery schedules match your criteria"
                  description="Try adjusting your search terms or clearing your filters to see active customer call-offs."
                  action={
                    hasActiveFilters ? (
                      <SecondaryButton onClick={table.resetFilters}>
                        Clear Filters
                      </SecondaryButton>
                    ) : (
                      <PrimaryButton icon={Plus} onClick={openAddSchedule}>
                        Add Schedule
                      </PrimaryButton>
                    )
                  }
                />
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {table.paginatedData.map((sch) => {
                    const deliveredPct =
                      sch.scheduledQty > 0
                        ? Math.min(
                            100,
                            Math.round((Number(sch.deliveredQty || 0) / Number(sch.scheduledQty)) * 100)
                          )
                        : 0;

                    return (
                      <div
                        key={sch.id}
                        className="group relative bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 hover:border-[#081F62]/60 dark:hover:border-blue-500/60 rounded-xl p-5 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                      >
                        <div>
                          {/* Top Header */}
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-[#051747] dark:bg-blue-900/60 text-[#FEFEFE] flex items-center justify-center font-bold text-xs tracking-wider shrink-0 shadow-2xs">
                                {getCustomerInitials(sch.customerName)}
                              </div>
                              <div>
                                <h3 className="font-semibold text-sm text-[#051747] dark:text-slate-100 group-hover:text-[#081F62] transition-colors leading-tight line-clamp-1">
                                  {sch.customerName}
                                </h3>
                                <div className="flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
                                  <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap inline-block">
                                    {sch.scheduleNumber}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/70 dark:border-slate-700 whitespace-nowrap inline-block">
                                    {sch.revision || 'Rev 1'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              {sch.priority === 'Critical' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 border border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800/80 animate-pulse">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-400" />
                                  Critical
                                </span>
                              ) : (
                                <StatusBadge status={sch.priority} size="xs" />
                              )}
                              <StatusBadge status={sch.status} size="xs" />
                            </div>
                          </div>

                          {/* Finished Product Card */}
                          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 mb-3">
                            <span className="text-[10px] font-bold text-[#535F80] dark:text-slate-400 uppercase tracking-wider block mb-0.5">
                              Part / Product
                            </span>
                            <div className="text-xs font-semibold text-[#051747] dark:text-slate-100 line-clamp-1">
                              {sch.productName}
                            </div>
                            <span className="font-mono text-[11px] text-[#535F80] dark:text-slate-400">
                              {sch.productCode}
                            </span>
                          </div>

                          {/* Progress Tracker */}
                          <div className="space-y-1.5 mb-4">
                            <div className="flex items-center justify-between text-[11px] text-[#535F80] dark:text-slate-400">
                              <span>Delivery Fulfillment</span>
                              <strong className="text-slate-800 dark:text-slate-200 tabular-nums">
                                {deliveredPct}%
                              </strong>
                            </div>
                            <div className="w-full bg-[#E7E9F0] dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                                style={{ width: `${deliveredPct}%` }}
                              />
                            </div>
                          </div>

                          {/* 3-Column Micro Metrics */}
                          <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/15 dark:border-slate-800 mb-4 text-center">
                            <div>
                              <div className="text-[10px] text-[#535F80] dark:text-slate-400 font-medium">
                                Scheduled
                              </div>
                              <div className="text-xs font-bold text-[#051747] dark:text-slate-200 tabular-nums mt-0.5">
                                {formatNumber(sch.scheduledQty)}
                              </div>
                            </div>
                            <div className="border-x border-[#535F80]/15 dark:border-slate-800">
                              <div className="text-[10px] text-[#535F80] dark:text-slate-400 font-medium">
                                Delivered
                              </div>
                              <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
                                {formatNumber(sch.deliveredQty)}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] text-[#535F80] dark:text-slate-400 font-medium">
                                Balance
                              </div>
                              <div
                                className={`text-xs font-bold tabular-nums mt-0.5 ${
                                  sch.pendingQty > 0 ? 'text-amber-600' : 'text-emerald-600'
                                }`}
                              >
                                {formatNumber(sch.pendingQty)}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-[#535F80] dark:text-slate-400 mb-2">
                            <Calendar className="w-3.5 h-3.5 text-[#535F80]" />
                            <span>Target Date: <strong className="text-slate-800 dark:text-slate-200">{formatDate(sch.requiredDate)}</strong></span>
                          </div>
                        </div>

                        {/* Card Actions Footer */}
                        <div className="pt-3 border-t border-[#535F80]/15 dark:border-slate-800 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setViewTarget(sch)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#081F62] hover:text-[#051747] dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Details
                          </button>

                          <div className="flex items-center gap-1">
                            <Tooltip content="Revise Schedule">
                              <button
                                type="button"
                                onClick={(e) => openEditSchedule(sch, e)}
                                className="p-1.5 rounded hover:bg-[#E7E9F0]/70 dark:hover:bg-slate-800 text-[#535F80] hover:text-[#081F62] cursor-pointer"
                                aria-label="Revise Schedule"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </Tooltip>
                            <Tooltip content="Delete Schedule">
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(sch)}
                                className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 cursor-pointer"
                                aria-label="Delete Schedule"
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
        </div>
      )}

      {activeTab === 'revisions' && (
        <DataTable
          data={scheduleRevisions}
          columns={[
            {
              key: 'scheduleNumber',
              label: 'Schedule No.',
              width: '180px',
              cellClassName: 'whitespace-nowrap',
              render: (r) => (
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap inline-block">
                    {r.scheduleNumber}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/70 dark:border-slate-700 whitespace-nowrap inline-block">
                    {r.revision || 'Rev 1'}
                  </span>
                </div>
              ),
            },
            {
              key: 'summary',
              label: 'Revision Summary',
              render: (r) => (
                <span className="text-xs text-slate-800 dark:text-slate-200">
                  {r.summary}
                </span>
              ),
            },
            {
              key: 'changedBy',
              label: 'Updated By',
              render: (r) => (
                <div className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                  <User className="w-3.5 h-3.5 text-[#535F80]" />
                  <span>{r.changedBy}</span>
                </div>
              ),
            },
            {
              key: 'changeDate',
              label: 'Date & Time',
              render: (r) => (
                <span className="text-xs tabular-nums text-slate-500 font-mono">
                  {r.changeDate}
                </span>
              ),
            },
          ]}
        />
      )}

      {activeTab === 'imports' && (
        <DataTable
          data={scheduleImports}
          columns={[
            {
              key: 'id',
              label: 'Import ID',
              width: '130px',
              cellClassName: 'whitespace-nowrap',
              render: (r) => (
                <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap inline-block">
                  {r.id}
                </span>
              ),
            },
            {
              key: 'fileName',
              label: 'File Name',
              render: (r) => (
                <span className="font-medium text-xs text-[#051747] dark:text-slate-100 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#081F62]" />
                  {r.fileName}
                </span>
              ),
            },
            {
              key: 'totalRows',
              label: 'Total Rows',
              align: 'right',
              numeric: true,
              render: (r) => (
                <span className="text-xs font-medium tabular-nums">{r.totalRows}</span>
              ),
            },
            {
              key: 'importedRows',
              label: 'Imported',
              align: 'right',
              numeric: true,
              render: (r) => (
                <span className="text-xs text-emerald-600 font-bold tabular-nums">
                  {r.importedRows}
                </span>
              ),
            },
            {
              key: 'errorRows',
              label: 'Errors',
              align: 'right',
              numeric: true,
              render: (r) => (
                <span
                  className={`text-xs tabular-nums ${
                    r.errorRows > 0 ? 'text-red-600 font-bold' : 'text-slate-500'
                  }`}
                >
                  {r.errorRows}
                </span>
              ),
            },
            {
              key: 'duplicateRows',
              label: 'Duplicates',
              align: 'right',
              numeric: true,
              render: (r) => (
                <span className="text-xs text-amber-600 font-medium tabular-nums">
                  {r.duplicateRows}
                </span>
              ),
            },
            {
              key: 'uploadedBy',
              label: 'Uploaded By',
              render: (r) => (
                <span className="text-xs text-slate-700 dark:text-slate-300">
                  {r.uploadedBy}
                </span>
              ),
            },
            {
              key: 'status',
              label: 'Result',
              render: (r) => <StatusBadge status={r.status} size="xs" />,
            },
          ]}
        />
      )}

      {/* Quick View Schedule Modal */}
      {viewTarget && (
        <Modal
          isOpen={Boolean(viewTarget)}
          onClose={() => setViewTarget(null)}
          title="Customer Schedule Details"
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <SecondaryButton onClick={() => setViewTarget(null)}>
                Close
              </SecondaryButton>
              <div className="flex items-center gap-2">
                <PrimaryButton
                  icon={Edit2}
                  onClick={() => {
                    const target = viewTarget;
                    setViewTarget(null);
                    openEditSchedule(target);
                  }}
                >
                  Revise Schedule
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
                  {getCustomerInitials(viewTarget.customerName)}
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#051747] dark:text-slate-100">
                    {viewTarget.customerName}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700 text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {viewTarget.scheduleNumber}
                    </span>
                    <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                      {viewTarget.revision || 'Rev 1'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {viewTarget.priority === 'Critical' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800/80 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-400" />
                    Critical
                  </span>
                ) : (
                  <StatusBadge status={viewTarget.priority} />
                )}
                <StatusBadge status={viewTarget.status} />
              </div>
            </div>

            {/* Product & Timeline Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-lg border border-[#535F80]/20 dark:border-slate-800 bg-[#FEFEFE] dark:bg-slate-900 space-y-2">
                <span className="text-xs font-semibold text-[#535F80] dark:text-slate-400 block uppercase tracking-wider">
                  Finished Product
                </span>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {viewTarget.productName}
                </div>
                <div className="font-mono text-xs text-[#535F80] dark:text-slate-400">
                  Code: {viewTarget.productCode}
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-[#535F80]/20 dark:border-slate-800 bg-[#FEFEFE] dark:bg-slate-900 space-y-2">
                <span className="text-xs font-semibold text-[#535F80] dark:text-slate-400 block uppercase tracking-wider">
                  Target Schedule Dates
                </span>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#535F80]">Required Delivery:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {formatDate(viewTarget.requiredDate)}
                  </span>
                </div>
                {viewTarget.importedAt && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#535F80]">Imported / Created:</span>
                    <span className="font-mono text-slate-600 dark:text-slate-300">
                      {viewTarget.importedAt}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Delivery Fulfillment Breakdown */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#051747] dark:text-slate-200 mb-2.5">
                Delivery Fulfillment Progress
              </h4>
              <div className="grid grid-cols-3 gap-3 text-center mb-3">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] text-[#535F80] dark:text-slate-400 font-medium">
                    Total Scheduled
                  </div>
                  <div className="text-base font-bold text-slate-800 dark:text-slate-100 mt-1 tabular-nums">
                    {formatNumber(viewTarget.scheduledQty)}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                    Dispatched / Delivered
                  </div>
                  <div className="text-base font-bold text-emerald-700 dark:text-emerald-300 mt-1 tabular-nums">
                    {formatNumber(viewTarget.deliveredQty)}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] text-[#535F80] dark:text-slate-400 font-medium">
                    Pending Balance
                  </div>
                  <div
                    className={`text-base font-bold mt-1 tabular-nums ${
                      viewTarget.pendingQty > 0 ? 'text-amber-600' : 'text-emerald-600'
                    }`}
                  >
                    {formatNumber(viewTarget.pendingQty)}
                  </div>
                </div>
              </div>

              {/* Visual Progress Bar */}
              <div className="w-full bg-[#E7E9F0] dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{
                    width: `${
                      viewTarget.scheduledQty > 0
                        ? Math.min(
                            100,
                            Math.round((viewTarget.deliveredQty / viewTarget.scheduledQty) * 100)
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Excel Upload & Visual Validation Modal */}
      <Modal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload Customer Schedule (Excel / CSV)"
        subtitle="Frontend simulated validation preview — detects formatting errors and duplicate schedule numbers before local import."
        size="2xl"
        footer={
          <>
            <SecondaryButton onClick={() => setUploadOpen(false)}>Close</SecondaryButton>
            <PrimaryButton
              disabled={importSummary.validCount === 0}
              onClick={() => setConfirmImportOpen(true)}
            >
              Import {importSummary.validCount} Valid Record{importSummary.validCount === 1 ? '' : 's'}
            </PrimaryButton>
          </>
        }
      >
        <div className="space-y-4">
          {/* Drag & Drop Area */}
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
            <Upload className="w-7 h-7 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-[#051747] dark:text-slate-100">
              Drag & drop customer Excel (.xlsx, .xls) or CSV file here
            </p>
            <p className="text-xs text-[#535F80] dark:text-slate-400 mt-1">
              {uploadedFileName ? (
                <span>
                  Loaded: <strong className="text-[#081F62]">{uploadedFileName}</strong>
                </span>
              ) : (
                'CSV files are parsed directly in browser; .xlsx/.xls files simulate a structured schedule sheet preview.'
              )}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2.5 mt-4">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-white dark:bg-slate-800 border border-[#535F80]/30 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer">
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#081F62]" />
                Select File
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => handleFilePicked(e.target.files?.[0])}
                />
              </label>

              <SecondaryButton size="sm" onClick={loadSamplePreview}>
                Load Sample Excel Preview
              </SecondaryButton>

              <SecondaryButton size="sm" icon={Download} onClick={downloadSampleScheduleCsv}>
                Download CSV Template
              </SecondaryButton>
            </div>
          </div>

          {validatedPreview.length > 0 && (
            <>
              {/* Import Summary Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-md border border-[#535F80]/30 dark:border-slate-700 bg-[#FEFEFE] dark:bg-slate-900">
                  <div className="text-[11px] text-slate-500">Total Rows</div>
                  <div className="text-lg font-bold tabular-nums">{importSummary.totalRows}</div>
                </div>
                <div className="p-3 rounded-md border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20">
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Valid to Import
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

              {/* Validation Preview Table */}
              <div className="border border-[#535F80]/30 dark:border-slate-700 rounded-md overflow-x-auto max-h-64">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 border-b border-[#535F80]/30 dark:border-slate-700">
                      <th className="px-3 py-2 font-semibold">#</th>
                      <th className="px-3 py-2 font-semibold">Schedule No.</th>
                      <th className="px-3 py-2 font-semibold">Customer</th>
                      <th className="px-3 py-2 font-semibold">Product</th>
                      <th className="px-3 py-2 font-semibold text-right">Qty</th>
                      <th className="px-3 py-2 font-semibold">Req Date</th>
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
                        <td className="px-3 py-2 font-mono font-semibold whitespace-nowrap">{row.scheduleNumber}</td>
                        <td className="px-3 py-2">{row.customerName}</td>
                        <td className="px-3 py-2">{row.productName}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{row.scheduledQty}</td>
                        <td className="px-3 py-2 tabular-nums">{row.requiredDate}</td>
                        <td className="px-3 py-2">
                          {!row.isValid ? (
                            <span className="text-red-600 font-medium">
                              Error: {row.errors.join('; ')}
                            </span>
                          ) : row.isDuplicate ? (
                            <span className="text-amber-700 font-medium">
                              Duplicate schedule number (skipped)
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
        title="Confirm Schedule Import"
        message={`Import ${importSummary.validCount} valid schedule row(s) from ${importSummary.fileName} into local ERP storage? ${importSummary.errorRows} error row(s) and ${importSummary.duplicateRows} duplicate(s) will be excluded.`}
        confirmLabel="Confirm Import"
      />

      {/* Add / Revise Schedule Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={form.id ? `Revise Schedule ${form.scheduleNumber}` : 'Add Customer Schedule'}
        size="lg"
        footer={
          <>
            <SecondaryButton onClick={() => setEditModalOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={handleSaveSchedule}>Save Schedule</PrimaryButton>
          </>
        }
      >
        <form onSubmit={handleSaveSchedule} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput
            label="Schedule Number"
            name="scheduleNumber"
            required
            value={form.scheduleNumber}
            onChange={(e) => setForm({ ...form, scheduleNumber: e.target.value })}
          />
          <FormSelect
            label="Customer"
            name="customerId"
            required
            value={form.customerId}
            onChange={(e) => setForm({ ...form, customerId: e.target.value })}
            options={customers.map((c) => ({ value: c.id, label: c.name }))}
          />
          <FormSelect
            label="Product"
            name="productId"
            required
            value={form.productId}
            onChange={(e) => setForm({ ...form, productId: e.target.value })}
            options={products.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))}
          />
          <FormInput
            label="Scheduled Quantity"
            name="scheduledQty"
            type="number"
            min="1"
            required
            value={form.scheduledQty}
            onChange={(e) => setForm({ ...form, scheduledQty: e.target.value })}
          />
          <FormInput
            label="Required Delivery Date"
            name="requiredDate"
            type="date"
            required
            value={form.requiredDate}
            onChange={(e) => setForm({ ...form, requiredDate: e.target.value })}
          />
          <FormSelect
            label="Priority"
            name="priority"
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
            options={['Critical', 'High', 'Medium', 'Low']}
          />
          <FormSelect
            label="Status"
            name="status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            options={['Scheduled', 'In Progress', 'Pending', 'Completed']}
          />
          <FormInput
            label="Revision Note"
            name="revisionNote"
            value={form.revisionNote}
            onChange={(e) => setForm({ ...form, revisionNote: e.target.value })}
            placeholder="Reason for revision..."
          />
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteSchedule(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        title="Delete Customer Schedule"
        message={`Are you sure you want to delete customer schedule "${deleteTarget?.scheduleNumber}"? This will remove the delivery commitment from production planning.`}
        confirmLabel="Delete Schedule"
        cancelLabel="Keep Schedule"
        variant="danger"
      />
    </div>
  );
}
