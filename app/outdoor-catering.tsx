import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Switch, ActivityIndicator, Platform, Share } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScreenWrapper from '../components/ScreenWrapper';
import { loadOrDetectLocation } from '../lib/location';
import { supabase, getSessionUser } from '../lib/supabase';
import { navy, gold, white, midGray, lightGray, darkGray, errorRed } from '../theme/colors';

const FOOD_TYPES = ['Vegetarian','Non-vegetarian','Mixed'];
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

interface Item { name: string; description: string; }
interface ShopItem { item: string; qty: string; }
interface OutdoorMenu {
  starters: Item[]; main_course: Item[]; desserts: Item[];
  beverages: Item[]; packing_tips: string[];
  shopping_list: ShopItem[];
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
  const [saved,     setSaved]     = useState(false);
  const [dietaryRestrictions, setDietaryRestrictions] = useState('');
  const [loc,       setLoc]       = useState({ city: 'Dubai', country: 'UAE', stores: 'Carrefour/Spinneys/Lulu' });
  const [beverages, setBeverages] = useState({
    mineralWater: true, nimbuPani: true, coldCoffee: false,
    coconutWater: false, freshJuice: false, masalaChai: false, softDrinks: false, alcohol: false,
  });

  useEffect(() => { loadOrDetectLocation().then(setLoc); }, []);

  useFocusEffect(useCallback(() => {
    setStep('form'); setMenu(null); setOccasionText(''); setFoodType('Mixed');
    setGuestCountText('15'); setBudget('25'); setSetup('Finger Food');
    setWeather('Hot & Sunny'); setError(''); setLoading(false); setSaved(false);
    setBeverages({ mineralWater:true, nimbuPani:true, coldCoffee:false, coconutWater:false, freshJuice:false, masalaChai:false, softDrinks:false, alcohol:false });
  }, []));

  const bevNames: Record<string,string> = { mineralWater:'Mineral water', nimbuPani:'Nimbu pani', coldCoffee:'Cold coffee', coconutWater:'Coconut water', freshJuice:'Fresh juice', masalaChai:'Masala chai', softDrinks:'Soft drinks' };
  const selectedBevs = Object.entries(beverages).filter(([k,v]) => v && k !== 'alcohol').map(([k]) => bevNames[k]).filter(Boolean);

  async function generateMenu() {
    setMenu(null); setError(''); setSaved(false);
    const g = parseInt(guestCountText, 10);
    const b = parseInt(budget, 10);
    if (!g || g < 1) { setError('Enter a valid number of guests.'); return; }
    if (!b || b < 1) { setError('Enter a valid budget per head.'); return; }
    if (!occasionText.trim()) { setError('Please describe the event.'); return; }
    setLoading(true);
    try {
      // Occasion-aware context
      const occ = occasionText.toLowerCase();
      let occasionContext = 'General outdoor event — balanced menu.';
      if (occ.includes('trek') || occ.includes('hik') || occ.includes('camp')) occasionContext = 'TREKKING/CAMPING: Lightweight, portable, high-energy food. Fewer courses, easy to eat on the go. Focus on wraps, energy bars, trail mix, sandwiches, dry snacks.';
      else if (occ.includes('beach') || occ.includes('pool')) occasionContext = 'BEACH/POOL: Fresh, cold-friendly food. Grilled items, salads, cold beverages, finger food. Avoid heavy curries.';
      else if (occ.includes('office') || occ.includes('corporate') || occ.includes('team')) occasionContext = 'CORPORATE: Formal buffet style. Neat presentation, variety, vegetarian options mandatory, individual portions if possible.';
      else if (occ.includes('picnic') || occ.includes('park')) occasionContext = 'PICNIC: Easy to pack, eat without cutlery. Wraps, sandwiches, samosas, fruit, juice. No messy gravies.';
      else if (occ.includes('sport') || occ.includes('match') || occ.includes('game')) occasionContext = 'SPORTS EVENT: Quick bites, high energy. Burgers, wraps, protein-rich snacks, hydrating drinks.';

      const text = await callClaude(`You are Maharaj, expert Indian chef specialising in outdoor catering.
Generate an outdoor catering menu for:
- Event: ${occasionText} (${recogniseOccasion(occasionText)})
- ${occasionContext}
- Guests: ${g}, Food: ${foodType}, Setup: ${setup}, Weather: ${weather}
- Budget: AED ${b} per head (Total: AED ${g * b})
- ${loc.city}, ${loc.country} — ingredients from ${loc.stores}
- Beverages to include: ${selectedBevs.join(', ') || 'Water only'}
${beverages.alcohol ? '- Include beer, wine and cocktail pairing suggestions appropriate for the occasion.' : '- No alcohol.'}
Focus on food that travels well, stays fresh outdoors and suits the weather. Adapt the menu to the specific occasion type.
Respond ONLY with this exact JSON structure - no other text, no markdown:
{"starters":[{"name":"string","description":"string"}],"main_course":[{"name":"string","description":"string"}],"desserts":[{"name":"string","description":"string"}],"beverages":[{"name":"string","description":"string"}],"packing_tips":["string"],"shopping_list":[{"item":"string","qty":"string"}]}
Include 3-5 items per section. Shopping list must have quantity with units for ${g} guests.`);
      let parsed: OutdoorMenu;
      try { const match = text.match(/\{[\s\S]*\}/); parsed = JSON.parse(match ? match[0] : text) as OutdoorMenu; }
      catch { throw new Error('Failed to parse menu response'); }
      if (!parsed.beverages || parsed.beverages.length === 0) {
        parsed.beverages = [{ name:'Mineral Water', description:'Still and sparkling' },{ name:'Nimbu Pani', description:'Chilled lemon water' }];
      }
      // Normalise shopping_list if AI returned string[] instead of {item,qty}[]
      if (parsed.shopping_list?.length && typeof parsed.shopping_list[0] === 'string') {
        parsed.shopping_list = (parsed.shopping_list as unknown as string[]).map(s => ({ item: s, qty: '' }));
      }
      setMenu(parsed); setStep('result');
      saveToHistory(parsed);
    } catch (err) { console.error('[OutdoorCatering]', err); setError('Failed to generate. Please try again.'); }
    finally { setLoading(false); }
  }

  async function saveToHistory(m: OutdoorMenu) {
    const today = new Date().toISOString().split('T')[0];
    const b = parseInt(budget, 10) || 0;
    const menuData = { type: 'outdoor' as const, occasion: occasionText, recognised: recogniseOccasion(occasionText), guests: guestCountText, budget, setup, weather, foodType, starters: m.starters, main_course: m.main_course, desserts: m.desserts, beverages: m.beverages, packing_tips: m.packing_tips, shopping_list: m.shopping_list };
    try {
      const user = await getSessionUser();
      if (user) {
        await supabase.from('menu_history').insert({
          user_id: user.id, period_start: today, period_end: today,
          cuisine: 'Outdoor Catering', food_pref: foodType,
          dietary_notes: `${occasionText} — ${guestCountText} guests, ${setup}, AED ${b}/head`,
          menu_json: menuData,
        });
      }
    } catch (e) { console.error('[OutdoorCatering] supabase save error', e); }
    try {
      const existing = JSON.parse(await AsyncStorage.getItem('menu_history') || '[]');
      const entry = { id: Date.now().toString(), createdAt: new Date().toISOString(), dateRange: today, type: 'outdoor', occasion: occasionText, menu_json: menuData };
      await AsyncStorage.setItem('menu_history', JSON.stringify([entry, ...existing].slice(0, 20)));
    } catch {}
    setSaved(true);
  }

  function downloadPDF() {
    if (!menu || Platform.OS !== 'web' || typeof window === 'undefined') return;
    const occasion = recogniseOccasion(occasionText);
    const g = parseInt(guestCountText, 10) || 0;
    const b = parseInt(budget, 10) || 0;
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const sectionHTML = (title: string, items: Item[]) => {
      if (!items?.length) return '';
      return `<h2>${title}</h2><table><tr><th>#</th><th>Dish</th><th>Description</th></tr>${items.map((it,i) => `<tr><td>${i+1}</td><td><strong>${it.name}</strong></td><td>${it.description}</td></tr>`).join('')}</table>`;
    };
    const shopHTML = menu.shopping_list?.length ? `<h2>Shopping List</h2><table><tr><th>#</th><th>Item</th><th class="qty">Qty</th></tr>${menu.shopping_list.map((it,i) => `<tr><td>${i+1}</td><td>${it.item}</td><td class="qty">${it.qty}</td></tr>`).join('')}</table>` : '';
    const tipsHTML = menu.packing_tips?.length ? `<h2>Packing & Serving Tips</h2><ul>${menu.packing_tips.map(t => `<li>${t}</li>`).join('')}</ul>` : '';
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>@page{size:A4;margin:15mm}*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;-webkit-print-color-adjust:exact}.hd{background:#1A6B3C;padding:16px 20px;display:flex;justify-content:space-between;align-items:center}.hd-l{color:white;font-size:18px;font-weight:bold}.hd-h{color:#C9A227;font-size:11px;margin-top:3px}.hd-r{color:#C9A227;font-size:11px;text-align:right}.gb{background:#C9A227;padding:10px 20px;text-align:center}.gb-t{font-size:14px;font-weight:bold;color:#1B2A0C}.gb-s{font-size:11px;color:#412402;margin-top:3px}h2{color:#2E5480;font-size:14px;margin:16px 20px 8px;border-bottom:1px solid #E5E7EB;padding-bottom:6px}table{width:calc(100% - 40px);margin:0 20px 12px;border-collapse:collapse}th{background:#2E5480;color:white;padding:8px;font-size:11px;text-align:left;border:1px solid #2E5480}td{padding:8px;font-size:11px;border:1px solid #E5E7EB}tr:nth-child(even) td{background:#F9FAFB}.qty{text-align:right;color:#1A6B5C;font-weight:600;width:100px}ul{margin:0 20px 12px 40px}li{font-size:12px;color:#374151;line-height:22px}.ft{margin-top:20px;border-top:1px solid #E5E7EB;padding-top:10px;text-align:center;font-size:9px;color:#6B7280}.disc{margin:10px 20px;background:#F5F7FA;border-radius:6px;padding:8px 12px;font-size:9px;color:#6B7280;text-align:center}</style></head><body><div class="hd"><div><div class="hd-l">My Maharaj</div><div class="hd-h">\u092E\u0947\u0930\u093E \u092E\u0939\u093E\u0930\u093E\u091C</div></div><div class="hd-r">blue flute<br>consulting</div></div><div class="gb"><div class="gb-t">${occasion} — Outdoor Catering</div><div class="gb-s">${occasionText} \u00B7 ${guestCountText} guests \u00B7 ${foodType} \u00B7 ${setup} \u00B7 AED ${b}/head</div></div>${sectionHTML('Starters', menu.starters)}${sectionHTML('Main Course', menu.main_course)}${sectionHTML('Desserts', menu.desserts)}${sectionHTML('Beverages', menu.beverages)}${tipsHTML}${shopHTML}<div class="disc">Maharaj outdoor menus are recommendations only. Please adjust for allergies and dietary needs.</div><div class="ft">Generated on ${today} \u00B7 Powered by Blue Flute Consulting LLC-FZ \u00B7 www.bluefluteconsulting.com</div><script>setTimeout(function(){window.print()},800)</script></body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'maharaj-outdoor-menu.html'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  function Section({ title, items }: { title: string; items?: Item[] }) {
    if (!items?.length) return null;
    return (
      <View style={s.section}>
        <Text style={s.sectionTitle}>{title}</Text>
        {items.map((item,i) => (
          <View key={i} style={[s.item, i===items.length-1 && {borderBottomWidth:0}]}>
            <View style={{flexDirection:'row',alignItems:'baseline',gap:6}}>
              <Text style={{fontSize:11,fontWeight:'700',color:ACCENT,minWidth:18}}>{i+1}.</Text>
              <Text style={s.itemName}>{item.name}</Text>
            </View>
            <Text style={[s.itemDesc,{marginLeft:24}]}>{item.description}</Text>
          </View>
        ))}
      </View>
    );
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

            {/* Dietary restrictions */}
            <Text style={s.label}>DIETARY RESTRICTIONS</Text>
            <TextInput style={s.input} value={dietaryRestrictions} onChangeText={setDietaryRestrictions} placeholder="e.g. no nuts, diabetic friendly, Jain" placeholderTextColor={midGray} />

            {error ? <Text style={s.error}>{error}</Text> : null}
            <View style={{marginTop:8}}>
              <TouchableOpacity style={[{paddingVertical:14,borderRadius:12,backgroundColor:gold,alignItems:'center'}, loading && {opacity:0.6}]} onPress={generateMenu} disabled={loading}>
                {loading ? <ActivityIndicator color={'#1B2A0C'} /> : <Text style={{fontSize:14,fontWeight:'700',color:'#1B2A0C'}}>Generate</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={s.scroll}>
          <View style={s.container}>
            {/* Occasion Banner */}
            <View style={s.resultHeader}>
              <Text style={{fontSize:12,color:'rgba(255,255,255,0.6)',textTransform:'uppercase',letterSpacing:0.5}}>Outdoor Catering</Text>
              <Text style={s.resultTitle}>{occasionText}</Text>
              <Text style={s.resultMeta}>{guestCountText} guests · {foodType} · {setup} · AED {budget}/head</Text>
              <Text style={s.resultMeta}>Weather: {weather}</Text>
              <Text style={s.resultMeta}>{menu ? `${(menu.starters?.length||0)+(menu.main_course?.length||0)+(menu.desserts?.length||0)+(menu.beverages?.length||0)} dishes planned` : ''}</Text>
            </View>

            {/* Saved indicator */}
            {saved && (
              <View style={{backgroundColor:'#E8F5E9',borderRadius:8,padding:8,marginBottom:10}}>
                <Text style={{fontSize:10,color:'#1A6B3C',textAlign:'center',fontWeight:'600'}}>Saved to Menu History</Text>
              </View>
            )}

            {/* Action Row */}
            <View style={s.actionRow}>
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

              {/* Shopping List — tabular */}
              {menu.shopping_list?.length > 0 && (
                <View style={s.section}>
                  <Text style={s.sectionTitle}>Shopping List</Text>
                  <View style={{borderWidth:1,borderColor:'#E5E7EB',borderRadius:8,overflow:'hidden'}}>
                    <View style={{flexDirection:'row',backgroundColor:navy,padding:8}}>
                      <Text style={{flex:0.12,fontSize:10,fontWeight:'700',color:white}}>#</Text>
                      <Text style={{flex:0.58,fontSize:10,fontWeight:'700',color:white}}>Item</Text>
                      <Text style={{flex:0.3,fontSize:10,fontWeight:'700',color:white,textAlign:'right'}}>Qty</Text>
                    </View>
                    {menu.shopping_list.map((it,i) => (
                      <View key={i} style={{flexDirection:'row',padding:8,backgroundColor:i%2===0?'#F9FAFB':white,borderTopWidth:i>0?1:0,borderTopColor:'#E5E7EB'}}>
                        <Text style={{flex:0.12,fontSize:11,color:darkGray}}>{i+1}</Text>
                        <Text style={{flex:0.58,fontSize:11,color:darkGray}}>{it.item}</Text>
                        <Text style={{flex:0.3,fontSize:11,color:'#1A6B5C',fontWeight:'600',textAlign:'right'}}>{it.qty}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* PDF Download */}
              {Platform.OS === 'web' && (
                <TouchableOpacity style={{borderWidth:1.5,borderColor:gold,borderRadius:12,paddingVertical:12,alignItems:'center',marginBottom:12}} onPress={downloadPDF}>
                  <Text style={{fontSize:12,fontWeight:'700',color:gold}}>Download PDF</Text>
                </TouchableOpacity>
              )}
            </>}

            {/* Share + Plan Again */}
            <View style={{flexDirection:'row',gap:10,marginBottom:12}}>
              <TouchableOpacity style={{flex:1,backgroundColor:'#C9A227',borderRadius:8,paddingVertical:12,alignItems:'center'}} onPress={() => { if (!menu) return; const text = ['Starters', ...(menu.starters||[]).map(i => i.name), '', 'Main Course', ...(menu.main_course||[]).map(i => i.name), '', 'Desserts', ...(menu.desserts||[]).map(i => i.name)].join('\n'); Share.share({ message: `Outdoor Menu — ${occasionText}\n\n${text}\n\nPlanned by My Maharaj` }); }}>
                <Text style={{fontSize:15,fontWeight:'700',color:'#1A1A1A'}}>Share Menu</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{flex:1,borderWidth:1.5,borderColor:'#2E5480',borderRadius:8,paddingVertical:12,alignItems:'center'}} onPress={() => { setStep('form'); setMenu(null); setOccasionText(''); setError(''); }}>
                <Text style={{fontSize:15,fontWeight:'700',color:'#2E5480'}}>Plan Again</Text>
              </TouchableOpacity>
            </View>

            {/* Disclaimer */}
            <Text style={{fontSize:9,color:'#9CA3AF',textAlign:'center',marginTop:8,lineHeight:14}}>App names and trademarks belong to their respective owners. My Maharaj is not affiliated with any external services.</Text>
            <View style={{height:40}} />
          </View>
        </ScrollView>
      )}
    </ScreenWrapper>
  );
}

const ACCENT = '#1A6B3C';
const s = StyleSheet.create({
  scroll:      { flexGrow: 1, paddingBottom: 100 },
  container:   { padding: 20, maxWidth: 640, width: '100%', alignSelf: 'center' },
  pageTitle:   { fontSize: 22, fontWeight: '800', color: navy, marginBottom: 4 },
  pageSub:     { fontSize: 13, color: midGray, marginBottom: 16, lineHeight: 20 },
  row:         { flexDirection: 'row', gap: 12 },
  label:       { fontSize: 11, fontWeight: '700', color: darkGray, marginTop: 14, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 },
  input:       { borderWidth: 1, borderColor: 'rgba(27,58,92,0.25)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, color: '#2E5480', backgroundColor: 'rgba(255,255,255,0.9)' },
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
});
