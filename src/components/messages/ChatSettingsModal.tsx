import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ImageBackground,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ModalBottom } from '../ModalBottom';
import { COLORS } from '../../theme/colors';
import {
  type ChatSettings,
  type UserChatStatus,
  DEFAULT_CHAT_SETTINGS,
  DEFAULT_USER_CHAT_STATUS,
  CHAT_BACKGROUND_PRESETS,
  getChatBackgroundSource,
} from '../../lib/chat-settings';

type Props = {
  visible: boolean;
  settings: ChatSettings;
  userStatus: UserChatStatus;
  onClose: () => void;
  onSave: (settings: ChatSettings, status: UserChatStatus) => void;
  onPreview?: (settings: ChatSettings) => void;
};

const BG_COLOR_PRESETS = ['#f5f5f5', '#ffffff', '#1a1a2e', '#0f172a', '#fef3c7'];
const TEXT_COLOR_PRESETS = ['#000000', '#1f2937', '#ffffff', '#374151'];

export function ChatSettingsModal({
  visible,
  settings,
  userStatus,
  onClose,
  onSave,
  onPreview,
}: Props) {
  const [tempSettings, setTempSettings] = useState<ChatSettings>(settings);
  const [tempStatus, setTempStatus] = useState<UserChatStatus>(userStatus);
  const [showGallery, setShowGallery] = useState(false);

  useEffect(() => {
    if (visible) {
      setTempSettings(settings);
      setTempStatus(userStatus);
      setShowGallery(false);
    }
  }, [visible, settings, userStatus]);

  const updateSettings = (patch: Partial<ChatSettings>) => {
    const next = { ...tempSettings, ...patch };
    setTempSettings(next);
    if (onPreview) onPreview(next);
  };

  const handleCancel = () => {
    if (onPreview) onPreview(settings);
    onClose();
  };

  const handleReset = () => {
    const defaults = { ...DEFAULT_CHAT_SETTINGS };
    setTempSettings(defaults);
    if (onPreview) onPreview(defaults);
  };

  const previewBg = getChatBackgroundSource(tempSettings.backgroundImage);

  return (
    <ModalBottom visible={visible} onClose={handleCancel} maxHeight="92%">
      <View style={styles.header}>
        <Text style={styles.title}>Configurações do chat</Text>
        <TouchableOpacity onPress={handleCancel} hitSlop={12}>
          <Ionicons name="close" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>Pré-visualização</Text>
        {previewBg ? (
          <ImageBackground
            source={previewBg}
            style={[styles.preview, { backgroundColor: tempSettings.backgroundColor }]}
            imageStyle={styles.previewImage}
            resizeMode="cover"
          >
            <PreviewBubbles textColor={tempSettings.textColor} />
          </ImageBackground>
        ) : (
          <View style={[styles.preview, { backgroundColor: tempSettings.backgroundColor }]}>
            <PreviewBubbles textColor={tempSettings.textColor} />
          </View>
        )}

        <Text style={styles.sectionTitle}>Seu status</Text>
        {(['online', 'busy', 'offline'] as const).map((value) => (
          <TouchableOpacity
            key={value}
            style={styles.radioRow}
            onPress={() => setTempStatus({ ...tempStatus, visibility: value })}
          >
            <View
              style={[
                styles.radioOuter,
                tempStatus.visibility === value && styles.radioOuterActive,
              ]}
            >
              {tempStatus.visibility === value ? <View style={styles.radioInner} /> : null}
            </View>
            <View
              style={[
                styles.statusDot,
                value === 'online' && { backgroundColor: '#4caf50' },
                value === 'busy' && { backgroundColor: '#f44336' },
                value === 'offline' && { backgroundColor: '#9e9e9e' },
              ]}
            />
            <Text style={styles.radioLabel}>
              {value === 'online' ? 'Online' : value === 'busy' ? 'Ocupado' : 'Offline'}
            </Text>
          </TouchableOpacity>
        ))}
        <TextInput
          style={styles.statusInput}
          placeholder="Mensagem de status (opcional)"
          placeholderTextColor={COLORS.text.tertiary}
          value={tempStatus.customMessage}
          onChangeText={(t) =>
            setTempStatus({ ...tempStatus, customMessage: t.slice(0, 100) })
          }
          maxLength={100}
        />
        <Text style={styles.helper}>{tempStatus.customMessage.length}/100</Text>

        <Text style={styles.sectionTitle}>Imagem de fundo</Text>
        {!showGallery ? (
          <TouchableOpacity style={styles.outlineBtn} onPress={() => setShowGallery(true)}>
            <Ionicons name="image-outline" size={20} color={COLORS.secondary.main} />
            <Text style={styles.outlineBtnText}>
              {tempSettings.backgroundImage ? 'Trocar imagem' : 'Escolher imagem'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View>
            <View style={styles.galleryHeader}>
              <Text style={styles.sectionLabel}>Escolher fundo</Text>
              <TouchableOpacity onPress={() => setShowGallery(false)}>
                <Ionicons name="close" size={22} color={COLORS.text.secondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.galleryGrid}>
              {CHAT_BACKGROUND_PRESETS.map((preset) => {
                const src = getChatBackgroundSource(preset.id);
                const selected = tempSettings.backgroundImage === preset.id;
                return (
                  <TouchableOpacity
                    key={preset.id ?? 'none'}
                    style={[styles.galleryItem, selected && styles.galleryItemSelected]}
                    onPress={() => {
                      updateSettings({ backgroundImage: preset.id });
                      setShowGallery(false);
                    }}
                  >
                    {src ? (
                      <Image source={src} style={styles.galleryThumb} resizeMode="cover" />
                    ) : (
                      <View style={[styles.galleryThumb, styles.galleryEmpty]}>
                        <Text style={styles.galleryEmptyText}>Sem imagem</Text>
                      </View>
                    )}
                    <Text style={styles.galleryLabel} numberOfLines={1}>
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>Cor de fundo</Text>
        <View style={styles.presetRow}>
          {BG_COLOR_PRESETS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.colorSwatch,
                { backgroundColor: c },
                tempSettings.backgroundColor === c && styles.colorSwatchActive,
              ]}
              onPress={() => updateSettings({ backgroundColor: c })}
            />
          ))}
        </View>
        <TextInput
          style={styles.hexInput}
          value={tempSettings.backgroundColor}
          onChangeText={(t) => updateSettings({ backgroundColor: t })}
          placeholder="#f5f5f5"
          autoCapitalize="none"
        />

        <Text style={styles.sectionTitle}>Cor do texto (recebidas)</Text>
        <View style={styles.presetRow}>
          {TEXT_COLOR_PRESETS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.colorSwatch,
                { backgroundColor: c, borderWidth: 1, borderColor: COLORS.border.medium },
                tempSettings.textColor === c && styles.colorSwatchActive,
              ]}
              onPress={() => updateSettings({ textColor: c })}
            />
          ))}
        </View>
        <TextInput
          style={styles.hexInput}
          value={tempSettings.textColor}
          onChangeText={(t) => updateSettings({ textColor: t })}
          placeholder="#000000"
          autoCapitalize="none"
        />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.ghostBtn} onPress={handleReset}>
          <Text style={styles.ghostBtnText}>Restaurar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ghostBtn} onPress={handleCancel}>
          <Text style={styles.ghostBtnText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={() => {
            onSave(tempSettings, tempStatus);
            onClose();
          }}
        >
          <Text style={styles.saveBtnText}>Salvar</Text>
        </TouchableOpacity>
      </View>
    </ModalBottom>
  );
}

function PreviewBubbles({ textColor }: { textColor: string }) {
  return (
    <>
      <View style={[styles.bubbleSent]}>
        <Text style={styles.bubbleSentText}>Mensagem enviada</Text>
      </View>
      <View style={[styles.bubbleReceived, { borderColor: COLORS.border.light }]}>
        <Text style={{ color: textColor, fontSize: 13 }}>Mensagem recebida</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text.primary },
  scroll: { paddingHorizontal: 20, maxHeight: 480 },
  sectionLabel: { fontSize: 12, color: COLORS.text.secondary, marginBottom: 8 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: 20,
    marginBottom: 10,
  },
  preview: {
    height: 120,
    borderRadius: 12,
    padding: 12,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  previewImage: { opacity: 0.85 },
  bubbleSent: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.secondary.main,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    maxWidth: '65%',
  },
  bubbleSentText: { color: '#fff', fontSize: 13 },
  bubbleReceived: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    maxWidth: '65%',
    borderWidth: 1,
  },
  radioRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: { borderColor: COLORS.secondary.main },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.secondary.main,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  radioLabel: { fontSize: 15, color: COLORS.text.primary },
  statusInput: {
    borderWidth: 1,
    borderColor: COLORS.border.light,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text.primary,
    marginTop: 8,
  },
  helper: { fontSize: 11, color: COLORS.text.tertiary, textAlign: 'right', marginTop: 4 },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.secondary.main,
  },
  outlineBtnText: { color: COLORS.secondary.main, fontWeight: '600' },
  galleryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  galleryItem: {
    width: '47%',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  galleryItemSelected: { borderColor: COLORS.secondary.main },
  galleryThumb: { width: '100%', height: 72 },
  galleryEmpty: {
    backgroundColor: COLORS.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryEmptyText: { fontSize: 12, color: COLORS.text.secondary },
  galleryLabel: {
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 4,
    color: COLORS.text.secondary,
  },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  colorSwatch: { width: 36, height: 36, borderRadius: 18 },
  colorSwatchActive: { borderWidth: 3, borderColor: COLORS.secondary.main },
  hexInput: {
    borderWidth: 1,
    borderColor: COLORS.border.light,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },
  ghostBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: COLORS.background.tertiary,
  },
  ghostBtnText: { fontWeight: '600', color: COLORS.text.primary },
  saveBtn: {
    flex: 1,
    minWidth: 100,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.secondary.main,
    alignItems: 'center',
  },
  saveBtnText: { fontWeight: '700', color: '#fff' },
});
