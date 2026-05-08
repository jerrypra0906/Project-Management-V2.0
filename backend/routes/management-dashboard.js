import express from 'express';
import store from '../store.js';
import crypto from 'crypto';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

const nowIso = () => new Date().toISOString();

function normalizeStatus(s) {
  return String(s || '').trim().toUpperCase();
}

function computePortfolioStatus(projects, crs) {
  const badStatuses = new Set(['AT RISK', 'DELAYED']);
  const hasBadProject = projects.some((p) => badStatuses.has(normalizeStatus(p.status)));
  const hasBadCr = crs.some((c) => badStatuses.has(normalizeStatus(c.status)));
  if (hasBadProject || hasBadCr) return 'RED';

  const onHold = projects.some((p) => normalizeStatus(p.status) === 'ON HOLD') || crs.some((c) => normalizeStatus(c.status) === 'ON HOLD');
  if (onHold) return 'AMBER';

  return 'GREEN';
}

function getMilestoneLabel(m) {
  const v = String(m || '').trim();
  return v || '—';
}

router.use(requireAdmin);

router.get('/', async (_req, res) => {
  const data = await store.read();
  const initiatives = data.initiatives || [];
  const projects = initiatives.filter((i) => i.type === 'Project');
  const crs = initiatives.filter((i) => i.type === 'CR');

  const notesRow = (data.managementDashboard || [])[0] || null;
  const storedPortfolioStatus = String(notesRow?.portfolioStatus || '').trim().toUpperCase();
  const portfolioStatus =
    storedPortfolioStatus === 'GREEN' || storedPortfolioStatus === 'AMBER' || storedPortfolioStatus === 'RED'
      ? storedPortfolioStatus
      : 'GREEN';

  // Timeline Progress:
  // - show projects with status On Track / At Risk / Delayed
  // - plus Live projects where Actual End Date happens within this month
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  monthEnd.setHours(23, 59, 59, 999);

  const parseDate = (s) => {
    if (!s) return null;
    const d = new Date(String(s).slice(0, 10));
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const allowedStatuses = new Set(['ON TRACK', 'AT RISK', 'DELAYED']);
  const inProgressProjects = projects.filter((p) => allowedStatuses.has(normalizeStatus(p.status)));

  const liveThisMonth = projects.filter((p) => {
    if (normalizeStatus(p.status) !== 'LIVE') return false;
    const end = parseDate(p.endDate); // Actual End Date
    if (!end) return false;
    return end >= monthStart && end <= monthEnd;
  });

  const timelineProjects = [...inProgressProjects, ...liveThisMonth]
    .slice()
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
    .map((p) => ({
      id: p.id,
      name: p.name,
      milestone: getMilestoneLabel(p.milestone),
      status: p.status || null,
      priority: p.priority || null,
      planStartDate: p.planStartDate || null,
      planEndDate: p.planEndDate || null,
      startDate: p.startDate || null,
      endDate: p.endDate || null,
      createdAt: p.createdAt || null,
      updatedAt: p.updatedAt || null,
    }));

  // CR funnel (simple buckets)
  const crFunnel = {
    new: crs.filter((c) => normalizeStatus(c.status) === 'NOT STARTED').length,
    inProgress: crs.filter((c) => {
      const s = normalizeStatus(c.status);
      return s !== 'NOT STARTED' && s !== 'LIVE' && s !== 'CANCELLED';
    }).length,
    testingQa: crs.filter((c) => ['SIT', 'UAT', 'TESTING'].includes(normalizeStatus(c.milestone))).length,
    completedClosed: crs.filter((c) => ['LIVE', 'CANCELLED'].includes(normalizeStatus(c.status))).length,
  };

  // High Priority CRs (Top 5):
  // - Priority = P0
  // - not Live/Cancelled
  // - nearest Plan End Date from today (ascending)
  const highPriorityCrs = crs
    .filter((c) => {
      const p = String(c.priority || '').toUpperCase();
      const s = normalizeStatus(c.status);
      return p === 'P0' && s !== 'LIVE' && s !== 'CANCELLED';
    })
    .slice()
    .sort((a, b) => {
      const ad = parseDate(a.planEndDate);
      const bd = parseDate(b.planEndDate);
      const aKey = ad ? Math.abs(ad.getTime() - today.getTime()) : Number.POSITIVE_INFINITY;
      const bKey = bd ? Math.abs(bd.getTime() - today.getTime()) : Number.POSITIVE_INFINITY;
      if (aKey !== bKey) return aKey - bKey;
      return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
    })
    .slice(0, 5)
    .map((c) => ({
      id: c.id,
      ticket: c.ticket || '',
      name: c.name,
      status: c.status || '',
      priority: c.priority || '',
      planEndDate: c.planEndDate || null,
    }));

  // Risks & blockers: projects + CRs with At Risk/Delayed/On Hold
  const risksBlockers = projects
    .filter((i) => ['AT RISK', 'DELAYED', 'ON HOLD'].includes(normalizeStatus(i.status)))
    .slice()
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
    .slice(0, 6)
    .map((i) => ({
      id: i.id,
      issue: i.name,
      remark: i.remark || '',
      status: i.status || null,
      type: i.type,
    }));

  res.json({
    portfolioStatus,
    timelineProgress: timelineProjects,
    crFunnel,
    highPriorityCrs,
    risksBlockers,
    notes: notesRow
      ? {
          portfolioStatus: portfolioStatus,
          highlights: notesRow.highlights || '',
          criticalAlerts: notesRow.criticalAlerts || '',
          updatedBy: notesRow.updatedBy || null,
          updatedAt: notesRow.updatedAt || null,
        }
      : { portfolioStatus, highlights: '', criticalAlerts: '', updatedBy: null, updatedAt: null },
  });
});

router.put('/notes', async (req, res) => {
  const { highlights, criticalAlerts, portfolioStatus } = req.body || {};
  const data = await store.read();
  if (!data.managementDashboard) data.managementDashboard = [];

  const updatedAt = nowIso();
  const updatedBy = req.user?.id || 'Unknown';
  const status = String(portfolioStatus || '').trim().toUpperCase();
  const normalizedStatus = status === 'GREEN' || status === 'AMBER' || status === 'RED' ? status : 'GREEN';

  if (data.managementDashboard.length === 0) {
    data.managementDashboard.push({
      id: crypto.randomUUID(),
      portfolioStatus: normalizedStatus,
      highlights: String(highlights || ''),
      criticalAlerts: String(criticalAlerts || ''),
      updatedBy,
      updatedAt,
    });
  } else {
    data.managementDashboard[0] = {
      ...data.managementDashboard[0],
      portfolioStatus: normalizedStatus,
      highlights: String(highlights || ''),
      criticalAlerts: String(criticalAlerts || ''),
      updatedBy,
      updatedAt,
    };
  }

  await store.write(data);
  res.json({ ok: true, updatedAt, updatedBy });
});

export default router;

