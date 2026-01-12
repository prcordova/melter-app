# 📱 Como Ver Logs do App Android

## ❌ Google Play Console NÃO Mostra Logs

O Google Play Console **não** mostra logs de runtime do app. Você precisa usar outras ferramentas.

---

## ✅ Como Ver Logs do App

### Opção 1: ADB Logcat (Recomendado)

1. **Conecte o celular via USB**
2. **Ative "Depuração USB"** nas opções de desenvolvedor
3. **Execute no terminal:**
```bash
adb logcat | grep -i "API_CONFIG\|API.*login\|melter\|react-native"
```

4. **Ou ver todos os logs:**
```bash
adb logcat
```

5. **Tente fazer login no app** e veja os logs aparecerem

---

### Opção 2: React Native Debugger

1. Instale: https://github.com/jhen0409/react-native-debugger
2. Conecte o celular
3. Abra o app e agite o celular
4. Selecione "Debug"
5. Veja os logs no React Native Debugger

---

### Opção 3: Flipper (Facebook)

1. Instale o Flipper: https://fbflipper.com/
2. Conecte o celular
3. Abra o app
4. Veja logs no Flipper

---

## 🔍 O Que Procurar nos Logs

Procure por estas mensagens que adicionamos:

```
[API_CONFIG] ✅ Configurações carregadas:
[API_CONFIG] 🔍 Debug - Variáveis de ambiente:
[API] 🔍 Tentando login com URL:
[API] ❌ Erro no login:
```

---

## 🐛 Problema Identificado

Se o log mostrar:
```
BASE_URL: http://192.168.2.100:3000
```

Isso significa que a variável de ambiente **NÃO** foi embutida no build e está usando o fallback.

**Solução:** Precisa gerar um novo build com as variáveis corretas.

---

## ✅ Solução: Garantir Variáveis no Build

O problema é que o EAS Build pode não estar embutindo as variáveis corretamente. Vamos garantir que funcione:

1. **Verificar `eas.json`** - Já está correto ✅
2. **Gerar novo build** com as variáveis
3. **Verificar logs** no novo build

