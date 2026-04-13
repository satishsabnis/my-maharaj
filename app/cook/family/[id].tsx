/**
 * Cook Family Detail Screen — /cook/family/[id]
 * Full meal view for one family. Tap dish → recipe. Gold play button → TTS.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Logo from '../../../components/Logo';

const NAVY  = '#1B3A5C';
const GOLD  = '#C9A227';
const WHITE = '#FFFFFF';
const MUTED = 'rgba(27,58,92,0.5)';

// Meal section labels per language
const MEAL_LABELS: Record<string, { breakfast: string; lunch: string; dinner: string }> = {
  'hi-IN': { breakfast: 'सुबह का नाश्ता', lunch: 'दोपहर का खाना', dinner: 'रात का खाना' },
  'mr-IN': { breakfast: 'सकाळचा नाश्ता', lunch: 'दुपारचे जेवण',  dinner: 'रात्रीचे जेवण' },
  'gu-IN': { breakfast: 'સવારનો નાસ્તો',  lunch: 'બપોરનું ભોજન',   dinner: 'રાત્રિનું ભોજન' },
  'pa-IN': { breakfast: 'ਸਵੇਰ ਦਾ ਨਾਸ਼ਤਾ',  lunch: 'ਦੁਪਹਿਰ ਦਾ ਖਾਣਾ',  dinner: 'ਰਾਤ ਦਾ ਖਾਣਾ' },
  'ta-IN': { breakfast: 'காலை உணவு',      lunch: 'மதிய உணவு',      dinner: 'இரவு உணவு' },
  'te-IN': { breakfast: 'అల్పాహారం',       lunch: 'మధ్యాహ్న భోజనం', dinner: 'రాత్రి భోజనం' },
};

function getLabel(lang: string) {
  return MEAL_LABELS[lang] || MEAL_LABELS['hi-IN'];
}

function getLocal(key: string): string {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return '';
  return window.localStorage.getItem(key) || '';
}

type MealSection = {
  label: string;
  mainDish: string;
  supporting: string[];
};

type FamilyDetail = {
  id: string;
  familyName: string;
  location: string;
  language: string;
  memberCount: number;
  meals: {
    breakfast: MealSection;
    lunch: MealSection;
    dinner: MealSection;
  };
};

export default function FamilyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [family,   setFamily]   = useState<FamilyDetail | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [playing,  setPlaying]  = useState(false);
  const [ttsError, setTtsError] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const cookPhone = getLocal('cook_phone');
  const cookLang  = getLocal('cook_lang') || 'hi-IN';
  const cookName  = getLocal('cook_name') || cookPhone;
  const initials  = cookName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || 'MK';
  const labels    = getLabel(cookLang);

  useEffect(() => {
    if (!cookPhone) { router.replace('/cook' as never); return; }
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`/api/cook-families?phone=${encodeURIComponent(cookPhone)}&familyId=${encodeURIComponent(id)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load family');
        setFamily(data.family);
      } catch (e: any) {
        setError(e.message || 'Could not load family details.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function handlePlay() {
    if (!family) return;
    setPlaying(true);
    setTtsError('');
    try {
      const meals = family.meals;
      const text = [
        `${labels.breakfast}: ${meals.breakfast.mainDish}`,
        `${labels.lunch}: ${meals.lunch.mainDish}. ${meals.lunch.supporting.join(', ')}`,
        `${labels.dinner}: ${meals.dinner.mainDish}. ${meals.dinner.supporting.join(', ')}`,
      ].join('. ');

      const res = await fetch('/api/sarvam-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: cookLang }),
      });
      const data = await res.json();
      if (!res.ok || !data.audio) throw new Error(data.error || 'No audio returned');

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const audioSrc = `data:audio/wav;base64,${data.audio}`;
        if (audioRef.current) {
          audioRef.current.onended = () => setPlaying(false);
          audioRef.current.onerror = () => { setTtsError('Playback failed'); setPlaying(false); };
          audioRef.current.src = audioSrc;
          audioRef.current.play();
        } else {
          const audio = new Audio(audioSrc);
          audioRef.current = audio;
          audio.onended = () => setPlaying(false);
          audio.onerror = () => { setTtsError('Playback failed'); setPlaying(false); };
          audio.play();
        }
      } else {
        setPlaying(false);
      }
    } catch (e: any) {
      setTtsError(e.message || 'TTS failed');
      setPlaying(false);
    }
  }

  function MealBlock({ section, sectionLabel }: { section: MealSection; sectionLabel: string }) {
    return (
      <View style={s.mealBlock}>
        <Text style={s.mealSectionLabel}>{sectionLabel}</Text>
        <TouchableOpacity
          onPress={() => router.push(`/cook/recipe/${encodeURIComponent(section.mainDish)}` as never)}
          activeOpacity={0.75}
        >
          <Text style={s.mainDish}>{section.mainDish}</Text>
        </TouchableOpacity>
        {section.supporting.map((item, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => router.push(`/cook/recipe/${encodeURIComponent(item)}` as never)}
            activeOpacity={0.75}
          >
            <Text style={s.supportItem}>· {item}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ImageBackground
        source={require('../../../assets/background.png')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.avatar}>
            <Text style={s.avatarTxt}>{initials}</Text>
          </TouchableOpacity>
          <Logo size="small" />
          <View style={{ width: 40 }} />
        </View>

        {/* Back */}
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backTxt}>← Back</Text>
        </TouchableOpacity>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={NAVY} size="large" />
          </View>
        ) : error || !family ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
            <Text style={{ color: '#DC2626', textAlign: 'center' }}>{error || 'Family not found.'}</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
            {/* Family name */}
            <Text style={s.familyName}>{family.familyName}</Text>
            <Text style={s.location}>{family.location} · {family.memberCount} members · {family.language}</Text>

            {/* Meal sections */}
            <View style={s.mealsCard}>
              <MealBlock section={family.meals.breakfast} sectionLabel={labels.breakfast} />
              <View style={s.divider} />
              <MealBlock section={family.meals.lunch}     sectionLabel={labels.lunch} />
              <View style={s.divider} />
              <MealBlock section={family.meals.dinner}    sectionLabel={labels.dinner} />
            </View>

            {/* TTS play button */}
            <TouchableOpacity style={s.playBtn} onPress={handlePlay} disabled={playing} activeOpacity={0.85}>
              {playing
                ? <ActivityIndicator color={NAVY} />
                : <Text style={s.playTxt}>▶ आज का मेनू सुनें</Text>}
            </TouchableOpacity>
            {ttsError ? <Text style={{ textAlign: 'center', color: '#DC2626', fontSize: 13, marginTop: 10 }}>{ttsError}</Text> : null}

            <Text style={s.footer}>Powered by SarvamAI · My Maharaj</Text>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  avatar:      { width: 40, height: 40, borderRadius: 20, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' },
  avatarTxt:   { color: WHITE, fontWeight: '700', fontSize: 14 },
  backBtn:     { marginLeft: 16, marginBottom: 8 },
  backTxt:     { fontSize: 14, color: NAVY, borderWidth: 1, borderColor: NAVY, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
  scroll:      { paddingHorizontal: 16, paddingBottom: 40 },
  familyName:  { fontSize: 22, fontWeight: '800', color: NAVY, marginTop: 8 },
  location:    { fontSize: 13, color: MUTED, marginTop: 4, marginBottom: 20 },
  mealsCard: {
    backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  mealBlock:        { marginBottom: 4 },
  mealSectionLabel: { fontSize: 12, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  mainDish:         { fontSize: 18, fontWeight: '700', color: NAVY, marginBottom: 6, textDecorationLine: 'underline', textDecorationStyle: 'dotted' },
  supportItem:      { fontSize: 12, color: MUTED, marginBottom: 3 },
  divider:          { height: 1, backgroundColor: 'rgba(27,58,92,0.1)', marginVertical: 14 },
  playBtn: {
    backgroundColor: '#C9A227', borderRadius: 14, paddingVertical: 18,
    alignItems: 'center', marginTop: 24,
    shadowColor: '#C9A227', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  playTxt:  { fontSize: 16, fontWeight: '800', color: NAVY, letterSpacing: 0.3 },
  footer:   { textAlign: 'center', fontSize: 11, color: MUTED, marginTop: 24 },
});
