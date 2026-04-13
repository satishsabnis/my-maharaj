import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST' && req.method !== 'DELETE') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  if (req.method === 'DELETE') {
    const { id, family_user_id } = req.body ?? {};
    if (!id || !family_user_id) return res.status(400).json({ error: 'Missing fields' });
    const { error } = await supabase.from('cook_families').delete().eq('id', id).eq('family_user_id', family_user_id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  const { phone, name, family_user_id, visit_time, visit_times, days, edit_id } = req.body ?? {};

  if (!phone || !family_user_id) {
    res.status(400).json({ error: 'Missing required fields: phone, family_user_id' });
    return;
  }

  try {
    const { error: cookError } = await supabase
      .from('cooks')
      .upsert({ phone, name: name || phone }, { onConflict: 'phone' });
    if (cookError) throw new Error(cookError.message);

    if (edit_id) {
      const { error: updateError } = await supabase
        .from('cook_families')
        .update({ visit_time, visit_times, days })
        .eq('id', edit_id);
      if (updateError) throw new Error(updateError.message);
    } else {
      const { error: insertError } = await supabase
        .from('cook_families')
        .upsert(
          { cook_phone: phone, family_user_id, visit_time, visit_times, days },
          { onConflict: 'cook_phone,family_user_id,visit_time' }
        );
      if (insertError) throw new Error(insertError.message);
    }

    res.status(200).json({ success: true });
  } catch (e) {
    console.error('[cook-save] error:', e.message);
    res.status(500).json({ error: e.message });
  }
}
