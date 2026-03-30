import React from 'react';
import {
  ImageBackground, Platform, SafeAreaView,
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { router } from 'expo-router';
import { navy, white, textSec, border } from '../theme/colors';
import DeliveryAppsSection from '../components/DeliveryApps';

export default function OrderOutScreen() {
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
            <Text style={s.homeTxt}>Home</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          <Text style={s.pageTitle}>Order Out</Text>
          <Text style={s.pageSub}>Choose your preferred delivery app</Text>

          <DeliveryAppsSection country="UAE" title="Order ingredients or food online" />

          {/* Bottom buttons */}
          <View style={{gap:10,marginTop:20}}>
            <TouchableOpacity style={s.btn} onPress={() => router.back()}>
              <Text style={s.btnTxt}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn,{borderColor:'rgba(27,58,92,0.15)'}]} onPress={() => router.push('/home' as never)}>
              <Text style={[s.btnTxt,{color:textSec}]}>Back to Home</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 32 }} />
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
