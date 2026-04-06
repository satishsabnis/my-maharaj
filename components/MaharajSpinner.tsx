import React from 'react';
import { Image, Platform, View } from 'react-native';

/**
 * Dual-ring spinner with Maharaj logo.
 * Web: Uses CSS @keyframes — runs on browser compositor thread, CANNOT be interrupted by React re-renders.
 * Native: Uses CSS-in-JS equivalent via transform animations.
 * React.memo + zero props = fully isolated from parent state.
 */
function MaharajSpinnerInner() {
  if (Platform.OS === 'web') {
    // CSS animations — guaranteed infinite, immune to React re-renders
    return (
      <View style={{ width: 140, height: 140, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes maharajSpinCW { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes maharajSpinCCW { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
          .maharaj-ring-outer { animation: maharajSpinCW 1.5s linear infinite !important; }
          .maharaj-ring-inner { animation: maharajSpinCCW 1.2s linear infinite !important; }
        `}} />
        <View
          // @ts-ignore — web-only className
          className="maharaj-ring-outer"
          style={{
            position: 'absolute', width: 140, height: 140, borderRadius: 70,
            borderWidth: 5, borderColor: '#1B3A5C', borderTopColor: 'transparent',
          }}
        />
        <View
          // @ts-ignore — web-only className
          className="maharaj-ring-inner"
          style={{
            position: 'absolute', width: 110, height: 110, borderRadius: 55,
            borderWidth: 5, borderColor: '#C9A227', borderTopColor: 'transparent',
          }}
        />
        <Image
          source={require('../assets/logo.png')}
          style={{ width: 70, height: 70 }}
          resizeMode="contain"
        />
      </View>
    );
  }

  // Native fallback — same visual, uses RN Animated
  const { useEffect, useRef } = require('react');
  const { Animated, Easing } = require('react-native');
  const ringA = useRef(new Animated.Value(0)).current;
  const ringB = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const a = Animated.loop(Animated.timing(ringA, { toValue: 1, duration: 1500, easing: Easing.linear, useNativeDriver: true }), { iterations: -1 });
    const b = Animated.loop(Animated.timing(ringB, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true }), { iterations: -1 });
    a.start(); b.start();
    return () => { a.stop(); b.stop(); };
  }, []);

  const cw = ringA.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const ccw = ringB.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });

  return (
    <View style={{ width: 140, height: 140, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
      <Animated.View style={{ position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 5, borderColor: '#1B3A5C', borderTopColor: 'transparent', transform: [{ rotate: cw }] }} />
      <Animated.View style={{ position: 'absolute', width: 110, height: 110, borderRadius: 55, borderWidth: 5, borderColor: '#C9A227', borderTopColor: 'transparent', transform: [{ rotate: ccw }] }} />
      <Image source={require('../assets/logo.png')} style={{ width: 70, height: 70 }} resizeMode="contain" />
    </View>
  );
}

const MaharajSpinner = React.memo(MaharajSpinnerInner);
export default MaharajSpinner;
