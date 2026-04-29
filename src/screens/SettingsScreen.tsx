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
import Ionicons from '@expo/vector-icons/Ionicons';

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const settingsOptions = [
    { 
      id: 'links', 
      title: 'Meus Links', 
      subtitle: 'Gerenciar links',
      icon: 'link-outline', 
      screen: 'LinksSettings' 
    },
    { 
      id: 'appearance', 
      title: 'Perfil', 
      subtitle: 'Personalização do perfil',
      icon: 'color-palette-outline', 
      screen: 'AppearanceSettings' 
    },
    { 
      id: 'analytics', 
      title: 'Analytics', 
      subtitle: 'Métricas dos posts',
      icon: 'bar-chart-outline', 
      screen: 'AnalyticsSettings' 
    },
    { 
      id: 'security', 
      title: 'Segurança', 
      subtitle: 'Senha e 2FA',
      icon: 'shield-checkmark-outline', 
      screen: 'SecuritySettings' 
    },
    { 
      id: 'privacity', 
      title: 'Privacidade', 
      subtitle: 'Controle de bloqueios',
      icon: 'eye-outline', 
      screen: 'PrivacitySettings' 
    },
    { 
      id: 'preferences', 
      title: 'Preferências', 
      subtitle: 'Configurações gerais',
      icon: 'settings-outline', 
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
                <Ionicons name={option.icon as any} size={24} color={COLORS.secondary.main} />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.secondary.main} />
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
});

