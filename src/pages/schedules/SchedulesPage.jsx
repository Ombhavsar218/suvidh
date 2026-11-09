import { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { PrimaryButton, SecondaryButton } from '../../components/common/Buttons';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog';
import { Tabs } from '../../components/common/Tabs';
import { DataTable } from '../../components/tables/DataTable';
import { SearchInput, FilterDropdown } from '../../components/forms/Filters';
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

export function SchedulesPage() {
  const {
    schedules,
    scheduleRevisions,
    scheduleImports,
    customers,
    products,
    addSchedulesBatch,
    saveSchedule,
  } = useErpData();

  const [activeTab, setActiveTab] = useState('schedules');
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
        productName: prod?.name || s.productId,
        productCode: prod?.code || '',
      };
    });
  }, [schedules, customers, products]);

  const table = useTableState(enrichedSchedules, {
    initialPageSize: 8,
    initialSortKey: 'requiredDate',
    searchFields: ['scheduleNumber', 'customerName', 'productName', 'productCode'],
  });

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
      // Simulate frontend Excel parsing preview for .xlsx / .xls files
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

  const openEditSchedule = (sch) => {
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

  const columns = [
    {
      key: 'scheduleNumber',
      label: 'Schedule No.',
      sortable: true,
      render: (r) => (
        <div>
          <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-100">
            {r.scheduleNumber}
          </span>
          <div className="text-[10px] text-slate-400">{r.revision}</div>
        </div>
      ),
    },
    { key: 'customerName', label: 'Customer', sortable: true },
    {
      key: 'productName',
      label: 'Product',
      sortable: true,
      render: (r) => (
        <div>
          <div className="font-medium text-xs text-slate-900 dark:text-slate-100">{r.productName}</div>
          <div className="text-[10px] font-mono text-slate-400">{r.productCode}</div>
        </div>
      ),
    },
    {
      key: 'scheduledQty',
      label: 'Scheduled',
      align: 'right',
      numeric: true,
      sortable: true,
      render: (r) => formatNumber(r.scheduledQty),
    },
    {
      key: 'deliveredQty',
      label: 'Delivered',
      align: 'right',
      numeric: true,
      render: (r) => formatNumber(r.deliveredQty),
    },
    {
      key: 'pendingQty',
      label: 'Pending',
      align: 'right',
      numeric: true,
      sortable: true,
      render: (r) => (
        <span className={r.pendingQty > 0 ? 'font-semibold text-amber-600' : 'text-emerald-600'}>
          {formatNumber(r.pendingQty)}
        </span>
      ),
    },
    {
      key: 'requiredDate',
      label: 'Required Delivery',
      sortable: true,
      render: (r) => formatDate(r.requiredDate),
    },
    {
      key: 'priority',
      label: 'Priority',
      sortable: true,
      render: (r) => <StatusBadge status={r.priority} size="xs" />,
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
      align: 'right',
      render: (r) => (
        <button
          type="button"
          onClick={() => openEditSchedule(r)}
          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-[#2563EB] cursor-pointer"
          title="Revise Schedule"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Schedule Management"
        description="Manage OEM customer delivery schedules, simulate Excel schedule imports with validation, and track revisions."
        actions={
          <>
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
          </>
        }
      />

      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { key: 'schedules', label: 'Delivery Schedules', count: schedules.length, icon: FileSpreadsheet },
          { key: 'revisions', label: 'Revision History', count: scheduleRevisions.length, icon: History },
          { key: 'imports', label: 'Import Summary Log', count: scheduleImports.length, icon: Upload },
        ]}
      />

      {activeTab === 'schedules' && (
        <>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3">
            <SearchInput
              value={table.search}
              onChange={table.setSearch}
              placeholder="Search schedule no., customer, product..."
              className="w-full sm:w-80"
            />
            <div className="flex flex-wrap items-center gap-3">
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
            </div>
          </div>

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
        </>
      )}

      {activeTab === 'revisions' && (
        <DataTable
          data={scheduleRevisions}
          columns={[
            { key: 'scheduleNumber', label: 'Schedule No.', render: (r) => <span className="font-mono text-xs font-semibold">{r.scheduleNumber}</span> },
            { key: 'revision', label: 'Revision', render: (r) => <StatusBadge status="Scheduled" size="xs" /> },
            { key: 'summary', label: 'Revision Summary' },
            { key: 'changedBy', label: 'Updated By' },
            { key: 'changeDate', label: 'Date & Time', render: (r) => <span className="text-xs tabular-nums text-slate-500">{r.changeDate}</span> },
          ]}
        />
      )}

      {activeTab === 'imports' && (
        <DataTable
          data={scheduleImports}
          columns={[
            { key: 'id', label: 'Import ID', render: (r) => <span className="font-mono text-xs font-semibold">{r.id}</span> },
            { key: 'fileName', label: 'File Name' },
            { key: 'totalRows', label: 'Total Rows', align: 'right', numeric: true },
            { key: 'importedRows', label: 'Imported', align: 'right', numeric: true, render: (r) => <span className="text-emerald-600 font-semibold">{r.importedRows}</span> },
            { key: 'errorRows', label: 'Errors', align: 'right', numeric: true, render: (r) => <span className={r.errorRows > 0 ? 'text-red-600 font-semibold' : ''}>{r.errorRows}</span> },
            { key: 'duplicateRows', label: 'Duplicates', align: 'right', numeric: true },
            { key: 'uploadedBy', label: 'Uploaded By' },
            { key: 'status', label: 'Result', render: (r) => <StatusBadge status={r.status} size="xs" /> },
          ]}
        />
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
                ? 'border-[#2563EB] bg-blue-50/50 dark:bg-blue-950/20'
                : 'border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/30'
            }`}
          >
            <Upload className="w-7 h-7 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
              Drag & drop customer Excel (.xlsx, .xls) or CSV file here
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {uploadedFileName ? (
                <span>
                  Loaded: <strong className="text-[#2563EB]">{uploadedFileName}</strong>
                </span>
              ) : (
                'CSV files are parsed directly in browser; .xlsx/.xls files simulate a structured schedule sheet preview.'
              )}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2.5 mt-4">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer">
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#2563EB]" />
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
                <div className="p-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
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
              <div className="border border-slate-200 dark:border-slate-700 rounded-md overflow-x-auto max-h-64">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
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
                        <td className="px-3 py-2 font-mono font-semibold">{row.scheduleNumber}</td>
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
    </div>
  );
}
