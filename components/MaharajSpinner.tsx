import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, View } from 'react-native';

/**
 * Isolated dual-ring spinner with Maharaj logo.
 * Animation runs on mount, stops only on unmount.
 * Receives NO props that change during generation — prevents re-render interruption.
 */
export default function MaharajSpinner() {
  // useRef for animation values — survives re-renders
  const ringA = useRef(new Animated.Value(0)).current;
  const ringB = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  // Start on mount, stop only on unmount — empty [] dependency
  useEffect(() => {
    const spinA = Animated.loop(
      Animated.timing(ringA, { toValue: 1, duration: 2500, easing: Easing.linear, useNativeDriver: true }),
      { iterations: -1 }
    );
    const spinB = Animated.loop(
      Animated.timing(ringB, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true }),
      { iterations: -1 }
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.6, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.0, duration: 800, useNativeDriver: true }),
      ]),
      { iterations: -1 }
    );

    spinA.start();
    spinB.start();
    pulseLoop.start();

    // ONLY stop on unmount — never during generation
    return () => {
      spinA.stop();
      spinB.stop();
      pulseLoop.stop();
    };
  }, []); // Empty deps — runs once, never re-runs

  const rotateCW = ringA.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const rotateCCW = ringB.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] });

  return (
    <View style={{ width: 140, height: 140, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
      {/* Navy ring — clockwise */}
      <Animated.View style={{
        position: 'absolute', width: 140, height: 140, borderRadius: 70,
        borderWidth: 4, borderColor: 'transparent',
        borderTopColor: '#1B3A5C', borderBottomColor: '#1B3A5C',
        transform: [{ rotate: rotateCW }],
      }} />
      {/* Gold ring — counter-clockwise */}
      <Animated.View style={{
        position: 'absolute', width: 120, height: 120, borderRadius: 60,
        borderWidth: 4, borderColor: 'transparent',
        borderTopColor: '#C9A227', borderBottomColor: '#C9A227',
        transform: [{ rotate: rotateCCW }],
      }} />
      {/* Logo — pulsing */}
      <Animated.Image
        source={require('../assets/logo.png')}
        style={{ width: 80, height: 80, resizeMode: 'contain', opacity: pulse }}
      />
    </View>
  );
}
