const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') return res.status(405).end();

  const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const { phone, pin, confirmPin, name, action } = req.body ?? {};
  if (!phone) return res.status(400).json({ error: 'Phone required' });

  if (action === 'register') {
    if (!pin || pin.length !== 4) return res.status(400).json({ error: 'PIN must be 4 digits' });
    if (pin !== confirmPin) return res.status(400).json({ error: 'PINs do not match' });

    const { error: upsertErr } = await supabase
      .from('cooks')
      .upsert({ phone, name: name || phone, pin }, { onConflict: 'phone' });
    if (upsertErr) return res.status(500).json({ error: upsertErr.message });

    const { data: cook } = await supabase
      .from('cooks')
      .select('phone, name, language')
      .eq('phone', phone)
      .single();
    return res.status(200).json({ success: true, cook });
  }

  if (action === 'verify_pin') {
    if (!pin) return res.status(400).json({ error: 'PIN required' });
    const { data: cook, error } = await supabase
      .from('cooks')
      .select('phone, name, language, pin')
      .eq('phone', phone)
      .single();
    if (error || !cook) return res.status(401).json({ error: 'Cook not found' });
    if (cook.pin !== pin) return res.status(401).json({ error: 'Incorrect PIN' });
    return res.status(200).json({ success: true, cook: { phone: cook.phone, name: cook.name, language: cook.language } });
  }

  return res.status(400).json({ error: 'Unknown action' });
};
