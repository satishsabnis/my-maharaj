import React from 'react';
import { Image, ImageBackground, Linking, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { APP_VERSION } from '../constants/version';
import { colors } from '../constants/theme';

export default function AboutScreen() {
  return (
    <View style={{flex:1}}>
      <ImageBackground source={require('../assets/background.png')} style={{position:'absolute',top:0,left:0,right:0,bottom:0,width:'100%',height:'100%'}} resizeMode="cover" />
      <SafeAreaView style={{flex:1}}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Text style={s.backTxt}>Back</Text></TouchableOpacity>
          <Text style={s.headerTitle}>About My Maharaj</Text>
          <TouchableOpacity onPress={() => router.push('/home' as never)} style={s.homeBtn}><Text style={s.homeTxt}>Home</Text></TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{padding:14,paddingBottom:24}} showsVerticalScrollIndicator={false}>

          {/* App Identity */}
          <Text style={s.secTitle}>App Identity</Text>
          <View style={s.card}>
            <Image source={require('../assets/logo.png')} style={{width:64,height:64,alignSelf:'center',marginBottom:8}} resizeMode="contain" />
            <Text style={{fontSize:14,fontWeight:'500',color:colors.navy,textAlign:'center'}}>My Maharaj</Text>
            <Text style={{fontSize:13,color:colors.teal,textAlign:'center',marginTop:2}}>Your personal Indian meal planner</Text>
            <View style={{alignSelf:'center',marginTop:8,backgroundColor:'rgba(30,158,94,0.12)',borderWidth:1,borderColor:'rgba(30,158,94,0.3)',borderRadius:20,paddingVertical:3,paddingHorizontal:10}}>
              <Text style={{fontSize:13,color:colors.emerald}}>Beta {APP_VERSION}</Text>
            </View>
          </View>

          {/* About */}
          <Text style={s.secTitle}>About</Text>
          <View style={s.card}>
            <Text style={{fontSize:13,color:colors.navy,lineHeight:19}}>My Maharaj is an AI-powered meal planning assistant built for Indian families in the GCC. Maharaj understands your community, your family's preferences, your health conditions, and your kitchen — and plans your entire week so you never have to think about what to cook.</Text>
          </View>

          {/* Powered by */}
          <Text style={s.secTitle}>Powered by</Text>
          <View style={s.card}>
            <Image source={require('../assets/blueflute-logo.png')} style={{width:100,height:36}} resizeMode="contain" />
            <Text style={{fontSize:13,fontWeight:'500',color:colors.navy,marginTop:4}}>Blue Flute Consulting LLC-FZ</Text>
            <Text style={{fontSize:13,color:colors.textMuted}}>Dubai, UAE</Text>
            <TouchableOpacity onPress={() => Linking.openURL('https://www.bluefluteconsulting.com')} style={{marginTop:4}}>
              <Text style={{fontSize:13,color:colors.emerald}}>www.bluefluteconsulting.com</Text>
            </TouchableOpacity>

            <View style={{height:1,backgroundColor:'rgba(26,58,92,0.1)',marginVertical:10}} />

            <Text style={{fontSize:13,color:colors.textMuted,textAlign:'center'}}>Powered by Claude AI by Anthropic</Text>
            <TouchableOpacity onPress={() => Linking.openURL('https://www.anthropic.com')}>
              <Text style={{fontSize:13,color:colors.emerald,textAlign:'center'}}>claude.ai</Text>
            </TouchableOpacity>
          </View>

          {/* Legal */}
          <Text style={s.secTitle}>Legal</Text>

          <TouchableOpacity style={s.linkRow} onPress={() => router.push('/privacy-policy' as never)}>
            <View style={{flex:1}}>
              <Text style={{fontSize:16,fontWeight:'500',color:colors.navy}}>Privacy Policy</Text>
              <Text style={{fontSize:13,color:colors.textMuted}}>How we collect and protect your data</Text>
            </View>
            <Text style={{fontSize:12,color:colors.emerald}}>{'\u203A'}</Text>
          </TouchableOpacity>
          <View style={s.linkDivider} />

          <TouchableOpacity style={s.linkRow} onPress={() => router.push('/disclaimer' as never)}>
            <View style={{flex:1}}>
              <Text style={{fontSize:16,fontWeight:'500',color:colors.navy}}>Terms and Disclaimer</Text>
              <Text style={{fontSize:13,color:colors.textMuted}}>Terms of use and important disclaimers</Text>
            </View>
            <Text style={{fontSize:12,color:colors.emerald}}>{'\u203A'}</Text>
          </TouchableOpacity>
          <View style={s.linkDivider} />

          <TouchableOpacity style={s.linkRow} onPress={() => router.push('/faq' as never)}>
            <View style={{flex:1}}>
              <Text style={{fontSize:16,fontWeight:'500',color:colors.navy}}>Frequently Asked Questions</Text>
              <Text style={{fontSize:13,color:colors.textMuted}}>How to get the most from Maharaj</Text>
            </View>
            <Text style={{fontSize:12,color:colors.emerald}}>{'\u203A'}</Text>
          </TouchableOpacity>

          {/* Version History */}
          <Text style={[s.secTitle, {marginTop:16}]}>Version History</Text>
          <View style={s.card}>
            {[
              { ver: 'Beta v3.04', desc: 'V3 full redesign — V3 colour system, anticipation feed, meal anatomy, festivals, RLHF' },
              { ver: 'Beta v2.04', desc: 'Fix batches 1-7 — background, non-veg enforcement, cuisine filter, Jain logic, Scan to Shop' },
              { ver: 'Beta v1.0', desc: 'Initial release — meal generation, Ask Maharaj, family profile' },
            ].map((row, i) => (
              <View key={i} style={{flexDirection:'row',paddingVertical:4,borderBottomWidth:i<2?0.5:0,borderBottomColor:'rgba(26,58,92,0.08)'}}>
                <Text style={{fontSize:13,fontWeight:'500',color:colors.navy,width:90}}>{row.ver}</Text>
                <Text style={{fontSize:13,color:colors.textMuted,flex:1}}>{row.desc}</Text>
              </View>
            ))}
          </View>

          {/* Footer */}
          <View style={{marginTop:20,alignItems:'center'}}>
            <Text style={{fontSize:13,color:colors.textMuted,textAlign:'center'}}>{'\u00A9'} 2026 Blue Flute Consulting LLC-FZ</Text>
            <Text style={{fontSize:13,color:colors.textMuted,textAlign:'center',marginTop:2}}>All rights reserved</Text>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:14,paddingTop:Platform.OS==='android'?25:Platform.OS==='web'?14:8,paddingBottom:10 },
  backBtn: { backgroundColor:'transparent',borderRadius:8,borderWidth:1.5,borderColor:'#2E5480',paddingVertical:6,paddingHorizontal:12 },
  backTxt: { fontSize:15,fontWeight:'700',color:'#2E5480' },
  headerTitle: { fontSize:18,fontWeight:'700',color:colors.navy },
  homeBtn: { backgroundColor:'#2E5480',borderRadius:8,paddingVertical:6,paddingHorizontal:12 },
  homeTxt: { fontSize:15,fontWeight:'700',color:colors.white },
  secTitle: { fontSize:13,fontWeight:'500',color:colors.emerald,textTransform:'uppercase',letterSpacing:0.7,marginBottom:6,paddingBottom:4,borderBottomWidth:1,borderBottomColor:'rgba(30,158,94,0.2)',marginTop:10 },
  card: { backgroundColor:'rgba(255,255,255,0.85)',borderRadius:12,padding:10,paddingHorizontal:11,marginBottom:6,borderWidth:1,borderColor:'rgba(255,255,255,0.6)' },
  linkRow: { flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingVertical:8,paddingHorizontal:4 },
  linkDivider: { height:1,backgroundColor:'rgba(26,58,92,0.08)' },
});
