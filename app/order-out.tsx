import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import ScreenWrapper from '../components/ScreenWrapper';
import { navy, white, textSec } from '../theme/colors';

const APPS = ['Amazon','Barakat','Careem','Deliveroo','elGrocer','Fresh to Home','Instashop','Keeta','Noon','Smiles','Talabat'];

export default function OrderOutScreen() {
  const rows: string[][] = [];
  for (let i = 0; i < APPS.length; i += 2) rows.push(APPS.slice(i, i + 2));

  return (
    <ScreenWrapper title="Order Out" onBack={() => router.back()}>
      <ScrollView contentContainerStyle={{padding:16,paddingBottom:40}} showsVerticalScrollIndicator={false}>

        <Text style={{fontSize:20,fontWeight:'800',color:navy,marginBottom:12}}>Where would you like to order from?</Text>

        {/* Banner 1: Integration */}
        <View style={{flexDirection:'row',gap:8,alignItems:'flex-start',backgroundColor:'rgba(201,162,39,0.12)',borderRadius:12,padding:14,marginBottom:12,borderWidth:1,borderColor:'rgba(201,162,39,0.3)',width:'100%'}}>
          <Text style={{fontSize:14}}>🔗</Text>
          <Text style={{flex:1,fontSize:12,color:'#78350F',lineHeight:18}}>Direct ordering integration coming soon — we are working with these platforms to enable one-tap ordering from your meal plan</Text>
        </View>

        {/* Banner 2: Smart shopping */}
        <View style={{backgroundColor:navy,borderRadius:12,padding:14,marginBottom:16,width:'100%'}}>
          <Text style={{fontSize:12,fontWeight:'600',color:white,lineHeight:18}}>Coming soon. Maharaj is learning the art of smart shopping. Soon, he will compare prices across prominent stores in your area — finding you the best deals, seasonal offers and bulk savings before you step into the store.</Text>
        </View>

        {/* 2-column pill grid */}
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:10,width:'100%'}}>
          {APPS.map(name => (
            <View key={name} style={{flexGrow:1,flexBasis:'45%',minWidth:0,backgroundColor:'rgba(27,58,92,0.06)',borderWidth:1,borderColor:'rgba(27,58,92,0.2)',borderRadius:20,paddingHorizontal:16,paddingVertical:10,alignItems:'center'}}>
              <Text style={{fontSize:13,fontWeight:'600',color:navy}}>{name}</Text>
            </View>
          ))}
        </View>

        {/* Disclaimer */}
        <Text style={{fontSize:10,color:'#9CA3AF',textAlign:'center',paddingVertical:12,lineHeight:14,width:'100%'}}>App names and trademarks belong to their respective owners. My Maharaj is not affiliated with any of these services.</Text>

        {/* Buttons - stacked vertically */}
        <TouchableOpacity style={{width:'100%',borderWidth:1.5,borderColor:navy,borderRadius:12,paddingVertical:14,alignItems:'center',marginBottom:10}} onPress={() => router.back()}>
          <Text style={{fontSize:15,fontWeight:'700',color:navy}}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{width:'100%',backgroundColor:navy,borderRadius:12,paddingVertical:14,alignItems:'center'}} onPress={() => router.push('/home' as never)}>
          <Text style={{fontSize:15,fontWeight:'700',color:white}}>Back to Home</Text>
        </TouchableOpacity>

      </ScrollView>
    </ScreenWrapper>
  );
}
