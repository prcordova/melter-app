# ⚡ Build Rápido - Alternativas

## ❌ Não Pode Simplesmente Remover e Subir Novamente

O Google Play Console **não permite** reutilizar `versionCode`. Mesmo que você:
- Remova a versão do console
- Tente fazer upload novamente

O sistema do Google já registrou que o `versionCode: 1` foi usado e **não aceita novamente**.

**Solução:** Precisa gerar um novo build com `versionCode: 2` (já atualizado no `app.json` ✅)

---

## ⚡ Alternativas Mais Rápidas

### Opção 1: Build Local (Mais Rápido - 10-30 minutos)

Se você tem Android SDK instalado:

```bash
cd melter-app
eas build --platform android --profile production --local
```

**Vantagens:**
- ✅ Muito mais rápido (10-30 min vs 2-3 horas)
- ✅ Não depende da fila do EAS
- ✅ Você controla o processo

**Requisitos:**
- Android SDK instalado
- Java JDK
- Variáveis de ambiente configuradas

---

### Opção 2: Build Preview (APK) para Testar Primeiro

Gere um APK primeiro para testar se está funcionando:

```bash
cd melter-app
eas build --platform android --profile preview
```

**Vantagens:**
- ✅ Mais rápido que production (1-2 horas)
- ✅ Gera APK (pode instalar direto no celular)
- ✅ Testa se a correção funcionou antes de fazer build production

**Depois:**
- Se funcionar, faça o build production
- Se não funcionar, corrige antes

---

### Opção 3: Build Production na Nuvem (Padrão)

```bash
cd melter-app
eas build --platform android --profile production
```

**Tempo:** 2-3 horas (depende da fila do EAS)

---

## 🎯 Recomendação

1. **Teste primeiro com build preview** (APK):
   ```bash
   eas build --platform android --profile preview
   ```
   - Instale no celular
   - Teste o login
   - Veja os logs para confirmar a URL

2. **Se funcionar, faça build production:**
   ```bash
   eas build --platform android --profile production
   ```

---

## ⏱️ Tempos Estimados

| Método | Tempo | Quando Usar |
|--------|-------|-------------|
| **Build Local** | 10-30 min | Se tem Android SDK |
| **Build Preview (APK)** | 1-2 horas | Para testar primeiro |
| **Build Production (AAB)** | 2-3 horas | Para publicar no Google Play |

---

## 💡 Dica

Você pode iniciar o build e deixar rodando em background enquanto trabalha em outras coisas. O EAS envia notificação quando terminar.

---

## ❓ FAQ

### Posso cancelar um build e fazer outro?
Sim, mas você perde o tempo já gasto.

### Posso fazer build local sem Android SDK?
Não, precisa ter Android SDK instalado.

### O build preview funciona no Google Play?
Não, o Google Play só aceita `.aab` do perfil `production`. O preview é só para testar.

