/* ═══════════════════════════════════════════════════════════
   WhatsMyEMI — js/strategies.js
   Strategy definitions, multi-select activation,
   combined schedule computation
═══════════════════════════════════════════════════════════ */

'use strict';

/* ─── Mutual Fund Catalogue ─── */
const MUTUAL_FUNDS = {
  'hdfc-multicap': {
    name: 'HDFC Multi Cap Fund — Direct Growth',
    shortName: 'HDFC Multi Cap',
    url: 'https://www.hdfcfund.com/our-products/equity/hdfc-multi-cap-fund',
    historicalCAGR: 16,
    riskLevel: 'Moderate-High',
    category: 'Multi Cap'
  },
  'icici-bluechip': {
    name: 'ICICI Prudential Bluechip Fund — Direct Growth',
    shortName: 'ICICI Pru Bluechip',
    url: 'https://www.icicipruamc.com/mutual-fund/equity-funds/icici-prudential-bluechip-fund',
    historicalCAGR: 14,
    riskLevel: 'Moderate',
    category: 'Large Cap'
  },
  'axis-smallcap': {
    name: 'Axis Small Cap Fund — Direct Growth',
    shortName: 'Axis Small Cap',
    url: 'https://www.axismf.com/mutual-fund/equity/axis-small-cap-fund',
    historicalCAGR: 20,
    riskLevel: 'High',
    category: 'Small Cap'
  },
  'parag-flexi': {
    name: 'Parag Parikh Flexi Cap Fund — Direct Growth',
    shortName: 'Parag Parikh Flexi Cap',
    url: 'https://amc.ppfas.com/schemes/parag-parikh-flexi-cap-fund/',
    historicalCAGR: 18,
    riskLevel: 'Moderate',
    category: 'Flexi Cap'
  },
  'mirae-largecap': {
    name: 'Mirae Asset Large Cap Fund — Direct Growth',
    shortName: 'Mirae Asset Large Cap',
    url: 'https://www.miraeassetmf.co.in/investor/scheme-details/mirae-asset-large-cap-fund',
    historicalCAGR: 14.5,
    riskLevel: 'Moderate',
    category: 'Large Cap'
  }
};

/* ─── Active strategies set ─── */
const activeStrategies = new Set();

/* ─── Toggle a strategy on/off ─── */
function toggleStrategy(id) {
  if (!window.APP || !window.APP.isCalculated()) {
    alert('Please calculate your loan first.');
    return;
  }

  const card = document.getElementById('card-' + id);

  if (activeStrategies.has(id)) {
    activeStrategies.delete(id);
    card.classList.remove('active');
    card.setAttribute('aria-pressed', 'false');
    document.getElementById('res-' + id).classList.remove('visible');
  } else {
    activeStrategies.add(id);
    card.classList.add('active');
    card.setAttribute('aria-pressed', 'true');
  }

  recalcAll();
}

/* ─── Re-run when user changes an input inside a card ─── */
function onStrategyInput(id) {
  if (activeStrategies.has(id)) {
    recalcAll();
  }
}

/* ─── Build the combined extras map for future months ─── */
function buildCombinedExtras(baseEMI, targetYearsInput) {
  const extras = {}; // { futureMonthIndex: amount }

  // S1 — Extra EMI every year
  if (activeStrategies.has('s1')) {
    const count = parseFloat(document.getElementById('s1-count').value) || 1;
    const maxFuture = window.APP.state.remainingMonths * 2;
    for (let m = 12; m <= maxFuture; m += 12) {
      extras[m] = (extras[m] || 0) + baseEMI * count;
    }
  }

  // S3 — Quarterly Boost (0.5 EMI every 3 months)
  if (activeStrategies.has('s3')) {
    const maxFuture = window.APP.state.remainingMonths * 2;
    for (let m = 3; m <= maxFuture; m += 3) {
      extras[m] = (extras[m] || 0) + baseEMI * 0.5;
    }
  }

  // S4 — Bi-Annual Boost (1 EMI every 6 months)
  if (activeStrategies.has('s4')) {
    const maxFuture = window.APP.state.remainingMonths * 2;
    for (let m = 6; m <= maxFuture; m += 6) {
      extras[m] = (extras[m] || 0) + baseEMI;
    }
  }

  // S5 — Target Tenure lumpsum (annual)
  if (activeStrategies.has('s5')) {
    const targetYrs = parseInt(document.getElementById('s5-target').value) || 10;
    const lumpsum = calcTargetLumpsum(targetYrs);
    const maxFuture = window.APP.state.remainingMonths * 2;
    for (let m = 12; m <= maxFuture; m += 12) {
      extras[m] = (extras[m] || 0) + lumpsum;
    }
    // Store for display
    window._s5Lumpsum = lumpsum;
  }

  return extras;
}

/* ─── Main recalc: runs combined schedule, updates all cards + banner ─── */
function recalcAll() {
  const s = window.APP.state;
  if (!s || !s.principal) return;

  const hikePercent = activeStrategies.has('s2')
    ? (parseFloat(document.getElementById('s2-hike').value) || 5)
    : 0;

  const combinedExtras = buildCombinedExtras(s.emi, null);

  // Build combined schedule
  const combined = buildSchedule({
    principal: s.principal,
    annualRate: s.rate,
    totalMonths: s.totalMonths,
    startDate: s.startDate,
    today: s.today,
    futureExtras: combinedExtras,
    hikePercent: hikePercent
  });

  // Store combined result for global renderTable() hook
  window._combinedResult = combined;

  // ── Update individual card stats ──
  updateIndividualCards(s, hikePercent);

  // ── Update combined banner (show when 2+ non-SIP strategies active) ──
  const savedInterest = s.baseInterest - combined.totalInterest;
  const monthsSaved   = s.totalMonths - combined.months;
  const nonSIPActive  = [...activeStrategies].filter(id => id !== 's6').length;
  const banner = document.getElementById('combinedBanner');

  if (nonSIPActive >= 2) {
    banner.style.display = 'flex';
    document.getElementById('cb-saved').textContent  = fmt(Math.max(0, savedInterest));
    document.getElementById('cb-time').textContent   = fmtMonths(Math.max(0, monthsSaved));
    document.getElementById('cb-tenure').textContent = fmtMonths(combined.months - combined.pastMonths);
  } else {
    banner.style.display = 'none';
  }

  // ── Update SIP card ──
  if (activeStrategies.has('s6')) {
    updateSIPCard(s);
  }

  // ── Render table immediately ──
  window.TABLE.renderTable(combined.schedule, s.startDate, combined.pastMonths);
}

/* ─── Update each active card's individual stats ─── */
function updateIndividualCards(s, hikePercent) {
  const strategies = ['s1', 's2', 's3', 's4', 's5'];

  // Canonical params for buildSchedule — always use explicit keys, never spread s directly
  // because s uses 'rate' while buildSchedule expects 'annualRate'
  const baseParams = {
    principal:   s.principal,
    annualRate:  s.rate,
    totalMonths: s.totalMonths,
    startDate:   s.startDate,
    today:       s.today
  };

  strategies.forEach(id => {
    if (!activeStrategies.has(id)) return;

    let result;
    const maxFuture = s.remainingMonths * 2;

    if (id === 's1') {
      const count = parseFloat(document.getElementById('s1-count').value) || 1;
      const extras = {};
      for (let m = 12; m <= maxFuture; m += 12) extras[m] = s.emi * count;
      result = buildSchedule({ ...baseParams, futureExtras: extras, hikePercent: 0 });

    } else if (id === 's2') {
      result = buildSchedule({ ...baseParams, futureExtras: {}, hikePercent });

    } else if (id === 's3') {
      const extras = {};
      for (let m = 3; m <= maxFuture; m += 3) extras[m] = s.emi * 0.5;
      result = buildSchedule({ ...baseParams, futureExtras: extras, hikePercent: 0 });

    } else if (id === 's4') {
      const extras = {};
      for (let m = 6; m <= maxFuture; m += 6) extras[m] = s.emi;
      result = buildSchedule({ ...baseParams, futureExtras: extras, hikePercent: 0 });

    } else if (id === 's5') {
      const lumpsum = window._s5Lumpsum || 0;
      const extras = {};
      for (let m = 12; m <= maxFuture; m += 12) extras[m] = lumpsum;
      result = buildSchedule({ ...baseParams, futureExtras: extras, hikePercent: 0 });
      document.getElementById('s5-lumpsum').textContent = fmt(lumpsum);
    }

    if (!result) return;

    // Compare against the base (no-strategy) interest for this loan
    const savedI = s.baseInterest - result.totalInterest;
    // Compare total months (past + future) to get correct time saved
    const savedM = s.totalMonths - result.months;

    document.getElementById(id + '-saved').textContent = fmt(Math.max(0, savedI));
    document.getElementById(id + '-time').textContent  = fmtMonths(Math.max(0, savedM));

    if (id !== 's5') {
      // Show only remaining (future) tenure, not past months
      document.getElementById(id + '-new-tenure').textContent = fmtMonths(result.months - result.pastMonths);
    } else {
      document.getElementById('s5-time').textContent = fmtMonths(Math.max(0, savedM));
    }

    document.getElementById('res-' + id).classList.add('visible');
  });
}

/* ─── Target Tenure: binary search for annual lumpsum ─── */
/*function calcTargetLumpsum(targetYears) {
  const s = window.APP.state;
  const targetFutureMonths = targetYears * 12;
  if (targetFutureMonths >= s.remainingMonths) return 0;

  let lo = 0, hi = s.principal, best = 0;

  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const extras = {};
    for (let m = 12; m <= s.remainingMonths * 2; m += 12) extras[m] = mid;
    const res = buildSchedule({ ...s, futureExtras: extras, hikePercent: 0 });
    const futureMonths = res.months - res.pastMonths;
    if (futureMonths <= targetFutureMonths) { hi = mid; best = mid; }
    else lo = mid;
  }
  return best;
} */

function calcTargetLumpsum(targetYears) {
  const s = window.APP.state;
  const targetFutureMonths = targetYears * 12;

  if (targetFutureMonths >= s.remainingMonths) return 0;

  // FIX: Never spread `s` — s.rate arrives as key 'rate' but buildSchedule
  // destructures 'annualRate'. Spreading s means annualRate = undefined → NaN
  // → binary search never converges → best stays 0.
  const baseParams = {
    principal:   s.principal,
    annualRate:  s.rate,        // ← THE FIX
    totalMonths: s.totalMonths,
    startDate:   s.startDate,
    today:       s.today,
    hikePercent: 0
  };

  const maxFuture = s.remainingMonths * 2;
  let lo = 0, hi = s.principal, best = 0;

  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const extras = {};
    for (let m = 12; m <= maxFuture; m += 12) extras[m] = mid;
    const res = buildSchedule({ ...baseParams, futureExtras: extras });
    const futureMonths = res.months - res.pastMonths;
    if (futureMonths <= targetFutureMonths) { best = mid; hi = mid; }
    else lo = mid;
  }
  return best;
}

/* ─── SIP Card calculation ─── */
function updateSIPCard(s) {
  const cagr = parseFloat(document.getElementById('s6-cagr').value) || 16;
  const fundKey = document.getElementById('s6-fund').value;
  const fund = MUTUAL_FUNDS[fundKey] || MUTUAL_FUNDS['hdfc-multicap'];

  const n = s.remainingMonths;         // SIP tenure = remaining loan tenure
  const mr = cagr / 12 / 100;
  const totalInterest = s.baseInterest;   // We want SIP to cover entire loan interest

  // SIP needed so that FV = totalInterest
  // FV = SIP * [(1+r)^n - 1]/r * (1+r)
  const fvFactor = ((Math.pow(1 + mr, n) - 1) / mr) * (1 + mr);
  const sipAmount = totalInterest / fvFactor;
  const totalInvested = sipAmount * n;
  const totalReturns = fvFactor * sipAmount; // should equal totalInterest
  const surplus = totalReturns - totalInterest;
  const profit = totalReturns - totalInvested;

  // Update fund info
  document.getElementById('s6-fund-name').textContent = fund.name;
  document.getElementById('s6-fund-link').href = fund.url;
  document.getElementById('s6-fund-link').textContent = 'View Fund on AMC Website ↗';

  // Update metrics
  document.getElementById('s6-sip-amount').textContent = fmt(sipAmount) + '/mo';
  document.getElementById('s6-sip-tenure').textContent = fmtMonths(n);
  document.getElementById('s6-sip-invested').textContent = fmt(totalInvested);
  document.getElementById('s6-sip-returns').textContent = fmt(totalReturns);
  document.getElementById('s6-interest-paid').textContent = fmt(totalInterest);
  document.getElementById('s6-surplus').textContent = fmt(Math.max(0, surplus));

  // Verdict
  const tenureYrs = Math.round(n / 12);
  document.getElementById('s6-verdict').innerHTML =
    `<strong>Invest ${fmt(sipAmount)}/month</strong> in ${fund.shortName} (${fund.category}) targeting ~${cagr}% CAGR for <strong>${tenureYrs} years</strong>.<br>` +
    `Total loan interest: <span class="neg">${fmt(totalInterest)}</span> &nbsp;·&nbsp; ` +
    `SIP returns: <span class="pos">${fmt(totalReturns)}</span><br>` +
    `<strong>Net profit after covering interest:</strong> <span class="pos">${fmt(profit)}</span><br>` +
    `<em style="font-size:0.72rem;color:var(--muted)">Risk: ${fund.riskLevel} · Category: ${fund.category}</em>`;

  document.getElementById('res-s6').classList.add('visible');
}

/* ─── Reset all strategies ─── */
function resetStrategies() {
  activeStrategies.clear();
  document.querySelectorAll('.strategy-card').forEach(c => {
    c.classList.remove('active');
    c.setAttribute('aria-pressed', 'false');
  });
  document.querySelectorAll('.card-result, .sip-result-box').forEach(r => r.classList.remove('visible'));
  document.getElementById('combinedBanner').style.display = 'none';
  window._combinedResult = null;
  window._s5Lumpsum = 0;
}
