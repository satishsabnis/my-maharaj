const express = require('express');
const app = express();
app.use(express.json());

const NVIDIA_API_KEY = process.env.NVIDIA_NIM_API_KEY;

app.post('/v1/complete', async (req, res) => {
  try {
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NVIDIA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'kimi/kimi-k2.5',
        messages: req.body.messages,
        max_tokens: req.body.max_tokens || 4096,
        temperature: req.body.temperature || 0.7
      })
    });
    
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(8082, () => console.log('NVIDIA proxy running on port 8082'));