import React, { useEffect } from 'react';
import { Image, Platform, View } from 'react-native';

/**
 * Single gold ring spinner with Maharaj logo.
 * Web: CSS @keyframes injected into document.head — compositor thread, immune to React re-renders.
 * Native: Animated fallback.
 * React.memo + zero props = fully isolated.
 */
function MaharajSpinnerInner() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    if (document.getElementById('maharaj-spinner-styles')) return;
    const styleEl = document.createElement('style');
    styleEl.id = 'maharaj-spinner-styles';
    styleEl.textContent = `
      @keyframes maharajSpin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .maharaj-ring-outer {
        animation: maharajSpin 1.5s linear infinite !important;
        width: 140px;
        height: 140px;
        border-radius: 50%;
        border: 6px solid #C9A227;
        border-top-color: transparent;
        position: absolute;
        box-sizing: border-box;
      }
    `;
    document.head.appendChild(styleEl);
    return () => { try { document.head.removeChild(styleEl); } catch {} };
  }, []);

  if (Platform.OS === 'web') {
    return (
      <View style={{ width: 140, height: 140, alignItems: 'center', justifyContent: 'center', marginBottom: 16, backgroundColor: 'transparent' }}>
        {/* @ts-ignore — web-only className */}
        <div className="maharaj-ring-outer" />
        <Image source={require('../assets/logo.png')} style={{ width: 70, height: 70, backgroundColor: 'transparent' }} resizeMode="contain" />
      </View>
    );
  }

  // Native fallback
  const { useRef } = require('react');
  const { Animated, Easing } = require('react-native');
  const ring = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.timing(ring, { toValue: 1, duration: 1500, easing: Easing.linear, useNativeDriver: true }), { iterations: -1 });
    a.start();
    return () => a.stop();
  }, []);
  const rot = ring.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <View style={{ width: 140, height: 140, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
      <Animated.View style={{ position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 6, borderColor: '#C9A227', borderTopColor: 'transparent', transform: [{ rotate: rot }] }} />
      <Image source={require('../assets/logo.png')} style={{ width: 70, height: 70 }} resizeMode="contain" />
    </View>
  );
}

const MaharajSpinner = React.memo(MaharajSpinnerInner);
export default MaharajSpinner;
