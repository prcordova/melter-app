import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ShopCard } from '../ShopCard';
import { MarketplaceBeyondSearchDivider } from './MarketplaceBeyondSearchDivider';
import { shopsApi } from '../../services/shops/api';
import { useAuth } from '../../contexts/AuthContext';
import { useThemedStyles, useAppTheme } from '../../contexts/ThemeContext';
import type { AppPalette } from '../../theme/palettes';

type Props = {
  username: string;
  showAdultContent?: boolean;
};

/**
 * Seção abaixo do catálogo da loja — produtos de *outros* criadores
 * na mesma categoria. Separada visualmente para não parecer do mesmo vendedor.
 */
export function ShopRelatedProductsSection({
  username,
  showAdultContent = false,
}: Props) {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username || !user?.id) {
      setProducts([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void shopsApi
      .getRelatedProducts(username, { limit: 8, showAdultContent })
      .then((res) => {
        if (cancelled) return;
        setProducts(res.success && Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [username, showAdultContent, user?.id]);

  if (!loading && products.length === 0) {
    return null;
  }

  return (
    <View
      style={styles.section}
      accessibilityLabel="Produtos relacionados de outros criadores"
    >
      <MarketplaceBeyondSearchDivider title="Você também pode gostar desses criadores" />
      <Text style={styles.subtitle}>
        Pacotes relacionados de outras lojas — não fazem parte do catálogo de @{username}
      </Text>

      {loading ? (
        <ActivityIndicator color={colors.secondary.main} style={styles.loader} />
      ) : (
        <View style={styles.list}>
          {products.map((product) => {
            const ownerUsername = product.userId?.username;
            return (
              <ShopCard
                key={`related-${product._id}`}
                product={product}
                onPress={
                  ownerUsername
                    ? () =>
                        navigation.navigate('MyShop', {
                          username: ownerUsername,
                        })
                    : undefined
                }
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

const createStyles = (c: AppPalette) =>
  StyleSheet.create({
    section: {
      marginTop: 28,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: c.border.light,
    },
    subtitle: {
      textAlign: 'center',
      fontSize: 13,
      lineHeight: 18,
      color: c.text.secondary,
      marginBottom: 16,
      marginTop: -4,
      paddingHorizontal: 12,
    },
    loader: {
      marginVertical: 24,
    },
    list: {
      gap: 0,
    },
  });
