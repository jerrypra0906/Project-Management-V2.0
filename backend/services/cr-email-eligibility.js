/** System names (Master DWS Application) that trigger CR creation notification emails. */
const EMAIL_TRIGGER_SYSTEM_NAMES = new Set(['SAP FICO', 'SAP NON FICO']);

/**
 * @param {object} data - store.read() payload (must include dwsApplications)
 * @param {object} initiative - initiative row (uses systemImpactedIds)
 */
export function initiativeTriggersCrCreationEmail(data, initiative) {
  const apps = data.dwsApplications || [];
  const byId = new Map(apps.map((a) => [a.id, a]));
  const raw = initiative?.systemImpactedIds;
  const ids = Array.isArray(raw)
    ? raw
    : String(raw || '')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
  for (const id of ids) {
    const app = byId.get(id);
    const name = String(app?.systemName || '').trim();
    if (EMAIL_TRIGGER_SYSTEM_NAMES.has(name)) return true;
  }
  return false;
}
