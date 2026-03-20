import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { navy, gold, white, lightGray, darkGray, midGray, errorRed } from '../theme/colors';

// ── Data ──────────────────────────────────────────────────────────────────────

const HEALTH_CONDITIONS = ['Diabetic', 'Blood Pressure', 'PCOS/PCOD'];

const APPETITES = ['Poor Eater', 'Normal', 'Hearty'] as const;
type Appetite = (typeof APPETITES)[number];

const CUISINES = [
  'Konkani',
  'Malvani',
  'Mangalorean',
  'Kerala',
  'Tamil Nadu',
  'Goan',
  'Vidarbha',
  'Madhya Pradesh',
  'Bangalore',
  'Sindhudurg',
];

const STORES = ['Carrefour', 'Spinneys', 'Lulu', 'All'];

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'mr', label: 'मराठी' },
  { code: 'gu', label: 'ગુજરાતી' },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProfileSetupScreen() {
  const [healthConditions, setHealthConditions] = useState<string[]>([]);
  const [breakfastCount, setBreakfastCount] = useState(2);
  const [lunchCount, setLunchCount] = useState(2);
  const [dinnerCount, setDinnerCount] = useState(2);
  const [appetite, setAppetite] = useState<Appetite>('Normal');
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [language, setLanguage] = useState('en');
  const [storePreference, setStorePreference] = useState('All');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function toggleHealth(condition: string) {
    setHealthConditions((prev) =>
      prev.includes(condition) ? prev.filter((c) => c !== condition) : [...prev, condition]
    );
  }

  function toggleCuisine(cuisine: string) {
    setCuisines((prev) =>
      prev.includes(cuisine) ? prev.filter((c) => c !== cuisine) : [...prev, cuisine]
    );
  }

  async function handleSave() {
    setError('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Not authenticated. Please log in again.');
      return;
    }

    setLoading(true);

    // Step 1: Save profile fields
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: user.id,
      full_name: user.user_metadata?.full_name ?? '',
      app_language: language,
      is_diabetic: healthConditions.includes('Diabetic'),
      has_bp: healthConditions.includes('Blood Pressure'),
      has_pcos: healthConditions.includes('PCOS/PCOD'),
      appetite_level: appetite,
      breakfast_count: breakfastCount,
      lunch_count: lunchCount,
      dinner_count: dinnerCount,
      veg_monday: true,
      veg_friday: true,
      sunday_thali_mode: true,
      wednesday_surprise: true,
      store_preference: storePreference,
    });

    if (profileError) {
      setLoading(false);
      setError(profileError.message);
      return;
    }

    // Step 2: Save cuisine preferences to separate table
    if (cuisines.length > 0) {
      const cuisineRows = cuisines.map((cuisineName) => ({
        user_id: user.id,
        cuisine_name: cuisineName,
        is_excluded: false,
        weight: 5,
      }));

      const { error: cuisineError } = await supabase
        .from('cuisine_preferences')
        .insert(cuisineRows);

      if (cuisineError) {
        setLoading(false);
        setError(cuisineError.message);
        return;
      }
    }

    setLoading(false);
    router.replace('/home');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.headerBar}>
            <Text style={styles.headerTitle}>Tell us about your family</Text>
            <Text style={styles.headerSub}>
              This helps us personalise your weekly meal plan
            </Text>
          </View>

          {/* Section 1 — Health */}
          <Section title="Health Conditions" subtitle="Select all that apply">
            <View style={styles.chipRow}>
              {HEALTH_CONDITIONS.map((c) => (
                <Chip
                  key={c}
                  label={c}
                  selected={healthConditions.includes(c)}
                  onPress={() => toggleHealth(c)}
                />
              ))}
            </View>
          </Section>

          {/* Section 2 — Family Size */}
          <Section title="Family Size" subtitle="How many people eat each meal?">
            <View style={styles.mealRow}>
              <MealCounter label="Breakfast" value={breakfastCount} onChange={setBreakfastCount} />
              <MealCounter label="Lunch" value={lunchCount} onChange={setLunchCount} />
              <MealCounter label="Dinner" value={dinnerCount} onChange={setDinnerCount} />
            </View>
          </Section>

          {/* Section 3 — Appetite */}
          <Section title="Appetite" subtitle="General eating style">
            <View style={styles.segmentRow}>
              {APPETITES.map((a) => (
                <TouchableOpacity
                  key={a}
                  style={[styles.segment, appetite === a && styles.segmentActive]}
                  onPress={() => setAppetite(a)}
                >
                  <Text style={[styles.segmentText, appetite === a && styles.segmentTextActive]}>
                    {a}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Section>

          {/* Section 4 — Cuisine Preferences */}
          <Section title="Cuisine Preferences" subtitle="Select cuisines you enjoy">
            <View style={styles.chipGrid}>
              {CUISINES.map((c) => (
                <Chip
                  key={c}
                  label={c}
                  selected={cuisines.includes(c)}
                  onPress={() => toggleCuisine(c)}
                />
              ))}
            </View>
          </Section>

          {/* Section 5 — Language */}
          <Section title="Preferred Language">
            <View style={styles.segmentRow}>
              {LANGUAGES.map((l) => (
                <TouchableOpacity
                  key={l.code}
                  style={[styles.segment, language === l.code && styles.segmentActive]}
                  onPress={() => setLanguage(l.code)}
                >
                  <Text style={[styles.segmentText, language === l.code && styles.segmentTextActive]}>
                    {l.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Section>

          {/* Section 6 — Store Preference */}
          <Section title="Preferred Supermarket">
            <View style={styles.segmentRow}>
              {STORES.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.segment, storePreference === s && styles.segmentActive]}
                  onPress={() => setStorePreference(s)}
                >
                  <Text style={[styles.segmentText, storePreference === s && styles.segmentTextActive]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Section>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Save button */}
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={white} />
            ) : (
              <Text style={styles.saveButtonText}>Save Profile</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSub}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[styles.chipText, selected && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function MealCounter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <View style={styles.counter}>
      <Text style={styles.counterLabel}>{label}</Text>
      <View style={styles.counterRow}>
        <TouchableOpacity
          style={styles.counterBtn}
          onPress={() => onChange(Math.max(1, value - 1))}
        >
          <Text style={styles.counterBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.counterValue}>{value}</Text>
        <TouchableOpacity
          style={styles.counterBtn}
          onPress={() => onChange(Math.min(6, value + 1))}
        >
          <Text style={styles.counterBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: white },
  scroll: { flexGrow: 1 },
  container: {
    paddingBottom: 60,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  headerBar: {
    backgroundColor: navy,
    paddingHorizontal: 28,
    paddingTop: Platform.OS === 'web' ? 48 : 28,
    paddingBottom: 28,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: white,
    marginBottom: 6,
  },
  headerSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
  },
  section: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: navy,
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 12,
    color: midGray,
    marginBottom: 14,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
    marginBottom: 8,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: white,
  },
  chipActive: {
    backgroundColor: navy,
    borderColor: navy,
  },
  chipText: {
    fontSize: 13,
    color: darkGray,
    fontWeight: '500',
  },
  chipTextActive: {
    color: white,
    fontWeight: '600',
  },
  mealRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 8,
    gap: 12,
  },
  counter: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: lightGray,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  counterLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: midGray,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  counterBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnText: {
    color: white,
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 22,
  },
  counterValue: {
    fontSize: 22,
    fontWeight: '700',
    color: navy,
    minWidth: 28,
    textAlign: 'center',
  },
  segmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    marginBottom: 8,
  },
  segment: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: white,
  },
  segmentActive: {
    backgroundColor: gold,
    borderColor: gold,
  },
  segmentText: {
    fontSize: 14,
    color: darkGray,
    fontWeight: '500',
  },
  segmentTextActive: {
    color: white,
    fontWeight: '700',
  },
  errorText: {
    color: errorRed,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 24,
  },
  saveButton: {
    backgroundColor: gold,
    borderRadius: 14,
    marginHorizontal: 24,
    marginTop: 32,
    paddingVertical: 18,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: {
    color: white,
    fontSize: 17,
    fontWeight: '700',
  },
});
