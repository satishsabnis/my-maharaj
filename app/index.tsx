import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

const LogoImg = require('../assets/logo.png');

export default function Index() {
  const router = useRouter();

  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  const buttonsY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(taglineOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(buttonsOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(buttonsY, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <View style={s.container}>
      <Image
        source={LogoImg}
        style={{
          width: 340,
          height: 240,
          resizeMode: 'contain',
          backgroundColor: 'transparent',
        }}
      />

      <Animated.Text style={[s.tagline, { opacity: taglineOpacity }]}>
        मेरा महाराज · माझा महाराज
      </Animated.Text>
      <Text style={s.subTagline}>Your personal kitchen planner · Indian regional cuisine · Dubai crafted</Text>

      <Animated.View style={[s.btnGroup, { opacity: buttonsOpacity, transform: [{ translateY: buttonsY }] }]}>
        <TouchableOpacity style={s.signUpBtn} onPress={() => router.push('/signup')} activeOpacity={0.85}>
          <Text style={s.signUpBtnText}>Sign Up</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.loginBtn} onPress={() => router.push('/login')} activeOpacity={0.85}>
          <Text style={s.loginBtnText}>Log In</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 0,
  },
  tagline: {
    fontSize: 18,
    color: '#C9A227',
    marginTop: 4,
    marginBottom: 0,
    textAlign: 'center',
    fontWeight: '500',
  },
  subTagline: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 48,
  },
  btnGroup: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  signUpBtn: {
    backgroundColor: '#C9A227',
    width: 240,
    paddingVertical: 16,
    borderRadius: 32,
    alignItems: 'center',
  },
  signUpBtnText: {
    color: '#1B3A6B',
    fontWeight: '800',
    fontSize: 17,
    letterSpacing: 0.3,
  },
  loginBtn: {
    borderWidth: 2,
    borderColor: '#1B3A6B',
    width: 240,
    paddingVertical: 15,
    borderRadius: 32,
    alignItems: 'center',
  },
  loginBtnText: {
    color: '#1B3A6B',
    fontWeight: '700',
    fontSize: 17,
    letterSpacing: 0.3,
  },
});
