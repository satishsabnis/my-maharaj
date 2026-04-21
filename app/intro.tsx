import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  ImageBackground,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../constants/theme';
import Button from '../components/Button';

const SW = Dimensions.get('window').width;

// ── Slide definitions ─────────────────────────────────────────────────────────
type Slide = {
  id: string;
  tag: string;
  title: string;
  subtitle?: string;
  banner?: string;
  microline?: string;
  showHero?: boolean;
  showFamily?: boolean;
  showPlan?: boolean;
  showChat?: boolean;
  showCook?: boolean;
};

const SLIDES: Slide[] = [
  {
    id: 'hero',
    showHero: true,
    tag: 'YOUR PERSONAL MEAL PLANNER',
    title: 'Stop Thinking About What to Cook',
    subtitle: 'Your daily meals — planned, decided, and ready.',
  },
  {
    id: 'family',
    showFamily: true,
    tag: 'BUILT FOR YOUR FAMILY',
    title: 'Every Member · Every Diet · Every Health Condition',
    banner: 'Set once — applied silently to every plan, every day.',
  },
  {
    id: 'plan',
    showPlan: true,
    tag: 'ONE TAP. ONE WEEK.',
    title: 'One Tap Weekly — Meal Plan to Shopping List',
    banner: 'Every Sunday, your week is planned, your grocery list is ready — mapped with your fridge inventory.',
  },
  {
    id: 'ask',
    showChat: true,
    tag: 'YOUR FOOD BRAIN',
    title: 'Complex Meal Planning Made Effortless',
    banner: 'Party menus, fridge check, outdoor trips, meal prep — voice or text, done in seconds.',
  },
  {
    id: 'cook',
    showCook: true,
    tag: 'MAHARAJ COOK',
    title: 'Your Cook Arrives Knowing Exactly What to Cook Today',
    microline: 'No calls. No guesswork.',
    banner: "Maharaj Cook delivers your family's meals to the kitchen — automatically, in Indian multi-lingual audio, every morning.",
  },
];

// ── Pulsing ring around logo (screen 1) ──────────────────────────────────────
function PulsingRing() {
  const scale = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.06, duration: 1000, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.0,  duration: 1000, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <Animated.View
      style={[s.pulseRing, { transform: [{ scale }] }]}
      pointerEvents="none"
    />
  );
}

// ── Family member cards (screen 2) ────────────────────────────────────────────
const MEMBERS = [
  {
    initials: 'M1',
    avatarBg: colors.navy,
    avatarText: colors.white,
    tags: [
      { label: 'Maharashtrian', type: 'cuisine' },
      { label: 'Malvani',       type: 'cuisine' },
      { label: 'Diabetes-friendly', type: 'health' },
    ],
  },
  {
    initials: 'M2',
    avatarBg: colors.teal,
    avatarText: colors.white,
    tags: [
      { label: 'Vegetarian',  type: 'diet' },
      { label: 'Low sodium',  type: 'health' },
    ],
  },
  {
    initials: 'M3',
    avatarBg: colors.gold,
    avatarText: colors.navy,
    tags: [
      { label: 'Jain',               type: 'diet' },
      { label: 'No root vegetables', type: 'diet' },
    ],
  },
];

function tagColors(type: string): { bg: string; text: string } {
  if (type === 'cuisine') return { bg: '#fef6e0', text: '#8a6200' };
  if (type === 'health')  return { bg: '#e8eef8', text: colors.navy };
  return { bg: colors.mintLight, text: colors.teal };
}

function FamilyCards() {
  return (
    <View style={s.familyCards}>
      {MEMBERS.map(m => (
        <View key={m.initials} style={s.memberCard}>
          <View style={[s.memberAvatar, { backgroundColor: m.avatarBg }]}>
            <Text style={[s.memberAvatarText, { color: m.avatarText }]}>{m.initials}</Text>
          </View>
          <View style={s.memberTagRow}>
            {m.tags.map(t => {
              const tc = tagColors(t.type);
              return (
                <View key={t.label} style={[s.tagPill, { backgroundColor: tc.bg }]}>
                  <Text style={[s.tagPillText, { color: tc.text }]}>{t.label}</Text>
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Three day-cards (screen 3) ────────────────────────────────────────────────
const PLAN_DAYS = [
  {
    day: 'TUESDAY',
    meals: [
      { type: 'BRKFST', dish: 'Misal Pav',            veg: true  },
      { type: 'LUNCH',  dish: 'Dalimbi Usal',          veg: true  },
      { type: 'DINNER', dish: 'Kolambi Bhaat Malvani', veg: false },
    ],
  },
  {
    day: 'WEDNESDAY',
    meals: [
      { type: 'BRKFST', dish: 'Kande Pohe Malvani',       veg: true },
      { type: 'LUNCH',  dish: 'Matki Usal + Takatli Dal', veg: true },
      { type: 'DINNER', dish: 'Coconut Rice Malvani',      veg: true },
    ],
  },
  {
    day: 'THURSDAY',
    meals: [
      { type: 'BRKFST', dish: 'Egg Bhurji Maharashtra',        veg: false },
      { type: 'LUNCH',  dish: 'Kolhapuri Dal + Daalichi Amti', veg: true  },
      { type: 'DINNER', dish: 'Vangi Bhaat',                    veg: true  },
    ],
  },
];

function ThreeDayCards() {
  return (
    <View style={s.dayCardsWrap}>
      {PLAN_DAYS.map(d => (
        <View key={d.day} style={s.dayCard}>
          <Text style={s.dayLabel}>{d.day}</Text>
          {d.meals.map(m => (
            <View key={m.type} style={s.dayMealRow}>
              <Text style={s.dayMealType}>{m.type}</Text>
              <Text style={s.dayMealDish} numberOfLines={1}>{m.dish}</Text>
              <View style={[s.vegBadge, m.veg ? s.vegBadgeV : s.vegBadgeNv]}>
                <Text style={[s.vegBadgeText, m.veg ? s.vegBadgeTextV : s.vegBadgeTextNv]}>
                  {m.veg ? 'V' : 'NV'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

// ── Chat preview (screen 4) ───────────────────────────────────────────────────
function ChatPreview() {
  return (
    <View style={s.chatWrap}>
      <View style={s.chatBubbleUser}>
        <Text style={s.chatTextUser}>Can we have a light dinner tonight?</Text>
      </View>
      <View style={s.chatRowAi}>
        <Image source={require('../assets/logo.png')} style={s.chatAvatar} resizeMode="contain" />
        <View style={s.chatBubbleAi}>
          <Text style={s.chatTextAi}>
            I have swapped dinner to Daliya Khichdi with curd. Light and easy to digest.
          </Text>
        </View>
      </View>
    </View>
  );
}

// ── Cook card (screen 5) ──────────────────────────────────────────────────────
const COOK_ROWS = [
  { label: 'BRKFST', dish: 'Kande Pohe Malvani',  veg: true  },
  { label: 'LUNCH',  dish: 'Dalimbi Usal + Roti', veg: true  },
  { label: 'DINNER', dish: 'Kolambi Bhaat Malvani', veg: false },
];

function CookCard() {
  return (
    <View style={s.cookCard}>
      <Text style={s.cookCardTitle}>Today for your cook</Text>
      {COOK_ROWS.map(r => (
        <View key={r.label} style={s.cookRow}>
          <Text style={s.cookMeal}>{r.label}</Text>
          <Text style={s.cookDish} numberOfLines={1}>{r.dish}</Text>
          <View style={[s.vegBadge, r.veg ? s.vegBadgeV : s.vegBadgeNv]}>
            <Text style={[s.vegBadgeText, r.veg ? s.vegBadgeTextV : s.vegBadgeTextNv]}>
              {r.veg ? 'V' : 'NV'}
            </Text>
          </View>
        </View>
      ))}
      <View style={s.cookTtsRow}>
        <View style={s.cookTtsIcon} />
        <Text style={s.cookTtsLabel}>Read aloud in Hindi</Text>
      </View>
    </View>
  );
}

// ── Pagination dots ───────────────────────────────────────────────────────────
function Dots({ active }: { active: number }) {
  return (
    <View style={s.dotsRow}>
      {SLIDES.map((sl, i) => (
        <View
          key={sl.id}
          style={[s.dot, i === active ? s.dotActive : s.dotInactive]}
        />
      ))}
    </View>
  );
}

// ── Main carousel ─────────────────────────────────────────────────────────────
export default function IntroCarousel() {
  const [activeIdx, setActiveIdx] = useState(0);
  const listRef = useRef<FlatList>(null);

  async function finish() {
    await AsyncStorage.setItem('hasSeenOnboarding', '1');
    router.replace('/login');
  }

  function goNext() {
    if (activeIdx < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: activeIdx + 1, animated: true });
    }
  }

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;
  const onViewRef = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setActiveIdx(viewableItems[0].index ?? 0);
  });

  function getItemLayout(_: any, index: number) {
    return { length: SW, offset: SW * index, index };
  }

  function renderSlide({ item, index }: { item: Slide; index: number }) {
    const isLast = index === SLIDES.length - 1;

    return (
      <ImageBackground
        source={require('../assets/background.png')}
        style={s.slideBg}
        resizeMode="cover"
      >
        <View style={s.slideContent}>

          {/* ── Screen 1: hero — large logo occupying top 50% ── */}
          {item.showHero && (
            <View style={s.heroTop}>
              <View style={s.logoWrap}>
                <PulsingRing />
                <Image
                  source={require('../assets/logo.png')}
                  style={s.heroLogo}
                  resizeMode="contain"
                />
              </View>
            </View>
          )}

          {/* ── Screens 2–5: small logo at top ── */}
          {!item.showHero && (
            <View style={s.slideLogoRow}>
              <Image
                source={require('../assets/logo.png')}
                style={s.slideLogoSmall}
                resizeMode="contain"
              />
            </View>
          )}

          {/* Tag */}
          <Text style={s.tag}>{item.tag}</Text>

          {/* Title */}
          <Text style={[s.title, item.showHero && s.titleHero]}>{item.title}</Text>

          {/* Subtitle — screen 1 only */}
          {item.subtitle ? <Text style={s.subtitle}>{item.subtitle}</Text> : null}

          {/* Micro-line — screen 5 only */}
          {item.microline ? <Text style={s.microline}>{item.microline}</Text> : null}

          {/* Illustration */}
          <View style={s.illustration}>
            {item.showFamily ? <FamilyCards /> : null}
            {item.showPlan   ? <ThreeDayCards /> : null}
            {item.showChat   ? <ChatPreview /> : null}
            {item.showCook   ? <CookCard /> : null}
          </View>

          {/* Banner — screens 2–5 */}
          {item.banner ? (
            <View style={s.banner}>
              <Text style={s.bannerText}>{item.banner}</Text>
            </View>
          ) : null}

          {/* Bottom nav */}
          <View style={s.bottomNav}>
            <View style={s.dotsCenter}>
              <Dots active={activeIdx} />
            </View>
            {!isLast ? (
              <View style={s.nextWrap}>
                <Button
                  title="Next"
                  onPress={goNext}
                  variant="secondary"
                  style={{ width: 110, height: 44 }}
                />
              </View>
            ) : (
              <Button title="Start My First Plan" onPress={finish} variant="secondary" />
            )}
          </View>

        </View>
      </ImageBackground>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Outer bg covers safe-area edges on platforms that need it */}
      <ImageBackground
        source={require('../assets/background.png')}
        style={s.outerBg}
        resizeMode="cover"
      />
      <SafeAreaView style={{ flex: 1 }}>
        <FlatList
          ref={listRef}
          data={SLIDES}
          keyExtractor={item => item.id}
          renderItem={renderSlide}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          getItemLayout={getItemLayout}
          onViewableItemsChanged={onViewRef.current}
          viewabilityConfig={viewabilityConfig}
          scrollEventThrottle={16}
        />
      </SafeAreaView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  outerBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },

  // Each slide is a full-width ImageBackground
  slideBg: { width: SW, flex: 1 },
  slideContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },

  // Screen 1 hero — large logo, top 50%
  heroTop: {
    flex: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLogo: { width: 160, height: 160, zIndex: 1 },
  pulseRing: {
    position: 'absolute',
    width: 196,
    height: 196,
    borderRadius: 98,
    borderWidth: 2,
    borderColor: colors.gold,
    zIndex: 0,
  },

  // Screens 2–5 small logo at top
  slideLogoRow: { alignItems: 'center', marginBottom: 10 },
  slideLogoSmall: { width: 40, height: 40 },

  // Tag label
  tag: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.teal,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    textAlign: 'center',
    marginBottom: 6,
  },

  // Title
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.navy,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 30,
  },
  titleHero: { fontSize: 32, lineHeight: 40 },

  // Subtitle (screen 1)
  subtitle: {
    fontSize: 18,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 8,
  },

  // Micro-line (screen 5)
  microline: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.teal,
    textAlign: 'center',
    marginBottom: 10,
  },

  // Illustration container
  illustration: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },

  // ── Family cards (screen 2) ──────────────────────────────────────────────
  familyCards: { width: '100%', gap: 6 },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.gold,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 10,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  memberAvatarText: { fontSize: 12, fontWeight: '700' },
  memberTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, flex: 1 },
  tagPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagPillText: { fontSize: 10, fontWeight: '600' },

  // ── Three day-cards (screen 3) ───────────────────────────────────────────
  dayCardsWrap: { width: '100%', gap: 4 },
  dayCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.navy,
    padding: 8,
  },
  dayLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.navy,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  dayMealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
  },
  dayMealType: {
    fontSize: 9,
    color: colors.textMuted,
    width: 46,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  dayMealDish: {
    fontSize: 11,
    fontWeight: '500',
    color: '#1A1A1A',
    flex: 1,
  },

  // Shared veg/non-veg badge (screens 3, 5)
  vegBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    marginLeft: 4,
  },
  vegBadgeV:   { backgroundColor: colors.mintLight },
  vegBadgeNv:  { backgroundColor: '#fde8d8' },
  vegBadgeText: { fontSize: 8, fontWeight: '800' },
  vegBadgeTextV:  { color: colors.teal },
  vegBadgeTextNv: { color: '#b84c1a' },

  // ── Chat preview (screen 4) ──────────────────────────────────────────────
  chatWrap: { width: '100%', gap: 8 },
  chatBubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: colors.navy,
    borderRadius: 14,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
    maxWidth: '80%',
  },
  chatTextUser: { color: colors.white, fontSize: 13, lineHeight: 20 },
  chatRowAi: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  chatAvatar: { width: 28, height: 28, borderRadius: 14, flexShrink: 0, marginTop: 2 },
  chatBubbleAi: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 14,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(46,84,128,0.15)',
  },
  chatTextAi: { color: colors.navy, fontSize: 13, lineHeight: 20 },

  // ── Cook card (screen 5) ─────────────────────────────────────────────────
  cookCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.navy,
    padding: 10,
  },
  cookCardTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  cookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(46,84,128,0.08)',
  },
  cookMeal: {
    fontSize: 9,
    color: colors.textMuted,
    width: 46,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  cookDish: { fontSize: 11, fontWeight: '500', color: colors.navy, flex: 1 },
  cookTtsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  cookTtsIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.gold,
    opacity: 0.85,
  },
  cookTtsLabel: { fontSize: 11, color: colors.teal, fontWeight: '600' },

  // ── Banner (screens 2–5) ─────────────────────────────────────────────────
  banner: {
    backgroundColor: colors.navy,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    marginBottom: 4,
  },
  bannerText: {
    fontSize: 12,
    color: colors.white,
    textAlign: 'center',
    lineHeight: 18,
  },

  // ── Bottom navigation ────────────────────────────────────────────────────
  bottomNav: { marginTop: 10, paddingBottom: 4 },
  dotsCenter: { alignItems: 'center', marginBottom: 10 },
  dotsRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { borderRadius: 3 },
  dotActive:   { width: 18, height: 6, backgroundColor: colors.gold },
  dotInactive: { width: 6,  height: 6, backgroundColor: colors.navy, opacity: 0.3 },

  nextWrap: { alignItems: 'flex-end' },
});
