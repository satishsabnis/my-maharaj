import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import AnimatedLogo from '../components/AnimatedLogo';

export default function Index() {
  const router = useRouter();

  // Staggered fade-in for tagline and buttons
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineY = useRef(new Animated.Value(10)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  const buttonsY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    // Logo animation takes ~800ms (spring), then stagger the rest
    const delay = 700;
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(taglineOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(taglineY, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(buttonsOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(buttonsY, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      {/* Animated logo — slides down with spring bounce */}
      <AnimatedLogo animation="slideDown" width={240} height={150} />

      {/* Tagline — fades in after logo */}
      <Animated.View style={{ opacity: taglineOpacity, transform: [{ translateY: taglineY }] }}>
        <Text style={styles.sub}>मेरा महाराज · माझा महाराज</Text>
      </Animated.View>

      {/* Buttons — fade in last */}
      <Animated.View
        style={[styles.btnGroup, { opacity: buttonsOpacity, transform: [{ translateY: buttonsY }] }]}
      >
        <TouchableOpacity style={styles.btn} onPress={() => router.push('/signup')}>
          <Text style={styles.btnText}>Sign Up</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn2} onPress={() => router.push('/login')}>
          <Text style={styles.btn2Text}>Log In</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1B3A6B', gap: 0 },
  sub: { fontSize: 18, color: '#C9A227', marginTop: 12, marginBottom: 40, textAlign: 'center' },
  btnGroup: { alignItems: 'center', gap: 16, width: '100%', paddingHorizontal: 60 },
  btn: { backgroundColor: '#C9A227', paddingHorizontal: 40, paddingVertical: 14, borderRadius: 30, width: 220, alignItems: 'center' },
  btnText: { color: '#1B3A6B', fontWeight: 'bold', fontSize: 18 },
  btn2: { borderWidth: 2, borderColor: '#FFFFFF', paddingHorizontal: 40, paddingVertical: 14, borderRadius: 30, width: 220, alignItems: 'center' },
  btn2Text: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 18 },
});
