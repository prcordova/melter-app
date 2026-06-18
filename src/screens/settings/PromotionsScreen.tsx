import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Image,
  FlatList,
  Alert,
  Modal,
} from 'react-native';
import { useFocusEffect, useRoute, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BackButton } from '../../components/BackButton';
import { Select, SelectItem } from '../../components/ui/Select';
import { adsApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS } from '../../theme/colors';
import { showToast } from '../../components/CustomToast';
import { FIXED_CATEGORIES } from '../../constants/categories';
import { getImageUrl } from '../../utils/image';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CreateAdModal } from '../../components/promotions/CreateAdModal';
import {
  PromotionsHubPicker,
  type PromotionsHubSection,
} from '../../components/promotions/PromotionsHubPicker';
import { PromotionsShopSection } from '../../components/promotions/PromotionsShopSection';

type PromotionsScreenParams = {
  hubSection?: PromotionsHubSection;
  openCreate?: boolean;
};

// Interfaces
interface Ad {
  _id: string;
  title?: string;
  description?: string;
  type: 'IMAGE' | 'VIDEO';
  mediaUrl: string;
  link?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PAUSED';
  views: number;
  clicks: number;
  createdAt: string;
  endDate?: string;
  startDate?: string;
  estimatedCost: number;
  actualCost: number;
  campaignDays?: number;
  targetViews?: number;
  targetCategories?: string[];
  pendingApproval: boolean;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

interface CampaignConfig {
  pricePerView: number;
  averages: { [key: string]: number };
}

type AdStatus = 'ACTIVE' | 'INACTIVE' | 'PAUSED';
type ActiveTab = 0 | 1; // 0 = Campanhas, 1 = Histórico

export function PromotionsScreen() {
  const route = useRoute<RouteProp<{ PromotionsSettings: PromotionsScreenParams }, 'PromotionsSettings'>>();
  const routeHubSection = route.params?.hubSection;
  const routeOpenCreate = route.params?.openCreate === true;

  const renderPromotionsSkeleton = useMemo(
    () => (
      <View style={styles.skeletonWrapper}>
        <View style={styles.skeletonFilter} />
        <View style={styles.skeletonFilterRow}>
          <View style={styles.skeletonFilterSmall} />
          <View style={styles.skeletonFilterSmall} />
        </View>
        {Array.from({ length: 3 }).map((_, index) => (
          <View key={`promo-skeleton-${index}`} style={styles.skeletonCard}>
            <View style={styles.skeletonHeaderRow}>
              <View style={styles.skeletonMedia} />
              <View style={styles.skeletonHeaderContent}>
                <View style={styles.skeletonLinePrimary} />
                <View style={styles.skeletonLineSecondary} />
              </View>
            </View>
            <View style={styles.skeletonMetricsRow}>
              <View style={styles.skeletonMetric} />
              <View style={styles.skeletonMetric} />
              <View style={styles.skeletonMetric} />
            </View>
          </View>
        ))}
      </View>
    ),
    []
  );

  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();

  const [hubSection, setHubSection] = useState<PromotionsHubSection>(
    routeHubSection ?? 'ads'
  );
  const [autoOpenShopCreate] = useState(routeOpenCreate);
  const [shopCreateOpen, setShopCreateOpen] = useState(routeOpenCreate);
  
  // Estados principais
  const [currentTab, setCurrentTab] = useState<ActiveTab>(0);
  const [ads, setAds] = useState<Ad[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AdStatus | 'PENDING'>('ALL');
  const [dateFilter, setDateFilter] = useState('');
  
  // Modal de criar/reativar campanha
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reactivatingAd, setReactivatingAd] = useState<Ad | null>(null);
  const [saving, setSaving] = useState(false);
  const [useUpload, setUseUpload] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [mediaUrl, setMediaUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [targetCategories, setTargetCategories] = useState<string[]>([]);
  const [campaignDays, setCampaignDays] = useState<number | null>(null);
  const [targetViews, setTargetViews] = useState<number | null>(null);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [categoryMenuAnchor, setCategoryMenuAnchor] = useState<any>(null);
  
  // Configuração de campanha
  const [campaignConfig, setCampaignConfig] = useState<CampaignConfig | null>(null);
  const [updatingFromDays, setUpdatingFromDays] = useState(false);
  const [updatingFromViews, setUpdatingFromViews] = useState(false);
  
  // Modal de estender
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
  const [extendDays, setExtendDays] = useState(1);
  const [extendCost, setExtendCost] = useState(0);
  
  // Modal de deletar
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [adToDelete, setAdToDelete] = useState<Ad | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Modal de adicionar saldo
  const [addBalanceDialogOpen, setAddBalanceDialogOpen] = useState(false);
  
  // Modal de limpar histórico
  const [clearHistoryDialogOpen, setClearHistoryDialogOpen] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);

  // Opções para os selects
  const categoryFilterOptions: SelectItem[] = [
    { label: 'Todas as categorias', value: 'ALL' },
    ...FIXED_CATEGORIES.map((cat) => ({ label: cat.name, value: cat._id })),
  ];

  const statusFilterOptions: SelectItem[] = [
    { label: 'Todos os status', value: 'ALL' },
    { label: 'Ativo', value: 'ACTIVE' },
    { label: 'Inativo', value: 'INACTIVE' },
    { label: 'Pendente', value: 'PENDING' },
  ];

  // Funções auxiliares
  const getCurrentDate = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  const getCurrentTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  const detectMediaType = (url: string): 'IMAGE' | 'VIDEO' => {
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.flv', '.wmv', '.m4v'];
    const videoDomains = ['youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com'];
    
    const lowerUrl = url.toLowerCase();
    if (videoExtensions.some(ext => lowerUrl.includes(ext)) || videoDomains.some(domain => lowerUrl.includes(domain))) {
      return 'VIDEO';
    }
    return 'IMAGE';
  };

  // Carregar configuração de campanha
  useEffect(() => {
    let isMounted = true;
    
    const loadCampaignConfig = async () => {
      try {
        const response = await adsApi.getCampaignConfig();
        if (isMounted && response.success && response.data) {
          setCampaignConfig({
            pricePerView: response.data.pricePerView || 0.10,
            averages: response.data.averages || {},
          });
        }
      } catch (error) {
        console.error('Erro ao carregar config:', error);
      }
    };
    
    loadCampaignConfig();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Buscar campanhas
  const fetchAds = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adsApi.listMyAds();
      if (response.success && response.data) {
        setAds(response.data);
      } else {
        showToast.error('Erro', response.message || 'Não foi possível carregar as campanhas');
      }
    } catch (error: any) {
      console.error('Erro ao buscar campanhas:', error);
      showToast.error('Erro', 'Não foi possível carregar as campanhas');
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar histórico
  const fetchHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const response = await adsApi.getHistory();
      if (response.success && response.data) {
        setHistory(response.data);
      } else {
        showToast.error('Erro', response.message || 'Não foi possível carregar o histórico');
      }
    } catch (error: any) {
      console.error('Erro ao buscar histórico:', error);
      showToast.error('Erro', 'Não foi possível carregar o histórico');
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  // Handler para abrir modal de criar anúncio
  const handleOpenDialog = () => {
    setReactivatingAd(null);
    setTitle('');
    setDescription('');
    setMediaUrl('');
    setLink('');
    setTargetCategories([]);
    setCampaignDays(null);
    setTargetViews(null);
    setEstimatedCost(0);
    const now = new Date();
    setStartDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
    setStartTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    setEndDate('');
    setEndTime('');
    setDialogOpen(true);
  };

  useEffect(() => {
    if (routeHubSection) {
      setHubSection(routeHubSection);
    }
  }, [routeHubSection]);

  useEffect(() => {
    if (routeOpenCreate) setShopCreateOpen(true);
  }, [routeOpenCreate]);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      
      const loadData = async () => {
        if (hubSection !== 'ads') {
          if (isMounted) setLoading(false);
          return;
        }
        if (currentTab === 0) {
          if (isMounted) {
            await fetchAds();
          }
        } else {
          if (isMounted) {
            await fetchHistory();
          }
        }
      };
      
      loadData();
      
      return () => {
        isMounted = false;
      };
    }, [currentTab, fetchAds, fetchHistory, hubSection])
  );

  // Renderização básica (estrutura inicial)
  if (loading && hubSection === 'ads' && ads.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {renderPromotionsSkeleton}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <BackButton title="Perfil" />
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>🎁 Promoções</Text>
        </View>
      </View>

      <View style={styles.hubPickerWrap}>
        <PromotionsHubPicker section={hubSection} onChange={setHubSection} />
      </View>

      <View style={styles.hubActionRow}>
        {hubSection === 'shop' ? (
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShopCreateOpen(true)}
          >
            <Ionicons name="add" size={20} color="#ffffff" />
            <Text style={styles.createButtonText}>Promover no marketplace</Text>
          </TouchableOpacity>
        ) : null}
        {hubSection === 'ads' && currentTab === 0 ? (
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleOpenDialog}
          >
            <Ionicons name="add" size={20} color="#ffffff" />
            <Text style={styles.createButtonText}>Criar Anúncio</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {hubSection === 'shop' ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <PromotionsShopSection
            autoOpenCreate={autoOpenShopCreate}
            createOpen={shopCreateOpen}
            onCreateOpenChange={setShopCreateOpen}
          />
        </ScrollView>
      ) : (
        <>
      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, currentTab === 0 && styles.activeTab]}
          onPress={() => setCurrentTab(0)}
        >
          <Text style={[styles.tabText, currentTab === 0 && styles.activeTabText]}>
            Campanhas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, currentTab === 1 && styles.activeTab]}
          onPress={() => setCurrentTab(1)}
        >
          <Text style={[styles.tabText, currentTab === 1 && styles.activeTabText]}>
            Histórico
          </Text>
        </TouchableOpacity>
      </View>

      {/* Conteúdo das Tabs */}
      {currentTab === 0 ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Filtros */}
          {ads.length > 0 && (
            <View style={styles.filtersContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por título ou descrição..."
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholderTextColor={COLORS.text.tertiary}
              />
              
              <View style={styles.filterRow}>
                <Select
                  selectedValue={categoryFilter}
                  onValueChange={(value) => setCategoryFilter(String(value))}
                  items={categoryFilterOptions}
                  wrapperStyle={styles.selectWrapper}
                />
                
                <Select
                  selectedValue={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as 'ALL' | AdStatus | 'PENDING')}
                  items={statusFilterOptions}
                  wrapperStyle={styles.selectWrapper}
                />
              </View>
              
              {(searchTerm || categoryFilter !== 'ALL' || statusFilter !== 'ALL' || dateFilter) && (
                <TouchableOpacity
                  style={styles.clearFiltersButton}
                  onPress={() => {
                    setSearchTerm('');
                    setCategoryFilter('ALL');
                    setStatusFilter('ALL');
                    setDateFilter('');
                  }}
                >
                  <Text style={styles.clearFiltersText}>Limpar Filtros</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Lista de Campanhas */}
          {(() => {
            let filteredAds = [...ads];
            
            if (searchTerm) {
              filteredAds = filteredAds.filter(ad => 
                (ad.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                ((ad as any).description || '').toLowerCase().includes(searchTerm.toLowerCase())
              );
            }
            
            if (categoryFilter !== 'ALL') {
              filteredAds = filteredAds.filter(ad => 
                ad.targetCategories && ad.targetCategories.includes(categoryFilter)
              );
            }
            
            if (statusFilter !== 'ALL') {
              if (statusFilter === 'PENDING') {
                filteredAds = filteredAds.filter(ad => ad.pendingApproval);
              } else {
                filteredAds = filteredAds.filter(ad => ad.status === statusFilter);
              }
            }
            
            if (dateFilter) {
              const filterDate = new Date(dateFilter);
              filterDate.setHours(0, 0, 0, 0);
              filteredAds = filteredAds.filter(ad => {
                const adDate = new Date(ad.createdAt);
                adDate.setHours(0, 0, 0, 0);
                return adDate.getTime() === filterDate.getTime();
              });
            }
            
            if (filteredAds.length === 0) {
              return (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    {ads.length === 0 
                      ? 'Nenhuma campanha encontrada'
                      : 'Nenhum resultado encontrado'}
                  </Text>
                </View>
              );
            }
            
            return (
              <FlatList
                data={filteredAds}
                keyExtractor={(item) => item._id}
                renderItem={({ item: ad }) => {
                  const ctr = ad.views > 0 ? ((ad.clicks / ad.views) * 100).toFixed(2) : '0.00';
                  const isExpired = ad.endDate && new Date(ad.endDate) < new Date();
                  
                  return (
                    <View style={styles.adCard}>
                      <View style={styles.adCardHeader}>
                        {ad.type === 'VIDEO' ? (
                          <Image source={{ uri: ad.mediaUrl }} style={styles.adMedia} />
                        ) : (
                          <Image source={{ uri: ad.mediaUrl }} style={styles.adMedia} />
                        )}
                        <View style={styles.adCardInfo}>
                          <Text style={styles.adTitle} numberOfLines={2}>
                            {ad.title || 'Sem título'}
                          </Text>
                          <View style={styles.statusChip}>
                            <Text style={[
                              styles.statusChipText,
                              { color: ad.pendingApproval ? COLORS.states.warning : 
                                      ad.status === 'ACTIVE' ? COLORS.states.success :
                                      COLORS.text.secondary }
                            ]}>
                              {ad.pendingApproval ? 'Pendente' :
                               ad.status === 'ACTIVE' ? 'Ativo' :
                               ad.status === 'INACTIVE' ? 'Inativo' : ad.status}
                            </Text>
                          </View>
                        </View>
                      </View>
                      
                      {/* Categorias */}
                      <View style={styles.categoriesContainer}>
                        {ad.targetCategories && ad.targetCategories.length > 0 ? (
                          ad.targetCategories.map((categoryId: string) => {
                            const category = FIXED_CATEGORIES.find(c => c._id === categoryId);
                            return category ? (
                              <View key={categoryId} style={styles.categoryChip}>
                                <Text style={styles.categoryChipText}>{category.name}</Text>
                              </View>
                            ) : null;
                          })
                        ) : (
                          <Text style={styles.noCategoryText}>Sem categoria</Text>
                        )}
                      </View>
                      
                      {/* Métricas */}
                      <View style={styles.metricsGrid}>
                        <View style={styles.metricItem}>
                          <Ionicons name="eye-outline" size={16} color={COLORS.text.secondary} />
                          <Text style={styles.metricValue}>{ad.views}</Text>
                          <Text style={styles.metricLabel}>Visualizações</Text>
                        </View>
                        <View style={styles.metricItem}>
                          <Ionicons name="hand-left-outline" size={16} color={COLORS.text.secondary} />
                          <Text style={styles.metricValue}>{ad.clicks}</Text>
                          <Text style={styles.metricLabel}>Cliques</Text>
                        </View>
                        <View style={styles.metricItem}>
                          <Text style={styles.metricValue}>{ctr}%</Text>
                          <Text style={styles.metricLabel}>CTR</Text>
                        </View>
                        <View style={styles.metricItem}>
                          <Text style={styles.metricValue} numberOfLines={1}>
                            {ad.endDate 
                              ? format(new Date(ad.endDate), 'dd/MM/yyyy', { locale: ptBR })
                              : 'Sem prazo'}
                          </Text>
                          <Text style={styles.metricLabel}>Período</Text>
                        </View>
                      </View>
                      
                      {/* Ações */}
                      <View style={styles.actionsContainer}>
                        {ad.status === 'ACTIVE' && !isExpired && !ad.pendingApproval && (
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => {
                              setSelectedAd(ad);
                              setExtendDays(1);
                              setExtendDialogOpen(true);
                            }}
                          >
                            <Ionicons name="time-outline" size={18} color={COLORS.primary.main} />
                          </TouchableOpacity>
                        )}
                        {ad.status === 'INACTIVE' && !ad.pendingApproval && (
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => {
                              // TODO: Implementar reativar
                              showToast.info('Em breve', 'Funcionalidade de reativar em desenvolvimento');
                            }}
                          >
                            <Ionicons name="refresh-outline" size={18} color={COLORS.states.success} />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => {
                            setAdToDelete(ad);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Ionicons name="trash-outline" size={18} color={COLORS.states.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }}
                scrollEnabled={false}
                contentContainerStyle={styles.adsList}
              />
            );
          })()}
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {loadingHistory ? (
            <View style={styles.historySkeletonWrapper}>
              {Array.from({ length: 4 }).map((_, index) => (
                <View key={`history-skeleton-${index}`} style={styles.historySkeletonItem} />
              ))}
            </View>
          ) : history.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Nenhum histórico encontrado</Text>
            </View>
          ) : (
            <>
              {history.length > 0 && (
                <View style={styles.clearHistoryContainer}>
                  <TouchableOpacity
                    style={styles.clearHistoryButton}
                    onPress={() => setClearHistoryDialogOpen(true)}
                    disabled={clearingHistory}
                  >
                    <Ionicons name="trash-outline" size={18} color={COLORS.states.error} />
                    <Text style={styles.clearHistoryText}>Limpar Histórico</Text>
                  </TouchableOpacity>
                </View>
              )}
              {/* TODO: Implementar tabela de histórico */}
              <Text style={styles.comingSoonText}>Histórico em desenvolvimento</Text>
            </>
          )}
        </ScrollView>
      )}

      {/* Modal de Criar Anúncio */}
      <CreateAdModal
        visible={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setReactivatingAd(null);
        }}
        onSuccess={() => {
          fetchAds();
        }}
        reactivatingAd={reactivatingAd}
        campaignConfig={campaignConfig}
      />
        </>
      )}
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
  hubPickerWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  hubActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.secondary.main,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.secondary.main,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  activeTabText: {
    color: COLORS.secondary.main,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  skeletonWrapper: {
    gap: 12,
  },
  skeletonFilter: {
    height: 42,
    borderRadius: 8,
    backgroundColor: COLORS.background.tertiary,
  },
  skeletonFilterRow: {
    flexDirection: 'row',
    gap: 12,
  },
  skeletonFilterSmall: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.background.tertiary,
  },
  skeletonCard: {
    backgroundColor: COLORS.background.paper,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    gap: 10,
  },
  skeletonHeaderRow: {
    flexDirection: 'row',
    gap: 10,
  },
  skeletonMedia: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: COLORS.background.tertiary,
  },
  skeletonHeaderContent: {
    flex: 1,
    gap: 8,
    justifyContent: 'center',
  },
  skeletonLinePrimary: {
    width: '72%',
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.background.tertiary,
  },
  skeletonLineSecondary: {
    width: '44%',
    height: 10,
    borderRadius: 6,
    backgroundColor: COLORS.background.tertiary,
  },
  skeletonMetricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  skeletonMetric: {
    flex: 1,
    height: 30,
    borderRadius: 8,
    backgroundColor: COLORS.background.tertiary,
  },
  historySkeletonWrapper: {
    gap: 10,
  },
  historySkeletonItem: {
    height: 56,
    borderRadius: 10,
    backgroundColor: COLORS.background.tertiary,
  },
  filtersContainer: {
    gap: 12,
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: COLORS.background.paper,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text.primary,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
  },
  selectWrapper: {
    flex: 1,
  },
  clearFiltersButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
  },
  clearFiltersText: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  adsList: {
    gap: 16,
  },
  adCard: {
    backgroundColor: COLORS.background.paper,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    gap: 12,
  },
  adCardHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  adMedia: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: COLORS.background.tertiary,
  },
  adCardInfo: {
    flex: 1,
    gap: 8,
  },
  adTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  statusChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: COLORS.background.tertiary,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
  },
  categoryChipText: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  noCategoryText: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: '48%',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  metricLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: COLORS.background.tertiary,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  clearHistoryContainer: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  clearHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.states.error,
  },
  clearHistoryText: {
    fontSize: 14,
    color: COLORS.states.error,
    fontWeight: '600',
  },
  comingSoonText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
    padding: 32,
  },
});

