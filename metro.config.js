const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configurar resolver para pusher-js funcionar no React Native
config.resolver.sourceExts.push('mjs', 'cjs');

module.exports = config;
