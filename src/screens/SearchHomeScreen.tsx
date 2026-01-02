import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Header } from '../components/Header';
import { COLORS } from '../theme/colors';
import Ionicons from '@expo/vector-icons/Ionicons';

type SearchStackParamList = {
  SearchHome: undefined;
  SearchUsers: undefined;
};

type SearchHomeScreenNavigationProp = NativeStackNavigationProp<
  SearchStackParamList,
  'SearchHome'
>;

       export function SearchHomeScreen() {
         const navigation = useNavigation<any>();
         const [isRefreshing, setIsRefreshing] = useState(false);

         return (
           <View style={styles.container}>
             <Header 
               onLogoPress={() => {
                 const parent = navigation.getParent();
                 if (parent) {
                   parent.navigate('FeedTab' as never);
                 } else {
                   navigation.navigate('FeedTab' as never);
                 }
               }}
             />

      <View style={styles.content}>
        <Text style={styles.title}>O que você está procurando?</Text>
        <Text style={styles.subtitle}>
          Escolha uma opção abaixo para começar sua busca
        </Text>

        <View style={styles.optionsContainer}>
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={64} color={COLORS.text.tertiary} />
            <Text style={styles.emptyText}>Funcionalidades de busca em desenvolvimento</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    backgroundColor: COLORS.background.paper,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  optionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  optionArrow: {
    position: 'absolute',
    top: 24,
    right: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.text.tertiary,
    fontWeight: '500',
    textAlign: 'center',
  },
});

