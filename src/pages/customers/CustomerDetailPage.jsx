import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Mail, Phone, MapPin, Package, CalendarClock, Truck } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { PrimaryButton, SecondaryButton } from '../../components/common/Buttons';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/States';
import { DataTable } from '../../components/tables/DataTable';
import { useErpData } from '../../context/ErpDataContext';
import { formatDate, formatNumber } from '../../utils/formatters';

export function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { customers, products, schedules, dispatches } = useErpData();

  const customer = customers.find((c) => c.id === id);

  if (!customer) {
    return (
      <EmptyState
        title="Customer not found"
        description="The requested customer record does not exist in local demo data."
        action={<SecondaryButton onClick={() => navigate('/customers')}>Back to Customers</SecondaryButton>}
      />
    );
  }

  const associatedProducts = products.filter((p) =>
    (customer.associatedProductIds || []).includes(p.id)
  );
  const customerSchedules = schedules.filter((s) => s.customerId === customer.id);
  const pendingDeliveries = customerSchedules.filter((s) => s.pendingQty > 0);
  const customerDispatches = dispatches.filter((d) => d.customerId === customer.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={customer.name}
        description={`Customer Code: ${customer.code} · Contact: ${customer.contactPerson}`}
        badge={<StatusBadge status={customer.status} />}
        actions={
          <div className="flex items-center gap-2">
            <SecondaryButton icon={ArrowLeft} onClick={() => navigate('/customers')}>
              Back to Customers
            </SecondaryButton>
            <PrimaryButton icon={Edit2} onClick={() => navigate(`/customers/${customer.id}/edit`)}>
              Edit Customer
            </PrimaryButton>
          </div>
        }
      />

      {/* Customer Overview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-5 space-y-3">
          <h3 className="text-sm font-semibold text-[#051747] dark:text-slate-100">
            Customer Information
          </h3>
          <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{customer.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="tabular-nums">{customer.phone}</span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>{customer.address}</span>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">Priority Tier</span>
            <StatusBadge status={customer.priorityTier} size="xs" />
          </div>
        </div>

        {/* Associated Products */}
        <div className="lg:col-span-2 bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-[#081F62]" />
            <h3 className="text-sm font-semibold text-[#051747] dark:text-slate-100">
              Associated Products ({associatedProducts.length})
            </h3>
          </div>
          {associatedProducts.length === 0 ? (
            <p className="text-xs text-slate-500">No linked products recorded yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {associatedProducts.map((prod) => (
                <div
                  key={prod.id}
                  onClick={() => navigate(`/products/${prod.id}`)}
                  className="p-3 rounded-md border border-[#535F80]/20 dark:border-slate-800 hover:border-[#081F62]/60 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] font-semibold text-[#081F62]">
                      {prod.code}
                    </span>
                    <StatusBadge status={prod.status} size="xs" />
                  </div>
                  <div className="text-xs font-semibold text-[#051747] dark:text-slate-100 mt-1">
                    {prod.name}
                  </div>
                  <div className="text-[11px] text-[#535F80] dark:text-slate-400 mt-0.5">
                    {prod.category} · UOM: {prod.uom}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Customer Schedules & Pending Deliveries */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <CalendarClock className="w-4 h-4 text-[#081F62]" />
          <h3 className="text-sm font-semibold text-[#051747] dark:text-slate-100">
            Customer Schedules & Pending Deliveries ({pendingDeliveries.length} open)
          </h3>
        </div>
        <DataTable
          data={customerSchedules}
          columns={[
            { key: 'scheduleNumber', label: 'Schedule No.' },
            {
              key: 'productId',
              label: 'Product',
              render: (r) => products.find((p) => p.id === r.productId)?.name || r.productId,
            },
            {
              key: 'scheduledQty',
              label: 'Scheduled',
              numeric: true,
              align: 'right',
              render: (r) => formatNumber(r.scheduledQty),
            },
            {
              key: 'deliveredQty',
              label: 'Delivered',
              numeric: true,
              align: 'right',
              render: (r) => formatNumber(r.deliveredQty),
            },
            {
              key: 'pendingQty',
              label: 'Pending',
              numeric: true,
              align: 'right',
              render: (r) => (
                <span className={r.pendingQty > 0 ? 'font-semibold text-amber-600' : 'text-emerald-600'}>
                  {formatNumber(r.pendingQty)}
                </span>
              ),
            },
            {
              key: 'requiredDate',
              label: 'Required Date',
              render: (r) => formatDate(r.requiredDate),
            },
            {
              key: 'status',
              label: 'Status',
              render: (r) => <StatusBadge status={r.status} />,
            },
          ]}
        />
      </div>

      {/* Delivery History */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Truck className="w-4 h-4 text-[#081F62]" />
          <h3 className="text-sm font-semibold text-[#051747] dark:text-slate-100">
            Delivery History ({customerDispatches.length})
          </h3>
        </div>
        <DataTable
          data={customerDispatches}
          columns={[
            { key: 'dispatchNumber', label: 'Dispatch No.' },
            {
              key: 'productId',
              label: 'Product',
              render: (r) => products.find((p) => p.id === r.productId)?.name || r.productId,
            },
            {
              key: 'dispatchQty',
              label: 'Dispatched Qty',
              numeric: true,
              align: 'right',
              render: (r) => formatNumber(r.dispatchQty),
            },
            {
              key: 'dispatchDate',
              label: 'Dispatch Date',
              render: (r) => formatDate(r.dispatchDate),
            },
            { key: 'vehicleNumber', label: 'Vehicle' },
            {
              key: 'deliveryStatus',
              label: 'Delivery Status',
              render: (r) => <StatusBadge status={r.deliveryStatus} />,
            },
          ]}
        />
      </div>
    </div>
  );
}
