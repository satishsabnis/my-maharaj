import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const anim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={[
        s.skeleton,
        { width: width as any, height, borderRadius, opacity: anim },
        style,
      ]}
    />
  );
}

export function SkeletonCard({ style }: { style?: ViewStyle }) {
  return (
    <View style={[s.card, style]}>
      <View style={s.cardHeader}>
        <Skeleton width={48} height={48} borderRadius={14} />
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton width="60%" height={14} />
          <Skeleton width="80%" height={11} />
        </View>
      </View>
      <Skeleton width="100%" height={3} borderRadius={0} style={{ marginTop: 12 }} />
    </View>
  );
}

export function SkeletonMealCard() {
  return (
    <View style={s.mealCard}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <Skeleton width={32} height={32} borderRadius={16} />
        <Skeleton width="50%" height={14} />
      </View>
      {[1, 2, 3].map((i) => (
        <View key={i} style={s.mealOption}>
          <Skeleton width="70%" height={13} />
          <Skeleton width="90%" height={11} style={{ marginTop: 4 }} />
        </View>
      ))}
    </View>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View style={{ gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={s.listItem}>
          <Skeleton width={44} height={44} borderRadius={22} />
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton width="65%" height={14} />
            <Skeleton width="45%" height={11} />
          </View>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  skeleton:   { backgroundColor: '#C8E6D8' },
  card: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: 'rgba(180,220,220,0.45)',
  },
  cardHeader: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  mealCard: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(180,220,220,0.45)',
  },
  mealOption: {
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(180,220,220,0.3)',
  },
  listItem: {
    flexDirection: 'row', gap: 12, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(180,220,220,0.45)',
  },
});
