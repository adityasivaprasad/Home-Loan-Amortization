/* ═══════════════════════════════════════════════════════════
   WhatsMyEMI — js/table.js
   Amortization table rendering
   - Differentiates past vs future rows
   - Shows today's boundary
   - Displays total EMI paid (EMI + extra) in EMI column
═══════════════════════════════════════════════════════════ */

'use strict';

const TABLE = (() => {

  /**
   * Render the amortization table.
   * @param {Array}  schedule   - array of row objects from buildSchedule
   * @param {Date}   startDate  - loan start date
   * @param {number} pastCount  - how many rows are "past" (before today)
   */
  function renderTable(schedule, startDate, pastCount) {
    if (!schedule || schedule.length === 0) return;

    const limit = parseInt(document.getElementById('showRows').value) || 24;
    const body = document.getElementById('amortBody');
    const rows = schedule.slice(0, limit);
    let html = '';

    rows.forEach((row, i) => {
      const dateStr = fmtDate(startDate, row.seq - 1);
      let rowClass = '';
      let rowLabel = '';

      if (row.isPast) {
        rowClass = 'row-past';
      } else if (row.isToday) {
        rowClass = 'row-today';
        rowLabel = ' ← Today';
      } else if (row.extra > 0) {
        rowClass = 'row-strategy';
      }

      const extraCell = row.extra > 0
        ? `<td class="extra-amt">+${fmt(row.extra)}</td>`
        : `<td style="color:var(--muted)">—</td>`;

      // Total EMI paid = standard EMI + extra (what actually leaves the bank account)
      const totalEMI = row.emi + row.extra;

      html += `<tr class="${rowClass}">
        <td>${row.seq}${rowLabel}</td>
        <td>${dateStr}</td>
        <td>${fmt(row.openingBalance)}</td>
        <td class="total-emi">${fmt(totalEMI)}</td>
        <td>${fmt(row.principalPaid)}</td>
        <td>${fmt(row.interest)}</td>
        ${extraCell}
        <td>${fmt(row.closingBalance)}</td>
      </tr>`;
    });

    if (schedule.length > limit) {
      html += `<tr>
        <td colspan="8" style="text-align:center;color:var(--muted);padding:16px;font-size:0.78rem">
          … ${schedule.length - limit} more rows. Increase "Show rows" to see all.
        </td>
      </tr>`;
    }

    body.innerHTML = html;

    // Update past notice visibility
    const pastNotice = document.getElementById('pastNotice');
    const scheduleNote = document.getElementById('scheduleNote');
    if (pastCount > 0) {
      pastNotice.style.display = 'inline';
      scheduleNote.style.display = 'none';
    } else {
      pastNotice.style.display = 'none';
      scheduleNote.style.display = 'inline';
    }
  }

  return { renderTable };
})();

// Expose on window so strategies.js can call TABLE.renderTable directly (Bug 2 fix)
window.TABLE = TABLE;

// Global renderTable hook (called from table controls)
function renderTable() {
  if (window._combinedResult) {
    const s = window.APP && window.APP.state;
    TABLE.renderTable(window._combinedResult.schedule, s.startDate, window._combinedResult.pastMonths);
  } else if (window.APP && window.APP.state && window.APP.state.baseSchedule) {
    const s = window.APP.state;
    TABLE.renderTable(s.baseSchedule, s.startDate, s.pastMonths);
  }
}
