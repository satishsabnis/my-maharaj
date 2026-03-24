import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { navy, gold, white, border } from '../theme/colors';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export default function Button({ title, onPress, variant = 'primary', loading = false, disabled = false, style }: ButtonProps) {
  const isDisabled = disabled || loading;

  const containerStyle = [
    s.base,
    variant === 'primary'   && s.primary,
    variant === 'secondary' && s.secondary,
    variant === 'outline'   && s.outline,
    isDisabled && s.disabled,
    style,
  ];

  const textStyle = [
    s.label,
    variant === 'primary'   && s.labelPrimary,
    variant === 'secondary' && s.labelSecondary,
    variant === 'outline'   && s.labelOutline,
    isDisabled && s.labelDisabled,
  ];

  return (
    <TouchableOpacity style={containerStyle} onPress={onPress} disabled={isDisabled} activeOpacity={0.82}>
      {loading
        ? <ActivityIndicator color={variant === 'primary' ? white : gold} />
        : <Text style={textStyle}>{title}</Text>
      }
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 24,
  },
  primary:   { backgroundColor: navy },
  secondary: { backgroundColor: gold },
  outline:   { backgroundColor: white, borderWidth: 2, borderColor: navy },
  disabled:  { opacity: 0.5 },

  label:         { fontSize: 16, fontWeight: '600', letterSpacing: 0.2 },
  labelPrimary:  { color: white },
  labelSecondary:{ color: white },
  labelOutline:  { color: navy },
  labelDisabled: {},
});
