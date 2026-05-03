/**
 * tutorial.js — Comprehensive Shepherd.js guided walkthrough for the
 * SmartCRM Demo. Covers every major feature so prospects can see the
 * platform's full power in 5 minutes.
 *
 * Steps cover: Dashboard → Leads → Pipeline (Kanban) → Add Lead →
 * Follow-ups (overdue/today/upcoming) → Calendar → Reminders →
 * WhatsApp Bot + Templates → Send from API/mobile → Automation Rules →
 * Reports & TAT → Customer Lifecycle → Inventory → Team Chat →
 * Knowledge Base → HR (Attendance/Leaves/Tasks/Salary) → Admin
 * (Settings, Custom Fields, Roles) → Native Android App.
 */

(function () {
  if (typeof window === 'undefined' || !window.Shepherd) {
    window.SmartCRMDemoTour = { start: function () {} };
    return;
  }
  var SEEN_KEY = 'smartcrm_demo_tour_seen_v3';

  function $(sel) { return document.querySelector(sel); }
  function navTo(hash) {
    if (location.hash !== hash) location.hash = hash;
  }
  function waitFor(predicate, timeoutMs) {
    return new Promise(function (resolve) {
      var start = Date.now();
      var iv = setInterval(function () {
        try {
          if (predicate() || (Date.now() - start) > (timeoutMs || 3000)) {
            clearInterval(iv); resolve();
          }
        } catch (_) { clearInterval(iv); resolve(); }
      }, 100);
    });
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

    function buttons(includeBack, finalLabel) {
      var btns = [];
      if (includeBack) {
        btns.push({ text: '← Back', classes: 'shepherd-button-secondary', action: tour.back });
      }
      btns.push({
        text: finalLabel || 'Next →',
        action: finalLabel ? function () { tour.complete(); } : tour.next
      });
      return btns;
    }

    function nav(hash, delay) {
      return function () {
        return new Promise(function (res) { navTo(hash); setTimeout(res, delay || 500); });
      };
    }

    // ---------- intro ----------
    tour.addStep({
      id: 'welcome',
      title: '👋 Welcome to SmartCRM Demo',
      text: 'You\'re logged in as the demo admin. Take this <b>5-minute interactive tour</b> to see every feature of the platform.<br><br>You\'ll see Leads, Pipeline, WhatsApp Bot, Automation, Reports, HR, Customer Lifecycle, Native Android App, and more.<br><br>Hit <code>Esc</code> to skip at any point.',
      buttons: [
        { text: 'Skip tour', classes: 'shepherd-button-secondary', action: function () { tour.cancel(); } },
        { text: 'Start the full tour →', action: tour.next }
      ]
    });

    // ---------- dashboard ----------
    tour.addStep({
      id: 'dashboard-overview',
      title: '📊 Dashboard — your day at a glance',
      text: 'Total leads, new today, won deals, due-today, overdue, charts by status / source / caller — everything an admin needs in one place.<br><br>Tiles drill into the underlying lists when clicked.',
      attachTo: { element: '#view, .dashboard, main', on: 'top' },
      beforeShowPromise: nav('#/dashboard', 600),
      buttons: buttons(true)
    });

    // ---------- sidebar ----------
    tour.addStep({
      id: 'sidebar',
      title: '📍 The sidebar',
      text: 'Every section lives here — Leads, Pipeline, Kanban, Follow-ups, Calendar, Reports, Customers, Inventory, WhatsApp Bot, Knowledge Base, Team Chat, Tasks, Attendance, Leaves, Salary, Users, Admin Settings.',
      attachTo: { element: '.sidebar', on: 'right' },
      buttons: buttons(true)
    });

    // ---------- leads list ----------
    tour.addStep({
      id: 'leads-list',
      title: '🎯 Leads — the heart of the CRM',
      text: 'All your leads in one searchable table. Filter by status, source, assignee, tags, date range. Bulk-edit, bulk-WhatsApp, bulk-export. Click any row to open the full lead card.',
      attachTo: { element: '#view', on: 'top' },
      beforeShowPromise: nav('#/leads', 800),
      buttons: buttons(true)
    });

    tour.addStep({
      id: 'add-lead',
      title: '➕ Add a new lead',
      text: 'Capture name, phone, email, source, assignee, custom fields. Auto-detects duplicate phones across all leads. The CRM also auto-imports leads from Facebook Lead Ads, WhatsApp inbound, your website form, IndiaMART, MagicBricks, 99acres, and Google Sheets.',
      attachTo: { element: '.btn.primary', on: 'bottom' },
      buttons: buttons(true)
    });

    // ---------- pipeline / kanban ----------
    tour.addStep({
      id: 'pipeline',
      title: '🪜 Pipeline view',
      text: 'See every lead by stage. Total deal-value sums per column. Use this for weekly forecasting calls.',
      attachTo: { element: '#view', on: 'top' },
      beforeShowPromise: nav('#/pipeline', 700),
      buttons: buttons(true)
    });

    tour.addStep({
      id: 'kanban',
      title: '📋 Kanban — drag-drop deal stages',
      text: 'Same data, drag-and-drop UI. Move leads between stages with a single drag. Qualified ★ leads, follow-up colour coding, tag filtering, collapsible columns.',
      attachTo: { element: '#view', on: 'top' },
      beforeShowPromise: nav('#/kanban', 700),
      buttons: buttons(true)
    });

    // ---------- follow-ups ----------
    tour.addStep({
      id: 'followups-overdue',
      title: '🔥 Overdue follow-ups',
      text: 'Anything missed yesterday or earlier — these need calls TODAY. Click Resolve to update status + schedule the next follow-up. Status picker built-in for dead-end statuses (Not Picked, Not Interested, Junk).',
      attachTo: { element: '#view', on: 'top' },
      beforeShowPromise: nav('#/followups?tab=overdue', 700),
      buttons: buttons(true)
    });

    tour.addStep({
      id: 'followups-today',
      title: '📞 Due today',
      text: 'Today\'s call list, sorted by time. Tap-to-call straight from the row on mobile.',
      attachTo: { element: '#view', on: 'top' },
      beforeShowPromise: nav('#/followups?tab=today', 600),
      buttons: buttons(true)
    });

    tour.addStep({
      id: 'followups-upcoming',
      title: '📅 Upcoming follow-ups',
      text: 'The next 14 days — plan your week. Reps see only their own; managers see their team\'s; admins see everyone.',
      attachTo: { element: '#view', on: 'top' },
      beforeShowPromise: nav('#/followups?tab=upcoming', 600),
      buttons: buttons(true)
    });

    tour.addStep({
      id: 'reminders',
      title: '🔔 Push reminders — never miss a callback',
      text: 'Every morning at 9 AM each rep gets an email with their day\'s follow-ups.<br><br>Mobile push notifications fire 15 minutes before each scheduled follow-up.<br><br>Auto-dial: when a new lead lands, the assignee gets a "tap to call" notification — open phone, call rings instantly. (Demo simulates these.)',
      buttons: buttons(true)
    });

    // ---------- calendar ----------
    tour.addStep({
      id: 'calendar',
      title: '📆 Calendar view',
      text: 'See follow-ups by date and time. Drag to reschedule. Toggle between week and month views.',
      attachTo: { element: '#view', on: 'top' },
      beforeShowPromise: nav('#/calendar', 700),
      buttons: buttons(true)
    });

    // ---------- monthly target ----------
    tour.addStep({
      id: 'monthly-target',
      title: '🎯 Monthly targets',
      text: 'Set monthly revenue + lead targets per rep. Live achievement %, forecast, funnel velocity, gap analysis. Updates in real time as deals close.',
      attachTo: { element: '#view', on: 'top' },
      beforeShowPromise: nav('#/targets', 700),
      buttons: buttons(true)
    });

    // ---------- whatsapp bot ----------
    tour.addStep({
      id: 'whatsapp-bot',
      title: '💬 WhatsApp Bot',
      text: 'Connect any WhatsApp Business number with one-click "Connect with Facebook" — the platform credentials are baked in, no Meta App ID/Secret needed from clients.',
      attachTo: { element: '#view', on: 'top' },
      beforeShowPromise: nav('#/whatsbot', 700),
      buttons: buttons(true)
    });

    tour.addStep({
      id: 'whatsapp-templates',
      title: '📨 Pre-approved templates',
      text: 'Sync templates from Meta. Run broadcast campaigns. Trigger templates automatically on lead status changes (e.g., "Welcome to Celeste" template sends the moment a lead is marked Qualified).',
      buttons: buttons(true)
    });

    tour.addStep({
      id: 'whatsapp-conversations',
      title: '💭 Live conversations',
      text: 'Threaded chat per contact. Reps reply directly inside the CRM — no switching to WhatsApp. Inbound messages auto-create leads if the number is unknown. Bots auto-reply on keywords (e.g., "BROCHURE" → sends PDF).',
      buttons: buttons(true)
    });

    tour.addStep({
      id: 'send-from-api-mobile',
      title: '🔌 Send via API + mobile',
      text: 'Every action is also available via REST API — POST to <code>/api</code> with <code>{fn:\'api_whatsapp_send_template\', args:[token, phone, template, lang, params]}</code>.<br><br>Mobile reps tap the WhatsApp icon on any lead to open the native app pre-filled.<br><br>Webhooks: incoming WhatsApp lands at <code>/hook/whatsapp_webhook</code> and routes through the multi-tenant forwarder automatically.',
      buttons: buttons(true)
    });

    // ---------- automation ----------
    tour.addStep({
      id: 'automation',
      title: '⚡ Automation rules',
      text: 'Build "if X then Y" workflows visually:<br>• <b>If</b> lead source = Facebook <b>then</b> assign to Priya<br>• <b>If</b> status moves to Site Visit Done <b>then</b> send follow-up template after 24h<br>• <b>If</b> 3 days since last contact <b>then</b> push reminder<br>• <b>If</b> status = Booked <b>then</b> auto-create customer record<br><br>No code. Save unlimited rules.',
      attachTo: { element: '#view', on: 'top' },
      beforeShowPromise: nav('#/automations', 700),
      buttons: buttons(true)
    });

    // ---------- reports + TAT ----------
    tour.addStep({
      id: 'reports',
      title: '📈 Reports — leadership analytics',
      text: 'Lead funnel, status breakdown, by-rep performance, by-source ROI, win-rate, average deal size, conversion velocity. Export anything to Excel/CSV.',
      attachTo: { element: '#view', on: 'top' },
      beforeShowPromise: nav('#/reports', 700),
      buttons: buttons(true)
    });

    tour.addStep({
      id: 'report-builder',
      title: '🛠️ Custom Report Builder',
      text: 'Drag-and-drop dimension picker — group by any field (status × source, rep × week, product × city), pivot any metric (count, sum value, average TAT). Save as named reports.',
      attachTo: { element: '#view', on: 'top' },
      beforeShowPromise: nav('#/report-builder', 700),
      buttons: buttons(true)
    });

    tour.addStep({
      id: 'tat-report',
      title: '⏱️ TAT (Turn-Around-Time) report',
      text: 'Set hourly thresholds per stage (e.g., New → Contact within 2h). Any lead exceeding the threshold becomes a TAT violation. Reports show violations per rep per stage — pure performance accountability.',
      attachTo: { element: '#view', on: 'top' },
      beforeShowPromise: nav('#/tat', 700),
      buttons: buttons(true)
    });

    // ---------- customers ----------
    tour.addStep({
      id: 'customers',
      title: '🏆 Customer lifecycle',
      text: 'Once a deal is Booked, it auto-converts to a Customer. Track lifetime value, total purchases, renewal date, churn risk. Sales history per customer. Bulk WhatsApp campaigns to active vs lapsed segments.',
      attachTo: { element: '#view', on: 'top' },
      beforeShowPromise: nav('#/customers', 700),
      buttons: buttons(true)
    });

    // ---------- inventory ----------
    tour.addStep({
      id: 'inventory',
      title: '🏗️ Inventory tracker',
      text: 'For real-estate / project businesses — track units sold, blocked, available per project. Reps see live availability when pitching. Auto-decrement on booking.',
      attachTo: { element: '#view', on: 'top' },
      beforeShowPromise: nav('#/inventory', 700),
      buttons: buttons(true)
    });

    // ---------- team chat ----------
    tour.addStep({
      id: 'team-chat',
      title: '💬 Team chat (built-in)',
      text: 'WhatsApp-style group chats + 1-on-1 DMs. Mention a teammate with @, link a lead with #. Push notifications, unread badges. Replaces Slack for sales teams.',
      attachTo: { element: '#view', on: 'top' },
      beforeShowPromise: nav('#/chat', 700),
      buttons: buttons(true)
    });

    // ---------- knowledge base ----------
    tour.addStep({
      id: 'knowledge',
      title: '📚 Knowledge base',
      text: 'Pitch scripts, FAQs, brochures, pricing sheets, policy docs — all indexed and searchable. Reps quote answers verbatim while on calls.',
      attachTo: { element: '#view', on: 'top' },
      beforeShowPromise: nav('#/knowledge', 700),
      buttons: buttons(true)
    });

    // ---------- HR module ----------
    tour.addStep({
      id: 'attendance',
      title: '⏰ Attendance + GPS',
      text: 'Reps check in/out with optional GPS verification. Work-mode tags (Office / Home / On-site). Live location pinged every 30 minutes while on duty. Daily/monthly attendance reports.',
      attachTo: { element: '#view', on: 'top' },
      beforeShowPromise: nav('#/attendance', 700),
      buttons: buttons(true)
    });

    tour.addStep({
      id: 'tasks',
      title: '✅ Daily tasks',
      text: 'Admins assign tasks to reps with due dates + priority. Reps mark in-progress / done. Status panel for managers to track team workload.',
      attachTo: { element: '#view', on: 'top' },
      beforeShowPromise: nav('#/tasks', 700),
      buttons: buttons(true)
    });

    tour.addStep({
      id: 'leaves',
      title: '🏖️ Leave management',
      text: 'Reps apply leave with dates + reason. Auto-notifies supervisor + admin. One-click approve/reject. Calendar integration.',
      attachTo: { element: '#view', on: 'top' },
      beforeShowPromise: nav('#/leaves', 700),
      buttons: buttons(true)
    });

    tour.addStep({
      id: 'salary',
      title: '💰 Salary slips (auto-generated PDF)',
      text: 'Monthly salary computation: base + allowances - deductions. Branded PDF salary slip generated per click. Share via WhatsApp directly to the rep.',
      attachTo: { element: '#view', on: 'top' },
      beforeShowPromise: nav('#/salary', 700),
      buttons: buttons(true)
    });

    // ---------- admin ----------
    tour.addStep({
      id: 'admin',
      title: '⚙️ Admin settings',
      text: 'Custom fields, statuses, sources, products, automation rules, assignment rules, role permissions, brand colours, SMTP, WhatsApp Cloud API, Facebook integration, Google Sheet sync, webhook tokens, lead capping, duplicate policy — all configurable from one place.',
      attachTo: { element: '#view', on: 'top' },
      beforeShowPromise: nav('#/admin', 700),
      buttons: buttons(true)
    });

    tour.addStep({
      id: 'custom-fields',
      title: '🧩 Custom fields',
      text: 'Add unlimited custom fields per lead — text, number, date, select, multiselect, checkbox. Mandatory or optional. Visible to specific roles. The CRM molds itself to your business, not the other way round.',
      buttons: buttons(true)
    });

    tour.addStep({
      id: 'roles-permissions',
      title: '🔐 Roles & permissions',
      text: 'Four-tier hierarchy (admin → manager → team_leader → sales). Per-role field visibility, action permissions, lead access scope. Reps only see their own leads; managers see their team; admins see everything.',
      buttons: buttons(true)
    });

    // ---------- mobile + closing ----------
    tour.addStep({
      id: 'mobile-app',
      title: '📱 Native Android app',
      text: 'Full Capacitor-based Android wrapper:<br>• Caller-ID popup matches incoming calls to leads<br>• Tap-to-dial from push notification<br>• Auto-sync call recordings to the lead<br>• Offline mode with sync-on-reconnect<br>• Built-in attendance check-in with GPS<br><br>Tap <b>📱 Get app</b> to download.',
      attachTo: { element: '#btn-getapp', on: 'bottom' },
      beforeShowPromise: nav('#/dashboard', 700),
      buttons: buttons(true)
    });

    tour.addStep({
      id: 'finish',
      title: '🎉 You\'ve seen the full tour',
      text: 'That\'s every major feature: lead capture → pipeline → follow-ups → WhatsApp bot → automation → reports → customers → inventory → HR → mobile app.<br><br><b>Click around freely</b> — every action is sandboxed. No real emails, WhatsApp messages, FB connects, or push notifications go out.<br><br>Like what you see? <a href="https://smartcrmsolution.com" target="_blank"><b>Visit smartcrmsolution.com</b></a> for your own instance.<br><br>Re-launch this tour anytime via the <b>🎓 Tutorial</b> pill (bottom-right).',
      buttons: [
        { text: '← Back', classes: 'shepherd-button-secondary', action: tour.back },
        { text: 'Done — explore the demo', action: function () { tour.complete(); } }
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
    var tries = 0;
    var iv = setInterval(function () {
      if (tries++ > 40) { clearInterval(iv); return; }
      if ($('.sidebar') && $('.shell')) {
        clearInterval(iv);
        setTimeout(start, 800);
      }
    }, 200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', maybeAutoStart);
  } else {
    maybeAutoStart();
  }

  window.SmartCRMDemoTour = {
    start: start,
    reset: function () { try { localStorage.removeItem(SEEN_KEY); } catch (_) {} }
  };

  function injectFAB() {
    if (document.getElementById('demo-tour-fab')) return;
    if (!document.querySelector('.shell')) return;
    var btn = document.createElement('button');
    btn.id = 'demo-tour-fab';
    btn.title = 'Restart guided tour (covers all features)';
    btn.innerHTML = '🎓 Tutorial';
    btn.style.cssText = 'position:fixed;bottom:18px;right:18px;z-index:998;padding:10px 16px;border-radius:24px;border:0;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-weight:600;cursor:pointer;box-shadow:0 6px 18px rgba(99,102,241,.4);font-size:14px;';
    btn.onclick = start;
    document.body.appendChild(btn);
  }
  var fabIv = setInterval(function () {
    if (document.querySelector('.shell')) { injectFAB(); clearInterval(fabIv); }
  }, 500);
})();
