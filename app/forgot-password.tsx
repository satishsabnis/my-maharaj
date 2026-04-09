import React, { useState } from 'react';
import { ImageBackground, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import Logo from '../components/Logo';
import Button from '../components/Button';
import Input from '../components/Input';
import { navy, gold, textSec, errorRed, white, border } from '../theme/colors';

export default function ForgotPasswordScreen() {
  const [email, setEmail]       = useState('');
  const [emailErr, setEmailErr] = useState('');
  const [loading, setLoading]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [formError, setFormError] = useState('');

  function validate(): boolean {
    setEmailErr(''); setFormError('');
    if (!email.trim())             { setEmailErr('Email is required'); return false; }
    if (!email.includes('@'))      { setEmailErr('Enter a valid email address'); return false; }
    return true;
  }

  async function handleSend() {
    if (!validate()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: 'https://my-maharaj.vercel.app/reset-password',
      });
      if (error) { setFormError(error.message); return; }
      setSent(true);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <ImageBackground source={require('../assets/background.png')} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }} resizeMode="cover" />
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backArrow}>Back</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Reset Password</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={s.logoRow}><Logo size="small" /></View>

          <View style={s.form}>
            {sent ? (
              <>
                <Text style={s.formTitle}>Check your email</Text>
                <Text style={s.formSub}>We've sent a password reset link to{'\n'}<Text style={{ color: navy, fontWeight: '700' }}>{email.trim().toLowerCase()}</Text></Text>
                <View style={{ marginTop: 24 }}>
                  <Button title="Back to Sign In" onPress={() => router.replace('/login')} />
                </View>
              </>
            ) : (
              <>
                <Text style={s.formTitle}>Forgot your password?</Text>
                <Text style={s.formSub}>Enter your email address and we'll send you a reset link.</Text>

                <Input label="Email Address" value={email} onChangeText={setEmail}
                  placeholder="you@example.com" keyboardType="email-address"
                  autoCapitalize="none" error={emailErr} />

                {formError ? (
                  <View style={s.errorBox}>
                    <Text style={s.errorBoxText}>{formError}</Text>
                  </View>
                ) : null}

                <View style={{ marginTop: 8 }}>
                  <Button title="Send Reset Link" onPress={handleSend} loading={loading} />
                </View>

                <View style={s.altRow}>
                  <Text style={s.altText}>Remembered it? </Text>
                  <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
                    <Text style={s.altLink}>Sign In</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: border },
  backBtn:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow:   { fontSize: 22, color: navy },
  headerTitle: { fontSize: 18, fontWeight: '700', color: navy },
  scroll:      { paddingBottom: 48 },
  logoRow:     { alignItems: 'center', paddingVertical: 20 },
  form:        { paddingHorizontal: 24 },
  formTitle:   { fontSize: 22, fontWeight: '800', color: navy, marginBottom: 4 },
  formSub:     { fontSize: 14, color: textSec, marginBottom: 24, lineHeight: 20 },
  errorBox:    { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginBottom: 8 },
  errorBoxText:{ fontSize: 13, color: errorRed, textAlign: 'center' },
  altRow:      { flexDirection: 'row', justifyContent: 'center', marginTop: 24, alignItems: 'center' },
  altText:     { fontSize: 14, color: textSec },
  altLink:     { fontSize: 14, color: gold, fontWeight: '700' },
});
