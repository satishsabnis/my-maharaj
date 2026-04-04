import React, { useEffect, useRef } from 'react';
import { Animated, Image, ImageBackground, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

export default function UpgradeSplashScreen() {
  const router = useRouter();
  const barWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barWidth, {
      toValue: 200,
      duration: 3000,
      useNativeDriver: false,
    }).start();

    const timer = setTimeout(() => {
      router.replace('/login?upgraded=true');
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <ImageBackground source={require('../assets/background.png')} style={{flex:1,width:'100%'}} resizeMode="cover">
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          {/* Top section */}
          <Image source={require('../assets/logo.png')} style={s.logo} resizeMode="contain" />
          <Text style={s.title}>My Maharaj</Text>
          <Text style={s.hindi}>{'\u092E\u0947\u0930\u093E \u092E\u0939\u093E\u0930\u093E\u091C'}</Text>
          <View style={s.goldLine} />

          {/* Middle section */}
          <Text style={s.upgradeTitle}>My Maharaj has been upgraded</Text>
          <Text style={s.upgradeBody}>We have made significant improvements to your experience. Please log in again to continue.</Text>
          <View style={s.badge}>
            <Text style={s.badgeText}>Beta</Text>
          </View>

          {/* Bottom section */}
          <View style={s.barTrack}>
            <Animated.View style={[s.barFill, { width: barWidth }]} />
          </View>
          <Text style={s.redirectText}>Taking you to login...</Text>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  logo: { width: 80, height: 80, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '500', color: '#1B3A5C', textAlign: 'center' },
  hindi: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 4 },
  goldLine: { height: 1, width: 60, backgroundColor: '#C9A227', marginVertical: 20, alignSelf: 'center' },
  upgradeTitle: { fontSize: 16, fontWeight: '500', color: '#1B3A5C', textAlign: 'center', marginBottom: 8 },
  upgradeBody: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20, paddingHorizontal: 32 },
  badge: { backgroundColor: '#C9A227', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, marginTop: 16, alignSelf: 'center' },
  badgeText: { fontSize: 11, fontWeight: '500', color: '#1B2A0C' },
  barTrack: { width: 200, height: 3, backgroundColor: 'rgba(27,58,92,0.12)', borderRadius: 2, marginTop: 40, alignSelf: 'center' },
  barFill: { height: 3, backgroundColor: '#C9A227', borderRadius: 2 },
  redirectText: { fontSize: 10, color: '#9CA3AF', textAlign: 'center', marginTop: 8 },
});
