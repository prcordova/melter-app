# 📱 Story Viewer - Implementação Completa Mobile

## 🎯 Objetivos

Implementar todas as funcionalidades do Story Viewer no mobile, incluindo:
- Reações (limite de 3 por tipo)
- Input de mensagem (apenas para amigos)
- Visualizações para o dono
- Preview do story no chat quando alguém responde
- Cards verticais retangulares no feed (estilo Facebook)

---

## ✨ Funcionalidades a Implementar

### 1. 🎭 Sistema de Reações nos Stories

#### 1.1 Componente StoryReactionButton
- [x] Criar componente `StoryReactionButton.tsx`
- [ ] Suportar 7 tipos de reações (LIKE, LOVE, HAPPY, FIRE, STRONG, SAD, ANGRY)
- [ ] Limite de 3 reações por tipo por usuário
- [ ] Se é amigo: botão ao lado direito do input de mensagem
- [ ] Se não é amigo: todas reações abertas centralizadas no bottom
- [ ] Animação ao reagir (feedback visual)

#### 1.2 API de Reações
- [x] Adicionar `reactToStory` em `storiesApi`
- [x] Adicionar `getStoryReactions` em `storiesApi`
- [ ] Endpoint: `POST /api/stories/:storyId/reactions`
- [ ] Endpoint: `GET /api/stories/:storyId/reactions`

#### 1.3 Visualização de Reações (Para o Dono)
- [ ] Mostrar quem visualizou E quem reagiu
- [ ] Layout: Nome do usuário | Ícones de reação agrupados (lado direito)
- [ ] Reações agrupadas estilo Facebook (ícones sobrepostos)

---

### 2. 💬 Mensagens Diretas pelo Stories

#### 2.1 Componente StoryMessageInput
- [ ] Criar componente `StoryMessageInput.tsx`
- [ ] Input de texto
- [ ] Upload de imagem/documento
- [ ] Visibilidade condicional: **apenas para amigos**
- [ ] Placeholder: "Responder ao story..."
- [ ] Enviar mensagem com metadados do story:
  ```typescript
  {
    recipientId: string,
    content: string,
    type: 'text' | 'image' | 'document',
    storyReply: {
      storyId: string,
      mediaUrl: string,
      mediaType: 'image' | 'video' | 'gif'
    }
  }
  ```

#### 2.2 Validação de Amizade
- [ ] Verificar `friendshipStatus === 'FRIENDLY'` antes de exibir input
- [ ] Backend: validar amizade antes de enviar mensagem de story

#### 2.3 Preview do Story na Conversa
- [ ] Criar componente `StoryReplyPreview.tsx`
- [ ] Exibir preview do story na mensagem
- [ ] Preview clicável (se story ativo: direciona para o story)
- [ ] Se story expirado: preview desaparece, mostra "Este story não está mais disponível"
- [ ] Validar se story ainda está disponível via API

---

### 3. 📊 Visualizações

#### 3.1 Para o Dono do Story
- [ ] Mostrar quantidade de visualizações no lado esquerdo abaixo
- [ ] Botão clicável para ver lista de visualizadores
- [ ] Mostrar reações junto com visualizações

---

### 4. 🎨 Layout do Story Card no Feed

#### 4.1 StoriesCarousel
- [ ] Cards verticais retangulares (estilo Facebook)
- [ ] Proporção: altura maior que largura
- [ ] Preview da imagem/vídeo do story
- [ ] Avatar do usuário sobreposto
- [ ] Indicador de stories não visualizados

---

### 5. 🔔 Sistema de Notificações

#### 5.1 Notificação de Reação
- [ ] Criar notificação quando alguém reage ao story
- [ ] Tipo: `STORY_REACTION`
- [ ] Conteúdo: "{username} reagiu ao seu story"
- [ ] **SEM redirect** (story pode ter expirado)

#### 5.2 Notificação de Mensagem
- [ ] Provavelmente já funciona automaticamente (mesma rota do chat)
- [ ] Conteúdo diferenciado: "João respondeu seu story"

---

## 📂 Arquivos a Criar/Modificar

### Componentes
- [ ] `melter-app/src/components/stories/StoryReactionButton.tsx` - **CRIAR**
- [ ] `melter-app/src/components/stories/StoryMessageInput.tsx` - **CRIAR**
- [ ] `melter-app/src/components/stories/StoryReplyPreview.tsx` - **CRIAR**
- [ ] `melter-app/src/components/StoryViewerModal.tsx` - **MODIFICAR**
- [ ] `melter-app/src/components/StoriesCarousel.tsx` - **MODIFICAR**

### API
- [x] `melter-app/src/services/api.ts` - Adicionar métodos de reações
- [ ] `melter-app/src/services/api.ts` - Adicionar método para verificar amizade

### Types
- [x] `melter-app/src/types/feed.ts` - Adicionar campo `reactions` ao Story
- [ ] `melter-app/src/types/feed.ts` - Adicionar interface `StoryReaction`

### Chat
- [ ] `melter-app/src/components/chat/` - Integrar `StoryReplyPreview` no chat

---

## ✅ Decisões de Design

### Reações
1. **Limite de reações:** 3 reações de cada tipo por usuário (max 21 total: 3 × 7 tipos)
2. **Posicionamento:**
   - Se é amigo: Botão ao lado direito do input de mensagem
   - Se não é amigo: Todas reações abertas centralizadas no bottom
3. **Comportamento:** Adiciona até o limite de 3 por tipo

### Mensagens
1. **Input sempre visível** se for amigo
2. **Se for seguidor/público:** sem input (só reações)
3. **Preview clicável:** Se story ativo, direciona para o story
4. **Se story expirado:** preview desaparece, mostra mensagem

### Permissões
1. **Reagir:** Qualquer um que visualiza o story (respeita visibilidade do story)
2. **Mensagem:** Apenas amigos (regra global do chat)

---

## 🔄 Fluxo de Implementação

### Fase 1: Reações
1. Criar `StoryReactionButton.tsx`
2. Integrar no `StoryViewerModal.tsx`
3. Adicionar API endpoints
4. Testar reações

### Fase 2: Mensagens
1. Criar `StoryMessageInput.tsx`
2. Integrar no `StoryViewerModal.tsx`
3. Validar amizade
4. Testar envio de mensagens

### Fase 3: Preview no Chat
1. Criar `StoryReplyPreview.tsx`
2. Integrar no chat
3. Validar se story ainda está disponível
4. Testar preview clicável

### Fase 4: Visualizações
1. Atualizar modal de visualizadores
2. Mostrar reações junto com visualizações
3. Testar visualizações

### Fase 5: Layout do Feed
1. Atualizar `StoriesCarousel.tsx`
2. Cards verticais retangulares
3. Testar layout

---

## 📝 Notas Importantes

1. **Limite de reações:** 3 por tipo (não 10) para evitar quebra de layout
2. **Input de mensagem:** Apenas para amigos, sempre visível se for amigo
3. **Preview do story:** Verifica se story existe antes de mostrar
4. **Notificações:** Tipo `STORY_REACTION` criado automaticamente na API
5. **Visualizações:** Mostrar reações junto com visualizações no modal

---

## 🚀 Status Atual

**Data de Início:** 02/01/2025
**Progresso Geral:** 10% ✅

### ✅ Concluído
- [x] Adicionar métodos de reações na API
- [x] Atualizar interface Story com campo reactions

### 🔄 Em Progresso
- [ ] Criar componentes de reações e mensagens

### ⏳ Pendente
- [ ] Integrar componentes no StoryViewerModal
- [ ] Criar StoryReplyPreview
- [ ] Atualizar StoriesCarousel
- [ ] Testar todas as funcionalidades

