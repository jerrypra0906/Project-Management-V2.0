/**
 * Migration script to normalize existing task status and milestone values
 * to the new enum format.
 * 
 * This script:
 * 1. Reads all existing tasks from the database
 * 2. Normalizes status and milestone values using case-insensitive mapping
 * 3. Updates the tasks with normalized values
 * 4. Reports what was changed
 * 
 * Run: node backend/migrate_task_enums.js
 */

import store from './store.js';
import { 
  normalizeStatus, 
  normalizeMilestone, 
  TaskStatus,
  VALID_TASK_STATUSES,
  VALID_MILESTONES 
} from './enums/taskEnums.js';

// Extended mapping for legacy values that might exist in the database
const LEGACY_STATUS_MAP = {
  // Old values to new enum values
  'not started': 'not started',
  'on hold': 'at risk',       // Map 'On Hold' to 'at risk'
  'on track': 'in progress',  // Map 'On Track' to 'in progress'
  'at risk': 'at risk',
  'delayed': 'at risk',       // Map 'Delayed' to 'at risk'
  'live': 'done',             // Map 'Live' to 'done'
  'cancelled': 'cancel',
  'canceled': 'cancel'
};

const LEGACY_MILESTONE_MAP = {
  // Old values to new enum values
  'preparation': null,        // 'Preparation' not in new enum, set to null
  'business requirement': 'Business Requirement',
  'tech assessment': 'Tech Assessment',
  'planning': 'Planning',
  'development': 'Development',
  'testing': 'Testing',
  'live': 'Live Preparation', // Map 'Live' to 'Live Preparation'
  'live preparation': 'Live Preparation'
};

function normalizeStatusWithLegacy(status) {
  if (!status) return TaskStatus.NOT_STARTED;
  
  const lower = status.toLowerCase().trim();
  
  // Check legacy map first
  if (LEGACY_STATUS_MAP[lower] !== undefined) {
    return LEGACY_STATUS_MAP[lower];
  }
  
  // Fall back to standard normalization
  return normalizeStatus(status, TaskStatus.NOT_STARTED);
}

function normalizeMilestoneWithLegacy(milestone) {
  if (!milestone) return null;
  
  const lower = milestone.toLowerCase().trim();
  
  // Check legacy map first
  if (LEGACY_MILESTONE_MAP[lower] !== undefined) {
    return LEGACY_MILESTONE_MAP[lower];
  }
  
  // Fall back to standard normalization
  return normalizeMilestone(milestone, null);
}

async function migrate() {
  console.log('='.repeat(60));
  console.log('Task Status & Milestone Enum Migration');
  console.log('='.repeat(60));
  console.log();
  
  console.log('Valid Status values:', VALID_TASK_STATUSES);
  console.log('Valid Milestone values:', VALID_MILESTONES);
  console.log();
  
  try {
    const data = await store.read();
    const tasks = data.tasks || [];
    
    if (tasks.length === 0) {
      console.log('No tasks found in database. Nothing to migrate.');
      return;
    }
    
    console.log(`Found ${tasks.length} tasks to check.\n`);
    
    let statusChanges = 0;
    let milestoneChanges = 0;
    const changes = [];
    
    for (const task of tasks) {
      const originalStatus = task.status;
      const originalMilestone = task.milestone;
      
      const newStatus = normalizeStatusWithLegacy(originalStatus);
      const newMilestone = normalizeMilestoneWithLegacy(originalMilestone);
      
      let taskChanged = false;
      const taskChange = { 
        id: task.id, 
        name: task.name,
        changes: [] 
      };
      
      // Check if status changed
      if (originalStatus !== newStatus) {
        taskChange.changes.push({
          field: 'status',
          from: originalStatus,
          to: newStatus
        });
        task.status = newStatus;
        statusChanges++;
        taskChanged = true;
      }
      
      // Check if milestone changed
      if (originalMilestone !== newMilestone) {
        taskChange.changes.push({
          field: 'milestone',
          from: originalMilestone,
          to: newMilestone
        });
        task.milestone = newMilestone;
        milestoneChanges++;
        taskChanged = true;
      }
      
      if (taskChanged) {
        task.updatedAt = new Date().toISOString();
        changes.push(taskChange);
      }
    }
    
    // Print changes summary
    console.log('-'.repeat(60));
    console.log('Changes Summary');
    console.log('-'.repeat(60));
    
    if (changes.length === 0) {
      console.log('No changes needed. All tasks already have valid enum values.');
    } else {
      console.log(`\nTasks modified: ${changes.length}`);
      console.log(`Status changes: ${statusChanges}`);
      console.log(`Milestone changes: ${milestoneChanges}`);
      console.log('\nDetailed changes:');
      
      for (const change of changes) {
        console.log(`\n  Task: "${change.name}" (${change.id})`);
        for (const c of change.changes) {
          console.log(`    ${c.field}: "${c.from}" → "${c.to}"`);
        }
      }
      
      // Save changes
      console.log('\n' + '-'.repeat(60));
      console.log('Saving changes to database...');
      
      await store.write(data);
      
      console.log('Migration completed successfully!');
    }
    
    console.log('\n' + '='.repeat(60));
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrate().then(() => {
  console.log('\nMigration script finished.');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
