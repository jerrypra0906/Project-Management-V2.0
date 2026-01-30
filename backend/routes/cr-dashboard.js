import express from 'express';
import store from '../store.js';
import { getAllMilestoneDurations } from '../daily-snapshots.js';

const router = express.Router();

/**
 * Calculate weekly trend data for CRs
 * @param {string} type - Filter by type ('Project' or 'CR')
 * @param {Array} filteredCRs - Filtered CRs to use for calculation
 * @returns {Array} Array of weekly trend data
 */
async function calculateWeeklyTrend(type = 'CR', filteredCRs = null) {
  const data = await store.read();
  
  // Use filtered CRs if provided, otherwise use all CRs
  const allCRs = filteredCRs || data.initiatives.filter(i => i.type === type);
  
  // Generate the last 12 consecutive weeks from today going backwards
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const currentWeekKey = getWeekKey(todayStr);
  
  // Build array of 12 consecutive week keys (current week + 11 previous weeks)
  const weekKeys = [];
  for (let i = 0; i < 12; i++) {
    const weekDate = new Date(currentWeekKey);
    weekDate.setDate(weekDate.getDate() - (i * 7)); // Go back i weeks
    weekKeys.push(getWeekKey(weekDate.toISOString().slice(0, 10)));
  }
  
  // Reverse to get chronological order (oldest to newest)
  weekKeys.reverse();
  
  // Calculate metrics for each of the 12 consecutive weeks
  const weeklyData = weekKeys.map((weekKey) => {
    const weekStartStr = weekKey;
    const weekEndStr = getWeekEnd(weekKey);
    
    // 1. NEW: Count CRs created in this specific week
    const newCRs = allCRs.filter(cr => {
      if (!cr.createdAt || cr.createdAt === '' || cr.createdAt === null) return false;
      const createdDateStr = cr.createdAt.slice(0, 10);
      return createdDateStr >= weekStartStr && createdDateStr <= weekEndStr;
    }).length;
    
    // 2. LIVE: Count CRs that went LIVE in this specific week (based on endDate)
    const liveCRs = allCRs.filter(cr => {
      if (!cr.status || cr.status.toUpperCase() !== 'LIVE') return false;
      if (!cr.endDate || cr.endDate === '' || cr.endDate === null) return false;
      const endDateStr = cr.endDate.slice(0, 10);
      return endDateStr >= weekStartStr && endDateStr <= weekEndStr;
    }).length;
    
    // 3. TOTAL: Count all CRs that existed by the end of this week (cumulative)
    // This means CRs created on or before the end of this week
    const totalCRs = allCRs.filter(cr => {
      if (!cr.createdAt || cr.createdAt === '' || cr.createdAt === null) return false;
      const createdDateStr = cr.createdAt.slice(0, 10);
      return createdDateStr <= weekEndStr;
    }).length;
    
    // Format week label (Monday - Friday) with year
    const mondayDate = new Date(weekKey);
    const fridayDate = new Date(weekEndStr);
    
    const weekLabel = `${mondayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${fridayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    
    return {
      weekStart: weekKey,
      weekEnd: weekEndStr,
      weekLabel,
      newCRs,
      liveCRs,
      totalCRs
    };
  });
  
  // Return all 12 consecutive weeks
  return weeklyData;
}

/**
 * Get week key (Monday date) for a given date
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {string} Monday date of the week
 */
function getWeekKey(date) {
  const d = new Date(date);
  const dayOfWeek = d.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days, otherwise go back to Monday
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  return monday.toISOString().slice(0, 10);
}

/**
 * Get week end date (Friday) for a given week key
 * @param {string} weekKey - Monday date in YYYY-MM-DD format
 * @returns {string} Friday date of the week
 */
function getWeekEnd(weekKey) {
  const monday = new Date(weekKey);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4); // Friday is 4 days after Monday
  return friday.toISOString().slice(0, 10);
}

router.get('/', async (req, res) => {
  const { departmentId, itManagerId } = req.query;
  const data = await store.read();
  const total = data.initiatives.length;
  const projects = data.initiatives.filter(i => i.type === 'Project').length;
  
  // Only count CR-type initiatives for distributions
  let crInitiatives = data.initiatives.filter(i => i.type === 'CR');
  
  // Apply filters
  if (departmentId) {
    crInitiatives = crInitiatives.filter(i => i.departmentId === departmentId);
  }
  if (itManagerId) {
    // itManagerIds is a comma-separated string, so check if itManagerId is included
    crInitiatives = crInitiatives.filter(i => {
      const managerIds = (i.itManagerIds || '').split(',').map(id => id.trim()).filter(id => id);
      return managerIds.includes(itManagerId);
    });
  }
  
  // Count CRs after filtering
  const crs = crInitiatives.length;
  const countBy = (key) => Object.entries(crInitiatives.reduce((acc, i) => { acc[i[key]] = (acc[i[key]]||0)+1; return acc; }, {})).map(([k,v]) => ({ [key]: k, c: v }));
  const byStatus = countBy('status');
  const byPriority = countBy('priority');
  const byDepartment = countBy('departmentId');
  
  // Milestone distribution - only count CRs with non-blank milestones
  const crsWithMilestone = crInitiatives.filter(i => i.milestone && i.milestone.trim() !== '');
  const byMilestone = Object.entries(crsWithMilestone.reduce((acc, i) => { acc[i.milestone] = (acc[i.milestone]||0)+1; return acc; }, {})).map(([k,v]) => ({ milestone: k, c: v }));
  
  // Calculate breakdowns
  // 1. Status breakdown by Priority (P0, P1, P2)
  const byStatusBreakdown = {};
  byStatus.forEach(statusItem => {
    const status = statusItem.status;
    const breakdown = { P0: 0, P1: 0, P2: 0 };
    crInitiatives.filter(cr => cr.status === status).forEach(cr => {
      const priority = cr.priority || 'P2';
      if (breakdown[priority] !== undefined) {
        breakdown[priority]++;
      }
    });
    byStatusBreakdown[status] = breakdown;
  });
  
  // 2. Priority breakdown by Status
  const byPriorityBreakdown = {};
  byPriority.forEach(priorityItem => {
    const priority = priorityItem.priority;
    const breakdown = {};
    crInitiatives.filter(cr => cr.priority === priority).forEach(cr => {
      const status = cr.status || 'N/A';
      breakdown[status] = (breakdown[status] || 0) + 1;
    });
    byPriorityBreakdown[priority] = breakdown;
  });
  
  // 3. Milestone breakdown by Priority (P0, P1, P2)
  const byMilestoneBreakdown = {};
  byMilestone.forEach(milestoneItem => {
    const milestone = milestoneItem.milestone;
    const breakdown = { P0: 0, P1: 0, P2: 0 };
    crInitiatives.filter(cr => cr.milestone === milestone).forEach(cr => {
      const priority = cr.priority || 'P2';
      if (breakdown[priority] !== undefined) {
        breakdown[priority]++;
      }
    });
    byMilestoneBreakdown[milestone] = breakdown;
  });
  
  const year = new Date().getFullYear();
  const liveYTD = crInitiatives.filter(i => (i.status && i.status.toUpperCase() === 'LIVE') && (i.updatedAt||'').startsWith(String(year))).length;
  // Count all Live CRs (not just YTD) - case insensitive
  const liveCount = crInitiatives.filter(i => i.status && i.status.toUpperCase() === 'LIVE').length;
  
  // Calculate aging metrics (CRs only) - use filtered list
  const now = new Date();
  const crAging = crInitiatives.map(i => {
    const createDate = new Date(i.createdAt || i.startDate);
    const daysSinceCreated = Math.floor((now - createDate) / (1000 * 60 * 60 * 24));
    return { 
      id: i.id, 
      name: i.name, 
      daysSinceCreated, 
      status: i.status, 
      milestone: i.milestone,
      departmentId: i.departmentId
    };
  });
  
  const avgAgeSinceCreated = crAging.length > 0 ? 
    Math.round(crAging.reduce((sum, m) => sum + m.daysSinceCreated, 0) / crAging.length) : 0;
  
  // Calculate detailed milestone durations using daily snapshots (CRs only)
  // Get all milestone durations and then filter by the filtered CR IDs
  const allMilestoneDurations = await getAllMilestoneDurations('CR');
  const filteredCRIds = new Set(crInitiatives.map(c => c.id));
  const milestoneDurations = allMilestoneDurations.filter(m => filteredCRIds.has(m.id));
  
  // Calculate weekly trend data for CRs (using filtered CRs)
  const weeklyTrendData = await calculateWeeklyTrend('CR', crInitiatives);
  
  // Calculate week boundaries (Monday to Sunday)
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days, otherwise go back to Monday
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + diffToMonday);
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6); // Sunday
  weekEnd.setHours(23, 59, 59, 999);
  
  // Count CRs created this week (only those with actual Create Date from Excel)
  const crsCreatedThisWeek = crInitiatives.filter(i => {
    // Exclude CRs without a real Create Date (null, undefined, or empty string)
    if (!i.createdAt || i.createdAt === '' || i.createdAt === null) return false;
    
    // Parse the date string (YYYY-MM-DD) and compare just the date part
    const createdDateStr = i.createdAt.split('T')[0]; // Handle both "2025-10-09" and "2025-10-09T12:00:00Z"
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];
    return createdDateStr >= weekStartStr && createdDateStr <= weekEndStr;
  });
  
  // Generate CR Insights
  const insights = {
    totalCRs: crs,
    activeCRs: crInitiatives.filter(i => i.status && i.status.toUpperCase() !== 'NOT STARTED').length,
    atRiskCount: crInitiatives.filter(i => i.status && i.status.toUpperCase() === 'AT RISK').length,
    delayedCount: crInitiatives.filter(i => i.status && i.status.toUpperCase() === 'DELAYED').length,
    liveCount: crInitiatives.filter(i => i.status && i.status.toUpperCase() === 'LIVE').length,
    avgAgeDays: avgAgeSinceCreated,
    oldestCR: crAging.length > 0 ? crAging.reduce((max, p) => p.daysSinceCreated > max.daysSinceCreated ? p : max) : null,
    newestCR: crAging.length > 0 ? crAging.reduce((min, p) => p.daysSinceCreated < min.daysSinceCreated ? p : min) : null,
    mostCommonMilestone: byMilestone.length > 0 ? byMilestone.reduce((max, m) => m.c > max.c ? m : max) : null,
    highPriorityCount: crInitiatives.filter(i => i.priority === 'P0').length,
    newThisWeekCount: crsCreatedThisWeek.length,
    newThisWeekCRs: crsCreatedThisWeek.map(i => ({ id: i.id, name: i.name, createdAt: i.createdAt })),
    weekStart: weekStart.toISOString().split('T')[0],
    weekEnd: weekEnd.toISOString().split('T')[0],
    recommendations: []
  };
  
  // Add AI-powered recommendations for CRs
  if (insights.atRiskCount > 0) {
    insights.recommendations.push(`⚠️ ${insights.atRiskCount} CR${insights.atRiskCount > 1 ? 's are' : ' is'} at risk. Review and mitigate risks immediately.`);
  }
  if (insights.delayedCount > 0) {
    insights.recommendations.push(`🚨 ${insights.delayedCount} CR${insights.delayedCount > 1 ? 's are' : ' is'} delayed. Urgent action required.`);
  }
  if (insights.highPriorityCount > 0 && insights.atRiskCount + insights.delayedCount > 0) {
    insights.recommendations.push(`🎯 Focus on ${insights.highPriorityCount} P0 CR${insights.highPriorityCount > 1 ? 's' : ''} to minimize business impact.`);
  }
  if (insights.avgAgeDays > 60) {
    insights.recommendations.push(`⏰ Average CR age is ${insights.avgAgeDays} days. Consider accelerating development cycles.`);
  }
  if (insights.liveCount > 0) {
    insights.recommendations.push(`✅ ${insights.liveCount} CR${insights.liveCount > 1 ? 's are' : ' is'} live. Great progress!`);
  }
  if (insights.recommendations.length === 0) {
    insights.recommendations.push(`✨ All CRs are on track. Keep up the good work!`);
  }
  
  res.json({ 
    crs, byStatus, byPriority, byDepartment, byMilestone, liveYTD, liveCount,
    byStatusBreakdown,
    byPriorityBreakdown,
    byMilestoneBreakdown,
    avgAgeSinceCreated,
    crAging,
    milestoneDurations,
    weeklyTrendData,
    insights
  });
});

export default router;

