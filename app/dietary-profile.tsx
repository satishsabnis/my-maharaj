import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, ImageBackground, Modal, Platform, ScrollView, StyleSheet,
  Switch, Text, TextInput, TouchableOpacity, View, ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { supabase, getSessionUser } from '../lib/supabase';
import Button from '../components/Button';
import Input from '../components/Input';
import ScreenWrapper from '../components/ScreenWrapper';
import { getCuisineGroups } from '../lib/cuisineGroups';
import { colors, cards, buttons } from '../constants/theme';

// ─── Constants ────────────────────────────────────────────────────────────────

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

const LANG_OPTIONS = [
  'English', 'Hindi', 'Marathi', 'Gujarati',
  'Tamil', 'Telugu', 'Malayalam', 'Kannada', 'Bengali', 'Punjabi', 'Urdu',
];

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const HEALTH_PILLS = [
  'Diabetic', 'BP', 'PCOS', 'Cholesterol', 'Thyroid',
  'Heart', 'Kidney', 'Anaemia', 'Lactose', 'Gluten',
];

const HEALTH_COLORS: Record<string, { bg: string; fg: string }> = {
  Diabetic: { bg: '#FEF2F2', fg: '#DC2626' },
  BP: { bg: '#FFF7ED', fg: '#C2410C' },
  PCOS: { bg: '#FDF4FF', fg: '#7E22CE' },
  Cholesterol: { bg: '#FFF1F2', fg: '#BE123C' },
  Thyroid: { bg: '#ECFDF5', fg: '#059669' },
  Heart: { bg: '#FEF2F2', fg: '#DC2626' },
  Kidney: { bg: '#EFF6FF', fg: '#1D4ED8' },
  Anaemia: { bg: '#FFF7ED', fg: '#B45309' },
  Lactose: { bg: '#F0FDF4', fg: '#166534' },
  Gluten: { bg: '#FFFBEB', fg: '#92400E' },
};

const NATIONALITIES = [
  'Afghan', 'Australian', 'Bangladeshi', 'British', 'Canadian', 'Chinese',
  'Egyptian', 'Filipino', 'French', 'German', 'Indian', 'Indonesian',
  'Iranian', 'Italian', 'Japanese', 'Korean', 'Kuwaiti', 'Lebanese',
  'Malaysian', 'Nepali', 'Nigerian', 'Omani', 'Pakistani', 'Qatari',
  'Russian', 'Saudi', 'Singaporean', 'South African', 'Spanish',
  'Sri Lankan', 'Syrian', 'Thai', 'Turkish', 'UAE National', 'American',
  'Vietnamese', 'Yemeni',
].sort();

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
  id: string;
  name: string;
  age: number;
  health_notes: string | null;
}

interface MemberForm {
  name: string;
  age: string;
  nationality: string;
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

function emptyForm(): MemberForm {
  return { name: '', age: '', nationality: '', foodPreference: 'Mixed', healthConditions: [], notes: '' };
}

function formToNotes(form: MemberForm): string {
  return [...form.healthConditions, form.notes.trim()].filter(Boolean).join(', ');
}

// ─── Dropdown ─────────────────────────────────────────────────────────────────

function Dropdown({ label, value, options, onSelect, placeholder }: {
  label?: string; value: string; options: string[];
  onSelect: (v: string) => void; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ marginBottom: 10, zIndex: open ? 100 : 1 }}>
      {label && <Text style={s.fieldLabel}>{label}</Text>}
      <TouchableOpacity style={s.dropdown} onPress={() => setOpen(!open)} activeOpacity={0.8}>
        <Text style={{ flex: 1, fontSize: 13, color: value ? colors.navy : colors.textHint }}>
          {value || placeholder || 'Select...'}
        </Text>
        <Text style={{ fontSize: 10, color: colors.textMuted }}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={s.dropdownList}>
          {options.map(o => (
            <TouchableOpacity key={o} style={s.dropdownItem} onPress={() => { onSelect(o); setOpen(false); }}>
              <Text style={{ fontSize: 13, color: value === o ? colors.emerald : colors.navy, fontWeight: value === o ? '700' : '400' }}>
                {o}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── MultiDropdown — select multiple days ─────────────────────────────────────

function MultiDropdown({ label, values, options, onToggle, placeholder }: {
  label?: string; values: string[]; options: string[];
  onToggle: (v: string) => void; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const display = values.length > 0 ? values.join(', ') : placeholder || 'Select days...';
  return (
    <View style={{ marginBottom: 10, zIndex: open ? 100 : 1 }}>
      {label && <Text style={s.fieldLabel}>{label}</Text>}
      <TouchableOpacity style={s.dropdown} onPress={() => setOpen(!open)} activeOpacity={0.8}>
        <Text style={{ flex: 1, fontSize: 13, color: values.length > 0 ? colors.navy : colors.textHint }}>
          {display}
        </Text>
        <Text style={{ fontSize: 10, color: colors.textMuted }}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={s.dropdownList}>
          {options.map(o => {
            const selected = values.includes(o);
            return (
              <TouchableOpacity key={o} style={[s.dropdownItem, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} onPress={() => onToggle(o)}>
                <Text style={{ fontSize: 13, color: selected ? colors.emerald : colors.navy, fontWeight: selected ? '700' : '400' }}>
                  {o}
                </Text>
                {selected && <Text style={{ fontSize: 12, color: colors.emerald }}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function DietaryProfileScreen() {
  // ── Account ──────────────────────────────────────────────────────────────
  const [subTier, setSubTier] = useState('Free');
  const [subExpiry, setSubExpiry] = useState('—');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [userEmail, setUserEmail] = useState('');

  // ── Community ────────────────────────────────────────────────────────────
  const [community, setCommunity] = useState('');
  const [communityOther, setCommunityOther] = useState('');
  const [additionalRules, setAdditionalRules] = useState('');
  const [isJainFamily, setIsJainFamily] = useState(false);
  const [jainAllowNonJain, setJainAllowNonJain] = useState(true);

  // ── Family members ───────────────────────────────────────────────────────
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<MemberForm>(emptyForm());
  const [natSuggestions, setNatSuggestions] = useState<string[]>([]);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // ── Meal template ────────────────────────────────────────────────────────
  const [mealCurry, setMealCurry] = useState('');
  const [mealVeg, setMealVeg] = useState('');
  const [mealRaita, setMealRaita] = useState('');
  const [mealBread, setMealBread] = useState('');
  const [mealRice, setMealRice] = useState('');
  const [sundayCurry, setSundayCurry] = useState('');
  const [sundaySweet, setSundaySweet] = useState('');

  // ── Breakfast ────────────────────────────────────────────────────────────
  const [breakfastPrefs, setBreakfastPrefs] = useState('');

  // ── Cooking pattern ──────────────────────────────────────────────────────
  const [cookingPattern, setCookingPattern] = useState('');

  // ── Veg days ─────────────────────────────────────────────────────────────
  const [vegDays, setVegDays] = useState<string[]>([]);

  // ── Cuisine preferences ──────────────────────────────────────────────────
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // ── Avoids ───────────────────────────────────────────────────────────────
  const [avoidanceList, setAvoidanceList] = useState('');

  // ── Grocery ──────────────────────────────────────────────────────────────
  const [groceryDay, setGroceryDay] = useState('');
  const [preferredStores, setPreferredStores] = useState('');
  const [preferredApps, setPreferredApps] = useState('');

  // ── Occasions ────────────────────────────────────────────────────────────
  const [occasions, setOccasions] = useState<RecurringOccasion[]>([]);
  const [occasionModal, setOccasionModal] = useState(false);
  const [editOccasionId, setEditOccasionId] = useState<string | null>(null);
  const [occName, setOccName] = useState('');
  const [occDay, setOccDay] = useState('');
  const [occPeople, setOccPeople] = useState('');

  // ── Insurance ────────────────────────────────────────────────────────────
  const [hasInsurance, setHasInsurance] = useState(false);
  const [insuranceExpiry, setInsuranceExpiry] = useState('');

  // ── Notifications ────────────────────────────────────────────────────────
  const [notifFestivals, setNotifFestivals] = useState(true);
  const [notifLabReports, setNotifLabReports] = useState(true);
  const [notifInsurance, setNotifInsurance] = useState(true);

  // ── App settings ─────────────────────────────────────────────────────────
  const [cookingSkill, setCookingSkill] = useState('');
  const [budgetPref, setBudgetPref] = useState('');

  // ── Language ─────────────────────────────────────────────────────────────
  const [appLanguage, setAppLanguage] = useState('English');
  const [planSummaryLanguage, setPlanSummaryLanguage] = useState('English');
  const [shoppingLanguage, setShoppingLanguage] = useState('English');

  // ── UI state ─────────────────────────────────────────────────────────────
  const [hasChanges, setHasChanges] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [isFirstSetup, setIsFirstSetup] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const CUISINE_GROUPS = getCuisineGroups(isJainFamily);

  // ── Mark dirty ────────────────────────────────────────────────────────────
  const markDirty = () => setHasChanges(true);

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadAll() {
      try {
        const user = await getSessionUser();
        if (!user) return;
        setUserId(user.id);
        setUserEmail(user.email ?? '');

        // Load profile from Supabase
        const { data: prof, error: profErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profErr) console.error('[ProfileLoad] Supabase error:', profErr.message);

        if (prof) {
          // Account
          if (prof.subscription_tier) setSubTier(prof.subscription_tier);
          if (prof.subscription_expires_at) {
            setSubExpiry(new Date(prof.subscription_expires_at).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'short', year: 'numeric'
            }));
          }
          if (prof.full_name) setFullName(prof.full_name);
          if (prof.phone_number) setPhoneNumber(prof.phone_number);

          // Community
          if (prof.community) setCommunity(prof.community);
          if (prof.community_other) setCommunityOther(prof.community_other);
          if (prof.additional_dietary_rules) setAdditionalRules(prof.additional_dietary_rules);
          if (prof.jain_family != null) setIsJainFamily(Boolean(prof.jain_family));
          if (prof.jain_allow_non_jain != null) setJainAllowNonJain(Boolean(prof.jain_allow_non_jain));

          // Meal template
          if (prof.meal_template_curry) setMealCurry(prof.meal_template_curry);
          if (prof.meal_template_veg) setMealVeg(prof.meal_template_veg);
          if (prof.meal_template_raita) setMealRaita(prof.meal_template_raita);
          if (prof.meal_template_bread) setMealBread(prof.meal_template_bread);
          if (prof.meal_template_rice) setMealRice(prof.meal_template_rice);
          if (prof.sunday_extra_curry) setSundayCurry(prof.sunday_extra_curry);
          if (prof.sunday_sweet) setSundaySweet(prof.sunday_sweet);

          // Breakfast
          if (prof.breakfast_preferences) setBreakfastPrefs(prof.breakfast_preferences);

          // Cooking pattern
          if (prof.cooking_pattern) setCookingPattern(prof.cooking_pattern);

          // Veg days — stored as array in Supabase
          if (Array.isArray(prof.veg_days) && prof.veg_days.length > 0) {
            setVegDays(prof.veg_days);
          }

          // Avoids
          if (prof.avoidance_list) setAvoidanceList(prof.avoidance_list);

          // Grocery
          if (prof.grocery_day) setGroceryDay(prof.grocery_day);
          if (prof.preferred_supermarkets) setPreferredStores(prof.preferred_supermarkets);
          if (prof.preferred_delivery_apps) setPreferredApps(prof.preferred_delivery_apps);

          // Occasions
          if (prof.recurring_occasions) {
            try {
              const occ = typeof prof.recurring_occasions === 'string'
                ? JSON.parse(prof.recurring_occasions)
                : prof.recurring_occasions;
              if (Array.isArray(occ)) setOccasions(occ);
            } catch {}
          }

          // Insurance
          if (prof.household_insurance === 'true') setHasInsurance(true);
          if (prof.insurance_expiry) setInsuranceExpiry(prof.insurance_expiry);

          // Notifications
          if (prof.notif_festivals != null) setNotifFestivals(Boolean(prof.notif_festivals));
          if (prof.notif_lab_reports != null) setNotifLabReports(Boolean(prof.notif_lab_reports));
          if (prof.notif_insurance_reminders != null) setNotifInsurance(Boolean(prof.notif_insurance_reminders));

          // App settings
          if (prof.cooking_skill) setCookingSkill(prof.cooking_skill);
          if (prof.budget_pref) setBudgetPref(prof.budget_pref);

          // Language
          if (prof.app_language) setAppLanguage(prof.app_language);
          if (prof.plan_summary_language) setPlanSummaryLanguage(prof.plan_summary_language);
          if (prof.shopping_list_language) setShoppingLanguage(prof.shopping_list_language);

          // Write back to AsyncStorage as local cache
          const asyncUpdates: [string, string][] = [
            ['community', prof.community ?? ''],
            ['community_other', prof.community_other ?? ''],
            ['additional_dietary_rules', prof.additional_dietary_rules ?? ''],
            ['jain_family', String(prof.jain_family ?? false)],
            ['jain_allow_non_jain', String(prof.jain_allow_non_jain ?? true)],
            ['meal_template_curry', prof.meal_template_curry ?? ''],
            ['meal_template_veg', prof.meal_template_veg ?? ''],
            ['meal_template_raita', prof.meal_template_raita ?? ''],
            ['meal_template_bread', prof.meal_template_bread ?? ''],
            ['meal_template_rice', prof.meal_template_rice ?? ''],
            ['sunday_extra_curry', prof.sunday_extra_curry ?? ''],
            ['sunday_sweet', prof.sunday_sweet ?? ''],
            ['breakfast_preferences', prof.breakfast_preferences ?? ''],
            ['cooking_pattern', prof.cooking_pattern ?? ''],
            ['veg_days', JSON.stringify(prof.veg_days ?? [])],
            ['avoidance_list', prof.avoidance_list ?? ''],
            ['family_avoids', JSON.stringify(
              (prof.avoidance_list ?? '').split(',').map((s: string) => s.trim()).filter(Boolean)
            )],
            ['grocery_day', prof.grocery_day ?? ''],
            ['preferred_supermarkets', prof.preferred_supermarkets ?? ''],
            ['preferred_delivery_apps', prof.preferred_delivery_apps ?? ''],
            ['cooking_skill', prof.cooking_skill ?? ''],
            ['budget_pref', prof.budget_pref ?? ''],
            ['app_language', prof.app_language ?? 'English'],
            ['plan_summary_language', prof.plan_summary_language ?? 'English'],
            ['shopping_list_language', prof.shopping_list_language ?? 'English'],
          ];
          await AsyncStorage.multiSet(asyncUpdates);
        } else {
          // No profile row yet — first setup
          setIsFirstSetup(true);
        }

        // Load cuisine preferences
        const { data: cuisineData } = await supabase
          .from('cuisine_preferences')
          .select('cuisine_name')
          .eq('user_id', user.id)
          .eq('is_excluded', false);
        setSelectedCuisines((cuisineData ?? []).map((c: any) => c.cuisine_name));

        // Load family members
        await loadMembers(user.id);

      } catch (err) {
        console.error('[ProfileLoad] Fatal error:', err);
      }
    }
    void loadAll();
  }, []);

  // ── Load members ──────────────────────────────────────────────────────────
  const loadMembers = useCallback(async (uid?: string) => {
    setLoading(true);
    try {
      const user = uid ? { id: uid } : await getSessionUser();
      if (!user) return;
      const { data } = await supabase
        .from('family_members')
        .select('id, name, age, health_notes')
        .eq('user_id', user.id);
      setMembers((data ?? []) as Member[]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Member CRUD ───────────────────────────────────────────────────────────
  function openAdd() { setEditId(null); setForm(emptyForm()); setFormError(''); setModalOpen(true); }
  function openEdit(m: Member) {
    const notes = m.health_notes ?? '';
    const conds = HEALTH_PILLS.filter(p => notes.toLowerCase().includes(p.toLowerCase()));
    const others = conds.reduce((s, c) => s.replace(new RegExp(`,?\\s*${c}`, 'gi'), ''), notes).trim();
    setEditId(m.id);
    setForm({ name: m.name, age: String(m.age || ''), nationality: '', foodPreference: 'Mixed', healthConditions: conds, notes: others });
    setFormError('');
    setModalOpen(true);
  }

  async function saveMember() {
    if (!form.name.trim()) { setFormError('Name is required'); return; }
    setSaving(true); setFormError('');
    try {
      const user = await getSessionUser();
      if (!user) throw new Error('Not authenticated');
      const payload = {
        user_id: user.id,
        name: form.name.trim(),
        age: parseInt(form.age, 10) || 0,
        health_notes: formToNotes(form) || null,
      };
      if (editId) {
        const { error } = await supabase.from('family_members').update(payload).eq('id', editId);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('family_members').insert(payload);
        if (error) throw new Error(error.message);
      }
      setModalOpen(false);
      await loadMembers();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteMember(id: string) {
    await supabase.from('family_members').delete().eq('id', id);
    await loadMembers();
  }

  function toggleHealth(cond: string) {
    setForm(prev => ({
      ...prev,
      healthConditions: prev.healthConditions.includes(cond)
        ? prev.healthConditions.filter(c => c !== cond)
        : [...prev.healthConditions, cond],
    }));
  }

  // ── Occasion CRUD ─────────────────────────────────────────────────────────
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

  function toggleVegDay(day: string) {
    setVegDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
    markDirty();
  }

  function toggleCuisine(c: string) {
    setSelectedCuisines(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
    markDirty();
  }

  // ── Save all ──────────────────────────────────────────────────────────────
  async function saveProfile() {
    if (!hasChanges) return;
    setProfileSaving(true);

    try {
      const { data: authData } = await supabase.auth.getSession();
      const session = authData?.session;
      if (!session) {
        Alert.alert('Save failed', 'No active session — please log out and log in again.');
        setProfileSaving(false);
        return;
      }
      const uid = session.user.id;

      // Build clean upsert payload — every field explicitly included
      const payload = {
        id: uid,
        full_name: fullName.trim(),
        mobile_number: phoneNumber.trim(),
        phone_number: phoneNumber.trim(),
        community: community,
        community_other: communityOther,
        additional_dietary_rules: additionalRules,
        jain_family: isJainFamily,
        jain_allow_non_jain: jainAllowNonJain,
        meal_template_curry: mealCurry,
        meal_template_veg: mealVeg,
        meal_template_raita: mealRaita,
        meal_template_bread: mealBread,
        meal_template_rice: mealRice,
        sunday_extra_curry: sundayCurry,
        sunday_sweet: sundaySweet,
        breakfast_preferences: breakfastPrefs,
        cooking_pattern: cookingPattern,
        veg_days: vegDays,                    // ← now included
        avoidance_list: avoidanceList,
        grocery_day: groceryDay,
        preferred_supermarkets: preferredStores,
        preferred_delivery_apps: preferredApps,
        recurring_occasions: occasions,
        cooking_skill: cookingSkill,
        budget_pref: budgetPref,
        app_language: appLanguage,
        plan_summary_language: planSummaryLanguage,
        shopping_list_language: shoppingLanguage,
        household_insurance: hasInsurance ? 'true' : 'false',
        insurance_expiry: insuranceExpiry,
        notif_festivals: notifFestivals,
        notif_lab_reports: notifLabReports,
        notif_insurance_reminders: notifInsurance,
        updated_at: new Date().toISOString(),
      };

      console.log('[ProfileSave] Upserting payload:', JSON.stringify({
        community: payload.community,
        veg_days: payload.veg_days,
        avoidance_list: payload.avoidance_list,
        cooking_pattern: payload.cooking_pattern,
        sunday_extra_curry: payload.sunday_extra_curry,
        breakfast_preferences: payload.breakfast_preferences,
      }));

      const { error: upsertErr } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'id' });

      if (upsertErr) {
        console.error('[ProfileSave] Upsert error:', upsertErr.message);
        Alert.alert('Save failed', upsertErr.message || 'Could not save profile. Please try again.');
        setProfileSaving(false);
        return;
      }

      // Save cuisine preferences — delete all then insert
      await supabase.from('cuisine_preferences').delete().eq('user_id', uid);
      if (selectedCuisines.length > 0) {
        const { error: cuisineErr } = await supabase.from('cuisine_preferences').insert(
          selectedCuisines.map(c => ({ user_id: uid, cuisine_name: c, is_excluded: false }))
        );
        if (cuisineErr) console.error('[ProfileSave] Cuisine error:', cuisineErr.message);
      }

      // Write everything to AsyncStorage as local cache
      const avoidArray = avoidanceList.split(',').map(s => s.trim()).filter(Boolean);
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
        ['veg_days', JSON.stringify(vegDays)],
        ['avoidance_list', avoidanceList],
        ['family_avoids', JSON.stringify(avoidArray)],
        ['grocery_day', groceryDay],
        ['preferred_supermarkets', preferredStores],
        ['preferred_delivery_apps', preferredApps],
        ['recurring_occasions', JSON.stringify(occasions)],
        ['cooking_skill', cookingSkill],
        ['budget_pref', budgetPref],
        ['app_language', appLanguage],
        ['plan_summary_language', planSummaryLanguage],
        ['shopping_list_language', shoppingLanguage],
        ['phone_number', phoneNumber],
        ['maharaj_day', groceryDay],
        ['profile_setup_complete', 'true'],
      ]);

      setHasChanges(false);
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2500);

      if (isFirstSetup) {
        setIsFirstSetup(false);
        router.replace('/home');
      }

    } catch (err) {
      console.error('[ProfileSave] Unexpected error:', err);
      Alert.alert('Save failed', 'An unexpected error occurred. Please try again.');
    } finally {
      setProfileSaving(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <ScreenWrapper title="Family Profile Settings">
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Welcome banner */}
        {isFirstSetup && (
          <View style={[cards.frostedGreen, { padding: 14, marginBottom: 14 }]}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.navy, marginBottom: 4 }}>Welcome to My Maharaj Beta</Text>
            <Text style={{ fontSize: 10, color: colors.navy, lineHeight: 16 }}>Set up your family profile so Maharaj can personalise your meal plans.</Text>
          </View>
        )}

        {/* ══════════ 1. MY ACCOUNT ══════════ */}
        <Text style={s.sectionHead}>My Account</Text>

        <View style={[cards.frostedCyan, { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }]}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.navy }}>{subTier}</Text>
          <Text style={{ fontSize: 10, color: colors.textMuted }}>Valid until {subExpiry}</Text>
        </View>

        <Text style={s.fieldLabel}>Full Name</Text>
        <TextInput style={s.input} value={fullName} onChangeText={v => { setFullName(v); markDirty(); }} placeholder="Your full name" placeholderTextColor={colors.textHint} />

        <Text style={s.fieldLabel}>Phone</Text>
        <TextInput style={s.input} value={phoneNumber} onChangeText={v => { setPhoneNumber(v); markDirty(); }} placeholder="+971 XX XXX XXXX" placeholderTextColor={colors.textHint} keyboardType="phone-pad" />

        <Text style={s.fieldLabel}>Email</Text>
        <TextInput style={[s.input, { color: colors.textMuted, backgroundColor: '#F4F6F8' }]} value={userEmail} editable={false} />

        <TouchableOpacity
          style={[buttons.secondary, { alignItems: 'center', marginBottom: 14 }]}
          onPress={async () => {
            try {
              await supabase.auth.resetPasswordForEmail(userEmail, { redirectTo: 'https://my-maharaj.vercel.app' });
              Alert.alert('Password reset email sent.');
            } catch {
              Alert.alert('Error', 'Could not send reset email.');
            }
          }}>
          <Text style={[buttons.secondaryText, { fontSize: 12 }]}>Change password</Text>
        </TouchableOpacity>

        {/* ══════════ 2. COMMUNITY AND DIETARY IDENTITY ══════════ */}
        <Text style={s.sectionHead}>Community and Dietary Identity</Text>
        <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 8 }}>Maharaj applies appropriate dietary rules based on your community</Text>

        <Dropdown
          value={community}
          options={COMMUNITIES}
          onSelect={v => {
            setCommunity(v);
            markDirty();
            const isJain = v.startsWith('Jain');
            setIsJainFamily(isJain);
            void AsyncStorage.setItem('jain_family', String(isJain));
          }}
          placeholder="Select community..."
        />

        {community === 'Other' && (
          <>
            <Text style={s.fieldLabel}>Describe your community dietary rules</Text>
            <TextInput
              style={[s.input, { minHeight: 60, textAlignVertical: 'top' }]}
              value={communityOther}
              onChangeText={v => { setCommunityOther(v); markDirty(); }}
              placeholder="Describe rules..."
              placeholderTextColor={colors.textHint}
              multiline
            />
          </>
        )}

        <Text style={s.fieldLabel}>Any additional dietary rules?</Text>
        <TextInput
          style={[s.input, { minHeight: 60, textAlignVertical: 'top' }]}
          value={additionalRules}
          onChangeText={v => { setAdditionalRules(v); markDirty(); }}
          placeholder="e.g. No onion on Tuesdays, Ekadashi fasting, no beef ever..."
          placeholderTextColor={colors.textHint}
          multiline
        />

        {isJainFamily && (
          <View style={[cards.base, { marginBottom: 12 }]}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.navy, marginBottom: 8 }}>Would Maharaj suggest non-Jain recipes also?</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 8, borderRadius: 20, alignItems: 'center', ...(jainAllowNonJain ? { backgroundColor: colors.emerald } : { borderWidth: 1, borderColor: colors.navy }) }}
                onPress={() => { setJainAllowNonJain(true); markDirty(); }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: jainAllowNonJain ? colors.white : colors.navy }}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 8, borderRadius: 20, alignItems: 'center', ...(!jainAllowNonJain ? { backgroundColor: colors.emerald } : { borderWidth: 1, borderColor: colors.navy }) }}
                onPress={() => { setJainAllowNonJain(false); markDirty(); }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: !jainAllowNonJain ? colors.white : colors.navy }}>No</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ══════════ 3. FAMILY MEMBERS ══════════ */}
        <Text style={s.sectionHead}>Family Members</Text>

        {loading ? (
          <ActivityIndicator color={colors.emerald} style={{ marginVertical: 20 }} />
        ) : members.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 20 }}>
            <Text style={{ fontSize: 13, color: colors.textMuted }}>No family members yet</Text>
          </View>
        ) : members.map(m => {
          const pills = HEALTH_PILLS.filter(p => (m.health_notes ?? '').toLowerCase().includes(p.toLowerCase()));
          return (
            <View key={m.id} style={[cards.base, { marginBottom: 10 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.navy }}>{m.name}</Text>
                  {m.age > 0 && <Text style={{ fontSize: 10, color: colors.textMuted }}>{m.age} yrs</Text>}
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity style={[buttons.back, { paddingVertical: 5, paddingHorizontal: 10 }]} onPress={() => openEdit(m)}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: colors.navy }}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => Alert.alert('Remove member', `Remove ${m.name}?`, [{ text: 'Cancel' }, { text: 'Remove', style: 'destructive', onPress: () => void deleteMember(m.id) }])}>
                    <Text style={{ fontSize: 11, color: '#DC2626', fontWeight: '600' }}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {pills.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                  {pills.map(p => (
                    <View key={p} style={{ borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: HEALTH_COLORS[p]?.bg ?? '#F3F4F6' }}>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: HEALTH_COLORS[p]?.fg ?? '#374151' }}>{p}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        <TouchableOpacity style={s.dashedBtn} onPress={openAdd}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.emerald }}>+ Add family member</Text>
        </TouchableOpacity>

        {/* ══════════ 4. MEAL TEMPLATE ══════════ */}
        <Text style={s.sectionHead}>Meal Template</Text>
        <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 8 }}>What does a standard lunch or dinner look like for your family?</Text>

        {[
          { label: 'Curry', value: mealCurry, set: setMealCurry, placeholder: 'e.g. 1 non-veg curry' },
          { label: 'Veg side', value: mealVeg, set: setMealVeg, placeholder: 'e.g. 1 veg bhaji' },
          { label: 'Raita / accompaniment', value: mealRaita, set: setMealRaita, placeholder: 'e.g. Kachumber or Raita' },
          { label: 'Bread', value: mealBread, set: setMealBread, placeholder: 'e.g. Chapati or Poee' },
          { label: 'Rice', value: mealRice, set: setMealRice, placeholder: 'e.g. Ukde Sheeth' },
        ].map(({ label, value, set, placeholder }) => (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Text style={{ fontSize: 11, color: colors.navy, width: 100 }}>{label}</Text>
            <TextInput
              style={[s.input, { flex: 1, marginBottom: 0 }]}
              value={value}
              onChangeText={v => { set(v); markDirty(); }}
              placeholder={placeholder}
              placeholderTextColor={colors.textHint}
            />
          </View>
        ))}

        <Text style={s.fieldLabel}>Sunday special dishes</Text>
        <TextInput
          style={s.input}
          value={sundayCurry}
          onChangeText={v => { setSundayCurry(v); markDirty(); }}
          placeholder="e.g. Chicken Xacuti, Prawns Masala, Paplet Fry"
          placeholderTextColor={colors.textHint}
        />

        <Text style={s.fieldLabel}>Sunday sweet dish</Text>
        <TextInput
          style={s.input}
          value={sundaySweet}
          onChangeText={v => { setSundaySweet(v); markDirty(); }}
          placeholder="e.g. Sheera, Puran Poli"
          placeholderTextColor={colors.textHint}
        />

        {/* ══════════ 5. BREAKFAST PREFERENCES ══════════ */}
        <Text style={s.sectionHead}>Breakfast Preferences</Text>
        <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 8 }}>Tell Maharaj what your family enjoys for breakfast</Text>
        <TextInput
          style={[s.input, { minHeight: 70, textAlignVertical: 'top' }]}
          value={breakfastPrefs}
          onChangeText={v => { setBreakfastPrefs(v); markDirty(); }}
          placeholder="e.g. Dosa, Amboli, Thepla, Koki, Idli. Sundays we like something elaborate. Avoid oats and cereal."
          placeholderTextColor={colors.textHint}
          multiline
        />

        {/* ══════════ 6. COOKING PATTERN ══════════ */}
        <Text style={s.sectionHead}>Cooking Pattern</Text>
        <Dropdown
          value={cookingPattern}
          options={COOKING_PATTERNS}
          onSelect={v => { setCookingPattern(v); markDirty(); }}
          placeholder="Select cooking pattern..."
        />

        {/* ══════════ 7. VEG DAYS ══════════ */}
        <Text style={s.sectionHead}>Vegetarian Days</Text>
        <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 8 }}>Maharaj will plan only vegetarian meals on these days</Text>
        <MultiDropdown
          values={vegDays}
          options={ALL_DAYS}
          onToggle={toggleVegDay}
          placeholder="No veg days selected"
        />

        {/* ══════════ 8. CUISINE PREFERENCES ══════════ */}
        <Text style={s.sectionHead}>Cuisine Preferences</Text>
        <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 8 }}>{selectedCuisines.length} cuisine{selectedCuisines.length !== 1 ? 's' : ''} selected</Text>

        {CUISINE_GROUPS.map(group => {
          const isOpen = expandedGroups[group.label] ?? false;
          const selectedInGroup = group.cuisines.filter(c => selectedCuisines.includes(c));
          return (
            <View key={group.label} style={{ marginBottom: 6 }}>
              <TouchableOpacity
                style={[cards.base, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 }]}
                onPress={() => setExpandedGroups(prev => ({ ...prev, [group.label]: !isOpen }))}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.navy }}>{group.label}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {selectedInGroup.length > 0 && <Text style={{ fontSize: 9, color: colors.emerald }}>{selectedInGroup.join(', ')}</Text>}
                  <Text style={{ fontSize: 10, color: colors.textMuted }}>{isOpen ? '▲' : '▼'}</Text>
                </View>
              </TouchableOpacity>
              {isOpen && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 8, paddingVertical: 8 }}>
                  {group.cuisines.map(c => {
                    const active = selectedCuisines.includes(c);
                    return (
                      <TouchableOpacity
                        key={c}
                        style={{ paddingVertical: 5, paddingHorizontal: 10, borderRadius: 20, ...(active ? { backgroundColor: colors.emerald } : { borderWidth: 1, borderColor: colors.navy }) }}
                        onPress={() => toggleCuisine(c)}>
                        <Text style={{ fontSize: 11, fontWeight: '500', color: active ? colors.white : colors.navy }}>{c}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}

        {/* ══════════ 9. FAMILY AVOIDS ══════════ */}
        <Text style={s.sectionHead}>Family Avoids</Text>
        <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 8 }}>Dishes or ingredients Maharaj will never suggest</Text>
        <TextInput
          style={[s.input, { minHeight: 70, textAlignVertical: 'top' }]}
          value={avoidanceList}
          onChangeText={v => { setAvoidanceList(v); markDirty(); }}
          placeholder="e.g. Bitter gourd, ragi, millets, drumstick, mushrooms, soya"
          placeholderTextColor={colors.textHint}
          multiline
        />

        {/* ══════════ 10. GROCERY AND SHOPPING ══════════ */}
        <Text style={s.sectionHead}>Grocery and Shopping</Text>
        <Text style={s.fieldLabel}>My Maharaj Day</Text>
        <TextInput style={s.input} value={groceryDay} onChangeText={v => { setGroceryDay(v); markDirty(); }} placeholder="e.g. Saturday" placeholderTextColor={colors.textHint} />
        <Text style={s.fieldLabel}>Preferred supermarkets</Text>
        <TextInput style={s.input} value={preferredStores} onChangeText={v => { setPreferredStores(v); markDirty(); }} placeholder="e.g. Carrefour, Lulu Hypermarket" placeholderTextColor={colors.textHint} />
        <Text style={s.fieldLabel}>Preferred delivery apps</Text>
        <TextInput style={s.input} value={preferredApps} onChangeText={v => { setPreferredApps(v); markDirty(); }} placeholder="e.g. Noon Daily, Amazon Fresh" placeholderTextColor={colors.textHint} />

        {/* ══════════ 11. RECURRING OCCASIONS ══════════ */}
        <Text style={s.sectionHead}>Recurring Occasions</Text>
        {occasions.map(o => (
          <View key={o.id} style={[cards.base, { flexDirection: 'row', alignItems: 'center', marginBottom: 8 }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.navy }}>{o.name}</Text>
              <Text style={{ fontSize: 10, color: colors.textMuted }}>{o.day} — {o.people}</Text>
              <Text style={{ fontSize: 9, color: colors.emerald }}>Recurring every week</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={() => openEditOccasion(o)}>
                <Text style={{ fontSize: 10, color: colors.navy, fontWeight: '600' }}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteOccasion(o.id)}>
                <Text style={{ fontSize: 10, color: '#DC2626' }}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        <TouchableOpacity style={s.dashedBtn} onPress={openAddOccasion}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.emerald }}>+ Add recurring occasion</Text>
        </TouchableOpacity>

        {/* ══════════ 12. INSURANCE ══════════ */}
        <Text style={s.sectionHead}>Insurance</Text>
        <View style={[cards.base, { marginBottom: 10 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: colors.navy }}>Family has health insurance</Text>
            <Switch value={hasInsurance} onValueChange={v => { setHasInsurance(v); markDirty(); }} trackColor={{ false: '#D1D5DB', true: colors.emerald }} thumbColor={colors.white} />
          </View>
          {hasInsurance && (
            <View style={{ marginTop: 8 }}>
              <Text style={s.fieldLabel}>Policy expiry date</Text>
              <TextInput style={s.input} placeholder="DD/MM/YYYY" placeholderTextColor={colors.textHint} value={insuranceExpiry} onChangeText={v => { setInsuranceExpiry(v); markDirty(); }} />
            </View>
          )}
        </View>

        {/* ══════════ 13. NOTIFICATIONS ══════════ */}
        <Text style={s.sectionHead}>Notifications</Text>
        <View style={[cards.base, { marginBottom: 10 }]}>
          {[
            { label: 'Festival reminders', sub: '48 hours before upcoming festivals', val: notifFestivals, set: setNotifFestivals },
            { label: 'Lab report reminders', sub: '1 week before 3-month report expiry', val: notifLabReports, set: setNotifLabReports },
            { label: 'Insurance reminders', sub: '1 week before policy expiry', val: notifInsurance, set: setNotifInsurance },
          ].map(({ label, sub, val, set }) => (
            <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, marginBottom: 4 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: colors.navy }}>{label}</Text>
                <Text style={{ fontSize: 8, color: colors.textMuted }}>{sub}</Text>
              </View>
              <Switch value={val} onValueChange={v => { set(v); markDirty(); }} trackColor={{ false: '#D1D5DB', true: colors.emerald }} thumbColor={colors.white} />
            </View>
          ))}
        </View>

        {/* ══════════ 14. APP SETTINGS ══════════ */}
        <Text style={s.sectionHead}>App Settings</Text>
        <Dropdown label="Cooking style" value={cookingSkill} options={['Quick and easy', 'Moderate', 'Elaborate']} onSelect={v => { setCookingSkill(v); markDirty(); }} placeholder="Select..." />
        <Dropdown label="Weekly budget" value={budgetPref} options={['Everyday', 'Moderate', 'Occasional indulgence']} onSelect={v => { setBudgetPref(v); markDirty(); }} placeholder="Select..." />

        {/* ══════════ 15. LANGUAGE SETTINGS ══════════ */}
        <Text style={s.sectionHead}>Language Settings</Text>
        <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 8 }}>Three separate language settings — for different people in your household</Text>
        <Dropdown label="App language (what you see)" value={appLanguage} options={LANG_OPTIONS} onSelect={v => { setAppLanguage(v); markDirty(); }} />
        <Dropdown label="Plan summary language (for your cook)" value={planSummaryLanguage} options={LANG_OPTIONS} onSelect={v => { setPlanSummaryLanguage(v); markDirty(); }} />
        <Dropdown label="Shopping list language (for your househelp)" value={shoppingLanguage} options={LANG_OPTIONS} onSelect={v => { setShoppingLanguage(v); markDirty(); }} />

        {/* ══════════ SAVE BUTTON ══════════ */}
        <TouchableOpacity
          style={{
            backgroundColor: hasChanges ? colors.emerald : '#9CA3AF',
            borderRadius: 20,
            paddingVertical: 14,
            alignItems: 'center',
            marginTop: 16,
            marginBottom: 4,
            opacity: profileSaving ? 0.7 : 1,
          }}
          onPress={() => void saveProfile()}
          disabled={!hasChanges || profileSaving}
          activeOpacity={0.85}
        >
          {profileSaving ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.white }}>
              {hasChanges ? 'Save Profile' : 'No changes'}
            </Text>
          )}
        </TouchableOpacity>

        {savedMsg && (
          <Text style={{ fontSize: 13, color: colors.teal, textAlign: 'center', marginBottom: 20 }}>
            Profile saved
          </Text>
        )}
        {!savedMsg && <View style={{ height: 24 }} />}

      </ScrollView>

      {/* ── Add/Edit Member Modal ─────────────────────────────────────────── */}
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
              <Input label="Age" value={form.age} onChangeText={v => setForm(p => ({ ...p, age: v }))} placeholder="Age" keyboardType="numeric" />

              {/* Nationality with autocomplete */}
              <View style={{ zIndex: 10 }}>
                <Input
                  label="Nationality"
                  value={form.nationality}
                  onChangeText={v => {
                    setForm(p => ({ ...p, nationality: v }));
                    setNatSuggestions(v.length > 0 ? NATIONALITIES.filter(n => n.toLowerCase().startsWith(v.toLowerCase())).slice(0, 5) : []);
                  }}
                  placeholder="e.g. Indian, Pakistani..."
                />
                {natSuggestions.length > 0 && (
                  <View style={{ backgroundColor: 'white', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10 }}>
                    {natSuggestions.map(n => (
                      <TouchableOpacity key={n} style={{ paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }} onPress={() => { setForm(p => ({ ...p, nationality: n })); setNatSuggestions([]); }}>
                        <Text style={{ fontSize: 14, color: colors.navy }}>{n}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <Text style={s.modalSectionLabel}>FOOD PREFERENCE</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {['Vegetarian', 'Non-vegetarian', 'Eggetarian', 'Mixed'].map(fp => (
                  <TouchableOpacity
                    key={fp}
                    style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, ...(form.foodPreference === fp ? { backgroundColor: colors.emerald } : { borderWidth: 1, borderColor: colors.navy }) }}
                    onPress={() => setForm(p => ({ ...p, foodPreference: fp }))}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: form.foodPreference === fp ? colors.white : colors.navy }}>{fp}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.modalSectionLabel}>HEALTH CONDITIONS</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {HEALTH_PILLS.map(cond => (
                  <TouchableOpacity
                    key={cond}
                    onPress={() => toggleHealth(cond)}
                    style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, ...(form.healthConditions.includes(cond) ? { backgroundColor: colors.emerald } : { borderWidth: 1, borderColor: colors.navy }) }}>
                    <Text style={{ fontSize: 11, fontWeight: '500', color: form.healthConditions.includes(cond) ? colors.white : colors.navy }}>{cond}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="Medical Notes (optional)"
                value={form.notes}
                onChangeText={v => setForm(p => ({ ...p, notes: v }))}
                placeholder="e.g. Low salt, no fried food..."
                multiline
                numberOfLines={3}
              />

              {formError ? <Text style={s.formError}>{formError}</Text> : null}

              <View style={{ marginTop: 16, gap: 10 }}>
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
            <View style={{ padding: 20 }}>
              <Input label="Occasion name" value={occName} onChangeText={setOccName} placeholder="e.g. Sunday family lunch" />
              <Input label="Day" value={occDay} onChangeText={setOccDay} placeholder="e.g. Sunday" />
              <Input label="Who attends?" value={occPeople} onChangeText={setOccPeople} placeholder="e.g. Extended family, 8 people" />
              <View style={{ marginTop: 16, gap: 10 }}>
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
  sectionHead: {
    fontSize: 16, fontWeight: '700', color: colors.navy,
    marginTop: 24, marginBottom: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(30,158,94,0.2)', paddingBottom: 6,
  },
  fieldLabel: {
    fontSize: 12, fontWeight: '600', color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4, marginTop: 6,
  },
  input: {
    borderWidth: 1, borderColor: 'rgba(26,58,92,0.15)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: colors.navy,
    backgroundColor: 'rgba(255,255,255,0.9)', marginBottom: 8,
  },
  dropdown: {
    borderWidth: 1, borderColor: 'rgba(26,58,92,0.15)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.9)',
  },
  dropdownList: {
    borderWidth: 1, borderColor: 'rgba(26,58,92,0.15)', borderRadius: 10,
    backgroundColor: 'white', marginTop: 2, marginBottom: 6, overflow: 'hidden',
    maxHeight: 220,
  },
  dropdownItem: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(26,58,92,0.08)',
  },
  dashedBtn: {
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.emerald,
    borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginBottom: 14,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', alignItems: 'center' },
  modalSheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', width: '100%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(26,58,92,0.1)' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.navy },
  modalClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  modalCloseTxt: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
  modalScroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 },
  modalSectionLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.8, marginBottom: 8, marginTop: 16, textTransform: 'uppercase' },
  formError: { fontSize: 13, color: '#DC2626', textAlign: 'center', backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginTop: 8 },
});
