import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ImageBackground, Image, Animated, Dimensions, SafeAreaView, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const C = {
  navy: '#2E5480', gold: '#C9A227', teal: '#1A6B5C',
  mint: '#D4EDE5', white: '#FFFFFF', dark: '#1A1A1A',
  grey: '#888888', lightYellow: '#fef6e0', darkYellow: '#8a6200',
  lightBlue: '#e8eef8', lightOrange: '#fde8d8', darkOrange: '#b84c1a',
};

const BG = require('../assets/background.png');
const LOGO = require('../assets/maharaj-logo.png');

function Overlay() {
  return <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(46,84,128,0.45)' }]} />;
}

function SlideShell({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT - 120 }}>
      <ImageBackground source={BG} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
      <Overlay />
      <View style={s.slideInner}>{children}</View>
    </View>
  );
}

function Tag({ text }: { text: string }) {
  return <Text style={s.tag}>{text}</Text>;
}
function Title({ text }: { text: string }) {
  return <Text style={s.title}>{text}</Text>;
}
function Banner({ text }: { text: string }) {
  return <View style={s.banner}><Text style={s.bannerText}>{text}</Text></View>;
}

// SCREEN 1
function HeroSlide({ pulse }: { pulse: Animated.Value }) {
  return (
    <ImageBackground source={require('../assets/background.png')} resizeMode="cover" style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT - 120 }}>
      <View style={s.heroWrap}>
        <Animated.View style={[s.pulseRing, { transform: [{ scale: pulse }] }]}>
          <Image source={LOGO} style={s.heroLogo} resizeMode="contain" />
        </Animated.View>
        <View style={s.heroText}>
          <Tag text="YOUR PERSONAL MEAL PLANNER" />
          <Text style={s.heroTitle}>Stop Thinking About{'\n'}What to Cook</Text>
          <Text style={s.heroSub}>Your daily meals — planned, decided, and ready.</Text>
        </View>
      </View>
    </ImageBackground>
  );
}

// SCREEN 2
function FamilySlide() {
  const members = [
    { id: 'M1', bg: C.navy, txtColor: C.white, tags: [['Maharashtrian','cu'],['Malvani','cu'],['Diabetes-friendly','he']] },
    { id: 'M2', bg: C.teal, txtColor: C.white, tags: [['Vegetarian','di'],['Low sodium','he']] },
    { id: 'M3', bg: C.gold, txtColor: C.dark, tags: [['Jain','di'],['No root vegetables','he']] },
  ];
  const tagStyle = (t: string) => t === 'cu'
    ? { bg: C.lightYellow, txt: C.darkYellow }
    : t === 'di' ? { bg: C.mint, txt: C.teal }
    : { bg: C.lightBlue, txt: C.navy };
  return (
    <SlideShell>
      <Image source={LOGO} style={s.slideLogo} resizeMode="contain" />
      <Tag text="BUILT FOR YOUR FAMILY" />
      <Title text={'Every Member · Every Diet\nEvery Health Condition'} />
      <View style={s.cards}>
        {members.map(m => (
          <View key={m.id} style={[s.memberCard, { borderColor: C.gold }]}>
            <View style={[s.avatar, { backgroundColor: m.bg }]}>
              <Text style={[s.avatarTxt, { color: m.txtColor }]}>{m.id}</Text>
            </View>
            <View style={s.tagRow}>
              {m.tags.map(([label, type]) => {
                const ts = tagStyle(type);
                return (
                  <View key={label} style={[s.pill, { backgroundColor: ts.bg }]}>
                    <Text style={[s.pillTxt, { color: ts.txt }]}>{label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        ))}
      </View>
      <Banner text="Set once — applied silently to every plan, every day." />
    </SlideShell>
  );
}

// SCREEN 3
function WeeklySlide() {
  const days = [
    { label: 'TUESDAY', meals: [['Breakfast','Misal Pav',true],['Lunch','Dalimbi Usal',true],['Dinner','Kolambi Bhaat Malvani',false]] },
    { label: 'WEDNESDAY', meals: [['Breakfast','Kande Pohe Malvani',true],['Lunch','Matki Usal + Takatli Dal',true],['Dinner','Coconut Rice Malvani',true]] },
    { label: 'THURSDAY', meals: [['Breakfast','Egg Bhurji Maharashtra',false],['Lunch','Kolhapuri Dal + Daalichi Amti',true],['Dinner','Vangi Bhaat',true]] },
  ] as const;
  return (
    <SlideShell>
      <Image source={LOGO} style={s.slideLogo} resizeMode="contain" />
      <Tag text="ONE TAP. ONE WEEK." />
      <Title text={'One Tap Weekly —\nMeal Plan to Shopping List'} />
      <View style={s.cards}>
        {days.map(d => (
          <View key={d.label} style={[s.dayCard, { borderColor: C.navy }]}>
            <Text style={s.dayLabel}>{d.label}</Text>
            {d.meals.map(([type, dish, veg]) => (
              <View key={type} style={s.mealRow}>
                <Text style={s.mealType}>{type}</Text>
                <Text style={s.mealDish} numberOfLines={1}>{dish}</Text>
                <View style={[s.badge, veg ? s.vegBadge : s.nvBadge]}>
                  <Text style={[s.badgeTxt, veg ? s.vegTxt : s.nvTxt]}>{veg ? 'Veg' : 'NV'}</Text>
                </View>
              </View>
            ))}
          </View>
        ))}
      </View>
      <Banner text="Every Sunday, your week is planned, your grocery list is ready — mapped with your fridge inventory." />
    </SlideShell>
  );
}

// SCREEN 4
function AskSlide() {
  return (
    <SlideShell>
      <Image source={LOGO} style={s.slideLogo} resizeMode="contain" />
      <Tag text="YOUR FOOD BRAIN" />
      <Title text={'Complex Meal Planning\nMade Effortless'} />
      <View style={[s.chatCard, { borderColor: C.navy }]}>
        {['Guests coming tonight','What can I cook in 20 mins?','3-day meal prep'].map(q => (
          <View key={q} style={s.userBubble}>
            <Text style={s.userBubbleTxt}>{q}</Text>
          </View>
        ))}
        <View style={s.maharajBubble}>
          <Text style={s.maharajBubbleTxt}>Here are 3 ideas for tonight...</Text>
        </View>
      </View>
      <Banner text="Party menus, fridge check, outdoor trips, meal prep — voice or text, done in seconds." />
    </SlideShell>
  );
}

// SCREEN 5
function CookSlide() {
  return (
    <SlideShell>
      <Image source={LOGO} style={s.slideLogo} resizeMode="contain" />
      <Tag text="MAHARAJ COOK" />
      <Title text={'Your Cook Arrives Knowing\nExactly What to Cook Today'} />
      <View style={[s.cookCard, { borderColor: C.teal }]}>
        <View style={s.cookHeader}>
          <View style={[s.avatar, { backgroundColor: C.navy }]}>
            <Text style={[s.avatarTxt, { color: C.white }]}>S</Text>
          </View>
          <View>
            <Text style={s.cookGreeting}>नमस्ते, Cook</Text>
            <Text style={s.cookDate}>Tuesday, 21 April</Text>
          </View>
        </View>
        {[['सुबह का नाश्ता','Misal Pav'],['दोपहर का खाना','Dalimbi Usal'],['रात का खाना','Maharashtrian Dal Fry']].map(([hin,dish]) => (
          <View key={dish} style={s.cookMeal}>
            <Text style={s.hindiLabel}>{hin}</Text>
            <Text style={s.cookDish}>{dish}</Text>
          </View>
        ))}
        <View style={s.ttsBtn}>
          <Text style={s.ttsBtnTxt}>▶ आज का मेनू सुनें</Text>
        </View>
      </View>
      <Banner text="Maharaj Cook delivers your family's meals to the kitchen — automatically, in Indian multi-lingual audio, every morning." />
      <Text style={s.microLine}>No calls. No guesswork.</Text>
    </SlideShell>
  );
}

// MAIN
export default function IntroScreen() {
  const router = useRouter();
  const ref = useRef<FlatList>(null);
  const [idx, setIdx] = useState(0);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.06, duration: 1000, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1.0, duration: 1000, useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, []);

  const slides = ['hero','family','weekly','ask','cook'];

  const next = () => {
    const n = idx + 1;
    ref.current?.scrollToIndex({ index: n, animated: true });
    setIdx(n);
  };

  const finish = async () => {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    router.replace('/login');
  };

  const renderItem = ({ item }: { item: string }) => {
    if (item === 'hero') return <HeroSlide pulse={pulse} />;
    if (item === 'family') return <FamilySlide />;
    if (item === 'weekly') return <WeeklySlide />;
    if (item === 'ask') return <AskSlide />;
    return <CookSlide />;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }}>
      <FlatList
        ref={ref}
        data={slides}
        renderItem={renderItem}
        keyExtractor={i => i}
        horizontal pagingEnabled scrollEnabled
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, i) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * i, index: i })}
        onMomentumScrollEnd={e => setIdx(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH))}
      />
      <View style={s.dotsRow}>
        {slides.map((_, i) => (
          <View key={i} style={[s.dot, i === idx ? s.dotOn : s.dotOff]} />
        ))}
      </View>
      <View style={s.navRow}>
        {idx < 4
          ? <TouchableOpacity style={s.nextBtn} onPress={next}><Text style={s.nextTxt}>Next</Text></TouchableOpacity>
          : <TouchableOpacity style={s.ctaBtn} onPress={finish}><Text style={s.ctaTxt}>Start My First Plan</Text></TouchableOpacity>
        }
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  slideInner: { flex: 1, alignItems: 'center', paddingHorizontal: 16, paddingTop: 16 },
  heroWrap: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 32, paddingHorizontal: 24 },
  pulseRing: { width: 200, height: 200, borderRadius: 100, borderWidth: 2, borderColor: C.gold, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(201,162,39,0.08)' },
  heroLogo: { width: 160, height: 160 },
  heroText: { alignItems: 'center' },
  heroTitle: { fontSize: 32, fontWeight: '700', color: C.white, textAlign: 'center', lineHeight: 40, marginBottom: 12 },
  heroSub: { fontSize: 17, color: 'rgba(255,255,255,0.80)', textAlign: 'center', lineHeight: 26 },
  slideLogo: { width: 80, height: 80, marginBottom: 8 },
  tag: { fontSize: 11, color: C.gold, letterSpacing: 1.8, textTransform: 'uppercase', marginBottom: 4, textAlign: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: C.white, textAlign: 'center', lineHeight: 30, marginBottom: 10 },
  cards: { width: '100%', gap: 6, flex: 1 },
  memberCard: { backgroundColor: C.white, borderRadius: 14, borderWidth: 1.5, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: 11, fontWeight: '700' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, flex: 1 },
  pill: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  pillTxt: { fontSize: 9, fontWeight: '600' },
  dayCard: { backgroundColor: C.white, borderRadius: 14, borderWidth: 1.5, padding: 8, marginBottom: 6 },
  dayLabel: { fontSize: 8, fontWeight: '700', color: C.navy, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 },
  mealRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2, gap: 4 },
  mealType: { fontSize: 8, color: C.grey, width: 52 },
  mealDish: { fontSize: 9, fontWeight: '500', color: C.dark, flex: 1 },
  badge: { borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 },
  vegBadge: { backgroundColor: C.mint }, nvBadge: { backgroundColor: C.lightOrange },
  badgeTxt: { fontSize: 7, fontWeight: '600' },
  vegTxt: { color: C.teal }, nvTxt: { color: C.darkOrange },
  chatCard: { backgroundColor: C.white, borderRadius: 14, borderWidth: 1.5, padding: 12, width: '100%', gap: 8, flex: 1 },
  userBubble: { backgroundColor: C.navy, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7, alignSelf: 'flex-end', maxWidth: '80%' },
  userBubbleTxt: { color: C.white, fontSize: 12 },
  maharajBubble: { backgroundColor: C.gold, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7, alignSelf: 'flex-start', maxWidth: '80%' },
  maharajBubbleTxt: { color: C.dark, fontSize: 12 },
  cookCard: { backgroundColor: C.white, borderRadius: 14, borderWidth: 1.5, padding: 12, width: '100%', flex: 1 },
  cookHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(46,84,128,0.1)' },
  cookGreeting: { fontSize: 14, fontWeight: '700', color: C.navy },
  cookDate: { fontSize: 10, color: C.grey },
  cookMeal: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(46,84,128,0.07)' },
  hindiLabel: { fontSize: 9, color: C.grey, marginBottom: 2 },
  cookDish: { fontSize: 13, fontWeight: '700', color: C.dark, textDecorationLine: 'underline' },
  ttsBtn: { backgroundColor: C.gold, borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 10 },
  ttsBtnTxt: { fontSize: 12, fontWeight: '700', color: C.dark },
  banner: { backgroundColor: C.navy, borderRadius: 12, padding: 12, width: '100%', marginTop: 8 },
  bannerText: { color: C.white, fontSize: 11, textAlign: 'center', lineHeight: 17 },
  microLine: { color: 'rgba(255,255,255,0.6)', fontSize: 11, textAlign: 'center', marginTop: 6 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10, gap: 6 },
  dot: { height: 6, borderRadius: 3 },
  dotOn: { width: 18, backgroundColor: C.gold },
  dotOff: { width: 6, backgroundColor: 'rgba(46,84,128,0.30)' },
  navRow: { paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 8 : 16 },
  nextBtn: { backgroundColor: C.gold, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, alignSelf: 'flex-end' },
  nextTxt: { color: C.dark, fontSize: 15, fontWeight: '700' },
  ctaBtn: { backgroundColor: C.gold, borderRadius: 12, paddingVertical: 16, alignItems: 'center', width: '100%' },
  ctaTxt: { color: C.dark, fontSize: 16, fontWeight: '700' },
});
