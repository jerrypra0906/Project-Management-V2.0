import express from 'express';
import store from '../store.js';
import crypto from 'crypto';

const router = express.Router();

const now = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();

function validateCommon(body) {
  const required = [
    'type','name','description','businessImpact','priority','businessOwnerId','departmentId','status','milestone','startDate'
  ];
  // itPicId is now optional (can use itPicIds instead)
  // But at least one of itPicId or itPicIds must be provided
  if (!body.itPicId && (!body.itPicIds || (Array.isArray(body.itPicIds) && body.itPicIds.length === 0))) {
    return 'Missing required field: IT PIC (itPicId or itPicIds)';
  }
  for (const key of required) {
    if (!body[key]) return `Missing required field: ${key}`;
  }
  if (!['Project','CR'].includes(body.type)) return 'Invalid type';
  if (!['P0','P1','P2'].includes(body.priority)) return 'Invalid priority';
  const statuses = ['Not Started','On Hold','On Track','At Risk','Delayed','Live','Cancelled'];
  if (!statuses.includes(body.status)) return 'Invalid status';
  const milestones = ['Preparation','Business Requirement','Tech Assessment','Planning','Development','Testing','Live'];
  if (!milestones.includes(body.milestone)) return 'Invalid milestone';
  return null;
}

router.get('/', async (req, res) => {
  const { q, type, status, milestone, priority, departmentId, itPicId, businessOwnerId, active } = req.query;
  console.log('API filter params:', { q, type, status, milestone, priority, departmentId, active });
  const data = await store.read();
  let rows = data.initiatives;
  
  // Helper function to parse comma-separated values (URL decoded)
  const parseMultiValue = (value) => {
    if (!value) return null;
    // Decode URL encoding (e.g., %20 for spaces) before splitting
    // Express may or may not decode automatically, so we handle both cases
    let decoded = value;
    try {
      decoded = decodeURIComponent(value);
    } catch (e) {
      // If already decoded or invalid encoding, use as-is
      decoded = value;
    }
    return decoded.split(',').map(v => v.trim()).filter(v => v);
  };
  
  if (q) {
    const qLower = String(q).toLowerCase();
    rows = rows.filter(r => 
      (r.name || '').toLowerCase().includes(qLower) ||
      (r.description || '').toLowerCase().includes(qLower) ||
      (r.ticket || '').toLowerCase().includes(qLower)
    );
  }
  if (type) rows = rows.filter(r => r.type === type);
  if (active === 'true') rows = rows.filter(r => r.status && r.status.toUpperCase() !== 'NOT STARTED');
  
  // Multi-value filters - case insensitive for status
  const statusValues = parseMultiValue(status);
  if (statusValues && statusValues.length > 0) {
    console.log('Filtering by status:', statusValues);
    const statusValuesUpper = statusValues.map(s => s.toUpperCase());
    console.log('Status values (upper):', statusValuesUpper);
    const beforeCount = rows.length;
    rows = rows.filter(r => {
      const matches = r.status && statusValuesUpper.includes(r.status.toUpperCase());
      if (matches) console.log(`Match: ${r.name} - status: "${r.status}"`);
      return matches;
    });
    console.log(`Status filter: ${beforeCount} -> ${rows.length} rows`);
  }
  
  const milestoneValues = parseMultiValue(milestone);
  if (milestoneValues && milestoneValues.length > 0) {
    rows = rows.filter(r => milestoneValues.includes(r.milestone));
  }
  
  const priorityValues = parseMultiValue(priority);
  if (priorityValues && priorityValues.length > 0) {
    rows = rows.filter(r => priorityValues.includes(r.priority));
  }
  
  const departmentIdValues = parseMultiValue(departmentId);
  if (departmentIdValues && departmentIdValues.length > 0) {
    rows = rows.filter(r => departmentIdValues.includes(r.departmentId));
  }
  
  // Single-value filters (kept for backward compatibility)
  if (itPicId) rows = rows.filter(r => r.itPicId === itPicId);
  if (businessOwnerId) rows = rows.filter(r => r.businessOwnerId === businessOwnerId);
  
  console.log(`API returned ${rows.length} rows after filtering (total initiatives: ${data.initiatives.length})`);
  rows = rows.sort((a,b) => (b.updatedAt||'').localeCompare(a.updatedAt||''));
  
  // Include CR data for CR initiatives
  if (type === 'CR') {
    rows = rows.map(initiative => {
      const crData = data.changeRequests.find(cr => cr.initiativeId === initiative.id);
      return { ...initiative, cr: crData };
    });
  }
  
  res.json(rows.slice(0,500));
});

router.get('/:id', async (req, res) => {
  const data = await store.read();
  const i = data.initiatives.find(x => x.id === req.params.id);
  if (!i) return res.status(404).json({ error: 'Not found' });
  
  const result = { ...i };
  if (i.type === 'CR') {
    const cr = data.changeRequests.find(x => x.initiativeId === i.id) || null;
    result.cr = cr;
  }
  
  // Add documents
  const documents = (data.documents || []).filter(d => d.initiativeId === i.id);
  result.documents = documents;
  
  // Add change history
  const history = (data.changeHistory || []).filter(h => h.initiativeId === i.id);
  console.log(`[ChangeHistory] initiative ${i.id} history count: ${history.length}`);
  result.changeHistory = history;
  
  res.json(result);
});

router.post('/', async (req, res) => {
  const error = validateCommon(req.body);
  if (error) return res.status(400).json({ error });
  const id = uuid();
  const createdAt = now();
  const updatedAt = createdAt;
  const {
    type,name,description,businessImpact,priority,businessOwnerId,businessUserIds,departmentId,itPicId,itPicIds,itPmId,itManagerIds,status,milestone,startDate,endDate,remark,documentationLink
  } = req.body;
  const data = await store.read();
  
  // Convert arrays to comma-separated strings for storage
  const businessUserIdsStr = Array.isArray(businessUserIds) ? businessUserIds.join(',') : (businessUserIds || null);
  const itPicIdsStr = Array.isArray(itPicIds) ? itPicIds.join(',') : (itPicIds || null);
  const itManagerIdsStr = Array.isArray(itManagerIds) ? itManagerIds.join(',') : (itManagerIds || null);
  
  // Use itPicIds if provided, otherwise fall back to itPicId for backward compatibility
  const finalItPicIds = itPicIdsStr || (itPicId ? itPicId : null);
  
  data.initiatives.push({ 
    id,type,name,description,businessImpact,priority,
    businessOwnerId,businessUserIds: businessUserIdsStr,
    departmentId,
    itPicId: itPicId || null, // Keep for backward compatibility
    itPicIds: finalItPicIds,
    itPmId: itPmId || null,
    itManagerIds: itManagerIdsStr,
    status,milestone,startDate,endDate: endDate||null,remark: remark||null,documentationLink: documentationLink||null, 
    createdAt, updatedAt 
  });
  if (type === 'CR') {
    const cr = req.body.cr || {};
    if (!cr.crSubmissionStart) return res.status(400).json({ error: 'CR requires cr.crSubmissionStart' });
    data.changeRequests.push({
      initiativeId: id,
      crSubmissionStart: cr.crSubmissionStart,
      crSubmissionEnd: cr.crSubmissionEnd || null,
      developmentStart: cr.developmentStart || null,
      developmentEnd: cr.developmentEnd || null,
      sitStart: cr.sitStart || null,
      sitEnd: cr.sitEnd || null,
      uatStart: cr.uatStart || null,
      uatEnd: cr.uatEnd || null,
      liveDate: cr.liveDate || null
    });
  }
  
  // Auto-create tasks: 1 task per milestone
  const milestones = ['Preparation','Business Requirement','Tech Assessment','Planning','Development','Testing','Live'];
  if (!data.tasks) data.tasks = [];
  milestones.forEach(m => {
    const taskId = uuid();
    data.tasks.push({
      id: taskId,
      initiativeId: id,
      name: `${m} Task`,
      description: `Task for ${m} milestone`,
      startDate: null,
      endDate: null,
      assigneeId: null,
      status: 'Not Started',
      milestone: m,
      createdAt,
      updatedAt: null
    });
  });
  
  await store.write(data);
  res.status(201).json({ id });
});

router.put('/:id', async (req, res) => {
  const data = await store.read();
  const idx = data.initiatives.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  
  const initiative = data.initiatives[idx];
  const changes = [];
  const updatedAt = now();
  const allowed = ['name','description','businessImpact','priority','businessOwnerId','businessUserIds','departmentId','itPicId','itPicIds','itPmId','itManagerIds','status','milestone','startDate','endDate','remark','documentationLink'];
  
  // Track changes and update fields
  for (const k of allowed) {
    // Check if field exists in request body (including null values)
    if (k in req.body) {
      let newValue = req.body[k];
      
      // Convert arrays to comma-separated strings for storage
      if ((k === 'businessUserIds' || k === 'itPicIds' || k === 'itManagerIds') && Array.isArray(newValue)) {
        newValue = newValue.length > 0 ? newValue.join(',') : null;
      }
      
      // Handle itPicIds: use itPicIds if provided, otherwise keep existing or use itPicId
      if (k === 'itPicIds' && !newValue && req.body.itPicId) {
        newValue = req.body.itPicId;
      }
      
      // Normalize values for comparison (handle null, undefined, empty string)
      // For array fields (comma-separated strings), normalize by sorting and trimming
      const isArrayField = k === 'businessUserIds' || k === 'itPicIds' || k === 'itManagerIds';
      
      let oldVal, newVal;
      if (isArrayField) {
        // For array fields, parse, sort, and compare as sorted arrays
        const parseArray = (val) => {
          if (val == null || val === '') return [];
          if (Array.isArray(val)) return val.map(v => String(v).trim()).filter(v => v).sort();
          return String(val).split(',').map(v => v.trim()).filter(v => v).sort();
        };
        const oldArray = parseArray(initiative[k]);
        const newArray = parseArray(newValue);
        oldVal = oldArray.join(',');
        newVal = newArray.join(',');
        
        // Debug logging for array fields
        console.log(`[Change Tracking] Field: ${k}`);
        console.log(`  Old value (raw): ${JSON.stringify(initiative[k])}`);
        console.log(`  New value (raw): ${JSON.stringify(newValue)}`);
        console.log(`  Old array: ${JSON.stringify(oldArray)}`);
        console.log(`  New array: ${JSON.stringify(newArray)}`);
        console.log(`  Old normalized: "${oldVal}"`);
        console.log(`  New normalized: "${newVal}"`);
        console.log(`  Changed: ${oldVal !== newVal}`);
      } else {
        // For regular fields, convert to strings and trim
        oldVal = initiative[k] == null ? '' : String(initiative[k]).trim();
        newVal = newValue == null ? '' : String(newValue).trim();

        // Special handling for status: treat case-only differences as no change
        if (k === 'status') {
          const oldCmp = oldVal.toLowerCase();
          const newCmp = newVal.toLowerCase();
          if (oldCmp === newCmp) {
            // Normalize stored value but don't create a change-log entry
            initiative[k] = newValue;
            continue;
          }
        }
      }
      
      if (oldVal !== newVal) {
        console.log(`[Change Tracking] Detected change for ${k}: "${oldVal}" -> "${newVal}"`);
        changes.push({
          field: k,
          oldValue: initiative[k] || null,
          newValue: newValue || null,
          changedAt: updatedAt,
          changedBy: req.body.changedBy || 'Unknown'
        });
        initiative[k] = newValue;
      }
    }
  }
  
  initiative.updatedAt = updatedAt;
  
  // Track CR changes
  if (initiative.type === 'CR' && req.body.cr) {
    let cr = data.changeRequests.find(x => x.initiativeId === req.params.id);
    if (!cr && req.body.cr.crSubmissionStart) {
      cr = { initiativeId: req.params.id };
      data.changeRequests.push(cr);
    }
    if (cr) {
      const keys = ['crSubmissionStart','crSubmissionEnd','developmentStart','developmentEnd','sitStart','sitEnd','uatStart','uatEnd','liveDate'];
      for (const k of keys) {
        if (k in req.body.cr && cr[k] !== req.body.cr[k]) {
          changes.push({
            field: `cr.${k}`,
            oldValue: cr[k],
            newValue: req.body.cr[k],
            changedAt: updatedAt,
            changedBy: req.body.changedBy || 'Unknown'
          });
          cr[k] = req.body.cr[k];
        }
      }
    }
  }
  
  // Store changes
  if (changes.length > 0) {
    if (!data.changeHistory) data.changeHistory = [];
    console.log(`[Change Tracking] Saving ${changes.length} change(s) for initiative ${req.params.id}`);
    data.changeHistory.push({
      id: uuid(),
      initiativeId: req.params.id,
      changes,
      timestamp: updatedAt,
      changedBy: req.body.changedBy || 'Unknown'
    });
  }
  
  await store.write(data);
  res.json({ ok: true, changesCount: changes.length });
});

router.delete('/:id', async (req, res) => {
  const data = await store.read();
  const before = data.initiatives.length;
  data.initiatives = data.initiatives.filter(x => x.id !== req.params.id);
  data.changeRequests = data.changeRequests.filter(x => x.initiativeId !== req.params.id);
  await store.write(data);
  if (data.initiatives.length === before) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

export default router;

