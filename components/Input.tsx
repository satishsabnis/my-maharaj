import React, { useState } from 'react';
import { KeyboardTypeOptions, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { navy, border, white, errorRed, textSec, textColor } from '../theme/colors';

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  error?: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  numberOfLines?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

export default function Input({
  label, value, onChangeText, placeholder,
  secureTextEntry = false, error, keyboardType = 'default',
  multiline = false, numberOfLines = 1,
  autoCapitalize = 'sentences',
}: InputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={s.wrapper}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <View style={[s.inputRow, error ? s.inputError : null, multiline && s.inputMulti]}>
        <TextInput
          style={[s.input, multiline && s.inputMultiText]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#A0A9B8"
          secureTextEntry={secureTextEntry && !visible}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
          autoCapitalize={autoCapitalize}
        />
        {secureTextEntry && (
          <TouchableOpacity onPress={() => setVisible((v) => !v)} style={s.eyeBtn} activeOpacity={0.7}>
            <Text style={s.eye}>{visible ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrapper:    { marginBottom: 16 },
  label:      { fontSize: 13, fontWeight: '700', color: navy, marginBottom: 6, letterSpacing: 0.3 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: white,
    borderWidth: 1.5,
    borderColor: border,
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 15,
  },
  inputMulti: { height: undefined, minHeight: 52, paddingVertical: 12, alignItems: 'flex-start' },
  inputError: { borderColor: errorRed },
  input:      { flex: 1, fontSize: 15, color: textColor, outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as never,
  inputMultiText: { textAlignVertical: 'top' },
  eyeBtn:     { padding: 6 },
  eye:        { fontSize: 16 },
  error:      { fontSize: 12, color: errorRed, marginTop: 4, marginLeft: 2 },
});
