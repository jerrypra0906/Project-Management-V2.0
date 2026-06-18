import express from 'express';
import store from '../store.js';
import { requireScopes } from '../middleware/auth.js';
import {
  normalizeCrMilestonePhase,
  isValidCrMilestonePhase,
  crMilestoneMatchesFilter,
  requiresCrFullyLiveEndDate,
} from '../crTaskTemplates.js';

const router = express.Router();

function parseArray(v) {
  if (!v) return null;
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === 'string') {
    return v
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return null;
}

function normalizeUpper(v) {
  return String(v || '').toUpperCase().trim();
}

function formatCrListItem(initiative, crData) {
  return {
    ...initiative,
    milestone: normalizeCrMilestonePhase(initiative.milestone),
    cr: crData,
  };
}

function applyFilters(rows, reqBody) {
  const q = reqBody?.q ? String(reqBody.q) : '';
  const filters = reqBody?.filters || {};

  const statusValues = parseArray(filters.status)?.map(normalizeUpper) || null;
  const priorityValues = parseArray(filters.priority)?.map(normalizeUpper) || null;
  const milestoneValues = parseArray(filters.milestone) || null;
  const deptValues = parseArray(filters.departmentId) || null;
  const itPicValues = parseArray(filters.itPicId) || null;
  const itPmValues = parseArray(filters.itPmId) || null;
  const boValues = parseArray(filters.businessOwnerId) || null;
  const systemImpactedValues = parseArray(filters.systemImpactedId) || parseArray(filters.systemImpactedIds) || null;
  const active = filters.active === true;

  if (q) {
    const qLower = q.toLowerCase();
    rows = rows.filter((r) => {
      return (
        String(r.name || '').toLowerCase().includes(qLower) ||
        String(r.description || '').toLowerCase().includes(qLower) ||
        String(r.ticket || '').toLowerCase().includes(qLower)
      );
    });
  }

  if (active) {
    rows = rows.filter((r) => normalizeUpper(r.status) !== 'NOT STARTED');
  }

  if (statusValues?.length) {
    rows = rows.filter((r) => statusValues.includes(normalizeUpper(r.status)));
  }
  if (priorityValues?.length) {
    rows = rows.filter((r) => priorityValues.includes(normalizeUpper(r.priority)));
  }
  if (milestoneValues?.length) {
    rows = rows.filter((r) => crMilestoneMatchesFilter(r.milestone, milestoneValues));
  }
  if (deptValues?.length) {
    rows = rows.filter((r) => deptValues.includes(r.departmentId));
  }
  if (itPicValues?.length) {
    rows = rows.filter((r) => itPicValues.includes(r.itPicId));
  }
  if (itPmValues?.length) {
    rows = rows.filter((r) => itPmValues.includes(r.itPmId));
  }
  if (boValues?.length) {
    rows = rows.filter((r) => boValues.includes(r.businessOwnerId));
  }
  if (systemImpactedValues?.length) {
    rows = rows.filter((r) => {
      const raw = r.systemImpactedIds || [];
      const ids = Array.isArray(raw)
        ? raw
        : String(raw).split(',').map((x) => x.trim()).filter(Boolean);
      return systemImpactedValues.some((sel) => ids.includes(sel));
    });
  }

  return rows;
}

function applySort(rows, sort) {
  const field = String(sort?.field || 'updatedAt');
  const dir = String(sort?.direction || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

  const compare = (a, b) => {
    const av = a?.[field] ?? '';
    const bv = b?.[field] ?? '';
    const cmp = String(av).localeCompare(String(bv));
    return dir === 'asc' ? cmp : -cmp;
  };

  return rows.slice().sort(compare);
}

router.post('/list', requireScopes('cr:read'), async (req, res) => {
  try {
    const page = Math.max(1, Number(req.body?.page || 1));
    const pageSize = Math.min(500, Math.max(1, Number(req.body?.pageSize || 100)));

    const data = await store.read();
    let rows = (data.initiatives || []).filter((i) => i.type === 'CR');
    rows = applyFilters(rows, req.body);
    rows = applySort(rows, req.body?.sort);

    const total = rows.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = rows.slice(start, end).map((initiative) => {
      const crData = (data.changeRequests || []).find((cr) => cr.initiativeId === initiative.id) || null;
      return formatCrListItem(initiative, crData);
    });

    res.json({ items: pageItems, page, pageSize, total });
  } catch (e) {
    console.error('[api-v1-crs POST /list]', e);
    res.status(500).json({ error: e.message || 'Failed to list CRs' });
  }
});

router.patch('/:id', requireScopes('cr:write'), async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const data = await store.read();
    const idx = (data.initiatives || []).findIndex((i) => i.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    if (data.initiatives[idx].type !== 'CR') {
      return res.status(400).json({ error: 'Not a CR initiative' });
    }

    if ('milestone' in body && body.milestone != null && body.milestone !== '') {
      if (!isValidCrMilestonePhase(body.milestone)) {
        return res.status(400).json({ error: 'Invalid CR milestone phase' });
      }
    }

    const allowed = [
      'ticket',
      'name',
      'description',
      'businessImpact',
      'priority',
      'businessOwnerId',
      'businessUserIds',
      'departmentId',
      'itPicId',
      'itPicIds',
      'itPmId',
      'itManagerIds',
      'systemImpactedIds',
      'status',
      'milestone',
      'startDate',
      'endDate',
      'planStartDate',
      'planEndDate',
      'remark',
      'documentationLink',
    ];

    for (const k of allowed) {
      if (!(k in body)) continue;
      let v = body[k];
      if (k === 'milestone' && v != null && v !== '') {
        v = normalizeCrMilestonePhase(v);
      }
      if (k === 'businessUserIds' || k === 'itPicIds' || k === 'itManagerIds') {
        data.initiatives[idx][k] = Array.isArray(v) ? v : v == null ? [] : [String(v)];
      } else {
        data.initiatives[idx][k] = v;
      }
    }
    data.initiatives[idx].updatedAt = new Date().toISOString();

    const initiative = data.initiatives[idx];
    if (
      requiresCrFullyLiveEndDate(initiative.status, initiative.milestone) &&
      (!initiative.endDate || String(initiative.endDate).trim() === '')
    ) {
      return res.status(400).json({
        error:
          'Missing required field: endDate (required when Status is Live and Milestone is Fully Live)',
      });
    }

    if (body.cr && typeof body.cr === 'object') {
      if (!data.changeRequests) data.changeRequests = [];
      let cr = data.changeRequests.find((x) => x.initiativeId === id);
      if (!cr) {
        cr = { initiativeId: id };
        data.changeRequests.push(cr);
      }
      const crAllowed = [
        'crSubmissionStart',
        'crSubmissionEnd',
        'developmentStart',
        'developmentEnd',
        'sitStart',
        'sitEnd',
        'uatStart',
        'uatEnd',
        'liveDate',
      ];
      for (const k of crAllowed) {
        if (k in body.cr) cr[k] = body.cr[k];
      }
    }

    await store.write(data);
    res.json({ ok: true });
  } catch (e) {
    console.error('[api-v1-crs PATCH /:id]', e);
    res.status(500).json({ error: e.message || 'Failed to update CR' });
  }
});

export default router;
