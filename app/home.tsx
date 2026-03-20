import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { generateMealPlan, MealPlanDay } from '../lib/gemini';
import { darkGray, gold, midGray, navy, white } from '../theme/colors';

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = 'maharaj' | 'user';

interface Message {
  id: string;
  role: Role;
  text: string;
  mealPlan?: MealPlanDay[];
}

type Step =
  | 'init'
  | 'greeting'
  | 'period'
  | 'food-pref'
  | 'veg-type'
  | 'nonveg-options'
  | 'confirm-single'
  | 'confirm-week'
  | 'choose-dates'
  | 'generating'
  | 'error'
  | 'done';

interface QuickReply {
  label: string;
  value: string;
  primary?: boolean;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function toYMD(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getDatesInRange(from: Date, to: Date): string[] {
  const dates: string[] = [];
  const cur = startOfDay(new Date(from));
  const end = startOfDay(new Date(to));
  while (cur <= end) {
    dates.push(toYMD(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatDate(d: Date): string {
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDateShort(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

function getWeekRange(weekOffset: 0 | 1): { start: Date; end: Date } {
  const today = new Date();
  const sunday = startOfDay(addDays(today, -today.getDay() + weekOffset * 7));
  return { start: sunday, end: addDays(sunday, 6) };
}

// ─── Quick replies per step ───────────────────────────────────────────────────

const REPLIES: Record<string, QuickReply[]> = {
  greeting: [
    { label: 'Create a Meal Plan 🍽️', value: 'create-plan' },
    { label: "View This Week's Plan 📅", value: 'view-plan' },
    { label: 'Update My Profile ⚙️', value: 'update-profile' },
  ],
  period: [
    { label: 'Today', value: 'today' },
    { label: 'Tomorrow', value: 'tomorrow' },
    { label: 'This Week (Sun–Sat)', value: 'this-week' },
    { label: 'Next Week', value: 'next-week' },
    { label: 'Choose Dates 📅', value: 'choose-dates' },
  ],
  'food-pref': [
    { label: 'Vegetarian 🥗', value: 'veg' },
    { label: 'Non-Vegetarian 🍗', value: 'nonveg' },
  ],
  'veg-type': [
    { label: 'Normal Vegetarian 🥗', value: 'normal' },
    { label: 'Fasting / Upvas 🙏', value: 'fasting' },
  ],
  'confirm-single': [
    { label: "Yes, Let's Go! ✨", value: 'confirm', primary: true },
    { label: 'Go Back', value: 'back' },
  ],
  'confirm-week': [
    { label: "Yes, Let's Go! ✨", value: 'confirm', primary: true },
    { label: 'Go Back', value: 'back' },
  ],
  error: [
    { label: 'Yes, Try Again ✨', value: 'retry', primary: true },
    { label: 'No, Maybe Later', value: 'later' },
  ],
  done: [
    { label: 'Create Another Plan 🍽️', value: 'restart' },
  ],
};

const NON_VEG_CHOICES = ['Eggs 🥚', 'Fish 🐟', 'Chicken 🍗', 'Mutton 🐑'];

// ─── TypingIndicator ──────────────────────────────────────────────────────────

function TypingIndicator() {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];
  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(dot, { toValue: -7, duration: 280, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 280, useNativeDriver: true }),
          Animated.delay(500),
        ])
      )
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, []);
  return (
    <View style={s.msgRow}>
      <View style={s.avatar}><Text style={s.avatarText}>M</Text></View>
      <View style={[s.bubble, s.bubbleMaharaj, s.typingBubble]}>
        {dots.map((dot, i) => (
          <Animated.View key={i} style={[s.typingDot, { transform: [{ translateY: dot }] }]} />
        ))}
      </View>
    </View>
  );
}

// ─── MealDayCard ──────────────────────────────────────────────────────────────

function MealDayCard({ day }: { day: MealPlanDay }) {
  return (
    <View style={s.dayCard}>
      <View style={s.dayCardHeader}>
        <Text style={s.dayCardDay}>{day.day}</Text>
        <Text style={s.dayCardDate}>{day.date}</Text>
      </View>
      <MealRow icon="🌅" label="Breakfast" name={day.breakfast.name} veg={day.breakfast.is_vegetarian} />
      <MealRow icon="☀️" label="Lunch" name={day.lunch.name} veg={day.lunch.is_vegetarian} />
      <MealRow icon="🌙" label="Dinner" name={day.dinner.name} veg={day.dinner.is_vegetarian} />
    </View>
  );
}

function MealRow({ icon, label, name, veg }: { icon: string; label: string; name: string; veg: boolean }) {
  return (
    <View style={s.mealRow}>
      <Text style={s.mealIcon}>{icon}</Text>
      <View style={s.mealInfo}>
        <Text style={s.mealLabel}>{label}</Text>
        <Text style={s.mealName}>{name}</Text>
      </View>
      {veg && <Text style={s.vegBadge}>🌿</Text>}
    </View>
  );
}

// ─── NonVegOptionsCard ────────────────────────────────────────────────────────

function NonVegOptionsCard({
  selected,
  onToggle,
  onConfirm,
}: {
  selected: string[];
  onToggle: (opt: string) => void;
  onConfirm: () => void;
}) {
  return (
    <View style={s.dateCard}>
      <Text style={s.dateCardTitle}>Select non-veg options</Text>
      <Text style={[s.mealLabel, { marginBottom: 14 }]}>Choose at least one</Text>
      <View style={s.nvChoiceRow}>
        {NON_VEG_CHOICES.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[s.nvChip, selected.includes(opt) && s.nvChipActive]}
            onPress={() => onToggle(opt)}
            activeOpacity={0.75}
          >
            <Text style={[s.nvChipText, selected.includes(opt) && s.nvChipTextActive]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        style={[s.planBtn, selected.length === 0 && s.planBtnDisabled]}
        onPress={onConfirm}
        disabled={selected.length === 0}
        activeOpacity={0.85}
      >
        <Text style={s.planBtnText}>Continue →</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── DateRangePicker ──────────────────────────────────────────────────────────

function DateRangePicker({
  fromDate, toDate, onFromChange, onToChange, onConfirm, onBack,
}: {
  fromDate: Date; toDate: Date;
  onFromChange: (d: Date) => void; onToChange: (d: Date) => void;
  onConfirm: () => void; onBack: () => void;
}) {
  const today = startOfDay(new Date());
  function shiftFrom(delta: number) {
    const next = addDays(fromDate, delta);
    if (next < today) return;
    onFromChange(next);
    if (toDate <= next) onToChange(addDays(next, 1));
  }
  function shiftTo(delta: number) {
    const next = addDays(toDate, delta);
    if (next <= fromDate) return;
    onToChange(next);
  }
  return (
    <View style={s.dateCard}>
      <Text style={s.dateCardTitle}>Select Date Range</Text>
      <View style={s.dateRow}>
        <Text style={s.dateRowLabel}>From</Text>
        <View style={s.dateStepper}>
          <TouchableOpacity style={[s.stepBtn, startOfDay(fromDate) <= today && s.stepBtnDisabled]} onPress={() => shiftFrom(-1)} disabled={startOfDay(fromDate) <= today}>
            <Text style={s.stepBtnText}>‹</Text>
          </TouchableOpacity>
          <Text style={s.dateValue}>{formatDateShort(fromDate)}</Text>
          <TouchableOpacity style={s.stepBtn} onPress={() => shiftFrom(1)}><Text style={s.stepBtnText}>›</Text></TouchableOpacity>
        </View>
      </View>
      <View style={s.dateRow}>
        <Text style={s.dateRowLabel}>To</Text>
        <View style={s.dateStepper}>
          <TouchableOpacity style={[s.stepBtn, addDays(toDate, -1) <= fromDate && s.stepBtnDisabled]} onPress={() => shiftTo(-1)} disabled={addDays(toDate, -1) <= fromDate}>
            <Text style={s.stepBtnText}>‹</Text>
          </TouchableOpacity>
          <Text style={s.dateValue}>{formatDateShort(toDate)}</Text>
          <TouchableOpacity style={s.stepBtn} onPress={() => shiftTo(1)}><Text style={s.stepBtnText}>›</Text></TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity style={s.planBtn} onPress={onConfirm} activeOpacity={0.85}>
        <Text style={s.planBtnText}>Plan These Dates</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.backLink} onPress={onBack}>
        <Text style={s.backLinkText}>← Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const [firstName, setFirstName] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [step, setStep] = useState<Step>('init');
  const [isTyping, setIsTyping] = useState(false);
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Period selection
  const [periodType, setPeriodType] = useState<string | null>(null);
  const [selectedFrom, setSelectedFrom] = useState<Date | null>(null);
  const [selectedTo, setSelectedTo] = useState<Date | null>(null);
  const [pendingConfirmStep, setPendingConfirmStep] = useState<'confirm-single' | 'confirm-week'>('confirm-single');

  // Food preferences
  const [foodPref, setFoodPref] = useState<'veg' | 'nonveg' | null>(null);
  const [vegType, setVegType] = useState<'normal' | 'fasting' | null>(null);
  const [nonVegOptions, setNonVegOptions] = useState<string[]>([]);

  // Date picker
  const [pickerFrom, setPickerFrom] = useState<Date>(startOfDay(new Date()));
  const [pickerTo, setPickerTo] = useState<Date>(addDays(startOfDay(new Date()), 1));

  const scrollRef = useRef<ScrollView>(null);
  const msgIdRef = useRef(0);

  function nextId(): string {
    msgIdRef.current += 1;
    return String(msgIdRef.current);
  }

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [messages, isTyping, step]);

  function addMsg(role: Role, text: string) {
    setMessages((prev) => [...prev, { id: nextId(), role, text }]);
  }

  function maharajSays(text: string, delay: number, nextStep: Step) {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [...prev, { id: nextId(), role: 'maharaj', text }]);
      setStep(nextStep);
    }, delay);
  }

  // ── Confirm message builder ────────────────────────────────────────────────

  function buildConfirmMessage(
    fp: 'veg' | 'nonveg',
    vt: 'normal' | 'fasting' | null,
    nvOpts: string[],
    confirmStep: 'confirm-single' | 'confirm-week',
    from: Date | null,
    to: Date | null,
  ): string {
    let prefDesc = '';
    if (fp === 'veg' && vt === 'fasting') {
      prefDesc = 'Fasting / Upvas (sabudana, rajgira, sama rice, fruits, dairy)';
    } else if (fp === 'veg') {
      prefDesc = 'Strictly vegetarian';
    } else {
      prefDesc = `Non-vegetarian · ${nvOpts.join(', ')}`;
    }

    if (confirmStep === 'confirm-single' && from) {
      return `Perfect! Here is your plan:\n\n📅 ${formatDate(from)}\n🍽️ ${prefDesc}\n\nShall I begin? This will include breakfast, lunch and dinner.`;
    } else if (confirmStep === 'confirm-week' && from && to) {
      return `Perfect! Here is your plan:\n\n📅 ${formatDate(from)} – ${formatDate(to)}\n🍽️ ${prefDesc}\nMonday & Friday: vegetarian days\n\nShall I begin?`;
    }
    return `Great! Shall I begin with your ${prefDesc} plan?`;
  }

  // ── Init ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const name: string = user.user_metadata?.full_name ?? user.email ?? '';
        setFirstName(name.split(' ')[0]);
      }
    });
    setIsTyping(true);
    const t = setTimeout(() => {
      setIsTyping(false);
      setMessages([{
        id: nextId(), role: 'maharaj',
        text: 'Namaste! 🙏 I am your Maharaj. I am here to plan your kitchen every week.\n\nWhat would you like to do today?',
      }]);
      setStep('greeting');
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  // ── Gemini generation ──────────────────────────────────────────────────────

  async function handleGeneratePlan(fromDate: Date, toDate: Date) {
    setIsTyping(true);
    setStep('generating');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_diabetic, has_bp, has_pcos, breakfast_count, lunch_count, dinner_count, appetite_level, app_language')
        .eq('id', user.id)
        .maybeSingle();

      const { data: cuisineData } = await supabase
        .from('cuisine_preferences')
        .select('cuisine_name')
        .eq('user_id', user.id)
        .eq('is_excluded', false);

      const cuisineList = cuisineData && cuisineData.length > 0
        ? cuisineData.map((r: { cuisine_name: string }) => r.cuisine_name)
        : ['Konkani'];
      const cuisine = cuisineList[Math.floor(Math.random() * cuisineList.length)];

      const since = toYMD(addDays(new Date(), -14));
      const { data: historyData } = await supabase
        .from('dish_history')
        .select('dish_name')
        .eq('user_id', user.id)
        .gte('served_date', since);

      const dishHistory = historyData?.map((r: { dish_name: string }) => r.dish_name) ?? [];
      const dates = getDatesInRange(fromDate, toDate);

      const plan = await generateMealPlan({
        userId: user.id,
        dates,
        healthFlags: {
          diabetic: profile?.is_diabetic ?? false,
          bp: profile?.has_bp ?? false,
          pcos: profile?.has_pcos ?? false,
        },
        servings: {
          breakfast: profile?.breakfast_count ?? 2,
          lunch: profile?.lunch_count ?? 2,
          dinner: profile?.dinner_count ?? 2,
        },
        appetite: profile?.appetite_level ?? 'Normal',
        language: profile?.app_language ?? 'en',
        cuisine,
        dishHistory,
        foodPrefs: {
          type: foodPref ?? 'veg',
          vegType: vegType ?? undefined,
          nonVegOptions: nonVegOptions.length > 0 ? nonVegOptions : undefined,
        },
      });

      await supabase.from('meal_plans').insert({
        user_id: user.id,
        start_date: dates[0],
        end_date: dates[dates.length - 1],
        plan_data: plan,
        cuisine_used: cuisine,
      });

      const dishRows = plan.days.flatMap((day: MealPlanDay) => [
        { user_id: user.id, dish_name: day.breakfast.name, served_date: day.date, meal_type: 'breakfast' },
        { user_id: user.id, dish_name: day.lunch.name, served_date: day.date, meal_type: 'lunch' },
        { user_id: user.id, dish_name: day.dinner.name, served_date: day.date, meal_type: 'dinner' },
      ]);
      await supabase.from('dish_history').insert(dishRows);

      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: 'maharaj',
          text: `Your meal plan is ready! 🎉 Here is what I have planned for you (${cuisine} cuisine):`,
          mealPlan: plan.days,
        },
      ]);
      setStep('done');
    } catch (err) {
      setIsTyping(false);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: 'maharaj',
          text: `${msg}\n\nWould you like to try again?`,
        },
      ]);
      setStep('error');
    }
  }

  // ── Quick reply handler ────────────────────────────────────────────────────

  function handleQuickReply(value: string) {

    // ── Greeting ──────────────────────────────────────────────────────────
    if (step === 'greeting') {
      if (value === 'create-plan') {
        addMsg('user', 'Create a Meal Plan 🍽️');
        maharajSays('Wonderful! For which period would you like me to plan your meals?', 1000, 'period');
      } else if (value === 'view-plan') {
        addMsg('user', "View This Week's Plan 📅");
        maharajSays('You don\'t have a meal plan for this week yet. Tap "Create a Meal Plan" to get started! 😊', 1000, 'greeting');
      } else if (value === 'update-profile') {
        addMsg('user', 'Update My Profile ⚙️');
        router.push('/profile-setup');
      }
    }

    // ── Period selection ──────────────────────────────────────────────────
    else if (step === 'period') {
      const today = startOfDay(new Date());
      const tomorrow = addDays(today, 1);

      if (value === 'today') {
        addMsg('user', 'Today');
        setPeriodType('today'); setSelectedFrom(today); setSelectedTo(today);
        setPendingConfirmStep('confirm-single');
        maharajSays('What is your food preference for this plan?', 1000, 'food-pref');
      } else if (value === 'tomorrow') {
        addMsg('user', 'Tomorrow');
        setPeriodType('tomorrow'); setSelectedFrom(tomorrow); setSelectedTo(tomorrow);
        setPendingConfirmStep('confirm-single');
        maharajSays('What is your food preference for this plan?', 1000, 'food-pref');
      } else if (value === 'this-week') {
        addMsg('user', 'This Week (Sun–Sat)');
        const { start, end } = getWeekRange(0);
        setPeriodType('this-week'); setSelectedFrom(start); setSelectedTo(end);
        setPendingConfirmStep('confirm-week');
        maharajSays('What is your food preference for this plan?', 1000, 'food-pref');
      } else if (value === 'next-week') {
        addMsg('user', 'Next Week');
        const { start, end } = getWeekRange(1);
        setPeriodType('next-week'); setSelectedFrom(start); setSelectedTo(end);
        setPendingConfirmStep('confirm-week');
        maharajSays('What is your food preference for this plan?', 1000, 'food-pref');
      } else if (value === 'choose-dates') {
        addMsg('user', 'Choose Dates 📅');
        maharajSays('Please select your date range below.\nI can only plan for today or future dates.', 800, 'choose-dates');
      }
    }

    // ── Food preference ───────────────────────────────────────────────────
    else if (step === 'food-pref') {
      if (value === 'veg') {
        setFoodPref('veg');
        addMsg('user', 'Vegetarian 🥗');
        maharajSays('What type of vegetarian?', 800, 'veg-type');
      } else if (value === 'nonveg') {
        setFoodPref('nonveg');
        setNonVegOptions([]);
        addMsg('user', 'Non-Vegetarian 🍗');
        maharajSays('Which non-veg options would you like included?', 800, 'nonveg-options');
      }
    }

    // ── Veg type ─────────────────────────────────────────────────────────
    else if (step === 'veg-type') {
      if (value === 'normal') {
        setVegType('normal');
        addMsg('user', 'Normal Vegetarian 🥗');
        maharajSays(
          buildConfirmMessage('veg', 'normal', [], pendingConfirmStep, selectedFrom, selectedTo),
          800,
          pendingConfirmStep
        );
      } else if (value === 'fasting') {
        setVegType('fasting');
        addMsg('user', 'Fasting / Upvas 🙏');
        maharajSays(
          buildConfirmMessage('veg', 'fasting', [], pendingConfirmStep, selectedFrom, selectedTo),
          800,
          pendingConfirmStep
        );
      }
    }

    // ── Confirm steps ─────────────────────────────────────────────────────
    else if (step === 'confirm-single' || step === 'confirm-week') {
      if (value === 'confirm') {
        addMsg('user', "Yes, Let's Go! ✨");
        void handleGeneratePlan(selectedFrom!, selectedTo!);
      } else if (value === 'back') {
        addMsg('user', 'Go Back');
        maharajSays('No problem! For which period would you like me to plan your meals?', 800, 'period');
      }
    }

    // ── Error step ────────────────────────────────────────────────────────
    else if (step === 'error') {
      if (value === 'retry') {
        addMsg('user', 'Yes, Try Again ✨');
        void handleGeneratePlan(selectedFrom!, selectedTo!);
      } else if (value === 'later') {
        addMsg('user', 'No, Maybe Later');
        maharajSays('No problem! Come back whenever you are ready. What would you like to do?', 800, 'greeting');
      }
    }

    // ── Done ──────────────────────────────────────────────────────────────
    else if (step === 'done') {
      if (value === 'restart') {
        addMsg('user', 'Create Another Plan 🍽️');
        maharajSays('Of course! For which period would you like me to plan your meals?', 800, 'period');
      }
    }
  }

  // ── Non-veg toggle ─────────────────────────────────────────────────────────

  function toggleNonVeg(opt: string) {
    setNonVegOptions((prev) =>
      prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
    );
  }

  function handleNonVegContinue() {
    const label = nonVegOptions.join(', ');
    addMsg('user', label);
    maharajSays(
      buildConfirmMessage('nonveg', null, nonVegOptions, pendingConfirmStep, selectedFrom, selectedTo),
      800,
      pendingConfirmStep
    );
  }

  // ── Choose-dates confirm ───────────────────────────────────────────────────

  function handlePlanDates() {
    setPeriodType('custom');
    setSelectedFrom(pickerFrom);
    setSelectedTo(pickerTo);
    setPendingConfirmStep('confirm-single');
    addMsg('user', `${formatDateShort(pickerFrom)} → ${formatDateShort(pickerTo)}`);
    maharajSays('What is your food preference for this plan?', 800, 'food-pref');
  }

  function handleDatesBack() {
    addMsg('user', 'Go Back');
    maharajSays('For which period would you like me to plan your meals?', 800, 'period');
  }

  // ── Copy handler ───────────────────────────────────────────────────────────

  async function handleCopy(id: string, text: string) {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // silently ignore
    }
  }

  // ── Manual text send ───────────────────────────────────────────────────────

  function handleSend() {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    addMsg('user', text);
    maharajSays('I understand! Please use the buttons above to guide our conversation, and I will help you plan your meals.', 1200, step);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/');
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  const currentReplies = !isTyping && REPLIES[step] ? REPLIES[step] : [];
  const showDatePicker = step === 'choose-dates' && !isTyping;
  const showNonVegCard = step === 'nonveg-options' && !isTyping;

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>My Maharaj</Text>
        <View style={s.headerRight}>
          {firstName ? <Text style={s.headerName}>{firstName}</Text> : null}
          <TouchableOpacity onPress={handleSignOut} style={s.signOutBtn}>
            <Text style={s.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
        <ScrollView ref={scrollRef} style={s.messageList} contentContainerStyle={s.messageListContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {messages.map((msg) => (
            <React.Fragment key={msg.id}>
              <View style={[s.msgRow, msg.role === 'user' ? s.msgRowUser : s.msgRowMaharaj]}>
                {msg.role === 'maharaj' && (
                  <View style={s.avatar}><Text style={s.avatarText}>M</Text></View>
                )}
                <View style={[s.bubble, msg.role === 'user' ? s.bubbleUser : s.bubbleMaharaj]}>
                  <Text style={[s.bubbleText, msg.role === 'user' ? s.bubbleTextUser : s.bubbleTextMaharaj]}>
                    {msg.text}
                  </Text>
                  {msg.role === 'maharaj' && (
                    <TouchableOpacity style={s.copyBtn} onPress={() => handleCopy(msg.id, msg.text)} activeOpacity={0.7}>
                      <Text style={s.copyBtnText}>{copiedId === msg.id ? '✓ Copied!' : '📋'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {msg.mealPlan && msg.mealPlan.length > 0 && (
                <View style={s.mealPlanContainer}>
                  {msg.mealPlan.map((day, i) => <MealDayCard key={i} day={day} />)}
                </View>
              )}
            </React.Fragment>
          ))}

          {isTyping && <TypingIndicator />}

          {showDatePicker && (
            <DateRangePicker
              fromDate={pickerFrom} toDate={pickerTo}
              onFromChange={(d) => { setPickerFrom(d); if (pickerTo <= d) setPickerTo(addDays(d, 1)); }}
              onToChange={setPickerTo}
              onConfirm={handlePlanDates}
              onBack={handleDatesBack}
            />
          )}

          {showNonVegCard && (
            <NonVegOptionsCard
              selected={nonVegOptions}
              onToggle={toggleNonVeg}
              onConfirm={handleNonVegContinue}
            />
          )}

          {currentReplies.length > 0 && (
            <View style={s.quickReplies}>
              {currentReplies.map((qr) => (
                <TouchableOpacity
                  key={qr.value}
                  style={[s.quickReply, qr.primary && s.quickReplyPrimary]}
                  onPress={() => handleQuickReply(qr.value)}
                  activeOpacity={0.75}
                >
                  <Text style={[s.quickReplyText, qr.primary && s.quickReplyPrimaryText]}>
                    {qr.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={{ height: 16 }} />
        </ScrollView>

        <View style={s.inputBar}>
          <TextInput
            style={s.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor={midGray}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <TouchableOpacity style={[s.sendBtn, !inputText.trim() && s.sendBtnDisabled]} onPress={handleSend} disabled={!inputText.trim()} activeOpacity={0.8}>
            <Text style={s.sendBtnText}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const BUBBLE_NAVY = '#E8EFF8';
const MAHARAJ_TEXT = '#1B3A6B';

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F9FC' },
  flex: { flex: 1 },

  header: {
    backgroundColor: navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 20 : 14,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: white },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerName: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  signOutBtn: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  signOutText: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },

  messageList: { flex: 1 },
  messageListContent: { paddingHorizontal: 16, paddingTop: 16, maxWidth: 700, width: '100%', alignSelf: 'center' },

  msgRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  msgRowMaharaj: { justifyContent: 'flex-start' },
  msgRowUser: { justifyContent: 'flex-end' },

  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: gold, alignItems: 'center', justifyContent: 'center', marginRight: 8, marginBottom: 2, flexShrink: 0 },
  avatarText: { color: white, fontWeight: '800', fontSize: 14 },

  bubble: { maxWidth: '75%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMaharaj: { backgroundColor: BUBBLE_NAVY, borderBottomLeftRadius: 4 },
  bubbleUser: { backgroundColor: gold, borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  bubbleTextMaharaj: { color: MAHARAJ_TEXT },
  bubbleTextUser: { color: white },

  copyBtn: { alignSelf: 'flex-end', marginTop: 6, paddingVertical: 2, paddingHorizontal: 4 },
  copyBtnText: { fontSize: 11, color: '#7B93B8' },

  typingBubble: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 5, minWidth: 64 },
  typingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: MAHARAJ_TEXT, opacity: 0.6 },

  quickReplies: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4, marginLeft: 40, marginBottom: 8 },
  quickReply: { borderWidth: 1.5, borderColor: navy, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: white },
  quickReplyPrimary: { backgroundColor: gold, borderColor: gold },
  quickReplyText: { color: navy, fontSize: 14, fontWeight: '600' },
  quickReplyPrimaryText: { color: white },

  // Meal plan
  mealPlanContainer: { marginLeft: 40, marginTop: 8, marginBottom: 8, gap: 12 },
  dayCard: { backgroundColor: white, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1, maxWidth: 420 },
  dayCardHeader: { backgroundColor: navy, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayCardDay: { color: white, fontWeight: '700', fontSize: 15 },
  dayCardDate: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  mealRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 10 },
  mealIcon: { fontSize: 16, width: 22, textAlign: 'center' },
  mealInfo: { flex: 1 },
  mealLabel: { fontSize: 10, fontWeight: '600', color: midGray, textTransform: 'uppercase', letterSpacing: 0.5 },
  mealName: { fontSize: 14, fontWeight: '600', color: MAHARAJ_TEXT, marginTop: 1 },
  vegBadge: { fontSize: 14 },

  // Non-veg options card
  nvChoiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  nvChip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: white },
  nvChipActive: { backgroundColor: navy, borderColor: navy },
  nvChipText: { fontSize: 13, color: darkGray, fontWeight: '500' },
  nvChipTextActive: { color: white, fontWeight: '600' },

  // Date picker card
  dateCard: { backgroundColor: white, borderRadius: 16, padding: 20, marginLeft: 40, marginTop: 4, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB', maxWidth: 340 },
  dateCardTitle: { fontSize: 14, fontWeight: '700', color: navy, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  dateRowLabel: { fontSize: 13, fontWeight: '600', color: darkGray, width: 36 },
  dateStepper: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end', gap: 10 },
  stepBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: navy, alignItems: 'center', justifyContent: 'center' },
  stepBtnDisabled: { backgroundColor: '#D1D5DB' },
  stepBtnText: { color: white, fontSize: 20, fontWeight: '700', lineHeight: 24 },
  dateValue: { fontSize: 14, fontWeight: '600', color: navy, minWidth: 130, textAlign: 'center' },
  planBtn: { backgroundColor: gold, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 8 },
  planBtnDisabled: { opacity: 0.4 },
  planBtnText: { color: white, fontWeight: '700', fontSize: 15 },
  backLink: { alignItems: 'center', marginTop: 12 },
  backLinkText: { color: midGray, fontSize: 13 },

  // Input bar
  inputBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, paddingBottom: Platform.OS === 'ios' ? 24 : 10, backgroundColor: white, borderTopWidth: 1, borderTopColor: '#E5E7EB', gap: 10, maxWidth: 700, width: '100%', alignSelf: 'center' },
  input: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#111827', borderWidth: 1, borderColor: '#E5E7EB' },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: navy, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#D1D5DB' },
  sendBtnText: { color: white, fontSize: 20, fontWeight: '700' },
});
