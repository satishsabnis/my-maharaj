import React, { useState } from 'react';
import {
  ImageBackground, Linking, Modal, Platform, SafeAreaView,
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { router } from 'expo-router';
import { navy, gold, white, textSec, border } from '../theme/colors';
import DeliveryAppsSection from '../components/DeliveryApps';

// ─── Locales ──────────────────────────────────────────────────────────────────

const LOCALES: Record<string, {
  flag: string; name: string; currency: string;
  apps: { name: string; icon: string; url: string; color: string; available: boolean }[];
}> = {
  UAE: {
    flag:'', name:'UAE', currency:'AED',
    apps: [
      { name:'Talabat',  icon:'', url:'https://www.talabat.com',  color:'#FF6B35', available:true },
      { name:'Careem',   icon:'', url:'https://www.careem.com/en-ae/food/',   color:'#1DBF73', available:true },
      { name:'Noon Food',icon:'', url:'https://www.noon.com/uae-en/food/',    color:'#FEEE00', available:true },
      { name:'Keeta',    icon:'', url:'https://www.keeta.com',    color:'#FF4500', available:true },
    ],
  },
  IN: {
    flag:'', name:'India', currency:'INR',
    apps: [
      { name:'Swiggy',   icon:'', url:'https://www.swiggy.com',   color:'#FC8019', available:true },
      { name:'Zomato',   icon:'', url:'https://www.zomato.com',   color:'#E23744', available:true },
      { name:'Blinkit',  icon:'', url:'https://www.blinkit.com',  color:'#0C831F', available:true },
      { name:'Zepto',    icon:'', url:'https://www.zeptonow.com', color:'#8B5CF6', available:true },
    ],
  },
  UK: {
    flag:'', name:'UK', currency:'GBP',
    apps: [
      { name:'Deliveroo', icon:'', url:'https://deliveroo.co.uk',  color:'#00CCBC', available:true },
      { name:'Just Eat',  icon:'', url:'https://www.just-eat.co.uk',color:'#FF8000', available:true },
      { name:'Uber Eats', icon:'', url:'https://www.ubereats.com/gb',color:'#06C167', available:true },
    ],
  },
  US: {
    flag:'', name:'USA', currency:'USD',
    apps: [
      { name:'DoorDash',  icon:'', url:'https://www.doordash.com', color:'#FF3008', available:true },
      { name:'Uber Eats', icon:'', url:'https://www.ubereats.com', color:'#06C167', available:true },
      { name:'Grubhub',   icon:'', url:'https://www.grubhub.com',  color:'#F63440', available:true },
    ],
  },
  CA: {
    flag:'', name:'Canada', currency:'CAD',
    apps: [
      { name:'SkipTheDishes', icon:'', url:'https://www.skipthedishes.com', color:'#FFB800', available:true },
      { name:'Uber Eats',     icon:'', url:'https://www.ubereats.com/ca',   color:'#06C167', available:true },
      { name:'DoorDash',      icon:'', url:'https://www.doordash.com',      color:'#FF3008', available:true },
    ],
  },
};

const DEFAULT_LOCALE = 'UAE';

// ─── Screen ───────────────────────────────────────────────────────────────────

interface Props { mealName?: string; }

export default function OrderOutScreen({ mealName }: Props) {
  const [locale,       setLocale]       = useState(DEFAULT_LOCALE);
  const [showLocale,   setShowLocale]   = useState(false);

  const currentLocale = LOCALES[locale];

  async function openApp(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      // fallback — open in browser
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      }
    }
  }

  return (
    <ImageBackground
      source={require('../assets/background.png')}
      style={s.bg}
      resizeMode="cover"
    >
      <SafeAreaView style={s.safe}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.backTxt}>Back</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Order Out</Text>
          <TouchableOpacity onPress={() => router.push('/home' as never)}>
            <Text style={s.homeTxt}></Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* Dish context */}
          {mealName && (
            <View style={s.dishBanner}>
              <Text style={s.dishEmoji}></Text>
              <View>
                <Text style={s.dishLabel}>Ordering for</Text>
                <Text style={s.dishName}>{mealName}</Text>
              </View>
            </View>
          )}

          {/* Locale selector */}
          <View style={s.localeRow}>
            <Text style={s.localeLabel}>Delivery region:</Text>
            <TouchableOpacity style={s.localePicker} onPress={() => setShowLocale(true)}>
              <Text style={s.localeFlag}>{currentLocale.flag}</Text>
              <Text style={s.localeName}>{currentLocale.name}</Text>
              <Text style={s.localeChevron}>▾</Text>
            </TouchableOpacity>
          </View>

          {/* Note */}
          <View style={s.noteBanner}>
            <Text style={s.noteIcon}></Text>
            <Text style={s.noteTxt}>
              Integration coming soon. Tapping below opens the app/website to complete your order.
            </Text>
          </View>

          {/* App buttons */}
          <Text style={s.sectionTitle}>Available in {currentLocale.name}</Text>
          {currentLocale.apps.map((app) => (
            <TouchableOpacity
              key={app.name}
              style={[s.appBtn, { borderLeftColor: app.color }]}
              onPress={() => openApp(app.url)}
              activeOpacity={0.85}
            >
              <View style={[s.appIconWrap, { backgroundColor: app.color + '20' }]}>
                <Text style={s.appIcon}>{app.icon}</Text>
              </View>
              <View style={s.appInfo}>
                <Text style={s.appName}>{app.name}</Text>
                <Text style={s.appSub}>Tap to order →</Text>
              </View>
              <Text style={s.appArrow}>›</Text>
            </TouchableOpacity>
          ))}

          {/* Grocery delivery apps */}
          <DeliveryAppsSection country={currentLocale.name} title="Grocery & ingredient delivery" compact />

          {/* Cook at home option */}
          <TouchableOpacity
            style={[s.cookBtn, { marginTop: 20 }]}
            onPress={() => router.back()}
          >
            <Text style={s.cookIcon}></Text>
            <Text style={s.cookTxt}>Cook at Home Instead</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.cookBtn, { marginTop: 8, borderColor: 'rgba(27,58,92,0.15)' }]}
            onPress={() => router.push('/home' as never)}
          >
            <Text style={s.cookTxt}>Back to Home</Text>
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </ScrollView>

        {/* Locale modal */}
        <Modal visible={showLocale} transparent animationType="slide" onRequestClose={() => setShowLocale(false)}>
          <View style={s.modalOverlay}>
            <View style={s.modalBox}>
              <Text style={s.modalTitle}>Select your region</Text>
              {Object.entries(LOCALES).map(([key, loc]) => (
                <TouchableOpacity
                  key={key}
                  style={[s.localeOption, locale === key && s.localeOptionActive]}
                  onPress={() => { setLocale(key); setShowLocale(false); }}
                >
                  <Text style={s.localeOptionFlag}>{loc.flag}</Text>
                  <Text style={[s.localeOptionName, locale === key && { color: navy, fontWeight: '700' }]}>
                    {loc.name}
                  </Text>
                  {locale === key && <Text style={s.checkmark}>✓</Text>}
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={s.modalClose} onPress={() => setShowLocale(false)}>
                <Text style={s.modalCloseTxt}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </ImageBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  bg:   { flex:1 },
  safe: { flex:1 },

  header: {
    flexDirection:'row', alignItems:'center', justifyContent:'space-between',
    paddingHorizontal:16, paddingTop: Platform.OS === 'web' ? 16 : 10, paddingBottom:12,
    backgroundColor:'rgba(255,255,255,0.85)',
    borderBottomWidth:1, borderBottomColor:'rgba(27,58,92,0.1)',
  },
  backTxt:     { fontSize:15, color:navy, fontWeight:'600' },
  headerTitle: { fontSize:17, fontWeight:'800', color:navy },
  homeTxt:     { fontSize:22 },

  scroll: { padding:16 },

  dishBanner: {
    flexDirection:'row', alignItems:'center', gap:12,
    backgroundColor:'rgba(255,255,255,0.9)', borderRadius:16, padding:16, marginBottom:16,
    borderWidth:1, borderColor:border,
  },
  dishEmoji: { fontSize:32 },
  dishLabel: { fontSize:11, color:textSec, fontWeight:'600', textTransform:'uppercase' },
  dishName:  { fontSize:16, fontWeight:'800', color:navy },

  localeRow:    { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:12 },
  localeLabel:  { fontSize:14, color:navy, fontWeight:'600' },
  localePicker: { flexDirection:'row', alignItems:'center', gap:8, backgroundColor:'rgba(255,255,255,0.9)', borderRadius:12, paddingHorizontal:14, paddingVertical:10, borderWidth:1, borderColor:border },
  localeFlag:   { fontSize:20 },
  localeName:   { fontSize:14, fontWeight:'700', color:navy },
  localeChevron:{ fontSize:12, color:textSec },

  noteBanner: {
    flexDirection:'row', gap:10, alignItems:'flex-start',
    backgroundColor:'rgba(201,162,39,0.12)', borderRadius:12, padding:12, marginBottom:20,
    borderWidth:1, borderColor:'rgba(201,162,39,0.3)',
  },
  noteIcon: { fontSize:18 },
  noteTxt:  { flex:1, fontSize:12, color:'#78350F', lineHeight:18 },

  sectionTitle: { fontSize:13, fontWeight:'700', color:textSec, textTransform:'uppercase', letterSpacing:0.8, marginBottom:12 },

  appBtn: {
    flexDirection:'row', alignItems:'center', gap:14,
    backgroundColor:'rgba(255,255,255,0.92)', borderRadius:16, padding:16, marginBottom:10,
    borderLeftWidth:4, borderWidth:1, borderColor:'rgba(180,220,220,0.4)',
    shadowColor:'#1B3A5C', shadowOffset:{width:0,height:2}, shadowOpacity:0.06, shadowRadius:8, elevation:2,
  },
  appIconWrap: { width:48, height:48, borderRadius:14, alignItems:'center', justifyContent:'center' },
  appIcon:     { fontSize:24 },
  appInfo:     { flex:1 },
  appName:     { fontSize:16, fontWeight:'800', color:navy },
  appSub:      { fontSize:12, color:textSec, marginTop:2 },
  appArrow:    { fontSize:24, color:textSec },

  cookBtn: {
    flexDirection:'row', alignItems:'center', justifyContent:'center', gap:10,
    backgroundColor:'rgba(27,58,92,0.08)', borderRadius:16, padding:16, marginTop:8,
    borderWidth:1.5, borderColor:'rgba(27,58,92,0.2)',
  },
  cookIcon: { fontSize:22 },
  cookTxt:  { fontSize:15, fontWeight:'700', color:navy },

  modalOverlay: { flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'flex-end' },
  modalBox:     { backgroundColor:white, borderTopLeftRadius:24, borderTopRightRadius:24, padding:24 },
  modalTitle:   { fontSize:18, fontWeight:'800', color:navy, marginBottom:16 },
  localeOption: { flexDirection:'row', alignItems:'center', gap:12, paddingVertical:14, borderBottomWidth:1, borderBottomColor:border },
  localeOptionActive: { backgroundColor:'rgba(27,58,92,0.05)', borderRadius:12, paddingHorizontal:8 },
  localeOptionFlag: { fontSize:24 },
  localeOptionName: { flex:1, fontSize:15, color:textSec },
  checkmark:    { fontSize:16, color:navy, fontWeight:'700' },
  modalClose:   { backgroundColor:navy, borderRadius:14, paddingVertical:14, alignItems:'center', marginTop:16 },
  modalCloseTxt:{ color:white, fontWeight:'700', fontSize:15 },
});
