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
    type,
    content,
  } = req.body ?? {};

  // ── QR code ────────────────────────────────────────────────────────────────
  let qrBase64 = '';
  try {
    const qrRes    = await fetch('https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=https://www.my-maharaj.com');
    const qrBuffer = await qrRes.arrayBuffer();
    qrBase64       = Buffer.from(qrBuffer).toString('base64');
  } catch { /* optional */ }

  // ── Date formatter (pure string — no Date() to avoid timezone drift) ───────
  const fmtDate = (d) => {
    if (!d) return '';
    const parts = String(d).split('-');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return String(d);
  };
  const todayFormatted = (() => {
    const t = new Date();
    const dd = String(t.getUTCDate()).padStart(2, '0');
    const mm = String(t.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = t.getUTCFullYear();
    return `${dd}-${mm}-${yyyy}`;
  })();

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
  // LEFT: family name + list date + plan date range
  const planDateText = (dateFrom && dateTo && dateFrom !== dateTo)
    ? `List for plan from: ${fmtDate(dateFrom)} to ${fmtDate(dateTo)}`
    : `List for plan: ${fmtDate(dateFrom || dateTo)}`;
  const leftStack = [
    { text: familyName,    fontSize: 22, bold: true, color: '#2E5480', alignment: 'left' },
    { text: `List date: ${todayFormatted}`, fontSize: 11, color: '#5A7A8A', alignment: 'left' },
    { text: planDateText,  fontSize: 13,             color: '#2E5480', alignment: 'left' },
  ];
  if (planSummaryLanguage && planSummaryLanguage !== 'English' && planSummaryLanguage !== 'en') {
    leftStack.push({ text: planSummaryLanguage, fontSize: 9, color: '#5A7A8A', italics: true, alignment: 'left' });
  }

  // CENTRE: Maharaj logo (160px) + title
  const centreStack = [];
  if (maharajLogo) centreStack.push({ image: `data:image/png;base64,${maharajLogo}`, width: 160, alignment: 'center' });
  centreStack.push({ text: 'My Maharaj',               fontSize: 20, bold: true, color: '#2E5480', alignment: 'center' });
  centreStack.push({ text: 'Your personal meal planner', fontSize: 11,             color: '#C9A227', alignment: 'center' });

  // RIGHT: BFC logo + QR (both centred so QR sits on same vertical axis as BFC logo)
  const rightStack = [];
  if (bfcLogo)  rightStack.push({ image: `data:image/png;base64,${bfcLogo}`, width: 130, alignment: 'center' });
  if (qrBase64) rightStack.push({ image: `data:image/png;base64,${qrBase64}`, width: 55, marginTop: 6, alignment: 'center' });

  // ── Party Menu PDF (early return) ────────────────────────────────────────
  if (type === 'party') {
    const partyDate     = req.body.date     || '';
    const partyOccasion = req.body.occasion || '';

    // LEFT: family name + party date + occasion
    const partyLeftStack = [
      { text: familyName,                                    fontSize: 22, bold: true, color: '#2E5480', alignment: 'left' },
      { text: partyDate ? `Party date: ${partyDate}` : '',  fontSize: 11,             color: '#5A7A8A', alignment: 'left' },
      { text: partyOccasion,                                 fontSize: 13,             color: '#2E5480', alignment: 'left' },
    ];

    const SECTION_ORDER = ['starters', 'riceAndBread', 'curries', 'accompaniments', 'desserts'];
    const SECTION_TITLES = {
      starters:       'Starters',
      riceAndBread:   'Rice & Bread',
      curries:        'Curries',
      accompaniments: 'Accompaniments',
      desserts:       'Desserts',
    };

    const partyBody = [
      // Three-column brand header
      {
        columns: [
          { width: 160, stack: partyLeftStack, margin: [0, 50, 0, 0] },
          { width: '*', stack: centreStack,    alignment: 'center' },
          { width: 160, stack: rightStack,     margin: [0, 24, 0, 0] },
        ],
      },
      // Gold rule
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 595, y2: 0, lineWidth: 2, lineColor: '#C9A227' }], margin: [0, 8, 0, 8] },
    ];

    const sectionData = content || {};
    SECTION_ORDER.forEach(key => {
      const items = sectionData[key];
      if (!items || items.length === 0) return;
      partyBody.push({ text: SECTION_TITLES[key], fontSize: 13, bold: true, color: '#2E5480', margin: [0, 12, 0, 6] });
      partyBody.push({
        table: {
          widths: ['*', '*', 40],
          body: items.map(dish => [
            { text: dish.name || '',  fontSize: 11, bold: true, color: '#2E5480' },
            { text: dish.note || '',  fontSize: 10,             color: '#5A7A8A' },
            { text: '\u25cf',        fontSize: 10, color: dish.isVeg ? '#1E9E5E' : '#E24B4A', alignment: 'center' },
          ]),
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0,
          hLineColor: () => '#E0E0E0',
        },
        margin: [0, 0, 0, 4],
      });
    });

    const partyDoc = {
      pageSize:    'A4',
      pageMargins: [40, 40, 40, 40],
      footer: (currentPage, pageCount) => ({
        columns: [
          { text: 'My Maharaj · Blue Flute Consulting LLC-FZ · Dubai', fontSize: 8, color: '#5A7A8A', margin: [20, 0, 0, 0] },
          { text: `Page ${currentPage} of ${pageCount}`,               fontSize: 8, color: '#5A7A8A', alignment: 'right', margin: [0, 0, 20, 0] },
        ],
        margin: [0, 5, 0, 0],
      }),
      content:      partyBody,
      defaultStyle: { font: 'Roboto' },
    };

    try {
      const pdfOut  = pdfmake.createPdf(partyDoc);
      const buf     = await pdfOut.getBuffer();
      const dateStr = partyDate.split('-').join('');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="maharaj-party-menu-${dateStr}.pdf"`);
      return res.send(buf);
    } catch (e) {
      console.error('[generate-pdf] party error:', e);
      return res.status(500).json({ error: e.message });
    }
  }

  // ── Outdoor Group / Corporate PDF (early return) ─────────────────────────
  if (type === 'outdoor-group') {
    const { occasion: evtOccasion = '', date: evtDate = '', people: evtPeople = '', dietary: evtDietary = '',
            summary: evtSummary = '', starters = [], mains = [], accompaniments = [], notes: evtNotes = [] } = req.body;

    const outdoorLeftStack = [
      { text: familyName,                                              fontSize: 22, bold: true, color: '#2E5480', alignment: 'left' },
      { text: evtDate ? `Event date: ${evtDate}` : '',                fontSize: 11,             color: '#5A7A8A', alignment: 'left' },
      { text: evtOccasion,                                             fontSize: 13,             color: '#2E5480', alignment: 'left' },
    ];

    const outdoorBody = [
      {
        columns: [
          { width: 160, stack: outdoorLeftStack, margin: [0, 50, 0, 0] },
          { width: '*', stack: centreStack,      alignment: 'center' },
          { width: 160, stack: rightStack,       margin: [0, 24, 0, 0] },
        ],
      },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 595, y2: 0, lineWidth: 2, lineColor: '#C9A227' }], margin: [0, 8, 0, 8] },
    ];

    if (evtPeople || evtDietary) {
      outdoorBody.push({ text: [evtPeople ? `${evtPeople} people` : '', evtPeople && evtDietary ? '  \u2022  ' : '', evtDietary || ''].join(''), fontSize: 11, color: '#5A7A8A', margin: [0, 0, 0, 4] });
    }
    if (evtSummary) {
      outdoorBody.push({ text: evtSummary, fontSize: 10, color: '#5A7A8A', margin: [0, 0, 0, 10], italics: true });
    }

    const OUTDOOR_SECTIONS = [
      { key: 'starters',        title: 'Starters',        items: starters },
      { key: 'mains',           title: 'Mains',           items: mains },
      { key: 'accompaniments',  title: 'Accompaniments',  items: accompaniments },
    ];

    OUTDOOR_SECTIONS.forEach(({ title, items }) => {
      if (!items || items.length === 0) return;
      outdoorBody.push({ text: title, fontSize: 13, bold: true, color: '#2E5480', margin: [0, 10, 0, 4] });
      outdoorBody.push({
        table: {
          widths: ['*', '*', 40],
          body: items.map(dish => [
            { text: dish.dishName || '', fontSize: 11, bold: true, color: '#2E5480' },
            { text: dish.note    || '', fontSize: 10,             color: '#5A7A8A' },
            { text: '\u25cf',           fontSize: 10, color: dish.isVeg ? '#1E9E5E' : '#E24B4A', alignment: 'center' },
          ]),
        },
        layout: { hLineWidth: () => 0.5, vLineWidth: () => 0, hLineColor: () => '#E0E0E0' },
        margin: [0, 0, 0, 4],
      });
    });

    if (evtNotes && evtNotes.length > 0) {
      outdoorBody.push({ text: 'Notes', fontSize: 13, bold: true, color: '#2E5480', margin: [0, 10, 0, 4] });
      evtNotes.forEach(n => {
        outdoorBody.push({ text: `\u2022  ${n}`, fontSize: 10, color: '#5A7A8A', margin: [8, 1, 0, 1] });
      });
    }

    const outdoorDoc = {
      pageSize: 'A4', pageMargins: [40, 40, 40, 40],
      footer: (currentPage, pageCount) => ({
        columns: [
          { text: 'My Maharaj · Blue Flute Consulting LLC-FZ · Dubai', fontSize: 8, color: '#5A7A8A', margin: [20, 0, 0, 0] },
          { text: `Page ${currentPage} of ${pageCount}`,               fontSize: 8, color: '#5A7A8A', alignment: 'right', margin: [0, 0, 20, 0] },
        ],
        margin: [0, 5, 0, 0],
      }),
      content: outdoorBody,
      defaultStyle: { font: 'Roboto' },
    };

    try {
      const pdfOut = pdfmake.createPdf(outdoorDoc);
      const buf    = await pdfOut.getBuffer();
      const dateStr = evtDate.split('-').join('');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="maharaj-outdoor-${dateStr || 'menu'}.pdf"`);
      return res.send(buf);
    } catch (e) {
      console.error('[generate-pdf] outdoor-group error:', e);
      return res.status(500).json({ error: e.message });
    }
  }

  // ── Outdoor Canteen PDF (early return) ────────────────────────────────────
  if (type === 'outdoor-canteen') {
    const { coversPerDay = '', cuisinePref = '', day1 = {}, day2 = {}, notes: cNotes = [] } = req.body;

    const canteenLeftStack = [
      { text: familyName,                                           fontSize: 22, bold: true, color: '#2E5480', alignment: 'left' },
      { text: '2-Day Rotating Canteen Menu',                        fontSize: 13,             color: '#2E5480', alignment: 'left' },
      { text: [coversPerDay ? `${coversPerDay} covers/day` : '', coversPerDay && cuisinePref ? '  \u2022  ' : '', cuisinePref || ''].join(''), fontSize: 11, color: '#5A7A8A', alignment: 'left' },
    ];

    const canteenBody = [
      {
        columns: [
          { width: 160, stack: canteenLeftStack, margin: [0, 50, 0, 0] },
          { width: '*', stack: centreStack,      alignment: 'center' },
          { width: 160, stack: rightStack,       margin: [0, 24, 0, 0] },
        ],
      },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 595, y2: 0, lineWidth: 2, lineColor: '#C9A227' }], margin: [0, 8, 0, 8] },
    ];

    const SLOT_ORDER = ['breakfast', 'lunch', 'dinner', 'snacks'];
    const SLOT_TITLES = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snacks: 'Snacks' };

    [{ label: 'Day 1', data: day1 }, { label: 'Day 2', data: day2 }].forEach(({ label, data }) => {
      canteenBody.push({ text: label, fontSize: 14, bold: true, color: '#2E5480', margin: [0, 12, 0, 6] });
      SLOT_ORDER.forEach(slot => {
        const items = data[slot];
        if (!items || items.length === 0) return;
        canteenBody.push({ text: SLOT_TITLES[slot], fontSize: 11, bold: true, color: '#1A6B5C', margin: [0, 4, 0, 2] });
        canteenBody.push({
          table: {
            widths: ['*', '*', 40],
            body: items.map(dish => [
              { text: dish.dishName || '', fontSize: 11, bold: true, color: '#2E5480' },
              { text: dish.note    || '', fontSize: 10,             color: '#5A7A8A' },
              { text: '\u25cf',           fontSize: 10, color: dish.isVeg ? '#1E9E5E' : '#E24B4A', alignment: 'center' },
            ]),
          },
          layout: { hLineWidth: () => 0.5, vLineWidth: () => 0, hLineColor: () => '#E0E0E0' },
          margin: [0, 0, 0, 4],
        });
      });
    });

    if (cNotes && cNotes.length > 0) {
      canteenBody.push({ text: 'Notes', fontSize: 13, bold: true, color: '#2E5480', margin: [0, 10, 0, 4] });
      cNotes.forEach(n => {
        canteenBody.push({ text: `\u2022  ${n}`, fontSize: 10, color: '#5A7A8A', margin: [8, 1, 0, 1] });
      });
    }

    const canteenDoc = {
      pageSize: 'A4', pageMargins: [40, 40, 40, 40],
      footer: (currentPage, pageCount) => ({
        columns: [
          { text: 'My Maharaj · Blue Flute Consulting LLC-FZ · Dubai', fontSize: 8, color: '#5A7A8A', margin: [20, 0, 0, 0] },
          { text: `Page ${currentPage} of ${pageCount}`,               fontSize: 8, color: '#5A7A8A', alignment: 'right', margin: [0, 0, 20, 0] },
        ],
        margin: [0, 5, 0, 0],
      }),
      content: canteenBody,
      defaultStyle: { font: 'Roboto' },
    };

    try {
      const pdfOut = pdfmake.createPdf(canteenDoc);
      const buf    = await pdfOut.getBuffer();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="maharaj-canteen-menu.pdf"');
      return res.send(buf);
    } catch (e) {
      console.error('[generate-pdf] outdoor-canteen error:', e);
      return res.status(500).json({ error: e.message });
    }
  }

  // ── Grocery PDF (early return) ────────────────────────────────────────────
  if (type === 'grocery') {
    const groceryContent = [
      // Shared brand header
      {
        columns: [
          { width: 160, stack: leftStack,   margin: [0, 50, 0, 0] },
          { width: '*', stack: centreStack, alignment: 'center' },
          { width: 160, stack: rightStack,  margin: [0, 24, 0, 0] },
        ],
      },
      // Gold rule
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 595, y2: 0, lineWidth: 2, lineColor: '#C9A227' }], margin: [0, 8, 0, 8] },
      // Title
      { text: 'Shopping List', fontSize: 18, bold: true, color: '#2E5480', margin: [0, 0, 0, 14] },
    ];
    // Category blocks
    (content?.categories ?? []).forEach(cat => {
      groceryContent.push({ text: cat.name, fontSize: 14, bold: true, color: '#2E5480', margin: [0, 8, 0, 4] });
      (cat.items ?? []).forEach(item => {
        const qty = [item.quantity, item.unit].filter(Boolean).join(' ');
        const label = qty ? `${qty}  ${item.name}` : item.name;
        groceryContent.push({ text: `\u2022  ${label}`, fontSize: 11, margin: [8, 1, 0, 1] });
      });
    });
    const groceryDoc = {
      pageSize:      'A4',
      pageMargins:   [30, 20, 30, 40],
      footer: (currentPage, pageCount) => ({
        columns: [
          { text: 'My Maharaj · Blue Flute Consulting LLC-FZ · Dubai', fontSize: 8, color: '#5A7A8A', margin: [20, 0, 0, 0] },
          { text: `Page ${currentPage} of ${pageCount}`, fontSize: 8, color: '#5A7A8A', alignment: 'right', margin: [0, 0, 20, 0] },
        ],
        margin: [0, 5, 0, 0],
      }),
      content: groceryContent,
      defaultStyle: { font: 'Roboto' },
    };
    try {
      const pdfOut = pdfmake.createPdf(groceryDoc);
      const buf = await pdfOut.getBuffer();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="MyMaharaj_ShoppingList.pdf"');
      return res.send(buf);
    } catch (e) {
      console.error('[generate-pdf] grocery error:', e);
      return res.status(500).json({ error: e.message });
    }
  }

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
          { width: 160, stack: leftStack,  margin: [0, 50, 0, 0] },
          { width: '*', stack: centreStack, alignment: 'center' },
          { width: 160, stack: rightStack, margin: [0, 24, 0, 0] },
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
