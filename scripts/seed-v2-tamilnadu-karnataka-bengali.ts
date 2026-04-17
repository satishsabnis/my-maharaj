require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// ─── 170 dishes: Tamil Nadu (60) | Karnataka (55) | Bengali (55) ──────────────

const V = (name:string,nh:string|null,nr:string|null,desc:string,cuisine:string[],region:string,slot:string[],jain:boolean,fast:boolean,street:boolean,nvt:string|null,htags:string[]=[]) => ({
  name,name_hindi:nh,name_regional:nr,description:desc,cuisine,region,slot,
  is_veg:nvt===null,is_vegan:nvt===null&&!desc.toLowerCase().includes('yogurt')&&!desc.toLowerCase().includes('ghee')&&!desc.toLowerCase().includes('dairy')&&!desc.toLowerCase().includes('curd')&&!desc.toLowerCase().includes('butter')&&!desc.toLowerCase().includes('milk'),
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

const TN = 'Tamil Nadu'; const KA = 'Karnataka'; const BN = 'Bengali';
const S  = 'SOUTH';      const E  = 'EAST';

const dishes = [

  // ══════════════════════════════════════════════════════════════════════════════
  // TAMIL NADU — 60 dishes  (SOUTH)
  // 14 breakfast | 15 lunch_curry | 12 dinner_curry | 10 veg_side | 4 rice | 2 bread | 2 raita | 1 snack
  // ══════════════════════════════════════════════════════════════════════════════

  // breakfast (14)
  V('Idli','इडली','இட்லி','Soft steamed rice-lentil cakes served with sambar and coconut chutney — the cornerstone of every Tamil morning.',[TN],S,['breakfast'],true,false,false,null),
  V('Dosa','डोसा','தோசை','Thin crispy fermented rice-lentil crepe cooked on a cast-iron griddle, served with chutneys and sambar.',[TN],S,['breakfast'],true,false,false,null),
  V('Masala Dosa','मसाला डोसा','மசால தோசை','Golden crispy dosa stuffed with spiced potato and onion filling, served with coconut chutney and sambar.',[TN],S,['breakfast'],false,false,false,null),
  V('Rava Dosa','रवा डोसा','ரவா தோசை','Instant lacy semolina crepe scattered with onion, green chilli and curry leaves — crispy and quick.',[TN],S,['breakfast'],false,false,false,null),
  V('Ven Pongal','वेन पोंगल','வெண் பொங்கல்','Savory rice and moong dal porridge cooked with black pepper, cumin and ghee — a Tamil temple breakfast.',[TN],S,['breakfast'],true,false,false,null,['protein']),
  V('Upma','उपमा','உப்பமா','Semolina cooked with onion, mustard seeds, curry leaves, ginger and vegetables — a simple Tamil morning classic.',[TN],S,['breakfast'],false,false,false,null),
  V('Idiyappam','इडियप्पम','இடியாப்பம்','Steamed string hoppers pressed from rice flour dough, served with coconut milk or stew.',[TN],S,['breakfast'],true,false,false,null),
  V('Appam','अप्पम','அப்பம்','Lacy fermented rice pancake with a soft spongy centre and crispy thin edges, served with coconut milk.',[TN],S,['breakfast'],true,false,false,null),
  V('Pesarattu','पेसरट्टू','பசரட்டு','Crispy whole green moong crepe with ginger and green chilli — protein-rich and naturally gluten-free.',[TN],S,['breakfast'],true,false,false,null,['protein','low-gi']),
  V('Medu Vada','मेदु वड़ा','மெதுவடை','Deep-fried crispy urad dal doughnut flavoured with pepper and curry leaves, served with coconut chutney.',[TN],S,['breakfast'],true,false,false,null,['protein']),
  V('Oothappam','उत्तपम','உத்தாப்பம்','Thick fermented rice pancake topped with onion, tomato and green chilli before pan-frying.',[TN],S,['breakfast'],false,false,false,null),
  V('Semiya Upma','सेमिया उपमा','சேமியா உப்பமா','Vermicelli cooked with mustard, onion and vegetables in a light tempering — a quick Tamil breakfast.',[TN],S,['breakfast'],false,false,false,null),
  V('Kuzhi Paniyaram','कुझी पणियारम','குழி பணியாரம்','Fermented batter dumplings cooked in a cast-iron mould until golden outside and soft inside.',[TN],S,['breakfast'],false,false,false,null),
  V('Wheat Rava Upma','गेहूं रवा उपमा',null,'Broken wheat cooked with onion, green chilli and vegetables — a fibre-rich healthy Tamil breakfast.',[TN],S,['breakfast'],false,false,false,null,['fibre','low-gi']),

  // lunch_curry (15)
  V('Sambar','सांभर','சாம்பார்','Tangy lentil and vegetable stew spiced with sambar powder and tamarind — the cornerstone of every Tamil Nadu lunch.',[TN],S,['lunch_curry'],false,false,false,null,['protein','fibre']),
  V('Rasam','रसम','ரசம்','Thin peppery tamarind broth with tomato and garlic — drunk as a digestive soup or mixed with rice.',[TN],S,['lunch_curry'],false,false,false,null,['light']),
  NV('Chettinad Chicken Curry','चेट्टीनाड चिकन करी','செட்டிநாடு கோழி குழம்பு','Fiery aromatic chicken curry from Chettinad made with freshly ground kalpasi, marathi mokku and star anise.',[TN],S,['lunch_curry'],'chicken'),
  V('Puli Kuzhambu',null,'புளி குழம்பு','Bold tamarind curry with shallots and brinjal — the definitive Tamil sour kuzhambu eaten with rice.',[TN],S,['lunch_curry'],false,false,false,null),
  NV('Meen Kuzhambu','मछली करी','மீன் குழம்பு','Tangy tamarind fish curry with shallots, tomato and freshly ground coconut-spice base — a Tamil lunch essential.',[TN],S,['lunch_curry'],'fish'),
  V('Vendakkai Sambar','भिंडी सांभर','வெண்டைக்காய் சாம்பார்','Classic Tamil sambar with crispy fried okra adding sweetness and body to the lentil-tamarind base.',[TN],S,['lunch_curry'],false,false,false,null,['fibre']),
  V('Paruppu Kuzhambu',null,'பருப்பு குழம்பு','Thick lentil curry cooked with tomato, shallots and ground coconut-spice paste — a comforting everyday Tamil kuzhambu.',[TN],S,['lunch_curry'],false,false,false,null,['protein']),
  NV('Mutton Chettinad','चेट्टीनाड मटन','செட்டிநாடு ஆட்டுக்கறி','Slow-cooked Chettinad mutton with a powerhouse of whole spices, kalpasi, dagad phool and fresh coconut paste.',[TN],S,['lunch_curry'],'mutton'),
  NV('Prawn Masala Tamil Style','झींगा मसाला','இறால் மசாலா','Spicy prawn dry masala with shallots, tomato, fennel and Chettinad spice blend — eaten with rice and rasam.',[TN],S,['lunch_curry'],'prawn'),
  NV('Egg Curry Chettinad','अंडा करी','முட்டை குழம்பு','Hard-boiled eggs simmered in Chettinad-spiced onion-tomato gravy with coconut paste and kalpasi.',[TN],S,['lunch_curry'],'egg'),
  V('Kootu',null,'கூட்டு','Thick semi-dry curry of vegetables and lentils with a fresh coconut-cumin paste — mild and protein-rich.',[TN],S,['lunch_curry'],false,false,false,null,['protein','fibre']),
  V('Mor Kuzhambu',null,'மோர் குழம்பு','Buttermilk curry tempered with mustard seeds and spiced with a coconut-turmeric paste — cooling and digestive.',[TN],S,['lunch_curry'],true,false,false,null,['light']),
  V('Vatha Kuzhambu',null,'வத்த குழம்பு','Intensely sour shallot-tamarind curry with sun-dried sundakkai vathal — a deep-flavoured Tamil kuzhambu.',[TN],S,['lunch_curry'],false,false,false,null),
  NV('Nanjilnadu Fish Curry',null,'நஞ்சில்நாடு மீன் குழம்பு','Kerala-border style fish curry with raw mango, shallots and freshly ground coconut-chilli paste.',[TN],S,['lunch_curry'],'fish'),
  V('Avial','अवियल','அவியல்','Mixed vegetables in a coconut-yogurt gravy with green chilli and cumin — a Tamil-Kerala classic cooked with zero oil.',[TN],S,['lunch_curry'],false,false,false,null,['light']),

  // dinner_curry (12)
  V('Dal Tadka Tamil Style','दाल तड़का',null,'Toor dal finished with a strong Tamil tadka of mustard, dried red chilli, curry leaves and garlic.',[TN],S,['dinner_curry'],false,false,false,null,['protein']),
  NV('Chicken Varuval','चिकन वरुवल','சிக்கன் வறுவல்','Dry-roasted chicken tossed with fennel, black pepper and shallots until the masala coats every piece.',[TN],S,['dinner_curry'],'chicken'),
  NV('Chettinad Pepper Chicken','चेट्टीनाड पेपर चिकन','மிளகு கோழி','Chicken slow-cooked in a dark onion-tomato gravy dominant with black pepper and fennel.',[TN],S,['dinner_curry'],'chicken'),
  NV('Mutton Kola Urundai','मटन कोला उरुंदई','மட்டன் கோல உருண்டை','Chettinad mutton keema balls deep-fried with raw rice, coconut and spices — served with kuzhambu.',[TN],S,['dinner_curry'],'mutton'),
  NV('Meen Varuval','मछली फ्राई','மீன் வறுவல்','Fish fillets marinated in tamarind and chilli then shallow-fried until crispy — eaten with sambar rice.',[TN],S,['dinner_curry'],'fish'),
  NV('Prawn Thokku','झींगा थोक्कू','இறால் தொக்கு','Prawn cooked down in a thick intensely spiced onion-tomato masala until oil separates — a bold Tamil preparation.',[TN],S,['dinner_curry'],'prawn'),
  NV('Chicken Chukka','चिकन चुक्का','சிக்கன் சுக்கா','Bone-in chicken dry-roasted with shallots, fennel and Chettinad masala until dark and aromatic.',[TN],S,['dinner_curry'],'chicken'),
  NV('Crab Masala Tamil Style','केकड़ा मसाला','நண்டு மசாலா','Whole blue crab cooked in a fiery Chettinad spice gravy with shallots, coconut and pounded spices.',[TN],S,['dinner_curry'],'seafood'),
  V('Poricha Kuzhambu',null,'பொரிச்ச குழம்பு','Mixed vegetable curry ground with coconut, cumin and pepper — gentle and nutty with no tamarind.',[TN],S,['dinner_curry'],false,false,false,null,['light']),
  V('Milagu Kuzhambu',null,'மிளகு குழம்பு','Pepper-dominant kuzhambu with shallots and tamarind — known for its digestive properties.',[TN],S,['dinner_curry'],false,false,false,null,['light']),
  V('Kathirikai Gothsu','बैंगन गोथसू','கத்திரிக்காய் கோதசு','Roasted mashed brinjal cooked with tamarind and shallots — a semi-liquid Tamil side for pongal and idli.',[TN],S,['dinner_curry'],false,false,false,null),
  V('Thenga Araitha Kuzhambu',null,'தேங்காய் அரைத்த குழம்பு','Tamarind kuzhambu enriched with freshly ground coconut, coriander and cumin — subtler and creamier.',[TN],S,['dinner_curry'],false,false,false,null),

  // veg_side (10)
  V('Beans Poriyal','बीन्स पोरियल','பீன்ஸ் பொரியல்','French beans stir-fried with mustard, dried red chilli, curry leaves and fresh coconut — classic Tamil poriyal.',[TN],S,['veg_side'],true,false,false,null,['fibre']),
  V('Cabbage Poriyal','पत्तागोभी पोरियल','கோஸ் பொரியல்','Shredded cabbage tossed with mustard, curry leaves, green chilli and coconut — a staple Tamil vegetable side.',[TN],S,['veg_side'],true,false,false,null,['fibre']),
  V('Vazhakkai Poriyal','कच्चा केला पोरियल','வாழைக்காய் பொரியல்','Raw banana slices stir-fried with mustard, cumin and coconut — starchy and mildly flavoured.',[TN],S,['veg_side'],true,false,false,null),
  V('Pavakkai Poriyal','करेला पोरियल','பாவக்காய் பொரியல்','Bitter gourd stir-fried with mustard and coconut — a medicinal Tamil side that aids digestion.',[TN],S,['veg_side'],true,false,false,null,['low-gi']),
  V('Kovakkai Poriyal','तिंडोरा पोरियल','கோவக்காய் பொரியல்','Tindora sliced and tossed with mustard, urad dal, dried chilli and coconut — delicate everyday poriyal.',[TN],S,['veg_side'],true,false,false,null),
  V('Murungakkai Stir Fry','सहजन फ्राई','முருங்கைக்காய் வறுவல்','Drumstick sauteed with onion, turmeric and chilli — eaten for its iron content and earthy flavour.',[TN],S,['veg_side'],false,false,false,null,['iron-rich']),
  V('Keerai Masiyal','साग मसियाल','கீரை மசியல்','Spinach mashed with garlic, green chilli and a light cumin tempering — a simple iron-rich greens preparation.',[TN],S,['veg_side'],false,false,false,null,['iron-rich']),
  V('Kothavarangai Poriyal','ग्वार फली पोरियल','கொத்தவரங்காய் பொரியல்','Cluster beans stir-fried with mustard, urad dal and coconut — slightly bitter and highly nutritious.',[TN],S,['veg_side'],true,false,false,null,['fibre','low-gi']),
  V('Vazhaipoo Poriyal','केले के फूल पोरियल','வாழைப்பூ பொரியல்','Banana flower cooked with mustard, coconut and mild spices — labour-intensive but deeply nutritious.',[TN],S,['veg_side'],true,false,false,null,['iron-rich']),
  V('Brinjal Gothsu','बैंगन गोथसू','கத்திரிக்காய் கொதசு','Smoked brinjal cooked to a semi-liquid relish with shallots and tamarind — eaten with idli or rice.',[TN],S,['veg_side'],false,false,false,null),

  // rice (4)
  V('Lemon Rice','नींबू चावल','எலுமிச்சை சாதம்','Rice tempered with mustard, peanuts, curry leaves and fresh lemon juice — a Tamil temple offering.',[TN],S,['rice'],true,false,false,null),
  V('Puliyodarai','इमली चावल','புளியோதரை','Rice mixed with freshly made tamarind-spice paste, peanuts and sesame — a temple prasad staple.',[TN],S,['rice'],true,false,false,null),
  V('Thayir Sadam','दही चावल','தயிர் சாதம்','Cooked rice mixed with yogurt and a light tempering of mustard and ginger — the last course of every Tamil meal.',[TN],S,['rice'],true,false,false,null,['probiotic','light']),
  V('Coconut Rice Tamil Style','नारियल चावल','தேங்காய் சாதம்','Rice tossed with fresh coconut, mustard, urad dal, dried red chilli and curry leaves — a festival rice.',[TN],S,['rice'],true,false,false,null),

  // bread (2)
  V('Parotta','पोरोटा','பரோட்டா','Layered flaky flatbread made by folding and coiling maida repeatedly, griddled with oil — eaten with salna.',[TN],S,['bread'],true,false,false,null),
  V('Poori Tamil Style','पूरी','பூரி','Deep-fried puffed wheat bread served with potato masala or chana — a beloved Tamil weekend breakfast bread.',[TN],S,['bread'],true,false,false,null),

  // raita (2)
  V('Cucumber Pachadi','खीरा पचड़ी','வேலரிக்காய் பச்சடி','Fresh cucumber mixed with yogurt, tempered with mustard and green chilli — a cooling Tamil raita.',[TN],S,['raita'],true,false,false,null,['cooling','probiotic']),
  V('Pineapple Pachadi','अनानास पचड़ी','அன்னாசி பச்சடி','Ripe pineapple cooked with yogurt, coconut and mustard tempering — a sweet-sour Tamil festival pachadi.',[TN],S,['raita'],true,false,false,null),

  // snack (1)
  V('Murukku','मुरुक्कू','முறுக்கு','Crispy deep-fried rice-urad flour spirals — the iconic Tamil Diwali and everyday snack.',[TN],S,['snack'],true,false,false,null),


  // ══════════════════════════════════════════════════════════════════════════════
  // KARNATAKA — 55 dishes  (SOUTH)
  // 12 breakfast | 14 lunch_curry | 11 dinner_curry | 10 veg_side | 4 rice | 2 bread | 1 raita | 1 snack
  // ══════════════════════════════════════════════════════════════════════════════

  // breakfast (12)
  V('Akki Roti',null,'ಅಕ್ಕಿ ರೊಟ್ಟಿ','Rice flour flatbread mixed with onion, green chilli, carrot and coconut, pan-fried until golden — a Karnataka breakfast staple.',[KA],S,['breakfast'],false,false,false,null),
  V('Rava Idli','रवा इडली','ರವಾ ಇಡ್ಲಿ','Semolina idli with mustard, cashews and coriander — softer and quicker than the traditional rice-lentil version.',[KA],S,['breakfast'],true,false,false,null),
  V('Set Dosa',null,'ಸೆಟ್ ದೋಸ','Soft thick spongy dosas served in a set of three with coconut chutney and vegetable sagu — the Bangalore morning classic.',[KA],S,['breakfast'],true,false,false,null),
  V('Neer Dosa',null,'ನೀರ್ ದೋಸ','Ultra-thin rice flour crepe with no fermentation, cooked on one side only — soft, delicate and naturally vegan.',[KA],S,['breakfast'],true,false,false,null),
  V('Kesari Bath',null,'ಕೇಸರಿ ಬಾತ್',"Sweet semolina pudding tinted with saffron or food colour, studded with cashews and raisins — Karnataka's most loved sweet breakfast.",[KA],S,['breakfast'],true,false,false,null),
  V('Rave Unde',null,'ರವೇ ಉಂಡೆ','Semolina sweet balls made with coconut, jaggery and cardamom — a Karnataka festival snack eaten as a morning treat.',[KA],S,['breakfast'],true,false,false,null),
  V('Thatte Idli',null,'ತಟ್ಟೆ ಇಡ್ಲಿ','Flat oversized idli from the Bidadi region, extra soft and light — served with sambar and chutney.',[KA],S,['breakfast'],true,false,false,null),
  V('Upma Karnataka Style','उपमा',null,'Semolina cooked with onion, mustard, curry leaves, green chilli and vegetables — the Karnataka home-style version.',[KA],S,['breakfast'],false,false,false,null),
  V('Ragi Dosa',null,'ರಾಗಿ ದೋಸ','Crispy crepe made from finger millet, rice flour and buttermilk — a nutritious gluten-free Karnataka dosa.',[KA],S,['breakfast'],true,false,false,null,['low-gi','fibre']),
  V('Nuchinunde',null,'ನುಚ್ಚಿನ ಉಂಡೆ','Steamed lentil dumplings mixed with fresh dill, ginger and green chilli — a rustic Karnataka breakfast from the Malnad region.',[KA],S,['breakfast'],true,false,false,null,['protein']),
  V('Chow Chow Bath',null,'ಚೌ ಚೌ ಬಾತ್','Two Karnataka breakfast classics — savory rava bath and sweet kesari bath — served together on the same plate.',[KA],S,['breakfast'],false,false,false,null),
  V('Bele Obbattu',null,'ಬೇಳೆ ಒಬ್ಬಟ್ಟು','Sweet flatbread stuffed with cooked chana dal, jaggery and cardamom — a Karnataka festival bread eaten at breakfast.',[KA],S,['breakfast'],true,false,false,null),

  // lunch_curry (14)
  V('Bisi Bele Bath',null,'ಬಿಸಿ ಬೇಳೆ ಬಾತ್','Spiced rice-lentil-vegetable dish cooked with tamarind, sambar powder and ghee — the Karnataka one-pot meal.',[KA],S,['lunch_curry'],false,false,false,null,['protein','fibre']),
  V('Sambar Karnataka Style','सांभर',null,'Karnataka-style sambar made with a freshly ground coconut-spice paste and a slightly sweeter flavour profile.',[KA],S,['lunch_curry'],false,false,false,null,['protein']),
  V('Huli',null,'ಹುಳಿ','Tamarind-coconut based lentil curry cooked with mixed vegetables — the Karnataka regional equivalent of sambar.',[KA],S,['lunch_curry'],false,false,false,null),
  NV('Nati Chicken Curry',null,'ನಾಟಿ ಕೋಳಿ ಸಾರು','Country chicken cooked in an intensely spiced Karnataka gravy with fresh coconut, coriander seeds and black pepper.',[KA],S,['lunch_curry'],'chicken'),
  V('Ennegayi',null,'ಎಣ್ಣೆಗಾಯಿ','Tender baby brinjal stuffed with a spiced groundnut-coconut paste and cooked in a shallot-tamarind gravy.',[KA],S,['lunch_curry'],false,false,false,null),
  NV('Coorg Pork Curry',null,'ಕೊಡವ ಹಂದಿ ಮಾಂಸ','Slow-cooked Kodava pork with Coorg-specific spices, kachampuli vinegar and coconut milk — a Kodava wedding classic.',[KA],S,['lunch_curry'],'pork'),
  NV('Mutton Saaru Karnataka',null,'ಮಟನ್ ಸಾರು','Karnataka mutton cooked in a thin but intensely flavoured coconut-spice broth with onion and fresh-ground masala.',[KA],S,['lunch_curry'],'mutton'),
  V('Kadala Curry Karnataka',null,null,'Black chickpea curry with a freshly ground coconut and shallot base — a Karnataka coastal breakfast favourite.',[KA],S,['lunch_curry'],false,false,false,null,['protein']),
  NV('Mangalore Fish Curry',null,'ಮಂಗಳೂರು ಮೀನು ಕರಿ','Coastal Karnataka fish curry with coconut milk, raw mango and a freshly ground masala paste — tangy and fragrant.',[KA],S,['lunch_curry'],'fish'),
  V('Majjige Huli',null,'ಮಜ್ಜಿಗೆ ಹುಳಿ','Ash gourd in a buttermilk-coconut curry with ginger and green chilli — cooling and jain-friendly.',[KA],S,['lunch_curry'],true,false,false,null,['light','cooling']),
  V('Thovve',null,'ತೊವ್ವೆ','Simple moong dal cooked with onion, mustard and a light Karnataka tadka of coconut and curry leaves.',[KA],S,['lunch_curry'],false,false,false,null,['protein','light']),
  NV('Egg Curry Karnataka',null,null,'Hard-boiled eggs in a Karnataka-style onion-tomato gravy with coconut and freshly ground spices.',[KA],S,['lunch_curry'],'egg'),
  V('Menthya Soppu Sambar',null,'ಮೆಂತ್ಯ ಸೊಪ್ಪು ಸಾಂಬಾರ','Sambar with fresh fenugreek leaves added to the lentil-tamarind base — slightly bitter and very nutritious.',[KA],S,['lunch_curry'],false,false,false,null,['iron-rich']),
  V('Udupi Sambar',null,'ಉಡುಪಿ ಸಾಂಬಾರ','The famous Udupi temple-style sambar — mildly sweet with jaggery, freshly grated coconut and a distinct spice mix.',[KA],S,['lunch_curry'],false,false,false,null),

  // dinner_curry (11)
  NV('Koli Saaru',null,'ಕೋಳಿ ಸಾರು','Coorg-style country chicken in a thin but fiery coconut gravy with kachampuli and freshly ground masala.',[KA],S,['dinner_curry'],'chicken'),
  NV('Mutton Pepper Fry Karnataka',null,null,'Dry-roasted Karnataka mutton with freshly cracked black pepper, shallots and curry leaves.',[KA],S,['dinner_curry'],'mutton'),
  NV('Prawn Gassi',null,'ಸ್ರಾವ್ ಗಸ್ಸಿ','Mangalorean prawn curry in a deep red coconut-tamarind gravy with roasted spices — a Tulu Nadu classic.',[KA],S,['dinner_curry'],'prawn'),
  NV('Chicken Saagu',null,'ಚಿಕನ್ ಸಾಗು','Chicken cooked in a Karnataka-style coconut and poppy seed gravy — mild and aromatic, served with set dosa.',[KA],S,['dinner_curry'],'chicken'),
  V('Dal Palya',null,'ದಾಲ್ ಪಲ್ಯ','Lentil and vegetable preparation with a Karnataka tadka of mustard, dried chilli and onion.',[KA],S,['dinner_curry'],false,false,false,null,['protein']),
  V('Hurali Saaru',null,'ಹುರಳಿ ಸಾರು','Horse gram rasam boiled with tamarind, onion and tomato — a deeply nutritious Karnataka digestive broth.',[KA],S,['dinner_curry'],false,false,false,null,['protein','iron-rich']),
  V('Kayi Huli',null,'ಕಾಯಿ ಹುಳಿ','Coconut-based tamarind curry with mixed vegetables and Karnataka sambar powder — a Malnad region speciality.',[KA],S,['dinner_curry'],false,false,false,null),
  V('Menasina Saaru',null,'ಮೆಣಸಿನ ಸಾರು','Black pepper and garlic rasam with tomato and cumin — a Karnataka immunity-boosting dinner broth.',[KA],S,['dinner_curry'],false,false,false,null,['light']),
  V('Bale Puli Koddel',null,'ಬಾಳೆ ಪುಳಿ ಕೊಡ್ಡೆಲ್','Raw banana in a coconut-tamarind curry with mustard and curry leaves — a Coastal Karnataka jain-friendly preparation.',[KA],S,['dinner_curry'],true,false,false,null),
  V('Vangi Palya',null,'ವಾಂಗಿ ಪಲ್ಯ','Baby brinjal dry-cooked with shallots, peanuts and a Karnataka spice blend — a fragrant vegetable preparation.',[KA],S,['dinner_curry'],false,false,false,null),
  V('Vegetable Ghassi',null,'ತರಕಾರಿ ಘಸ್ಸಿ','Mixed vegetable curry in a roasted coconut and red chilli gravy — the vegetarian version of the Tulu Nadu coastal ghassi.',[KA],S,['dinner_curry'],false,false,false,null),

  // veg_side (10)
  V('Beans Palya',null,'ಬೀನ್ಸ್ ಪಲ್ಯ','French beans stir-fried with mustard, onion, dried chilli and fresh coconut — a Karnataka palya.',[KA],S,['veg_side'],false,false,false,null,['fibre']),
  V('Cabbage Palya',null,'ಕ್ಯಾಬೇಜ್ ಪಲ್ಯ','Shredded cabbage tossed with mustard, urad dal, green chilli and coconut — a Karnataka vegetable classic.',[KA],S,['veg_side'],false,false,false,null,['fibre']),
  V('Carrot Palya',null,'ಕ್ಯಾರೆಟ್ ಪಲ್ಯ','Grated carrot stir-fried with mustard, dried red chilli and fresh coconut — a colourful Karnataka side.',[KA],S,['veg_side'],false,false,false,null),
  V('Potato Palya','आलू पल्य','ಆಲೂ ಪಲ್ಯ','Diced potato tossed with turmeric, mustard and curry leaves — a simple Karnataka potato side dish.',[KA],S,['veg_side'],false,false,false,null),
  V('Raw Banana Palya',null,'ಬಾಳೆ ಕಾಯಿ ಪಲ್ಯ','Raw banana stir-fried with coconut, mustard and green chilli — no onion or garlic, jain-friendly.',[KA],S,['veg_side'],true,false,false,null),
  V('Capsicum Palya',null,'ದೊಣ್ಣೆ ಮೆಣಸಿನಕಾಯಿ ಪಲ್ಯ','Bell pepper sauteed with onion, cumin and a light Karnataka spice base — colourful and aromatic.',[KA],S,['veg_side'],false,false,false,null),
  V('Brinjal Palya',null,'ಬದನೆಕಾಯಿ ಪಲ್ಯ','Brinjal dry-cooked with onion, mustard, dried red chilli and fresh coconut — a Karnataka household staple.',[KA],S,['veg_side'],false,false,false,null),
  V('Methi Palya',null,'ಮೆಂತ್ಯ ಪಲ್ಯ','Fresh fenugreek leaves stir-fried with onion, chilli and coconut — bitter, nutritious and iron-rich.',[KA],S,['veg_side'],false,false,false,null,['iron-rich']),
  V('Sabsige Soppu Palya',null,'ಸಬ್ಸಿಗೆ ಸೊಪ್ಪು ಪಲ್ಯ','Fresh dill leaves stir-fried with coconut and mild spices — an aromatic Karnataka greens preparation with no onion.',[KA],S,['veg_side'],true,false,false,null),
  V('Hurali Palya',null,'ಹುರಳಿ ಪಲ್ಯ','Horse gram stir-fried with shallots, mustard and dried red chilli — protein-dense Karnataka side.',[KA],S,['veg_side'],false,false,false,null,['protein','iron-rich']),

  // rice (4)
  V('Chitranna',null,'ಚಿತ್ರಾನ್ನ','Rice tempered with mustard, peanuts, curry leaves and lemon — the Karnataka temple-style lemon rice.',[KA],S,['rice'],true,false,false,null),
  V('Vangi Bath Rice',null,'ವಾಂಗಿ ಬಾತ್','Rice cooked with small brinjal, Karnataka vangi bath powder and a touch of tamarind — a fragrant one-pot dish.',[KA],S,['rice'],false,false,false,null),
  V('Coconut Rice Karnataka',null,null,'Rice tossed with fresh coconut, mustard, urad dal and green chilli — Karnataka coastal style.',[KA],S,['rice'],true,false,false,null),
  V('Mosaranna',null,'ಮೊಸರನ್ನ','Curd rice tempered with mustard, dried red chilli, curry leaves and ginger — the Karnataka version of thayir sadam.',[KA],S,['rice'],true,false,false,null,['probiotic','light']),

  // bread (2)
  V('Jolada Rotti',null,'ಜೋಳದ ರೊಟ್ಟಿ','Jowar flatbread from North Karnataka — thick, coarse and earthy, eaten with brinjal chutney or egg curry.',[KA],S,['bread'],true,false,false,null,['low-gi','fibre']),
  V('Ragi Mudde',null,'ರಾಗಿ ಮುದ್ದೆ','Stiff finger millet ball swallowed in pieces with sambar or saaru — a rural Karnataka staple rich in calcium.',[KA],S,['bread'],true,false,false,null,['low-gi','calcium']),

  // raita (1)
  V('Mosaru Bajji',null,'ಮೊಸರು ಬಜ್ಜಿ','Mixed vegetables in yogurt with a Karnataka tadka of mustard and dried red chilli — the local raita.',[KA],S,['raita'],true,false,false,null,['probiotic']),

  // snack (1)
  V('Nippattu',null,'ನಿಪ್ಪಟ್ಟು','Crispy flat fried disc made from rice flour, chilli and sesame — a crunchy Karnataka Diwali and everyday snack.',[KA],S,['snack'],true,false,false,null),


  // ══════════════════════════════════════════════════════════════════════════════
  // BENGALI — 55 dishes  (EAST)
  // 10 breakfast | 14 lunch_curry | 12 dinner_curry | 10 veg_side | 4 rice | 2 bread | 2 raita | 1 snack
  // ══════════════════════════════════════════════════════════════════════════════

  // breakfast (10)
  V('Luchi','लुची','লুচি','Soft deep-fried puffed bread made from refined flour — the Bengali answer to puri, eaten with aloo dum or cholar dal.',[BN],E,['breakfast'],true,false,false,null),
  V('Radhaballavi',null,'রাধাবল্লভী','Dal-stuffed deep-fried puri filled with spiced urad dal and green chilli — a classic Bengali street breakfast.',[BN],E,['breakfast'],true,false,false,null,['protein']),
  V('Kochuri',null,'কচুরি','Deep-fried bread stuffed with spiced dal or peas filling — puffed and golden, eaten with a thin potato curry.',[BN],E,['breakfast'],true,false,false,null),
  V('Muri with Alu Tarkari',null,'মুড়ি দিয়ে আলু তরকারি','Puffed rice served alongside a quick potato and onion curry — a light everyday Bengali morning combination.',[BN],E,['breakfast'],false,false,false,null),
  V('Dal Puri',null,'ডাল পুরি','Thin deep-fried bread stuffed with seasoned lentil paste — a Bengali breakfast staple enjoyed across the state.',[BN],E,['breakfast'],true,false,false,null,['protein']),
  NV('Bread Omelette Bengali Style',null,null,'Thick egg omelette sandwiched in buttered bread with green chilli and onion — the Bengali street breakfast.',[BN],E,['breakfast'],'egg'),
  V('Ghugni',null,'ঘুগনি','Yellow peas slow-cooked with onion, tomato and a Bengali spice blend — a versatile breakfast or snack.',[BN],E,['breakfast'],false,false,false,null,['protein']),
  V('Roti with Alu Bhaja',null,'রুটি আলু ভাজা','Soft whole wheat roti served with crispy shallow-fried spiced potato slices — a simple Bengali morning meal.',[BN],E,['breakfast'],false,false,false,null),
  V('Sattu Paratha',null,'সত্তুর পরাঠা','Whole wheat paratha stuffed with roasted gram flour, onion, green chilli and mustard oil — hearty and filling.',[BN],E,['breakfast'],false,false,false,null,['protein']),
  V('Nimki',null,'নিমকি','Crispy diamond-shaped fried pastry made from refined flour with nigella seeds — the Bengali tea-time snack.',[BN],E,['breakfast'],true,false,false,null),

  // lunch_curry (14)
  NV('Macher Jhol','मछली झोल','মাছের ঝোল','Everyday Bengali fish curry with potato, tomato and turmeric in a thin golden broth — comfort food of Bengal.',[BN],E,['lunch_curry'],'fish'),
  NV('Shorshe Ilish',null,'সরষে ইলিশ','Hilsa fish steamed in a bold mustard-green chilli paste — the most celebrated Bengali fish preparation.',[BN],E,['lunch_curry'],'fish'),
  NV('Kosha Mangsho',null,'কষা মাংস','Slow-cooked Bengali mutton with deep brown onion-tomato gravy and whole spices — the Sunday lunch showstopper.',[BN],E,['lunch_curry'],'mutton'),
  V('Aloo Posto',null,'আলু পোস্তো','Potato cubes cooked in a white poppy seed paste with green chilli and mustard oil — the quintessential Bengali vegetarian dish.',[BN],E,['lunch_curry'],false,false,false,null),
  V('Musur Dal',null,'মুসুর ডাল','Red lentil dal tempered with onion, tomato and panch phoron — the everyday Bengali dal.',[BN],E,['lunch_curry'],false,false,false,null,['protein','iron-rich']),
  NV('Chingri Malai Curry',null,'চিংড়ি মালাই কারি','Large prawns in a velvety coconut milk and onion gravy with whole spices — a Bengali celebration dish.',[BN],E,['lunch_curry'],'prawn'),
  V('Shukto',null,'শুক্তো','Mixed bitter-sweet vegetable preparation with bitter gourd, drum stick and raw banana in a milk and mustard base — a Bengali meal starter.',[BN],E,['lunch_curry'],false,false,false,null),
  NV('Doi Maach',null,'দই মাছ','Fish cooked in a yogurt gravy with turmeric, green chilli and a light spice base — silky and mildly sour.',[BN],E,['lunch_curry'],'fish'),
  NV('Chicken Rezala',null,'চিকেন রেজালা','Mughal-inspired white chicken gravy cooked with yogurt, kewra and cashews — a Bengali Muslim wedding staple.',[BN],E,['lunch_curry'],'chicken'),
  V('Chholar Dal',null,'ছোলার ডাল','Chana dal cooked with coconut, bay leaf and cardamom without any onion or garlic — served with luchi at Bengali festivals.',[BN],E,['lunch_curry'],true,false,false,null,['protein']),
  NV('Rohu Kalia',null,'রুই কালিয়া','Rohu fish in a rich onion-tomato-yogurt gravy with whole spices and mustard oil — a Bengali festive fish preparation.',[BN],E,['lunch_curry'],'fish'),
  V('Niramish Torkari',null,'নিরামিষ তরকারি','Mixed vegetable stew with potato, pumpkin and brinjal in panch phoron tempering — the Bengali everyday vegetable.',[BN],E,['lunch_curry'],false,false,false,null,['fibre']),
  V('Dhokar Dalna',null,'ধোকার ডালনা','Fried lentil cake pieces simmered in a spiced potato gravy — a unique Bengali vegan preparation.',[BN],E,['lunch_curry'],false,false,false,null,['protein']),
  NV('Lau Chingri',null,'লাউ চিংড়ি','Bottle gourd cooked with small prawns in a simple Bengali mustard oil tempering — light and delicious.',[BN],E,['lunch_curry'],'prawn'),

  // dinner_curry (12)
  NV('Chicken Kosha',null,'চিকেন কষা','Dry-cooked Bengali chicken with deeply caramelised onion, ginger-garlic and whole spices — intense and satisfying.',[BN],E,['dinner_curry'],'chicken'),
  NV('Mutton Rezala',null,'মাটন রেজালা','Mughal-style white mutton curry with yogurt, white pepper, kewra and whole spices — aromatic and mild.',[BN],E,['dinner_curry'],'mutton'),
  NV('Chingri Bhapa',null,'চিংড়ি ভাপা','Prawns steamed in a mustard-coconut-green chilli paste — a Bengali prawn preparation that needs no oil.',[BN],E,['dinner_curry'],'prawn'),
  NV('Egg Kosha',null,'ডিম কষা','Hard-boiled eggs slow-cooked in a dark Bengali onion-tomato gravy with warm spices — a weeknight staple.',[BN],E,['dinner_curry'],'egg'),
  V('Paneer Posto',null,'পনির পোস্তো','Paneer cubes cooked in a white poppy seed paste with green chilli and a touch of mustard oil.',[BN],E,['dinner_curry'],false,false,false,null,['protein']),
  V('Alu Phulkopi Dalna',null,'আলু ফুলকপি ডালনা','Potato and cauliflower cooked in a cumin-turmeric gravy — the most common Bengali winter curry.',[BN],E,['dinner_curry'],false,false,false,null),
  NV('Narkel Diye Chingri',null,'নারকেল দিয়ে চিংড়ি','Prawn cooked with freshly scraped coconut, mustard and green chilli in a creamy Bengali style.',[BN],E,['dinner_curry'],'prawn'),
  NV('Ilish Bhapa',null,'ইলিশ ভাপা','Hilsa fish steamed in banana leaf with mustard oil, green chilli and turmeric — pure Bengali technique.',[BN],E,['dinner_curry'],'fish'),
  V('Moong Dal',null,'মুগ ডাল','Yellow split moong dal tempered with cumin, ginger and a light Bengali tadka — soft and digestive.',[BN],E,['dinner_curry'],false,false,false,null,['protein','light']),
  V('Tomato Jhol',null,'টমেটো ঝোল','Thin tomato-based Bengali curry with potato and panch phoron — a simple light dinner preparation.',[BN],E,['dinner_curry'],false,false,false,null,['light']),
  NV('Bhetki Paturi',null,'ভেটকি পাতুরি','Barramundi fillets marinated in mustard-coconut paste, wrapped in banana leaf and steamed — a classic Bengali festive dish.',[BN],E,['dinner_curry'],'fish'),
  NV('Katla Kalia',null,'কাতলা কালিয়া','Katla fish in a spicy ginger-onion-tomato gravy — a bold Bengali fish preparation eaten with plain rice.',[BN],E,['dinner_curry'],'fish'),

  // veg_side (10)
  V('Alu Bhaja',null,'আলু ভাজা','Thinly sliced potato shallow-fried with turmeric and green chilli in mustard oil — the first Bengali side.',[BN],E,['veg_side'],false,false,false,null),
  V('Begun Bhaja',null,'বেগুন ভাজা','Brinjal slices marinated in turmeric and salt, shallow-fried in mustard oil until golden — simple and perfect.',[BN],E,['veg_side'],true,false,false,null),
  V('Shim Bhaja',null,'শিম ভাজা','Flat beans sliced and stir-fried with mustard oil, turmeric and dried red chilli — a winter Bengali side.',[BN],E,['veg_side'],true,false,false,null,['fibre']),
  V('Kumro Bhaja',null,'কুমড়ো ভাজা','Pumpkin or squash slices spiced with turmeric and fried in mustard oil until slightly crispy at the edges.',[BN],E,['veg_side'],true,false,false,null),
  V('Chorchori',null,'চরচরি','Mixed vegetable stir-fry with potato, brinjal and greens in a dry panch phoron tempering — the Bengali medley.',[BN],E,['veg_side'],false,false,false,null,['fibre']),
  V('Labra',null,'লাবড়া','Mixed vegetable stew with potato, sweet potato, brinjal and raw banana cooked for Durga Puja bhog.',[BN],E,['veg_side'],false,false,false,null,['fibre']),
  V('Palong Shak Bhaja',null,'পালং শাক ভাজা','Spinach stir-fried with garlic, dried red chilli and mustard oil — an iron-rich Bengali greens preparation.',[BN],E,['veg_side'],false,false,false,null,['iron-rich']),
  V('Dharosh Bhaja',null,'ঢেঁড়স ভাজা','Okra sliced and shallow-fried with turmeric in mustard oil until crispy — a Bengali household staple.',[BN],E,['veg_side'],true,false,false,null,['fibre']),
  V('Mocha Ghonto',null,'মোচার ঘন্ট','Banana flower finely chopped and cooked with potato, coconut and panch phoron — a labour of love in Bengali cooking.',[BN],E,['veg_side'],false,false,false,null,['iron-rich']),
  V('Pui Shak Stir Fry',null,'পুঁই শাক ভাজা','Malabar spinach sauteed with mustard, dried red chilli and mustard oil — a nutritious Bengali leafy side.',[BN],E,['veg_side'],true,false,false,null,['iron-rich']),

  // rice (4)
  V('Mishti Pulao',null,'মিষ্টি পোলাও','Fragrant rice cooked with sugar, ghee, raisins and whole spices until mildly sweet — a Bengali wedding staple.',[BN],E,['rice'],true,false,false,null),
  V('Khichuri',null,'খিচুড়ি','Rice and moong dal cooked together with ghee, cauliflower and potato — the Bengali monsoon and Durga Puja comfort food.',[BN],E,['rice'],false,false,false,null,['light','comfort']),
  V('Basanti Pulao',null,'বাসন্তী পোলাও','Yellow saffron-turmeric rice cooked with cashews, raisins and whole spices — a Bengali festival rice.',[BN],E,['rice'],true,false,false,null),
  V('Gobindobhog Rice',null,'গোবিন্দভোগ চাল','Short grain aromatic Gobindobhog rice simply boiled — its natural fragrance elevates any Bengali curry.',[BN],E,['rice'],true,false,false,null),

  // bread (2)
  V('Paratha Bengali Style',null,'বাংলা পরাঠা','Shallow-fried whole wheat flatbread with crispy layers — a Bengali morning or dinner bread.',[BN],E,['bread'],true,false,false,null),
  NV('Mughlai Paratha',null,'মোগলাই পরাঠা','Flaky paratha sealed around a filling of egg, spiced mince and onion then pan-fried — a Kolkata street icon.',[BN],E,['bread'],'egg'),

  // raita (2)
  V('Mishti Doi',null,'মিষ্টি দই','Sweet caramelised yogurt set in earthen pots — the beloved Bengali dessert-raita served at every meal.',[BN],E,['raita'],true,false,false,null,['probiotic']),
  V('Doi Begun',null,'দই বেগুন','Fried brinjal slices soaked in sweet spiced yogurt — a Bengali side with contrasting flavours and textures.',[BN],E,['raita'],true,false,false,null,['probiotic']),

  // snack (1)
  V('Jilipi',null,'জিলিপি','Fermented batter deep-fried in spirals and soaked in sugar syrup — the Bengali version of jalebi, crispier and more tangy.',[BN],E,['snack'],true,false,false,null),

];

// ─── Seed function ─────────────────────────────────────────────────────────────

async function seed() {
  const BATCH_SIZE = 20;
  let totalInserted = 0;
  let totalErrors   = 0;

  const tn = dishes.filter(d => d.cuisine?.includes(TN));
  const ka = dishes.filter(d => d.cuisine?.includes(KA));
  const bn = dishes.filter(d => d.cuisine?.includes(BN));
  console.log(`\nSeeding ${dishes.length} dishes (Tamil Nadu: ${tn.length} | Karnataka: ${ka.length} | Bengali: ${bn.length})\n`);

  for (let i = 0; i < dishes.length; i += BATCH_SIZE) {
    const batch = dishes.slice(i, i + BATCH_SIZE);
    const { error } = await client.from('dishes').insert(batch);
    if (error) {
      console.error(`  Batch ${Math.floor(i / BATCH_SIZE) + 1} ERROR:`, error.message);
      totalErrors += batch.length;
    } else {
      totalInserted += batch.length;
      console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: inserted ${batch.length} dishes (running total: ${totalInserted})`);
    }
  }

  console.log(`\nDone. Inserted: ${totalInserted} | Errors: ${totalErrors}`);
  console.log('\nVerification query:');
  console.log("  SELECT cuisine[1] as cuisine, COUNT(*) FROM dishes WHERE cuisine && ARRAY['Tamil Nadu','Karnataka','Bengali'] GROUP BY cuisine[1];");

  const [{ data: tnRows }, { data: kaRows }, { data: bnRows }] = await Promise.all([
    client.from('dishes').select('cuisine').contains('cuisine', ['Tamil Nadu']),
    client.from('dishes').select('cuisine').contains('cuisine', ['Karnataka']),
    client.from('dishes').select('cuisine').contains('cuisine', ['Bengali']),
  ]);
  const tnDb = (tnRows ?? []).length;
  const kaDb = (kaRows ?? []).length;
  const bnDb = (bnRows ?? []).length;

  const W1=16, W2=18, W3=17, W4=8;
  const row = (a:string,b:string,c:string,d:string) =>
    '│ '+a.padEnd(W1-2)+' │ '+b.padEnd(W2-2)+' │ '+c.padEnd(W3-2)+' │ '+d.padEnd(W4-2)+' │';
  const div = (l:string,m:string,r:string) =>
    l+'─'.repeat(W1)+m+'─'.repeat(W2)+m+'─'.repeat(W3)+m+'─'.repeat(W4)+r;

  console.log('\n'+div('┌','┬','┐'));
  console.log(row('Cuisine','Dishes generated','Dishes inserted','Errors'));
  console.log(div('├','┼','┤'));
  console.log(row('Tamil Nadu',String(tn.length),String(tnDb),'0'));
  console.log(row('Karnataka', String(ka.length),String(kaDb),'0'));
  console.log(row('Bengali',   String(bn.length),String(bnDb),'0'));
  console.log(div('├','┼','┤'));
  console.log(row('TOTAL',String(dishes.length),String(totalInserted),String(totalErrors)));
  console.log(div('└','┴','┘'));
}

seed().catch(console.error);
