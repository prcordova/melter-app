import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../theme/colors';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectRowProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}

export function SelectRow({ label, value, options, onChange }: SelectRowProps) {
  const [open, setOpen] = useState(false);

  const selectedLabel = useMemo(() => {
    return options.find((option) => option.value === value)?.label || label;
  }, [label, options, value]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setOpen((prev) => !prev)}
        activeOpacity={0.75}
      >
        <Text style={styles.triggerText}>{selectedLabel}</Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={COLORS.secondary.main}
        />
      </TouchableOpacity>

      {open && (
        <View style={styles.optionsWrap}>
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.option, selected && styles.optionSelected]}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                activeOpacity={0.75}
              >
                <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    zIndex: 20,
  },
  trigger: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background.tertiary,
  },
  triggerText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.secondary.main,
  },
  optionsWrap: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background.paper,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    borderRadius: 10,
    padding: 6,
    gap: 6,
    zIndex: 30,
    elevation: 4,
  },
  option: {
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    borderRadius: 10,
    backgroundColor: COLORS.background.tertiary,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  optionSelected: {
    borderColor: COLORS.secondary.main,
    backgroundColor: `${COLORS.secondary.main}14`,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  optionTextSelected: {
    color: COLORS.secondary.main,
  },
});
