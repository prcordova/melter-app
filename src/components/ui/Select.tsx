import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { COLORS } from '../../theme/colors';

export interface SelectItem {
  label: string;
  value: string | number;
}

interface SelectProps {
  selectedValue: string | number;
  onValueChange: (value: string | number) => void;
  items: SelectItem[];
  placeholder?: string;
  style?: ViewStyle;
  wrapperStyle?: ViewStyle;
  disabled?: boolean;
}

export function Select({
  selectedValue,
  onValueChange,
  items,
  placeholder,
  style,
  wrapperStyle,
  disabled = false,
}: SelectProps) {
  return (
    <View style={[styles.wrapper, wrapperStyle]}>
      <Picker
        selectedValue={selectedValue}
        onValueChange={onValueChange}
        style={[styles.picker, style]}
        dropdownIconColor={COLORS.text.secondary}
        mode="dropdown"
        enabled={!disabled}
      >
        {placeholder && (
          <Picker.Item label={placeholder} value="" enabled={false} />
        )}
        {items.map((item) => (
          <Picker.Item
            key={String(item.value)}
            label={item.label}
            value={item.value}
          />
        ))}
      </Picker>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.background.paper,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    overflow: 'visible',
    height: 52,
    justifyContent: 'center',
  },
  picker: {
    color: COLORS.text.primary,
    height: 52,
    paddingVertical: 0,
    marginVertical: 0,
    paddingHorizontal: 12,
    paddingLeft: 12,
    paddingRight: 32,
    fontSize: 15,
    lineHeight: 22,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
});

