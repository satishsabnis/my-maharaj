import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, ActivityIndicator, Platform, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { navy, gold, white, midGray, errorRed, darkGray, lightGray } from '../theme/colors';

interface Member {
  id: string;
  name: string;
  age: number;
  relationship: string;
  is_diabetic: boolean;
  has_bp: boolean;
  has_pcos: boolean;
  food_likes: string | null;
  food_dislikes: string | null;
  allergies: string | null;
  remarks: string | null;
  lipid_test_date: string | null;
  lipid_expiry_date: string | null;
}

export default function DietaryProfileScreen() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { void loadMembers(); }, []);

  async function loadMembers() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from('family_members')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at');
    setMembers((data as Member[]) ?? []);
    setLoading(false);
  }

  async function deleteMember(id: string) {
    const confirmed = Platform.OS === 'web'
      ? window.confirm('Remove this family member?')
      : await new Promise<boolean>((res) => Alert.alert('Remove Member', 'Are you sure?', [
          { text: 'Cancel', onPress: () => res(false) },
          { text: 'Remove', style: 'destructive', onPress: () => res(true) },
        ]));
    if (!confirmed) return;
    await supabase.from('family_members').delete().eq('id', id);
    setMembers((prev) => prev.filter((m) => m.id !== id));
  }

  function HealthBadge({ label, active }: { label: string; active: boolean }) {
    if (!active) return null;
    return <View style={s.badge}><Text style={s.badgeText}>{label}</Text></View>;
  }

  const isExpired = (expiryDate: string | null): boolean => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.backText}>← Back</Text></TouchableOpacity>
        <Text style={s.headerTitle}>Dietary Profile</Text>
        <TouchableOpacity onPress={() => router.push('/profile-setup')}><Text style={s.editText}>Edit</Text></TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={navy} size="large" /></View>
      ) : members.length === 0 ? (
        <View style={s.center}>
          <Text style={s.emptyIcon}>👨‍👩‍👧‍👦</Text>
          <Text style={s.emptyTitle}>No family members yet</Text>
          <Text style={s.emptyDesc}>Add your family members in Profile Setup to see health profiles here.</Text>
          <TouchableOpacity style={s.addBtn} onPress={() => router.push('/profile-setup')}>
            <Text style={s.addBtnText}>Go to Profile Setup</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll}>
          <Text style={s.subtitle}>{members.length} family member{members.length > 1 ? 's' : ''}</Text>
          {members.map((m) => (
            <View key={m.id} style={s.memberCard}>
              <TouchableOpacity style={s.memberHeader} onPress={() => setExpanded(expanded === m.id ? null : m.id)} activeOpacity={0.85}>
                <View style={s.memberAvatar}>
                  <Text style={s.memberAvatarText}>{m.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.memberName}>{m.name}</Text>
                  <Text style={s.memberMeta}>{m.age} yrs · {m.relationship}</Text>
                  <View style={s.badgeRow}>
                    <HealthBadge label="Diabetic" active={m.is_diabetic} />
                    <HealthBadge label="BP" active={m.has_bp} />
                    <HealthBadge label="PCOS" active={m.has_pcos} />
                    {!m.is_diabetic && !m.has_bp && !m.has_pcos && (
                      <View style={[s.badge, { backgroundColor: '#D1FAE5' }]}>
                        <Text style={[s.badgeText, { color: '#065F46' }]}>Healthy</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Text style={s.expandIcon}>{expanded === m.id ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {expanded === m.id && (
                <View style={s.memberDetails}>
                  {m.food_likes && <DetailRow label="Likes" value={m.food_likes} />}
                  {m.food_dislikes && <DetailRow label="Dislikes" value={m.food_dislikes} />}
                  {m.allergies && <DetailRow label="Allergies" value={m.allergies} color={errorRed} />}
                  {m.remarks && <DetailRow label="Remarks" value={m.remarks} />}
                  {m.lipid_test_date && (
                    <View>
                      <DetailRow label="Lipid Test" value={m.lipid_test_date} />
                      {m.lipid_expiry_date && (
                        <DetailRow
                          label="Expires"
                          value={m.lipid_expiry_date}
                          color={isExpired(m.lipid_expiry_date) ? errorRed : '#16A34A'}
                        />
                      )}
                      {isExpired(m.lipid_expiry_date) && (
                        <Text style={s.expiredWarning}>⚠️ Lipid report has expired — please renew</Text>
                      )}
                    </View>
                  )}
                  <TouchableOpacity style={s.deleteBtn} onPress={() => deleteMember(m.id)}>
                    <Text style={s.deleteBtnText}>Remove Member</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function DetailRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={s.detailRow}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={[s.detailValue, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F6FB' },
  header: { backgroundColor: navy, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'web' ? 20 : 14, paddingBottom: 16 },
  backText: { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '500' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: white },
  editText: { color: gold, fontSize: 14, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: navy, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: midGray, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  addBtn: { backgroundColor: gold, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14 },
  addBtnText: { color: white, fontWeight: '700', fontSize: 15 },
  scroll: { padding: 16, maxWidth: 640, width: '100%', alignSelf: 'center' },
  subtitle: { fontSize: 13, color: midGray, marginBottom: 16, fontWeight: '500' },
  memberCard: { backgroundColor: white, borderRadius: 14, marginBottom: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  memberHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  memberAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: navy, alignItems: 'center', justifyContent: 'center' },
  memberAvatarText: { color: gold, fontSize: 18, fontWeight: '800' },
  memberName: { fontSize: 15, fontWeight: '700', color: navy },
  memberMeta: { fontSize: 12, color: midGray, marginTop: 2 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  badge: { backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { color: '#B91C1C', fontSize: 11, fontWeight: '600' },
  expandIcon: { color: midGray, fontSize: 14 },
  memberDetails: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 2 },
  detailRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F9FAFB', gap: 12 },
  detailLabel: { width: 80, fontSize: 12, fontWeight: '600', color: midGray, textTransform: 'uppercase', letterSpacing: 0.3 },
  detailValue: { flex: 1, fontSize: 14, color: darkGray },
  expiredWarning: { fontSize: 12, color: errorRed, fontWeight: '600', marginTop: 8, marginBottom: 4 },
  deleteBtn: { marginTop: 14, borderWidth: 1.5, borderColor: errorRed, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  deleteBtnText: { color: errorRed, fontSize: 13, fontWeight: '600' },
});
