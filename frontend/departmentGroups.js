/** Department Group mapping (aligned with Project Dashboard → By Department Group). */

export const DEPARTMENT_GROUP_OPTIONS = [
  { key: 'Industrial', label: 'Industrial' },
  { key: 'Commercial', label: 'Commercial' },
  { key: 'Logistic', label: 'Logistic' },
  { key: 'EXIM', label: 'EXIM' },
  { key: 'FABTIC', label: 'FABTIC' },
  { key: 'Support', label: 'Support (Procurement, HC, Sustainability)' },
];

export function normalizeDepartmentName(name) {
  const n = String(name || '').trim();
  if (!n) return n;
  const low = n.toLowerCase();
  if (low === 'operation') return 'Industrial';
  if (low === 'trader') return 'Commercial';
  return n;
}

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

export function departmentGroupFromId(departments, departmentId) {
  if (!departmentId) return 'Support';
  const dept = (departments || []).find((d) => d.id === departmentId);
  return departmentGroupFromName(dept?.name || '');
}

export function matchesDepartmentGroup(departments, departmentId, filterGroup) {
  const key = String(filterGroup || '').trim();
  if (!key) return true;
  return departmentGroupFromId(departments, departmentId) === key;
}
