import { put, head } from '@vercel/blob';

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

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const { email, source = 'landing' } = JSON.parse(event.body || '{}');
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid email' }) };
  }

  const normalized = email.trim().toLowerCase();
  const waitlist = await getWaitlist();
  const alreadyExists = waitlist.emails.some(e => e.email === normalized);

  if (!alreadyExists) {
    waitlist.emails.push({ email: normalized, source, created_at: new Date().toISOString() });
    waitlist.count = waitlist.emails.length;
    await saveWaitlist(waitlist);
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ ok: true, count: waitlist.count }),
  };
};
