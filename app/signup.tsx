import React, { useState } from 'react';
import { Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import Logo from '../components/Logo';
import Button from '../components/Button';
import Input from '../components/Input';
import { navy, gold, textSec, errorRed, white, border } from '../theme/colors';

export default function SignupScreen() {
  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [formError, setFormError] = useState('');
  const [nameErr, setNameErr]     = useState('');
  const [emailErr, setEmailErr]   = useState('');
  const [passErr, setPassErr]     = useState('');
  const [confErr, setConfErr]     = useState('');

  function validate(): boolean {
    let ok = true;
    setNameErr(''); setEmailErr(''); setPassErr(''); setConfErr(''); setFormError('');
    if (!name.trim())             { setNameErr('Full name is required'); ok = false; }
    if (!email.trim())            { setEmailErr('Email is required'); ok = false; }
    else if (!email.includes('@')){ setEmailErr('Enter a valid email address'); ok = false; }
    if (!password)                { setPassErr('Password is required'); ok = false; }
    else if (password.length < 8) { setPassErr('Password must be at least 8 characters'); ok = false; }
    if (!confirm)                 { setConfErr('Please confirm your password'); ok = false; }
    else if (password !== confirm){ setConfErr('Passwords do not match'); ok = false; }
    return ok;
  }

  async function handleSignUp() {
    if (!validate()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { full_name: name.trim() } },
      });
      if (error) { setFormError(error.message); return; }
      router.replace('/profile-setup');
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backArrow}>Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Create Account</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={s.logoRow}><Logo size="small" /></View>

        <View style={s.form}>
          <Text style={s.formTitle}>Welcome to Maharaj</Text>
          <Text style={s.formSub}>Create your account to get started</Text>

          <Input label="Full Name" value={name} onChangeText={setName}
            placeholder="e.g. Satish Sabnis" error={nameErr} />
          <Input label="Email Address" value={email} onChangeText={setEmail}
            placeholder="you@example.com" keyboardType="email-address"
            autoCapitalize="none" error={emailErr} />
          <Input label="Password" value={password} onChangeText={setPassword}
            placeholder="Minimum 8 characters" secureTextEntry error={passErr} />
          <Input label="Confirm Password" value={confirm} onChangeText={setConfirm}
            placeholder="Re-enter your password" secureTextEntry error={confErr} />

          {formError ? (
            <View style={s.errorBox}>
              <Text style={s.errorBoxText}>{formError}</Text>
            </View>
          ) : null}

          <View style={{ marginTop: 8 }}>
            <Button title="Create Account" onPress={handleSignUp} loading={loading} />
          </View>

          <View style={s.altRow}>
            <Text style={s.altText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/login')} activeOpacity={0.7}>
              <Text style={s.altLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: white },
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
  errorBox:    { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginBottom: 8 },
  errorBoxText:{ fontSize: 13, color: errorRed, textAlign: 'center' },
  altRow:  { flexDirection: 'row', justifyContent: 'center', marginTop: 24, alignItems: 'center' },
  altText: { fontSize: 14, color: textSec },
  altLink: { fontSize: 14, color: gold, fontWeight: '700' },
});
