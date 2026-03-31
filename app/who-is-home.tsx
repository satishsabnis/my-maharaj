import React, { useEffect, useState } from 'react';
import {
  Image, ImageBackground, Platform, SafeAreaView, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { router } from 'expo-router';
import { supabase, getSessionUser } from '../lib/supabase';
import { navy, gold, white, textSec, border } from '../theme/colors';

// Module-level export — read by home screen
export let presentMemberIds: string[] = [];

interface Member {
  id: string;
  name: string;
  age: number;
}

export default function WhoIsHomeScreen() {
  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const user = await getSessionUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from('family_members')
        .select('id, name, age')
        .eq('user_id', user.id);
      const list = (data as Member[]) ?? [];
      setMembers(list);
      // Default: all members selected (home)
      setSelected(list.map(m => m.id));
      setLoading(false);
    }
    void load();
  }, []);

  function toggle(id: string) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  function confirm() {
    presentMemberIds = [...selected];
    router.back();
  }

  return (
    <ImageBackground source={require('../assets/background.png')} style={{ flex: 1 }} resizeMode="cover">
      <SafeAreaView style={s.safe}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backTxt}>Back</Text>
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Image source={require('../assets/logo.png')} style={s.logo} resizeMode="contain" />
            <Image source={require('../assets/blueflute-logo.png')} style={s.bfLogo} resizeMode="contain" />
          </View>
          <Image source={require('../assets/blueflute-logo.png')} style={s.bfLogoHeader} resizeMode="contain" />
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <Text style={s.title}>Who is home today?</Text>
          <Text style={s.subtitle}>Tap to toggle — greyed out members won't be included in today's plan</Text>

          {loading ? (
            <Text style={s.loadingText}>Loading family...</Text>
          ) : members.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyText}>No family members found.</Text>
              <Text style={s.emptySub}>Add members in Family Profile first.</Text>
            </View>
          ) : (
            <View style={s.chipGrid}>
              {members.map(m => {
                const isHome = selected.includes(m.id);
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[s.chip, !isHome && s.chipOff]}
                    onPress={() => toggle(m.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.chipName, !isHome && s.chipNameOff]}>{m.name}</Text>
                    {m.age > 0 && (
                      <Text style={[s.chipAge, !isHome && s.chipAgeOff]}>{m.age} yrs</Text>
                    )}
                    <Text style={[s.chipStatus, !isHome && s.chipStatusOff]}>
                      {isHome ? 'Home' : 'Away'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* Confirm button */}
        {members.length > 0 && (
          <View style={s.bottomBar}>
            <Text style={s.countText}>
              {selected.length} of {members.length} home
            </Text>
            <TouchableOpacity style={s.confirmBtn} onPress={confirm} activeOpacity={0.88}>
              <Text style={s.confirmTxt}>Confirm</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </ImageBackground>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 25 : Platform.OS === 'web' ? 14 : 8,
    paddingBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(27,58,92,0.1)',
  },
  backBtn: { paddingRight: 8, minWidth: 50 },
  backTxt: { fontSize: 15, color: navy, fontWeight: '600' },
  headerCenter: { alignItems: 'center', flex: 1 },
  logo: { width: 140, height: 46 },
  bfLogo: { width: 80, height: 16, marginTop: 2 },
  bfLogoHeader: { width: 80, height: 28 },
  scroll: { padding: 20, paddingBottom: 120 },
  title: { fontSize: 22, fontWeight: '800', color: navy, marginBottom: 4 },
  subtitle: { fontSize: 14, color: textSec, marginBottom: 24, lineHeight: 20 },
  loadingText: { textAlign: 'center', color: textSec, marginTop: 40 },
  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 16, fontWeight: '700', color: navy },
  emptySub: { fontSize: 14, color: textSec, marginTop: 4 },
  chipGrid: { gap: 12 },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, padding: 18,
    borderWidth: 2, borderColor: navy,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  chipOff: {
    backgroundColor: 'rgba(200,200,200,0.3)', borderColor: '#D1D5DB',
  },
  chipName: { fontSize: 17, fontWeight: '700', color: navy, flex: 1 },
  chipNameOff: { color: '#9CA3AF', textDecorationLine: 'line-through' },
  chipAge: { fontSize: 13, color: textSec, fontWeight: '500' },
  chipAgeOff: { color: '#D1D5DB' },
  chipStatus: { fontSize: 12, fontWeight: '700', color: '#16A34A', backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  chipStatusOff: { color: '#9CA3AF', backgroundColor: '#F3F4F6' },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(255,255,255,0.95)', borderTopWidth: 1, borderTopColor: border,
    padding: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    flexDirection: 'row', alignItems: 'center', gap: 16,
  },
  countText: { fontSize: 14, color: textSec, fontWeight: '600', flex: 1 },
  confirmBtn: { backgroundColor: navy, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, alignItems: 'center' },
  confirmTxt: { color: gold, fontSize: 16, fontWeight: '800' },
});
