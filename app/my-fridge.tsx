import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, Platform, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import ScreenWrapper from '../components/ScreenWrapper';
import Button from '../components/Button';
import Input from '../components/Input';
import { navy, gold, white, textSec, border, errorRed, successGreen } from '../theme/colors';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FridgeItem {
  id: string;
  item_name: string;
  quantity: string | null;
  unit: string | null;
  store: string | null;
  buy_date: string | null;
  updated_at: string;
}

interface ParsedItem {
  item_name: string;
  quantity: string;
  unit: string;
  store: string;
}

// ─── Claude API helper ────────────────────────────────────────────────────────

async function callClaude(messages: any[], systemPrompt?: string): Promise<string> {
  const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081';
  const res = await fetch(`${base}/api/claude`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: systemPrompt,
      messages,
    }),
  });
  const data = await res.json();
  return data?.content?.[0]?.text ?? '';
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MyFridgeScreen() {
  const [items,        setItems]        = useState<FridgeItem[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [scanning,     setScanning]     = useState(false);
  const [scanResult,   setScanResult]   = useState<ParsedItem[]>([]);
  const [showScanModal,setShowScanModal]= useState(false);
  const [editItem,     setEditItem]     = useState<FridgeItem | null>(null);
  const [showEditModal,setShowEditModal]= useState(false);
  const [storeName,    setStoreName]    = useState('');
  const [error,        setError]        = useState('');
  const [success,      setSuccess]      = useState('');
  const [showManual,   setShowManual]   = useState(false);
  const [showSmartBanner, setShowSmartBanner] = useState(true);
  const [manualItem,   setManualItem]   = useState({ item_name:'', quantity:'', unit:'', store:'', buy_date: new Date().toISOString().split('T')[0] });
  const [scannedPages, setScannedPages] = useState<string[]>([]);
  const [showPageReview, setShowPageReview] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from('fridge_inventory')
      .select('*')
      .eq('user_id', user.id)
      .order('item_name');
    setItems((data as FridgeItem[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, []);

  // ── Scan bill ─────────────────────────────────────────────────────────────

  async function saveManualItem() {
    if (!manualItem.item_name.trim()) { setError('Please enter an item name.'); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: existing } = await supabase.from('fridge_inventory').select('id, quantity')
      .eq('user_id', user.id).eq('item_name', manualItem.item_name).maybeSingle();
    if (existing) {
      const newQty = (parseFloat(existing.quantity ?? '0') || 0) + (parseFloat(manualItem.quantity) || 0);
      await supabase.from('fridge_inventory').update({ quantity: String(newQty), unit: manualItem.unit, store: manualItem.store, buy_date: manualItem.buy_date, updated_at: new Date().toISOString() }).eq('id', existing.id);
    } else {
      await supabase.from('fridge_inventory').insert({ user_id: user.id, ...manualItem });
    }
    setManualItem({ item_name:'', quantity:'', unit:'', store:'', buy_date: new Date().toISOString().split('T')[0] });
    setShowManual(false);
    setSuccess('Item added to fridge!');
    setTimeout(() => setSuccess(''), 3000);
    await load();
  }

  async function scanPage() {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { setError('Camera permission required.'); return; }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        base64: true,
      });
      if (!result.canceled && result.assets[0] && result.assets[0].base64) {
        setScannedPages(prev => [...prev, result.assets[0].base64!]);
        setShowPageReview(true);
      }
    } catch {
      setError('Camera not available. Try uploading a photo instead.');
    }
  }

  async function processAllPages() {
    if (scannedPages.length === 0) return;
    setScanning(true);
    setError('');
    setShowPageReview(false);
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
            text: `You are a grocery bill scanner. Extract ALL food and grocery items from these ${scannedPages.length} bill page(s).
For each item, identify: item name, quantity (number), unit (kg/g/L/ml/pcs/pack), and store name if visible.
Respond ONLY with valid JSON array, no markdown:
[{"item_name":"Basmati Rice","quantity":"2","unit":"kg","store":"Carrefour"}]
If store name not visible, use "Unknown Store". Extract every food item you can see across all pages.`,
          },
        ],
      }]);
      const cleaned = response.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned) as ParsedItem[];
      setScanResult(parsed);
      setStoreName(parsed[0]?.store ?? '');
      setScannedPages([]);
      setShowScanModal(true);
    } catch (e) {
      setError('Could not read the bill. Please try a clearer photo.');
    } finally {
      setScanning(false);
    }
  }

  async function confirmScan() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];

    for (const item of scanResult) {
      const store = storeName || item.store || 'Unknown Store';
      // Check if item already exists
      const { data: existing } = await supabase
        .from('fridge_inventory')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('item_name', item.item_name)
        .maybeSingle();

      if (existing) {
        // Add to existing quantity
        const existingQty = parseFloat(existing.quantity ?? '0') || 0;
        const newQty = existingQty + (parseFloat(item.quantity) || 0);
        await supabase.from('fridge_inventory').update({
          quantity: String(newQty),
          unit: item.unit,
          store,
          buy_date: today,
          updated_at: new Date().toISOString(),
        }).eq('id', existing.id);
      } else {
        await supabase.from('fridge_inventory').insert({
          user_id: user.id,
          item_name: item.item_name,
          quantity: item.quantity,
          unit: item.unit,
          store,
          buy_date: today,
        });
      }
    }

    setShowScanModal(false);
    setScanResult([]);
    setSuccess(`${scanResult.length} items updated in your fridge!`);
    setTimeout(() => setSuccess(''), 3000);
    await load();
  }

  async function deleteItem(id: string) {
    await supabase.from('fridge_inventory').delete().eq('id', id);
    await load();
  }

  async function saveEdit() {
    if (!editItem) return;
    await supabase.from('fridge_inventory').update({
      quantity: editItem.quantity,
      unit: editItem.unit,
      store: editItem.store,
      buy_date: editItem.buy_date,
      updated_at: new Date().toISOString(),
    }).eq('id', editItem.id);
    setShowEditModal(false);
    setEditItem(null);
    await load();
  }

  function formatDate(d: string | null): string {
    if (!d) return '—';
    const dt = new Date(d);
    return `${dt.getDate()}/${dt.getMonth() + 1}/${dt.getFullYear()}`;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ScreenWrapper title="My Fridge">
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Action buttons */}
        <View style={s.actionRow}>
          <TouchableOpacity style={s.scanBtn} onPress={scanPage} disabled={scanning} activeOpacity={0.85}>
            {scanning ? <ActivityIndicator color={white} size="small" /> : null}
            <Text style={s.scanBtnTxt}>Scan Bill</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.scanBtn, s.scanBtnSecondary]} onPress={() => setShowManual(true)} activeOpacity={0.85}>
            <Text style={[s.scanBtnTxt, { color: navy }]}>Add Manually</Text>
          </TouchableOpacity>
        </View>

        {showPageReview && (
          <View style={{backgroundColor:'rgba(255,255,255,0.95)',borderRadius:14,padding:16,marginBottom:12,borderWidth:1,borderColor:border}}>
            <Text style={{fontSize:15,fontWeight:'700',color:navy,marginBottom:8}}>{scannedPages.length} page{scannedPages.length > 1 ? 's' : ''} scanned</Text>
            <View style={{flexDirection:'row',gap:10}}>
              <TouchableOpacity style={{flex:1,backgroundColor:navy,borderRadius:12,paddingVertical:12,alignItems:'center'}} onPress={scanPage}>
                <Text style={{fontSize:13,fontWeight:'600',color:white}}>Scan Another Page</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{flex:1,backgroundColor:'#16A34A',borderRadius:12,paddingVertical:12,alignItems:'center'}} onPress={processAllPages}>
                <Text style={{fontSize:13,fontWeight:'600',color:white}}>Done - Process Bill</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={{alignItems:'center',paddingTop:8}} onPress={() => { setScannedPages([]); setShowPageReview(false); }}>
              <Text style={{fontSize:12,color:'#9CA3AF'}}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Smart fridge note */}
        {showSmartBanner && (
          <View style={s.smartFridgeBanner}>
            <Text style={[s.smartFridgeTxt, {flex:1}]}>Smart fridge integration coming soon — auto-sync with Samsung Family Hub & LG ThinQ</Text>
            <TouchableOpacity onPress={() => setShowSmartBanner(false)} style={{padding:4}}>
              <Text style={{fontSize:14,color:'#92400E',fontWeight:'700'}}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {error ? <Text style={s.errorTxt}>{error}</Text> : null}
        {success ? <Text style={s.successTxt}>{success}</Text> : null}

        {/* Inventory table */}
        {loading ? (
          <ActivityIndicator color={navy} style={{ marginTop: 40 }} />
        ) : items.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}></Text>
            <Text style={s.emptyTitle}>Your fridge is empty</Text>
            <Text style={s.emptySub}>Scan a grocery bill to start tracking your inventory</Text>
          </View>
        ) : (
          <View style={s.table}>
            {/* Table header */}
            <View style={[s.tableRow, s.tableHeader]}>
              <Text style={[s.tableCell, s.tableCellItem, s.headerTxt]}>Item</Text>
              <Text style={[s.tableCell, s.tableCellQty, s.headerTxt]}>Qty</Text>
              <Text style={[s.tableCell, s.tableCellStore, s.headerTxt]}>Store</Text>
              <Text style={[s.tableCell, s.tableCellDate, s.headerTxt]}>Date</Text>
              <Text style={[s.tableCell, s.tableCellAction, s.headerTxt]}></Text>
            </View>

            {items.map((item, idx) => (
              <TouchableOpacity
                key={item.id}
                style={[s.tableRow, idx % 2 === 0 ? s.rowEven : s.rowOdd]}
                onPress={() => { setEditItem(item); setShowEditModal(true); }}
                activeOpacity={0.8}
              >
                <Text style={[s.tableCell, s.tableCellItem, s.itemTxt]} numberOfLines={2}>{item.item_name}</Text>
                <Text style={[s.tableCell, s.tableCellQty, s.qtyTxt]}>{item.quantity ?? '—'}{item.unit ? ' ' + item.unit : ''}</Text>
                <Text style={[s.tableCell, s.tableCellStore, s.storeTxt]} numberOfLines={1}>{item.store ?? '—'}</Text>
                <Text style={[s.tableCell, s.tableCellDate, s.dateTxt]}>{formatDate(item.buy_date)}</Text>
                <TouchableOpacity style={s.tableCellAction} onPress={() => deleteItem(item.id)}>
                  <Text style={s.deleteTxt}>✕</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Manual entry modal */}
      <Modal visible={showManual} animationType="slide" transparent onRequestClose={() => setShowManual(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Add Item Manually</Text>
            <Input label="Item Name" value={manualItem.item_name} onChangeText={v => setManualItem(p => ({...p, item_name: v}))} placeholder="e.g. Basmati Rice" />
            <View style={{flexDirection:'row', gap:10}}>
              <View style={{flex:1}}>
                <Input label="Quantity" value={manualItem.quantity} onChangeText={v => setManualItem(p => ({...p, quantity: v}))} keyboardType="numeric" placeholder="2" />
              </View>
              <View style={{flex:1}}>
                <Input label="Unit" value={manualItem.unit} onChangeText={v => setManualItem(p => ({...p, unit: v}))} placeholder="kg, L, pcs..." />
              </View>
            </View>
            <Input label="Store" value={manualItem.store} onChangeText={v => setManualItem(p => ({...p, store: v}))} placeholder="Carrefour, Spinneys..." />
            <Input label="Buy Date" value={manualItem.buy_date} onChangeText={v => setManualItem(p => ({...p, buy_date: v}))} placeholder="YYYY-MM-DD" />
            <View style={{gap:10, marginTop:16}}>
              <Button title="Add to Fridge" onPress={saveManualItem} />
              <Button title="Cancel" onPress={() => setShowManual(false)} variant="outline" />
            </View>
          </View>
        </View>
      </Modal>

      {/* Scan result modal */}
      <Modal visible={showScanModal} animationType="slide" transparent onRequestClose={() => setShowScanModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Bill Scanned — {scanResult.length} items found</Text>

            <Input
              label="Store Name"
              value={storeName}
              onChangeText={setStoreName}
              placeholder="e.g. Carrefour, Spinneys, Lulu"
            />

            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {scanResult.map((item, i) => (
                <View key={i} style={s.scanItem}>
                  <Text style={s.scanItemName}>{item.item_name}</Text>
                  <Text style={s.scanItemQty}>{item.quantity} {item.unit}</Text>
                </View>
              ))}
            </ScrollView>

            <View style={{ gap: 10, marginTop: 16 }}>
              <Button title="✓ Add to My Fridge" onPress={confirmScan} />
              <Button title="Cancel" onPress={() => { setShowScanModal(false); setScanResult([]); }} variant="outline" />
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit item modal */}
      <Modal visible={showEditModal} animationType="slide" transparent onRequestClose={() => setShowEditModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Edit: {editItem?.item_name}</Text>
            <Input label="Quantity" value={editItem?.quantity ?? ''} onChangeText={(v) => setEditItem((p) => p ? { ...p, quantity: v } : p)} keyboardType="numeric" />
            <Input label="Unit" value={editItem?.unit ?? ''} onChangeText={(v) => setEditItem((p) => p ? { ...p, unit: v } : p)} placeholder="kg, g, L, pcs..." />
            <Input label="Store" value={editItem?.store ?? ''} onChangeText={(v) => setEditItem((p) => p ? { ...p, store: v } : p)} />
            <View style={{ gap: 10, marginTop: 16 }}>
              <Button title="Save Changes" onPress={saveEdit} />
              <Button title="Cancel" onPress={() => { setShowEditModal(false); setEditItem(null); }} variant="outline" />
            </View>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  scroll:      { padding: 16, paddingBottom: 48 },
  actionRow:   { flexDirection: 'row', gap: 10, marginBottom: 12 },
  scanBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: navy, borderRadius: 14, paddingVertical: 14 },
  scanBtnSecondary: { backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 1.5, borderColor: border },
  scanBtnIcon: { fontSize: 20 },
  scanBtnTxt:  { fontSize: 14, fontWeight: '700', color: white },
  smartFridgeBanner: { flexDirection: 'row', gap: 10, backgroundColor: 'rgba(201,162,39,0.12)', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(201,162,39,0.3)' },
  smartFridgeIcon: { fontSize: 18 },
  smartFridgeTxt:  { flex: 1, fontSize: 12, color: '#78350F', lineHeight: 18 },
  errorTxt:    { color: errorRed, fontSize: 13, textAlign: 'center', marginBottom: 8 },
  successTxt:  { color: successGreen, fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  emptyState:  { alignItems: 'center', paddingVertical: 60 },
  emptyIcon:   { fontSize: 56, marginBottom: 16 },
  emptyTitle:  { fontSize: 18, fontWeight: '700', color: navy, marginBottom: 8 },
  emptySub:    { fontSize: 14, color: textSec, textAlign: 'center' },

  table:        { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: border },
  tableRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8 },
  tableHeader:  { backgroundColor: navy, paddingVertical: 12 },
  rowEven:      { backgroundColor: 'rgba(255,255,255,0.9)' },
  rowOdd:       { backgroundColor: 'rgba(232,248,240,0.6)' },
  tableCell:    { paddingHorizontal: 4 },
  tableCellItem:{ flex: 3 },
  tableCellQty: { flex: 2 },
  tableCellStore:{ flex: 2 },
  tableCellDate:{ flex: 2 },
  tableCellAction:{ width: 28, alignItems: 'center' },
  headerTxt:   { fontSize: 11, fontWeight: '700', color: white, textTransform: 'uppercase', letterSpacing: 0.4 },
  itemTxt:     { fontSize: 13, fontWeight: '600', color: navy },
  qtyTxt:      { fontSize: 13, color: '#1A6B5C', fontWeight: '600' },
  storeTxt:    { fontSize: 12, color: textSec },
  dateTxt:     { fontSize: 12, color: textSec },
  deleteTxt:   { fontSize: 14, color: errorRed, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox:     { backgroundColor: white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  modalTitle:   { fontSize: 17, fontWeight: '800', color: navy, marginBottom: 16 },
  scanItem:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: border },
  scanItemName: { fontSize: 14, color: navy, fontWeight: '500', flex: 1 },
  scanItemQty:  { fontSize: 14, color: '#1A6B5C', fontWeight: '600' },
});
