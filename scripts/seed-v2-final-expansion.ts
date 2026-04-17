require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// ─── 270 dishes: Bihari (70) | Uttarakhandi/Garhwali (65) | Manipuri/Tripuri (65) | Pan-India Non-Veg (70) ───

const V = (name:string,nh:string|null,nr:string|null,desc:string,cuisine:string[],region:string,slot:string[],jain:boolean,fast:boolean,street:boolean,nvt:string|null,htags:string[]=[]) => ({
  name,name_hindi:nh,name_regional:nr,description:desc,cuisine,region,slot,
  is_veg:nvt===null,is_vegan:false,
  is_jain:jain,is_fasting:fast,is_street:street,is_non_veg_type:nvt,
  allowed_days:[],occasion:['everyday'],health_tags:htags,
  is_verified:false,is_banned:false,chef_id:null,chef_verified:false,
});
const NV = (name:string,nh:string|null,nr:string|null,desc:string,cuisine:string[],region:string,slot:string[],nvt:string,htags:string[]=[]) => ({
  name,name_hindi:nh,name_regional:nr,description:desc,cuisine,region,slot,
  is_veg:false,is_vegan:false,is_jain:false,is_fasting:false,is_street:false,is_non_veg_type:nvt,
  allowed_days:[],occasion:['everyday'],health_tags:htags,
  is_verified:false,is_banned:false,chef_id:null,chef_verified:false,
});

const BI='Bihari'; const UK='Uttarakhandi'; const MN='Manipuri';
const N='NORTH'; const E='EAST';

const dishes = [

  // ══════════════════════════════════════════════════════════════════════════════
  // BIHARI — 70 dishes
  // 12 breakfast | 14 lunch_curry | 13 dinner_curry | 10 veg_side | 6 rice | 6 bread | 5 raita | 4 snack
  // ══════════════════════════════════════════════════════════════════════════════

  // breakfast (12)
  V('Sattu Paratha Bihari','सत्तू पराठा',null,'Wheat paratha stuffed with roasted gram flour, raw onion, green chilli and mustard oil — the iconic Bihar breakfast.',[BI],N,['breakfast'],false,false,false,null,['protein']),
  V('Chura Dahi Bihari','चूड़ा दही',null,'Beaten rice soaked in thick yoghurt with jaggery — the simplest and most beloved Bihari morning meal.',[BI],N,['breakfast'],true,false,false,null,['probiotic']),
  V('Litti Chokha Breakfast','लिट्टी चोखा',null,'Sattu-stuffed wheat balls roasted over fire and served with charred aubergine and tomato mash — Bihar national dish.',[BI],N,['breakfast'],false,false,false,null,['protein','fibre']),
  V('Thekua','ठेकुआ',null,'Crispy deep-fried whole wheat sweet cookies with jaggery, fennel and coconut — Chhath Puja prasad and everyday snack.',[BI],N,['breakfast'],true,false,false,null),
  V('Malpua Bihari','मालपुआ',null,'Fennel-flavoured fried wheat pancake soaked in sugar syrup — a festival breakfast of Bihar.',[BI],N,['breakfast'],true,false,false,null),
  V('Anarsa Bihari','अनरसा',null,'Crispy sesame-topped rice flour sweet — a Diwali speciality of Bihar.',[BI],N,['breakfast'],true,false,false,null),
  V('Dal Puri Bihari','दाल पूरी',null,'Deep-fried puri stuffed with spiced chana dal — a high-protein Bihari breakfast.',[BI],N,['breakfast'],false,false,false,null,['protein']),
  V('Khichdi Bihar','बिहारी खिचड़ी',null,'Rice and moong dal khichdi with ghee tadka — eaten on Makar Sankranti as prasad.',[BI],N,['breakfast'],true,false,false,null,['protein','light']),
  V('Sev Tamatar Bihari','सेव टमाटर',null,'Crispy sev cooked in a tomato and onion gravy — a Bihari morning dry curry.',[BI],N,['breakfast'],false,false,false,null),
  V('Poha Bihari','बिहारी पोहा',null,'Flattened rice with onion, mustard, green chilli and lemon — the Bihari morning poha.',[BI],N,['breakfast'],false,false,false,null),
  NV('Egg Bhurji Bihari','अंडा भुर्जी बिहारी',null,'Scrambled eggs with green onion, tomato and black pepper in mustard oil — a Bihari protein breakfast.',[BI],N,['breakfast'],'egg'),
  V('Ghugni Bihari','घुगनी',null,'Yellow peas cooked with onion, tomato and garam masala — a Bihari street breakfast.',[BI],N,['breakfast'],false,false,true,null,['protein']),

  // lunch_curry (14)
  V('Dal Bihar','बिहारी दाल',null,'Chana dal and arhar dal cooked together with a generous garlic and dried red chilli tadka in mustard oil.',[BI],N,['lunch_curry'],false,false,false,null,['protein']),
  NV('Bihari Mutton Curry','बिहारी मटन करी',null,'Mutton slow-cooked in onion, ginger, garlic and a robust Bihari spice paste in mustard oil.',[BI],N,['lunch_curry'],'mutton'),
  V('Aloo Chokha','आलू चोखा',null,'Roasted mashed potatoes with mustard oil, raw onion, green chilli and lemon — a simple Bihari side.',[BI],N,['lunch_curry'],false,false,false,null),
  V('Baigan Bharta Bihari','बैंगन भर्ता',null,'Charcoal-roasted aubergine with mustard oil, raw onion and green chilli — the Bihari chokha.',[BI],N,['lunch_curry'],false,false,false,null),
  NV('Bihari Chicken Curry','बिहारी चिकन',null,'Chicken in a semi-dry onion and tomato masala with Bihari whole spices and mustard oil.',[BI],N,['lunch_curry'],'chicken'),
  V('Kadhi Bihari','बिहारी कढ़ी',null,'Thin yoghurt-gram flour kadhi with floating pakora — lighter than Rajasthani and Punjabi versions.',[BI],N,['lunch_curry'],false,false,false,null),
  V('Baingan Masala Bihari','बैंगन मसाला',null,'Aubergine cooked in a tomato-onion gravy with Bihari five-spice.',[BI],N,['lunch_curry'],false,false,false,null),
  NV('Machali Bihar','बिहारी माछी',null,'River fish cooked in a mustard oil and onion gravy with turmeric — a Mithila tradition.',[BI],N,['lunch_curry'],'fish'),
  V('Palak Dal Bihari','पालक दाल',null,'Spinach and arhar dal cooked together — a nutritious Bihari one-pot lunch preparation.',[BI],N,['lunch_curry'],false,false,false,null,['iron-rich','protein']),
  V('Kathal Sabzi Bihari','कटहल सब्जी',null,'Raw jackfruit cooked with Bihari spices in a dry masala — a meat substitute preparation.',[BI],N,['lunch_curry'],false,false,false,null,['fibre']),
  NV('Kheema Bihar','बिहारी कीमा',null,'Minced mutton cooked with onion, tomato and Bihari spice blend.',[BI],N,['lunch_curry'],'mutton'),
  V('Lauki Chana Dal Bihar','लौकी चना दाल',null,'Bottle gourd and split chickpeas in a light gravy — a Bihari summer combination.',[BI],N,['lunch_curry'],false,false,false,null,['protein','fibre']),
  V('Arhar Dal Tarka Bihar','अरहर दाल तड़का',null,'Pigeon pea dal with a mustard oil tadka of garlic and dried chilli.',[BI],N,['lunch_curry'],false,false,false,null,['protein']),
  V('Dhuska','धुसका',null,'Deep-fried rice and chana dal cake served with aloo sabzi — a Jharkhand-Bihar street specialty.',[BI],N,['lunch_curry'],false,false,true,null,['protein']),

  // dinner_curry (13)
  NV('Bihari Shami Kebab','बिहारी शामी कबाब',null,'Minced mutton and chana dal patties fried in mustard oil — a Bihari festive preparation.',[BI],N,['dinner_curry'],'mutton'),
  V('Aloo Dum Bihari','बिहारी दम आलू',null,'Small potatoes in a tomato and onion gravy with fennel — the Bihari version of dum aloo.',[BI],N,['dinner_curry'],false,false,false,null),
  NV('Mutton Kosha Bihar','मटन कोशा',null,'Mutton slow-cooked until almost dry in a deep onion masala — the Bihari Sunday dinner.',[BI],N,['dinner_curry'],'mutton'),
  V('Moong Dal Bihar','मूंग दाल',null,'Yellow moong dal tempered with garlic and dried red chilli in mustard oil.',[BI],N,['dinner_curry'],false,false,false,null,['protein','light']),
  NV('Chicken Handi Bihar','चिकन हांडी',null,'Chicken cooked in a clay pot with a rich onion and tomato gravy.',[BI],N,['dinner_curry'],'chicken'),
  V('Baingan Tamatar Bihar','बैंगन टमाटर',null,'Sliced aubergine cooked with tomato, onion and Bihari five-spice in mustard oil.',[BI],N,['dinner_curry'],false,false,false,null),
  NV('Egg Curry Bihari','बिहारी अंडा करी',null,'Hard-boiled eggs in a tomato and onion gravy with five spice tempering.',[BI],N,['dinner_curry'],'egg'),
  V('Matar Paneer Bihari','मटर पनीर',null,'Peas and paneer in a simple onion-tomato gravy — Bihari home style without cream.',[BI],N,['dinner_curry'],false,false,false,null,['protein']),
  V('Chane ki Dal Bihar','चने की दाल',null,'Chana dal with a strong garlic tadka — a robust Bihari dal.',[BI],N,['dinner_curry'],false,false,false,null,['protein']),
  NV('Rohu Fish Bihar','रोहू माछ',null,'Rohu fish fried in mustard oil and cooked in a turmeric-onion gravy — a Mithila staple.',[BI],N,['dinner_curry'],'fish'),
  V('Gobhi Masala Bihari','गोभी मसाला',null,'Cauliflower in a tomato and onion masala — Bihari everyday dinner vegetable.',[BI],N,['dinner_curry'],false,false,false,null),
  V('Palak Paneer Bihar','पालक पनीर',null,'Spinach and paneer in a light gravy — Bihari household version without cream.',[BI],N,['dinner_curry'],false,false,false,null,['iron-rich','protein']),
  V('Rajma Bihar','बिहारी राजमा',null,'Red kidney beans cooked with a simple onion and tomato gravy — thinner than Punjabi style.',[BI],N,['dinner_curry'],false,false,false,null,['protein','fibre']),

  // veg_side (10)
  V('Bihari Achar','बिहारी अचार',null,'Mixed mango and lime pickle in mustard oil — a Bihari condiment essential.',[BI],N,['veg_side'],false,false,false,null),
  V('Tomato Chutney Bihar','टमाटर चटनी',null,'Roasted tomato blended with garlic and green chilli — a simple Bihari table chutney.',[BI],N,['veg_side'],false,false,false,null),
  V('Chura Aloo','चूड़ा आलू',null,'Beaten rice stir-fried with potato and onion in mustard oil — a quick Bihari snack-side.',[BI],N,['snack'],false,false,false,null),
  V('Bihari Khaja','बिहारी खाजा',null,'Multi-layered crispy sweet fried pastry with sugar syrup — a Bihar-Jharkhand festival sweet.',[BI],N,['snack'],true,false,false,null),
  V('Balushahi Bihar','बालूशाही',null,'Flaky deep-fried dough disc soaked in sugar syrup — a traditional Bihari sweet snack.',[BI],N,['snack'],true,false,false,null),
  V('Tilkut Bihar','बिहारी तिलकुट',null,'Sesame brittle pressed with jaggery — the Makar Sankranti sweet of Bihar.',[BI],N,['snack'],true,false,false,null),
  V('Chivda Bihari','बिहारी चिवड़ा',null,'Flattened rice fried with peanuts, curry leaves and green chilli — a Bihari snack mix.',[BI],N,['veg_side'],false,false,false,null),
  V('Sattu Drink','सत्तू शरबत',null,'Roasted gram flour mixed with water, salt, lemon and roasted cumin — the Bihari summer drink.',[BI],N,['veg_side'],true,false,false,null,['protein']),
  V('Dahi Chura','दही चूड़ा',null,'Yoghurt and beaten rice — the Makar Sankranti ritual food of Bihar.',[BI],N,['raita'],true,false,false,null,['probiotic']),
  V('Kheer Bihar','बिहारी खीर',null,'Rice slow-cooked in full-fat milk with cardamom, saffron and dry fruits.',[BI],N,['veg_side'],true,false,false,null),

  // rice (6)
  V('Bihari Tehri','बिहारी तहरी',null,'Yellow spiced rice cooked with potato and whole spices — the Bihari comfort rice.',[BI],N,['rice'],false,false,false,null),
  V('Chura Pulao','चूड़ा पुलाव',null,'Beaten rice cooked with onion and spices — a Bihari savoury poha pulao.',[BI],N,['rice'],false,false,false,null),
  V('Dal Bhaat Bihar','दाल भात',null,'Plain boiled rice served with arhar dal — the staple Bihari meal.',[BI],N,['rice'],true,false,false,null,['protein']),
  V('Khichdi Bihari','बिहारी खिचड़ी',null,'Rice and moong dal cooked soft with ghee — Bihari festival khichdi.',[BI],N,['rice'],true,false,false,null),
  V('Pulao Bihari','बिहारी पुलाव',null,'Basmati cooked with whole spices, peas and fried onion.',[BI],N,['rice'],false,false,false,null),
  V('Curd Rice Bihar','दही चावल',null,'Cooked rice mixed with yoghurt and tempered with mustard.',[BI],N,['rice'],false,false,false,null,['probiotic','light']),

  // bread (6)
  V('Makuni Roti','मकुनी रोटी',null,'Thick corn flour roti cooked on a clay stove — a winter Bihari staple.',[BI],N,['bread'],true,false,false,null),
  V('Sattu Kachori Bihar','सत्तू कचोरी',null,'Flaky pastry filled with spiced sattu — eaten at festivals and weddings.',[BI],N,['bread'],false,false,false,null),
  V('Roti Bihar','बिहारी रोटी',null,'Plain whole wheat roti cooked in ghee on a tawa.',[BI],N,['bread'],true,false,false,null),
  V('Lachha Paratha Bihar','लच्छा परांठा',null,'Layered flaky paratha cooked in ghee — served with dal and achar.',[BI],N,['bread'],false,false,false,null),
  V('Puri Bihar','बिहारी पूरी',null,'Deep-fried whole wheat puri served with aloo sabzi.',[BI],N,['bread'],false,false,false,null),
  V('Bakarkhani Bihar','बाकरखानी',null,'Layered sweet flaky bread baked in a tandoor — a Mithila festive bread.',[BI],N,['bread'],true,false,false,null),

  // raita (5)
  V('Bihari Raita','बिहारी रायता',null,'Yoghurt with diced raw onion, tomato and roasted cumin — standard Bihari raita.',[BI],N,['raita'],false,false,false,null,['probiotic']),
  V('Lauki Raita Bihar','लौकी रायता',null,'Grated bottle gourd in yoghurt with cumin powder.',[BI],N,['raita'],false,false,false,null,['probiotic','light']),
  V('Boondi Raita Bihar','बूंदी रायता',null,'Yoghurt with boondi pearls and roasted cumin.',[BI],N,['raita'],false,false,false,null,['probiotic']),
  V('Mooli Raita Bihar','मूली रायता',null,'Grated radish in yoghurt with black salt and cumin.',[BI],N,['raita'],false,false,false,null,['probiotic']),
  V('Dahi Bihari','बिहारी दही',null,'Set earthen pot yoghurt — eaten with litti chokha.',[BI],N,['raita'],true,false,false,null,['probiotic']),

  // ══════════════════════════════════════════════════════════════════════════════
  // UTTARAKHANDI / GARHWALI / KUMAONI — 65 dishes
  // 12 breakfast | 13 lunch_curry | 12 dinner_curry | 9 veg_side | 5 rice | 7 bread | 5 raita | 2 snack
  // ══════════════════════════════════════════════════════════════════════════════

  // breakfast (12)
  V('Jhangora ki Kheer','झंगोरा की खीर',null,'Barnyard millet cooked in milk with sugar and cardamom — the sacred Uttarakhandi festival sweet.',[UK],N,['breakfast'],true,false,false,null,['fibre']),
  V('Aloo Gutke','आलू गुटके',null,'Twice-cooked potatoes tossed with Uttarakhandi spices and coriander — the most beloved Kumaoni breakfast.',[UK],N,['breakfast'],true,false,false,null),
  V('Dubke','दुबके',null,'Black horse gram soup cooked with spiced curd tempering — a Garhwali winter warming breakfast.',[UK],N,['breakfast'],true,false,false,null,['protein']),
  V('Singal','सिंगल',null,'Deep-fried sweet rice flour pancake — a Uttarakhandi festival breakfast sweet.',[UK],N,['breakfast'],true,false,false,null),
  V('Arsa','अर्सा',null,'Fried rice cake sweetened with jaggery — a Garhwali Diwali sweet.',[UK],N,['breakfast'],true,false,false,null),
  V('Phaanu Breakfast','फानू',null,'Slow-cooked Garhwali lentil soup of mixed mountain lentils — a warming hill breakfast.',[UK],N,['breakfast'],true,false,false,null,['protein']),
  V('Bhaang ki Chutney Breakfast','भांग की चटनी',null,'Hemp seed chutney with green chilli and garlic — served with morning roti in Uttarakhand.',[UK],N,['breakfast'],true,false,false,null),
  V('Mandua ki Roti','मंडुआ की रोटी',null,'Thick finger millet flatbread cooked on a tawa — a Uttarakhandi fibre-rich morning bread.',[UK],N,['breakfast'],true,false,false,null,['fibre','low-gi']),
  V('Til ki Ladoo Uttarakhandi','तिल के लड्डू',null,'Sesame and jaggery balls rolled by hand — the Makar Sankranti morning sweet of Uttarakhand.',[UK],N,['breakfast'],true,false,false,null),
  NV('Egg Paratha Uttarakhandi','अंडा परांठा',null,'Egg cracked onto paratha dough and cooked together — a hill breakfast staple.',[UK],N,['breakfast'],'egg'),
  V('Chaulai Saag Breakfast','चौलाई साग',null,'Amaranth leaves stir-fried with garlic and mustard oil — a morning greens dish of Uttarakhand.',[UK],N,['breakfast'],false,false,false,null,['iron-rich','fibre']),
  V('Ghee Paratha Uttarakhandi','घी परांठा',null,'Thick wheat paratha generously layered with mountain ghee — a cold-weather Uttarakhandi breakfast.',[UK],N,['breakfast'],true,false,false,null),

  // lunch_curry (13)
  V('Kafuli','काफुली',null,'Slow-cooked spinach and fenugreek leaves with a light gram flour thickening — the most celebrated Garhwali vegetable dish.',[UK],N,['lunch_curry'],false,false,false,null,['iron-rich','fibre']),
  V('Phaanu Kumaoni','फानू कुमाऊंनी',null,'Slow-cooked Kumaoni mixed mountain lentils — different regional spicing from Garhwali version.',[UK],N,['lunch_curry'],true,false,false,null,['protein']),
  V('Aloo Tamatar Uttarakhandi','आलू टमाटर',null,'Potatoes in a tomato-onion gravy with Uttarakhandi five-spice.',[UK],N,['lunch_curry'],false,false,false,null),
  NV('Bhatt ki Churkani','भट्ट की चुड़कानी',null,'Black soybean curry cooked with Uttarakhandi spices — a unique mountain protein.',[UK],N,['lunch_curry'],false,false,false,null,['protein']),
  NV('Chicken Uttarakhandi','उत्तराखंडी चिकन',null,'Chicken cooked with onion, tomato and Pahadi spices in mustard oil.',[UK],N,['lunch_curry'],'chicken'),
  V('Gahat Dal','गहत दाल',null,'Horse gram dal pressure-cooked with ginger and dried red chilli — a Uttarakhandi winter staple.',[UK],N,['lunch_curry'],true,false,false,null,['protein']),
  V('Chainsoo','चैनसू',null,'Roasted black horse gram dal cooked with cumin and dried red chilli — a thick Garhwali dal.',[UK],N,['lunch_curry'],true,false,false,null,['protein']),
  V('Ras','रस',null,'Chickpea dal cooked in a watery gravy — the simple everyday Uttarakhandi dal.',[UK],N,['lunch_curry'],true,false,false,null,['protein']),
  NV('Mutton Pahadi','पहाड़ी मटन',null,'Mutton cooked with mountain herbs, onion and a slow-cooked onion base.',[UK],N,['lunch_curry'],'mutton'),
  V('Jholi','झोली',null,'Thick yoghurt curry tempered with mustard — the Uttarakhandi kadhi.',[UK],N,['lunch_curry'],false,false,false,null,['probiotic']),
  V('Badi','बड़ी',null,'Sun-dried lentil dumplings cooked in a tomato gravy — a Kumaoni pantry curry.',[UK],N,['lunch_curry'],false,false,false,null,['protein']),
  V('Palak Dal Uttarakhandi','पालक दाल',null,'Spinach and mountain lentils cooked together — a nutritious Uttarakhandi one-pot.',[UK],N,['lunch_curry'],false,false,false,null,['iron-rich','protein']),
  NV('Trout Uttarakhandi','उत्तराखंडी ट्राउट',null,'River trout cooked with minimal spices and mustard oil — a Rishikesh and Tehri valley specialty.',[UK],N,['lunch_curry'],'fish'),

  // dinner_curry (12)
  V('Phanu Dinner','फानू',null,'Mountain dal soup with mixed lentils — the warm comforting Garhwali dinner.',[UK],N,['dinner_curry'],true,false,false,null,['protein']),
  NV('Mutton Kumaoni','कुमाऊंनी मटन',null,'Mutton cooked with mountain spices, onion and dry red chilli in a semi-dry gravy.',[UK],N,['dinner_curry'],'mutton'),
  V('Mandua Roti Sabzi','मंडुआ रोटी सब्जी',null,'Finger millet bread served alongside a simple aloo or palak curry.',[UK],N,['dinner_curry'],true,false,false,null),
  V('Kapa','काप',null,'Spinach and radish leaves cooked with urad dal — a Kumaoni winter vegetable preparation.',[UK],N,['dinner_curry'],false,false,false,null,['iron-rich','protein']),
  V('Mungodi Sabzi Uttarakhandi','मूंगोड़ी सब्जी',null,'Sun-dried moong dumplings cooked in a tomato-onion gravy — a Uttarakhandi pantry curry.',[UK],N,['dinner_curry'],false,false,false,null),
  NV('Chicken Handi Uttarakhandi','चिकन हांडी',null,'Chicken in a rich onion paste cooked in clay pot with Pahadi spices.',[UK],N,['dinner_curry'],'chicken'),
  V('Aloo Jholi','आलू झोली',null,'Potato and yoghurt curry — a lighter version of the Uttarakhandi jholi.',[UK],N,['dinner_curry'],false,false,false,null),
  V('Thamdi Sabzi','थामड़ी',null,'Blanched and tossed vegetables in garlic and mustard oil — a simple Uttarakhandi preparation.',[UK],N,['dinner_curry'],false,false,false,null,['light','fibre']),
  V('Gahat Soup','गहत सूप',null,'Horse gram soup cooked thin — a warming hill dinner soup of Uttarakhand.',[UK],N,['dinner_curry'],true,false,false,null,['protein']),
  V('Bhatt Sabzi','भट्ट सब्जी',null,'Black soybean cooked with onion and Uttarakhandi spices — a unique mountain protein side.',[UK],N,['dinner_curry'],true,false,false,null,['protein']),
  NV('Egg Curry Uttarakhandi','उत्तराखंडी अंडा करी',null,'Eggs in a tomato-onion gravy with Pahadi spices.',[UK],N,['dinner_curry'],'egg'),
  V('Churkani Potato','चुड़कानी आलू',null,'Potatoes cooked with curd and cumin in the Uttarakhandi style.',[UK],N,['dinner_curry'],false,false,false,null),

  // veg_side + bread + rice + raita
  V('Bhaang ki Chutney','भांग की चटनी',null,'Hemp seed chutney with garlic and green chilli — the Uttarakhandi signature condiment.',[UK],N,['veg_side'],false,false,false,null),
  V('Til ki Chutney Uttarakhandi','तिल की चटनी',null,'Roasted sesame chutney with garlic and dried red chilli.',[UK],N,['veg_side'],true,false,false,null),
  V('Buransh Chutney','बुरांश चटनी',null,'Rhododendron flower chutney with lemon and green chilli — a spring seasonal Uttarakhandi condiment.',[UK],N,['veg_side'],true,false,false,null),
  V('Mitha Bhaat','मीठा भात',null,'Sweet rice cooked with jaggery and dry fruits — a Garhwali festive rice.',[UK],N,['rice'],true,false,false,null),
  V('Jhangora Khichdi','झंगोरा खिचड़ी',null,'Barnyard millet khichdi — a nutritious Uttarakhandi millet one-pot.',[UK],N,['rice'],true,false,false,null,['fibre','low-gi']),
  V('Mandua Khichdi','मंडुआ खिचड़ी',null,'Finger millet and lentil khichdi — a dark nutritious mountain meal.',[UK],N,['rice'],true,false,false,null,['fibre']),
  V('Arhar Bhaat','अरहर भात',null,'Plain rice with Uttarakhandi arhar dal — the everyday hill meal.',[UK],N,['rice'],true,false,false,null,['protein']),
  V('Pulao Uttarakhandi','उत्तराखंडी पुलाव',null,'Basmati cooked with whole spices and mountain ghee.',[UK],N,['rice'],true,false,false,null),
  V('Mandua Roti Dinner','मंडुआ रोटी',null,'Finger millet flatbread cooked on tawa — the Uttarakhandi daily bread.',[UK],N,['bread'],true,false,false,null,['fibre','low-gi']),
  V('Jhangora Roti','झंगोरा रोटी',null,'Barnyard millet flatbread — gluten-free Uttarakhandi bread.',[UK],N,['bread'],true,false,false,null,['gluten-free','fibre']),
  V('Ghee Roti Uttarakhandi','घी रोटी',null,'Wheat roti cooked generously with mountain ghee — the Uttarakhandi everyday bread.',[UK],N,['bread'],true,false,false,null),
  V('Puri Uttarakhandi','उत्तराखंडी पूरी',null,'Deep-fried wheat puri eaten with aloo gutke.',[UK],N,['bread'],false,false,false,null),
  V('Bal Mithai Bread','बाल मिठाई',null,'Dense dark fudge made from khoya and coated with sugar pearls — Almora speciality sweet eaten as dessert bread.',[UK],N,['bread'],true,false,false,null),
  V('Kapaar Roti','कापड़ रोटी',null,'Thin rice flour flatbread cooked on tawa — a Kumaoni everyday bread.',[UK],N,['bread'],true,false,false,null),
  V('Palta Roti','पलता रोटी',null,'Multi-grain flatbread with wheat, finger millet and corn — a hearty Garhwali daily bread.',[UK],N,['bread'],true,false,false,null),
  V('Dahi Uttarakhandi','उत्तराखंडी दही',null,'Thick mountain curd set in earthen pot — eaten with aloo gutke.',[UK],N,['raita'],true,false,false,null,['probiotic']),
  V('Kheera Raita Uttarakhandi','खीरा रायता',null,'Mountain cucumber in yoghurt with roasted cumin.',[UK],N,['raita'],true,false,false,null,['probiotic','light']),
  V('Mooli Raita Uttarakhandi','मूली रायता',null,'Radish in yoghurt with black salt — a Uttarakhandi fresh raita.',[UK],N,['raita'],true,false,false,null),
  V('Boondi Raita Uttarakhandi','बूंदी रायता',null,'Boondi in yoghurt with Pahadi spices.',[UK],N,['raita'],false,false,false,null,['probiotic']),
  V('Tomato Raita Uttarakhandi','टमाटर रायता',null,'Tomato in yoghurt with cumin and coriander.',[UK],N,['raita'],false,false,false,null),
  V('Pahadi Namkeen','पहाड़ी नमकीन',null,'Mixed roasted nuts and seeds with black salt — Uttarakhandi trail snack.',[UK],N,['snack'],true,false,false,null),
  V('Singori','सिंगोरी',null,'Khoya sweet wrapped in maalu leaf — the iconic Uttarakhandi sweet.',[UK],N,['snack'],true,false,false,null),
  V('Hari Sabzi Uttarakhandi','हरी सब्जी',null,'Seasonal hill greens stir-fried in mustard oil — a foraging tradition of the hills.',[UK],N,['veg_side'],false,false,false,null,['iron-rich']),
  V('Bhang Chutney Hari','भांग हरी चटनी',null,'Hemp and coriander green chutney — a sharp Uttarakhandi table condiment.',[UK],N,['veg_side'],false,false,false,null),
  V('Jhangora Kheer Dessert','झंगोरा की खीर',null,'Barnyard millet slow-cooked in milk with cardamom — served as dessert at Uttarakhandi festivals.',[UK],N,['veg_side'],true,false,false,null,['fibre']),

  // ══════════════════════════════════════════════════════════════════════════════
  // MANIPURI / TRIPURI — 65 dishes
  // 11 breakfast | 13 lunch_curry | 12 dinner_curry | 10 veg_side | 5 rice | 5 bread | 5 raita | 4 snack
  // ══════════════════════════════════════════════════════════════════════════════

  // breakfast (11)
  V('Chamthong','चामथोंग',null,'Boiled mixed vegetable soup with ginger and dried fish — the everyday Manipuri morning meal.',[MN],E,['breakfast'],false,false,false,null,['light','fibre']),
  V('Kheer Sanbi','खीर संबी',null,'Rice flour pancakes served with sweetened coconut milk — a Manipuri festival breakfast.',[MN],E,['breakfast'],true,false,false,null),
  NV('Nga Thongba Breakfast','ङा थोंगबा',null,'River fish cooked in a light onion broth — eaten with rice at breakfast in Manipuri homes.',[MN],E,['breakfast'],'fish'),
  V('Eromba Breakfast','एरोम्बा',null,'Mashed fermented fish paste with chilli and boiled vegetables — the signature Manipuri condiment eaten at breakfast.',[MN],E,['breakfast'],false,false,false,null),
  V('Singju','सिंगजू',null,'Shredded cabbage, lotus stem and raw papaya salad with roasted chickpeas — the Manipuri raw salad breakfast.',[MN],E,['breakfast'],false,false,false,null,['light','fibre']),
  V('Chak-Hao Porridge','चक-हाओ दलिया',null,'Black rice porridge cooked with coconut milk and palm sugar — a Manipuri antioxidant morning bowl.',[MN],E,['breakfast'],true,false,false,null,['anti-inflammatory']),
  V('Utteri','उत्तेरी',null,'Boiled black-eyed peas tossed with onion, green chilli and coriander — a Manipuri high-protein morning.',[MN],E,['breakfast'],false,false,false,null,['protein']),
  NV('Pork Breakfast Manipuri','मणिपुरी पोर्क',null,'Pork cooked with bamboo shoot and dried chilli — a Meitei morning preparation.',[MN],E,['breakfast'],'pork'),
  V('Meitei Chak','मेइतेई चाक',null,'Steamed glutinous rice served with local honey — the simple Manipuri morning rice.',[MN],E,['breakfast'],true,false,false,null),
  V('Tan Nga Tharoi','तान ङा थारोई',null,'Fermented soybeans cooked with onion and dried chilli — a Manipuri morning protein preparation.',[MN],E,['breakfast'],false,false,false,null,['protein']),
  V('Kobi Kangsu','कोबी कांगसू',null,'Stir-fried cabbage with dried red chilli and ginger in mustard oil — a Manipuri morning vegetable.',[MN],E,['breakfast'],false,false,false,null,['fibre','light']),

  // lunch_curry (13)
  NV('Nga Thongba','ङा थोंगबा',null,'Fish and vegetable curry cooked with onion and ginger — the everyday Manipuri fish preparation.',[MN],E,['lunch_curry'],'fish'),
  V('Ooti','उटी',null,'Yellow pea curry — thick and mildly spiced with ginger and dried chilli — the Manipuri dal equivalent.',[MN],E,['lunch_curry'],true,false,false,null,['protein']),
  NV('Pork with Bamboo Shoot','बांस का अचार सूअर',null,'Pork slow-cooked with fermented bamboo shoot, dried red chilli and ginger — the most loved Manipuri meat dish.',[MN],E,['lunch_curry'],'pork'),
  V('Eromba Curry','एरोम्बा करी',null,'Mashed boiled vegetables mixed with fermented fish and chilli — a thick Manipuri paste curry.',[MN],E,['lunch_curry'],false,false,false,null),
  NV('Iromba Chicken','इरोम्बा चिकन',null,'Chicken cooked in the Manipuri style with local herbs and bamboo shoot.',[MN],E,['lunch_curry'],'chicken'),
  V('Kangsoi','कांगसोई',null,'Boiled mixed vegetable soup with ginger and herbs — a light Manipuri soup curry.',[MN],E,['lunch_curry'],true,false,false,null,['light','fibre']),
  V('Thingnam Jamun','थिंगनाम जमुन',null,'Tree tomato cooked with dried chilli and fermented fish — a pungent Manipuri condiment-curry.',[MN],E,['lunch_curry'],false,false,false,null),
  NV('Chicken Singju','चिकन सिंगजू',null,'Shredded chicken with raw vegetables, onion and roasted chickpeas in the Manipuri salad style.',[MN],E,['lunch_curry'],'chicken'),
  V('Lotus Stem Manipuri','मणिपुरी नालेंग',null,'Lotus stem cooked with green chilli and ginger — a Manipuri seasonal preparation.',[MN],E,['lunch_curry'],false,false,false,null,['fibre']),
  NV('Duck Curry Manipuri','मणिपुरी बत्तख',null,'Duck cooked with onion, ginger and local hill spices in mustard oil.',[MN],E,['lunch_curry'],'duck'),
  V('Morokut','मोरोकूट',null,'Dried red chilli and dried fish paste — an essential Manipuri flavour base eaten as a side.',[MN],E,['lunch_curry'],false,false,false,null),
  V('Chak-Hao Kheer','चक-हाओ खीर',null,'Black rice cooked in sweetened milk — served as a dessert or festival lunch sweet.',[MN],E,['lunch_curry'],true,false,false,null,['anti-inflammatory']),
  V('Tangkul Vegetable Stew','टांगखुल सब्जी',null,'Mixed hill vegetables cooked in a simple broth with ginger — a Nagaland-influenced Manipuri vegetable.',[MN],E,['lunch_curry'],false,false,false,null,['light','fibre']),

  // dinner_curry (12)
  NV('Pork Aloo Manipuri','मणिपुरी पोर्क आलू',null,'Pork and potato cooked together with dried chilli and ginger in mustard oil.',[MN],E,['dinner_curry'],'pork'),
  V('Yongchak Singju','योंगचाक सिंगजू',null,'Stink bean salad with onion, green chilli and roasted chickpeas — a bold Manipuri dinner salad.',[MN],E,['dinner_curry'],false,false,false,null),
  NV('Nga Aton','ङा अटोन',null,'Steamed fish in banana leaf with ginger and chilli — the Manipuri steamed fish preparation.',[MN],E,['dinner_curry'],'fish'),
  V('Paknam','पाकनाम',null,'Steamed lentil cake in banana leaf — a Manipuri festive dinner preparation.',[MN],E,['dinner_curry'],false,false,false,null,['protein']),
  NV('Chicken Tangkul','चिकन टांगखुल',null,'Chicken cooked with fermented bamboo shoot and dried red chilli.',[MN],E,['dinner_curry'],'chicken'),
  V('Imoinu Iratpa','इमोइनु इरटपा',null,'Mixed vegetable and herb preparation cooked dry with ginger — a Meitei ritual dish.',[MN],E,['dinner_curry'],false,false,false,null,['light']),
  NV('Beef Curry Manipuri','मणिपुरी गाय का मांस',null,'Beef cooked with onion, ginger and Manipuri dried chilli — popular in Meitei Muslim and Christian communities.',[MN],E,['dinner_curry'],'beef'),
  V('Sana Thongba','सना थोंगबा',null,'Yellow peas cooked in a thin broth for dinner — a lighter Ooti.',[MN],E,['dinner_curry'],true,false,false,null,['protein','light']),
  V('Kobi Thongba','कोबी थोंगबा',null,'Cabbage cooked in a light broth with ginger — Manipuri boiled vegetable curry.',[MN],E,['dinner_curry'],false,false,false,null,['fibre','light']),
  NV('Mutton Manipuri','मणिपुरी मटन',null,'Mutton cooked with onion, ginger and Manipuri spices.',[MN],E,['dinner_curry'],'mutton'),
  V('Chak-Hao Dinner','चक-हाओ',null,'Black rice served as a dinner grain with curries — its nutty flavour pairs with fish and pork.',[MN],E,['dinner_curry'],true,false,false,null),
  V('Thongba Mixed Veg','थोंगबा मिक्स सब्जी',null,'Mixed vegetables in a light Manipuri broth.',[MN],E,['dinner_curry'],false,false,false,null,['light','fibre']),

  // veg_side + rice + bread + raita + snack
  V('Black Rice Manipuri','चक-हाओ',null,'Manipuri black rice cooked plain — eaten with fish curry and eromba.',[MN],E,['rice'],true,false,false,null,['anti-inflammatory']),
  V('Glutinous Rice Manipuri','चिक्कन चावल',null,'Sticky glutinous rice cooked plain — the traditional Manipuri rice.',[MN],E,['rice'],true,false,false,null),
  V('Meitei Chak Dinner','मेइतेई चाक',null,'Steamed white rice — plain daily Manipuri rice.',[MN],E,['rice'],true,false,false,null),
  V('Chak-Hao Pulao','चक-हाओ पुलाव',null,'Black rice cooked with coconut milk and palm sugar — a fragrant Manipuri rice.',[MN],E,['rice'],true,false,false,null),
  V('Samai Kheer','सामाई खीर',null,'Little millet cooked in milk with cardamom — a Manipuri millet pudding.',[MN],E,['rice'],true,false,false,null,['fibre']),
  V('Chapati Manipuri','मणिपुरी चपाती',null,'Plain wheat roti eaten with kangsoi or ooti.',[MN],E,['bread'],true,false,false,null),
  V('Rice Bread Manipuri','चावल की रोटी',null,'Rice flour flatbread cooked on tawa — gluten-free Manipuri bread.',[MN],E,['bread'],true,false,false,null,['gluten-free']),
  V('Puri Manipuri','मणिपुरी पूरी',null,'Deep-fried wheat puri — eaten at festivals.',[MN],E,['bread'],false,false,false,null),
  V('Momo Manipuri','मणिपुरी मोमो',null,'Steamed dumplings stuffed with pork or vegetable — Northeast influence on Manipuri food.',[MN],E,['bread'],false,false,false,null),
  V('Singju Wrap','सिंगजू रैप',null,'Raw vegetable filling wrapped in rice paper — a light Manipuri snack bread.',[MN],E,['bread'],false,false,false,null,['light']),
  V('Dahi Manipuri','मणिपुरी दही',null,'Set yoghurt — eaten with rice and curries.',[MN],E,['raita'],true,false,false,null,['probiotic']),
  V('Cucumber Salad Manipuri','खीरा सलाद मणिपुरी',null,'Raw cucumber with green chilli and lemon — a Manipuri fresh side.',[MN],E,['raita'],false,false,false,null,['light']),
  V('Tomato Onion Manipuri','टमाटर प्याज',null,'Raw tomato and onion with coriander and green chilli.',[MN],E,['raita'],false,false,false,null,['light']),
  V('Curd Rice Manipuri','दही चावल मणिपुरी',null,'Cooked rice mixed with yoghurt and ginger — cooling Manipuri preparation.',[MN],E,['raita'],false,false,false,null,['probiotic','light']),
  V('Bamboo Shoot Chutney','बांस चटनी',null,'Fermented bamboo shoot chutney with dried chilli — a Northeast essential condiment.',[MN],E,['raita'],false,false,false,null),
  V('Paknam Snack','पाकनाम',null,'Lentil cake sliced and served as a snack with chutney.',[MN],E,['snack'],false,false,false,null,['protein']),
  V('Chak-Hao Modak','चक-हाओ मोदक',null,'Black rice flour sweet dumpling filled with coconut and jaggery — a Manipuri festival snack.',[MN],E,['snack'],true,false,false,null),
  V('Momo Northeast','नॉर्थईस्ट मोमो',null,'Steamed vegetable dumplings with bamboo shoot filling — a Northeast street snack.',[MN],E,['snack'],false,false,true,null),
  V('Kobi Pakoda','कोबी पकोड़ा',null,'Cabbage and onion fritters in chickpea batter — Manipuri snack.',[MN],E,['snack'],false,false,false,null),
  V('Singju Plate','सिंगजू प्लेट',null,'Raw vegetable salad plate — lotus stem, cabbage, raw papaya with roasted chickpeas and dried fish chutney.',[MN],E,['veg_side'],false,false,false,null,['light','fibre']),
  V('Eromba Side','एरोम्बा साइड',null,'Fermented fish and chilli paste with boiled yam — the Manipuri essential condiment side.',[MN],E,['veg_side'],false,false,false,null),
  V('Black Rice Puffed','चक-हाओ लाई',null,'Puffed black rice mixed with jaggery — a Manipuri festival sweet.',[MN],E,['veg_side'],true,false,false,null),
  V('Lotus Stem Salad Manipuri','कमल ककड़ी सलाद',null,'Raw thinly sliced lotus stem with green chilli and lemon — a Manipuri fresh salad.',[MN],E,['veg_side'],false,false,false,null,['fibre','light']),
  V('Ngari Paste','ङारी',null,'Fermented dried fish condiment used as flavour base — essential Manipuri pantry ingredient.',[MN],E,['veg_side'],false,false,false,null),
  V('Manipuri Akhuni','अखुनी',null,'Fermented soybean paste cooked with dried chilli — a Nagaland-Manipuri overlap condiment.',[MN],E,['veg_side'],false,false,false,null,['protein']),

  // ══════════════════════════════════════════════════════════════════════════════
  // PAN-INDIA NON-VEG — 70 dishes to push non-veg ratio toward 40%
  // Additional non-vegetarian dishes across cuisines
  // ══════════════════════════════════════════════════════════════════════════════

  NV('Chicken Tikka Masala','चिकन टिक्का मसाला',null,'Tandoor-cooked chicken tikka in a rich tomato-cream gravy — the most ordered Indian dish worldwide.',[],N,['lunch_curry'],'chicken'),
  NV('Butter Chicken','बटर चिकन',null,'Tender chicken in a velvety tomato-butter-cream sauce — the original Delhi dish now loved globally.',[],N,['lunch_curry'],'chicken'),
  NV('Chicken Saag','चिकन साग',null,'Chicken cooked with fresh spinach and spices — a nutritious restaurant and home staple.',[],N,['lunch_curry'],'chicken'),
  NV('Chicken Jalfrezi','चिकन जलफ्रेजी',null,'Chicken stir-fried with bell peppers, onion and tomato in a semi-dry spiced masala.',[],N,['lunch_curry'],'chicken'),
  NV('Chicken Dopiaza','चिकन दोप्याज़ा',null,'Chicken cooked with double the onion — caramelised at the start and added fresh at the end.',[],N,['lunch_curry'],'chicken'),
  NV('Murgh Kadhai','मुर्ग कड़ाई',null,'Chicken cooked in a kadhai with onion, tomato, capsicum and whole spices — the iconic restaurant preparation.',[],N,['lunch_curry'],'chicken'),
  NV('Chicken Achari','चिकन अचारी',null,'Chicken cooked with pickle spices — mustard, fennel, nigella — giving a sharp tangy flavour.',[],N,['dinner_curry'],'chicken'),
  NV('Chicken Manchurian','चिकन मंचूरियन',null,'Deep-fried chicken cooked in an Indo-Chinese soy-ginger-garlic sauce.',[],N,['dinner_curry'],'chicken'),
  NV('Chicken Cafreal','चिकन काफ्रेल',null,'Goan spiced green herb paste-marinated chicken grilled until charred — Portuguese-Goan preparation.',[],W,['lunch_curry'],'chicken'),
  NV('Chicken Xacuti','चिकन शागुटी',null,'Goan chicken curry with a complex roasted coconut and spice masala including star anise and dried chillies.',[],W,['lunch_curry'],'chicken'),
  NV('Mutton Rogan Josh','मटन रोगन जोश',null,'Mutton slow-cooked in Kashmiri dried chilli-based red gravy — a restaurant classic from Kashmir.',[],N,['lunch_curry'],'mutton'),
  NV('Mutton Kadhai','मटन कड़ाई',null,'Mutton cooked in a kadhai with onion, tomato and capsicum in a robust masala.',[],N,['lunch_curry'],'mutton'),
  NV('Mutton Keema Matar','मटन कीमा मटर',null,'Minced mutton with green peas in a spiced tomato-onion gravy.',[],N,['dinner_curry'],'mutton'),
  NV('Mutton Rezala','मटन रेज़ाला',null,'Mutton cooked in a white onion-yoghurt-cardamom gravy — a Bengali Mughal-influenced preparation.',[],E,['dinner_curry'],'mutton'),
  NV('Mutton Kolhapuri','मटन कोल्हापुरी',null,'Fiery mutton curry with freshly ground kolhapuri masala — a robust Maharashtra preparation.',[],W,['lunch_curry'],'mutton'),
  NV('Prawn Koliwada','प्रॉन कोलीवाडा',null,'Mumbai-style crispy fried prawns marinated in a spiced chickpea batter.',[],W,['dinner_curry'],'prawn'),
  NV('Prawn Curry Goan','गोवन प्रॉन करी',null,'Prawns in a coconut milk and Goan spice gravy with raw mango.',[],W,['lunch_curry'],'prawn'),
  NV('Prawn Balchao','प्रॉन बालचाओ',null,'Prawns pickled and cooked in a vinegar, tomato and chilli sauce — Goan Portuguese-influenced.',[],W,['dinner_curry'],'prawn'),
  NV('Crab Masala','केकड़ा मसाला',null,'Crab cooked in a spiced onion-tomato masala — popular in coastal Maharashtra and Goa.',[],W,['dinner_curry'],'crab'),
  NV('Crab Kerala Curry','केरल केकड़ा करी',null,'Crab cooked in a coconut milk and Kerala spice gravy with curry leaves.',[],S,['dinner_curry'],'crab'),
  NV('Fish Tikka','मछली टिक्का',null,'Fish pieces marinated in a spiced yoghurt and cooked in a tandoor until charred.',[],N,['dinner_curry'],'fish'),
  NV('Fish Amritsari','अमृतसरी मछली',null,'Fish pieces coated in an ajwain-spiced chickpea batter and deep-fried — the Amritsar street fish.',[],N,['snack'],'fish'),
  NV('Fish Curry Kerala','केरला फिश करी',null,'Fish cooked in a coconut-milk, raw mango and kudampuli gravy — the defining Kerala fish curry.',[],S,['lunch_curry'],'fish'),
  NV('Fish Curry Andhra','आंध्र फिश करी',null,'Fiery fish curry in a tamarind and tomato base with Andhra red chilli — pungent and bold.',[],S,['lunch_curry'],'fish'),
  NV('Rohu Fish Jhol','रोहू माछेर ঝোল',null,'Rohu fish in a thin turmeric and potato broth — the everyday Bengali fish curry.',[],E,['lunch_curry'],'fish'),
  NV('Hilsa Mustard','সরষে ইলিশ',null,'Hilsa fish in a thick mustard paste curry — steamed until the mustard flavour penetrates deep.',[],E,['lunch_curry'],'fish'),
  NV('Pomfret Fry','पोम्फ्रेट फ्राई',null,'Pomfret marinated in spiced red paste and shallow-fried until golden — a Mumbai coastal staple.',[],W,['dinner_curry'],'fish'),
  NV('Pomfret Recheado','पोम्फ्रेट रेशेडो',null,'Pomfret stuffed with Goan recheado masala paste and pan-fried until crispy.',[],W,['dinner_curry'],'fish'),
  NV('Kingfish Curry','किंगफिश करी',null,'Surmai cooked in a Konkan coconut and raw mango gravy.',[],W,['lunch_curry'],'fish'),
  NV('Tuna Curry South','टूना करी',null,'Canned or fresh tuna cooked in a Kerala coconut milk gravy with curry leaves.',[],S,['dinner_curry'],'fish'),
  NV('Mackerel Fry','बांगडा फ्राई',null,'Bangda mackerel marinated in Konkan red masala paste and pan-fried.',[],W,['dinner_curry'],'fish'),
  NV('Chicken Chettinad','चेट्टीनाड चिकन',null,'Fiery aromatic chicken curry from Chettinad with freshly ground marathi mokku and star anise.',[],S,['lunch_curry'],'chicken'),
  NV('Chicken Rasam','चिकन रसम',null,'Thin peppery chicken broth with tomato and curry leaves — South Indian chicken soup eaten with rice.',[],S,['lunch_curry'],'chicken'),
  NV('Pepper Chicken Dry','पेपर चिकन ड्राई',null,'Chicken stir-fried with black pepper, curry leaves and onion — a South Indian dry preparation.',[],S,['dinner_curry'],'chicken'),
  NV('Chicken Sukka','चिकन सुक्का',null,'Mangalorean-style dry chicken cooked with freshly grated coconut and a fierce spice paste.',[],W,['dinner_curry'],'chicken'),
  NV('Chicken Kolhapuri','चिकन कोल्हापुरी',null,'Fiery dry chicken preparation with freshly ground kolhapuri masala.',[],W,['dinner_curry'],'chicken'),
  NV('Egg Masala','अंडा मसाला',null,'Hard-boiled eggs in a thick tomato-onion masala — a versatile everyday non-veg dish.',[],N,['dinner_curry'],'egg'),
  NV('Egg Bhurji Delhi','दिल्ली अंडा भुर्जी',null,'Spiced scrambled eggs with onion, tomato and green chilli cooked in butter — Delhi dhaba style.',[],N,['breakfast'],'egg'),
  NV('Egg Curry Chettinad','चेट्टीनाड अंडा करी',null,'Hard-boiled eggs in a Chettinad spiced tomato-coconut gravy.',[],S,['dinner_curry'],'egg'),
  NV('Omelette Masala','ऑमलेट मसाला',null,'Thick spiced omelette with onion, tomato and green chilli — a dhaba breakfast staple.',[],N,['breakfast'],'egg'),
  NV('Mutton Biryani Lucknavi','मटन बिरयानी लखनवी',null,'Dum-cooked mutton and rice with Lucknawi spice blend and kewra water.',[],N,['lunch_curry'],'mutton'),
  NV('Chicken Biryani Hyderabadi','चिकन बिरयानी हैदराबादी',null,'Chicken and rice cooked dum style in the Hyderabadi tradition with saffron and fried onion.',[],S,['lunch_curry'],'chicken'),
  NV('Prawn Biryani','प्रॉन बिरयानी',null,'Basmati rice cooked with prawn in the dum style with coconut milk and coastal spices.',[],W,['lunch_curry'],'prawn'),
  NV('Chicken Pulao','चिकन पुलाव',null,'Basmati rice cooked with chicken, whole spices and fried onion — a lighter biryani alternative.',[],N,['lunch_curry'],'chicken'),
  NV('Mutton Pulao','मटन पुलाव',null,'Basmati cooked in mutton yakhni broth with whole spices — an Awadhi restaurant staple.',[],N,['lunch_curry'],'mutton'),
  NV('Chicken Tikka','चिकन टिक्का',null,'Boneless chicken marinated in yoghurt and spices, grilled in tandoor — a restaurant first course.',[],N,['dinner_curry'],'chicken'),
  NV('Seekh Kebab','सीख कबाब',null,'Minced mutton and fat spiced with Awadhi masala, skewered and grilled over charcoal.',[],N,['dinner_curry'],'mutton'),
  NV('Tandoori Chicken','तंदूरी चिकन',null,'Whole chicken marinated in yoghurt and Kashmiri chilli and grilled in a clay oven.',[],N,['dinner_curry'],'chicken'),
  NV('Mutton Chops','मटन चॉप्स',null,'Lamb chops marinated with garam masala and cooked in a tandoor — a Punjabi speciality.',[],N,['dinner_curry'],'mutton'),
  NV('Fish Fry Tamil','तमिल फिश फ्राई',null,'Fish marinated in red chilli and pepper paste and pan-fried until crispy — a Tamil home staple.',[],S,['dinner_curry'],'fish'),
  NV('Prawn Masala Goan','गोवन प्रॉन मसाला',null,'Prawns in a dry red Goan masala with coconut and vinegar.',[],W,['dinner_curry'],'prawn'),
  NV('Chicken Stew Kerala','केरल चिकन स्टू',null,'Chicken in a light coconut milk and potato stew with whole spices — the Kerala breakfast curry.',[],S,['breakfast'],'chicken'),
  NV('Egg Appam Kerala','केरल अंडा अप्पम',null,'Egg cooked inside an appam cavity — a Kerala breakfast combination.',[],S,['breakfast'],'egg'),
  NV('Mutton Kheema Naan','मटन कीमा नान',null,'Naan stuffed with spiced minced mutton — a tandoor restaurant specialty.',[],N,['bread'],'mutton'),
  NV('Chicken Kathi Kebab','चिकन काठी कबाब',null,'Chicken tikka wrapped in egg-coated paratha with onion and chutney — Kolkata kathi roll origin.',[],E,['snack'],'chicken'),
  NV('Fish Tacos Indian','फिश टाको इंडियन',null,'Crispy fried fish in a wheat wrap with mint chutney and onion — an Indo-fusion street preparation.',[],W,['snack'],'fish'),
  NV('Chicken 65','चिकन 65',null,'Deep-fried chicken marinated in red chilli, curry leaves and yoghurt — Chennai restaurant origin.',[],S,['snack'],'chicken'),
  NV('Murgh Malai Tikka','मुर्ग मलाई टिक्का',null,'Chicken marinated in cream, cardamom and cashew paste, grilled in tandoor — a white tikka.',[],N,['dinner_curry'],'chicken'),
  NV('Reshmi Kebab','रेशमी कबाब',null,'Silky smooth chicken seekh kebab with cream and cardamom — delicate and mild.',[],N,['dinner_curry'],'chicken'),
  NV('Chicken Haryali Tikka','चिकन हरियाली टिक्का',null,'Chicken marinated in a fresh herb and curd paste and grilled — a green tikka.',[],N,['dinner_curry'],'chicken'),
  NV('Duck Curry Kerala','केरल बत्तख करी',null,'Duck cooked in a spiced coconut milk gravy with raw mango — a Kerala Syrian Christian preparation.',[],S,['dinner_curry'],'duck'),
  NV('Rabbit Curry','खरगोश करी',null,'Rabbit slow-cooked in an onion-tomato masala with whole spices — a rural Indian specialty.',[],N,['dinner_curry'],'mutton'),
  NV('Pork Vindaloo','पोर्क विंदालू',null,'Pork marinated in vinegar, garlic and fierce Goan red chilli masala — a Portuguese-Goan classic.',[],W,['lunch_curry'],'pork'),
  NV('Pork Sorpotel','पोर्क सोरपोटेल',null,'Diced pork and offal cooked in a vinegar and spice sauce — Goan feast preparation stored and eaten over days.',[],W,['dinner_curry'],'pork'),
  NV('Beef Ularthiyathu','बीफ उलर्थियथु',null,'Dry-cooked beef with coconut and curry leaves in the Kerala style — a Christian community festive dish.',[],S,['dinner_curry'],'beef'),
  NV('Mutton Curry Andhra','आंध्र मटन करी',null,'Fiery mutton in a onion-tomato-red chilli gravy — Andhra-style without coconut.',[],S,['lunch_curry'],'mutton'),
  NV('Chicken Curry Dhaba','ढाबा चिकन',null,'Rustic roadside dhaba chicken cooked in a thick onion-tomato masala over a wood fire.',[],N,['lunch_curry'],'chicken'),
  NV('Mutton Curry Dhaba','ढाबा मटन',null,'Dhaba-style mutton in a dark browned onion and tomato gravy.',[],N,['dinner_curry'],'mutton'),
  NV('Chicken Lahori','चिकन लाहौरी',null,'Chicken cooked in a rich red Punjabi-Lahori masala with whole spices and cream.',[],N,['dinner_curry'],'chicken'),
  NV('Tawa Chicken','तवा चिकन',null,'Chicken cooked on a flat iron griddle with capsicum, onion and tomato.',[],N,['dinner_curry'],'chicken'),
  NV('Kadhai Gosht','कड़ाई गोश्त',null,'Mutton cooked in kadhai with whole spices, onion and capsicum — a dry preparation.',[],N,['dinner_curry'],'mutton'),
];

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log(`\nSeeding ${dishes.length} dishes (Bihari + Uttarakhandi + Manipuri + Pan-India Non-Veg)...\n`);

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
      console.log(`  Batch ${batchNum}: inserted ${batch.length} (running total: ${totalInserted})`);
    }
  }

  console.log(`\nDone. Inserted: ${totalInserted} | Errors: ${totalErrors}`);

  const bi = await client.from('dishes').select('name', { count: 'exact', head: true }).contains('cuisine', ['Bihari']);
  const uk = await client.from('dishes').select('name', { count: 'exact', head: true }).contains('cuisine', ['Uttarakhandi']);
  const mn = await client.from('dishes').select('name', { count: 'exact', head: true }).contains('cuisine', ['Manipuri']);
  const total = await client.from('dishes').select('name', { count: 'exact', head: true });
  console.log(`\nDB counts — Bihari: ${bi.count} | Uttarakhandi: ${uk.count} | Manipuri: ${mn.count}`);
  console.log(`Total dishes in DB: ${total.count}`);
}

seed().catch(console.error);
