export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const apiKey = process.env.CLAUDE_KEY;
  if (!apiKey) { res.status(500).json({ error: 'CLAUDE_KEY environment variable is not set on the server. Please configure it in Vercel dashboard.' }); return; }
  try {
    console.log('[claude.js] request body:', JSON.stringify(req.body).substring(0, 300));
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
    console.log('[claude.js] response status:', response.status);
    console.log('[claude.js] response body:', JSON.stringify(data).substring(0, 500));
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
