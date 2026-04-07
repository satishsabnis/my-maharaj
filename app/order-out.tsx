import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { supabase, getSessionUser } from '../lib/supabase';
import ScreenWrapper from '../components/ScreenWrapper';
import { navy, white, textSec } from '../theme/colors';

const DELIVERY_APPS = [
  { name: 'Talabat',    emoji: '\uD83D\uDFE0' },
  { name: 'Deliveroo',  emoji: '\uD83D\uDD35' },
  { name: 'Noon Food',  emoji: '\uD83D\uDD34' },
  { name: 'Careem Food', emoji: '\uD83D\uDFE2' },
];

function buildDietaryNotes(members: any[]): string {
  const notes: string[] = [];
  const hasJain = members.some((m: any) => (m.health_notes ?? '').toLowerCase().includes('jain'));
  const hasDiabetic = members.some((m: any) => (m.health_notes ?? '').toLowerCase().includes('diabet'));
  const hasLowSodium = members.some((m: any) => { const h = (m.health_notes ?? '').toLowerCase(); return h.includes('sodium') || h.includes('hypertension') || h.includes('blood pressure'); });
  const hasVeg = members.some((m: any) => (m.health_notes ?? '').toLowerCase().includes('vegetarian'));
  if (hasJain) notes.push('Jain food — no onion, no garlic, no root vegetables');
  if (hasDiabetic) notes.push('Diabetic-friendly — low sugar, no refined carbs');
  if (hasLowSodium) notes.push('Low sodium for one family member');
  if (hasVeg) notes.push('Vegetarian preferred');
  return notes.length > 0 ? notes.join('. ') + '.' : 'No specific dietary restrictions.';
}

export default function OrderOutScreen() {
  const [members, setMembers] = useState<any[]>([]);
  const [dietaryNotes, setDietaryNotes] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const user = await getSessionUser();
        if (!user) { setDietaryNotes('No dietary restrictions on file.'); return; }
        const { data } = await supabase.from('family_members').select('name, age, health_notes').eq('user_id', user.id);
        const mems = data ?? [];
        setMembers(mems);
        setDietaryNotes(mems.length > 0 ? buildDietaryNotes(mems) : 'No dietary restrictions on file.');
      } catch {
        setDietaryNotes('No dietary restrictions on file.');
      }
    }
    void load();
  }, []);

  return (
    <ScreenWrapper title="Order Out" onBack={() => router.back()}>
      <ScrollView contentContainerStyle={{padding:16,paddingBottom:24}} showsVerticalScrollIndicator={false}>

        {/* Coming Soon Banner */}
        <View style={{backgroundColor:'#2E5480',borderRadius:12,padding:14,marginBottom:12}}>
          <Text style={{fontSize:10,fontWeight:'500',color:white,textAlign:'center'}}>Maharaj is learning and will connect you soon</Text>
          <Text style={{fontSize:9,color:'rgba(255,255,255,0.6)',textAlign:'center',marginTop:3}}>Maharaj will soon suggest restaurants matching your family's dietary needs and cuisine preferences.</Text>
        </View>

        <Text style={{fontSize:20,fontWeight:'800',color:navy,marginBottom:12}}>Where would you like to order from?</Text>

        {/* 2x2 Delivery App Grid */}
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:10,marginBottom:16}}>
          {DELIVERY_APPS.map(app => (
            <TouchableOpacity key={app.name} style={{flexGrow:1,flexBasis:'45%',backgroundColor:'rgba(255,255,255,0.92)',borderRadius:10,borderWidth:0.5,borderColor:'rgba(27,58,92,0.15)',padding:12,alignItems:'center'}} onPress={() => Alert.alert('Coming Soon', 'Maharaj is learning and will connect you soon')}>
              <Text style={{fontSize:10,fontWeight:'500',color:navy}}>{app.name}</Text>
              <Text style={{fontSize:8,color:'#6B7280',marginTop:3}}>Coming soon</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Dietary Notes Card */}
        <View style={{backgroundColor:'rgba(255,255,255,0.92)',borderRadius:10,padding:10,borderWidth:0.5,borderColor:'rgba(27,58,92,0.15)',marginBottom:16}}>
          <Text style={{fontSize:10,fontWeight:'700',color:navy,marginBottom:4}}>Show this to the restaurant:</Text>
          <Text style={{fontSize:10,color:'#374151',lineHeight:16}}>{dietaryNotes}</Text>
          <Text style={{fontSize:8,color:'#9CA3AF',marginTop:4}}>Copy and paste this when ordering</Text>
        </View>

        {/* Disclaimer */}
        <Text style={{fontSize:10,color:'#9CA3AF',textAlign:'center',paddingVertical:12,lineHeight:14}}>App names and trademarks belong to their respective owners. My Maharaj is not affiliated with any of these services.</Text>
      </ScrollView>
    </ScreenWrapper>
  );
}
