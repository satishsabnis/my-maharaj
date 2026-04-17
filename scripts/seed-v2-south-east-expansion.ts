require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// ─── 310 dishes: Hyderabadi (70) | Sindhi (55) | Odia (55) | Assamese (60) | Chhattisgarh (40) | Street Food (30) ───

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

const HY='Hyderabadi'; const SI='Sindhi'; const OD='Odia'; const AS='Assamese'; const CG='Chhattisgarhi';
const N='NORTH'; const S='SOUTH'; const E='EAST'; const W='WEST';

const dishes = [

  // ══════════════════════════════════════════════════════════════════════════════
  // HYDERABADI — 70 dishes
  // 12 breakfast | 15 lunch_curry | 14 dinner_curry | 10 veg_side | 6 rice | 5 bread | 4 raita | 4 snack
  // ══════════════════════════════════════════════════════════════════════════════

  // breakfast (12)
  V('Hyderabadi Khichdi','हैदराबादी खिचड़ी',null,'Rice and masoor dal cooked with whole spices, tomato and green chilli — a hearty Hyderabadi morning comfort.',[HY],S,['breakfast'],false,false,false,null),
  V('Ande ka Khagina','अंडे का खागिना',null,'Soft scrambled eggs with onion, tomato, green chilli and coriander — the Hyderabadi morning egg dish.',[HY],S,['breakfast'],false,false,false,'egg'),
  V('Sheer Khurma','शीर खुर्मा',null,'Thin vermicelli cooked in full-fat milk with dried fruits and saffron — the Hyderabadi Eid morning tradition.',[HY],S,['breakfast'],true,false,false,null),
  V('Dahi Vada Hyderabadi','दही वड़ा हैदराबादी',null,'Urad dal dumplings in cold yoghurt with imli chutney and a special Hyderabadi spice mix.',[HY],S,['breakfast'],false,false,false,null,['protein','probiotic']),
  V('Bread Halwa','ब्रेड हलवा',null,'Bread cubes fried in ghee with sugar, milk and cardamom — a quick Hyderabadi sweet breakfast.',[HY],S,['breakfast'],true,false,false,null),
  NV('Kheema Paratha Hyderabadi','कीमा परांठा',null,'Minced mutton stuffed in a flaky paratha and cooked in ghee — a Hyderabadi breakfast specialty.',[HY],S,['breakfast'],'mutton'),
  V('Mirchi ka Salan Dosa','मिर्ची का सालन',null,'Green chilli salan served with plain dosa — a Hyderabadi fusion of South Indian and Deccani flavours.',[HY],S,['breakfast'],false,false,false,null),
  V('Pesarattu Hyderabadi','पेसरट्टू',null,'Crispy moong dal crepe topped with onion and ginger, served with ginger chutney — the Telangana breakfast staple.',[HY],S,['breakfast'],true,false,false,null,['protein']),
  V('Upma Hyderabadi','उपमा हैदराबादी',null,'Semolina upma enriched with peanuts, cashews and curry leaves in the Hyderabadi style.',[HY],S,['breakfast'],false,false,false,null),
  V('Shikampuri Kebab Breakfast','शिकमपुरी कबाब',null,'Minced mutton stuffed with curd kebab — sometimes served at breakfast in traditional Hyderabadi homes.',[HY],S,['breakfast'],false,false,false,'mutton'),
  V('Rava Idli Hyderabadi','रवा इडली',null,'Instant semolina idli with cashews and mustard — the quick Hyderabadi breakfast idli.',[HY],S,['breakfast'],false,false,false,null),
  V('Luqmi','लुकमी',null,'Flaky pastry square stuffed with minced meat — a Hyderabadi Eid breakfast savoury.',[HY],S,['breakfast'],false,false,false,'mutton'),

  // lunch_curry (15)
  NV('Hyderabadi Biryani','हैदराबादी बिरयानी',null,'Dum-cooked basmati and mutton layered with saffron, fried onion and mint — the most celebrated biryani in the world.',[HY],S,['lunch_curry'],'mutton'),
  NV('Mutton Marag','मटन मारग',null,'Tender mutton on the bone cooked in a clear aromatic broth with whole spices and green chilli.',[HY],S,['lunch_curry'],'mutton'),
  V('Mirchi ka Salan','मिर्ची का सालन',null,'Large green chillies cooked in a peanut, sesame and tamarind gravy — the essential Hyderabadi biryani accompaniment.',[HY],S,['lunch_curry'],false,false,false,null),
  NV('Hyderabadi Chicken Korma','हैदराबादी चिकन कोरमा',null,'Chicken in a rich browned onion and yoghurt gravy with Deccani spices and rose water.',[HY],S,['lunch_curry'],'chicken'),
  V('Bagara Baingan','बगारा बैंगन',null,'Small aubergines stuffed with peanut-sesame paste and cooked in a tamarind gravy — the definitive Hyderabadi vegetable dish.',[HY],S,['lunch_curry'],false,false,false,null),
  NV('Pathar ka Gosht','पत्थर का गोश्त',null,'Mutton beaten thin and cooked on a sizzling stone heated over a fire — the Hyderabadi stone-grilled meat.',[HY],S,['lunch_curry'],'mutton'),
  V('Hyderabadi Khatti Dal','खट्टी दाल',null,'Masoor dal cooked with tamarind and a robust tempering of mustard, dried red chilli and curry leaves.',[HY],S,['lunch_curry'],false,false,false,null,['protein']),
  NV('Kachche Gosht ki Biryani','कच्चे गोश्त बिरयानी',null,'Raw mutton layered with raw rice and cooked together under dum — the authentic Hyderabadi dum method.',[HY],S,['lunch_curry'],'mutton'),
  V('Aloo ka Khatta','आलू का खट्टा',null,'Potatoes in a tamarind and tomato sour gravy with whole spices — a simple everyday Hyderabadi dish.',[HY],S,['lunch_curry'],false,false,false,null),
  NV('Haleem Hyderabadi','हलीम हैदराबादी',null,'Slow-cooked broken wheat and mutton pounded until smooth — the iconic Hyderabadi Ramzan street food.',[HY],S,['lunch_curry'],'mutton'),
  V('Pachi Pulusu','पची पुलुसू',null,'Raw tamarind rasam with green chilli and onion — a Telangana sour soup eaten with rice.',[HY],S,['lunch_curry'],false,false,false,null,['light']),
  NV('Gosht ka Korma Hyderabadi','गोश्त कोरमा',null,'Mutton slow-cooked in a Deccani spice paste with coconut and poppy seeds.',[HY],S,['lunch_curry'],'mutton'),
  V('Hyderabadi Kaddu ka Dalcha','कद्दू दालचा',null,'Yellow lentils and bottle gourd cooked with tamarind and whole spices — the vegetarian Hyderabadi dalcha.',[HY],S,['lunch_curry'],false,false,false,null,['protein','fibre']),
  NV('Biryani Vegetable Hyderabadi','वेजिटेबल बिरयानी',null,'Mixed vegetables and basmati cooked under dum with saffron and Hyderabadi spice masala.',[HY],S,['lunch_curry'],null),
  V('Tamatar ka Kut','टमाटर का कूट',null,'Roasted tomato and garlic chutney tempered with curry leaves and dried red chilli — a Hyderabadi condiment-curry.',[HY],S,['lunch_curry'],false,false,false,null),

  // dinner_curry (14)
  NV('Hyderabadi Keema','हैदराबादी कीमा',null,'Minced mutton cooked with onion, green peas, tomato and Hyderabadi masala blend.',[HY],S,['dinner_curry'],'mutton'),
  V('Paneer Makhani Hyderabadi','पनीर मखनी हैदराबादी',null,'Paneer in a tomato-cream sauce with Deccani spice notes — the Hyderabadi version of butter paneer.',[HY],S,['dinner_curry'],false,false,false,null),
  NV('Kheema Matar Hyderabadi','कीमा मटर',null,'Minced mutton with peas in a thick Hyderabadi spice gravy.',[HY],S,['dinner_curry'],'mutton'),
  V('Dum ka Baigan','दम का बैंगन',null,'Large aubergine cooked whole under dum with a peanut stuffing — Hyderabadi dum vegetable.',[HY],S,['dinner_curry'],false,false,false,null),
  NV('Murgh Changezi Hyderabadi','मुर्ग चंगेजी',null,'Chicken cooked in a rich onion cream sauce in the Mughal tradition popular in Hyderabad.',[HY],S,['dinner_curry'],'chicken'),
  V('Mixed Veg Salan','मिक्स वेज सालन',null,'Mixed vegetables cooked in a peanut-sesame salan base — the vegetarian Hyderabadi gravy.',[HY],S,['dinner_curry'],false,false,false,null),
  NV('Gosht Paya','गोश्त पाया',null,'Slow-cooked trotters in a thin spiced bone broth — eaten at dawn during Ramzan with naan.',[HY],S,['dinner_curry'],'mutton'),
  V('Boti Kebab Curry','बोटी कबाब करी',null,'Mutton chunks marinated and cooked in a semi-dry spiced masala — served as a dinner side.',[HY],S,['dinner_curry'],false,false,false,'mutton'),
  V('Pesara Pappu','पेसरा पप्पू',null,'Moong dal cooked in the Telangana style with green chilli and a mustard-garlic tadka.',[HY],S,['dinner_curry'],false,false,false,null,['protein','light']),
  NV('Hyderabadi Fish Curry','हैदराबादी मछली करी',null,'Fish cooked in a tangy tamarind and coconut gravy with curry leaves — Deccani coastal influence.',[HY],S,['dinner_curry'],'fish'),
  V('Khatti Arhar Dal','खट्टी अरहर दाल',null,'Pigeon pea dal with tamarind and a Hyderabadi tempering of mustard and asafoetida.',[HY],S,['dinner_curry'],false,false,false,null,['protein']),
  V('Aloo Bukhara Gosht Veg','आलू बुखारा',null,'Plum and potato cooked in a sweet-sour gravy — a Hyderabadi vegetarian preparation influenced by Mughal cuisine.',[HY],S,['dinner_curry'],false,false,false,null),
  NV('Chicken 65 Curry','चिकन 65',null,'Spicy fried chicken cooked into a curry with yoghurt and curry leaves — Hyderabadi street food style.',[HY],S,['dinner_curry'],'chicken'),
  V('Bagara Chawal','बगारा चावल',null,'Basmati cooked with whole spices and fried onion as a light dinner rice — eaten with dalcha.',[HY],S,['dinner_curry'],false,false,false,null),

  // veg_side (10)
  V('Hyderabadi Raita','हैदराबादी रायता',null,'Boondi in yoghurt with roasted cumin and Hyderabadi spice mix — served with biryani.',[HY],S,['raita'],false,false,false,null,['probiotic']),
  V('Khubani ka Meetha','खुबानी का मीठा',null,'Dried Hyderabadi apricots cooked in sugar syrup and served with cream — the iconic Hyderabadi dessert.',[HY],S,['veg_side'],true,false,false,null),
  V('Double ka Meetha','डबल का मीठा',null,'Bread pudding made with fried bread soaked in saffron milk and topped with cream and nuts.',[HY],S,['veg_side'],true,false,false,null),
  V('Qubani Chutney','कुबानी चटनी',null,'Apricot chutney with cloves and cinnamon — a Hyderabadi condiment for biryani.',[HY],S,['veg_side'],true,false,false,null),
  V('Lukhmi Veg','लुकमी वेज',null,'Flaky pastry stuffed with spiced potato — the vegetarian Hyderabadi pastry snack.',[HY],S,['snack'],false,false,false,null),
  V('Osmania Biscuit','ओस्मानिया बिस्कुट',null,'Crispy mildly sweet Hyderabadi tea biscuit — a Nimrah Cafe classic.',[HY],S,['snack'],true,false,false,null),
  V('Hyderabadi Samosa','हैदराबादी समोसा',null,'Triangular pastry stuffed with spiced minced meat or vegetable in the Deccani style.',[HY],S,['snack'],false,false,true,null),
  V('Irani Chai','ईरानी चाय',null,'Milky tea brewed in the Hyderabadi Irani style with condensed milk and served with Osmania biscuit.',[HY],S,['snack'],true,false,false,null),
  V('Pulihora Hyderabadi','पुलिहोरा',null,'Tamarind rice tempered with peanuts, mustard and curry leaves — the Hyderabadi Andhra tamarind rice.',[HY],S,['rice'],false,false,false,null),
  V('Coconut Rice Hyderabadi','नारियल चावल',null,'Basmati cooked with fresh coconut, curry leaves and mustard — the South-influenced Hyderabadi rice.',[HY],S,['rice'],false,false,false,null),

  // rice (remaining)
  V('Zeera Rice Hyderabadi','जीरा चावल',null,'Basmati cooked with whole cumin and ghee — the everyday Hyderabadi plain rice.',[HY],S,['rice'],false,false,false,null),
  V('Dalcha Rice','दालचा चावल',null,'Rice served with lentil and mutton dalcha — the traditional Hyderabadi combination.',[HY],S,['rice'],false,false,false,null),
  V('Kichdi Hyderabadi','खिचड़ी',null,'Rice and toor dal cooked with onion and whole spices — a Hyderabadi comfort khichdi.',[HY],S,['rice'],false,false,false,null),
  V('Tomato Rice Hyderabadi','टमाटर चावल',null,'Rice cooked with roasted tomato paste and spices — the everyday Telangana rice preparation.',[HY],S,['rice'],false,false,false,null),

  // bread (5)
  V('Sheermal Hyderabadi','शीरमाल',null,'Saffron milk bread baked in a tandoor — the Hyderabadi festive bread.',[HY],S,['bread'],true,false,false,null),
  V('Naan Hyderabadi','नान हैदराबादी',null,'Leavened tandoor bread brushed with butter — the restaurant bread of Hyderabadi establishments.',[HY],S,['bread'],false,false,false,null),
  V('Warqa Paratha Hyderabadi','वर्का परांठा',null,'Layered flaky Hyderabadi paratha — eaten with nihari or korma.',[HY],S,['bread'],false,false,false,null),
  V('Kubbus','कुब्बूस',null,'Round flatbread baked on a griddle — the everyday Hyderabadi Muslim household bread.',[HY],S,['bread'],false,false,false,null),
  V('Parotta Hyderabadi','परोटा',null,'Multi-layered flaky bread cooked in oil on a griddle — Hyderabadi southern-influenced bread.',[HY],S,['bread'],false,false,false,null),

  // raita (remaining)
  V('Dahi Chutney Hyderabadi','दही चटनी',null,'Yoghurt mixed with raw mint, coriander and green chilli — the fresh Hyderabadi raita.',[HY],S,['raita'],false,false,false,null,['probiotic']),
  V('Kacchi Lassi Hyderabadi','कच्ची लस्सी',null,'Plain thin yoghurt drink served ice cold — the Hyderabadi summer refreshment with biryani.',[HY],S,['raita'],true,false,false,null,['probiotic']),
  V('Tamatar Raita Hyderabadi','टमाटर रायता',null,'Tomato and onion in yoghurt with roasted cumin and red chilli powder.',[HY],S,['raita'],false,false,false,null,['probiotic']),

  // ══════════════════════════════════════════════════════════════════════════════
  // SINDHI — 55 dishes
  // 10 breakfast | 12 lunch_curry | 11 dinner_curry | 8 veg_side | 5 rice | 5 bread | 4 raita
  // ══════════════════════════════════════════════════════════════════════════════

  // breakfast (10)
  V('Sindhi Koki','सिंधी कोकी',null,'Thick crispy whole wheat flatbread with onion, green chilli, coriander and carom seeds — the beloved Sindhi breakfast bread.',[SI],N,['breakfast'],false,false,false,null),
  V('Sindhi Dal Pakwan','सिंधी दाल पकवान',null,'Crispy deep-fried wheat wafers served with chana dal, tamarind and green chutneys — the iconic Sindhi Sunday breakfast.',[SI],N,['breakfast'],false,false,false,null,['protein']),
  V('Sindhi Seyun Patata','सिंधी सेवइयां आलू',null,'Thin vermicelli and potato cooked with onion and spices — a Sindhi morning savoury.',[SI],N,['breakfast'],false,false,false,null),
  V('Besan ja Phulka','बेसन फुलका',null,'Thin chickpea flour flatbread spiced with ajwain and salt — a quick Sindhi protein breakfast.',[SI],N,['breakfast'],false,false,false,null,['protein']),
  V('Aloo Tuk','आलू टुक',null,'Twice-fried crispy potatoes in a cumin and dried mango powder spice — the Sindhi signature crispy potato.',[SI],N,['breakfast'],false,false,false,null),
  V('Seero','सीरो',null,'Semolina halwa with ghee, sugar and cardamom — the Sindhi version of sheera eaten at festivals and births.',[SI],N,['breakfast'],true,false,false,null),
  V('Sindhi Paratha Pyaaz','सिंधी प्याज परांठा',null,'Thick wheat paratha stuffed with onion and green chilli — filling and spiced in the Sindhi tradition.',[SI],N,['breakfast'],false,false,false,null),
  V('Jalebi Sindhi','सिंधी जलेबी',null,'Fresh crispy jalebis eaten with thick dahi — a Sindhi festive morning combination.',[SI],N,['breakfast'],true,false,false,null),
  NV('Egg Bhurji Sindhi','सिंधी अंडा भुर्जी',null,'Scrambled eggs with onion, tomato, green chilli and Sindhi masala — a Sindhi breakfast staple.',[SI],N,['breakfast'],'egg'),
  V('Sindhi Lassi','सिंधी लस्सी',null,'Thick sweet or salted yoghurt drink with cardamom — the cooling Sindhi morning beverage.',[SI],N,['breakfast'],true,false,false,null,['probiotic']),

  // lunch_curry (12)
  V('Sindhi Kadhi','सिंधी कढ़ी',null,'Gram flour and yoghurt curry with vegetables — the defining Sindhi dish, tangy and thick, eaten with rice.',[SI],N,['lunch_curry'],false,false,false,null,['protein']),
  NV('Sindhi Mutton Curry','सिंधी मटन करी',null,'Mutton slow-cooked with onion, tomato and Sindhi spice blend in a semi-dry masala.',[SI],N,['lunch_curry'],'mutton'),
  V('Sai Bhaji','साई भाजी',null,'Spinach cooked with lentils, tomato and mixed vegetables in a pressure cooker — the nutritional powerhouse of Sindhi cooking.',[SI],N,['lunch_curry'],false,false,false,null,['iron-rich','protein','fibre']),
  V('Dal Sindhi','सिंधी दाल',null,'Mixed yellow lentils cooked with tomato and a generous Sindhi tadka of dried red chilli and garlic in oil.',[SI],N,['lunch_curry'],false,false,false,null,['protein']),
  NV('Sindhi Fish Curry','सिंधी मछली करी',null,'Fish in a tangy tomato and onion gravy with Sindhi spices and raw mango powder.',[SI],N,['lunch_curry'],'fish'),
  V('Koki Sabzi','कोकी सब्जी',null,'Crispy koki bread served alongside a simple potato or tomato curry — a complete Sindhi meal.',[SI],N,['lunch_curry'],false,false,false,null),
  NV('Sindhi Chicken','सिंधी चिकन',null,'Chicken cooked in a semi-dry masala with onion, tomato and dried plums — a Sindhi home preparation.',[SI],N,['lunch_curry'],'chicken'),
  V('Chole Sindhi','सिंधी छोले',null,'Whole chickpeas in a dark tangy gravy made with dried pomegranate seeds and tamarind.',[SI],N,['lunch_curry'],false,false,false,null,['protein','fibre']),
  V('Kaddu ji Sabzi','कद्दू जी सब्जी',null,'Bottle gourd cooked with onion, tomato and Sindhi spices — an everyday Sindhi vegetarian preparation.',[SI],N,['lunch_curry'],false,false,false,null,['fibre']),
  NV('Sindhi Kheema','सिंधी कीमा',null,'Minced meat cooked with onion, tomato, peas and Sindhi masala.',[SI],N,['lunch_curry'],'mutton'),
  V('Toover ji Dal','तुवर जी दाल',null,'Toor dal cooked with tomato and tempered with mustard oil and curry leaves in Sindhi style.',[SI],N,['lunch_curry'],false,false,false,null,['protein']),
  V('Bhughal Gosht Veg','भुगल सब्जी',null,'Mixed vegetables cooked in a semi-dry browned onion masala — a dry Sindhi vegetable preparation.',[SI],N,['lunch_curry'],false,false,false,null),

  // dinner_curry (11)
  NV('Sindhi Biryani','सिंधी बिरयानी',null,'Basmati rice layered with mutton, plums, tomato and fried potatoes — sharper and more pungent than other biryanis.',[SI],N,['dinner_curry'],'mutton'),
  V('Aloo Tuk Curry','आलू टुक करी',null,'Twice-fried crispy potatoes cooked in a tomato and onion gravy — the Sindhi signature potato curry.',[SI],N,['dinner_curry'],false,false,false,null),
  V('Bhindi Sindhi','सिंधी भिंडी',null,'Okra cooked dry with onion, amchur and Sindhi spices — a crispy flavourful preparation.',[SI],N,['dinner_curry'],false,false,false,null),
  NV('Prawn Sindhi','सिंधी झींगा',null,'Prawns cooked with onion, tomato and kokum in Sindhi spice blend.',[SI],N,['dinner_curry'],'prawn'),
  V('Sindhi Saibhaji Lite','साई भाजी लाइट',null,'Lighter version of sai bhaji with just spinach and tomato — a quick dinner version.',[SI],N,['dinner_curry'],false,false,false,null,['iron-rich','light']),
  V('Moong Moth Mix','मूंग मोठ मिक्स',null,'Sprouted moong and moth beans cooked together with onion and spices — high-protein Sindhi dinner.',[SI],N,['dinner_curry'],false,false,false,null,['protein']),
  NV('Sindhi Mutton Palak','सिंधी मटन पालक',null,'Mutton and spinach cooked together with Sindhi masala.',[SI],N,['dinner_curry'],'mutton'),
  V('Tamatar ji Kadhi','टमाटर जी कढ़ी',null,'Tomato-based thin Sindhi kadhi without vegetables — a lighter dinner version.',[SI],N,['dinner_curry'],false,false,false,null,['light']),
  V('Phulka Sabzi','फुलका सब्जी',null,'Thin rotis served with a simple besan or mixed vegetable curry — everyday Sindhi dinner plate.',[SI],N,['dinner_curry'],false,false,false,null),
  NV('Sindhi Chicken Handi','सिंधी चिकन हांडी',null,'Chicken cooked in a clay pot with onion, tomato and whole Sindhi spices.',[SI],N,['dinner_curry'],'chicken'),
  V('Arbi Sindhi','सिंधी अरबी',null,'Colocasia cooked dry with mango powder and Sindhi spices — tangy and earthy.',[SI],N,['dinner_curry'],false,false,false,null),

  // veg_side (8)
  V('Sindhi Papad','सिंधी पापड़',null,'Thin lentil wafer cooked over flame — eaten as a side or crushed into dal.',[SI],N,['veg_side'],false,false,false,null),
  V('Imli Chutney Sindhi','सिंधी इमली चटनी',null,'Tamarind and jaggery chutney with cumin — standard Sindhi condiment.',[SI],N,['veg_side'],true,false,false,null),
  V('Coriander Mint Chutney','धनिया पुदीना चटनी',null,'Fresh green chutney ground with lemon and garlic — served with koki and pakwan.',[SI],N,['veg_side'],false,false,false,null),
  V('Sindhi Mango Achar','सिंधी आम अचार',null,'Raw mango pickle in mustard oil with fenugreek seeds — a Sindhi pantry staple.',[SI],N,['veg_side'],false,false,false,null),
  V('Sindhi Raita','सिंधी रायता',null,'Thick yoghurt with boondi and roasted cumin — served alongside sindhi kadhi rice.',[SI],N,['raita'],false,false,false,null,['probiotic']),
  V('Phulka Sindhi','सिंधी फुलका',null,'Thin unleavened wheat rotis cooked on a tawa — the everyday Sindhi bread.',[SI],N,['bread'],false,false,false,null),
  V('Sanna Pakora','सन्ना पकोड़ा',null,'Light fermented batter fritters — a Sindhi snack influenced by Goan sanna tradition.',[SI],N,['snack'],false,false,false,null),
  V('Mitho Lolo','मीठो लोलो',null,'Sweet flatbread made with wheat, ghee and jaggery — a Sindhi festive bread sweet.',[SI],N,['bread'],true,false,false,null),

  // rice (5)
  V('Sindhi Kadhi Chawal','सिंधी कढ़ी चावल',null,'Sindhi kadhi served over plain basmati — the ultimate Sindhi comfort meal combination.',[SI],N,['rice'],false,false,false,null),
  V('Pulao Sindhi','सिंधी पुलाव',null,'Basmati with whole spices and fried onion — the everyday Sindhi rice.',[SI],N,['rice'],false,false,false,null),
  V('Khichdi Sindhi','सिंधी खिचड़ी',null,'Rice and moong dal khichdi with ghee tadka — Sindhi comfort food.',[SI],N,['rice'],true,false,false,null,['protein','light']),
  V('Seyun','सेवइयां',null,'Thin wheat vermicelli cooked in sweetened milk with saffron and dry fruits — Sindhi dessert rice alternative.',[SI],N,['rice'],true,false,false,null),
  V('Zeera Rice Sindhi','जीरा चावल सिंधी',null,'Plain basmati with a cumin tadka — served with sai bhaji.',[SI],N,['rice'],true,false,false,null),

  // bread and raita remaining
  V('Koki Dinner','कोकी',null,'Thick spiced wheat bread cooked in ghee at dinner — eaten with plain yoghurt.',[SI],N,['bread'],false,false,false,null),
  V('Bhatura Sindhi','सिंधी भटूरा',null,'Deep-fried leavened bread eaten with chole or dal in the Sindhi style.',[SI],N,['bread'],false,false,false,null),
  V('Dahi Sindhi','सिंधी दही',null,'Set yoghurt served cold alongside sindhi biryani.',[SI],N,['raita'],true,false,false,null,['probiotic']),
  V('Lassi Sindhi Namkeen','नमकीन लस्सी',null,'Salted thin buttermilk with roasted cumin — cooling digestive.',[SI],N,['raita'],true,false,false,null,['probiotic','light']),
  V('Kheera Dahi Sindhi','खीरा दही सिंधी',null,'Cucumber in yoghurt with cumin and salt — light Sindhi raita.',[SI],N,['raita'],true,false,false,null,['probiotic']),

  // ══════════════════════════════════════════════════════════════════════════════
  // ODIA — 55 dishes
  // 10 breakfast | 12 lunch_curry | 11 dinner_curry | 8 veg_side | 5 rice | 5 bread | 4 raita
  // ══════════════════════════════════════════════════════════════════════════════

  // breakfast (10)
  V('Pakhala','पाखाला',null,'Fermented cooked rice soaked in water overnight — eaten with fried fish, badi and saga bhaja.',[OD],E,['breakfast'],false,false,false,null,['probiotic','light']),
  V('Enduri Pitha','ऐंदुरी पिठा',null,'Steamed rice cake stuffed with sweetened coconut and jaggery, wrapped in turmeric leaf — an Odia festival pitha.',[OD],E,['breakfast'],true,false,false,null),
  V('Chhena Poda','छेना पोड़ा',null,'Caramelised cottage cheese baked with jaggery and cardamom until darkly crusted — the national sweet of Odisha.',[OD],E,['breakfast'],true,false,false,null),
  V('Dali Bara','दाली बड़ा',null,'Crispy deep-fried urad and chana dal fritters served with chutneys — a popular Odia morning street snack.',[OD],E,['breakfast'],false,false,false,true,null),
  V('Upma Odia','उपमा ओड़िया',null,'Semolina upma with mustard, curry leaves and grated coconut in Odia style.',[OD],E,['breakfast'],false,false,false,null),
  V('Aloo Dum Odia','आलू दम ओड़िया',null,'Baby potatoes in a spiced tomato-onion gravy with panch phutana — the Odia morning curry.',[OD],E,['breakfast'],false,false,false,null),
  V('Chakuli Pitha','चकुली पिठा',null,'Thin crispy rice flour crepes — the Odia dosa eaten for breakfast with coconut chutney.',[OD],E,['breakfast'],true,false,false,null),
  V('Santula','सन्तुला',null,'Lightly spiced boiled mixed vegetables with mustard and panch phutana — a simple healthy Odia breakfast side.',[OD],E,['breakfast'],true,false,false,null,['light','fibre']),
  V('Mitha Poda Pitha','मीठा पोड़ा पिठा',null,'Baked rice cake sweetened with jaggery — a simple Odia home sweet.',[OD],E,['breakfast'],true,false,false,null),
  NV('Machha Besara Breakfast','माछ बेसरा',null,'Fish in a mustard paste curry eaten with pakhala — the classic Odia morning fish preparation.',[OD],E,['breakfast'],'fish'),

  // lunch_curry (12)
  NV('Machha Jhola','माछ झोल',null,'Mustard-spiced fish curry cooked with potato and tomato — the essential everyday Odia fish curry.',[OD],E,['lunch_curry'],'fish'),
  V('Dalma','दालमा',null,'Arhar dal cooked with seasonal vegetables, raw banana, raw papaya and panch phutana — the soul food of Odisha.',[OD],E,['lunch_curry'],false,false,false,null,['protein','fibre']),
  NV('Odia Mutton Curry','ओड़िया मटन करी',null,'Mutton in a mustard oil and onion-tomato gravy with whole spices — Odia style without coconut.',[OD],E,['lunch_curry'],'mutton'),
  V('Besara','बेसरा',null,'Vegetables cooked in a mustard paste and turmeric gravy — the unique mustard-forward Odia curry technique.',[OD],E,['lunch_curry'],false,false,false,null),
  NV('Chingudi Jhola','चिंगुड़ी झोल',null,'Prawn curry cooked with onion, tomato and turmeric in mustard oil — a coastal Odia preparation.',[OD],E,['lunch_curry'],'prawn'),
  V('Arisha Pitha','अरिसा पिठा',null,'Deep-fried rice cake sweetened with jaggery — the Odia sacred temple sweet.',[OD],E,['lunch_curry'],true,false,false,null),
  V('Kakharu Phula Bhaja','काखारू फुला भाजा',null,'Pumpkin flower fritters fried in mustard oil — a seasonal Odia delicacy.',[OD],E,['lunch_curry'],false,false,false,null),
  V('Saga Bhaja','साग भाजा',null,'Stir-fried amaranth or spinach with garlic and dried red chilli in mustard oil — everyday Odia greens.',[OD],E,['lunch_curry'],false,false,false,null,['iron-rich','fibre']),
  NV('Odia Chicken Curry','ओड़िया चिकन करी',null,'Chicken cooked in a spiced onion-tomato gravy with panch phutana and mustard oil.',[OD],E,['lunch_curry'],'chicken'),
  V('Ghanta Tarkari','घंट तरकारी',null,'Mixed dry vegetables cooked together with panch phutana — the Odia temple prasad mixed vegetable dish.',[OD],E,['lunch_curry'],false,false,false,null,['fibre']),
  V('Khata Odia','खाटा ओड़िया',null,'Raw mango and pineapple cooked in a jaggery and spice sweet-sour gravy — the signature Odia sweet-sour dish.',[OD],E,['lunch_curry'],false,false,false,null),
  V('Odia Dal','ओड़िया दाल',null,'Arhar dal tempered with panch phutana — the everyday dal of Odia households.',[OD],E,['lunch_curry'],false,false,false,null,['protein']),

  // dinner_curry (11)
  NV('Ilishi Machha Bhaja','इलिशी माछ भाजा',null,'Hilsa fish shallow-fried in mustard oil with turmeric and salt — the simplest and most beloved Odia fish preparation.',[OD],E,['dinner_curry'],'fish'),
  V('Kakara Pitha','ककड़ा पिठा',null,'Deep-fried rice flour cakes stuffed with sweetened coconut and sesame — a snack or light dinner sweet.',[OD],E,['dinner_curry'],true,false,false,null),
  V('Dahi Machha','दही माछ',null,'Fish cooked in a yoghurt gravy with onion and panch phutana — a light Odia yoghurt fish preparation.',[OD],E,['dinner_curry'],false,false,false,'fish'),
  V('Aloo Potala Rasa','आलू पोटल रसा',null,'Potato and pointed gourd cooked in a light tomato gravy — an Odia temple-style vegetable.',[OD],E,['dinner_curry'],false,false,false,null),
  NV('Machha Besara Dinner','माछ बेसरा',null,'Fish in a thick mustard paste gravy — the dinner version cooked with more mustard.',[OD],E,['dinner_curry'],'fish'),
  V('Kosha Aloo Odia','कोशा आलू ओड़िया',null,'Slow-fried potatoes in a dry onion masala — a pan-fried Odia potato preparation.',[OD],E,['dinner_curry'],false,false,false,null),
  V('Panasa Tarkari','पनस तरकारी',null,'Raw jackfruit cooked with panch phutana in an Odia dry masala.',[OD],E,['dinner_curry'],false,false,false,null,['fibre']),
  NV('Odia Egg Curry','ओड़िया अंडा करी',null,'Hard-boiled eggs in a tomato and onion gravy tempered with mustard and curry leaves.',[OD],E,['dinner_curry'],'egg'),
  V('Pumpkin Khatta','कद्दू खाटा',null,'Pumpkin cooked in sweet-sour tamarind and jaggery gravy — an Odia dinner side.',[OD],E,['dinner_curry'],false,false,false,null),
  V('Badi Chura','बड़ी चूरा',null,'Crushed sun-dried lentil dumplings tossed with mustard oil and onion — a pantry side dish of Odisha.',[OD],E,['dinner_curry'],false,false,false,null,['protein']),
  V('Odia Khichdi','ओड़िया खिचड़ी',null,'Rice and moong dal khichdi cooked with ghee and panch phutana — temple prasad style.',[OD],E,['dinner_curry'],true,false,false,null,['protein','light']),

  // veg_side + bread + rice + raita
  V('Pakhala Bhat','पाखाला भात',null,'Fermented water rice served cold with accompaniments — the summer comfort meal of Odisha.',[OD],E,['rice'],false,false,false,null,['probiotic','light']),
  V('Curd Rice Odia','दही चावल',null,'Cooked rice mixed with yoghurt and tempered with mustard and curry leaves.',[OD],E,['rice'],false,false,false,null,['probiotic','light']),
  V('Kichdi Odia Temple','ओड़िया खिचड़ी',null,'Basmati rice and moong dal cooked as prasad with ghee and whole spices.',[OD],E,['rice'],true,false,false,null),
  V('Jobra Bhaat','जोबरा भात',null,'Plain boiled rice served with dalma — the staple Odia rice combination.',[OD],E,['rice'],true,false,false,null),
  V('Poha Odia','ओड़िया पोहा',null,'Flattened rice with mustard, onion and green chilli in Odia style.',[OD],E,['rice'],false,false,false,null),
  V('Roti Odia','ओड़िया रोटी',null,'Plain whole wheat roti cooked on tawa with ghee.',[OD],E,['bread'],true,false,false,null),
  V('Manda Pitha Bread','मांडा पिठा',null,'Steamed rice dumpling with coconut filling — the everyday Odia rice bread-cake.',[OD],E,['bread'],true,false,false,null),
  V('Arisha Puri','अरिसा पूरी',null,'Deep-fried rice flour puri sweetened with jaggery — a festival bread of Odisha.',[OD],E,['bread'],true,false,false,null),
  V('Puri Odia','ओड़िया पूरी',null,'Deep-fried whole wheat puri served with aloo dum — the Odia Sunday breakfast bread.',[OD],E,['bread'],false,false,false,null),
  V('Paratha Odia','ओड़िया परांठा',null,'Whole wheat paratha cooked in ghee — Odia daily bread.',[OD],E,['bread'],true,false,false,null),
  V('Dahi Odia','ओड़िया दही',null,'Set yoghurt in earthen pot — served cold with pakhala.',[OD],E,['raita'],true,false,false,null,['probiotic']),
  V('Aam Panna Odia','आम पन्ना ओड़िया',null,'Raw mango cooler with roasted cumin — served as a summer drink with lunch.',[OD],E,['raita'],true,false,false,null),
  V('Mooli Dahi','मूली दही ओड़िया',null,'Grated radish in yoghurt with mustard — a sharp cooling Odia raita.',[OD],E,['raita'],false,false,false,null,['probiotic']),
  V('Tomato Raita Odia','टमाटर रायता ओड़िया',null,'Tomato in thin yoghurt with cumin and coriander — light Odia raita.',[OD],E,['raita'],false,false,false,null,['probiotic']),
  V('Panch Phutana Achar','पंच फुटाना अचार',null,'Seasonal vegetable pickle in mustard oil tempered with five spice seeds — Odia pantry condiment.',[OD],E,['veg_side'],false,false,false,null),
  V('Chhena Jhili','छेना झिली',null,'Fried fresh cheese patties — Odia cottage cheese preparation eaten as snack or sweet.',[OD],E,['veg_side'],true,false,false,null),
  V('Rasabali','रसाबली',null,'Fried flattened cheese rounds in thick sweetened milk — Odia temple sweet.',[OD],E,['veg_side'],true,false,false,null),

  // ══════════════════════════════════════════════════════════════════════════════
  // ASSAMESE / NORTHEAST — 60 dishes
  // 10 breakfast | 13 lunch_curry | 12 dinner_curry | 10 veg_side | 5 rice | 5 bread | 5 raita
  // ══════════════════════════════════════════════════════════════════════════════

  // breakfast (10)
  V('Pitha Assamese','पिठा असमिया',null,'Steamed or fried rice cake stuffed with coconut and til filling — the Bihu festival morning treat.',[AS],E,['breakfast'],true,false,false,null),
  V('Jolpan','जोलपान',null,'Traditional Assamese breakfast platter of poha, curd, jaggery and coconut — a cold no-cook morning meal.',[AS],E,['breakfast'],true,false,false,null,['probiotic']),
  V('Kosu Xaak Bhaji','कोसू साक भाजी',null,'Stir-fried colocasia leaves with mustard and dry red chilli — a common Assamese morning side.',[AS],E,['breakfast'],false,false,false,null,['iron-rich']),
  V('Luchi Assamese','लुची',null,'Soft deep-fried white flour puri — the weekend breakfast of Assamese homes.',[AS],E,['breakfast'],false,false,false,null),
  V('Bhaat Dail','भात दाइल',null,'Plain rice with simple arhar dal — the everyday light breakfast-lunch combination of Assam.',[AS],E,['breakfast'],false,false,false,null,['protein','light']),
  V('Bora Saul Pitha','बोरा साउल पिठा',null,'Glutinous rice cake steamed in banana leaf — a Bihu season sweet.',[AS],E,['breakfast'],true,false,false,null),
  V('Poita Bhat','पोइता भात',null,'Fermented overnight rice eaten with mustard oil, onion and salt — a nutritious Assamese morning cooling meal.',[AS],E,['breakfast'],false,false,false,null,['probiotic']),
  NV('Egg Bhurji Assamese','असमिया अंडा भुर्जी',null,'Scrambled eggs with onion, green chilli and a touch of turmeric in mustard oil.',[AS],E,['breakfast'],'egg'),
  V('Chira Dahi','चिरा दही',null,'Flattened rice with thick yoghurt and jaggery — a simple cool Assamese breakfast.',[AS],E,['breakfast'],true,false,false,null,['probiotic']),
  V('Suji Halwa Assamese','सूजी हलवा असमिया',null,'Semolina cooked with ghee, sugar and cardamom — quick festive Assamese sweet breakfast.',[AS],E,['breakfast'],true,false,false,null),

  // lunch_curry (13)
  NV('Masor Tenga','मासोर टेंगा',null,'Sour fish curry with elephant apple, tomato and lemon — the signature Assamese tangy fish dish.',[AS],E,['lunch_curry'],'fish'),
  V('Aloo Pitika','आलू पिटिका',null,'Mashed potatoes with mustard oil, raw onion and green chilli — the essential Assamese dal accompaniment.',[AS],E,['lunch_curry'],false,false,false,null),
  NV('Duck Curry Assamese','असमिया बत्तख करी',null,'Duck slow-cooked in a sesame paste, onion and mustard oil — a distinctive Assamese Bihu preparation.',[AS],E,['lunch_curry'],'duck'),
  V('Khar','खार',null,'Raw papaya or dal cooked with khar — an alkaline Assamese preparation made from banana ash water.',[AS],E,['lunch_curry'],false,false,false,null),
  NV('Assamese Mutton Curry','असमिया मटन करी',null,'Mutton in onion, ginger, garlic and mustard oil with whole spices.',[AS],E,['lunch_curry'],'mutton'),
  V('Ou Tenga Maas','अउ टेंगा माछ',null,'Fish cooked with elephant apple — a sour one-ingredient acid curry unique to Assam.',[AS],E,['lunch_curry'],false,false,false,'fish'),
  V('Xaak Bhaji','साक भाजी',null,'Stir-fried seasonal leafy greens with mustard oil and garlic — the daily Assamese vegetable side.',[AS],E,['lunch_curry'],false,false,false,null,['iron-rich','fibre']),
  NV('Assamese Chicken Curry','असमिया चिकन',null,'Chicken with onion, ginger, garlic and a light Assamese spice blend in mustard oil.',[AS],E,['lunch_curry'],'chicken'),
  V('Masur Dail','मासुर दाइल',null,'Red lentil dal tempered with onion and mustard oil — the everyday Assamese dal.',[AS],E,['lunch_curry'],false,false,false,null,['protein']),
  V('Pumpkin Curry Assamese','असमिया कद्दू',null,'Yellow pumpkin cooked with mustard seeds, panch phutana and dried red chilli.',[AS],E,['lunch_curry'],false,false,false,null,['fibre']),
  NV('Hilsa Assamese','असमिया इलिशी',null,'Hilsa cooked with onion and mustard paste — the Assamese freshwater fish specialty.',[AS],E,['lunch_curry'],'fish'),
  V('Bilahi Pitika','बिलाही पिटिका',null,'Roasted tomato mash with raw onion, mustard oil and green chilli — the Assamese tomato dip.',[AS],E,['lunch_curry'],false,false,false,null),
  V('Mati Dail','माटी दाइल',null,'Whole black urad dal cooked with onion and mustard oil — a protein-rich Assamese dal.',[AS],E,['lunch_curry'],false,false,false,null,['protein']),

  // dinner_curry (12)
  NV('Rohu Fish Assamese','असमिया रोहू',null,'Rohu fish fried and then cooked in a light tomato-onion curry in mustard oil.',[AS],E,['dinner_curry'],'fish'),
  V('Kochu Saakar Ghonto','कोचू साकार घोंटो',null,'Colocasia stems cooked with mustard, poppy seed and green chilli — a unique Assamese dry preparation.',[AS],E,['dinner_curry'],false,false,false,null),
  NV('Pork Axoni','पोर्क अक्सोनी',null,'Pork slow-cooked with fermented bamboo shoot — a Nagaland-influenced Assamese dish.',[AS],E,['dinner_curry'],'pork'),
  V('Raw Papaya Curry','कच्चा पपीता करी',null,'Green papaya cooked with onion, turmeric and panch phutana — a light Assamese vegetable.',[AS],E,['dinner_curry'],false,false,false,null,['fibre','light']),
  NV('Chicken Khar','चिकन खार',null,'Chicken cooked with banana ash water — an Assamese alkaline chicken preparation.',[AS],E,['dinner_curry'],'chicken'),
  V('Musur Dail Bhaja','मासुर दाइल भाजा',null,'Dry-fried red lentils with onion and red chilli — a crispy Assamese dal side.',[AS],E,['dinner_curry'],false,false,false,null,['protein']),
  NV('Assamese Fish Pitika','माछ पिटिका',null,'Steamed fish mashed with raw onion, chilli and mustard oil — a rustic Assamese preparation.',[AS],E,['dinner_curry'],'fish'),
  V('Bor Kurkuri Bhaji','बोर कुर्कुरी भाजी',null,'Crispy fried lotus stem with mustard and cumin — a textured Assamese vegetable preparation.',[AS],E,['dinner_curry'],false,false,false,null),
  NV('Duck Dry Bihu','बत्तख बिहू',null,'Dry preparation of duck with sesame and ginger — a Bihu celebration meat dish.',[AS],E,['dinner_curry'],'duck'),
  V('Assamese Mixed Dal','असमिया मिक्स दाल',null,'Mixed lentils cooked with vegetables and tempered with mustard oil.',[AS],E,['dinner_curry'],false,false,false,null,['protein','fibre']),
  NV('Prawn Curry Assamese','असमिया झींगा',null,'Prawns cooked with onion, ginger and a light Assamese masala in mustard oil.',[AS],E,['dinner_curry'],'prawn'),
  V('Assamese Aloo Sabzi','असमिया आलू',null,'Potatoes with mustard, panch phutana and green chilli — simple Assamese potato.',[AS],E,['dinner_curry'],false,false,false,null),

  // veg_side + rice + bread + raita
  V('Haah Bhat','हाह भात',null,'Glutinous sticky rice — eaten at Bihu as a traditional sweet-savoury combination.',[AS],E,['rice'],true,false,false,null),
  V('Bora Saul Bhaat','बोरा साउल भात',null,'Sticky glutinous rice cooked plain — the Assamese celebration rice.',[AS],E,['rice'],true,false,false,null),
  V('Assamese Plain Rice','असमिया भात',null,'Long-grain Assamese rice boiled simply — the base of every Assamese meal.',[AS],E,['rice'],true,false,false,null),
  V('Bhat Khichuri','भात खिचुड़ी',null,'Rice and masoor dal cooked with onion and mustard oil — Assamese khichdi.',[AS],E,['rice'],false,false,false,null,['protein']),
  V('Til Bhat','तिल भात',null,'Rice cooked with sesame seeds and mustard oil — a nutty Assamese rice preparation.',[AS],E,['rice'],true,false,false,null),
  V('Luchi Northeast','लुची',null,'Deep-fried flour puri eaten with aloo sabzi — everyday Northeast bread.',[AS],E,['bread'],false,false,false,null),
  V('Jolpan Bread','जोलपान ब्रेड',null,'Simple thin rice flour flatbread eaten with dahi and jaggery.',[AS],E,['bread'],true,false,false,null),
  V('Paratha Assamese','असमिया परांठा',null,'Wheat paratha cooked in mustard oil — everyday Assamese bread.',[AS],E,['bread'],false,false,false,null),
  V('Pitha Til','तिल पिठा',null,'Sesame and jaggery stuffed rice cake cooked on a griddle — Bihu sweet bread.',[AS],E,['bread'],true,false,false,null),
  V('Muah Pitha','मुआ पिठा',null,'Pressed glutinous rice cake — a simple Assamese snack bread.',[AS],E,['bread'],true,false,false,null),
  V('Doi Assam','दई असम',null,'Thick set yoghurt in earthen pot — the Assamese curd.',[AS],E,['raita'],true,false,false,null,['probiotic']),
  V('Koldil Pitika','कोलदिल पिटिका',null,'Banana flower mash with mustard oil and green chilli — Assamese raita alternative.',[AS],E,['raita'],false,false,false,null),
  V('Cucumber Dahi Assamese','खीरा दही',null,'Sliced cucumber in yoghurt with mustard seeds — cooling Assamese raita.',[AS],E,['raita'],false,false,false,null,['probiotic','light']),
  V('Tomato Onion Salad Assam','टमाटर प्याज असम',null,'Raw tomato and onion salad with mustard oil and green chilli — Assamese fresh salad.',[AS],E,['raita'],false,false,false,null,['light']),
  V('Assamese Sesame Chutney','असमिया तिल चटनी',null,'Roasted sesame paste with garlic and dried red chilli — a pungent condiment.',[AS],E,['veg_side'],false,false,false,null),
  V('Bamboo Shoot Pickle','बांस का अचार',null,'Fermented bamboo shoot in mustard oil — a Northeast condiment used in cooking and as side.',[AS],E,['veg_side'],false,false,false,null),
  V('Bilahi Pitika Chutney','बिलाही पिटिका',null,'Roasted tomato and green chilli mash — standard Assamese table chutney.',[AS],E,['veg_side'],false,false,false,null),
  V('Aloo Khar','आलू खार',null,'Potatoes cooked in banana ash water — the Assamese alkaline potato preparation.',[AS],E,['veg_side'],false,false,false,null),
  V('Til Ladoo Assamese','असमिया तिल लड्डू',null,'Sesame and jaggery balls — the Assamese Bihu sweet.',[AS],E,['veg_side'],true,false,false,null),
  V('Narikol Laru','नारिकोल लारू',null,'Coconut and jaggery balls cooked until firm — Assamese Bihu sweet.',[AS],E,['veg_side'],true,false,false,null),

  // ══════════════════════════════════════════════════════════════════════════════
  // CHHATTISGARHI — 40 dishes
  // 7 breakfast | 9 lunch_curry | 8 dinner_curry | 6 veg_side | 4 rice | 4 bread | 2 raita
  // ══════════════════════════════════════════════════════════════════════════════

  // breakfast (7)
  V('Fara','फरा',null,'Steamed rice flour rolls stuffed with spiced lentils — the most beloved Chhattisgarhi breakfast.',[CG],E,['breakfast'],false,false,false,null,['protein']),
  V('Cheela Chhattisgarhi','छत्तीसगढ़ी चीला',null,'Thin rice flour crepe with onion and green chilli — the Chhattisgarhi dosa equivalent.',[CG],E,['breakfast'],true,false,false,null),
  V('Bafauri','बफौरी',null,'Steamed chana dal dumplings flavoured with green chilli and ginger — a protein-rich light breakfast.',[CG],E,['breakfast'],true,false,false,null,['protein']),
  V('Muthia','मुठिया',null,'Wheat and vegetable steamed dumplings with sesame and cumin — a healthy Chhattisgarhi morning food.',[CG],E,['breakfast'],false,false,false,null,['fibre']),
  V('Anarsa','अनरसा',null,'Crispy sesame-topped rice flour sweet — a Diwali and festival morning delicacy of Chhattisgarh.',[CG],E,['breakfast'],true,false,false,null),
  V('Dehrori','देहरौरी',null,'Fermented rice fritter sweetened with jaggery — a Chhattisgarhi festival puffed sweet.',[CG],E,['breakfast'],true,false,false,null),
  V('Sabudana Khichdi CG','साबूदाना खिचड़ी',null,'Sago cooked with peanuts, potato and green chilli — popular fasting breakfast in Chhattisgarh.',[CG],E,['breakfast'],false,true,false,null,['fibre']),

  // lunch_curry (9)
  V('Bohar Bhat','बोहार भात',null,'Jackfruit and rice cooked together with whole spices — the Chhattisgarhi seasonal one-pot meal.',[CG],E,['lunch_curry'],false,false,false,null,['fibre']),
  NV('Chhattisgarhi Chicken Curry','छत्तीसगढ़ी चिकन',null,'Chicken in a dry red chilli and onion paste — a robust Chhattisgarhi home preparation.',[CG],E,['lunch_curry'],'chicken'),
  V('Chana Dal Chhattisgarhi','छत्तीसगढ़ी चना दाल',null,'Split chickpeas cooked with spinach and a mustard tadka — a Chhattisgarhi everyday dal.',[CG],E,['lunch_curry'],false,false,false,null,['protein','iron-rich']),
  V('Dubki Kadhi','डुबकी कढ़ी',null,'Thin buttermilk curry with floating chana dal dumplings — the Chhattisgarhi kadhi.',[CG],E,['lunch_curry'],false,false,false,null,['probiotic']),
  NV('Chhattisgarhi Mutton','छत्तीसगढ़ी मटन',null,'Mutton in a dry red onion and spice paste cooked in mustard oil.',[CG],E,['lunch_curry'],'mutton'),
  V('Bhajia Sabzi','भजिया सब्जी',null,'Fried besan fritters cooked in a thin onion-tomato gravy — a Chhattisgarhi weekday curry.',[CG],E,['lunch_curry'],false,false,false,null),
  V('Petha ki Sabzi','पेठा की सब्जी',null,'White pumpkin cooked with onion, cumin and coriander — a simple Chhattisgarhi vegetable.',[CG],E,['lunch_curry'],false,false,false,null,['fibre']),
  NV('Chhattisgarhi Fish Curry','छत्तीसगढ़ी माछ',null,'River fish cooked in a onion, tomato and red chilli paste.',[CG],E,['lunch_curry'],'fish'),
  V('Angakar Roti Sabzi','अंगाकर रोटी सब्जी',null,'Thick rice flour bread served with a simple chana dal — a Chhattisgarhi complete meal.',[CG],E,['lunch_curry'],true,false,false,null),

  // dinner_curry (8)
  V('Chhattisgarhi Saag','छत्तीसगढ़ी साग',null,'Mustard greens cooked with garlic and mustard oil — a winter staple dinner preparation.',[CG],E,['dinner_curry'],false,false,false,null,['iron-rich','fibre']),
  NV('Pork Chhattisgarhi','छत्तीसगढ़ी पोर्क',null,'Pork cooked with onion, dried chilli and local spices — a tribal Chhattisgarhi preparation.',[CG],E,['dinner_curry'],'pork'),
  V('Bhaat Chhattisgarhi','छत्तीसगढ़ी भात',null,'Simple rice cooked with arhar dal as a dinner combination.',[CG],E,['dinner_curry'],false,false,false,null,['protein']),
  V('Aloo Matar CG','आलू मटर CG',null,'Potatoes and peas in a simple cumin-onion gravy — Chhattisgarhi everyday dinner vegetable.',[CG],E,['dinner_curry'],false,false,false,null),
  NV('Murgi Rasa','मुर्गी रसा',null,'Chicken in a thin peppery broth — a simple Chhattisgarhi tribal chicken soup.',[CG],E,['dinner_curry'],'chicken'),
  V('Kanda Bhaji CG','कांदा भाजी',null,'Onion and green chilli fritters — eaten as side with rice and dal at dinner.',[CG],E,['dinner_curry'],false,false,false,null),
  V('Arhar Dal CG','अरहर दाल',null,'Pigeon pea dal tempered with garlic and dry red chilli — Chhattisgarhi everyday dal.',[CG],E,['dinner_curry'],false,false,false,null,['protein']),
  V('Tilgur Ladoo CG','तिलगुर लड्डू',null,'Sesame jaggery balls eaten as a sweet at dinner — Chhattisgarhi traditional sweet.',[CG],E,['dinner_curry'],true,false,false,null),

  // sides + rice + bread + raita
  V('Angakar Roti','अंगाकर रोटी',null,'Thick rice flour flatbread cooked on iron griddle with ghee — the staple Chhattisgarhi bread.',[CG],E,['bread'],true,false,false,null,['gluten-free']),
  V('Aamat Roti','आमट रोटी',null,'Sour fermented rice bread cooked on tawa — a tangy Chhattisgarhi daily bread.',[CG],E,['bread'],true,false,false,null),
  V('Paratha CG','छत्तीसगढ़ी परांठा',null,'Wheat paratha with carom seeds cooked in ghee.',[CG],E,['bread'],false,false,false,null),
  V('Cheela Bread CG','चीला',null,'Rice flour flatbread with onion and chilli — everyday Chhattisgarhi savoury crepe.',[CG],E,['bread'],true,false,false,null),
  V('Plain Rice CG','छत्तीसगढ़ी चावल',null,'Boiled Chhattisgarhi rice — eaten with dal and sabzi.',[CG],E,['rice'],true,false,false,null),
  V('Chana Bhat','चना भात',null,'Chickpea rice cooked together — a nutritious Chhattisgarhi combination.',[CG],E,['rice'],false,false,false,null,['protein']),
  V('Khichdi CG','खिचड़ी CG',null,'Rice and moong dal cooked with ghee and cumin — Chhattisgarhi comfort meal.',[CG],E,['rice'],true,false,false,null),
  V('Mathri CG','मठरी CG',null,'Crispy fried wheat wafers with carom seeds — a Chhattisgarhi tea snack.',[CG],E,['rice'],false,false,false,null),
  V('Dahi CG','दही CG',null,'Plain set yoghurt — served with paratha or rice.',[CG],E,['raita'],true,false,false,null,['probiotic']),
  V('Raita CG','रायता CG',null,'Boondi in yoghurt with cumin — standard Chhattisgarhi raita.',[CG],E,['raita'],false,false,false,null,['probiotic']),
  V('Imli Chutney CG','इमली चटनी CG',null,'Tamarind chutney with jaggery and ginger — standard condiment of Chhattisgarh.',[CG],E,['veg_side'],true,false,false,null),
  V('Hari Chutney CG','हरी चटनी CG',null,'Coriander and green chilli chutney with garlic.',[CG],E,['veg_side'],false,false,false,null),
  V('Bafauri Chutney','बफौरी चटनी',null,'Steamed chana dal cakes served with green chutney.',[CG],E,['veg_side'],true,false,false,null),
  V('Sabudana Vada CG','साबूदाना वड़ा CG',null,'Sago and potato fried patties — a fasting snack in Chhattisgarh.',[CG],E,['veg_side'],false,true,false,null),
  V('Tilkut','तिलकुट CG',null,'Sesame brittle with jaggery — a Chhattisgarhi winter sweet.',[CG],E,['veg_side'],true,false,false,null),
  V('Murku CG','मुर्कू',null,'Spiral fried rice flour snack — a popular Chhattisgarhi snack.',[CG],E,['veg_side'],true,false,false,null),

  // ══════════════════════════════════════════════════════════════════════════════
  // EXTRA STREET FOOD — 30 dishes (national / pan-India)
  // ══════════════════════════════════════════════════════════════════════════════

  V('Raj Kachori','राज कचोरी',null,'Giant crispy shell filled with sprouts, curd, chutneys, sev and pomegranate — the king of Indian chaat.',[],N,['snack'],false,false,true,null),
  V('Papdi Chaat','पापड़ी चाट',null,'Crispy wheat wafers topped with potato, curd, tamarind chutney and sev — a pan-India chaat staple.',[],N,['snack'],false,false,true,null),
  V('Aloo Chaat','आलू चाट',null,'Crispy fried potato cubes tossed with curd, chutneys, onion and chaat masala.',[],N,['snack'],false,false,true,null),
  V('Bread Pakora','ब्रेड पकोड़ा',null,'Thick bread slices stuffed with potato filling and dipped in chickpea batter and fried.',[],N,['snack'],false,false,true,null),
  V('Egg Roll Street','अंडा रोल',null,'Egg omelette rolled in a flaky paratha with onion, chutney and chilli sauce — Kolkata street staple.',[],E,['snack'],false,false,true,'egg'),
  V('Kathi Roll','काठी रोल',null,'Paratha wrapped around spiced filling of chicken, paneer or egg with onion and chutney.',[],N,['snack'],false,false,true,null),
  V('Vada Pav','वड़ा पाव',null,'Spiced potato fritter in a soft bun with garlic chutney and green chilli — the Mumbai street classic.',[],W,['snack'],false,false,true,null),
  V('Pav Bhaji','पाव भाजी',null,'Spiced mashed vegetable bhaji cooked in butter served with toasted pav buns.',[],W,['snack'],false,false,true,null),
  V('Misal Pav','मिसळ पाव',null,'Sprouted moth bean curry in spicy tarri gravy topped with farsan, onion and lemon, served with pav.',[],W,['snack'],false,false,true,null),
  V('Chole Bhature','छोले भटूरे',null,'Thick spiced chickpea curry served with deep-fried fluffy bhatura bread — the Punjab street breakfast.',[],N,['snack'],false,false,true,null),
  V('Golgappa','गोलगप्पा',null,'Hollow crisp spheres filled with spiced tamarind water, moong sprouts and potato — a pan-India street snack.',[],N,['snack'],false,false,true,null),
  V('Dahi Puri','दही पुरी',null,'Crisp puris filled with potato, sweet curd, tamarind chutney and sev — a gentler version of pani puri.',[],W,['snack'],false,false,true,null),
  V('Sev Puri','सेव पुरी',null,'Flat crisp puris topped with potato, onion, sev and chutneys — a Mumbai chaat classic.',[],W,['snack'],false,false,true,null),
  V('Bhel Puri','भेल पुरी',null,'Puffed rice tossed with onion, tomato, sev and tamarind chutney — a light crunchy Mumbai beach snack.',[],W,['snack'],false,false,true,null),
  V('Dahi Bhalla','दही भल्ला',null,'Soft urad dal dumplings in cold sweet yoghurt with tamarind chutney and boondi.',[],N,['snack'],false,false,true,null,['protein','probiotic']),
  NV('Chicken Tikka Roll','चिकन टिक्का रोल',null,'Tandoor chicken tikka pieces wrapped in rumali roti with onion and mint chutney.',[],N,['snack'],false,false,true,'chicken'),
  NV('Egg Bhurji Pav','अंडा भुर्जी पाव',null,'Spiced scrambled egg served with buttered pav — a Mumbai street food staple.',[],W,['snack'],false,false,true,'egg'),
  V('Masala Chai Street','मसाला चाय',null,'Strong spiced tea brewed with ginger, cardamom and cinnamon — the essential Indian street beverage.',[],N,['snack'],true,false,true,null),
  NV('Frankies Chicken','चिकन फ्रेंकी',null,'Thin roti rolled around spiced chicken filling with onion and sauce — a Kolkata and Mumbai street wrap.',[],W,['snack'],false,false,true,'chicken'),
  V('Dabeli','दाबेली',null,'Spiced potato filling in a bun with peanuts, pomegranate and chutneys — a Kutchi street snack.',[],W,['snack'],false,false,true,null),
  V('Panipuri Shot','पानीपुरी',null,'Single shot of pani puri served in rapid succession at chaat stalls — a competitive eating experience.',[],N,['snack'],false,false,true,null),
  V('Muri Ghonto Street','মুড়ি ঘণ্টো',null,'Puffed rice tossed with onion, mustard oil, green chilli and black salt — a Bengal street snack.',[],E,['snack'],false,false,true,null),
  V('Idli Vada Combo','इडली वड़ा कॉम्बो',null,'Steamed idli and crispy medu vada served with sambar and coconut chutney — South Indian street breakfast.',[],S,['snack'],false,false,true,null,['protein']),
  V('Masala Dosa Street','मसाला डोसा स्ट्रीट',null,'Crispy dosa filled with spiced potato, served with sambar and coconut chutney — the most popular South Indian street food.',[],S,['snack'],false,false,true,null),
  V('Upma Street','उपमा स्ट्रीट',null,'Semolina upma served in a banana leaf with coconut chutney — South Indian street breakfast stall staple.',[],S,['snack'],false,false,true,null),
  V('Tikki Chaat','टिक्की चाट',null,'Crispy potato tikki topped with chole, curd, chutneys and sev — a Delhi street staple.',[],N,['snack'],false,false,true,null),
  NV('Egg Dosa','अंडा डोसा',null,'Crispy dosa with egg cracked and cooked inside — a popular street variant from Tamil Nadu.',[],S,['snack'],false,false,true,'egg'),
  V('Kanda Bhaji Street','कांदा भाजी',null,'Crispy onion fritters served with green chutney — the Mumbai monsoon street snack.',[],W,['snack'],false,false,true,null),
  V('Litti Chokha Street','लिट्टी चोखा स्ट्रीट',null,'Wheat balls stuffed with sattu, roasted over charcoal flame and served with roasted brinjal mash.',[],N,['snack'],false,false,true,null,['protein']),
  V('Churmur','চুরমুর',null,'Crushed puchkas tossed with boiled potato, chickpeas, tamarind water and spices — a Kolkata street variant of pani puri.',[],E,['snack'],false,false,true,null),
];

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log(`\nSeeding ${dishes.length} dishes (Hyderabadi + Sindhi + Odia + Assamese + Chhattisgarhi + Street Food)...\n`);

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

  // Verification
  const hy = await client.from('dishes').select('name', { count: 'exact', head: true }).contains('cuisine', ['Hyderabadi']);
  const si = await client.from('dishes').select('name', { count: 'exact', head: true }).contains('cuisine', ['Sindhi']);
  const od = await client.from('dishes').select('name', { count: 'exact', head: true }).contains('cuisine', ['Odia']);
  const as_ = await client.from('dishes').select('name', { count: 'exact', head: true }).contains('cuisine', ['Assamese']);
  const cg = await client.from('dishes').select('name', { count: 'exact', head: true }).contains('cuisine', ['Chhattisgarhi']);
  console.log(`\nDB counts — Hyderabadi: ${hy.count} | Sindhi: ${si.count} | Odia: ${od.count} | Assamese: ${as_.count} | Chhattisgarhi: ${cg.count}`);
}

seed().catch(console.error);
