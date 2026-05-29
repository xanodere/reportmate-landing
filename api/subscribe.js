import { put, head, getDownloadUrl } from '@vercel/blob';

const BLOB_FILENAME = 'waitlist.json';

async function getWaitlist() {
  try {
    const info = await head(BLOB_FILENAME, { token: process.env.BLOB_READ_WRITE_TOKEN });
    const res = await fetch(info.downloadUrl);
    return await res.json();
  } catch {
    return { emails: [], count: 0 };
  }
}

async function saveWaitlist(data) {
  await put(BLOB_FILENAME, JSON.stringify(data), {
    access: 'public',
    contentType: 'application/json',
    token: process.env.BLOB_READ_WRITE_TOKEN,
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

  console.log(`[waitlist] ${alreadyExists ? 'duplicate' : 'new'}: ${normalized} (total: ${waitlist.count})`);
  return res.status(200).json({ ok: true, count: waitlist.count });
}
