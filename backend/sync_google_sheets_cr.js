import 'dotenv/config';
import crypto from 'crypto';
import XLSX from 'xlsx';
import store from './store.js';

const SHEET_ID = process.env.SHEET_ID || '';
const CR_GID = process.env.CR_GID || '';

if (!SHEET_ID || !CR_GID) {
  console.error('Set SHEET_ID and CR_GID to sync CR tab from Google Sheets.');
}

function excelDateToISO(v) {
  if (!v || v === '' || (typeof v === 'string' && v.trim() === '')) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number') {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(epoch.getTime() + v * 86400000);
    return d.toISOString().slice(0, 10);
  }
  const d = new Date(v);
  if (!isNaN(d)) return d.toISOString().slice(0, 10);
  return null;
}

function ensureDepartment(data, name) {
  if (!name || name.trim() === '') return null;
  const trimmedName = name.trim();
  const found = data.departments.find(d => d.name === trimmedName);
  if (found) return found.id;
  const id = crypto.randomUUID();
  data.departments.push({ id, name: trimmedName });
  return id;
}

function ensureUser(data, name, role, departmentId) {
  if (!name || name.trim() === '') return null;
  const trimmedName = name.trim();
  const found = data.users.find(u => u.name === trimmedName);
  if (found) return found.id;
  const id = crypto.randomUUID();
  const email = `${trimmedName.replace(/\s+/g, '').toLowerCase()}@example.com`;
  data.users.push({
    id,
    name: trimmedName,
    email,
    role: role || 'BusinessOwner',
    departmentId: departmentId || null,
    active: true
  });
  return id;
}

async function fetchCsv(sheetId, gid) {
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  const response = await fetch(csvUrl);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.text();
}

export default async function syncGoogleSheetsCR() {
  if (!SHEET_ID || !CR_GID) {
    console.error('SHEET_ID or CR_GID not set; skipping CR sync.');
    return;
  }

  console.log('Fetching CR data from Google Sheets...');
  const csvText = await fetchCsv(SHEET_ID, CR_GID);

  const workbook = XLSX.read(csvText, { type: 'string' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Parse with header: row 1 & 2 are headers, data starts from row 3
  const jsonData = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    range: 2
  });

  console.log(`Found ${jsonData.length} rows in CR tab`);

  const data = await store.read();
  if (!Array.isArray(data.departments)) data.departments = [];
  if (!Array.isArray(data.users)) data.users = [];
  if (!Array.isArray(data.initiatives)) data.initiatives = [];
  if (!Array.isArray(data.changeRequests)) data.changeRequests = [];

  let addedCount = 0;
  for (const row of jsonData) {
    const initiativeName = row[4];
    if (!initiativeName || initiativeName.trim() === '') continue;

    const departmentName = row[9] || 'IT';
    const businessOwnerName = row[8] || 'Business Owner';
    const itPicName = row[10] || 'IT PIC';

    const departmentId = ensureDepartment(data, departmentName);
    const businessOwnerId = ensureUser(data, businessOwnerName, 'BusinessOwner', departmentId);
    const itPicId = ensureUser(data, itPicName, 'ITPIC', departmentId);

    let priority = String(row[7] || 'P2').toUpperCase().trim();
    if (!['P0', 'P1', 'P2'].includes(priority)) priority = 'P2';

    const startDate = excelDateToISO(row[13]) || new Date().toISOString().slice(0, 10);
    const endDate = excelDateToISO(row[14]) || null;

    const trimmedName = initiativeName.trim();
    const existingInitiative = data.initiatives.find(i => i.name === trimmedName && i.type === 'CR');
    const initiativeId = existingInitiative ? existingInitiative.id : crypto.randomUUID();
    const createDateFromSheet = excelDateToISO(row[3]);
    const createdAt = createDateFromSheet;

    const initiative = {
      id: initiativeId,
      name: trimmedName,
      description: row[5] || '',
      businessImpact: row[6] || '',
      priority: priority,
      businessOwnerId: businessOwnerId,
      departmentId: departmentId,
      itPicId: itPicId,
      status: row[11] || 'NOT STARTED',
      milestone: row[12] || '',
      startDate: startDate,
      endDate: endDate,
      remark: row[15] || '',
      documentationLink: row[16] || '',
      ticket: row[2] || '',
      type: 'CR',
      createdAt: createdAt,
      updatedAt: new Date().toISOString().slice(0, 10)
    };

    if (existingInitiative) {
      Object.assign(existingInitiative, initiative);
    } else {
      data.initiatives.push(initiative);
    }

    const crData = {
      initiativeId: initiativeId,
      crSection1Start: excelDateToISO(row[17]) || '',
      crSection1End: excelDateToISO(row[18]) || '',
      crSection2Start: excelDateToISO(row[19]) || '',
      crSection2End: excelDateToISO(row[20]) || '',
      crSection3Start: excelDateToISO(row[21]) || '',
      crSection3End: excelDateToISO(row[22]) || '',
      developmentStart: excelDateToISO(row[23]) || '',
      developmentEnd: excelDateToISO(row[24]) || '',
      sitStart: excelDateToISO(row[25]) || '',
      sitEnd: excelDateToISO(row[26]) || '',
      uatStart: excelDateToISO(row[27]) || '',
      uatEnd: excelDateToISO(row[28]) || '',
      liveStart: excelDateToISO(row[29]) || '',
      liveEnd: excelDateToISO(row[30]) || ''
    };

    const existingCR = data.changeRequests.find(cr => cr.initiativeId === initiativeId);
    if (existingCR) Object.assign(existingCR, crData); else data.changeRequests.push(crData);
    addedCount++;
  }

  await store.write(data);
  console.log('Google Sheets CR import completed');
  console.log('Rows processed:', jsonData.length);
  console.log('CRs updated/added:', addedCount);
}

// Run if called directly
const isDirectRun = process.argv[1] && process.argv[1].includes('sync_google_sheets_cr.js');
if (isDirectRun) {
  console.log('CR Sync script starting...');
  syncGoogleSheetsCR().catch(err => {
    console.error('Error syncing CR data:', err.message);
    process.exit(1);
  });
}


