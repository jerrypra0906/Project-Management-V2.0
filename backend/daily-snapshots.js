import store from './store.js';

/**
 * Daily snapshot system for tracking milestone durations
 * This captures project/CR data daily to calculate accurate milestone durations
 * based on how many days a project/CR spent in each milestone
 */

/**
 * Create a daily snapshot for all initiatives
 * This should be called once per day to capture the current state
 */
export async function createDailySnapshot() {
  const data = await store.read();
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format
  
  // Check if snapshot already exists for today
  if (!data.dailySnapshots) {
    data.dailySnapshots = {};
  }
  
  if (data.dailySnapshots[today]) {
    console.log(`Daily snapshot already exists for ${today}`);
    return;
  }
  
  // Create snapshot data for all initiatives
  const snapshotData = {
    date: today,
    initiatives: data.initiatives.map(initiative => ({
      id: initiative.id,
      name: initiative.name,
      type: initiative.type,
      status: initiative.status,
      milestone: initiative.milestone,
      priority: initiative.priority,
      departmentId: initiative.departmentId,
      businessOwnerId: initiative.businessOwnerId,
      itPicId: initiative.itPicId,
      createdAt: initiative.createdAt,
      startDate: initiative.startDate,
      endDate: initiative.endDate,
      updatedAt: initiative.updatedAt
    }))
  };
  
  // Store the snapshot
  data.dailySnapshots[today] = snapshotData;
  await store.write(data);
  
  console.log(`Daily snapshot created for ${today} with ${snapshotData.initiatives.length} initiatives`);
  return snapshotData;
}

/**
 * Calculate milestone duration based on daily snapshots
 * @param {string} initiativeId - The initiative ID
 * @param {string} targetMilestone - The milestone to calculate duration for
 * @returns {number} Number of days spent in the milestone
 */
export async function calculateMilestoneDuration(initiativeId, targetMilestone) {
  const data = await store.read();
  
  if (!data.dailySnapshots) {
    return 0;
  }
  
  // Get all snapshots sorted by date
  const snapshots = Object.entries(data.dailySnapshots)
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB));
  
  let duration = 0;
  let inMilestone = false;
  let milestoneStartDate = null;
  
  for (const [date, snapshot] of snapshots) {
    const initiative = snapshot.initiatives.find(i => i.id === initiativeId);
    
    if (!initiative) {
      continue;
    }
    
    const currentMilestone = initiative.milestone;
    const isInTargetMilestone = currentMilestone === targetMilestone;
    
    if (isInTargetMilestone && !inMilestone) {
      // Started the milestone
      inMilestone = true;
      milestoneStartDate = date;
    } else if (!isInTargetMilestone && inMilestone) {
      // Ended the milestone
      inMilestone = false;
      if (milestoneStartDate) {
        duration += calculateDaysBetween(milestoneStartDate, date);
      }
    }
  }
  
  // If still in milestone, count up to today
  if (inMilestone && milestoneStartDate) {
    const today = new Date().toISOString().slice(0, 10);
    duration += calculateDaysBetween(milestoneStartDate, today);
  }
  
  return duration;
}

/**
 * Get detailed milestone duration breakdown for an initiative
 * @param {string} initiativeId - The initiative ID
 * @returns {Array} Array of milestone duration objects
 */
export async function getMilestoneDurationBreakdown(initiativeId) {
  const data = await store.read();
  
  if (!data.dailySnapshots) {
    return [];
  }
  
  // Get all snapshots sorted by date
  const snapshots = Object.entries(data.dailySnapshots)
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB));
  
  const milestonePeriods = [];
  let currentMilestone = null;
  let milestoneStartDate = null;
  
  for (const [date, snapshot] of snapshots) {
    const initiative = snapshot.initiatives.find(i => i.id === initiativeId);
    
    if (!initiative) {
      continue;
    }
    
    const milestone = initiative.milestone;
    
    if (milestone !== currentMilestone) {
      // Milestone changed
      if (currentMilestone && milestoneStartDate) {
        // Save previous milestone period
        milestonePeriods.push({
          milestone: currentMilestone,
          startDate: milestoneStartDate,
          endDate: date,
          duration: calculateDaysBetween(milestoneStartDate, date),
          status: 'Completed'
        });
      }
      
      // Start new milestone period
      currentMilestone = milestone;
      milestoneStartDate = date;
    }
  }
  
  // Add current milestone if still active
  if (currentMilestone && milestoneStartDate) {
    const today = new Date().toISOString().slice(0, 10);
    milestonePeriods.push({
      milestone: currentMilestone,
      startDate: milestoneStartDate,
      endDate: null,
      duration: calculateDaysBetween(milestoneStartDate, today),
      status: 'Current'
    });
  }
  
  return milestonePeriods;
}

/**
 * Calculate days between two dates
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {number} Number of days between dates
 */
function calculateDaysBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end - start;
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Initialize daily snapshots if they don't exist
 * This creates a snapshot for today and can be used to bootstrap the system
 */
export async function initializeDailySnapshots() {
  const data = await store.read();
  
  if (!data.dailySnapshots || Object.keys(data.dailySnapshots).length === 0) {
    console.log('Initializing daily snapshots system...');
    await createDailySnapshot();
  }
}

/**
 * Get all milestone durations for all initiatives
 * @param {string} type - Filter by type ('Project' or 'CR')
 * @returns {Array} Array of initiative milestone durations
 */
export async function getAllMilestoneDurations(type = null) {
  const data = await store.read();
  let initiatives = data.initiatives;
  
  if (type) {
    initiatives = initiatives.filter(i => i.type === type);
  }
  
  const results = [];
  for (const initiative of initiatives) {
    const breakdown = await getMilestoneDurationBreakdown(initiative.id);
    results.push({
      id: initiative.id,
      name: initiative.name,
      type: initiative.type,
      currentMilestone: initiative.milestone,
      milestoneDetails: breakdown
    });
  }
  
  return results;
}

export default {
  createDailySnapshot,
  calculateMilestoneDuration,
  getMilestoneDurationBreakdown,
  initializeDailySnapshots,
  getAllMilestoneDurations
};

