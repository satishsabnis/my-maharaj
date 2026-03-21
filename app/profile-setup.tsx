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
  Image,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '../lib/supabase';
import { navy, gold, white, lightGray, darkGray, midGray, errorRed } from '../theme/colors';

// ── Constants ─────────────────────────────────────────────────────────────────

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'mr', label: 'मराठी' },
  { code: 'gu', label: 'ગુજરાતી' },
];

const RELATIONSHIPS = ['Self', 'Spouse', 'Child', 'Parent', 'Sibling', 'Other'];

const CUISINES = [
  'Konkani', 'Malvani', 'Mangalorean', 'Kerala', 'Tamil Nadu',
  'Goan', 'Vidarbha', 'Madhya Pradesh', 'Bangalore', 'Sindhudurg',
  'Gujarati', 'North Indian', 'Rajasthani', 'Mughlai', 'Lucknowi/Awadhi',
  'Himachali', 'Uttarakhandi',
];

const EXTRA_VEG_DAYS = ['Sunday', 'Tuesday', 'Wednesday', 'Thursday', 'Saturday'];

// ── Types ─────────────────────────────────────────────────────────────────────

interface FamilyMember {
  name: string;
  age: string;
  relationship: string;
  is_diabetic: boolean;
  has_bp: boolean;
  has_pcos: boolean;
  other_conditions: string[];
  food_likes: string;
  food_dislikes: string;
  allergies: string;
  remarks: string;
  lipidPdfUri: string | null;
  lipidPdfName: string | null;
  lipid_test_date: string;
  lipid_expiry_date: string;
}

interface AddressEntry {
  label: string;
  address_line: string;
  city: string;
  country: string;
  is_default: boolean;
}

const emptyMember = (): FamilyMember => ({
  name: '', age: '', relationship: 'Self',
  is_diabetic: false, has_bp: false, has_pcos: false,
  other_conditions: [],
  food_likes: '', food_dislikes: '', allergies: '', remarks: '',
  lipidPdfUri: null, lipidPdfName: null,
  lipid_test_date: '', lipid_expiry_date: '',
});

const emptyAddress = (): AddressEntry => ({
  label: 'Home', address_line: '', city: 'Dubai', country: 'UAE', is_default: false,
});

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProfileSetupScreen() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1
  const [familyName, setFamilyName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [language, setLanguage] = useState('en');

  // Step 2 – member count then member details
  const [memberCount, setMemberCount] = useState(1);
  const [memberCountSet, setMemberCountSet] = useState(false);
  const [members, setMembers] = useState<FamilyMember[]>([emptyMember()]);

  // Step 3
  const [addresses, setAddresses] = useState<AddressEntry[]>([emptyAddress()]);

  // Step 4
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [extraVegDays, setExtraVegDays] = useState<string[]>([]);

  // ── Step 1: Avatar picker ──────────────────────────────────────────────────

  async function pickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { setError('Photo library permission required.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  }

  // ── Step 2: Member helpers ─────────────────────────────────────────────────

  function updateMemberAt<K extends keyof FamilyMember>(idx: number, key: K, value: FamilyMember[K]) {
    setMembers((prev) => prev.map((m, i) => i === idx ? { ...m, [key]: value } : m));
  }

  function initMembers(count: number) {
    setMemberCount(count);
    setMembers((prev) => {
      const next: FamilyMember[] = [];
      for (let i = 0; i < count; i++) next.push(prev[i] ?? emptyMember());
      return next;
    });
    setMemberCountSet(true);
  }

  function calcExpiry(testDate: string, age: string): string {
    if (!testDate) return '';
    const d = new Date(testDate);
    if (isNaN(d.getTime())) return '';
    const ageNum = parseInt(age, 10);
    const days = !isNaN(ageNum) && ageNum >= 50 ? 90 : 180;
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }

  function handleTestDateChangeAt(idx: number, date: string) {
    const expiry = calcExpiry(date, members[idx]?.age ?? '');
    setMembers((prev) => prev.map((m, i) => i === idx ? { ...m, lipid_test_date: date, lipid_expiry_date: expiry } : m));
  }

  async function pickLipidPdfAt(idx: number) {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (!result.canceled && result.assets[0]) {
      updateMemberAt(idx, 'lipidPdfUri', result.assets[0].uri);
      updateMemberAt(idx, 'lipidPdfName', result.assets[0].name);
    }
  }

  // ── Step 3: Address helpers ────────────────────────────────────────────────

  function updateAddress<K extends keyof AddressEntry>(idx: number, key: K, value: AddressEntry[K]) {
    setAddresses((prev) => prev.map((a, i) => i === idx ? { ...a, [key]: value } : a));
  }

  function setDefaultAddress(idx: number) {
    setAddresses((prev) => prev.map((a, i) => ({ ...a, is_default: i === idx })));
  }

  function addAddress() {
    if (addresses.length >= 3) return;
    setAddresses((prev) => [...prev, emptyAddress()]);
  }

  function removeAddress(idx: number) {
    if (addresses.length <= 1) return;
    setAddresses((prev) => prev.filter((_, i) => i !== idx));
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  function nextStep() {
    setError('');
    if (currentStep === 1) {
      if (!familyName.trim()) { setError('Please enter your family name.'); return; }
    }
    if (currentStep === 2 && memberCountSet) {
      const invalid = members.find((m) => !m.name.trim() || !m.age.trim());
      if (invalid) { setError('Please enter name and age for all members.'); return; }
    }
    if (currentStep < 4) setCurrentStep((s) => (s + 1) as 1|2|3|4);
    else void handleSave();
  }

  function prevStep() {
    setError('');
    if (currentStep > 1) setCurrentStep((s) => (s - 1) as 1|2|3|4);
    else router.back();
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    setLoading(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated.');

      // Upload avatar
      let avatarUrl: string | null = null;
      if (avatarUri) {
        try {
          const response = await fetch(avatarUri);
          const blob = await response.blob();
          const { data: uploadData } = await supabase.storage
            .from('avatars')
            .upload(`${user.id}/avatar.jpg`, blob, { upsert: true, contentType: 'image/jpeg' });
          if (uploadData) {
            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(uploadData.path);
            avatarUrl = publicUrl;
          }
        } catch { /* storage bucket may not exist yet */ }
      }

      // Upsert profile
      const { error: profileErr } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: user.user_metadata?.full_name ?? '',
        family_name: familyName.trim(),
        mobile_number: mobileNumber.trim() ? `+971${mobileNumber.trim()}` : null,
        avatar_url: avatarUrl,
        app_language: language,
      });
      if (profileErr) throw new Error(profileErr.message);

      // Save family members
      const allMembers = members.filter((m) => m.name.trim());

      if (allMembers.length > 0) {
        await supabase.from('family_members').delete().eq('user_id', user.id);
        const memberRows = await Promise.all(allMembers.map(async (m) => {
          let lipidUrl: string | null = null;
          if (m.lipidPdfUri) {
            try {
              const res = await fetch(m.lipidPdfUri);
              const blob = await res.blob();
              const safeName = m.name.replace(/\s+/g, '_');
              await supabase.storage.from('documents').upload(
                `${user.id}/lipid_${safeName}.pdf`, blob, { upsert: true, contentType: 'application/pdf' }
              );
              lipidUrl = m.lipidPdfUri;
            } catch { /* skip */ }
          }
          return {
            user_id: user.id,
            name: m.name,
            age: parseInt(m.age, 10) || 0,
            relationship: m.relationship,
            is_diabetic: m.is_diabetic,
            has_bp: m.has_bp,
            has_pcos: m.has_pcos,
            other_conditions: m.other_conditions.length > 0 ? JSON.stringify(m.other_conditions) : null,
            food_likes: m.food_likes || null,
            food_dislikes: m.food_dislikes || null,
            allergies: m.allergies || null,
            remarks: m.remarks || null,
            lipid_profile_url: lipidUrl,
            lipid_test_date: m.lipid_test_date || null,
            lipid_expiry_date: m.lipid_expiry_date || null,
          };
        }));
        const { error: membErr } = await supabase.from('family_members').insert(memberRows);
        if (membErr) throw new Error(membErr.message);
      }

      // Save addresses
      const validAddresses = addresses.filter((a) => a.address_line.trim());
      if (validAddresses.length > 0) {
        await supabase.from('user_addresses').delete().eq('user_id', user.id);
        const { error: addrErr } = await supabase.from('user_addresses').insert(
          validAddresses.map((a) => ({ ...a, user_id: user.id }))
        );
        if (addrErr) throw new Error(addrErr.message);
      }

      // Save cuisines
      if (cuisines.length > 0) {
        await supabase.from('cuisine_preferences').delete().eq('user_id', user.id);
        const { error: cuisErr } = await supabase.from('cuisine_preferences').insert(
          cuisines.map((c) => ({ user_id: user.id, cuisine_name: c, is_excluded: false, weight: 5 }))
        );
        if (cuisErr) throw new Error(cuisErr.message);
      }

      router.replace('/home');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Render helpers ─────────────────────────────────────────────────────────

  function renderStep1() {
    return (
      <View>
        <SectionLabel>Profile Photo</SectionLabel>
        <View style={s.avatarRow}>
          <TouchableOpacity style={s.avatarPicker} onPress={pickAvatar} activeOpacity={0.8}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={s.avatarImage} />
            ) : (
              <View style={s.avatarPlaceholder}>
                <Text style={s.avatarPlaceholderText}>📷</Text>
                <Text style={s.avatarPlaceholderLabel}>Upload Photo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <SectionLabel>Family Name</SectionLabel>
        <TextInput
          style={s.input}
          value={familyName}
          onChangeText={setFamilyName}
          placeholder="e.g. The Sharma Family"
          placeholderTextColor={midGray}
        />

        <SectionLabel>Mobile Number</SectionLabel>
        <View style={s.mobileRow}>
          <View style={s.countryCode}><Text style={s.countryCodeText}>🇦🇪 +971</Text></View>
          <TextInput
            style={s.mobileInput}
            value={mobileNumber}
            onChangeText={setMobileNumber}
            placeholder="50 123 4567"
            placeholderTextColor={midGray}
            keyboardType="phone-pad"
          />
        </View>

        <SectionLabel>Preferred Language</SectionLabel>
        <View style={s.segRow}>
          {LANGUAGES.map((l) => (
            <TouchableOpacity
              key={l.code}
              style={[s.seg, language === l.code && s.segActive]}
              onPress={() => setLanguage(l.code)}
            >
              <Text style={[s.segText, language === l.code && s.segTextActive]}>{l.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  function renderStep2() {
    // Sub-step A: ask how many members
    if (!memberCountSet) {
      return (
        <View>
          <Text style={s.sectionTitle}>How many family members are in your household?</Text>
          <Text style={s.subLabel}>Including yourself (min 1, max 10)</Text>
          <View style={s.counterRow}>
            <TouchableOpacity
              style={[s.counterBtn, memberCount <= 1 && s.counterBtnDisabled]}
              onPress={() => setMemberCount((c) => Math.max(1, c - 1))}
              disabled={memberCount <= 1}
            >
              <Text style={s.counterBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={s.counterValue}>{memberCount}</Text>
            <TouchableOpacity
              style={[s.counterBtn, memberCount >= 10 && s.counterBtnDisabled]}
              onPress={() => setMemberCount((c) => Math.min(10, c + 1))}
              disabled={memberCount >= 10}
            >
              <Text style={s.counterBtnText}>+</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={s.addMemberBtn} onPress={() => initMembers(memberCount)} activeOpacity={0.8}>
            <Text style={s.addMemberBtnText}>Continue — Fill in {memberCount} member{memberCount > 1 ? 's' : ''} →</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Sub-step B: fill in details for each member
    const ALL_CONDITIONS: Array<[string, 'is_diabetic' | 'has_bp' | 'has_pcos']> = [
      ['Diabetic', 'is_diabetic'], ['Blood Pressure', 'has_bp'], ['PCOS/PCOD', 'has_pcos'],
    ];
    const OTHER_CONDS = ['Cholesterol', 'Thyroid', 'Kidney Disease', 'Heart Disease', 'Obesity', 'Anaemia', 'Lactose Intolerant', 'Gluten Intolerant'];

    return (
      <View>
        <View style={s.counterEditRow}>
          <Text style={s.sectionTitle}>{memberCount} Family Member{memberCount > 1 ? 's' : ''}</Text>
          <TouchableOpacity onPress={() => setMemberCountSet(false)}>
            <Text style={s.editCountLink}>Change count</Text>
          </TouchableOpacity>
        </View>

        {members.map((m, idx) => {
          const ageNum = parseInt(m.age, 10);
          const lipidHint = !isNaN(ageNum) && ageNum >= 50
            ? 'Recommended — age 50+ should upload lipid profile'
            : 'Optional — upload if available';
          return (
            <View key={idx} style={s.memberFormCard}>
              <Text style={s.memberFormTitle}>Member {idx + 1}</Text>

              <SectionLabel>Name *</SectionLabel>
              <TextInput style={s.input} value={m.name} onChangeText={(v) => updateMemberAt(idx, 'name', v)} placeholder="Full name" placeholderTextColor={midGray} />

              <SectionLabel>Age *</SectionLabel>
              <TextInput style={s.input} value={m.age} onChangeText={(v) => updateMemberAt(idx, 'age', v)} placeholder="Age" placeholderTextColor={midGray} keyboardType="numeric" />

              <SectionLabel>Relationship</SectionLabel>
              <View style={s.chipRow}>
                {RELATIONSHIPS.map((r) => (
                  <TouchableOpacity key={r} style={[s.chip, m.relationship === r && s.chipActive]} onPress={() => updateMemberAt(idx, 'relationship', r)}>
                    <Text style={[s.chipText, m.relationship === r && s.chipTextActive]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <SectionLabel>Health Conditions</SectionLabel>
              <View style={s.chipRow}>
                {ALL_CONDITIONS.map(([label, key]) => (
                  <TouchableOpacity
                    key={key}
                    style={[s.chip, m[key] && s.chipActive]}
                    onPress={() => updateMemberAt(idx, key, !m[key])}
                  >
                    <Text style={[s.chipText, m[key] && s.chipTextActive]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={s.chipRow}>
                {OTHER_CONDS.map((cond) => (
                  <TouchableOpacity
                    key={cond}
                    style={[s.chip, m.other_conditions.includes(cond) && s.chipActive]}
                    onPress={() => updateMemberAt(idx, 'other_conditions',
                      m.other_conditions.includes(cond)
                        ? m.other_conditions.filter((c) => c !== cond)
                        : [...m.other_conditions, cond]
                    )}
                  >
                    <Text style={[s.chipText, m.other_conditions.includes(cond) && s.chipTextActive]}>{cond}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <SectionLabel>Lipid Profile Report (PDF) — <Text style={{ color: midGray, fontWeight: '400' }}>Optional</Text></SectionLabel>
              <Text style={s.lipidHint}>{lipidHint}</Text>
              <TouchableOpacity style={s.uploadBtn} onPress={() => void pickLipidPdfAt(idx)} activeOpacity={0.8}>
                <Text style={s.uploadBtnText}>{m.lipidPdfName ?? '📄 Upload PDF (optional)'}</Text>
              </TouchableOpacity>

              {m.lipidPdfUri ? (
                <>
                  <SectionLabel>Lipid Test Date (YYYY-MM-DD)</SectionLabel>
                  <TextInput
                    style={s.input}
                    value={m.lipid_test_date}
                    onChangeText={(v) => handleTestDateChangeAt(idx, v)}
                    placeholder="2025-01-15"
                    placeholderTextColor={midGray}
                  />
                  {m.lipid_expiry_date ? (
                    <Text style={s.expiryLabel}>
                      Expires: {m.lipid_expiry_date}
                      {!isNaN(ageNum) && ageNum >= 50 ? ' (90-day cycle — age 50+)' : ' (180-day cycle)'}
                    </Text>
                  ) : null}
                </>
              ) : null}
            </View>
          );
        })}
      </View>
    );
  }

  function renderStep3() {
    return (
      <View>
        <Text style={s.subLabel}>Add up to 3 addresses</Text>
        {addresses.map((addr, idx) => (
          <View key={idx} style={s.addressCard}>
            <View style={s.addressCardHeader}>
              <Text style={s.addressCardTitle}>Address {idx + 1}</Text>
              {addresses.length > 1 && (
                <TouchableOpacity onPress={() => removeAddress(idx)}>
                  <Text style={{ color: errorRed }}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>

            <SectionLabel>Label</SectionLabel>
            <View style={s.chipRow}>
              {['Home', 'Work', 'Other'].map((lbl) => (
                <TouchableOpacity key={lbl} style={[s.chip, addr.label === lbl && s.chipActive]} onPress={() => updateAddress(idx, 'label', lbl)}>
                  <Text style={[s.chipText, addr.label === lbl && s.chipTextActive]}>{lbl}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <SectionLabel>Address Line</SectionLabel>
            <TextInput style={s.input} value={addr.address_line} onChangeText={(v) => updateAddress(idx, 'address_line', v)} placeholder="Building, street, area" placeholderTextColor={midGray} />

            <SectionLabel>City</SectionLabel>
            <TextInput style={s.input} value={addr.city} onChangeText={(v) => updateAddress(idx, 'city', v)} placeholder="Dubai" placeholderTextColor={midGray} />

            <SectionLabel>Country</SectionLabel>
            <TextInput style={s.input} value={addr.country} onChangeText={(v) => updateAddress(idx, 'country', v)} placeholder="UAE" placeholderTextColor={midGray} />

            <TouchableOpacity
              style={[s.defaultToggle, addr.is_default && s.defaultToggleActive]}
              onPress={() => setDefaultAddress(idx)}
            >
              <Text style={[s.defaultToggleText, addr.is_default && s.defaultToggleTextActive]}>
                {addr.is_default ? '✓ Default Address' : 'Set as Default'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}

        {addresses.length < 3 && (
          <TouchableOpacity style={s.addMemberBtn} onPress={addAddress} activeOpacity={0.8}>
            <Text style={s.addMemberBtnText}>+ Add Another Address</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  function renderStep4() {
    return (
      <View>
        <SectionLabel>Select Cuisines You Enjoy</SectionLabel>
        <View style={s.chipRow}>
          {CUISINES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[s.chip, cuisines.includes(c) && s.chipActive]}
              onPress={() => setCuisines((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])}
            >
              <Text style={[s.chipText, cuisines.includes(c) && s.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <SectionLabel>Vegetarian Days</SectionLabel>
        <Text style={s.subLabel}>Monday and Friday are always vegetarian</Text>
        <View style={s.chipRow}>
          {['Monday', 'Friday'].map((d) => (
            <View key={d} style={[s.chip, s.chipActive, { opacity: 0.6 }]}>
              <Text style={[s.chipText, s.chipTextActive]}>{d} 🔒</Text>
            </View>
          ))}
          {EXTRA_VEG_DAYS.map((d) => (
            <TouchableOpacity
              key={d}
              style={[s.chip, extraVegDays.includes(d) && s.chipActive]}
              onPress={() => setExtraVegDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d])}
            >
              <Text style={[s.chipText, extraVegDays.includes(d) && s.chipTextActive]}>{d}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  const STEP_TITLES = ['Family Info', 'Family Members', 'Address', 'Cuisine'];
  const stepContent = [renderStep1, renderStep2, renderStep3, renderStep4][currentStep - 1];

  return (
    <SafeAreaView style={s.safe}>
      {/* Progress bar */}
      <View style={s.progressBar}>
        {STEP_TITLES.map((title, i) => (
          <TouchableOpacity
            key={i}
            style={s.progressStep}
            onPress={() => { if (i + 1 < currentStep) setCurrentStep((i + 1) as 1|2|3|4); }}
          >
            <View style={[s.progressDot, currentStep > i + 1 && s.progressDotDone, currentStep === i + 1 && s.progressDotActive]}>
              <Text style={[s.progressDotText, (currentStep >= i + 1) && s.progressDotTextActive]}>
                {currentStep > i + 1 ? '✓' : String(i + 1)}
              </Text>
            </View>
            <Text style={[s.progressLabel, currentStep === i + 1 && s.progressLabelActive]}>{title}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={s.container}>
          <Text style={s.stepTitle}>Step {currentStep} of 4 — {STEP_TITLES[currentStep - 1]}</Text>

          {stepContent?.()}

          {error ? <Text style={s.errorText}>{error}</Text> : null}

          {/* Navigation buttons */}
          <View style={s.navRow}>
            <TouchableOpacity style={s.backBtn} onPress={prevStep}>
              <Text style={s.backBtnText}>← {currentStep === 1 ? 'Cancel' : 'Back'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.nextBtn, loading && { opacity: 0.6 }]}
              onPress={nextStep}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={white} />
              ) : (
                <Text style={s.nextBtnText}>{currentStep === 4 ? 'Save & Continue →' : 'Next →'}</Text>
              )}
            </TouchableOpacity>
          </View>

          {currentStep === 2 && (
            <TouchableOpacity style={s.skipLink} onPress={() => { setError(''); setCurrentStep(3); }}>
              <Text style={s.skipLinkText}>Skip — add members later</Text>
            </TouchableOpacity>
          )}
          {currentStep === 3 && (
            <TouchableOpacity style={s.skipLink} onPress={() => { setError(''); setCurrentStep(4); }}>
              <Text style={s.skipLinkText}>Skip — add address later</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-component ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={s.fieldLabel}>{children}</Text>;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: white },
  scroll: { flexGrow: 1 },
  container: { paddingHorizontal: 24, paddingBottom: 60, maxWidth: 560, width: '100%', alignSelf: 'center' },

  // Progress
  progressBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: navy, paddingHorizontal: 20, paddingTop: Platform.OS === 'web' ? 28 : 16, paddingBottom: 20 },
  progressStep: { flex: 1, alignItems: 'center', gap: 6 },
  progressDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  progressDotActive: { backgroundColor: gold },
  progressDotDone: { backgroundColor: '#16A34A' },
  progressDotText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '700' },
  progressDotTextActive: { color: white },
  progressLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', textAlign: 'center', fontWeight: '500' },
  progressLabelActive: { color: white, fontWeight: '700' },

  stepTitle: { fontSize: 18, fontWeight: '800', color: navy, marginTop: 28, marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: navy, marginBottom: 12, marginTop: 8 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: darkGray, marginTop: 16, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  subLabel: { fontSize: 12, color: midGray, marginBottom: 12 },

  input: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827', backgroundColor: lightGray },

  // Avatar
  avatarRow: { alignItems: 'center', marginBottom: 8 },
  avatarPicker: { width: 96, height: 96, borderRadius: 48, overflow: 'hidden', borderWidth: 2, borderColor: gold },
  avatarImage: { width: 96, height: 96 },
  avatarPlaceholder: { width: 96, height: 96, backgroundColor: lightGray, alignItems: 'center', justifyContent: 'center', gap: 4 },
  avatarPlaceholderText: { fontSize: 28 },
  avatarPlaceholderLabel: { fontSize: 10, color: midGray, fontWeight: '600' },

  // Mobile
  mobileRow: { flexDirection: 'row', gap: 10 },
  countryCode: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: lightGray, justifyContent: 'center' },
  countryCodeText: { fontSize: 14, color: darkGray, fontWeight: '600' },
  mobileInput: { flex: 1, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827', backgroundColor: lightGray },

  // Language / Segment
  segRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  seg: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: white },
  segActive: { backgroundColor: gold, borderColor: gold },
  segText: { fontSize: 14, color: darkGray, fontWeight: '500' },
  segTextActive: { color: white, fontWeight: '700' },

  // Chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: white },
  chipActive: { backgroundColor: navy, borderColor: navy },
  chipText: { fontSize: 13, color: darkGray, fontWeight: '500' },
  chipTextActive: { color: white, fontWeight: '600' },

  // Member count picker
  counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginVertical: 24 },
  counterBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: navy, alignItems: 'center', justifyContent: 'center' },
  counterBtnDisabled: { backgroundColor: '#D1D5DB' },
  counterBtnText: { color: white, fontSize: 26, fontWeight: '700', lineHeight: 30 },
  counterValue: { fontSize: 48, fontWeight: '900', color: navy, minWidth: 60, textAlign: 'center' },
  counterEditRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  editCountLink: { fontSize: 13, color: navy, fontWeight: '600', textDecorationLine: 'underline' },

  // Member form card
  memberFormCard: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1.5, borderColor: '#E5E7EB' },
  memberFormTitle: { fontSize: 15, fontWeight: '800', color: navy, marginBottom: 8 },
  lipidHint: { fontSize: 11, color: midGray, marginBottom: 8, fontStyle: 'italic' },

  // Legacy members
  memberCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F4FF', borderRadius: 10, padding: 12, marginBottom: 8 },
  memberName: { fontSize: 14, fontWeight: '700', color: navy },
  memberSub: { fontSize: 12, color: midGray, marginTop: 2 },

  // Upload
  uploadBtn: { borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: lightGray },
  uploadBtnText: { fontSize: 14, color: darkGray },
  expiryLabel: { fontSize: 12, color: midGray, marginTop: 6 },

  // Add member
  addMemberBtn: { borderWidth: 1.5, borderColor: navy, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 20, marginBottom: 8 },
  addMemberBtnText: { color: navy, fontSize: 15, fontWeight: '700' },

  // Address
  addressCard: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  addressCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  addressCardTitle: { fontSize: 14, fontWeight: '700', color: navy },
  defaultToggle: { marginTop: 12, borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  defaultToggleActive: { borderColor: '#16A34A', backgroundColor: '#F0FDF4' },
  defaultToggleText: { fontSize: 13, color: midGray, fontWeight: '600' },
  defaultToggleTextActive: { color: '#16A34A' },

  // Nav
  navRow: { flexDirection: 'row', gap: 12, marginTop: 32 },
  backBtn: { flex: 1, borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  backBtnText: { color: darkGray, fontSize: 15, fontWeight: '600' },
  nextBtn: { flex: 2, backgroundColor: gold, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  nextBtnText: { color: white, fontSize: 15, fontWeight: '700' },
  skipLink: { alignItems: 'center', marginTop: 16 },
  skipLinkText: { color: midGray, fontSize: 13 },
  errorText: { color: errorRed, fontSize: 13, textAlign: 'center', marginTop: 16 },
});
