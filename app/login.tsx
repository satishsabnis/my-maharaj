import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { navy, gold, white, lightGray, darkGray, midGray, errorRed } from '../theme/colors';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    setError('');
    if (!email.trim()) return setError('Please enter your email.');
    if (!password) return setError('Please enter your password.');

    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    router.replace('/home');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            {/* Back */}
            <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>

            <Text style={styles.header}>Welcome back</Text>
            <Text style={styles.subheader}>Log in to your My Maharaj account</Text>

            {/* Form */}
            <View style={styles.form}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={midGray}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />

              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Your password"
                placeholderTextColor={midGray}
                secureTextEntry
                autoComplete="current-password"
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color={white} />
                ) : (
                  <Text style={styles.submitButtonText}>Log In</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Signup link */}
            <TouchableOpacity onPress={() => router.replace('/signup')}>
              <Text style={styles.linkText}>
                Don't have an account?{' '}
                <Text style={styles.linkHighlight}>Sign up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: white },
  scroll: { flexGrow: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 40,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  backRow: { marginBottom: 24 },
  backText: { color: navy, fontSize: 15, fontWeight: '500' },
  header: {
    fontSize: 30,
    fontWeight: '800',
    color: navy,
    marginBottom: 8,
  },
  subheader: {
    fontSize: 15,
    color: midGray,
    marginBottom: 32,
  },
  form: { width: '100%', marginBottom: 24 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: darkGray,
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: '#111827',
    backgroundColor: lightGray,
  },
  errorText: {
    color: errorRed,
    fontSize: 13,
    marginTop: 14,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: gold,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: {
    color: white,
    fontSize: 17,
    fontWeight: '700',
  },
  linkText: {
    textAlign: 'center',
    color: midGray,
    fontSize: 14,
  },
  linkHighlight: {
    color: navy,
    fontWeight: '700',
  },
});
