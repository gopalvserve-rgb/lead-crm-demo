/**
 * routes/whatsapp.js — WhatsApp Cloud API helpers.
 * Fetches approved message templates from Meta, used by the automation UI.
 */
const fetch = require('node-fetch');
const db = require('../db/pg');
const { authUser } = require('../utils/auth');
const demo = require('../utils/demoGuard');

async function _cfg() {
  const wabaId = await db.getConfig('WHATSAPP_BUSINESS_ACCOUNT_ID', process.env.WHATSAPP_BUSINESS_ACCOUNT_ID);
  const token  = await db.getConfig('WHATSAPP_ACCESS_TOKEN',        process.env.WHATSAPP_ACCESS_TOKEN);
  return { wabaId, token };
}

async function api_whatsapp_templates(token) {
  await authUser(token);
  if (demo.on) {
    // Sample templates so the UI looks alive in demo mode
    return {
      templates: [
        { name: 'welcome_to_celeste', language: 'en_US', status: 'APPROVED', category: 'MARKETING', components: [], body_params: 1, header_type: null, has_buttons: false },
        { name: 'site_visit_confirm', language: 'en_US', status: 'APPROVED', category: 'UTILITY', components: [], body_params: 2, header_type: 'TEXT', has_buttons: true },
        { name: 'price_quote_followup', language: 'en_US', status: 'APPROVED', category: 'MARKETING', components: [], body_params: 0, header_type: null, has_buttons: false }
      ],
      demo: true
    };
  }
  const { wabaId, token: waToken } = await _cfg();
  if (!wabaId || !waToken) {
    return { templates: [], error: 'WhatsApp not configured. Set WHATSAPP_BUSINESS_ACCOUNT_ID and WHATSAPP_ACCESS_TOKEN in Settings → WhatsApp.' };
  }
  try {
    const url = `https://graph.facebook.com/v19.0/${wabaId}/message_templates?limit=100&access_token=${encodeURIComponent(waToken)}`;
    const r = await fetch(url);
    const j = await r.json();
    if (j.error) return { templates: [], error: j.error.message };
    const list = (j.data || []).map(t => ({
      name: t.name,
      language: t.language,
      status: t.status,
      category: t.category,
      components: t.components,
      // Pre-compute the parameter count per component
      body_params: ((t.components || []).find(c => c.type === 'BODY')?.text?.match(/\{\{\d+\}\}/g) || []).length,
      header_type: (t.components || []).find(c => c.type === 'HEADER')?.format || null,
      has_buttons: !!(t.components || []).find(c => c.type === 'BUTTONS')
    }));
    // Prefer APPROVED templates
    list.sort((a, b) => (a.status === 'APPROVED' ? -1 : 1) - (b.status === 'APPROVED' ? -1 : 1) || a.name.localeCompare(b.name));
    return { templates: list };
  } catch (e) {
    return { templates: [], error: e.message };
  }
}

/**
 * Send a WhatsApp template message to a phone number.
 * params: [{ type: 'body', parameters: [{type:'text', text:'...'}] }]
 */
async function api_whatsapp_send_template(token, to, templateName, language, params) {
  await authUser(token);
  if (demo.on) {
    return demo.simulate('whatsapp_template', { to, templateName, language, params }, { wa_message_id: 'demo_' + Date.now() });
  }
  const phoneId = await db.getConfig('WHATSAPP_PHONE_NUMBER_ID', process.env.WHATSAPP_PHONE_NUMBER_ID);
  const waToken = await db.getConfig('WHATSAPP_ACCESS_TOKEN', process.env.WHATSAPP_ACCESS_TOKEN);
  if (!phoneId || !waToken) throw new Error('WhatsApp not configured');
  const body = {
    messaging_product: 'whatsapp',
    to: String(to).replace(/\D/g, ''),
    type: 'template',
    template: {
      name: templateName,
      language: { code: language || 'en_US' },
      components: params || []
    }
  };
  const r = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + waToken, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message);
  return { ok: true, wa_message_id: j.messages?.[0]?.id };
}

module.exports = {
  api_whatsapp_templates,
  api_whatsapp_send_template
};
