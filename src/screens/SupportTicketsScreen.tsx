import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import ImageViewing from 'react-native-image-viewing';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BackButton } from '../components/BackButton';
import { Button } from '../components/Button';
import { COLORS } from '../theme/colors';
import { showToast } from '../components/CustomToast';
import { useAuth } from '../contexts/AuthContext';
import { supportTicketsApi, SupportTicket } from '../services/api';
import { getImageUrl } from '../utils/image';
import {
  TICKET_DESCRIPTION_MAX_LENGTH,
  TICKET_DESCRIPTION_MIN_LENGTH,
  TICKET_IMAGE_MAX_BYTES,
  TICKET_PAGE_OPTIONS,
  TICKET_PAGE_OTHER_MAX_LENGTH,
  TICKET_PRIORITIES,
  TICKET_TITLE_MAX_LENGTH,
  TICKET_TITLE_MIN_LENGTH,
  TicketPageValue,
  TicketPriority,
} from '../config/support-tickets.config';
import { isSupportTicketListHiddenForUser } from '../utils/support-tickets-flags';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  baixo: 'Baixo',
  moderado: 'Moderado',
  alto: 'Alto',
  critico: 'Crítico',
};

export function SupportTicketsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isAdmin = user?.accountType === 'admin';
  const hideList = isSupportTicketListHiddenForUser(isAdmin);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [page, setPage] = useState<TicketPageValue>(TICKET_PAGE_OPTIONS[0]);
  const [pageOther, setPageOther] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('moderado');
  const [pickedImage, setPickedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'em_analise' | 'resolvido'>('all');

  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerImages, setViewerImages] = useState<{ uri: string }[]>([]);

  const listFiltersRef = useRef({ search, statusFilter });
  listFiltersRef.current = { search, statusFilter };

  const fetchTickets = useCallback(async () => {
    if (!user?.id) return;
    if (hideList) {
      setTickets([]);
      return;
    }
    setLoadingList(true);
    try {
      const { search: qRaw, statusFilter: st } = listFiltersRef.current;
      const params: { q?: string; status?: string } = {};
      if (qRaw.trim()) params.q = qRaw.trim();
      if (st !== 'all') params.status = st;
      const res = isAdmin
        ? await supportTicketsApi.listAdmin(params)
        : await supportTicketsApi.listMine(params);
      if (res.success && Array.isArray(res.data)) {
        setTickets(res.data);
      } else {
        showToast.error('Erro', res.message || 'Não foi possível carregar os tickets');
      }
    } catch (e) {
      console.error(e);
      showToast.error('Erro', 'Não foi possível carregar os tickets');
    } finally {
      setLoadingList(false);
      setRefreshing(false);
    }
  }, [user?.id, isAdmin, hideList]);

  useFocusEffect(
    useCallback(() => {
      fetchTickets();
    }, [fetchTickets])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchTickets();
  };

  const pickEvidence = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permissão', 'Precisamos da galeria para anexar uma imagem.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (asset.fileSize != null && asset.fileSize > TICKET_IMAGE_MAX_BYTES) {
      showToast.error('Arquivo grande', 'Imagem máxima 10 MB.');
      return;
    }
    setPickedImage(asset);
  };

  const openEvidence = (url?: string | null) => {
    if (!url) return;
    const full = getImageUrl(url);
    if (!full) return;
    setViewerImages([{ uri: full }]);
    setViewerVisible(true);
  };

  const submitTicket = async () => {
    const tTrim = title.trim();
    const dTrim = description.trim();
    if (tTrim.length < TICKET_TITLE_MIN_LENGTH || tTrim.length > TICKET_TITLE_MAX_LENGTH) {
      showToast.error(
        'Assunto',
        `Informe entre ${TICKET_TITLE_MIN_LENGTH} e ${TICKET_TITLE_MAX_LENGTH} caracteres no assunto.`
      );
      return;
    }
    if (dTrim.length < TICKET_DESCRIPTION_MIN_LENGTH || dTrim.length > TICKET_DESCRIPTION_MAX_LENGTH) {
      showToast.error(
        'Descrição',
        `Informe entre ${TICKET_DESCRIPTION_MIN_LENGTH} e ${TICKET_DESCRIPTION_MAX_LENGTH} caracteres na descrição.`
      );
      return;
    }
    if (page === 'other' && !pageOther.trim()) {
      showToast.error('Página', 'Descreva qual página em "Outra página".');
      return;
    }

    setSubmitting(true);
    try {
      const res = await supportTicketsApi.create({
        title: tTrim,
        description: dTrim,
        page: page === 'other' ? 'other' : page,
        pageOther: page === 'other' ? pageOther.trim().slice(0, TICKET_PAGE_OTHER_MAX_LENGTH) : undefined,
        priority,
        image: pickedImage
          ? {
              uri: pickedImage.uri,
              type: pickedImage.mimeType || 'image/jpeg',
              name: pickedImage.fileName || `ticket_${Date.now()}.jpg`,
            }
          : null,
      });
      if (res.success) {
        showToast.success('Enviado', 'Ticket registrado com sucesso.');
        setTitle('');
        setDescription('');
        setPage(TICKET_PAGE_OPTIONS[0]);
        setPageOther('');
        setPriority('moderado');
        setPickedImage(null);
        if (!hideList) fetchTickets();
      } else {
        showToast.error('Erro', res.message || 'Não foi possível enviar o ticket');
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Não foi possível enviar o ticket';
      showToast.error('Erro', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <BackButton />
        <Text style={styles.headerTitle}>Tickets / Suporte</Text>
      </View>
      {isAdmin ? (
        <View style={styles.adminBadge}>
          <Ionicons name="shield-checkmark" size={16} color={COLORS.secondary.main} />
          <Text style={styles.adminBadgeText}>Admin: visualização de todos os tickets</Text>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          hideList ? undefined : (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.secondary.main} />
          )
        }
      >
        <Text style={styles.sectionTitle}>Abrir ticket ou reportar problema</Text>

        <Text style={styles.label}>Assunto</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={(text) => setTitle(text.slice(0, TICKET_TITLE_MAX_LENGTH))}
          placeholder="Resumo curto"
          placeholderTextColor={COLORS.text.tertiary}
          maxLength={TICKET_TITLE_MAX_LENGTH}
        />
        <Text style={styles.counter}>
          {title.length}/{TICKET_TITLE_MAX_LENGTH}
        </Text>

        <Text style={styles.label}>Página relacionada</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={page}
            onValueChange={(v) => setPage(v as TicketPageValue)}
            dropdownIconColor={COLORS.text.secondary}
          >
            {TICKET_PAGE_OPTIONS.map((p) => (
              <Picker.Item key={p} label={p} value={p} />
            ))}
            <Picker.Item label="Outra página" value="other" />
          </Picker>
        </View>

        {page === 'other' ? (
          <>
            <Text style={styles.label}>Qual página?</Text>
            <TextInput
              style={styles.input}
              value={pageOther}
              onChangeText={(text) => setPageOther(text.slice(0, TICKET_PAGE_OTHER_MAX_LENGTH))}
              placeholder="Descreva a rota ou tela"
              placeholderTextColor={COLORS.text.tertiary}
              maxLength={TICKET_PAGE_OTHER_MAX_LENGTH}
            />
            <Text style={styles.counter}>
              {pageOther.length}/{TICKET_PAGE_OTHER_MAX_LENGTH}
            </Text>
          </>
        ) : null}

        <Text style={styles.label}>Descrição</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={description}
          onChangeText={(text) => setDescription(text.slice(0, TICKET_DESCRIPTION_MAX_LENGTH))}
          placeholder="Detalhe o problema ou reclamação"
          placeholderTextColor={COLORS.text.tertiary}
          multiline
          maxLength={TICKET_DESCRIPTION_MAX_LENGTH}
          textAlignVertical="top"
        />
        <Text style={styles.counter}>
          {description.length}/{TICKET_DESCRIPTION_MAX_LENGTH}
        </Text>

        <Text style={styles.label}>Prioridade</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={priority}
            onValueChange={(v) => setPriority(v as TicketPriority)}
            dropdownIconColor={COLORS.text.secondary}
          >
            {TICKET_PRIORITIES.map((p) => (
              <Picker.Item key={p} label={PRIORITY_LABELS[p]} value={p} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Evidência (opcional)</Text>
        <TouchableOpacity style={styles.imagePickBtn} onPress={pickEvidence} activeOpacity={0.75}>
          <Ionicons name="image-outline" size={22} color={COLORS.secondary.main} />
          <Text style={styles.imagePickText}>{pickedImage ? 'Trocar imagem' : 'Anexar imagem'}</Text>
        </TouchableOpacity>
        {pickedImage?.uri ? (
          <View style={styles.previewRow}>
            <Image source={{ uri: pickedImage.uri }} style={styles.previewImg} />
            <TouchableOpacity onPress={() => setPickedImage(null)}>
              <Text style={styles.removeImg}>Remover</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <Button variant="primary" size="md" onPress={submitTicket} disabled={submitting} style={styles.submitBtn}>
          {submitting ? 'Enviando...' : 'Enviar ticket'}
        </Button>

        {hideList ? (
          <View style={styles.hiddenBox}>
            <Text style={styles.hiddenText}>
              A lista de tickets está oculta neste ambiente. Você ainda pode enviar novos relatórios acima.
            </Text>
          </View>
        ) : (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 28 }]}>
              {isAdmin ? 'Todos os tickets' : 'Meus tickets'}
            </Text>
            {!isAdmin ? (
              <Text style={styles.hint}>Somente os tickets que você abriu aparecem aqui.</Text>
            ) : null}

            <Text style={styles.label}>Buscar</Text>
            <TextInput
              style={styles.input}
              value={search}
              onChangeText={setSearch}
              placeholder="Assunto ou descrição"
              placeholderTextColor={COLORS.text.tertiary}
            />

            <Text style={styles.label}>Status</Text>
            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={statusFilter}
                onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
                dropdownIconColor={COLORS.text.secondary}
              >
                <Picker.Item label="Todos" value="all" />
                <Picker.Item label="Em análise" value="em_analise" />
                <Picker.Item label="Resolvido" value="resolvido" />
              </Picker>
            </View>

            <TouchableOpacity style={styles.refreshBtn} onPress={() => fetchTickets()} disabled={loadingList}>
              {loadingList ? (
                <ActivityIndicator color={COLORS.secondary.main} />
              ) : (
                <Text style={styles.refreshBtnText}>Atualizar lista</Text>
              )}
            </TouchableOpacity>

            {tickets.length === 0 && !loadingList ? (
              <Text style={styles.empty}>Nenhum ticket encontrado.</Text>
            ) : (
              tickets.map((ticket) => (
                <View key={ticket._id} style={styles.card}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {ticket.title}
                  </Text>
                  {isAdmin && ticket.createdBy?.username ? (
                    <Text style={styles.cardMeta}>@{ticket.createdBy.username}</Text>
                  ) : null}
                  <Text style={styles.cardMeta}>
                    {ticket.status === 'em_analise' ? 'Em análise' : 'Resolvido'} ·{' '}
                    {ticket.priority ? PRIORITY_LABELS[ticket.priority as TicketPriority] || ticket.priority : ''} ·{' '}
                    {format(new Date(ticket.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </Text>
                  <Text style={styles.cardPage} numberOfLines={2}>
                    Página:{' '}
                    {ticket.page === 'other'
                      ? ticket.pageOther || 'Outra página'
                      : ticket.page}
                  </Text>
                  <Text style={styles.cardDesc}>{ticket.description}</Text>
                  {ticket.imageUrl ? (
                    <TouchableOpacity activeOpacity={0.85} onPress={() => openEvidence(ticket.imageUrl)}>
                      <Image
                        source={{ uri: getImageUrl(ticket.imageUrl) || '' }}
                        style={styles.cardThumb}
                        resizeMode="contain"
                      />
                      <Text style={styles.tapEnlarge}>Toque para ampliar</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))
            )}
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      <ImageViewing
        images={viewerImages}
        imageIndex={0}
        visible={viewerVisible}
        onRequestClose={() => setViewerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.medium,
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    flex: 1,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  adminBadgeText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    flex: 1,
  },
  scroll: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  hint: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text.primary,
    backgroundColor: COLORS.background.paper,
  },
  multiline: {
    minHeight: 120,
  },
  counter: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.background.paper,
  },
  imagePickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  imagePickText: {
    fontSize: 15,
    color: COLORS.secondary.main,
    fontWeight: '600',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
  },
  previewImg: {
    width: 96,
    height: 96,
    borderRadius: 8,
    backgroundColor: COLORS.border.light,
  },
  removeImg: {
    color: '#c62828',
    fontWeight: '600',
  },
  submitBtn: {
    marginTop: 20,
  },
  hiddenBox: {
    marginTop: 24,
    padding: 14,
    borderRadius: 12,
    backgroundColor: COLORS.background.paper,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
  },
  hiddenText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  refreshBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginVertical: 12,
  },
  refreshBtnText: {
    color: COLORS.secondary.main,
    fontWeight: '700',
    fontSize: 15,
  },
  empty: {
    textAlign: 'center',
    color: COLORS.text.secondary,
    marginTop: 16,
  },
  card: {
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    backgroundColor: COLORS.background.paper,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  cardMeta: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  cardPage: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginTop: 8,
  },
  cardDesc: {
    fontSize: 14,
    color: COLORS.text.primary,
    marginTop: 10,
    lineHeight: 21,
  },
  cardThumb: {
    width: '100%',
    height: 140,
    marginTop: 12,
    borderRadius: 8,
    backgroundColor: COLORS.border.light,
  },
  tapEnlarge: {
    fontSize: 12,
    color: COLORS.secondary.main,
    marginTop: 6,
  },
});
