import React, { useRef, useState } from 'react';
import {
  Image, ImageBackground, KeyboardAvoidingView, Modal, Platform,
  SafeAreaView, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
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
  const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081';
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
  return data?.content?.[0]?.text ?? '';
}

// ─── Screen ───────────────────────────────────────────────────────────────────

type ScreenMode = 'chat' | 'result';

export default function AskMaharajScreen() {
  const [screenMode,   setScreenMode]   = useState<ScreenMode>('chat');
  const [messages,     setMessages]     = useState<Message[]>([]);
  const [input,        setInput]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [mealResult,   setMealResult]   = useState<MealResult | null>(null);
  const [showMealModal,setShowMealModal]= useState(false);
  const [listening,    setListening]    = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // ── Load dietary profile for context ───────────────────────────────────────

  async function getProfileContext(): Promise<string> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return '';

      const [{ data: members }, { data: cuisines }] = await Promise.all([
        supabase.from('family_members').select('name, age, health_notes').eq('user_id', user.id),
        supabase.from('cuisine_preferences').select('cuisine_name').eq('user_id', user.id).eq('is_excluded', false),
      ]);

      const memberContext = (members ?? []).map((m: any) =>
        `${m.name} (${m.age}yo)${m.health_notes ? ': ' + m.health_notes : ''}`
      ).join('; ');

      const cuisineContext = (cuisines ?? []).map((c: any) => c.cuisine_name).join(', ');

      return [
        memberContext ? `Family members: ${memberContext}` : '',
        cuisineContext ? `Preferred cuisines: ${cuisineContext}` : '',
      ].filter(Boolean).join('\n');
    } catch {
      return '';
    }
  }

  // ── Send message ─────────────────────────────────────────────────────────

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');

    const userMsg: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    try {
      const profileCtx = await getProfileContext();
      const isMealRequest = /cook|make|prepare|suggest|plan|recipe|meal|breakfast|lunch|dinner|dish|food|thali|sabzi|dal|rice|roti/i.test(text);

      const systemPrompt = `You are Maharaj, a wise and authoritative Indian culinary AI mentor for the My Maharaj app. You are deeply knowledgeable about Indian regional cuisines, Ayurvedic nutrition, and the cultural history of food.

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

Always track health conditions from the profile when suggesting food. Never repeat dishes within the same response.`;

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
          setScreenMode('result');
        } catch {}
      }

      const cleanResponse = response.replace(/MEAL_JSON_START[\s\S]*?MEAL_JSON_END/g, '').trim();
      const assistantMsg: Message = { role: 'assistant', content: cleanResponse };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I apologize, I encountered an issue. Please try again.',
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
            <Text style={s.backTxt}>← Back</Text>
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>Ask Maharaj AI</Text>
            <Text style={s.headerSub}>Your Wise Nutrition Mentor</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/home' as never)} style={s.homeBtn}>
            <Text style={s.homeTxt}>Home</Text>
          </TouchableOpacity>
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
                  <View style={{flexDirection:"row",alignItems:"center",gap:6,marginBottom:4}}><Image source={require('../assets/logo.png')} style={{width:50,height:22}} resizeMode="contain" /><Text style={{fontSize:10,fontWeight:"700",color:"#1A6B5C"}}>Maharaj</Text></View>
                )}
                <Text style={[s.bubbleTxt, msg.role === 'user' ? s.bubbleTxtUser : s.bubbleTxtAI]}>
                  {msg.content}
                </Text>
              </View>
            ))}

            {loading && (
              <View style={[s.bubble, s.bubbleAI]}>
                <View style={{flexDirection:"row",alignItems:"center",gap:6,marginBottom:4}}><Image source={require('../assets/logo.png')} style={{width:50,height:22}} resizeMode="contain" /><Text style={{fontSize:10,fontWeight:"700",color:"#1A6B5C"}}>Maharaj</Text></View>
                <ActivityIndicator color={navy} size="small" style={{ marginTop: 4 }} />
                <Text style={[s.bubbleTxt, s.bubbleTxtAI, { fontStyle: 'italic', marginTop: 4 }]}>
                  Consulting ancient wisdom...
                </Text>
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

        {/* ── Meal Result Modal ── */}
        <Modal
          visible={screenMode === 'result'}
          animationType="slide"
          transparent
          onRequestClose={() => setScreenMode('chat')}
        >
          <View style={s.modalOverlay}>
            <View style={s.modalBox}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>{mealResult?.title ?? 'Your Meal Plan'}</Text>
                <TouchableOpacity onPress={() => setScreenMode('chat')}>
                  <Text style={s.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {mealResult?.meals.map((meal, i) => (
                  <View key={i} style={s.mealCard}>
                    <View style={s.mealSlotBadge}>
                      <Text style={s.mealSlotTxt}>
                        {meal.slot}
                      </Text>
                    </View>
                    <Text style={s.mealName}>{meal.name}</Text>
                    <Text style={s.mealDesc}>{meal.description}</Text>
                  </View>
                ))}

                {mealResult?.tips && mealResult.tips.length > 0 && (
                  <View style={s.tipsCard}>
                    <Text style={s.tipsTitle}>Maharaj's Tips</Text>
                    {mealResult.tips.map((tip, i) => (
                      <Text key={i} style={s.tipTxt}>• {tip}</Text>
                    ))}
                  </View>
                )}

                <View style={{flexDirection:'row',gap:10,marginTop:8,marginBottom:8}}>
                  <TouchableOpacity style={{flex:1,borderWidth:1.5,borderColor:'rgba(27,58,92,0.25)',borderRadius:12,paddingVertical:12,alignItems:'center'}} onPress={()=>setScreenMode('chat')}>
                    <Text style={{fontSize:13,fontWeight:'600',color:'#1B3A5C'}}>Close</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{flex:1,backgroundColor:'#1B3A5C',borderRadius:12,paddingVertical:12,alignItems:'center'}} onPress={async()=>{setScreenMode('chat');setMealResult(null);}}>
                    <Text style={{fontSize:13,fontWeight:'600',color:'white'}}>New Question</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={s.goToWizardBtn}
                  onPress={() => { setScreenMode('chat'); router.push('/meal-wizard' as never); }}
                >
                  <Text style={s.goToWizardTxt}>Generate Full Weekly Plan →</Text>
                </TouchableOpacity>

                <View style={{ height: 20 }} />
              </ScrollView>
            </View>
          </View>
        </Modal>

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
  suggestions:   { width:'100%', gap:8 },
  suggChip:      { backgroundColor:'rgba(255,255,255,0.9)', borderRadius:12, padding:12, borderWidth:1, borderColor:border },
  suggTxt:       { fontSize:13, color:navy, fontWeight:'500' },

  bubble:       { marginBottom:12, maxWidth:'88%' },
  bubbleUser:   { alignSelf:'flex-end', backgroundColor:navy, borderRadius:18, borderBottomRightRadius:4, padding:14 },
  bubbleAI:     { alignSelf:'flex-start', backgroundColor:'rgba(255,255,255,0.92)', borderRadius:18, borderBottomLeftRadius:4, padding:14, borderWidth:1, borderColor:border },
  bubbleLabel:  { fontSize:10, fontWeight:'700', color:textSec, marginBottom:4 },
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
    outlineStyle:'none',
  } as any,
  sendBtn: {
    width:44, height:44, borderRadius:22, backgroundColor:navy,
    alignItems:'center', justifyContent:'center',
  },
  sendTxt: { fontSize:20, color:white, fontWeight:'700', lineHeight:24 },

  // Modal
  modalOverlay: { flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'flex-end' },
  modalBox: {
    backgroundColor:white, borderTopLeftRadius:24, borderTopRightRadius:24,
    maxHeight:'80%', padding:20,
  },
  modalHeader:  { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:16 },
  modalTitle:   { fontSize:18, fontWeight:'800', color:navy, flex:1 },
  modalClose:   { fontSize:18, color:textSec, paddingLeft:12 },

  mealCard: {
    backgroundColor:'#F8FFFE', borderRadius:14, padding:14, marginBottom:10,
    borderWidth:1, borderColor:border,
  },
  mealSlotBadge:{ alignSelf:'flex-start', backgroundColor:'#E8F5E9', borderRadius:8, paddingHorizontal:10, paddingVertical:4, marginBottom:6 },
  mealSlotTxt:  { fontSize:11, fontWeight:'700', color:'#1A6B5C' },
  mealName:     { fontSize:15, fontWeight:'800', color:navy, marginBottom:4 },
  mealDesc:     { fontSize:13, color:textSec, lineHeight:20 },

  tipsCard:   { backgroundColor:'#FFFBEB', borderRadius:14, padding:14, marginBottom:10, borderWidth:1, borderColor:'#FDE68A' },
  tipsTitle:  { fontSize:13, fontWeight:'700', color:'#B45309', marginBottom:8 },
  tipTxt:     { fontSize:13, color:'#78350F', lineHeight:20, marginBottom:4 },

  goToWizardBtn: { backgroundColor:navy, borderRadius:14, paddingVertical:16, alignItems:'center', marginTop:4 },
  goToWizardTxt: { color:white, fontWeight:'700', fontSize:15 },
});
