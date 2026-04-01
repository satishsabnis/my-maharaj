import type { VercelRequest, VercelResponse } from '@vercel/node';

// MANUAL MIGRATION REQUIRED in Supabase:
// ALTER TABLE profiles ADD COLUMN IF NOT EXISTS grocery_day TEXT DEFAULT 'Saturday';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
    );

    const today = new Date();
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });

    const { data: users } = await supabase
      .from('profiles')
      .select('id, full_name, grocery_day')
      .eq('grocery_day', dayName);

    const results = [];
    for (const user of (users || [])) {
      results.push({ userId: user.id, name: user.full_name, status: 'queued' });
    }

    return res.status(200).json({
      processed: results.length,
      day: dayName,
      results,
    });
  } catch (err) {
    console.error('[Cron] Error:', err);
    return res.status(500).json({ error: String(err) });
  }
}
