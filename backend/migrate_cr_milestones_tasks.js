/**
 * One-off migration:
 * 1) Normalize CR initiative milestone to the 7 standard values (per CR_INITIATIVE_MILESTONE_MAP).
 * 2) For CRs with status On Track / At Risk / Delayed, ensure the 8 default CR tasks exist (by name).
 *
 * Run: node backend/migrate_cr_milestones_tasks.js
 */
import 'dotenv/config';
import crypto from 'crypto';
import store from './store.js';
import {
  mapCrInitiativeMilestone,
  CR_TASK_DEFINITIONS,
  CR_BACKFILL_TASK_STATUSES,
  getCrAssigneeIdFromInitiative,
} from './crTaskTemplates.js';
import { CR_MILESTONE_PHASES } from './crTaskTemplates.js';

const now = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();

async function main() {
  const data = await store.read();
  if (!data.initiatives) data.initiatives = [];
  if (!data.tasks) data.tasks = [];

  let milestoneUpdates = 0;
  let tasksAdded = 0;

  const crs = data.initiatives.filter((i) => i.type === 'CR');

  for (const cr of crs) {
    // No-extra-column design: CR phase is stored directly in `milestone`.
    // Prefer any existing `crMilestonePhase` if present; otherwise derive a representative CR phase from canonical milestone.
    let nextMilestone = cr.crMilestonePhase ? String(cr.crMilestonePhase) : null;
    if (!nextMilestone) {
      const canon = String(mapCrInitiativeMilestone(cr.milestone) || '').trim().toLowerCase();
      nextMilestone =
        canon === 'preparation' ? 'User Initiate'
          : canon === 'tech assessment' ? 'FSD'
          : canon === 'testing' ? 'SIT'
          : canon === 'live (warranty period)' ? 'Live (Warranty Period)'
          : canon === 'fully live' ? 'Fully Live'
          : canon === 'development' ? 'Development'
          : 'User Initiate';
    }
    // Normalize one legacy label
    if (nextMilestone === 'CR Signed Sec 2 and 3') nextMilestone = 'CR Signed sec 2';
    if (!CR_MILESTONE_PHASES.includes(nextMilestone)) nextMilestone = 'User Initiate';

    if (cr.milestone !== nextMilestone) {
      console.log(`[milestone] ${cr.ticket || cr.id}: "${cr.milestone}" → "${nextMilestone}"`);
      cr.milestone = nextMilestone;
      cr.updatedAt = now();
      milestoneUpdates += 1;
    }

    // Clear old column if present to avoid confusion (optional)
    if (cr.crMilestonePhase) {
      cr.crMilestonePhase = null;
      cr.updatedAt = now();
    }

    const statusU = String(cr.status || '').toUpperCase().trim();
    if (!CR_BACKFILL_TASK_STATUSES.has(statusU)) continue;

    const existingNames = new Set(
      (data.tasks || []).filter((t) => t.initiativeId === cr.id).map((t) => String(t.name || '').trim())
    );

    const assigneeId = getCrAssigneeIdFromInitiative(cr);
    for (const { name, milestone } of CR_TASK_DEFINITIONS) {
      if (existingNames.has(name)) continue;
      data.tasks.push({
        id: uuid(),
        initiativeId: cr.id,
        name,
        description: null,
        startDate: null,
        endDate: null,
        assigneeId,
        status: 'not started',
        milestone,
        createdAt: now(),
        updatedAt: null,
      });
      existingNames.add(name);
      tasksAdded += 1;
      console.log(`[task] Added "${name}" to CR ${cr.ticket || cr.id}`);
    }
  }

  await store.write(data);
  console.log(`Done. CR initiative milestone updates: ${milestoneUpdates}. Tasks added: ${tasksAdded}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
