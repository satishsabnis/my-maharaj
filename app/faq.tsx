import React from 'react';
import { ImageBackground, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { colors } from '../constants/theme';

const PREVIEW_QUESTIONS = [
  'How does Maharaj plan my meals?',
  'How do I get the best results from Maharaj?',
  'Is my family\'s health data safe?',
];

export default function FAQScreen() {
  return (
    <View style={{flex:1}}>
      <ImageBackground source={require('../assets/background.png')} style={{position:'absolute',top:0,left:0,right:0,bottom:0,width:'100%',height:'100%'}} resizeMode="cover" />
      <SafeAreaView style={{flex:1}}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Text style={s.backTxt}>Back</Text></TouchableOpacity>
          <Text style={s.headerTitle}>FAQ</Text>
          <TouchableOpacity onPress={() => router.push('/home' as never)} style={s.homeBtn}><Text style={s.homeTxt}>Home</Text></TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{padding:14,paddingBottom:60}} showsVerticalScrollIndicator={false}>

          {/* Maharaj tip */}
          <View style={s.tipCard}>
            <Text style={s.tipLabel}>Maharaj</Text>
            <Text style={s.tipText}>Everything you need to know about getting the most from your Maharaj. Full answers coming at App Store launch.</Text>
          </View>

          {/* Coming soon card */}
          <View style={s.comingSoonCard}>
            <Text style={{fontSize:12,fontWeight:'500',color:colors.navy,marginBottom:6}}>FAQ</Text>
            <Text style={{fontSize:9,color:'#5A3A0A',textAlign:'center',lineHeight:13.5}}>Full FAQ guide will be published at App Store launch in May 2026.</Text>
            <Text style={{fontSize:8,color:colors.textMuted,textAlign:'center',marginTop:4,lineHeight:11.2}}>It will cover how to get the best plans from Maharaj, language settings, fasting, festivals, scanning, and more.</Text>
          </View>

          {/* Preview questions */}
          <Text style={s.secTitle}>Preview</Text>
          {PREVIEW_QUESTIONS.map((q, i) => (
            <View key={i} style={s.card}>
              <Text style={{fontSize:8.5,fontWeight:'500',color:colors.navy}}>{q}</Text>
              <Text style={{fontSize:7.5,color:colors.textMuted,fontStyle:'italic',marginTop:2}}>Answer coming soon</Text>
            </View>
          ))}

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:14,paddingTop:Platform.OS==='android'?25:Platform.OS==='web'?14:8,paddingBottom:10 },
  backBtn: { backgroundColor:'transparent',borderRadius:20,borderWidth:1.5,borderColor:colors.navy,paddingVertical:3,paddingHorizontal:8 },
  backTxt: { fontSize:8,fontWeight:'700',color:colors.navy },
  headerTitle: { fontSize:10,fontWeight:'700',color:colors.navy },
  homeBtn: { backgroundColor:colors.navy,borderRadius:20,paddingVertical:3,paddingHorizontal:8 },
  homeTxt: { fontSize:8,fontWeight:'700',color:colors.white },
  tipCard: { backgroundColor:'rgba(30,158,94,0.08)',borderWidth:1,borderColor:'rgba(30,158,94,0.2)',borderRadius:10,padding:8,paddingHorizontal:10,marginBottom:12 },
  tipLabel: { fontSize:6.5,color:colors.emerald,textTransform:'uppercase',letterSpacing:0.4,marginBottom:3 },
  tipText: { fontSize:8,color:colors.navy,lineHeight:12 },
  secTitle: { fontSize:8,fontWeight:'500',color:colors.emerald,textTransform:'uppercase',letterSpacing:0.7,marginBottom:7,paddingBottom:4,borderBottomWidth:1,borderBottomColor:'rgba(30,158,94,0.2)',marginTop:14 },
  card: { backgroundColor:'rgba(255,255,255,0.85)',borderRadius:12,padding:10,paddingHorizontal:11,marginBottom:6,borderWidth:1,borderColor:'rgba(255,255,255,0.6)' },
  comingSoonCard: { backgroundColor:'rgba(201,162,39,0.1)',borderWidth:1,borderColor:'rgba(201,162,39,0.25)',borderRadius:12,padding:16,marginVertical:20,alignItems:'center' },
});
