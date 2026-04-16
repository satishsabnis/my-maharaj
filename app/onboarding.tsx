import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Image, ImageBackground, KeyboardAvoidingView, Platform,
  SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../constants/theme';
import { track } from '../lib/analytics';

// ─── Claude proxy ─────────────────────────────────────────────────────────────

async function callClaude(userMessage: string): Promise<{ reply: string; extracted: Record<string, string> }> {
  const systemPrompt = `You are Maharaj, a warm and friendly Indian meal planning assistant.
The user is a new family setting up their meal preferences.
Extract these fields from their message (JSON in your reply):
- family_size: number of people (default "4" if not mentioned)
- food_preference: "veg" or "nonveg" (default "veg" if unclear)
- community: community name if mentioned (e.g. "Konkani", "Punjabi", "GSB") or ""
- avoidance_list: comma-separated foods to avoid, or ""

Reply warmly in 2-3 sentences confirming what you understood, then output this JSON block on a new line:
EXTRACTED:{"family_size":"4","food_preference":"veg","community":"","avoidance_list":""}

Never use markdown. Always end your reply with the EXTRACTED: line.`;

  const res = await fetch('https://my-maharaj.vercel.app/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-maharaj-secret': process.env.EXPO_PUBLIC_MAHARAJ_API_SECRET },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });
  const data = await res.json();
  const raw: string = data?.content?.[0]?.text ?? '';

  // Parse reply and extracted JSON
  const extractedMatch = raw.match(/EXTRACTED:\s*(\{.*\})/s);
  let extracted: Record<string, string> = { family_size: '4', food_preference: 'veg', community: '', avoidance_list: '' };
  if (extractedMatch) {
    try { extracted = JSON.parse(extractedMatch[1]); } catch {}
  }
  const reply = raw.replace(/EXTRACTED:\s*\{.*\}/s, '').trim();
  return { reply, extracted };
}

// ─── Day chips ────────────────────────────────────────────────────────────────

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getDateForDay(dayAbbr: string): string {
  const dayMap: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };
  const today = new Date();
  const todayDay = today.getDay();
  const target = dayMap[dayAbbr];
  let diff = target - todayDay;
  if (diff < 0) diff += 7;
  const d = new Date(today);
  d.setDate(today.getDate() + diff);
  return d.toISOString().split('T')[0];
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const pulse = useRef(new Animated.Value(1)).current;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [maharajReply, setMaharajReply] = useState('');
  const [extracted, setExtracted] = useState<Record<string, string>>({});
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  // Pulsing logo
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  function scrollToStep(s: 1 | 2 | 3) {
    setStep(s);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  async function handleSend() {
    if (!userInput.trim() || loading) return;
    setLoading(true);
    try {
      const { reply, extracted: ext } = await callClaude(userInput.trim());
      setExtracted(ext);
      setMaharajReply(reply);
      // Save extracted preferences to AsyncStorage
      await AsyncStorage.setItem('family_size', ext.family_size ?? '4');
      await AsyncStorage.setItem('food_preference', ext.food_preference ?? 'veg');
      await AsyncStorage.setItem('community', ext.community ?? '');
      await AsyncStorage.setItem('avoidance_list', ext.avoidance_list ?? '');
      scrollToStep(3);
    } catch {
      setMaharajReply('I understood! Let us plan your first week of meals together.');
      setExtracted({ family_size: '4', food_preference: 'veg', community: '', avoidance_list: '' });
      scrollToStep(3);
    } finally {
      setLoading(false);
    }
  }

  function toggleDay(day: string) {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  }

  async function handleGeneratePlan() {
    const orderedDays = DAYS.filter(d => selectedDays.includes(d));
    const dates = orderedDays.map(getDateForDay);

    await AsyncStorage.setItem('onboarding_complete', 'true');
    track('onboarding_completed', {
      family_size: extracted.family_size ?? '4',
      food_preference: extracted.food_preference ?? 'veg',
    });

    // Navigate to meal-wizard, passing pre-selected dates and skipping intro
    router.replace(`/meal-wizard?onboarding=1&dates=${encodeURIComponent(JSON.stringify(dates))}` as never);
  }

  return (
    <View style={{ flex: 1 }}>
      <ImageBackground
        source={require('../assets/background.png')}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
        resizeMode="cover"
      />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={s.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >

            {/* STEP 1 — Welcome */}
            <View style={s.step}>
              <Animated.View style={{ transform: [{ scale: pulse }] }}>
                <Image source={require('../assets/logo.png')} style={s.logo} resizeMode="contain" />
              </Animated.View>
              <Text style={s.headline}>Namaste. I am your Maharaj.</Text>
              <Text style={s.sub}>Tell me about your family and I will plan your first week of meals.</Text>
              <TouchableOpacity style={s.btnEmerald} onPress={() => scrollToStep(2)} activeOpacity={0.85}>
                <Text style={s.btnEmeraldText}>Let us begin</Text>
              </TouchableOpacity>
            </View>

            {/* STEP 2 — Family Setup */}
            {step >= 2 && (
              <View style={s.step}>
                {/* Maharaj opening */}
                <View style={s.maharajBubble}>
                  <Text style={s.maharajText}>
                    {"What is your family's name? How many people eat together? Any dietary preferences I should know — vegetarian, non-vegetarian, any foods to avoid?"}
                  </Text>
                </View>

                {maharajReply ? (
                  <View style={[s.maharajBubble, { marginTop: 8 }]}>
                    <Text style={s.maharajText}>{maharajReply}</Text>
                  </View>
                ) : (
                  <View style={s.inputRow}>
                    <TextInput
                      style={s.input}
                      value={userInput}
                      onChangeText={setUserInput}
                      placeholder="e.g. Sabnis family, 4 of us, mostly veg but eggs OK..."
                      placeholderTextColor={colors.textMuted}
                      multiline
                      returnKeyType="send"
                      onSubmitEditing={handleSend}
                    />
                    <TouchableOpacity
                      style={[s.sendBtn, (!userInput.trim() || loading) && { opacity: 0.4 }]}
                      onPress={handleSend}
                      disabled={!userInput.trim() || loading}
                      activeOpacity={0.8}
                    >
                      <Text style={s.sendBtnText}>{loading ? '...' : '\u27A4'}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* STEP 3 — Day selection */}
            {step >= 3 && (
              <View style={s.step}>
                <View style={s.maharajBubble}>
                  <Text style={s.maharajText}>Which days shall I plan for you this week?</Text>
                </View>

                <View style={s.dayChips}>
                  {DAYS.map(day => (
                    <TouchableOpacity
                      key={day}
                      style={[s.chip, selectedDays.includes(day) && s.chipSelected]}
                      onPress={() => toggleDay(day)}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.chipText, selectedDays.includes(day) && s.chipTextSelected]}>{day}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={[s.btnGold, selectedDays.length === 0 && { opacity: 0.4 }]}
                  onPress={handleGeneratePlan}
                  disabled={selectedDays.length === 0}
                  activeOpacity={0.85}
                >
                  <Text style={s.btnGoldText}>Generate My First Plan</Text>
                </TouchableOpacity>
              </View>
            )}

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  scroll:           { paddingHorizontal: 24, paddingBottom: 48 },
  step:             { alignItems: 'center', paddingVertical: 40 },
  logo:             { width: 120, height: 120, marginBottom: 24 },
  headline:         { fontSize: 20, fontWeight: '800', color: colors.navy, textAlign: 'center', marginBottom: 10 },
  sub:              { fontSize: 14, color: colors.teal, textAlign: 'center', lineHeight: 22, marginBottom: 32, paddingHorizontal: 8 },
  btnEmerald:       { backgroundColor: colors.emerald, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40, alignSelf: 'center' },
  btnEmeraldText:   { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  maharajBubble:    { backgroundColor: '#EBF3FB', borderRadius: 16, padding: 16, alignSelf: 'stretch', marginBottom: 12 },
  maharajText:      { fontSize: 14, color: colors.navy, lineHeight: 22 },
  inputRow:         { flexDirection: 'row', alignSelf: 'stretch', alignItems: 'flex-end', gap: 8, marginTop: 8 },
  input:            { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1.5, borderColor: '#D1DCE8', paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: colors.navy, minHeight: 48, maxHeight: 120 },
  sendBtn:          { backgroundColor: colors.navy, borderRadius: 12, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  sendBtnText:      { fontSize: 18, color: '#FFFFFF' },
  dayChips:         { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginVertical: 20 },
  chip:             { borderWidth: 1.5, borderColor: colors.navy, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 8 },
  chipSelected:     { backgroundColor: colors.navy },
  chipText:         { fontSize: 13, fontWeight: '600', color: colors.navy },
  chipTextSelected: { color: '#FFFFFF' },
  btnGold:          { backgroundColor: colors.gold, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40, alignSelf: 'center', marginTop: 8 },
  btnGoldText:      { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
});
