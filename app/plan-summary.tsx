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
  const wd  = d.toLocaleDateString('en-GB', { weekday: 'short' });
  const dt  = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `${wd}\n${dt}`;
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

          {/* Landscape table */}
          <Text style={p.scrollHint}>← scroll right for full plan →</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            <View>
              <View style={p.tableHeader}>
                <View style={p.cDay}><Text style={p.headerTxt}>Day</Text></View>
                <View style={p.cBreakfast}><Text style={p.headerTxt}>Breakfast</Text></View>
                <View style={p.cLunch}><Text style={p.headerTxt}>Lunch</Text></View>
                <View style={p.cDinner}><Text style={p.headerTxt}>Dinner</Text></View>
                <View style={p.cSupporting}><Text style={p.headerTxt}>Supporting</Text></View>
                <View style={p.cEvening}><Text style={p.headerTxt}>Eve</Text></View>
              </View>
              {plan.map((day, i) => (
                <View key={i} style={[p.tableRow, { backgroundColor: (['#FFF8E1', '#E8F5E9', '#FFFFFF'] as string[])[i] ?? '#FFFFFF' }]}>
                  <View style={p.cDay}>
                    <Text style={p.dayCell}>{formatDayLabel(day)}</Text>
                  </View>
                  <View style={p.cBreakfast}>
                    <Text style={p.mainDish} numberOfLines={2}>{day.breakfast.dishName}</Text>
                    <Text style={p.subDish} numberOfLines={1}>{day.breakfast.cuisine}</Text>
                  </View>
                  <View style={p.cLunch}>
                    <Text style={p.mainDish} numberOfLines={2}>{day.lunch.curry.dishName}</Text>
                    <Text style={p.subDish} numberOfLines={1}>{day.lunch.sabzi.dishName}</Text>
                  </View>
                  <View style={p.cDinner}>
                    <Text style={p.mainDish} numberOfLines={2}>{day.dinner.curry.dishName}</Text>
                    <Text style={p.subDish} numberOfLines={1}>{day.dinner.sabzi.dishName}</Text>
                  </View>
                  <View style={p.cSupporting}>
                    <Text style={p.supportRow} numberOfLines={1}><Text style={p.supportLbl}>VEG  </Text>{day.lunch.sabzi.dishName}</Text>
                    <Text style={p.supportRow} numberOfLines={1}><Text style={p.supportLbl}>RAITA  </Text>{day.lunch.raita.dishName}</Text>
                    <Text style={p.supportRow} numberOfLines={1}><Text style={p.supportLbl}>BREAD  </Text>{day.lunch.bread.dishName}</Text>
                    <Text style={p.supportRow} numberOfLines={1}><Text style={p.supportLbl}>RICE  </Text>{day.lunch.rice.dishName}</Text>
                  </View>
                  <View style={p.cEvening}>
                    <Text style={p.subDish}>—</Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

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
  heroSub: { fontSize: 14, color: '#5A7A8A', marginBottom: 10, lineHeight: 20 },

  scrollHint: { fontSize: 12, color: '#8AAABB', textAlign: 'center', marginBottom: 10, letterSpacing: 0.3 },

  tableHeader:  { flexDirection: 'row', backgroundColor: NAVY, borderTopLeftRadius: 8, borderTopRightRadius: 8, overflow: 'hidden' },
  tableRow:     { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(46,84,128,0.10)' },
  headerTxt:    { fontSize: 10, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.6, textTransform: 'uppercase', textAlign: 'center' as const },

  cDay:         { width: 90,  padding: 8, justifyContent: 'center' as const, borderRightWidth: 1, borderRightColor: 'rgba(46,84,128,0.12)' },
  cBreakfast:   { width: 150, padding: 8, justifyContent: 'center' as const, borderRightWidth: 1, borderRightColor: 'rgba(46,84,128,0.12)' },
  cLunch:       { width: 190, padding: 8, justifyContent: 'center' as const, borderRightWidth: 1, borderRightColor: 'rgba(46,84,128,0.12)' },
  cDinner:      { width: 190, padding: 8, justifyContent: 'center' as const, borderRightWidth: 1, borderRightColor: 'rgba(46,84,128,0.12)' },
  cSupporting:  { width: 210, padding: 8, justifyContent: 'center' as const, borderRightWidth: 1, borderRightColor: 'rgba(46,84,128,0.12)' },
  cEvening:     { width: 70,  padding: 8, justifyContent: 'center' as const },

  dayCell:    { fontSize: 12, fontWeight: '700', color: NAVY, lineHeight: 17 },
  mainDish:   { fontSize: 13, fontWeight: '700', color: NAVY, lineHeight: 18, marginBottom: 2 },
  subDish:    { fontSize: 11, color: '#5A7A8A', lineHeight: 15 },
  supportRow: { fontSize: 11, color: NAVY, lineHeight: 17 },
  supportLbl: { fontSize: 9, fontWeight: '600', color: '#6A8A9A', letterSpacing: 0.4 },

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
