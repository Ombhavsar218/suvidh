# Changelog

All notable changes to **Suvidh ERP** are documented in this file on a **day-wise release** schedule (`1.0.0`, `1.0.1`, ... — one version increment per active day, recording all changes from that day).
Each daily release pairs its sequential version number with an Oceanic codename from our release sequence: `Nautilus`, `Coral Reef`, `Manta Ray`, `Orca`, `Blue Marlin`, `Beluga`, `Narwhal`, `Dolphin`, `Atoll`, `Sea Turtle`, `Humpback`, `Albatross`.

---

## [1.0.2] — "Manta Ray" (2026-11-13)

Day 3 release introducing custom theme-matched dropdowns for filters and pagination, an executive Table format for Customers with operational metrics, top KPI cards, dedicated full-page customer edit form at `/customers/:id/edit`, red customer delete action with confirmation safeguards, direct edit access from Customer Details, and breadcrumb route hierarchy.

### Added
- **Custom Theme-Matched Dropdown Components** ([Filters.jsx](src/components/forms/Filters.jsx), [Pagination.jsx](src/components/common/Pagination.jsx), [FormFields.jsx](src/components/forms/FormFields.jsx)): Replaced native browser `<select>` inputs with custom theme-styled dropdowns featuring navy-bordered triggers, smooth rotation chevrons, floating shadow-elevated popovers, checkmark indicators, and click-outside dismissal matching the `#081F62`, `#051747`, and `#FEFEFE` palette.
- **Executive Customer Table & KPI Overview** ([CustomersPage.jsx](src/pages/customers/CustomersPage.jsx)): Redesigned `/customers` with an executive Table format showcasing initials badges, organization details, contacts, priority score meters, operational counts (Supplied Products, Active Schedules), and live receivables tracking, accompanied by 4 top summary StatCards and view mode options.
- **Customer Delete Action with Confirmation Safeguard** ([CustomersPage.jsx](src/pages/customers/CustomersPage.jsx), [ErpDataContext.jsx](src/context/ErpDataContext.jsx)): Added a **Delete Customer** action button (red `Trash2` icon) to customer table rows with a destructive `ConfirmationDialog` prompt and LocalStorage removal via `deleteCustomer`.
- **Dedicated Full-Page Customer Edit Route** ([CustomerFormPage.jsx](src/pages/customers/CustomerFormPage.jsx), [AppRoutes.jsx](src/routes/AppRoutes.jsx)): Refactored `CustomerFormPage` into a unified form component handling both `/customers/new` and `/customers/:id/edit`. Pre-loads existing customer information, validates fields without duplicate-code false positives against itself, saves changes in-place preserving IDs, and provides cancel/back navigation.
- **Edit Customer Action in Customer Details** ([CustomerDetailPage.jsx](src/pages/customers/CustomerDetailPage.jsx)): Added an **Edit Customer** primary button in the `PageHeader` navigating directly to `/customers/:id/edit`.

### Improved
- **Direct Navigation from Customers Table Edit Action** ([CustomersPage.jsx](src/pages/customers/CustomersPage.jsx)): Updated the row action edit button to navigate directly to `/customers/:id/edit` instead of opening a modal, and removed obsolete modal state and markup.
- **Breadcrumb Hierarchy for Customer Editing** ([navigationConfig.js](src/components/layout/navigationConfig.js)): Added `edit: 'Edit Customer'` mapping so breadcrumbs display `Customers > [Customer Code] > Edit Customer`.

---

## [1.0.1] — "Coral Reef" (2026-11-11)

Day 2 release adding Customer Excel sheet import, dedicated full-page New Customer form, replacing Machine Availability with Pending Billing & Invoices, simplifying the Dashboard heading, and transitioning release history to day-wise semantic versions using the Oceanic codename sequence.

### Added
- **Dedicated New Customer Form Page** ([CustomerFormPage.jsx](src/pages/customers/CustomerFormPage.jsx), [CustomersPage.jsx](src/pages/customers/CustomersPage.jsx), [AppRoutes.jsx](src/routes/AppRoutes.jsx)): Routed **Add Customer** to a dedicated `/customers/new` form page with account details, contact & address fields, and optional supplied product linking instead of opening a popup modal.
- **Customer Excel Sheet Import** ([CustomersPage.jsx](src/pages/customers/CustomersPage.jsx), [excelParser.js](src/utils/excelParser.js), [ErpDataContext.jsx](src/context/ErpDataContext.jsx)): Added an **Import Excel** button and interactive modal supporting browser-native `.xlsx`, XML/HTML `.xls`, and `.csv` file parsing, `.xlsx` template downloads ([exportService.js](src/services/exportService.js)), row-level validation, duplicate customer skipping, and batch import persistence.

### Improved
- **Pending Billing & Invoices Dashboard Card** ([DashboardPage.jsx](src/pages/dashboard/DashboardPage.jsx)): Replaced `Machine Availability` with a live **Pending Billing & Invoices** summary computed from `billingDocuments` displaying total unsettled receivables, earliest-due customer bills, balance due, due dates, status badges, and direct `/billing` navigation.
- **Simplified Dashboard Page Title** ([DashboardPage.jsx](src/pages/dashboard/DashboardPage.jsx)): Removed `"Manufacturing Operations"` from the dashboard `PageHeader` heading so the workspace title reads cleanly as **Dashboard**.
- **Day-Wise Release Versioning** ([changelogData.js](src/data/changelogData.js), [CHANGELOG.md](CHANGELOG.md), [package.json](package.json)): Switched from feature-by-feature version bumps to a single version bump per active calendar day (`1.0.0` for `2026-11-10`, `1.0.1` for `2026-11-11`, and continuing sequentially each new day) while retaining the Oceanic codename sequence.

### Styled
- **Day-Wise Changelog UI & Date Search** ([ChangelogPage.jsx](src/pages/system/ChangelogPage.jsx), [ChangelogModal.jsx](src/components/layout/ChangelogModal.jsx)): Updated release summary cards and dialog footer copy for daily releases and added date string matching in changelog search.

---

## [1.0.0] — "Nautilus" (2026-11-10)

Day 1 baseline consolidating the full Suvidh ERP frontend, authentication portal, navigation and tooltip enhancements, changelog timeline UX, HMR recovery fixes, role switcher cleanup, compact 3-column charts, and the Company Funds Remaining widget.

### Added
- **24 Enterprise ERP Modules**: Dashboard, Customers & Customer Details, Products & Product Details, Bill of Materials (BOM), Raw Materials, Raw Material Inventory, Machines & Machine Details, Suppliers, Customer Schedules, Purchase Management & PO Details, Production Planning, Production Execution, Quality Control, Finished Goods, Sales Orders, Dispatch Management, Billing, Financial Management, Reports, Production Analytics, Inventory Analytics, Notifications, User Management, and System Settings.
- **Enterprise Login Screen** ([LoginPage.jsx](src/pages/auth/LoginPage.jsx)): Standalone sign-in experience with work email/password validation, visibility toggle, administrator reset notice, demo quick-fill profiles, and LocalStorage session state.
- **Portal Tooltip System** ([Tooltip.jsx](src/components/common/Tooltip.jsx)): Viewport-aware white (`#FEFEFE`) custom tooltip with `#051747` typography, `#535F80` border, and directional arrow across navigation and table actions.
- **In-App Changelog & Popup Modal** ([ChangelogPage.jsx](src/pages/system/ChangelogPage.jsx), [ChangelogModal.jsx](src/components/layout/ChangelogModal.jsx)): Dedicated `/changelog` page and quick-open release notes popup accessible from clickable version pills in [TopNavbar.jsx](src/components/layout/TopNavbar.jsx), [AppSidebar.jsx](src/components/layout/AppSidebar.jsx), and [UserDropdown.jsx](src/components/layout/UserDropdown.jsx).
- **Company Funds Remaining Card** ([DashboardPage.jsx](src/pages/dashboard/DashboardPage.jsx)): Replaced `Pending Quality Inspections` with a live financial summary computed from `financeTransactions` displaying Available Cash Balance, Net Projected Cash Position, Settled Receipts, Expenses Paid, Pending Receivables, Pending Payables, and direct `/finance` navigation.

### Improved
- **Suvidh Engineering Industries ERP Branding** ([LoginPage.jsx](src/pages/auth/LoginPage.jsx)): Updated the authentication portal header title to **Suvidh Engineering Industries ERP**.
- **Streamlined Navbar & Sidebar UX** ([AppSidebar.jsx](src/components/layout/AppSidebar.jsx), [TopNavbar.jsx](src/components/layout/TopNavbar.jsx)): Added hover-to-expand toggle directly over the collapsed sidebar logo icon and removed the duplicate desktop sidebar toggle icon from the top navbar.
- **Focused Dashboard KPI Strip & Header** ([DashboardPage.jsx](src/pages/dashboard/DashboardPage.jsx)): Removed `Total Customers` and `Active Products` summary cards so the 4 KPI cards align across a 4-column grid, and commented out `Production Planning` and `View Reports` header buttons.
- **Compact 3-Column Analytics Graphs** ([ChartCard.jsx](src/components/charts/ChartCard.jsx), [DashboardPage.jsx](src/pages/dashboard/DashboardPage.jsx), [FinancePage.jsx](src/pages/finance/FinancePage.jsx), [InventoryAnalyticsPage.jsx](src/pages/reports/InventoryAnalyticsPage.jsx)): Reduced default chart heights (`h-72` to `h-48`, `InventoryAnalyticsPage` `h-80` to `h-56`), scaled donut chart radii, updated the Dashboard chart grid to 3 columns (`lg:grid-cols-3`) with compact axis widths (`34–36px`) and `10px` ticks, and commented out the `Order Status Distribution` pie chart card.
- **Swapped Dashboard Operational Cards** ([DashboardPage.jsx](src/pages/dashboard/DashboardPage.jsx)): Moved `Recent Production Activity` to slot 4 and placed `Company Funds Remaining` in slot 1.
- **Commented Out Demo Role Switcher** ([TopNavbar.jsx](src/components/layout/TopNavbar.jsx), [UserDropdown.jsx](src/components/layout/UserDropdown.jsx), [UsersPage.jsx](src/pages/users/UsersPage.jsx)): Commented out demo role switcher UI controls across top bar, user menu, and Users management view while retaining underlying role utilities.

### Styled
- **Unified 5-Color Navy & Mist Theme**: Applied `#FEFEFE`, `#E7E9F0`, `#051747`, `#535F80`, and `#081F62` across application shells, tables, modals, forms, and controls while preserving Recharts series and status indicators.
- **Oceanic Codenames & Timeline Release Feed** ([ChangelogModal.jsx](src/components/layout/ChangelogModal.jsx), [ChangelogPage.jsx](src/pages/system/ChangelogPage.jsx)): Adopted the Oceanic codename sequence (`Nautilus` through `Albatross`) and styled the changelog as an editorial vertical timeline with sticky search and segmented category filter tabs.

### Fixed
- **Eager Routes & Live HMR Recovery** ([App.jsx](src/App.jsx), [AppRoutes.jsx](src/routes/AppRoutes.jsx)): Switched `DashboardPage` and `ChangelogPage` to eager route imports, registered `vite:afterUpdate` recovery on `AppErrorBoundary` with a **Retry View** button, and wired version badge clicks directly to `ChangelogModal` without page reloads.
