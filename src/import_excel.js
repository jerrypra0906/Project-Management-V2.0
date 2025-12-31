import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import XLSX from 'xlsx';
import store from './store.js';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node src/import_excel.js <xlsx-or-csv> [<csv for other type>]');
  console.error('Examples:');
  console.error('  node src/import_excel.js "docs/Project & CR Portfolio.xlsx"');
  console.error('  node src/import_excel.js "docs/Project & CR Portfolio.xlsx - Project.csv" "docs/Project & CR Portfolio.xlsx - CR.csv"');
  process.exit(1);
}

function uuid() { return crypto.randomUUID(); }
function now() { return new Date().toISOString(); }

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
  data.users.push({ id, name, email: `${name.replace(/\s+/g,'').toLowerCase()}@example.com`, role: role || 'BusinessOwner', departmentId: departmentId || null, active: true });
  return id;
}

function excelDateToISO(v) {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0,10);
  if (typeof v === 'number') {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(epoch.getTime() + v * 86400000);
    return d.toISOString().slice(0,10);
  }
  // string
  const d = new Date(v);
  if (!isNaN(d)) return d.toISOString().slice(0,10);
  return null;
}

const data = store.read();

function loadWorkbook(filePath) {
  const full = path.resolve(filePath);
  if (!fs.existsSync(full)) throw new Error(`File not found: ${full}`);
  return XLSX.readFile(full);
}

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

function importProjectsFromSheet(sheet) {
  if (!sheet) return;
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  for (const r of rows) {
    const n = toNormRow(r);
    const name = pick(n, ['projectname','name','title','initiativename']);
    if (!name) continue;
    const description = pick(n, ['description']);
    const businessImpact = pick(n, ['businessimpact','impact']);
    const priority = String(pick(n, ['priority'], 'P2')).toUpperCase();
    const departmentName = pick(n, ['department','dept'], 'IT');
    const businessOwnerName = pick(n, ['businessownerrequestor','businessownerrequester','businessowner','requestor','requester'], 'Business Owner');
    const itPicName = pick(n, ['itpic','itowner'], 'IT PIC');
    const status = pick(n, ['status'], 'Not Started');
    const milestone = pick(n, ['milestone'], 'Pre-grooming');
    const startDate = excelDateToISO(pick(n, ['startdate']));
    const endDate = excelDateToISO(pick(n, ['enddate']));
    const remark = pick(n, ['remark','remarks']);
    const documentationLink = pick(n, ['projectdocumentationlink','projectdoclink','link']);

    const departmentId = ensureDepartment(data, departmentName);
    const businessOwnerId = ensureUser(data, businessOwnerName, 'BusinessOwner', departmentId);
    const itPicId = ensureUser(data, itPicName, 'ITPIC', departmentId);

    const id = uuid();
    const createdAt = now();
    const updatedAt = createdAt;
    data.initiatives.push({
      id, type: 'Project', name, description, businessImpact,
      priority: ['P0','P1','P2'].includes(priority) ? priority : 'P2',
      businessOwnerId, departmentId, itPicId,
      status, milestone,
      startDate: startDate || new Date().toISOString().slice(0,10),
      endDate: endDate || null,
      remark: remark || null,
      documentationLink: documentationLink || null,
      createdAt, updatedAt
    });
  }
}

function importCRsFromSheet(sheet) {
  if (!sheet) return;
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  for (const r of rows) {
    const n = toNormRow(r);
    const name = pick(n, ['projectname','crname','name','title','initiativename']);
    if (!name) continue;
    const description = pick(n, ['description']);
    const businessImpact = pick(n, ['businessimpact','impact']);
    const priority = String(pick(n, ['priority'], 'P2')).toUpperCase();
    const departmentName = pick(n, ['department','dept'], 'IT');
    const businessOwnerName = pick(n, ['businessownerrequestor','businessownerrequester','businessowner','requestor','requester'], 'Business Owner');
    const itPicName = pick(n, ['itpic','itowner'], 'IT PIC');
    const status = pick(n, ['status'], 'Not Started');
    const milestone = pick(n, ['milestone'], 'Pre-grooming');
    const startDate = excelDateToISO(pick(n, ['startdate']));
    const endDate = excelDateToISO(pick(n, ['enddate']));
    const remark = pick(n, ['remark','remarks']);
    const documentationLink = pick(n, ['projectdocumentationlink','projectdoclink','link']);

    const departmentId = ensureDepartment(data, departmentName);
    const businessOwnerId = ensureUser(data, businessOwnerName, 'BusinessOwner', departmentId);
    const itPicId = ensureUser(data, itPicName, 'ITPIC', departmentId);

    const id = uuid();
    const createdAt = now();
    const updatedAt = createdAt;
    data.initiatives.push({
      id, type: 'CR', name, description, businessImpact,
      priority: ['P0','P1','P2'].includes(priority) ? priority : 'P2',
      businessOwnerId, departmentId, itPicId,
      status, milestone,
      startDate: startDate || new Date().toISOString().slice(0,10),
      endDate: endDate || null,
      remark: remark || null,
      documentationLink: documentationLink || null,
      createdAt, updatedAt
    });

    // CR date checkpoints
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
  }
}

for (const f of args) {
  const wb = loadWorkbook(f);
  const isCSV = f.toLowerCase().endsWith('.csv');
  if (isCSV) {
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const lower = path.basename(f).toLowerCase();
    if (lower.includes('project')) importProjectsFromSheet(sheet);
    else if (lower.includes('cr')) importCRsFromSheet(sheet);
    else {
      // fallback: try to detect type by presence of CR-specific columns
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      const hasCRCol = rows.length && Object.keys(rows[0]).some(k => String(k).toLowerCase().includes('uat') || String(k).toLowerCase().includes('sit'));
      if (hasCRCol) importCRsFromSheet(sheet); else importProjectsFromSheet(sheet);
    }
  } else {
    importProjectsFromSheet(wb.Sheets['Project'] || wb.Sheets['Projects']);
    importCRsFromSheet(wb.Sheets['CR'] || wb.Sheets['Change Request']);
  }
}
store.write(data);
console.log('Import completed. Initiatives:', data.initiatives.length, 'CRs:', data.changeRequests.length);


