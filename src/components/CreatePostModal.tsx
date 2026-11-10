import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Image,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useAppTheme, useThemedStyles } from '../contexts/ThemeContext';
import type { AppPalette } from '../theme/palettes';
import { postsApi, linksApi } from '../services/api';
import { getImageUrl } from '../utils/image';
import { showToast } from './CustomToast';
import { PlanLocker } from './PlanLocker';
import { hasFeatureAccess, resolveUserPlanType } from '../config/plan-features';
import { CustomModal } from './CustomModal';
import { ModalBottom } from './ModalBottom';
import { Button } from './Button';
import { Avatar } from './Avatar';
import {
  CustomRichTextEditor,
  type CustomRichTextEditorHandle,
} from './CustomRichTextEditor';
import { LinkPreviewCard, postLinkToPreview, type LinkPreviewData } from './LinkPreviewCard';
import { useLinkPreview } from '../hooks/useLinkPreview';
import { FIXED_CATEGORIES, getFixedCategory } from '../constants/categories';
import {
  POST_VISIBILITY_OPTIONS,
  getPostVisibilityOption,
  type PostVisibility,
} from '../constants/post-visibility';
import {
  RICH_TEXT_BG_COLORS,
  RICH_TEXT_COLORS,
  contentUsesRichTextCustomization,
  stripRichTextMarkup,
} from '../lib/rich-text';
import {
  ADULT_POST_CATEGORY_ID,
  isPublicPostContentAllowed,
  segmentTextByExplicitTerms,
  textHasExplicitTerms,
} from '../lib/users/profile-content-safety';

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  onPostCreated: () => void;
  editingPost?: {
    _id: string;
    content: string;
    category: string;
    visibility: PostVisibility;
    imageUrl?: string | null;
  } | null;
}

interface ProfileLink {
  _id: string;
  title: string;
  url: string;
  imageUrl?: string;
  description?: string;
}

interface FieldErrors {
  content?: boolean;
  category?: boolean;
}

type PickerKind = 'category' | 'visibility' | 'link' | null;
type ColorPalette = 'fg' | 'bg' | null;

const MAX_CHARS = 1000;
const MAX_TAGS = 5;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const HASHTAG_REGEX = /#[\w\u00C0-\u017F]+/g;
const PINK_BORDER = 'rgba(236, 72, 153, 0.9)';
const ADULT_COLOR = '#CA3994';
const WARNING_COLOR = '#ed6c02';

const TEXT = {
  title: 'Criar Post',
  editTitle: 'Editar Post',
  placeholder: 'No que você está pensando?',
  placeholderFree: 'Compartilhe um link e conte o que achou...',
  linkLabel: 'Link',
  noLink: 'Nenhum (Post sem link)',
  addLinkButton: 'Adicionar Link',
  categoryHelp: 'A categoria ajuda a personalizar os anúncios que você verá baseado no que você curte',
  tagsExcessTitle: 'Tags excedentes detectadas:',
  tagsExcessMessage:
    'As tags acima do limite de 5 estão destacadas em vermelho. Remova as tags excedentes para poder publicar o post.',
  warningTitle: 'Atenção',
  warningContent:
    'Posts **públicos** são visíveis na plataforma. Use a categoria **Conteúdo +18** para material adulto — não aparece no Google e exige login para abrir o link. Texto explícito sem essa categoria não pode ser público.',
  explicitTermsDetected:
    'Termos de conteúdo +18 detectados (sublinhados). A categoria foi ajustada para Conteúdo +18 — você pode publicar em modo Público.',
  explicitTermsHint:
    'Remova os termos destacados em vermelho para usar outra categoria ou manter o texto sem classificação +18.',
  validationSummary: 'Revise os itens destacados antes de publicar.',
  emptyContent: 'Escreva algo sobre o que você está compartilhando',
  explicitRequiresAdultCategory:
    'Há termos +18 no texto (destacados abaixo). Use a categoria Conteúdo +18 ou remova essas palavras.',
  imageTooLarge: 'Imagem muito grande. Máximo 5MB.',
  createError: 'Erro ao criar post',
  proImageTitle: 'Imagens nos posts',
  proImageDescription:
    'Para adicionar imagens aos seus posts, é necessário ter um plano PRO ou superior.\n\nVocê pode publicar normalmente sem imagem — apenas texto, links e hashtags.',
  liteFormatTitle: 'Personalização de texto',
  liteFormatDescription:
    'Negrito, itálico, cores e listas formatadas nos posts estão disponíveis a partir do plano LITE.\n\nVocê pode publicar texto simples, links e hashtags no plano FREE.',
} as const;

function renderBoldMarkdown(text: string, boldStyle: object) {
  return text.split('**').map((part, index) =>
    index % 2 === 1 ? (
      <Text key={index} style={boldStyle}>
        {part}
      </Text>
    ) : (
      part
    )
  );
}

export function CreatePostModal({ visible, onClose, onPostCreated, editingPost }: CreatePostModalProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const richEditorRef = useRef<CustomRichTextEditorHandle>(null);

  const [content, setContent] = useState('');
  const [category, setCategory] = useState('outros');
  const [visibility, setVisibility] = useState<PostVisibility>('PUBLIC');
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedLinkId, setSelectedLinkId] = useState('');
  const [myLinks, setMyLinks] = useState<ProfileLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showValidationSummary, setShowValidationSummary] = useState(false);
  const [hideAutoPreview, setHideAutoPreview] = useState(false);
  const [attentionOpen, setAttentionOpen] = useState(false);
  const [picker, setPicker] = useState<PickerKind>(null);
  const [palette, setPalette] = useState<ColorPalette>(null);
  const [proImageDialogOpen, setProImageDialogOpen] = useState(false);
  const [liteFormatDialogOpen, setLiteFormatDialogOpen] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [editorFocused, setEditorFocused] = useState(false);

  const modalMaxHeight = Math.round(windowHeight * (keyboardOpen ? 0.72 : 0.88));

  const userPlan = resolveUserPlanType(user?.plan?.type);
  const canUploadImage = hasFeatureAccess(userPlan, 'canUploadPostImages');
  const canAttachPostLink = hasFeatureAccess(userPlan, 'canAttachPostLink');
  const canCustomizePostRichText = hasFeatureAccess(userPlan, 'canCustomizePostRichText');
  const isEditing = !!editingPost;
  const selectedLink = myLinks.find((link) => link._id === selectedLinkId) ?? null;
  const selectedCategory = getFixedCategory(category);
  const visibilityOption = getPostVisibilityOption(visibility);

  const plainContent = useMemo(() => stripRichTextMarkup(content), [content]);
  const hasExplicitContent = useMemo(() => textHasExplicitTerms(plainContent), [plainContent]);
  const allHashtags = useMemo(
    () => (plainContent.match(HASHTAG_REGEX) || []).map((tag) => tag.toLowerCase().trim()),
    [plainContent]
  );
  const validTagsCount = Math.min(allHashtags.length, MAX_TAGS);
  const excessTagsCount = Math.max(0, allHashtags.length - MAX_TAGS);
  const hasExcessTags = excessTagsCount > 0;

  const { preview: autoLinkPreview, loading: loadingPreview } = useLinkPreview(content, {
    enabled: visible && !isEditing && !selectedLinkId && !hideAutoPreview,
    debounceMs: 1000,
  });

  useEffect(() => {
    if (!visible) return;
    setError('');
    setFieldErrors({});
    setShowValidationSummary(false);
    setHideAutoPreview(false);
    setAttentionOpen(false);
    setPicker(null);
    setPalette(null);
    setSelectedImage(null);
    setSelectedLinkId('');
    if (editingPost) {
      setContent(editingPost.content);
      setCategory(editingPost.category || 'outros');
      setVisibility(editingPost.visibility || 'PUBLIC');
      setImagePreview(editingPost.imageUrl ? getImageUrl(editingPost.imageUrl) ?? null : null);
    } else {
      setContent('');
      setCategory('outros');
      setVisibility('PUBLIC');
      setImagePreview(null);
      void fetchMyLinks();
    }
  }, [visible, editingPost]);

  useEffect(() => {
    if (!visible) {
      setKeyboardOpen(false);
      return;
    }
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardOpen(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardOpen(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [visible]);

  useEffect(() => {
    if (!visible || !hasExplicitContent || category === ADULT_POST_CATEGORY_ID) return;
    setCategory(ADULT_POST_CATEGORY_ID);
    clearFieldError('category');
    clearFieldError('content');
    setShowValidationSummary(false);
  }, [visible, hasExplicitContent, category]);

  const fetchMyLinks = async () => {
    try {
      const response = await linksApi.getLinks();
      const raw = (response as { success?: boolean; data?: ProfileLink[] }).data ?? response;
      const links = Array.isArray(raw) ? raw : [];
      setMyLinks(
        links
          .map((item: ProfileLink & { id?: string }) => ({
            _id: item._id || item.id || '',
            title: item.title,
            url: item.url,
            imageUrl: item.imageUrl,
            description: item.description,
          }))
          .filter((link) => link._id)
      );
    } catch (err) {
      console.error('Erro ao buscar links:', err);
      setMyLinks([]);
    }
  };

  const clearFieldError = (field: keyof FieldErrors) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const applyContent = (next: string) => {
    const sanitized = next.replace(/\n{4,}/g, '\n\n\n');
    if (stripRichTextMarkup(sanitized).length > MAX_CHARS) return;
    setContent(sanitized);
    clearFieldError('content');
    setShowValidationSummary(false);
  };

  const runFormat = (action: 'bold' | 'italic' | 'bullet' | 'fg' | 'bg') => {
    if (!canCustomizePostRichText) {
      setLiteFormatDialogOpen(true);
      return;
    }
    if (action === 'bold') richEditorRef.current?.applyBold();
    else if (action === 'italic') richEditorRef.current?.applyItalic();
    else if (action === 'bullet') richEditorRef.current?.applyBullet();
    else setPalette((prev) => (prev === action ? null : action));
  };

  const applyColor = (hex: string) => {
    if (palette === 'fg') richEditorRef.current?.applyFgColor(hex);
    if (palette === 'bg') richEditorRef.current?.applyBgColor(hex);
    setPalette(null);
  };

  const handleOpenLinksSettings = () => {
    setPicker(null);
    onClose();
    navigation.navigate('ProfileStack', { screen: 'LinksSettings' });
  };

  const handleOpenPlans = () => {
    setProImageDialogOpen(false);
    setLiteFormatDialogOpen(false);
    onClose();
    navigation.navigate('ProfileStack', { screen: 'Plans' });
  };

  const handlePickImage = async () => {
    if (!canUploadImage) {
      setProImageDialogOpen(true);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    const asset = !result.canceled ? result.assets?.[0] : undefined;
    if (!asset) return;
    if (asset.fileSize && asset.fileSize > MAX_IMAGE_BYTES) {
      setError(TEXT.imageTooLarge);
      return;
    }
    setSelectedImage(asset);
    setImagePreview(asset.uri);
  };

  const handleCategorySelect = (catId: string) => {
    if (catId !== ADULT_POST_CATEGORY_ID && hasExplicitContent) {
      setFieldErrors((prev) => ({ ...prev, category: true, content: true }));
      setShowValidationSummary(true);
      setError(TEXT.explicitRequiresAdultCategory);
      setPicker(null);
      return;
    }
    setCategory(catId);
    setPicker(null);
    clearFieldError('category');
  };

  const validateForm = (): boolean => {
    const errors: FieldErrors = {};
    let message = '';

    if (!content.trim()) {
      errors.content = true;
      message = TEXT.emptyContent;
    } else if (hasExcessTags) {
      errors.content = true;
      message = TEXT.tagsExcessMessage;
    } else if (!isPublicPostContentAllowed(content, visibility, category)) {
      errors.content = true;
      message = TEXT.explicitRequiresAdultCategory;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setShowValidationSummary(true);
      setError(message);
      return false;
    }

    setFieldErrors({});
    setShowValidationSummary(false);
    setError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    if (!canCustomizePostRichText && contentUsesRichTextCustomization(content)) {
      setLiteFormatDialogOpen(true);
      return;
    }

    try {
      setLoading(true);
      setError('');

      let imageUrl: string | null = null;
      if (isEditing && editingPost && !selectedImage && imagePreview) {
        imageUrl = editingPost.imageUrl || null;
      }

      if (selectedImage && canUploadImage) {
        const upload = await postsApi.uploadImage(selectedImage);
        if (!upload.success || !upload.imageUrl) {
          setError(upload.message || 'Não foi possível enviar a imagem.');
          return;
        }
        imageUrl = upload.imageUrl;
      }

      const response =
        isEditing && editingPost
          ? await postsApi.updatePost(editingPost._id, { content, imageUrl, visibility, category })
          : await postsApi.createPost({
              content,
              imageUrl,
              visibility,
              category,
              linkId: canAttachPostLink ? selectedLinkId || null : null,
              hideAutoPreview,
            });

      if (response?.success) {
        showToast.success(isEditing ? 'Post atualizado!' : 'Post publicado!');
        onPostCreated();
        onClose();
        return;
      }

      const data = response as { message?: string; reason?: string } | undefined;
      const base = data?.message || TEXT.createError;
      const reason = typeof data?.reason === 'string' && data.reason.trim() ? data.reason.trim() : '';
      setError(reason ? `${base}\n\n${reason}` : base);
    } catch (err: any) {
      const data = err?.response?.data;
      const base = data?.message || TEXT.createError;
      const reason = typeof data?.reason === 'string' && data.reason.trim() ? data.reason.trim() : '';
      console.error('Erro ao salvar post:', { status: err?.response?.status, code: data?.code });
      setError(reason ? `${base}\n\n${reason}` : base);
    } finally {
      setLoading(false);
    }
  };

  const renderExcessTagsText = () => {
    let tagIndex = 0;
    return content.split(/(#[\w\u00C0-\u017F]+)/g).map((part, index) => {
      if (!/^#[\w\u00C0-\u017F]+$/.test(part)) return part;
      const isExcess = tagIndex >= MAX_TAGS;
      tagIndex += 1;
      return (
        <Text key={index} style={isExcess ? styles.excessTag : undefined}>
          {part}
        </Text>
      );
    });
  };

  const toolbarButton = (
    icon: React.ComponentProps<typeof Ionicons>['name'] | null,
    label: string,
    onPress: () => void,
    options: { active?: boolean; text?: string; locked?: boolean } = {}
  ) => (
    <TouchableOpacity
      key={label}
      style={[styles.toolButton, options.active && styles.toolButtonActive]}
      onPressIn={() => richEditorRef.current?.preserveSelection()}
      onPress={onPress}
      accessibilityLabel={label}
      disabled={loading}
    >
      {icon ? (
        <Ionicons name={icon} size={17} color={options.active ? colors.secondary.main : colors.text.secondary} />
      ) : (
        <Text style={[styles.toolButtonText, options.active && { color: colors.secondary.main }]}>
          {options.text}
        </Text>
      )}
      {options.locked ? (
        <View style={styles.lockBadge}>
          <Ionicons name="lock-closed" size={8} color={colors.states.warning} />
        </View>
      ) : null}
    </TouchableOpacity>
  );

  const formatLocked = !canCustomizePostRichText;

  return (
    <CustomModal visible={visible} onClose={onClose} animationType="fade" overlayStyle={styles.overlay}>
      {/* Android: softwareKeyboardLayoutMode=resize — sem behavior height (encolhia 2x). */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
      >
        <View style={[styles.container, { maxHeight: modalMaxHeight }]}>
          {/* Header — avatar, título, @username, visibilidade e categoria */}
          <View style={styles.header}>
            <Avatar user={{ username: user?.username, avatar: user?.avatar }} size={40} disableNavigation />
            <View style={styles.headerInfo}>
              <View style={styles.headerTitleRow}>
                <Text style={styles.headerTitle}>{isEditing ? TEXT.editTitle : TEXT.title}</Text>
                {visibility === 'PUBLIC' ? (
                  <TouchableOpacity
                    onPress={() => setAttentionOpen(true)}
                    hitSlop={10}
                    accessibilityLabel={TEXT.warningTitle}
                    style={styles.attentionIconButton}
                  >
                    <Ionicons name="warning" size={18} color={WARNING_COLOR} />
                  </TouchableOpacity>
                ) : null}
              </View>
              <Text style={styles.headerUsername} numberOfLines={1}>
                {user?.username}
              </Text>
              <View style={styles.headerChips}>
                <TouchableOpacity style={styles.chip} onPress={() => setPicker('visibility')} disabled={loading}>
                  <Ionicons name={visibilityOption.icon} size={11} color={colors.text.secondary} />
                  <Text style={styles.chipText} numberOfLines={1}>
                    {visibilityOption.label}
                  </Text>
                  <Ionicons name="chevron-down" size={10} color={colors.text.tertiary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chip, fieldErrors.category && styles.chipError]}
                  onPress={() => setPicker('category')}
                  disabled={loading}
                >
                  <Ionicons
                    name={(selectedCategory?.icon ?? 'apps-outline') as React.ComponentProps<typeof Ionicons>['name']}
                    size={11}
                    color={category === ADULT_POST_CATEGORY_ID ? ADULT_COLOR : colors.text.secondary}
                  />
                  <Text
                    style={[styles.chipText, fieldErrors.category && { color: PINK_BORDER }]}
                    numberOfLines={1}
                  >
                    {selectedCategory?.name ?? 'Categoria'}
                  </Text>
                  <Ionicons name="chevron-down" size={10} color={colors.text.tertiary} />
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityLabel="Fechar">
              <Ionicons name="close" size={22} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="none"
            nestedScrollEnabled
            // Evita o ScrollView “roubar” o gesto de seleção do TextInput.
            scrollEnabled={!editorFocused}
          >
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={18} color={colors.states.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {showValidationSummary && Object.keys(fieldErrors).length > 0 ? (
              <Text style={styles.validationSummary}>{TEXT.validationSummary}</Text>
            ) : null}

            {/* Barra de formatação acima do texto (igual web) */}
            <View style={styles.toolbar}>
              {toolbarButton(null, 'Negrito', () => runFormat('bold'), { text: 'B', locked: formatLocked })}
              {toolbarButton(null, 'Itálico', () => runFormat('italic'), { text: 'I', locked: formatLocked })}
              {toolbarButton('list', 'Lista (bullet)', () => runFormat('bullet'), { locked: formatLocked })}
              {toolbarButton('color-palette-outline', 'Cor do texto', () => runFormat('fg'), {
                active: palette === 'fg',
                locked: formatLocked,
              })}
              {toolbarButton('color-fill-outline', 'Cor de fundo', () => runFormat('bg'), {
                active: palette === 'bg',
                locked: formatLocked,
              })}
            </View>
            {palette ? (
              <View style={styles.paletteRow}>
                {(palette === 'fg' ? RICH_TEXT_COLORS : RICH_TEXT_BG_COLORS)
                  .filter((color) => color.value)
                  .map((color) => (
                    <TouchableOpacity
                      key={color.id}
                      style={[styles.swatch, { backgroundColor: color.value }]}
                      onPressIn={() => richEditorRef.current?.preserveSelection()}
                      onPress={() => applyColor(color.value)}
                      accessibilityLabel={color.label}
                    />
                  ))}
              </View>
            ) : null}

            <View style={[styles.editor, fieldErrors.content && styles.editorError]}>
              <CustomRichTextEditor
                ref={richEditorRef}
                value={content}
                onChange={applyContent}
                placeholder={canUploadImage ? TEXT.placeholder : TEXT.placeholderFree}
                maxChars={MAX_CHARS}
                editable={!loading}
                minHeight={180}
                textStyle={{ color: colors.text.primary }}
                onFocusChange={setEditorFocused}
              />

              {hasExplicitContent && content.trim() ? (
                <View style={styles.explicitBox}>
                  <Text style={styles.explicitTitle}>{TEXT.explicitTermsDetected}</Text>
                  <Text style={styles.explicitText}>
                    {segmentTextByExplicitTerms(plainContent).map((segment, index) => (
                      <Text key={index} style={segment.isExplicit ? styles.explicitTerm : undefined}>
                        {segment.text}
                      </Text>
                    ))}
                  </Text>
                  <Text style={styles.explicitHint}>{TEXT.explicitTermsHint}</Text>
                </View>
              ) : null}

              <View style={styles.editorFooter}>
                <View style={styles.editorFooterLeft}>
                  {!isEditing ? (
                    <View style={styles.linkField}>
                      <Text style={styles.linkLabel}>{TEXT.linkLabel}:</Text>
                      <PlanLocker requiredPlan="STARTER" currentPlan={userPlan} variant="compact">
                        <TouchableOpacity
                          style={styles.linkSelect}
                          onPress={() => setPicker('link')}
                          disabled={loading || !canAttachPostLink}
                        >
                          <Text style={styles.linkSelectText} numberOfLines={1}>
                            {selectedLink ? selectedLink.title : TEXT.noLink}
                          </Text>
                          <Ionicons name="chevron-down" size={12} color={colors.text.tertiary} />
                        </TouchableOpacity>
                      </PlanLocker>
                    </View>
                  ) : null}
                  {toolbarButton('image-outline', 'Adicionar Imagem', handlePickImage, {
                    active: Boolean(imagePreview),
                    locked: !canUploadImage,
                  })}
                </View>
                <View style={styles.counters}>
                  {allHashtags.length > 0 ? (
                    <Text style={[styles.counterText, hasExcessTags && styles.counterError]}>
                      {validTagsCount}/{MAX_TAGS} tags{hasExcessTags ? ` (+${excessTagsCount} excedentes)` : ''}
                    </Text>
                  ) : null}
                  <Text style={styles.counterText}>
                    {plainContent.length}/{MAX_CHARS}
                  </Text>
                </View>
              </View>
            </View>

            {hasExcessTags ? (
              <View style={styles.excessBox}>
                <Text style={styles.excessText}>
                  <Text style={styles.bold}>{TEXT.tagsExcessTitle}</Text> {TEXT.tagsExcessMessage}
                </Text>
                <View style={styles.excessPreview}>
                  <Text style={styles.excessPreviewText}>{renderExcessTagsText()}</Text>
                </View>
              </View>
            ) : null}

            {/* Preview automático do 1º link do texto */}
            {!isEditing && !selectedLinkId && !hideAutoPreview && (loadingPreview || autoLinkPreview) ? (
              loadingPreview || !autoLinkPreview ? (
                <LinkPreviewCard preview={{} as LinkPreviewData} loading />
              ) : (
                <LinkPreviewCard preview={autoLinkPreview} onRemove={() => setHideAutoPreview(true)} />
              )
            ) : null}

            {/* Link do perfil anexado */}
            {!isEditing && selectedLink ? (
              <LinkPreviewCard preview={postLinkToPreview(selectedLink)} onRemove={() => setSelectedLinkId('')} />
            ) : null}

            {imagePreview ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: imagePreview }} style={styles.imagePreviewImage} resizeMode="cover" />
                <TouchableOpacity
                  onPress={() => {
                    setSelectedImage(null);
                    setImagePreview(null);
                  }}
                  style={styles.removeImageButton}
                  disabled={loading}
                  accessibilityLabel="Remover imagem"
                >
                  <Ionicons name="close" size={18} color="#ffffff" />
                </TouchableOpacity>
              </View>
            ) : null}

            {!keyboardOpen ? <Text style={styles.categoryHelp}>{TEXT.categoryHelp}</Text> : null}
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <Button
              variant="ghost"
              size="sm"
              responsive={false}
              onPress={onClose}
              disabled={loading}
              style={styles.footerBtn}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              responsive={false}
              onPress={handleSubmit}
              loading={loading}
              disabled={loading}
              style={styles.footerBtn}
            >
              {isEditing ? 'Salvar' : 'Publicar'}
            </Button>
          </View>

          {/* Seletores (sheet interno) */}
          {picker ? (
            <Pressable style={styles.pickerModal} onPress={() => setPicker(null)}>
              <Pressable style={styles.pickerModalContent} onPress={(e) => e.stopPropagation()}>
                <Text style={styles.pickerModalTitle}>
                  {picker === 'category' ? 'Categoria' : picker === 'visibility' ? 'Visibilidade' : TEXT.linkLabel}
                </Text>
                <ScrollView>
                  {picker === 'category'
                    ? FIXED_CATEGORIES.map((cat) => {
                        const adult = cat._id === ADULT_POST_CATEGORY_ID;
                        return (
                          <TouchableOpacity
                            key={cat._id}
                            style={[styles.pickerOption, category === cat._id && styles.pickerOptionSelected]}
                            onPress={() => handleCategorySelect(cat._id)}
                          >
                            <Ionicons
                              name={cat.icon as React.ComponentProps<typeof Ionicons>['name']}
                              size={18}
                              color={adult ? ADULT_COLOR : colors.text.secondary}
                            />
                            <Text style={styles.pickerOptionText}>{cat.name}</Text>
                          </TouchableOpacity>
                        );
                      })
                    : null}

                  {picker === 'visibility'
                    ? POST_VISIBILITY_OPTIONS.map((opt) => (
                        <TouchableOpacity
                          key={opt.value}
                          style={[styles.pickerOption, visibility === opt.value && styles.pickerOptionSelected]}
                          onPress={() => {
                            setVisibility(opt.value);
                            setPicker(null);
                          }}
                        >
                          <Ionicons name={opt.icon} size={18} color={colors.text.secondary} />
                          <Text style={styles.pickerOptionText}>{opt.label}</Text>
                        </TouchableOpacity>
                      ))
                    : null}

                  {picker === 'link' ? (
                    <>
                      <TouchableOpacity
                        style={[styles.pickerOption, !selectedLinkId && styles.pickerOptionSelected]}
                        onPress={() => {
                          setSelectedLinkId('');
                          setPicker(null);
                        }}
                      >
                        <Ionicons name="remove-circle-outline" size={18} color={colors.text.secondary} />
                        <Text style={styles.pickerOptionText}>{TEXT.noLink}</Text>
                      </TouchableOpacity>
                      {myLinks.map((link) => (
                        <TouchableOpacity
                          key={link._id}
                          style={[styles.pickerOption, selectedLinkId === link._id && styles.pickerOptionSelected]}
                          onPress={() => {
                            setSelectedLinkId(link._id);
                            setHideAutoPreview(false);
                            setPicker(null);
                          }}
                        >
                          <Ionicons name="link-outline" size={18} color={colors.text.secondary} />
                          <View style={styles.pickerOptionTextWrap}>
                            <Text style={styles.pickerOptionText} numberOfLines={1}>
                              {link.title}
                            </Text>
                            <Text style={styles.pickerOptionSub} numberOfLines={1}>
                              {link.url}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                      {myLinks.length === 0 ? (
                        <Button
                          variant="outline"
                          size="sm"
                          responsive={false}
                          onPress={handleOpenLinksSettings}
                          style={styles.addLinkButton}
                        >
                          {TEXT.addLinkButton}
                        </Button>
                      ) : null}
                    </>
                  ) : null}
                </ScrollView>
                <Button variant="ghost" size="sm" responsive={false} onPress={() => setPicker(null)}>
                  Fechar
                </Button>
              </Pressable>
            </Pressable>
          ) : null}
        </View>
      </KeyboardAvoidingView>

      <CustomModal
        visible={proImageDialogOpen}
        onClose={() => setProImageDialogOpen(false)}
        title={TEXT.proImageTitle}
        message={TEXT.proImageDescription}
        buttons={[
          { text: 'Continuar sem imagem', style: 'cancel', onPress: () => setProImageDialogOpen(false) },
          { text: 'Ver planos', onPress: handleOpenPlans },
        ]}
      />
      <CustomModal
        visible={liteFormatDialogOpen}
        onClose={() => setLiteFormatDialogOpen(false)}
        title={TEXT.liteFormatTitle}
        message={TEXT.liteFormatDescription}
        buttons={[
          { text: 'Continuar sem formatação', style: 'cancel', onPress: () => setLiteFormatDialogOpen(false) },
          { text: 'Ver planos', onPress: handleOpenPlans },
        ]}
      />

      <ModalBottom visible={attentionOpen} onClose={() => setAttentionOpen(false)} maxHeight="50%">
        <View style={styles.attentionSheet}>
          <View style={styles.attentionSheetHeader}>
            <Ionicons name="warning" size={22} color={WARNING_COLOR} />
            <Text style={styles.attentionSheetTitle}>{TEXT.warningTitle}</Text>
          </View>
          <Text style={styles.attentionSheetText}>
            {renderBoldMarkdown(TEXT.warningContent, styles.bold)}
          </Text>
          <Button
            variant="ghost"
            size="sm"
            responsive={false}
            onPress={() => setAttentionOpen(false)}
            style={styles.attentionSheetClose}
          >
            Entendi
          </Button>
        </View>
      </ModalBottom>
    </CustomModal>
  );
}

const createStyles = (c: AppPalette) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: c.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardAvoid: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  container: {
    width: '100%',
    maxWidth: 560,
    // Altura pelo conteúdo; maxHeight dinâmico no JSX (responsivo ao teclado).
    flexDirection: 'column',
    backgroundColor: c.background.paper,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${c.secondary.main}55`,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border.light,
  },
  headerInfo: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: c.text.primary,
    flexShrink: 1,
  },
  attentionIconButton: {
    padding: 2,
  },
  headerUsername: {
    fontSize: 12,
    color: c.text.secondary,
    maxWidth: '100%',
  },
  headerChips: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    gap: 6,
    marginTop: 2,
    maxWidth: '100%',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 22,
    maxWidth: '48%',
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: c.background.tertiary,
    borderWidth: 1,
    borderColor: c.border.light,
    flexShrink: 1,
  },
  chipError: {
    borderColor: PINK_BORDER,
  },
  chipText: {
    fontSize: 11,
    color: c.text.primary,
    flexShrink: 1,
  },
  closeButton: {
    padding: 4,
    alignSelf: 'flex-start',
  },
  body: {
    flexGrow: 0,
    flexShrink: 1,
  },
  bodyContent: {
    padding: 14,
    gap: 12,
  },
  errorBox: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: `${c.states.error}1a`,
    borderWidth: 1,
    borderColor: `${c.states.error}55`,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: c.text.primary,
  },
  validationSummary: {
    fontSize: 13,
    fontWeight: '500',
    color: PINK_BORDER,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 6,
  },
  toolButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: c.border.light,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.background.paper,
  },
  toolButtonActive: {
    borderColor: c.secondary.main,
  },
  toolButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: c.text.secondary,
  },
  lockBadge: {
    position: 'absolute',
    right: 1,
    bottom: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: c.background.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paletteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 8,
  },
  swatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: c.border.medium,
  },
  editor: {
    borderWidth: 1,
    borderColor: c.border.light,
    borderRadius: 12,
    overflow: 'hidden',
  },
  editorError: {
    borderColor: PINK_BORDER,
  },
  explicitBox: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderTopColor: c.border.light,
    backgroundColor: c.background.tertiary,
    gap: 6,
  },
  explicitTitle: {
    fontSize: 12,
    color: WARNING_COLOR,
  },
  explicitText: {
    fontSize: 13,
    color: c.text.secondary,
  },
  explicitTerm: {
    color: c.states.error,
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  explicitHint: {
    fontSize: 12,
    color: c.text.secondary,
  },
  editorFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: c.border.light,
    backgroundColor: c.background.tertiary,
  },
  editorFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  linkField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  linkLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: c.text.secondary,
  },
  linkSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: 130,
    height: 32,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border.light,
    backgroundColor: c.background.paper,
  },
  linkSelectText: {
    flex: 1,
    fontSize: 11,
    color: c.text.primary,
  },
  counters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 'auto',
  },
  counterText: {
    fontSize: 12,
    color: c.text.secondary,
  },
  counterError: {
    color: c.states.error,
    fontWeight: '600',
  },
  excessBox: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: `${c.states.error}14`,
    borderWidth: 1,
    borderColor: `${c.states.error}55`,
    gap: 8,
  },
  excessText: {
    fontSize: 13,
    color: c.text.primary,
    lineHeight: 18,
  },
  excessPreview: {
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: c.states.error,
    backgroundColor: c.background.paper,
  },
  excessPreviewText: {
    fontSize: 13,
    color: c.text.primary,
  },
  excessTag: {
    color: c.states.error,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  bold: {
    fontWeight: '700',
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagePreviewImage: {
    width: '100%',
    height: 140,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryHelp: {
    fontSize: 12,
    color: c.text.secondary,
  },
  attentionSheet: {
    paddingHorizontal: 16,
    gap: 12,
  },
  attentionSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attentionSheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: c.text.primary,
  },
  attentionSheetText: {
    fontSize: 14,
    lineHeight: 21,
    color: c.text.primary,
  },
  attentionSheetClose: {
    alignSelf: 'stretch',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: c.border.light,
  },
  footerBtn: {
    flex: 1,
    minWidth: 0,
  },
  pickerModal: {
    ...StyleSheet.absoluteFill,
    backgroundColor: c.overlay,
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    backgroundColor: c.background.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    gap: 10,
    maxHeight: '80%',
  },
  pickerModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: c.text.primary,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border.light,
    backgroundColor: c.background.tertiary,
    marginBottom: 6,
  },
  pickerOptionSelected: {
    borderColor: c.secondary.main,
    backgroundColor: `${c.secondary.main}14`,
  },
  pickerOptionTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  pickerOptionText: {
    fontSize: 14,
    color: c.text.primary,
  },
  pickerOptionSub: {
    fontSize: 11,
    color: c.text.secondary,
  },
  addLinkButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
});
