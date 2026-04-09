import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, ImageBackground, Modal, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { supabase, getSessionUser } from '../lib/supabase';
import Button from '../components/Button';
import Input from '../components/Input';
import ScreenWrapper from '../components/ScreenWrapper';
import { getCuisineGroups } from '../lib/cuisineGroups';
import { colors, cards, typography, chips as chipStyles, buttons } from '../constants/theme';

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

interface RecurringOccasion {
  id: string;
  name: string;
  day: string;
  people: string;
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

const HEALTH_PILLS = ['Diabetic', 'BP', 'PCOS', 'Cholesterol', 'Thyroid', 'Heart', 'Kidney', 'Anaemia', 'Lactose', 'Gluten'];

const COMMUNITIES = [
  'Hindu — no restrictions',
  'GSB (Gaud Saraswat Brahmin)',
  'CKP (Chandraseniya Kayastha Prabhu)',
  'Brahmin — no onion/garlic',
  'Jain — no root vegetables',
  'Muslim — Halal only',
  'Parsi',
  'Sindhi',
  'Bengali Hindu',
  'Christian',
  'Other',
];

const COOKING_PATTERNS = [
  'Cook at night — dinner carries to next day lunch',
  'Cook fresh at every meal',
  'Cook once for all three meals',
];

const LANG_OPTIONS = ['English','Hindi','Marathi','Gujarati','Tamil','Telugu','Malayalam','Kannada','Bengali','Punjabi','Urdu'];

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

// ─── Dropdown component ──────────────────────────────────────────────────────

function Dropdown({ label, value, options, onSelect, placeholder }: {
  label?: string; value: string; options: string[]; onSelect: (v: string) => void; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{marginBottom:8}}>
      {label && <Text style={s.fieldLabel}>{label}</Text>}
      <TouchableOpacity style={s.dropdown} onPress={() => setOpen(!open)} activeOpacity={0.8}>
        <Text style={{flex:1,fontSize:12,color:value ? colors.navy : colors.textHint}}>{value || placeholder || 'Select...'}</Text>
        <Text style={{fontSize:10,color:colors.textMuted}}>{open ? '\u25B2' : '\u25BC'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={s.dropdownList}>
          {options.map(o => (
            <TouchableOpacity key={o} style={s.dropdownItem} onPress={() => { onSelect(o); setOpen(false); }}>
              <Text style={{fontSize:12,color:value===o ? colors.emerald : colors.navy,fontWeight:value===o ? '700' : '400'}}>{o}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
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
  const [formError,        setFormError]        = useState('');
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [hasChanges,       setHasChanges]       = useState(false);
  const [savedMsg,         setSavedMsg]         = useState(false);
  const snapshotRef = useRef('');

  // Section 1 — Account
  const [subTier,      setSubTier]      = useState('Free');
  const [subExpiry,    setSubExpiry]    = useState('—');
  const [fullName,     setFullName]     = useState('');
  const [phoneNumber,  setPhoneNumber]  = useState('');
  const [userEmail,    setUserEmail]    = useState('');

  // Section 2 — Community
  const [community,         setCommunity]         = useState('');
  const [communityOther,    setCommunityOther]    = useState('');
  const [additionalRules,   setAdditionalRules]   = useState('');
  const [isJainFamily,      setIsJainFamily]      = useState(false);
  const [jainAllowNonJain,  setJainAllowNonJain]  = useState(true);

  // Section 4 — Meal Template
  const [mealCurry,    setMealCurry]    = useState('');
  const [mealVeg,      setMealVeg]      = useState('');
  const [mealRaita,    setMealRaita]    = useState('');
  const [mealBread,    setMealBread]    = useState('');
  const [mealRice,     setMealRice]     = useState('');
  const [sundayCurry,  setSundayCurry]  = useState('');
  const [sundaySweet,  setSundaySweet]  = useState('');

  // Section 5 — Breakfast
  const [breakfastPrefs,   setBreakfastPrefs]   = useState('');

  // Section 6 — Cooking Pattern
  const [cookingPattern,   setCookingPattern]   = useState('');

  // Section 8 — Avoids
  const [avoidanceList,    setAvoidanceList]    = useState('');

  // Section 9 — Grocery
  const [groceryDay,       setGroceryDay]       = useState('');
  const [preferredStores,  setPreferredStores]  = useState('');
  const [preferredApps,    setPreferredApps]    = useState('');

  // Section 10 — Recurring Occasions
  const [occasions,        setOccasions]        = useState<RecurringOccasion[]>([]);
  const [occasionModal,    setOccasionModal]    = useState(false);
  const [editOccasionId,   setEditOccasionId]   = useState<string|null>(null);
  const [occName,          setOccName]          = useState('');
  const [occDay,           setOccDay]           = useState('');
  const [occPeople,        setOccPeople]        = useState('');

  // Section 11 — Insurance
  const [hasInsurance,     setHasInsurance]     = useState(false);
  const [insuranceExpiry,  setInsuranceExpiry]  = useState('');

  // Section 12 — Notifications
  const [notifFestivals,   setNotifFestivals]   = useState(true);
  const [notifLabReports,  setNotifLabReports]  = useState(true);
  const [notifInsurance,   setNotifInsurance]   = useState(true);

  // Section 13 — App Settings
  const [cookingSkill,     setCookingSkill]     = useState('');
  const [budgetPref,       setBudgetPref]       = useState('');

  // Section 14 — Language
  const [appLanguage,      setAppLanguage]      = useState('English');
  const [planSummaryLanguage,   setPlanSummaryLanguage]   = useState('English');
  const [shoppingLanguage, setShoppingLanguage] = useState('English');

  // Cuisine accordion
  const [expandedGroups,   setExpandedGroups]   = useState<Record<string,boolean>>({});

  // First setup
  const [isFirstSetup,     setIsFirstSetup]     = useState(false);

  // ── Load ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function loadAll() {
      // Supabase profile
      try {
        const user = await getSessionUser();
        if (user) {
          const { data: prof } = await supabase.from('profiles').select('subscription_tier, subscription_expires_at, full_name, phone_number').eq('id', user.id).maybeSingle();
          if (prof?.subscription_tier) setSubTier(prof.subscription_tier);
          if (prof?.subscription_expires_at) setSubExpiry(new Date(prof.subscription_expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }));
          setFullName((prof?.full_name ?? user.user_metadata?.full_name ?? '') as string);
          setUserEmail(user.email ?? '');
          if (prof?.phone_number) setPhoneNumber(prof.phone_number);
        }
      } catch {}

      // AsyncStorage fields
      const keys = await AsyncStorage.multiGet([
        'community', 'community_other', 'additional_dietary_rules',
        'jain_family', 'jain_allow_non_jain',
        'meal_template_curry', 'meal_template_veg', 'meal_template_raita', 'meal_template_bread', 'meal_template_rice',
        'sunday_extra_curry', 'sunday_sweet',
        'breakfast_preferences', 'cooking_pattern', 'avoidance_list',
        'grocery_day', 'preferred_supermarkets', 'preferred_delivery_apps',
        'recurring_occasions',
        'household_insurance', 'insurance_expiry',
        'notif_festivals', 'notif_lab_reports', 'notif_insurance_reminders',
        'cooking_skill', 'budget_pref',
        'app_language', 'plan_summary_language', 'shopping_list_language',
        'phone_number', 'profile_setup_complete',
      ]);
      const kv: Record<string,string|null> = {};
      keys.forEach(([k,v]) => { kv[k] = v; });

      if (kv['community']) setCommunity(kv['community']);
      if (kv['community_other']) setCommunityOther(kv['community_other']);
      if (kv['additional_dietary_rules']) setAdditionalRules(kv['additional_dietary_rules']);
      if (kv['jain_family'] === 'true') setIsJainFamily(true);
      if (kv['jain_allow_non_jain'] === 'false') setJainAllowNonJain(false);
      if (kv['meal_template_curry']) setMealCurry(kv['meal_template_curry']);
      if (kv['meal_template_veg']) setMealVeg(kv['meal_template_veg']);
      if (kv['meal_template_raita']) setMealRaita(kv['meal_template_raita']);
      if (kv['meal_template_bread']) setMealBread(kv['meal_template_bread']);
      if (kv['meal_template_rice']) setMealRice(kv['meal_template_rice']);
      if (kv['sunday_extra_curry']) setSundayCurry(kv['sunday_extra_curry']);
      if (kv['sunday_sweet']) setSundaySweet(kv['sunday_sweet']);
      if (kv['breakfast_preferences']) setBreakfastPrefs(kv['breakfast_preferences']);
      if (kv['cooking_pattern']) setCookingPattern(kv['cooking_pattern']);
      if (kv['avoidance_list']) setAvoidanceList(kv['avoidance_list']);
      if (kv['grocery_day']) setGroceryDay(kv['grocery_day']);
      if (kv['preferred_supermarkets']) setPreferredStores(kv['preferred_supermarkets']);
      if (kv['preferred_delivery_apps']) setPreferredApps(kv['preferred_delivery_apps']);
      if (kv['recurring_occasions']) try { setOccasions(JSON.parse(kv['recurring_occasions'])); } catch {}
      if (kv['household_insurance'] === 'true') setHasInsurance(true);
      if (kv['insurance_expiry']) setInsuranceExpiry(kv['insurance_expiry']);
      if (kv['notif_festivals'] !== null) setNotifFestivals(kv['notif_festivals'] !== 'false');
      if (kv['notif_lab_reports'] !== null) setNotifLabReports(kv['notif_lab_reports'] !== 'false');
      if (kv['notif_insurance_reminders'] !== null) setNotifInsurance(kv['notif_insurance_reminders'] !== 'false');
      if (kv['cooking_skill']) setCookingSkill(kv['cooking_skill']);
      if (kv['budget_pref']) setBudgetPref(kv['budget_pref']);
      if (kv['app_language']) setAppLanguage(kv['app_language']);
      if (kv['plan_summary_language']) setPlanSummaryLanguage(kv['plan_summary_language']);
      if (kv['shopping_list_language']) setShoppingLanguage(kv['shopping_list_language']);
      if (kv['phone_number'] && !phoneNumber) setPhoneNumber(kv['phone_number']);
      if (!kv['profile_setup_complete']) setIsFirstSetup(true);

      // Jain synced from community
      const comm = kv['community'] ?? '';
      if (comm.startsWith('Jain')) setIsJainFamily(true);
    }
    loadAll().then(() => {
      setTimeout(() => { snapshotRef.current = 'loaded'; }, 500);
    });
  }, []);

  // Track changes
  const markDirty = () => { if (snapshotRef.current) setHasChanges(true); };

  // ── Load members + cuisines ────────────────────────────────────────────────

  const loadMembers = useCallback(async () => {
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

  useEffect(() => { void loadMembers(); }, []);

  // ── Member CRUD ────────────────────────────────────────────────────────────

  function openAdd() { setEditId(null); setForm(emptyForm()); setFormError(''); setModalOpen(true); }
  function openEdit(m: Member) { setEditId(m.id); setForm(memberToForm(m)); setFormError(''); setModalOpen(true); }

  function toggleHealth(cond: string) {
    setForm(prev => ({
      ...prev,
      healthConditions: prev.healthConditions.includes(cond)
        ? prev.healthConditions.filter(c => c !== cond)
        : [...prev.healthConditions, cond],
    }));
  }

  function toggleCuisine(cuisine: string) {
    setSelectedCuisines(prev => prev.includes(cuisine) ? prev.filter(c => c !== cuisine) : [...prev, cuisine]);
    markDirty();
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
      setModalOpen(false); await loadMembers();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed.');
    } finally { setSaving(false); }
  }

  async function deleteMember(id: string) {
    await supabase.from('family_members').delete().eq('id', id);
    await loadMembers();
  }

  // ── Occasion CRUD ──────────────────────────────────────────────────────────

  function openAddOccasion() { setEditOccasionId(null); setOccName(''); setOccDay(''); setOccPeople(''); setOccasionModal(true); }
  function openEditOccasion(o: RecurringOccasion) { setEditOccasionId(o.id); setOccName(o.name); setOccDay(o.day); setOccPeople(o.people); setOccasionModal(true); }

  function saveOccasion() {
    if (!occName.trim()) return;
    if (editOccasionId) {
      setOccasions(prev => prev.map(o => o.id === editOccasionId ? { ...o, name: occName, day: occDay, people: occPeople } : o));
    } else {
      setOccasions(prev => [...prev, { id: Date.now().toString(), name: occName, day: occDay, people: occPeople }]);
    }
    setOccasionModal(false);
    markDirty();
  }

  function deleteOccasion(id: string) {
    setOccasions(prev => prev.filter(o => o.id !== id));
    markDirty();
  }

  // ── Save all ───────────────────────────────────────────────────────────────

  async function saveProfile() {
    // AsyncStorage
    await AsyncStorage.multiSet([
      ['community', community],
      ['community_other', communityOther],
      ['additional_dietary_rules', additionalRules],
      ['jain_family', String(isJainFamily)],
      ['jain_allow_non_jain', String(jainAllowNonJain)],
      ['meal_template_curry', mealCurry],
      ['meal_template_veg', mealVeg],
      ['meal_template_raita', mealRaita],
      ['meal_template_bread', mealBread],
      ['meal_template_rice', mealRice],
      ['sunday_extra_curry', sundayCurry],
      ['sunday_sweet', sundaySweet],
      ['breakfast_preferences', breakfastPrefs],
      ['cooking_pattern', cookingPattern],
      ['avoidance_list', avoidanceList],
      ['grocery_day', groceryDay],
      ['preferred_supermarkets', preferredStores],
      ['preferred_delivery_apps', preferredApps],
      ['recurring_occasions', JSON.stringify(occasions)],
      ['household_insurance', hasInsurance ? 'true' : 'false'],
      ['insurance_expiry', insuranceExpiry],
      ['notif_festivals', String(notifFestivals)],
      ['notif_lab_reports', String(notifLabReports)],
      ['notif_insurance_reminders', String(notifInsurance)],
      ['cooking_skill', cookingSkill],
      ['budget_pref', budgetPref],
      ['app_language', appLanguage],
      ['plan_summary_language', planSummaryLanguage],
      ['shopping_list_language', shoppingLanguage],
      ['phone_number', phoneNumber],
      ['maharaj_day', groceryDay],
      ['profile_setup_complete', 'true'],
    ]);

    // Supabase profiles upsert
    // NOTE: plan_summary_language column needs to be added to Supabase profiles table (migration pending)
    try {
      const user = await getSessionUser();
      if (user) {
        await supabase.from('profiles').upsert({
          id: user.id,
          full_name: fullName,
          phone_number: phoneNumber,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      }
    } catch {}

    // Cuisine preferences: delete-all then insert
    try {
      const user = await getSessionUser();
      if (!user) return;
      await supabase.from('cuisine_preferences').delete().eq('user_id', user.id);
      if (selectedCuisines.length > 0) {
        await supabase.from('cuisine_preferences').insert(
          selectedCuisines.map(c => ({ user_id: user.id, cuisine_name: c, is_excluded: false }))
        );
      }
    } catch {}

    if (isFirstSetup) {
      setIsFirstSetup(false);
      router.replace('/home');
    } else {
      setHasChanges(false);
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2000);
    }
  }

  // ── Health condition colors ────────────────────────────────────────────────

  const HEALTH_COLORS: Record<string, { bg: string; fg: string }> = {
    Diabetic: { bg: '#FEF2F2', fg: '#DC2626' }, BP: { bg: '#FFF7ED', fg: '#C2410C' },
    PCOS: { bg: '#FDF4FF', fg: '#7E22CE' }, Cholesterol: { bg: '#FFF1F2', fg: '#BE123C' },
    Thyroid: { bg: '#ECFDF5', fg: '#059669' }, Heart: { bg: '#FEF2F2', fg: '#DC2626' },
    Kidney: { bg: '#EFF6FF', fg: '#1D4ED8' }, Anaemia: { bg: '#FFF7ED', fg: '#B45309' },
    Lactose: { bg: '#F0FDF4', fg: '#166534' }, Gluten: { bg: '#FFFBEB', fg: '#92400E' },
  };

  const CUISINE_GROUPS = getCuisineGroups(isJainFamily);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <ScreenWrapper title="Family Profile Settings">
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Welcome banner for first setup */}
        {isFirstSetup && (
          <View style={[cards.frostedGreen, {padding:14,marginBottom:14}]}>
            <Text style={{fontSize:12,fontWeight:'700',color:colors.navy,marginBottom:4}}>Welcome to My Maharaj Beta</Text>
            <Text style={{fontSize:10,color:colors.navy,lineHeight:16}}>Set up your family profile so Maharaj can personalise your meal plans.</Text>
          </View>
        )}

        {/* ══════════ 1. MY ACCOUNT ══════════ */}
        <Text style={s.sectionHead}>My Account</Text>

        <View style={[cards.frostedCyan, {flexDirection:'row',alignItems:'center',gap:8,marginBottom:10}]}>
          <Text style={{fontSize:11,fontWeight:'600',color:colors.navy}}>{subTier}</Text>
          <Text style={{fontSize:10,color:colors.textMuted}}>Valid until {subExpiry}</Text>
        </View>

        <Text style={s.fieldLabel}>Full Name</Text>
        <TextInput style={s.input} value={fullName} onChangeText={v => { setFullName(v); markDirty(); }} placeholder="Your full name" placeholderTextColor={colors.textHint} />

        <Text style={s.fieldLabel}>Phone</Text>
        <TextInput style={s.input} value={phoneNumber} onChangeText={v => { setPhoneNumber(v); markDirty(); }} placeholder="+971 XX XXX XXXX" placeholderTextColor={colors.textHint} keyboardType="phone-pad" />

        <Text style={s.fieldLabel}>Email</Text>
        <TextInput style={[s.input, {color:colors.textMuted,backgroundColor:'#F4F6F8'}]} value={userEmail} editable={false} />

        <TouchableOpacity style={[buttons.secondary, {alignItems:'center',marginBottom:14}]} onPress={async () => { try { await supabase.auth.resetPasswordForEmail(userEmail, { redirectTo: 'https://my-maharaj.vercel.app' }); Alert.alert('Password reset email sent.'); } catch { Alert.alert('Error', 'Could not send reset email.'); } }}>
          <Text style={[buttons.secondaryText, {fontSize:12}]}>Change password</Text>
        </TouchableOpacity>

        {/* ══════════ 2. COMMUNITY AND DIETARY IDENTITY ══════════ */}
        <Text style={s.sectionHead}>Community and Dietary Identity</Text>
        <Text style={{fontSize:10,color:colors.textMuted,marginBottom:8}}>Maharaj applies appropriate dietary rules based on your community</Text>

        <Dropdown value={community} options={COMMUNITIES} onSelect={v => { setCommunity(v); markDirty(); if (v.startsWith('Jain')) { setIsJainFamily(true); void AsyncStorage.setItem('jain_family','true'); } else { setIsJainFamily(false); void AsyncStorage.setItem('jain_family','false'); } }} placeholder="Select community..." />

        {community === 'Other' && (
          <>
            <Text style={s.fieldLabel}>Describe your community dietary rules</Text>
            <TextInput style={[s.input, {minHeight:60,textAlignVertical:'top'}]} value={communityOther} onChangeText={v => { setCommunityOther(v); markDirty(); }} placeholder="Describe rules..." placeholderTextColor={colors.textHint} multiline />
          </>
        )}

        <Text style={s.fieldLabel}>Any additional dietary rules?</Text>
        <TextInput style={[s.input, {minHeight:60,textAlignVertical:'top'}]} value={additionalRules} onChangeText={v => { setAdditionalRules(v); markDirty(); }} placeholder="e.g. No onion on Tuesdays, Ekadashi fasting..." placeholderTextColor={colors.textHint} multiline />

        {isJainFamily && (
          <View style={[cards.base, {marginBottom:12}]}>
            <Text style={{fontSize:12,fontWeight:'700',color:colors.navy,marginBottom:8}}>Would Maharaj suggest non-Jain recipes also?</Text>
            <View style={{flexDirection:'row',gap:10}}>
              <TouchableOpacity style={{flex:1,paddingVertical:8,borderRadius:20,alignItems:'center',...(jainAllowNonJain ? {backgroundColor:colors.emerald} : {borderWidth:1,borderColor:colors.navy})}} onPress={() => { setJainAllowNonJain(true); markDirty(); }}>
                <Text style={{fontSize:12,fontWeight:'600',color:jainAllowNonJain ? colors.white : colors.navy}}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{flex:1,paddingVertical:8,borderRadius:20,alignItems:'center',...(!jainAllowNonJain ? {backgroundColor:colors.emerald} : {borderWidth:1,borderColor:colors.navy})}} onPress={() => { setJainAllowNonJain(false); markDirty(); }}>
                <Text style={{fontSize:12,fontWeight:'600',color:!jainAllowNonJain ? colors.white : colors.navy}}>No</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ══════════ 3. FAMILY MEMBERS ══════════ */}
        <Text style={s.sectionHead}>Family Members</Text>

        {loading ? (
          <Text style={{textAlign:'center',color:colors.textMuted,marginVertical:20}}>Loading...</Text>
        ) : members.length === 0 ? (
          <View style={{alignItems:'center',paddingVertical:30}}>
            <Text style={{fontSize:14,color:colors.textMuted,textAlign:'center'}}>No family members yet</Text>
          </View>
        ) : members.map(m => {
          const pills = HEALTH_PILLS.filter(p => (m.health_notes ?? '').toLowerCase().includes(p.toLowerCase()));
          const hasLab = (m.health_notes ?? '').includes('Lab (');
          return (
            <View key={m.id} style={[cards.base, {marginBottom:10}]}>
              <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                <View style={{flex:1}}>
                  <Text style={{fontSize:13,fontWeight:'700',color:colors.navy}}>{m.name}</Text>
                  {m.age > 0 && <Text style={{fontSize:10,color:colors.textMuted}}>{m.age} yrs</Text>}
                </View>
                <TouchableOpacity style={[buttons.back, {paddingVertical:5,paddingHorizontal:10}]} onPress={() => openEdit(m)}>
                  <Text style={{fontSize:11,fontWeight:'600',color:colors.navy}}>Edit</Text>
                </TouchableOpacity>
              </View>
              {pills.length > 0 && (
                <View style={{flexDirection:'row',flexWrap:'wrap',gap:4,marginBottom:4}}>
                  {pills.map(p => (
                    <View key={p} style={{borderRadius:6,paddingHorizontal:6,paddingVertical:2,backgroundColor:HEALTH_COLORS[p]?.bg ?? '#F3F4F6'}}>
                      <Text style={{fontSize:10,fontWeight:'600',color:HEALTH_COLORS[p]?.fg ?? '#374151'}}>{p}</Text>
                    </View>
                  ))}
                </View>
              )}
              {hasLab && (
                <View style={{borderRadius:6,paddingHorizontal:6,paddingVertical:2,backgroundColor:'rgba(124,58,237,0.1)',alignSelf:'flex-start',marginBottom:4}}>
                  <Text style={{fontSize:10,fontWeight:'600',color:'#7C3AED'}}>Lab report uploaded</Text>
                </View>
              )}
              <TouchableOpacity onPress={() => deleteMember(m.id)}>
                <Text style={{fontSize:10,color:colors.danger,marginTop:4}}>Remove member</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        <Text style={{fontSize:9,color:colors.textMuted,marginBottom:8}}>Fasting days and lab reports are set inside each member's profile</Text>

        <TouchableOpacity style={s.dashedBtn} onPress={openAdd}>
          <Text style={{fontSize:12,fontWeight:'600',color:colors.emerald}}>+ Add family member</Text>
        </TouchableOpacity>

        {/* Lab Report Link */}
        <TouchableOpacity style={[cards.frostedNavy, {flexDirection:'row',alignItems:'center',gap:10,marginTop:8,marginBottom:14}]} onPress={() => router.push('/lab-report' as never)} activeOpacity={0.85}>
          <View style={{flex:1}}>
            <Text style={{fontSize:12,fontWeight:'700',color:'#7C3AED',marginBottom:2}}>Lab Report Analysis</Text>
            <Text style={{fontSize:10,color:colors.textSecondary,lineHeight:16}}>Upload blood test results — Maharaj updates dietary recommendations automatically</Text>
          </View>
          <Text style={{fontSize:18,color:colors.textMuted}}>›</Text>
        </TouchableOpacity>

        {/* ══════════ 4. MEAL TEMPLATE ══════════ */}
        <Text style={s.sectionHead}>Meal Template</Text>
        <Text style={{fontSize:10,color:colors.textMuted,marginBottom:8}}>Weekday lunch and dinner structure</Text>

        {[
          { label: 'Curry', val: mealCurry, set: setMealCurry },
          { label: 'Veg dish', val: mealVeg, set: setMealVeg },
          { label: 'Raita / Salad', val: mealRaita, set: setMealRaita },
          { label: 'Bread', val: mealBread, set: setMealBread },
          { label: 'Rice', val: mealRice, set: setMealRice },
        ].map(({ label, val, set }) => (
          <View key={label} style={{flexDirection:'row',alignItems:'center',marginBottom:6,gap:8}}>
            <Text style={{fontSize:11,color:colors.navy,width:80}}>{label}</Text>
            <TextInput style={[s.input, {flex:1,marginBottom:0}]} value={val} onChangeText={v => { set(v); markDirty(); }} placeholder={`e.g. ${label}...`} placeholderTextColor={colors.textHint} />
          </View>
        ))}

        <View style={{height:1,backgroundColor:'rgba(26,58,92,0.1)',marginVertical:10}} />
        <Text style={{fontSize:10,color:colors.textMuted,marginBottom:8}}>Sunday template</Text>

        <View style={{flexDirection:'row',alignItems:'center',marginBottom:6,gap:8}}>
          <Text style={{fontSize:11,color:colors.navy,width:80}}>Extra curry</Text>
          <TextInput style={[s.input, {flex:1,marginBottom:0}]} value={sundayCurry} onChangeText={v => { setSundayCurry(v); markDirty(); }} placeholder="e.g. Special curry..." placeholderTextColor={colors.textHint} />
        </View>
        <View style={{flexDirection:'row',alignItems:'center',marginBottom:10,gap:8}}>
          <Text style={{fontSize:11,color:colors.navy,width:80}}>Sweet dish</Text>
          <TextInput style={[s.input, {flex:1,marginBottom:0}]} value={sundaySweet} onChangeText={v => { setSundaySweet(v); markDirty(); }} placeholder="e.g. Sheera, Puran Poli..." placeholderTextColor={colors.textHint} />
        </View>

        {/* ══════════ 5. BREAKFAST PREFERENCES ══════════ */}
        <Text style={s.sectionHead}>Breakfast Preferences</Text>
        <Text style={{fontSize:10,color:colors.textMuted,marginBottom:8}}>Tell Maharaj what your family enjoys for breakfast</Text>
        <TextInput style={[s.input, {minHeight:70,textAlignVertical:'top'}]} value={breakfastPrefs} onChangeText={v => { setBreakfastPrefs(v); markDirty(); }} placeholder="e.g. Dosa, Amboli, Thepla, Koki, Idli. Sundays we like something elaborate. Avoid oats and cereal." placeholderTextColor={colors.textHint} multiline />

        {/* ══════════ 6. COOKING PATTERN ══════════ */}
        <Text style={s.sectionHead}>Cooking Pattern</Text>
        <Text style={{fontSize:10,color:colors.textMuted,marginBottom:8}}>How does your family cook?</Text>
        <Dropdown value={cookingPattern} options={COOKING_PATTERNS} onSelect={v => { setCookingPattern(v); markDirty(); }} placeholder="Select cooking pattern..." />

        {/* ══════════ 7. CUISINE PREFERENCES ══════════ */}
        <Text style={s.sectionHead}>Cuisine Preferences</Text>
        <Text style={{fontSize:10,color:colors.textMuted,marginBottom:8}}>{selectedCuisines.length} cuisine{selectedCuisines.length !== 1 ? 's' : ''} selected</Text>

        {CUISINE_GROUPS.map(group => {
          const isOpen = expandedGroups[group.label] ?? false;
          const selectedInGroup = group.cuisines.filter(c => selectedCuisines.includes(c));
          return (
            <View key={group.label} style={{marginBottom:6}}>
              <TouchableOpacity style={[cards.base, {flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:0}]} onPress={() => setExpandedGroups(prev => ({...prev, [group.label]: !isOpen}))}>
                <Text style={{fontSize:11,fontWeight:'700',color:colors.navy}}>{group.label}</Text>
                <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
                  {selectedInGroup.length > 0 && <Text style={{fontSize:9,color:colors.emerald}}>{selectedInGroup.join(', ')}</Text>}
                  <Text style={{fontSize:10,color:colors.textMuted}}>{isOpen ? '\u25B2' : '\u25BC'}</Text>
                </View>
              </TouchableOpacity>
              {isOpen && (
                <View style={{flexDirection:'row',flexWrap:'wrap',gap:6,paddingHorizontal:8,paddingVertical:8}}>
                  {group.cuisines.map(c => {
                    const active = selectedCuisines.includes(c);
                    return (
                      <TouchableOpacity key={c} style={{paddingVertical:5,paddingHorizontal:10,borderRadius:20,...(active ? {backgroundColor:colors.emerald} : {borderWidth:1,borderColor:colors.navy})}} onPress={() => toggleCuisine(c)}>
                        <Text style={{fontSize:11,fontWeight:'500',color:active ? colors.white : colors.navy}}>{c}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}

        {/* ══════════ 8. FAMILY AVOIDS ══════════ */}
        <Text style={s.sectionHead}>Family Avoids</Text>
        <Text style={{fontSize:10,color:colors.textMuted,marginBottom:8}}>Dishes or ingredients Maharaj will never suggest</Text>
        <TextInput style={[s.input, {minHeight:70,textAlignVertical:'top'}]} value={avoidanceList} onChangeText={v => { setAvoidanceList(v); markDirty(); }} placeholder="e.g. Bitter gourd, ragi, millets, drumstick. Aanya dislikes mushrooms." placeholderTextColor={colors.textHint} multiline />

        {/* ══════════ 9. GROCERY AND SHOPPING ══════════ */}
        <Text style={s.sectionHead}>Grocery and Shopping</Text>

        <Text style={s.fieldLabel}>My Maharaj Day</Text>
        <TextInput style={s.input} value={groceryDay} onChangeText={v => { setGroceryDay(v); markDirty(); }} placeholder="e.g. Saturday" placeholderTextColor={colors.textHint} />

        <Text style={s.fieldLabel}>Preferred supermarkets</Text>
        <TextInput style={s.input} value={preferredStores} onChangeText={v => { setPreferredStores(v); markDirty(); }} placeholder="e.g. Carrefour, Lulu Hypermarket" placeholderTextColor={colors.textHint} />

        <Text style={s.fieldLabel}>Preferred delivery apps</Text>
        <TextInput style={s.input} value={preferredApps} onChangeText={v => { setPreferredApps(v); markDirty(); }} placeholder="e.g. Noon Daily, Amazon Fresh" placeholderTextColor={colors.textHint} />

        {/* ══════════ 10. RECURRING OCCASIONS ══════════ */}
        <Text style={s.sectionHead}>Recurring Occasions</Text>

        {occasions.map(o => (
          <View key={o.id} style={[cards.base, {flexDirection:'row',alignItems:'center',marginBottom:8}]}>
            <View style={{flex:1}}>
              <Text style={{fontSize:12,fontWeight:'700',color:colors.navy}}>{o.name}</Text>
              <Text style={{fontSize:10,color:colors.textMuted}}>{o.day} — {o.people}</Text>
              <Text style={{fontSize:9,color:colors.emerald}}>Recurring every week</Text>
            </View>
            <View style={{flexDirection:'row',gap:6}}>
              <TouchableOpacity onPress={() => openEditOccasion(o)}><Text style={{fontSize:10,color:colors.navy,fontWeight:'600'}}>Edit</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => deleteOccasion(o.id)}><Text style={{fontSize:10,color:colors.danger}}>Remove</Text></TouchableOpacity>
            </View>
          </View>
        ))}

        <TouchableOpacity style={s.dashedBtn} onPress={openAddOccasion}>
          <Text style={{fontSize:12,fontWeight:'600',color:colors.emerald}}>+ Add recurring occasion</Text>
        </TouchableOpacity>

        {/* ══════════ 11. INSURANCE ══════════ */}
        <Text style={s.sectionHead}>Insurance</Text>
        <View style={[cards.base, {marginBottom:10}]}>
          <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
            <Text style={{fontSize:11,color:colors.navy}}>Family has health insurance</Text>
            <Switch value={hasInsurance} onValueChange={v => { setHasInsurance(v); markDirty(); }} trackColor={{false:'#D1D5DB',true:colors.emerald}} thumbColor={colors.white} />
          </View>
          {hasInsurance && (
            <View style={{marginTop:8}}>
              <Text style={s.fieldLabel}>Policy expiry date</Text>
              <TextInput style={s.input} placeholder="DD/MM/YYYY" placeholderTextColor={colors.textHint} value={insuranceExpiry} onChangeText={v => { setInsuranceExpiry(v); markDirty(); }} />
            </View>
          )}
        </View>

        {/* ══════════ 12. NOTIFICATIONS ══════════ */}
        <Text style={s.sectionHead}>Notifications</Text>
        <View style={[cards.base, {marginBottom:10}]}>
          {[
            { label: 'Festival reminders', sub: '48 hours before upcoming festivals', val: notifFestivals, set: setNotifFestivals },
            { label: 'Lab report reminders', sub: '1 week before 3-month report expiry', val: notifLabReports, set: setNotifLabReports },
            { label: 'Insurance reminders', sub: '1 week before policy expiry', val: notifInsurance, set: setNotifInsurance },
          ].map(({ label, sub, val, set }) => (
            <View key={label} style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:4,marginBottom:4}}>
              <View style={{flex:1}}>
                <Text style={{fontSize:11,color:colors.navy}}>{label}</Text>
                <Text style={{fontSize:8,color:colors.textMuted}}>{sub}</Text>
              </View>
              <Switch value={val} onValueChange={v => { set(v); markDirty(); }} trackColor={{false:'#D1D5DB',true:colors.emerald}} thumbColor={colors.white} />
            </View>
          ))}
        </View>

        {/* ══════════ 13. APP SETTINGS ══════════ */}
        <Text style={s.sectionHead}>App Settings</Text>
        <Dropdown label="Cooking style" value={cookingSkill} options={['Quick and easy','Moderate','Elaborate']} onSelect={v => { setCookingSkill(v); markDirty(); }} placeholder="Select..." />
        <Dropdown label="Weekly budget" value={budgetPref} options={['Everyday','Moderate','Occasional indulgence']} onSelect={v => { setBudgetPref(v); markDirty(); }} placeholder="Select..." />

        {/* ══════════ 14. LANGUAGE SETTINGS ══════════ */}
        <Text style={s.sectionHead}>Language Settings</Text>
        <Text style={{fontSize:10,color:colors.textMuted,marginBottom:8}}>Three separate language settings — for different people in your household</Text>
        <Dropdown label="App language (what you see)" value={appLanguage} options={LANG_OPTIONS} onSelect={v => { setAppLanguage(v); markDirty(); }} />
        <Dropdown label="Plan summary language (for your cook)" value={planSummaryLanguage} options={LANG_OPTIONS} onSelect={v => { setPlanSummaryLanguage(v); markDirty(); }} />
        <Dropdown label="Shopping list language (for your househelp)" value={shoppingLanguage} options={LANG_OPTIONS} onSelect={v => { setShoppingLanguage(v); markDirty(); }} />

        {/* ══════════ SAVE BUTTON ══════════ */}
        <TouchableOpacity
          style={{backgroundColor: hasChanges ? colors.emerald : '#CCCCCC', borderRadius:20, paddingVertical:14, alignItems:'center', marginTop:12, marginBottom:4}}
          onPress={() => { if (hasChanges) void saveProfile(); }}
          disabled={!hasChanges}
        >
          <Text style={{fontSize:14,fontWeight: hasChanges ? '700' : '500', color: hasChanges ? colors.white : '#888888'}}>Save Profile</Text>
        </TouchableOpacity>
        {savedMsg && <Text style={{fontSize:13,color:colors.teal,textAlign:'center',marginBottom:20}}>Saved</Text>}
        {!savedMsg && <View style={{height:24}} />}

      </ScrollView>

      {/* ── Add/Edit Member Modal ──────────────────────────────────────────── */}
      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editId ? 'Edit Member' : 'Add Member'}</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)} style={s.modalClose}>
                <Text style={s.modalCloseTxt}>X</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={s.modalScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Input label="Name *" value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} placeholder="Full name" />
              <View style={{flexDirection:'row'}}>
                <View style={{flex:2, marginRight:10, zIndex:10}}>
                  <Input label="Nationality" value={form.nationality}
                    onChangeText={v => {
                      setForm(p => ({ ...p, nationality: v }));
                      setNatSuggestions(v.length > 0 ? NATIONALITIES.filter(n => n.toLowerCase().startsWith(v.toLowerCase())).slice(0,5) : []);
                    }}
                    placeholder="e.g. Indian, Pakistani, Filipino..." />
                  {natSuggestions.length > 0 && (
                    <View style={{backgroundColor:'white',borderRadius:10,borderWidth:1,borderColor:'#E5E7EB',position:'absolute',top:'100%',left:0,right:0,zIndex:10,elevation:10}}>
                      {natSuggestions.map(n => (
                        <TouchableOpacity key={n} style={{paddingHorizontal:14,paddingVertical:10,borderBottomWidth:1,borderBottomColor:'#F3F4F6'}} onPress={() => { setForm(p=>({...p,nationality:n})); setNatSuggestions([]); }}>
                          <Text style={{fontSize:14,color:colors.navy}}>{n}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  <Input label="Age" value={form.age} onChangeText={v => setForm(p => ({ ...p, age: v }))} placeholder="Age" keyboardType="numeric" />
                </View>
              </View>
              <Text style={s.modalSectionLabel}>FOOD PREFERENCE</Text>
              <View style={{flexDirection:'row',flexWrap:'wrap',gap:6,marginBottom:12}}>
                {['Vegetarian','Non-vegetarian','Eggetarian','Mixed'].map(fp => (
                  <TouchableOpacity key={fp} style={{paddingHorizontal:12,paddingVertical:7,borderRadius:20,...(form.foodPreference===fp ? {backgroundColor:colors.emerald} : {borderWidth:1,borderColor:colors.navy})}} onPress={() => setForm(p => ({...p,foodPreference:fp}))}>
                    <Text style={{fontSize:11,fontWeight:'600',color:form.foodPreference===fp ? colors.white : colors.navy}}>{fp}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={s.modalSectionLabel}>HEALTH CONDITIONS</Text>
              <View style={{flexDirection:'row',flexWrap:'wrap',gap:6,marginBottom:8}}>
                {HEALTH_PILLS.map(cond => (
                  <TouchableOpacity key={cond} onPress={() => toggleHealth(cond)} activeOpacity={0.75}
                    style={{paddingHorizontal:12,paddingVertical:7,borderRadius:20,...(form.healthConditions.includes(cond) ? {backgroundColor:colors.emerald} : {borderWidth:1,borderColor:colors.navy})}}>
                    <Text style={{fontSize:11,fontWeight:'500',color:form.healthConditions.includes(cond) ? colors.white : colors.navy}}>{cond}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Input label="Medical Notes (optional)" value={form.notes} onChangeText={v => setForm(p => ({ ...p, notes: v }))}
                placeholder="e.g. Low salt, no fried food..." multiline numberOfLines={3} />
              {formError ? <Text style={s.formError}>{formError}</Text> : null}
              <View style={{marginTop:16,gap:10}}>
                <Button title="Save Member" onPress={() => void saveMember()} loading={saving} />
                <Button title="Cancel" onPress={() => setModalOpen(false)} variant="outline" />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Occasion Modal ────────────────────────────────────────────────── */}
      <Modal visible={occasionModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editOccasionId ? 'Edit Occasion' : 'Add Occasion'}</Text>
              <TouchableOpacity onPress={() => setOccasionModal(false)} style={s.modalClose}>
                <Text style={s.modalCloseTxt}>X</Text>
              </TouchableOpacity>
            </View>
            <View style={{padding:20}}>
              <Input label="Occasion name" value={occName} onChangeText={setOccName} placeholder="e.g. Sunday family lunch" />
              <Input label="Day" value={occDay} onChangeText={setOccDay} placeholder="e.g. Sunday" />
              <Input label="Who attends?" value={occPeople} onChangeText={setOccPeople} placeholder="e.g. Extended family, 8 people" />
              <View style={{marginTop:16,gap:10}}>
                <Button title="Save Occasion" onPress={saveOccasion} />
                <Button title="Cancel" onPress={() => setOccasionModal(false)} variant="outline" />
              </View>
            </View>
          </View>
        </View>
      </Modal>

    </ScreenWrapper>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 },
  sectionHead: { fontSize: 18, fontWeight: '700', color: colors.navy, marginTop: 20, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(30,158,94,0.2)', paddingBottom: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4, marginTop: 6 },
  input: { borderWidth: 1, borderColor: 'rgba(26,58,92,0.15)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: colors.navy, backgroundColor: 'rgba(255,255,255,0.9)', marginBottom: 8 },
  dropdown: { borderWidth: 1, borderColor: 'rgba(26,58,92,0.15)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.9)' },
  dropdownList: { borderWidth: 1, borderColor: 'rgba(26,58,92,0.15)', borderRadius: 10, backgroundColor: 'white', marginTop: 2, marginBottom: 6, overflow: 'hidden' },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: 'rgba(26,58,92,0.08)' },
  dashedBtn: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.emerald, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginBottom: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', alignItems: 'center' },
  modalSheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', maxWidth: '95%', width: '95%', alignSelf: 'center' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(26,58,92,0.1)' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.navy },
  modalClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  modalCloseTxt: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
  modalScroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 },
  modalSectionLabel: { fontSize: 13, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.8, marginBottom: 8, marginTop: 16, textTransform: 'uppercase' },
  formError: { fontSize: 13, color: colors.danger, textAlign: 'center', backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginTop: 8 },
});
