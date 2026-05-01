import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import ScreenWrapper from '../components/ScreenWrapper';
import { supabase, getSessionUser } from '../lib/supabase';

const NAVY = '#2E5480';
const GOLD = '#C9A227';
const TEAL = '#1A6B5C';
const MINT = '#D4EDE5';

interface Client {
  id: string;
  name: string;
  email: string;
}

interface PendingPlan {
  id: string;
  client_id: string;
  client_name: string;
  week_start: string | null;
  summary: string;
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

function buildPlanSummary(plan_json: any): string {
  const days = plan_json?.days;
  if (!Array.isArray(days) || days.length === 0) return 'Empty plan';
  const dishes: string[] = [];
  for (const d of days.slice(0, 3)) {
    const lunch =
      d?.lunch?.curry?.dishName ||
      d?.anatomy?.lunch?.curry?.dishName ||
      (Array.isArray(d?.anatomy?.lunch?.curry) ? d.anatomy.lunch.curry[0]?.dishName : '') ||
      d?.dishes?.lunch_curry_1 ||
      d?.lunch?.name ||
      '';
    if (lunch) dishes.push(lunch);
  }
  const more = days.length > 3 ? ` (+${days.length - 3} more days)` : '';
  return dishes.length > 0 ? dishes.join(' · ') + more : `${days.length}-day plan`;
}

export default function DietitianDashboard() {
  const [loading, setLoading] = useState(true);
  const [dietitianId, setDietitianId] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [pendingPlans, setPendingPlans] = useState<PendingPlan[]>([]);
  const [pendingApprovalId, setPendingApprovalId] = useState<string | null>(null);

  const [emailInput, setEmailInput] = useState('');
  const [addStatus, setAddStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [adding, setAdding] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setAddStatus(null);
    try {
      const user = await getSessionUser();
      if (!user) {
        router.replace('/login');
        return;
      }
      setDietitianId(user.id);

      // Linked clients
      const { data: linkRows, error: linkErr } = await supabase
        .from('dietitian_clients')
        .select('client_id, profiles!dietitian_clients_client_id_fkey(id, full_name, email)')
        .eq('dietitian_id', user.id);

      let clientList: Client[] = [];
      if (!linkErr && linkRows) {
        clientList = linkRows
          .map((r: any) => {
            const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
            if (!p) return null;
            return { id: p.id, name: p.full_name ?? '(no name)', email: p.email ?? '' } as Client;
          })
          .filter(Boolean) as Client[];
      } else if (linkErr) {
        console.error('[DietitianDashboard] dietitian_clients query failed:', linkErr.message);
      }
      setClients(clientList);

      // Pending plans for those clients
      if (clientList.length > 0) {
        const clientIds = clientList.map(c => c.id);
        const { data: planRows, error: planErr } = await supabase
          .from('meal_plans')
          .select('id, user_id, period_start, plan_json, is_approved, generated_at')
          .in('user_id', clientIds)
          .eq('is_approved', false)
          .order('generated_at', { ascending: false });
        if (!planErr && planRows) {
          const nameById = new Map(clientList.map(c => [c.id, c.name]));
          setPendingPlans(
            planRows.map((row: any) => ({
              id: row.id,
              client_id: row.user_id,
              client_name: nameById.get(row.user_id) ?? '(unknown client)',
              week_start: row.period_start,
              summary: buildPlanSummary(row.plan_json),
            })),
          );
        } else if (planErr) {
          console.error('[DietitianDashboard] meal_plans query failed:', planErr.message);
          setPendingPlans([]);
        }
      } else {
        setPendingPlans([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void loadAll();
  }, [loadAll]));

  useEffect(() => { void loadAll(); }, [loadAll]);

  async function approvePlan(planId: string) {
    setPendingApprovalId(planId);
    try {
      const { error } = await supabase
        .from('meal_plans')
        .update({ is_approved: true })
        .eq('id', planId);
      if (error) {
        console.error('[DietitianDashboard] approve failed:', error.message);
        return;
      }
      setPendingPlans(prev => prev.filter(p => p.id !== planId));
    } finally {
      setPendingApprovalId(null);
    }
  }

  function openClientPlan(client: Client) {
    router.push({ pathname: '/menu-history', params: { dietitianClientId: client.id } } as never);
  }

  async function addClient() {
    const email = emailInput.trim().toLowerCase();
    if (!email) {
      setAddStatus({ ok: false, message: 'Enter a client email.' });
      return;
    }
    if (!dietitianId) return;
    setAdding(true);
    setAddStatus(null);
    try {
      const { data: profileRow, error: lookupErr } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .ilike('email', email)
        .maybeSingle();
      if (lookupErr) {
        setAddStatus({ ok: false, message: lookupErr.message });
        return;
      }
      if (!profileRow) {
        setAddStatus({ ok: false, message: 'No user found with that email.' });
        return;
      }
      if (profileRow.id === dietitianId) {
        setAddStatus({ ok: false, message: "You can't add yourself as a client." });
        return;
      }
      if (clients.some(c => c.id === profileRow.id)) {
        setAddStatus({ ok: false, message: 'That client is already linked.' });
        return;
      }
      const { error: insertErr } = await supabase
        .from('dietitian_clients')
        .insert({ dietitian_id: dietitianId, client_id: profileRow.id });
      if (insertErr) {
        setAddStatus({ ok: false, message: insertErr.message });
        return;
      }
      setEmailInput('');
      setAddStatus({ ok: true, message: `Linked ${profileRow.full_name ?? profileRow.email}.` });
      await loadAll();
    } finally {
      setAdding(false);
    }
  }

  return (
    <ScreenWrapper title="Dietitian Dashboard">
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator color={NAVY} />
          </View>
        ) : (
          <>
            {/* My Clients */}
            <Text style={s.sectionTitle}>My Clients</Text>
            {clients.length === 0 ? (
              <View style={s.emptyCard}>
                <Text style={s.emptyText}>No clients linked yet. Add one below.</Text>
              </View>
            ) : (
              clients.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={s.clientCard}
                  onPress={() => openClientPlan(c)}
                  activeOpacity={0.85}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.clientName}>{c.name}</Text>
                    <Text style={s.clientEmail}>{c.email}</Text>
                  </View>
                  <Text style={s.chevron}>{'>'}</Text>
                </TouchableOpacity>
              ))
            )}

            {/* Pending Plans */}
            <Text style={[s.sectionTitle, { marginTop: 22 }]}>Pending Plans</Text>
            {pendingPlans.length === 0 ? (
              <View style={s.emptyCard}>
                <Text style={s.emptyText}>No plans waiting for approval.</Text>
              </View>
            ) : (
              pendingPlans.map(p => (
                <View key={p.id} style={s.planCard}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={s.clientName}>{p.client_name}</Text>
                    <Text style={s.planMeta}>Week of {formatDate(p.week_start)}</Text>
                    <Text style={s.planSummary} numberOfLines={2}>{p.summary}</Text>
                  </View>
                  <TouchableOpacity
                    style={[s.approveBtn, pendingApprovalId === p.id && { opacity: 0.6 }]}
                    onPress={() => approvePlan(p.id)}
                    disabled={pendingApprovalId === p.id}
                    activeOpacity={0.85}
                  >
                    <Text style={s.approveBtnText}>
                      {pendingApprovalId === p.id ? 'Approving…' : 'Approve'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))
            )}

            {/* Add Client */}
            <Text style={[s.sectionTitle, { marginTop: 22 }]}>Add Client</Text>
            <View style={s.addCard}>
              <Text style={s.addLabel}>Client email</Text>
              <TextInput
                style={s.input}
                value={emailInput}
                onChangeText={t => { setEmailInput(t); setAddStatus(null); }}
                placeholder="client@example.com"
                placeholderTextColor="rgba(46,84,128,0.4)"
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!adding}
              />
              {addStatus && (
                <Text style={[s.statusText, { color: addStatus.ok ? TEAL : '#B91C1C' }]}>
                  {addStatus.message}
                </Text>
              )}
              <TouchableOpacity
                style={[s.submitBtn, adding && { opacity: 0.7 }]}
                onPress={addClient}
                disabled={adding}
                activeOpacity={0.85}
              >
                <Text style={s.submitBtnText}>{adding ? 'Linking…' : 'Link Client'}</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 40 }} />
          </>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 80,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  loadingWrap: { alignItems: 'center', paddingVertical: 40 },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: TEAL,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(30,158,94,0.2)',
  },

  emptyCard: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(46,84,128,0.12)',
    marginBottom: 6,
  },
  emptyText: { fontSize: 13, color: 'rgba(46,84,128,0.7)' },

  clientCard: {
    backgroundColor: MINT,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(46,84,128,0.18)',
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientName: { fontSize: 15, fontWeight: '700', color: NAVY },
  clientEmail: { fontSize: 12, color: 'rgba(46,84,128,0.7)', marginTop: 2 },
  chevron: { fontSize: 18, color: NAVY, fontWeight: '600', marginLeft: 8 },

  planCard: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(46,84,128,0.18)',
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  planMeta: { fontSize: 12, color: TEAL, marginTop: 2, fontWeight: '500' },
  planSummary: { fontSize: 13, color: NAVY, marginTop: 4, lineHeight: 18 },

  approveBtn: {
    backgroundColor: GOLD,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  approveBtnText: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },

  addCard: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(46,84,128,0.18)',
  },
  addLabel: { fontSize: 13, fontWeight: '600', color: NAVY, marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: NAVY,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: NAVY,
    backgroundColor: 'white',
    marginBottom: 8,
  },
  statusText: { fontSize: 12, marginBottom: 8 },
  submitBtn: {
    backgroundColor: NAVY,
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  submitBtnText: { fontSize: 14, fontWeight: '600', color: 'white' },
});
