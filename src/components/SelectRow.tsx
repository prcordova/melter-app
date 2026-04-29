import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../theme/colors';

interface SelectOption {
  value: string;
  label: string;
}

type SelectRowSize = 'small' | 'medium' | 'large' | 'full';

interface SelectRowProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  size?: SelectRowSize;
}

const SIZE_WIDTH_MAP: Record<SelectRowSize, number | '100%'> = {
  small: 120,
  medium: 160,
  large: 220,
  full: '100%',
};

const SIZE_MIN_DROPDOWN_MAP: Record<SelectRowSize, number> = {
  small: 120,
  medium: 160,
  large: 220,
  full: 170,
};

export function SelectRow({ label, value, options, onChange, size = 'full' }: SelectRowProps) {
  const [open, setOpen] = useState(false);
  const [dropdownLayout, setDropdownLayout] = useState({ x: 0, y: 0, width: 180 });
  const triggerRef = React.useRef<View>(null);

  const selectedLabel = useMemo(() => {
    return options.find((option) => option.value === value)?.label || label;
  }, [label, options, value]);

  return (
    <View style={[styles.container, size !== 'full' && { width: SIZE_WIDTH_MAP[size] }]}>
      <View ref={triggerRef} collapsable={false}>
        <TouchableOpacity
          style={styles.trigger}
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
          <Text style={styles.triggerText}>{selectedLabel}</Text>
          <Ionicons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={18}
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
