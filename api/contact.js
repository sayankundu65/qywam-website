// Vercel serverless function: POST /api/contact
// Required environment variables (set in Vercel > Project > Settings > Environment Variables):
//   RESEND_API_KEY      - API key from https://resend.com
//   CONTACT_TO_EMAIL    - inbox that receives enquiries
//   CONTACT_FROM_EMAIL  - verified sender, e.g. "Qywam <hello@yourdomain>"
// Optional: ALLOWED_ORIGINS - comma separated list (default: https://www.qywam.com)

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map(); // best-effort, per warm serverless instance

function limited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > MAX_PER_WINDOW;
}

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const allowed = (process.env.ALLOWED_ORIGINS || 'https://www.qywam.com').split(',').map((s) => s.trim());
  const origin = req.headers.origin;
  const host = req.headers.host || '';
  const sameHost = origin && origin.replace(/^https?:\/\//, '') === host;
  if (origin && !allowed.includes(origin) && !sameHost) {
    return res.status(403).json({ ok: false, error: 'Forbidden' });
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (limited(ip)) return res.status(429).json({ ok: false, error: 'Too many requests. Please try again later.' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  // spam protection: honeypot + minimum fill time
  if (body.website) return res.status(200).json({ ok: true }); // silently drop bots
  if (typeof body.elapsed === 'number' && body.elapsed < 2500) {
    return res.status(400).json({ ok: false, error: 'Please take a moment to complete the form.' });
  }

  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim();
  const message = String(body.message || '').trim();
  const errors = {};
  if (name.length < 2 || name.length > 100) errors.name = 'Please enter your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200 || /[\r\n]/.test(email)) errors.email = 'Please enter a valid email address.';
  if (message.length < 10 || message.length > 5000) errors.message = 'Please write between 10 and 5000 characters.';
  if (Object.keys(errors).length) return res.status(400).json({ ok: false, errors });

  const key = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL;
  if (!key || !to || !from) {
    console.error('contact: email delivery is not configured');
    return res.status(503).json({ ok: false, error: 'Messaging is temporarily unavailable. Please try again later.' });
  }

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: 'New enquiry from ' + name.replace(/[\r\n]/g, ' '),
        html: '<p><strong>Name:</strong> ' + esc(name) + '</p><p><strong>Email:</strong> ' + esc(email) + '</p><p>' + esc(message).replace(/\n/g, '<br>') + '</p>',
        text: 'Name: ' + name + '\nEmail: ' + email + '\n\n' + message,
      }),
    });
    if (!r.ok) {
      console.error('contact: provider error', r.status);
      return res.status(502).json({ ok: false, error: 'We could not send your message. Please try again later.' });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('contact: send failed', e && e.message);
    return res.status(502).json({ ok: false, error: 'We could not send your message. Please try again later.' });
  }
};
