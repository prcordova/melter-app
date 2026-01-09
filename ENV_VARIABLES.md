# 📋 Variáveis de Ambiente - Melter App

## 🔧 Como Funciona

As variáveis de ambiente são **embutidas no build** pelo EAS Build através do arquivo `eas.json`. **NÃO** é necessário configurar nada no Google Play Console.

## ✅ Variáveis Configuradas no `eas.json`

### Produção (`production` profile):
```json
{
  "env": {
    "EXPO_PUBLIC_API_URL": "https://melter.com.br"
  }
}
```

### Preview/Desenvolvimento (`preview` profile):
```json
{
  "env": {
    "EXPO_PUBLIC_API_URL": "http://192.168.2.100:3000"
  }
}
```

## 📝 Variáveis Usadas no App

O app usa as seguintes variáveis (todas com fallback hardcoded):

| Variável | Uso | Fallback |
|----------|-----|----------|
| `EXPO_PUBLIC_API_URL` | URL base da API Next.js | `http://192.168.2.100:3000` |
| `EXPO_PUBLIC_S3_URL` | URL do bucket S3 | `https://melter-uploads.s3.us-east-2.amazonaws.com` |
| `EXPO_PUBLIC_STRIPE_PUBLIC_KEY` | Chave pública do Stripe | Hardcoded (live key) |
| `EXPO_PUBLIC_PUSHER_KEY` | Chave do Pusher | Hardcoded |
| `EXPO_PUBLIC_PUSHER_CLUSTER` | Cluster do Pusher | `us2` |
| `EXPO_PUBLIC_APP_URL` | URL do app web | `http://192.168.2.100:3000` |

## ⚠️ Importante

- **NÃO** configure variáveis no Google Play Console
- As variáveis são **embutidas no build** pelo EAS
- Para mudar variáveis, edite `eas.json` e gere um novo build
- Variáveis com valores hardcoded (Stripe, Pusher) não precisam estar no `eas.json` se os valores padrão estão corretos

## 🔄 Como Adicionar Nova Variável

1. Adicione no `eas.json`:
```json
{
  "production": {
    "env": {
      "EXPO_PUBLIC_API_URL": "https://melter.com.br",
      "EXPO_PUBLIC_NOVA_VARIAVEL": "valor"
    }
  }
}
```

2. Use no código:
```typescript
const valor = getEnvVar('NOVA_VARIAVEL', 'fallback');
```

3. Gere novo build:
```bash
eas build --platform android --profile production
```

