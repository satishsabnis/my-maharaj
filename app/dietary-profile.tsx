import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking, Modal, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { supabase, getSessionUser } from '../lib/supabase';
import Button from '../components/Button';
import Input from '../components/Input';
import ScreenWrapper from '../components/ScreenWrapper';
import { getCuisineGroups } from '../lib/cuisineGroups';
import { navy, gold, textSec, errorRed, white, border, surface, successGreen } from '../theme/colors';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
  id: string;
  name: string;
  age: number;
  health_notes: string | null;
  nationality: string | null;
}

interface MemberForm {
  name: string;
  age: string;
  nationality: string;
  nativeLanguage: string;
  foodPreference: string;
  healthConditions: string[];
  notes: string;
}

const NATIONALITIES = [
  'Afghan','Australian','Bangladeshi','British','Canadian','Chinese','Dutch',
  'Egyptian','Ethiopian','Filipino','French','German','Greek','Indian','Indonesian',
  'Iranian','Iraqi','Italian','Japanese','Jordanian','Korean','Kuwaiti','Lebanese',
  'Malaysian','Maldivian','Mexican','Moroccan','Nepali','Nigerian','Omani','Pakistani',
  'Palestinian','Qatari','Russian','Saudi','Singaporean','South African','Spanish',
  'Sri Lankan','Sudanese','Syrian','Thai','Turkish','UAE National','Ugandan',
  'Ukrainian','American','Vietnamese','Yemeni','Zimbabwean',
].sort();

const LANGUAGES = [
  'Arabic','Bengali','Chinese','Dutch','English','Filipino','French','German',
  'Gujarati','Hindi','Indonesian','Italian','Japanese','Kannada','Korean',
  'Malayalam','Marathi','Nepali','Odia','Pashto','Persian','Punjabi','Russian',
  'Sinhala','Spanish','Swahili','Tamil','Telugu','Thai','Turkish','Urdu','Vietnamese',
].sort();

const HEALTH_PILLS = ['Diabetic', 'BP', 'PCOS', 'Cholesterol', 'Thyroid', 'Heart', 'Kidney', 'Anaemia', 'Lactose', 'Gluten'];

// P6: Cuisines dynamically sourced from RAG dish database
const CUISINE_GROUPS_PROFILE = getCuisineGroups();
const ALL_CUISINES = CUISINE_GROUPS_PROFILE.flatMap(g => g.cuisines);

function formToNotes(form: MemberForm): string {
  return [...form.healthConditions, form.notes.trim()].filter(Boolean).join(', ');
}

function emptyForm(): MemberForm {
  return { name: '', age: '', nationality: '', nativeLanguage: '', foodPreference: 'Mixed', healthConditions: [], notes: '' };
}

function memberToForm(m: Member): MemberForm {
  const notes = m.health_notes ?? '';
  const conds = HEALTH_PILLS.filter((p) => notes.toLowerCase().includes(p.toLowerCase()));
  const others = conds.reduce((s, c) => s.replace(new RegExp(`,?\\s*${c}`, 'gi'), ''), notes).replace(/^,+|,+$/g, '').trim();
  return { name: m.name, age: String(m.age || ''), nationality: '', nativeLanguage: '', foodPreference: 'Mixed', healthConditions: conds, notes: others };
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DietaryProfileScreen() {
  const [members,          setMembers]          = useState<Member[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [saving,           setSaving]           = useState(false);
  const [modalOpen,        setModalOpen]        = useState(false);
  const [editId,           setEditId]           = useState<string | null>(null);
  const [form,             setForm]             = useState<MemberForm>(emptyForm());
  const [natSuggestions,   setNatSuggestions]   = useState<string[]>([]);
  const [langSuggestions,  setLangSuggestions]  = useState<string[]>([]);
  const [formError,        setFormError]        = useState('');
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [cuisineSaving,    setCuisineSaving]    = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const snapshotRef = useRef('');
  const [cuisineSearch,    setCuisineSearch]    = useState('');

  // Household settings
  const [subTier, setSubTier] = useState('Free');
  const [subExpiry, setSubExpiry] = useState('—');
  const [isFirstSetup, setIsFirstSetup] = useState(false);
  const [hasInsurance, setHasInsurance] = useState(false);
  const [insuranceExpiry, setInsuranceExpiry] = useState('');
  const [referralConsent, setReferralConsent] = useState(false);
  const [maharajDay, setMaharajDay] = useState('Saturday');
  const [isJainFamily, setIsJainFamily] = useState(false);
  const [jainAllowNonJain, setJainAllowNonJain] = useState(false);
  const [fastingDays, setFastingDays] = useState<string[]>([]);
  const [storePrefs, setStorePrefs] = useState<string[]>([]);
  const [deliveryPrefs, setDeliveryPrefs] = useState<string[]>([]);
  const [cookingSkill, setCookingSkill] = useState('');
  const [budgetPref, setBudgetPref] = useState('');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['English']);
  const [languageSearch, setLanguageSearch] = useState('');
  const [fastingDaysText, setFastingDaysText] = useState('');
  const [notifFestivals, setNotifFestivals] = useState(true);
  const [notifLabReports, setNotifLabReports] = useState(true);
  const [notifInsurance, setNotifInsurance] = useState(true);
  const [fullName, setFullName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Load household settings on mount
  useEffect(() => {
    async function loadHousehold() {
      // Load subscription from Supabase profiles
      try {
        const user = await getSessionUser();
        if (user) {
          const { data: prof } = await supabase.from('profiles').select('subscription_tier, subscription_expires_at').eq('id', user.id).maybeSingle();
          if (prof?.subscription_tier) setSubTier(prof.subscription_tier);
          if (prof?.subscription_expires_at) setSubExpiry(new Date(prof.subscription_expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }));
        }
      } catch {}
      const [ins, insExp, ref, fast, store, del, cook, bud, mDay] = await Promise.all([
        AsyncStorage.getItem('household_insurance'), AsyncStorage.getItem('insurance_expiry'),
        AsyncStorage.getItem('referral_consent'), AsyncStorage.getItem('fasting_days'),
        AsyncStorage.getItem('store_prefs'), AsyncStorage.getItem('delivery_prefs'),
        AsyncStorage.getItem('cooking_skill'), AsyncStorage.getItem('budget_pref'),
        AsyncStorage.getItem('maharaj_day'),
      ]);
      if (mDay) setMaharajDay(mDay);
      const jf = await AsyncStorage.getItem('jain_family');
      const jnj = await AsyncStorage.getItem('jain_allow_non_jain');
      if (jf === 'true') setIsJainFamily(true);
      if (jnj === 'true') setJainAllowNonJain(true);
      if (ins === 'true') setHasInsurance(true); if (insExp) setInsuranceExpiry(insExp);
      if (ref === 'true') setReferralConsent(true);
      if (fast) try { setFastingDays(JSON.parse(fast)); } catch {}
      if (store) try { setStorePrefs(JSON.parse(store)); } catch {}
      if (del) try { setDeliveryPrefs(JSON.parse(del)); } catch {}
      if (cook) setCookingSkill(cook); if (bud) setBudgetPref(bud);
      // New fields
      const [langs, fText, nf, nl, ni, phone] = await Promise.all([
        AsyncStorage.getItem('app_languages'), AsyncStorage.getItem('fasting_days_text'),
        AsyncStorage.getItem('notif_festivals'), AsyncStorage.getItem('notif_lab_reports'),
        AsyncStorage.getItem('notif_insurance_reminders'), AsyncStorage.getItem('phone_number'),
      ]);
      if (langs) try { setSelectedLanguages(JSON.parse(langs)); } catch {}
      if (fText) setFastingDaysText(fText);
      if (nf !== null) setNotifFestivals(nf !== 'false');
      if (nl !== null) setNotifLabReports(nl !== 'false');
      if (ni !== null) setNotifInsurance(ni !== 'false');
      if (phone) setPhoneNumber(phone);
      // Check first setup
      const profileDone = await AsyncStorage.getItem('profile_setup_complete');
      if (!profileDone) setIsFirstSetup(true);
      // Load user info
      const user = await getSessionUser();
      if (user) {
        setFullName((user.user_metadata?.full_name ?? '') as string);
        setUserEmail(user.email ?? '');
      }
    }
    loadHousehold().then(() => {
      // Q5: Snapshot current values for change detection
      setTimeout(() => {
        snapshotRef.current = JSON.stringify({ maharajDay, hasInsurance, insuranceExpiry, referralConsent, fastingDaysText, storePrefs, deliveryPrefs, cookingSkill, budgetPref, selectedLanguages, notifFestivals, notifLabReports, notifInsurance, fullName, phoneNumber });
      }, 500);
    });
  }, []);

  // Q5: Detect changes for Save button state
  useEffect(() => {
    if (!snapshotRef.current) return;
    const current = JSON.stringify({ maharajDay, hasInsurance, insuranceExpiry, referralConsent, fastingDaysText, storePrefs, deliveryPrefs, cookingSkill, budgetPref, selectedLanguages, notifFestivals, notifLabReports, notifInsurance, fullName, phoneNumber });
    setHasChanges(current !== snapshotRef.current);
  }, [maharajDay, hasInsurance, insuranceExpiry, referralConsent, fastingDaysText, storePrefs, deliveryPrefs, cookingSkill, budgetPref, selectedLanguages, notifFestivals, notifLabReports, notifInsurance, fullName, phoneNumber]);

  async function saveHousehold() {
    await Promise.all([
      AsyncStorage.setItem('household_insurance', hasInsurance ? 'true' : 'false'),
      AsyncStorage.setItem('insurance_expiry', insuranceExpiry),
      AsyncStorage.setItem('referral_consent', referralConsent ? 'true' : 'false'),
      AsyncStorage.setItem('fasting_days', JSON.stringify(fastingDays)), // legacy
      AsyncStorage.setItem('maharaj_day', maharajDay),
      AsyncStorage.setItem('jain_family', String(isJainFamily)),
      AsyncStorage.setItem('jain_allow_non_jain', String(jainAllowNonJain)),
      AsyncStorage.setItem('store_prefs', JSON.stringify(storePrefs)),
      AsyncStorage.setItem('delivery_prefs', JSON.stringify(deliveryPrefs)),
      AsyncStorage.setItem('cooking_skill', cookingSkill),
      AsyncStorage.setItem('budget_pref', budgetPref),
      AsyncStorage.setItem('app_languages', JSON.stringify(selectedLanguages)),
      AsyncStorage.setItem('fasting_days_text', fastingDaysText),
      AsyncStorage.setItem('notif_festivals', String(notifFestivals)),
      AsyncStorage.setItem('notif_lab_reports', String(notifLabReports)),
      AsyncStorage.setItem('notif_insurance_reminders', String(notifInsurance)),
      AsyncStorage.setItem('phone_number', phoneNumber),
    ]);
    // Save full name + phone to Supabase
    try {
      const user = await getSessionUser();
      if (user) { await supabase.from('profiles').upsert({ id: user.id, full_name: fullName, phone_number: phoneNumber, updated_at: new Date().toISOString() }, { onConflict: 'id' }); }
    } catch {}
    await AsyncStorage.setItem('profile_setup_complete', 'true');
    console.log('profile_setup_complete set to true');
    if (isFirstSetup) {
      setIsFirstSetup(false);
      router.replace('/home');
    } else {
      Alert.alert('Saved', 'Profile saved successfully.');
    }
  }

  function toggleArr(arr: string[], set: React.Dispatch<React.SetStateAction<string[]>>, val: string) {
    set(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  }

  const load = useCallback(async () => {
    setLoading(true);
    const user = await getSessionUser();
    if (!user) { setLoading(false); return; }
    const [{ data: membersData }, { data: cuisineData }] = await Promise.all([
      supabase.from('family_members').select('id, name, age, health_notes').eq('user_id', user.id),
      supabase.from('cuisine_preferences').select('cuisine_name').eq('user_id', user.id).eq('is_excluded', false),
    ]);
    setMembers((membersData as Member[]) ?? []);
    setSelectedCuisines((cuisineData ?? []).map((c: any) => c.cuisine_name));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, []);

  function openAdd() { setEditId(null); setForm(emptyForm()); setFormError(''); setModalOpen(true); }
  function openEdit(m: Member) { setEditId(m.id); setForm(memberToForm(m)); setFormError(''); setModalOpen(true); }

  function toggleHealth(cond: string) {
    setForm((prev) => ({
      ...prev,
      healthConditions: prev.healthConditions.includes(cond)
        ? prev.healthConditions.filter((c) => c !== cond)
        : [...prev.healthConditions, cond],
    }));
  }

  function toggleCuisine(cuisine: string) {
    setSelectedCuisines((prev) =>
      prev.includes(cuisine) ? prev.filter((c) => c !== cuisine) : [...prev, cuisine]
    );
  }

  async function saveMember() {
    if (!form.name.trim()) { setFormError('Name is required'); return; }
    setSaving(true); setFormError('');
    try {
      const user = await getSessionUser();
      if (!user) throw new Error('Not authenticated');
      const payload = { user_id: user.id, name: form.name.trim(), age: parseInt(form.age, 10) || 0, health_notes: formToNotes(form) || null };
      if (editId) {
        const { error: e } = await supabase.from('family_members').update(payload).eq('id', editId);
        if (e) throw new Error(e.message);
      } else {
        const { error: e } = await supabase.from('family_members').insert(payload);
        if (e) throw new Error(e.message);
      }
      setModalOpen(false); await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed.');
    } finally { setSaving(false); }
  }

  async function saveCuisines() {
    setCuisineSaving(true);
    try {
      const user = await getSessionUser();
      if (!user) return;

      // Delete ALL cuisines for this user first
      await supabase.from('cuisine_preferences').delete().eq('user_id', user.id);

      // Then insert the new selection fresh
      if (selectedCuisines.length > 0) {
        const { error: insertErr } = await supabase.from('cuisine_preferences').insert(
          selectedCuisines.map((c) => ({ user_id: user.id, cuisine_name: c, is_excluded: false }))
        );
        if (insertErr) console.error('[DietaryProfile] cuisine insert error:', insertErr.message);
      }
    } catch (e) { console.error('[DietaryProfile] saveCuisines error:', e); } finally { setCuisineSaving(false); }
  }

  async function deleteMember(id: string) {
    await supabase.from('family_members').delete().eq('id', id);
    await load();
  }

  const HEALTH_COLORS: Record<string, { bg: string; fg: string }> = {
    Diabetic: { bg: '#FEF2F2', fg: '#DC2626' }, BP: { bg: '#FFF7ED', fg: '#C2410C' },
    PCOS: { bg: '#FDF4FF', fg: '#7E22CE' }, Cholesterol: { bg: '#FFF1F2', fg: '#BE123C' },
    Thyroid: { bg: '#ECFDF5', fg: '#059669' }, Heart: { bg: '#FEF2F2', fg: '#DC2626' },
    Kidney: { bg: '#EFF6FF', fg: '#1D4ED8' }, Anaemia: { bg: '#FFF7ED', fg: '#B45309' },
    Lactose: { bg: '#F0FDF4', fg: '#166534' }, Gluten: { bg: '#FFFBEB', fg: '#92400E' },
  };

  return (
    <ScreenWrapper title="Family Profile Settings">
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Welcome banner for first setup */}
        {isFirstSetup && (
          <View style={{backgroundColor:'#FFF8E7',borderRadius:10,padding:14,marginBottom:14,borderWidth:1,borderColor:'rgba(201,162,39,0.3)'}}>
            <Text style={{fontSize:12,fontWeight:'700',color:'#854F0B',marginBottom:4}}>Welcome to My Maharaj Beta</Text>
            <Text style={{fontSize:10,color:'#854F0B',lineHeight:16}}>Set up your family profile so Maharaj can personalise your meal plans. Add family members, health conditions and cuisine preferences below.</Text>
          </View>
        )}

        {/* Jain family toggle */}
        <View style={{backgroundColor:'rgba(255,255,255,0.92)',borderRadius:12,padding:14,marginBottom:10,borderWidth:0.5,borderColor:'rgba(27,58,92,0.1)'}}>
          <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
            <Text style={{fontSize:12,fontWeight:'700',color:navy}}>Are you a Jain family?</Text>
            <Switch value={isJainFamily} onValueChange={setIsJainFamily} trackColor={{false:'#D1D5DB',true:gold}} thumbColor={white} />
          </View>
          {isJainFamily && (
            <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:10}}>
              <Text style={{fontSize:11,color:navy,flex:1}}>Would you like Maharaj to suggest non-Jain recipes also?</Text>
              <Switch value={jainAllowNonJain} onValueChange={setJainAllowNonJain} trackColor={{false:'#D1D5DB',true:gold}} thumbColor={white} />
            </View>
          )}
        </View>

        {/* Q7: My Maharaj Day */}
        <View style={{backgroundColor:'rgba(255,255,255,0.92)',borderRadius:12,padding:14,marginBottom:14,borderWidth:1,borderColor:'rgba(201,162,39,0.2)',borderLeftWidth:3,borderLeftColor:gold}}>
          <Text style={{fontSize:13,fontWeight:'700',color:navy,marginBottom:4}}>My Maharaj Day</Text>
          <Text style={{fontSize:10,color:'#6B7280',marginBottom:10}}>Maharaj will automatically plan your week on this day.</Text>
          <View style={{flexDirection:'row',gap:4}}>
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
              <TouchableOpacity key={d} style={{flex:1,paddingVertical:8,borderRadius:8,borderWidth:1.5,borderColor:maharajDay===d?gold:'#D1D5DB',backgroundColor:maharajDay===d?gold:'rgba(255,255,255,0.9)',alignItems:'center'}} onPress={() => setMaharajDay(d)}>
                <Text style={{fontSize:10,fontWeight:'700',color:maharajDay===d?'#1B2A0C':navy}}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Subscription Card */}
        <View style={{backgroundColor:'rgba(255,255,255,0.92)',borderRadius:12,padding:14,marginBottom:14,borderLeftWidth:2,borderLeftColor:gold,borderWidth:1,borderColor:'rgba(27,58,92,0.08)'}}>
          <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:6}}>
            <Text style={{fontSize:12,color:textSec}}>Plan</Text>
            <Text style={{fontSize:12,fontWeight:'700',color:subTier==='Pro'?gold:subTier==='Family'?successGreen:textSec}}>{subTier}</Text>
          </View>
          <View style={{flexDirection:'row',justifyContent:'space-between'}}>
            <Text style={{fontSize:12,color:textSec}}>Valid until</Text>
            <Text style={{fontSize:12,fontWeight:'600',color:navy}}>{subExpiry}</Text>
          </View>
        </View>

        {/* Family Members */}
        {loading ? (
          <Text style={s.loadingText}>Loading...</Text>
        ) : members.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}></Text>
            <Text style={s.emptyTitle}>No family members yet</Text>
            <Text style={s.emptySub}>Add your family members to personalise meal plans</Text>
          </View>
        ) : members.map((m) => {
          const pills = HEALTH_PILLS.filter((p) => (m.health_notes ?? '').toLowerCase().includes(p.toLowerCase()));
          const otherNotes = pills.reduce((s, c) => s.replace(new RegExp(`,?\\s*${c}`, 'gi'), ''), m.health_notes ?? '').replace(/^,+|,+$/g, '').trim();
          return (
            <View key={m.id} style={s.card}>
              <View style={s.cardHeader}>
                <View style={s.memberInfo}>
                  <Text style={s.memberName}>{m.name}</Text>
                  {m.age > 0 && <Text style={s.metaText}>{m.age} yrs</Text>}
                </View>
                <TouchableOpacity onPress={() => openEdit(m)} style={s.editBtn}>
                  <Text style={s.editBtnText}>Edit</Text>
                </TouchableOpacity>
              </View>
              {pills.length > 0 && (
                <View style={s.pillWrap}>
                  {pills.map((p) => (
                    <View key={p} style={[s.healthPill, { backgroundColor: HEALTH_COLORS[p]?.bg ?? '#F3F4F6' }]}>
                      <Text style={[s.healthPillText, { color: HEALTH_COLORS[p]?.fg ?? '#374151' }]}>{p}</Text>
                    </View>
                  ))}
                </View>
              )}
              {otherNotes ? <Text style={s.notesText}>{otherNotes}</Text> : null}
              <TouchableOpacity onPress={() => deleteMember(m.id)} style={s.deleteBtn}>
                <Text style={s.deleteBtnText}>Remove member</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        <View style={s.addWrap}>
          <View style={{flexDirection:'row',gap:12}}>
          <View style={{flex:2}}>
            <Button title="+ Add Family Member" onPress={openAdd} />
          </View>
          <View style={{flex:1}}>
            <Button title="Done" onPress={() => router.push('/home' as never)} variant="outline" />
          </View>
        </View>
        </View>

        {/* Lab Report Link */}
        <TouchableOpacity
          style={s.labReportLink}
          onPress={() => router.push('/lab-report' as never)}
          activeOpacity={0.85}
        >
          <Text style={s.labReportIcon}></Text>
          <View style={{ flex: 1 }}>
            <Text style={s.labReportTitle}>Lab Report Analysis</Text>
            <Text style={s.labReportSub}>Upload blood test results — Maharaj updates dietary recommendations automatically</Text>
          </View>
          <Text style={{ fontSize: 22, color: '#7C3AED', fontWeight: '300' }}>›</Text>
        </TouchableOpacity>

        {/* Cuisine Preferences */}
        <View style={s.cuisineSection}>
          <Text style={s.cuisineTitle}>Cuisine Preferences</Text>
          <Text style={s.cuisineSub}>Select cuisines to guide your meal plans</Text>

          <Text style={s.cuisineCount}>{selectedCuisines.length} cuisine{selectedCuisines.length !== 1 ? 's' : ''} selected</Text>

          <TextInput
            style={{borderWidth:1.5,borderColor:'#E5E7EB',borderRadius:12,paddingHorizontal:14,paddingVertical:10,fontSize:14,color:'#1F2937',backgroundColor:'rgba(255,255,255,0.9)',marginBottom:12}}
            placeholder="Search cuisines..."
            placeholderTextColor="#9CA3AF"
            value={cuisineSearch}
            onChangeText={setCuisineSearch}
          />

          <View style={s.pillRow}>
            {ALL_CUISINES
              .filter(c => !cuisineSearch || c.toLowerCase().includes(cuisineSearch.toLowerCase()))
              .map((c) => (
                <TouchableOpacity key={c} onPress={() => toggleCuisine(c)} activeOpacity={0.75}
                  style={[s.cuisinePill, selectedCuisines.includes(c) && s.cuisinePillActive]}>
                  <Text style={[s.cuisinePillTxt, selectedCuisines.includes(c) && s.cuisinePillTxtActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
          </View>

          <View style={{ marginTop: 16 }}>
            <Button title={cuisineSaving ? 'Saving...' : '✓ Save Cuisine Preferences'} onPress={() => void saveCuisines()} loading={cuisineSaving} />
          </View>
        </View>

        {/* Household Settings */}
        <Text style={{fontSize:14,fontWeight:'700',color:navy,marginTop:20,marginBottom:12}}>Household Settings</Text>

        {/* My Maharaj Day moved to top of profile (Q7) */}

        {/* Insurance */}
        <View style={{backgroundColor:'rgba(255,255,255,0.92)',borderRadius:12,padding:14,marginBottom:10,borderWidth:0.5,borderColor:'rgba(27,58,92,0.1)'}}>
          <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
            <Text style={{fontSize:11,color:navy}}>Family insurance</Text>
            <Switch value={hasInsurance} onValueChange={v=>{setHasInsurance(v);}} trackColor={{false:'#D1D5DB',true:gold}} thumbColor={white} />
          </View>
          {hasInsurance && (
            <View style={{marginTop:8}}>
              <TextInput style={{borderWidth:1,borderColor:border,borderRadius:8,paddingHorizontal:10,paddingVertical:8,fontSize:12,color:navy}} placeholder="DD/MM/YYYY" placeholderTextColor={textSec} value={insuranceExpiry} onChangeText={setInsuranceExpiry} />
              <Text style={{fontSize:8,color:textSec,marginTop:4}}>Maharaj will remind you 1 week before expiry</Text>
            </View>
          )}
        </View>

        {/* Referral Consent */}
        <View style={{backgroundColor:'rgba(255,255,255,0.92)',borderRadius:12,padding:14,marginBottom:10,borderWidth:0.5,borderColor:'rgba(27,58,92,0.1)'}}>
          <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
            <Text style={{fontSize:11,color:navy,flex:1}}>Allow specialist referrals</Text>
            <Switch value={referralConsent} onValueChange={setReferralConsent} trackColor={{false:'#D1D5DB',true:gold}} thumbColor={white} />
          </View>
          <Text style={{fontSize:8,color:textSec,marginTop:4}}>Maharaj may suggest connecting you with a partner health professional when lab reports show values needing attention. You confirm before anything is shared.</Text>
        </View>

        {/* Fasting */}
        <View style={{backgroundColor:'rgba(255,255,255,0.92)',borderRadius:12,padding:14,marginBottom:10,borderWidth:0.5,borderColor:'rgba(27,58,92,0.1)'}}>
          <Text style={{fontSize:10,fontWeight:'700',color:navy,marginBottom:6}}>Fasting days / observances</Text>
          <TextInput
            style={{backgroundColor:white,borderWidth:0.5,borderColor:'rgba(27,58,92,0.2)',borderRadius:8,padding:10,fontSize:11,color:'#2E5480',minHeight:70,textAlignVertical:'top'}}
            value={fastingDaysText}
            onChangeText={setFastingDaysText}
            placeholder="e.g. Ekadashi, Monday fast, Navratri, Ramadan..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Store Prefs */}
        <View style={{backgroundColor:'rgba(255,255,255,0.92)',borderRadius:12,padding:14,marginBottom:10,borderWidth:0.5,borderColor:'rgba(27,58,92,0.1)'}}>
          <Text style={{fontSize:11,fontWeight:'700',color:navy,marginBottom:8}}>Preferred supermarkets</Text>
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
            {['Lulu','Carrefour','Spinneys','Nesto','Al Adil'].map(st => (
              <TouchableOpacity key={st} style={{paddingHorizontal:10,paddingVertical:6,borderRadius:14,borderWidth:1.5,borderColor:storePrefs.includes(st)?navy:'#D1D5DB',backgroundColor:storePrefs.includes(st)?navy:'rgba(255,255,255,0.9)'}} onPress={() => toggleArr(storePrefs,setStorePrefs,st)}>
                <Text style={{fontSize:11,fontWeight:'500',color:storePrefs.includes(st)?white:navy}}>{st}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Delivery Prefs */}
        <View style={{backgroundColor:'rgba(255,255,255,0.92)',borderRadius:12,padding:14,marginBottom:10,borderWidth:0.5,borderColor:'rgba(27,58,92,0.1)'}}>
          <Text style={{fontSize:11,fontWeight:'700',color:navy,marginBottom:8}}>Preferred delivery apps</Text>
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
            {['Talabat','Deliveroo','Noon Food','Careem Food'].map(d => (
              <TouchableOpacity key={d} style={{paddingHorizontal:10,paddingVertical:6,borderRadius:14,borderWidth:1.5,borderColor:deliveryPrefs.includes(d)?navy:'#D1D5DB',backgroundColor:deliveryPrefs.includes(d)?navy:'rgba(255,255,255,0.9)'}} onPress={() => toggleArr(deliveryPrefs,setDeliveryPrefs,d)}>
                <Text style={{fontSize:11,fontWeight:'500',color:deliveryPrefs.includes(d)?white:navy}}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Cooking Skill */}
        <View style={{backgroundColor:'rgba(255,255,255,0.92)',borderRadius:12,padding:14,marginBottom:10,borderWidth:0.5,borderColor:'rgba(27,58,92,0.1)'}}>
          <Text style={{fontSize:11,fontWeight:'700',color:navy,marginBottom:8}}>Cooking style</Text>
          <View style={{flexDirection:'row',gap:6}}>
            {['Quick & easy','Moderate','Elaborate'].map(sk => (
              <TouchableOpacity key={sk} style={{flex:1,paddingVertical:8,borderRadius:14,borderWidth:1.5,borderColor:cookingSkill===sk?navy:'#D1D5DB',backgroundColor:cookingSkill===sk?navy:'rgba(255,255,255,0.9)',alignItems:'center'}} onPress={() => setCookingSkill(sk)}>
                <Text style={{fontSize:10,fontWeight:'600',color:cookingSkill===sk?white:navy}}>{sk}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Budget */}
        <View style={{backgroundColor:'rgba(255,255,255,0.92)',borderRadius:12,padding:14,marginBottom:10,borderWidth:0.5,borderColor:'rgba(27,58,92,0.1)'}}>
          <Text style={{fontSize:11,fontWeight:'700',color:navy,marginBottom:8}}>Weekly budget</Text>
          <View style={{flexDirection:'row',gap:6}}>
            {['Everyday','Moderate','Occasional indulgence'].map(b => (
              <TouchableOpacity key={b} style={{flex:1,paddingVertical:8,borderRadius:14,borderWidth:1.5,borderColor:budgetPref===b?navy:'#D1D5DB',backgroundColor:budgetPref===b?navy:'rgba(255,255,255,0.9)',alignItems:'center'}} onPress={() => setBudgetPref(b)}>
                <Text style={{fontSize:10,fontWeight:'600',color:budgetPref===b?white:navy}}>{b}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── LANGUAGE ── */}
        <Text style={{fontSize:14,fontWeight:'700',color:navy,marginTop:20,marginBottom:12}}>Language</Text>
        <View style={{backgroundColor:'rgba(255,255,255,0.92)',borderRadius:10,borderWidth:0.5,borderColor:'rgba(27,58,92,0.1)',padding:10,marginBottom:10}}>
          <Text style={{fontSize:10,fontWeight:'700',color:navy,marginBottom:6}}>App languages (max 3)</Text>
          {selectedLanguages.length > 0 && (
            <View style={{flexDirection:'row',flexWrap:'wrap',gap:6,marginBottom:8}}>
              {selectedLanguages.map(l => (
                <TouchableOpacity key={l} style={{backgroundColor:navy,borderRadius:6,paddingHorizontal:10,paddingVertical:4,flexDirection:'row',alignItems:'center',gap:4}} onPress={() => setSelectedLanguages(prev => prev.filter(x => x !== l))}>
                  <Text style={{fontSize:10,color:white}}>{l}</Text>
                  <Text style={{fontSize:10,color:'rgba(255,255,255,0.6)'}}>{'\u2715'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <TextInput style={{borderWidth:0.5,borderColor:'rgba(27,58,92,0.2)',borderRadius:8,padding:8,fontSize:11,color:'#2E5480',marginBottom:6}} value={languageSearch} onChangeText={setLanguageSearch} placeholder="Search language..." placeholderTextColor="#9CA3AF" />
          {languageSearch.length > 0 && (
            <View style={{backgroundColor:white,maxHeight:160,borderWidth:0.5,borderColor:'rgba(27,58,92,0.15)',borderRadius:8,overflow:'hidden',marginBottom:6}}>
              {['English','Hindi','Marathi','Gujarati','Punjabi','Tamil','Telugu','Kannada','Malayalam','Bengali','Urdu','Arabic','Odia','Assamese','Sindhi','Kashmiri','Maithili','Sanskrit'].filter(l => l.toLowerCase().includes(languageSearch.toLowerCase()) && !selectedLanguages.includes(l)).map(l => (
                <TouchableOpacity key={l} style={{paddingVertical:9,paddingHorizontal:12,borderBottomWidth:0.5,borderBottomColor:'rgba(27,58,92,0.08)'}} onPress={() => {
                  if (selectedLanguages.length >= 3) { Alert.alert('Maximum 3 languages', 'Remove a language before adding another.'); return; }
                  setSelectedLanguages(prev => [...prev, l]); setLanguageSearch('');
                }}>
                  <Text style={{fontSize:11,color:'#2E5480'}}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ── NOTIFICATIONS ── */}
        <Text style={{fontSize:14,fontWeight:'700',color:navy,marginTop:20,marginBottom:12}}>Notifications</Text>
        <View style={{backgroundColor:'rgba(255,255,255,0.92)',borderRadius:10,borderWidth:0.5,borderColor:'rgba(27,58,92,0.1)',padding:10,marginBottom:10}}>
          <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:4}}>
            <View style={{flex:1}}><Text style={{fontSize:11,color:navy}}>Festival reminders</Text><Text style={{fontSize:8,color:'#9CA3AF'}}>48 hours before upcoming festivals</Text></View>
            <Switch value={notifFestivals} onValueChange={setNotifFestivals} trackColor={{false:'#D1D5DB',true:gold}} thumbColor={white} />
          </View>
          <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:4,marginTop:6}}>
            <View style={{flex:1}}><Text style={{fontSize:11,color:navy}}>Lab report reminders</Text><Text style={{fontSize:8,color:'#9CA3AF'}}>1 week before 3-month report expiry</Text></View>
            <Switch value={notifLabReports} onValueChange={setNotifLabReports} trackColor={{false:'#D1D5DB',true:gold}} thumbColor={white} />
          </View>
          <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:4,marginTop:6}}>
            <View style={{flex:1}}><Text style={{fontSize:11,color:navy}}>Insurance reminders</Text><Text style={{fontSize:8,color:'#9CA3AF'}}>1 week before policy expiry</Text></View>
            <Switch value={notifInsurance} onValueChange={setNotifInsurance} trackColor={{false:'#D1D5DB',true:gold}} thumbColor={white} />
          </View>
        </View>

        {/* ── ACCOUNT ── */}
        <Text style={{fontSize:14,fontWeight:'700',color:navy,marginTop:20,marginBottom:12}}>Account</Text>
        <View style={{backgroundColor:'rgba(255,255,255,0.92)',borderRadius:10,borderWidth:0.5,borderColor:'rgba(27,58,92,0.1)',padding:10,marginBottom:10}}>
          <Text style={{fontSize:10,fontWeight:'700',color:navy,marginBottom:4}}>Full name</Text>
          <TextInput style={{borderWidth:0.5,borderColor:'rgba(27,58,92,0.2)',borderRadius:8,padding:8,fontSize:11,color:'#2E5480',marginBottom:8}} value={fullName} onChangeText={setFullName} placeholder="Your full name" placeholderTextColor="#9CA3AF" />
          <Text style={{fontSize:10,fontWeight:'700',color:navy,marginBottom:4}}>Email</Text>
          <TextInput style={{borderWidth:0.5,borderColor:'rgba(27,58,92,0.2)',borderRadius:8,padding:8,fontSize:11,color:'#9CA3AF',backgroundColor:'#F9FAFB',marginBottom:8}} value={userEmail} editable={false} />
          <Text style={{fontSize:10,fontWeight:'700',color:navy,marginBottom:4}}>Phone number</Text>
          <TextInput style={{borderWidth:0.5,borderColor:'rgba(27,58,92,0.2)',borderRadius:8,padding:8,fontSize:11,color:'#2E5480',marginBottom:8}} value={phoneNumber} onChangeText={setPhoneNumber} placeholder="+971 XX XXX XXXX" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" />
          <TouchableOpacity style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:8}} onPress={async () => { try { await supabase.auth.resetPasswordForEmail(userEmail, { redirectTo: 'https://my-maharaj.vercel.app' }); Alert.alert('Password reset email sent to your email address.'); } catch { Alert.alert('Error', 'Could not send reset email.'); } }}>
            <Text style={{fontSize:10,color:'#2E5480'}}>Change password</Text>
            <Text style={{fontSize:14,color:'#D1D5DB'}}>{'\u203A'}</Text>
          </TouchableOpacity>
        </View>

        {/* App Info removed — now in About My Maharaj page (P9) */}

        {/* Q5: Save button — active only when changes exist */}
        <TouchableOpacity
          style={{backgroundColor: hasChanges ? navy : '#AAAAAA', borderRadius:12, paddingVertical:14, alignItems:'center', marginTop:8, marginBottom:24, opacity: hasChanges ? 1 : 0.5}}
          onPress={() => { if (hasChanges) { saveHousehold(); snapshotRef.current = JSON.stringify({ maharajDay, hasInsurance, insuranceExpiry, referralConsent, fastingDaysText, storePrefs, deliveryPrefs, cookingSkill, budgetPref, selectedLanguages, notifFestivals, notifLabReports, notifInsurance, fullName, phoneNumber }); setHasChanges(false); } }}
          disabled={!hasChanges}
        >
          <Text style={{fontSize:14,fontWeight:'700',color: hasChanges ? white : '#666666'}}>{hasChanges ? 'Save Profile' : 'No changes'}</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editId ? 'Edit Member' : 'Add Member'}</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)} style={s.modalClose}>
                <Text style={s.modalCloseTxt}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={s.modalScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Input label="Name *" value={form.name} onChangeText={(v) => setForm((p) => ({ ...p, name: v }))} placeholder="Full name" />
              <View style={{ flexDirection: 'row' }}>
                <View style={{ flex: 2, marginRight: 10, zIndex: 10 }}>
                  <Input label="Nationality" value={form.nationality}
            onChangeText={v => {
              setForm(p => ({ ...p, nationality: v }));
              setNatSuggestions(v.length > 0 ? NATIONALITIES.filter(n => n.toLowerCase().startsWith(v.toLowerCase())).slice(0,5) : []);
            }}
            placeholder="e.g. Indian, Pakistani, Filipino..." />
          {natSuggestions.length > 0 && (
            <View style={{backgroundColor:'white',borderRadius:10,borderWidth:1,borderColor:'#E5E7EB',position:'absolute',top:'100%',left:0,right:0,zIndex:10,elevation:10,shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.1,shadowRadius:4}}>
              {natSuggestions.map(n => (
                <TouchableOpacity key={n} style={{paddingHorizontal:14,paddingVertical:10,borderBottomWidth:1,borderBottomColor:'#F3F4F6'}} onPress={() => { setForm(p=>({...p,nationality:n})); setNatSuggestions([]); }}>
                  <Text style={{fontSize:14,color:navy}}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <Input label="Age" value={form.age} onChangeText={(v) => setForm((p) => ({ ...p, age: v }))} placeholder="Age" keyboardType="numeric" />
                </View>
              </View>
              <Text style={s.sectionLabel}>FOOD PREFERENCE</Text>
              <View style={{flexDirection:'row',flexWrap:'wrap',gap:6,marginBottom:12}}>
                {['Vegetarian','Non-vegetarian','Eggetarian','Mixed'].map(fp => (
                  <TouchableOpacity key={fp} style={{paddingHorizontal:12,paddingVertical:7,borderRadius:16,borderWidth:1.5,borderColor:form.foodPreference===fp?navy:'#D1D5DB',backgroundColor:form.foodPreference===fp?navy:'rgba(255,255,255,0.9)'}} onPress={() => setForm(p => ({...p,foodPreference:fp}))}>
                    <Text style={{fontSize:11,fontWeight:'600',color:form.foodPreference===fp?white:navy}}>{fp}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={s.sectionLabel}>HEALTH CONDITIONS</Text>
              <View style={s.pillRow}>
                {HEALTH_PILLS.map((cond) => (
                  <TouchableOpacity key={cond} onPress={() => toggleHealth(cond)} activeOpacity={0.75}
                    style={[s.cuisinePill, form.healthConditions.includes(cond) && s.cuisinePillActive]}>
                    <Text style={[s.cuisinePillTxt, form.healthConditions.includes(cond) && s.cuisinePillTxtActive]}>{cond}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Input label="Medical Notes (optional)" value={form.notes} onChangeText={(v) => setForm((p) => ({ ...p, notes: v }))}
                placeholder="e.g. Low salt, no fried food..." multiline numberOfLines={3} />
              {formError ? <Text style={s.formError}>{formError}</Text> : null}
              <View style={{ marginTop: 16, gap: 10 }}>
                <Button title="Save Member" onPress={() => void saveMember()} loading={saving} />
                <Button title="Cancel" onPress={() => setModalOpen(false)} variant="outline" />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  scroll:      { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 },
  loadingText: { textAlign: 'center', color: textSec, marginTop: 40 },
  labReportLink:  { flexDirection:'row', alignItems:'center', gap:12, backgroundColor:'rgba(124,58,237,0.08)', borderRadius:14, padding:14, marginBottom:16, borderWidth:1, borderColor:'rgba(124,58,237,0.2)' },
  labReportIcon:  { fontSize:24 },
  labReportTitle: { fontSize:14, fontWeight:'700', color:'#7C3AED', marginBottom:2 },
  labReportSub:   { fontSize:12, color:'#6D28D9', lineHeight:18 },
  emptyState:  { alignItems: 'center', paddingVertical: 60 },
  emptyIcon:   { fontSize: 56, marginBottom: 16 },
  emptyTitle:  { fontSize: 18, fontWeight: '700', color: navy, marginBottom: 8 },
  emptySub:    { fontSize: 14, color: textSec, textAlign: 'center' },
  card:        { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 16, borderWidth: 1.5, borderColor: border, padding: 16, marginBottom: 14 },
  cardHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  memberInfo:  { flex: 1 },
  memberName:  { fontSize: 16, fontWeight: '700', color: navy },
  metaText:    { fontSize: 13, color: textSec, marginTop: 2 },
  editBtn:     { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: border },
  editBtnText: { fontSize: 13, color: navy, fontWeight: '600' },
  pillWrap:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  healthPill:  { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  healthPillText: { fontSize: 12, fontWeight: '600' },
  notesText:   { fontSize: 13, color: textSec, fontStyle: 'italic', marginTop: 4 },
  deleteBtn:   { marginTop: 10, alignSelf: 'flex-end' },
  deleteBtnText: { fontSize: 12, color: errorRed, fontWeight: '500' },
  addWrap:     { marginTop: 8, marginBottom: 24 },
  cuisineSection:  { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 16, borderWidth: 1.5, borderColor: border, padding: 16, marginBottom: 16 },
  cuisineTitle:    { fontSize: 16, fontWeight: '700', color: navy, marginBottom: 4 },
  cuisineSub:      { fontSize: 13, color: textSec, marginBottom: 16, lineHeight: 18 },
  groupLabel:      { fontSize: 11, fontWeight: '700', color: textSec, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 },
  cuisineCount:    { fontSize: 12, color: successGreen, fontWeight: '600', textAlign: 'center', marginTop: 10 },
  pillRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  cuisinePill:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: border, backgroundColor: 'rgba(255,255,255,0.9)' },
  cuisinePillActive:{ backgroundColor: navy, borderColor: navy },
  cuisinePillTxt:  { fontSize: 13, color: navy, fontWeight: '500' },
  cuisinePillTxtActive: { color: white, fontWeight: '600' },
  sectionLabel:    { fontSize: 11, fontWeight: '700', color: textSec, letterSpacing: 0.8, marginBottom: 8, marginTop: 16, textTransform: 'uppercase' },
  formError:       { fontSize: 13, color: errorRed, textAlign: 'center', backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginTop: 8 },
  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', alignItems: 'center' },
  modalSheet:      { backgroundColor: white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', maxWidth: '95%', width: '95%', alignSelf: 'center' },
  modalHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: border },
  modalTitle:      { fontSize: 18, fontWeight: '700', color: navy },
  modalClose:      { width: 32, height: 32, borderRadius: 16, backgroundColor: surface, alignItems: 'center', justifyContent: 'center' },
  modalCloseTxt:   { fontSize: 14, color: textSec, fontWeight: '600' },
  modalScroll:     { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 },
});
