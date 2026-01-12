# 📋 Guia - Política de Privacidade no Google Play Console

## ⚠️ Erro Recebido

```
Seu APK ou Android App Bundle usa permissões que exigem uma política de privacidade: 
(android.permission.CAMERA)
```

## ✅ Solução

O Google Play **exige** uma política de privacidade quando o app usa permissões sensíveis como:
- `android.permission.CAMERA` (Câmera)
- `android.permission.RECORD_AUDIO` (Microfone)
- `android.permission.READ_EXTERNAL_STORAGE` (Armazenamento)

---

## 📝 Como Adicionar Política de Privacidade

### Passo 1: Criar Política de Privacidade

Você precisa criar uma página web com sua política de privacidade. Pode ser:

1. **Página no seu site** (recomendado):
   - Exemplo: `https://melter.com.br/privacy` ou `https://melter.com.br/politica-privacidade`

2. **Google Sites** (gratuito):
   - Crie em: https://sites.google.com
   - Compartilhe publicamente
   - Use o link gerado

3. **GitHub Pages** (gratuito):
   - Crie um repositório
   - Publique uma página HTML
   - Use o link: `https://seu-usuario.github.io/politica-privacidade`

---

### Passo 2: Adicionar no Google Play Console

1. **Acesse o Google Play Console**
   - https://play.google.com/console

2. **Selecione seu app "Melter"**

3. **No menu lateral:**
   - Vá em **"Política e programas"** ou **"Policy"**
   - Ou vá em **"Conteúdo do app"** → **"Política de privacidade"**

4. **Cole o link da sua política de privacidade**

5. **Salve**

---

## 📄 Exemplo de Política de Privacidade

Sua política deve mencionar:

### ✅ Obrigatório:
- **Quais dados são coletados** (fotos, vídeos, áudio, etc.)
- **Como os dados são usados** (postar no feed, compartilhar, etc.)
- **Com quem os dados são compartilhados** (outros usuários, serviços terceiros, etc.)
- **Como os dados são armazenados** (servidor, S3, etc.)
- **Direitos do usuário** (excluir dados, etc.)

### 📋 Template Básico:

```markdown
# Política de Privacidade - Melter

## 1. Dados Coletados

O Melter coleta os seguintes dados quando você usa o app:

- **Fotos e Vídeos**: Quando você tira fotos ou grava vídeos usando a câmera do dispositivo
- **Galeria**: Quando você seleciona fotos da sua galeria para postar
- **Áudio**: Quando você grava vídeos com áudio
- **Dados de Perfil**: Nome, email, foto de perfil
- **Dados de Uso**: Posts, comentários, curtidas

## 2. Como Usamos os Dados

- Para permitir que você poste fotos e vídeos no feed
- Para compartilhar conteúdo com outros usuários
- Para melhorar a experiência do app

## 3. Armazenamento

Os dados são armazenados em servidores seguros e no Amazon S3.

## 4. Compartilhamento

Seus posts são compartilhados com outros usuários do Melter conforme suas configurações de privacidade.

## 5. Seus Direitos

Você pode:
- Excluir suas fotos e vídeos a qualquer momento
- Solicitar exclusão da sua conta
- Acessar seus dados pessoais

## 6. Contato

Para dúvidas sobre privacidade, entre em contato: [seu-email@melter.com.br]
```

---

## 🚀 Passos Rápidos

1. **Crie a página** de política de privacidade (no seu site ou Google Sites)
2. **Copie o link** da página
3. **No Google Play Console:**
   - Vá em **"Política e programas"** ou **"Conteúdo do app"**
   - Cole o link em **"Política de privacidade"**
   - Salve
4. **Tente fazer upload do .aab novamente**

---

## ⚠️ Importante

- A política deve estar **publicamente acessível** (sem login)
- Deve estar em **português** (ou no idioma do seu app)
- Deve ser uma **URL válida** (https://)
- O Google pode levar alguns minutos para verificar

---

## ✅ Após Adicionar

Depois de adicionar a política de privacidade:
1. Aguarde alguns minutos
2. Tente fazer upload do `.aab` novamente
3. O erro deve desaparecer

---

## 📝 Nota

Você pode criar uma página simples no seu site Next.js em:
- `melter/app/privacy/page.tsx` ou
- `melter/app/politica-privacidade/page.tsx`

E depois usar o link: `https://melter.com.br/privacy`

