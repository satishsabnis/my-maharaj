import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  // GET /api/referral?action=get_code — fetch or generate referral code for logged in user
  if (req.method === 'GET' && req.query.action === 'get_code') {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

    // Check if code already exists
    const { data: existing } = await supabase
      .from('referral_codes')
      .select('code')
      .eq('profile_id', user.id)
      .maybeSingle();
    if (existing) return res.status(200).json({ code: existing.code });

    // Generate new code: BFC + family_name_uppercase + last 4 chars of UUID
    const { data: profile } = await supabase
      .from('profiles')
      .select('family_name')
      .eq('id', user.id)
      .maybeSingle();
    const familyName = (profile?.family_name || 'USER').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    const uuidSuffix = user.id.replace(/-/g, '').slice(-4).toUpperCase();
    const code = `BFC${familyName}${uuidSuffix}`;

    const { error: insertError } = await supabase
      .from('referral_codes')
      .insert({ profile_id: user.id, code });
    if (insertError) return res.status(500).json({ error: insertError.message });

    return res.status(200).json({ code });
  }

  // GET /api/referral?action=get_stats — fetch referral stats for logged in user
  if (req.method === 'GET' && req.query.action === 'get_stats') {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

    const { data: referrals } = await supabase
      .from('referrals')
      .select('status')
      .eq('referrer_profile_id', user.id);

    const { data: rewards } = await supabase
      .from('referral_rewards')
      .select('months_banked, months_redeemed, status')
      .eq('profile_id', user.id);

    const total = referrals?.length || 0;
    const active = referrals?.filter(r => r.status === 'active' || r.status === 'rewarded').length || 0;
    const monthsBanked = rewards?.reduce((acc, r) => acc + (r.months_banked || 0), 0) || 0;
    const monthsRedeemed = rewards?.reduce((acc, r) => acc + (r.months_redeemed || 0), 0) || 0;
    const monthsAvailable = monthsBanked - monthsRedeemed;

    return res.status(200).json({ total, active, monthsBanked, monthsRedeemed, monthsAvailable });
  }

  // POST /api/referral — apply referral code at signup
  if (req.method === 'POST') {
    const { referred_user_id, code } = req.body ?? {};
    if (!referred_user_id || !code) return res.status(400).json({ error: 'Missing fields' });

    // Validate code exists
    const { data: referralCode } = await supabase
      .from('referral_codes')
      .select('profile_id')
      .eq('code', code.toUpperCase().trim())
      .maybeSingle();
    if (!referralCode) return res.status(404).json({ error: 'Invalid referral code' });

    // Prevent self-referral
    if (referralCode.profile_id === referred_user_id) {
      return res.status(400).json({ error: 'You cannot use your own referral code' });
    }

    // Prevent duplicate referral
    const { data: existing } = await supabase
      .from('referrals')
      .select('id')
      .eq('referred_profile_id', referred_user_id)
      .maybeSingle();
    if (existing) return res.status(400).json({ error: 'Referral code already applied' });

    const { error: insertError } = await supabase
      .from('referrals')
      .insert({
        referrer_profile_id: referralCode.profile_id,
        referred_profile_id: referred_user_id,
        code_used: code.toUpperCase().trim(),
        status: 'pending',
      });
    if (insertError) return res.status(500).json({ error: insertError.message });

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
