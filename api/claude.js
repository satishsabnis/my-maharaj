export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { return res.status(204).end(); }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const secret = req.headers['x-maharaj-secret'];
  if (!secret || secret !== process.env.MAHARAJ_API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const apiKey = process.env.CLAUDE_KEY;
  if (!apiKey) { res.status(500).json({ error: 'CLAUDE_KEY environment variable is not set on the server. Please configure it in Vercel dashboard.' }); return; }
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    if (!response.ok) {
      console.error('[claude.js] API error:', response.status, JSON.stringify(data));
      res.status(response.status).json({ error: data?.error?.message ?? `Claude API error (${response.status})` });
      return;
    }
    res.status(200).json(data);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
