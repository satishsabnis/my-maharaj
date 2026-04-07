import React, { useRef, useState, useEffect } from 'react';
import { View, Animated, Easing, Text } from 'react-native';

const TICKER_TEXT =
  'My Maharaj by Blue Flute Consulting \u00B7 Beta \u00B7 Smart meal planning for Indian families \u00B7 Feedback: info@bluefluteconsulting.com     ';

export default function MarqueeTicker() {
  const anim = useRef(new Animated.Value(0)).current;
  const [contentWidth, setContentWidth] = useState(0);

  useEffect(() => {
    if (contentWidth === 0) return;
    const start = () => {
      anim.setValue(0);
      Animated.timing(anim, {
        toValue: -(contentWidth / 3),
        duration: (contentWidth / 3) * 28,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) start();
      });
    };
    start();
    return () => anim.stopAnimation();
  }, [contentWidth]);

  return (
    <View style={{ backgroundColor: '#C9A227', height: 22, overflow: 'hidden' }}>
      <Animated.Text
        style={{
          transform: [{ translateX: anim }],
          color: '#1A1A1A',
          fontSize: 9,
          lineHeight: 22,
        }}
        onLayout={(e) => {
          if (contentWidth === 0) setContentWidth(e.nativeEvent.layout.width);
        }}
        numberOfLines={1}
      >
        {TICKER_TEXT.repeat(3)}
      </Animated.Text>
    </View>
  );
}
