import fs from 'fs';
import XLSX from 'xlsx';

const SHEET_ID = process.env.SHEET_ID || '1sX4-W1A5pCHFXC3IiS0yJ8sXJlZG_KcY';
const CR_GID = process.env.CR_GID || '355802550'; // CR tab GID

async function syncGoogleSheetsCR() {
  try {
    console.log('Fetching CR data from Google Sheets...');
    
    // Fetch CSV from Google Sheets (CR tab)
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${CR_GID}`;
    const response = await fetch(csvUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const csvText = await response.text();
    
    // Convert CSV to JSON
    const workbook = XLSX.read(csvText, { type: 'string' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Parse with header: row 1 & 2 are headers, data starts from row 3
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1, // Read as arrays, not objects
      defval: '',
      range: 2 // Start from row 3 (0-indexed, so 2)
    });
    
    console.log(`Found ${jsonData.length} rows in CR tab`);
    
    // Read existing data
    const dataPath = './data.json';
    let data = { initiatives: [], changeRequests: [], changeHistory: [] };
    
    if (fs.existsSync(dataPath)) {
      const fileContent = fs.readFileSync(dataPath, 'utf8');
      data = JSON.parse(fileContent);
    }
    
    // Update mode: Update existing CR initiatives and add new ones
    // (IDs are preserved for existing initiatives to maintain snapshot history)
    // Don't delete existing CRs - we'll update them below
    
    // Helper functions to ensure departments and users exist
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
    
    function excelDateToISO(v) {
      // Return null for any falsy value or empty string/whitespace
      if (!v || v === '' || (typeof v === 'string' && v.trim() === '')) return null;
      if (v instanceof Date) return v.toISOString().slice(0, 10);
      if (typeof v === 'number') {
        const epoch = new Date(Date.UTC(1899, 11, 30));
        const d = new Date(epoch.getTime() + v * 86400000);
        return d.toISOString().slice(0, 10);
      }
      // Try parsing as string date
      const d = new Date(v);
      if (!isNaN(d)) return d.toISOString().slice(0, 10);
      return null;
    }
    
    // Process each row
    let addedCount = 0;
    for (const row of jsonData) {
      // Column mapping (0-indexed):
      // 0: empty, 1: No, 2: Ticket No, 3: Create Date, 4: Initiative Name, 5: Description, 
      // 6: Business Impact, 7: Priority, 8: Business Owner, 9: Department, 10: IT PIC, 
      // 11: Status, 12: Milestone, 13: Start Date, 14: End Date, 15: Remark, 16: Project Doc Link
      // 17-18: CR Section 1 Start/End, 19-20: CR Section 2 Start/End, 21-22: CR Section 3 Start/End
      // 23-24: Dev Start/End, 25-26: SIT Start/End, 27-28: UAT Start/End, 29-30: Live Start/End
      
      const initiativeName = row[4]; // Column E: Initiative Name
      if (!initiativeName || initiativeName.trim() === '') {
        continue;
      }
      
      // Extract and process department and users
      const departmentName = row[9] || 'IT'; // Column J: Department
      const businessOwnerName = row[8] || 'Business Owner'; // Column I: Business Owner/Requestor
      const itPicName = row[10] || 'IT PIC'; // Column K: IT PIC
      
      const departmentId = ensureDepartment(data, departmentName);
      const businessOwnerId = ensureUser(data, businessOwnerName, 'BusinessOwner', departmentId);
      const itPicId = ensureUser(data, itPicName, 'ITPIC', departmentId);
      
      // Process priority
      let priority = String(row[7] || 'P2').toUpperCase().trim(); // Column H: Priority
      if (!['P0', 'P1', 'P2'].includes(priority)) {
        priority = 'P2';
      }
      
      // Process dates
      const startDate = excelDateToISO(row[13]) || new Date().toISOString().slice(0, 10); // Column N: Start Date
      const endDate = excelDateToISO(row[14]) || null; // Column O: End Date
      
      // Check if CR with same name already exists to preserve ID
      const trimmedName = initiativeName.trim();
      const existingInitiative = data.initiatives.find(i => i.name === trimmedName && i.type === 'CR');
      const initiativeId = existingInitiative ? existingInitiative.id : crypto.randomUUID();
      // Only set createdAt if Create Date (row[3]) has a value, otherwise null
      // Always use the Create Date from the sheet, don't preserve old values when updating
      const createDateFromSheet = excelDateToISO(row[3]);
      const createdAt = createDateFromSheet;
      
      
      const initiative = {
        id: initiativeId,
        name: trimmedName,
        description: row[5] || '', // Column F: Description
        businessImpact: row[6] || '', // Column G: Business Impact
        priority: priority,
        businessOwnerId: businessOwnerId,
        departmentId: departmentId,
        itPicId: itPicId,
        status: row[11] || 'NOT STARTED', // Column L: Status
        milestone: row[12] || '', // Column M: Milestone - Keep empty if blank in spreadsheet
        startDate: startDate,
        endDate: endDate,
        remark: row[15] || '', // Column P: Remark
        documentationLink: row[16] || '', // Column Q: Project Doc Link
        ticket: row[2] || '', // Column C: Ticket No
        type: 'CR',
        createdAt: createdAt, // Column D: Create Date
        updatedAt: new Date().toISOString().slice(0, 10)
      };
      
      if (existingInitiative) {
        // Update existing CR
        Object.assign(existingInitiative, initiative);
      } else {
        // Add new CR
        data.initiatives.push(initiative);
      }
      
      // Create CR-specific data with the additional columns R onwards (indices 17-30)
      const crData = {
        initiativeId: initiativeId,
        crSection1Start: excelDateToISO(row[17]) || '', // Column R - CR Section 1 Start
        crSection1End: excelDateToISO(row[18]) || '', // Column S - CR Section 1 End
        crSection2Start: excelDateToISO(row[19]) || '', // Column T - CR Section 2 Start
        crSection2End: excelDateToISO(row[20]) || '', // Column U - CR Section 2 End
        crSection3Start: excelDateToISO(row[21]) || '', // Column V - CR Section 3 Start
        crSection3End: excelDateToISO(row[22]) || '', // Column W - CR Section 3 End
        developmentStart: excelDateToISO(row[23]) || '', // Column X - Development Start
        developmentEnd: excelDateToISO(row[24]) || '', // Column Y - Development End
        sitStart: excelDateToISO(row[25]) || '', // Column Z - SIT Start
        sitEnd: excelDateToISO(row[26]) || '', // Column AA - SIT End
        uatStart: excelDateToISO(row[27]) || '', // Column AB - UAT Start
        uatEnd: excelDateToISO(row[28]) || '', // Column AC - UAT End
        liveStart: excelDateToISO(row[29]) || '', // Column AD - Live Start
        liveEnd: excelDateToISO(row[30]) || '' // Column AE - Live End
      };
      
      // Update or add CR data
      const existingCR = data.changeRequests.find(cr => cr.initiativeId === initiativeId);
      if (existingCR) {
        Object.assign(existingCR, crData);
      } else {
        data.changeRequests.push(crData);
      }
      addedCount++;
    }
    
    // Write updated data
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    
    console.log(`Google Sheets CR import completed`);
    console.log(`Rows processed: ${jsonData.length}`);
    console.log(`CRs updated/added: ${addedCount}`);
    
  } catch (error) {
    console.error('Error syncing CR data:', error.message);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('sync_google_sheets_cr.js')) {
  console.log('CR Sync script starting...');
  syncGoogleSheetsCR().catch(console.error);
}

export default syncGoogleSheetsCR;
