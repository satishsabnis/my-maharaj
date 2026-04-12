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

  const { text, targetLanguage } = req.body ?? {};
  if (!text || !targetLanguage) {
    res.status(400).json({ error: 'Missing required fields: text, targetLanguage' });
    return;
  }

  try {
    const response = await fetch('https://api.sarvam.ai/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': apiKey,
      },
      body: JSON.stringify({
        input: text,
        source_language_code: 'en-IN',
        target_language_code: targetLanguage,
        speaker_gender: 'Female',
        mode: 'formal',
        model: 'mayura:v1',
        enable_preprocessing: false,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('[sarvam-translate.js] API error:', response.status, JSON.stringify(data));
      res.status(response.status).json({ error: data?.message ?? `Sarvam API error (${response.status})` });
      return;
    }

    res.status(200).json({ translatedText: data.translated_text });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
