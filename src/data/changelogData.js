export const OCEAN_CODENAMES = [
  'Nautilus',
  'Coral Reef',
  'Manta Ray',
  'Orca',
  'Blue Marlin',
  'Beluga',
  'Narwhal',
  'Dolphin',
  'Atoll',
  'Sea Turtle',
  'Humpback',
  'Albatross',
];

// Day-wise versioning: increment once per active calendar day (1.0.0, 1.0.1, ...)
// using OCEAN_CODENAMES in sequence, listing all changes made that day under one entry.
export const CURRENT_VERSION = '1.0.2';
export const CURRENT_RELEASE_NAME = 'Manta Ray';

export const CHANGELOG_ENTRIES = [
  {
    version: '1.0.2',
    name: 'Manta Ray',
    date: '2026-11-13',
    tag: 'Latest',
    summary:
      'Day 3 release introducing custom theme-matched dropdowns for filters and pagination, an executive Table format for Customers with operational metrics, top KPI cards, dedicated full-page customer edit form at /customers/:id/edit, red customer delete action with confirmation safeguards, direct edit access from Customer Details, and breadcrumb route hierarchy.',
    sections: [
      {
        category: 'Added',
        items: [
          {
            title: 'Custom Theme-Matched Dropdown Components',
            detail:
              'Replaced native browser select inputs in FilterDropdown, Pagination, and FormSelect with custom theme-styled dropdowns. Features navy-bordered triggers, smooth rotation chevrons, floating shadow-elevated popovers, checkmark indicators, and click-outside dismissal matching the #081F62, #051747, and #FEFEFE theme.',
          },
          {
            title: 'Executive Customer Table & KPI Overview',
            detail:
              'Redesigned CustomersPage into a comprehensive executive Table view with initials badges, organization details, contacts, priority score meters, operational counts (Supplied Products, Active Schedules), and live receivables tracking, accompanied by 4 top summary StatCards and view mode options.',
          },
          {
            title: 'Customer Delete Action with Confirmation Safeguard',
            detail:
              'Added a Delete Customer action button (Trash2 icon) in the Customers table row actions, supported by deleteCustomer in ErpDataContext and a destructive ConfirmationDialog safeguard before permanently removing the record from LocalStorage.',
          },
          {
            title: 'Dedicated Full-Page Customer Edit Route',
            detail:
              'Extended CustomerFormPage into a unified form component supporting both /customers/new and /customers/:id/edit. Pre-populates customer data, preserves existing customer IDs and linked product associations, and avoids popup dialogs.',
          },
          {
            title: 'Edit Customer Action in Customer Details',
            detail:
              'Added an Edit Customer primary button to the PageHeader of CustomerDetailPage navigating directly to /customers/:id/edit.',
          },
        ],
      },
      {
        category: 'Improved',
        items: [
          {
            title: 'Direct Navigation from Customers Table Edit Action',
            detail:
              'Clicking the edit pencil icon in the Customers table now routes immediately to /customers/:id/edit instead of opening a modal, and obsolete customer modal states and forms have been cleanly removed.',
          },
          {
            title: 'Breadcrumb Hierarchy for Customer Editing',
            detail:
              'Registered /customers/:id/edit in navigationConfig so breadcrumbs clearly display Customers > [Customer Code] > Edit Customer.',
          },
        ],
      },
    ],
  },
  {
    version: '1.0.1',
    name: 'Coral Reef',
    date: '2026-11-11',
    tag: 'Released',
    summary:
      'Day 2 release adding Excel/CSV bulk customer import, dedicated full-page New Customer form, replacing Machine Availability with Pending Billing & Invoices, simplifying the Dashboard title, and transitioning the changelog to day-wise Oceanic versions.',
    sections: [
      {
        category: 'Added',
        items: [
          {
            title: 'Dedicated New Customer Form Page',
            detail:
              'Added a dedicated full-page CustomerFormPage at /customers/new with account classification, primary contact, billing address, optional product links, and validation when clicking Add Customer instead of opening a popup modal.',
          },
          {
            title: 'Customer Excel Sheet Import',
            detail:
              'Added an Import Excel button on CustomersPage with a modal supporting browser-native .xlsx, XML/HTML .xls, and .csv parsing via excelParser, downloadable .xlsx template generation, row-by-row validation, duplicate skipping, and batch import in ErpDataContext.',
          },
        ],
      },
      {
        category: 'Improved',
        items: [
          {
            title: 'Pending Billing & Invoices Dashboard Card',
            detail:
              'Replaced the Machine Availability card on DashboardPage with a live Pending Billing & Invoices summary computed from billingDocuments showing total unsettled receivables, earliest-due invoices, customer balances, due dates, and direct /billing navigation.',
          },
          {
            title: 'Simplified Dashboard Page Title',
            detail:
              'Removed "Manufacturing Operations" from the PageHeader heading on DashboardPage so the workspace title displays cleanly as "Dashboard".',
          },
          {
            title: 'Day-Wise Release Versioning',
            detail:
              'Switched changelog tracking from feature-by-feature bumps to daily releases (v1.0.0 for 2026-11-10, v1.0.1 for 2026-11-11, incrementing once per new day forward) while preserving the sequential Oceanic codenames (Nautilus, Coral Reef, Manta Ray, Orca, Blue Marlin, Beluga, Narwhal, Dolphin, Atoll, Sea Turtle, Humpback, Albatross).',
          },
        ],
      },
      {
        category: 'Styled',
        items: [
          {
            title: 'Day-Wise Changelog UI & Date Search',
            detail:
              'Updated ChangelogPage and ChangelogModal copy for daily release cadence, added date matching to changelog search, and synced CHANGELOG.md and package.json to v1.0.1.',
          },
        ],
      },
    ],
  },
  {
    version: '1.0.0',
    name: 'Nautilus',
    date: '2026-11-10',
    tag: 'Baseline',
    summary:
      'Day 1 baseline consolidating all 24 Suvidh ERP modules, login portal branding, custom tooltips, changelog timeline UX, HMR recovery fixes, role switcher cleanup, compact 3-column analytics graphs, and live Company Funds Remaining card.',
    sections: [
      {
        category: 'Added',
        items: [
          {
            title: '24 Manufacturing ERP Modules',
            detail:
              'Dashboard, Customers & Customer Details, Products & Product Details, Bill of Materials (BOM), Raw Materials, Inventory, Machines & Machine Details, Suppliers, Customer Schedules, Purchase Management & PO Details, Production Planning, Production Execution, Quality Control, Finished Goods, Sales Orders, Dispatch Management, Billing, Financial Management, Reports, Production Analytics, Inventory Analytics, Notifications, User Management, and System Settings.',
          },
          {
            title: 'Enterprise Login Portal',
            detail:
              'Centered single-card sign-in screen in LoginPage with email/password validation, visibility toggle, administrator reset notice, demo role presets, and LocalStorage session state.',
          },
          {
            title: 'Portal Tooltip System',
            detail:
              'Viewport-aware white (#FEFEFE) tooltip component with #051747 typography, #535F80 border, and directional arrow across navigation items and table row actions.',
          },
          {
            title: 'In-App Changelog & Popup Modal',
            detail:
              'Dedicated /changelog page alongside the interactive ChangelogModal popup accessible from clickable version pills in TopNavbar, AppSidebar, and UserDropdown, synced with CHANGELOG.md.',
          },
          {
            title: 'Company Funds Remaining Widget',
            detail:
              'Replaced Pending Quality Inspections on the Dashboard with a live Company Funds Remaining card computed from financeTransactions showing Available Cash Balance, Net Projected Position, Settled Receipts, Expenses Paid, Pending Receivables, Pending Payables, and direct /finance navigation.',
          },
        ],
      },
      {
        category: 'Improved',
        items: [
          {
            title: 'Suvidh Engineering Industries ERP Branding',
            detail:
              'Updated the LoginPage brand heading from Suvidh ERP to Suvidh Engineering Industries ERP with balanced responsive typography.',
          },
          {
            title: 'Streamlined Navbar & Sidebar UX',
            detail:
              'Added hover-to-expand toggle directly on the collapsed desktop sidebar logo in AppSidebar and removed the duplicate desktop sidebar toggle icon from TopNavbar.',
          },
          {
            title: 'Focused Dashboard KPI Strip & Header',
            detail:
              'Removed Total Customers and Active Products KPI cards so the remaining 4 operational KPIs span cleanly across 4 columns, and commented out Production Planning and View Reports header quick-action buttons.',
          },
          {
            title: 'Compact 3-Column Analytics Graphs',
            detail:
              'Reduced ChartCard default height (h-72 to h-48), reduced InventoryAnalyticsPage chart height (h-80 to h-56), scaled Pie donut radii on DashboardPage and FinancePage, arranged Dashboard charts into a 3-column desktop grid (lg:grid-cols-3) with narrower axes and 10px ticks, and commented out Order Status Distribution.',
          },
          {
            title: 'Swapped Dashboard Operational Cards',
            detail:
              'Swapped Recent Production Activity into slot 4 of the 6-card operational grid and placed Company Funds Remaining in slot 1.',
          },
          {
            title: 'Commented Out Demo Role Switcher',
            detail:
              'Commented out Demo Role Switcher UI controls across TopNavbar, UserDropdown, and UsersPage while preserving underlying role state and RoleGate checks.',
          },
        ],
      },
      {
        category: 'Styled',
        items: [
          {
            title: 'Unified 5-Color Navy & Mist Theme',
            detail:
              'Applied #FEFEFE, #E7E9F0, #051747, #535F80, and #081F62 across layout shells, forms, tables, modals, and controls while preserving Recharts series and status indicators.',
          },
          {
            title: 'Oceanic Codenames & Timeline Changelog UI',
            detail:
              'Adopted the Oceanic release codename series (Nautilus through Albatross) and designed the changelog viewer as an editorial vertical timeline with sticky search and segmented category filter tabs.',
          },
        ],
      },
      {
        category: 'Fixed',
        items: [
          {
            title: 'Eager Routes & Live HMR Recovery',
            detail:
              'Switched DashboardPage and ChangelogPage to eager route imports in AppRoutes, wired vite:afterUpdate cleanup inside App to clear AppErrorBoundary automatically with a Retry View recovery button, and opened ChangelogModal directly from version badge clicks.',
          },
        ],
      },
    ],
  },
];
