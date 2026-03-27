import React, { useRef, useState } from 'react';
import {
  Image, ImageBackground, KeyboardAvoidingView, Platform,
  SafeAreaView, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { navy, gold, white, textSec, border } from '../theme/colors';

// ─── Types ────────────────────────────────────────────────────────────────────

type ScreenState = 'chat' | 'result';

interface Message { role: 'user' | 'assistant'; content: string; }
interface MealItem { slot: string; name: string; description: string; }
interface MealResult { title: string; meals: MealItem[]; tips?: string[]; }

// ─── API ──────────────────────────────────────────────────────────────────────

async function callClaude(messages: { role: string; content: string }[], system: string): Promise<string> {
  const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081';
  const res = await fetch(`${base}/api/claude`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system,
      messages,
    }),
  });
  return (await res.json())?.content?.[0]?.text ?? '';
}

const SLOT_ICONS: Record<string, string> = {
  Breakfast: '🌅', Lunch: '☀️', Dinner: '🌙', Snack: '🫖', Default: '🍽️',
};

const SUGGESTIONS = [
  'What should I cook for dinner tonight?',
  'Suggest a high-protein vegetarian meal plan',
  'What are good Diwali sweets to make at home?',
  'How do I make a healthy Konkani thali?',
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AskMaharajScreen() {
  const [screen,     setScreen]     = useState<ScreenState>('chat');
  const [messages,   setMessages]   = useState<Message[]>([]);
  const [input,      setInput]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [mealResult, setMealResult] = useState<MealResult | null>(null);
  const [lastQuery,  setLastQuery]  = useState('');
  const [listening,  setListening]  = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // ── Profile context ─────────────────────────────────────────────────────────

  async function getProfileCtx(): Promise<string> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return '';
      const [{ data: members }, { data: cuisines }] = await Promise.all([
        supabase.from('family_members').select('name, age, health_notes').eq('user_id', user.id),
        supabase.from('cuisine_preferences').select('cuisine_name').eq('user_id', user.id).eq('is_excluded', false),
      ]);
      const mc = (members ?? []).map((m: any) => `${m.name} (${m.age}yo)${m.health_notes ? ': ' + m.health_notes : ''}`).join('; ');
      const cc = (cuisines ?? []).map((c: any) => c.cuisine_name).join(', ');
      return [mc ? `Family: ${mc}` : '', cc ? `Cuisines: ${cc}` : ''].filter(Boolean).join('\n');
    } catch { return ''; }
  }

  // ── Send ─────────────────────────────────────────────────────────────────────

  async function send(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;
    setInput('');
    setLastQuery(text);

    const userMsg: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);
    setMealResult(null);

    try {
      const profileCtx = await getProfileCtx();
      const isMeal = /cook|make|prepare|suggest|plan|recipe|meal|breakfast|lunch|dinner|dish|food|thali|sabzi|dal|rice|roti|snack/i.test(text);

      const system = `You are Maharaj, a wise Indian culinary AI mentor. You are deeply knowledgeable about Indian regional cuisines, Ayurvedic nutrition, and cultural food traditions.

${profileCtx ? `HOUSEHOLD PROFILE:\n${profileCtx}\n` : ''}

Be warm, culturally rich, specific and practical. Address the user as "dear" or by context.

${isMeal ? `When suggesting meals, respond with a JSON block in EXACTLY this format, then a brief friendly explanation:
MEAL_JSON_START
{"title":"Today's Meal Suggestions","meals":[{"slot":"Breakfast","name":"Pohe","description":"Light flattened rice with mustard, curry leaves and fresh coriander — easy to digest and energising"},{"slot":"Lunch","name":"Dal Makhani","description":"Slow-cooked black lentils with cream — rich in protein and deeply satisfying"},{"slot":"Dinner","name":"Methi Thepla","description":"Fenugreek flatbread with yogurt — light, nutritious and perfect for dinner"}],"tips":["Drink warm water 30 minutes before meals","Use ghee instead of refined oil for better digestion"]}
MEAL_JSON_END
Use REAL Indian dish names only. Vary slots based on the query.` : ''}`;

      const response = await callClaude(
        newMessages.map(m => ({ role: m.role, content: m.content })),
        system
      );

      // Parse meal JSON
      const match = response.match(/MEAL_JSON_START\s*([\s\S]*?)\s*MEAL_JSON_END/);
      if (match) {
        try {
          const parsed = JSON.parse(match[1]) as MealResult;
          setMealResult(parsed);
          setScreen('result');
        } catch {}
      }

      const clean = response.replace(/MEAL_JSON_START[\s\S]*?MEAL_JSON_END/g, '').trim();
      if (clean) {
        setMessages(prev => [...prev, { role: 'assistant', content: clean }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'My apologies, I encountered an issue. Please try again.' }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
    }
  }

  // ── Regenerate ───────────────────────────────────────────────────────────────

  async function regenerate() {
    if (!lastQuery) return;
    setMealResult(null);
    setScreen('chat');
    await send(lastQuery);
  }

  // ── Voice ────────────────────────────────────────────────────────────────────

  function startVoice() {
    if (Platform.OS !== 'web') { setInput('Please type your question.'); return; }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setInput('Voice not supported. Please type.'); return; }
    const r = new SR();
    r.lang = 'en-IN'; r.continuous = false; r.interimResults = false;
    setListening(true);
    r.onresult = (e: any) => { setInput(e.results[0][0].transcript); setListening(false); };
    r.onerror = r.onend = () => setListening(false);
    r.start();
  }

  // ── Result screen ─────────────────────────────────────────────────────────────

  if (screen === 'result' && mealResult) {
    return (
      <ImageBackground source={require('../assets/background.png')} style={{ flex: 1 }} resizeMode="cover">
        <SafeAreaView style={s.safe}>

          {/* Header */}
          <View style={s.header}>
            <TouchableOpacity onPress={() => setScreen('chat')} style={s.backBtn}>
              <Text style={s.backTxt}>← Back</Text>
            </TouchableOpacity>
            <Image source={require('../assets/logo.png')} style={s.headerLogo} resizeMode="contain" />
            <View style={s.headerRight}>
              <Image source={require('../assets/blueflute-logo.png')} style={s.bfLogo} resizeMode="contain" />
              <TouchableOpacity onPress={() => router.push('/home' as never)}>
                <Text style={{ fontSize: 20 }}>🏠</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView contentContainerStyle={s.resultScroll} showsVerticalScrollIndicator={false}>

            {/* Result title card */}
            <View style={s.resultHeaderCard}>
              <Image source={require('../assets/logo.png')} style={s.resultLogoLarge} resizeMode="contain" />
              <Text style={s.resultTitle}>{mealResult.title}</Text>
              <Text style={s.resultSubTitle}>Personalised for your family</Text>
            </View>

            {/* Meal cards */}
            {mealResult.meals.map((meal, i) => (
              <View key={i} style={s.mealCard}>
                <View style={s.mealSlotRow}>
                  <Text style={s.mealSlotIcon}>{SLOT_ICONS[meal.slot] ?? SLOT_ICONS.Default}</Text>
                  <View style={s.mealSlotBadge}>
                    <Text style={s.mealSlotTxt}>{meal.slot}</Text>
                  </View>
                </View>
                <Text style={s.mealName}>{meal.name}</Text>
                <Text style={s.mealDesc}>{meal.description}</Text>
              </View>
            ))}

            {/* Tips card */}
            {mealResult.tips && mealResult.tips.length > 0 && (
              <View style={s.tipsCard}>
                <View style={s.tipsTitleRow}>
                  <Image source={require('../assets/logo.png')} style={s.tipsLogo} resizeMode="contain" />
                  <Text style={s.tipsTitle}>Maharaj's Wisdom</Text>
                </View>
                {mealResult.tips.map((tip, i) => (
                  <Text key={i} style={s.tipTxt}>• {tip}</Text>
                ))}
              </View>
            )}

            {/* Action buttons: Cancel first, then Regenerate */}
            <View style={s.actionRow}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => router.push('/home' as never)}>
                <Text style={s.cancelBtnTxt}>✕ Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.regenBtn} onPress={regenerate} disabled={loading}>
                {loading
                  ? <ActivityIndicator color={white} size="small" />
                  : <Text style={s.regenBtnTxt}>🔄 Regenerate</Text>
                }
              </TouchableOpacity>
            </View>

            {/* Go to full wizard */}
            <TouchableOpacity
              style={s.wizardBtn}
              onPress={() => router.push('/meal-wizard' as never)}
            >
              <Text style={s.wizardBtnTxt}>Generate Full Weekly Plan →</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  // ── Chat screen ───────────────────────────────────────────────────────────────

  return (
    <ImageBackground source={require('../assets/background.png')} style={{ flex: 1 }} resizeMode="cover">
      <SafeAreaView style={s.safe}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backTxt}>← Back</Text>
          </TouchableOpacity>
          <Image source={require('../assets/logo.png')} style={s.headerLogo} resizeMode="contain" />
          <View style={s.headerRight}>
            <Image source={require('../assets/blueflute-logo.png')} style={s.bfLogo} resizeMode="contain" />
            <TouchableOpacity onPress={() => router.push('/home' as never)}>
              <Text style={{ fontSize: 20 }}>🏠</Text>
            </TouchableOpacity>
          </View>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={s.chatScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Welcome state */}
            {messages.length === 0 && (
              <View style={s.welcome}>
                <Image source={require('../assets/logo.png')} style={s.welcomeLogo} resizeMode="contain" />
                <Text style={s.welcomeTitle}>Ask Maharaj Anything</Text>
                <Text style={s.welcomeText}>
                  Your wise nutrition mentor — ask about Indian food, meal planning, Ayurveda, recipes, or what to cook today.
                </Text>
                <View style={s.suggestions}>
                  {SUGGESTIONS.map((sugg, i) => (
                    <TouchableOpacity key={i} style={s.suggChip} onPress={() => send(sugg)}>
                      <Text style={s.suggTxt}>{sugg}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Messages */}
            {messages.map((msg, i) => (
              <View key={i} style={[s.bubble, msg.role === 'user' ? s.bubbleUser : s.bubbleAI]}>
                {msg.role === 'assistant' && (
                  <View style={s.bubbleLabelRow}>
                    <Image source={require('../assets/logo.png')} style={s.bubbleLogo} resizeMode="contain" />
                    <Text style={s.bubbleLabel}>Maharaj</Text>
                  </View>
                )}
                <Text style={[s.bubbleTxt, msg.role === 'user' ? s.bubbleTxtUser : s.bubbleTxtAI]}>
                  {msg.content}
                </Text>
              </View>
            ))}

            {loading && (
              <View style={[s.bubble, s.bubbleAI]}>
                <View style={s.bubbleLabelRow}>
                  <Image source={require('../assets/logo.png')} style={s.bubbleLogo} resizeMode="contain" />
                  <Text style={s.bubbleLabel}>Maharaj</Text>
                </View>
                <ActivityIndicator color={navy} size="small" style={{ marginTop: 4 }} />
                <Text style={[s.bubbleTxt, s.bubbleTxtAI, { fontStyle: 'italic', marginTop: 4 }]}>
                  Consulting ancient wisdom...
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Input bar */}
          <View style={s.inputBar}>
            <TouchableOpacity style={[s.voiceBtn, listening && s.voiceBtnActive]} onPress={startVoice}>
              <Text style={s.voiceIcon}>{listening ? '🔴' : '🎙️'}</Text>
            </TouchableOpacity>
            <TextInput
              style={s.input}
              value={input}
              onChangeText={setInput}
              placeholder="Ask about any dish, cuisine or meal plan..."
              placeholderTextColor={textSec}
              multiline
              returnKeyType="send"
              onSubmitEditing={() => send()}
            />
            <TouchableOpacity
              style={[s.sendBtn, (!input.trim() || loading) && { opacity: 0.4 }]}
              onPress={() => send()}
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
  safe: { flex: 1 },

  header: {
    flexDirection:'row', alignItems:'center', justifyContent:'space-between',
    paddingHorizontal:16,
    paddingTop: Platform.OS === 'web' ? 14 : 8,
    paddingBottom:10,
    backgroundColor:'rgba(255,255,255,0.85)',
    borderBottomWidth:1, borderBottomColor:'rgba(27,58,92,0.1)',
  },
  backBtn:    { minWidth:60 },
  backTxt:    { fontSize:15, color:navy, fontWeight:'600' },
  headerLogo: { width:100, height:36 },
  headerRight:{ flexDirection:'row', alignItems:'center', gap:8, minWidth:60, justifyContent:'flex-end' },
  bfLogo:     { width:80, height:30 },

  chatScroll: { padding:16, paddingBottom:8, flexGrow:1 },

  welcome:      { alignItems:'center', paddingVertical:20, paddingHorizontal:8 },
  welcomeLogo:  { width:160, height:80, marginBottom:12 },
  welcomeTitle: { fontSize:20, fontWeight:'800', color:navy, marginBottom:8 },
  welcomeText:  { fontSize:14, color:textSec, textAlign:'center', lineHeight:22, marginBottom:20 },
  suggestions:  { width:'100%', gap:8 },
  suggChip:     { backgroundColor:'rgba(255,255,255,0.92)', borderRadius:12, padding:14, borderWidth:1, borderColor:border },
  suggTxt:      { fontSize:13, color:navy, fontWeight:'500' },

  bubble:       { marginBottom:12, maxWidth:'88%' },
  bubbleUser:   { alignSelf:'flex-end', backgroundColor:navy, borderRadius:18, borderBottomRightRadius:4, padding:14 },
  bubbleAI:     { alignSelf:'flex-start', backgroundColor:'rgba(255,255,255,0.94)', borderRadius:18, borderBottomLeftRadius:4, padding:14, borderWidth:1, borderColor:border },
  bubbleLabelRow:{ flexDirection:'row', alignItems:'center', gap:6, marginBottom:6 },
  bubbleLogo:   { width:32, height:14 },
  bubbleLabel:  { fontSize:11, fontWeight:'700', color:'#1A6B5C' },
  bubbleTxt:    { fontSize:14, lineHeight:22 },
  bubbleTxtUser:{ color:white },
  bubbleTxtAI:  { color:navy },

  inputBar: {
    flexDirection:'row', alignItems:'flex-end', gap:8,
    padding:12,
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
    ...(Platform.OS === 'web' ? { outlineStyle:'none' } : {}),
  } as any,
  sendBtn: { width:44, height:44, borderRadius:22, backgroundColor:navy, alignItems:'center', justifyContent:'center' },
  sendTxt: { fontSize:20, color:white, fontWeight:'700', lineHeight:24 },

  // ── Result screen ──
  resultScroll:      { padding:16, paddingBottom:48, maxWidth:680, width:'100%', alignSelf:'center' },
  resultHeaderCard:  { backgroundColor:'rgba(27,58,92,0.92)', borderRadius:18, padding:20, alignItems:'center', marginBottom:16 },
  resultLogoLarge:   { width:140, height:56, marginBottom:10 },
  resultTitle:       { fontSize:20, fontWeight:'800', color:white, textAlign:'center', marginBottom:4 },
  resultSubTitle:    { fontSize:12, color:'rgba(255,255,255,0.7)', textAlign:'center' },

  mealCard: {
    backgroundColor:'rgba(255,255,255,0.92)', borderRadius:16, padding:16, marginBottom:12,
    borderWidth:1, borderColor:'rgba(180,220,200,0.5)',
    shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.06, shadowRadius:8, elevation:2,
  },
  mealSlotRow:   { flexDirection:'row', alignItems:'center', gap:8, marginBottom:8 },
  mealSlotIcon:  { fontSize:20 },
  mealSlotBadge: { backgroundColor:'#E8F5E9', borderRadius:8, paddingHorizontal:10, paddingVertical:4 },
  mealSlotTxt:   { fontSize:11, fontWeight:'700', color:'#1A6B5C' },
  mealName:      { fontSize:16, fontWeight:'800', color:navy, marginBottom:4 },
  mealDesc:      { fontSize:13, color:textSec, lineHeight:20 },

  tipsCard: {
    backgroundColor:'rgba(255,251,235,0.95)', borderRadius:16, padding:16, marginBottom:12,
    borderWidth:1, borderColor:'#FDE68A',
  },
  tipsTitleRow:  { flexDirection:'row', alignItems:'center', gap:8, marginBottom:10 },
  tipsLogo:      { width:60, height:24 },
  tipsTitle:     { fontSize:14, fontWeight:'700', color:'#B45309' },
  tipTxt:        { fontSize:13, color:'#78350F', lineHeight:20, marginBottom:4 },

  actionRow:  { flexDirection:'row', gap:10, marginBottom:12 },
  cancelBtn:  { flex:1, borderWidth:1.5, borderColor:'rgba(27,58,92,0.25)', borderRadius:14, paddingVertical:14, alignItems:'center' },
  cancelBtnTxt:{ fontSize:14, color:navy, fontWeight:'700' },
  regenBtn:   { flex:1, backgroundColor:navy, borderRadius:14, paddingVertical:14, alignItems:'center', justifyContent:'center' },
  regenBtnTxt:{ fontSize:14, color:white, fontWeight:'700' },
  wizardBtn:  { backgroundColor:'rgba(27,58,92,0.08)', borderRadius:14, paddingVertical:14, alignItems:'center', borderWidth:1, borderColor:'rgba(27,58,92,0.15)' },
  wizardBtnTxt:{ fontSize:14, color:navy, fontWeight:'600' },
});
