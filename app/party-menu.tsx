import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Switch, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import ScreenWrapper from '../components/ScreenWrapper';
import { loadOrDetectLocation } from '../lib/location';
import { navy, gold, white, midGray, lightGray, darkGray, errorRed } from '../theme/colors';

const FOOD_TYPES = ['Mixed','Veg only','Jain','Halal'];

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

interface Item { name: string; description: string; }
interface PartyMenu {
  starters: Item[]; main_course: Item[]; desserts: Item[];
  beverages: Item[]; serving_tips: string[]; shopping_list: string[];
}

export default function PartyMenuScreen() {
  const [step,     setStep]     = useState<'form'|'result'>('form');
  const [occasionText, setOccasionText] = useState('');
  const [foodType, setFoodType] = useState('Mixed');
  const [guestCountText, setGuestCountText] = useState('10');
  const [budget,   setBudget]   = useState('500');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [menu,     setMenu]     = useState<PartyMenu | null>(null);
  const [loc,      setLoc]      = useState({ city: 'Dubai', country: 'UAE', stores: 'Carrefour/Spinneys/Lulu' });
  const [beverages, setBeverages] = useState({
    masalaChai: false, limeSoda: false, thandai: false,
    coconutWater: false, coldCoffee: false, mineralWater: true, alcohol: false,
  });

  useEffect(() => { loadOrDetectLocation().then(setLoc); }, []);

  useFocusEffect(useCallback(() => {
    setStep('form'); setMenu(null); setOccasionText(''); setFoodType('Mixed');
    setGuestCountText('10'); setBudget('500'); setError(''); setLoading(false);
    setBeverages({ masalaChai:false, limeSoda:false, thandai:false, coconutWater:false, coldCoffee:false, mineralWater:true, alcohol:false });
  }, []));

  const bevNames: Record<string,string> = { masalaChai:'Masala chai', limeSoda:'Fresh lime soda', thandai:'Thandai / Badam milk', coconutWater:'Coconut water', coldCoffee:'Cold coffee', mineralWater:'Mineral water' };
  const selectedBevs = Object.entries(beverages).filter(([k,v]) => v && k !== 'alcohol').map(([k]) => bevNames[k]).filter(Boolean);

  async function generateMenu() {
    setMenu(null); setError('');
    const g = parseInt(guestCountText, 10);
    const b = parseInt(budget, 10);
    if (!g || g < 1) { setError('Enter a valid number of guests.'); return; }
    if (!b || b < 1) { setError('Enter a valid budget.'); return; }
    if (!occasionText.trim()) { setError('Please describe the occasion.'); return; }
    setLoading(true);
    try {
      const text = await callClaude(`You are Maharaj, expert Indian chef. Generate a party menu:
- Occasion: ${occasionText} (${recogniseOccasion(occasionText)})
- Guests: ${g}, Food: ${foodType}, Total Budget: AED ${b}
- ${loc.city}, ${loc.country} — ingredients from ${loc.stores}
- Beverages to include: ${selectedBevs.join(', ') || 'Water only'}
${beverages.alcohol ? '- Include beer, wine and cocktail pairing suggestions appropriate for the occasion and food type.' : '- No alcohol.'}
Respond ONLY with this exact JSON structure - no other text, no markdown:
{"starters":[{"name":"string","description":"string"}],"main_course":[{"name":"string","description":"string"}],"desserts":[{"name":"string","description":"string"}],"beverages":[{"name":"string","description":"string"}],"serving_tips":["string"],"shopping_list":["string"]}
Include 3-5 items per section.`);
      let parsed: PartyMenu;
      try { const match = text.match(/\{[\s\S]*\}/); parsed = JSON.parse(match ? match[0] : text) as PartyMenu; }
      catch { throw new Error('Failed to parse menu response'); }
      if (!parsed.beverages || parsed.beverages.length === 0) {
        parsed.beverages = [{ name:'Fresh Lime Soda', description:'Chilled with mint' },{ name:'Mineral Water', description:'Still and sparkling' }];
      }
      setMenu(parsed); setStep('result');
    } catch (err) { console.error('[PartyMenu]', err); setError('Failed to generate. Please try again.'); }
    finally { setLoading(false); }
  }

  function Section({ title, items }: { title: string; items?: Item[] }) {
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
    <ScreenWrapper title="Party Menu" onBack={() => step === 'result' ? setStep('form') : router.back()}>
      {step === 'form' ? (
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.container}>
            <Text style={s.pageTitle}>Plan Your Gathering</Text>

            {/* Occasion */}
            <Text style={s.label}>OCCASION</Text>
            <TextInput style={s.input} value={occasionText} onChangeText={setOccasionText} placeholder="Describe the occasion..." placeholderTextColor={midGray} />
            {occasionText.length > 3 && (
              <View style={{backgroundColor:'#E8F4F8',borderRadius:8,padding:8,marginTop:6,marginBottom:4}}>
                <Text style={{fontSize:9,color:'#0C447C'}}>Recognised as: {recogniseOccasion(occasionText)}</Text>
              </View>
            )}

            {/* Guests + Budget */}
            <View style={s.row}>
              <View style={{flex:1}}>
                <Text style={s.label}>GUESTS</Text>
                <TextInput style={[s.input,{width:120}]} value={guestCountText} onChangeText={setGuestCountText} keyboardType="numeric" placeholder="Enter number of guests" placeholderTextColor={midGray} />
              </View>
              <View style={{flex:1}}>
                <Text style={s.label}>TOTAL BUDGET (AED)</Text>
                <TextInput style={s.input} value={budget} onChangeText={setBudget} keyboardType="numeric" placeholder="500" placeholderTextColor={midGray} />
              </View>
            </View>

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

            {/* Beverages */}
            <Text style={s.label}>BEVERAGES</Text>
            <View style={{backgroundColor:'rgba(255,255,255,0.92)',borderRadius:10,borderWidth:0.5,borderColor:'rgba(27,58,92,0.15)',padding:10,marginBottom:12}}>
              <BevRow label="Masala chai" k="masalaChai" />
              <BevRow label="Fresh lime soda" k="limeSoda" />
              <BevRow label="Thandai / Badam milk" k="thandai" />
              <BevRow label="Coconut water" k="coconutWater" />
              <BevRow label="Cold coffee" k="coldCoffee" />
              <BevRow label="Mineral water" k="mineralWater" />
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
              <Text style={s.resultMeta}>{guestCountText} guests · {foodType} · AED {budget} total</Text>
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
              {menu.serving_tips?.length > 0 && (<View style={s.section}><Text style={s.sectionTitle}>Serving Tips</Text>{menu.serving_tips.map((t,i) => <Text key={i} style={s.tipTxt}>{'\u2022'} {t}</Text>)}</View>)}
              {menu.shopping_list?.length > 0 && (<View style={s.section}><Text style={s.sectionTitle}>Shopping List</Text><View style={s.shopGrid}>{menu.shopping_list.map((item,i) => (<View key={i} style={s.shopChip}><Text style={s.shopChipTxt}>{item}</Text></View>))}</View></View>)}
            </>}
            <View style={{height:40}} />
          </View>
        </ScrollView>
      )}
    </ScreenWrapper>
  );
}

const ACCENT = '#8B1A1A';
const s = StyleSheet.create({
  scroll: { flexGrow: 1 },
  container: { padding: 20, maxWidth: 640, width: '100%', alignSelf: 'center' },
  pageTitle: { fontSize: 22, fontWeight: '800', color: navy, marginBottom: 16 },
  row: { flexDirection: 'row', gap: 12 },
  label: { fontSize: 11, fontWeight: '700', color: darkGray, marginTop: 14, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: { borderWidth: 1, borderColor: 'rgba(27,58,92,0.25)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, color: '#1B3A5C', backgroundColor: 'rgba(255,255,255,0.9)' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: 'rgba(255,255,255,0.9)' },
  chipOn: { backgroundColor: ACCENT, borderColor: ACCENT },
  chipTxt: { fontSize: 13, color: darkGray, fontWeight: '500' },
  chipTxtOn: { color: white, fontWeight: '600' },
  error: { color: errorRed, fontSize: 13, textAlign: 'center', marginTop: 14 },
  resultHeader: { backgroundColor: ACCENT, borderRadius: 14, padding: 20, marginBottom: 12 },
  resultTitle: { fontSize: 22, fontWeight: '800', color: white },
  resultMeta: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: ACCENT, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  cancelBtnTxt: { color: ACCENT, fontWeight: '700', fontSize: 14 },
  regenBtn: { flex: 1, backgroundColor: ACCENT, borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  regenBtnTxt: { color: white, fontWeight: '700', fontSize: 14 },
  section: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 14, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: navy, marginBottom: 12 },
  item: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  itemName: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  itemDesc: { fontSize: 12, color: midGray, marginTop: 2, lineHeight: 18 },
  tipTxt: { fontSize: 14, color: darkGray, lineHeight: 22, paddingVertical: 3 },
  shopGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  shopChip: { backgroundColor: lightGray, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  shopChipTxt: { fontSize: 13, color: darkGray },
});
