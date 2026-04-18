import React, { useEffect, useState } from 'react';
import {
  ImageBackground, Modal, Platform, SafeAreaView, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { router } from 'expo-router';
import { supabase, getSessionUser } from '../lib/supabase';
import { buttons } from '../constants/theme';
import { getHandoffPlan } from '../lib/planHandoff';
import type { MealPlanDayV4 } from '../lib/ai';

const NAVY = '#2E5480';
const TEAL = '#1A6B5C';

function formatDayLabel(day: MealPlanDayV4): string {
  const d = new Date(day.date + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
}

export default function PlanSummaryScreen() {
  const [plan, setPlan]             = useState<MealPlanDayV4[]>([]);
  const [familyName, setFamilyName] = useState('Your Family');
  const [showPopup, setShowPopup]   = useState(true);

  useEffect(() => {
    const handoff = getHandoffPlan();
    if (handoff) setPlan(handoff);

    (async () => {
      const user = await getSessionUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('family_name')
          .eq('id', user.id)
          .maybeSingle();
        if (profile?.family_name) setFamilyName(profile.family_name);
      }
    })();
  }, []);

  async function handleDownloadPDF() {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    try {
      const today = new Date();
      const dd    = String(today.getDate()).padStart(2, '0');
      const mm    = String(today.getMonth() + 1).padStart(2, '0');
      const yyyy  = today.getFullYear();

      // Convert MealPlanDayV4 to the anatomy format expected by /api/generate-pdf
      const apiDays = plan.map(day => ({
        date: day.date,
        day:  day.dayName,
        anatomy: {
          breakfast: { dishName: day.breakfast.dishName, ingredients: [] },
          lunch: {
            curry: [{ dishName: day.lunch.curry.dishName, ingredients: [] }],
            veg:   { dishName: day.lunch.sabzi.dishName,  ingredients: [] },
            raita: { dishName: day.lunch.raita.dishName,  ingredients: [] },
            bread: { dishName: day.lunch.bread.dishName,  ingredients: [] },
            rice:  { dishName: day.lunch.rice.dishName,   ingredients: [] },
          },
          dinner: {
            curry: [{ dishName: day.dinner.curry.dishName, ingredients: [] }],
            veg:   { dishName: day.dinner.sabzi.dishName,  ingredients: [] },
            raita: { dishName: day.dinner.raita.dishName,  ingredients: [] },
            bread: { dishName: day.dinner.bread.dishName,  ingredients: [] },
            rice:  { dishName: day.dinner.rice.dishName,   ingredients: [] },
          },
        },
      }));

      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          familyName,
          planData: { days: apiDays },
          dateFrom: plan[0]?.date,
          dateTo:   plan[plan.length - 1]?.date,
          planSummaryLanguage: 'English',
        }),
      });

      const blob = await response.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `maharaj-3day-plan-${dd}${mm}${yyyy}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('[PlanSummary] PDF error:', e);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <ImageBackground source={require('../assets/background.png')} style={p.bg} resizeMode="cover" />
      <SafeAreaView style={{ flex: 1 }}>

        {/* Nav row */}
        <View style={p.navRow}>
          <TouchableOpacity style={buttons.back} onPress={() => router.back()} activeOpacity={0.8}>
            <Text style={buttons.backText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={buttons.home} onPress={() => router.replace('/home')} activeOpacity={0.8}>
            <Text style={buttons.homeText}>Home</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <Text style={p.hero}>Your 3-day plan is ready, {familyName}</Text>
          <Text style={p.heroSub}>Here's your trailer. Download the PDF or explore on home.</Text>

          {/* Day cards */}
          {plan.map((day, i) => (
            <View key={i} style={p.dayCard}>
              <Text style={p.dayLabel}>{formatDayLabel(day)}</Text>
              <Text style={p.daySub}>{day.breakfast.cuisine}</Text>

              <Text style={p.sectionLabel}>BREAKFAST</Text>
              <Text style={p.dishLine}>{day.breakfast.dishName}</Text>

              <Text style={p.sectionLabel}>LUNCH</Text>
              <Text style={p.dishLine}><Text style={p.slotLabel}>Curry: </Text>{day.lunch.curry.dishName}</Text>
              <Text style={p.dishLine}><Text style={p.slotLabel}>Sabzi: </Text>{day.lunch.sabzi.dishName}</Text>
              <Text style={p.dishLine}><Text style={p.slotLabel}>Bread: </Text>{day.lunch.bread.dishName}</Text>
              <Text style={p.dishLine}><Text style={p.slotLabel}>Raita: </Text>{day.lunch.raita.dishName}</Text>
              <Text style={p.dishLine}><Text style={p.slotLabel}>Rice: </Text>{day.lunch.rice.dishName}</Text>

              <Text style={p.sectionLabel}>DINNER</Text>
              <Text style={p.dishLine}><Text style={p.slotLabel}>Curry: </Text>{day.dinner.curry.dishName}</Text>
              <Text style={p.dishLine}><Text style={p.slotLabel}>Sabzi: </Text>{day.dinner.sabzi.dishName}</Text>
              <Text style={p.dishLine}><Text style={p.slotLabel}>Bread: </Text>{day.dinner.bread.dishName}</Text>
              <Text style={p.dishLine}><Text style={p.slotLabel}>Raita: </Text>{day.dinner.raita.dishName}</Text>
              <Text style={p.dishLine}><Text style={p.slotLabel}>Rice: </Text>{day.dinner.rice.dishName}</Text>
            </View>
          ))}

          {/* Download CTA */}
          {Platform.OS === 'web' && (
            <TouchableOpacity style={p.downloadBtn} onPress={handleDownloadPDF} activeOpacity={0.85}>
              <Text style={p.downloadBtnText}>Download PDF</Text>
            </TouchableOpacity>
          )}

          {/* Home link */}
          <TouchableOpacity
            style={{ alignItems: 'center', marginTop: 16 }}
            onPress={() => router.replace('/home')}
            activeOpacity={0.8}
          >
            <Text style={p.homeLink}>Go to home →</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Popup — shows on mount, dismissed via buttons only */}
        <Modal visible={showPopup} transparent animationType="fade" onRequestClose={() => setShowPopup(false)}>
          <View style={p.popupOverlay}>
            <View style={p.popupCard}>
              <Text style={p.popupTitle}>Personalise your plans</Text>
              <Text style={p.popupBody}>
                Add family details so Maharaj can plan for everyone's health and preferences.
              </Text>
              <View style={p.popupButtons}>
                <TouchableOpacity
                  style={p.popupBtnOutline}
                  onPress={() => setShowPopup(false)}
                  activeOpacity={0.8}
                >
                  <Text style={p.popupBtnOutlineText}>Not now</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={p.popupBtnFilled}
                  onPress={() => { setShowPopup(false); router.push('/dietary-profile' as never); }}
                  activeOpacity={0.8}
                >
                  <Text style={p.popupBtnFilledText}>Add family details</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </View>
  );
}

const p = StyleSheet.create({
  bg:      { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  navRow:  { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },

  hero:    { fontSize: 22, fontWeight: '800', color: NAVY, marginTop: 16, marginBottom: 4 },
  heroSub: { fontSize: 14, color: '#5A7A8A', marginBottom: 20, lineHeight: 20 },

  dayCard:      { backgroundColor: 'rgba(255,255,255,0.90)', borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(46,84,128,0.18)', padding: 16, marginBottom: 14 },
  dayLabel:     { fontSize: 17, fontWeight: '800', color: NAVY, marginBottom: 2 },
  daySub:       { fontSize: 12, color: '#5A7A8A', marginBottom: 12 },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: '#6A8A9A', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 10, marginBottom: 4 },
  dishLine:     { fontSize: 14, color: NAVY, fontWeight: '500', lineHeight: 20, marginBottom: 2 },
  slotLabel:    { fontSize: 12, fontWeight: '400', color: '#6A8A9A' },

  downloadBtn:     { backgroundColor: TEAL, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  downloadBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  homeLink:        { fontSize: 15, color: TEAL, fontWeight: '600' },

  popupOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  popupCard:    { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, width: '100%' },
  popupTitle:   { fontSize: 16, fontWeight: '500', color: NAVY, marginBottom: 10 },
  popupBody:    { fontSize: 14, color: '#5A7A8A', lineHeight: 21, marginBottom: 20 },
  popupButtons: { flexDirection: 'row', gap: 10 },
  popupBtnOutline:     { flex: 1, borderWidth: 1.5, borderColor: '#9CA3AF', borderRadius: 10, paddingVertical: 12, alignItems: 'center', backgroundColor: '#FFFFFF' },
  popupBtnOutlineText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  popupBtnFilled:      { flex: 1, backgroundColor: NAVY, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  popupBtnFilledText:  { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
