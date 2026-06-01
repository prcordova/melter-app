import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { City } from 'country-state-city';
import type { ICity, ICountry, IState } from 'country-state-city';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  filterRegisterCities,
  formatRegisterCityLabel,
  isSameRegisterCity,
} from '../../lib/geo/register-location-match';
import { COLORS } from '../../theme/colors';

type Props = {
  country: ICountry | null;
  state: IState | null;
  value: ICity | null;
  onChange: (city: ICity | null) => void;
  disabled?: boolean;
};

export function RegisterCityPicker({ country, state, value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const cityOptions = useMemo(() => {
    if (!country) return [];
    if (state) {
      return City.getCitiesOfState(country.isoCode, state.isoCode) || [];
    }
    return City.getCitiesOfCountry(country.isoCode) || [];
  }, [country, state]);

  const filtered = useMemo(() => {
    if (!query.trim()) return cityOptions.slice(0, 50);
    return filterRegisterCities(cityOptions, query, 50);
  }, [cityOptions, query]);

  const label = value ? formatRegisterCityLabel(value) : 'Selecione a cidade';

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, disabled && styles.triggerDisabled]}
        onPress={() => !disabled && country && setOpen(true)}
        disabled={disabled || !country}
        activeOpacity={0.7}
      >
        <Text style={[styles.triggerText, !value && styles.placeholder]} numberOfLines={1}>
          {country ? label : 'Selecione o país primeiro'}
        </Text>
        <Ionicons name="chevron-down" size={18} color={COLORS.text.secondary} />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Cidade</Text>
            <TouchableOpacity onPress={() => setOpen(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={26} color={COLORS.text.primary} />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.search}
            placeholder="Digite para buscar (mín. 2 letras)"
            placeholderTextColor={COLORS.text.secondary}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="words"
            autoCorrect={false}
          />
          <FlatList
            data={filtered}
            keyExtractor={(item) => `${item.countryCode}-${item.stateCode ?? ''}-${item.name}`}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text style={styles.empty}>
                {!country ? 'Selecione o país' : 'Nenhuma cidade encontrada'}
              </Text>
            }
            renderItem={({ item }) => {
              const selected = isSameRegisterCity(value, item);
              return (
                <Pressable
                  style={[styles.row, selected && styles.rowSelected]}
                  onPress={() => {
                    onChange(item);
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  <Text style={styles.rowText}>{formatRegisterCityLabel(item)}</Text>
                  {selected ? <Ionicons name="checkmark" size={20} color={COLORS.primary.main} /> : null}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: COLORS.background.paper,
  },
  triggerDisabled: {
    opacity: 0.6,
  },
  triggerText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text.primary,
    marginRight: 8,
  },
  placeholder: {
    color: COLORS.text.secondary,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: COLORS.background.default,
    paddingTop: 48,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  search: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text.primary,
    backgroundColor: COLORS.background.paper,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border.light,
  },
  rowSelected: {
    backgroundColor: 'rgba(33, 150, 243, 0.08)',
  },
  rowText: {
    fontSize: 15,
    color: COLORS.text.primary,
    flex: 1,
  },
  empty: {
    textAlign: 'center',
    padding: 24,
    color: COLORS.text.secondary,
  },
});
