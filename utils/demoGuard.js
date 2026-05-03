/**
 * demoGuard.js
 *
 * Single decision point for "is this a demo deployment?". When DEMO_MODE=1
 * is set in the environment, every outbound integration is short-circuited
 * to a successful no-op so prospects can click freely without sending real
 * messages, posting to real WhatsApp numbers, or hitting Meta APIs.
 *
 * Anything that costs money, sends mail, or could spam a real user MUST
 * call demoGuard.simulate() before doing real work.
 *
 * Pattern:
 *   const demo = require('./demoGuard');
 *   if (demo.on) return demo.simulate('email', { to, subject });
 *   // ... real send ...
 */

const ON = String(process.env.DEMO_MODE || '0') === '1';

// Lightweight in-memory log so the admin UI's `/api { fn:'admin_demo_log' }`
// can show prospects what would have been sent. Capped at 500 entries.
const log = [];
function _push(channel, payload) {
  log.push({
    ts: new Date().toISOString(),
    channel,
    payload: _safe(payload)
  });
  if (log.length > 500) log.splice(0, log.length - 500);
}
function _safe(v) {
  try {
    const s = JSON.stringify(v);
    return s.length > 4000 ? s.slice(0, 4000) + '…(truncated)' : JSON.parse(s);
  } catch (_) { return String(v); }
}

function simulate(channel, payload, returnShape) {
  _push(channel, payload);
  // Most send-functions across the codebase return { ok: true } on success
  // or a provider-specific object. Default to { ok: true, demo: true } and
  // let the caller pass returnShape when it expects something richer.
  const base = { ok: true, demo: true, channel };
  if (returnShape && typeof returnShape === 'object') return Object.assign(base, returnShape);
  return base;
}

function recent(limit) {
  const n = Math.max(1, Math.min(500, Number(limit) || 100));
  return log.slice(-n).reverse();
}

module.exports = {
  on: ON,
  simulate,
  recent,
  // For places that want a quick guard without a return value:
  blockedReason: ON ? 'demo-mode' : null
};
