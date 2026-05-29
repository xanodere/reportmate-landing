// Vercel serverless function — stores emails to a simple JSON file or forwards to an email provider
// For now: logs + returns success. Replace with Resend/Mailchimp/Supabase when ready.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  console.log(`[waitlist] New signup: ${email} — ${new Date().toISOString()}`);

  // TODO: replace with Resend, Supabase, or Mailchimp integration
  // Example with Resend:
  // await resend.emails.send({ from: 'hello@reportmate.io', to: email, subject: 'You are on the list!' })

  return res.status(200).json({ ok: true });
}
