import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Modal, Platform, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { router } from 'expo-router';
import { supabase, getSessionUser } from '../lib/supabase';
import ScreenWrapper from '../components/ScreenWrapper';
import Button from '../components/Button';
import Input from '../components/Input';
import { navy, gold, white, textSec, border, errorRed, successGreen } from '../theme/colors';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LabMarker {
  name: string;
  value: string;
  unit: string;
  normal_range: string;
  status: 'high' | 'low' | 'normal';
  dietary_impact: string;
  recommendation: string;
  health_condition: string | null; // maps to dietary profile health condition
}

interface LabResult {
  patient_name: string | null;
  report_date: string | null;
  markers: LabMarker[];
  summary: string;
  dietary_notes: string[];
}

// ─── Claude API helper ────────────────────────────────────────────────────────

async function callClaude(messages: any[], systemPrompt?: string): Promise<string> {
  const base = 'https://my-maharaj.vercel.app';
  const res = await fetch(`${base}/api/claude`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 3000,
      system: systemPrompt,
      messages,
    }),
  });
  const data = await res.json();
  if (data?.error) throw new Error(data.error.message ?? data.error);
  return data?.content?.[0]?.text ?? '';
}

// ─── Health condition mapping ─────────────────────────────────────────────────

const CONDITION_MAP: Record<string, string> = {
  'HbA1c': 'Diabetic',
  'Fasting Blood Sugar': 'Diabetic',
  'Blood Glucose': 'Diabetic',
  'Total Cholesterol': 'Cholesterol',
  'LDL': 'Cholesterol',
  'HDL': 'Cholesterol',
  'Triglycerides': 'Cholesterol',
  'Systolic BP': 'BP',
  'Diastolic BP': 'BP',
  'TSH': 'Thyroid',
  'T3': 'Thyroid',
  'T4': 'Thyroid',
  'Creatinine': 'Kidney',
  'eGFR': 'Kidney',
  'Uric Acid': 'Kidney',
  'Hemoglobin': 'Anaemia',
  'Iron': 'Anaemia',
  'Ferritin': 'Anaemia',
  'Testosterone': 'PCOS',
  'LH': 'PCOS',
  'FSH': 'PCOS',
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function LabReportScreen() {
  const [scanning,      setScanning]      = useState(false);
  const [result,        setResult]        = useState<LabResult | null>(null);
  const [showConfirm,   setShowConfirm]   = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [saved,         setSaved]         = useState(false);
  const [error,         setError]         = useState('');
  const [memberName,    setMemberName]    = useState('');
  const [showManual,    setShowManual]    = useState(false);
  const [manualMarkers, setManualMarkers] = useState<Array<{name:string;value:string;unit:string;normal_range:string;test_date:string}>>([
    {name:'',value:'',unit:'',normal_range:'',test_date:new Date().toISOString().split('T')[0]}
  ]);
  const [reminder, setReminder] = useState<{memberName:string;dueDate:string}|null>(null);
  const [scannedPages, setScannedPages] = useState<string[]>([]);
  const [showPageReview, setShowPageReview] = useState(false);

  useEffect(() => {
    async function checkReminders() {
      const user = await getSessionUser();
      if (!user) return;
      const { data: members } = await supabase.from('family_members').select('name, health_notes').eq('user_id', user.id);
      if (!members) return;
      const today = new Date(); today.setHours(0,0,0,0);
      for (const m of members) {
        const match = (m.health_notes ?? '').match(/Lab \((\d{4}-\d{2}-\d{2})\)/);
        if (!match) continue;
        const labDate = new Date(match[1]);
        const reminderDate = new Date(labDate);
        reminderDate.setDate(reminderDate.getDate() + 80);
        const daysUntil = Math.ceil((reminderDate.getTime() - today.getTime()) / 86400000);
        if (daysUntil <= 7 && daysUntil >= -7) {
          setReminder({ memberName: m.name, dueDate: reminderDate.toISOString().split('T')[0] });
          break;
        }
      }
    }
    void checkReminders();
  }, []);

  // ── Scan report ───────────────────────────────────────────────────────────

  function analyseManualMarkers() {
    const valid = manualMarkers.filter(m => m.name.trim() && m.value.trim());
    if (!valid.length) { setError('Please fill in at least one test marker.'); return; }
    const markers = valid.map(m => {
      const val = parseFloat(m.value);
      const [low, high] = m.normal_range.split('-').map(v => parseFloat(v.trim()));
      let status: 'high' | 'low' | 'normal' = 'normal';
      if (!isNaN(low) && !isNaN(high)) {
        if (val > high) status = 'high';
        else if (val < low) status = 'low';
      }
      const condition = Object.entries({HbA1c:'Diabetic','Blood Glucose':'Diabetic','Total Cholesterol':'Cholesterol','LDL':'Cholesterol','TSH':'Thyroid','Hemoglobin':'Anaemia','Creatinine':'Kidney','Testosterone':'PCOS'})
        .find(([k]) => m.name.toLowerCase().includes(k.toLowerCase()))?.[1] ?? null;
      return { name: m.name, value: m.value, unit: m.unit, normal_range: m.normal_range, status, dietary_impact: '', recommendation: '', health_condition: condition };
    });
    setResult({ patient_name: memberName || null, report_date: valid[0].test_date, markers, summary: `Manual entry: ${valid.length} markers recorded.`, dietary_notes: [] });
    setShowManual(false);
    if (markers.some(m => m.status !== 'normal')) setShowConfirm(true);
  }

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function handleFileUpload() {
    if (Platform.OS === 'web') {
      fileInputRef.current?.click();
    } else {
      setError('File upload is only supported on web.');
    }
  }

  async function onFileSelected(e: any) {
    const file = e?.target?.files?.[0];
    if (!file) return;
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        setScannedPages(prev => [...prev, base64]);
        setShowPageReview(true);
      };
      reader.readAsDataURL(file);
    } catch {
      setError('Could not read file. Please try again.');
    }
    // Reset input so same file can be re-selected
    if (e?.target) e.target.value = '';
  }

  async function processAllPages() {
    if (scannedPages.length === 0) return;
    setScanning(true); setError(''); setResult(null); setSaved(false);
    setShowPageReview(false);

    const systemPrompt = `You are a medical lab report analyzer. Extract ALL blood test markers from the report.
Focus on: HbA1c, Blood Glucose, Cholesterol (Total/LDL/HDL), Triglycerides, BP, TSH, T3, T4, Creatinine, eGFR, Uric Acid, Hemoglobin, Iron, Ferritin, Testosterone, LH, FSH, Vitamin D, Vitamin B12, Calcium, Sodium, Potassium.
For each marker that is OUT OF RANGE (high or low), provide:
- The marker name, value, unit, normal range
- Status (high/low/normal)
- Dietary impact (what foods affect this marker)
- Specific food recommendation
- Which health condition it maps to (Diabetic/BP/Cholesterol/Thyroid/Kidney/Anaemia/PCOS or null)
ONLY include markers that are out of range or borderline.
Always add disclaimer about consulting a doctor.
Respond ONLY with JSON, no markdown.`;

    try {
      const imageBlocks = scannedPages.map(data => ({
        type: 'image' as const,
        source: { type: 'base64' as const, media_type: 'image/jpeg' as const, data },
      }));
      const response = await callClaude([{
        role: 'user',
        content: [
          ...imageBlocks,
          {
            type: 'text' as const,
            text: `Analyze these ${scannedPages.length} lab report page(s) and extract out-of-range markers. Return JSON:
{"patient_name":"...or null","report_date":"...or null","markers":[{"name":"HbA1c","value":"7.2","unit":"%","normal_range":"< 5.7%","status":"high","dietary_impact":"High glycemic foods raise HbA1c","recommendation":"Avoid refined carbs, white rice, sugar. Increase fibre, vegetables, whole grains.","health_condition":"Diabetic"}],"summary":"Brief 2-sentence clinical summary","dietary_notes":["Key dietary recommendation 1","Key dietary recommendation 2"]}`,
          },
        ],
      }], systemPrompt);
      const cleaned = response.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned) as LabResult;
      setResult(parsed);
      setScannedPages([]);
      if (parsed.markers.length > 0) setShowConfirm(true);
    } catch (e) {
      setError('Could not analyze the report. Please try clearer images.');
    } finally {
      setScanning(false);
    }
  }

  async function processReport(base64: string, type: 'image' | 'pdf') {
    setScanning(true); setError(''); setResult(null); setSaved(false);

    const systemPrompt = `You are a medical lab report analyzer. Extract ALL blood test markers from the report.
Focus on: HbA1c, Blood Glucose, Cholesterol (Total/LDL/HDL), Triglycerides, BP, TSH, T3, T4, Creatinine, eGFR, Uric Acid, Hemoglobin, Iron, Ferritin, Testosterone, LH, FSH, Vitamin D, Vitamin B12, Calcium, Sodium, Potassium.
For each marker that is OUT OF RANGE (high or low), provide:
- The marker name, value, unit, normal range
- Status (high/low/normal)
- Dietary impact (what foods affect this marker)
- Specific food recommendation
- Which health condition it maps to (Diabetic/BP/Cholesterol/Thyroid/Kidney/Anaemia/PCOS or null)
ONLY include markers that are out of range or borderline.
Always add disclaimer about consulting a doctor.
Respond ONLY with JSON, no markdown.`;

    try {
      const content: any[] = [
        {
          type: type === 'pdf' ? 'document' : 'image',
          source: {
            type: 'base64',
            media_type: type === 'pdf' ? 'application/pdf' : 'image/jpeg',
            data: base64,
          },
        },
        {
          type: 'text',
          text: `Analyze this lab report and extract out-of-range markers. Return JSON:
{"patient_name":"...or null","report_date":"...or null","markers":[{"name":"HbA1c","value":"7.2","unit":"%","normal_range":"< 5.7%","status":"high","dietary_impact":"High glycemic foods raise HbA1c","recommendation":"Avoid refined carbs, white rice, sugar. Increase fibre, vegetables, whole grains.","health_condition":"Diabetic"}],"summary":"Brief 2-sentence clinical summary","dietary_notes":["Key dietary recommendation 1","Key dietary recommendation 2"]}`,
        },
      ];

      const response = await callClaude([{ role: 'user', content }], systemPrompt);
      const cleaned = response.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned) as LabResult;
      setResult(parsed);
      if (parsed.markers.length > 0) setShowConfirm(true);
    } catch (e) {
      setError('Could not analyze the report. Please try a clearer image.');
    } finally {
      setScanning(false);
    }
  }

  // ── Save to dietary profile ───────────────────────────────────────────────

  async function saveToProfile() {
    if (!result) return;
    setSaving(true);
    try {
      const user = await getSessionUser();
      if (!user) return;

      // Get health conditions to add
      const conditionsToAdd = [...new Set(
        result.markers
          .filter(m => m.health_condition && m.status !== 'normal')
          .map(m => m.health_condition!)
      )];

      // Get dietary notes to add
      const dietaryNotes = result.dietary_notes.join(', ');
      const labSummary = result.markers
        .filter(m => m.status !== 'normal')
        .map(m => `${m.name}: ${m.value}${m.unit} (${m.status})`)
        .join(', ');

      // Find or create family member
      let memberId: string | null = null;
      if (memberName) {
        const { data: existingMember } = await supabase
          .from('family_members')
          .select('id, health_notes')
          .eq('user_id', user.id)
          .ilike('name', memberName)
          .maybeSingle();

        if (existingMember) {
          memberId = existingMember.id;
          // Update health notes
          const existingNotes = existingMember.health_notes ?? '';
          const newConditions = conditionsToAdd.filter(c => !existingNotes.includes(c)).join(', ');
          const updatedNotes = [existingNotes, newConditions, `Lab (${result.report_date ?? 'recent'}): ${labSummary}`]
            .filter(Boolean).join(', ');
          await supabase.from('family_members').update({ health_notes: updatedNotes }).eq('id', memberId);
        } else {
          // Create new member entry
          const { data: newMember } = await supabase.from('family_members').insert({
            user_id: user.id,
            name: memberName,
            age: 0,
            health_notes: `${conditionsToAdd.join(', ')}, Lab (${result.report_date ?? 'recent'}): ${labSummary}`,
          }).select('id').single();
          memberId = newMember?.id ?? null;
        }
      }

      setSaved(true);
      setShowConfirm(false);

      // Store reminder for 80 days from report date
      if (result.report_date) {
        const rd = new Date(result.report_date);
        rd.setDate(rd.getDate() + 80);
        setReminder({ memberName: memberName || 'You', dueDate: rd.toISOString().split('T')[0] });
      }
      // Persist reminder to localStorage for home screen
      if (typeof window !== 'undefined' && result.report_date) {
        const rd = new Date(result.report_date);
        rd.setDate(rd.getDate() + 80);
        window.localStorage?.setItem('lab_reminder', JSON.stringify({ memberName: memberName || 'You', dueDate: rd.toISOString().split('T')[0] }));
      }
    } catch (e) {
      setError('Could not save to profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const abnormalMarkers = result?.markers.filter(m => m.status !== 'normal') ?? [];

  return (
    <ScreenWrapper title="Lab Report">
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Upload button + hidden file input */}
        {Platform.OS === 'web' && (
          <input
            ref={fileInputRef as any}
            type="file"
            accept="image/*,application/pdf"
            style={{ display: 'none' }}
            onChange={onFileSelected}
          />
        )}
        <View style={s.actionRow}>
          <TouchableOpacity style={s.scanBtn} onPress={handleFileUpload} disabled={scanning} activeOpacity={0.85}>
            {scanning ? <ActivityIndicator color={white} size="small" /> : <Text style={s.scanBtnTxt}>Upload PDF / Image</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={[s.scanBtn, s.scanBtnSecondary]} onPress={() => setShowManual(true)} disabled={scanning} activeOpacity={0.85}>
            <Text style={[s.scanBtnTxt, { color: navy }]}>Enter Manually</Text>
          </TouchableOpacity>
        </View>

        {showPageReview && (
          <View style={{backgroundColor:'rgba(255,255,255,0.95)',borderRadius:14,padding:16,marginBottom:12,borderWidth:1,borderColor:border}}>
            <Text style={{fontSize:15,fontWeight:'700',color:navy,marginBottom:8}}>{scannedPages.length} page{scannedPages.length > 1 ? 's' : ''} scanned</Text>
            <View style={{flexDirection:'row',gap:10}}>
              <TouchableOpacity style={{flex:1,borderWidth:1.5,borderColor:navy,borderRadius:12,paddingVertical:12,alignItems:'center'}} onPress={handleFileUpload}>
                <Text style={{fontSize:13,fontWeight:'600',color:navy}}>Add Another Page</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{flex:1,backgroundColor:navy,borderRadius:12,paddingVertical:12,alignItems:'center'}} onPress={processAllPages}>
                <Text style={{fontSize:13,fontWeight:'600',color:white}}>Done - Analyse Report</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={{alignItems:'center',paddingTop:8}} onPress={() => { setScannedPages([]); setShowPageReview(false); }}>
              <Text style={{fontSize:12,color:'#9CA3AF'}}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Disclaimer */}
        <View style={s.disclaimer}>
          <Text style={s.disclaimerTxt}>For informational purposes only. Always consult your doctor before making dietary changes based on lab results.</Text>
        </View>

        {reminder && (
          <View style={s.reminderBanner}>
            <Text style={s.reminderTitle}>Lab Retest Reminder</Text>
            <Text style={s.reminderTxt}>{reminder.memberName}'s lab retest is due around {reminder.dueDate}. Schedule a follow-up with your doctor.</Text>
            <TouchableOpacity onPress={() => setReminder(null)} style={s.reminderDismiss}>
              <Text style={s.reminderDismissTxt}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}

        {error ? <Text style={s.errorTxt}>{error}</Text> : null}

        {saved && (
          <View style={s.savedBanner}>
            <Text style={s.savedTxt}>Lab results saved to Dietary Profile — meal plans will now factor these in.</Text>
          </View>
        )}

        {scanning && (
          <View style={s.scanningBox}>
            <ActivityIndicator color={navy} size="large" />
            <Text style={s.scanningTxt}>Maharaj is reading your lab report...</Text>
          </View>
        )}

        {/* Results */}
        {result && !scanning && (
          <View>
            {result.patient_name && (
              <Text style={s.patientName}>{result.patient_name} — {result.report_date ?? 'Recent'}</Text>
            )}

            <Text style={s.summaryTxt}>{result.summary}</Text>

            {abnormalMarkers.length === 0 ? (
              <View style={s.allNormalBox}>
                <Text style={s.allNormalIcon}></Text>
                <Text style={s.allNormalTxt}>All markers are within normal range! Keep up your healthy habits.</Text>
              </View>
            ) : (
              <>
                <Text style={s.sectionTitle}>Out of Range Markers ({abnormalMarkers.length})</Text>
                {abnormalMarkers.map((m, i) => (
                  <View key={i} style={[s.markerCard, m.status === 'high' ? s.markerHigh : s.markerLow]}>
                    <View style={s.markerHeader}>
                      <Text style={s.markerName}>{m.name}</Text>
                      <View style={[s.markerBadge, m.status === 'high' ? s.badgeHigh : s.badgeLow]}>
                        <Text style={s.markerBadgeTxt}>{m.status.toUpperCase()} {m.value}{m.unit}</Text>
                      </View>
                    </View>
                    <Text style={s.markerRange}>Normal: {m.normal_range}</Text>
                    <Text style={s.markerImpact}>{m.dietary_impact}</Text>
                    <Text style={s.markerRec}>{m.recommendation}</Text>
                    {m.health_condition && (
                      <View style={s.conditionTag}>
                        <Text style={s.conditionTagTxt}>→ Added to profile: {m.health_condition}</Text>
                      </View>
                    )}
                  </View>
                ))}

                {result.dietary_notes.length > 0 && (
                  <View style={s.dietaryNotesBox}>
                    <Text style={s.dietaryNotesTitle}>Dietary Recommendations</Text>
                    {result.dietary_notes.map((n, i) => (
                      <Text key={i} style={s.dietaryNote}>• {n}</Text>
                    ))}
                  </View>
                )}

                <TouchableOpacity style={s.saveBtn} onPress={() => setShowConfirm(true)} activeOpacity={0.88}>
                  <Text style={s.saveBtnTxt}>Save to Dietary Profile →</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Manual entry modal */}
      <Modal visible={showManual} animationType="slide" transparent onRequestClose={() => setShowManual(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Enter Lab Results Manually</Text>
            <ScrollView style={{maxHeight:400}} showsVerticalScrollIndicator={false}>
              {manualMarkers.map((m, i) => (
                <View key={i} style={{backgroundColor:'#F9FAFB',borderRadius:12,padding:12,marginBottom:10}}>
                  <Text style={{fontSize:12,fontWeight:'700',color:navy,marginBottom:6}}>Test {i+1}</Text>
                  <View style={{flexDirection:'row',gap:8,marginBottom:6}}>
                    <View style={{flex:2}}>
                      <Input label="Test Name" value={m.name} onChangeText={v=>setManualMarkers(p=>p.map((x,j)=>j===i?{...x,name:v}:x))} placeholder="e.g. HbA1c" />
                    </View>
                    <View style={{flex:1}}>
                      <Input label="Value" value={m.value} onChangeText={v=>setManualMarkers(p=>p.map((x,j)=>j===i?{...x,value:v}:x))} keyboardType="numeric" placeholder="7.2" />
                    </View>
                  </View>
                  <View style={{flexDirection:'row',gap:8}}>
                    <View style={{flex:1}}>
                      <Input label="Unit" value={m.unit} onChangeText={v=>setManualMarkers(p=>p.map((x,j)=>j===i?{...x,unit:v}:x))} placeholder="%" />
                    </View>
                    <View style={{flex:2}}>
                      <Input label="Normal Range" value={m.normal_range} onChangeText={v=>setManualMarkers(p=>p.map((x,j)=>j===i?{...x,normal_range:v}:x))} placeholder="4.0-5.6" />
                    </View>
                  </View>
                  <Input label="Test Date" value={m.test_date} onChangeText={v=>setManualMarkers(p=>p.map((x,j)=>j===i?{...x,test_date:v}:x))} placeholder="YYYY-MM-DD" />
                </View>
              ))}
              <TouchableOpacity style={{alignItems:'center',paddingVertical:10}} onPress={()=>setManualMarkers(p=>[...p,{name:'',value:'',unit:'',normal_range:'',test_date:new Date().toISOString().split('T')[0]}])}>
                <Text style={{fontSize:13,color:navy,fontWeight:'600'}}>+ Add Another Test</Text>
              </TouchableOpacity>
            </ScrollView>
            <Input label="Family Member Name (optional)" value={memberName} onChangeText={setMemberName} placeholder="e.g. Satish" />
            <View style={{gap:10,marginTop:12}}>
              <Button title="Analyse Results" onPress={analyseManualMarkers} />
              <Button title="Cancel" onPress={()=>setShowManual(false)} variant="outline" />
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirm save modal */}
      <Modal visible={showConfirm} animationType="slide" transparent onRequestClose={() => setShowConfirm(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Save to Dietary Profile</Text>
            <Text style={s.modalSub}>
              The following conditions will be added to the dietary profile:{'\n'}
              <Text style={{ fontWeight: '700', color: navy }}>
                {[...new Set(abnormalMarkers.filter(m => m.health_condition).map(m => m.health_condition))].join(', ')}
              </Text>
            </Text>

            <Text style={s.inputLabel}>Whose report is this? (family member name)</Text>
            <View style={s.nameInput}>
              <Text style={s.nameInputHint}>Type name or leave blank for primary user</Text>
            </View>

            <Text style={s.disclaimerSmall}>
              Based on the report from {result?.report_date ?? 'recent date'}, Maharaj has optimized the dietary recommendations. Please ensure your Doctor approves these adjustments.
            </Text>

            <View style={{ gap: 10, marginTop: 16 }}>
              <Button title={saving ? 'Saving...' : 'Confirm — Update Profile'} onPress={saveToProfile} loading={saving} />
              <Button title="Cancel" onPress={() => setShowConfirm(false)} variant="outline" />
            </View>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  scroll:       { padding: 16, paddingBottom: 80 },
  actionRow:    { flexDirection: 'row', gap: 10, marginBottom: 12 },
  scanBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: navy, borderRadius: 14, paddingVertical: 14 },
  scanBtnSecondary: { backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 1.5, borderColor: border },
  scanBtnIcon:  { fontSize: 20 },
  scanBtnTxt:   { fontSize: 14, fontWeight: '700', color: white },
  disclaimer:   { backgroundColor: 'rgba(27,58,92,0.06)', borderRadius: 10, padding: 12, marginBottom: 16 },
  disclaimerTxt:{ fontSize: 12, color: textSec, lineHeight: 18 },
  errorTxt:     { color: errorRed, fontSize: 13, textAlign: 'center', marginBottom: 8 },
  savedBanner:  { backgroundColor: 'rgba(22,163,74,0.1)', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(22,163,74,0.3)' },
  savedTxt:     { fontSize: 13, color: '#166534', fontWeight: '600', lineHeight: 20 },
  scanningBox:  { alignItems: 'center', paddingVertical: 40 },
  scanningTxt:  { fontSize: 14, color: textSec, marginTop: 16, fontStyle: 'italic' },
  patientName:  { fontSize: 16, fontWeight: '700', color: navy, marginBottom: 8 },
  summaryTxt:   { fontSize: 14, color: textSec, lineHeight: 22, marginBottom: 16, fontStyle: 'italic' },
  allNormalBox: { alignItems: 'center', paddingVertical: 32 },
  allNormalIcon:{ fontSize: 48, marginBottom: 12 },
  allNormalTxt: { fontSize: 16, color: '#166534', fontWeight: '600', textAlign: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: navy, marginBottom: 12 },
  markerCard:   { borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1 },
  markerHigh:   { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  markerLow:    { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  markerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  markerName:   { fontSize: 14, fontWeight: '700', color: navy },
  markerBadge:  { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeHigh:    { backgroundColor: '#FEE2E2' },
  badgeLow:     { backgroundColor: '#DBEAFE' },
  markerBadgeTxt:{ fontSize: 11, fontWeight: '700', color: '#1F2937' },
  markerRange:  { fontSize: 12, color: textSec, marginBottom: 4 },
  markerImpact: { fontSize: 13, color: '#374151', marginBottom: 4, lineHeight: 18 },
  markerRec:    { fontSize: 13, color: '#166534', fontWeight: '500', lineHeight: 18 },
  conditionTag: { backgroundColor: 'rgba(27,58,92,0.08)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginTop: 8 },
  conditionTagTxt: { fontSize: 12, color: navy, fontWeight: '600' },
  dietaryNotesBox: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: border },
  dietaryNotesTitle: { fontSize: 14, fontWeight: '700', color: '#166534', marginBottom: 10 },
  dietaryNote:  { fontSize: 13, color: '#374151', lineHeight: 22, marginBottom: 4 },
  saveBtn:      { backgroundColor: navy, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  saveBtnTxt:   { color: white, fontWeight: '700', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox:     { backgroundColor: white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%', maxWidth: '95%', width: '95%', alignSelf: 'center' },
  modalTitle:   { fontSize: 17, fontWeight: '800', color: navy, marginBottom: 8 },
  modalSub:     { fontSize: 14, color: textSec, lineHeight: 22, marginBottom: 16 },
  inputLabel:   { fontSize: 12, fontWeight: '600', color: textSec, marginBottom: 6, textTransform: 'uppercase' },
  nameInput:    { borderWidth: 1.5, borderColor: border, borderRadius: 10, padding: 12, marginBottom: 12 },
  nameInputHint:{ fontSize: 13, color: textSec },
  disclaimerSmall: { fontSize: 11, color: textSec, fontStyle: 'italic', lineHeight: 18 },
  reminderBanner: { backgroundColor: 'rgba(217,119,6,0.1)', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(217,119,6,0.3)' },
  reminderTitle: { fontSize: 14, fontWeight: '700', color: '#92400E', marginBottom: 4 },
  reminderTxt: { fontSize: 13, color: '#78350F', lineHeight: 20 },
  reminderDismiss: { alignSelf: 'flex-end', marginTop: 8 },
  reminderDismissTxt: { fontSize: 12, color: '#92400E', fontWeight: '600' },
});
