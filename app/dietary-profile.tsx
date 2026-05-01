// dietary-profile-v2.tsx
import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { supabase, getSessionUser } from '../lib/supabase';
import Button from '../components/Button';
import Input from '../components/Input';
import ScreenWrapper from '../components/ScreenWrapper';
import { getCuisineGroups } from '../lib/cuisineGroups';
import { colors, cards, buttons } from '../constants/theme';

// ============================================================================
// TYPES
// ============================================================================

type SubscriptionTier = 'Free' | 'Premium' | 'Pro';
type FoodPreference = 'Vegetarian' | 'Non-vegetarian' | 'Eggetarian' | 'Mixed';
type CookingPattern = 'Cook at night — dinner carries to next day lunch' | 'Cook fresh at every meal' | 'Cook once for all three meals';
type CookingSkill = 'Quick and easy' | 'Moderate' | 'Elaborate';
type BudgetPref = 'Everyday' | 'Moderate' | 'Occasional indulgence';
type Language = 'English' | 'Hindi' | 'Marathi' | 'Gujarati' | 'Tamil' | 'Telugu' | 'Malayalam' | 'Kannada' | 'Bengali' | 'Punjabi' | 'Urdu';

interface FamilyMember {
  id: string;
  name: string;
  age: number;
  healthNotes: string | null;
}

interface MemberFormData {
  name: string;
  age: string;
  nationality: string;
  foodPreference: FoodPreference;
  healthConditions: string[];
  notes: string;
}

interface RecurringOccasion {
  id: string;
  name: string;
  day: string;
  people: string;
}

interface ProfileState {
  // Account
  subscriptionTier: SubscriptionTier;
  subscriptionExpiry: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  
  // Community
  community: string;
  communityOther: string;
  additionalRules: string;
  isJainFamily: boolean;
  jainAllowNonJain: boolean;
  
  // Family
  members: FamilyMember[];
  
  // Meal template
  mealCurry: string;
  mealVeg: string;
  mealRaita: string;
  mealBread: string;
  mealRice: string;
  sundayCurry: string;
  sundaySweet: string;
  
  // Breakfast
  breakfastPrefs: string;
  
  // Cooking
  cookingPattern: CookingPattern | '';
  
  // Veg days
  vegDays: string[];
  
  // Cuisine
  selectedCuisines: string[];
  
  // Avoids
  avoidanceList: string;
  
  // Grocery
  groceryDay: string;
  preferredStores: string;
  preferredApps: string;
  
  // Occasions
  occasions: RecurringOccasion[];
  
  // Insurance
  hasInsurance: boolean;
  insuranceExpiry: string;
  
  // Notifications
  notifFestivals: boolean;
  notifLabReports: boolean;
  notifInsurance: boolean;
  
  // App settings
  cookingSkill: CookingSkill | '';
  budgetPref: BudgetPref | '';
  
  // Language
  appLanguage: Language;
  planSummaryLanguage: Language;
  shoppingLanguage: Language;
}

type ProfileAction =
  | { type: 'SET_FIELD'; field: keyof ProfileState; value: unknown }
  | { type: 'SET_MEMBERS'; members: FamilyMember[] }
  | { type: 'ADD_MEMBER'; member: FamilyMember }
  | { type: 'UPDATE_MEMBER'; id: string; updates: Partial<FamilyMember> }
  | { type: 'REMOVE_MEMBER'; id: string }
  | { type: 'SET_OCCASIONS'; occasions: RecurringOccasion[] }
  | { type: 'ADD_OCCASION'; occasion: RecurringOccasion }
  | { type: 'UPDATE_OCCASION'; id: string; updates: Partial<RecurringOccasion> }
  | { type: 'REMOVE_OCCASION'; id: string }
  | { type: 'TOGGLE_VEG_DAY'; day: string }
  | { type: 'TOGGLE_CUISINE'; cuisine: string }
  | { type: 'RESET' };

// ============================================================================
// CONSTANTS
// ============================================================================

const COMMUNITIES: readonly string[] = [
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
] as const;

const COOKING_PATTERNS: readonly CookingPattern[] = [
  'Cook at night — dinner carries to next day lunch',
  'Cook fresh at every meal',
  'Cook once for all three meals',
] as const;

const LANG_OPTIONS: readonly Language[] = [
  'English', 'Hindi', 'Marathi', 'Gujarati',
  'Tamil', 'Telugu', 'Malayalam', 'Kannada', 'Bengali', 'Punjabi', 'Urdu',
] as const;

const ALL_DAYS: readonly string[] = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
] as const;

const HEALTH_PILLS: readonly string[] = [
  'Diabetic', 'BP', 'PCOS', 'Cholesterol', 'Thyroid',
  'Heart', 'Kidney', 'Anaemia', 'Lactose', 'Gluten',
] as const;

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

const NATIONALITIES: readonly string[] = [
  'Afghan', 'Australian', 'Bangladeshi', 'British', 'Canadian', 'Chinese',
  'Egyptian', 'Filipino', 'French', 'German', 'Indian', 'Indonesian',
  'Iranian', 'Italian', 'Japanese', 'Korean', 'Kuwaiti', 'Lebanese',
  'Malaysian', 'Nepali', 'Nigerian', 'Omani', 'Pakistani', 'Qatari',
  'Russian', 'Saudi', 'Singaporean', 'South African', 'Spanish',
  'Sri Lankan', 'Syrian', 'Thai', 'Turkish', 'UAE National', 'American',
  'Vietnamese', 'Yemeni',
].sort();

// ============================================================================
// REDUCER
// ============================================================================

const initialState: ProfileState = {
  subscriptionTier: 'Free',
  subscriptionExpiry: '—',
  fullName: '',
  phoneNumber: '',
  email: '',
  community: '',
  communityOther: '',
  additionalRules: '',
  isJainFamily: false,
  jainAllowNonJain: true,
  members: [],
  mealCurry: '',
  mealVeg: '',
  mealRaita: '',
  mealBread: '',
  mealRice: '',
  sundayCurry: '',
  sundaySweet: '',
  breakfastPrefs: '',
  cookingPattern: '',
  vegDays: [],
  selectedCuisines: [],
  avoidanceList: '',
  groceryDay: '',
  preferredStores: '',
  preferredApps: '',
  occasions: [],
  hasInsurance: false,
  insuranceExpiry: '',
  notifFestivals: true,
  notifLabReports: true,
  notifInsurance: true,
  cookingSkill: '',
  budgetPref: '',
  appLanguage: 'English',
  planSummaryLanguage: 'English',
  shoppingLanguage: 'English',
};

function profileReducer(state: ProfileState, action: ProfileAction): ProfileState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    
    case 'SET_MEMBERS':
      return { ...state, members: action.members };
    
    case 'ADD_MEMBER':
      return { ...state, members: [...state.members, action.member] };
    
    case 'UPDATE_MEMBER':
      return {
        ...state,
        members: state.members.map(m => 
          m.id === action.id ? { ...m, ...action.updates } : m
        ),
      };
    
    case 'REMOVE_MEMBER':
      return {
        ...state,
        members: state.members.filter(m => m.id !== action.id),
      };
    
    case 'SET_OCCASIONS':
      return { ...state, occasions: action.occasions };
    
    case 'ADD_OCCASION':
      return { ...state, occasions: [...state.occasions, action.occasion] };
    
    case 'UPDATE_OCCASION':
      return {
        ...state,
        occasions: state.occasions.map(o =>
          o.id === action.id ? { ...o, ...action.updates } : o
        ),
      };
    
    case 'REMOVE_OCCASION':
      return {
        ...state,
        occasions: state.occasions.filter(o => o.id !== action.id),
      };
    
    case 'TOGGLE_VEG_DAY':
      return {
        ...state,
        vegDays: state.vegDays.includes(action.day)
          ? state.vegDays.filter(d => d !== action.day)
          : [...state.vegDays, action.day],
      };
    
    case 'TOGGLE_CUISINE':
      return {
        ...state,
        selectedCuisines: state.selectedCuisines.includes(action.cuisine)
          ? state.selectedCuisines.filter(c => c !== action.cuisine)
          : [...state.selectedCuisines, action.cuisine],
      };
    
    case 'RESET':
      return initialState;
    
    default:
      return state;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDate(date: Date | string | null): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function healthConditionsToNotes(conditions: string[], notes: string): string {
  const parts = [...conditions];
  if (notes.trim()) parts.push(notes.trim());
  return parts.join(', ');
}

function notesToHealthConditions(notes: string | null): { conditions: string[]; otherNotes: string } {
  if (!notes) return { conditions: [], otherNotes: '' };
  
  const conditions: string[] = [];
  let remaining = notes;
  
  for (const pill of HEALTH_PILLS) {
    const regex = new RegExp(pill, 'i');
    if (regex.test(notes)) {
      conditions.push(pill);
      remaining = remaining.replace(regex, '').replace(/,\s*/, '').trim();
    }
  }
  
  return { conditions, otherNotes: remaining };
}

// ============================================================================
// DROPDOWN COMPONENT
// ============================================================================

interface DropdownProps<T extends string> {
  label?: string;
  value: T | '';
  options: readonly T[];
  onSelect: (value: T) => void;
  placeholder?: string;
}

function Dropdown<T extends string>({
  label,
  value,
  options,
  onSelect,
  placeholder,
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  
  const handleSelect = useCallback((option: T) => {
    onSelect(option);
    setIsOpen(false);
  }, [onSelect]);
  
  return (
    <View style={styles.dropdownContainer}>
      {label && <Text style={styles.fieldLabel}>{label}</Text>}
      <TouchableOpacity
        style={styles.dropdown}
        onPress={() => setIsOpen(prev => !prev)}
        activeOpacity={0.7}
      >
        <Text style={[styles.dropdownText, !value && styles.dropdownPlaceholder]}>
          {value || placeholder || 'Select...'}
        </Text>
        <Text style={styles.dropdownArrow}>{isOpen ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      
      {isOpen && (
        <View style={styles.dropdownList}>
          {options.map(option => (
            <TouchableOpacity
              key={option}
              style={styles.dropdownItem}
              onPress={() => handleSelect(option)}
            >
              <Text
                style={[
                  styles.dropdownItemText,
                  value === option && styles.dropdownItemTextSelected,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ============================================================================
// MULTI DROPDOWN COMPONENT
// ============================================================================

interface MultiDropdownProps {
  label?: string;
  values: string[];
  options: readonly string[];
  onToggle: (value: string) => void;
  placeholder?: string;
}

function MultiDropdown({ label, values, options, onToggle, placeholder }: MultiDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const displayText = values.length > 0 ? values.join(', ') : (placeholder || 'Select...');
  
  return (
    <View style={styles.dropdownContainer}>
      {label && <Text style={styles.fieldLabel}>{label}</Text>}
      <TouchableOpacity
        style={styles.dropdown}
        onPress={() => setIsOpen(prev => !prev)}
        activeOpacity={0.7}
      >
        <Text style={[styles.dropdownText, values.length === 0 && styles.dropdownPlaceholder]}>
          {displayText}
        </Text>
        <Text style={styles.dropdownArrow}>{isOpen ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      
      {isOpen && (
        <View style={styles.dropdownList}>
          {options.map(option => {
            const isSelected = values.includes(option);
            return (
              <TouchableOpacity
                key={option}
                style={styles.dropdownItem}
                onPress={() => onToggle(option)}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    isSelected && styles.dropdownItemTextSelected,
                  ]}
                >
                  {option}
                </Text>
                {isSelected && <Text style={styles.dropdownCheckmark}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ============================================================================
// MEMBER MODAL COMPONENT
// ============================================================================

interface MemberModalProps {
  visible: boolean;
  editId: string | null;
  form: MemberFormData;
  onFormChange: (updates: Partial<MemberFormData>) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
  error: string;
}

function MemberModal({
  visible,
  editId,
  form,
  onFormChange,
  onSave,
  onClose,
  saving,
  error,
}: MemberModalProps) {
  const [nationalitySuggestions, setNationalitySuggestions] = useState<string[]>([]);
  
  const handleNationalityChange = useCallback((text: string) => {
    onFormChange({ nationality: text });
    if (text.length > 0) {
      const suggestions = NATIONALITIES.filter(n =>
        n.toLowerCase().startsWith(text.toLowerCase())
      ).slice(0, 5);
      setNationalitySuggestions(suggestions);
    } else {
      setNationalitySuggestions([]);
    }
  }, [onFormChange]);
  
  const selectNationality = useCallback((nationality: string) => {
    onFormChange({ nationality });
    setNationalitySuggestions([]);
  }, [onFormChange]);
  
  const toggleHealthCondition = useCallback((condition: string) => {
    const newConditions = form.healthConditions.includes(condition)
      ? form.healthConditions.filter(c => c !== condition)
      : [...form.healthConditions, condition];
    onFormChange({ healthConditions: newConditions });
  }, [form.healthConditions, onFormChange]);
  
  const setFoodPreference = useCallback((pref: FoodPreference) => {
    onFormChange({ foodPreference: pref });
  }, [onFormChange]);
  
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editId ? 'Edit Member' : 'Add Member'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView
            contentContainerStyle={styles.modalScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Input
              label="Name *"
              value={form.name}
              onChangeText={text => onFormChange({ name: text })}
              placeholder="Full name"
            />
            
            <Input
              label="Age"
              value={form.age}
              onChangeText={text => onFormChange({ age: text })}
              placeholder="Age"
              keyboardType="numeric"
            />
            
            {/* Nationality with autocomplete */}
            <View style={styles.nationalityContainer}>
              <Input
                label="Nationality"
                value={form.nationality}
                onChangeText={handleNationalityChange}
                placeholder="e.g. Indian, Pakistani..."
              />
              {nationalitySuggestions.length > 0 && (
                <View style={styles.nationalitySuggestions}>
                  {nationalitySuggestions.map(n => (
                    <TouchableOpacity
                      key={n}
                      style={styles.nationalitySuggestion}
                      onPress={() => selectNationality(n)}
                    >
                      <Text style={styles.nationalitySuggestionText}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            
            <Text style={styles.modalSectionLabel}>FOOD PREFERENCE</Text>
            <View style={styles.chipGroup}>
              {(['Vegetarian', 'Non-vegetarian', 'Eggetarian', 'Mixed'] as const).map(fp => (
                <TouchableOpacity
                  key={fp}
                  style={[
                    styles.chip,
                    form.foodPreference === fp && styles.chipActive,
                  ]}
                  onPress={() => setFoodPreference(fp)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      form.foodPreference === fp && styles.chipTextActive,
                    ]}
                  >
                    {fp}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={styles.modalSectionLabel}>HEALTH CONDITIONS</Text>
            <View style={styles.healthChipGroup}>
              {HEALTH_PILLS.map(condition => (
                <TouchableOpacity
                  key={condition}
                  style={[
                    styles.healthChip,
                    form.healthConditions.includes(condition) && styles.healthChipActive,
                  ]}
                  onPress={() => toggleHealthCondition(condition)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      form.healthConditions.includes(condition) && styles.chipTextActive,
                    ]}
                  >
                    {condition}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Input
              label="Medical Notes (optional)"
              value={form.notes}
              onChangeText={text => onFormChange({ notes: text })}
              placeholder="e.g. Low salt, no fried food..."
              multiline
              numberOfLines={3}
            />
            
            {error ? <Text style={styles.formError}>{error}</Text> : null}
            
            <View style={styles.modalButtons}>
              <Button title="Save Member" onPress={onSave} loading={saving} />
              <Button title="Cancel" onPress={onClose} variant="outline" />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================================
// OCCASION MODAL COMPONENT
// ============================================================================

interface OccasionModalProps {
  visible: boolean;
  editId: string | null;
  name: string;
  day: string;
  people: string;
  onNameChange: (name: string) => void;
  onDayChange: (day: string) => void;
  onPeopleChange: (people: string) => void;
  onSave: () => void;
  onClose: () => void;
}

function OccasionModal({
  visible,
  editId,
  name,
  day,
  people,
  onNameChange,
  onDayChange,
  onPeopleChange,
  onSave,
  onClose,
}: OccasionModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editId ? 'Edit Occasion' : 'Add Occasion'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.occasionModalContent}>
            <Input
              label="Occasion name"
              value={name}
              onChangeText={onNameChange}
              placeholder="e.g. Sunday family lunch"
            />
            <Input
              label="Day"
              value={day}
              onChangeText={onDayChange}
              placeholder="e.g. Sunday"
            />
            <Input
              label="Who attends?"
              value={people}
              onChangeText={onPeopleChange}
              placeholder="e.g. Extended family, 8 people"
            />
            
            <View style={styles.modalButtons}>
              <Button title="Save Occasion" onPress={onSave} />
              <Button title="Cancel" onPress={onClose} variant="outline" />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================================
// MAIN SCREEN COMPONENT
// ============================================================================

export default function DietaryProfileScreen() {
  const [state, dispatch] = useReducer(profileReducer, initialState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);
  const [isFirstSetup, setIsFirstSetup] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Member modal state
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [memberEditId, setMemberEditId] = useState<string | null>(null);
  const [memberForm, setMemberForm] = useState<MemberFormData>({
    name: '',
    age: '',
    nationality: '',
    foodPreference: 'Mixed',
    healthConditions: [],
    notes: '',
  });
  const [memberFormError, setMemberFormError] = useState('');
  const [memberSaving, setMemberSaving] = useState(false);
  
  // Cook state
  const [cooks, setCooks] = useState<{ id: string; cook_phone: string; cook_name: string; visit_time: string; visit_times: Record<string, string>; days: string[] }[]>([]);
  const [cookModalOpen, setCookModalOpen] = useState(false);
  const [cookEditId, setCookEditId] = useState<string | null>(null);
  const [cookForm, setCookForm] = useState<{ phone: string; name: string; visitTimes: Record<string, string>; days: string[]; countryCode: string; localNumber: string }>({ phone: '', name: '', visitTimes: {}, days: [], countryCode: '+971', localNumber: '' });
  const [cookSaving, setCookSaving] = useState(false);
  const [cookFormError, setCookFormError] = useState('');

  // Occasion modal state
  const [occasionModalOpen, setOccasionModalOpen] = useState(false);
  const [occasionEditId, setOccasionEditId] = useState<string | null>(null);
  const [occasionName, setOccasionName] = useState('');
  const [occasionDay, setOccasionDay] = useState('');
  const [occasionPeople, setOccasionPeople] = useState('');
  
  // UI state
  const [expandedCuisineGroups, setExpandedCuisineGroups] = useState<Record<string, boolean>>({});
  
  const cuisineGroups = useMemo(() => getCuisineGroups(state.isJainFamily), [state.isJainFamily]);
  
  // Mark changes
  const markDirty = useCallback(() => {
    setHasChanges(true);
  }, []);
  
  // Handle field changes
  const setField = useCallback(<K extends keyof ProfileState>(field: K, value: ProfileState[K]) => {
    dispatch({ type: 'SET_FIELD', field, value });
    markDirty();
  }, [markDirty]);
  
  // ==========================================================================
  // LOAD DATA
  // ==========================================================================
  
  const loadMembers = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from('family_members')
      .select('id, name, age, health_notes')
      .eq('user_id', uid);
    
    if (error) {
      console.error('[DietaryProfile] loadMembers error:', error.message);
      return;
    }
    
    const members: FamilyMember[] = (data ?? []).map(row => ({
      id: row.id,
      name: row.name,
      age: row.age,
      healthNotes: row.health_notes,
    }));
    
    dispatch({ type: 'SET_MEMBERS', members });
  }, []);
  
  const loadProfile = useCallback(async () => {
    const user = await getSessionUser();
    if (!user) return;
    
    setUserId(user.id);
    setField('email', user.email ?? '');
    void loadCooks(user.id);
    
    // Load profile from Supabase
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    
    if (profileError) {
      console.error('[DietaryProfile] profile load error:', profileError.message);
    }
    
    if (profile) {
      // Account
      if (profile.subscription_tier) setField('subscriptionTier', profile.subscription_tier);
      if (profile.subscription_expires_at) setField('subscriptionExpiry', formatDate(profile.subscription_expires_at));
      if (profile.family_name) setField('fullName', profile.family_name);
      if (profile.phone_number) setField('phoneNumber', profile.phone_number);
      
      // Community
      if (profile.community) setField('community', profile.community);
      if (profile.community_other) setField('communityOther', profile.community_other);
      if (profile.additional_dietary_rules) setField('additionalRules', profile.additional_dietary_rules);
      if (profile.jain_family !== null) setField('isJainFamily', Boolean(profile.jain_family));
      if (profile.jain_allow_non_jain !== null) setField('jainAllowNonJain', Boolean(profile.jain_allow_non_jain));
      
      // Meal template
      if (profile.meal_template_curry) setField('mealCurry', profile.meal_template_curry);
      if (profile.meal_template_veg) setField('mealVeg', profile.meal_template_veg);
      if (profile.meal_template_raita) setField('mealRaita', profile.meal_template_raita);
      if (profile.meal_template_bread) setField('mealBread', profile.meal_template_bread);
      if (profile.meal_template_rice) setField('mealRice', profile.meal_template_rice);
      if (profile.sunday_extra_curry) setField('sundayCurry', profile.sunday_extra_curry);
      if (profile.sunday_sweet) setField('sundaySweet', profile.sunday_sweet);
      
      // Breakfast
      if (profile.breakfast_preferences) setField('breakfastPrefs', profile.breakfast_preferences);
      
      // Cooking pattern
      if (profile.cooking_pattern) setField('cookingPattern', profile.cooking_pattern);
      
      // Veg days
      if (Array.isArray(profile.veg_days)) setField('vegDays', profile.veg_days);
      
      // Avoids
      if (profile.avoidance_list) setField('avoidanceList', profile.avoidance_list);
      
      // Grocery
      if (profile.grocery_day) setField('groceryDay', profile.grocery_day);
      if (profile.preferred_supermarkets) setField('preferredStores', profile.preferred_supermarkets);
      if (profile.preferred_delivery_apps) setField('preferredApps', profile.preferred_delivery_apps);
      
      // Occasions
      if (profile.recurring_occasions) {
        try {
          const occasions = typeof profile.recurring_occasions === 'string'
            ? JSON.parse(profile.recurring_occasions)
            : profile.recurring_occasions;
          if (Array.isArray(occasions)) dispatch({ type: 'SET_OCCASIONS', occasions });
        } catch {
          // Invalid JSON, ignore
        }
      }
      
      // Insurance
      if (profile.household_insurance === 'true') setField('hasInsurance', true);
      if (profile.insurance_expiry) setField('insuranceExpiry', profile.insurance_expiry);
      
      // Notifications
      if (profile.notif_festivals !== null) setField('notifFestivals', Boolean(profile.notif_festivals));
      if (profile.notif_lab_reports !== null) setField('notifLabReports', Boolean(profile.notif_lab_reports));
      if (profile.notif_insurance_reminders !== null) setField('notifInsurance', Boolean(profile.notif_insurance_reminders));
      
      // App settings
      if (profile.cooking_skill) setField('cookingSkill', profile.cooking_skill);
      if (profile.budget_pref) setField('budgetPref', profile.budget_pref);
      
      // Language
      if (profile.app_language) setField('appLanguage', profile.app_language);
      if (profile.plan_summary_language) setField('planSummaryLanguage', profile.plan_summary_language);
      if (profile.shopping_list_language) setField('shoppingLanguage', profile.shopping_list_language);
      
      // Cache to AsyncStorage
      const cacheEntries: [string, string][] = [
        ['community', profile.community ?? ''],
        ['community_other', profile.community_other ?? ''],
        ['additional_dietary_rules', profile.additional_dietary_rules ?? ''],
        ['jain_family', String(profile.jain_family ?? false)],
        ['jain_allow_non_jain', String(profile.jain_allow_non_jain ?? true)],
        ['meal_template_curry', profile.meal_template_curry ?? ''],
        ['meal_template_veg', profile.meal_template_veg ?? ''],
        ['meal_template_raita', profile.meal_template_raita ?? ''],
        ['meal_template_bread', profile.meal_template_bread ?? ''],
        ['meal_template_rice', profile.meal_template_rice ?? ''],
        ['sunday_extra_curry', profile.sunday_extra_curry ?? ''],
        ['sunday_sweet', profile.sunday_sweet ?? ''],
        ['breakfast_preferences', profile.breakfast_preferences ?? ''],
        ['cooking_pattern', profile.cooking_pattern ?? ''],
        ['veg_days', JSON.stringify(profile.veg_days ?? [])],
        ['avoidance_list', profile.avoidance_list ?? ''],
        ['grocery_day', profile.grocery_day ?? ''],
        ['preferred_supermarkets', profile.preferred_supermarkets ?? ''],
        ['preferred_delivery_apps', profile.preferred_delivery_apps ?? ''],
        ['cooking_skill', profile.cooking_skill ?? ''],
        ['budget_pref', profile.budget_pref ?? ''],
        ['app_language', profile.app_language ?? 'English'],
        ['plan_summary_language', profile.plan_summary_language ?? 'English'],
        ['shopping_list_language', profile.shopping_list_language ?? 'English'],
      ];
      await AsyncStorage.multiSet(cacheEntries);
    } else {
      setIsFirstSetup(true);
    }
    
    // Load cuisine preferences
    const { data: cuisineData } = await supabase
      .from('cuisine_preferences')
      .select('cuisine_name')
      .eq('user_id', user.id)
      .eq('is_excluded', false);
    
    const cuisines = (cuisineData ?? []).map(c => c.cuisine_name);
    setField('selectedCuisines', cuisines);
    
    // Load family members
    await loadMembers(user.id);
    
    setLoading(false);
  }, [setField, loadMembers]);
  
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);
  
  // ==========================================================================
  // MEMBER CRUD
  // ==========================================================================
  
  const openAddMember = useCallback(() => {
    setMemberEditId(null);
    setMemberForm({
      name: '',
      age: '',
      nationality: '',
      foodPreference: 'Mixed',
      healthConditions: [],
      notes: '',
    });
    setMemberFormError('');
    setMemberModalOpen(true);
  }, []);
  
  const openEditMember = useCallback((member: FamilyMember) => {
    const { conditions, otherNotes } = notesToHealthConditions(member.healthNotes);
    
    setMemberEditId(member.id);
    setMemberForm({
      name: member.name,
      age: String(member.age || ''),
      nationality: '',
      foodPreference: 'Mixed',
      healthConditions: conditions,
      notes: otherNotes,
    });
    setMemberFormError('');
    setMemberModalOpen(true);
  }, []);
  
  const saveMember = useCallback(async () => {
    if (!memberForm.name.trim()) {
      setMemberFormError('Name is required');
      return;
    }
    
    if (!userId) {
      setMemberFormError('Not authenticated');
      return;
    }
    
    setMemberSaving(true);
    setMemberFormError('');
    
    try {
      const healthNotes = healthConditionsToNotes(memberForm.healthConditions, memberForm.notes);
      const payload = {
        user_id: userId,
        name: memberForm.name.trim(),
        age: parseInt(memberForm.age, 10) || 0,
        health_notes: healthNotes || null,
      };
      
      if (memberEditId) {
        const { error } = await supabase
          .from('family_members')
          .update(payload)
          .eq('id', memberEditId);
        
        if (error) throw new Error(error.message);
        
        dispatch({
          type: 'UPDATE_MEMBER',
          id: memberEditId,
          updates: {
            name: memberForm.name.trim(),
            age: parseInt(memberForm.age, 10) || 0,
            healthNotes: healthNotes || null,
          },
        });
      } else {
        const { data, error } = await supabase
          .from('family_members')
          .insert(payload)
          .select()
          .single();
        
        if (error) throw new Error(error.message);
        
        dispatch({
          type: 'ADD_MEMBER',
          member: {
            id: data.id,
            name: data.name,
            age: data.age,
            healthNotes: data.health_notes,
          },
        });
        setTimeout(() => {
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            if (window.confirm(`Upload a lab report for ${memberForm.name.trim()}?`)) {
              router.push('/lab-report' as never);
            }
          }
        }, 300);
      }

      setMemberModalOpen(false);
      markDirty();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Save failed';
      setMemberFormError(message);
    } finally {
      setMemberSaving(false);
    }
  }, [memberForm, memberEditId, userId, markDirty]);
  
  const deleteMember = useCallback((id: string, name: string) => {
    Alert.alert('Remove member', `Remove ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('family_members').delete().eq('id', id);
          dispatch({ type: 'REMOVE_MEMBER', id });
          markDirty();
        },
      },
    ]);
  }, [markDirty]);
  
  // ==========================================================================
  // OCCASION CRUD
  // ==========================================================================
  
  const openAddOccasion = useCallback(() => {
    setOccasionEditId(null);
    setOccasionName('');
    setOccasionDay('');
    setOccasionPeople('');
    setOccasionModalOpen(true);
  }, []);
  
  const openEditOccasion = useCallback((occasion: RecurringOccasion) => {
    setOccasionEditId(occasion.id);
    setOccasionName(occasion.name);
    setOccasionDay(occasion.day);
    setOccasionPeople(occasion.people);
    setOccasionModalOpen(true);
  }, []);
  
  const saveOccasion = useCallback(() => {
    if (!occasionName.trim()) return;
    
    if (occasionEditId) {
      dispatch({
        type: 'UPDATE_OCCASION',
        id: occasionEditId,
        updates: {
          name: occasionName,
          day: occasionDay,
          people: occasionPeople,
        },
      });
    } else {
      dispatch({
        type: 'ADD_OCCASION',
        occasion: {
          id: Date.now().toString(),
          name: occasionName,
          day: occasionDay,
          people: occasionPeople,
        },
      });
    }
    
    setOccasionModalOpen(false);
    markDirty();
  }, [occasionName, occasionDay, occasionPeople, occasionEditId, markDirty]);
  
  const deleteOccasion = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_OCCASION', id });
    markDirty();
  }, [markDirty]);
  
  // ==========================================================================
  // COOK MANAGEMENT
  // ==========================================================================

  const loadCooks = useCallback(async (uid: string) => {
    const { data: links } = await supabase
      .from('cook_families')
      .select('id, cook_phone, visit_time, visit_times, days')
      .eq('family_user_id', uid);
    if (!links || links.length === 0) { setCooks([]); return; }
    const phones = links.map((l: any) => l.cook_phone);
    const { data: cookRows } = await supabase.from('cooks').select('phone, name').in('phone', phones);
    const nameMap: Record<string, string> = {};
    for (const c of (cookRows || [])) nameMap[c.phone] = c.name;
    setCooks(links.map((l: any) => ({
      id: l.id,
      cook_phone: l.cook_phone,
      cook_name: nameMap[l.cook_phone] || '',
      visit_time: l.visit_time || '',
      visit_times: l.visit_times || {},
      days: l.days || [],
    })));
  }, []);

  const openAddCook = () => {
    setCookEditId(null);
    setCookForm({ phone: '', name: '', visitTimes: {}, days: [], countryCode: '+971', localNumber: '' });
    setCookFormError('');
    setCookModalOpen(true);
  };

  const openEditCook = (cook: typeof cooks[0]) => {
    setCookEditId(cook.id);
    const cc = ['+971','+966','+965','+973','+968','+974','+91','+44','+1'].find(c => cook.cook_phone.startsWith(c)) || '+971';
    setCookForm({ phone: cook.cook_phone, name: cook.cook_name, visitTimes: cook.visit_times || {}, days: cook.days, countryCode: cc, localNumber: cook.cook_phone.slice(cc.length) });
    setCookFormError('');
    setCookModalOpen(true);
  };

  const saveCook = useCallback(async () => {
    if (!cookForm.localNumber.trim()) { setCookFormError('Phone number is required'); return; }
    if (!userId) { setCookFormError('No active session'); return; }
    setCookSaving(true);
    setCookFormError('');
    const normalizedPhone = `${cookForm.countryCode}${cookForm.localNumber.replace(/^0/, '').replace(/\D/g, '')}`;
    try {
      const response = await fetch('/api/cook-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: normalizedPhone,
          name: cookForm.name.trim() || normalizedPhone,
          family_user_id: userId,
          visit_time: Object.values(cookForm.visitTimes || {})[0] || '19:00',
          visit_times: cookForm.visitTimes || {},
          days: cookForm.days,
          edit_id: cookEditId || null,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Save failed');
      await loadCooks(userId);
      setCookModalOpen(false);
    } catch (e: any) {
      setCookFormError(e.message || 'Save failed');
    } finally {
      setCookSaving(false);
    }
  }, [cookForm, cookEditId, userId, loadCooks]);

  const removeCook = useCallback((cookId: string) => {
    const doRemove = async () => {
      try {
        const response = await fetch('/api/cook-save', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: cookId, family_user_id: userId }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Remove failed');
        if (userId) await loadCooks(userId);
      } catch (e: any) {
        Alert.alert('Remove failed', e.message);
      }
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm('Remove this cook from your family?')) void doRemove();
    } else {
      Alert.alert('Remove Cook', 'Remove this cook from your family?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: doRemove },
      ]);
    }
  }, [userId, loadCooks]);

  // ==========================================================================
  // SAVE PROFILE
  // ==========================================================================

  const saveProfile = useCallback(async () => {
    if (!hasChanges) return;
    if (!userId) {
      Alert.alert('Save failed', 'No active session');
      return;
    }
    
    setSaving(true);
    
    try {
      const payload = {
        id: userId,
        family_name: state.fullName.trim(),
        phone_number: state.phoneNumber.trim(),
        community: state.community,
        community_other: state.communityOther,
        additional_dietary_rules: state.additionalRules,
        jain_family: state.isJainFamily,
        jain_allow_non_jain: state.jainAllowNonJain,
        meal_template_curry: state.mealCurry,
        meal_template_veg: state.mealVeg,
        meal_template_raita: state.mealRaita,
        meal_template_bread: state.mealBread,
        meal_template_rice: state.mealRice,
        sunday_extra_curry: state.sundayCurry,
        sunday_sweet: state.sundaySweet,
        breakfast_preferences: state.breakfastPrefs,
        cooking_pattern: state.cookingPattern,
        veg_days: state.vegDays,
        avoidance_list: state.avoidanceList,
        grocery_day: state.groceryDay,
        preferred_supermarkets: state.preferredStores,
        preferred_delivery_apps: state.preferredApps,
        recurring_occasions: state.occasions,
        cooking_skill: state.cookingSkill,
        budget_pref: state.budgetPref,
        app_language: state.appLanguage,
        plan_summary_language: state.planSummaryLanguage,
        shopping_list_language: state.shoppingLanguage,
        household_insurance: state.hasInsurance ? 'true' : 'false',
        insurance_expiry: state.insuranceExpiry,
        notif_festivals: state.notifFestivals,
        notif_lab_reports: state.notifLabReports,
        notif_insurance_reminders: state.notifInsurance,
        dietary_profile_completed: true,
        updated_at: new Date().toISOString(),
      };
      
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'id' });
      
      if (upsertError) throw new Error(upsertError.message);
      
      // Save cuisine preferences
      await supabase.from('cuisine_preferences').delete().eq('user_id', userId);
      
      if (state.selectedCuisines.length > 0) {
        const { error: cuisineError } = await supabase
          .from('cuisine_preferences')
          .insert(state.selectedCuisines.map(c => ({
            user_id: userId,
            cuisine_name: c,
            is_excluded: false,
          })));
        
        if (cuisineError) {
          console.error('[DietaryProfile] cuisine save error:', cuisineError.message);
        }
      }
      
      // Cache to AsyncStorage
      const avoidArray = state.avoidanceList.split(',').map(s => s.trim()).filter(Boolean);
      await AsyncStorage.multiSet([
        ['community', state.community],
        ['community_other', state.communityOther],
        ['additional_dietary_rules', state.additionalRules],
        ['jain_family', String(state.isJainFamily)],
        ['jain_allow_non_jain', String(state.jainAllowNonJain)],
        ['meal_template_curry', state.mealCurry],
        ['meal_template_veg', state.mealVeg],
        ['meal_template_raita', state.mealRaita],
        ['meal_template_bread', state.mealBread],
        ['meal_template_rice', state.mealRice],
        ['sunday_extra_curry', state.sundayCurry],
        ['sunday_sweet', state.sundaySweet],
        ['breakfast_preferences', state.breakfastPrefs],
        ['cooking_pattern', state.cookingPattern],
        ['veg_days', JSON.stringify(state.vegDays)],
        ['avoidance_list', state.avoidanceList],
        ['family_avoids', JSON.stringify(avoidArray)],
        ['grocery_day', state.groceryDay],
        ['preferred_supermarkets', state.preferredStores],
        ['preferred_delivery_apps', state.preferredApps],
        ['recurring_occasions', JSON.stringify(state.occasions)],
        ['cooking_skill', state.cookingSkill],
        ['budget_pref', state.budgetPref],
        ['app_language', state.appLanguage],
        ['plan_summary_language', state.planSummaryLanguage],
        ['shopping_list_language', state.shoppingLanguage],
        ['phone_number', state.phoneNumber],
        ['dietary_food_pref', state.vegDays.length === 7 ? 'veg' : 'nonveg'],
        ['dietary_is_mixed', String(state.vegDays.length > 0 && state.vegDays.length < 7)],
      ]);
      
      setHasChanges(false);
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 2500);
      
      if (isFirstSetup) {
        setIsFirstSetup(false);
        router.replace('/home');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Save failed';
      Alert.alert('Save failed', message);
    } finally {
      setSaving(false);
    }
  }, [state, hasChanges, userId, isFirstSetup]);
  
  // ==========================================================================
  // RENDER HELPERS
  // ==========================================================================
  
  const renderFamilyMember = useCallback((member: FamilyMember) => {
    const { conditions } = notesToHealthConditions(member.healthNotes);
    
    return (
      <View key={member.id} style={styles.memberCard}>
        <View style={styles.memberHeader}>
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>{member.name}</Text>
            {member.age > 0 && (
              <Text style={styles.memberAge}>{member.age} yrs</Text>
            )}
          </View>
          <View style={styles.memberActions}>
            <TouchableOpacity
              style={styles.memberEditButton}
              onPress={() => openEditMember(member)}
            >
              <Text style={styles.memberEditText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => deleteMember(member.id, member.name)}>
              <Text style={styles.memberDeleteText}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {conditions.length > 0 && (
          <View style={styles.healthPills}>
            {conditions.map(condition => {
              const colors = HEALTH_COLORS[condition] ?? { bg: '#F3F4F6', fg: '#374151' };
              return (
                <View
                  key={condition}
                  style={[styles.healthPill, { backgroundColor: colors.bg }]}
                >
                  <Text style={[styles.healthPillText, { color: colors.fg }]}>
                    {condition}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
        <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', opacity: 0.45 }}>
          <Text style={{ fontSize: 13, color: '#2E5480', fontWeight: '600' }}>
            Lab Report
          </Text>
          <View style={{ marginLeft: 8, backgroundColor: '#C9A227', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ fontSize: 10, color: '#1A1A1A', fontWeight: '500' }}>
              Coming Soon
            </Text>
          </View>
        </View>
      </View>
    );
  }, [openEditMember, deleteMember]);
  
  const renderOccasion = useCallback((occasion: RecurringOccasion) => {
    return (
      <View key={occasion.id} style={styles.occasionCard}>
        <View style={styles.occasionInfo}>
          <Text style={styles.occasionName}>{occasion.name}</Text>
          <Text style={styles.occasionDetail}>
            {occasion.day} — {occasion.people}
          </Text>
          <Text style={styles.occasionRecurring}>Recurring every week</Text>
        </View>
        <View style={styles.occasionActions}>
          <TouchableOpacity onPress={() => openEditOccasion(occasion)}>
            <Text style={styles.occasionEditText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => deleteOccasion(occasion.id)}>
            <Text style={styles.occasionDeleteText}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [openEditOccasion, deleteOccasion]);
  
  const renderCuisineGroup = useCallback((group: { label: string; cuisines: string[] }) => {
    const isExpanded = expandedCuisineGroups[group.label] ?? false;
    const selectedInGroup = group.cuisines.filter(c => state.selectedCuisines.includes(c));
    
    return (
      <View key={group.label} style={styles.cuisineGroup}>
        <TouchableOpacity
          style={styles.cuisineGroupHeader}
          onPress={() => setExpandedCuisineGroups(prev => ({
            ...prev,
            [group.label]: !prev[group.label],
          }))}
        >
          <Text style={styles.cuisineGroupLabel}>{group.label}</Text>
          <View style={styles.cuisineGroupBadge}>
            {selectedInGroup.length > 0 && (
              <Text style={styles.cuisineGroupSelected}>
                {selectedInGroup.join(', ')}
              </Text>
            )}
            <Text style={styles.cuisineGroupArrow}>
              {isExpanded ? '▲' : '▼'}
            </Text>
          </View>
        </TouchableOpacity>
        
        {isExpanded && (
          <View style={styles.cuisineGroupList}>
            {group.cuisines.map(cuisine => {
              const isSelected = state.selectedCuisines.includes(cuisine);
              return (
                <TouchableOpacity
                  key={cuisine}
                  style={[
                    styles.cuisineChip,
                    isSelected && styles.cuisineChipSelected,
                  ]}
                  onPress={() => dispatch({ type: 'TOGGLE_CUISINE', cuisine })}
                >
                  <Text
                    style={[
                      styles.cuisineChipText,
                      isSelected && styles.cuisineChipTextSelected,
                    ]}
                  >
                    {cuisine}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    );
  }, [state.selectedCuisines, expandedCuisineGroups]);
  
  // ==========================================================================
  // LOADING STATE
  // ==========================================================================
  
  if (loading) {
    return (
      <ScreenWrapper title="Family Profile Settings">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.emerald} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </ScreenWrapper>
    );
  }
  
  // ==========================================================================
  // MAIN RENDER
  // ==========================================================================
  
  return (
    <ScreenWrapper title="Family Profile Settings">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Welcome Banner */}
          {isFirstSetup && (
            <View style={styles.welcomeBanner}>
              <Text style={styles.welcomeTitle}>Welcome to My Maharaj Beta</Text>
              <Text style={styles.welcomeText}>
                Set up your family profile so Maharaj can personalise your meal plans.
              </Text>
            </View>
          )}
          
          {/* ===== 1. MY ACCOUNT ===== */}
          <Text style={styles.sectionHead}>My Account</Text>
          
          <View style={styles.subscriptionCard}>
            <Text style={styles.subscriptionTier}>{state.subscriptionTier}</Text>
            <Text style={styles.subscriptionExpiry}>
              Valid until {state.subscriptionExpiry}
            </Text>
          </View>
          
          <Text style={styles.fieldLabel}>Family Name</Text>
          <TextInput
            style={styles.input}
            value={state.fullName}
            onChangeText={text => setField('fullName', text)}
            placeholder="e.g. Sabnis Family"
            placeholderTextColor={colors.textHint}
          />
          
          <Text style={styles.fieldLabel}>Phone</Text>
          <TextInput
            style={styles.input}
            value={state.phoneNumber}
            onChangeText={text => setField('phoneNumber', text)}
            placeholder="+971 XX XXX XXXX"
            placeholderTextColor={colors.textHint}
            keyboardType="phone-pad"
          />
          
          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput
            style={[styles.input, styles.emailInput]}
            value={state.email}
            editable={false}
          />
          
          <TouchableOpacity
            style={styles.passwordButton}
            onPress={async () => {
              try {
                await supabase.auth.resetPasswordForEmail(state.email, {
                  redirectTo: 'https://my-maharaj.vercel.app',
                });
                Alert.alert('Password reset email sent.');
              } catch {
                Alert.alert('Error', 'Could not send reset email.');
              }
            }}
          >
            <Text style={styles.passwordButtonText}>Change password</Text>
          </TouchableOpacity>
          
          {/* ===== 2. COMMUNITY AND DIETARY IDENTITY ===== */}
          <Text style={styles.sectionHead}>Community and Dietary Identity</Text>
          <Text style={styles.sectionSubtext}>
            Maharaj applies appropriate dietary rules based on your community
          </Text>
          
          <Dropdown
            value={state.community}
            options={COMMUNITIES}
            onSelect={value => {
              setField('community', value);
              const isJain = value.startsWith('Jain');
              if (isJain !== state.isJainFamily) {
                setField('isJainFamily', isJain);
              }
            }}
            placeholder="Select community..."
          />
          
          {state.community === 'Other' && (
            <>
              <Text style={styles.fieldLabel}>Describe your community dietary rules</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={state.communityOther}
                onChangeText={text => setField('communityOther', text)}
                placeholder="Describe rules..."
                placeholderTextColor={colors.textHint}
                multiline
              />
            </>
          )}
          
          <Text style={styles.fieldLabel}>Any additional dietary rules?</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={state.additionalRules}
            onChangeText={text => setField('additionalRules', text)}
            placeholder="e.g. No onion on Tuesdays, Ekadashi fasting, no beef ever..."
            placeholderTextColor={colors.textHint}
            multiline
          />
          
          {state.isJainFamily && (
            <View style={styles.jainCard}>
              <Text style={styles.jainTitle}>
                Would Maharaj suggest non-Jain recipes also?
              </Text>
              <View style={styles.jainOptions}>
                <TouchableOpacity
                  style={[
                    styles.jainOption,
                    state.jainAllowNonJain && styles.jainOptionActive,
                  ]}
                  onPress={() => setField('jainAllowNonJain', true)}
                >
                  <Text
                    style={[
                      styles.jainOptionText,
                      state.jainAllowNonJain && styles.jainOptionTextActive,
                    ]}
                  >
                    Yes
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.jainOption,
                    !state.jainAllowNonJain && styles.jainOptionActive,
                  ]}
                  onPress={() => setField('jainAllowNonJain', false)}
                >
                  <Text
                    style={[
                      styles.jainOptionText,
                      !state.jainAllowNonJain && styles.jainOptionTextActive,
                    ]}
                  >
                    No
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          {/* ===== 3. FAMILY MEMBERS ===== */}
          <Text style={styles.sectionHead}>Family Members</Text>
          
          {state.members.length === 0 ? (
            <View style={styles.emptyMembers}>
              <Text style={styles.emptyMembersText}>No family members yet</Text>
            </View>
          ) : (
            state.members.map(renderFamilyMember)
          )}
          
          <TouchableOpacity style={styles.addButton} onPress={openAddMember}>
            <Text style={styles.addButtonText}>+ Add family member</Text>
          </TouchableOpacity>
          
          {/* ===== 4. MEAL TEMPLATE ===== */}
          <Text style={styles.sectionHead}>Meal Template</Text>
          <Text style={styles.sectionSubtext}>
            What does a standard lunch or dinner look like for your family?
          </Text>
          
          <MealTemplateRow
            label="Curry"
            value={state.mealCurry}
            onChange={text => setField('mealCurry', text)}
            placeholder="e.g. 1 non-veg curry"
          />
          <MealTemplateRow
            label="Veg side"
            value={state.mealVeg}
            onChange={text => setField('mealVeg', text)}
            placeholder="e.g. 1 veg bhaji"
          />
          <MealTemplateRow
            label="Raita / accompaniment"
            value={state.mealRaita}
            onChange={text => setField('mealRaita', text)}
            placeholder="e.g. Kachumber or Raita"
          />
          <MealTemplateRow
            label="Bread"
            value={state.mealBread}
            onChange={text => setField('mealBread', text)}
            placeholder="e.g. Chapati or Poee"
          />
          <MealTemplateRow
            label="Rice"
            value={state.mealRice}
            onChange={text => setField('mealRice', text)}
            placeholder="e.g. Ukde Sheeth"
          />
          
          <Text style={styles.fieldLabel}>Sunday special dishes</Text>
          <TextInput
            style={styles.input}
            value={state.sundayCurry}
            onChangeText={text => setField('sundayCurry', text)}
            placeholder="e.g. Chicken Xacuti, Prawns Masala, Paplet Fry"
            placeholderTextColor={colors.textHint}
          />
          
          <Text style={styles.fieldLabel}>Sunday sweet dish</Text>
          <TextInput
            style={styles.input}
            value={state.sundaySweet}
            onChangeText={text => setField('sundaySweet', text)}
            placeholder="e.g. Sheera, Puran Poli"
            placeholderTextColor={colors.textHint}
          />
          
          {/* ===== 5. BREAKFAST PREFERENCES ===== */}
          <Text style={styles.sectionHead}>Breakfast Preferences</Text>
          <Text style={styles.sectionSubtext}>
            Tell Maharaj what your family enjoys for breakfast
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={state.breakfastPrefs}
            onChangeText={text => setField('breakfastPrefs', text)}
            placeholder="e.g. Dosa, Amboli, Thepla, Koki, Idli. Sundays we like something elaborate. Avoid oats and cereal."
            placeholderTextColor={colors.textHint}
            multiline
          />
          
          {/* ===== 6. COOKING PATTERN ===== */}
          <Text style={styles.sectionHead}>Cooking Pattern</Text>
          <Dropdown
            value={state.cookingPattern}
            options={COOKING_PATTERNS}
            onSelect={value => setField('cookingPattern', value)}
            placeholder="Select cooking pattern..."
          />
          
          {/* ===== 7. VEG DAYS ===== */}
          <Text style={styles.sectionHead}>Vegetarian Days</Text>
          <Text style={styles.sectionSubtext}>
            Maharaj will plan only vegetarian meals on these days
          </Text>
          <MultiDropdown
            values={state.vegDays}
            options={ALL_DAYS}
            onToggle={day => dispatch({ type: 'TOGGLE_VEG_DAY', day })}
            placeholder="No veg days selected"
          />
          
          {/* ===== 8. CUISINE PREFERENCES ===== */}
          <Text style={styles.sectionHead}>Cuisine Preferences</Text>
          <Text style={styles.sectionSubtext}>
            {state.selectedCuisines.length} cuisine
            {state.selectedCuisines.length !== 1 ? 's' : ''} selected
          </Text>
          
          {cuisineGroups.map(renderCuisineGroup)}
          
          {/* ===== 9. FAMILY AVOIDS ===== */}
          <Text style={styles.sectionHead}>Family Avoids</Text>
          <Text style={styles.sectionSubtext}>
            Dishes or ingredients Maharaj will never suggest
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={state.avoidanceList}
            onChangeText={text => setField('avoidanceList', text)}
            placeholder="e.g. Bitter gourd, ragi, millets, drumstick, mushrooms, soya"
            placeholderTextColor={colors.textHint}
            multiline
          />
          
          {/* ===== 10. GROCERY AND SHOPPING ===== */}
          <Text style={styles.sectionHead}>Grocery and Shopping</Text>
          <Text style={styles.fieldLabel}>My Maharaj Day</Text>
          <TextInput
            style={styles.input}
            value={state.groceryDay}
            onChangeText={text => setField('groceryDay', text)}
            placeholder="e.g. Saturday"
            placeholderTextColor={colors.textHint}
          />
          <Text style={styles.fieldLabel}>Preferred supermarkets</Text>
          <TextInput
            style={styles.input}
            value={state.preferredStores}
            onChangeText={text => setField('preferredStores', text)}
            placeholder="e.g. Carrefour, Lulu Hypermarket"
            placeholderTextColor={colors.textHint}
          />
          <Text style={styles.fieldLabel}>Preferred delivery apps</Text>
          <TextInput
            style={styles.input}
            value={state.preferredApps}
            onChangeText={text => setField('preferredApps', text)}
            placeholder="e.g. Noon Daily, Amazon Fresh"
            placeholderTextColor={colors.textHint}
          />
          
          {/* ===== 11. RECURRING OCCASIONS ===== */}
          <Text style={styles.sectionHead}>Recurring Occasions</Text>
          
          {state.occasions.map(renderOccasion)}
          
          <TouchableOpacity style={styles.addButton} onPress={openAddOccasion}>
            <Text style={styles.addButtonText}>+ Add recurring occasion</Text>
          </TouchableOpacity>
          
          {/* ===== 12. INSURANCE ===== */}
          <Text style={styles.sectionHead}>Insurance</Text>
          
          <View style={styles.insuranceCard}>
            <View style={styles.insuranceRow}>
              <Text style={styles.insuranceLabel}>Family has health insurance</Text>
              <Switch
                value={state.hasInsurance}
                onValueChange={value => setField('hasInsurance', value)}
                trackColor={{ false: '#D1D5DB', true: colors.emerald }}
                thumbColor={colors.white}
              />
            </View>
            {state.hasInsurance && (
              <View style={styles.insuranceExpiryContainer}>
                <Text style={styles.fieldLabel}>Policy expiry date</Text>
                <TextInput
                  style={styles.input}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor={colors.textHint}
                  value={state.insuranceExpiry}
                  onChangeText={text => setField('insuranceExpiry', text)}
                />
              </View>
            )}
          </View>
          
          {/* ===== 13. NOTIFICATIONS ===== */}
          <Text style={styles.sectionHead}>Notifications</Text>
          
          <View style={styles.notificationsCard}>
            <NotificationRow
              label="Festival reminders"
              subtitle="48 hours before upcoming festivals"
              value={state.notifFestivals}
              onToggle={value => setField('notifFestivals', value)}
            />
            <NotificationRow
              label="Lab report reminders"
              subtitle="1 week before 3-month report expiry"
              value={state.notifLabReports}
              onToggle={value => setField('notifLabReports', value)}
            />
            <NotificationRow
              label="Insurance reminders"
              subtitle="1 week before policy expiry"
              value={state.notifInsurance}
              onToggle={value => setField('notifInsurance', value)}
            />
          </View>
          
          {/* ===== 14. APP SETTINGS ===== */}
          <Text style={styles.sectionHead}>App Settings</Text>
          
          <Dropdown
            label="Cooking style"
            value={state.cookingSkill}
            options={['Quick and easy', 'Moderate', 'Elaborate'] as const}
            onSelect={value => setField('cookingSkill', value)}
            placeholder="Select..."
          />
          
          <Dropdown
            label="Weekly budget"
            value={state.budgetPref}
            options={['Everyday', 'Moderate', 'Occasional indulgence'] as const}
            onSelect={value => setField('budgetPref', value)}
            placeholder="Select..."
          />
          
          {/* ===== 15. LANGUAGE SETTINGS ===== */}
          <Text style={styles.sectionHead}>Language Settings</Text>
          <Text style={styles.sectionSubtext}>
            Three separate language settings — for different people in your household
          </Text>
          
          <Dropdown
            label="App language (what you see)"
            value={state.appLanguage}
            options={LANG_OPTIONS}
            onSelect={value => setField('appLanguage', value)}
          />
          
          <Dropdown
            label="Plan summary language (for your cook)"
            value={state.planSummaryLanguage}
            options={LANG_OPTIONS}
            onSelect={value => setField('planSummaryLanguage', value)}
          />
          
          <Dropdown
            label="Shopping list language (for your househelp)"
            value={state.shoppingLanguage}
            options={LANG_OPTIONS}
            onSelect={value => setField('shoppingLanguage', value)}
          />
          
          {/* ===== 16. MY COOK ===== */}
          <Text style={styles.sectionHead}>My Cook</Text>
          <Text style={styles.sectionSubtext}>Cooks linked to your family. They see your meal plan in their language.</Text>

          {cooks.length === 0 ? (
            <View style={styles.emptyMembers}>
              <Text style={styles.emptyMembersText}>No cooks added yet</Text>
            </View>
          ) : (
            cooks.map(cook => {
              return (
                <View key={cook.id} style={styles.memberRow}>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{cook.cook_name || 'Cook'}</Text>
                    <Text style={styles.memberAge}>
                      {cook.cook_phone} · {cook.days.length
                        ? cook.days.map(d => `${d.slice(0,3)} ${cook.visit_times?.[d] || cook.visit_time || ''}`).join(', ')
                        : `Every day${cook.visit_time ? ' · ' + cook.visit_time : ''}`}
                    </Text>
                  </View>
                  <View style={styles.memberActions}>
                    <TouchableOpacity style={styles.memberEditButton} onPress={() => openEditCook(cook)}>
                      <Text style={styles.memberEditText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeCook(cook.id)}>
                      <Text style={styles.memberDeleteText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}

          <TouchableOpacity style={[styles.addButton, { borderColor: colors.teal }]} onPress={openAddCook}>
            <Text style={[styles.addButtonText, { color: colors.teal }]}>+ Add Cook</Text>
          </TouchableOpacity>

          {/* ===== SAVE BUTTON ===== */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              (!hasChanges || saving) && styles.saveButtonDisabled,
            ]}
            onPress={saveProfile}
            disabled={!hasChanges || saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.saveButtonText}>
                {hasChanges ? 'Save Profile' : 'No changes'}
              </Text>
            )}
          </TouchableOpacity>
          
          {savedMessage && (
            <Text style={styles.savedMessage}>Profile saved</Text>
          )}
          
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Member Modal */}
      <MemberModal
        visible={memberModalOpen}
        editId={memberEditId}
        form={memberForm}
        onFormChange={updates => setMemberForm(prev => ({ ...prev, ...updates }))}
        onSave={saveMember}
        onClose={() => setMemberModalOpen(false)}
        saving={memberSaving}
        error={memberFormError}
      />
      
      {/* Occasion Modal */}
      <OccasionModal
        visible={occasionModalOpen}
        editId={occasionEditId}
        name={occasionName}
        day={occasionDay}
        people={occasionPeople}
        onNameChange={setOccasionName}
        onDayChange={setOccasionDay}
        onPeopleChange={setOccasionPeople}
        onSave={saveOccasion}
        onClose={() => setOccasionModalOpen(false)}
      />

      <CookModal
        visible={cookModalOpen}
        editId={cookEditId}
        form={cookForm}
        onFormChange={updates => setCookForm(prev => ({ ...prev, ...updates }))}
        onSave={saveCook}
        onClose={() => setCookModalOpen(false)}
        saving={cookSaving}
        error={cookFormError}
      />
    </ScreenWrapper>
  );
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

interface MealTemplateRowProps {
  label: string;
  value: string;
  onChange: (text: string) => void;
  placeholder: string;
}

function MealTemplateRow({ label, value, onChange, placeholder }: MealTemplateRowProps) {
  return (
    <View style={styles.mealTemplateRow}>
      <Text style={styles.mealTemplateLabel}>{label}</Text>
      <TextInput
        style={[styles.input, styles.mealTemplateInput]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textHint}
      />
    </View>
  );
}

interface NotificationRowProps {
  label: string;
  subtitle: string;
  value: boolean;
  onToggle: (value: boolean) => void;
}

function NotificationRow({ label, subtitle, value, onToggle }: NotificationRowProps) {
  return (
    <View style={styles.notificationRow}>
      <View style={styles.notificationInfo}>
        <Text style={styles.notificationLabel}>{label}</Text>
        <Text style={styles.notificationSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#D1D5DB', true: colors.emerald }}
        thumbColor={colors.white}
      />
    </View>
  );
}

// ============================================================================
// COOK MODAL
// ============================================================================

const WEEK_DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

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

interface CookModalProps {
  visible: boolean;
  editId: string | null;
  form: { phone: string; name: string; visitTimes: Record<string, string>; days: string[]; countryCode: string; localNumber: string };
  onFormChange: (updates: Partial<CookModalProps['form']>) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
  error: string;
}

function CookModal({ visible, editId, form, onFormChange, onSave, onClose, saving, error }: CookModalProps) {
  const [ccPickerOpen, setCcPickerOpen] = React.useState(false);

  function toggleDay(day: string) {
    const isSelected = form.days.includes(day);
    const nextDays = isSelected ? form.days.filter(d => d !== day) : [...form.days, day];
    const nextTimes = { ...form.visitTimes };
    if (isSelected) delete nextTimes[day];
    onFormChange({ days: nextDays, visitTimes: nextTimes });
  }

  const currentFlag = COUNTRY_CODES.find(c => c.code === form.countryCode)?.flag || '🇦🇪';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editId ? 'Edit Cook' : 'Add Cook'}</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView style={{ padding: 20 }} keyboardShouldPersistTaps="handled">

            {/* Phone: country code + local number */}
            <Text style={styles.fieldLabel}>Cook Phone Number *</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              <TouchableOpacity
                onPress={() => { if (!editId) setCcPickerOpen(true); }}
                style={{
                  borderWidth: 1.5, borderColor: editId ? '#E5E7EB' : 'rgba(27,58,92,0.2)',
                  borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12,
                  backgroundColor: editId ? '#F3F4F6' : '#FAFAFA',
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                }}
              >
                <Text style={{ fontSize: 18 }}>{currentFlag}</Text>
                <Text style={{ fontSize: 13, color: colors.navy, fontWeight: '600' }}>{form.countryCode}</Text>
              </TouchableOpacity>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }, editId ? { backgroundColor: '#F3F4F6' } : {}]}
                value={form.localNumber}
                onChangeText={t => onFormChange({ localNumber: t.replace(/\D/g, '') })}
                placeholder="9XXXXXXXX"
                placeholderTextColor={colors.textHint}
                keyboardType="numeric"
                editable={!editId}
              />
            </View>

            {/* Country code picker modal */}
            <Modal visible={ccPickerOpen} transparent animationType="fade" onRequestClose={() => setCcPickerOpen(false)}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' }}
                onPress={() => setCcPickerOpen(false)}
                activeOpacity={1}
              >
                <View style={{ backgroundColor: colors.white, borderRadius: 14, padding: 8, width: 270 }}>
                  {COUNTRY_CODES.map(c => (
                    <TouchableOpacity
                      key={c.code}
                      onPress={() => { onFormChange({ countryCode: c.code }); setCcPickerOpen(false); }}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 16, borderRadius: 8 }}
                    >
                      <Text style={{ fontSize: 20 }}>{c.flag}</Text>
                      <Text style={{ fontSize: 14, color: colors.navy, fontWeight: '700', width: 40 }}>{c.code}</Text>
                      <Text style={{ fontSize: 13, color: colors.textSec }}>{c.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableOpacity>
            </Modal>

            <Text style={styles.fieldLabel}>Cook Name</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={t => onFormChange({ name: t })}
              placeholder="e.g. Sunita"
              placeholderTextColor={colors.textHint}
            />

            <Text style={styles.fieldLabel}>Days of Visit (leave empty = every day)</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {WEEK_DAYS.map(day => {
                const selected = form.days.includes(day);
                return (
                  <TouchableOpacity
                    key={day}
                    onPress={() => toggleDay(day)}
                    style={{
                      borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
                      backgroundColor: selected ? colors.teal : 'transparent',
                      borderWidth: 1.5, borderColor: colors.teal,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: selected ? colors.white : colors.teal }}>
                      {day.slice(0, 3)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {form.days.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text style={[styles.fieldLabel, { marginBottom: 8 }]}>Visit Time per Day</Text>
                {form.days.map(day => (
                  <View key={day} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <Text style={{ width: 90, fontSize: 13, color: colors.navy }}>{day}</Text>
                    <TextInput
                      value={form.visitTimes?.[day] || ''}
                      onChangeText={(t) => {
                        const digits = t.replace(/\D/g, '').slice(0, 4);
                        const formatted = digits.length >= 3
                          ? `${digits.slice(0, 2)}:${digits.slice(2)}`
                          : digits;
                        onFormChange({ visitTimes: { ...form.visitTimes, [day]: formatted } });
                      }}
                      placeholder="19:00"
                      placeholderTextColor={colors.textHint}
                      keyboardType="numeric"
                      maxLength={5}
                      style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 6, width: 70, fontSize: 13, color: colors.navy }}
                    />
                  </View>
                ))}
              </View>
            )}

            {error ? <Text style={{ color: '#DC2626', fontSize: 13, marginBottom: 12 }}>{error}</Text> : null}
            <Button title={editId ? 'Update Cook' : 'Save Cook'} onPress={onSave} loading={saving} />
            <TouchableOpacity style={{ alignItems: 'center', padding: 12, marginBottom: 8 }} onPress={onClose}>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textMuted,
  },
  
  // Typography
  sectionHead: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.navy,
    marginTop: 24,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(30,158,94,0.2)',
    paddingBottom: 6,
  },
  sectionSubtext: {
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
    marginTop: 6,
  },
  
  // Inputs
  input: {
    borderWidth: 1,
    borderColor: 'rgba(26,58,92,0.15)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.navy,
    backgroundColor: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  emailInput: {
    color: colors.textMuted,
    backgroundColor: '#F4F6F8',
  },
  
  // Dropdown
  dropdownContainer: {
    marginBottom: 10,
    zIndex: 1,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: 'rgba(26,58,92,0.15)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  dropdownText: {
    flex: 1,
    fontSize: 13,
    color: colors.navy,
  },
  dropdownPlaceholder: {
    color: colors.textHint,
  },
  dropdownArrow: {
    fontSize: 10,
    color: colors.textMuted,
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: 'rgba(26,58,92,0.15)',
    borderRadius: 10,
    backgroundColor: 'white',
    marginTop: 2,
    marginBottom: 6,
    overflow: 'hidden',
    maxHeight: 220,
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(26,58,92,0.08)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownItemText: {
    fontSize: 13,
    color: colors.navy,
    fontWeight: '400',
  },
  dropdownItemTextSelected: {
    color: colors.emerald,
    fontWeight: '700',
  },
  dropdownCheckmark: {
    fontSize: 12,
    color: colors.emerald,
  },
  
  // Welcome banner
  welcomeBanner: {
    ...cards.frostedGreen,
    padding: 14,
    marginBottom: 14,
  },
  welcomeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: 10,
    color: colors.navy,
    lineHeight: 16,
  },
  
  // Subscription
  subscriptionCard: {
    ...cards.frostedCyan,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    padding: 10,
  },
  subscriptionTier: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.navy,
  },
  subscriptionExpiry: {
    fontSize: 10,
    color: colors.textMuted,
  },
  
  // Password
  passwordButton: {
    ...buttons.secondary,
    alignItems: 'center',
    marginBottom: 14,
  },
  passwordButtonText: {
    ...buttons.secondaryText,
    fontSize: 12,
  },
  
  // Jain card
  jainCard: {
    ...cards.base,
    marginBottom: 12,
    padding: 12,
  },
  jainTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 8,
  },
  jainOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  jainOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.navy,
  },
  jainOptionActive: {
    backgroundColor: colors.emerald,
    borderWidth: 0,
  },
  jainOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.navy,
  },
  jainOptionTextActive: {
    color: colors.white,
  },
  
  // Family members
  memberCard: {
    ...cards.base,
    marginBottom: 10,
    padding: 12,
  },
  memberRow: {
    ...cards.base,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 10,
    padding: 12,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
  },
  memberAge: {
    fontSize: 10,
    color: colors.textMuted,
  },
  memberActions: {
    flexDirection: 'row',
    gap: 8,
  },
  memberEditButton: {
    ...buttons.back,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  memberEditText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.navy,
  },
  memberDeleteText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '600',
  },
  healthPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  healthPill: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  healthPillText: {
    fontSize: 10,
    fontWeight: '600',
  },
  emptyMembers: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyMembersText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  
  // Add button
  addButton: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.emerald,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.emerald,
  },
  
  // Meal template
  mealTemplateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  mealTemplateLabel: {
    fontSize: 11,
    color: colors.navy,
    width: 100,
  },
  mealTemplateInput: {
    flex: 1,
    marginBottom: 0,
  },
  
  // Cuisine
  cuisineGroup: {
    marginBottom: 6,
  },
  cuisineGroupHeader: {
    ...cards.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0,
    padding: 12,
  },
  cuisineGroupLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.navy,
  },
  cuisineGroupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cuisineGroupSelected: {
    fontSize: 9,
    color: colors.emerald,
  },
  cuisineGroupArrow: {
    fontSize: 10,
    color: colors.textMuted,
  },
  cuisineGroupList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  cuisineChip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.navy,
  },
  cuisineChipSelected: {
    backgroundColor: colors.emerald,
    borderWidth: 0,
  },
  cuisineChipText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.navy,
  },
  cuisineChipTextSelected: {
    color: colors.white,
  },
  
  // Occasions
  occasionCard: {
    ...cards.base,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    padding: 12,
  },
  occasionInfo: {
    flex: 1,
  },
  occasionName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy,
  },
  occasionDetail: {
    fontSize: 10,
    color: colors.textMuted,
  },
  occasionRecurring: {
    fontSize: 9,
    color: colors.emerald,
  },
  occasionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  occasionEditText: {
    fontSize: 10,
    color: colors.navy,
    fontWeight: '600',
  },
  occasionDeleteText: {
    fontSize: 10,
    color: '#DC2626',
  },
  
  // Insurance
  insuranceCard: {
    ...cards.base,
    marginBottom: 10,
    padding: 12,
  },
  insuranceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  insuranceLabel: {
    fontSize: 11,
    color: colors.navy,
  },
  insuranceExpiryContainer: {
    marginTop: 8,
  },
  
  // Notifications
  notificationsCard: {
    ...cards.base,
    marginBottom: 10,
    padding: 12,
  },
  notificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 4,
  },
  notificationInfo: {
    flex: 1,
  },
  notificationLabel: {
    fontSize: 11,
    color: colors.navy,
  },
  notificationSubtitle: {
    fontSize: 8,
    color: colors.textMuted,
  },
  
  // Save button
  saveButton: {
    backgroundColor: colors.emerald,
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 4,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  savedMessage: {
    fontSize: 13,
    color: colors.teal,
    textAlign: 'center',
    marginBottom: 20,
  },
  
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(26,58,92,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.navy,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '600',
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  modalSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase',
  },
  modalButtons: {
    marginTop: 16,
    gap: 10,
  },
  occasionModalContent: {
    padding: 20,
  },
  
  // Chips
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.navy,
  },
  chipActive: {
    backgroundColor: colors.emerald,
    borderWidth: 0,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.navy,
  },
  chipTextActive: {
    color: colors.white,
  },
  healthChipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  healthChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.navy,
  },
  healthChipActive: {
    backgroundColor: colors.emerald,
    borderWidth: 0,
  },
  
  // Form error
  formError: {
    fontSize: 13,
    color: '#DC2626',
    textAlign: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  
  // Nationality autocomplete
  nationalityContainer: {
    zIndex: 10,
    marginBottom: 8,
  },
  nationalitySuggestions: {
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 10,
  },
  nationalitySuggestion: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  nationalitySuggestionText: {
    fontSize: 14,
    color: colors.navy,
  },
  
  // Spacers
  bottomSpacer: {
    height: 24,
  },
});