import Constants from 'expo-constants';

/** Canal de instalação do build: APK direto do site ou Google Play. Define para onde o "Atualizar" leva. */
export type AppDistribution = 'apk' | 'play';

const raw = Constants.expoConfig?.extra?.EXPO_PUBLIC_APP_DISTRIBUTION;

export const APP_DISTRIBUTION: AppDistribution | null = raw === 'apk' || raw === 'play' ? raw : null;

if (!APP_DISTRIBUTION) {
  console.error(
    'Variável de ambiente não encontrada: EXPO_PUBLIC_APP_DISTRIBUTION (app.json extra). Use "apk" ou "play". Checagem de atualização desativada.'
  );
}

/** android.versionCode embutido no build instalado (0 quando indisponível). */
export const INSTALLED_VERSION_CODE: number = Constants.expoConfig?.android?.versionCode ?? 0;

export const INSTALLED_VERSION_NAME: string = Constants.expoConfig?.version ?? '';

export const ANDROID_PACKAGE: string | null = Constants.expoConfig?.android?.package ?? null;
