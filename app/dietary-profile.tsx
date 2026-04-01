import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { supabase, getSessionUser } from '../lib/supabase';
import Button from '../components/Button';
import Input from '../components/Input';
import ScreenWrapper from '../components/ScreenWrapper';
import { navy, gold, textSec, errorRed, white, border, surface, successGreen, darkGray } from '../theme/colors';
import { NON_ALCOHOLIC_BEVERAGES, ALCOHOLIC_BEVERAGES } from '../lib/constants';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
  id: string;
  name: string;
  age: number;
  health_notes: string | null;
  nationality: string | null;
}

interface MemberForm {
  name: string;
  age: string;
  nationality: string;
  nativeLanguage: string;
  healthConditions: string[];
  notes: string;
  nonAlcoholicFavs: string[];
  alcoholicFavs: string[];
  drinksAlcohol: boolean;
}

const NATIONALITIES = [
  'Afghan','Australian','Bangladeshi','British','Canadian','Chinese','Dutch',
  'Egyptian','Ethiopian','Filipino','French','German','Greek','Indian','Indonesian',
  'Iranian','Iraqi','Italian','Japanese','Jordanian','Korean','Kuwaiti','Lebanese',
  'Malaysian','Maldivian','Mexican','Moroccan','Nepali','Nigerian','Omani','Pakistani',
  'Palestinian','Qatari','Russian','Saudi','Singaporean','South African','Spanish',
  'Sri Lankan','Sudanese','Syrian','Thai','Turkish','UAE National','Ugandan',
  'Ukrainian','American','Vietnamese','Yemeni','Zimbabwean',
].sort();

const LANGUAGES = [
  'Arabic','Bengali','Chinese','Dutch','English','Filipino','French','German',
  'Gujarati','Hindi','Indonesian','Italian','Japanese','Kannada','Korean',
  'Malayalam','Marathi','Nepali','Odia','Pashto','Persian','Punjabi','Russian',
  'Sinhala','Spanish','Swahili','Tamil','Telugu','Thai','Turkish','Urdu','Vietnamese',
].sort();

const HEALTH_PILLS = ['Diabetic', 'BP', 'PCOS', 'Cholesterol', 'Thyroid', 'Heart', 'Kidney', 'Anaemia', 'Lactose', 'Gluten'];

const ALL_CUISINES = [
  'Afghan','Andhra','Arabic','Assamese','Awadhi','Bangladeshi','Bengali','Bihari','Burmese',
  'Chettinad','Chinese','Continental','Coorgi','Egyptian','Ethiopian','French','Goan',
  'Greek','Gujarati','Hyderabadi','Indonesian','Iranian','Italian','Jain','Japanese','Kashmiri',
  'Korean','Kuwaiti','Lebanese','Maharashtrian','Malabar','Malaysian','Malvani',
  'Mediterranean','Mexican','Moroccan','Nepali','Nigerian','Odia','Omani','Pakistani',
  'Palestinian','Persian','Punjabi','Rajasthani','Singaporean','South African',
  'South Indian','Spanish','Sri Lankan','Syrian','Tamil','Telugu','Thai','Turkish',
  'Udupi','Vietnamese','Yemeni',
].sort();

function formToNotes(form: MemberForm): string {
  const parts = [...form.healthConditions, form.notes.trim()].filter(Boolean);
  if (form.nonAlcoholicFavs.length > 0) parts.push('Drinks: ' + form.nonAlcoholicFavs.join(', '));
  if (form.alcoholicFavs.length > 0) parts.push('Alcohol: ' + form.alcoholicFavs.join(', '));
  return parts.join(', ');
}

function emptyForm(): MemberForm {
  return { name: '', age: '', nationality: '', nativeLanguage: '', healthConditions: [], notes: '', nonAlcoholicFavs: [], alcoholicFavs: [], drinksAlcohol: false };
}

function memberToForm(m: Member): MemberForm {
  const notes = m.health_notes ?? '';
  const conds = HEALTH_PILLS.filter((p) => notes.toLowerCase().includes(p.toLowerCase()));
  let others = conds.reduce((s, c) => s.replace(new RegExp(`,?\\s*${c}`, 'gi'), ''), notes).replace(/^,+|,+$/g, '').trim();
  // Parse beverage prefs
  const drinksMatch = others.match(/Drinks:\s*([^,]+(,\s*[^,]+)*)/);
  const nonAlcoholicFavs = drinksMatch ? drinksMatch[1].split(',').map(s => s.trim()).filter(s => NON_ALCOHOLIC_BEVERAGES.includes(s)) : [];
  const alcMatch = others.match(/Alcohol:\s*([^,]+(,\s*[^,]+)*)/);
  const alcoholicFavs = alcMatch ? alcMatch[1].split(',').map(s => s.trim()).filter(s => ALCOHOLIC_BEVERAGES.includes(s)) : [];
  // Remove parsed beverage strings from notes
  others = others.replace(/,?\s*Drinks:\s*[^,]+(,\s*[^,]+)*/g, '').replace(/,?\s*Alcohol:\s*[^,]+(,\s*[^,]+)*/g, '').replace(/^,+|,+$/g, '').trim();
  return { name: m.name, age: String(m.age || ''), healthConditions: conds, notes: others, nonAlcoholicFavs, alcoholicFavs, drinksAlcohol: alcoholicFavs.length > 0 };
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DietaryProfileScreen() {
  const [members,          setMembers]          = useState<Member[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [saving,           setSaving]           = useState(false);
  const [modalOpen,        setModalOpen]        = useState(false);
  const [editId,           setEditId]           = useState<string | null>(null);
  const [form,             setForm]             = useState<MemberForm>(emptyForm());
  const [natSuggestions,   setNatSuggestions]   = useState<string[]>([]);
  const [langSuggestions,  setLangSuggestions]  = useState<string[]>([]);
  const [formError,        setFormError]        = useState('');
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [cuisineSaving,    setCuisineSaving]    = useState(false);
  const [cuisineSearch,    setCuisineSearch]    = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const user = await getSessionUser();
    if (!user) { setLoading(false); return; }
    const [{ data: membersData }, { data: cuisineData }] = await Promise.all([
      supabase.from('family_members').select('id, name, age, health_notes').eq('user_id', user.id),
      supabase.from('cuisine_preferences').select('cuisine_name').eq('user_id', user.id).eq('is_excluded', false),
    ]);
    setMembers((membersData as Member[]) ?? []);
    setSelectedCuisines((cuisineData ?? []).map((c: any) => c.cuisine_name));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, []);

  function openAdd() { setEditId(null); setForm(emptyForm()); setFormError(''); setModalOpen(true); }
  function openEdit(m: Member) { setEditId(m.id); setForm(memberToForm(m)); setFormError(''); setModalOpen(true); }

  function toggleHealth(cond: string) {
    setForm((prev) => ({
      ...prev,
      healthConditions: prev.healthConditions.includes(cond)
        ? prev.healthConditions.filter((c) => c !== cond)
        : [...prev.healthConditions, cond],
    }));
  }

  function toggleCuisine(cuisine: string) {
    setSelectedCuisines((prev) =>
      prev.includes(cuisine) ? prev.filter((c) => c !== cuisine) : [...prev, cuisine]
    );
  }

  async function saveMember() {
    if (!form.name.trim()) { setFormError('Name is required'); return; }
    setSaving(true); setFormError('');
    try {
      const user = await getSessionUser();
      if (!user) throw new Error('Not authenticated');
      const payload = { user_id: user.id, name: form.name.trim(), age: parseInt(form.age, 10) || 0, health_notes: formToNotes(form) || null };
      if (editId) {
        const { error: e } = await supabase.from('family_members').update(payload).eq('id', editId);
        if (e) throw new Error(e.message);
      } else {
        const { error: e } = await supabase.from('family_members').insert(payload);
        if (e) throw new Error(e.message);
      }
      setModalOpen(false); await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed.');
    } finally { setSaving(false); }
  }

  async function saveCuisines() {
    setCuisineSaving(true);
    try {
      const user = await getSessionUser();
      if (!user) return;

      // Delete ALL cuisines for this user first
      await supabase.from('cuisine_preferences').delete().eq('user_id', user.id);

      // Then insert the new selection fresh
      if (selectedCuisines.length > 0) {
        const { error: insertErr } = await supabase.from('cuisine_preferences').insert(
          selectedCuisines.map((c) => ({ user_id: user.id, cuisine_name: c, is_excluded: false }))
        );
        if (insertErr) console.error('[DietaryProfile] cuisine insert error:', insertErr.message);
      }
    } catch (e) { console.error('[DietaryProfile] saveCuisines error:', e); } finally { setCuisineSaving(false); }
  }

  async function deleteMember(id: string) {
    await supabase.from('family_members').delete().eq('id', id);
    await load();
  }

  const HEALTH_COLORS: Record<string, { bg: string; fg: string }> = {
    Diabetic: { bg: '#FEF2F2', fg: '#DC2626' }, BP: { bg: '#FFF7ED', fg: '#C2410C' },
    PCOS: { bg: '#FDF4FF', fg: '#7E22CE' }, Cholesterol: { bg: '#FFF1F2', fg: '#BE123C' },
    Thyroid: { bg: '#ECFDF5', fg: '#059669' }, Heart: { bg: '#FEF2F2', fg: '#DC2626' },
    Kidney: { bg: '#EFF6FF', fg: '#1D4ED8' }, Anaemia: { bg: '#FFF7ED', fg: '#B45309' },
    Lactose: { bg: '#F0FDF4', fg: '#166534' }, Gluten: { bg: '#FFFBEB', fg: '#92400E' },
  };

  return (
    <ScreenWrapper title="Family Profile" onBack={() => router.push('/settings' as never)}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Family Members */}
        {loading ? (
          <Text style={s.loadingText}>Loading...</Text>
        ) : members.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}></Text>
            <Text style={s.emptyTitle}>No family members yet</Text>
            <Text style={s.emptySub}>Add your family members to personalise meal plans</Text>
          </View>
        ) : members.map((m) => {
          const pills = HEALTH_PILLS.filter((p) => (m.health_notes ?? '').toLowerCase().includes(p.toLowerCase()));
          const otherNotes = pills.reduce((s, c) => s.replace(new RegExp(`,?\\s*${c}`, 'gi'), ''), m.health_notes ?? '').replace(/^,+|,+$/g, '').trim();
          return (
            <View key={m.id} style={s.card}>
              <View style={s.cardHeader}>
                <View style={s.memberInfo}>
                  <Text style={s.memberName}>{m.name}</Text>
                  {m.age > 0 && <Text style={s.metaText}>{m.age} yrs</Text>}
                </View>
                <TouchableOpacity onPress={() => openEdit(m)} style={s.editBtn}>
                  <Text style={s.editBtnText}>Edit</Text>
                </TouchableOpacity>
              </View>
              {pills.length > 0 && (
                <View style={s.pillWrap}>
                  {pills.map((p) => (
                    <View key={p} style={[s.healthPill, { backgroundColor: HEALTH_COLORS[p]?.bg ?? '#F3F4F6' }]}>
                      <Text style={[s.healthPillText, { color: HEALTH_COLORS[p]?.fg ?? '#374151' }]}>{p}</Text>
                    </View>
                  ))}
                </View>
              )}
              {otherNotes ? <Text style={s.notesText}>{otherNotes}</Text> : null}
              <TouchableOpacity onPress={() => deleteMember(m.id)} style={s.deleteBtn}>
                <Text style={s.deleteBtnText}>Remove member</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        <View style={s.addWrap}>
          <View style={{flexDirection:'row',gap:12}}>
          <View style={{flex:2}}>
            <Button title="+ Add Family Member" onPress={openAdd} />
          </View>
          <View style={{flex:1}}>
            <Button title="Done" onPress={() => router.push('/home' as never)} variant="outline" />
          </View>
        </View>
        </View>

        {/* Lab Report Link */}
        <TouchableOpacity
          style={s.labReportLink}
          onPress={() => router.push('/lab-report' as never)}
          activeOpacity={0.85}
        >
          <Text style={s.labReportIcon}></Text>
          <View style={{ flex: 1 }}>
            <Text style={s.labReportTitle}>Lab Report Analysis</Text>
            <Text style={s.labReportSub}>Upload blood test results — Maharaj updates dietary recommendations automatically</Text>
          </View>
          <Text style={{ fontSize: 22, color: '#7C3AED', fontWeight: '300' }}>›</Text>
        </TouchableOpacity>

        {/* Cuisine Preferences */}
        <View style={s.cuisineSection}>
          <Text style={s.cuisineTitle}>Cuisine Preferences</Text>
          <Text style={s.cuisineSub}>Select cuisines to guide your meal plans</Text>

          <Text style={s.cuisineCount}>{selectedCuisines.length} cuisine{selectedCuisines.length !== 1 ? 's' : ''} selected</Text>

          <TextInput
            style={{borderWidth:1.5,borderColor:'#E5E7EB',borderRadius:12,paddingHorizontal:14,paddingVertical:10,fontSize:14,color:'#1F2937',backgroundColor:'rgba(255,255,255,0.9)',marginBottom:12}}
            placeholder="Search cuisines..."
            placeholderTextColor="#9CA3AF"
            value={cuisineSearch}
            onChangeText={setCuisineSearch}
          />

          <View style={s.pillRow}>
            {ALL_CUISINES
              .filter(c => !cuisineSearch || c.toLowerCase().includes(cuisineSearch.toLowerCase()))
              .map((c) => (
                <TouchableOpacity key={c} onPress={() => toggleCuisine(c)} activeOpacity={0.75}
                  style={[s.cuisinePill, selectedCuisines.includes(c) && s.cuisinePillActive]}>
                  <Text style={[s.cuisinePillTxt, selectedCuisines.includes(c) && s.cuisinePillTxtActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
          </View>

          <View style={{ marginTop: 16 }}>
            <Button title={cuisineSaving ? 'Saving...' : '✓ Save Cuisine Preferences'} onPress={() => void saveCuisines()} loading={cuisineSaving} />
          </View>
        </View>

      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editId ? 'Edit Member' : 'Add Member'}</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)} style={s.modalClose}>
                <Text style={s.modalCloseTxt}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={s.modalScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Input label="Name *" value={form.name} onChangeText={(v) => setForm((p) => ({ ...p, name: v }))} placeholder="Full name" />
              <View style={{ flexDirection: 'row' }}>
                <View style={{ flex: 2, marginRight: 10, zIndex: 10 }}>
                  <Input label="Nationality" value={form.nationality}
            onChangeText={v => {
              setForm(p => ({ ...p, nationality: v }));
              setNatSuggestions(v.length > 0 ? NATIONALITIES.filter(n => n.toLowerCase().startsWith(v.toLowerCase())).slice(0,5) : []);
            }}
            placeholder="e.g. Indian, Pakistani, Filipino..." />
          {natSuggestions.length > 0 && (
            <View style={{backgroundColor:'white',borderRadius:10,borderWidth:1,borderColor:'#E5E7EB',position:'absolute',top:'100%',left:0,right:0,zIndex:10,elevation:10,shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.1,shadowRadius:4}}>
              {natSuggestions.map(n => (
                <TouchableOpacity key={n} style={{paddingHorizontal:14,paddingVertical:10,borderBottomWidth:1,borderBottomColor:'#F3F4F6'}} onPress={() => { setForm(p=>({...p,nationality:n})); setNatSuggestions([]); }}>
                  <Text style={{fontSize:14,color:navy}}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <Input label="Native Language" value={form.nativeLanguage}
            onChangeText={v => {
              setForm(p => ({ ...p, nativeLanguage: v }));
              setLangSuggestions(v.length > 0 ? LANGUAGES.filter(l => l.toLowerCase().startsWith(v.toLowerCase())).slice(0,5) : []);
            }}
            placeholder="e.g. Hindi, Urdu, Tamil..." />
          {langSuggestions.length > 0 && (
            <View style={{backgroundColor:'white',borderRadius:10,borderWidth:1,borderColor:'#E5E7EB',marginBottom:8}}>
              {langSuggestions.map(l => (
                <TouchableOpacity key={l} style={{paddingHorizontal:14,paddingVertical:10,borderBottomWidth:1,borderBottomColor:'#F3F4F6'}} onPress={() => { setForm(p=>({...p,nativeLanguage:l})); setLangSuggestions([]); }}>
                  <Text style={{fontSize:14,color:navy}}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <Input label="Age" value={form.age} onChangeText={(v) => setForm((p) => ({ ...p, age: v }))} placeholder="Age" keyboardType="numeric" />
                </View>
              </View>
              <Text style={s.sectionLabel}>HEALTH CONDITIONS</Text>
              <View style={s.pillRow}>
                {HEALTH_PILLS.map((cond) => (
                  <TouchableOpacity key={cond} onPress={() => toggleHealth(cond)} activeOpacity={0.75}
                    style={[s.cuisinePill, form.healthConditions.includes(cond) && s.cuisinePillActive]}>
                    <Text style={[s.cuisinePillTxt, form.healthConditions.includes(cond) && s.cuisinePillTxtActive]}>{cond}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={s.sectionLabel}>BEVERAGE PREFERENCES</Text>
              <Text style={{fontSize:12,color:textSec,marginBottom:8}}>Non-alcoholic favourites</Text>
              <View style={s.pillRow}>
                {NON_ALCOHOLIC_BEVERAGES.map((bev) => (
                  <TouchableOpacity key={bev} onPress={() => setForm(p => ({...p, nonAlcoholicFavs: p.nonAlcoholicFavs.includes(bev) ? p.nonAlcoholicFavs.filter(x=>x!==bev) : [...p.nonAlcoholicFavs, bev]}))} activeOpacity={0.75}
                    style={[s.cuisinePill, form.nonAlcoholicFavs.includes(bev) && s.cuisinePillActive]}>
                    <Text style={[s.cuisinePillTxt, form.nonAlcoholicFavs.includes(bev) && s.cuisinePillTxtActive]}>{bev}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:form.drinksAlcohol?navy:'rgba(255,255,255,0.9)',borderRadius:12,padding:14,marginTop:12,borderWidth:1.5,borderColor:form.drinksAlcohol?navy:'#D1D5DB'}} onPress={()=>setForm(p=>({...p, drinksAlcohol:!p.drinksAlcohol, alcoholicFavs:!p.drinksAlcohol?p.alcoholicFavs:[]}))} activeOpacity={0.8}>
                <Text style={{fontSize:14,fontWeight:'600',color:form.drinksAlcohol?white:(darkGray ?? textSec)}}>Consumes alcohol?</Text>
                <View style={{width:40,height:22,borderRadius:11,backgroundColor:form.drinksAlcohol?gold:'#D1D5DB',padding:2}}>
                  <View style={{width:18,height:18,borderRadius:9,backgroundColor:white,transform:[{translateX:form.drinksAlcohol?18:0}]}} />
                </View>
              </TouchableOpacity>
              {form.drinksAlcohol && (
                <View style={{marginTop:12}}>
                  <Text style={{fontSize:12,color:textSec,marginBottom:8}}>Alcoholic preferences</Text>
                  <View style={s.pillRow}>
                    {ALCOHOLIC_BEVERAGES.map((bev) => (
                      <TouchableOpacity key={bev} onPress={() => setForm(p => ({...p, alcoholicFavs: p.alcoholicFavs.includes(bev) ? p.alcoholicFavs.filter(x=>x!==bev) : [...p.alcoholicFavs, bev]}))} activeOpacity={0.75}
                        style={[s.cuisinePill, form.alcoholicFavs.includes(bev) && s.cuisinePillActive]}>
                        <Text style={[s.cuisinePillTxt, form.alcoholicFavs.includes(bev) && s.cuisinePillTxtActive]}>{bev}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
              <Input label="Medical Notes (optional)" value={form.notes} onChangeText={(v) => setForm((p) => ({ ...p, notes: v }))}
                placeholder="e.g. Low salt, no fried food..." multiline numberOfLines={3} />
              {formError ? <Text style={s.formError}>{formError}</Text> : null}
              <View style={{ marginTop: 16, gap: 10 }}>
                <Button title="Save Member" onPress={() => void saveMember()} loading={saving} />
                <Button title="Cancel" onPress={() => setModalOpen(false)} variant="outline" />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  scroll:      { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 48 },
  loadingText: { textAlign: 'center', color: textSec, marginTop: 40 },
  labReportLink:  { flexDirection:'row', alignItems:'center', gap:12, backgroundColor:'rgba(124,58,237,0.08)', borderRadius:14, padding:14, marginBottom:16, borderWidth:1, borderColor:'rgba(124,58,237,0.2)' },
  labReportIcon:  { fontSize:24 },
  labReportTitle: { fontSize:14, fontWeight:'700', color:'#7C3AED', marginBottom:2 },
  labReportSub:   { fontSize:12, color:'#6D28D9', lineHeight:18 },
  emptyState:  { alignItems: 'center', paddingVertical: 60 },
  emptyIcon:   { fontSize: 56, marginBottom: 16 },
  emptyTitle:  { fontSize: 18, fontWeight: '700', color: navy, marginBottom: 8 },
  emptySub:    { fontSize: 14, color: textSec, textAlign: 'center' },
  card:        { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 16, borderWidth: 1.5, borderColor: border, padding: 16, marginBottom: 14 },
  cardHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  memberInfo:  { flex: 1 },
  memberName:  { fontSize: 16, fontWeight: '700', color: navy },
  metaText:    { fontSize: 13, color: textSec, marginTop: 2 },
  editBtn:     { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: border },
  editBtnText: { fontSize: 13, color: navy, fontWeight: '600' },
  pillWrap:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  healthPill:  { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  healthPillText: { fontSize: 12, fontWeight: '600' },
  notesText:   { fontSize: 13, color: textSec, fontStyle: 'italic', marginTop: 4 },
  deleteBtn:   { marginTop: 10, alignSelf: 'flex-end' },
  deleteBtnText: { fontSize: 12, color: errorRed, fontWeight: '500' },
  addWrap:     { marginTop: 8, marginBottom: 24 },
  cuisineSection:  { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 16, borderWidth: 1.5, borderColor: border, padding: 16, marginBottom: 16 },
  cuisineTitle:    { fontSize: 16, fontWeight: '700', color: navy, marginBottom: 4 },
  cuisineSub:      { fontSize: 13, color: textSec, marginBottom: 16, lineHeight: 18 },
  groupLabel:      { fontSize: 11, fontWeight: '700', color: textSec, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 },
  cuisineCount:    { fontSize: 12, color: successGreen, fontWeight: '600', textAlign: 'center', marginTop: 10 },
  pillRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  cuisinePill:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: border, backgroundColor: 'rgba(255,255,255,0.9)' },
  cuisinePillActive:{ backgroundColor: navy, borderColor: navy },
  cuisinePillTxt:  { fontSize: 13, color: navy, fontWeight: '500' },
  cuisinePillTxtActive: { color: white, fontWeight: '600' },
  sectionLabel:    { fontSize: 11, fontWeight: '700', color: textSec, letterSpacing: 0.8, marginBottom: 8, marginTop: 16, textTransform: 'uppercase' },
  formError:       { fontSize: 13, color: errorRed, textAlign: 'center', backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginTop: 8 },
  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', alignItems: 'center' },
  modalSheet:      { backgroundColor: white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', maxWidth: '95%', width: '95%', alignSelf: 'center' },
  modalHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: border },
  modalTitle:      { fontSize: 18, fontWeight: '700', color: navy },
  modalClose:      { width: 32, height: 32, borderRadius: 16, backgroundColor: surface, alignItems: 'center', justifyContent: 'center' },
  modalCloseTxt:   { fontSize: 14, color: textSec, fontWeight: '600' },
  modalScroll:     { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48 },
});
