import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import ScreenWrapper from '../components/ScreenWrapper';
import { loadOrDetectLocation } from '../lib/location';
import { navy, gold, white, midGray, lightGray, darkGray, errorRed } from '../theme/colors';

const OCCASIONS = ['Birthday','Anniversary','Festival','Get-together','Dinner Party','Baby Shower','Wedding','Office Party'];
const FOOD_TYPES = ['Vegetarian','Non-Vegetarian','Mixed'];

async function callClaude(prompt: string): Promise<string> {
  const base = typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? window.location.origin : 'https://my-maharaj.vercel.app';
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
  const [guests,   setGuests]   = useState('10');
  const [occasion, setOccasion] = useState('Birthday');
  const [foodType, setFoodType] = useState('Vegetarian');
  const [budget,   setBudget]   = useState('500');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [includeAlcohol, setIncludeAlcohol] = useState(false);
  const [menu,     setMenu]     = useState<PartyMenu | null>(null);
  const [shoppingList, setShoppingList] = useState<any[]>([]);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [loc,      setLoc]      = useState({ city: 'Dubai', country: 'UAE', stores: 'Carrefour/Spinneys/Lulu' });

  useEffect(() => { loadOrDetectLocation().then(setLoc); }, []);

  useFocusEffect(
    useCallback(() => {
      setStep('form');
      setMenu(null);
      setOccasion('Birthday');
      setGuests('10');
      setFoodType('Vegetarian');
      setBudget('500');
      setError('');
      setLoading(false);
      setIncludeAlcohol(false);
      setShoppingList([]);
      setGeneratingPdf(false);
    }, [])
  );

  async function generateMenu() {
    setMenu(null);
    setError('');
    const g = parseInt(guests, 10);
    const b = parseInt(budget, 10);
    if (!g || g < 1) { setError('Enter a valid number of guests.'); return; }
    if (!b || b < 1) { setError('Enter a valid budget.'); return; }
    setLoading(true);
    try {
      // Call 1: menu without beverages
      const text = await callClaude(`You are Maharaj, expert Indian chef. Generate a party menu:
- Occasion: ${occasion}, Guests: ${g}, Food: ${foodType}, Total Budget: AED ${b}
- ${loc.city}, ${loc.country} — ingredients from ${loc.stores}
Respond ONLY with this exact JSON structure - no other text, no markdown:
{"starters":[{"name":"string","description":"string"}],"main_course":[{"name":"string","description":"string"}],"desserts":[{"name":"string","description":"string"}],"serving_tips":["string"],"shopping_list":["string"]}
Include 3-5 items per section.`);

      let parsed: PartyMenu;
      try {
        const match = text.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(match ? match[0] : text) as PartyMenu;
      } catch(e) {
        throw new Error('Failed to parse menu response');
      }

      // Call 2: separate beverages call
      try {
        const alcNote = includeAlcohol
          ? 'Include a mix of alcoholic options (Beer, Wine, Cocktails) and non-alcoholic options (Mocktails, Juices, Lassi). Label each clearly.'
          : 'Non-alcoholic beverages only — no alcohol.';
        const bevPrompt = `Generate exactly 4 beverages suitable for a ${occasion} party with ${g} guests, ${foodType} food in ${loc.city}. ${alcNote} Return ONLY this JSON array: [{"name":"...","description":"..."},{"name":"...","description":"..."},{"name":"...","description":"..."},{"name":"...","description":"..."}]`;
        const bevRaw = await callClaude(bevPrompt);
        const bevMatch = bevRaw.match(/\[[\s\S]*\]/);
        parsed.beverages = bevMatch ? JSON.parse(bevMatch[0]) : [];
      } catch { parsed.beverages = []; }

      // Fallback if second call also failed
      if (!parsed.beverages || parsed.beverages.length === 0) {
        parsed.beverages = [
          { name: 'Fresh Lime Soda', description: 'Chilled with mint' },
          { name: 'Mango Lassi', description: 'Sweet yogurt drink' },
          { name: 'Mineral Water', description: 'Still and sparkling' },
          { name: 'Masala Chai', description: 'Spiced Indian tea' },
        ];
      }

      setMenu(parsed);
      setStep('result');

      // Generate categorised shopping list
      try {
        const shopPrompt = `Based on this party menu for ${g} guests, generate a categorised shopping list. Menu: ${JSON.stringify(parsed)}
Return ONLY this JSON array — no other text:
[{"title":"Dairy & Protein","items":["Paneer 500g","Yogurt 500g"]},{"title":"Grains & Staples","items":["Basmati rice 1kg"]},{"title":"Vegetables & Produce","items":["Tomatoes 1kg"]},{"title":"Spices & Condiments","items":["Garam masala 50g"]},{"title":"Beverages","items":["Mineral water 12pk","Soft drinks 6pk"]}]
Scale quantities for ${g} guests. Always include Mineral water and Soft drinks in Beverages.`;
        const shopRaw = await callClaude(shopPrompt);
        const shopMatch = shopRaw.match(/\[[\s\S]*\]/);
        if (shopMatch) setShoppingList(JSON.parse(shopMatch[0]));
      } catch { setShoppingList([{title:'Groceries',items:['Please check individual items from the menu above']}]); }
    } catch (err) { console.error('[PartyMenu] generateMenu error:', err); setError('Failed to generate. Please try again.'); }
    finally { setLoading(false); }
  }

  function Section({ title, items }: { title: string; items?: Item[] }) {
    if (!items?.length) return null;
    return (
      <View style={s.section}>
        <Text style={s.sectionTitle}>{title}</Text>
        {items.map((item, i) => (
          <View key={i} style={[s.item, i === items.length - 1 && { borderBottomWidth: 0 }]}>
            <Text style={s.itemName}>{item.name}</Text>
            <Text style={s.itemDesc}>{item.description}</Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <ScreenWrapper title="Party Menu" onBack={() => step === 'result' ? setStep('form') : router.back()}>
      {step === 'form' ? (
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.container}>
            <Text style={s.pageTitle}>Plan Your Gathering</Text>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>GUESTS</Text>
                <TextInput style={s.input} value={guests} onChangeText={setGuests} keyboardType="numeric" placeholder="20" placeholderTextColor={midGray} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>TOTAL BUDGET (AED)</Text>
                <TextInput style={s.input} value={budget} onChangeText={setBudget} keyboardType="numeric" placeholder="500" placeholderTextColor={midGray} />
              </View>
            </View>
            <Text style={s.label}>OCCASION</Text>
            <View style={s.chips}>
              {OCCASIONS.map(o => (<TouchableOpacity key={o} style={[s.chip, occasion===o && s.chipOn]} onPress={()=>setOccasion(o)}><Text style={[s.chipTxt, occasion===o && s.chipTxtOn]}>{o}</Text></TouchableOpacity>))}
            </View>
            <Text style={s.label}>FOOD TYPE</Text>
            <View style={s.chips}>
              {FOOD_TYPES.map(ft => (<TouchableOpacity key={ft} style={[s.chip, foodType===ft && s.chipOn]} onPress={()=>setFoodType(ft)}><Text style={[s.chipTxt, foodType===ft && s.chipTxtOn]}>{ft}</Text></TouchableOpacity>))}
            </View>
            <Text style={s.label}>BEVERAGES</Text>
            <TouchableOpacity style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:includeAlcohol?navy:'rgba(255,255,255,0.9)',borderRadius:12,padding:14,borderWidth:1.5,borderColor:includeAlcohol?navy:'#D1D5DB'}} onPress={()=>setIncludeAlcohol(v=>!v)} activeOpacity={0.8}>
              <Text style={{fontSize:14,fontWeight:'600',color:includeAlcohol?white:darkGray}}>Include alcoholic beverages?</Text>
              <View style={{width:40,height:22,borderRadius:11,backgroundColor:includeAlcohol?gold:'#D1D5DB',padding:2}}>
                <View style={{width:18,height:18,borderRadius:9,backgroundColor:white,transform:[{translateX:includeAlcohol?18:0}]}} />
              </View>
            </TouchableOpacity>
            {error ? <Text style={s.error}>{error}</Text> : null}
            <TouchableOpacity style={[s.genBtn, loading && { opacity: 0.6 }]} onPress={generateMenu} disabled={loading}>
              {loading ? <ActivityIndicator color={white} /> : <Text style={s.genBtnTxt}>Generate Party Menu</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelLink} onPress={() => router.push('/home' as never)}>
              <Text style={s.cancelLinkTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={s.scroll}>
          <View style={s.container}>
            <View style={s.resultHeader}>
              <Text style={s.resultTitle}>{occasion} Menu</Text>
              <Text style={s.resultMeta}>{guests} guests · {foodType} · AED {budget} total{includeAlcohol ? ' · Alcoholic available' : ''}</Text>
            </View>
            <View style={s.actionRow}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => router.push('/home' as never)}>
                <Text style={s.cancelBtnTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modifyBtn} onPress={() => { setStep('form'); setMenu(null); setOccasion('Birthday'); setGuests('10'); setFoodType('Vegetarian'); setBudget('500'); setIncludeAlcohol(false); setError(''); }}>
                <Text style={s.modifyBtnTxt}>Modify Settings</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.regenBtn} onPress={generateMenu} disabled={loading}>
                {loading ? <ActivityIndicator color={white} size="small" /> : <Text style={s.regenBtnTxt}>Regenerate</Text>}
              </TouchableOpacity>
            </View>
            {menu && <TouchableOpacity style={s.confirmBtn} disabled={generatingPdf} onPress={async () => {
              setGeneratingPdf(true);
              try {
                const pdfBase = typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? window.location.origin : 'https://my-maharaj.vercel.app';
                const res = await fetch(`${pdfBase}/api/generate-menu-pdf`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ menu, eventDetails: { occasion, guests, foodType, budget, includeAlcohol, date: new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'}) }, shoppingList }),
                });
                const html = await res.text();
                if (Platform.OS === 'web' && typeof window !== 'undefined') { const blob = new Blob([html], {type:'text/html'}); window.open(URL.createObjectURL(blob), '_blank'); }
                else { Alert.alert('PDF', 'PDF download is available on the web version at my-maharaj.vercel.app'); }
              } catch { Alert.alert('Error', 'Could not generate PDF. Please try again.'); }
              finally { setGeneratingPdf(false); }
            }}>{generatingPdf ? <ActivityIndicator color={white} /> : <Text style={s.confirmBtnTxt}>Confirm Menu & Download PDF</Text>}</TouchableOpacity>}
            {menu && <>
              <Section title="Starters"    items={menu.starters}    />
              <Section title="Main Course"  items={menu.main_course} />
              <Section title="Desserts"     items={menu.desserts}    />
              <Section title="Beverages"    items={menu.beverages ?? (menu as any).drinks ?? []}   />
              {!menu.beverages?.length && !(menu as any).drinks?.length && (
                <View style={s.section}><Text style={s.sectionTitle}>Beverages</Text><Text style={{fontSize:13,color:'#5A7A8A',padding:8}}>No beverages returned — try regenerating.</Text></View>
              )}
              {menu.serving_tips?.length > 0 && (
                <View style={s.section}>
                  <Text style={s.sectionTitle}>Serving Tips</Text>
                  {menu.serving_tips.map((t, i) => <Text key={i} style={s.tipTxt}>• {t}</Text>)}
                </View>
              )}
              {menu.shopping_list?.length > 0 && (
                <View style={s.section}>
                  <Text style={s.sectionTitle}>Shopping List</Text>
                  <View style={s.shopGrid}>
                    {menu.shopping_list.map((item, i) => (<View key={i} style={s.shopChip}><Text style={s.shopChipTxt}>{item}</Text></View>))}
                  </View>
                </View>
              )}
            </>}
            <View style={{ height: 40 }} />
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
  label: { fontSize: 11, fontWeight: '700', color: darkGray, marginTop: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827', backgroundColor: 'rgba(255,255,255,0.9)' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: 'rgba(255,255,255,0.9)' },
  chipOn: { backgroundColor: ACCENT, borderColor: ACCENT },
  chipTxt: { fontSize: 13, color: darkGray, fontWeight: '500' },
  chipTxtOn: { color: white, fontWeight: '600' },
  genBtn: { backgroundColor: ACCENT, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  genBtnTxt: { color: white, fontSize: 16, fontWeight: '700' },
  cancelLink: { alignItems: 'center', paddingVertical: 14, borderWidth: 1.5, borderColor: 'rgba(139,26,26,0.3)', borderRadius: 12, marginTop: 8 },
  cancelLinkTxt: { fontSize: 14, color: ACCENT, fontWeight: '600' },
  error: { color: errorRed, fontSize: 13, textAlign: 'center', marginTop: 14 },
  resultHeader: { backgroundColor: ACCENT, borderRadius: 14, padding: 20, marginBottom: 12 },
  resultTitle: { fontSize: 22, fontWeight: '800', color: white },
  resultMeta: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: ACCENT, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  cancelBtnTxt: { color: ACCENT, fontWeight: '700', fontSize: 14 },
  modifyBtn: { flex: 1, borderWidth: 1.5, borderColor: ACCENT, borderRadius: 12, paddingVertical: 14, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.9)' },
  modifyBtnTxt: { color: ACCENT, fontWeight: '700', fontSize: 14 },
  regenBtn: { flex: 1, backgroundColor: ACCENT, borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  regenBtnTxt: { color: white, fontWeight: '700', fontSize: 14 },
  confirmBtn: { backgroundColor: '#C9A227', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  confirmBtnTxt: { color: '#1B2A0C', fontSize: 15, fontWeight: '700' },
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
