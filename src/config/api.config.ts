// Configuração da API
import Constants from 'expo-constants';

// ⚠️ CONFIGURAÇÃO DA URL BASE - ALTERE APENAS NO app.json
// Para alterar a URL, edite a variável EXPO_PUBLIC_API_URL no app.json
// O .env NÃO é usado - apenas app.json (ou eas.json em builds)
const API_BASE_URL = 
  Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL ||
  'https://melter.com.br'; // Fallback padrão

export const API_CONFIG = {
  // URL base da API (Next.js backend)
  // Altere EXPO_PUBLIC_API_URL no app.json para mudar esta URL
  BASE_URL: API_BASE_URL,
  
  // Timeout para requisições (30 segundos)
  TIMEOUT: 30000,
  
  // URLs de mídia S3
  S3_URL: 'https://melter-uploads.s3.us-east-2.amazonaws.com',
  
  // Stripe Public Key (para pagamentos)
  STRIPE_PUBLIC_KEY: 'pk_live_51QoxCfIgj86kFVX98I5o9T5RS5WQdNt5bTRDexVVjUmUsd7SoRK80wINvcs3TPKGbltQTmbMfe3tkCL5Hm0kZeQ000R1d0Rgwh',
  
  // Pusher (para real-time)
  PUSHER_KEY: 'd43255b31b53c8ad9699',
  PUSHER_CLUSTER: 'us2',
  
  // App URL (mesma da API)
  APP_URL: API_BASE_URL,
};

// Log das configurações com debug
console.log('[API_CONFIG] ✅ URL Base:', API_CONFIG.BASE_URL);
console.log('[API_CONFIG] 🔍 Origem:', {
  'Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL': Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL || 'NÃO DEFINIDO',
  'URL final usada': API_CONFIG.BASE_URL
});

