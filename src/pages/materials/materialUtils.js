export const MATERIAL_TYPES = [
  'Raw Material',
  'Consumable',
  'Component',
];

export const MATERIAL_CATEGORIES = [
  'Alloy Steel',
  'Stainless Steel',
  'Castings',
  'Non-Ferrous',
  'Seals & Fasteners',
  'Consumables',
];

export const MATERIAL_FORMS = [
  'Bar',
  'Rod',
  'Sheet',
  'Plate',
  'Pipe',
  'Tube',
  'Other',
];

export const COMMON_GRADES_BY_CATEGORY = {
  'Alloy Steel': ['EN19', 'EN24', 'EN31', 'AISI 4140', 'AISI 4340', '16MnCr5', '20MnCr5', '8620', 'SAE 52100'],
  'Stainless Steel': ['SS 304', 'SS 304L', 'SS 316', 'SS 316L', 'SS 310', 'SS 410', '17-4 PH', 'Duplex 2205'],
  'Castings': ['FG200', 'FG260', 'FG300', 'SG400/15', 'SG500/7', 'WCB Cast Steel', 'CF8M Stainless Cast'],
  'Non-Ferrous': ['6061-T6 Aluminum', '6082-T6', '7075-T6 Aerospace Alu', 'PB2 Phosphor Bronze', 'C360 Free-Cutting Brass', 'Copper C101'],
  'Seals & Fasteners': ['Grade 8.8 High Tensile', 'Grade 10.9', 'Grade 12.9 Socket', 'A2-70 Stainless', 'A4-80 Marine', 'Viton / FKM', 'NBR Nitrile 70'],
  'Consumables': ['Semi-Synthetic Soluble', 'Full-Synthetic Coolant', 'ISO VG 46 Hydraulic', 'ISO VG 68 Slideway', 'Carbide TiAlN Grade', 'Standard Industrial'],
};

export const COMMON_STANDARDS = [
  'ASTM / ASME',
  'IS (Indian Standard)',
  'DIN (German Standard)',
  'AISI / SAE',
  'ISO',
  'JIS (Japanese Standard)',
  'BS (British Standard)',
  'OEM / Proprietary',
];

export const UOM_OPTIONS = [
  'Kg',
  'Nos',
  'Mtr',
  'Ltr',
  'Set',
  'Pcs',
  'Sheet',
  'Roll',
];

export const CATEGORY_STYLES = {
  'Alloy Steel': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50',
  'Stainless Steel': 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-900/50',
  'Castings': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50',
  'Non-Ferrous': 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/50',
  'Seals & Fasteners': 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50',
  'Consumables': 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/50',
};

export const TYPE_STYLES = {
  'Raw Material': 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800',
  'Consumable': 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800',
  'Component': 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800',
};

export function getMaterialInitials(code, name) {
  if (code && code.startsWith('RM-')) {
    const parts = code.split('-');
    if (parts.length >= 2) return parts[1].slice(0, 3).toUpperCase();
  }
  if (!name) return 'RM';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function formatDimensions(dimensions = {}, formType = 'Bar') {
  if (!dimensions || typeof dimensions !== 'object') return '';
  const { diameter, length, width, thickness, outerDiameter, wallThickness, notes } = dimensions;

  switch (formType) {
    case 'Bar':
    case 'Rod':
      if (diameter && length) return `Ø ${diameter}mm × ${length}mm L`;
      if (diameter) return `Ø ${diameter}mm`;
      break;
    case 'Sheet':
    case 'Plate':
      if (length && width && thickness) return `${thickness}mm Thk × ${width}mm W × ${length}mm L`;
      if (thickness) return `${thickness}mm Thickness`;
      break;
    case 'Pipe':
    case 'Tube':
      if (outerDiameter && wallThickness && length) {
        return `OD ${outerDiameter}mm × WT ${wallThickness}mm × ${length}mm L`;
      }
      if (outerDiameter && length) return `OD ${outerDiameter}mm × ${length}mm L`;
      break;
    default:
      if (notes) return notes;
  }
  return notes || '';
}

export function createEmptyMaterialForm(existingMaterials = []) {
  const nextNum = existingMaterials.length + 1;
  const currentYear = new Date().getFullYear();
  const autoCode = `RM-${currentYear}-${String(nextNum).padStart(3, '0')}`;

  return {
    id: '',
    code: autoCode,
    name: '',
    description: '',
    category: 'Alloy Steel',
    materialType: 'Raw Material',
    grade: 'EN19 / AISI 4140',
    brand: '',
    uom: 'Kg',
    unitCost: 100,
    preferredSupplierId: '',
    leadTimeDays: 7,
    reorderLevel: 200,
    minStock: 100,
    maxStock: 2000,
    safetyStock: 50,
    location: 'Rack A-01',
    standard: 'ASTM / ASME',
    materialForm: 'Bar',
    dimensions: {
      diameter: 50,
      length: 3000,
      width: '',
      thickness: '',
      outerDiameter: '',
      wallThickness: '',
      notes: '',
    },
    tolerance: '±0.05 mm',
    density: '7.85 g/cm³',
    spec: '',
    requireQc: true,
    batchTracking: true,
    heatNumberTracking: true,
    status: 'Active',
  };
}
