import express from 'express';
import store from '../store.js';
import { getAllMilestoneDurations } from '../daily-snapshots.js';

const router = express.Router();

router.get('/', (_req, res) => {
  const data = store.read();
  const total = data.initiatives.length;
  const projects = data.initiatives.filter(i => i.type === 'Project').length;
  const crs = data.initiatives.filter(i => i.type === 'CR').length;
  
  // Only count Project-type initiatives for distributions
  const projectInitiatives = data.initiatives.filter(i => i.type === 'Project');
  const countBy = (key) => Object.entries(projectInitiatives.reduce((acc, i) => { acc[i[key]] = (acc[i[key]]||0)+1; return acc; }, {})).map(([k,v]) => ({ [key]: k, c: v }));
  const byStatus = countBy('status');
  const byPriority = countBy('priority');
  const byDepartment = countBy('departmentId');
  
  // Milestone distribution - only count projects with non-blank milestones
  const projectsWithMilestone = projectInitiatives.filter(i => i.milestone && i.milestone.trim() !== '');
  const byMilestone = Object.entries(projectsWithMilestone.reduce((acc, i) => { acc[i.milestone] = (acc[i.milestone]||0)+1; return acc; }, {})).map(([k,v]) => ({ milestone: k, c: v }));
  
  const year = new Date().getFullYear();
  const liveYTD = projectInitiatives.filter(i => i.status === 'Live' && (i.updatedAt||'').startsWith(String(year))).length;
  
  // Calculate aging metrics (Projects only)
  const now = new Date();
  const projectAging = data.initiatives.filter(i => i.type === 'Project').map(i => {
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
  
  const avgAgeSinceCreated = projectAging.length > 0 ? 
    Math.round(projectAging.reduce((sum, m) => sum + m.daysSinceCreated, 0) / projectAging.length) : 0;
  
  // Calculate detailed milestone durations using daily snapshots (Projects only)
  const milestoneDurations = getAllMilestoneDurations('Project');
  
  // Generate Project Insights
  const insights = {
    totalProjects: projects,
    activeProjects: projectInitiatives.filter(i => i.status && i.status.toUpperCase() !== 'NOT STARTED').length,
    atRiskCount: projectInitiatives.filter(i => i.status && i.status.toUpperCase() === 'AT RISK').length,
    delayedCount: projectInitiatives.filter(i => i.status && i.status.toUpperCase() === 'DELAYED').length,
    liveCount: projectInitiatives.filter(i => i.milestone === 'Live' || (i.status && i.status.toUpperCase() === 'LIVE')).length,
    avgAgeDays: avgAgeSinceCreated,
    oldestProject: projectAging.length > 0 ? projectAging.reduce((max, p) => p.daysSinceCreated > max.daysSinceCreated ? p : max) : null,
    newestProject: projectAging.length > 0 ? projectAging.reduce((min, p) => p.daysSinceCreated < min.daysSinceCreated ? p : min) : null,
    mostCommonMilestone: byMilestone.length > 0 ? byMilestone.reduce((max, m) => m.c > max.c ? m : max) : null,
    highPriorityCount: projectInitiatives.filter(i => i.priority === 'P0').length,
    recommendations: []
  };
  
  // Add AI-powered recommendations
  if (insights.atRiskCount > 0) {
    insights.recommendations.push(`⚠️ ${insights.atRiskCount} project${insights.atRiskCount > 1 ? 's are' : ' is'} at risk. Review and mitigate risks immediately.`);
  }
  if (insights.delayedCount > 0) {
    insights.recommendations.push(`🚨 ${insights.delayedCount} project${insights.delayedCount > 1 ? 's are' : ' is'} delayed. Urgent action required.`);
  }
  if (insights.highPriorityCount > 0 && insights.atRiskCount + insights.delayedCount > 0) {
    insights.recommendations.push(`🎯 Focus on ${insights.highPriorityCount} P0 project${insights.highPriorityCount > 1 ? 's' : ''} to minimize business impact.`);
  }
  if (insights.avgAgeDays > 90) {
    insights.recommendations.push(`⏰ Average project age is ${insights.avgAgeDays} days. Consider accelerating delivery cycles.`);
  }
  if (insights.liveCount > 0) {
    insights.recommendations.push(`✅ ${insights.liveCount} project${insights.liveCount > 1 ? 's are' : ' is'} live. Great progress!`);
  }
  if (insights.recommendations.length === 0) {
    insights.recommendations.push(`✨ All projects are on track. Keep up the good work!`);
  }
  
  res.json({ 
    projects, byStatus, byPriority, byDepartment, byMilestone, liveYTD,
    avgAgeSinceCreated,
    projectAging,
    milestoneDurations,
    insights
  });
});

export default router;


