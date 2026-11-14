import { useState, useMemo } from 'react';
import { Plus, IndianRupee, ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { PageHeader } from '../../components/layout/PageHeader';
import { PrimaryButton, SecondaryButton } from '../../components/common/Buttons';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { StatCard } from '../../components/dashboard/StatCard';
import { ChartCard } from '../../components/charts/ChartCard';
import { DataTable } from '../../components/tables/DataTable';
import { SearchInput, FilterDropdown } from '../../components/forms/Filters';
import { FormInput, FormSelect, FormTextarea } from '../../components/forms/FormFields';
import { useErpData } from '../../context/ErpDataContext';
import { useTableState } from '../../hooks/useTableState';
import { monthlyCashflowData } from '../../data/financeData';
import { formatCurrency, formatDate } from '../../utils/formatters';

const EXPENSE_COLORS = ['#2563EB', '#D97706', '#16A34A', '#64748B', '#DC2626'];

export function FinancePage() {
  const { financeTransactions, saveFinanceTransaction } = useErpData();
  const [modalOpen, setModalOpen] = useState(false);

  const [form, setForm] = useState({
    date: '2026-11-09',
    type: 'Expense',
    category: 'Raw Material Purchase',
    party: '',
    reference: '',
    amount: 25000,
    paymentStatus: 'Pending',
    mode: 'Bank Transfer',
    notes: '',
  });

  const summary = useMemo(() => {
    const salesTotal = financeTransactions
      .filter((t) => t.type === 'Income')
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const expenseTotal = financeTransactions
      .filter((t) => t.type === 'Expense')
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const outstanding = financeTransactions
      .filter((t) => t.paymentStatus !== 'Paid')
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const netCash = salesTotal - expenseTotal;

    const categoryMap = {};
    financeTransactions
      .filter((t) => t.type === 'Expense')
      .forEach((t) => {
        categoryMap[t.category] = (categoryMap[t.category] || 0) + Number(t.amount || 0);
      });
    const expenseCategories = Object.entries(categoryMap).map(([name, value]) => ({
      name,
      value,
    }));

    return { salesTotal, expenseTotal, outstanding, netCash, expenseCategories };
  }, [financeTransactions]);

  const table = useTableState(financeTransactions, {
    initialPageSize: 8,
    initialSortKey: 'date',
    initialSortDir: 'desc',
    searchFields: ['party', 'category', 'reference', 'notes'],
  });

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.party || Number(form.amount) <= 0) return;
    saveFinanceTransaction(form);
    setModalOpen(false);
  };

  const columns = [
    { key: 'date', label: 'Date', sortable: true, render: (r) => formatDate(r.date) },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (r) => (
        <span
          className={`text-xs font-semibold ${
            r.type === 'Income' ? 'text-emerald-600' : 'text-red-600'
          }`}
        >
          {r.type}
        </span>
      ),
    },
    { key: 'category', label: 'Category', sortable: true },
    { key: 'party', label: 'Party / Vendor', sortable: true },
    { key: 'reference', label: 'Reference', render: (r) => <span className="font-mono text-xs">{r.reference}</span> },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right',
      numeric: true,
      sortable: true,
      render: (r) => (
        <span className="font-semibold">
          {r.type === 'Income' ? '+' : '-'} {formatCurrency(r.amount)}
        </span>
      ),
    },
    {
      key: 'paymentStatus',
      label: 'Payment Status',
      sortable: true,
      render: (r) => <StatusBadge status={r.paymentStatus} size="xs" />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Management"
        description="Operational sales amounts, purchase expenses, outstanding settlements, and monthly cash flow planning."
        actions={
          <PrimaryButton
            icon={Plus}
            onClick={() => {
              setForm({
                date: '2026-11-09',
                type: 'Expense',
                category: 'Tooling & Consumables',
                party: '',
                reference: '',
                amount: 15000,
                paymentStatus: 'Pending',
                mode: 'Bank Transfer',
                notes: '',
              });
              setModalOpen(true);
            }}
          >
            Record Financial Entry
          </PrimaryButton>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Sales Amounts (Recorded)"
          value={formatCurrency(summary.salesTotal)}
          sublabel="Receivables & receipts"
          icon={ArrowUpRight}
          tone="green"
        />
        <StatCard
          label="Purchase & Plant Expenses"
          value={formatCurrency(summary.expenseTotal)}
          sublabel="Material, maintenance, utilities"
          icon={ArrowDownRight}
          tone="red"
        />
        <StatCard
          label="Outstanding Amounts"
          value={formatCurrency(summary.outstanding)}
          sublabel="Pending / partial settlements"
          icon={IndianRupee}
          tone="amber"
        />
        <StatCard
          label="Net Cash Position"
          value={formatCurrency(summary.netCash)}
          sublabel="Operational net cash"
          icon={Wallet}
          tone="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard
          title="Monthly Income vs Expenses"
          subtitle="6-month cash planning overview"
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyCashflowData} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(v) => `₹${v / 100000}L`} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="income" name="Sales Income" fill="#16A34A" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Expenses" fill="#2563EB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Expense Categories" subtitle="Cost distribution by operational head">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={summary.expenseCategories}
                cx="50%"
                cy="50%"
                innerRadius={36}
                outerRadius={60}
                paddingAngle={2}
                dataKey="value"
              >
                {summary.expenseCategories.map((c, idx) => (
                  <Cell key={c.name} fill={EXPENSE_COLORS[idx % EXPENSE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3">
        <SearchInput
          value={table.search}
          onChange={table.setSearch}
          placeholder="Search party, category, reference..."
          className="w-full sm:w-80"
        />
        <div className="flex flex-wrap items-center gap-3">
          <FilterDropdown
            label="Type"
            value={table.filters.type}
            onChange={(val) => table.setFilter('type', val)}
            options={['Income', 'Expense']}
          />
          <FilterDropdown
            label="Status"
            value={table.filters.paymentStatus}
            onChange={(val) => table.setFilter('paymentStatus', val)}
            options={['Paid', 'Partially Paid', 'Pending']}
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

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Record Financial Transaction"
        footer={
          <>
            <SecondaryButton onClick={() => setModalOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={handleSave}>Save Entry</PrimaryButton>
          </>
        }
      >
        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormSelect
            label="Transaction Type"
            name="type"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            options={['Expense', 'Income']}
          />
          <FormSelect
            label="Category"
            name="category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            options={[
              'Raw Material Purchase',
              'Machine Maintenance',
              'Plant Utilities & Power',
              'Tooling & Consumables',
              'Customer Sales Settlement',
            ]}
          />
          <FormInput
            label="Party / Vendor Name"
            name="party"
            required
            value={form.party}
            onChange={(e) => setForm({ ...form, party: e.target.value })}
          />
          <FormInput
            label="Reference (PO / Doc No.)"
            name="reference"
            value={form.reference}
            onChange={(e) => setForm({ ...form, reference: e.target.value })}
          />
          <FormInput
            label="Amount (INR)"
            name="amount"
            type="number"
            min="1"
            required
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
          <FormSelect
            label="Payment Status"
            name="paymentStatus"
            value={form.paymentStatus}
            onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}
            options={['Paid', 'Partially Paid', 'Pending']}
          />
          <FormInput
            label="Date"
            name="date"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
          <FormInput
            label="Payment Mode"
            name="mode"
            value={form.mode}
            onChange={(e) => setForm({ ...form, mode: e.target.value })}
          />
          <FormTextarea
            label="Notes"
            name="notes"
            className="sm:col-span-2"
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </form>
      </Modal>
    </div>
  );
}
