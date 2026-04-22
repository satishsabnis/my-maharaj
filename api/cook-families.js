import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { phone, familyId } = req.query;
  if (!phone) {
    res.status(400).json({ error: 'Missing required query param: phone' });
    return;
  }

  const normalizedPhone = phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`;

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  // Today's day name for schedule filtering
  const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const todayName = DAYS[new Date().getDay()];

  // Fetch cook_families rows for this cook
  const { data: links, error: linksErr } = await supabase
    .from('cook_families')
    .select('id, family_user_id, visit_time, visit_times, days')
    .eq('cook_phone', normalizedPhone)
    .order('visit_time', { ascending: true });

  if (linksErr) {
    console.error('[cook-families] cook_families query error:', linksErr.message);
    res.status(500).json({ error: linksErr.message });
    return;
  }
  if (!links || links.length === 0) {
    if (familyId) {
      res.status(404).json({ error: 'Family not found' });
    } else {
      res.status(200).json({ families: [] });
    }
    return;
  }

  const userIds = links.map(l => l.family_user_id);

  // Fetch profiles for all linked families
  // NOTE: profiles table uses 'id' as the primary key, not 'user_id'
  const { data: profiles, error: profilesErr } = await supabase
    .from('profiles')
    .select('id, family_name, language_preference')
    .in('id', userIds);

  if (profilesErr) {
    // Log but do not hard-fail — families should still show even without profile names
    console.error('[cook-families] profiles query error:', profilesErr.message);
  }

  // Fetch today's confirmed meal plans for all linked families
  // Query each family separately to get the most recent plan covering today
  const today = new Date().toISOString().split('T')[0];
  const planResults = await Promise.all(
    userIds.map(async (familyUserId) => {
      const { data, error } = await supabase
        .from('meal_plans')
        .select('user_id, plan_json, period_start, period_end')
        .eq('user_id', familyUserId)
        .order('generated_at', { ascending: false })
        .limit(1);
      if (error) console.error('[cook-families] meal_plans query error:', familyUserId, error.message);
      return data?.[0] ?? null;
    })
  );
  const plans = planResults.filter(Boolean);

  // Build a map: user_id → today's meals
  function parseDescription(description) {
    if (!description) return [];
    return description.split(' | ').map(seg => {
      const parts = seg.split(': ');
      return parts.length > 1 ? parts.slice(1).join(': ') : seg;
    }).slice(1);
  }

  function extractTodayMeals(plan) {
    const days = plan?.plan_json?.days ?? [];
    const todayDay = days.find(d => d.date === today) || days[0];
    if (!todayDay) return null;

    return {
      breakfast: { label: 'Breakfast', mainDish: todayDay?.breakfast?.name || '',  supporting: [] },
      lunch:     { label: 'Lunch',     mainDish: todayDay?.lunch?.name || '',       supporting: parseDescription(todayDay?.lunch?.description) },
      dinner:    { label: 'Dinner',    mainDish: todayDay?.dinner?.name || '',      supporting: parseDescription(todayDay?.dinner?.description) },
    };
  }

  const planMap = {};
  for (const plan of (plans ?? [])) {
    planMap[plan.user_id] = extractTodayMeals(plan);
  }

  // profileMap keyed by profiles.id (not user_id — that column does not exist)
  const profileMap = {};
  for (const p of (profiles ?? [])) {
    profileMap[p.id] = p;
  }
  const families = [];
  for (const link of links) {
    // Day-of-week filter: empty/null days = visit every day (backwards compatible)
    const isScheduledToday = !link.days || link.days.length === 0 || link.days.includes(todayName);
    if (!isScheduledToday) continue;

    const profile = profileMap[link.family_user_id] || {};
    const meals   = planMap[link.family_user_id];
    const familyName = profile.family_name || 'Your Family';
    families.push({
      id:          link.id,
      familyUserId: link.family_user_id,
      familyName,
      location:    '',
      visitTime:   link.visit_time || '',
      visitTimes:  link.visit_times || {},
      days:        link.days || [],
      memberCount: 0,
      language:    profile.language_preference || 'hi-IN',
      confirmed:   !!meals,
      meals:       meals
        ? { breakfast: meals.breakfast.mainDish, lunch: meals.lunch.mainDish, dinner: meals.dinner.mainDish }
        : { breakfast: '', lunch: '', dinner: '' },
    });
  }

  // If a specific familyId is requested, return detail format
  if (familyId) {
    const link = links.find(l => l.id === familyId);
    if (!link) { res.status(404).json({ error: 'Family not found' }); return; }
    const profile = profileMap[link.family_user_id] || {};
    const meals   = planMap[link.family_user_id];
    const detail = {
      id:          link.id,
      familyName:  profile.family_name || 'Your Family',
      location:    '',
      language:    profile.language_preference || 'hi-IN',
      memberCount: 0,
      meals: meals || {
        breakfast: { label: 'Breakfast', mainDish: 'Not confirmed', supporting: [] },
        lunch:     { label: 'Lunch',     mainDish: 'Not confirmed', supporting: [] },
        dinner:    { label: 'Dinner',    mainDish: 'Not confirmed', supporting: [] },
      },
    };
    res.status(200).json({ family: detail });
    return;
  }

  res.status(200).json({ families });
}
