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
      });
    }

    return res.status(200).json({ ok: true, count: waitlist.count });
  } catch (err) {
    console.error('[subscribe] error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
