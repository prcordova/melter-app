// Configuração da API
import Constants from 'expo-constants';

// Função para obter variável de ambiente com fallback
// No Expo, variáveis de ambiente devem começar com EXPO_PUBLIC_
// A função aceita a chave COM ou SEM o prefixo EXPO_PUBLIC_
// IMPORTANTE: Em builds de produção, process.env não funciona, precisa usar Constants.expoConfig.extra
const getEnvVar = (key: string, fallback: string = ''): string => {
  // Remove EXPO_PUBLIC_ se já estiver presente para evitar duplicação
  const cleanKey = key.startsWith('EXPO_PUBLIC_') ? key.replace('EXPO_PUBLIC_', '') : key;
  
  // Em builds de produção do Expo, variáveis vêm de Constants.expoConfig.extra
  // Priorizar Constants.expoConfig.extra primeiro (funciona em produção)
  // Depois tentar process.env (funciona apenas em desenvolvimento)
  return Constants.expoConfig?.extra?.[`EXPO_PUBLIC_${cleanKey}`] ||
         Constants.expoConfig?.extra?.[cleanKey] ||
         process.env[`EXPO_PUBLIC_${cleanKey}`] || 
         process.env[cleanKey] || 
         process.env[`NEXT_PUBLIC_${cleanKey}`] ||
         fallback;
};

export const API_CONFIG = {
  // URL base da API (Next.js backend)
  BASE_URL: getEnvVar('API_URL', 'http://192.168.2.100:3000'),
  
  // Timeout para requisições (30 segundos)
  TIMEOUT: 30000,
  
  // URLs de mídia S3
  S3_URL: getEnvVar('S3_URL', 'https://melter-uploads.s3.us-east-2.amazonaws.com'),
  
  // Stripe Public Key (para pagamentos)
  STRIPE_PUBLIC_KEY: getEnvVar('STRIPE_PUBLIC_KEY', 'pk_live_51QoxCfIgj86kFVX98I5o9T5RS5WQdNt5bTRDexVVjUmUsd7SoRK80wINvcs3TPKGbltQTmbMfe3tkCL5Hm0kZeQ000R1d0Rgwh'),
  
  // Pusher (para real-time)
  PUSHER_KEY: getEnvVar('PUSHER_KEY', 'd43255b31b53c8ad9699'),
  PUSHER_CLUSTER: getEnvVar('PUSHER_CLUSTER', 'us2'),
  
  // App URL
  APP_URL: getEnvVar('APP_URL', 'http://192.168.2.100:3000'),
};

// Log das configurações (sempre, para debug em produção)
console.log('[API_CONFIG] ✅ Configurações carregadas:', {
  BASE_URL: API_CONFIG.BASE_URL,
  S3_URL: '✓',
  STRIPE: '✓',
  PUSHER: '✓',
});

// Debug: Verificar variáveis de ambiente
console.log('[API_CONFIG] 🔍 Debug - Variáveis de ambiente:', {
  'process.env.EXPO_PUBLIC_API_URL': process.env.EXPO_PUBLIC_API_URL,
  'Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL': Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL,
});
