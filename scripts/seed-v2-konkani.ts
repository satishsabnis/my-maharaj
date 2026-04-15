require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// ─── 50 Konkani dishes ────────────────────────────────────────────────────────
// GSB (Gaud Saraswat Brahmin) Konkani focus.
// Heavy on coconut, kokum, tirphal, parboiled rice, and coastal seafood.
// Distribution: 10 breakfast | 12 lunch_curry | 12 dinner_curry |
//               8 veg_side | 4 rice | 2 bread | 2 raita

const dishes = [

  // ── BREAKFAST (10) ──────────────────────────────────────────────────────────

  {
    name: 'Pundi',
    name_hindi: null,
    name_regional: 'पुंडी',
    description: 'Steamed rice and fresh coconut dumplings — the most essential GSB Konkani breakfast, eaten with coconut chutney or khatkhate.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['breakfast'],
    is_veg: true, is_vegan: true, is_jain: true, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Neer Dosa',
    name_hindi: null,
    name_regional: 'नीर डोसो',
    description: 'Paper-thin lacy crepes made from raw rice batter and water — a Konkani coastal breakfast of extreme delicacy served with coconut chutney.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['breakfast'],
    is_veg: true, is_vegan: true, is_jain: true, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Amboli',
    name_hindi: null,
    name_regional: 'आंबोळी',
    description: 'Thick spongy fermented rice and urad dal pancake — a Konkani breakfast eaten with coconut chutney or leftover fish curry.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['breakfast'],
    is_veg: true, is_vegan: true, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Ghavan',
    name_hindi: null,
    name_regional: 'घावन',
    description: 'Paper-thin rice flour crepe made with coconut milk — a Konkani breakfast crepe eaten with coconut chutney or fresh honey.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['breakfast'],
    is_veg: true, is_vegan: true, is_jain: true, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Shevai',
    name_hindi: null,
    name_regional: 'शेवई',
    description: 'Hand-pressed Konkani rice string hoppers — fresh rice noodles eaten at breakfast with fresh coconut chutney or sweetened coconut milk.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['breakfast'],
    is_veg: true, is_vegan: true, is_jain: true, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday', 'festival'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Sabudana Khichdi',
    name_hindi: 'साबूदाना खिचड़ी',
    name_regional: 'साबुदाण्याची खिचडी',
    description: 'Sago pearls cooked with peanuts, green chilli, and cumin — eaten in Konkani households on Ekadashi and Navratri fasting days.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['breakfast'],
    is_veg: true, is_vegan: false, is_jain: false, is_fasting: true, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Konkani Coconut Poha',
    name_hindi: null,
    name_regional: 'नारळाचे पोहे',
    description: 'Flattened rice tossed with freshly grated coconut, green chilli, mustard seeds, and a squeeze of lime — the Konkani coastal morning staple.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['breakfast'],
    is_veg: true, is_vegan: true, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Rava Upma',
    name_hindi: 'रवा उपमा',
    name_regional: 'रव्याचे उपमा',
    description: 'Semolina porridge tempered with mustard, curry leaves, and green chilli, finished with fresh coconut — eaten widely across Konkani homes.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['breakfast'],
    is_veg: true, is_vegan: false, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Idli with Coconut Chutney',
    name_hindi: 'इडली नारियल चटनी',
    name_regional: 'इडली नारळाची चटणी',
    description: 'Steamed fermented rice and lentil cakes served with Konkani-style fresh coconut chutney with green chilli and tempered mustard.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['breakfast'],
    is_veg: true, is_vegan: true, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Pej',
    name_hindi: null,
    name_regional: 'पेज',
    description: 'Thin rice porridge made from parboiled Konkani rice cooked until silky — a deeply comforting GSB Konkani breakfast eaten with a piece of salted fish or pickle.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['breakfast'],
    is_veg: true, is_vegan: true, is_jain: true, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },

  // ── LUNCH CURRY (12) ────────────────────────────────────────────────────────

  {
    name: 'Dalitoy',
    name_hindi: null,
    name_regional: 'दालितॉय',
    description: 'The cornerstone GSB Konkani dal — toor dal cooked simply and finished with a coconut oil tadka of mustard, dried red chillies, and asafoetida.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['lunch_curry'],
    is_veg: true, is_vegan: false, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Khatkhate',
    name_hindi: null,
    name_regional: 'खटखटे',
    description: 'GSB Konkani mixed vegetable curry with fresh coconut, tirphal (Konkani pepper), and a medley of seasonal vegetables including raw banana, yam, and drumstick.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['lunch_curry'],
    is_veg: true, is_vegan: true, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday', 'festival'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Bangda Masala Konkani',
    name_hindi: null,
    name_regional: 'बांगडो मसाला',
    description: 'Mackerel cooked in a thick Konkani coconut and dried red chilli masala soured with kokum — the quintessential Konkani weekday fish curry.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['lunch_curry'],
    is_veg: false, is_vegan: false, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: 'fish', allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Tisrya Masala Konkani',
    name_hindi: null,
    name_regional: 'तिसऱ्यो मसाला',
    description: 'Clams cooked in a fresh coconut gravy with kokum and Konkani spices — a prized GSB Konkani coastal curry eaten with steamed parboiled rice.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['lunch_curry'],
    is_veg: false, is_vegan: false, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: 'fish', allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Kolambi Masala Konkani',
    name_hindi: null,
    name_regional: 'कोळंबी मसाला',
    description: 'Prawns in a Konkani coconut-kokum curry with dried red chillies and garlic — lighter and more coconut-forward than the Maharashtrian version.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['lunch_curry'],
    is_veg: false, is_vegan: false, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: 'prawn', allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Surmai Curry Konkani',
    name_hindi: null,
    name_regional: 'सुरमई कड्डण',
    description: 'Kingfish steaks in a thin Konkani coconut milk curry with kokum and green chilli — a delicately spiced everyday Konkani fish lunch.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['lunch_curry'],
    is_veg: false, is_vegan: false, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: 'fish', allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Pomfret Curry Konkani',
    name_hindi: null,
    name_regional: 'पापलेट कड्डण',
    description: 'Pomfret in a fresh Konkani coconut and kokum curry — the prized Sunday fish curry of GSB Konkani households.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['lunch_curry'],
    is_veg: false, is_vegan: false, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: 'fish', allowed_days: ['Sunday'], occasion: ['everyday', 'party'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Muddo Curry',
    name_hindi: null,
    name_regional: 'मुड्डो कड्डण',
    description: 'Jackfruit seed (muddo) curry cooked with fresh coconut and Konkani spices — a seasonal and uniquely Konkani vegetarian lunch dish.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['lunch_curry'],
    is_veg: true, is_vegan: true, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Tori Amle',
    name_hindi: null,
    name_regional: 'तोरी आमले',
    description: 'Ridge gourd cooked in a thin Konkani curry soured with kokum — a simple and digestive GSB Konkani vegetarian lunch dish.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['lunch_curry'],
    is_veg: true, is_vegan: true, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Chicken Masala Konkani',
    name_hindi: null,
    name_regional: null,
    description: 'Chicken in a Konkani coconut masala with dried red chillies, coriander seeds, and kokum — less fiery than Kolhapuri, fragrant with coastal spices.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['lunch_curry'],
    is_veg: false, is_vegan: false, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: 'chicken', allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Anda Curry Konkani',
    name_hindi: null,
    name_regional: null,
    description: 'Eggs in a thin Konkani coconut curry with kokum — a quick non-veg lunch for Konkani households on non-fish days.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['lunch_curry'],
    is_veg: false, is_vegan: false, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: 'egg', allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Chanya Dal',
    name_hindi: null,
    name_regional: 'चण्याची दाळ',
    description: 'Chana dal cooked Konkani style with coconut and a tempering of mustard, dried red chilli, and curry leaves — a hearty vegetarian lunch dal.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['lunch_curry'],
    is_veg: true, is_vegan: false, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },

  // ── DINNER CURRY (12) ───────────────────────────────────────────────────────

  {
    name: 'Bangda Fry',
    name_hindi: 'बांगडा फ्राई',
    name_regional: 'बांगडो फ्राय',
    description: 'Mackerel marinated in a Konkani red chilli-turmeric masala and pan-fried crispy on a tawa — the most iconic everyday Konkani non-veg dinner.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['dinner_curry'],
    is_veg: false, is_vegan: false, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: 'fish', allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Bombil Masala Konkani',
    name_hindi: 'बोंबील मसाला',
    name_regional: 'बोंबील मसाला',
    description: 'Bombay duck cooked in a Konkani coconut masala with kokum and dried red chilli — a pungent and beloved Konkani coastal fish dish.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['dinner_curry'],
    is_veg: false, is_vegan: false, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: 'fish', allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Kolambi Sukhe',
    name_hindi: null,
    name_regional: 'कोळंबी सुके',
    description: 'Prawns dry-tossed with fresh coconut, Konkani spices, and kokum — a flavourful Konkani dry prawn preparation served alongside dal and rice.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['dinner_curry'],
    is_veg: false, is_vegan: false, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: 'prawn', allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Surmai Tawa Fry',
    name_hindi: null,
    name_regional: 'सुरमई तवा फ्राय',
    description: 'Kingfish slices coated in Konkani red chilli masala and shallow-fried golden on a cast-iron tawa — a Konkani dinner staple.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['dinner_curry'],
    is_veg: false, is_vegan: false, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: 'fish', allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Chicken Rassa Konkani',
    name_hindi: null,
    name_regional: 'चिकन रस्सो',
    description: 'Chicken in a thin Konkani coconut and onion gravy spiced with tirphal and dried red chillies — a lighter, coconut-forward chicken dinner curry.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['dinner_curry'],
    is_veg: false, is_vegan: false, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: 'chicken', allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Mutton Konkani',
    name_hindi: null,
    name_regional: 'मटण कड्डण',
    description: 'Mutton cooked in a thick Konkani coconut masala with whole spices and kokum — a slow-cooked Sunday dinner centrepiece in GSB Konkani homes.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['dinner_curry'],
    is_veg: false, is_vegan: false, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: 'mutton', allowed_days: ['Sunday'], occasion: ['everyday', 'party'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Egg Bhurji Konkani',
    name_hindi: null,
    name_regional: null,
    description: 'Scrambled eggs cooked with onion, green chilli, and fresh coconut in Konkani style — a quick weeknight non-veg dinner.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['dinner_curry'],
    is_veg: false, is_vegan: false, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: 'egg', allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Moong Dal Konkani',
    name_hindi: null,
    name_regional: 'मुगाची दाळ',
    description: 'Split moong dal cooked Konkani style with a coconut oil tadka of mustard, dried red chilli, and curry leaves — light and easy on digestion.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['dinner_curry'],
    is_veg: true, is_vegan: false, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Matki Usal Konkani',
    name_hindi: null,
    name_regional: 'मटकी उसळ',
    description: 'Sprouted moth beans cooked with coconut and Konkani spices — a protein-rich vegetarian dinner curry in Konkani coastal homes.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['dinner_curry'],
    is_veg: true, is_vegan: true, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Tambdi Bhaji',
    name_hindi: null,
    name_regional: 'तांबडी भाजी',
    description: 'Red amaranth leaves cooked in a thin Konkani coconut curry with garlic and dried red chilli — a nutritious and distinctly Konkani vegetarian dinner.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['dinner_curry'],
    is_veg: true, is_vegan: true, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Kala Chana Amti Konkani',
    name_hindi: null,
    name_regional: 'काळ्या वाटाण्याची आमटी',
    description: 'Black chickpea curry cooked Konkani style with coconut, kokum, and a mustard tempering — a hearty vegetarian dinner in Konkan coast homes.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['dinner_curry'],
    is_veg: true, is_vegan: true, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Pathrado',
    name_hindi: null,
    name_regional: 'पत्रोडे',
    description: 'Colocasia leaves stuffed with a spiced rice flour and coconut paste, rolled and steamed — an iconic GSB Konkani vegetarian dinner dish.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['dinner_curry'],
    is_veg: true, is_vegan: true, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday', 'festival'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },

  // ── VEG SIDE (8) ────────────────────────────────────────────────────────────

  {
    name: 'Tendla Upkari',
    name_hindi: null,
    name_regional: 'तोंडलीचे उपकरी',
    description: 'Ivy gourd stir-fried Konkani style with mustard, dried red chilli, and fresh coconut — upkari is the GSB term for a dry vegetable side dish.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['veg_side'],
    is_veg: true, is_vegan: true, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Bhende Upkari',
    name_hindi: null,
    name_regional: 'भेंडे उपकरी',
    description: 'Okra dry stir-fried Konkani style with mustard seeds, coconut, and curry leaves — a simple everyday Konkani vegetable side.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['veg_side'],
    is_veg: true, is_vegan: true, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Dugdhi Upkari',
    name_hindi: null,
    name_regional: 'दुगधी उपकरी',
    description: 'Bottle gourd stir-fried Konkani style with coconut, mustard, and green chilli — a light and cooling everyday Konkani vegetable side.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['veg_side'],
    is_veg: true, is_vegan: true, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Batata Upkari',
    name_hindi: null,
    name_regional: 'बटाटे उपकरी',
    description: 'Potato stir-fry Konkani style with mustard seeds, dried red chilli, curry leaves, and fresh coconut — an everyday Konkani vegetable accompaniment.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['veg_side'],
    is_veg: true, is_vegan: true, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Kadgi Chakko',
    name_hindi: null,
    name_regional: 'कड्गी चक्को',
    description: 'Raw green jackfruit cooked dry with roasted coconut and Konkani spices — a distinctive GSB Konkani preparation unique to the coastal belt.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['veg_side'],
    is_veg: true, is_vegan: true, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Bimbli Upkari',
    name_hindi: null,
    name_regional: 'बिंबल्याचे उपकरी',
    description: 'Star fruit (bimbli/bilimbi) stir-fried with coconut and Konkani spices — a sharply sour and uniquely Konkani coastal vegetable side.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['veg_side'],
    is_veg: true, is_vegan: true, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Vaingem Sukhe',
    name_hindi: null,
    name_regional: 'वांगे सुके',
    description: 'Brinjal cooked dry Konkani style with coconut, garlic, and red chilli — a simple everyday Konkani vegetable side eaten with dalitoy and rice.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['veg_side'],
    is_veg: true, is_vegan: true, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Fanasachi Bhaji Konkani',
    name_hindi: null,
    name_regional: 'फणसाची भाजी',
    description: 'Raw jackfruit cooked with coconut and Konkani spices in a dry preparation — a seasonal Konkani vegetable side distinct from the Goan version.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['veg_side'],
    is_veg: true, is_vegan: true, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },

  // ── RICE (4) ────────────────────────────────────────────────────────────────

  {
    name: 'Ukde Sheeth',
    name_hindi: null,
    name_regional: 'उकडे शीत',
    description: 'Plain steamed Konkani parboiled red rice — every GSB Konkani meal is built around this, eaten with dalitoy, fish curry, and upkari.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['rice'],
    is_veg: true, is_vegan: true, is_jain: true, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Kolambi Bhaat',
    name_hindi: null,
    name_regional: 'कोळंबी भात',
    description: 'Prawns cooked into rice with Konkani spices and fresh coconut — a one-pot Konkani prawn rice that is a Sunday meal highlight.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['rice'],
    is_veg: false, is_vegan: false, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: 'prawn', allowed_days: ['Sunday'], occasion: ['everyday', 'party'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Vangi Bhaat Konkani',
    name_hindi: null,
    name_regional: 'वांगे भात',
    description: 'Brinjal rice cooked Konkani style with coconut, mustard, and dried red chilli — a flavourful one-pot rice dish from the Konkan coast.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['rice'],
    is_veg: true, is_vegan: true, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Coconut Rice Konkani',
    name_hindi: null,
    name_regional: 'नारळाचे भात',
    description: 'Steamed rice mixed with freshly grated coconut and tempered with mustard, curry leaves, and dried red chilli — a cooling Konkani rice preparation.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['rice'],
    is_veg: true, is_vegan: true, is_jain: true, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },

  // ── BREAD (2) ───────────────────────────────────────────────────────────────

  {
    name: 'Patoleo',
    name_hindi: null,
    name_regional: 'पातोळे',
    description: 'Turmeric leaves filled with spiced rice flour and fresh coconut, folded and steamed — an iconic GSB Konkani festival bread made for Nagpanchami.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['bread'],
    is_veg: true, is_vegan: true, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['festival'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Akki Rotti',
    name_hindi: null,
    name_regional: 'अक्की रोट्टी',
    description: 'Rice flour flatbread made with fresh coconut, green chilli, and curry leaves — a Karnataka-Konkani belt bread eaten with chutney or curry.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['bread'],
    is_veg: true, is_vegan: true, is_jain: true, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },

  // ── RAITA (2) ───────────────────────────────────────────────────────────────

  {
    name: 'Sol Kadhi Konkani',
    name_hindi: 'सोल कढ़ी',
    name_regional: 'सोळ कडी',
    description: 'GSB Konkani kokum and coconut milk digestive — pink, cooling, and aromatic with garlic and green chilli, served at the end of every Konkani meal.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['raita'],
    is_veg: true, is_vegan: true, is_jain: false, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
  {
    name: 'Cucumber Raita Konkani',
    name_hindi: null,
    name_regional: 'काकडीचे रायते',
    description: 'Grated cucumber in yogurt with fresh coconut, mustard seeds, and green chilli — a cooling Konkani raita accompaniment.',
    cuisine: ['Konkani'],
    region: 'WEST',
    slot: ['raita'],
    is_veg: true, is_vegan: false, is_jain: true, is_fasting: false, is_street: false,
    is_non_veg_type: null, allowed_days: [], occasion: ['everyday'], health_tags: [],
    is_verified: false, is_banned: false, chef_id: null, chef_verified: false,
  },
];

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log(`\nSeeding ${dishes.length} Konkani dishes into Supabase...\n`);

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

  // ── Verification ──────────────────────────────────────────────────────────
  console.log('Verification — Konkani dishes by slot:\n');

  const { data: rows, error: verifyErr } = await client
    .from('dishes')
    .select('slot')
    .contains('cuisine', ['Konkani']);

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
