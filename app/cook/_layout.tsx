import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';

// Cook session is stored in localStorage (web-only PWA)
function getCookPhone(): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  return window.localStorage.getItem('cook_phone');
}

export default function CookLayout() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const phone = getCookPhone();
    if (!phone) {
      router.replace('/cook' as never);
    }
    setChecking(false);
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F0E8', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#1B3A5C" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="home" />
      <Stack.Screen name="family/[id]" />
      <Stack.Screen name="recipe/[dish]" />
    </Stack>
  );
}
