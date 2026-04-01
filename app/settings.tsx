import React, { useEffect, useState } from 'react';
import {
  Image, ImageBackground, Modal, Platform, SafeAreaView, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, getSessionUser } from '../lib/supabase';
import { GROCERY_DAYS } from '../lib/constants';
import { session } from '../lib/session';
import { navy, gold, white, textSec, border, errorRed } from '../theme/colors';

interface SettingsItem {
  label: string;
  route?: string;
  onPress?: () => void;
  right?: string;
  danger?: boolean;
}

export default function SettingsScreen() {
  const [groceryDay, setGroceryDay] = useState('Saturday');
  const [showGroceryModal, setShowGroceryModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('maharaj_grocery_day').then(val => {
      if (val) setGroceryDay(val);
    });
  }, []);

  async function saveGroceryDay(day: string) {
    setGroceryDay(day);
    session.groceryDay = day;
    setShowGroceryModal(false);
    await AsyncStorage.setItem('maharaj_grocery_day', day);
    try {
      const user = await getSessionUser();
      if (user) {
        await supabase.from('profiles').update({ grocery_day: day }).eq('id', user.id);
      }
    } catch {
      // Column may not exist yet — silently ignore
    }
  }

  async function doLogout() {
    setShowLogoutModal(false);
    await supabase.auth.signOut();
    router.replace('/');
  }

  function Row({ item }: { item: SettingsItem }) {
    return (
      <TouchableOpacity
        style={s.row}
        onPress={item.onPress ?? (() => item.route && router.push(item.route as never))}
        activeOpacity={0.7}
      >
        <Text style={[s.rowLabel, item.danger && s.rowLabelDanger]}>{item.label}</Text>
        <View style={s.rowRight}>
          {item.right ? <Text style={s.rowRightText}>{item.right}</Text> : null}
          {!item.danger && <Text style={s.chevron}>></Text>}
        </View>
      </TouchableOpacity>
    );
  }

  const sections: { title: string; items: SettingsItem[] }[] = [
    {
      title: 'Account',
      items: [
        { label: 'Edit Profile', route: '/profile-setup' },
        { label: 'Language', route: '/language-select' },
      ],
    },
    {
      title: 'Family',
      items: [
        { label: 'Family Members', route: '/dietary-profile' },
        { label: 'Lab Reports', route: '/lab-report' },
        { label: 'Cuisine Preferences', route: '/cuisine-selection' },
        { label: 'Grocery Day', right: groceryDay, onPress: () => setShowGroceryModal(true) },
      ],
    },
    {
      title: 'Legal',
      items: [
        { label: 'Legal & Privacy', route: '/disclaimer' },
      ],
    },
    {
      title: 'Danger Zone',
      items: [
        { label: 'Logout', danger: true, onPress: () => setShowLogoutModal(true) },
      ],
    },
  ];

  return (
    <ImageBackground source={require('../assets/background.png')} style={{ flex: 1 }} resizeMode="cover">
      <SafeAreaView style={s.safe}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backTxt}>Back</Text>
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Image source={require('../assets/logo.png')} style={s.logo} resizeMode="contain" />
            <Image source={require('../assets/blueflute-logo.png')} style={s.bfLogo} resizeMode="contain" />
          </View>
          <Image source={require('../assets/blueflute-logo.png')} style={s.bfLogoHeader} resizeMode="contain" />
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <Text style={s.title}>Settings</Text>

          {sections.map(section => (
            <View key={section.title} style={s.section}>
              <Text style={s.sectionTitle}>{section.title.toUpperCase()}</Text>
              {section.items.map(item => (
                <Row key={item.label} item={item} />
              ))}
            </View>
          ))}

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Grocery Day Modal */}
        <Modal visible={showGroceryModal} transparent animationType="fade">
          <View style={s.modalOverlay}>
            <View style={s.modalBox}>
              <Text style={s.modalTitle}>Choose Grocery Day</Text>
              <Text style={s.modalSub}>Your weekly plan will be ready before this day</Text>
              <View style={s.dayGrid}>
                {GROCERY_DAYS.map(day => (
                  <TouchableOpacity
                    key={day}
                    style={[s.dayChip, groceryDay === day && s.dayChipActive]}
                    onPress={() => saveGroceryDay(day)}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.dayChipText, groceryDay === day && s.dayChipTextActive]}>
                      {day.slice(0, 3)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={s.modalCancel} onPress={() => setShowGroceryModal(false)}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Logout Confirmation Modal */}
        <Modal visible={showLogoutModal} transparent animationType="fade">
          <View style={s.modalOverlay}>
            <View style={s.modalBox}>
              <Text style={s.modalTitle}>Logout</Text>
              <Text style={s.modalSub}>Are you sure you want to logout?</Text>
              <View style={s.modalBtns}>
                <TouchableOpacity style={s.btnCancel} onPress={() => setShowLogoutModal(false)}>
                  <Text style={s.btnCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.btnDanger} onPress={doLogout}>
                  <Text style={s.btnDangerText}>Logout</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ImageBackground>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 25 : Platform.OS === 'web' ? 14 : 8,
    paddingBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(27,58,92,0.1)',
  },
  backBtn: { paddingRight: 8, minWidth: 50 },
  backTxt: { fontSize: 15, color: navy, fontWeight: '600' },
  headerCenter: { alignItems: 'center', flex: 1 },
  logo: { width: 140, height: 46 },
  bfLogo: { width: 80, height: 16, marginTop: 2 },
  bfLogoHeader: { width: 80, height: 28 },
  scroll: { padding: 20, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: '800', color: navy, marginBottom: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: textSec, letterSpacing: 1, marginBottom: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 12, padding: 16,
    marginBottom: 6, borderWidth: 1, borderColor: 'rgba(27,58,92,0.08)',
  },
  rowLabel: { fontSize: 15, fontWeight: '600', color: navy },
  rowLabelDanger: { color: errorRed },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowRightText: { fontSize: 13, color: textSec, fontWeight: '500' },
  chevron: { fontSize: 16, color: '#D1D5DB', fontWeight: '300' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  modalBox: { backgroundColor: white, borderRadius: 20, padding: 24, width: 300, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: navy, marginBottom: 4 },
  modalSub: { fontSize: 14, color: textSec, marginBottom: 20, lineHeight: 20 },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  dayChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: border, backgroundColor: white },
  dayChipActive: { backgroundColor: navy, borderColor: navy },
  dayChipText: { fontSize: 14, fontWeight: '600', color: navy },
  dayChipTextActive: { color: white },
  modalCancel: { alignItems: 'center', paddingVertical: 10 },
  modalCancelText: { fontSize: 14, color: textSec, fontWeight: '500' },
  modalBtns: { flexDirection: 'row', gap: 12 },
  btnCancel: { flex: 1, borderWidth: 1.5, borderColor: border, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  btnCancelText: { fontSize: 14, color: navy, fontWeight: '600' },
  btnDanger: { flex: 1, backgroundColor: errorRed, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  btnDangerText: { fontSize: 14, color: white, fontWeight: '700' },
});
