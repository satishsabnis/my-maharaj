import React from 'react';
import {
  Image, ImageBackground, Linking, Platform, SafeAreaView,
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { router } from 'expo-router';
import { navy, white, textSec } from '../theme/colors';

const APPS = [
  { name: 'Amazon',        url: 'https://www.amazon.ae',       color: '#FF9900', logo: 'https://logo.clearbit.com/amazon.ae' },
  { name: 'Barakat',       url: 'https://www.barakat.com',     color: '#00A651', logo: 'https://logo.clearbit.com/barakat.com' },
  { name: 'Careem',        url: 'https://www.careem.com/food/',color: '#1DBF73', logo: 'https://logo.clearbit.com/careem.com' },
  { name: 'Deliveroo',     url: 'https://deliveroo.ae',        color: '#00CCBC', logo: 'https://logo.clearbit.com/deliveroo.ae' },
  { name: 'elGrocer',      url: 'https://www.elgrocer.com',    color: '#E63946', logo: 'https://logo.clearbit.com/elgrocer.com' },
  { name: 'Fresh to Home', url: 'https://www.freshtohome.com', color: '#FF6B35', logo: 'https://logo.clearbit.com/freshtohome.com' },
  { name: 'Instashop',     url: 'https://instashop.io',        color: '#00A651', logo: 'https://logo.clearbit.com/instashop.io' },
  { name: 'Keeta',         url: 'https://www.keeta.com',       color: '#FF0000', logo: 'https://logo.clearbit.com/keeta.com' },
  { name: 'Noon',          url: 'https://www.noon.com',        color: '#FFEE00', logo: 'https://logo.clearbit.com/noon.com' },
  { name: 'Smiles',        url: 'https://www.smilesuae.com',   color: '#FF6600', logo: 'https://logo.clearbit.com/smilesuae.com' },
  { name: 'Talabat',       url: 'https://www.talabat.com',     color: '#FF6B00', logo: 'https://logo.clearbit.com/talabat.com' },
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
          <Text style={s.pageTitle}>Order Out</Text>
          <Text style={s.pageSub}>Choose your preferred delivery app</Text>

          <View style={{gap:10,marginTop:16}}>
            {rows.map((row, ri) => (
              <View key={ri} style={{flexDirection:'row',gap:10}}>
                {row.map(app => (
                  <TouchableOpacity
                    key={app.name}
                    style={{flex:1,flexDirection:'row',alignItems:'center',gap:10,backgroundColor:'rgba(255,255,255,0.95)',borderRadius:12,padding:10,borderWidth:1.5,borderColor:'#E5E7EB'}}
                    onPress={() => Linking.openURL(app.url)}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{uri: app.logo}}
                      style={{width:28,height:28,borderRadius:6,backgroundColor:'#F3F4F6'}}
                    />
                    <Text style={{fontSize:13,fontWeight:'700',color:navy,flex:1}} numberOfLines={1}>{app.name}</Text>
                  </TouchableOpacity>
                ))}
                {row.length < 2 && <View style={{flex:1}} />}
              </View>
            ))}
          </View>

          {/* Banner 1: Integration */}
          <View style={{flexDirection:'row',gap:8,alignItems:'flex-start',backgroundColor:'rgba(201,162,39,0.12)',borderRadius:12,padding:12,marginTop:16,borderWidth:1,borderColor:'rgba(201,162,39,0.3)'}}>
            <Text style={{fontSize:14}}>🔗</Text>
            <Text style={{flex:1,fontSize:12,color:'#78350F',lineHeight:18}}>Direct ordering integration coming soon — we are working with these platforms to enable one-tap ordering from your meal plan</Text>
          </View>

          {/* Banner 2: Smart shopping */}
          <View style={{backgroundColor:navy,borderRadius:12,padding:14,marginTop:10}}>
            <Text style={{fontSize:12,fontWeight:'600',color:white,lineHeight:18}}>Coming soon. Maharaj is learning the art of smart shopping. Soon, he will compare prices across prominent stores in your area — finding you the best deals, seasonal offers and bulk savings before you step into the store.</Text>
          </View>

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
  pageSub:     { fontSize:13, color:textSec, marginBottom:8 },
  btn: {
    flexDirection:'row', alignItems:'center', justifyContent:'center',
    backgroundColor:'rgba(27,58,92,0.08)', borderRadius:16, padding:16,
    borderWidth:1.5, borderColor:'rgba(27,58,92,0.2)',
  },
  btnTxt: { fontSize:15, fontWeight:'700', color:navy },
});
