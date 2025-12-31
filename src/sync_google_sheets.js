import path from 'path';
import crypto from 'crypto';
import XLSX from 'xlsx';
import store from './store.js';

// Usage:
//   node src/sync_google_sheets.js --sheetId=<ID> --gid=<GID> [--type=Project|CR|auto]
// Or via env vars SHEET_ID, GID, TYPE

function parseArgs(argv) {
  const out = {};
  for (const arg of argv) {
    const m = arg.match(/^--([^=]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const SHEET_ID = args.sheetId || process.env.SHEET_ID || '';
const GID = args.gid || process.env.GID || '';
const TYPE = (args.type || process.env.TYPE || 'auto').toLowerCase();

if (!SHEET_ID || !GID) {
  console.error('Usage: node src/sync_google_sheets.js --sheetId=<ID> --gid=<GID> [--type=Project|CR|auto]');
  console.error('Tip: Ensure the sheet/tab is shared or published so CSV export works.');
  process.exit(1);
}

function uuid() { return crypto.randomUUID(); }
function now() { return new Date().toISOString(); }

function normalizeKey(k) {
  return String(k || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function toNormRow(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) out[normalizeKey(k)] = v;
  return out;
}

function pick(norm, aliases, def = '') {
  for (const a of aliases) {
    if (norm[a] !== undefined && norm[a] !== '') return norm[a];
  }
  return def;
}

function excelDateToISO(v) {
  if (v === undefined || v === null || v === '') return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number') {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(epoch.getTime() + v * 86400000);
    return d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  // handle dd/mm/yyyy and mmm-yy variants loosely
  const parsed = new Date(s);
  if (!isNaN(parsed)) return parsed.toISOString().slice(0, 10);
  // try replace '-' with ' '
  const parsed2 = new Date(s.replace(/-/g, ' '));
  if (!isNaN(parsed2)) return parsed2.toISOString().slice(0, 10);
  return null;
}

function ensureDepartment(data, name) {
  if (!name) return null;
  const found = data.departments.find(d => d.name === name);
  if (found) return found.id;
  const id = uuid();
  data.departments.push({ id, name });
  return id;
}

function ensureUser(data, name, role, departmentId) {
  if (!name) return null;
  const found = data.users.find(u => u.name === name);
  if (found) return found.id;
  const id = uuid();
  const email = `${String(name).replace(/\s+/g,'').toLowerCase()}@example.com`;
  data.users.push({ id, name, email, role: role || 'BusinessOwner', departmentId: departmentId || null, active: true });
  return id;
}

function detectType(normRow) {
  const explicit = String(pick(normRow, ['type'], '')).toLowerCase();
  if (explicit === 'project') return 'Project';
  if (explicit === 'cr' || explicit === 'changerequest' || explicit === 'change') return 'CR';
  const hasCRCols = ['uatstart','uatend','sitstart','sitend','livedate','crsubmissionstart','crsubmissionend']
    .some(k => normRow[k] !== undefined && normRow[k] !== '');
  return hasCRCols ? 'CR' : 'Project';
}

async function fetchCsv(sheetId, gid) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch CSV: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  return text;
}

function trimCsvToHeader(csvText) {
  const lines = csvText.split(/\r?\n/);
  let headerIdx = 0;
  const headerMatcher = /initiative\s*name|ticket|create\s*date/i;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (headerMatcher.test(line)) { headerIdx = i; break; }
  }
  return lines.slice(headerIdx).join('\n');
}

function parseCsvToRows(csvText) {
  const csv = trimCsvToHeader(csvText);
  const wb = XLSX.read(csv, { type: 'string' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

function importFromRows(rows, data) {
  let addedInitiatives = 0;
  let addedCRs = 0;
  for (const raw of rows) {
    const n = toNormRow(raw);
    const type = (TYPE === 'auto' ? detectType(n) : (TYPE === 'cr' ? 'CR' : 'Project'));
    const name = pick(n, ['initiativename','projectname','crname','name','title']).toString().trim();
    if (!name) continue;
    const ticket = pick(n, ['ticketno','ticket','no']).toString().trim() || null;
    const description = pick(n, ['description']);
    const businessImpact = pick(n, ['businessimpact','impact']);
    const priority = String(pick(n, ['priority'], 'P2')).toUpperCase();
    const departmentName = pick(n, ['department','dept'], 'IT');
    const businessOwnerName = pick(n, ['businessownerrequestor','businessownerrequester','businessowner','requestor','requester'], 'Business Owner');
    const itPicName = pick(n, ['itpic','itowner'], 'IT PIC');
    const status = pick(n, ['status'], 'Not Started');
    const milestone = pick(n, ['milestone'], ''); // Keep empty if no milestone in spreadsheet
    const startDate = excelDateToISO(pick(n, ['startdate','createdate']));
    const endDate = excelDateToISO(pick(n, ['enddate']));
    const remark = pick(n, ['remark','remarks']);
    const documentationLink = pick(n, ['projectdocumentationlink','projectdoclink','projectdoclinkurl','link']);

    const departmentId = ensureDepartment(data, departmentName);
    const businessOwnerId = ensureUser(data, businessOwnerName, 'BusinessOwner', departmentId);
    const itPicId = ensureUser(data, itPicName, 'ITPIC', departmentId);

    // Check if initiative with same name and type already exists
    const existingInitiative = data.initiatives.find(i => i.name === name && i.type === type);
    const id = existingInitiative ? existingInitiative.id : uuid();
    const createdAt = existingInitiative ? existingInitiative.createdAt : (startDate ? (new Date(startDate)).toISOString() : now());
    const updatedAt = now();
    
    const initiativeData = {
      id, type, name, ticket, description, businessImpact,
      priority: ['P0','P1','P2'].includes(priority) ? priority : 'P2',
      businessOwnerId, departmentId, itPicId,
      status, milestone,
      startDate: startDate || new Date().toISOString().slice(0,10),
      endDate: endDate || null,
      remark: remark || null,
      documentationLink: documentationLink || null,
      createdAt, updatedAt
    };
    
    if (existingInitiative) {
      // Update existing initiative
      Object.assign(existingInitiative, initiativeData);
    } else {
      // Add new initiative
      data.initiatives.push(initiativeData);
    }
    addedInitiatives += 1;

    if (type === 'CR') {
      const cr = {
        initiativeId: id,
        crSubmissionStart: excelDateToISO(pick(n, ['crsubmissionstartdate','crsubmissionstart'])) || startDate || null,
        crSubmissionEnd: excelDateToISO(pick(n, ['crsubmissionenddate','crsubmissionend'])) || null,
        developmentStart: excelDateToISO(pick(n, ['developmentstartdate','developmentstart'])) || null,
        developmentEnd: excelDateToISO(pick(n, ['developmentenddate','developmentend'])) || null,
        sitStart: excelDateToISO(pick(n, ['sitstartdate','sitstart'])) || null,
        sitEnd: excelDateToISO(pick(n, ['sitenddate','sitend'])) || null,
        uatStart: excelDateToISO(pick(n, ['uatstartdate','uatstart'])) || null,
        uatEnd: excelDateToISO(pick(n, ['uatenddate','uatend'])) || null,
        liveDate: excelDateToISO(pick(n, ['livedate','live'])) || null
      };
      if (!cr.crSubmissionStart) cr.crSubmissionStart = startDate || new Date().toISOString().slice(0,10);
      data.changeRequests.push(cr);
      addedCRs += 1;
    }
  }
  return { addedInitiatives, addedCRs };
}

// Export the sync function for use by server.js
export default async function syncGoogleSheets() {
  try {
    const csv = await fetchCsv(SHEET_ID, GID);
    const rows = parseCsvToRows(csv);
    const data = store.read();
    // Update mode: Update existing initiatives and add new ones
    // (IDs are preserved for existing initiatives to maintain snapshot history)
    const { addedInitiatives, addedCRs } = importFromRows(rows, data);
    store.write(data);
    console.log('Google Sheets import completed');
    console.log('Rows processed:', rows.length);
    console.log('Initiatives updated/added:', addedInitiatives);
    console.log('CRs added:', addedCRs);
  } catch (err) {
    console.error('Failed to import from Google Sheets:', err.message);
    throw err;
  }
}

// Run immediately if called directly
const isDirectRun = process.argv[1] && process.argv[1].includes('sync_google_sheets.js');
if (isDirectRun) {
  syncGoogleSheets().catch(err => {
    console.error('Failed to import from Google Sheets:', err.message);
    process.exit(1);
  });
}


