import React from 'react';
import {
  ImageBackground, Platform, SafeAreaView,
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { router } from 'expo-router';
import { navy, white, textSec } from '../theme/colors';

const APPS = ['Amazon','Barakat','Careem','Deliveroo','elGrocer','Fresh to Home','Instashop','Keeta','Noon','Smiles','Talabat'];

function makeRows() {
  const rows: string[][] = [];
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

        <ScrollView contentContainerStyle={{padding:16}}>
          <Text style={s.pageTitle}>Where would you like to order from?</Text>

          {/* Banner 1: Integration */}
          <View style={{flexDirection:'row',gap:8,alignItems:'flex-start',backgroundColor:'rgba(201,162,39,0.12)',borderRadius:12,padding:12,marginTop:12,borderWidth:1,borderColor:'rgba(201,162,39,0.3)',width:'100%',alignSelf:'stretch'}}>
            <Text style={{fontSize:14}}>🔗</Text>
            <Text style={{flex:1,fontSize:12,color:'#78350F',lineHeight:18}}>Direct ordering integration coming soon — we are working with these platforms to enable one-tap ordering from your meal plan</Text>
          </View>

          {/* Banner 2: Smart shopping */}
          <View style={{backgroundColor:navy,borderRadius:12,padding:14,marginTop:10,width:'100%',alignSelf:'stretch'}}>
            <Text style={{fontSize:12,fontWeight:'600',color:white,lineHeight:18}}>Coming soon. Maharaj is learning the art of smart shopping. Soon, he will compare prices across prominent stores in your area — finding you the best deals, seasonal offers and bulk savings before you step into the store.</Text>
          </View>

          {/* 2-column pill grid */}
          <View style={{gap:10,marginTop:16}}>
            {rows.map((row, ri) => (
              <View key={ri} style={{flexDirection:'row',gap:10}}>
                {row.map(name => (
                  <View key={name} style={{flex:1,backgroundColor:'rgba(27,58,92,0.06)',borderWidth:1,borderColor:'rgba(27,58,92,0.2)',borderRadius:20,paddingHorizontal:16,paddingVertical:10,alignItems:'center'}}>
                    <Text style={{fontSize:13,fontWeight:'600',color:navy}}>{name}</Text>
                  </View>
                ))}
                {row.length < 2 && <View style={{flex:1}} />}
              </View>
            ))}
          </View>

          {/* Disclaimer */}
          <Text style={{fontSize:10,color:'#9CA3AF',textAlign:'center',paddingVertical:12,lineHeight:14}}>App names and trademarks belong to their respective owners. My Maharaj is not affiliated with any of these services.</Text>

          {/* Buttons */}
          <View style={{gap:10,marginTop:8,width:'100%'}}>
            <TouchableOpacity style={{width:'100%',borderWidth:1.5,borderColor:navy,borderRadius:12,paddingVertical:14,alignItems:'center'}} onPress={() => router.back()}>
              <Text style={{fontSize:15,fontWeight:'700',color:navy}}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{width:'100%',backgroundColor:navy,borderRadius:12,paddingVertical:14,alignItems:'center'}} onPress={() => router.push('/home' as never)}>
              <Text style={{fontSize:15,fontWeight:'700',color:white}}>Back to Home</Text>
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
  pageTitle:   { fontSize:22, fontWeight:'800', color:navy, marginBottom:4 },
});
