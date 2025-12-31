import express from 'express';
import store from '../store.js';
import crypto from 'crypto';

const router = express.Router();

const now = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();

function validateCommon(body) {
  const required = [
    'type','name','description','businessImpact','priority','businessOwnerId','departmentId','itPicId','status','milestone','startDate'
  ];
  for (const key of required) {
    if (!body[key]) return `Missing required field: ${key}`;
  }
  if (!['Project','CR'].includes(body.type)) return 'Invalid type';
  if (!['P0','P1','P2'].includes(body.priority)) return 'Invalid priority';
  const statuses = ['Not Started','On Hold','On Track','At Risk','Delayed','Live','Cancelled'];
  if (!statuses.includes(body.status)) return 'Invalid status';
  const milestones = ['Pre-grooming','Grooming','Tech Assessment','Planning','Development','Testing','Live'];
  if (!milestones.includes(body.milestone)) return 'Invalid milestone';
  return null;
}

router.get('/', (req, res) => {
  const { q, type, status, milestone, priority, departmentId, itPicId, businessOwnerId, active } = req.query;
  console.log('API filter params:', { q, type, status, milestone, priority, departmentId, active });
  const data = store.read();
  let rows = data.initiatives;
  
  // Helper function to parse comma-separated values
  const parseMultiValue = (value) => {
    if (!value) return null;
    return value.split(',').map(v => v.trim()).filter(v => v);
  };
  
  if (q) rows = rows.filter(r => (r.name + ' ' + r.description).toLowerCase().includes(String(q).toLowerCase()));
  if (type) rows = rows.filter(r => r.type === type);
  if (active === 'true') rows = rows.filter(r => r.status && r.status.toUpperCase() !== 'NOT STARTED');
  
  // Multi-value filters
  const statusValues = parseMultiValue(status);
  if (statusValues && statusValues.length > 0) {
    rows = rows.filter(r => statusValues.includes(r.status));
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

router.get('/:id', (req, res) => {
  const data = store.read();
  const i = data.initiatives.find(x => x.id === req.params.id);
  if (!i) return res.status(404).json({ error: 'Not found' });
  
  const result = { ...i };
  if (i.type === 'CR') {
    const cr = data.changeRequests.find(x => x.initiativeId === i.id) || null;
    result.cr = cr;
  }
  
  // Add change history
  const history = (data.changeHistory || []).filter(h => h.initiativeId === i.id);
  result.changeHistory = history;
  
  res.json(result);
});

router.post('/', (req, res) => {
  const error = validateCommon(req.body);
  if (error) return res.status(400).json({ error });
  const id = uuid();
  const createdAt = now();
  const updatedAt = createdAt;
  const {
    type,name,description,businessImpact,priority,businessOwnerId,departmentId,itPicId,status,milestone,startDate,endDate,remark,documentationLink
  } = req.body;
  const data = store.read();
  data.initiatives.push({ id,type,name,description,businessImpact,priority,businessOwnerId,departmentId,itPicId,status,milestone,startDate,endDate: endDate||null,remark: remark||null,documentationLink: documentationLink||null, createdAt, updatedAt });
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
  store.write(data);
  res.status(201).json({ id });
});

router.put('/:id', (req, res) => {
  const data = store.read();
  const idx = data.initiatives.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  
  const initiative = data.initiatives[idx];
  const changes = [];
  const updatedAt = now();
  const allowed = ['name','description','businessImpact','priority','businessOwnerId','departmentId','itPicId','status','milestone','startDate','endDate','remark','documentationLink'];
  
  // Track changes
  for (const k of allowed) {
    if (k in req.body && initiative[k] !== req.body[k]) {
      changes.push({
        field: k,
        oldValue: initiative[k],
        newValue: req.body[k],
        changedAt: updatedAt,
        changedBy: req.body.changedBy || 'Unknown'
      });
      initiative[k] = req.body[k];
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
    data.changeHistory.push({
      initiativeId: req.params.id,
      changes,
      timestamp: updatedAt,
      changedBy: req.body.changedBy || 'Unknown'
    });
  }
  
  store.write(data);
  res.json({ ok: true, changesCount: changes.length });
});

router.delete('/:id', (req, res) => {
  const data = store.read();
  const before = data.initiatives.length;
  data.initiatives = data.initiatives.filter(x => x.id !== req.params.id);
  data.changeRequests = data.changeRequests.filter(x => x.initiativeId !== req.params.id);
  store.write(data);
  if (data.initiatives.length === before) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

export default router;


