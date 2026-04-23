import React from 'react';
import { Image, ImageBackground, Linking, Platform, SafeAreaView, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { APP_VERSION } from '../constants/version';
import { colors } from '../constants/theme';
import { track } from '../lib/analytics';

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
            <Text style={{fontSize:13,color:colors.navy,lineHeight:20,marginBottom:10}}>
              Think of Maharaj as a family cook who has been with you for years. Before sitting down to plan your week, he first goes through everything he knows about your family — who eats what, who is on a diet, whose birthday is coming up, what is left in the pantry. He thinks about what was cooked last week so he does not repeat the same dishes. He checks if there is a festival or a fasting day. Only once he has the full picture does he start writing the menu.
            </Text>
            <Text style={{fontSize:13,color:colors.navy,lineHeight:20,marginBottom:10}}>
              The more your family profile is filled in, the better Maharaj plans. A family that has told Maharaj their cuisines, dietary rules, health conditions, and fridge contents will get a plan that feels like it was written by someone who truly knows them. A family that has filled in nothing will still get a good plan, but it will feel like a restaurant menu rather than a home kitchen. The goal is for Maharaj to know your family so well that the plan needs no editing at all.
            </Text>
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
            <TouchableOpacity onPress={() => Linking.openURL('mailto:info@bluefluteconsulting.com')} style={{marginTop:4}}>
              <Text style={{fontSize:13,color:colors.emerald}}>info@bluefluteconsulting.com</Text>
            </TouchableOpacity>

            <View style={{height:1,backgroundColor:'rgba(26,58,92,0.1)',marginVertical:10}} />

            <Text style={{fontSize:13,color:colors.textMuted,textAlign:'center',marginBottom:2}}>AI powered by Anthropic Claude</Text>
            <TouchableOpacity onPress={() => Linking.openURL('https://www.anthropic.com')} style={{marginBottom:8}}>
              <Text style={{fontSize:13,color:colors.emerald,textAlign:'center'}}>www.anthropic.com</Text>
            </TouchableOpacity>
            <Text style={{fontSize:13,color:colors.textMuted,textAlign:'center',marginBottom:2}}>Voice powered by Sarvam AI</Text>
            <TouchableOpacity onPress={() => Linking.openURL('https://www.sarvam.ai')}>
              <Text style={{fontSize:13,color:colors.emerald,textAlign:'center'}}>www.sarvam.ai</Text>
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

          {/* Share */}
          <View style={{height:1,backgroundColor:'rgba(26,58,92,0.1)',marginVertical:16}} />
          <TouchableOpacity
            style={{backgroundColor:colors.emerald,borderRadius:20,paddingVertical:10,alignItems:'center',marginBottom:8}}
            activeOpacity={0.85}
            onPress={() => {
              Share.share({ message: "I have been using My Maharaj to plan my family's meals. It knows Indian food, our community, our fasting days, and even sends the recipe in Hindi to our cook. Try it free: https://my-maharaj.vercel.app" });
              track('referral_shared', { source: 'about' });
            }}
          >
            <Text style={{fontSize:14,fontWeight:'700',color:'#FFFFFF'}}>Share My Maharaj</Text>
          </TouchableOpacity>

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
