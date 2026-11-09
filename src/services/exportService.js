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

export function triggerPrint() {
  window.print();
}
