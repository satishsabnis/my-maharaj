import React, { useEffect, useRef, useState } from 'react';
import {
  Alert, Animated, Easing, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity,
  View, ActivityIndicator,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Audio } from 'expo-av';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts, Poppins_400Regular } from '@expo-google-fonts/poppins';
import { supabase, getSessionUser } from '../lib/supabase';
import { colors } from '../theme/colors';
import ScreenWrapper from '../components/ScreenWrapper';

interface Message { role: 'user' | 'assistant'; content: string; }
interface MealResult { title: string; meals: { slot: string; name: string; description: string }[]; tips?: string[]; }

const LANG_MAP: Record<string, string> = {
  'English': 'en-IN', 'Hindi': 'hi-IN', 'Marathi': 'mr-IN',
  'Tamil': 'ta-IN', 'Telugu': 'te-IN', 'Kannada': 'kn-IN',
  'Malayalam': 'ml-IN', 'Bengali': 'bn-IN', 'Gujarati': 'gu-IN', 'Punjabi': 'pa-IN',
};

async function callClaude(messages: { role: string; content: string }[], systemPrompt: string): Promise<string> {
  const res = await fetch('https://my-maharaj.vercel.app/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-maharaj-secret': process.env.EXPO_PUBLIC_MAHARAJ_API_SECRET } as Record<string, string>,
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 2048, system: systemPrompt, messages }),
  });
  const data = await res.json();
  if (data?.error) throw new Error(data.error.message ?? data.error);
  return data?.content?.[0]?.text ?? '';
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*\*(.*?)\*\*\*/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/`{1,3}(.*?)`{1,3}/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/^\s*[-*+]\s/gm, '\u2022 ')
    .replace(/---+/g, '')
    .replace(/___+/g, '')
    .replace(/:[a-z_]+:/g, '')
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
    const isHeader = (trimmed.length < 40 && trimmed.endsWith(':')) || /^[A-Z][a-z]+:/.test(trimmed);
    if (isHeader) {
      return (
        <View key={i} style={{backgroundColor:'#2E5480',borderRadius:8,paddingHorizontal:14,paddingVertical:8,marginVertical:6}}>
          <Text style={{color:'#C9A227',fontSize:13,fontWeight:'600',fontFamily:'Poppins_400Regular'}}>{trimmed}</Text>
        </View>
      );
    }
    return <Text key={i} style={{color:'#2E5480',fontSize:13,lineHeight:20,fontFamily:'Poppins_400Regular'}}>{trimmed}</Text>;
  });
}

export default function AskMaharajScreen() {
  const { initialMessage } = useLocalSearchParams<{ initialMessage?: string; initialLabel?: string }>();
  const [fontsLoaded] = useFonts({ Poppins_400Regular });
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mealResult, setMealResult] = useState<MealResult | null>(null);
  const [listening, setListening] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const lastAiBubbleRef = useRef<View>(null);
  const audioRef = useRef<any>(null);
  const soundRef = useRef<any>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [familyCount, setFamilyCount] = useState(0);
  const [userName, setUserName] = useState('');
  const [hasPlan, setHasPlan] = useState(false);
  const [familyContextStr, setFamilyContextStr] = useState('');
  const [userLanguages, setUserLanguages] = useState<string[]>(['English']);

  // Logo pulse — infinite loop
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
      { iterations: -1 }
    ).start();
  }, []);

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

  function scrollToLastAiBubble() {
    setTimeout(() => {
      if (lastAiBubbleRef.current && scrollRef.current) {
        try {
          (lastAiBubbleRef.current as any).measureLayout(
            scrollRef.current as any,
            (x: number, y: number) => { scrollRef.current?.scrollTo({ y, animated: true }); },
            () => { scrollRef.current?.scrollToEnd({ animated: true }); }
          );
        } catch {
          scrollRef.current?.scrollToEnd({ animated: true });
        }
      } else {
        scrollRef.current?.scrollToEnd({ animated: true });
      }
    }, 150);
  }

  // Auto-send initialMessage from tip card tap
  const autoSentRef = useRef(false);
  useEffect(() => {
    if (!initialMessage || autoSentRef.current) return;
    autoSentRef.current = true;
    const tipMsg = String(initialMessage);
    const userMsg: Message = { role: 'user', content: tipMsg };
    setMessages([userMsg]);
    setLoading(true);
    (async () => {
      try {
        const profileCtx = await getProfileContext();
        const lang = userLanguages[0] || 'English';
        const tipSystemPrompt = `CRITICAL: You MUST respond ENTIRELY in ${lang}. Never switch languages mid-response. Even if the user writes in another language, always reply in ${lang}.

${familyContextStr}
You are Maharaj, a culturally intelligent Indian family meal planning assistant.
${profileCtx ? `FAMILY PROFILE:\n${profileCtx}\n` : ''}
The user has tapped on a Maharaj tip card. Explain this tip in detail, give practical examples relevant to an Indian family in the GCC, and suggest how they can apply it this week. Be warm, specific, and practical.`;
        const response = await callClaude([{ role: 'user', content: tipMsg }], tipSystemPrompt);
        const clean = stripMarkdown(response.trim());
        setMessages([userMsg, { role: 'assistant', content: clean }]);
      } catch {
        setMessages([userMsg, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
      } finally {
        setLoading(false);
        scrollToLastAiBubble();
      }
    })();
  }, [initialMessage]);

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
      return [memberCtx ? `Family: ${memberCtx}` : '', cuisineCtx ? `Cuisines: ${cuisineCtx}` : '', dietCtx].filter(Boolean).join('\n');
    } catch { return ''; }
  }

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

  async function stopSpeaking() {
    if (Platform.OS === 'web') {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    } else {
      if (soundRef.current) {
        try { await soundRef.current.stopAsync(); await soundRef.current.unloadAsync(); } catch {}
        soundRef.current = null;
      }
    }
    setSpeakingIndex(null);
    setIsPaused(false);
  }

  async function speakMessage(text: string, msgIndex: number) {
    await stopSpeaking();
    setSpeakingIndex(msgIndex);
    setIsPaused(false);
    const speechText = stripForSpeech(text);
    const langCode = LANG_MAP[userLanguages[0]] || 'en-IN';
    try {
      const res = await fetch('https://my-maharaj.vercel.app/api/sarvam-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-maharaj-secret': process.env.EXPO_PUBLIC_MAHARAJ_API_SECRET } as Record<string, string>,
        body: JSON.stringify({ text: speechText, language: langCode }),
      });
      const data = await res.json();
      if (!data.audio) throw new Error('No audio');
      if (Platform.OS === 'web') {
        const audio = new (window as any).Audio(`data:audio/wav;base64,${data.audio}`);
        audioRef.current = audio;
        audio.onended = () => { setSpeakingIndex(null); setIsPaused(false); };
        audio.play();
      } else {
        const { sound } = await Audio.Sound.createAsync({ uri: `data:audio/wav;base64,${data.audio}` });
        soundRef.current = sound;
        sound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.didJustFinish) { setSpeakingIndex(null); setIsPaused(false); soundRef.current = null; }
        });
        await sound.playAsync();
      }
    } catch {
      setSpeakingIndex(null);
    }
  }

  function pauseSpeaking() {
    if (Platform.OS === 'web') { audioRef.current?.pause(); }
    else { soundRef.current?.pauseAsync(); }
    setIsPaused(true);
  }

  function resumeSpeaking() {
    if (Platform.OS === 'web') { audioRef.current?.play(); }
    else { soundRef.current?.playAsync(); }
    setIsPaused(false);
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

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
      const systemPrompt = `CRITICAL: You MUST respond ENTIRELY in ${lang}. Never switch languages mid-response. Even if the user writes in another language, always reply in ${lang}.

${familyContextStr}
You are Maharaj, a culturally intelligent Indian family meal planning assistant.
${profileCtx ? `FAMILY PROFILE:\n${profileCtx}\n` : ''}
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
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
      scrollToLastAiBubble();
    }
  }

  function startVoice() {
    if (Platform.OS !== 'web') {
      Alert.alert('Voice Input', 'Voice input works in the web version. Please type your question.');
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setInput('Voice not supported in this browser.'); return; }
    const r = new SR(); r.lang = 'en-IN'; r.continuous = false; r.interimResults = false;
    setListening(true);
    r.onresult = (e: any) => { setInput(e.results[0][0].transcript); setListening(false); };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    r.start();
  }

  return (
    <ScreenWrapper title="Ask Maharaj" onBack={() => router.back()} showHome>
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <ScrollView ref={scrollRef} contentContainerStyle={{padding:14,paddingBottom:80}} showsVerticalScrollIndicator={false}>
          {messages.length === 0 && (
            <View style={{alignItems:'center',paddingVertical:20,paddingHorizontal:12}}>
              <Animated.Image
                source={require('../assets/logo.png')}
                style={{width:140,height:140,transform:[{scale:pulseAnim}],marginBottom:4}}
                resizeMode="contain"
              />
              <Text style={{fontSize:16,fontWeight:'700',color:colors.navy,marginTop:4,marginBottom:6,textAlign:'center'}}>Namaste{userName ? ` ${userName}` : ''}. I am your Maharaj.</Text>
              <Text style={{fontSize:13,color:colors.textSec,textAlign:'center',lineHeight:20,marginBottom:16}}>Ask me anything — meals, fridge, shopping, nutrition. Or choose below.</Text>
              <View style={{width:'100%',flexDirection:'row',flexWrap:'wrap',gap:8}}>
                {['Plan my week','What is in my fridge?','Party menu','Shopping list','Meal prep','Outdoor trip'].map(s_ => (
                  <TouchableOpacity key={s_} style={{backgroundColor:'rgba(255,255,255,0.92)',borderRadius:10,padding:10,borderWidth:1,borderColor:colors.border,flexBasis:'47%',flexGrow:0}} onPress={() => {
                    const intent = detectIntent(s_);
                    if (intent) { router.push(`/${intent}` as never); }
                    else { setInput(s_); }
                  }}>
                    <Text style={{fontSize:12,color:colors.navy,fontWeight:'500'}}>{s_}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {messages.map((msg, i) => {
            const isLastAI = i === messages.length - 1 && msg.role === 'assistant';
            return (
              <View
                key={i}
                ref={isLastAI ? lastAiBubbleRef : undefined}
                style={msg.role === 'user' ? s.userBubble : s.aiBubble}
              >
                {msg.role === 'user' ? (
                  <Text style={{fontSize:14,lineHeight:22,color:colors.white}}>{msg.content}</Text>
                ) : (
                  <View>{renderResponseText(msg.content)}</View>
                )}
                {msg.role === 'assistant' && (
                  <View style={{flexDirection:'row',alignSelf:'flex-end',marginTop:8,gap:8}}>
                    {speakingIndex === i ? (
                      <>
                        <TouchableOpacity
                          style={{backgroundColor:colors.gold,borderRadius:24,paddingHorizontal:16,paddingVertical:8,alignItems:'center',justifyContent:'center'}}
                          onPress={isPaused ? resumeSpeaking : pauseSpeaking}
                        >
                          <Text style={{fontSize:14,fontWeight:'600',color:colors.navy}}>{isPaused ? 'Resume' : 'Pause'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{backgroundColor:'rgba(26,58,92,0.12)',borderRadius:24,paddingHorizontal:16,paddingVertical:8,alignItems:'center',justifyContent:'center'}}
                          onPress={stopSpeaking}
                        >
                          <Text style={{fontSize:14,fontWeight:'600',color:colors.navy}}>Stop</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <TouchableOpacity
                        style={{backgroundColor:colors.navy,borderRadius:24,paddingHorizontal:16,paddingVertical:8,alignItems:'center',justifyContent:'center',opacity:speakingIndex !== null ? 0.4 : 1}}
                        onPress={() => speakMessage(msg.content, i)}
                        disabled={speakingIndex !== null}
                      >
                        <Text style={{fontSize:14,fontWeight:'600',color:colors.gold}}>Speak</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            );
          })}

          {loading && (
            <View style={s.aiBubble}>
              <ActivityIndicator color={colors.navy} size="small" />
              <Text style={{fontSize:13,color:colors.textSec,fontStyle:'italic',marginTop:4}}>Thinking...</Text>
            </View>
          )}

          {mealResult && (
            <View style={{backgroundColor:'rgba(255,255,255,0.95)',borderRadius:16,padding:14,marginBottom:12,borderWidth:1,borderColor:colors.border}}>
              <Text style={{fontSize:16,fontWeight:'800',color:colors.navy,marginBottom:10}}>{mealResult.title ?? 'Your Meal Plan'}</Text>
              {mealResult.meals.map((meal, i) => (
                <View key={i} style={{backgroundColor:'#F8FFFE',borderRadius:12,padding:12,marginBottom:8,borderWidth:1,borderColor:'#E5E7EB'}}>
                  <View style={{backgroundColor:'#E8F5E9',borderRadius:6,paddingHorizontal:8,paddingVertical:3,alignSelf:'flex-start',marginBottom:6}}>
                    <Text style={{fontSize:13,fontWeight:'700',color:'#1A6B5C'}}>{meal.slot}</Text>
                  </View>
                  <Text style={{fontSize:16,fontWeight:'800',color:colors.navy,marginBottom:3}}>{meal.name}</Text>
                  <Text style={{fontSize:13,color:colors.textSec,lineHeight:20}}>{meal.description}</Text>
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
                  <Text style={{fontSize:14,fontWeight:'600',color:colors.navy}}>Regenerate</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{flex:1,backgroundColor:colors.navy,borderRadius:10,paddingVertical:9,alignItems:'center'}} onPress={() => router.push('/meal-wizard' as never)}>
                  <Text style={{fontSize:14,fontWeight:'500',color:colors.white}}>Full Weekly Plan</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input bar */}
        <View style={{backgroundColor:'white',borderTopWidth:0.5,borderTopColor:'rgba(201,162,39,0.3)',padding:8,flexDirection:'row',alignItems:'flex-end',gap:8}}>
          <TouchableOpacity onPress={startVoice} style={{width:36,height:36,borderRadius:18,backgroundColor:listening?colors.gold:'#F0F5FA',alignItems:'center',justifyContent:'center'}}>
            <Svg width={18} height={18} viewBox="0 0 24 24">
              <Path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill={listening?'white':colors.navy} />
              <Path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke={listening?'white':colors.navy} strokeWidth="1.5" strokeLinecap="round" fill="none" />
              <Path d="M12 19v4M8 23h8" stroke={listening?'white':colors.navy} strokeWidth="1.5" strokeLinecap="round" fill="none" />
            </Svg>
          </TouchableOpacity>
          <TextInput style={s.input} value={input} onChangeText={setInput} placeholder="Ask Maharaj anything..." placeholderTextColor={colors.textSec} multiline maxLength={500} returnKeyType="send" onSubmitEditing={send} />
          <TouchableOpacity style={[s.sendBtn, (!input.trim()||loading) && {opacity:0.4}]} onPress={send} disabled={!input.trim()||loading}>
            <Text style={{fontSize:20,color:colors.white,fontWeight:'700',lineHeight:24}}>{'\u2191'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={{fontSize:12,color:'#9CA3AF',textAlign:'center',paddingVertical:2,backgroundColor:'rgba(255,255,255,0.92)'}}>{familyCount > 0 ? `Maharaj knows your ${familyCount} family members` : 'Add family in Profile for personalised answers'}{hasPlan ? ' \u00B7 Plan loaded' : ''}</Text>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  userBubble: { alignSelf:'flex-end', backgroundColor:colors.navy, borderRadius:16, borderBottomRightRadius:4, padding:12, marginBottom:10, maxWidth:'82%' },
  aiBubble: { alignSelf:'flex-start', backgroundColor:'rgba(255,255,255,0.94)', borderRadius:16, borderBottomLeftRadius:4, padding:12, marginBottom:10, maxWidth:'88%', borderWidth:1, borderColor:colors.border },
  input: { flex:1, borderWidth:1.5, borderColor:colors.border, borderRadius:14, paddingHorizontal:12, paddingVertical:8, fontSize:14, color:colors.navy, backgroundColor:colors.white, maxHeight:90 } as any,
  sendBtn: { width:40, height:40, borderRadius:20, backgroundColor:colors.navy, alignItems:'center', justifyContent:'center' },
});
