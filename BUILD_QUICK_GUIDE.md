# 🚀 Guia Rápido de Build - Melter App

## ⚡ Build Rápido (após primeira configuração)

Para gerar um novo build (.aab) para o Google Play Console:

```bash
cd melter-app

# 1. Atualize a versão no app.json (se necessário)
# Edite: "version": "1.0.0" → "version": "1.0.1"

# 2. Gere o build
eas build --platform android --profile production
```

**Tempo estimado:** 10-20 minutos

---

## 📋 Configuração Inicial (só uma vez)

### 1. Instalar EAS CLI
```bash
npm install -g eas-cli
```

### 2. Login no EAS
```bash
eas login
```

### 3. Inicializar projeto (só na primeira vez)
```bash
cd melter-app
eas init
# Responda "yes" quando perguntar
```

### 4. Configurar credenciais Android (só na primeira vez)
```bash
eas credentials
```

**Passos interativos:**
1. Selecione: **Android**
2. Selecione: **production**
3. Selecione: **Keystore: Manage everything needed to build your project**
4. Selecione: **Set up a new keystore**
5. Aceite o nome sugerido ou digite um nome personalizado
6. O keystore será gerado automaticamente e salvo no servidor Expo

**Importante:** O keystore é obrigatório para assinar o app Android. Ele será reutilizado automaticamente em todos os builds futuros.

---

## 🔄 Processo Completo de Build

### Passo 1: Atualizar versão (se necessário)
Edite `app.json`:
```json
{
  "expo": {
    "version": "1.0.1"  // Incremente aqui
  }
}
```

### Passo 2: Gerar build
```bash
eas build --platform android --profile production
```

### Passo 3: Aguardar build
- O build leva 10-20 minutos
- Você receberá um link para acompanhar
- Ou use: `eas build:list`

### Passo 4: Baixar .aab
```bash
eas build:download
```
Ou baixe pelo link fornecido.

---

## 📤 Upload no Google Play Console

1. Acesse [Google Play Console](https://play.google.com/console)
2. Selecione seu app
3. Vá em **Produção** ou **Teste interno** → **Criar nova versão**
4. Faça upload do arquivo `.aab` baixado
5. Preencha as informações e envie para revisão

---

## 🎯 Comandos Úteis

```bash
# Ver histórico de builds
eas build:list

# Ver detalhes de um build
eas build:view [BUILD_ID]

# Baixar um build específico
eas build:download [BUILD_ID]

# Cancelar um build em andamento
eas build:cancel [BUILD_ID]
```

---

## ❓ FAQ

### Preciso fazer todos os passos sempre?
**Não!** Apenas na primeira vez:
- ✅ Login no EAS
- ✅ Inicializar projeto (`eas init`)
- ✅ Configurar credenciais (`eas credentials`)

**Sempre que for buildar:**
- ✅ Atualizar versão (se necessário)
- ✅ Executar `eas build --platform android --profile production`

### Onde atualizar a versão?
Edite o campo `"version"` no arquivo `app.json`.

### Quanto tempo leva?
- Build na nuvem: 10-20 minutos
- Build local: 5-10 minutos (se configurado)

### Posso fazer build local?
Sim, mas requer Android SDK instalado:
```bash
eas build --platform android --profile production --local
```

---

## 📝 Notas Importantes

- O arquivo `.aab` é gerado automaticamente pelo perfil `production`
- A URL da API em produção: `https://melter.com.br` (Next.js na Vercel)
- O package name: `com.melter.app`
- Projeto EAS: https://expo.dev/accounts/prcordova/projects/melter-app

---

## 🔗 Links Úteis

- [Documentação EAS Build](https://docs.expo.dev/build/introduction/)
- [Google Play Console](https://play.google.com/console)
- [Projeto no Expo](https://expo.dev/accounts/prcordova/projects/melter-app)

