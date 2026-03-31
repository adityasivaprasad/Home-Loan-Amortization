/* ═══════════════════════════════════════════════════════════
   WhatsMyEMI — js/app.js
   Main application controller
   - Reads inputs, maintains state
   - Calls calc, strategies, table modules
   - Handles calculate() and resetAll() actions
═══════════════════════════════════════════════════════════ */

'use strict';

/* ─── Application State ─── */
window.APP = (() => {

  let state = null;

  function isCalculated() {
    return state !== null && state.principal > 0;
  }

  function getState() { return state; }

  /* ───────────────────────────────────────────────────────
     calculate() — called when user clicks "Calculate & Plan"
  ─────────────────────────────────────────────────────── */
  function calculate() {
    const P        = parseFloat(document.getElementById('loanAmt').value);
    const r        = parseFloat(document.getElementById('rate').value);
    const y        = parseFloat(document.getElementById('tenure').value);
    const sdStr    = document.getElementById('startDate').value;

    if (!P || P <= 0)   { alert('Please enter a valid loan amount.'); return; }
    if (!r || r <= 0)   { alert('Please enter a valid interest rate.'); return; }
    if (!y || y <= 0)   { alert('Please enter a valid tenure.'); return; }
    if (!sdStr)         { alert('Please select a loan start date.'); return; }

    const startDate    = new Date(sdStr);
    const today        = new Date();
    today.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);

    const totalMonths  = Math.round(y * 12);
    const emi          = calcEMI(P, r, totalMonths);

    // Months elapsed from start to today
    const elapsed      = monthsBetween(startDate, today);
    const pastMonths   = Math.max(0, Math.min(elapsed, totalMonths));
    const remainingMonths = totalMonths - pastMonths;

    // Build base (no strategy) schedule — full loan history from start
    const base = buildSchedule({
      principal:    P,
      annualRate:   r,
      totalMonths:  totalMonths,
      startDate:    startDate,
      today:        today,
      futureExtras: {},
      hikePercent:  0
    });

    state = {
      principal:        P,
      rate:             r,
      totalMonths:      totalMonths,
      emi:              emi,
      startDate:        startDate,
      today:            today,
      pastMonths:       pastMonths,
      remainingMonths:  remainingMonths,
      baseSchedule:     base.schedule,
      baseInterest:     base.totalInterest,
      basePayment:      base.totalPayment,
      // Shortcut for buildSchedule calls in strategy engine
      // (these remain constant; strategy engine overrides futureExtras/hikePercent)
    };

    // Expose to strategy module via APP.state
    window.APP.state = state;

    // ── Update summary pills ──
    document.getElementById('rEMI').textContent      = fmt(emi);
    document.getElementById('rInterest').textContent = fmt(base.totalInterest);
    document.getElementById('rTotal').textContent    = fmt(base.totalPayment);
    document.getElementById('rTenure').textContent   =
      pastMonths > 0
        ? fmtMonths(remainingMonths) + ' remaining'
        : fmtMonths(totalMonths);

    // ── Show sections ──
    document.getElementById('resultsSummary').classList.add('visible');
    document.getElementById('strategiesWrap').style.display = 'block';
    document.getElementById('amortSection').classList.add('visible');

    // ── Reset any active strategies ──
    resetStrategies();
    window._combinedResult = null;

    // ── Render base table ──
    TABLE.renderTable(base.schedule, startDate, pastMonths);

    // ── Scroll to results ──
    setTimeout(() => {
      document.getElementById('resultsSummary').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  /* ─── Reset everything ─── */
  function resetAll() {
    state = null;
    window.APP.state = null;

    document.getElementById('resultsSummary').classList.remove('visible');
    document.getElementById('strategiesWrap').style.display = 'none';
    document.getElementById('amortSection').classList.remove('visible');
    document.getElementById('amortBody').innerHTML = '';
    document.getElementById('combinedBanner').style.display = 'none';
    document.getElementById('pastNotice').style.display = 'none';

    resetStrategies();
    window._combinedResult = null;
  }

  return { isCalculated, getState, calculate, resetAll };
})();

/* ─── Wire global functions expected by HTML onclick ─── */
function calculate() { window.APP.calculate(); }
function resetAll()  { window.APP.resetAll(); }

/* ─── Initialisation ─── */
window.addEventListener('DOMContentLoaded', () => {
  // Default to today's date
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm   = String(today.getMonth() + 1).padStart(2, '0');
  const dd   = String(today.getDate()).padStart(2, '0');
  document.getElementById('startDate').value = `${yyyy}-${mm}-${dd}`;

  // Keyboard accessibility for strategy cards
  document.querySelectorAll('.strategy-card').forEach(card => {
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });

  // Auto-calculate on load with default values
  setTimeout(() => window.APP.calculate(), 400);
});
