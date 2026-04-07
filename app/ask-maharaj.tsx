import React, { useEffect, useRef, useState } from 'react';
import {
  Image, ImageBackground, KeyboardAvoidingView, Platform,
  SafeAreaView, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View, ActivityIndicator,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, getSessionUser } from '../lib/supabase';
import { navy, gold, white, textSec, border } from '../theme/colors';
import MarqueeTicker from '../components/MarqueeTicker';

interface Message { role: 'user' | 'assistant'; content: string; }
interface MealResult { title: string; meals: { slot: string; name: string; description: string }[]; tips?: string[]; }

async function callClaude(messages: { role: string; content: string }[], systemPrompt: string): Promise<string> {
  const res = await fetch('https://my-maharaj.vercel.app/api/claude', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 2048, system: systemPrompt, messages }),
  });
  const data = await res.json();
  if (data?.error) throw new Error(data.error.message ?? data.error);
  return data?.content?.[0]?.text ?? '';
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*\*(.*?)\*\*\*/g, '$1')   // bold-italic
    .replace(/\*\*(.*?)\*\*/g, '$1')         // bold
    .replace(/\*(.*?)\*/g, '$1')             // italic
    .replace(/#{1,6}\s/g, '')                // headers
    .replace(/`{1,3}(.*?)`{1,3}/g, '$1')    // code
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')      // links
    .replace(/^\s*[-*+]\s/gm, '\u2022 ')     // bullets
    .replace(/---+/g, '')                     // horizontal rules
    .replace(/___+/g, '')                     // underline rules
    .replace(/:[a-z_]+:/g, '')                // emoji shortcodes
    .trim();
}

function stripForSpeech(text: string): string {
  return text
    .replace(/\*{1,3}/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/`{1,3}/g, '')
    .replace(/---+/g, '. ')
    .replace(/:[a-z_]+:/g, '')
    .replace(/[*#_~`]/g, '')
    .replace(/\n+/g, '. ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function renderResponseText(text: string) {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return <View key={i} style={{height:6}} />;
    // Sub-header: short line ending with : or starting with caps word followed by :
    const isHeader = (trimmed.length < 40 && trimmed.endsWith(':')) || /^[A-Z][a-z]+:/.test(trimmed);
    if (isHeader) {
      return (
        <View key={i} style={{backgroundColor:'#2E5480',borderRadius:8,paddingHorizontal:14,paddingVertical:8,marginVertical:6}}>
          <Text style={{color:'#C9A227',fontSize:13,fontWeight:'600'}}>{trimmed}</Text>
        </View>
      );
    }
    return <Text key={i} style={{color:'#2E5480',fontSize:13,lineHeight:20}}>{trimmed}</Text>;
  });
}

export default function AskMaharajScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mealResult, setMealResult] = useState<MealResult | null>(null);
  const [listening, setListening] = useState(false);
  const [lastVoiceInput, setLastVoiceInput] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const [familyCount, setFamilyCount] = useState(0);
  const [userName, setUserName] = useState('');
  const [hasPlan, setHasPlan] = useState(false);
  const [familyContextStr, setFamilyContextStr] = useState('');
  const [userLanguages, setUserLanguages] = useState<string[]>(['English']);

  useEffect(() => {
    (async () => {
      try {
        const user = await getSessionUser();
        if (!user) return;
        const { data: members } = await supabase.from('family_members').select('name, age, health_notes').eq('user_id', user.id);
        const mems = members ?? [];
        setFamilyCount(mems.length);
        const uName = (user.user_metadata?.full_name ?? user.email ?? '') as string;
        setUserName(uName.split(' ')[0] || '');
        const [storePref, cookSkill, fastDays] = await Promise.all([
          AsyncStorage.getItem('store_prefs'), AsyncStorage.getItem('cooking_skill'), AsyncStorage.getItem('fasting_days'),
        ]);
        const summary = mems.map((m: any) => `${m.name} (${m.age || 'adult'}): health: ${m.health_notes || 'none'}`).join('\n');
        setFamilyContextStr(summary ? `\nFAMILY PROFILE:\n${summary}\nStores: ${storePref || 'any'}\nCooking: ${cookSkill || 'moderate'}\nFasting: ${fastDays || 'none'}\n` : '');
        const plan = await AsyncStorage.getItem('maharaj_plan_ready');
        if (plan) setHasPlan(true);
        const langs = await AsyncStorage.getItem('app_languages');
        if (langs) try { setUserLanguages(JSON.parse(langs)); } catch {}
      } catch {}
    })();
  }, []);

  async function getProfileContext(): Promise<string> {
    try {
      const user = await getSessionUser();
      if (!user) return '';
      const [{ data: members }, { data: cuisines }] = await Promise.all([
        supabase.from('family_members').select('name, age, health_notes').eq('user_id', user.id),
        supabase.from('cuisine_preferences').select('cuisine_name').eq('user_id', user.id).eq('is_excluded', false),
      ]);
      const memberCtx = (members ?? []).map((m: any) => `${m.name} (${m.age}yo)${m.health_notes ? ': ' + m.health_notes : ''}`).join('; ');
      const cuisineCtx = (cuisines ?? []).map((c: any) => c.cuisine_name).join(', ');
      // FIX 7: Read dietary from AsyncStorage (where meal wizard saves it)
      const savedFoodPref = await AsyncStorage.getItem('dietary_food_pref');
      const savedNonVegOpts = await AsyncStorage.getItem('dietary_nonveg_opts');
      let dietCtx = '';
      if (savedFoodPref === 'veg') dietCtx = 'STRICTLY VEGETARIAN. No non-veg dishes.';
      else if (savedFoodPref === 'nonveg') {
        const opts = savedNonVegOpts ? JSON.parse(savedNonVegOpts) : [];
        dietCtx = `NON-VEGETARIAN. Allowed proteins: ${opts.length > 0 ? opts.join(', ') : 'chicken, fish, eggs, mutton'}.`;
      } else {
        dietCtx = 'Dietary preference not set — assume vegetarian.';
      }
      console.log('[AskMaharaj] Dietary context:', dietCtx);
      return [memberCtx ? `Family: ${memberCtx}` : '', cuisineCtx ? `Cuisines: ${cuisineCtx}` : '', dietCtx].filter(Boolean).join('\n');
    } catch { return ''; }
  }

  // Intent detection — routes to correct screen before AI call
  function detectIntent(msg: string): string | null {
    const m = msg.toLowerCase();
    if (m.includes('plan my week') || m.includes('meal plan') || m.includes('generate plan') || m.includes('plan this week')) return 'meal-wizard';
    if (m.includes('fridge') || m.includes('what do i have') || m.includes('ingredients')) return 'my-fridge';
    if (m.includes('party') || m.includes('guests coming') || m.includes('party menu')) return 'party-menu';
    if (m.includes('outdoor') || m.includes('trek') || m.includes('picnic') || m.includes('camping')) return 'outdoor-catering';
    if (m.includes('last plan') || m.includes('history') || m.includes('what did we eat')) return 'menu-history';
    if (m.includes('meal prep') || m.includes('prep guide')) return 'meal-prep';
    return null;
  }

  async function send() {
    const text = input.trim();
    const wasVoice = lastVoiceInput;
    setLastVoiceInput(false);
    if (!text || loading) return;

    // Check intent before AI call
    const intent = detectIntent(text);
    if (intent) {
      setInput('');
      router.push(`/${intent}` as never);
      return;
    }

    setInput('');
    const userMsg: Message = { role: 'user', content: text };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setLoading(true);
    try {
      const profileCtx = await getProfileContext();
      const lang = userLanguages[0] || 'English';
      const isMeal = /cook|make|prepare|suggest|plan|recipe|meal|breakfast|lunch|dinner|dish|food|thali|sabzi|dal|rice|roti/i.test(text);
      const systemPrompt = `${familyContextStr}
You are Maharaj, a culturally intelligent Indian family meal planning assistant.
${profileCtx ? `HOUSEHOLD PROFILE:\n${profileCtx}\n` : ''}
You MUST respond entirely in ${lang}. Dish names in their authentic Indian language names. Descriptions in ${lang}.
${isMeal ? `When suggesting meals, include a JSON block:
MEAL_JSON_START
{"title":"...","meals":[{"slot":"Breakfast","name":"Authentic Indian Name","description":"..."},{"slot":"Lunch","name":"...","description":"..."},{"slot":"Dinner","name":"...","description":"..."}],"tips":["tip1","tip2"]}
MEAL_JSON_END` : ''}
Use ONLY authentic Indian dish names. Be warm, practical, specific to this family.`;

      const response = await callClaude(newMsgs.map(m => ({ role: m.role, content: m.content })), systemPrompt);
      const mealMatch = response.match(/MEAL_JSON_START\s*([\s\S]*?)\s*MEAL_JSON_END/);
      if (mealMatch) { try { setMealResult(JSON.parse(mealMatch[1]) as MealResult); } catch {} }
      const clean = stripMarkdown(response.replace(/MEAL_JSON_START[\s\S]*?MEAL_JSON_END/g, '').trim());
      setMessages(prev => [...prev, { role: 'assistant', content: clean }]);
      // Auto-speak disabled — user taps Speak button explicitly
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, something went wrong. Please try again.` }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  function startVoice() {
    if (Platform.OS !== 'web') { setInput('Voice works in the web version. Please type.'); return; }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setInput('Voice not supported in this browser.'); return; }
    const r = new SR(); r.lang = 'en-IN'; r.continuous = false; r.interimResults = false;
    setListening(true);
    r.onresult = (e: any) => { setInput(e.results[0][0].transcript); setLastVoiceInput(true); setListening(false); };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    r.start();
  }

  return (
    <View style={{flex:1}}>
      {/* Background covers 100% */}
      <Image source={require('../assets/background.png')} style={{position:'absolute',top:0,left:0,right:0,bottom:0,width:'100%',height:'100%'}} resizeMode="cover" />

      <SafeAreaView style={{flex:1}}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={{paddingRight:12}}>
            <Text style={{fontSize:15,color:navy,fontWeight:'600'}}>Back</Text>
          </TouchableOpacity>
          <View style={{flex:1,alignItems:'center'}}>
            <Image source={require('../assets/logo.png')} style={{width:36,height:36}} resizeMode="contain" />
            <Text style={{fontSize:12,fontWeight:'600',color:navy,marginTop:1}}>Ask Maharaj</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/home' as never)} style={{paddingHorizontal:10,paddingVertical:5,borderRadius:8,borderWidth:1.5,borderColor:'rgba(27,58,92,0.2)',backgroundColor:'rgba(255,255,255,0.8)'}}>
            <Text style={{fontSize:11,fontWeight:'700',color:navy}}>Home</Text>
          </TouchableOpacity>
        </View>
        <MarqueeTicker />

        <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
          {/* Messages */}
          <ScrollView ref={scrollRef} contentContainerStyle={{padding:14,paddingBottom:8}} showsVerticalScrollIndicator={false}>
            {messages.length === 0 && (
              <View style={{alignItems:'center',paddingVertical:20,paddingHorizontal:12}}>
                <Image source={require('../assets/logo.png')} style={{width:80,height:40,marginBottom:10}} resizeMode="contain" />
                <Text style={{fontSize:16,fontWeight:'700',color:navy,marginBottom:6,textAlign:'center'}}>Namaste{userName ? ` ${userName}` : ''}. I am your Maharaj.</Text>
                <Text style={{fontSize:13,color:textSec,textAlign:'center',lineHeight:20,marginBottom:16}}>Ask me anything — meals, fridge, shopping, nutrition. Or choose below.</Text>
                <View style={{width:'100%',flexDirection:'row',flexWrap:'wrap',gap:8}}>
                  {['Plan my week','What is in my fridge?','Party menu','Shopping list','Meal prep','Outdoor trip'].map(s_ => (
                    <TouchableOpacity key={s_} style={{backgroundColor:'rgba(255,255,255,0.92)',borderRadius:10,padding:10,borderWidth:1,borderColor:border,flexBasis:'47%',flexGrow:0}} onPress={() => {
                      const intent = detectIntent(s_);
                      if (intent) { router.push(`/${intent}` as never); }
                      else { setInput(s_); }
                    }}>
                      <Text style={{fontSize:12,color:navy,fontWeight:'500'}}>{s_}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {messages.map((msg, i) => (
              <View key={i} style={msg.role === 'user' ? s.userBubble : s.aiBubble}>
                {msg.role === 'assistant' && (
                  <View style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:4}}>
                    <Image source={require('../assets/logo.png')} style={{width:22,height:22}} resizeMode="contain" />
                    <Text style={{fontSize:10,fontWeight:'700',color:'#1A6B5C'}}>Maharaj</Text>
                  </View>
                )}
                {msg.role === 'user' ? (
                  <Text style={{fontSize:14,lineHeight:22,color:white}}>{msg.content}</Text>
                ) : (
                  <View>{renderResponseText(msg.content)}</View>
                )}
                {msg.role === 'assistant' && (
                  <TouchableOpacity style={{alignSelf:'flex-end',marginTop:8,backgroundColor:isSpeaking?'#C9A227':'#2E5480',borderRadius:24,paddingHorizontal:24,paddingVertical:12,minWidth:48,minHeight:48,alignItems:'center',justifyContent:'center'}} onPress={() => {
                    if (typeof window !== 'undefined' && window.speechSynthesis) {
                      if (isSpeaking && !isPaused) { window.speechSynthesis.pause(); setIsPaused(true); return; }
                      if (isSpeaking && isPaused) { window.speechSynthesis.resume(); setIsPaused(false); return; }
                      window.speechSynthesis.cancel();
                      const u = new SpeechSynthesisUtterance(stripForSpeech(msg.content).slice(0,500));
                      u.lang = 'en-IN'; u.rate = 0.9;
                      const voices = window.speechSynthesis.getVoices();
                      u.voice = voices.find(v => v.name.includes('Rishi')) || voices.find(v => v.name.includes('David')) || voices.find(v => v.lang.startsWith('en')) || null;
                      u.onend = () => { setIsSpeaking(false); setIsPaused(false); };
                      setIsSpeaking(true); setIsPaused(false);
                      window.speechSynthesis.speak(u);
                    }
                  }}>
                    <Text style={{fontSize:14,fontWeight:'600',color:isSpeaking?'#2E5480':'#C9A227'}}>{isSpeaking ? (isPaused ? 'Resume' : 'Pause') : 'Speak'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {loading && (
              <View style={s.aiBubble}>
                <View style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:4}}>
                  <Image source={require('../assets/logo.png')} style={{width:22,height:22}} resizeMode="contain" />
                  <Text style={{fontSize:10,fontWeight:'700',color:'#1A6B5C'}}>Maharaj</Text>
                </View>
                <ActivityIndicator color={navy} size="small" />
                <Text style={{fontSize:13,color:textSec,fontStyle:'italic',marginTop:4}}>Thinking...</Text>
              </View>
            )}

            {/* Meal result cards — matching wizard card style */}
            {mealResult && (
              <View style={{backgroundColor:'rgba(255,255,255,0.95)',borderRadius:16,padding:14,marginBottom:12,borderWidth:1,borderColor:border}}>
                <Text style={{fontSize:16,fontWeight:'800',color:navy,marginBottom:10}}>{mealResult.title ?? 'Your Meal Plan'}</Text>
                {mealResult.meals.map((meal, i) => (
                  <View key={i} style={{backgroundColor:'#F8FFFE',borderRadius:12,padding:12,marginBottom:8,borderWidth:1,borderColor:'#E5E7EB'}}>
                    <View style={{backgroundColor:'#E8F5E9',borderRadius:6,paddingHorizontal:8,paddingVertical:3,alignSelf:'flex-start',marginBottom:6}}>
                      <Text style={{fontSize:10,fontWeight:'700',color:'#1A6B5C'}}>{meal.slot}</Text>
                    </View>
                    <Text style={{fontSize:16,fontWeight:'800',color:navy,marginBottom:3}}>{meal.name}</Text>
                    <Text style={{fontSize:13,color:textSec,lineHeight:20}}>{meal.description}</Text>
                  </View>
                ))}
                {mealResult.tips?.length ? (
                  <View style={{backgroundColor:'#FFFBEB',borderRadius:10,padding:10,marginBottom:8,borderWidth:1,borderColor:'#FDE68A'}}>
                    <Text style={{fontSize:12,fontWeight:'700',color:'#B45309',marginBottom:4}}>Maharaj's Tips</Text>
                    {mealResult.tips.map((t, i) => <Text key={i} style={{fontSize:12,color:'#78350F',lineHeight:18}}>{'\u2022'} {t}</Text>)}
                  </View>
                ) : null}
                <View style={{flexDirection:'row',gap:8,marginTop:4}}>
                  <TouchableOpacity style={{flex:1,borderWidth:1.5,borderColor:'rgba(27,58,92,0.2)',borderRadius:10,paddingVertical:9,alignItems:'center'}} onPress={() => { setMealResult(null); setInput('Suggest different meals'); }}>
                    <Text style={{fontSize:11,fontWeight:'600',color:navy}}>Regenerate</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{flex:1,backgroundColor:navy,borderRadius:10,paddingVertical:9,alignItems:'center'}} onPress={() => router.push('/meal-wizard' as never)}>
                    <Text style={{fontSize:11,fontWeight:'700',color:white}}>Full Weekly Plan</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Input bar — pinned outside ScrollView */}
          <View style={{backgroundColor:'white',borderTopWidth:0.5,borderTopColor:'rgba(201,162,39,0.3)',padding:8,flexDirection:'row',alignItems:'flex-end',gap:8}}>
            <TouchableOpacity onPress={startVoice} style={{width:36,height:36,borderRadius:18,backgroundColor:listening?gold:'#F0F5FA',alignItems:'center',justifyContent:'center'}}>
              <Svg width={18} height={18} viewBox="0 0 24 24">
                <Path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill={listening?'white':'#2E5480'} />
                <Path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke={listening?'white':'#2E5480'} strokeWidth="1.5" strokeLinecap="round" fill="none" />
                <Path d="M12 19v4M8 23h8" stroke={listening?'white':'#2E5480'} strokeWidth="1.5" strokeLinecap="round" fill="none" />
              </Svg>
            </TouchableOpacity>
            <TextInput style={s.input} value={input} onChangeText={setInput} placeholder="Ask Maharaj anything..." placeholderTextColor={textSec} multiline maxLength={500} returnKeyType="send" onSubmitEditing={send} />
            <TouchableOpacity style={[s.sendBtn, (!input.trim()||loading) && {opacity:0.4}]} onPress={send} disabled={!input.trim()||loading}>
              <Text style={{fontSize:20,color:white,fontWeight:'700',lineHeight:24}}>{'\u2191'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={{fontSize:9,color:'#9CA3AF',textAlign:'center',paddingVertical:2,backgroundColor:'rgba(255,255,255,0.92)'}}>{familyCount > 0 ? `Maharaj knows your ${familyCount} family members` : 'Add family in Profile for personalised answers'}{hasPlan ? ' \u00B7 Plan loaded' : ''}</Text>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection:'row', alignItems:'center', paddingHorizontal:14, paddingTop:Platform.OS==='web'?14:Platform.OS==='android'?25:8, paddingBottom:10, backgroundColor:'rgba(255,255,255,0.88)', borderBottomWidth:1, borderBottomColor:'rgba(27,58,92,0.1)' },
  userBubble: { alignSelf:'flex-end', backgroundColor:navy, borderRadius:16, borderBottomRightRadius:4, padding:12, marginBottom:10, maxWidth:'82%' },
  aiBubble: { alignSelf:'flex-start', backgroundColor:'rgba(255,255,255,0.94)', borderRadius:16, borderBottomLeftRadius:4, padding:12, marginBottom:10, maxWidth:'88%', borderWidth:1, borderColor:border },
  inputBar: { flexDirection:'row', alignItems:'flex-end', gap:8, padding:10, paddingBottom:Platform.OS==='ios'?30:Platform.OS==='android'?20:8, backgroundColor:'rgba(255,255,255,0.94)', borderTopWidth:1, borderTopColor:'rgba(27,58,92,0.1)' },
  input: { flex:1, borderWidth:1.5, borderColor:border, borderRadius:14, paddingHorizontal:12, paddingVertical:8, fontSize:14, color:navy, backgroundColor:white, maxHeight:90 } as any,
  sendBtn: { width:40, height:40, borderRadius:20, backgroundColor:navy, alignItems:'center', justifyContent:'center' },
});
