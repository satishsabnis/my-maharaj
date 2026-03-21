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

export default function SignupScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSignUp() {
    setError('');
    if (!fullName.trim()) return setError('Please enter your full name.');
    if (!email.trim()) return setError('Please enter your email.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirmPassword) return setError('Passwords do not match.');

    setLoading(true);
    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() } },
    });
    setLoading(false);

    if (authError) { setError(authError.message); return; }
    if (data.user) {
      setSuccess(true);
      setTimeout(() => router.replace('/profile-setup'), 1200);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.container}>
            <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>

            <Text style={styles.header}>Create your account</Text>
            <Text style={styles.subheader}>Join My Maharaj to start planning your kitchen</Text>

            <View style={styles.form}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Your full name"
                placeholderTextColor={midGray}
                autoCapitalize="words"
                autoComplete="name"
              />

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
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.inputInner}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min. 6 characters"
                  placeholderTextColor={midGray}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                  <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁'}</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.inputInner}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Repeat your password"
                  placeholderTextColor={midGray}
                  secureTextEntry={!showConfirm}
                  autoComplete="new-password"
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirm(!showConfirm)}>
                  <Text style={styles.eyeText}>{showConfirm ? '🙈' : '👁'}</Text>
                </TouchableOpacity>
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              {success ? <Text style={styles.successText}>Account created! Taking you to profile setup...</Text> : null}

              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSignUp}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? <ActivityIndicator color={white} /> : <Text style={styles.submitButtonText}>Create Account</Text>}
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => router.replace('/login')}>
              <Text style={styles.linkText}>
                Already have an account?{' '}
                <Text style={styles.linkHighlight}>Log in</Text>
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
  container: { flex: 1, paddingHorizontal: 28, paddingTop: 20, paddingBottom: 40, maxWidth: 480, width: '100%', alignSelf: 'center' },
  backRow: { marginBottom: 24 },
  backText: { color: navy, fontSize: 15, fontWeight: '500' },
  header: { fontSize: 30, fontWeight: '800', color: navy, marginBottom: 8 },
  subheader: { fontSize: 15, color: midGray, marginBottom: 32 },
  form: { width: '100%', marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: darkGray, marginBottom: 6, marginTop: 16 },
  input: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: '#111827', backgroundColor: lightGray },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, backgroundColor: lightGray },
  inputInner: { flex: 1, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: '#111827' },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 12 },
  eyeText: { fontSize: 18 },
  errorText: { color: errorRed, fontSize: 13, marginTop: 14, textAlign: 'center' },
  successText: { color: '#16A34A', fontSize: 13, marginTop: 14, textAlign: 'center' },
  submitButton: { backgroundColor: gold, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: white, fontSize: 17, fontWeight: '700' },
  linkText: { textAlign: 'center', color: midGray, fontSize: 14 },
  linkHighlight: { color: navy, fontWeight: '700' },
});
