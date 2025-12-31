import express from 'express';
import store from '../store.js';
import { getAllMilestoneDurations } from '../daily-snapshots.js';

const router = express.Router();

/**
 * Calculate weekly trend data for CRs
 * @param {string} type - Filter by type ('Project' or 'CR')
 * @returns {Array} Array of weekly trend data
 */
function calculateWeeklyTrend(type = 'CR') {
  const data = store.read();
  
  // Use current live data instead of snapshots for accurate counts
  const allCRs = data.initiatives.filter(i => i.type === type);
  
  if (allCRs.length === 0) {
    return [];
  }
  
  // Get all unique weeks from CRs' createdAt dates
  const weeks = new Set();
  
  // Add current week
  const today = new Date().toISOString().slice(0, 10);
  weeks.add(getWeekKey(today));
  
  // Add weeks from createdAt dates
  allCRs.forEach(cr => {
    if (cr.createdAt && cr.createdAt !== '' && cr.createdAt !== null) {
      const weekKey = getWeekKey(cr.createdAt.slice(0, 10));
      weeks.add(weekKey);
    }
  });
  
  // Add weeks from endDate dates (for LIVE CRs)
  allCRs.forEach(cr => {
    if (cr.endDate && cr.endDate !== '' && cr.endDate !== null) {
      const weekKey = getWeekKey(cr.endDate.slice(0, 10));
      weeks.add(weekKey);
    }
  });
  
  // Calculate metrics for each week
  const weeklyData = Array.from(weeks).sort().map(weekKey => {
    const weekStartStr = weekKey;
    const weekEndStr = getWeekEnd(weekKey);
    
    // 1. TOTAL: Count all CRs (using current live data)
    const totalCRs = allCRs.length;
    
    // 2. LIVE: Count CRs with status = LIVE AND endDate in this week
    const liveCRs = allCRs.filter(cr => {
      if (cr.status !== 'LIVE') return false;
      
      // Exclude CRs with empty/blank/null endDate
      if (!cr.endDate || cr.endDate === '' || cr.endDate === null) return false;
      
      const endDateStr = cr.endDate.slice(0, 10);
      return endDateStr >= weekStartStr && endDateStr <= weekEndStr;
    }).length;
    
    // 3. NEW: Count CRs with Create Date in this week
    const createdCRs = allCRs.filter(cr => {
      if (!cr.createdAt || cr.createdAt === '' || cr.createdAt === null) return false;
      
      const createdDateStr = cr.createdAt.slice(0, 10);
      return createdDateStr >= weekStartStr && createdDateStr <= weekEndStr;
    }).length;
    
    // 4. PENDING: Count CRs with status !== LIVE AND status !== CANCELLED
    const notLiveCRs = allCRs.filter(cr => 
      cr.status !== 'LIVE' && cr.status !== 'CANCELLED'
    ).length;
    
    return {
      weekStart: weekKey,
      weekEnd: weekEndStr,
      totalCRs,
      liveCRs,
      createdCRs,
      notLiveCRs
    };
  });
  
  // Return only the last 10 weeks
  return weeklyData.slice(-10);
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
 * Get week end date (Sunday) for a given week key
 * @param {string} weekKey - Monday date in YYYY-MM-DD format
 * @returns {string} Sunday date of the week
 */
function getWeekEnd(weekKey) {
  const monday = new Date(weekKey);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return sunday.toISOString().slice(0, 10);
}

router.get('/', (_req, res) => {
  const data = store.read();
  const total = data.initiatives.length;
  const projects = data.initiatives.filter(i => i.type === 'Project').length;
  const crs = data.initiatives.filter(i => i.type === 'CR').length;
  
  // Only count CR-type initiatives for distributions
  const crInitiatives = data.initiatives.filter(i => i.type === 'CR');
  const countBy = (key) => Object.entries(crInitiatives.reduce((acc, i) => { acc[i[key]] = (acc[i[key]]||0)+1; return acc; }, {})).map(([k,v]) => ({ [key]: k, c: v }));
  const byStatus = countBy('status');
  const byPriority = countBy('priority');
  const byDepartment = countBy('departmentId');
  
  // Milestone distribution - only count CRs with non-blank milestones
  const crsWithMilestone = crInitiatives.filter(i => i.milestone && i.milestone.trim() !== '');
  const byMilestone = Object.entries(crsWithMilestone.reduce((acc, i) => { acc[i.milestone] = (acc[i.milestone]||0)+1; return acc; }, {})).map(([k,v]) => ({ milestone: k, c: v }));
  
  const year = new Date().getFullYear();
  const liveYTD = crInitiatives.filter(i => i.status === 'Live' && (i.updatedAt||'').startsWith(String(year))).length;
  
  // Calculate aging metrics (CRs only)
  const now = new Date();
  const crAging = data.initiatives.filter(i => i.type === 'CR').map(i => {
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
  const milestoneDurations = getAllMilestoneDurations('CR');
  
  // Calculate weekly trend data for CRs
  const weeklyTrendData = calculateWeeklyTrend('CR');
  
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
    liveCount: crInitiatives.filter(i => i.milestone === 'Live' || (i.status && i.status.toUpperCase() === 'LIVE')).length,
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
    crs, byStatus, byPriority, byDepartment, byMilestone, liveYTD,
    avgAgeSinceCreated,
    crAging,
    milestoneDurations,
    weeklyTrendData,
    insights
  });
});

export default router;

