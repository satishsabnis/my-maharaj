require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// ─── 60 Goan dishes ───────────────────────────────────────────────────────────
// Distribution: 10 breakfast | 15 lunch_curry | 15 dinner_curry |
//               8 veg_side | 4 rice | 4 bread | 2 raita | 2 snack
//
// Note: 3 Sunday specials carry slot ['lunch_curry','dinner_curry'].
// Total unique rows = 57. Slot verification shows lunch_curry:15, dinner_curry:15
// because each Sunday dish contributes to both counts.

const dishes = [

  // ── BREAKFAST (10) ──────────────────────────────────────────────────────────

  {
    name: 'Sannas',
    name_hindi: null,
    name_regional: 'सान्नस',
    description: 'Soft steamed fermented rice and coconut cakes — the Goan equivalent of idli, eaten with curry or coconut chutney.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['breakfast'],
    is_veg: true, is_vegan: true, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Alle Belle',
    name_hindi: null,
    name_regional: 'आळे बेळे',
    description: 'Thin coconut milk crepes filled with palm jaggery and fresh grated coconut — a traditional Goan Catholic breakfast sweet.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['breakfast'],
    is_veg: true, is_vegan: false, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday', 'festival'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Appa',
    name_hindi: null,
    name_regional: 'आप्पा',
    description: 'Fermented rice and coconut pancakes — a Goan Hindu breakfast, slightly thicker than panna, eaten with coconut chutney or sambar.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['breakfast'],
    is_veg: true, is_vegan: true, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Panna',
    name_hindi: null,
    name_regional: 'पन्ना',
    description: 'Paper-thin plain rice flour pancakes cooked on a flat tawa — a Goan breakfast crepe served with coconut chutney.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['breakfast'],
    is_veg: true, is_vegan: true, is_jain: true, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Undde',
    name_hindi: null,
    name_regional: 'उंड्डे',
    description: 'Slightly sweet soft Goan bread rolls made with coconut toddy or yeast — eaten warm with butter or Goan curry.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['breakfast'],
    is_veg: true, is_vegan: false, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Goan Bread Omelette',
    name_hindi: null,
    name_regional: null,
    description: 'Spiced egg omelette with green chilli and onion served between slices of toasted Goan pav — a quick Goan street breakfast.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['breakfast'],
    is_veg: false, is_vegan: false, is_jain: false, is_fasting: false, is_street: true,
    is_non_veg_type: 'egg', allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Chana Ros Puri',
    name_hindi: null,
    name_regional: null,
    description: 'Goan chickpea curry in a coconut and tamarind gravy served with crispy puris — a filling Hindu Goan breakfast.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['breakfast'],
    is_veg: true, is_vegan: true, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Goan Sheera',
    name_hindi: null,
    name_regional: 'शीरो',
    description: 'Semolina sweet pudding made with coconut milk, jaggery, and cardamom — a Goan Hindu prasad and festive breakfast.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['breakfast'],
    is_veg: true, is_vegan: false, is_jain: true, is_fasting: true, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday', 'festival'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Goan Egg Bhurji Pav',
    name_hindi: null,
    name_regional: null,
    description: 'Scrambled eggs cooked Goan style with onion, green chilli, and coriander served with soft Goan pav — a popular morning street dish.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['breakfast'],
    is_veg: false, is_vegan: false, is_jain: false, is_fasting: false, is_street: true,
    is_non_veg_type: 'egg', allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Coconut Poha',
    name_hindi: null,
    name_regional: 'नारळाचे पोहे',
    description: 'Flattened rice tossed with freshly grated coconut, green chilli, mustard seeds, and curry leaves — a light Goan coastal breakfast.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['breakfast'],
    is_veg: true, is_vegan: true, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },

  // ── LUNCH CURRY — everyday (12) ─────────────────────────────────────────────

  {
    name: 'Goan Fish Curry',
    name_hindi: 'गोवन मछली करी',
    name_regional: 'मासोळीचे कड्डण',
    description: 'The definitive Goan curry — fish cooked in a thin coconut milk and dried red chilli gravy soured with kokum, eaten over xitt.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['lunch_curry'],
    is_veg: false, is_vegan: false, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: 'fish', allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Goan Prawn Curry',
    name_hindi: null,
    name_regional: 'कोळंबीचे कड्डण',
    description: 'Prawns cooked in a rich coconut milk gravy with dried red chillies and kokum — an everyday Goan lunch staple.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['lunch_curry'],
    is_veg: false, is_vegan: false, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: 'prawn', allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Chicken Cafreal',
    name_hindi: null,
    name_regional: 'कॅफ्रिअल',
    description: 'Chicken marinated in a vibrant green herb paste of coriander, mint, garlic, and Goan spices then pan-fried or grilled — a Goan-Portuguese speciality.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['lunch_curry'],
    is_veg: false, is_vegan: false, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: 'chicken', allowed_days: [], occasion: ['everyday', 'party'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Recheado Bangda',
    name_hindi: null,
    name_regional: 'रेचेयाडो बांगडो',
    description: 'Mackerel slit and stuffed with fiery Goan recheado red masala then pan-fried crispy — the most iconic Goan stuffed fish dish.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['lunch_curry'],
    is_veg: false, is_vegan: false, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: 'fish', allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Goan Fish Caldine',
    name_hindi: null,
    name_regional: 'कल्दिन्हा',
    description: 'Mild yellow coconut milk fish curry from Goa with turmeric, green chilli, and very little heat — the gentler counterpart to the fiery Goan fish curry.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['lunch_curry'],
    is_veg: false, is_vegan: false, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: 'fish', allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Mushroom Xacuti',
    name_hindi: null,
    name_regional: null,
    description: 'Mushrooms cooked in the complex Goan xacuti masala of roasted coconut, poppy seeds, and whole spices — the most popular Goan vegetarian curry.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['lunch_curry'],
    is_veg: true, is_vegan: true, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Tonak Masala',
    name_hindi: null,
    name_regional: 'टोनक',
    description: 'Dried yellow peas cooked in a roasted coconut and Goan spice gravy — an everyday Goan Hindu vegetarian lunch curry.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['lunch_curry'],
    is_veg: true, is_vegan: true, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Tisreo Sukhe',
    name_hindi: null,
    name_regional: 'तिसऱ्यो सुके',
    description: 'Clams tossed dry with fresh coconut, green chilli, garlic, and Goan spices — a classic Goan coastal seafood preparation.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['lunch_curry'],
    is_veg: false, is_vegan: false, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: 'fish', allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Shark Ambotik',
    name_hindi: null,
    name_regional: 'मोरी आंबोटीक',
    description: 'Shark pieces cooked in a sour-spicy Goan curry with kokum, red chillies, and vinegar — a bold, uniquely Goan Catholic fish dish.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['lunch_curry'],
    is_veg: false, is_vegan: false, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: 'fish', allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Chicken Vindaloo Goan',
    name_hindi: null,
    name_regional: 'विंदालू',
    description: 'Chicken marinated and cooked in a fiery Goan vindaloo masala of vinegar, dried red chillies, and garlic — the most famous Goan Catholic curry.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['lunch_curry'],
    is_veg: false, is_vegan: false, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: 'chicken', allowed_days: [], occasion: ['everyday', 'party'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Goan Vegetable Caldine',
    name_hindi: null,
    name_regional: null,
    description: 'Mixed vegetables in a mild yellow coconut milk curry with turmeric and green chilli — the vegetarian Goan caldine served over rice.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['lunch_curry'],
    is_veg: true, is_vegan: true, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Goan Egg Masala',
    name_hindi: null,
    name_regional: null,
    description: 'Hard-boiled eggs simmered in a Goan coconut-tomato masala spiced with recheado — a quick everyday Goan non-veg lunch.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['lunch_curry'],
    is_veg: false, is_vegan: false, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: 'egg', allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },

  // ── DINNER CURRY — everyday (12) ────────────────────────────────────────────

  {
    name: 'Pomfret Recheado',
    name_hindi: null,
    name_regional: 'पापलेट रेचेयाडो',
    description: 'Whole pomfret slit and generously packed with Goan recheado red masala then pan-fried — a prized Goan dinner fish dish.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['dinner_curry'],
    is_veg: false, is_vegan: false, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: 'fish', allowed_days: [], occasion: ['everyday', 'party'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Goan Prawn Balchao',
    name_hindi: null,
    name_regional: 'बालचाओ',
    description: 'Prawns preserved and cooked in a fiery sweet-sour vinegar and red chilli pickle masala — the Goan answer to a spicy prawn condiment curry.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['dinner_curry'],
    is_veg: false, is_vegan: false, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: 'prawn', allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Goan Mutton Xacuti',
    name_hindi: null,
    name_regional: 'मटण शागुती',
    description: 'Mutton slow-cooked in the complex Goan xacuti spice paste of roasted coconut, poppy seeds, and whole spices — rich and deeply flavoured.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['dinner_curry'],
    is_veg: false, is_vegan: false, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: 'mutton', allowed_days: [], occasion: ['everyday', 'party'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Kingfish Ambot Tik',
    name_hindi: null,
    name_regional: 'सुरमई आंबोटीक',
    description: 'Kingfish steaks in a classic Goan sour-hot curry made with kokum, red chillies, and garlic — ambot means sour, tik means spicy.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['dinner_curry'],
    is_veg: false, is_vegan: false, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: 'fish', allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Goan Crab Masala',
    name_hindi: null,
    name_regional: 'खेकड्याचे कड्डण',
    description: 'Whole crabs cooked in a spiced coconut masala with dried red chillies and kokum — a prized Goan coastal dinner dish.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['dinner_curry'],
    is_veg: false, is_vegan: false, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: 'fish', allowed_days: [], occasion: ['everyday', 'party'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Goan Birde',
    name_hindi: null,
    name_regional: 'बिर्डे',
    description: 'Dried black-eyed peas cooked in a coconut and Goan spice gravy — an everyday Goan Hindu vegetarian dinner curry.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['dinner_curry'],
    is_veg: true, is_vegan: true, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Goan Mushroom Masala',
    name_hindi: null,
    name_regional: null,
    description: 'Mushrooms cooked in a simple Goan onion-coconut masala with green chilli — a quick vegetarian dinner curry.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['dinner_curry'],
    is_veg: true, is_vegan: true, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Goan Chana Tonak',
    name_hindi: null,
    name_regional: 'चणे टोनक',
    description: 'Chickpeas cooked in a roasted coconut and Goan masala gravy — a hearty Goan vegetarian dinner curry with good depth of flavour.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['dinner_curry'],
    is_veg: true, is_vegan: true, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Chicken Chilly Fry Goan',
    name_hindi: null,
    name_regional: null,
    description: 'Chicken pieces tossed with onion, capsicum, green chilli, and Goan spices in a dry-ish preparation — a popular Goan Catholic dinner dish.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['dinner_curry'],
    is_veg: false, is_vegan: false, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: 'chicken', allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Goan Egg Xacuti',
    name_hindi: null,
    name_regional: null,
    description: 'Hard-boiled eggs simmered in rich Goan xacuti masala of roasted coconut and whole spices — a flavourful egg dinner curry.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['dinner_curry'],
    is_veg: false, is_vegan: false, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: 'egg', allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Goan Drumstick Curry',
    name_hindi: null,
    name_regional: 'शेवग्याचे कड्डण',
    description: 'Drumstick pieces cooked in a thin coconut curry with green chilli and turmeric — a simple and nourishing Goan vegetarian dinner.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['dinner_curry'],
    is_veg: true, is_vegan: true, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Goan Moong Dal Saar',
    name_hindi: null,
    name_regional: 'मुगाचे सार',
    description: 'Thin Goan moong dal soup tempered with coconut oil, mustard, and curry leaves — a light and digestive Goan dinner accompaniment.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['dinner_curry'],
    is_veg: true, is_vegan: false, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },

  // ── SUNDAY SPECIALS — slot: ['lunch_curry','dinner_curry'] ──────────────────

  {
    name: 'Chicken Xacuti',
    name_hindi: null,
    name_regional: 'चिकन शागुती',
    description: 'Chicken cooked in the iconic Goan xacuti masala of roasted coconut, poppy seeds, star anise, and whole spices — the Goan Sunday centrepiece.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['lunch_curry', 'dinner_curry'],
    is_veg: false, is_vegan: false, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: 'chicken', allowed_days: ['Sunday'], occasion: ['everyday', 'party'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Prawn Masala Goan',
    name_hindi: null,
    name_regional: 'कोळंबी मसाला',
    description: 'Prawns cooked in a thick Goan coconut masala with dried red chillies, kokum, and onion — the definitive Goan prawn Sunday dish.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['lunch_curry', 'dinner_curry'],
    is_veg: false, is_vegan: false, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: 'prawn', allowed_days: ['Sunday'], occasion: ['everyday', 'party'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Pomfret Rava Fry',
    name_hindi: null,
    name_regional: 'पापलेट रावा फ्राय',
    description: 'Pomfret marinated in recheado masala, coated in semolina, and shallow-fried crispy — the most celebrated Goan fried fish, a Sunday special.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['lunch_curry', 'dinner_curry'],
    is_veg: false, is_vegan: false, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: 'fish', allowed_days: ['Sunday'], occasion: ['everyday', 'party'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },

  // ── VEG SIDE (8) ────────────────────────────────────────────────────────────

  {
    name: 'Bhendi Fougath',
    name_hindi: null,
    name_regional: 'भेंडी फुगाथ',
    description: 'Okra dry stir-fried Goan style with mustard seeds, coconut, and curry leaves — fougath is the Goan method of dry-cooking vegetables.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['veg_side'],
    is_veg: true, is_vegan: true, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Batata Sukhe',
    name_hindi: null,
    name_regional: 'बटाटे सुके',
    description: 'Dry potato preparation tossed with coconut, turmeric, mustard seeds, and green chilli — a simple Goan everyday vegetable side.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['veg_side'],
    is_veg: true, is_vegan: true, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Tendle Fougath',
    name_hindi: null,
    name_regional: 'तोंडलीचे फुगाथ',
    description: 'Ivy gourd stir-fried with fresh coconut, mustard seeds, and curry leaves in the Goan fougath style — a coastal Goan everyday side.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['veg_side'],
    is_veg: true, is_vegan: true, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Vaingem Bhaji Goan',
    name_hindi: null,
    name_regional: 'वांगे भाजी',
    description: 'Brinjal cooked Goan Hindu style with coconut, mustard, and a light spiced masala — a simple everyday Goan vegetable side.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['veg_side'],
    is_veg: true, is_vegan: true, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Dudhe Ghashi',
    name_hindi: null,
    name_regional: 'दुदे घाशी',
    description: 'Ash gourd or pumpkin cooked in a thin coconut milk gravy with dried red chillies — a Goan Hindu vegetable curry side.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['veg_side'],
    is_veg: true, is_vegan: true, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Fanasachi Bhaji',
    name_hindi: null,
    name_regional: 'फणसाची भाजी',
    description: 'Raw green jackfruit cooked with coconut, red chillies, and Goan spices — a seasonal Goan vegetable preparation eaten in summer.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['veg_side'],
    is_veg: true, is_vegan: true, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Mushroom Fougath',
    name_hindi: null,
    name_regional: null,
    description: 'Mushrooms stir-fried Goan style with coconut, green chilli, and curry leaves — a popular modern Goan vegetable side.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['veg_side'],
    is_veg: true, is_vegan: true, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Colocasia Patal Bhaji',
    name_hindi: null,
    name_regional: 'आळूचे पान भाजी',
    description: 'Taro leaves cooked with coconut, tamarind, and Goan spices — a traditional Goan vegetable side using the whole colocasia plant.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['veg_side'],
    is_veg: true, is_vegan: true, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },

  // ── RICE (4) ────────────────────────────────────────────────────────────────

  {
    name: 'Xitt',
    name_hindi: null,
    name_regional: 'शीत',
    description: 'Plain steamed Goan parboiled red rice — the everyday foundation of every Goan meal, eaten with fish curry and vegetable sides.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['rice'],
    is_veg: true, is_vegan: true, is_jain: true, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Goan Prawn Pulao',
    name_hindi: null,
    name_regional: 'कोळंबी पुलाव',
    description: 'Fragrant rice cooked with prawns, whole spices, and coconut milk — a festive Goan one-pot rice dish.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['rice'],
    is_veg: false, is_vegan: false, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: 'prawn', allowed_days: [], occasion: ['party', 'everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Goan Coconut Rice',
    name_hindi: null,
    name_regional: null,
    description: 'Steamed rice cooked with fresh coconut, curry leaves, and a mustard-dried red chilli tempering — a simple fragrant Goan rice.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['rice'],
    is_veg: true, is_vegan: true, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Goan Vegetable Pulao',
    name_hindi: null,
    name_regional: null,
    description: 'Rice cooked with mixed vegetables, coconut milk, and whole spices — a mild and fragrant Goan vegetarian rice dish.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['rice'],
    is_veg: true, is_vegan: false, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },

  // ── BREAD (4) ───────────────────────────────────────────────────────────────

  {
    name: 'Poee',
    name_hindi: null,
    name_regional: 'पोयी',
    description: 'Hollow Goan whole wheat bread leavened with toddy — the signature Goan bread with a crispy crust and soft hollow interior, eaten with curry.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['bread'],
    is_veg: true, is_vegan: true, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Goan Pav',
    name_hindi: null,
    name_regional: 'पाव',
    description: 'Soft yeasted Goan bread rolls baked daily by local bakers — eaten with butter, curry, or egg preparations for breakfast and dinner.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['bread'],
    is_veg: true, is_vegan: false, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Goan Bhakri',
    name_hindi: null,
    name_regional: 'भाकरी',
    description: 'Thick Goan rice flour flatbread cooked on a tawa — simpler than Maharashtra bhakri, eaten with fish curry or chutney in rural Goa.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['bread'],
    is_veg: true, is_vegan: true, is_jain: true, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Goan Puri',
    name_hindi: null,
    name_regional: 'पुरी',
    description: 'Deep-fried puffed wheat bread eaten with chana ros or potato bhaji — a Goan Hindu breakfast and festival bread.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['bread'],
    is_veg: true, is_vegan: true, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday', 'festival'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },

  // ── RAITA (2) ───────────────────────────────────────────────────────────────

  {
    name: 'Sol Kadhi',
    name_hindi: 'सोल कढ़ी',
    name_regional: 'सोळ कडी',
    description: 'Pink kokum and coconut milk digestive drink-cum-raita served after Goan meals — cooling, tangy, and deeply aromatic with garlic and chilli.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['raita'],
    is_veg: true, is_vegan: true, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Goan Coconut Raita',
    name_hindi: null,
    name_regional: null,
    description: 'Yogurt mixed with fresh grated coconut, green chilli, mustard, and curry leaves — a cooling Goan accompaniment to spiced curries.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['raita'],
    is_veg: true, is_vegan: false, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },

  // ── SNACK (2) ───────────────────────────────────────────────────────────────

  {
    name: 'Goan Prawn Cutlet',
    name_hindi: null,
    name_regional: null,
    description: 'Spiced prawn patties coated in breadcrumbs and shallow-fried golden — a popular Goan Catholic snack with Indo-Portuguese roots.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['snack'],
    is_veg: false, is_vegan: false, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: 'prawn', allowed_days: [], occasion: ['everyday', 'party'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Goan Banana Chips',
    name_hindi: null,
    name_regional: null,
    description: 'Thin crispy raw banana chips fried in coconut oil and salted — a Goan coastal snack sold in every village market.',
    cuisine: ['Goan'],
    region: 'WEST',
    slot: ['snack'],
    is_veg: true, is_vegan: true, is_jain: true, is_fasting: false, is_street: true,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
];

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log(`\nSeeding ${dishes.length} Goan dishes into Supabase...`);
  console.log('(3 Sunday specials carry slot [lunch_curry, dinner_curry] — each counts in both slot totals)\n');

  const BATCH_SIZE = 20;
  let totalInserted = 0;
  let totalErrors = 0;

  for (let i = 0; i < dishes.length; i += BATCH_SIZE) {
    const batch = dishes.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    const { error } = await client.from('dishes').insert(batch);

    if (error) {
      console.error(`  Batch ${batchNum} ERROR: ${error.message}`);
      totalErrors += batch.length;
    } else {
      totalInserted += batch.length;
      console.log(`  Batch ${batchNum}: inserted ${batch.length} dishes (running total: ${totalInserted})`);
    }
  }

  console.log(`\nDone. Inserted: ${totalInserted} | Errors: ${totalErrors}\n`);

  // ── Verification ─────────────────────────────────────────────────────────────
  console.log('Verification — Goan dishes by slot:\n');

  const { data: rows, error: verifyErr } = await client
    .from('dishes')
    .select('slot')
    .contains('cuisine', ['Goan']);

  if (verifyErr) {
    console.error('Verification error:', verifyErr.message);
    return;
  }

  const counts: Record<string, number> = {};
  (rows || []).forEach((r: { slot: string[] }) => {
    r.slot.forEach((s: string) => {
      counts[s] = (counts[s] || 0) + 1;
    });
  });

  Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([slot, count]) => {
      console.log(`  ${slot.padEnd(16)} ${count}`);
    });
  console.log(`\n  Total rows inserted: ${totalInserted}`);
}

seed().catch(console.error);
