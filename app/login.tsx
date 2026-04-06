import React, { useState } from 'react';
import { ImageBackground, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import Logo from '../components/Logo';
import Button from '../components/Button';
import Input from '../components/Input';
import { navy, gold, textSec, errorRed, white, border } from '../theme/colors';

export default function LoginScreen() {
  const params = useLocalSearchParams<{ upgraded?: string }>();
  const isUpgraded = params.upgraded === 'true';
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [formError, setFormError] = useState('');
  const [emailErr, setEmailErr] = useState('');
  const [passErr, setPassErr]   = useState('');

  function validate(): boolean {
    let ok = true;
    setEmailErr(''); setPassErr(''); setFormError('');
    if (!email.trim())            { setEmailErr('Email is required'); ok = false; }
    else if (!email.includes('@')){ setEmailErr('Enter a valid email'); ok = false; }
    if (!password)                { setPassErr('Password is required'); ok = false; }
    return ok;
  }

  async function handleLogin() {
    if (!validate()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) { setFormError('Invalid email or password. Please try again.'); return; }
      const profileDone = await AsyncStorage.getItem('profile_setup_complete');
      if (!profileDone) {
        router.replace('/dietary-profile');
      } else {
        router.replace('/home');
      }
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ImageBackground source={require('../assets/background.png')} style={{flex:1,width:'100%'}} resizeMode="cover">
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Welcome Back</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={{backgroundColor:'#FFF8E7',borderRadius:10,padding:10,paddingHorizontal:14,marginHorizontal:12,marginTop:8,marginBottom:16}}>
        <Text style={{fontSize:11,color:'#854F0B',textAlign:'center',lineHeight:17}}>My Maharaj has been upgraded to Beta.{'\n'}Thank you for being an early user.</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={s.logoRow}><Logo size="small" /></View>

        <View style={s.form}>
          <Text style={s.formTitle}>Sign in to Maharaj</Text>
          <Text style={s.formSub}>Welcome back! We missed you</Text>

          <Input label="Email Address" value={email} onChangeText={setEmail}
            placeholder="you@example.com" keyboardType="email-address"
            autoCapitalize="none" error={emailErr} />
          <Input label="Password" value={password} onChangeText={setPassword}
            placeholder="Your password" secureTextEntry error={passErr} />

          <TouchableOpacity style={s.forgotWrap} onPress={() => {}} activeOpacity={0.7}>
            <Text style={s.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          {formError ? (
            <View style={s.errorBox}>
              <Text style={s.errorBoxText}>{formError}</Text>
            </View>
          ) : null}

          <View style={{ marginTop: 8 }}>
            <Button title="Sign In" onPress={handleLogin} loading={loading} />
          </View>

          <View style={s.altRow}>
            <Text style={s.altText}>New here? </Text>
            <TouchableOpacity onPress={() => router.push('/signup')} activeOpacity={0.7}>
              <Text style={s.altLink}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
    </ImageBackground>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'web' ? 20 : 12, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: border,
  },
  backBtn:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow:   { fontSize: 22, color: navy },
  headerTitle: { fontSize: 18, fontWeight: '700', color: navy },
  scroll:      { paddingBottom: 48 },
  logoRow:     { alignItems: 'center', paddingVertical: 20 },
  form:        { paddingHorizontal: 24 },
  formTitle:   { fontSize: 22, fontWeight: '800', color: navy, marginBottom: 4 },
  formSub:     { fontSize: 14, color: textSec, marginBottom: 24 },
  forgotWrap:  { alignSelf: 'flex-end', marginTop: -8, marginBottom: 8 },
  forgotText:  { fontSize: 13, color: gold, fontWeight: '600' },
  errorBox:    { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginBottom: 8 },
  errorBoxText:{ fontSize: 13, color: errorRed, textAlign: 'center' },
  altRow:  { flexDirection: 'row', justifyContent: 'center', marginTop: 24, alignItems: 'center' },
  altText: { fontSize: 14, color: textSec },
  altLink: { fontSize: 14, color: gold, fontWeight: '700' },
});
