/* ═══════════════════════════════════════════════════════════
   WhatsMyEMI — js/share.js
   Social sharing functions for WhatsApp, Telegram, X, Instagram
═══════════════════════════════════════════════════════════ */

'use strict';

const SHARE_URL = 'https://whatsmyemi.com';

const SHARE_TEXT = [
  '🏦 Just discovered a FREE tool that helped me see how to save LAKHS on my home loan interest!',
  'It uses smart strategies like extra EMI, SIP investing & more.',
  'Try it FREE → ' + SHARE_URL
].join(' ');

function shareWA() {
  const url = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(SHARE_TEXT);
  window.open(url, '_blank', 'noopener,noreferrer');
}

function shareTG() {
  const text = 'Save lakhs on your loan interest with this FREE smart EMI calculator!';
  const url = `https://t.me/share/url?url=${encodeURIComponent(SHARE_URL)}&text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function shareTW() {
  const tweet = [
    'Just found this FREE loan optimizer for Indian borrowers.',
    'It shows you exactly how to save lakhs in interest using smart strategies.',
    'Try it → ' + SHARE_URL,
    '#PersonalFinance #HomeLoan #EMI #MutualFunds #India'
  ].join(' ');
  const url = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(tweet);
  window.open(url, '_blank', 'noopener,noreferrer');
}

function shareIG() {
  const copyText = 'Check out this free loan optimizer — it saved me lakhs! → ' + SHARE_URL;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(copyText).then(() => {
      showToast('Link copied! Open Instagram and paste in your bio or story.');
    }).catch(() => {
      prompt('Copy this link and share on Instagram:', copyText);
    });
  } else {
    prompt('Copy this link and share on Instagram:', copyText);
  }
}

/* ─── Toast notification ─── */
function showToast(msg) {
  const existing = document.getElementById('wme-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'wme-toast';
  toast.textContent = msg;
  toast.style.cssText = `
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    background: #1a2235;
    color: #e8eaf0;
    border: 1px solid rgba(0,212,170,0.3);
    border-radius: 10px;
    padding: 12px 22px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.85rem;
    z-index: 9999;
    box-shadow: 0 8px 28px rgba(0,0,0,0.5);
    animation: fadeUp 0.3s ease both;
    max-width: 320px;
    text-align: center;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}
