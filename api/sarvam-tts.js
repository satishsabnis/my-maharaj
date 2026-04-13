export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'SARVAM_API_KEY is not configured on the server.' });
    return;
  }

  const { text, language } = req.body ?? {};
  if (!text) {
    res.status(400).json({ error: 'Missing required field: text' });
    return;
  }

  try {
    const response = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': apiKey,
      },
      body: JSON.stringify({
        inputs: [text],
        target_language_code: language || 'hi-IN',
        speaker: 'meera',
        model: 'bulbul:v2',
        enable_preprocessing: true,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('[sarvam-tts] API error:', response.status, JSON.stringify(data));
      res.status(response.status).json({ error: data?.message ?? `Sarvam TTS error (${response.status})` });
      return;
    }

    const audioBase64 = data.audios?.[0];
    if (!audioBase64) {
      res.status(500).json({ error: 'No audio returned from Sarvam TTS' });
      return;
    }

    res.status(200).json({ audio: audioBase64 });
  } catch (e) {
    console.error('[sarvam-tts] Unexpected error:', e.message);
    res.status(500).json({ error: e.message });
  }
}
