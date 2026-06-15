import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../theme/colors';

interface SelectOption {
  value: string;
  label: string;
}

type SelectRowSize = 'compact' | 'small' | 'medium' | 'large' | 'full';

interface SelectRowProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  size?: SelectRowSize;
}

const SIZE_WIDTH_MAP: Record<SelectRowSize, number | '100%'> = {
  compact: '100%',
  small: 120,
  medium: 160,
  large: 220,
  full: '100%',
};

const SIZE_MIN_DROPDOWN_MAP: Record<SelectRowSize, number> = {
  compact: 140,
  small: 120,
  medium: 160,
  large: 220,
  full: 170,
};

const SIZE_TRIGGER_STYLE_MAP: Record<SelectRowSize, { minHeight: number; paddingHorizontal: number; borderRadius: number }> = {
  compact: { minHeight: 34, paddingHorizontal: 10, borderRadius: 8 },
  small: { minHeight: 40, paddingHorizontal: 10, borderRadius: 8 },
  medium: { minHeight: 44, paddingHorizontal: 12, borderRadius: 10 },
  large: { minHeight: 44, paddingHorizontal: 12, borderRadius: 10 },
  full: { minHeight: 44, paddingHorizontal: 12, borderRadius: 10 },
};

const SIZE_TEXT_STYLE_MAP: Record<SelectRowSize, { fontSize: number }> = {
  compact: { fontSize: 13 },
  small: { fontSize: 13 },
  medium: { fontSize: 14 },
  large: { fontSize: 14 },
  full: { fontSize: 14 },
};

const SIZE_CHEVRON_MAP: Record<SelectRowSize, number> = {
  compact: 16,
  small: 16,
  medium: 18,
  large: 18,
  full: 18,
};

export function SelectRow({ label, value, options, onChange, size = 'full' }: SelectRowProps) {
  const [open, setOpen] = useState(false);
  const [dropdownLayout, setDropdownLayout] = useState({ x: 0, y: 0, width: 180 });
  const triggerRef = React.useRef<View>(null);
  const triggerSizeStyle = SIZE_TRIGGER_STYLE_MAP[size];
  const textSizeStyle = SIZE_TEXT_STYLE_MAP[size];
  const chevronSize = SIZE_CHEVRON_MAP[size];
  const isCompact = size === 'compact';

  const selectedLabel = useMemo(() => {
    return options.find((option) => option.value === value)?.label || label;
  }, [label, options, value]);

  return (
    <View style={[styles.container, size !== 'full' && size !== 'compact' && { width: SIZE_WIDTH_MAP[size] }]}>
      <View ref={triggerRef} collapsable={false}>
        <TouchableOpacity
          style={[
            styles.trigger,
            {
              minHeight: triggerSizeStyle.minHeight,
              paddingHorizontal: triggerSizeStyle.paddingHorizontal,
              borderRadius: triggerSizeStyle.borderRadius,
            },
          ]}
          onPress={() => {
            if (open) {
              setOpen(false);
              return;
            }
            if (triggerRef.current) {
              triggerRef.current.measureInWindow((x, y, width, height) => {
                setDropdownLayout({
                  x,
                  y: y + height + 6,
                  width: Math.max(width, SIZE_MIN_DROPDOWN_MAP[size]),
                });
                setOpen(true);
              });
              return;
            }
            setOpen(true);
          }}
          activeOpacity={0.75}
        >
          <Text style={[styles.triggerText, textSizeStyle]} numberOfLines={1}>
            {selectedLabel}
          </Text>
          <Ionicons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={chevronSize}
            color={COLORS.secondary.main}
          />
        </TouchableOpacity>
      </View>

      {open && (
        <Modal
          transparent
          animationType="fade"
          visible={open}
          onRequestClose={() => setOpen(false)}
        >
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
            <Pressable
              style={[
                styles.optionsWrap,
                {
                  left: dropdownLayout.x,
                  top: dropdownLayout.y,
                  width: dropdownLayout.width,
                },
              ]}
              onPress={(event) => event.stopPropagation()}
            >
              {options.map((option) => {
                const selected = option.value === value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.option, isCompact && styles.optionCompact, selected && styles.optionSelected]}
                    onPress={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        isCompact && styles.optionTextCompact,
                        selected && styles.optionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    zIndex: 20,
    alignSelf: 'flex-start',
  },
  trigger: {
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background.tertiary,
    gap: 6,
  },
  triggerText: {
    fontWeight: '600',
    color: COLORS.secondary.main,
    flex: 1,
  },
  optionsWrap: {
    position: 'absolute',
    backgroundColor: COLORS.background.paper,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    borderRadius: 10,
    padding: 6,
    gap: 6,
    zIndex: 30,
    elevation: 4,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'transparent',
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
  optionCompact: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
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
  optionTextCompact: {
    fontSize: 12,
  },
  optionTextSelected: {
    color: COLORS.secondary.main,
  },
});
