import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { BackButton } from '../components/BackButton';
import { COLORS } from '../theme/colors';

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const settingsOptions = [
    { 
      id: 'links', 
      title: 'Meus Links', 
      subtitle: 'Gerenciar links',
      icon: '🔗', 
      screen: 'LinksSettings' 
    },
    { 
      id: 'appearance', 
      title: 'Perfil', 
      subtitle: 'Personalização do perfil',
      icon: '🎨', 
      screen: 'AppearanceSettings' 
    },
    { 
      id: 'analytics', 
      title: 'Analytics', 
      subtitle: 'Métricas dos posts',
      icon: '📊', 
      screen: 'AnalyticsSettings' 
    },
    { 
      id: 'promotions', 
      title: 'Promoções', 
      subtitle: 'Criar e gerenciar anúncios',
      icon: '🎁', 
      screen: 'PromotionsSettings' 
    },
    { 
      id: 'security', 
      title: 'Segurança', 
      subtitle: 'Senha e 2FA',
      icon: '🔒', 
      screen: 'SecuritySettings' 
    },
    { 
      id: 'privacity', 
      title: 'Privacidade', 
      subtitle: 'Controle de bloqueios',
      icon: '👁️', 
      screen: 'PrivacitySettings' 
    },
    { 
      id: 'preferences', 
      title: 'Preferências', 
      subtitle: 'Configurações gerais',
      icon: '⚙️', 
      screen: 'PreferencesSettings' 
    },
  ];

  const handleOptionPress = (screen: string) => {
    navigation.navigate(screen as never);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <BackButton />
          <Text style={styles.headerTitle}>Configurações</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Lista de Opções */}
        <View style={styles.optionsList}>
          {settingsOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.optionCard}
              onPress={() => handleOptionPress(option.screen)}
              activeOpacity={0.7}
            >
              <View style={styles.optionIconContainer}>
                <Text style={styles.optionIcon}>{option.icon}</Text>
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
              </View>
              <Text style={styles.optionArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  header: {
    backgroundColor: COLORS.background.default,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.medium,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginLeft: 4,
  },
  scrollContent: {
    padding: 16,
  },
  optionsList: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.paper,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.background.default,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionIcon: {
    fontSize: 24,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  optionArrow: {
    fontSize: 24,
    color: COLORS.text.secondary,
    marginLeft: 8,
  },
});

