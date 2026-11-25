import { initialCustomers } from './customersData';
import { initialProducts } from './productsData';
import { initialMaterials, initialMaterialTransactions } from './materialsData';
import { initialBoms } from './bomData';
import { initialMachines } from './machinesData';
import { initialSuppliers } from './suppliersData';
import { initialSchedules, initialScheduleRevisions, initialScheduleImports } from './schedulesData';
import { initialPurchaseOrders } from './purchasesData';
import { initialProductionPlans, initialProductionEntries } from './productionData';
import { initialQualityInspections } from './qualityData';
import { initialFinishedGoods } from './finishedGoodsData';
import { initialSalesOrders } from './salesData';
import { initialDispatches } from './dispatchData';
import { initialBillingDocuments } from './billingData';
import { initialFinanceTransactions } from './financeData';
import { initialNotifications } from './notificationsData';
import { initialUsers, initialSettings } from './usersData';
import { initialStockReservations } from './reservationsData';

export const SEED_VERSION = '1.0.0';

export function buildInitialSeedState() {
  return {
    version: SEED_VERSION,
    customers: initialCustomers,
    products: initialProducts,
    materials: initialMaterials,
    materialTransactions: initialMaterialTransactions,
    stockReservations: initialStockReservations,
    boms: initialBoms,
    machines: initialMachines,
    suppliers: initialSuppliers,
    schedules: initialSchedules,
    scheduleRevisions: initialScheduleRevisions,
    scheduleImports: initialScheduleImports,
    purchaseOrders: initialPurchaseOrders,
    productionPlans: initialProductionPlans,
    productionEntries: initialProductionEntries,
    qualityInspections: initialQualityInspections,
    finishedGoods: initialFinishedGoods,
    salesOrders: initialSalesOrders,
    dispatches: initialDispatches,
    billingDocuments: initialBillingDocuments,
    financeTransactions: initialFinanceTransactions,
    notifications: initialNotifications,
    users: initialUsers,
    settings: initialSettings,
  };
}
