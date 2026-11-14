import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Eye,
  Edit2,
  Trash2,
  LayoutGrid,
  List,
  Cpu,
  ShieldCheck,
  Wrench,
  Activity,
  MapPin,
  User,
  X,
  Package,
  Calendar,
  AlertTriangle,
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
import { FormInput, FormSelect } from '../../components/forms/FormFields';
import { useErpData } from '../../context/ErpDataContext';
import { useTableState } from '../../hooks/useTableState';
import { validateRequired } from '../../utils/validators';
import { formatNumber } from '../../utils/formatters';

const CATEGORY_STYLES = {
  'VMC / CNC Milling':
    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50',
  'CNC Turning':
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50',
  HMC: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/50',
  'Precision Grinding':
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50',
  'Broaching & Slotting':
    'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/50',
};

function getMachineBadge(category = '') {
  if (category.includes('VMC')) return 'VMC';
  if (category.includes('Turning')) return 'CNC';
  if (category.includes('HMC')) return 'HMC';
  if (category.includes('Grinding')) return 'GRD';
  if (category.includes('Broaching')) return 'BRO';
  return 'MCH';
}

const EMPTY_FORM = {
  code: '',
  name: '',
  category: 'VMC / CNC Milling',
  supportedProductIds: [],
  dailyCapacity: 100,
  efficiency: 90,
  status: 'Available',
  bay: 'Shop Floor Bay A',
  operator: '',
};

export function MachinesPage() {
  const navigate = useNavigate();
  const {
    machines = [],
    products = [],
    saveMachine,
    deleteMachine,
  } = useErpData();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'

  // KPI Metrics
  const operationalCount = useMemo(
    () => machines.filter((m) => m.status === 'Available' || m.status === 'In Use').length,
    [machines]
  );

  const maintenanceCount = useMemo(
    () => machines.filter((m) => m.status === 'Maintenance').length,
    [machines]
  );

  const totalCapacity = useMemo(() => {
    return machines.reduce((acc, m) => acc + (Number(m.dailyCapacity) || 0), 0);
  }, [machines]);

  const categories = useMemo(
    () => Array.from(new Set(machines.map((m) => m.category).filter(Boolean))),
    [machines]
  );

  const table = useTableState(machines, {
    initialPageSize: 8,
    initialSortKey: 'code',
    searchFields: ['code', 'name', 'category', 'bay', 'operator'],
  });

  const hasActiveFilters = Boolean(
    table.search || table.filters.category || table.filters.status
  );

  const openAdd = () => {
    setForm({
      ...EMPTY_FORM,
      code: `MC-CNC-0${machines.length + 1}`,
    });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (mach, e) => {
    e?.stopPropagation();
    setForm(mach);
    setErrors({});
    setModalOpen(true);
  };

  const toggleSupportedProduct = (prodId) => {
    setForm((prev) => {
      const current = prev.supportedProductIds || [];
      const next = current.includes(prodId)
        ? current.filter((id) => id !== prodId)
        : [...current, prodId];
      return { ...prev, supportedProductIds: next };
    });
  };

  const handleSave = (e) => {
    e.preventDefault();
    const nextErrors = {
      code: validateRequired(form.code, 'Machine code'),
      name: validateRequired(form.name, 'Machine name'),
    };
    const filtered = Object.fromEntries(
      Object.entries(nextErrors).filter(([, v]) => Boolean(v))
    );
    if (Object.keys(filtered).length > 0) {
      setErrors(filtered);
      return;
    }

    saveMachine({
      ...form,
      dailyCapacity: Number(form.dailyCapacity || 0),
      efficiency: Number(form.efficiency || 85),
    });
    setModalOpen(false);
  };

  const columns = [
    {
      key: 'code',
      label: 'Machine Code',
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
      label: 'Machine Name & Bay',
      sortable: true,
      render: (r) => (
        <div>
          <div className="font-medium text-[#051747] dark:text-slate-100">{r.name}</div>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#535F80] dark:text-slate-400">
            <span className="flex items-center gap-1 font-mono">
              <MapPin className="w-3 h-3 text-[#535F80]" />
              {r.bay}
            </span>
            <span>·</span>
            <span>Operator: {r.operator || 'Unassigned'}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      sortable: true,
      render: (r) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${
            CATEGORY_STYLES[r.category] || 'bg-slate-100 text-slate-700 border-slate-200'
          }`}
        >
          {r.category}
        </span>
      ),
    },
    {
      key: 'supportedProductIds',
      label: 'Compatible Products',
      render: (r) => (
        <div className="flex flex-wrap items-center gap-1 max-w-[210px]">
          {(r.supportedProductIds || []).slice(0, 3).map((pid) => {
            const p = products.find((item) => item.id === pid);
            return (
              <span
                key={pid}
                className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700"
              >
                {p ? p.code.replace('PRD-', '') : pid}
              </span>
            );
          })}
          {(r.supportedProductIds || []).length > 3 && (
            <span className="px-1 py-0.5 text-[10px] font-semibold text-[#535F80] dark:text-slate-400">
              +{r.supportedProductIds.length - 3}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'dailyCapacity',
      label: 'Daily Output',
      sortable: true,
      align: 'right',
      numeric: true,
      render: (r) => (
        <span className="font-semibold text-xs text-[#051747] dark:text-slate-200 tabular-nums">
          {formatNumber(r.dailyCapacity)} u/day
        </span>
      ),
    },
    {
      key: 'efficiency',
      label: 'OEE / Efficiency',
      sortable: true,
      align: 'right',
      numeric: true,
      render: (r) => (
        <div className="inline-flex items-center gap-2 justify-end">
          <div className="w-14 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                r.efficiency >= 90
                  ? 'bg-emerald-500'
                  : r.efficiency >= 80
                  ? 'bg-blue-600'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(100, r.efficiency)}%` }}
            />
          </div>
          <span className="text-xs font-bold tabular-nums text-slate-700 dark:text-slate-300">
            {r.efficiency}%
          </span>
        </div>
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
          <Tooltip content="View Machine Details">
            <button
              type="button"
              onClick={() => navigate(`/machines/${r.id}`)}
              className="p-1.5 rounded hover:bg-[#E7E9F0]/70 dark:hover:bg-slate-800 text-[#535F80] hover:text-[#081F62] cursor-pointer"
              aria-label="View Machine Details"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <Tooltip content="Edit Machine">
            <button
              type="button"
              onClick={(e) => openEdit(r, e)}
              className="p-1.5 rounded hover:bg-[#E7E9F0]/70 dark:hover:bg-slate-800 text-[#535F80] hover:text-[#081F62] cursor-pointer"
              aria-label="Edit Machine"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <Tooltip content="Delete Machine">
            <button
              type="button"
              onClick={() => setDeleteTarget(r)}
              className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 cursor-pointer"
              aria-label="Delete Machine"
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
        title="Machine Management"
        description="Shop floor CNC work centers, daily capacities, compatible product matrices, and operational readiness."
        actions={
          <PrimaryButton icon={Plus} onClick={openAdd}>
            Add Machine
          </PrimaryButton>
        }
      />

      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Machines"
          value={machines.length}
          sublabel="Shop floor work centers"
          icon={Cpu}
          tone="navy"
        />
        <StatCard
          label="Operational"
          value={operationalCount}
          sublabel={`${
            machines.length > 0 ? Math.round((operationalCount / machines.length) * 100) : 0
          }% active capacity`}
          icon={ShieldCheck}
          tone="emerald"
        />
        <StatCard
          label="Under Maintenance"
          value={maintenanceCount}
          sublabel="Service & calibration hold"
          icon={Wrench}
          tone={maintenanceCount > 0 ? 'rose' : 'slate'}
        />
        <StatCard
          label="Plant Daily Output"
          value={`${formatNumber(totalCapacity)} u`}
          sublabel="Aggregated 24h capacity"
          icon={Activity}
          tone="slate"
        />
      </div>

      {/* Control & Filter Toolbar */}
      <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <SearchInput
            value={table.search}
            onChange={table.setSearch}
            placeholder="Search machine code, name, category, bay, operator..."
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
            options={['Available', 'In Use', 'Maintenance', 'Inactive']}
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
            Showing <strong className="text-[#051747] dark:text-slate-200">{table.totalItems}</strong> machine{table.totalItems === 1 ? '' : 's'}
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
              icon={Cpu}
              title="No machines match your criteria"
              description="Try adjusting your search terms or clearing your filters to view shop floor machines."
              action={
                hasActiveFilters ? (
                  <SecondaryButton onClick={table.resetFilters}>
                    Clear Filters
                  </SecondaryButton>
                ) : (
                  <PrimaryButton icon={Plus} onClick={openAdd}>
                    Add Machine
                  </PrimaryButton>
                )
              }
            />
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {table.paginatedData.map((mach) => {
                const supportedProds = products.filter((p) =>
                  (mach.supportedProductIds || []).includes(p.id)
                );

                return (
                  <div
                    key={mach.id}
                    className="group relative bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 hover:border-[#081F62]/60 dark:hover:border-blue-500/60 rounded-xl p-5 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#051747] dark:bg-blue-900/60 text-[#FEFEFE] flex items-center justify-center font-bold text-xs tracking-wider shrink-0 shadow-2xs">
                            {getMachineBadge(mach.category)}
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm text-[#051747] dark:text-slate-100 group-hover:text-[#081F62] transition-colors leading-tight line-clamp-1">
                              {mach.name}
                            </h3>
                            <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap inline-block mt-0.5">
                              {mach.code}
                            </span>
                          </div>
                        </div>
                        <StatusBadge status={mach.status} />
                      </div>

                      {/* Badges: Category & Bay */}
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                            CATEGORY_STYLES[mach.category] ||
                            'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {mach.category}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono text-[#535F80] dark:text-slate-400 bg-[#E7E9F0]/60 dark:bg-slate-800">
                          <MapPin className="w-3 h-3 text-[#535F80]" />
                          {mach.bay}
                        </span>
                      </div>

                      {/* Operator & Efficiency Block */}
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-2 text-xs text-slate-600 dark:text-slate-300 mb-4">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                            <User className="w-3.5 h-3.5 text-[#535F80]" />
                            <span>Operator:</span>
                          </span>
                          <strong className="text-slate-800 dark:text-slate-100">
                            {mach.operator || 'Unassigned'}
                          </strong>
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="text-[#535F80] dark:text-slate-400">Efficiency</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {mach.efficiency}%
                            </span>
                          </div>
                          <div className="w-full bg-[#E7E9F0] dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                mach.efficiency >= 90
                                  ? 'bg-emerald-500'
                                  : mach.efficiency >= 80
                                  ? 'bg-blue-600'
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${Math.min(100, mach.efficiency)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Compatible Products Pill List */}
                      <div className="mb-4">
                        <div className="text-[10px] uppercase font-bold text-[#535F80] dark:text-slate-400 tracking-wider mb-1.5 flex items-center gap-1">
                          <Package className="w-3 h-3 text-[#535F80]" />
                          <span>Compatible Parts ({supportedProds.length})</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {supportedProds.slice(0, 3).map((p) => (
                            <span
                              key={p.id}
                              className="px-2 py-0.5 text-[11px] font-mono rounded bg-[#FEFEFE] dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                            >
                              {p.code}
                            </span>
                          ))}
                          {supportedProds.length > 3 && (
                            <span className="px-1.5 py-0.5 text-[11px] font-semibold text-[#535F80] dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded">
                              +{supportedProds.length - 3} more
                            </span>
                          )}
                          {supportedProds.length === 0 && (
                            <span className="text-[11px] text-slate-400 italic">
                              No products mapped
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 2-Column Micro Stats */}
                      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/15 dark:border-slate-800 mb-4 text-center">
                        <div>
                          <div className="text-[10px] text-[#535F80] dark:text-slate-400 font-medium">
                            Daily Capacity
                          </div>
                          <div className="text-xs font-bold text-[#051747] dark:text-slate-200 tabular-nums mt-0.5">
                            {formatNumber(mach.dailyCapacity)} u
                          </div>
                        </div>
                        <div className="border-l border-[#535F80]/15 dark:border-slate-800">
                          <div className="text-[10px] text-[#535F80] dark:text-slate-400 font-medium">
                            Next Service
                          </div>
                          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 tabular-nums mt-0.5">
                            {mach.nextMaintenance || 'TBD'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="pt-3 border-t border-[#535F80]/15 dark:border-slate-800 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => navigate(`/machines/${mach.id}`)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#081F62] hover:text-[#051747] dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Station Details
                      </button>

                      <div className="flex items-center gap-1">
                        <Tooltip content="Edit Machine">
                          <button
                            type="button"
                            onClick={(e) => openEdit(mach, e)}
                            className="p-1.5 rounded hover:bg-[#E7E9F0]/70 dark:hover:bg-slate-800 text-[#535F80] hover:text-[#081F62] cursor-pointer"
                            aria-label="Edit Machine"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </Tooltip>
                        <Tooltip content="Delete Machine">
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(mach)}
                            className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 cursor-pointer"
                            aria-label="Delete Machine"
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

      {/* Add / Edit Machine Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? 'Edit Work Center' : 'Add Machine'}
        size="lg"
        footer={
          <>
            <SecondaryButton onClick={() => setModalOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={handleSave}>Save Machine</PrimaryButton>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput
              label="Machine Code"
              name="code"
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              error={errors.code}
            />
            <FormInput
              label="Machine Name"
              name="name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              error={errors.name}
            />
            <FormSelect
              label="Machine Category"
              name="category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              options={[
                'VMC / CNC Milling',
                'CNC Turning',
                'HMC',
                'Precision Grinding',
                'Broaching & Slotting',
              ]}
            />
            <FormSelect
              label="Availability Status"
              name="status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={['Available', 'In Use', 'Maintenance', 'Inactive']}
            />
            <FormInput
              label="Daily Production Capacity (Units)"
              name="dailyCapacity"
              type="number"
              min="1"
              value={form.dailyCapacity}
              onChange={(e) => setForm({ ...form, dailyCapacity: e.target.value })}
            />
            <FormInput
              label="Efficiency (%)"
              name="efficiency"
              type="number"
              min="1"
              max="100"
              value={form.efficiency}
              onChange={(e) => setForm({ ...form, efficiency: e.target.value })}
            />
            <FormInput
              label="Shop Floor Bay"
              name="bay"
              value={form.bay}
              onChange={(e) => setForm({ ...form, bay: e.target.value })}
            />
            <FormInput
              label="Assigned Operator"
              name="operator"
              value={form.operator}
              onChange={(e) => setForm({ ...form, operator: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Compatible Products Matrix
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto p-2.5 border border-[#535F80]/30 dark:border-slate-700 rounded-md bg-[#FEFEFE] dark:bg-slate-900">
              {products.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200 cursor-pointer p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <input
                    type="checkbox"
                    className="accent-[#051747] dark:accent-blue-600 rounded"
                    checked={(form.supportedProductIds || []).includes(p.id)}
                    onChange={() => toggleSupportedProduct(p.id)}
                  />
                  <span className="font-mono text-[11px] text-slate-500">{p.code}</span>
                  <span className="truncate">{p.name}</span>
                </label>
              ))}
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMachine(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        title="Delete Work Center"
        message={`Are you sure you want to delete machine "${deleteTarget?.code}" (${deleteTarget?.name})? This will remove the work center from shop floor registry.`}
        confirmLabel="Delete Machine"
        cancelLabel="Keep Machine"
        variant="danger"
      />
    </div>
  );
}
