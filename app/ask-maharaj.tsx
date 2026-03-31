import React, { useRef, useState } from 'react';
import {
  Image, ImageBackground, KeyboardAvoidingView, Platform,
  SafeAreaView, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import * as Speech from 'expo-speech';
import { supabase, getSessionUser } from '../lib/supabase';
import { navy, gold, white, textSec, border, errorRed, mint } from '../theme/colors';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface MealResult {
  title: string;
  meals: { slot: string; name: string; description: string }[];
  tips?: string[];
}

// ─── API proxy helper ─────────────────────────────────────────────────────────

async function callClaude(messages: { role: string; content: string }[], systemPrompt: string): Promise<string> {
  const base = 'https://my-maharaj.vercel.app';
  const res = await fetch(`${base}/api/claude`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: systemPrompt,
      messages,
    }),
  });
  const data = await res.json();
  if (data?.error) throw new Error(data.error.message ?? data.error);
  return data?.content?.[0]?.text ?? '';
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AskMaharajScreen() {
  const [messages,     setMessages]     = useState<Message[]>([]);
  const [input,        setInput]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [mealResult,   setMealResult]   = useState<MealResult | null>(null);

  const [listening,    setListening]    = useState(false);
  const [lastVoiceInput, setLastVoiceInput] = useState(false);
  const [isSpeaking,  setIsSpeaking]  = useState(false);
  const [isPaused,    setIsPaused]    = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // ── Load dietary profile for context ───────────────────────────────────────

  async function getProfileContext(): Promise<string> {
    try {
      const user = await getSessionUser();
      if (!user) return '';

      const [{ data: members }, { data: cuisines }, { data: profile }] = await Promise.all([
        supabase.from('family_members').select('name, age, health_notes').eq('user_id', user.id),
        supabase.from('cuisine_preferences').select('cuisine_name').eq('user_id', user.id).eq('is_excluded', false),
        supabase.from('profiles').select('food_pref, allowed_proteins').eq('id', user.id).maybeSingle(),
      ]);

      const memberContext = (members ?? []).map((m: any) =>
        `${m.name} (${m.age}yo)${m.health_notes ? ': ' + m.health_notes : ''}`
      ).join('; ');

      const cuisineContext = (cuisines ?? []).map((c: any) => c.cuisine_name).join(', ');

      // Food preference and protein restrictions
      const foodPref = profile?.food_pref;
      const allowedProteins: string[] = profile?.allowed_proteins ?? [];
      let dietContext = '';
      if (foodPref === 'veg') {
        dietContext = 'DIETARY RESTRICTION: This household is STRICTLY VEGETARIAN. Never suggest non-veg dishes, eggs, fish, chicken, or mutton.';
      } else if (foodPref === 'nonveg' && allowedProteins.length > 0) {
        const forbidden = ['Eggs','Fish','Chicken','Mutton'].filter(p => !allowedProteins.includes(p));
        dietContext = `PROTEIN RESTRICTION: ONLY use these proteins: ${allowedProteins.join(', ')}.${forbidden.length > 0 ? ` ${forbidden.join(', ')} are FORBIDDEN.` : ''}`;
      }

      return [
        memberContext ? `Family members: ${memberContext}` : '',
        cuisineContext ? `Preferred cuisines: ${cuisineContext}` : '',
        dietContext,
      ].filter(Boolean).join('\n');
    } catch {
      return '';
    }
  }

  // ── Send message ─────────────────────────────────────────────────────────

  async function send() {
    const text = input.trim();
    const wasVoice = lastVoiceInput;
    setLastVoiceInput(false);
    if (!text || loading) return;
    setInput('');

    const userMsg: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    try {
      const profileCtx = await getProfileContext();
      const isMealRequest = /cook|make|prepare|suggest|plan|recipe|meal|breakfast|lunch|dinner|dish|food|thali|sabzi|dal|rice|roti/i.test(text);

      const systemPrompt = `CRITICAL RULE 1: You MUST respond in the EXACT same language the user writes in. If English respond in English only. If Hindi respond in Hindi only. Never switch languages.

You are Maharaj, a wise and authoritative Indian culinary AI mentor for the My Maharaj app. You are deeply knowledgeable about Indian regional cuisines, Ayurvedic nutrition, and the cultural history of food.

${profileCtx ? `HOUSEHOLD PROFILE:\n${profileCtx}\n` : ''}

PERSONALITY:
- Address the user warmly and professionally
- Provide culturally rich context ("In the traditional kitchens of Maharashtra...")  
- Root guidance in Ayurvedic wisdom and modern nutrition
- Be specific, practical and actionable

${isMealRequest ? `When suggesting meals, respond with a JSON block in this exact format followed by a friendly explanation:
MEAL_JSON_START
{"title":"...", "meals":[{"slot":"Breakfast","name":"...","description":"..."},{"slot":"Lunch","name":"...","description":"..."},{"slot":"Dinner","name":"...","description":"..."}],"tips":["tip1","tip2"]}
MEAL_JSON_END` : ''}

Always track health conditions from the profile when suggesting food. Never repeat dishes within the same response.
Always respond in the same language the user writes in. If they write in Marathi, respond in Marathi. If Hindi, respond in Hindi. If English, respond in English. Match the user's language exactly.`;

      const response = await callClaude(
        newMessages.map(m => ({ role: m.role, content: m.content })),
        systemPrompt
      );

      // Parse meal JSON if present
      const mealMatch = response.match(/MEAL_JSON_START\s*([\s\S]*?)\s*MEAL_JSON_END/);
      if (mealMatch) {
        try {
          const parsed = JSON.parse(mealMatch[1]) as MealResult;
          setMealResult(parsed);
        } catch {}
      }

      const cleanResponse = response.replace(/MEAL_JSON_START[\s\S]*?MEAL_JSON_END/g, '').trim();
      const assistantMsg: Message = { role: 'assistant', content: cleanResponse };
      setMessages(prev => [...prev, assistantMsg]);
      // Speak response if triggered by voice
      if (wasVoice) {
        Speech.stop();
        setIsSpeaking(true); setIsPaused(false);
        Speech.speak(cleanResponse.slice(0, 500), {
          language: 'en-IN',
          rate: 0.85,
          onDone: () => { setIsSpeaking(false); setIsPaused(false); },
          onStopped: () => { setIsSpeaking(false); setIsPaused(false); },
        });
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error('[AskMaharaj] API error:', errMsg);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Sorry, something went wrong: ${errMsg}. Please try again.`,
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  // ── Voice input (web Speech API) ─────────────────────────────────────────

  function startVoice() {
    if (Platform.OS !== 'web') {
      setInput('Voice input works in the web version. Please type your request.');
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setInput('Voice not supported in this browser. Please type.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;
    setListening(true);
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      setLastVoiceInput(true);
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ImageBackground
      source={require('../assets/background.png')}
      style={s.bg}
      resizeMode="cover"
    >
      <SafeAreaView style={s.safe}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backTxt}>Back</Text>
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>Ask Maharaj AI</Text>
            <Text style={s.headerSub}>Your Wise Nutrition Mentor</Text>
          </View>
          <View style={{alignItems:'flex-end',gap:4}}>
            <Image source={require('../assets/blueflute-logo.png')} style={{width:80,height:28}} resizeMode="contain" />
            <TouchableOpacity onPress={() => router.push('/home' as never)} style={s.homeBtn}>
              <Text style={s.homeTxt}>Home</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Chat area */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={80}
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={s.chatScroll}
            showsVerticalScrollIndicator={false}
          >
            {/* Welcome */}
            {messages.length === 0 && (
              <View style={s.welcome}>
                <Image source={require('../assets/logo.png')} style={s.welcomeLogo} resizeMode="contain" />
                <Text style={s.welcomeTitle}>Namaste! I am Maharaj.</Text>
                <Text style={s.welcomeText}>
                  Ask me anything about Indian food, nutrition, meal planning, or what to cook today.
                  I know your family's health profile and cuisine preferences.
                </Text>
                <View style={s.suggestions}>
                  {[
                    'What should I cook for dinner tonight?',
                    'Suggest a diabetic-friendly meal plan',
                    'What is the history of biryani?',
                    'Plan a Ram Navami festive menu',
                  ].map((s_) => (
                    <TouchableOpacity key={s_} style={s.suggChip} onPress={() => setInput(s_)}>
                      <Text style={s.suggTxt}>{s_}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Messages */}
            {messages.map((msg, i) => (
              <View key={i} style={[s.bubble, msg.role === 'user' ? s.bubbleUser : s.bubbleAI]}>
                {msg.role === 'assistant' && (
                  <View style={{flexDirection:"row",alignItems:"center",gap:6,marginBottom:4}}><Image source={require('../assets/logo.png')} style={{width:36,height:36}} resizeMode="contain" /><Text style={{fontSize:10,fontWeight:"700",color:"#1A6B5C"}}>Maharaj</Text></View>
                )}
                <Text style={[s.bubbleTxt, msg.role === 'user' ? s.bubbleTxtUser : s.bubbleTxtAI]}>
                  {msg.content}
                </Text>
                {msg.role === 'assistant' && (
                  <View style={{flexDirection:'row',alignSelf:'flex-end',marginTop:6,gap:6}}>
                    <TouchableOpacity style={{paddingHorizontal:8,paddingVertical:4,borderRadius:8,backgroundColor:'rgba(27,58,92,0.08)'}} onPress={() => { Speech.stop(); setIsSpeaking(true); setIsPaused(false); Speech.speak(msg.content.slice(0,500), { language: 'en-IN', rate: 0.85, onDone: () => { setIsSpeaking(false); setIsPaused(false); }, onStopped: () => { setIsSpeaking(false); setIsPaused(false); } }); }}>
                      <Text style={{fontSize:11,color:navy,fontWeight:'600'}}>Speak</Text>
                    </TouchableOpacity>
                    {isSpeaking && (
                      <TouchableOpacity style={{paddingHorizontal:8,paddingVertical:4,borderRadius:8,backgroundColor:'rgba(27,58,92,0.08)'}} onPress={() => { if (isSpeaking && !isPaused) { Speech.stop(); setIsSpeaking(false); setIsPaused(false); } }}>
                        <Text style={{fontSize:11,color:navy,fontWeight:'600'}}>Stop</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            ))}

            {loading && (
              <View style={[s.bubble, s.bubbleAI]}>
                <View style={{flexDirection:"row",alignItems:"center",gap:6,marginBottom:4}}><Image source={require('../assets/logo.png')} style={{width:36,height:36}} resizeMode="contain" /><Text style={{fontSize:10,fontWeight:"700",color:"#1A6B5C"}}>Maharaj</Text></View>
                <ActivityIndicator color={navy} size="small" style={{ marginTop: 4 }} />
                <Text style={[s.bubbleTxt, s.bubbleTxtAI, { fontStyle: 'italic', marginTop: 4 }]}>
                  Consulting ancient wisdom...
                </Text>
              </View>
            )}

            {mealResult && (
              <View style={s.mealResultInline}>
                <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:12}}>
                  <Image source={require('../assets/logo.png')} style={{width:36,height:36}} resizeMode="contain" />
                  <Text style={{fontSize:16,fontWeight:'800',color:navy}}>{mealResult.title ?? 'Your Meal Plan'}</Text>
                </View>
                {mealResult.meals.map((meal, i) => (
                  <View key={i} style={s.mealCard}>
                    <View style={s.mealSlotBadge}>
                      <Text style={s.mealSlotTxt}>{meal.slot}</Text>
                    </View>
                    <Text style={s.mealName}>{meal.name}</Text>
                    <Text style={s.mealDesc}>{meal.description}</Text>
                  </View>
                ))}
                {mealResult.tips && mealResult.tips.length > 0 && (
                  <View style={s.tipsCard}>
                    <Text style={s.tipsTitle}>Maharaj's Tips</Text>
                    {mealResult.tips.map((tip, i) => (
                      <Text key={i} style={s.tipTxt}>• {tip}</Text>
                    ))}
                  </View>
                )}
                <View style={{gap:8,marginTop:8}}>
                  <View style={{flexDirection:'row',gap:8}}>
                    <TouchableOpacity style={{flex:1,borderWidth:1.5,borderColor:'rgba(27,58,92,0.25)',borderRadius:12,paddingVertical:10,alignItems:'center'}} onPress={() => { if (mealResult && typeof navigator !== 'undefined' && navigator.clipboard) { const txt = mealResult.meals.map(m => `${m.slot}: ${m.name} — ${m.description}`).join('\n'); navigator.clipboard.writeText(txt); } }}>
                      <Text style={{fontSize:12,fontWeight:'600',color:'#1B3A5C'}}>Copy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={{flex:1,borderWidth:1.5,borderColor:'rgba(27,58,92,0.25)',borderRadius:12,paddingVertical:10,alignItems:'center'}} onPress={()=>{setMealResult(null);setInput('Suggest different meals');}} >
                      <Text style={{fontSize:12,fontWeight:'600',color:'#1B3A5C'}}>Regenerate</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{flexDirection:'row',gap:8}}>
                    <TouchableOpacity style={{flex:1,backgroundColor:'#1B3A5C',borderRadius:12,paddingVertical:10,alignItems:'center'}} onPress={()=>{setMealResult(null);setMessages([]);}}>
                      <Text style={{fontSize:12,fontWeight:'600',color:'white'}}>New Question</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={{flex:1,backgroundColor:'#16A34A',borderRadius:12,paddingVertical:10,alignItems:'center'}} onPress={()=>setMealResult(null)}>
                      <Text style={{fontSize:12,fontWeight:'600',color:'white'}}>Thank You</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <TouchableOpacity style={s.goToWizardBtn} onPress={() => router.push('/meal-wizard' as never)}>
                  <Text style={s.goToWizardTxt}>Generate Full Weekly Plan →</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Input bar */}
          <View style={s.inputBar}>
            <TouchableOpacity
              style={[s.voiceBtn, listening && s.voiceBtnActive]}
              onPress={startVoice}
            >
              <Text style={s.voiceIcon}>{listening ? 'Stop' : 'Mic'}</Text>
            </TouchableOpacity>
            <TextInput
              style={s.input}
              value={input}
              onChangeText={setInput}
              placeholder="Ask about any dish, cuisine or meal plan..."
              placeholderTextColor={textSec}
              multiline
              returnKeyType="send"
              onSubmitEditing={send}
            />
            <TouchableOpacity
              style={[s.sendBtn, (!input.trim() || loading) && { opacity: 0.4 }]}
              onPress={send}
              disabled={!input.trim() || loading}
            >
              <Text style={s.sendTxt}>↑</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

      </SafeAreaView>
    </ImageBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  bg:   { flex: 1 },
  safe: { flex: 1 },

  header: {
    flexDirection:'row', alignItems:'center',
    paddingHorizontal:16,
    paddingTop: Platform.OS === 'web' ? 16 : 10,
    paddingBottom:12,
    backgroundColor:'rgba(255,255,255,0.85)',
    borderBottomWidth:1, borderBottomColor:'rgba(27,58,92,0.1)',
  },
  backBtn:     { paddingRight:12 },
  backTxt:     { fontSize:15, color:navy, fontWeight:'600' },
  headerCenter:{ flex:1, alignItems:'center' },
  headerTitle: { fontSize:17, fontWeight:'800', color:navy },
  headerSub:   { fontSize:10, color:textSec, marginTop:1 },
  homeBtn:     { paddingLeft:8, paddingRight:4, paddingVertical:6, borderRadius:10, borderWidth:1.5, borderColor:'rgba(27,58,92,0.25)', backgroundColor:'rgba(255,255,255,0.8)' },
  homeTxt:     { fontSize:18 },

  chatScroll: { padding:16, paddingBottom:8 },

  welcome:       { alignItems:'center', paddingVertical:24, paddingHorizontal:16 },
  welcomeLogo:   { width:180, height:72, marginBottom:12 },
  welcomeEmoji:  { fontSize:56, marginBottom:12 },
  welcomeTitle:  { fontSize:20, fontWeight:'800', color:navy, marginBottom:8 },
  welcomeText:   { fontSize:14, color:textSec, textAlign:'center', lineHeight:22, marginBottom:20 },
  suggestions:   { width:'100%', flexDirection:'row', flexWrap:'wrap', gap:8 },
  suggChip:      { backgroundColor:'rgba(255,255,255,0.9)', borderRadius:12, padding:10, borderWidth:1, borderColor:border, width:'48%' },
  suggTxt:       { fontSize:13, color:navy, fontWeight:'500' },

  bubble:       { marginBottom:12, maxWidth:'85%' },
  bubbleUser:   { alignSelf:'flex-end', backgroundColor:navy, borderRadius:18, borderBottomRightRadius:4, padding:14 },
  bubbleAI:     { alignSelf:'flex-start', backgroundColor:'rgba(255,255,255,0.92)', borderRadius:18, borderBottomLeftRadius:4, padding:14, borderWidth:1, borderColor:border },
  bubbleLabel:  { fontSize:10, fontWeight:'700', color:textSec, marginBottom:4 },
  bubbleTxt:    { fontSize:14, lineHeight:22 },
  bubbleTxtUser:{ color:white },
  bubbleTxtAI:  { color:navy },

  inputBar: {
    flexDirection:'row', alignItems:'flex-end', gap:8,
    padding:12,
    paddingBottom: Platform.OS === 'ios' ? 34 : Platform.OS === 'android' ? 24 : 0,
    backgroundColor:'rgba(255,255,255,0.92)',
    borderTopWidth:1, borderTopColor:'rgba(27,58,92,0.1)',
  },
  voiceBtn:       { width:44, height:44, borderRadius:22, backgroundColor:'rgba(27,58,92,0.08)', alignItems:'center', justifyContent:'center' },
  voiceBtnActive: { backgroundColor:'rgba(220,38,38,0.12)' },
  voiceIcon:      { fontSize:20 },
  input: {
    flex:1, borderWidth:1.5, borderColor:border, borderRadius:16,
    paddingHorizontal:14, paddingVertical:10, fontSize:14, color:navy,
    backgroundColor:white, maxHeight:100,
    outlineStyle:'none',
  } as any,
  sendBtn: {
    width:44, height:44, borderRadius:22, backgroundColor:navy,
    alignItems:'center', justifyContent:'center',
  },
  sendTxt: { fontSize:20, color:white, fontWeight:'700', lineHeight:24 },

  // Inline meal result
  mealResultInline: {
    marginBottom:12, maxWidth:'85%', alignSelf:'flex-start' as const,
    backgroundColor:'rgba(255,255,255,0.92)', borderRadius:18, padding:14,
    borderWidth:1, borderColor:border,
  },

  mealCard: {
    backgroundColor:'#F8FFFE', borderRadius:14, padding:14, marginBottom:10,
    borderWidth:1, borderColor:border,
  },
  mealSlotBadge:{ alignSelf:'flex-start', backgroundColor:'#E8F5E9', borderRadius:8, paddingHorizontal:10, paddingVertical:4, marginBottom:6 },
  mealSlotTxt:  { fontSize:11, fontWeight:'700', color:'#1A6B5C' },
  mealName:     { fontSize:18, fontWeight:'800', color:navy, marginBottom:4 },
  mealDesc:     { fontSize:14, color:textSec, lineHeight:22 },

  tipsCard:   { backgroundColor:'#FFFBEB', borderRadius:14, padding:14, marginBottom:10, borderWidth:1, borderColor:'#FDE68A' },
  tipsTitle:  { fontSize:13, fontWeight:'700', color:'#B45309', marginBottom:8 },
  tipTxt:     { fontSize:13, color:'#78350F', lineHeight:20, marginBottom:4 },

  goToWizardBtn: { backgroundColor:navy, borderRadius:14, paddingVertical:16, alignItems:'center', marginTop:4 },
  goToWizardTxt: { color:white, fontWeight:'700', fontSize:15 },
});
