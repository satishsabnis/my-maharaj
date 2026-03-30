import React from 'react';
import {
  ImageBackground, Linking, Platform, SafeAreaView,
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { router } from 'expo-router';
import { navy, white, textSec } from '../theme/colors';

const APPS = [
  { name: 'Amazon',        url: 'https://www.amazon.ae',       color: '#FF9900', dark: true },
  { name: 'Barakat',       url: 'https://www.barakat.com',     color: '#00A651', dark: false },
  { name: 'Careem',        url: 'https://www.careem.com/food/',color: '#1DBF73', dark: false },
  { name: 'Deliveroo',     url: 'https://deliveroo.ae',        color: '#00CCBC', dark: false },
  { name: 'elGrocer',      url: 'https://www.elgrocer.com',    color: '#E63946', dark: false },
  { name: 'Fresh to Home', url: 'https://www.freshtohome.com', color: '#FF6B35', dark: false },
  { name: 'Instashop',     url: 'https://instashop.io',        color: '#00A651', dark: false },
  { name: 'Keeta',         url: 'https://www.keeta.com',       color: '#FF0000', dark: false },
  { name: 'Noon',          url: 'https://www.noon.com',        color: '#FFEE00', dark: true },
  { name: 'Smiles',        url: 'https://www.smilesuae.com',   color: '#FF6600', dark: false },
  { name: 'Talabat',       url: 'https://www.talabat.com',     color: '#FF6B00', dark: false },
];

function makeRows() {
  const rows: typeof APPS[number][][] = [];
  for (let i = 0; i < APPS.length; i += 2) rows.push(APPS.slice(i, i + 2));
  return rows;
}

export default function OrderOutScreen() {
  const rows = makeRows();

  return (
    <ImageBackground source={require('../assets/background.png')} style={s.bg} resizeMode="cover">
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.backTxt}>Back</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Order Out</Text>
          <TouchableOpacity onPress={() => router.push('/home' as never)}>
            <Text style={s.homeTxt}>Home</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <Text style={s.pageTitle}>Where would you like to order from?</Text>

          {/* Banner 1: Integration */}
          <View style={{flexDirection:'row',gap:8,alignItems:'flex-start',backgroundColor:'rgba(201,162,39,0.12)',borderRadius:12,padding:12,marginTop:12,borderWidth:1,borderColor:'rgba(201,162,39,0.3)'}}>
            <Text style={{fontSize:14}}>🔗</Text>
            <Text style={{flex:1,fontSize:12,color:'#78350F',lineHeight:18}}>Direct ordering integration coming soon — we are working with these platforms to enable one-tap ordering from your meal plan</Text>
          </View>

          {/* Banner 2: Smart shopping */}
          <View style={{backgroundColor:navy,borderRadius:12,padding:14,marginTop:10}}>
            <Text style={{fontSize:12,fontWeight:'600',color:white,lineHeight:18}}>Coming soon. Maharaj is learning the art of smart shopping. Soon, he will compare prices across prominent stores in your area — finding you the best deals, seasonal offers and bulk savings before you step into the store.</Text>
          </View>

          {/* 2-column grid */}
          <View style={{gap:12,marginTop:16}}>
            {rows.map((row, ri) => (
              <View key={ri} style={{flexDirection:'row',gap:12,justifyContent:'center'}}>
                {row.map(app => (
                  <TouchableOpacity key={app.name} style={{alignItems:'center',width:80}} onPress={() => Linking.openURL(app.url)} activeOpacity={0.8}>
                    <View style={{width:56,height:56,borderRadius:28,backgroundColor:app.color,alignItems:'center',justifyContent:'center',marginBottom:4}}>
                      <Text style={{fontSize:22,fontWeight:'800',color:app.dark ? '#1F2937' : white}}>{app.name.charAt(0)}</Text>
                    </View>
                    <Text style={{fontSize:11,fontWeight:'600',color:navy,textAlign:'center'}} numberOfLines={2}>{app.name}</Text>
                  </TouchableOpacity>
                ))}
                {row.length < 2 && <View style={{width:80}} />}
              </View>
            ))}
          </View>

          {/* Disclaimer */}
          <Text style={{fontSize:10,color:'#9CA3AF',textAlign:'center',marginTop:16,lineHeight:14}}>App names and trademarks belong to their respective owners. My Maharaj is not affiliated with any of these services.</Text>

          <View style={{gap:10,marginTop:20}}>
            <TouchableOpacity style={s.btn} onPress={() => router.back()}>
              <Text style={s.btnTxt}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn,{borderColor:'rgba(27,58,92,0.15)'}]} onPress={() => router.push('/home' as never)}>
              <Text style={[s.btnTxt,{color:textSec}]}>Back to Home</Text>
            </TouchableOpacity>
          </View>

          <View style={{height:32}} />
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

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
  homeTxt:     { fontSize:15, color:textSec, fontWeight:'600' },
  scroll:      { padding:16 },
  pageTitle:   { fontSize:22, fontWeight:'800', color:navy, marginBottom:4 },
  btn: {
    flexDirection:'row', alignItems:'center', justifyContent:'center',
    backgroundColor:'rgba(27,58,92,0.08)', borderRadius:16, padding:16,
    borderWidth:1.5, borderColor:'rgba(27,58,92,0.2)',
  },
  btnTxt: { fontSize:15, fontWeight:'700', color:navy },
});
