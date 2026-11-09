import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
  type ViewInstance,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppTheme, useThemedStyles } from '../contexts/ThemeContext';
import type { AppPalette } from '../theme/palettes';

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
  /** Gatilho só com ícone (36×36); o `label` vira título do dropdown. */
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  /** Destaca o ícone (ex.: valor diferente do padrão). */
  iconActive?: boolean;
}

const ICON_TRIGGER_SIZE = 36;
const ICON_DROPDOWN_WIDTH = 190;
const DROPDOWN_SCREEN_MARGIN = 8;

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

export function SelectRow({
  label,
  value,
  options,
  onChange,
  size = 'full',
  icon,
  iconActive = false,
}: SelectRowProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [open, setOpen] = useState(false);
  const [dropdownLayout, setDropdownLayout] = useState({ x: 0, y: 0, width: 180 });
  const triggerRef = React.useRef<ViewInstance>(null);
  const triggerSizeStyle = SIZE_TRIGGER_STYLE_MAP[size];
  const textSizeStyle = SIZE_TEXT_STYLE_MAP[size];
  const chevronSize = SIZE_CHEVRON_MAP[size];
  const isCompact = size === 'compact';

  const selectedLabel = useMemo(() => {
    return options.find((option) => option.value === value)?.label || label;
  }, [label, options, value]);

  const handleTriggerPress = () => {
    if (open) {
      setOpen(false);
      return;
    }
    if (triggerRef.current) {
      triggerRef.current.measureInWindow((x, y, width, height) => {
        const dropdownWidth = icon ? ICON_DROPDOWN_WIDTH : Math.max(width, SIZE_MIN_DROPDOWN_MAP[size]);
        const maxX = Dimensions.get('window').width - dropdownWidth - DROPDOWN_SCREEN_MARGIN;
        setDropdownLayout({
          x: Math.max(DROPDOWN_SCREEN_MARGIN, Math.min(x, maxX)),
          y: y + height + 6,
          width: dropdownWidth,
        });
        setOpen(true);
      });
      return;
    }
    setOpen(true);
  };

  return (
    <View
      style={[
        styles.container,
        icon ? styles.containerIcon : size !== 'full' && size !== 'compact' && { width: SIZE_WIDTH_MAP[size] },
      ]}
    >
      <View ref={triggerRef} collapsable={false}>
        {icon ? (
          <TouchableOpacity
            style={[styles.iconTrigger, (open || iconActive) && styles.iconTriggerActive]}
            onPress={handleTriggerPress}
            activeOpacity={0.75}
            accessibilityLabel={`${label}: ${selectedLabel}`}
          >
            <Ionicons
              name={icon}
              size={18}
              color={open || iconActive ? colors.secondary.main : colors.text.secondary}
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.trigger,
              {
                minHeight: triggerSizeStyle.minHeight,
                paddingHorizontal: triggerSizeStyle.paddingHorizontal,
                borderRadius: triggerSizeStyle.borderRadius,
              },
            ]}
            onPress={handleTriggerPress}
            activeOpacity={0.75}
          >
            <Text style={[styles.triggerText, textSizeStyle]} numberOfLines={1}>
              {selectedLabel}
            </Text>
            <Ionicons
              name={open ? 'chevron-up' : 'chevron-down'}
              size={chevronSize}
              color={colors.secondary.main}
            />
          </TouchableOpacity>
        )}
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
              {icon ? <Text style={styles.dropdownTitle}>{label}</Text> : null}
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

const createStyles = (c: AppPalette) => StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    zIndex: 20,
    alignSelf: 'flex-start',
  },
  containerIcon: {
    width: ICON_TRIGGER_SIZE,
  },
  iconTrigger: {
    width: ICON_TRIGGER_SIZE,
    height: ICON_TRIGGER_SIZE,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.border.light,
    backgroundColor: c.background.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconTriggerActive: {
    borderColor: c.secondary.main,
  },
  dropdownTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: c.text.tertiary,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
    paddingTop: 2,
  },
  trigger: {
    borderWidth: 1,
    borderColor: c.border.medium,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.background.tertiary,
    gap: 6,
  },
  triggerText: {
    fontWeight: '600',
    color: c.secondary.main,
    flex: 1,
  },
  optionsWrap: {
    position: 'absolute',
    backgroundColor: c.background.paper,
    borderWidth: 1,
    borderColor: c.border.medium,
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
    borderColor: c.border.medium,
    borderRadius: 10,
    backgroundColor: c.background.tertiary,
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
    borderColor: c.secondary.main,
    backgroundColor: `${c.secondary.main}14`,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.text.secondary,
  },
  optionTextCompact: {
    fontSize: 12,
  },
  optionTextSelected: {
    color: c.secondary.main,
  },
});
