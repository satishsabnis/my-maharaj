const path = require('path');
const fs   = require('fs');
const https = require('https');

function fetchAsBase64(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('base64')));
      res.on('error', () => resolve(''));
    }).on('error', () => resolve(''));
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { type, familyName, dateRange, content, language } = req.body;
  const days = content?.days ?? [];

  // Logo
  let logoDataUri = '';
  try {
    const logoPath = path.join(process.cwd(), 'assets', 'logo.png');
    const logoBuffer = fs.readFileSync(logoPath);
    logoDataUri = `data:image/png;base64,${logoBuffer.toString('base64')}`;
  } catch { /* logo not available */ }

  // QR code
  let qrDataUri = '';
  try {
    const qrBase64 = await fetchAsBase64('https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=https://www.my-maharaj.com');
    if (qrBase64) qrDataUri = `data:image/png;base64,${qrBase64}`;
  } catch { /* qr not available */ }

  const displayName = familyName && familyName !== 'Your Family' ? familyName : 'Your Family';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>My Maharaj Meal Plan</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  @media print { .no-print { display: none; } body { margin: 0; } }
  @media (max-width: 768px) { body { padding: 8px; } table { font-size: 10px; } th, td { padding: 4px 3px; } }
  body { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #fff; color: #1b3a5c; }
  .header { background: #1b3a5c; color: white; padding: 14px 20px; margin-bottom: 20px; border-radius: 8px; display: flex; align-items: center; gap: 16px; }
  .header-logo { width: 52px; height: 52px; object-fit: contain; flex-shrink: 0; }
  .header-text { flex: 1; }
  .header h1 { margin: 0; font-size: 20px; font-weight: 600; }
  .header p { margin: 4px 0 0; font-size: 13px; color: rgba(255,255,255,0.7); }
  .print-btn { background: #1a6b5c; color: white; border: none; padding: 10px 24px; border-radius: 8px; font-size: 14px; cursor: pointer; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; table-layout: fixed; }
  th { background: #1b3a5c; color: white; padding: 10px 12px; text-align: left; font-weight: 500; }
  th:nth-child(1) { width: 10%; }
  th:nth-child(2) { width: 16%; }
  th:nth-child(3) { width: 18%; }
  th:nth-child(4) { width: 18%; }
  th:nth-child(5) { width: 26%; }
  th:nth-child(6) { width: 12%; }
  td { padding: 8px 6px; border-bottom: 0.5px solid #e0e0e0; vertical-align: top; word-wrap: break-word; overflow-wrap: break-word; }
  tr:nth-child(even) td { background: #f8f9fa; }
  .day-header td { background: #c9a227; color: #1a1a1a; font-weight: 600; font-size: 13px; }
  .meal-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 2px; }
  .meal-dish { font-size: 13px; color: #1b3a5c; }
  .footer { margin-top: 20px; font-size: 11px; color: #aaa; display: flex; align-items: center; justify-content: space-between; }
  .footer-text { flex: 1; }
  .footer-qr { width: 80px; height: 80px; object-fit: contain; }
</style>
</head>
<body>
<div class="header">
  ${logoDataUri ? `<img class="header-logo" src="${logoDataUri}" alt="My Maharaj" />` : ''}
  <div class="header-text">
    <h1>My Maharaj Meal Plan</h1>
    <p>for ${displayName}${dateRange ? ' · ' + dateRange : ''}</p>
  </div>
</div>
<button class="print-btn no-print" onclick="window.print()">Print / Save as PDF</button>
<table>
  <thead>
    <tr>
      <th>Day</th>
      <th>Breakfast</th>
      <th>Lunch</th>
      <th>Dinner</th>
      <th>Supporting</th>
      <th>Evening</th>
    </tr>
  </thead>
  <tbody>
    ${days.map(day => {
      const meals = day.meals || [];
      const get = (label) => meals.find(m => m.label?.toLowerCase().includes(label.toLowerCase()))?.dish || '';
      const breakfast = get('Breakfast');
      const lunchCurries = meals.filter(m => m.label?.toLowerCase().includes('lunch curry')).map(m => m.dish).filter(Boolean).join(' + ');
      const dinnerCurries = meals.filter(m => m.label?.toLowerCase().includes('dinner curry')).map(m => m.dish).filter(Boolean).join(' + ');
      const lunchVeg = get('Lunch Veg');
      const lunchRaita = get('Lunch Raita');
      const lunchBread = get('Lunch Bread');
      const lunchRice = get('Lunch Rice');
      const dinnerVeg = get('Dinner Veg');
      const dinnerRaita = get('Dinner Raita');
      const dinnerBread = get('Dinner Bread');
      const dinnerRice = get('Dinner Rice');
      const snack = get('Snack');
      return `
        <tr class="day-header"><td colspan="6">${day.dayName || ''}</td></tr>
        <tr>
          <td></td>
          <td><span class="meal-label">Breakfast</span><span class="meal-dish">${breakfast}</span></td>
          <td><span class="meal-label">Curry</span><span class="meal-dish">${lunchCurries}</span></td>
          <td><span class="meal-label">Curry</span><span class="meal-dish">${dinnerCurries}</span></td>
          <td>
            <span class="meal-label">Veg</span><span class="meal-dish">${lunchVeg}</span><br>
            <span class="meal-label" style="margin-top:4px">Raita</span><span class="meal-dish">${lunchRaita}</span><br>
            <span class="meal-label" style="margin-top:4px">Bread</span><span class="meal-dish">${lunchBread}</span><br>
            <span class="meal-label" style="margin-top:4px">Rice</span><span class="meal-dish">${lunchRice}</span>
          </td>
          <td><span class="meal-label">Snack</span><span class="meal-dish">${snack}</span></td>
        </tr>`;
    }).join('')}
  </tbody>
</table>
<div class="footer">
  <span class="footer-text">Generated by My Maharaj · Blue Flute Consulting LLC-FZ · Dubai</span>
  ${qrDataUri ? `<img class="footer-qr" src="${qrDataUri}" alt="my-maharaj.com" />` : ''}
</div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(html);
};
