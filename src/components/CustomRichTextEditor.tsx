import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Platform,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useAppTheme } from '../contexts/ThemeContext';
import { RichPostText } from './RichPostText';
import {
  applyStyleToRichCharsRange,
  insertBulletInRichChars,
  markupToRichChars,
  richCharsToMarkup,
  richCharsToPlain,
  syncRichCharsFromPlain,
  type RichChar,
  type RichCharStyle,
} from '../lib/rich-text/rich-chars';
import { contentUsesRichTextCustomization } from '../lib/rich-text';

export type CustomRichTextEditorHandle = {
  focus: () => void
  /** Guarda a seleção atual antes do blur (chamar no onPressIn da toolbar). */
  preserveSelection: () => void
  applyBold: () => void
  applyItalic: () => void
  applyFgColor: (hex: string) => void
  applyBgColor: (hex: string) => void
  applyBullet: () => void
}

type Props = {
  value: string
  onChange: (markup: string) => void
  placeholder?: string
  maxChars?: number
  editable?: boolean
  style?: StyleProp<ViewStyle>
  textStyle?: StyleProp<TextStyle>
  minHeight?: number
  maxHeight?: number
  onFocusChange?: (focused: boolean) => void
}

type TextSelection = { start: number; end: number }

/**
 * Digitação em TextInput nativo + prévia estilizada.
 * `contextMenuHidden` esconde Copiar/Recortar; no Android isso costuma colapsar
 * a seleção — restauramos o range 1x sem controlar a seleção o tempo todo.
 */
export const CustomRichTextEditor = forwardRef<CustomRichTextEditorHandle, Props>(
  function CustomRichTextEditor(
    {
      value,
      onChange,
      placeholder,
      maxChars = 1000,
      editable = true,
      style,
      textStyle,
      minHeight = 180,
      maxHeight,
      onFocusChange,
    },
    ref
  ) {
    const { colors } = useAppTheme();
    const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);
    const [chars, setChars] = useState<RichChar[]>(() => markupToRichChars(value));
    /** Só preenchido no Android para reaplicar seleção após colapso do contextMenuHidden. */
    const [selectionOverride, setSelectionOverride] = useState<TextSelection | null>(null);
    const charsRef = useRef(chars);
    const selectionRef = useRef<TextSelection>({ start: 0, end: 0 });
    const rangeRef = useRef<TextSelection>({ start: 0, end: 0 });
    const lastRangeAt = useRef(0);
    /** Timestamp até o qual ignoramos/controlamos restore da seleção (Android). */
    const selectionRestoreUntilRef = useRef(0);
    const lastEmitted = useRef(value);
    const applying = useRef(false);

    charsRef.current = chars;

    const plain = richCharsToPlain(chars);
    const markup = richCharsToMarkup(chars);
    const showPreview = contentUsesRichTextCustomization(markup);

    useEffect(() => {
      if (applying.current) return;
      if (value === lastEmitted.current) return;
      const next = markupToRichChars(value);
      setChars(next);
      charsRef.current = next;
      lastEmitted.current = value;
    }, [value]);

    const emit = (nextChars: RichChar[]) => {
      const nextMarkup = richCharsToMarkup(nextChars);
      if (richCharsToPlain(nextChars).length > maxChars) return;
      applying.current = true;
      setChars(nextChars);
      charsRef.current = nextChars;
      lastEmitted.current = nextMarkup;
      onChange(nextMarkup);
      applying.current = false;
    };

    const resolveFormatSelection = (): TextSelection => {
      if (rangeRef.current.start !== rangeRef.current.end) return rangeRef.current;
      const current = selectionRef.current;
      if (current.start !== current.end) return current;
      return current;
    };

    const applyPatch = (patch: RichCharStyle) => {
      const current = charsRef.current;
      const sel = resolveFormatSelection();
      const plainBefore = richCharsToPlain(current);
      const next = applyStyleToRichCharsRange(current, sel.start, sel.end, patch);
      emit(next);
      const plainAfter = richCharsToPlain(next);

      if (sel.start === sel.end && plainAfter.length > plainBefore.length) {
        const inserted = plainAfter.length - plainBefore.length;
        const pos = sel.start + inserted;
        selectionRef.current = { start: pos, end: pos };
        rangeRef.current = { start: 0, end: 0 };
      } else if (sel.start !== sel.end) {
        rangeRef.current = sel;
        lastRangeAt.current = Date.now();
        // Reaplica highlight após format (útil no Android com menu oculto).
        if (Platform.OS === 'android') {
          selectionRestoreUntilRef.current = Date.now() + 400;
          setSelectionOverride({ ...sel });
          setTimeout(() => setSelectionOverride(null), 120);
        }
      }

      requestAnimationFrame(() => inputRef.current?.focus());
    };

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      preserveSelection: () => {
        const current = selectionRef.current;
        if (current.start !== current.end) {
          rangeRef.current = current;
          lastRangeAt.current = Date.now();
        }
      },
      applyBold: () => applyPatch({ bold: true }),
      applyItalic: () => applyPatch({ italic: true }),
      applyFgColor: (hex: string) => {
        if (hex) applyPatch({ fg: hex });
      },
      applyBgColor: (hex: string) => {
        if (hex) applyPatch({ bg: hex });
      },
      applyBullet: () => {
        const result = insertBulletInRichChars(charsRef.current, selectionRef.current.start);
        emit(result.chars);
        selectionRef.current = {
          start: result.selectionStart,
          end: result.selectionEnd,
        };
      },
    }));

    const flatText = StyleSheet.flatten(textStyle) || {};
    const baseTextStyle: TextStyle = {
      fontSize: 15,
      lineHeight: 21,
      ...flatText,
      color: colors.text.primary,
    };

    return (
      <View style={[styles.wrap, { minHeight }, maxHeight != null ? { maxHeight } : null, style]}>
        <TextInput
          ref={inputRef}
          style={[styles.input, baseTextStyle, { minHeight }]}
          multiline
          value={plain}
          editable={editable}
          textAlignVertical="top"
          placeholder={placeholder}
          placeholderTextColor={colors.text.tertiary}
          contextMenuHidden
          cursorColor={colors.secondary.main}
          selectionColor={`${colors.secondary.main}66`}
          underlineColorAndroid="transparent"
          scrollEnabled={false}
          autoCorrect={false}
          spellCheck={false}
          {...(selectionOverride ? { selection: selectionOverride } : {})}
          onFocus={() => onFocusChange?.(true)}
          onBlur={() => onFocusChange?.(false)}
          onChangeText={(nextPlain) => {
            const sanitized = nextPlain.replace(/\n{4,}/g, '\n\n\n');
            if (sanitized.length > maxChars) return;
            rangeRef.current = { start: 0, end: 0 };
            setSelectionOverride(null);
            emit(syncRichCharsFromPlain(charsRef.current, sanitized));
          }}
          onSelectionChange={(e) => {
            const next = e.nativeEvent.selection;
            selectionRef.current = next;

            if (next.start !== next.end) {
              rangeRef.current = next;
              lastRangeAt.current = Date.now();
              return;
            }

            // Android: contextMenuHidden colapsa o range logo após selecionar — restaura 1x.
            if (Platform.OS !== 'android') return;
            if (Date.now() < selectionRestoreUntilRef.current) return;
            if (rangeRef.current.start === rangeRef.current.end) return;
            if (Date.now() - lastRangeAt.current > 400) return;

            const restoredSelection = { ...rangeRef.current };
            selectionRestoreUntilRef.current = Date.now() + 350;
            setSelectionOverride(restoredSelection);
            setTimeout(() => setSelectionOverride(null), 100);
          }}
        />

        {showPreview ? (
          <View style={[styles.previewBox, { borderTopColor: colors.border.light }]}>
            <RichPostText text={markup} color={colors.text.primary} style={styles.previewText} />
          </View>
        ) : null}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  input: {
    width: '100%',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  previewBox: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
  },
  previewText: {
    fontSize: 15,
    lineHeight: 21,
  },
});
