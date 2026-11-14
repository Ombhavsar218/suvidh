import { buildXlsxBlob } from '../utils/excelParser';

export function exportToCsv(filename, headers, rows) {
  const escapeCell = (value) => {
    const str = value === null || value === undefined ? '' : String(value);
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ];

  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadSampleScheduleCsv() {
  const headers = [
    'ScheduleNumber',
    'CustomerCode',
    'ProductCode',
    'ScheduledQty',
    'RequiredDate',
    'Priority',
  ];
  const rows = [
    ['BHL-SCH-2026-1140', 'CUS-BHL-01', 'PRD-HYD-101', 150, '2026-11-22', 'High'],
    ['TAC-SCH-2026-1141', 'CUS-TAC-04', 'PRD-SHF-204', 280, '2026-11-25', 'Critical'],
    ['BHL-SCH-2026-1101', 'CUS-BHL-01', 'PRD-HYD-101', 300, '2026-11-12', 'Critical'],
    ['ERR-SCH-2026-1142', 'CUS-UNKNOWN', 'PRD-VLV-308', -45, 'invalid-date', 'Medium'],
  ];
  exportToCsv('Suvidh_Schedule_Import_Sample.csv', headers, rows);
}

export function downloadSampleCustomerXlsx() {
  const headers = [
    'Customer Code',
    'Customer Name',
    'Contact Person',
    'Email',
    'Phone',
    'Address',
    'Priority Tier',
    'Status',
  ];
  const rows = [
    [
      'CUS-BFL-09',
      'Bharat Forge Components',
      'Siddharth Deshpande',
      's.deshpande@bharatforge-demo.in',
      '+91 98231 55410',
      'Mundhwa Industrial Estate, Pune, Maharashtra 411036',
      'Critical',
      'Active',
    ],
    [
      'CUS-CUM-10',
      'Cummins India Drivetrain',
      'Priya Gokhale',
      'priya.gokhale@cummins-demo.in',
      '+91 97640 88219',
      'Kothrud Industrial Area, Pune, Maharashtra 411038',
      'High',
      'Active',
    ],
    [
      'CUS-SKF-11',
      'SKF Industrial Bearings',
      'Arjun Kulkarni',
      'arjun.k@skf-demo.in',
      '+91 98501 74123',
      'Chinchwad MIDC Sector II, Pune, Maharashtra 411019',
      'Medium',
      'Active',
    ],
  ];

  const blob = buildXlsxBlob('Customers', headers, rows);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'Suvidh_Customers_Import_Template.xlsx');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function triggerPrint() {
  window.print();
}
