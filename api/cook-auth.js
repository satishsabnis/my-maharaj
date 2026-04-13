import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { action, phone, token } = req.body ?? {};
  if (!action || !phone) {
    res.status(400).json({ error: 'Missing required fields: action, phone' });
    return;
  }

  // Normalize phone to E.164 (+91 assumed for Indian numbers)
  const normalizedPhone = phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`;

  // Anon client for OTP operations (same key the client would use)
  const anonClient = createClient(
    process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  );

  // Service role client for reading cooks table
  const adminClient = createClient(
    process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  if (action === 'send_otp') {
    const { error } = await anonClient.auth.signInWithOtp({
      phone: normalizedPhone,
      options: { channel: 'sms' },
    });
    if (error) {
      console.error('[cook-auth] send_otp error:', error.message);
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(200).json({ success: true });
    return;
  }

  if (action === 'verify_otp') {
    if (!token) { res.status(400).json({ error: 'Missing token' }); return; }

    const { data, error } = await anonClient.auth.verifyOtp({
      phone: normalizedPhone,
      token,
      type: 'sms',
    });
    if (error) {
      console.error('[cook-auth] verify_otp error:', error.message);
      res.status(400).json({ error: error.message });
      return;
    }

    // Look up cook record in cooks table
    const { data: cook, error: cookErr } = await adminClient
      .from('cooks')
      .select('*')
      .eq('phone', normalizedPhone)
      .single();

    if (cookErr && cookErr.code !== 'PGRST116') {
      // PGRST116 = no rows found — not fatal, cook may not be registered yet
      console.error('[cook-auth] cooks lookup error:', cookErr.message);
    }

    res.status(200).json({ session: data?.session ?? null, cook: cook ?? null });
    return;
  }

  res.status(400).json({ error: `Unknown action: ${action}` });
}
