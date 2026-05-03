/**
 * demo-overrides.js — runs on every page load, applies SmartCRM Demo
 * branding overrides on the client side and injects an "Auto-fill &
 * sign in" card on the login screen so prospects can access instantly.
 *
 * This is a defensive belt-and-braces script — even if the template
 * cloning in app.js drops our extras, this script reinstates them.
 */
(function () {
  document.title = 'SmartCRM Demo — Try it free';

  function injectCredsCard() {
    var form = document.getElementById('login-form');
    if (!form) return false;
    if (document.getElementById('demo-creds-card')) return true;

    // Force the heading
    var h1 = document.querySelector('.login-card h1');
    if (h1) h1.textContent = 'SmartCRM Demo';

    var card = document.createElement('div');
    card.id = 'demo-creds-card';
    card.innerHTML = [
      '<div class="demo-creds-title">🎭 Try the demo instantly</div>',
      '<div class="demo-creds-row"><span>📧 Email</span><code>demo@smartcrmsolution.com</code></div>',
      '<div class="demo-creds-row"><span>🔑 Password</span><code>demo123</code></div>',
      '<button type="button" id="demo-autofill-btn" class="demo-autofill-btn">⚡ Auto-fill &amp; sign in</button>'
    ].join('');
    card.style.cssText = [
      'background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
      'border: 1px dashed #f59e0b',
      'border-radius: 10px',
      'padding: 14px 16px',
      'margin: 0 0 18px 0',
      'font-size: 13px',
      'color: #78350f'
    ].join(';') + ';';

    // Add inline styles for inner pieces
    var style = document.getElementById('demo-creds-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'demo-creds-style';
      style.textContent = '\n#demo-creds-card .demo-creds-title{font-weight:700;margin-bottom:10px;font-size:14px;color:#92400e}\n#demo-creds-card .demo-creds-row{display:flex;justify-content:space-between;align-items:center;padding:5px 0;font-size:13px}\n#demo-creds-card code{background:#fff;padding:3px 9px;border-radius:5px;color:#b45309;font-size:12px;font-family:monospace}\n.demo-autofill-btn{display:block;width:100%;margin-top:10px;padding:10px;background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff;border:0;border-radius:8px;font-weight:600;cursor:pointer;font-size:14px}\n.demo-autofill-btn:hover{filter:brightness(1.05)}\n#demo-banner{display:flex !important}\n';
      document.head.appendChild(style);
    }

    form.parentElement.insertBefore(card, form);

    document.getElementById('demo-autofill-btn').addEventListener('click', function () {
      form.email.value = 'demo@smartcrmsolution.com';
      form.password.value = 'demo123';
      var btn = form.querySelector('button[type="submit"]');
      if (btn) btn.click();
    });
    return true;
  }

  // Try immediately + watch for late renders (login screen mounts after
  // CRM.config loads).
  function tick() {
    injectCredsCard();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tick);
  } else {
    tick();
  }
  // Re-check periodically for the first 30 seconds — covers SPA route changes
  var attempts = 0;
  var iv = setInterval(function () {
    if (attempts++ > 60) { clearInterval(iv); return; }
    injectCredsCard();
  }, 500);
})();
