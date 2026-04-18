'use strict';

const fs   = require('fs');
const path = require('path');
const pdfmake  = require('pdfmake');
const vfsFonts = require('pdfmake/build/vfs_fonts');

// ── Fonts ────────────────────────────────────────────────────────────────────
pdfmake.virtualfs.writeFileSync('Roboto-Regular.ttf',      Buffer.from(vfsFonts['Roboto-Regular.ttf'],       'base64'));
pdfmake.virtualfs.writeFileSync('Roboto-Medium.ttf',       Buffer.from(vfsFonts['Roboto-Medium.ttf'],        'base64'));
pdfmake.virtualfs.writeFileSync('Roboto-Italic.ttf',       Buffer.from(vfsFonts['Roboto-Italic.ttf'],        'base64'));
pdfmake.virtualfs.writeFileSync('Roboto-MediumItalic.ttf', Buffer.from(vfsFonts['Roboto-MediumItalic.ttf'],  'base64'));
pdfmake.addFonts({
  Roboto: {
    normal:      'Roboto-Regular.ttf',
    bold:        'Roboto-Medium.ttf',
    italics:     'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf',
  },
});
pdfmake.setUrlAccessPolicy(() => false);

// ── Logos (read synchronously once at module load) ────────────────────────────
let maharajLogo = '';
let bfcLogo     = '';
try { maharajLogo = fs.readFileSync(path.join(process.cwd(), 'assets/logo.png')).toString('base64'); } catch {}
try { bfcLogo     = fs.readFileSync(path.join(process.cwd(), 'assets/blueflute-logo.png')).toString('base64'); } catch {}

// ── Language map ──────────────────────────────────────────────────────────────
const SARVAM_LANG_MAP = {
  'Hindi': 'hi-IN',   'Marathi': 'mr-IN',  'Tamil': 'ta-IN',   'Telugu': 'te-IN',
  'Kannada': 'kn-IN', 'Malayalam': 'ml-IN','Bengali': 'bn-IN',  'Gujarati': 'gu-IN',
  'Punjabi': 'pa-IN',
  'hi': 'hi-IN', 'mr': 'mr-IN', 'ta': 'ta-IN', 'te': 'te-IN',
  'kn': 'kn-IN', 'ml': 'ml-IN', 'bn': 'bn-IN', 'gu': 'gu-IN', 'pa': 'pa-IN',
};

// ── Handler ───────────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST')   { res.status(405).json({ error: 'Method not allowed' }); return; }

  const {
    familyName = 'My Family',
    planData,
    dateFrom,
    dateTo,
    planSummaryLanguage = 'English',
  } = req.body ?? {};

  // ── QR code ────────────────────────────────────────────────────────────────
  let qrBase64 = '';
  try {
    const qrRes    = await fetch('https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=https://www.my-maharaj.com');
    const qrBuffer = await qrRes.arrayBuffer();
    qrBase64       = Buffer.from(qrBuffer).toString('base64');
  } catch { /* optional */ }

  // ── Date formatter ─────────────────────────────────────────────────────────
  const fmtDate = (d) => {
    try { return new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); }
    catch { return String(d ?? ''); }
  };

  // ── Collect unique dish names ──────────────────────────────────────────────
  const days = planData?.days ?? [];
  const allDishNames = [];
  days.forEach(day => {
    const a = day.anatomy;
    if (!a) return;
    [
      a.breakfast?.dishName,
      a.lunch?.curry?.[0]?.dishName,  a.lunch?.curry?.[1]?.dishName,
      a.lunch?.veg?.dishName,         a.lunch?.raita?.dishName,
      a.lunch?.bread?.dishName,       a.lunch?.rice?.dishName,
      a.dinner?.curry?.[0]?.dishName, a.dinner?.curry?.[1]?.dishName,
      a.dinner?.veg?.dishName,        a.dinner?.raita?.dishName,
      a.dinner?.bread?.dishName,      a.dinner?.rice?.dishName,
      a.snack?.dishName,
    ].filter(Boolean).forEach(n => { if (!allDishNames.includes(n)) allDishNames.push(n); });
  });

  // ── Sarvam translation ────────────────────────────────────────────────────
  let getDish = (name) => name || '';
  const langCode = SARVAM_LANG_MAP[planSummaryLanguage];
  if (langCode && allDishNames.length > 0) {
    const apiKey = process.env.SARVAM_API_KEY;
    if (apiKey) {
      try {
        const translationMap = {};
        await Promise.all(allDishNames.map(async (name) => {
          try {
            const resp = await fetch('https://api.sarvam.ai/translate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'api-subscription-key': apiKey },
              body: JSON.stringify({
                input: name,
                source_language_code: 'en-IN',
                target_language_code: langCode,
                speaker_gender: 'Female',
                mode: 'formal',
                model: 'mayura:v1',
                enable_preprocessing: false,
              }),
            });
            const data = await resp.json();
            if (data.translated_text) translationMap[name] = data.translated_text;
          } catch { /* keep original */ }
        }));
        getDish = (name) => (name ? (translationMap[name] || name) : '');
      } catch { /* fall through */ }
    }
  }

  // ── Table helpers ─────────────────────────────────────────────────────────
  const hdr = (text) => ({
    text, bold: true, fontSize: 9, color: '#FFFFFF',
    fillColor: '#2E5480', alignment: 'center', margin: [4, 5, 4, 5],
  });

  const cell = (content, fillColor) => ({ ...content, fillColor, margin: [4, 4, 4, 4] });

  // ── Build table rows ───────────────────────────────────────────────────────
  const tableBody = [[
    hdr('Day'), hdr('Breakfast'), hdr('Lunch'), hdr('Dinner'), hdr('Supporting'), hdr('Evening'),
  ]];

  days.forEach((day, rowIndex) => {
    const a        = day.anatomy || {};
    const dayDate  = new Date(day.date);
    const isValid  = !isNaN(dayDate.getTime());
    const isSunday   = isValid && dayDate.getDay() === 0;
    const isSaturday = isValid && dayDate.getDay() === 6;
    const rowFill  = isSunday ? '#E8F5E9' : isSaturday ? '#FFFDE7' : (rowIndex % 2 === 0 ? '#FFFFFF' : '#F8F8F8');

    const dayLabel = isValid
      ? dayDate.toLocaleDateString('en-GB', { weekday: 'long' }) + '\n' +
        dayDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      : (day.day || `Day ${rowIndex + 1}`);

    const lc1 = getDish(a.lunch?.curry?.[0]?.dishName);
    const lc2 = getDish(a.lunch?.curry?.[1]?.dishName);
    const dc1 = getDish(a.dinner?.curry?.[0]?.dishName);
    const dc2 = getDish(a.dinner?.curry?.[1]?.dishName);

    tableBody.push([
      cell({ text: dayLabel, bold: true, fontSize: 9, color: '#2E5480' }, rowFill),
      cell({ text: getDish(a.breakfast?.dishName) || '—', fontSize: 9 }, rowFill),
      cell({ stack: [
        { text: lc1 || '—', bold: true, fontSize: 9 },
        { text: '+ ' + (lc2 || '—'), fontSize: 8, color: '#5A7A8A', marginTop: 2 },
      ]}, rowFill),
      cell({ stack: [
        { text: dc1 || '—', bold: true, fontSize: 9 },
        { text: '+ ' + (dc2 || '—'), fontSize: 8, color: '#5A7A8A', marginTop: 2 },
      ]}, rowFill),
      cell({ stack: [
        { text: [{ text: 'VEG  ', fontSize: 7, color: '#5A7A8A' },   { text: getDish(a.lunch?.veg?.dishName)   || '—', fontSize: 8 }] },
        { text: [{ text: 'RAITA  ', fontSize: 7, color: '#5A7A8A' }, { text: getDish(a.lunch?.raita?.dishName) || '—', fontSize: 8 }], marginTop: 1 },
        { text: [{ text: 'BREAD  ', fontSize: 7, color: '#5A7A8A' }, { text: getDish(a.lunch?.bread?.dishName) || '—', fontSize: 8 }], marginTop: 1 },
        { text: [{ text: 'RICE  ', fontSize: 7, color: '#5A7A8A' },  { text: getDish(a.lunch?.rice?.dishName)  || '—', fontSize: 8 }], marginTop: 1 },
      ]}, rowFill),
      cell({ text: getDish(a.snack?.dishName) || '—', fontSize: 9 }, rowFill),
    ]);
  });

  // ── Header columns ─────────────────────────────────────────────────────────
  // LEFT: family name + date range
  const leftStack = [
    { text: familyName,                                   fontSize: 22, bold: true, color: '#2E5480', alignment: 'left' },
    { text: fmtDate(dateFrom) + ' — ' + fmtDate(dateTo), fontSize: 11,             color: '#5A7A8A', alignment: 'left' },
  ];
  if (planSummaryLanguage && planSummaryLanguage !== 'English' && planSummaryLanguage !== 'en') {
    leftStack.push({ text: planSummaryLanguage, fontSize: 9, color: '#5A7A8A', italics: true, alignment: 'left' });
  }

  // CENTRE: Maharaj logo (120px) + title
  const centreStack = [];
  if (maharajLogo) centreStack.push({ image: `data:image/png;base64,${maharajLogo}`, width: 120, alignment: 'center' });
  centreStack.push({ text: 'My Maharaj',            fontSize: 20, bold: true, color: '#2E5480', alignment: 'center' });
  centreStack.push({ text: 'Your Family Meal Plan',  fontSize: 11,             color: '#C9A227', alignment: 'center' });

  // RIGHT: BFC logo + QR
  const rightStack = [];
  if (bfcLogo)  rightStack.push({ image: `data:image/png;base64,${bfcLogo}`, width: 130, alignment: 'right' });
  if (qrBase64) rightStack.push({ image: `data:image/png;base64,${qrBase64}`, width: 55, marginTop: 6, alignment: 'right' });

  // ── Document definition ────────────────────────────────────────────────────
  const docDefinition = {
    pageSize:        'A4',
    pageOrientation: 'landscape',
    pageMargins:     [20, 20, 20, 40],

    footer: (currentPage, pageCount) => ({
      columns: [
        { text: 'My Maharaj · Blue Flute Consulting LLC-FZ · Dubai', fontSize: 8, color: '#5A7A8A', margin: [20, 0, 0, 0] },
        { text: `Page ${currentPage} of ${pageCount}`,               fontSize: 8, color: '#5A7A8A', alignment: 'right', margin: [0, 0, 20, 0] },
      ],
      margin: [0, 5, 0, 0],
    }),

    content: [
      // Three-column header
      {
        columns: [
          { width: 160, stack: leftStack },
          { width: '*', stack: centreStack, alignment: 'center' },
          { width: 160, stack: rightStack },
        ],
      },
      // Gold rule
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 801, y2: 0, lineWidth: 2, lineColor: '#C9A227' }], margin: [0, 8, 0, 8] },
      // Meal table
      {
        table: {
          widths:     [70, 100, 150, 150, 231, 100],
          body:       tableBody,
          headerRows: 1,
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#E0E0E0',
          vLineColor: () => '#E0E0E0',
        },
      },
    ],

    defaultStyle: { font: 'Roboto' },
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  try {
    const pdfOutput = pdfmake.createPdf(docDefinition);
    const buffer = await pdfOutput.getBuffer();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="MyMaharaj_MealPlan.pdf"');
    res.send(buffer);
  } catch (e) {
    console.error('[generate-pdf] pdfmake error:', e);
    res.status(500).json({ error: e.message });
  }
};
