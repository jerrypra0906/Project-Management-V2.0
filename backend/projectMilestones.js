/** Canonical Project initiative milestones (Initiative type = Project). */
export const PROJECT_MILESTONE_LIVE_WARRANTY = 'Live (Warranty Period)';
export const PROJECT_MILESTONE_FULLY_LIVE = 'Fully Live';
export const PROJECT_MILESTONE_LEGACY_LIVE = 'Live';

export const PROJECT_MILESTONES = [
  'Preparation',
  'Business Requirement',
  'Tech Assessment',
  'Planning',
  'Development',
  'Testing',
  PROJECT_MILESTONE_LIVE_WARRANTY,
  PROJECT_MILESTONE_FULLY_LIVE,
];

/** @param {string|null|undefined} value */
export function normalizeProjectMilestone(value) {
  if (!value) return value;
  if (value === PROJECT_MILESTONE_LEGACY_LIVE) return PROJECT_MILESTONE_LIVE_WARRANTY;
  return value;
}

/** @param {string} value */
export function isValidProjectMilestone(value) {
  return (
    PROJECT_MILESTONES.includes(value) ||
    value === PROJECT_MILESTONE_LEGACY_LIVE
  );
}

/**
 * @param {string|null|undefined} rowMilestone
 * @param {string[]} filterValues
 */
export function projectMilestoneMatchesFilter(rowMilestone, filterValues) {
  if (!filterValues?.length) return true;
  const row = String(rowMilestone || '');
  return filterValues.some((f) => {
    if (f === PROJECT_MILESTONE_LIVE_WARRANTY) {
      return row === PROJECT_MILESTONE_LIVE_WARRANTY || row === PROJECT_MILESTONE_LEGACY_LIVE;
    }
    return row === f;
  });
}
