import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Animated } from 'react-native';

const LogoSource = require('../assets/logo.png');

// ─── Public API (used via ref) ─────────────────────────────────────────────────

export interface AnimatedLogoRef {
  start: () => void;
  stop: () => void;
  playSuccess: (onComplete?: () => void) => void;
}

// ─── Props ─────────────────────────────────────────────────────────────────────

export type AnimationType = 'pulse' | 'bounce' | 'fadeIn' | 'slideDown' | 'success';

interface Props {
  animation?: AnimationType;
  width?: number;
  height?: number;
  autoPlay?: boolean;
  onComplete?: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

const AnimatedLogo = forwardRef<AnimatedLogoRef, Props>(function AnimatedLogo(
  { animation = 'fadeIn', width = 200, height = 120, autoPlay = true, onComplete },
  ref,
) {
  // Three animated values cover all animation types
  const opacity = useRef(
    new Animated.Value(
      animation === 'fadeIn' || animation === 'slideDown' || animation === 'bounce' ? 0 : 1,
    ),
  ).current;
  const scale = useRef(new Animated.Value(animation === 'fadeIn' ? 0.8 : 1)).current;
  const translateY = useRef(
    new Animated.Value(animation === 'slideDown' || animation === 'bounce' ? -50 : 0),
  ).current;

  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  // ── Pulse (loops forever) ────────────────────────────────────────────────────

  function startPulse() {
    loopRef.current?.stop();
    opacity.setValue(1);
    scale.setValue(1);

    loopRef.current = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.4, duration: 900, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1.0, duration: 900, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.08, duration: 900, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1.0, duration: 900, useNativeDriver: true }),
        ]),
      ]),
    );
    loopRef.current.start();
  }

  function stopPulse() {
    loopRef.current?.stop();
    loopRef.current = null;
    opacity.setValue(1);
    scale.setValue(1);
  }

  // ── Success bounce (plays once) ──────────────────────────────────────────────

  function playSuccess(onDone?: () => void) {
    stopPulse();
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.3, duration: 200, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1.0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      onDone?.();
      onComplete?.();
    });
  }

  // ── Expose ref API ───────────────────────────────────────────────────────────

  useImperativeHandle(ref, () => ({ start: startPulse, stop: stopPulse, playSuccess }));

  // ── Auto-play on mount ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!autoPlay) return;

    if (animation === 'fadeIn') {
      // Fade in + scale up together
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ]).start(() => onComplete?.());
    } else if (animation === 'slideDown' || animation === 'bounce') {
      // Fade in + spring-drop from above
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(translateY, {
          toValue: 0,
          tension: 60,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start(() => onComplete?.());
    } else if (animation === 'pulse') {
      startPulse();
    } else if (animation === 'success') {
      playSuccess();
    }

    return () => { loopRef.current?.stop(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.Image
      source={LogoSource}
      style={{
        width,
        height,
        resizeMode: 'contain',
        opacity,
        transform: [{ scale }, { translateY }],
      }}
    />
  );
});

export default AnimatedLogo;
