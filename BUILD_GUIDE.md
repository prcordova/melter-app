# Guia de Build e Instalação no Dispositivo

## 📱 Opções para Testar no Celular

Você **NÃO precisa** hospedar na Play Store para testar! Existem várias formas de instalar o app diretamente no seu celular via USB ou QR Code.

---

## 🚀 Opção 1: Build Local APK (Recomendado para Testes)

### Pré-requisitos
1. **Android Studio** instalado (para ter o Android SDK)
2. **Java JDK** instalado
3. **Expo CLI** instalado globalmente:
   ```bash
   npm install -g expo-cli eas-cli
   ```

### Passo a Passo

#### 1. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto `melter-app/`:

```bash
# .env
EXPO_PUBLIC_API_URL=http://seu-backend.com
# Adicione outras variáveis que precisar
```

**Importante:** No Expo, variáveis de ambiente devem começar com `EXPO_PUBLIC_` para serem acessíveis no app.

#### 2. Atualizar `api.config.ts` para usar variáveis de ambiente

O arquivo `src/config/api.config.ts` deve usar `process.env.EXPO_PUBLIC_API_URL`:

```typescript
export const API_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000',
  TIMEOUT: 30000,
};
```

#### 3. Gerar APK Local

```bash
cd melter-app

# Instalar dependências (se ainda não instalou)
npm install

# Gerar build Android local
npx expo build:android --type apk

# OU usar EAS Build (mais moderno)
eas build --platform android --profile preview
```

**Nota:** Se usar `expo build:android`, você precisará criar uma conta Expo (gratuita). O build será feito na nuvem, mas você pode baixar o APK.

#### 4. Instalar via USB

1. **Habilitar Depuração USB** no celular:
   - Vá em `Configurações > Sobre o telefone`
   - Toque 7 vezes em "Número da versão" para ativar "Opções do desenvolvedor"
   - Volte e ative "Depuração USB"

2. **Conectar o celular via USB** ao computador

3. **Instalar o APK:**
   ```bash
   # Via ADB (Android Debug Bridge)
   adb install caminho/para/o/app.apk
   
   # OU simplesmente copie o APK para o celular e instale manualmente
   ```

---

## 🎯 Opção 2: EAS Build (Recomendado para Produção)

### Configurar EAS

1. **Criar conta Expo** (gratuita): https://expo.dev

2. **Instalar EAS CLI:**
   ```bash
   npm install -g eas-cli
   ```

3. **Login:**
   ```bash
   eas login
   ```

4. **Configurar projeto:**
   ```bash
   eas build:configure
   ```

Isso criará um arquivo `eas.json`:

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

### Build Preview (APK para testes)

```bash
# Build APK para Android
eas build --platform android --profile preview

# O build será feito na nuvem e você receberá um link para download
```

### Build Production (AAB para Play Store)

```bash
eas build --platform android --profile production
```

---

## 🔧 Opção 3: Development Build (Para Desenvolvimento)

### Usando Expo Go (Mais Rápido)

1. **Instalar Expo Go** no celular (Play Store)

2. **Iniciar o servidor:**
   ```bash
   npm start
   ```

3. **Escanear QR Code** com o Expo Go

**Limitação:** Expo Go não suporta todas as bibliotecas nativas. Se você usar bibliotecas que não são suportadas, use a Opção 4.

### Usando Development Build Local

1. **Gerar development build:**
   ```bash
   npx expo run:android
   ```

2. **Instalar no dispositivo conectado via USB**

---

## 📝 Configuração de Variáveis de Ambiente

### Para Builds Locais

Crie arquivos `.env`:

```bash
# .env (desenvolvimento)
EXPO_PUBLIC_API_URL=http://localhost:3000

# .env.production (produção)
EXPO_PUBLIC_API_URL=https://api.melter.com
```

### Para EAS Build

Configure no `eas.json`:

```json
{
  "build": {
    "preview": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api-staging.melter.com"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.melter.com"
      }
    }
  }
}
```

**OU** configure no dashboard do Expo: https://expo.dev

---

## 🔐 Chaves e Certificados

### Android (Keystore)

Para builds de produção, você precisa de um keystore:

1. **Gerar keystore:**
   ```bash
   keytool -genkeypair -v -storetype PKCS12 -keystore melter-release-key.jks -alias melter-key -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Configurar no `app.json`:**
   ```json
   {
     "expo": {
       "android": {
         "package": "com.melter.app"
       }
     }
   }
   ```

3. **EAS gerencia automaticamente** se você usar EAS Build.

---

## 📦 Instalação Manual do APK

1. **Transferir APK** para o celular (via USB, email, ou nuvem)

2. **Habilitar "Fontes desconhecidas"**:
   - `Configurações > Segurança > Fontes desconhecidas` (Android 8+)
   - Ou `Configurações > Apps > Instalar apps desconhecidos`

3. **Abrir o APK** no celular e instalar

---

## ✅ Checklist Antes do Build

- [ ] Variáveis de ambiente configuradas (`.env` ou EAS)
- [ ] `app.json` configurado com package name correto
- [ ] Ícone e splash screen configurados
- [ ] Permissões configuradas no `app.json`
- [ ] Versão atualizada no `app.json` e `package.json`
- [ ] Testado em desenvolvimento primeiro

---

## 🐛 Troubleshooting

### Erro: "Cannot find module"
```bash
# Limpar cache e reinstalar
rm -rf node_modules
npm install
npx expo start --clear
```

### Erro: "Keystore not found"
- Use EAS Build (gerencia automaticamente)
- OU gere um keystore manualmente (veja seção acima)

### APK não instala
- Verifique se "Fontes desconhecidas" está habilitado
- Verifique se o APK não está corrompido
- Tente gerar um novo build

---

## 📚 Recursos Úteis

- [Documentação Expo Build](https://docs.expo.dev/build/introduction/)
- [EAS Build Guide](https://docs.expo.dev/build/introduction/)
- [Expo Environment Variables](https://docs.expo.dev/guides/environment-variables/)

---

## 🎯 Resumo Rápido

**Para testar rapidamente:**
```bash
# 1. Configurar .env
echo "EXPO_PUBLIC_API_URL=http://seu-backend.com" > .env

# 2. Build APK
eas build --platform android --profile preview

# 3. Baixar e instalar no celular
```

**Não precisa de Play Store para testar!** 🎉

