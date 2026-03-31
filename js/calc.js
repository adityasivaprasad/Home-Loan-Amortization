/* ═══════════════════════════════════════════════════════════
   WhatsMyEMI — js/calc.js
   Core financial calculation engine
   - EMI formula
   - Schedule builder (with past/future split)
   - Combined multi-strategy schedule
═══════════════════════════════════════════════════════════ */

'use strict';

/**
 * Calculate standard monthly EMI
 * @param {number} P - Principal
 * @param {number} annualRate - Annual interest rate (%)
 * @param {number} n - Total months
 * @returns {number}
 */
function calcEMI(P, annualRate, n) {
  if (annualRate === 0) return P / n;
  const mr = annualRate / 12 / 100;
  return P * mr * Math.pow(1 + mr, n) / (Math.pow(1 + mr, n) - 1);
}

/**
 * Build amortization schedule with optional per-month extra payments.
 * Handles past months (no extra) and future months (extra applied).
 *
 * @param {object} params
 * @param {number}   params.principal
 * @param {number}   params.annualRate
 * @param {number}   params.totalMonths       - original loan tenure months
 * @param {Date}     params.startDate         - loan origination date
 * @param {Date}     params.today             - current date
 * @param {object}   params.futureExtras      - { [futureMonthIndex]: extraAmount }
 *                                              futureMonthIndex = months elapsed from today (1-based)
 * @param {number}   params.hikePercent       - annual EMI hike % (0 = none)
 * @returns {object} { schedule, totalInterest, totalPayment, months, pastMonths, futureMonths }
 */
function buildSchedule({ principal, annualRate, totalMonths, startDate, today, futureExtras = {}, hikePercent = 0 }) {
  const mr = annualRate / 12 / 100;
  const baseEMI = calcEMI(principal, annualRate, totalMonths);

  // How many months have already elapsed from start to today?
  const elapsed = monthsBetween(startDate, today);
  const pastMonths = Math.max(0, Math.min(elapsed, totalMonths));

  // ------- Phase 1: Replay past months at STANDARD plan -------
  let balance = principal;
  const schedule = [];
  let totalInterest = 0;
  let currentEMI = baseEMI;
  let hikeYearCounter = 0;

  for (let m = 1; m <= pastMonths && balance > 0.5; m++) {
    // Apply annual hike at year boundaries (hike applies from future start, not past)
    const interest = balance * mr;
    const principal_paid = Math.min(currentEMI - interest, balance);
    balance = Math.max(0, balance - principal_paid);
    totalInterest += interest;

    schedule.push({
      seq: m,                     // sequence number from loan start
      isPast: true,
      isToday: false,
      extra: 0,
      emi: currentEMI,
      totalPaid: currentEMI,     // EMI + extra (no extra in past)
      principalPaid: principal_paid,
      interest: interest,
      openingBalance: balance + principal_paid,
      closingBalance: balance
    });
  }

  // ------- Phase 2: Future months with strategy extras -------
  // EMI hike resets at start of future period
  currentEMI = baseEMI;
  hikeYearCounter = 0;
  let futureMonthCount = 0;

  while (balance > 0.5 && schedule.length < totalMonths * 3) {
    futureMonthCount++;
    const seq = pastMonths + futureMonthCount;

    // Apply annual EMI hike at start of each future year
    if (hikePercent > 0 && futureMonthCount > 1 && (futureMonthCount - 1) % 12 === 0) {
      hikeYearCounter++;
      currentEMI = baseEMI * Math.pow(1 + hikePercent / 100, hikeYearCounter);
    }

    const interest = balance * mr;
    let extra = futureExtras[futureMonthCount] || 0;
    let principalFromEMI = Math.min(currentEMI - interest, balance);
    
    // Clamp to remaining balance
    if (principalFromEMI + extra >= balance) {
      extra = Math.max(0, balance - principalFromEMI);
      principalFromEMI = balance - extra;
      if (principalFromEMI < 0) { principalFromEMI = balance; extra = 0; }
    }

    const totalPaid = currentEMI + extra;
    balance = Math.max(0, balance - principalFromEMI - extra);
    totalInterest += interest;

    schedule.push({
      seq: seq,
      isPast: false,
      isToday: futureMonthCount === 1 && pastMonths > 0,
      extra: extra,
      emi: currentEMI,
      totalPaid: totalPaid,
      principalPaid: principalFromEMI,
      interest: interest,
      openingBalance: balance + principalFromEMI + extra,
      closingBalance: balance
    });

    if (balance <= 0.01) break;
  }

  return {
    schedule,
    totalInterest,
    totalPayment: principal + totalInterest,
    months: schedule.length,
    pastMonths,
    futureMonths: schedule.length - pastMonths
  };
}

/**
 * Count calendar months between two dates (floor)
 */
function monthsBetween(d1, d2) {
  const start = new Date(d1);
  const end = new Date(d2);
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
}

/**
 * Format Indian currency (₹ with L/Cr suffix)
 */
function fmt(n) {
  n = Math.round(n);
  if (n >= 1e7) return '₹' + (n / 1e7).toFixed(2) + ' Cr';
  if (n >= 1e5) return '₹' + (n / 1e5).toFixed(2) + ' L';
  return '₹' + n.toLocaleString('en-IN');
}

/**
 * Format months as "X yr Y mo"
 */
function fmtMonths(m) {
  m = Math.round(m);
  const y = Math.floor(m / 12);
  const mo = m % 12;
  if (y === 0) return mo + ' mo';
  if (mo === 0) return y + ' yr';
  return `${y} yr ${mo} mo`;
}

/**
 * Format a date as "Jan 2026"
 */
function fmtDate(baseDate, offsetMonths) {
  const d = new Date(baseDate);
  d.setDate(1);
  d.setMonth(d.getMonth() + offsetMonths);
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}
