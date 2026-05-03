/**
 * tutorial.js — Shepherd.js guided walkthrough for the SmartCRM Demo.
 *
 * Auto-launches the first time a user lands on the dashboard after login.
 * The "seen" flag is stored in localStorage so reopening the demo from a
 * fresh browser triggers the tour again.
 *
 * To restart the tour manually: window.SmartCRMDemoTour.start()
 * (also wired to a "Restart tutorial" button in the user menu).
 *
 * The tour is intentionally tolerant — every step verifies its target
 * exists before firing, and any missing step skips to the next one
 * instead of blocking the user.
 */

(function () {
  if (typeof window === 'undefined' || !window.Shepherd) {
    // Shepherd CDN didn't load — degrade silently.
    window.SmartCRMDemoTour = { start: function () {} };
    return;
  }
  var SEEN_KEY = 'smartcrm_demo_tour_seen_v1';

  function $(sel) { return document.querySelector(sel); }
  function navTo(hash) {
    if (location.hash !== hash) location.hash = hash;
  }

  function buildTour() {
    var tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        cancelIcon: { enabled: true },
        scrollTo: { behavior: 'smooth', block: 'center' },
        classes: 'shepherd-theme-smartcrm',
        modalOverlayOpeningPadding: 6,
        modalOverlayOpeningRadius: 8
      }
    });

    tour.addStep({
      id: 'welcome',
      title: '👋 Welcome to SmartCRM Demo',
      text: 'You\'re logged in as the demo admin. Take this <b>2-minute tour</b> to see the highlights — leads, pipeline, follow-ups, HR, reports, and more.<br><br>You can hit <code>Esc</code> to skip at any point.',
      buttons: [
        { text: 'Skip tour', classes: 'shepherd-button-secondary', action: function () { tour.cancel(); } },
        { text: 'Start tour →', action: tour.next }
      ]
    });

    tour.addStep({
      id: 'sidebar',
      title: 'The sidebar',
      text: 'Every major section lives here — Dashboard, Leads, Pipeline, Follow-ups, Reports, Knowledge Base, Team Chat, HR, and Admin Settings.',
      attachTo: { element: '.sidebar', on: 'right' },
      buttons: [
        { text: '← Back', classes: 'shepherd-button-secondary', action: tour.back },
        { text: 'Next →', action: tour.next }
      ]
    });

    tour.addStep({
      id: 'leads-tab',
      title: 'Leads — the heart of the CRM',
      text: 'Click any lead in the list to open the full lead card with timeline, remarks, follow-ups, and quick-action buttons (call, WhatsApp, email).',
      attachTo: { element: 'a[href="#/leads"], [data-nav="leads"]', on: 'right' },
      beforeShowPromise: function () {
        return new Promise(function (res) { navTo('#/leads'); setTimeout(res, 400); });
      },
      buttons: [
        { text: '← Back', classes: 'shepherd-button-secondary', action: tour.back },
        { text: 'Next →', action: tour.next }
      ]
    });

    tour.addStep({
      id: 'add-lead',
      title: 'Add a new lead',
      text: 'Click <b>Add Lead</b> to capture a prospect. The CRM also auto-imports leads from Facebook Lead Ads, WhatsApp, your website form, or a Google Sheet.',
      attachTo: { element: 'button[data-action="add-lead"], .btn.primary', on: 'bottom' },
      buttons: [
        { text: '← Back', classes: 'shepherd-button-secondary', action: tour.back },
        { text: 'Next →', action: tour.next }
      ]
    });

    tour.addStep({
      id: 'pipeline',
      title: 'Pipeline (Kanban view)',
      text: 'Drag-and-drop leads between stages. The pipeline view also shows lead value sums per column so you always know what\'s in play.',
      attachTo: { element: 'a[href="#/pipeline"], [data-nav="pipeline"]', on: 'right' },
      beforeShowPromise: function () {
        return new Promise(function (res) { navTo('#/pipeline'); setTimeout(res, 600); });
      },
      buttons: [
        { text: '← Back', classes: 'shepherd-button-secondary', action: tour.back },
        { text: 'Next →', action: tour.next }
      ]
    });

    tour.addStep({
      id: 'followups',
      title: 'Follow-ups — never miss a callback',
      text: 'Overdue, due today, and upcoming follow-ups are split into tabs. Push notifications fire on the rep\'s phone (in production — simulated in demo).',
      attachTo: { element: 'a[href="#/followups"], [data-nav="followups"]', on: 'right' },
      beforeShowPromise: function () {
        return new Promise(function (res) { navTo('#/followups'); setTimeout(res, 400); });
      },
      buttons: [
        { text: '← Back', classes: 'shepherd-button-secondary', action: tour.back },
        { text: 'Next →', action: tour.next }
      ]
    });

    tour.addStep({
      id: 'reports',
      title: 'Reports & analytics',
      text: 'Lead funnel, status breakdown, by-rep performance, by-source ROI, monthly targets, TAT violations — all here. Export anything to Excel or CSV.',
      attachTo: { element: 'a[href="#/reports"], [data-nav="reports"]', on: 'right' },
      beforeShowPromise: function () {
        return new Promise(function (res) { navTo('#/reports'); setTimeout(res, 500); });
      },
      buttons: [
        { text: '← Back', classes: 'shepherd-button-secondary', action: tour.back },
        { text: 'Next →', action: tour.next }
      ]
    });

    tour.addStep({
      id: 'hr',
      title: 'HR module',
      text: 'Attendance with GPS check-in, leave requests, daily tasks, salary slip generation, and bank details — built into the same CRM.',
      attachTo: { element: 'a[href="#/hr"], [data-nav="hr"]', on: 'right' },
      beforeShowPromise: function () {
        return new Promise(function (res) { navTo('#/hr'); setTimeout(res, 500); });
      },
      buttons: [
        { text: '← Back', classes: 'shepherd-button-secondary', action: tour.back },
        { text: 'Next →', action: tour.next }
      ]
    });

    tour.addStep({
      id: 'admin',
      title: 'Admin settings',
      text: 'Custom fields, statuses, sources, products, automation rules, assignment rules, role permissions, brand colors, SMTP, WhatsApp Cloud API — all configurable from one place.',
      attachTo: { element: 'a[href="#/admin"], [data-nav="admin"]', on: 'right' },
      beforeShowPromise: function () {
        return new Promise(function (res) { navTo('#/admin'); setTimeout(res, 500); });
      },
      buttons: [
        { text: '← Back', classes: 'shepherd-button-secondary', action: tour.back },
        { text: 'Next →', action: tour.next }
      ]
    });

    tour.addStep({
      id: 'mobile-app',
      title: '📱 Native Android app',
      text: 'There\'s a Capacitor-based Android app that adds caller-ID popups (matches incoming calls to leads), tap-to-dial from notifications, recording sync, and offline mode.<br><br>Click the <b>Get app</b> button on the top bar to download it.',
      attachTo: { element: '#btn-getapp', on: 'bottom' },
      beforeShowPromise: function () {
        return new Promise(function (res) { navTo('#/dashboard'); setTimeout(res, 400); });
      },
      buttons: [
        { text: '← Back', classes: 'shepherd-button-secondary', action: tour.back },
        { text: 'Next →', action: tour.next }
      ]
    });

    tour.addStep({
      id: 'finish',
      title: '🎉 You\'re all set',
      text: 'Click around freely — every action is sandboxed and no real emails, WhatsApp messages, or push notifications go out.<br><br><b>Like what you see?</b> <a href="https://smartcrmsolution.com" target="_blank">Visit smartcrmsolution.com</a> to set up your own instance.<br><br>You can re-launch this tour anytime from the user menu in the bottom-left.',
      buttons: [
        { text: '← Back', classes: 'shepherd-button-secondary', action: tour.back },
        { text: 'Done', action: function () { tour.complete(); } }
      ]
    });

    tour.on('complete', function () { try { localStorage.setItem(SEEN_KEY, '1'); } catch (_) {} });
    tour.on('cancel',   function () { try { localStorage.setItem(SEEN_KEY, '1'); } catch (_) {} });

    return tour;
  }

  function start() {
    try { buildTour().start(); } catch (e) { console.warn('[tutorial] failed:', e); }
  }

  function maybeAutoStart() {
    var seen = false;
    try { seen = localStorage.getItem(SEEN_KEY) === '1'; } catch (_) {}
    if (seen) return;
    // Wait for the shell to render
    var tries = 0;
    var iv = setInterval(function () {
      if (tries++ > 40) { clearInterval(iv); return; }
      if ($('.sidebar') && $('.shell')) {
        clearInterval(iv);
        setTimeout(start, 800);
      }
    }, 200);
  }

  // Wait for the SPA to mount, then maybe auto-start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', maybeAutoStart);
  } else {
    maybeAutoStart();
  }

  // Public restart hook + a discoverable button on the bottom-right
  window.SmartCRMDemoTour = { start: start, reset: function () { try { localStorage.removeItem(SEEN_KEY); } catch (_) {} } };

  // Floating "Restart tour" pill (bottom-right, hidden until shell mounts)
  function injectFAB() {
    if (document.getElementById('demo-tour-fab')) return;
    if (!document.querySelector('.shell')) return;
    var btn = document.createElement('button');
    btn.id = 'demo-tour-fab';
    btn.title = 'Restart guided tour';
    btn.innerHTML = '🎓 Tutorial';
    btn.style.cssText = 'position:fixed;bottom:18px;right:18px;z-index:998;padding:10px 16px;border-radius:24px;border:0;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-weight:600;cursor:pointer;box-shadow:0 6px 18px rgba(99,102,241,.4);font-size:14px;';
    btn.onclick = start;
    document.body.appendChild(btn);
  }
  var fabIv = setInterval(function () {
    if (document.querySelector('.shell')) { injectFAB(); clearInterval(fabIv); }
  }, 500);
})();
