import { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ReferralLandingScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();

  useEffect(() => {
    async function handleRef() {
      if (code) {
        await AsyncStorage.setItem('pending_referral_code', code.toUpperCase().trim());
      }
      router.replace('/signup' as never);
    }
    void handleRef();
  }, [code]);

  return null;
}
