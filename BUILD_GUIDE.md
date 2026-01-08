# Guia de Build - Melter App

Este guia explica como fazer o build do APK para o aplicativo Melter.

## Pré-requisitos

1. **Conta Expo**: Crie uma conta em [expo.dev](https://expo.dev)
2. **EAS CLI**: Instale o EAS CLI globalmente:
   ```bash
   npm install -g eas-cli
   ```
3. **Login no EAS**:
   ```bash
   eas login
   ```

## Configuração do Ambiente

### 1. Variáveis de Ambiente

O arquivo `eas.json` já está configurado com variáveis de ambiente para diferentes perfis:

- **Preview**: `EXPO_PUBLIC_API_URL=http://192.168.2.100:3000` (desenvolvimento local)
- **Production**: `EXPO_PUBLIC_API_URL=https://api.melter.com` (produção)

Você pode ajustar essas URLs no arquivo `eas.json` conforme necessário.

## Build do APK

### Opção 1: Build Preview (APK para testes)

Para gerar um APK que pode ser instalado diretamente em dispositivos Android:

```bash
cd melter-app
eas build --platform android --profile preview
```

Este comando irá:
- Gerar um APK (não um AAB)
- Usar a URL de API configurada no perfil `preview`
- Permitir instalação direta em dispositivos Android

### Opção 2: Build Production (AAB para Google Play)

Para gerar um AAB (Android App Bundle) para publicação na Google Play Store:

```bash
cd melter-app
eas build --platform android --profile production
```

**Nota**: O perfil `production` gera um AAB, não um APK. Para gerar APK em produção, você precisaria ajustar o `eas.json`.

### Opção 3: Build Local (mais rápido, requer Android SDK)

Se você tem o Android SDK configurado localmente:

```bash
cd melter-app
eas build --platform android --profile preview --local
```

## Processo de Build

1. **Inicie o build**:
   ```bash
   eas build --platform android --profile preview
   ```

2. **Siga as instruções**:
   - O EAS CLI irá fazer algumas perguntas sobre configurações
   - Você pode escolher fazer o build na nuvem (recomendado) ou localmente

3. **Aguarde o build**:
   - O build na nuvem geralmente leva 10-20 minutos
   - Você receberá um link para acompanhar o progresso

4. **Download do APK**:
   - Após o build concluir, você receberá um link para download
   - Ou execute: `eas build:list` para ver todos os builds

## Comandos Úteis

### Ver histórico de builds
```bash
eas build:list
```

### Ver detalhes de um build específico
```bash
eas build:view [BUILD_ID]
```

### Baixar um build
```bash
eas build:download [BUILD_ID]
```

### Cancelar um build em andamento
```bash
eas build:cancel [BUILD_ID]
```

## Configurações Importantes

### Arquivo `eas.json`

O arquivo já está configurado com:
- **Preview**: Gera APK para testes
- **Production**: Gera AAB para Google Play Store
- Variáveis de ambiente específicas para cada perfil

### Arquivo `app.json`

Contém:
- Nome do app: "melter-app"
- Package name: `com.melter.app`
- Permissões necessárias (câmera, galeria, notificações, etc.)
- Configurações de ícone e splash screen

## Troubleshooting

### Erro: "No credentials found"
Execute:
```bash
eas credentials
```

### Erro: "Build failed"
- Verifique os logs do build: `eas build:view [BUILD_ID]`
- Certifique-se de que todas as dependências estão instaladas: `npm install`
- Verifique se o arquivo `.env` está configurado corretamente (se usado)

### Build muito lento
- Use `--local` se tiver Android SDK configurado
- Verifique sua conexão com a internet
- Considere usar o plano pago do EAS para builds mais rápidos

## Próximos Passos

Após gerar o APK:
1. Transfira o arquivo para seu dispositivo Android
2. Ative "Fontes desconhecidas" nas configurações do Android
3. Instale o APK tocando no arquivo
4. Teste o aplicativo

## Publicação na Google Play Store

Para publicar na Play Store:
1. Gere o build de produção: `eas build --platform android --profile production`
2. Faça upload do AAB na Google Play Console
3. Complete as informações da loja
4. Envie para revisão

## Suporte

Para mais informações, consulte:
- [Documentação do EAS Build](https://docs.expo.dev/build/introduction/)
- [Documentação do Expo](https://docs.expo.dev/)
