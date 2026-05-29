import { put, list } from '@vercel/blob';

const BLOB_FILENAME = 'waitlist.json';

async function getWaitlist(token) {
  const { blobs } = await list({ prefix: BLOB_FILENAME, token, mode: 'expanded' });
  if (!blobs.length) return { emails: [], count: 0 };
  const res = await fetch(blobs[0].downloadUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { emails: [], count: 0 };
  return await res.json();
}

async function sendConfirmationEmail(email, resendKey) {
  if (!resendKey) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'ReportMate <hello@reportmate.io>',
        to: [email],
        subject: "You're on the ReportMate waitlist",
        html: `<div style="font-family:-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:32px">
          <h2 style="font-size:20px;font-weight:700;color:#111;margin-bottom:8px">You're on the list!</h2>
          <p style="color:#555;font-size:15px;line-height:1.6;margin-bottom:16px">
            Thanks for signing up for ReportMate early access.
          </p>
          <p style="color:#555;font-size:15px;line-height:1.6;margin-bottom:16px">
            We're building a tool that connects to GA4, Meta Ads, and Google Ads —
            and automatically generates branded PDF reports sent to your clients every month.
          </p>
          <p style="color:#555;font-size:15px;line-height:1.6;margin-bottom:24px">
            As one of our first 50 users, you'll get <strong>3 months free</strong> when we launch.
          </p>
          <a href="https://landing-opal-nine-94.vercel.app"
             style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;font-weight:700;text-decoration:none">
            Learn more →
          </a>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0"/>
          <p style="color:#9ca3af;font-size:12px">ReportMate · Automated client reporting for agencies</p>
        </div>`,
      }),
    });
  } catch {
    // non-blocking — don't fail the signup if email fails
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return res.status(500).json({ error: 'Missing BLOB token' });

  try {
    const { email, source = 'landing' } = req.body || {};
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email' });
    }

    const normalized = email.trim().toLowerCase();
    const waitlist = await getWaitlist(token);
    const alreadyExists = waitlist.emails.some(e => e.email === normalized);

    if (!alreadyExists) {
      waitlist.emails.push({ email: normalized, source, created_at: new Date().toISOString() });
      waitlist.count = waitlist.emails.length;
      await put(BLOB_FILENAME, JSON.stringify(waitlist), {
        access: 'private',
        contentType: 'application/json',
        token,
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      // Send confirmation (fire-and-forget)
      sendConfirmationEmail(normalized, process.env.RESEND_API_KEY);
    }

    return res.status(200).json({ ok: true, count: waitlist.count });
  } catch (err) {
    console.error('[subscribe] error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
