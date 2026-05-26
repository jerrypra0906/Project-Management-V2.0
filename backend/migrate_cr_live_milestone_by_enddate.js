/**
 * One-off migration:
 * Convert legacy CR initiative milestone "Live" to either:
 * - "Fully Live" when (today - Actual End Date) > 14 days
 * - "Live (Warranty Period)" when (today - Actual End Date) <= 14 days
 *
 * Notes:
 * - Only affects initiatives with type === 'CR'
 * - Only affects rows where milestone is exactly "Live" (legacy value)
 * - If Actual End Date is missing/invalid, falls back to "Live (Warranty Period)"
 *
 * Run:
 *   node backend/migrate_cr_live_milestone_by_enddate.js
 */

import 'dotenv/config';
import store from './store.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const nowIso = () => new Date().toISOString();

function toYmdDate(value) {
  if (!value) return null;
  const s = String(value).slice(0, 10);
  // Expect YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function diffDaysUtcFloor(a, b) {
  // a - b in full days (floor)
  const aUtc = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const bUtc = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.floor((aUtc - bUtc) / MS_PER_DAY);
}

async function main() {
  const data = await store.read();
  if (!data.initiatives) data.initiatives = [];

  const today = new Date();

  let scanned = 0;
  let updated = 0;
  const samples = [];

  for (const i of data.initiatives) {
    if (!i || i.type !== 'CR') continue;
    if (i.milestone !== 'Live') continue;

    scanned += 1;

    const end = toYmdDate(i.endDate);
    let next = 'Live (Warranty Period)';
    let daysSinceEnd = null;

    if (end) {
      daysSinceEnd = diffDaysUtcFloor(today, end);
      if (daysSinceEnd > 14) next = 'Fully Live';
    }

    i.milestone = next;
    i.updatedAt = nowIso();
    updated += 1;

    if (samples.length < 25) {
      samples.push({
        id: i.id,
        ticket: i.ticket || null,
        endDate: i.endDate || null,
        daysSinceEnd,
        milestone: next,
      });
    }
  }

  await store.write(data);
  console.log(
    `Done. Scanned legacy Live milestones: ${scanned}. Updated: ${updated}.`
  );
  if (samples.length > 0) {
    console.log('Sample updates (up to 25):');
    console.log(JSON.stringify(samples, null, 2));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

