/**
 * Cook Login Screen — /cook
 * Phone + OTP login for kitchen cooks.
 * Session stored in window.localStorage (web-only PWA).
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import Logo from '../../components/Logo';

const NAVY  = '#1B3A5C';
const GOLD  = '#C9A227';
const WHITE = '#FFFFFF';
const MUTED = 'rgba(27,58,92,0.5)';

const COUNTRY_CODES = [
  { code: '+971', label: 'UAE',          flag: '🇦🇪' },
  { code: '+966', label: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+965', label: 'Kuwait',       flag: '🇰🇼' },
  { code: '+973', label: 'Bahrain',      flag: '🇧🇭' },
  { code: '+968', label: 'Oman',         flag: '🇴🇲' },
  { code: '+974', label: 'Qatar',        flag: '🇶🇦' },
  { code: '+91',  label: 'India',        flag: '🇮🇳' },
  { code: '+44',  label: 'UK',           flag: '🇬🇧' },
  { code: '+1',   label: 'USA',          flag: '🇺🇸' },
];

export default function CookLoginScreen() {
  const [countryCode,   setCountryCode]   = useState('+971');
  const [localNumber,   setLocalNumber]   = useState('');
  const [ccPickerOpen,  setCcPickerOpen]  = useState(false);
  const [otp,           setOtp]           = useState('');
  const [stage,         setStage]         = useState<'phone' | 'otp'>('phone');
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');

  const fullPhone = `${countryCode}${localNumber.replace(/^0/, '').replace(/\D/g, '')}`;
  const currentFlag = COUNTRY_CODES.find(c => c.code === countryCode)?.flag || '🇦🇪';

  async function handleSendOtp() {
    const trimmed = localNumber.replace(/\D/g, '');
    if (!trimmed || trimmed.length < 7) {
      setError('Please enter a valid local phone number.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/cook-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_otp', phone: fullPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP');
      setStage('otp');
    } catch (e: any) {
      setError(e.message || 'Could not send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    const trimmed = otp.trim();
    if (!trimmed || trimmed.length < 4) {
      setError('Please enter the OTP you received.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/cook-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_otp', phone: fullPhone, token: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid OTP');
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.localStorage.setItem('cook_phone', data.cook?.phone || fullPhone);
        window.localStorage.setItem('cook_name',  data.cook?.name  || '');
        window.localStorage.setItem('cook_lang',  data.cook?.language || 'hi-IN');
      }
      router.replace('/cook/home' as never);
    } catch (e: any) {
      setError(e.message || 'OTP verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <ImageBackground
        source={require('../../assets/background.png')}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
        resizeMode="cover"
      />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={s.container}>
            <View style={s.logoWrap}>
              <Logo size="large" />
            </View>

            <Text style={s.title}>Maharaj Cook</Text>
            <Text style={s.subtitle}>आपके परिवारों का आज का मेनू</Text>

            <View style={s.card}>
              {stage === 'phone' ? (
                <>
                  <Text style={s.label}>Mobile Number</Text>

                  {/* Two-part phone input */}
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                    <TouchableOpacity
                      style={s.ccBtn}
                      onPress={() => setCcPickerOpen(true)}
                      activeOpacity={0.8}
                    >
                      <Text style={{ fontSize: 18 }}>{currentFlag}</Text>
                      <Text style={s.ccTxt}>{countryCode}</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={[s.input, { flex: 1, marginBottom: 0 }]}
                      placeholder="9XXXXXXXX"
                      placeholderTextColor={MUTED}
                      keyboardType="numeric"
                      value={localNumber}
                      onChangeText={t => { setLocalNumber(t.replace(/\D/g, '')); setError(''); }}
                      returnKeyType="done"
                      onSubmitEditing={handleSendOtp}
                    />
                  </View>

                  {error ? <Text style={s.error}>{error}</Text> : null}
                  <TouchableOpacity style={s.btnGold} onPress={handleSendOtp} disabled={loading}>
                    {loading
                      ? <ActivityIndicator color={NAVY} />
                      : <Text style={s.btnGoldTxt}>OTP भेजें / Send OTP</Text>}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={s.label}>OTP — {fullPhone}</Text>
                  <TextInput
                    style={s.input}
                    placeholder="Enter OTP"
                    placeholderTextColor={MUTED}
                    keyboardType="number-pad"
                    value={otp}
                    onChangeText={t => { setOtp(t); setError(''); }}
                    maxLength={6}
                    returnKeyType="done"
                    onSubmitEditing={handleVerifyOtp}
                    autoFocus
                  />
                  {error ? <Text style={s.error}>{error}</Text> : null}
                  <TouchableOpacity style={s.btnNavy} onPress={handleVerifyOtp} disabled={loading}>
                    {loading
                      ? <ActivityIndicator color={WHITE} />
                      : <Text style={s.btnNavyTxt}>Login / लॉगिन</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={s.linkBtn} onPress={() => { setStage('phone'); setOtp(''); setError(''); }}>
                    <Text style={s.linkTxt}>← Change number</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            <Text style={s.footer}>Powered by SarvamAI · Blue Flute Consulting LLC-FZ</Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Country code picker modal */}
      <Modal visible={ccPickerOpen} transparent animationType="fade" onRequestClose={() => setCcPickerOpen(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => setCcPickerOpen(false)}
          activeOpacity={1}
        >
          <View style={{ backgroundColor: WHITE, borderRadius: 14, padding: 8, width: 270 }}>
            <FlatList
              data={COUNTRY_CODES}
              keyExtractor={item => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => { setCountryCode(item.code); setCcPickerOpen(false); }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 16, borderRadius: 8 }}
                >
                  <Text style={{ fontSize: 20 }}>{item.flag}</Text>
                  <Text style={{ fontSize: 14, color: NAVY, fontWeight: '700', width: 40 }}>{item.code}</Text>
                  <Text style={{ fontSize: 13, color: '#5A7A8A' }}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  logoWrap:  { marginBottom: 16 },
  title:     { fontSize: 26, fontWeight: '700', color: NAVY, letterSpacing: 0.5, textAlign: 'center' },
  subtitle:  { fontSize: 15, color: NAVY, opacity: 0.75, marginTop: 6, marginBottom: 28, textAlign: 'center' },
  card: {
    width: '100%', maxWidth: 400,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 16, padding: 24,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  label:   { fontSize: 13, color: MUTED, marginBottom: 8, fontWeight: '500' },
  ccBtn: {
    borderWidth: 1.5, borderColor: 'rgba(27,58,92,0.2)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 12,
    backgroundColor: '#FAFAFA',
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  ccTxt:  { fontSize: 13, color: NAVY, fontWeight: '600' },
  input: {
    borderWidth: 1.5, borderColor: 'rgba(27,58,92,0.2)', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: NAVY,
    marginBottom: 16, backgroundColor: '#FAFAFA',
  },
  error:      { fontSize: 13, color: '#DC2626', marginBottom: 12 },
  btnGold: {
    backgroundColor: GOLD, borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginTop: 4,
  },
  btnGoldTxt: { fontSize: 15, fontWeight: '700', color: NAVY },
  btnNavy: {
    backgroundColor: NAVY, borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginTop: 4,
  },
  btnNavyTxt: { fontSize: 15, fontWeight: '700', color: WHITE },
  linkBtn:    { alignItems: 'center', marginTop: 14 },
  linkTxt:    { fontSize: 13, color: MUTED },
  footer:     { position: 'absolute', bottom: 24, fontSize: 11, color: 'rgba(27,58,92,0.45)', textAlign: 'center' },
});
