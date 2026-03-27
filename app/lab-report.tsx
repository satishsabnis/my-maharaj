import React, { useState } from 'react';
import {
  ActivityIndicator, Modal, Platform, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import ScreenWrapper from '../components/ScreenWrapper';
import Button from '../components/Button';
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
  const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081';
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

  // ── Scan report ───────────────────────────────────────────────────────────

  async function scanWithCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { setError('Camera permission required.'); return; }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.9, base64: true });
    if (!res.canceled && res.assets[0]) {
      await processReport(res.assets[0].base64 ?? '', 'image');
    }
  }

  async function uploadFile() {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets[0]) {
        // For PDF we send as document, for image as base64
        const asset = res.assets[0];
        if (asset.mimeType?.includes('pdf')) {
          await processReportPDF(asset.uri);
        } else {
          // Convert image file to base64
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64 = (reader.result as string).split(',')[1];
            await processReport(base64, 'image');
          };
          reader.readAsDataURL(blob);
        }
      }
    } catch (e) {
      setError('Could not open file. Please try again.');
    }
  }

  async function processReportPDF(uri: string) {
    setScanning(true); setError('');
    try {
      // Fetch file as base64
      const response = await fetch(uri);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      await processReport(base64, 'pdf');
    } catch (e) {
      setError('Could not read PDF. Please try uploading an image instead.');
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
      const { data: { user } } = await supabase.auth.getUser();
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
    } catch (e) {
      setError('Could not save to profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const abnormalMarkers = result?.markers.filter(m => m.status !== 'normal') ?? [];

  return (
    <ScreenWrapper title="🧪 Lab Report">
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Upload buttons */}
        <View style={s.actionRow}>
          <TouchableOpacity style={s.scanBtn} onPress={scanWithCamera} disabled={scanning} activeOpacity={0.85}>
            {scanning ? <ActivityIndicator color={white} size="small" /> : <Text style={s.scanBtnIcon}>📷</Text>}
            <Text style={s.scanBtnTxt}>Scan Report</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.scanBtn, s.scanBtnSecondary]} onPress={uploadFile} disabled={scanning} activeOpacity={0.85}>
            <Text style={s.scanBtnIcon}>📄</Text>
            <Text style={[s.scanBtnTxt, { color: navy }]}>Upload PDF/Image</Text>
          </TouchableOpacity>
        </View>

        {/* Disclaimer */}
        <View style={s.disclaimer}>
          <Text style={s.disclaimerTxt}>⚕️ For informational purposes only. Always consult your doctor before making dietary changes based on lab results.</Text>
        </View>

        {error ? <Text style={s.errorTxt}>{error}</Text> : null}

        {saved && (
          <View style={s.savedBanner}>
            <Text style={s.savedTxt}>✅ Lab results saved to Dietary Profile — meal plans will now factor these in.</Text>
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
                <Text style={s.allNormalIcon}>✅</Text>
                <Text style={s.allNormalTxt}>All markers are within normal range! Keep up your healthy habits.</Text>
              </View>
            ) : (
              <>
                <Text style={s.sectionTitle}>⚠️ Out of Range Markers ({abnormalMarkers.length})</Text>
                {abnormalMarkers.map((m, i) => (
                  <View key={i} style={[s.markerCard, m.status === 'high' ? s.markerHigh : s.markerLow]}>
                    <View style={s.markerHeader}>
                      <Text style={s.markerName}>{m.name}</Text>
                      <View style={[s.markerBadge, m.status === 'high' ? s.badgeHigh : s.badgeLow]}>
                        <Text style={s.markerBadgeTxt}>{m.status.toUpperCase()} {m.value}{m.unit}</Text>
                      </View>
                    </View>
                    <Text style={s.markerRange}>Normal: {m.normal_range}</Text>
                    <Text style={s.markerImpact}>🍽️ {m.dietary_impact}</Text>
                    <Text style={s.markerRec}>💡 {m.recommendation}</Text>
                    {m.health_condition && (
                      <View style={s.conditionTag}>
                        <Text style={s.conditionTagTxt}>→ Added to profile: {m.health_condition}</Text>
                      </View>
                    )}
                  </View>
                ))}

                {result.dietary_notes.length > 0 && (
                  <View style={s.dietaryNotesBox}>
                    <Text style={s.dietaryNotesTitle}>🥗 Dietary Recommendations</Text>
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
  scroll:       { padding: 16, paddingBottom: 48 },
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
  modalBox:     { backgroundColor: white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
  modalTitle:   { fontSize: 17, fontWeight: '800', color: navy, marginBottom: 8 },
  modalSub:     { fontSize: 14, color: textSec, lineHeight: 22, marginBottom: 16 },
  inputLabel:   { fontSize: 12, fontWeight: '600', color: textSec, marginBottom: 6, textTransform: 'uppercase' },
  nameInput:    { borderWidth: 1.5, borderColor: border, borderRadius: 10, padding: 12, marginBottom: 12 },
  nameInputHint:{ fontSize: 13, color: textSec },
  disclaimerSmall: { fontSize: 11, color: textSec, fontStyle: 'italic', lineHeight: 18 },
});
