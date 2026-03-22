import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

const logoSrc = require('../assets/logo.png');

const SIZES = {
  small:  { width: 120, height: 80  },
  medium: { width: 200, height: 140 },
  large:  { width: 300, height: 200 },
};

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  style?: StyleProp<ImageStyle>;
}

export default function Logo({ size = 'medium', style }: LogoProps) {
  const dim = SIZES[size];
  return (
    <Image
      source={logoSrc}
      style={[{ width: dim.width, height: dim.height, resizeMode: 'contain', backgroundColor: 'transparent' }, style]}
    />
  );
}
