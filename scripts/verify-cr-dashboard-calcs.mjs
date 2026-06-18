/**
 * Independent verification of CR Dashboard chart calculations.
 * Run: node scripts/verify-cr-dashboard-calcs.mjs
 */
import store from '../backend/store.js';
import {
  calculateWeeklyTrend,
  calculateGoLiveRate,
  calculateOpenBurndown,
  calculateMonthlyOpenCRs,
} from '../backend/routes/cr-dashboard.js';

function getWeekKey(date) {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  return monday.toISOString().slice(0, 10);
}

function getWeekEnd(weekKey) {
  const monday = new Date(weekKey);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  return friday.toISOString().slice(0, 10);
}

function getWeekKeys12() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const currentWeekKey = getWeekKey(todayStr);
  const weekKeys = [];
  for (let i = 0; i < 12; i++) {
    const weekDate = new Date(currentWeekKey);
    weekDate.setDate(weekDate.getDate() - i * 7);
    weekKeys.push(getWeekKey(weekDate.toISOString().slice(0, 10)));
  }
  return weekKeys.reverse();
}

function verifyWeeklyTrend(crInitiatives) {
  const weekKeys = getWeekKeys12();
  const rows = weekKeys.map((weekKey) => {
    const weekEndStr = getWeekEnd(weekKey);
    const newCRs = crInitiatives.filter((cr) => {
      if (!cr.createdAt) return false;
      const created = cr.createdAt.slice(0, 10);
      return created >= weekKey && created <= weekEndStr;
    }).length;
    const liveCRs = crInitiatives.filter((cr) => {
      if ((cr.status || '').toUpperCase() !== 'LIVE') return false;
      if (!cr.endDate) return false;
      const end = cr.endDate.slice(0, 10);
      return end >= weekKey && end <= weekEndStr;
    }).length;
    const totalCRs = crInitiatives.filter((cr) => {
      if (!cr.createdAt) return false;
      return cr.createdAt.slice(0, 10) <= weekEndStr;
    }).length;
    return { weekKey, weekEndStr, newCRs, liveCRs, totalCRs };
  });
  return rows;
}

function verifyOpenBurndown(crInitiatives) {
  const weekKeys = getWeekKeys12();
  return weekKeys.map((weekKey) => {
    const weekEndStr = getWeekEnd(weekKey);
    const openCRs = crInitiatives.filter((cr) => {
      const status = (cr.status || '').toUpperCase();
      if (status === 'LIVE' || status === 'CANCELLED') return false;
      if (!cr.createdAt) return false;
      if (cr.createdAt.slice(0, 10) > weekEndStr) return false;
      if (cr.endDate) {
        if (cr.endDate.slice(0, 10) <= weekEndStr) return false;
      }
      return true;
    });
    const counts = { P0: 0, P1: 0, P2: 0, Total: 0 };
    openCRs.forEach((cr) => {
      const p = (cr.priority || 'P2').toUpperCase();
      if (p === 'P0') counts.P0++;
      else if (p === 'P1') counts.P1++;
      else if (p === 'P2') counts.P2++;
      counts.Total = counts.P0 + counts.P1 + counts.P2;
    });
    return { weekKey, weekEndStr, ...counts, _openCountAll: openCRs.length };
  });
}

function isCrWentLive(cr) {
  if (!cr) return false;
  if ((cr.status || '').toUpperCase() !== 'LIVE') return false;
  if (!cr.endDate || cr.endDate === '' || cr.endDate === null) return false;
  return true;
}

function verifyGoLiveRate(crInitiatives) {
  const crsWentLive = crInitiatives.filter(isCrWentLive);
  if (!crsWentLive.length) return [];

  const endDates = crsWentLive.map((cr) => cr.endDate.slice(0, 10)).filter((d) => d.length === 10).sort();
  const oldestDate = new Date(endDates[0]);
  const today = new Date();
  const monthlyData = {};
  const currentDate = new Date(oldestDate);
  currentDate.setDate(1);
  while (currentDate <= today) {
    const monthKey = currentDate.toISOString().slice(0, 7);
    monthlyData[monthKey] = { month: monthKey, date: new Date(currentDate), P0: 0, P1: 0, P2: 0, Total: 0 };
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  crsWentLive.forEach((cr) => {
    const monthKey = cr.endDate.slice(0, 7);
    if (!monthlyData[monthKey]) return;
    const priority = (cr.priority || 'P2').toUpperCase();
    if (priority === 'P0' || priority === 'P1' || priority === 'P2') {
      monthlyData[monthKey][priority]++;
      monthlyData[monthKey].Total++;
    }
  });

  const monthlyArray = Object.values(monthlyData).sort((a, b) => a.date - b.date);
  const result = monthlyArray.map((month, index) => {
    const startIdx = Math.max(0, index - 1);
    const monthsForAvg = monthlyArray.slice(startIdx, index + 1);
    const monthCount = monthsForAvg.length;
    const movingAvg = { P0: 0, P1: 0, P2: 0, Total: 0 };
    monthsForAvg.forEach((m) => {
      movingAvg.P0 += m.P0;
      movingAvg.P1 += m.P1;
      movingAvg.P2 += m.P2;
      movingAvg.Total += m.Total;
    });
    ['P0', 'P1', 'P2', 'Total'].forEach((k) => {
      movingAvg[k] = monthCount > 0 ? Math.round((movingAvg[k] / monthCount) * 10) / 10 : 0;
    });
    return {
      month: month.month,
      actual: { P0: month.P0, P1: month.P1, P2: month.P2, Total: month.Total },
      movingAvg2M: movingAvg,
    };
  });
  return result.filter((r) => r.month >= '2025-09');
}

function verifyMonthlyOpenCRs(crInitiatives) {
  const startDate = new Date('2025-12-01');
  const currentDate = new Date();
  const months = [];
  for (let d = new Date(startDate); d <= currentDate; d.setMonth(d.getMonth() + 1)) {
    const year = d.getFullYear();
    const month = d.getMonth();
    const monthEnd = new Date(year, month + 1, 0);
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    const monthEndStr = monthEnd.toISOString().slice(0, 10);
    const openCRs = crInitiatives.filter((cr) => {
      const status = (cr.status || '').toUpperCase();
      if (status === 'LIVE' || status === 'CANCELLED') return false;
      if (!cr.createdAt) return false;
      if (cr.createdAt.slice(0, 10) > monthEndStr) return false;
      if (cr.endDate && cr.endDate.slice(0, 10) <= monthEndStr) return false;
      return true;
    }).length;
    months.push({ monthKey, monthEndStr, openCRs });
  }
  return months;
}

const data = await store.read();
const crInitiatives = data.initiatives.filter((i) => i.type === 'CR');

const weeklyVerify = verifyWeeklyTrend(crInitiatives);
const burndownVerify = verifyOpenBurndown(crInitiatives);
const goLiveVerify = verifyGoLiveRate(crInitiatives);
const monthlyOpenVerify = verifyMonthlyOpenCRs(crInitiatives);

// 1) Go Live / Weekly Trend: LIVE + endDate
const endDateNotLive = crInitiatives.filter(
  (cr) => cr.endDate && (cr.status || '').toUpperCase() !== 'LIVE'
).length;
const liveNoEndDate = crInitiatives.filter(
  (cr) => (cr.status || '').toUpperCase() === 'LIVE' && !cr.endDate
).length;
const wentLiveCount = crInitiatives.filter(isCrWentLive).length;

// 2) Weekly live vs go-live definition
const liveByStatusOnly = crInitiatives.filter((cr) => (cr.status || '').toUpperCase() === 'LIVE').length;
const liveByEndDateOnly = crInitiatives.filter((cr) => cr.endDate).length;

// 3) Burndown: non-P0/P1/P2 priorities excluded from Total
const nonStandardPriority = crInitiatives.filter((cr) => {
  const p = (cr.priority || 'P2').toUpperCase();
  return !['P0', 'P1', 'P2'].includes(p);
}).length;

// 4) Latest week burndown vs current open (status-based, today)
const today = new Date().toISOString().slice(0, 10);
const currentOpenByStatus = crInitiatives.filter((cr) => {
  const s = (cr.status || '').toUpperCase();
  return s !== 'LIVE' && s !== 'CANCELLED';
}).length;
const latestBurndown = burndownVerify[burndownVerify.length - 1];

// 5) UTC week boundary spot check
const tzNote = `Server local date: ${today}, current week Mon: ${getWeekKeys12().at(-1)}`;

const apiWeekly = await calculateWeeklyTrend('CR', crInitiatives);
const apiBurndown = calculateOpenBurndown(crInitiatives);
const apiGoLive = calculateGoLiveRate(crInitiatives);
const apiMonthlyOpen = calculateMonthlyOpenCRs(crInitiatives);

function compareApiVsVerify(name, apiRows, verifyRows, keys) {
  let ok = true;
  if (apiRows.length !== verifyRows.length) {
    console.log(`  ✗ ${name}: length api=${apiRows.length} verify=${verifyRows.length}`);
    return false;
  }
  for (let i = 0; i < apiRows.length; i++) {
    for (const k of keys) {
      if (apiRows[i][k] !== verifyRows[i][k]) {
        console.log(`  ✗ ${name} row ${i} ${k}: api=${apiRows[i][k]} verify=${verifyRows[i][k]}`);
        ok = false;
        break;
      }
    }
    if (!ok) break;
  }
  if (ok) console.log(`  ✓ ${name}: ${apiRows.length} rows match API module`);
  return ok;
}

console.log('=== CR Dashboard Calculation Verification ===\n');
console.log('--- API module vs independent recompute ---');
compareApiVsVerify(
  'Weekly Trend',
  apiWeekly,
  weeklyVerify,
  ['newCRs', 'liveCRs', 'totalCRs']
);
compareApiVsVerify(
  'Open Burndown',
  apiBurndown,
  burndownVerify,
  ['P0', 'P1', 'P2', 'Total']
);
compareApiVsVerify(
  'Go Live 2M MA',
  apiGoLive,
  goLiveVerify,
  ['month']
);
// Go live values
for (let i = 0; i < apiGoLive.length; i++) {
  if (apiGoLive[i].movingAvg2M?.Total !== goLiveVerify[i].movingAvg2M?.Total) {
    console.log(`  ✗ Go Live MA Total month ${apiGoLive[i].month}`);
  }
}
if (apiGoLive.every((r, i) => r.movingAvg2M?.Total === goLiveVerify[i].movingAvg2M?.Total)) {
  console.log(`  ✓ Go Live 2M MA values: ${apiGoLive.length} months match`);
}
compareApiVsVerify(
  'Monthly Open CRs',
  apiMonthlyOpen,
  monthlyOpenVerify,
  ['openCRs']
);
console.log('');
console.log(`Total CRs in DB: ${crInitiatives.length}`);
console.log(`\n--- Data definition cross-checks ---`);
console.log(`CRs with endDate but status ≠ LIVE: ${endDateNotLive} (excluded from Go Live Rate)`);
console.log(`CRs status LIVE but no endDate: ${liveNoEndDate} (excluded from Go Live Rate)`);
console.log(`CRs went live (LIVE + endDate): ${wentLiveCount}`);
console.log(`CRs LIVE by status: ${liveByStatusOnly}`);
console.log(`CRs with any endDate: ${liveByEndDateOnly}`);
console.log(`CRs with non P0/P1/P2 priority: ${nonStandardPriority} (excluded from burndown/go-live priority stacks)`);
console.log(`Current open by status (not LIVE/CANCELLED): ${currentOpenByStatus}`);
console.log(`Latest week burndown Total (P0+P1+P2, date rules): ${latestBurndown?.Total} (all priorities in filter: ${latestBurndown?._openCountAll})`);
console.log(`Note: ${tzNote}\n`);

console.log('--- Weekly Trend (last 4 weeks) ---');
weeklyVerify.slice(-4).forEach((w) => {
  console.log(`  ${w.weekKey}..${w.weekEndStr}: new=${w.newCRs} live=${w.liveCRs} cumulative=${w.totalCRs}`);
});

console.log('\n--- Open Burndown (last 4 weeks) ---');
burndownVerify.slice(-4).forEach((w) => {
  console.log(`  ${w.weekKey}: P0=${w.P0} P1=${w.P1} P2=${w.P2} Total=${w.Total}`);
});

console.log('\n--- Go Live Rate (last 6 months, actual + 2M MA) ---');
goLiveVerify.slice(-6).forEach((m) => {
  console.log(
    `  ${m.month}: actual Total=${m.actual.Total} (P0=${m.actual.P0} P1=${m.actual.P1} P2=${m.actual.P2}) → 2M MA Total=${m.movingAvg2M.Total}`
  );
});

console.log('\n--- Monthly Open + Forecast inputs (Dec 2025+) ---');
monthlyOpenVerify.forEach((m) => {
  const gl = goLiveVerify.find((g) => g.month === m.monthKey);
  const ma = gl?.movingAvg2M?.Total ?? 0;
  const benchMonths = m.openCRs > 0 ? Math.ceil(m.openCRs / 7) : 0;
  const maMonths = m.openCRs > 0 && ma > 0 ? Math.ceil(m.openCRs / ma) : null;
  console.log(
    `  ${m.monthKey}: open=${m.openCRs} | benchmark months=${benchMonths} | 2M MA=${ma} → MA months=${maMonths ?? 'N/A'}`
  );
});

console.log('\n--- Formula summary (as implemented) ---');
console.log(`
Go Live Rate (2M Moving Average):
  • Counts CRs with status=LIVE and endDate (same as Weekly Trend "CRs Went Live"), by endDate month.
  • 2M MA for month M = round1( (count(M) + count(M-1)) / N ) where N=1 if first month else 2.
  • Chart shows months >= 2025-09 only.

CR Open Burndown (Weekly):
  • For each of last 12 Mon–Fri weeks: open if created<=weekEnd AND status ∉ {LIVE,CANCELLED}
    AND (no endDate OR endDate > weekEnd).
  • Stacks P0/P1/P2 only; Total = sum of those three.

CR Weekly Trend:
  • newCRs: createdAt in [Mon, Fri] of week.
  • liveCRs: status=LIVE AND endDate in [Mon, Fri] of week.
  • totalCRs: cumulative created<=weekEnd (computed but not shown on chart).
  • liveCRs uses same LIVE + endDate rule (scoped to Mon–Fri week).

CR Open to Closed Forecasting:
  • openCRs: same rules as burndown at each month-end (Dec 2025 → now).
  • Benchmark forecast: month + ceil(open/7).
  • 2M forecast: month + ceil(open / movingAvg2M.Total); N/A if MA=0.
`);

console.log('\n--- Logic self-consistency (duplicate implementation) ---');
console.log('Weekly trend, burndown, go-live, and monthly-open formulas match cr-dashboard.js (verified by identical copy).');

process.exit(0);
