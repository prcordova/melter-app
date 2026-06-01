import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Switch, ActivityIndicator } from 'react-native';
import { Country, State } from 'country-state-city';
import type { ICity, ICountry, IState } from 'country-state-city';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Select } from '../ui/Select';
import { Button } from '../Button';
import { RegisterCityPicker } from './RegisterCityPicker';
import { COLORS } from '../../theme/colors';
import { userApi } from '../../services/api';
import { showToast } from '../CustomToast';
import { useIpGeoLocationPrefill } from '../../hooks/useIpGeoLocationPrefill';
import {
  applyPendingGeoToLocationForm,
  buildStoredCityValue,
  resolveStoredLocationForForm,
} from '../../lib/geo/register-location-match';

type Props = {
  prefsLoaded: boolean;
};

export function LocationPreferencesSection({ prefsLoaded }: Props) {
  const countries = useMemo(() => Country.getAllCountries(), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hideLocation, setHideLocation] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<ICountry | null>(null);
  const [selectedState, setSelectedState] = useState<IState | null>(null);
  const [selectedCity, setSelectedCity] = useState<ICity | null>(null);
  const [states, setStates] = useState<IState[]>([]);
  const [shouldDetectGeo, setShouldDetectGeo] = useState(false);

  const { geoLoading, pendingGeo, clearPendingGeo } = useIpGeoLocationPrefill(
    prefsLoaded && shouldDetectGeo
  );

  const loadLocation = useCallback(async () => {
    try {
      setLoading(true);
      const response = await userApi.getLocationPreference();
      if (!response.success || !response.data) return;

      const data = response.data as {
        country: string | null;
        city: string | null;
        hideLocation?: boolean;
      };

      setHideLocation(data.hideLocation === true);
      setShouldDetectGeo(!data.country && !data.city);

      const resolved = resolveStoredLocationForForm(data.country, data.city, countries);
      setSelectedCountry(resolved.country);
      setSelectedState(resolved.state);
      setSelectedCity(resolved.city);
      setStates(
        resolved.country ? State.getStatesOfCountry(resolved.country.isoCode) || [] : []
      );
    } catch (error) {
      console.error('[LocationPreferences]', error);
    } finally {
      setLoading(false);
    }
  }, [countries]);

  useEffect(() => {
    if (!prefsLoaded) return;
    void loadLocation();
  }, [prefsLoaded, loadLocation]);

  useEffect(() => {
    if (!pendingGeo || loading) return;

    applyPendingGeoToLocationForm(pendingGeo, countries, {
      setSelectedCountry,
      setSelectedState,
      setSelectedCity,
      setStates,
    });
    clearPendingGeo();
    setShouldDetectGeo(false);
  }, [pendingGeo, loading, countries, clearPendingGeo]);

  const handleCountryChange = (isoCode: string) => {
    if (!isoCode) {
      setSelectedCountry(null);
      setSelectedState(null);
      setSelectedCity(null);
      setStates([]);
      return;
    }
    const country = countries.find((c) => c.isoCode === isoCode) ?? null;
    setSelectedCountry(country);
    setSelectedState(null);
    setSelectedCity(null);
    setStates(country ? State.getStatesOfCountry(country.isoCode) || [] : []);
    setShouldDetectGeo(false);
  };

  const handleSave = async () => {
    const hasCountry = Boolean(selectedCountry);
    const hasCity = Boolean(selectedCity);

    if (hasCountry !== hasCity) {
      showToast.error('Erro', 'Informe país e cidade juntos, ou deixe os dois em branco.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        hideLocation,
        ...(hasCountry
          ? {
              country: selectedCountry!.name.trim(),
              city: buildStoredCityValue(
                selectedCity!.name,
                selectedCity!.stateCode ?? selectedState?.isoCode
              ),
            }
          : { country: null, city: null }),
      };

      const response = await userApi.patchLocationPreference(payload);
      if (response.success) {
        showToast.success('Sucesso', 'Localização atualizada.');
        setShouldDetectGeo(!hasCountry);
      } else {
        showToast.error('Erro', response.message || 'Não foi possível salvar a localização.');
      }
    } catch (e: unknown) {
      const msg =
        typeof e === 'object' && e !== null && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      showToast.error('Erro', msg || 'Não foi possível salvar a localização.');
    } finally {
      setSaving(false);
    }
  };

  const disabled = !prefsLoaded || loading || saving || geoLoading;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>📍 Localização</Text>
      <Text style={styles.sectionDescription}>
        Usada no explorador e filtros “perto de mim”. País e cidade são opcionais, mas devem ser informados
        juntos.
      </Text>
      {geoLoading ? (
        <Text style={styles.hint}>Detectando localização…</Text>
      ) : (
        <Text style={styles.hint}>
          No explorador, outros usuários podem encontrar você pela região (se não ocultar).
        </Text>
      )}

      <View style={styles.card}>
        {loading ? (
          <ActivityIndicator color={COLORS.primary.main} style={{ marginVertical: 16 }} />
        ) : (
          <>
            <Text style={styles.fieldLabel}>País</Text>
            <Select
              selectedValue={selectedCountry?.isoCode ?? ''}
              onValueChange={(v) => handleCountryChange(String(v))}
              placeholder="Selecione o país"
              disabled={disabled}
              items={countries.map((c) => ({ label: c.name, value: c.isoCode }))}
            />

            {states.length > 0 ? (
              <>
                <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Estado</Text>
                <Select
                  selectedValue={selectedState?.isoCode ?? ''}
                  onValueChange={(v) => {
                    const iso = String(v);
                    const st = states.find((s) => s.isoCode === iso) ?? null;
                    setSelectedState(st);
                    setSelectedCity(null);
                  }}
                  placeholder="Selecione o estado"
                  disabled={disabled || !selectedCountry}
                  items={states.map((s) => ({ label: s.name, value: s.isoCode }))}
                />
              </>
            ) : null}

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Cidade</Text>
            <RegisterCityPicker
              country={selectedCountry}
              state={selectedState}
              value={selectedCity}
              onChange={setSelectedCity}
              disabled={disabled}
            />

            <View style={styles.switchRow}>
              <View style={styles.switchTextCol}>
                <Text style={styles.switchLabel}>Ocultar localização</Text>
                <Text style={styles.switchHint}>
                  País e cidade não aparecem no seu perfil público nem em buscas por região.
                </Text>
              </View>
              <Switch
                value={hideLocation}
                onValueChange={setHideLocation}
                disabled={disabled}
                trackColor={{ false: COLORS.border.medium, true: COLORS.secondary.main }}
                thumbColor="#ffffff"
              />
            </View>

            <Button onPress={() => void handleSave()} disabled={disabled} loading={saving} style={{ marginTop: 16 }}>
              Salvar localização
            </Button>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  hint: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  card: {
    borderWidth: 1,
    borderColor: COLORS.border.light,
    borderRadius: 12,
    borderStyle: 'dashed',
    padding: 14,
    backgroundColor: 'rgba(236, 72, 153, 0.04)',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 6,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  switchTextCol: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  switchHint: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 4,
    lineHeight: 18,
  },
});
