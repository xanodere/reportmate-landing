import { put, list } from '@vercel/blob';

const BLOB_FILENAME = 'waitlist.json';
const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

async function getWaitlist() {
  try {
    const { blobs } = await list({ prefix: BLOB_FILENAME, token: TOKEN, mode: 'expanded' });
    if (!blobs.length) return { emails: [], count: 0 };
    const res = await fetch(blobs[0].downloadUrl, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    return await res.json();
  } catch {
    return { emails: [], count: 0 };
  }
}

async function saveWaitlist(data) {
  await put(BLOB_FILENAME, JSON.stringify(data), {
    access: 'private',
    contentType: 'application/json',
    token: TOKEN,
    addRandomSuffix: false,
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, source = 'landing' } = req.body || {};
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  const normalized = email.trim().toLowerCase();
  const waitlist = await getWaitlist();

  const alreadyExists = waitlist.emails.some(e => e.email === normalized);
  if (!alreadyExists) {
    waitlist.emails.push({ email: normalized, source, created_at: new Date().toISOString() });
    waitlist.count = waitlist.emails.length;
    await saveWaitlist(waitlist);
  }

  return res.status(200).json({ ok: true, count: waitlist.count });
}
