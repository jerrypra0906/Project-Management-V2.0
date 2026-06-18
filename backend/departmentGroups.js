/** Department Group mapping (aligned with Project Dashboard → By Department Group). */

export const DEPARTMENT_GROUP_OPTIONS = [
  { key: 'Industrial', label: 'Industrial' },
  { key: 'Commercial', label: 'Commercial' },
  { key: 'Logistic', label: 'Logistic' },
  { key: 'EXIM', label: 'EXIM' },
  { key: 'FABTIC', label: 'FABTIC' },
  { key: 'Support', label: 'Support (Procurement, HC, Sustainability)' },
];

export const DEPARTMENT_GROUP_KEYS = DEPARTMENT_GROUP_OPTIONS.map((g) => g.key);

/** @param {string|null|undefined} name */
export function normalizeDepartmentName(name) {
  const n = String(name || '').trim();
  if (!n) return n;
  const low = n.toLowerCase();
  if (low === 'operation') return 'Industrial';
  if (low === 'trader') return 'Commercial';
  return n;
}

/** @param {string|null|undefined} deptName */
export function departmentGroupFromName(deptName) {
  const n = normalizeDepartmentName(deptName);
  const low = String(n || '').trim().toLowerCase();
  if (!low) return 'Support';
  if (low === 'industrial') return 'Industrial';
  if (low === 'commercial') return 'Commercial';
  if (low === 'logistic') return 'Logistic';
  if (low === 'exim') return 'EXIM';
  if (low === 'fabtic') return 'FABTIC';
  if (low === 'procurement' || low === 'hc' || low === 'sustainability') return 'Support';
  return 'Support';
}

/**
 * @param {Array<{ id: string, name?: string }>} departments
 * @param {string|null|undefined} departmentId
 */
export function departmentGroupFromId(departments, departmentId) {
  if (!departmentId) return 'Support';
  const dept = (departments || []).find((d) => d.id === departmentId);
  return departmentGroupFromName(dept?.name || '');
}

/**
 * @param {Array<{ id: string, name?: string }>} departments
 * @param {string|null|undefined} departmentId
 * @param {string|null|undefined} filterGroup - empty = no filter
 */
export function matchesDepartmentGroup(departments, departmentId, filterGroup) {
  const key = String(filterGroup || '').trim();
  if (!key) return true;
  return departmentGroupFromId(departments, departmentId) === key;
}

export function isValidDepartmentGroupKey(key) {
  return DEPARTMENT_GROUP_KEYS.includes(String(key || '').trim());
}
