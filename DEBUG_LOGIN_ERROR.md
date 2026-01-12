# 🐛 Debug - Erro de Login no App

## 🔍 Possíveis Causas

### 1. **URL da API Incorreta**
O app está configurado para usar `https://melter.com.br` no build de produção.

**Verificar:**
- A URL `https://melter.com.br` está funcionando?
- O backend está rodando nessa URL?

### 2. **Variável de Ambiente Não Carregada**
A variável pode não ter sido embutida corretamente no build.

### 3. **CORS ou Problema de Rede**
O backend pode estar bloqueando requisições do app.

---

## ✅ SOLUÇÃO RÁPIDA - Verificar URL

### Passo 1: Testar URL no Navegador

Abra no navegador:
```
https://melter.com.br/api/auth/login
```

**Esperado:**
- Se retornar erro 405 (Method Not Allowed) = ✅ URL está correta
- Se retornar erro 404 = ❌ URL está errada
- Se não carregar = ❌ Problema de DNS/servidor

### Passo 2: Testar com cURL

```bash
curl -X POST https://melter.com.br/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"teste","password":"teste"}'
```

**Esperado:**
- Resposta JSON com `success: false` = ✅ API está funcionando
- Timeout ou erro de conexão = ❌ Problema de rede/servidor

---

## 🔧 SOLUÇÕES

### Solução 1: Verificar se URL está correta

Se `https://melter.com.br` não está funcionando, você precisa:

1. **Verificar qual é a URL correta do backend:**
   - É `https://melter.com.br`?
   - É `https://api.melter.com.br`?
   - É outra URL?

2. **Atualizar `eas.json`:**
```json
{
  "production": {
    "env": {
      "EXPO_PUBLIC_API_URL": "https://URL_CORRETA_AQUI"
    }
  }
}
```

3. **Gerar novo build:**
```bash
cd melter-app
eas build --platform android --profile production
```

4. **Fazer upload do novo .aab no Google Play Console**

---

### Solução 2: Adicionar Logs Temporários

Para verificar qual URL o app está usando, adicione logs temporários:

**Arquivo:** `melter-app/src/config/api.config.ts`

```typescript
export const API_CONFIG = {
  BASE_URL: getEnvVar('API_URL', 'http://192.168.2.100:3000'),
  // ... resto
};

// LOG TEMPORÁRIO PARA DEBUG
console.log('🔍 [DEBUG] API URL:', API_CONFIG.BASE_URL);
console.log('🔍 [DEBUG] Env vars:', {
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  EXPO_PUBLIC_API_URL_2: Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL,
});
```

Depois de adicionar os logs:
1. Gere novo build
2. Instale no celular
3. Abra o app e veja os logs (usando `adb logcat` ou React Native Debugger)
4. Verifique qual URL está sendo usada

---

### Solução 3: Verificar CORS no Backend

O middleware já está configurado com CORS, mas verifique:

**Arquivo:** `melter/middleware.ts`

Deve ter:
```typescript
response.headers.set('Access-Control-Allow-Origin', '*')
```

Se estiver restrito, pode estar bloqueando requisições do app.

---

## 🧪 TESTE RÁPIDO

### Teste 1: Verificar se backend está acessível

No celular, abra o navegador e acesse:
```
https://melter.com.br/api/auth/login
```

Se não carregar, o problema é a URL ou o servidor.

### Teste 2: Verificar logs do app

1. Conecte o celular via USB
2. Execute:
```bash
adb logcat | grep -i "api\|error\|melter"
```

3. Tente fazer login no app
4. Veja os logs para identificar o erro

---

## 📋 CHECKLIST DE DEBUG

- [ ] URL `https://melter.com.br` está acessível no navegador?
- [ ] Teste com cURL retorna resposta?
- [ ] Variável `EXPO_PUBLIC_API_URL` está no `eas.json`?
- [ ] Build foi feito com perfil `production`?
- [ ] CORS está configurado no backend?
- [ ] Logs do app mostram qual URL está sendo usada?

---

## 🚨 ERRO COMUM

### "Network Error" ou "Connection Failed"

**Causa:** URL incorreta ou servidor offline

**Solução:**
1. Verificar se `https://melter.com.br` está funcionando
2. Se não, atualizar URL no `eas.json`
3. Gerar novo build

---

## 💡 PRÓXIMOS PASSOS

1. **Teste a URL** no navegador primeiro
2. **Se não funcionar**, verifique qual é a URL correta do backend
3. **Atualize `eas.json`** com a URL correta
4. **Gere novo build** e faça upload

