import React from 'react';
import { ImageBackground, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { colors } from '../constants/theme';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{marginBottom:10}}>
      <Text style={s.secTitle}>{title}</Text>
      {children}
    </View>
  );
}

function P({ text }: { text: string }) {
  return <Text style={s.bodyText}>{text}</Text>;
}

export default function PrivacyPolicyScreen() {
  return (
    <View style={{flex:1}}>
      <ImageBackground source={require('../assets/background.png')} style={{position:'absolute',top:0,left:0,right:0,bottom:0,width:'100%',height:'100%'}} resizeMode="cover" />
      <SafeAreaView style={{flex:1}}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Text style={s.backTxt}>Back</Text></TouchableOpacity>
          <Text style={s.headerTitle}>Privacy Policy</Text>
          <TouchableOpacity onPress={() => router.push('/home' as never)} style={s.homeBtn}><Text style={s.homeTxt}>Home</Text></TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{padding:14,paddingBottom:24}} showsVerticalScrollIndicator={false}>

          {/* Title */}
          <Text style={{fontSize:12,fontWeight:'500',color:colors.navy,marginBottom:2}}>Privacy Policy — My Maharaj</Text>
          <Text style={{fontSize:7.5,color:colors.textMuted,marginBottom:12}}>Blue Flute Consulting LLC-FZ · Last updated: April 2026 · Subject to revision before App Store launch</Text>

          {/* Notice */}
          <View style={s.noticeCard}>
            <Text style={{fontSize:8,color:'#5A3A0A'}}>This is a draft privacy policy for Beta testing. A legally reviewed version will be published before the official App Store launch in May 2026.</Text>
          </View>

          <Section title="What we collect">
            <P text={'My Maharaj collects the following information to provide personalised meal planning:\n\n\u00B7 Your name, email address, and phone number for account creation\n\u00B7 Family member details including names, ages, food preferences, and health conditions\n\u00B7 Dietary preferences, cuisine selections, and meal history\n\u00B7 Lab report data uploaded voluntarily for therapeutic meal suggestions\n\u00B7 Fasting days, religious observances, and community dietary rules\n\u00B7 Grocery preferences, supermarket choices, and delivery app preferences\n\u00B7 Meal plans generated, dish feedback, and usage patterns within the app'} />
          </Section>

          <Section title="How we use your data">
            <P text={'Your data is used exclusively to:\n\n\u00B7 Generate personalised weekly meal plans for your family\n\u00B7 Remember your family\'s preferences and improve suggestions over time\n\u00B7 Send grocery shopping lists and meal prep reminders\n\u00B7 Provide festival-aware and health-aware meal recommendations\n\nYour data is never sold, shared with advertisers, or used for any purpose outside of My Maharaj meal planning.'} />
          </Section>

          <Section title="AI processing — Anthropic Claude">
            <P text={'My Maharaj uses the Claude API by Anthropic to generate meal plans and recipes. When you generate a meal plan, your family profile and preferences are sent to Anthropic\'s API for processing. This data is processed in transit to generate your plan — it is not retained by Anthropic, not used for AI training, and not stored on Anthropic\'s servers beyond the immediate API call.\n\nBlue Flute Consulting LLC-FZ is taking steps to reduce the API data retention period to zero days. This action will be completed before the official App Store launch.'} />
          </Section>

          <Section title="Where your data is stored">
            <P text={'Your meal plans, family profile, and usage history are stored securely in our database hosted by Supabase. We are confirming the server region before the App Store launch and will update this policy accordingly. All data is protected by row-level security — only you can access your family\'s data.'} />
          </Section>

          <Section title="Your rights">
            <P text={'You have the right to:\n\n\u00B7 Access all data we hold about your family\n\u00B7 Request correction of any inaccurate data\n\u00B7 Request deletion of your account and all associated data\n\u00B7 Withdraw consent for any optional data processing\n\nTo exercise these rights, contact us at privacy@bluefluteconsulting.com'} />
          </Section>

          <Section title="Contact">
            <P text={'Blue Flute Consulting LLC-FZ\nDubai, UAE\nprivacy@bluefluteconsulting.com\nwww.bluefluteconsulting.com'} />
          </Section>

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
  secTitle: { fontSize:13,fontWeight:'500',color:colors.emerald,textTransform:'uppercase',letterSpacing:0.7,marginBottom:6,paddingBottom:4,borderBottomWidth:1,borderBottomColor:'rgba(30,158,94,0.2)',marginTop:8 },
  bodyText: { fontSize:13,color:colors.navy,lineHeight:20 },
  noticeCard: { backgroundColor:'rgba(201,162,39,0.1)',borderWidth:1,borderColor:'rgba(201,162,39,0.25)',borderRadius:10,padding:10,marginBottom:14 },
});
