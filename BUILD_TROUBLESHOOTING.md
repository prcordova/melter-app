# 🔧 Troubleshooting - Build Errors

## ❌ Erro: "Unknown error. See logs of the Install dependencies build phase"

### 📋 Passos para Diagnosticar

1. **Acesse os logs detalhados:**
   - Link do último build: https://expo.dev/accounts/prcordova/projects/melter-app/builds/0a7fb429-0b59-46e6-bbf2-b85fb9cc322a
   - Procure pela seção "Install dependencies"
   - Copie o erro específico que aparece

2. **Verifique dependências problemáticas:**
   - NativeWind 4.2.1 pode ter problemas com Expo SDK 54
   - React Native 0.79.5 é muito novo e pode ter incompatibilidades

3. **Soluções comuns:**

   **a) Limpar cache e reinstalar:**
   ```bash
   cd melter-app
   rm -rf node_modules package-lock.json
   npm install
   ```

   **b) Verificar se há conflitos de versão:**
   ```bash
   npm ls
   ```

   **c) Tentar build com flag de debug:**
   ```bash
   eas build --platform android --profile production --verbose
   ```

   **d) Verificar logs do build específico:**
   ```bash
   eas build:view 0a7fb429-0b59-46e6-bbf2-b85fb9cc322a
   ```

### 🔍 Possíveis Causas

1. **NativeWind 4.2.1 incompatível**
   - Solução: Downgrade para NativeWind 4.0.x ou verificar compatibilidade

2. **React Native 0.79.5 muito novo**
   - Solução: Verificar se Expo SDK 54 suporta RN 0.79.5

3. **Problema com Babel config**
   - Verificar se `babel.config.js` está correto

4. **Timeout na instalação**
   - Solução: Tentar novamente ou usar build local

5. **Problema temporário no servidor EAS**
   - Solução: Aguardar e tentar novamente

### 📝 Próximos Passos

1. **Acesse os logs detalhados** no link acima
2. **Copie o erro específico** que aparece
3. **Compartilhe o erro** para investigação mais precisa

### 🔗 Links Úteis

- [EAS Build Troubleshooting](https://docs.expo.dev/build-reference/troubleshooting/)
- [Expo SDK 54 Compatibility](https://docs.expo.dev/versions/latest/)
- [NativeWind Documentation](https://www.nativewind.dev/)

