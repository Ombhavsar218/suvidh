const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    c = crcTable[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function escapeXml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function decodeXmlEntities(str) {
  return String(str ?? '')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function colLettersToIndex(letters) {
  let index = 0;
  const upper = letters.toUpperCase();
  for (let i = 0; i < upper.length; i += 1) {
    index = index * 26 + (upper.charCodeAt(i) - 64);
  }
  return Math.max(0, index - 1);
}

function indexToColLetters(index) {
  let n = index + 1;
  let letters = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

function getAttr(attrText, name) {
  const re = new RegExp(`(?:^|\\s)(?:[a-zA-Z0-9_-]+:)?${name}\\s*=\\s*("([^"]*)"|'([^']*)')`);
  const m = attrText.match(re);
  return m ? decodeXmlEntities(m[2] ?? m[3] ?? '') : '';
}

function extractTextRuns(xml) {
  const parts = [];
  const tRe = /<(?:[a-zA-Z0-9_-]+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?t>/g;
  let match;
  while ((match = tRe.exec(xml)) !== null) {
    parts.push(decodeXmlEntities(match[1]));
  }
  return parts.join('');
}

async function decompressEntry(bytes, method) {
  if (method === 0) return bytes;
  if (method === 8) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('This browser cannot decompress deflate ZIP entries.');
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    const buf = await new Response(stream).arrayBuffer();
    return new Uint8Array(buf);
  }
  throw new Error(`Unsupported compression method (${method}) inside .xlsx archive.`);
}

async function unzipXlsxEntries(buffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder('utf-8');

  let eocdOffset = -1;
  const searchStart = Math.max(0, bytes.length - 65557);
  for (let i = bytes.length - 22; i >= searchStart; i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) {
    throw new Error('Invalid .xlsx archive (ZIP directory not found).');
  }

  const totalEntries = view.getUint16(eocdOffset + 10, true);
  let cdOffset = view.getUint32(eocdOffset + 16, true);
  const entries = new Map();

  for (let i = 0; i < totalEntries; i += 1) {
    if (cdOffset + 46 > bytes.length || view.getUint32(cdOffset, true) !== 0x02014b50) {
      break;
    }
    const method = view.getUint16(cdOffset + 10, true);
    const compressedSize = view.getUint32(cdOffset + 20, true);
    const fnLen = view.getUint16(cdOffset + 28, true);
    const extraLen = view.getUint16(cdOffset + 30, true);
    const commentLen = view.getUint16(cdOffset + 32, true);
    const localHeaderOffset = view.getUint32(cdOffset + 42, true);

    const fileName = decoder
      .decode(bytes.subarray(cdOffset + 46, cdOffset + 46 + fnLen))
      .replace(/^\/+/, '');
    cdOffset += 46 + fnLen + extraLen + commentLen;

    if (
      fileName.endsWith('/') ||
      localHeaderOffset + 30 > bytes.length ||
      view.getUint32(localHeaderOffset, true) !== 0x04034b50
    ) {
      continue;
    }

    const lFnLen = view.getUint16(localHeaderOffset + 26, true);
    const lExtraLen = view.getUint16(localHeaderOffset + 28, true);
    const dataStart = localHeaderOffset + 30 + lFnLen + lExtraLen;
    const rawSlice = bytes.subarray(dataStart, dataStart + compressedSize);
    const inflated = await decompressEntry(rawSlice, method);
    entries.set(fileName, decoder.decode(inflated));
  }

  return entries;
}

function getEntry(entries, targetPath) {
  if (entries.has(targetPath)) return entries.get(targetPath);
  const lower = targetPath.toLowerCase();
  for (const [k, v] of entries.entries()) {
    if (k.toLowerCase() === lower) return v;
  }
  return undefined;
}

function resolveFirstSheetPath(entries) {
  const workbookXml = getEntry(entries, 'xl/workbook.xml');
  const relsXml = getEntry(entries, 'xl/_rels/workbook.xml.rels');

  if (workbookXml) {
    const firstSheetMatch = workbookXml.match(/<(?:[a-zA-Z0-9_-]+:)?sheet\s+([^>]+?)\/?>/);
    if (firstSheetMatch && relsXml) {
      const rId = getAttr(firstSheetMatch[1], 'id');
      if (rId) {
        const relRe = /<Relationship\s+([^>]+?)\/?>/g;
        let relMatch;
        while ((relMatch = relRe.exec(relsXml)) !== null) {
          if (getAttr(relMatch[1], 'Id') === rId) {
            const target = getAttr(relMatch[1], 'Target').replace(/^\/+/, '');
            const resolved = target.toLowerCase().startsWith('xl/') ? target : `xl/${target}`;
            if (getEntry(entries, resolved) !== undefined) return resolved;
          }
        }
      }
    }
  }

  for (const key of entries.keys()) {
    if (/^xl\/worksheets\/sheet\d+\.xml$/i.test(key)) return key;
  }
  return null;
}

function parseSharedStrings(xml) {
  if (!xml) return [];
  const strings = [];
  const siRe = /<(?:[a-zA-Z0-9_-]+:)?si\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?si>/g;
  let match;
  while ((match = siRe.exec(xml)) !== null) {
    strings.push(extractTextRuns(match[1]));
  }
  return strings;
}

function parseWorksheetXml(sheetXml, sharedStrings) {
  const matrix = [];
  const rowRe = /<(?:[a-zA-Z0-9_-]+:)?row\b([^>]*)>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?row>/g;
  let rowMatch;

  while ((rowMatch = rowRe.exec(sheetXml)) !== null) {
    const rowBody = rowMatch[2];
    const rowValues = [];
    let fallbackCol = 0;

    const cellRe = /<(?:[a-zA-Z0-9_-]+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?c>)/g;
    let cellMatch;

    while ((cellMatch = cellRe.exec(rowBody)) !== null) {
      const attrs = cellMatch[1];
      const inner = cellMatch[2] || '';
      const ref = getAttr(attrs, 'r');
      const colMatch = ref.match(/^([A-Za-z]+)\d+$/);
      const colIdx = colMatch ? colLettersToIndex(colMatch[1]) : fallbackCol;
      fallbackCol = colIdx + 1;

      const cellType = getAttr(attrs, 't');
      let val = '';

      if (cellType === 'inlineStr') {
        val = extractTextRuns(inner);
      } else {
        const vMatch = inner.match(/<(?:[a-zA-Z0-9_-]+:)?v\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?v>/);
        const raw = vMatch ? decodeXmlEntities(vMatch[1]) : '';
        if (cellType === 's') {
          val = sharedStrings[Number(raw)] ?? '';
        } else if (cellType === 'b') {
          val = raw === '1' ? 'TRUE' : 'FALSE';
        } else {
          val = raw;
        }
      }

      while (rowValues.length <= colIdx) rowValues.push('');
      rowValues[colIdx] = String(val ?? '').trim();
    }

    if (rowValues.some((v) => v !== '')) {
      matrix.push(rowValues);
    }
  }

  return matrix;
}

export function parseDelimitedText(text) {
  const cleaned = String(text || '').replace(/^\uFEFF/, '');
  const firstLine = cleaned.split(/\r?\n/)[0] || '';
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const delimiter =
    tabCount > commaCount && tabCount >= semiCount
      ? '\t'
      : semiCount > commaCount
      ? ';'
      : ',';

  const matrix = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i += 1) {
    const ch = cleaned[i];
    const next = cleaned[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      row.push(cell.trim());
      cell = '';
    } else if ((ch === '\r' || ch === '\n') && !inQuotes) {
      if (ch === '\r' && next === '\n') i += 1;
      row.push(cell.trim());
      if (row.some((v) => v !== '')) matrix.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    if (row.some((v) => v !== '')) matrix.push(row);
  }

  return matrix;
}

function parseSpreadsheetMlXml(xmlText) {
  const matrix = [];
  const rowRe = /<(?:[a-zA-Z0-9_-]+:)?Row\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?Row>/gi;
  let rowMatch;
  while ((rowMatch = rowRe.exec(xmlText)) !== null) {
    const rowValues = [];
    const cellRe = /<(?:[a-zA-Z0-9_-]+:)?Cell\b([^>]*)>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?Cell>/gi;
    let cellMatch;
    while ((cellMatch = cellRe.exec(rowMatch[1])) !== null) {
      const idxAttr = getAttr(cellMatch[1], 'Index');
      if (idxAttr) {
        const target = Math.max(0, Number(idxAttr) - 1);
        while (rowValues.length < target) rowValues.push('');
      }
      const dataMatch = cellMatch[2].match(
        /<(?:[a-zA-Z0-9_-]+:)?Data\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?Data>/i
      );
      rowValues.push(dataMatch ? decodeXmlEntities(dataMatch[1]).trim() : '');
    }
    if (rowValues.some((v) => v !== '')) matrix.push(rowValues);
  }
  return matrix;
}

function parseHtmlTableXls(htmlText) {
  const matrix = [];
  const trRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  while ((trMatch = trRe.exec(htmlText)) !== null) {
    const rowValues = [];
    const tdRe = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let tdMatch;
    while ((tdMatch = tdRe.exec(trMatch[1])) !== null) {
      const text = decodeXmlEntities(tdMatch[1].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
      rowValues.push(text);
    }
    if (rowValues.some((v) => v !== '')) matrix.push(rowValues);
  }
  return matrix;
}

function matrixToObjects(matrix) {
  if (!matrix || matrix.length < 2) {
    return { headers: matrix?.[0] || [], rows: [] };
  }
  const headers = matrix[0].map((h, i) => String(h || `Column_${i + 1}`).trim());
  const rows = matrix.slice(1).map((vals) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = String(vals[i] ?? '').trim();
    });
    return obj;
  });
  return { headers, rows };
}

export async function parseSpreadsheetFile(file) {
  if (!file) throw new Error('No file selected.');
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (bytes.length === 0) {
    throw new Error('Selected file is empty.');
  }

  // PK ZIP (.xlsx)
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    const entries = await unzipXlsxEntries(buffer);
    const sheetPath = resolveFirstSheetPath(entries);
    if (!sheetPath) {
      throw new Error('Could not locate a worksheet inside the .xlsx workbook.');
    }
    const sharedStrings = parseSharedStrings(getEntry(entries, 'xl/sharedStrings.xml'));
    const matrix = parseWorksheetXml(getEntry(entries, sheetPath), sharedStrings);
    return matrixToObjects(matrix);
  }

  // Legacy binary OLE2 (.xls BIFF8)
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) {
    throw new Error(
      'Legacy binary .xls format cannot be parsed directly in the browser. Please save the file as .xlsx or .csv and upload again.'
    );
  }

  const text = new TextDecoder('utf-8').decode(bytes);
  const trimmed = text.trim();

  if (/<Workbook\b/i.test(trimmed) || (trimmed.startsWith('<?xml') && /<Row\b/i.test(trimmed))) {
    return matrixToObjects(parseSpreadsheetMlXml(text));
  }
  if (/<table\b/i.test(trimmed) || /<tr\b/i.test(trimmed)) {
    return matrixToObjects(parseHtmlTableXls(text));
  }

  return matrixToObjects(parseDelimitedText(text));
}

function normalizeKey(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const CUSTOMER_HEADER_ALIASES = {
  code: ['code', 'customercode', 'custcode', 'clientcode', 'accountcode'],
  name: ['name', 'customername', 'companyname', 'company', 'customer', 'clientname', 'client'],
  contactPerson: [
    'contactperson',
    'contactname',
    'contact',
    'person',
    'representative',
    'poc',
  ],
  email: ['email', 'emailaddress', 'mail', 'workemail', 'officialemail'],
  phone: ['phone', 'phonenumber', 'mobile', 'mobilenumber', 'contactnumber', 'tel', 'telephone'],
  address: [
    'address',
    'plantaddress',
    'billingaddress',
    'plantbillingaddress',
    'location',
    'cityaddress',
  ],
  priorityTier: ['prioritytier', 'priority', 'tier'],
  status: ['status', 'accountstatus', 'state'],
};

const TIER_NORMALIZE = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const STATUS_NORMALIZE = {
  active: 'Active',
  inactive: 'Inactive',
};

export function mapCustomerSheetRows(parsedRows) {
  return parsedRows.map((raw) => {
    const byNormKey = {};
    Object.entries(raw || {}).forEach(([k, v]) => {
      byNormKey[normalizeKey(k)] = String(v ?? '').trim();
    });

    const pick = (field) => {
      for (const alias of CUSTOMER_HEADER_ALIASES[field]) {
        if (byNormKey[alias] !== undefined) return byNormKey[alias];
      }
      return '';
    };

    const rawTier = pick('priorityTier').toLowerCase();
    const rawStatus = pick('status').toLowerCase();

    return {
      code: pick('code'),
      name: pick('name'),
      contactPerson: pick('contactPerson'),
      email: pick('email'),
      phone: pick('phone'),
      address: pick('address'),
      priorityTier: rawTier ? TIER_NORMALIZE[rawTier] || pick('priorityTier') : 'High',
      status: rawStatus ? STATUS_NORMALIZE[rawStatus] || pick('status') : 'Active',
    };
  });
}

function buildZipArchive(files) {
  const encoder = new TextEncoder();
  const localParts = [];
  const cdParts = [];
  let offset = 0;

  files.forEach(({ name, content }) => {
    const fnBytes = encoder.encode(name);
    const dataBytes = typeof content === 'string' ? encoder.encode(content) : content;
    const sum = crc32(dataBytes);

    const localHeader = new Uint8Array(30 + fnBytes.length);
    const lView = new DataView(localHeader.buffer);
    lView.setUint32(0, 0x04034b50, true);
    lView.setUint16(4, 20, true);
    lView.setUint16(6, 0x0800, true); // UTF-8 flag
    lView.setUint16(8, 0, true); // Stored
    lView.setUint32(14, sum, true);
    lView.setUint32(18, dataBytes.length, true);
    lView.setUint32(22, dataBytes.length, true);
    lView.setUint16(26, fnBytes.length, true);
    lView.setUint16(28, 0, true);
    localHeader.set(fnBytes, 30);

    const cdHeader = new Uint8Array(46 + fnBytes.length);
    const cView = new DataView(cdHeader.buffer);
    cView.setUint32(0, 0x02014b50, true);
    cView.setUint16(4, 20, true);
    cView.setUint16(6, 20, true);
    cView.setUint16(8, 0x0800, true);
    cView.setUint16(10, 0, true);
    cView.setUint32(16, sum, true);
    cView.setUint32(20, dataBytes.length, true);
    cView.setUint32(24, dataBytes.length, true);
    cView.setUint16(28, fnBytes.length, true);
    cView.setUint32(42, offset, true);
    cdHeader.set(fnBytes, 46);

    localParts.push(localHeader, dataBytes);
    cdParts.push(cdHeader);
    offset += localHeader.length + dataBytes.length;
  });

  const cdSize = cdParts.reduce((s, p) => s + p.length, 0);
  const eocd = new Uint8Array(22);
  const eView = new DataView(eocd.buffer);
  eView.setUint32(0, 0x06054b50, true);
  eView.setUint16(8, files.length, true);
  eView.setUint16(10, files.length, true);
  eView.setUint32(12, cdSize, true);
  eView.setUint32(16, offset, true);

  return new Blob([...localParts, ...cdParts, eocd], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export function buildXlsxBlob(sheetName, headers, rows) {
  const safeSheet = escapeXml(String(sheetName || 'Sheet1').slice(0, 31));
  const allRows = [headers, ...rows];

  const rowsXml = allRows
    .map((cells, rIdx) => {
      const rowNum = rIdx + 1;
      const cellsXml = cells
        .map((val, cIdx) => {
          const ref = `${indexToColLetters(cIdx)}${rowNum}`;
          const styleAttr = rIdx === 0 ? ' s="1"' : '';
          return `<c r="${ref}" t="inlineStr"${styleAttr}><is><t xml:space="preserve">${escapeXml(val)}</t></is></c>`;
        })
        .join('');
      return `<row r="${rowNum}">${cellsXml}</row>`;
    })
    .join('');

  const files = [
    {
      name: '[Content_Types].xml',
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        '</Types>',
    },
    {
      name: '_rels/.rels',
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>',
    },
    {
      name: 'xl/workbook.xml',
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        `<sheets><sheet name="${safeSheet}" sheetId="1" r:id="rId1"/></sheets>` +
        '</workbook>',
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
        '</Relationships>',
    },
    {
      name: 'xl/styles.xml',
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        '<fonts count="2">' +
        '<font><sz val="11"/><name val="Calibri"/></font>' +
        '<font><b/><sz val="11"/><color rgb="FF051747"/><name val="Calibri"/></font>' +
        '</fonts>' +
        '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE7E9F0"/></patternFill></fill></fills>' +
        '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
        '<cellXfs count="2">' +
        '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
        '<xf numFmtId="0" fontId="1" fillId="1" borderId="0" xfId="0" applyFont="1" applyFill="1"/>' +
        '</cellXfs>' +
        '</styleSheet>',
    },
    {
      name: 'xl/worksheets/sheet1.xml',
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        `<sheetData>${rowsXml}</sheetData>` +
        '</worksheet>',
    },
  ];

  return buildZipArchive(files);
}
