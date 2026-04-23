import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.replace('Bearer ', '');

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const userId = user.id;

  try {
    await supabase.from('dish_feedback').delete().eq('user_id', userId);
    await supabase.from('meal_feedback').delete().eq('user_id', userId);
    await supabase.from('dish_history').delete().eq('user_id', userId);
    await supabase.from('meal_plans').delete().eq('user_id', userId);
    await supabase.from('meal_prep_tasks').delete().eq('user_id', userId);
    await supabase.from('fridge_inventory').delete().eq('user_id', userId);
    await supabase.from('family_members').delete().eq('user_id', userId);
    await supabase.from('family_recipes').delete().eq('user_id', userId);
    await supabase.from('family_regular_dishes').delete().eq('profile_id', userId);
    await supabase.from('cuisine_preferences').delete().eq('user_id', userId);
    await supabase.from('cook_families').delete().eq('family_user_id', userId);
    await supabase.from('profiles').delete().eq('id', userId);
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteError) throw new Error(deleteError.message);
    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('[delete-account] error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
