/**
 * One-off: add Master DWS "SAP FICO" to System Impacted for every existing CR initiative.
 *
 * Prerequisites:
 *   - A row in Master DWS Application with systemName exactly "SAP FICO" (trimmed).
 *
 * Usage (from repo root, with DATABASE_URL / .env as for the app):
 *   node backend/prefill-cr-system-impacted-sap-fico.js
 *   node backend/prefill-cr-system-impacted-sap-fico.js --dry-run
 *
 * Docker (typical container name):
 *   docker exec project_management_backend node /app/backend/prefill-cr-system-impacted-sap-fico.js
 *   docker exec project_management_backend node /app/backend/prefill-cr-system-impacted-sap-fico.js --dry-run
 */
import 'dotenv/config';
import store from './store.js';

const TARGET_SYSTEM_NAME = 'SAP FICO';

function normalizeImpactedIds(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((x) => String(x).trim()).filter(Boolean);
  return String(raw)
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

/**
 * @param {{ dryRun?: boolean }} [options]
 * @returns {Promise<{ ok: boolean; sapFicoId: string; changed: number; skippedAlready: number; dryRun: boolean }>}
 */
export async function prefillCrSystemImpactedSapFico(options = {}) {
  const dryRun = !!options.dryRun;
  const data = await store.read();
  const apps = data.dwsApplications || [];
  const sapFico = apps.find((a) => String(a.systemName || '').trim() === TARGET_SYSTEM_NAME);

  if (!sapFico) {
    throw new Error(
      `No Master DWS application with systemName "${TARGET_SYSTEM_NAME}". ` +
        'Create it under Master DWS Application, then run this script again.'
    );
  }

  const initiatives = data.initiatives || [];
  const now = new Date().toISOString();
  let changed = 0;
  let skippedAlready = 0;

  for (const i of initiatives) {
    if (i.type !== 'CR') continue;
    const ids = normalizeImpactedIds(i.systemImpactedIds);
    if (ids.includes(sapFico.id)) {
      skippedAlready += 1;
      continue;
    }
    const next = [...ids, sapFico.id];
    i.systemImpactedIds = next.length ? next : null;
    i.updatedAt = now;
    changed += 1;
    if (dryRun) {
      console.log(`[dry-run] would update CR ${i.ticket || i.id}: ${i.name || ''}`);
    }
  }

  if (dryRun) {
    console.log(`[dry-run] ${changed} CR(s) would be updated; ${skippedAlready} already had SAP FICO.`);
    return { ok: true, sapFicoId: sapFico.id, changed, skippedAlready, dryRun: true };
  }

  if (changed > 0) {
    await store.write(data);
  }
  console.log(
    `Done. Updated ${changed} CR initiative(es) with "${TARGET_SYSTEM_NAME}" (id ${sapFico.id}). ` +
      `${skippedAlready} already included it.`
  );
  return { ok: true, sapFicoId: sapFico.id, changed, skippedAlready, dryRun: false };
}

const dryRun = process.argv.includes('--dry-run');

prefillCrSystemImpactedSapFico({ dryRun })
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
