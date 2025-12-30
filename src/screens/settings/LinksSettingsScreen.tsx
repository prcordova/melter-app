import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BackButton } from '../../components/BackButton';
import { AddLinkModal } from '../../components/links/AddLinkModal';
import { LinkEditCard } from '../../components/links/LinkEditCard';
import { CustomModal, useCustomModal } from '../../components/CustomModal';
import { linksApi, userApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS } from '../../theme/colors';
import { showToast } from '../../components/CustomToast';

interface LinkItem {
  id: string;
  title: string;
  url: string;
  description?: string;
  imageUrl?: string;
  visible: boolean;
  createdAt: string;
  likes?: number;
  order: number;
}

interface ApiLink {
  _id: string;
  title: string;
  url: string;
  description?: string;
  imageUrl?: string;
  visible: boolean;
  createdAt: string;
  order: number;
  likes?: number;
}

export function LinksSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();
  const { modalProps, showConfirm, hideModal } = useCustomModal();

  const [links, setLinks] = useState<LinkItem[]>([]);
  const [pendingLinks, setPendingLinks] = useState<LinkItem[]>([]);
  const [originalLinks, setOriginalLinks] = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [openNewLinkModal, setOpenNewLinkModal] = useState(false);
  const [maxLinks, setMaxLinks] = useState(3);
  const [sortMode, setSortMode] = useState<'custom' | 'date' | 'name' | 'likes'>('custom');
  const [deleteLinkId, setDeleteLinkId] = useState<string | null>(null);

  // Detectar se há mudanças pendentes
  const hasChanges = useCallback(() => {
    if (pendingLinks.length !== originalLinks.length) return true;

    return pendingLinks.some((link) => {
      const original = originalLinks.find((l) => l.id === link.id);
      if (!original) return true;

      return (
        link.title !== original.title ||
        link.url !== original.url ||
        link.description !== original.description ||
        link.imageUrl !== original.imageUrl ||
        link.visible !== original.visible
      );
    });
  }, [pendingLinks, originalLinks]);

  // Carregar links
  const loadLinks = async () => {
    try {
      setLoading(true);
      const response = await userApi.getMyProfile();

      if (response.success) {
        const formattedLinks = (response.data.links || [])
          .map((link: ApiLink) => ({
            id: link._id,
            title: link.title,
            url: link.url,
            description: link.description,
            imageUrl: link.imageUrl,
            visible: link.visible,
            createdAt: link.createdAt,
            order: link.order,
            likes: link.likes || 0,
          }))
          .sort((a: LinkItem, b: LinkItem) => a.order - b.order);

        setLinks(formattedLinks);
        setPendingLinks(formattedLinks);
        setOriginalLinks(JSON.parse(JSON.stringify(formattedLinks)));

        const maxLinksMap: Record<string, number> = {
          FREE: 3,
          STARTER: 10,
          PRO: 50,
          PRO_PLUS: 50,
        };
        setMaxLinks(maxLinksMap[response.data.plan?.type] || 3);

        if (response.data.profile?.sortMode) {
          setSortMode(response.data.profile.sortMode);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar links:', error);
      showToast.error('Erro', 'Não foi possível carregar os links');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLinks();
  }, []);

  // Salvar todas as alterações pendentes
  const handleSaveChanges = async () => {
    if (!hasChanges()) return;

    try {
      setSaving(true);

      // Atualizar cada link que foi modificado
      const updatePromises = pendingLinks.map(async (link) => {
        const original = originalLinks.find((l) => l.id === link.id);

        if (
          !original ||
          link.title !== original.title ||
          link.url !== original.url ||
          link.description !== original.description ||
          link.imageUrl !== original.imageUrl ||
          link.visible !== original.visible
        ) {
          return linksApi.updateLink(link.id, {
            title: link.title,
            url: link.url,
            description: link.description || '',
            imageUrl: link.imageUrl || null,
            visible: link.visible,
          });
        }
        return null;
      });

      await Promise.all(updatePromises.filter(Boolean));

      // Atualizar os links originais com os novos valores
      setOriginalLinks(JSON.parse(JSON.stringify(pendingLinks)));
      setLinks(pendingLinks);

      showToast.success('Sucesso', 'Alterações salvas com sucesso');
    } catch (error) {
      console.error('Erro ao salvar alterações:', error);
      showToast.error('Erro', 'Não foi possível salvar as alterações');
    } finally {
      setSaving(false);
    }
  };

  const handleAddLink = async (linkData: { title: string; url: string; visible: boolean }) => {
    try {
      setLoading(true);
      const response = await linksApi.createLink(linkData);

      if (response.success) {
        const newLink: LinkItem = {
          id: response.data._id,
          title: response.data.title,
          url: response.data.url,
          description: response.data.description,
          imageUrl: response.data.imageUrl,
          visible: response.data.visible,
          order: response.data.order,
          likes: 0,
          createdAt: response.data.createdAt || new Date().toISOString(),
        };

        setLinks((prev) => [...prev, newLink]);
        setPendingLinks((prev) => [...prev, newLink]);
        setOpenNewLinkModal(false);

        showToast.success('Sucesso', 'Link adicionado com sucesso');
      }
    } catch (error) {
      console.error('Erro ao criar link:', error);
      showToast.error('Erro', 'Não foi possível criar o link');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLink = (id: string, data: Partial<LinkItem>) => {
    if (!id) return;

    setPendingLinks((prev) => prev.map((link) => (link.id === id ? { ...link, ...data } : link)));
  };

  const handleDeleteLink = (id: string) => {
    setDeleteLinkId(id);
    showConfirm(
      'Excluir Link',
      'Tem certeza que deseja excluir este link? Esta ação não pode ser desfeita.',
      async () => {
        if (!deleteLinkId) return;

        try {
          await linksApi.deleteLink(deleteLinkId);

          const updatedLinks = links.filter((link) => link.id !== deleteLinkId);
          setLinks(updatedLinks);
          setPendingLinks(updatedLinks);
          setOriginalLinks(updatedLinks);

          setDeleteLinkId(null);
          showToast.success('Sucesso', 'Link excluído com sucesso');
        } catch (error) {
          console.error('Erro ao excluir link:', error);
          showToast.error('Erro', 'Não foi possível excluir o link');
        }
      },
      {
        confirmText: 'Excluir',
        cancelText: 'Cancelar',
        destructive: true,
        onCancel: () => {
          setDeleteLinkId(null);
        },
      }
    );
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;

    const newLinks = [...pendingLinks];
    const temp = newLinks[index];
    newLinks[index] = newLinks[index - 1];
    newLinks[index - 1] = temp;

    const updatedLinks = newLinks.map((link, idx) => ({
      ...link,
      order: idx,
    }));

    setPendingLinks(updatedLinks);

    // Salvar ordem automaticamente
    if (sortMode === 'custom') {
      try {
        const linkIds = updatedLinks.map((link) => link.id);
        const response = await linksApi.reorderLinks(linkIds);

        if (response.success) {
          setLinks(updatedLinks);
          setOriginalLinks(updatedLinks);
          showToast.success('Sucesso', 'Ordem atualizada');
        }
      } catch (error) {
        console.error('Erro ao atualizar ordem:', error);
        showToast.error('Erro', 'Não foi possível atualizar a ordem');
        // Reverter mudança
        setPendingLinks(pendingLinks);
      }
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === pendingLinks.length - 1) return;

    const newLinks = [...pendingLinks];
    const temp = newLinks[index];
    newLinks[index] = newLinks[index + 1];
    newLinks[index + 1] = temp;

    const updatedLinks = newLinks.map((link, idx) => ({
      ...link,
      order: idx,
    }));

    setPendingLinks(updatedLinks);

    // Salvar ordem automaticamente
    if (sortMode === 'custom') {
      try {
        const linkIds = updatedLinks.map((link) => link.id);
        const response = await linksApi.reorderLinks(linkIds);

        if (response.success) {
          setLinks(updatedLinks);
          setOriginalLinks(updatedLinks);
          showToast.success('Sucesso', 'Ordem atualizada');
        }
      } catch (error) {
        console.error('Erro ao atualizar ordem:', error);
        showToast.error('Erro', 'Não foi possível atualizar a ordem');
        // Reverter mudança
        setPendingLinks(pendingLinks);
      }
    }
  };

  const handleSort = async (mode: 'custom' | 'date' | 'name' | 'likes') => {
    try {
      const response = await userApi.getMyProfile();

      if (response.success) {
        const formattedLinks = (response.data.links || [])
          .sort((a: ApiLink, b: ApiLink) => {
            switch (mode) {
              case 'date':
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
              case 'name':
                return a.title.localeCompare(b.title);
              case 'likes':
                return (b.likes || 0) - (a.likes || 0);
              default:
                return a.order - b.order;
            }
          })
          .map((link: ApiLink, index: number): LinkItem => ({
            id: link._id,
            title: link.title,
            url: link.url,
            description: link.description,
            imageUrl: link.imageUrl,
            visible: link.visible,
            createdAt: link.createdAt,
            order: index, // Atualizar order baseado na nova posição
            likes: link.likes || 0,
          }));

        setLinks(formattedLinks);
        setPendingLinks(formattedLinks);

        // Se mudou para modo custom, salvar a ordem automaticamente
        if (mode === 'custom') {
          try {
            const linkIds = formattedLinks.map((link: LinkItem) => link.id);
            const reorderResponse = await linksApi.reorderLinks(linkIds);

            if (reorderResponse.success) {
              setOriginalLinks(formattedLinks);
              showToast.success('Sucesso', 'Ordem personalizada salva');
            }
          } catch (error) {
            console.error('Erro ao salvar ordem personalizada:', error);
            // Não mostrar erro, pois é apenas uma otimização
          }
        }
      }
    } catch (error) {
      console.error('Erro ao ordenar links:', error);
      showToast.error('Erro', 'Não foi possível ordenar os links');
    }
  };

  const canAddMore = pendingLinks.length < maxLinks;
  const nextPlanMap: Record<string, string> = {
    FREE: 'STARTER',
    STARTER: 'PRO',
    PRO: 'PRO',
  };

  if (loading && links.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <BackButton title="Configurações" />
          <Text style={styles.headerTitle}>Links</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary.main} />
          <Text style={styles.loadingText}>Carregando links...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <BackButton title="Configurações" />
        <Text style={styles.headerTitle}>Links</Text>
      </View>

      {/* Header com ordenação e botão adicionar */}
      <View style={styles.headerActions}>
        <View style={styles.sortContainer}>
          <Text style={styles.sortLabel}>Ordenar por:</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={sortMode}
              onValueChange={(value: 'custom' | 'date' | 'name' | 'likes') => {
                setSortMode(value);
                handleSort(value);
              }}
              style={styles.picker}
              dropdownIconColor={COLORS.text.secondary}
            >
              <Picker.Item label="Personalizado" value="custom" />
              <Picker.Item label="Data" value="date" />
              <Picker.Item label="Nome" value="name" />
              <Picker.Item label="Likes" value="likes" />
            </Picker>
          </View>
        </View>

        {canAddMore ? (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setOpenNewLinkModal(true)}
          >
            <Ionicons name="add" size={20} color="#ffffff" />
            <Text style={styles.addButtonText}>Adicionar</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.limitReachedContainer}>
            <Ionicons name="lock-closed" size={16} color={COLORS.text.secondary} />
            <Text style={styles.limitReachedText}>
              Limite: {maxLinks} links ({user?.plan?.type || 'FREE'})
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            loadLinks();
          }} />
        }
      >
        {pendingLinks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="link-outline" size={64} color={COLORS.text.tertiary} />
            <Text style={styles.emptyTitle}>Nenhum link ainda</Text>
            <Text style={styles.emptyDescription}>
              Adicione links para compartilhar com seus seguidores
            </Text>
            {canAddMore && (
              <TouchableOpacity
                style={styles.emptyAddButton}
                onPress={() => setOpenNewLinkModal(true)}
              >
                <Ionicons name="add" size={20} color="#ffffff" />
                <Text style={styles.emptyAddButtonText}>Adicionar Primeiro Link</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            {pendingLinks.map((link, index) => (
              <LinkEditCard
                key={link.id}
                link={link}
                index={index}
                sortMode={sortMode}
                userPlan={user?.plan?.type}
                onUpdate={handleUpdateLink}
                onDelete={handleDeleteLink}
                onMoveUp={() => handleMoveUp(index)}
                onMoveDown={() => handleMoveDown(index)}
                canMoveUp={index > 0}
                canMoveDown={index < pendingLinks.length - 1}
              />
            ))}
          </>
        )}
      </ScrollView>

      {/* Botão Salvar Alterações - aparece quando há mudanças */}
      {hasChanges() && (
        <View style={styles.saveButtonContainer}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSaveChanges}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="save-outline" size={20} color="#ffffff" />
                <Text style={styles.saveButtonText}>Salvar Alterações</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      <AddLinkModal
        visible={openNewLinkModal}
        onClose={() => setOpenNewLinkModal(false)}
        onAdd={handleAddLink}
        loading={loading}
      />

      <CustomModal {...modalProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  header: {
    backgroundColor: COLORS.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
    gap: 12,
  },
  sortContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sortLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  pickerWrapper: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    borderRadius: 8,
    backgroundColor: COLORS.background.default,
  },
  picker: {
    color: COLORS.text.primary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  limitReachedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  limitReachedText: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  emptyDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  emptyAddButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: COLORS.background.paper,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary.main,
    paddingVertical: 14,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
