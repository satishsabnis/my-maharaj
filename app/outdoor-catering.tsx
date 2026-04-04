import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Switch, ActivityIndicator, Image } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import ScreenWrapper from '../components/ScreenWrapper';
import { loadOrDetectLocation } from '../lib/location';
import { navy, gold, white, midGray, lightGray, darkGray, errorRed } from '../theme/colors';

const FOOD_TYPES = ['Mixed','Veg only','Jain','Halal'];
const SETUP_STYLES = ['Finger Food','Buffet','Packed Boxes','BBQ / Grill','Thali Style'];
const WEATHER_OPTS = ['Hot & Sunny','Evening / Cooler','Indoor Backup'];

function recogniseOccasion(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('birthday') || t.includes('bday')) return 'Birthday celebration';
  if (t.includes('anniversary')) return 'Anniversary';
  if (t.includes('diwali') || t.includes('holi') || t.includes('eid') || t.includes('navratri') || t.includes('baisakhi') || t.includes('ganesh')) return 'Festival celebration';
  if (t.includes('graduation')) return 'Graduation celebration';
  if (t.includes('wedding') || t.includes('shaadi') || t.includes('engagement')) return 'Wedding function';
  if (t.includes('office') || t.includes('corporate') || t.includes('team') || t.includes('company')) return 'Corporate event';
  if (t.includes('baby shower') || t.includes('baby')) return 'Baby shower';
  if (t.includes('farewell')) return 'Farewell party';
  if (t.includes('picnic') || t.includes('outdoor')) return 'Outdoor gathering';
  return 'Special gathering';
}

async function callClaude(prompt: string): Promise<string> {
  const base = 'https://my-maharaj.vercel.app';
  const res = await fetch(`${base}/api/claude`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 4096, messages: [{ role: 'user', content: prompt }] }),
  });
  const data = await res.json();
  if (data?.error) throw new Error(data.error.message ?? data.error);
  return (data?.content?.[0]?.text ?? '').replace(/```json|```/g, '').trim();
}

interface OutdoorMenu {
  starters: { name: string; description: string }[];
  main_course: { name: string; description: string }[];
  desserts: { name: string; description: string }[];
  beverages: { name: string; description: string }[];
  packing_tips: string[];
  shopping_list: string[];
}

export default function OutdoorCateringScreen() {
  const [step,      setStep]      = useState<'form'|'result'>('form');
  const [occasionText, setOccasionText] = useState('');
  const [foodType,  setFoodType]  = useState('Mixed');
  const [guestCountText, setGuestCountText] = useState('15');
  const [budget,    setBudget]    = useState('25');
  const [setup,     setSetup]     = useState('Finger Food');
  const [weather,   setWeather]   = useState('Hot & Sunny');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [menu,      setMenu]      = useState<OutdoorMenu | null>(null);
  const [loc,       setLoc]       = useState({ city: 'Dubai', country: 'UAE', stores: 'Carrefour/Spinneys/Lulu' });
  const [beverages, setBeverages] = useState({
    mineralWater: true, nimbuPani: true, coldCoffee: false,
    coconutWater: false, freshJuice: false, masalaChai: false, softDrinks: false, alcohol: false,
  });

  useEffect(() => { loadOrDetectLocation().then(setLoc); }, []);

  useFocusEffect(useCallback(() => {
    setStep('form'); setMenu(null); setOccasionText(''); setFoodType('Mixed');
    setGuestCountText('15'); setBudget('25'); setSetup('Finger Food');
    setWeather('Hot & Sunny'); setError(''); setLoading(false);
    setBeverages({ mineralWater:true, nimbuPani:true, coldCoffee:false, coconutWater:false, freshJuice:false, masalaChai:false, softDrinks:false, alcohol:false });
  }, []));

  const bevNames: Record<string,string> = { mineralWater:'Mineral water', nimbuPani:'Nimbu pani', coldCoffee:'Cold coffee', coconutWater:'Coconut water', freshJuice:'Fresh juice', masalaChai:'Masala chai', softDrinks:'Soft drinks' };
  const selectedBevs = Object.entries(beverages).filter(([k,v]) => v && k !== 'alcohol').map(([k]) => bevNames[k]).filter(Boolean);

  async function generateMenu() {
    setMenu(null); setError('');
    const g = parseInt(guestCountText, 10);
    const b = parseInt(budget, 10);
    if (!g || g < 1) { setError('Enter a valid number of guests.'); return; }
    if (!b || b < 1) { setError('Enter a valid budget per head.'); return; }
    if (!occasionText.trim()) { setError('Please describe the event.'); return; }
    setLoading(true);
    try {
      const text = await callClaude(`You are Maharaj, expert Indian chef specialising in outdoor catering.
Generate an outdoor catering menu for:
- Event: ${occasionText} (${recogniseOccasion(occasionText)})
- Guests: ${g}, Food: ${foodType}, Setup: ${setup}, Weather: ${weather}
- Budget: AED ${b} per head (Total: AED ${g * b})
- ${loc.city}, ${loc.country} — ingredients from ${loc.stores}
- Beverages to include: ${selectedBevs.join(', ') || 'Water only'}
${beverages.alcohol ? '- Include beer, wine and cocktail pairing suggestions appropriate for the occasion.' : '- No alcohol.'}
Focus on food that travels well, stays fresh outdoors and suits the weather.
Respond ONLY with this exact JSON structure - no other text, no markdown:
{"starters":[{"name":"string","description":"string"}],"main_course":[{"name":"string","description":"string"}],"desserts":[{"name":"string","description":"string"}],"beverages":[{"name":"string","description":"string"}],"packing_tips":["string"],"shopping_list":["string"]}
Include 3-5 items per section.`);
      let parsed: OutdoorMenu;
      try { const match = text.match(/\{[\s\S]*\}/); parsed = JSON.parse(match ? match[0] : text) as OutdoorMenu; }
      catch { throw new Error('Failed to parse menu response'); }
      if (!parsed.beverages || parsed.beverages.length === 0) {
        parsed.beverages = [{ name:'Mineral Water', description:'Still and sparkling' },{ name:'Nimbu Pani', description:'Chilled lemon water' }];
      }
      setMenu(parsed); setStep('result');
    } catch (err) { console.error('[OutdoorCatering]', err); setError('Failed to generate. Please try again.'); }
    finally { setLoading(false); }
  }

  function Section({ title, items }: { title: string; items?: { name: string; description: string }[] }) {
    if (!items?.length) return null;
    return (<View style={s.section}><Text style={s.sectionTitle}>{title}</Text>{items.map((item,i) => (<View key={i} style={[s.item, i===items.length-1 && {borderBottomWidth:0}]}><Text style={s.itemName}>{item.name}</Text><Text style={s.itemDesc}>{item.description}</Text></View>))}</View>);
  }

  function BevRow({ label, k }: { label: string; k: string }) {
    return (<View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:6}}>
      <Text style={{fontSize:12,color:navy}}>{label}</Text>
      <Switch value={(beverages as any)[k]} onValueChange={v => setBeverages(prev => ({...prev,[k]:v}))} trackColor={{false:'#D1D5DB',true:gold}} thumbColor={white} />
    </View>);
  }

  return (
    <ScreenWrapper title="Outdoor Catering" onBack={() => step === 'result' ? setStep('form') : router.back()}>
      {step === 'form' ? (
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.container}>
            <Text style={s.pageTitle}>Plan Your Outdoor Event</Text>
            <Text style={s.pageSub}>Maharaj suggests food that travels well and stays fresh outdoors.</Text>

            {/* Occasion */}
            <Text style={s.label}>EVENT</Text>
            <TextInput style={s.input} value={occasionText} onChangeText={setOccasionText} placeholder="Describe the outdoor event..." placeholderTextColor={midGray} />
            {occasionText.length > 3 && (
              <View style={{backgroundColor:'#E8F4F8',borderRadius:8,padding:8,marginTop:6,marginBottom:4}}>
                <Text style={{fontSize:9,color:'#0C447C'}}>Recognised as: {recogniseOccasion(occasionText)}</Text>
              </View>
            )}

            {/* Guests + Budget */}
            <View style={s.row}>
              <View style={{flex:1}}>
                <Text style={s.label}>GUESTS</Text>
                <TextInput style={[s.input,{width:120}]} value={guestCountText} onChangeText={setGuestCountText} keyboardType="numeric" placeholder="Number of guests" placeholderTextColor={midGray} />
              </View>
              <View style={{flex:1}}>
                <Text style={s.label}>BUDGET/HEAD (AED)</Text>
                <TextInput style={s.input} value={budget} onChangeText={setBudget} keyboardType="numeric" placeholder="25" placeholderTextColor={midGray} />
              </View>
            </View>
            {guestCountText && budget && parseInt(guestCountText) > 0 && parseInt(budget) > 0 && (
              <Text style={s.totalBudget}>Total budget: AED {parseInt(guestCountText) * parseInt(budget)}</Text>
            )}

            {/* Food type */}
            <Text style={s.label}>FOOD TYPE</Text>
            <View style={s.chips}>
              {FOOD_TYPES.map(ft => {
                const active = foodType === ft;
                const isGold = ft === 'Mixed' && active;
                return (<TouchableOpacity key={ft} style={[s.chip, active && (isGold ? {backgroundColor:gold,borderColor:gold} : s.chipOn)]} onPress={() => setFoodType(ft)}>
                  <Text style={[s.chipTxt, active && (isGold ? {color:'#1B2A0C'} : s.chipTxtOn)]}>{ft}</Text>
                </TouchableOpacity>);
              })}
            </View>

            {/* Setup + Weather */}
            <Text style={s.label}>SERVING SETUP</Text>
            <View style={s.chips}>
              {SETUP_STYLES.map(ss => (<TouchableOpacity key={ss} style={[s.chip, setup===ss && s.chipOn]} onPress={() => setSetup(ss)}><Text style={[s.chipTxt, setup===ss && s.chipTxtOn]}>{ss}</Text></TouchableOpacity>))}
            </View>
            <Text style={s.label}>WEATHER</Text>
            <View style={s.chips}>
              {WEATHER_OPTS.map(w => (<TouchableOpacity key={w} style={[s.chip, weather===w && s.chipOn]} onPress={() => setWeather(w)}><Text style={[s.chipTxt, weather===w && s.chipTxtOn]}>{w}</Text></TouchableOpacity>))}
            </View>

            {/* Beverages */}
            <Text style={s.label}>BEVERAGES</Text>
            <View style={{backgroundColor:'rgba(255,255,255,0.92)',borderRadius:10,borderWidth:0.5,borderColor:'rgba(27,58,92,0.15)',padding:10,marginBottom:12}}>
              <BevRow label="Mineral water" k="mineralWater" />
              <BevRow label="Nimbu pani" k="nimbuPani" />
              <BevRow label="Cold coffee" k="coldCoffee" />
              <BevRow label="Coconut water" k="coconutWater" />
              <BevRow label="Fresh juice" k="freshJuice" />
              <BevRow label="Masala chai" k="masalaChai" />
              <BevRow label="Soft drinks" k="softDrinks" />
              <View style={{height:0.5,backgroundColor:'rgba(27,58,92,0.2)',marginVertical:6}} />
              <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:4}}>
                <Text style={{fontSize:11,color:'#6B7280'}}>Include alcohol?</Text>
                <Switch value={beverages.alcohol} onValueChange={v => setBeverages(prev => ({...prev,alcohol:v}))} trackColor={{false:'#D1D5DB',true:gold}} thumbColor={white} />
              </View>
              {!beverages.alcohol && <Text style={{fontSize:8,color:'#9CA3AF',marginTop:3}}>Beer, wine, cocktail suggestions added to menu when on</Text>}
            </View>

            {error ? <Text style={s.error}>{error}</Text> : null}
            <View style={{flexDirection:'row',gap:10,marginTop:8}}>
              <TouchableOpacity style={{flex:1,paddingVertical:14,borderRadius:12,borderWidth:1.5,borderColor:navy,alignItems:'center'}} onPress={() => router.back()}>
                <Text style={{fontSize:14,fontWeight:'600',color:navy}}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[{flex:2,paddingVertical:14,borderRadius:12,backgroundColor:gold,alignItems:'center'}, loading && {opacity:0.6}]} onPress={generateMenu} disabled={loading}>
                {loading ? <ActivityIndicator color={'#1B2A0C'} /> : <Text style={{fontSize:14,fontWeight:'700',color:'#1B2A0C'}}>Generate</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={s.scroll}>
          <View style={s.container}>
            <View style={s.resultHeader}>
              <Text style={s.resultTitle}>{recogniseOccasion(occasionText)} Menu</Text>
              <Text style={s.resultMeta}>{guestCountText} guests · {foodType} · {setup} · AED {budget}/head</Text>
              <Text style={s.resultMeta}>Weather: {weather}</Text>
            </View>
            <View style={s.actionRow}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => router.push('/home' as never)}><Text style={s.cancelBtnTxt}>Home</Text></TouchableOpacity>
              <TouchableOpacity style={s.regenBtn} onPress={generateMenu} disabled={loading}>
                {loading ? <ActivityIndicator color={white} size="small" /> : <Text style={s.regenBtnTxt}>Regenerate</Text>}
              </TouchableOpacity>
            </View>
            {menu && <>
              <Section title="Starters" items={menu.starters} />
              <Section title="Main Course" items={menu.main_course} />
              <Section title="Desserts" items={menu.desserts} />
              <Section title="Beverages" items={menu.beverages} />
              {menu.packing_tips?.length > 0 && (<View style={s.section}><Text style={s.sectionTitle}>Packing & Serving Tips</Text>{menu.packing_tips.map((t,i) => <Text key={i} style={s.tipTxt}>{'\u2022'} {t}</Text>)}</View>)}
              {menu.shopping_list?.length > 0 && (<View style={s.section}><Text style={s.sectionTitle}>Shopping List</Text><View style={s.shopGrid}>{menu.shopping_list.map((item,i) => (<View key={i} style={s.shopChip}><Text style={s.shopChipTxt}>{item}</Text></View>))}</View></View>)}
            </>}
            {/* QR Code */}
            <View style={{alignItems:'center',marginTop:16}}>
              <Image source={{uri:`https://chart.googleapis.com/chart?cht=qr&chs=120x120&chl=${encodeURIComponent('https://my-maharaj.vercel.app')}&choe=UTF-8`}} style={{width:100,height:100}} />
              <Text style={{fontSize:9,color:'#6B7280',marginTop:4,textAlign:'center'}}>Download My Maharaj</Text>
              <Text style={{fontSize:8,color:'#9CA3AF',textAlign:'center'}}>Scan to get the app</Text>
            </View>
            <View style={{height:40}} />
          </View>
        </ScrollView>
      )}
    </ScreenWrapper>
  );
}

const ACCENT = '#1A6B3C';
const s = StyleSheet.create({
  scroll:      { flexGrow: 1 },
  container:   { padding: 20, maxWidth: 640, width: '100%', alignSelf: 'center' },
  pageTitle:   { fontSize: 22, fontWeight: '800', color: navy, marginBottom: 4 },
  pageSub:     { fontSize: 13, color: midGray, marginBottom: 16, lineHeight: 20 },
  row:         { flexDirection: 'row', gap: 12 },
  label:       { fontSize: 11, fontWeight: '700', color: darkGray, marginTop: 14, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 },
  input:       { borderWidth: 1, borderColor: 'rgba(27,58,92,0.25)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, color: '#1B3A5C', backgroundColor: 'rgba(255,255,255,0.9)' },
  totalBudget: { fontSize: 13, color: '#16A34A', fontWeight: '600', marginTop: 6 },
  chips:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:        { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: 'rgba(255,255,255,0.9)' },
  chipOn:      { backgroundColor: ACCENT, borderColor: ACCENT },
  chipTxt:     { fontSize: 13, color: darkGray, fontWeight: '500' },
  chipTxtOn:   { color: white, fontWeight: '600' },
  error:       { color: errorRed, fontSize: 13, textAlign: 'center', marginTop: 14 },
  resultHeader: { backgroundColor: ACCENT, borderRadius: 14, padding: 20, marginBottom: 12 },
  resultTitle: { fontSize: 22, fontWeight: '800', color: white },
  resultMeta:  { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  actionRow:   { flexDirection: 'row', gap: 10, marginBottom: 16 },
  cancelBtn:   { flex: 1, borderWidth: 1.5, borderColor: ACCENT, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  cancelBtnTxt:{ color: ACCENT, fontWeight: '700', fontSize: 14 },
  regenBtn:    { flex: 1, backgroundColor: ACCENT, borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  regenBtnTxt: { color: white, fontWeight: '700', fontSize: 14 },
  section:     { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 14, padding: 16, marginBottom: 12 },
  sectionTitle:{ fontSize: 15, fontWeight: '700', color: navy, marginBottom: 12 },
  item:        { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  itemName:    { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  itemDesc:    { fontSize: 12, color: midGray, marginTop: 2, lineHeight: 18 },
  tipTxt:      { fontSize: 14, color: darkGray, lineHeight: 22, paddingVertical: 3 },
  shopGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  shopChip:    { backgroundColor: lightGray, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  shopChipTxt: { fontSize: 13, color: darkGray },
});
