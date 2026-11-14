import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { hasModuleAccess } from '../utils/permissions';
import { PrimaryButton } from '../components/common/Buttons';
import { LoadingState } from '../components/common/States';
import { AppLayout } from '../components/layout/AppLayout';
import { LoginPage } from '../pages/auth/LoginPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { ChangelogPage } from '../pages/system/ChangelogPage';

const CustomersPage = lazy(() =>
  import('../pages/customers/CustomersPage').then((m) => ({ default: m.CustomersPage }))
);
const CustomerFormPage = lazy(() =>
  import('../pages/customers/CustomerFormPage').then((m) => ({ default: m.CustomerFormPage }))
);
const CustomerDetailPage = lazy(() =>
  import('../pages/customers/CustomerDetailPage').then((m) => ({ default: m.CustomerDetailPage }))
);
const ProductsPage = lazy(() =>
  import('../pages/products/ProductsPage').then((m) => ({ default: m.ProductsPage }))
);
const ProductDetailPage = lazy(() =>
  import('../pages/products/ProductDetailPage').then((m) => ({ default: m.ProductDetailPage }))
);
const BomPage = lazy(() =>
  import('../pages/bom/BomPage').then((m) => ({ default: m.BomPage }))
);
const BomFormPage = lazy(() =>
  import('../pages/bom/BomFormPage').then((m) => ({ default: m.BomFormPage }))
);
const MaterialsPage = lazy(() =>
  import('../pages/materials/MaterialsPage').then((m) => ({ default: m.MaterialsPage }))
);
const InventoryPage = lazy(() =>
  import('../pages/materials/InventoryPage').then((m) => ({ default: m.InventoryPage }))
);
const MachinesPage = lazy(() =>
  import('../pages/machines/MachinesPage').then((m) => ({ default: m.MachinesPage }))
);
const MachineDetailPage = lazy(() =>
  import('../pages/machines/MachineDetailPage').then((m) => ({ default: m.MachineDetailPage }))
);
const SuppliersPage = lazy(() =>
  import('../pages/suppliers/SuppliersPage').then((m) => ({ default: m.SuppliersPage }))
);
const SchedulesPage = lazy(() =>
  import('../pages/schedules/SchedulesPage').then((m) => ({ default: m.SchedulesPage }))
);
const PurchasesPage = lazy(() =>
  import('../pages/purchases/PurchasesPage').then((m) => ({ default: m.PurchasesPage }))
);
const PurchaseDetailPage = lazy(() =>
  import('../pages/purchases/PurchaseDetailPage').then((m) => ({ default: m.PurchaseDetailPage }))
);
const ProductionPlanningPage = lazy(() =>
  import('../pages/production/ProductionPlanningPage').then((m) => ({
    default: m.ProductionPlanningPage,
  }))
);
const ProductionExecutionPage = lazy(() =>
  import('../pages/production/ProductionExecutionPage').then((m) => ({
    default: m.ProductionExecutionPage,
  }))
);
const QualityControlPage = lazy(() =>
  import('../pages/quality/QualityControlPage').then((m) => ({ default: m.QualityControlPage }))
);
const FinishedGoodsPage = lazy(() =>
  import('../pages/finished-goods/FinishedGoodsPage').then((m) => ({
    default: m.FinishedGoodsPage,
  }))
);
const SalesOrdersPage = lazy(() =>
  import('../pages/sales/SalesOrdersPage').then((m) => ({ default: m.SalesOrdersPage }))
);
const DispatchPage = lazy(() =>
  import('../pages/dispatch/DispatchPage').then((m) => ({ default: m.DispatchPage }))
);
const BillingPage = lazy(() =>
  import('../pages/billing/BillingPage').then((m) => ({ default: m.BillingPage }))
);
const FinancePage = lazy(() =>
  import('../pages/finance/FinancePage').then((m) => ({ default: m.FinancePage }))
);
const ReportsPage = lazy(() =>
  import('../pages/reports/ReportsPage').then((m) => ({ default: m.ReportsPage }))
);
const ProductionAnalyticsPage = lazy(() =>
  import('../pages/reports/ProductionAnalyticsPage').then((m) => ({
    default: m.ProductionAnalyticsPage,
  }))
);
const InventoryAnalyticsPage = lazy(() =>
  import('../pages/reports/InventoryAnalyticsPage').then((m) => ({
    default: m.InventoryAnalyticsPage,
  }))
);
const NotificationsPage = lazy(() =>
  import('../pages/notifications/NotificationsPage').then((m) => ({
    default: m.NotificationsPage,
  }))
);
const UsersPage = lazy(() =>
  import('../pages/users/UsersPage').then((m) => ({ default: m.UsersPage }))
);
const SettingsPage = lazy(() =>
  import('../pages/settings/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);

function RoleGate({ moduleKey, children }) {
  const { activeRole, switchRole } = useApp();
  const navigate = useNavigate();

  if (hasModuleAccess(activeRole, moduleKey)) {
    return children;
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-8 text-center max-w-lg mx-auto mt-10">
      <div className="w-11 h-11 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 mx-auto flex items-center justify-center mb-3">
        <ShieldAlert className="w-5 h-5" />
      </div>
      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
        Module Hidden for {activeRole} Role (UI Preview)
      </h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
        The current demo role ({activeRole}) does not include this module in its interface profile. Switch back to Admin or navigate to an enabled workspace.
      </p>
      <div className="flex items-center justify-center gap-2.5 mt-5">
        <PrimaryButton size="sm" onClick={() => switchRole('Admin')}>
          Switch to Admin Role
        </PrimaryButton>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 cursor-pointer"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}

function ProtectedLayout() {
  const { isAuthenticated } = useApp();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return (
    <AppLayout>
      <Suspense fallback={<LoadingState message="Loading module..." />}>
        <Outlet />
      </Suspense>
    </AppLayout>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />

        <Route
          path="/customers"
          element={<RoleGate moduleKey="customers"><CustomersPage /></RoleGate>}
        />
        <Route
          path="/customers/new"
          element={<RoleGate moduleKey="customers"><CustomerFormPage /></RoleGate>}
        />
        <Route
          path="/customers/:id/edit"
          element={<RoleGate moduleKey="customers"><CustomerFormPage /></RoleGate>}
        />
        <Route
          path="/customers/:id"
          element={<RoleGate moduleKey="customers"><CustomerDetailPage /></RoleGate>}
        />

        <Route
          path="/products"
          element={<RoleGate moduleKey="products"><ProductsPage /></RoleGate>}
        />
        <Route
          path="/products/:id"
          element={<RoleGate moduleKey="products"><ProductDetailPage /></RoleGate>}
        />

        <Route
          path="/bom"
          element={<RoleGate moduleKey="bom"><BomPage /></RoleGate>}
        />
        <Route
          path="/bom/new"
          element={<RoleGate moduleKey="bom"><BomFormPage /></RoleGate>}
        />
        <Route
          path="/bom/:id/edit"
          element={<RoleGate moduleKey="bom"><BomFormPage /></RoleGate>}
        />
        <Route
          path="/materials"
          element={<RoleGate moduleKey="materials"><MaterialsPage /></RoleGate>}
        />
        <Route
          path="/inventory"
          element={<RoleGate moduleKey="inventory"><InventoryPage /></RoleGate>}
        />
        <Route
          path="/machines"
          element={<RoleGate moduleKey="machines"><MachinesPage /></RoleGate>}
        />
        <Route
          path="/machines/:id"
          element={<RoleGate moduleKey="machines"><MachineDetailPage /></RoleGate>}
        />
        <Route
          path="/suppliers"
          element={<RoleGate moduleKey="suppliers"><SuppliersPage /></RoleGate>}
        />

        <Route
          path="/schedules"
          element={<RoleGate moduleKey="schedules"><SchedulesPage /></RoleGate>}
        />
        <Route
          path="/purchases"
          element={<RoleGate moduleKey="purchases"><PurchasesPage /></RoleGate>}
        />
        <Route
          path="/purchases/:id"
          element={<RoleGate moduleKey="purchases"><PurchaseDetailPage /></RoleGate>}
        />
        <Route
          path="/production-planning"
          element={<RoleGate moduleKey="production-planning"><ProductionPlanningPage /></RoleGate>}
        />
        <Route
          path="/production-execution"
          element={<RoleGate moduleKey="production-execution"><ProductionExecutionPage /></RoleGate>}
        />
        <Route
          path="/quality-control"
          element={<RoleGate moduleKey="quality-control"><QualityControlPage /></RoleGate>}
        />
        <Route
          path="/finished-goods"
          element={<RoleGate moduleKey="finished-goods"><FinishedGoodsPage /></RoleGate>}
        />

        <Route
          path="/sales-orders"
          element={<RoleGate moduleKey="sales-orders"><SalesOrdersPage /></RoleGate>}
        />
        <Route
          path="/dispatch"
          element={<RoleGate moduleKey="dispatch"><DispatchPage /></RoleGate>}
        />
        <Route
          path="/billing"
          element={<RoleGate moduleKey="billing"><BillingPage /></RoleGate>}
        />
        <Route
          path="/finance"
          element={<RoleGate moduleKey="finance"><FinancePage /></RoleGate>}
        />

        <Route
          path="/reports"
          element={<RoleGate moduleKey="reports"><ReportsPage /></RoleGate>}
        />
        <Route
          path="/analytics/production"
          element={<RoleGate moduleKey="production-analytics"><ProductionAnalyticsPage /></RoleGate>}
        />
        <Route
          path="/analytics/inventory"
          element={<RoleGate moduleKey="inventory-analytics"><InventoryAnalyticsPage /></RoleGate>}
        />

        <Route
          path="/notifications"
          element={<RoleGate moduleKey="notifications"><NotificationsPage /></RoleGate>}
        />
        <Route
          path="/users"
          element={<RoleGate moduleKey="users"><UsersPage /></RoleGate>}
        />
        <Route
          path="/changelog"
          element={<RoleGate moduleKey="changelog"><ChangelogPage /></RoleGate>}
        />
        <Route
          path="/settings"
          element={<RoleGate moduleKey="settings"><SettingsPage /></RoleGate>}
        />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
