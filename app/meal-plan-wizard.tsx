import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Platform } from 'react-native';
import { router } from 'expo-router';
import { navy, gold, white, midGray } from '../theme/colors';

export default function MealPlanWizardScreen() {
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.backText}>Back</Text></TouchableOpacity>
        <Text style={s.headerTitle}>Generate Meal Plan</Text>
        <View style={{ width: 60 }} />
      </View>
      <View style={s.center}>
        <Text style={s.icon}></Text>
        <Text style={s.title}>Meal Plan Wizard</Text>
        <Text style={s.desc}>The full meal plan wizard is coming in the next sprint. It will include period selection, food preferences, AI generation with Gemini, and more.</Text>
        <TouchableOpacity style={s.btn} onPress={() => router.back()}>
          <Text style={s.btnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F6FB' },
  header: { backgroundColor: navy, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'web' ? 20 : 14, paddingBottom: 16 },
  backText: { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '500', width: 60 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  icon: { fontSize: 64, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '800', color: navy, marginBottom: 12 },
  desc: { fontSize: 15, color: midGray, textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  btn: { backgroundColor: gold, borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14 },
  btnText: { color: white, fontSize: 15, fontWeight: '700' },
});
