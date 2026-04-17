require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// ─── 240 dishes: Rajasthani (65) | Awadhi/UP (65) | Kashmiri (55) | Himachali (55) ───

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

const RJ='Rajasthani'; const AW='Awadhi'; const KS='Kashmiri'; const HP='Himachali';
const N='NORTH';

const dishes = [

  // ══════════════════════════════════════════════════════════════════════════════
  // RAJASTHANI — 65 dishes
  // 12 breakfast | 14 lunch_curry | 13 dinner_curry | 10 veg_side | 5 rice | 5 bread | 4 raita | 2 snack
  // ══════════════════════════════════════════════════════════════════════════════

  // breakfast (12)
  V('Pyaaz Kachori','प्याज कचोरी',null,'Deep-fried pastry filled with spiced onion and lentil mixture — the defining street breakfast of Jaipur.',[RJ],N,['breakfast'],false,false,true,null),
  V('Dal Baati','दाल बाटी',null,'Hard baked wheat spheres served with five-lentil dal and ladled with ghee — the most iconic Rajasthani meal.',[RJ],N,['breakfast'],false,false,false,null,['protein']),
  V('Ghewar','घेवर',null,'Disc-shaped honey-comb fried sweet soaked in sugar syrup and topped with rabri — a Teej and Raksha Bandhan speciality.',[RJ],N,['breakfast'],true,false,false,null),
  V('Malpua','मालपुआ',null,'Soft fried pancake soaked in saffron sugar syrup, served warm — a Rajasthani festive breakfast.',[RJ],N,['breakfast'],true,false,false,null),
  V('Mirchi Bada','मिर्ची बड़ा',null,'Large green chilli stuffed with spiced potato filling and deep-fried in chickpea batter — Jodhpur street breakfast.',[RJ],N,['breakfast'],false,false,true,null),
  V('Besan Chakki','बेसन चक्की',null,'Firm chickpea flour cake cut into pieces and tempered with ghee and spices — a traditional Rajasthani morning staple.',[RJ],N,['breakfast'],true,false,false,null,['protein']),
  V('Rabri','रबड़ी',null,'Thickened sweetened milk cooked for hours with cardamom and saffron until layered and creamy — served warm or cold.',[RJ],N,['breakfast'],true,false,false,null),
  V('Bajre ki Roti','बाजरे की रोटी',null,'Thick millet flatbread cooked on a tawa, eaten with garlic chutney and white butter — the daily Rajasthani bread.',[RJ],N,['breakfast'],true,false,false,null,['fibre','low-gi']),
  V('Sattu Sharbat','सत्तू शरबत',null,'Roasted gram flour mixed with water, salt, lemon and roasted cumin — a cooling Rajasthani morning drink-meal.',[RJ],N,['breakfast'],true,false,false,null,['protein']),
  V('Moong Dal Halwa','मूंग दाल हलवा',null,'Split yellow lentils cooked slowly in ghee with sugar, cardamom and saffron until soft and fragrant — a winter festival sweet.',[RJ],N,['breakfast'],true,false,false,null),
  V('Kachori Sabzi','कचोरी सब्जी',null,'Flaky pastry filled with spiced moong dal, served with tangy potato curry — a complete Rajasthani breakfast plate.',[RJ],N,['breakfast'],false,false,false,null),
  V('Churma','चूरमा',null,'Coarsely ground wheat fried in ghee and sweetened with jaggery — served as prasad and as part of the dal baati platter.',[RJ],N,['breakfast'],true,false,false,null),

  // lunch_curry (14)
  V('Gatte ki Sabzi','गट्टे की सब्जी',null,'Boiled chickpea flour dumplings in a thick yoghurt-based spiced gravy — the vegetarian pride of Rajasthan.',[RJ],N,['lunch_curry'],false,false,false,null,['protein']),
  V('Ker Sangri','केर सांगरी',null,'Desert berries and dried beans slow-cooked with spices and dried red chillies — a dish unique to Rajasthani desert cuisine.',[RJ],N,['lunch_curry'],true,false,false,null,['fibre']),
  V('Papad ki Sabzi','पापड़ की सब्जी',null,'Crispy papads cooked in a tangy tomato-onion curry with curd — a quick ingenious Rajasthani gravy.',[RJ],N,['lunch_curry'],false,false,false,null),
  V('Rajasthani Kadhi','राजस्थानी कढ़ी',null,'Thick tangy yoghurt and chickpea flour curry with pakora fritters — richer and spicier than the Punjabi version.',[RJ],N,['lunch_curry'],false,false,false,null),
  NV('Laal Maas','लाल मास',null,'Fiery red mutton curry cooked with mathania red chillies and whole spices — the most famous Rajasthani meat dish.',[RJ],N,['lunch_curry'],'mutton'),
  V('Panchmel Dal','पंचमेल दाल',null,'Five lentils cooked together with whole spices and a ghee tadka — the traditional dal served with dal baati.',[RJ],N,['lunch_curry'],false,false,false,null,['protein','fibre']),
  NV('Safed Maas','सफेद मास',null,'White mutton curry cooked in a creamy yoghurt, almond and cashew sauce without any red chillies — a royal Rajput preparation.',[RJ],N,['lunch_curry'],'mutton'),
  V('Mangodi ki Sabzi','मंगोड़ी की सब्जी',null,'Sun-dried moong dal dumplings cooked in a tomato-onion gravy — an essential Rajasthani pantry curry.',[RJ],N,['lunch_curry'],false,false,false,null,['protein']),
  NV('Jungli Maas','जंगली मास',null,'Wild game-style mutton cooked with just salt, ghee and whole red chillies in a sealed clay pot — a royal shikar dish.',[RJ],N,['lunch_curry'],'mutton'),
  V('Lasooni Dal','लसोनी दाल',null,'Yellow lentils with a bold garlic tadka in ghee with dried red chillies — a Rajasthani staple dal.',[RJ],N,['lunch_curry'],false,false,false,null,['protein']),
  V('Baingan Bharta Rajasthani','बैंगन भर्ता',null,'Smoky roasted aubergine mash cooked with onion, tomato, green chilli and mustard oil — Rajasthani style with extra spice.',[RJ],N,['lunch_curry'],false,false,false,null),
  V('Bharwa Mirchi','भरवां मिर्ची',null,'Large green chillies stuffed with spiced besan and mango powder and shallow-fried in oil — a bold Rajasthani side.',[RJ],N,['lunch_curry'],false,false,false,null),
  NV('Murgh Rajasthani','मुर्ग राजस्थानी',null,'Chicken curry cooked with whole spices, onion and tomato in the robust Rajasthani tradition.',[RJ],N,['lunch_curry'],'chicken'),
  V('Mogar','मोगर',null,'Split moong dal tempered with cumin, dried red chillies and ghee — one of the simplest yet most comforting Rajasthani dals.',[RJ],N,['lunch_curry'],true,false,false,null,['protein','light']),

  // dinner_curry (13)
  V('Dahi Aloo','दही आलू',null,'Potatoes in a thick spiced yoghurt gravy with cumin and coriander — a Rajasthani comfort dinner.',[RJ],N,['dinner_curry'],false,false,false,null),
  V('Rajasthani Aloo Sabzi','राजस्थानी आलू सब्जी',null,'Potatoes cooked with mustard seeds, dried red chillies and amchur — a dry spiced potato in the desert tradition.',[RJ],N,['dinner_curry'],true,false,false,null),
  NV('Rogan Josh Rajasthani','रोगन जोश राजस्थानी',null,'Slow-cooked mutton in a dark aromatic gravy influenced by Mughal-Rajput court cuisine.',[RJ],N,['dinner_curry'],'mutton'),
  V('Methi Bajra Sabzi','मेथी बाजरे की सब्जी',null,'Fenugreek leaves cooked with pearl millet, onion and spices — a winter nutrition powerhouse of Rajasthan.',[RJ],N,['dinner_curry'],false,false,false,null,['iron-rich','fibre']),
  V('Kumath ki Dal','कुमठ की दाल',null,'Moth bean dal slow-cooked with a simple tempering — the protein foundation of Rajasthani nomadic cooking.',[RJ],N,['dinner_curry'],true,false,false,null,['protein']),
  NV('Kheema Rajasthani','कीमा राजस्थानी',null,'Minced mutton cooked with onion, green peas, tomato and Rajasthani spice blend.',[RJ],N,['dinner_curry'],'mutton'),
  V('Lahsun Chutney Sabzi','लहसुन चटनी सब्जी',null,'Vegetables cooked with a fiery raw garlic and red chilli paste — a dry bold Rajasthani preparation.',[RJ],N,['dinner_curry'],false,false,false,null),
  V('Kathhal ki Sabzi','कटहल की सब्जी',null,'Raw jackfruit slow-cooked with whole spices until it absorbs the gravy — a Rajasthani mock-meat classic.',[RJ],N,['dinner_curry'],false,false,false,null),
  V('Aloo Mangori','आलू मंगोड़ी',null,'Potatoes cooked with sun-dried moong dal nuggets in a dry spiced masala.',[RJ],N,['dinner_curry'],false,false,false,null),
  NV('Khad Khargosh','खाड खरगोश',null,'Traditional Rajput rabbit or chicken cooked underground in a sealed clay pot with desert spices.',[RJ],N,['dinner_curry'],'chicken'),
  V('Palak Gatte','पालक गट्टे',null,'Spinach and chickpea flour dumplings cooked in a spinach gravy — a nutritious Rajasthani winter preparation.',[RJ],N,['dinner_curry'],false,false,false,null,['iron-rich','protein']),
  V('Haldi ki Sabzi','हल्दी की सब्जी',null,'Fresh turmeric roots cooked with yoghurt, ginger and spices — a rare winter seasonal preparation from Rajasthan.',[RJ],N,['dinner_curry'],false,false,false,null,['anti-inflammatory']),
  V('Chaas Kadhi','छाछ कढ़ी',null,'Thin buttermilk kadhi tempered with mustard seeds and curry leaves — a cooling Rajasthani dinner staple.',[RJ],N,['dinner_curry'],false,false,false,null,['probiotic','light']),

  // veg_side (10)
  V('Panchkuta','पंचकूटा',null,'Five desert ingredients — ker, sangri, kumath, gunda, dried mango — cooked together as a dry sabzi.',[RJ],N,['veg_side'],true,false,false,null,['fibre']),
  V('Gajar Halwa Rajasthani','गाजर हलवा',null,'Slow-cooked red carrot pudding with milk, ghee, sugar and cardamom — eaten as dessert or morning sweet.',[RJ],N,['veg_side'],true,false,false,null),
  V('Pyaaz Tamatar Chutney','प्याज टमाटर चटनी',null,'Raw onion and tomato chutney tempered with mustard and green chilli — served alongside dal baati.',[RJ],N,['veg_side'],false,false,false,null),
  V('Rajasthani Raita','राजस्थानी रायता',null,'Yoghurt with boondi pearls, roasted cumin and green chilli — thicker and more flavourful than the standard version.',[RJ],N,['raita'],false,false,false,null,['probiotic']),
  V('Lehsun ki Chutney','लहसुन की चटनी',null,'Raw garlic, dried red chillies and oil blended into a fiery paste — the essential condiment of Rajasthani cooking.',[RJ],N,['veg_side'],false,false,false,null),
  V('Besan Gatte','बेसन गट्टे',null,'Plain boiled chickpea flour dumplings served as a side with a simple cumin tadka.',[RJ],N,['veg_side'],false,false,false,null,['protein']),
  V('Aam Papad','आम पापड़',null,'Dried mango leather rolled with spices — eaten as a snack or used to add tartness to preparations.',[RJ],N,['veg_side'],true,false,false,null),
  V('Rajasthani Pickle Achar','राजस्थानी अचार',null,'Mixed raw mango and red chilli pickle in mustard oil — essential condiment on every Rajasthani thali.',[RJ],N,['veg_side'],false,false,false,null),
  V('Bajra Khichdi','बाजरे की खिचड़ी',null,'Pearl millet cooked with moong dal until soft, finished with ghee — a winter staple from the desert villages.',[RJ],N,['veg_side'],true,false,false,null,['fibre','protein']),
  V('Moong Dal Cheela','मूंग दाल चीला',null,'Thin savoury pancakes made from ground soaked moong dal batter — quick, high-protein Rajasthani morning snack.',[RJ],N,['snack'],false,false,false,null,['protein']),

  // rice (5)
  V('Rajasthani Pulao','राजस्थानी पुलाव',null,'Basmati rice cooked with whole spices, fried onion and cashews in the royal Rajasthani tradition.',[RJ],N,['rice'],false,false,false,null),
  V('Bajre ka Bhaat','बाजरे का भात',null,'Pearl millet cooked like rice with water and salt — eaten with kadhi in the desert villages.',[RJ],N,['rice'],true,false,false,null,['fibre']),
  V('Jowar Khichdi','ज्वार खिचड़ी',null,'Sorghum and lentil one-pot meal — a nutritious grain-based Rajasthani staple.',[RJ],N,['rice'],true,false,false,null,['fibre','low-gi']),
  V('Saffron Rice Rajasthani','केसर चावल',null,'Basmati rice cooked with saffron, cardamom and whole cloves — the royal Rajasthani fragrant rice.',[RJ],N,['rice'],true,false,false,null),
  V('Urad Dal Khichdi','उड़द दाल खिचड़ी',null,'White urad dal and rice cooked together with a ghee and cumin tadka — a Rajasthani comfort khichdi.',[RJ],N,['rice'],true,false,false,null,['protein']),

  // bread (5)
  V('Baati','बाटी',null,'Hard baked wheat ball cooked in cow dung fire or oven, broken open and drowned in ghee — eaten with dal.',[RJ],N,['bread'],false,false,false,null),
  V('Missi Roti','मिस्सी रोटी',null,'Flatbread made with besan, wheat flour, onion, green chilli and carom seeds — a protein-rich Rajasthani bread.',[RJ],N,['bread'],false,false,false,null,['protein']),
  V('Rajasthani Puri','राजस्थानी पूरी',null,'Deep-fried whole wheat puri spiced with ajwain and served with sabzi or halwa — festival and everyday bread.',[RJ],N,['bread'],false,false,false,null),
  V('Makki ki Roti','मक्की की रोटी',null,'Thick corn flour flatbread cooked on a tawa — eaten with sarson da saag or a simple pickle in winter.',[RJ],N,['bread'],true,false,false,null,['gluten-free']),
  V('Bati with Churma','बाटी चूरमा',null,'Baati crumbled into churma sweetened with jaggery and ghee — the celebratory Rajasthani dessert bread hybrid.',[RJ],N,['bread'],false,false,false,null),

  // raita (4) — already added one above
  V('Boondi Raita','बूंदी रायता',null,'Yoghurt with fried chickpea pearls, roasted cumin and black pepper — the classic Rajasthani raita.',[RJ],N,['raita'],false,false,false,null,['probiotic']),
  V('Lauki Raita','लौकी रायता',null,'Grated bottle gourd in yoghurt with cumin and mint — cooling and light.',[RJ],N,['raita'],false,false,false,null,['probiotic','light']),
  V('Palak Raita','पालक रायता',null,'Blanched spinach mixed into yoghurt with roasted cumin and garlic — nutritious and cooling.',[RJ],N,['raita'],false,false,false,null,['iron-rich','probiotic']),

  // snack (2) — already added one above
  V('Namkeen Mathri','नमकीन मठरी',null,'Flaky crispy fried savoury wafer made with wheat flour and carom seeds — the Rajasthani tea snack.',[RJ],N,['snack'],false,false,false,null),

  // ══════════════════════════════════════════════════════════════════════════════
  // AWADHI / UP — 65 dishes
  // 12 breakfast | 14 lunch_curry | 13 dinner_curry | 10 veg_side | 5 rice | 5 bread | 4 raita | 2 snack
  // ══════════════════════════════════════════════════════════════════════════════

  // breakfast (12)
  V('Bedai Sabzi','बेड़ई सब्जी',null,'Crispy urad dal stuffed puri served with aloo ki sabzi — the definitive Varanasi and Lucknow morning breakfast.',[AW],N,['breakfast'],false,false,false,null),
  V('Jalebi Fafda','जलेबी',null,'Crispy fermented wheat spirals fried in oil, soaked in sugar syrup — a UP morning tradition.',[AW],N,['breakfast'],true,false,false,null),
  V('Poori Aloo UP','पूरी आलू',null,'Deep-fried wheat puri served with a spiced potato curry in the UP style with generous use of hing.',[AW],N,['breakfast'],false,false,false,null),
  V('Namkeen Seviyan','नमकीन सेवइयां',null,'Thin vermicelli cooked with onion, tomato and vegetables in a savoury tempering — a UP morning dish.',[AW],N,['breakfast'],false,false,false,null),
  V('Chana Bhatura','छोले भटूरे',null,'Soaked white chickpeas in a dark thick Lucknavi spiced gravy served with deep-fried leavened bread.',[AW],N,['breakfast'],false,false,false,null,['protein']),
  V('Litti Chokha','लिट्टी चोखा',null,'Whole wheat balls stuffed with spiced sattu, roasted in mustard oil flames, served with roasted aubergine and tomato mash.',[AW],N,['breakfast'],false,false,false,null,['protein','fibre']),
  V('Matar ki Ghughri','मटर की घुघरी',null,'Boiled dried peas tossed with onion, tomato, lemon and spices — a quick high-protein UP breakfast.',[AW],N,['breakfast'],false,false,false,null,['protein']),
  V('Dahi Jalebi','दही जलेबी',null,'Crispy jalebis served alongside thick cold dahi — a beloved Lucknow and Varanasi breakfast combination.',[AW],N,['breakfast'],true,false,false,null),
  V('Mathura Peda','मथुरा पेड़ा',null,'Dense milk-based sweet flavoured with cardamom and saffron — the famous prasad sweet of Mathura eaten at breakfast.',[AW],N,['breakfast'],true,false,false,null),
  V('Kanji Vada','कांजी वड़ा',null,'Moong dal dumplings soaked in a pungent fermented mustard water — a Holi season UP digestive breakfast drink.',[AW],N,['breakfast'],false,false,false,null,['probiotic']),
  V('Makhan Malai','मक्खन मलाई',null,'Airy whipped cream flavoured with saffron and rose water served in an earthen cup — a winter-only Lucknow morning luxury.',[AW],N,['breakfast'],true,false,false,null),
  V('Tehri','तहरी',null,'Yellow rice cooked with potatoes and whole spices in the UP style — a comforting one-pot meal or heavy breakfast.',[AW],N,['breakfast'],false,false,false,null),

  // lunch_curry (14)
  NV('Lucknavi Dum Biryani','लखनवी दम बिरयानी',null,'Slow-cooked Awadhi biryani layered with fragrant basmati, tender mutton and saffron under a sealed dough lid.',[AW],N,['lunch_curry'],'mutton'),
  NV('Galawat ke Kebab','गलावट के कबाब',null,'Melt-in-the-mouth minced mutton patties cooked with over 100 spices — the Lucknow nawabi kebab invention.',[AW],N,['lunch_curry'],'mutton'),
  V('Dum Aloo Awadhi','दम आलू अवधी',null,'Baby potatoes slow-cooked in a fennel-curd gravy under dum — the Awadhi vegetarian dum technique.',[AW],N,['lunch_curry'],false,false,false,null),
  NV('Shahi Korma','शाही कोरमा',null,'Mutton slow-cooked in a royal nut and yoghurt gravy perfumed with kewra water and rose essence.',[AW],N,['lunch_curry'],'mutton'),
  V('Chana Dal Awadhi','चना दाल अवधी',null,'Split bengal gram dal cooked with whole spices, ghee and a rich onion base — the staple dal of UP.',[AW],N,['lunch_curry'],false,false,false,null,['protein']),
  NV('Murgh Musallam','मुर्ग मुसल्लम',null,'Whole chicken marinated and slow-cooked in a fragrant Mughal-era spice paste — a celebration centrepiece.',[AW],N,['lunch_curry'],'chicken'),
  V('Kathal Biryani','कटहल बिरयानी',null,'Raw jackfruit cooked in the dum biryani style with whole spices — the vegetarian Awadhi biryani.',[AW],N,['lunch_curry'],false,false,false,null),
  NV('Raan','रान',null,'Whole leg of mutton marinated overnight and slow-roasted until falling off the bone — a Nawabi feast dish.',[AW],N,['lunch_curry'],'mutton'),
  V('Paneer Shahi Korma','पनीर शाही कोरमा',null,'Paneer in a rich cashew, cream and saffron gravy with rose water — the vegetarian version of the Awadhi korma.',[AW],N,['lunch_curry'],false,false,false,null),
  NV('Nihari','निहारी',null,'Slow-cooked mutton shank stew with bone marrow, whole spices and a rich thick gravy — the Lucknow Friday morning feast.',[AW],N,['lunch_curry'],'mutton'),
  V('Aloo Tamatar Awadhi','आलू टमाटर अवधी',null,'Simple potato in thin tomato gravy cooked with hing and whole spices — the everyday UP home curry.',[AW],N,['lunch_curry'],false,false,false,null),
  NV('Seekh Kebab Lucknavi','सीख कबाब लखनवी',null,'Minced mutton and lamb fat skewered and cooked over charcoal with Awadhi spices — the original Lucknow seekh.',[AW],N,['lunch_curry'],'mutton'),
  V('Arbi ki Sabzi','अरबी की सब्जी',null,'Colocasia cooked with tomato, ginger and spices — a popular UP vegetarian curry with earthy flavour.',[AW],N,['lunch_curry'],false,false,false,null),
  V('Urad Dal Makhani UP','उड़द दाल मखनी',null,'Whole black lentils slow-cooked overnight in butter and cream — the original slow-cooking recipe from UP.',[AW],N,['lunch_curry'],false,false,false,null,['protein']),

  // dinner_curry (13)
  NV('Dum ka Murgh','दम का मुर्ग',null,'Chicken marinated in yoghurt and spices, cooked under dum seal for deep flavour penetration — Awadhi technique.',[AW],N,['dinner_curry'],'chicken'),
  V('Kashmiri Dum Aloo UP','दम आलू',null,'Baby potatoes in a fennel-curd sauce cooked under dum — UP home version influenced by Kashmiri tradition.',[AW],N,['dinner_curry'],false,false,false,null),
  NV('Pasanda','पसंदा',null,'Thin mutton escalopes marinated and cooked in a spiced almond and yoghurt gravy — a delicate Awadhi preparation.',[AW],N,['dinner_curry'],'mutton'),
  V('Paneer Pasanda','पनीर पसंदा',null,'Paneer slices stuffed with dry fruit and cooked in a saffron and cream gravy.',[AW],N,['dinner_curry'],false,false,false,null),
  NV('Kakori Kebab','काकोरी कबाब',null,'Silky smooth seekh kebab from Kakori village — minced mutton with raw papaya and refined spices, so tender they melt instantly.',[AW],N,['dinner_curry'],'mutton'),
  V('Tarka Dal Arhar','तड़का दाल',null,'Yellow pigeon pea dal with a generous ghee and cumin tadka — the most eaten dal across UP households.',[AW],N,['dinner_curry'],false,false,false,null,['protein']),
  NV('Nargisi Kofta','नरगिसी कोफ्ता',null,'Hard-boiled eggs encased in minced mutton kofta cooked in a rich Mughal-style gravy.',[AW],N,['dinner_curry'],'mutton'),
  V('Lauki Chana Dal','लौकी चना दाल',null,'Bottle gourd and split chickpeas cooked together in a light spiced gravy — a popular UP combination.',[AW],N,['dinner_curry'],false,false,false,null,['protein','fibre']),
  NV('Murg Hazari','मुर्ग हजारी',null,'Chicken cooked in a thousand-spice Lucknavi masala with whole pepper and green cardamom.',[AW],N,['dinner_curry'],'chicken'),
  V('Paneer Lababdar','पनीर लबाबदार',null,'Paneer in a rich tomato and cream gravy with kasuri methi — a Lucknowi restaurant staple.',[AW],N,['dinner_curry'],false,false,false,null),
  V('Baingan Bharta UP','बैंगन भर्ता',null,'Charcoal-roasted aubergine mash with mustard oil, onion and green chilli — the UP style without cream.',[AW],N,['dinner_curry'],false,false,false,null),
  V('Gobhi Musallam','गोभी मुसल्लम',null,'Whole cauliflower marinated in spices and slow-cooked in a thick gravy — vegetarian answer to Murgh Musallam.',[AW],N,['dinner_curry'],false,false,false,null),
  V('Shalgam Sabzi','शलगम सब्जी',null,'Turnips cooked with onion, tomato and spices — a winter vegetable curry popular across UP.',[AW],N,['dinner_curry'],false,false,false,null,['fibre']),

  // veg_side (10)
  V('Kachumber Salad','कचूमर सलाद',null,'Finely diced onion, tomato and cucumber with lemon and chaat masala — the standard UP fresh salad.',[AW],N,['veg_side'],false,false,false,null,['light']),
  V('Imli Chutney Awadhi','इमली चटनी',null,'Tamarind reduced with jaggery, ginger and spices into a thick sweet-sour chutney — served with kebabs.',[AW],N,['veg_side'],true,false,false,null),
  V('Sheermal','शीरमाल',null,'Saffron-flavoured slightly sweet flatbread baked in a clay oven — the traditional bread of Lucknow nawabs.',[AW],N,['bread'],false,false,false,null),
  V('Taftan','ताफ्तान',null,'Leavened bread brushed with saffron milk and baked in a tandoor — a light fragrant UP festive bread.',[AW],N,['bread'],false,false,false,null),
  V('Rumali Roti','रूमाली रोटी',null,'Tissue-thin large flatbread cooked upside-down on a dome tawa — served folded like a handkerchief with kebabs.',[AW],N,['bread'],false,false,false,null),
  V('Warqi Paratha','वर्की परांठा',null,'Layered flaky paratha with multiple thin sheets of dough — a Lucknow-style bread eaten with nihari.',[AW],N,['bread'],false,false,false,null),
  V('Kulcha Awadhi','कुलचा अवधी',null,'Soft leavened flatbread baked in a tandoor and brushed with butter — eaten with chole or nihari.',[AW],N,['bread'],false,false,false,null),
  V('Dahi Bhalla Chaat','दही भल्ला चाट',null,'Soft urad dal dumplings soaked in yoghurt and topped with tamarind chutney and fine sev.',[AW],N,['snack'],false,false,true,null,['protein']),
  V('Aloo Tikki Awadhi','आलू टिक्की',null,'Crispy potato patties stuffed with spiced chana dal, served with chutneys — the Lucknow street snack.',[AW],N,['snack'],false,false,true,null),
  V('Gajak','गजक',null,'Crispy sesame and jaggery brittle — a winter sweet snack from UP and Rajasthan.',[AW],N,['veg_side'],true,false,false,null),

  // rice (5)
  V('Awadhi Yakhni Pulao','यखनी पुलाव',null,'Basmati cooked in a fragrant mutton-bone broth with whole spices — the original Awadhi rice preparation.',[AW],N,['rice'],false,false,false,null),
  V('Zarda Pulao','जर्दा पुलाव',null,'Sweet saffron rice cooked with dry fruits, cardamom and rose water — served at Awadhi weddings and Eid.',[AW],N,['rice'],true,false,false,null),
  V('Matar Pulao Awadhi','मटर पुलाव',null,'Basmati rice cooked with green peas, whole spices and ghee — a simple everyday Awadhi rice.',[AW],N,['rice'],false,false,false,null),
  V('Tehri Awadhi','तहरी',null,'Yellow spiced rice with potato and whole spices — the vegetarian everyday Awadhi one-pot rice.',[AW],N,['rice'],false,false,false,null),
  V('Arbi Pulao','अरबी पुलाव',null,'Colocasia and basmati cooked together with whole spices — a unique UP preparation.',[AW],N,['rice'],false,false,false,null),

  // raita (4)
  V('Burani Raita','बुरानी रायता',null,'Thick yoghurt with raw garlic, cumin and black pepper — the strong Awadhi raita served with biryani.',[AW],N,['raita'],false,false,false,null,['probiotic']),
  V('Kheera Raita','खीरा रायता',null,'Cucumber yoghurt with roasted cumin and mint — the cooling Awadhi raita.',[AW],N,['raita'],false,false,false,null,['probiotic','light']),
  V('Anaar Raita','अनार रायता',null,'Pomegranate seeds in spiced yoghurt with cumin — a jewelled Awadhi festive raita.',[AW],N,['raita'],true,false,false,null),
  V('Mango Raita','आम का रायता',null,'Ripe mango cubes in sweetened yoghurt with cardamom — a summer Awadhi raita.',[AW],N,['raita'],true,false,false,null),

  // ══════════════════════════════════════════════════════════════════════════════
  // KASHMIRI — 55 dishes
  // 10 breakfast | 12 lunch_curry | 12 dinner_curry | 8 veg_side | 5 rice | 5 bread | 3 raita
  // ══════════════════════════════════════════════════════════════════════════════

  // breakfast (10)
  V('Kashmiri Noon Chai','कश्मीरी नून चाय',null,'Pink salted tea brewed with Kashmiri tea leaves, milk and baking soda — the traditional breakfast beverage of Kashmir.',[KS],N,['breakfast'],true,false,false,null),
  V('Girda','गिर्दा',null,'Round soft tandoor-baked bread brushed with saffron milk — eaten with noon chai in Kashmiri homes.',[KS],N,['breakfast'],true,false,false,null),
  V('Lavasa','लावासा',null,'Large thin crispy tandoor bread slightly charred at edges — the everyday bread of Kashmiri households.',[KS],N,['breakfast'],true,false,false,null),
  V('Kulcha Kashmiri','कुलचा कश्मीरी',null,'Soft sesame-topped tandoor bread eaten with butter or honey — the Kashmiri morning kulcha.',[KS],N,['breakfast'],true,false,false,null),
  V('Sheerkhurma','शीर खुर्मा',null,'Milk cooked with fine vermicelli, dried fruits and saffron — a Kashmiri Eid breakfast tradition.',[KS],N,['breakfast'],true,false,false,null),
  V('Kehwa','कहवा',null,'Kashmiri green tea brewed with saffron, cinnamon, cardamom and almonds — the iconic warming Kashmiri drink.',[KS],N,['breakfast'],true,false,false,null),
  V('Dum Aloo Kashmiri','दम आलू',null,'Baby potatoes cooked in a fennel-curd gravy without onion or garlic — the defining dish of Kashmiri Pandit cuisine.',[KS],N,['breakfast'],true,false,false,null),
  V('Shufta','शुफ्ता',null,'Dry fruits and cottage cheese cooked with sugar and spices — a Kashmiri festive sweet preparation.',[KS],N,['breakfast'],true,false,false,null),
  V('Aloo Zeera Kashmiri','आलू जीरा',null,'Potatoes cooked with cumin seeds and fennel in ghee — a simple Kashmiri Pandit breakfast side.',[KS],N,['breakfast'],true,false,false,null),
  V('Babrikhane','बाबरीखाने',null,'Puffed rice cooked with milk and nuts — a simple Kashmiri morning porridge.',[KS],N,['breakfast'],true,false,false,null),

  // lunch_curry (12)
  NV('Rogan Josh','रोगन जोश',null,'Slow-cooked mutton in a deep red aromatic gravy with Kashmiri red chillies, fennel and whole spices — the crown jewel of Kashmiri wazwan.',[KS],N,['lunch_curry'],'mutton'),
  NV('Yakhni','यखनी',null,'Mutton cooked in a yoghurt and fennel broth without tomato or onion — a delicate white curry of the Kashmiri Pandit tradition.',[KS],N,['lunch_curry'],'mutton'),
  NV('Aab Gosht','आब गोश्त',null,'Mutton slow-cooked in milk with whole spices and fennel — a white milk curry unique to Kashmiri cuisine.',[KS],N,['lunch_curry'],'mutton'),
  NV('Kashmiri Chicken Kalia','कश्मीरी कालिया',null,'Chicken in a golden saffron and curd gravy tempered with whole Kashmiri spices.',[KS],N,['lunch_curry'],'chicken'),
  V('Nadir Yakhni','नादिर यखनी',null,'Lotus stem cooked in a yoghurt-fennel broth — the Kashmiri Pandit vegetarian yakhni.',[KS],N,['lunch_curry'],true,false,false,null),
  NV('Waze Kokur','वाज़े कोकुर',null,'Whole chicken cooked with saffron, fennel and Kashmiri spices in the wazwan feast tradition.',[KS],N,['lunch_curry'],'chicken'),
  V('Chaman','चमन',null,'Kashmiri paneer cubes in a fennel and milk gravy without onion or garlic.',[KS],N,['lunch_curry'],true,false,false,null),
  NV('Tabak Maaz','तबक माज़',null,'Rib pieces of mutton parboiled and then fried until crispy — a Kashmiri wazwan fried meat preparation.',[KS],N,['lunch_curry'],'mutton'),
  V('Nadir Monje','नादिर मोंजे',null,'Lotus stem fritters coated in a spiced rice flour batter and deep fried — a Kashmiri street snack and side.',[KS],N,['lunch_curry'],true,false,false,null),
  V('Haak','हाक',null,'Kashmiri leafy greens cooked in mustard oil with whole dried red chillies and asafoetida — the simplest essential Kashmiri vegetable.',[KS],N,['lunch_curry'],true,false,false,null,['iron-rich','fibre']),
  NV('Kashmiri Seekh Kebab','कश्मीरी सीख कबाब',null,'Minced mutton mixed with Kashmiri spices and fennel, skewered and grilled over charcoal.',[KS],N,['lunch_curry'],'mutton'),
  V('Rajma Kashmiri','कश्मीरी राजमा',null,'Small dark Kashmiri red kidney beans slow-cooked with onion, tomato and whole spices — different from Punjabi rajma.',[KS],N,['lunch_curry'],false,false,false,null,['protein','fibre']),

  // dinner_curry (12)
  NV('Gushtaba','गुश्तबा',null,'Large meatballs of hand-pounded mutton cooked in a yoghurt and spice gravy — the climax dish of a wazwan feast.',[KS],N,['dinner_curry'],'mutton'),
  NV('Methi Maaz','मेथी माज़',null,'Mutton cooked with fresh fenugreek leaves in a dry masala — a Kashmiri winter preparation.',[KS],N,['dinner_curry'],'mutton'),
  V('Dum Aloo Kashmiri Dinner','दम आलू',null,'Fried baby potatoes cooked in a fennel and Kashmiri red chilli gravy with curd — the dinner version with a richer sauce.',[KS],N,['dinner_curry'],true,false,false,null),
  NV('Marchewangan Korma','मार्चेवांगन कोरमा',null,'Mutton in a fiery Kashmiri red chilli and onion gravy — a bold hot wazwan preparation.',[KS],N,['dinner_curry'],'mutton'),
  V('Nadir Palak','नादिर पालक',null,'Lotus stem and spinach cooked with fennel and whole spices in mustard oil — a nutritious Kashmiri winter preparation.',[KS],N,['dinner_curry'],true,false,false,null,['iron-rich']),
  NV('Kashmiri Lamb Kabab','कश्मीरी लैम्ब कबाब',null,'Flat lamb kebabs grilled over charcoal with Kashmiri spice blend and served with girda.',[KS],N,['dinner_curry'],'mutton'),
  V('Veth Chaman','वेथ चमन',null,'Paneer in a turmeric and milk gravy without onion — a simpler everyday Pandit chaman.',[KS],N,['dinner_curry'],true,false,false,null),
  NV('Kashmiri Fish Curry','कश्मीरी माछ',null,'River trout cooked in a saffron and fennel gravy — the Kashmiri freshwater fish preparation.',[KS],N,['dinner_curry'],'fish'),
  V('Palak Nadir','पालक नादिर',null,'Spinach and lotus stem cooked dry with mustard oil — a mineral-rich Kashmiri dinner vegetable.',[KS],N,['dinner_curry'],true,false,false,null,['iron-rich']),
  NV('Kokur Yakhni','कोकुर यखनी',null,'Chicken in a yoghurt broth with fennel seeds — the chicken version of the Kashmiri white curry.',[KS],N,['dinner_curry'],'chicken'),
  V('Gobi Yakhni','गोभी यखनी',null,'Cauliflower in a yoghurt and fennel broth — Kashmiri Pandit cauliflower preparation.',[KS],N,['dinner_curry'],true,false,false,null),
  V('Tamatar Chaman','टमाटर चमन',null,'Paneer cooked with tomato and fennel — a slightly tangier version of Kashmiri chaman.',[KS],N,['dinner_curry'],true,false,false,null),

  // veg_side (8)
  V('Monje Achaar','मोंजे अचार',null,'Lotus stem pickle in mustard oil with fennel and dry red chillies — a sharp Kashmiri condiment.',[KS],N,['veg_side'],true,false,false,null),
  V('Kashmiri Chutney Wangan','वांगन चटनी',null,'Roasted aubergine chutney with garlic and Kashmiri chillies — a dark smoky condiment.',[KS],N,['veg_side'],false,false,false,null),
  V('Sheermal Kashmiri','शीरमाल कश्मीरी',null,'Sweet saffron bread from Kashmiri tandoor — soft and mildly sweet, eaten with tea.',[KS],N,['bread'],true,false,false,null),
  V('Baqerkhani','बाकरखानी',null,'Layered flaky semi-sweet biscuit bread baked in a clay oven — served with noon chai in Kashmiri homes.',[KS],N,['bread'],true,false,false,null),
  V('Kashmiri Pulao','कश्मीरी पुलाव',null,'Saffron-scented basmati cooked with dry fruits, apple and whole spices — fragrant and mildly sweet.',[KS],N,['rice'],true,false,false,null),
  V('Moong Dal Kashmiri','मूंग दाल कश्मीरी',null,'Yellow lentils cooked without onion in a fennel and asafoetida tadka — Kashmiri Pandit everyday dal.',[KS],N,['rice'],true,false,false,null,['protein','light']),
  V('Wazwan Rice','वज़वान चावल',null,'Plain steamed basmati cooked with whole spices and served as the base for wazwan spreads.',[KS],N,['rice'],true,false,false,null),
  V('Kahwa Dessert Rice','काहवा चावल',null,'Rice pudding flavoured with Kashmiri kehwa spices — saffron, cardamom and cinnamon.',[KS],N,['rice'],true,false,false,null),

  // bread (remaining)
  V('Tchot','छोट',null,'Small round bread baked in a Kashmiri clay oven — the everyday local bread of the Kashmir valley.',[KS],N,['bread'],true,false,false,null),
  V('Kashmiri Roti','कश्मीरी रोटी',null,'Thick whole wheat roti cooked in a tawa with ghee and a touch of fennel seeds.',[KS],N,['bread'],true,false,false,null),
  V('Kashmiri Puri','कश्मीरी पूरी',null,'Deep-fried bread with fennel seeds and a slight sweetness — served with haak.',[KS],N,['bread'],true,false,false,null),

  // raita (3)
  V('Kashmiri Dahi','कश्मीरी दही',null,'Thick fermented yoghurt set in earthen pots — eaten plain or with a drizzle of honey in Kashmir.',[KS],N,['raita'],true,false,false,null,['probiotic']),
  V('Nadir Raita','नादिर रायता',null,'Thinly sliced lotus stem in yoghurt with roasted cumin and mint — a Kashmiri fresh raita.',[KS],N,['raita'],true,false,false,null),
  V('Zeera Raita Kashmiri','जीरा रायता',null,'Thick yoghurt with roasted cumin and fennel powder — the Kashmiri Pandit style raita.',[KS],N,['raita'],true,false,false,null),

  // ══════════════════════════════════════════════════════════════════════════════
  // HIMACHALI / PAHADI — 55 dishes
  // 10 breakfast | 12 lunch_curry | 12 dinner_curry | 8 veg_side | 5 rice | 5 bread | 3 raita
  // ══════════════════════════════════════════════════════════════════════════════

  // breakfast (10)
  V('Siddu','सिद्दू',null,'Steamed wheat bread stuffed with poppy seeds and walnut paste — the most beloved Himachali breakfast bread.',[HP],N,['breakfast'],true,false,false,null,['protein']),
  V('Babru','बाब्रू',null,'Deep-fried bread filled with soaked black urad dal and served with tamarind chutney — Himachali puri variant.',[HP],N,['breakfast'],false,false,false,null,['protein']),
  V('Patande','पटांडे',null,'Thick wheat flour pancakes sweetened with jaggery and ghee — the Himachali breakfast pancake.',[HP],N,['breakfast'],true,false,false,null),
  V('Aktori','अक्टोरी',null,'Buckwheat pancake mixed with onion and fresh herbs — a Spiti and Kinnaur valley breakfast.',[HP],N,['breakfast'],true,false,false,null,['fibre','gluten-free']),
  V('Chha Gosht Breakfast','छा गोश्त',null,'Slow-cooked spiced mutton in curd gravy eaten with Himachali bread in the morning — a hearty cold-weather meal.',[HP],N,['breakfast'],false,false,false,null),
  V('Himachali Madra','मद्रा',null,'Chickpeas or kidney beans slow-cooked in yoghurt gravy with whole spices — the celebratory Himachali preparation.',[HP],N,['breakfast'],false,false,false,null,['protein']),
  V('Chutney Pahari','चटनी पहाड़ी',null,'Fresh coriander, green chilli and walnut chutney — a pungent Himachali condiment eaten with every meal.',[HP],N,['breakfast'],true,false,false,null),
  V('Gur ki Roti','गुड़ की रोटी',null,'Flatbread sweetened with jaggery and cooked in ghee — a simple Himachali hill breakfast.',[HP],N,['breakfast'],true,false,false,null),
  V('Til Chutney Pahadi','तिल चटनी',null,'Roasted sesame and garlic chutney with dried red chillies — the nutty Himachali condiment.',[HP],N,['breakfast'],false,false,false,null),
  V('Buransh Sharbat','बुराँश शरबत',null,'Rhododendron flower juice extract mixed with water — a Himachali spring seasonal drink.',[HP],N,['breakfast'],true,false,false,null),

  // lunch_curry (12)
  NV('Chha Gosht','छा गोश्त',null,'Mutton slow-cooked in a yoghurt and gram flour gravy with whole spices — the signature Himachali meat preparation.',[HP],N,['lunch_curry'],'mutton'),
  V('Madra Himachali','मद्रा हिमाचली',null,'Chickpeas cooked in thick spiced curd gravy with ghee — one of the seven dishes of Himachali dham.',[HP],N,['lunch_curry'],false,false,false,null,['protein']),
  NV('Trout Himachali','ट्राउट हिमाचली',null,'Rainbow trout from Himachali rivers cooked with local herbs, ginger, garlic and minimal spices.',[HP],N,['lunch_curry'],'fish'),
  V('Rajma Pahadi','राजमा पहाड़ी',null,'Small red kidney beans from the hills slow-cooked in a simple onion-tomato gravy with local spices.',[HP],N,['lunch_curry'],false,false,false,null,['protein','fibre']),
  NV('Himachali Chicken Curry','हिमाचली चिकन',null,'Hill-style chicken curry with mountain herbs, dried red chillies and a thick onion paste.',[HP],N,['lunch_curry'],'chicken'),
  V('Palda','पलड़ा',null,'Potato and curd based dish cooked with ghee and whole spices — a dham specialty.',[HP],N,['lunch_curry'],false,false,false,null),
  V('Sepu Vadi','सेपू बड़ी',null,'Sun-dried urad dal dumplings cooked with spinach in a light spiced gravy — a Kangra speciality.',[HP],N,['lunch_curry'],false,false,false,null,['protein','iron-rich']),
  NV('Lamb Khatta','खट्टा गोश्त',null,'Mutton cooked in a sour dried mango and yoghurt gravy — the characteristic tangy Himachali meat curry.',[HP],N,['lunch_curry'],'mutton'),
  V('Chana Madra','चना मद्रा',null,'Chickpeas in a slow-cooked ghee and curd gravy — the most common variety of Himachali madra.',[HP],N,['lunch_curry'],false,false,false,null,['protein']),
  V('Aloo Palda','आलू पलड़ा',null,'Potato and yoghurt curry cooked with whole spices in ghee — a Himachali vegetarian staple.',[HP],N,['lunch_curry'],false,false,false,null),
  V('Guchhi Curry','गुच्छी करी',null,'Dried morel mushrooms cooked in a cream and spiced onion gravy — a Himachali forest delicacy.',[HP],N,['lunch_curry'],false,false,false,null),
  V('Bhey Masala','भेय मसाला',null,'Lotus stem cooked with potatoes and onion in a dry Himachali masala.',[HP],N,['lunch_curry'],false,false,false,null),

  // dinner_curry (12)
  NV('Himachali Mutton Biryani','हिमाचली बिरयानी',null,'Basmati cooked with hill spices and tender mutton in the Himachali dum style.',[HP],N,['dinner_curry'],'mutton'),
  V('Saag Himachali','हिमाचली साग',null,'Leafy mustard greens cooked with ginger, garlic and a generous dollop of makhan — the Himachali winter green.',[HP],N,['dinner_curry'],false,false,false,null,['iron-rich','fibre']),
  NV('Khatta Murgh','खट्टा मुर्ग',null,'Chicken in a sour dried mango gravy — the chicken version of the signature Himachali khatta.',[HP],N,['dinner_curry'],'chicken'),
  V('Kidney Bean Dham','दाल धाम',null,'Red kidney beans cooked until soft in a light aromatic gravy served as part of the Himachali ritual feast.',[HP],N,['dinner_curry'],false,false,false,null,['protein','fibre']),
  NV('Kullu Trout Fry','कुल्लू ट्राउट',null,'Fresh Kullu valley trout pan-fried with lemon, green chilli and local herbs — simple and fresh.',[HP],N,['dinner_curry'],'fish'),
  V('Til ki Sabzi','तिल की सब्जी',null,'Sesame seed curry with vegetables — a nutty and rich Himachali preparation eaten in cold months.',[HP],N,['dinner_curry'],true,false,false,null),
  V('Makki Palak','मक्की पालक',null,'Corn and spinach cooked together with ghee and spices — a Himachali winter combination.',[HP],N,['dinner_curry'],false,false,false,null,['iron-rich','fibre']),
  NV('Dham Mutton','धाम गोश्त',null,'Mutton cooked in yoghurt and ghee as part of the Himachali dham spread — slow and rich.',[HP],N,['dinner_curry'],'mutton'),
  V('Aloo Methi Pahadi','आलू मेथी पहाड़ी',null,'Potatoes and fresh fenugreek cooked in ghee with hill spices.',[HP],N,['dinner_curry'],false,false,false,null,['iron-rich']),
  V('Urad Pakori','उड़द पकोरी',null,'Urad dal fritters cooked in a light yoghurt-based curry — a Himachali pakoda curry.',[HP],N,['dinner_curry'],false,false,false,null,['protein']),
  V('Babroo Sabzi','बाब्रू सब्जी',null,'Stuffed bread served alongside a simple aloo or rajma sabzi — a complete Himachali dinner.',[HP],N,['dinner_curry'],false,false,false,null),
  V('Chiri Mitthi','चिड़ी मिट्ठी',null,'Sparrow pea cooked with onion and dried red chilli — a rare Kinnaur valley preparation.',[HP],N,['dinner_curry'],true,false,false,null,['protein']),

  // veg_side (8)
  V('Himachali Chutney Laal','हिमाचली लाल चटनी',null,'Dried red chilli and garlic chutney ground with mustard oil — fiery table condiment of the hills.',[HP],N,['veg_side'],false,false,false,null),
  V('Kachri','कचरी',null,'Sun-dried vegetables mixed with spices and sesame — stored and used through Himachali winters.',[HP],N,['veg_side'],true,false,false,null),
  V('Til Ladoo','तिल लड्डू',null,'Roasted sesame and jaggery balls — the Himachali winter sweet energy ball.',[HP],N,['veg_side'],true,false,false,null),
  V('Himachali Raita','हिमाचली रायता',null,'Thick yoghurt with raw onion, tomato, roasted cumin and hill herbs — the Pahadi dahi.',[HP],N,['raita'],true,false,false,null,['probiotic']),
  V('Walnut Chutney Pahadi','अखरोट चटनी',null,'Fresh walnuts ground with green chilli, garlic and coriander — a nutty Himachali specialty condiment.',[HP],N,['veg_side'],true,false,false,null),
  V('Lingri Achar','लिंगड़ी अचार',null,'Wild fern pickle in mustard oil with spices — a seasonal Himachali condiment unique to the hills.',[HP],N,['veg_side'],true,false,false,null),
  V('Pahadi Makhan','पहाड़ी मक्खन',null,'White hill butter made from churned curd — eaten with siddu, roti or spread on bread.',[HP],N,['veg_side'],true,false,false,null),
  V('Chukandar ki Sabzi','चुकंदर की सब्जी',null,'Beetroot cooked with onion and spices — a colourful nutritious Himachali side.',[HP],N,['veg_side'],false,false,false,null,['iron-rich']),

  // rice (5)
  V('Pahadi Khichdi','पहाड़ी खिचड़ी',null,'Rice and dal cooked with ghee and hill spices — the Himachali comfort khichdi.',[HP],N,['rice'],true,false,false,null,['protein']),
  V('Makki ka Bhaat','मक्की का भात',null,'Coarse corn meal cooked like rice with salt and ghee — Himachali corn porridge.',[HP],N,['rice'],true,false,false,null,['fibre']),
  V('Himachali Pulao','हिमाचली पुलाव',null,'Basmati with local herbs, cardamom and ghee — simple aromatic hill pulao.',[HP],N,['rice'],true,false,false,null),
  V('Rajma Chawal Pahadi','राजमा चावल',null,'Himachali small red beans with plain rice and ghee — the hill comfort meal.',[HP],N,['rice'],false,false,false,null,['protein']),
  V('Til Rice','तिल चावल',null,'Rice cooked with sesame seeds and ghee — a nutty Himachali preparation.',[HP],N,['rice'],true,false,false,null),

  // bread (5)
  V('Siddu Steamed','सिद्दू',null,'Steamed wheat bread with poppy seed and nut stuffing — eaten for lunch or dinner too.',[HP],N,['bread'],true,false,false,null),
  V('Parantha Pahadi','पहाड़ी परांठा',null,'Thick whole wheat paratha cooked in ghee with carom seeds and served with makhan.',[HP],N,['bread'],true,false,false,null),
  V('Makki Tikkar','मक्की टिक्कर',null,'Thick corn flour flatbread cooked on stone — the traditional Kinnaur daily bread.',[HP],N,['bread'],true,false,false,null,['fibre']),
  V('Kachori Pahadi','कचोरी पहाड़ी',null,'Puri stuffed with spiced urad dal filling — a Himachali festive bread.',[HP],N,['bread'],false,false,false,null),
  V('Mande','मांडे',null,'Large thin wheat bread cooked in ghee on a tawa — the Kangra flat festival bread.',[HP],N,['bread'],true,false,false,null),

  // raita (3)
  V('Pahadi Lassi','पहाड़ी लस्सी',null,'Thick hand-churned yoghurt diluted with cold water and served with fresh mint — Himachali summer drink.',[HP],N,['raita'],true,false,false,null,['probiotic']),
  V('Mooli Raita Pahadi','मूली रायता',null,'Grated radish in yoghurt with roasted cumin and mustard — sharp and cooling.',[HP],N,['raita'],true,false,false,null,['probiotic']),
];

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log(`\nSeeding ${dishes.length} North Indian Expansion dishes (Rajasthani + Awadhi/UP + Kashmiri + Himachali)...\n`);

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
  const rj = await client.from('dishes').select('name', { count: 'exact', head: true }).contains('cuisine', ['Rajasthani']);
  const aw = await client.from('dishes').select('name', { count: 'exact', head: true }).contains('cuisine', ['Awadhi']);
  const ks = await client.from('dishes').select('name', { count: 'exact', head: true }).contains('cuisine', ['Kashmiri']);
  const hp = await client.from('dishes').select('name', { count: 'exact', head: true }).contains('cuisine', ['Himachali']);
  console.log(`\nDB counts — Rajasthani: ${rj.count} | Awadhi: ${aw.count} | Kashmiri: ${ks.count} | Himachali: ${hp.count}`);
}

seed().catch(console.error);
