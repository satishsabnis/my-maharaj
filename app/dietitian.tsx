import React, { useEffect } from 'react';
import { ActivityIndicator, ImageBackground, View } from 'react-native';
import { router } from 'expo-router';
import { supabase, getSessionUser } from '../lib/supabase';

const NAVY = '#2E5480';

export default function DietitianEntryScreen() {
  useEffect(() => {
    (async () => {
      const user = await getSessionUser();
      if (!user) {
        router.replace('/login');
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      if (profile?.role === 'dietitian') {
        router.replace('/dietitian-dashboard' as never);
      } else {
        router.replace('/home');
      }
    })();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <ImageBackground
        source={require('../assets/background.png')}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
        resizeMode="cover"
      />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={NAVY} />
      </View>
    </View>
  );
}
