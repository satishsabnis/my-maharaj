import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  ImageBackground,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../constants/theme';

const SW = Dimensions.get('window').width;

// ── Slide definitions ─────────────────────────────────────────────────────────
type Slide = {
  id: string;
  title: string;
  subtitle: string;
  body: string;
  badge?: { label: string; isVeg: boolean };
  badge2?: { label: string; isVeg: boolean };
  showLogo?: boolean;
  showPlan?: boolean;
  showChat?: boolean;
  showCook?: boolean;
};

const SLIDES: Slide[] = [
  {
    id: 'hero',
    showLogo: true,
    title: 'My Maharaj',
    subtitle: 'Your personal home chef assistant',
    body: 'Plan meals, get recipes, and share with your cook — all in one place.',
  },
  {
    id: 'family',
    title: 'Built for your family',
    subtitle: 'Cuisine, diet, and family size — all set up once.',
    body: "Maharaj learns your family's preferences and plans meals you'll actually love every week.",
    badge: { label: 'Veg', isVeg: true },
    badge2: { label: 'Non-veg', isVeg: false },
  },
  {
    id: 'plan',
    showPlan: true,
    title: 'A full week, planned for you',
    subtitle: 'Breakfast, lunch, dinner, snacks — every day.',
    body: 'Maharaj balances nutrition, variety, and your cuisine preferences. Swap any dish with one tap.',
  },
  {
    id: 'ask',
    showChat: true,
    title: 'Ask Maharaj anything',
    subtitle: 'Recipes, substitutes, cooking tips — in your language.',
    body: 'Chat in Hindi, Marathi, or English. Get step-by-step guidance from Maharaj.',
  },
  {
    id: 'cook',
    showCook: true,
    title: 'Share with your cook',
    subtitle: 'A dedicated portal for your family cook.',
    body: 'Maharaj sends the day\'s meal plan to your cook so nothing gets lost in translation.',
  },
];

// ── Pulsing ring around logo ───────────────────────────────────────────────────
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
      style={[
        s.pulseRing,
        { transform: [{ scale }] },
      ]}
      pointerEvents="none"
    />
  );
}

// ── Mock plan card (slide 3) ───────────────────────────────────────────────────
function PlanCard() {
  const rows = [
    { meal: 'Breakfast', dish: 'Poha with peanuts', veg: true },
    { meal: 'Lunch',     dish: 'Dal Makhani + Roti', veg: true },
    { meal: 'Dinner',    dish: 'Chicken Curry + Rice', veg: false },
  ];
  return (
    <View style={s.planCard}>
      <Text style={s.planCardDay}>Monday</Text>
      {rows.map(r => (
        <View key={r.meal} style={s.planRow}>
          <Text style={s.planMeal}>{r.meal}</Text>
          <Text style={s.planDish} numberOfLines={1}>{r.dish}</Text>
          <View style={[s.vegBadge, r.veg ? s.vegBadgeVeg : s.vegBadgeNv]}>
            <Text style={[s.vegBadgeText, r.veg ? s.vegBadgeTextVeg : s.vegBadgeTextNv]}>
              {r.veg ? 'V' : 'NV'}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Mock chat bubble (slide 4) ────────────────────────────────────────────────
function ChatPreview() {
  return (
    <View style={s.chatWrap}>
      <View style={s.chatBubbleUser}>
        <Text style={s.chatTextUser}>How do I make soft rotis?</Text>
      </View>
      <View style={s.chatRowAi}>
        <Image source={require('../assets/logo.png')} style={s.chatAvatar} resizeMode="contain" />
        <View style={s.chatBubbleAi}>
          <Text style={s.chatTextAi}>
            Use warm water, rest the dough 20 min, roll thin and cook on high heat.
          </Text>
        </View>
      </View>
    </View>
  );
}

// ── Mock cook card (slide 5) ──────────────────────────────────────────────────
function CookCard() {
  return (
    <View style={s.cookCard}>
      <Text style={s.cookCardTitle}>Today's plan for your cook</Text>
      {[
        { label: 'Breakfast', dish: 'Upma' },
        { label: 'Lunch',     dish: 'Palak Paneer + Roti' },
        { label: 'Dinner',    dish: 'Mutton Curry + Rice' },
      ].map(r => (
        <View key={r.label} style={s.cookRow}>
          <Text style={s.cookMeal}>{r.label}</Text>
          <Text style={s.cookDish}>{r.dish}</Text>
        </View>
      ))}
      {/* decorative TTS indicator */}
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
          style={[
            s.dot,
            i === active ? s.dotActive : s.dotInactive,
          ]}
        />
      ))}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
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

  function onViewableItemsChanged({ viewableItems }: any) {
    if (viewableItems.length > 0) {
      setActiveIdx(viewableItems[0].index ?? 0);
    }
  }

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;
  const onViewRef = useRef(onViewableItemsChanged);

  function getItemLayout(_: any, index: number) {
    return { length: SW, offset: SW * index, index };
  }

  function renderSlide({ item, index }: { item: Slide; index: number }) {
    const isLast = index === SLIDES.length - 1;
    return (
      <View style={s.slide}>
        {/* Illustration area */}
        <View style={s.illustrationArea}>
          {item.showLogo && (
            <View style={s.logoWrap}>
              <PulsingRing />
              <Image source={require('../assets/logo.png')} style={s.logo} resizeMode="contain" />
            </View>
          )}
          {item.showPlan && <PlanCard />}
          {item.showChat && <ChatPreview />}
          {item.showCook && <CookCard />}
          {!item.showLogo && !item.showPlan && !item.showChat && !item.showCook && (
            /* Family/Diet slide illustration */
            <View style={s.familyIllustration}>
              <Image source={require('../assets/logo.png')} style={s.familyLogo} resizeMode="contain" />
              <View style={s.badgeRow}>
                {item.badge && (
                  <View style={[s.dietBadge, s.dietBadgeVeg]}>
                    <Text style={[s.dietBadgeText, s.dietBadgeTextVeg]}>{item.badge.label}</Text>
                  </View>
                )}
                {item.badge2 && (
                  <View style={[s.dietBadge, s.dietBadgeNv]}>
                    <Text style={[s.dietBadgeText, s.dietBadgeTextNv]}>{item.badge2.label}</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Text area */}
        <View style={s.textArea}>
          <Text style={s.title}>{item.title}</Text>
          <Text style={s.subtitle}>{item.subtitle}</Text>
          <Text style={s.body}>{item.body}</Text>
        </View>

        {/* Bottom nav */}
        <View style={s.bottomNav}>
          {/* Dots always centered */}
          <View style={s.dotsAbsolute}>
            <Dots active={activeIdx} />
          </View>

          {/* Slide 1-4: Next button on right */}
          {!isLast && (
            <View style={s.nextBtnWrap}>
              <TouchableOpacity style={s.nextBtn} onPress={goNext} activeOpacity={0.85}>
                <Text style={s.nextBtnText}>Next</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Slide 5: full-width gold CTA */}
          {isLast && (
            <View style={s.ctaWrap}>
              <TouchableOpacity style={s.ctaBtn} onPress={finish} activeOpacity={0.85}>
                <Text style={s.ctaBtnText}>Get Started</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ImageBackground
        source={require('../assets/background.png')}
        style={s.bg}
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

const s = StyleSheet.create({
  bg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },

  slide: {
    width: SW,
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: Platform.OS === 'android' ? 40 : 24,
    paddingBottom: 16,
  },

  // Illustration area (top ~40% of screen)
  illustrationArea: {
    flex: 0.45,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Hero logo + pulsing ring
  logoWrap: { alignItems: 'center', justifyContent: 'center', width: 140, height: 140 },
  logo:     { width: 96, height: 96, zIndex: 1 },
  pulseRing: {
    position: 'absolute',
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 2,
    borderColor: colors.gold,
    zIndex: 0,
  },

  // Family slide illustration
  familyIllustration: { alignItems: 'center' },
  familyLogo: { width: 72, height: 72, marginBottom: 16, opacity: 0.9 },
  badgeRow: { flexDirection: 'row', gap: 12 },
  dietBadge: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20 },
  dietBadgeVeg: { backgroundColor: colors.mintLight },
  dietBadgeNv:  { backgroundColor: colors.amber },
  dietBadgeText: { fontSize: 14, fontWeight: '700' },
  dietBadgeTextVeg: { color: colors.teal },
  dietBadgeTextNv:  { color: colors.navy },

  // Plan card (slide 3)
  planCard: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.navy,
    width: '100%',
    maxWidth: 320,
  },
  planCardDay: { fontSize: 12, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  planRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderTopWidth: 1, borderTopColor: 'rgba(46,84,128,0.08)' },
  planMeal: { fontSize: 11, color: colors.textMuted, width: 68, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  planDish: { fontSize: 13, color: colors.navy, fontWeight: '500', flex: 1 },
  vegBadge: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  vegBadgeVeg: { backgroundColor: colors.mintLight },
  vegBadgeNv:  { backgroundColor: 'rgba(201,162,39,0.2)' },
  vegBadgeText: { fontSize: 8, fontWeight: '800' },
  vegBadgeTextVeg: { color: colors.teal },
  vegBadgeTextNv:  { color: colors.amber },

  // Chat preview (slide 4)
  chatWrap: { width: '100%', maxWidth: 320, gap: 8 },
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
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 14,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(46,84,128,0.15)',
  },
  chatTextAi: { color: colors.navy, fontSize: 13, lineHeight: 20 },

  // Cook card (slide 5)
  cookCard: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.navy,
    width: '100%',
    maxWidth: 320,
  },
  cookCardTitle: { fontSize: 12, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 },
  cookRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderTopWidth: 1, borderTopColor: 'rgba(46,84,128,0.08)' },
  cookMeal: { fontSize: 11, color: colors.textMuted, width: 72, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  cookDish: { fontSize: 13, color: colors.navy, fontWeight: '500', flex: 1 },
  cookTtsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
  cookTtsIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.gold, opacity: 0.85 },
  cookTtsLabel: { fontSize: 12, color: colors.teal, fontWeight: '600' },

  // Text area
  textArea: { flex: 0.35, justifyContent: 'center', alignItems: 'center', paddingTop: 16 },
  title:    { fontSize: 24, fontWeight: '800', color: colors.navy, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, fontWeight: '600', color: colors.teal, textAlign: 'center', marginBottom: 10, lineHeight: 22 },
  body:     { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },

  // Bottom navigation
  bottomNav: { flex: 0.2, justifyContent: 'flex-end', paddingBottom: 8 },
  dotsAbsolute: { alignItems: 'center', marginBottom: 16 },
  dotsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { height: 8, borderRadius: 4 },
  dotActive: { width: 20, backgroundColor: colors.gold },
  dotInactive: { width: 8, backgroundColor: colors.navy, opacity: 0.3 },

  nextBtnWrap: { alignItems: 'flex-end' },
  nextBtn: {
    backgroundColor: colors.gold,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  nextBtnText: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },

  ctaWrap: { alignItems: 'stretch' },
  ctaBtn: {
    backgroundColor: colors.gold,
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaBtnText: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
});
