# Guia de Implementação - Páginas de Configurações Mobile

Este documento mapeia detalhadamente as funcionalidades das páginas de Analytics, Promoções e Segurança do Melter Web para implementação no app mobile.

---

## 📊 1. ANALYTICS (Análises)

### 1.1. Visão Geral
Página que exibe estatísticas detalhadas dos posts do usuário, incluindo visualizações, engajamento, seguidores ganhos e progresso de promoções.

### 1.2. Endpoint da API
- **GET** `/api/posts/analytics`
- **Query Params:**
  - `page` (number, default: 1)
  - `limit` (number, default: 10)
  - `sortBy` (string: 'recent' | 'most-viewed' | 'most-engagement' | 'most-comments' | 'most-reactions')

### 1.3. Estrutura de Dados Retornados

```typescript
interface AnalyticsData {
  posts: PostAnalytics[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  summary: {
    totalPosts: number
    totalViews: number
    totalUniqueViews: number
    totalEngagement: number
    totalNewFollowers: number
    avgEngagementRate: number
  }
}

interface PostAnalytics {
  _id: string
  content: string
  imageUrl?: string
  visibility: string
  createdAt: string
  viewsCount: number
  uniqueViewsCount: number
  viewsLast24h: number
  reactionsCount: number
  commentsCount: number
  sharesCount: number
  totalEngagement: number
  engagementRate: number
  newFollowers: number
  reach: number
  hasPromotion: boolean
  promotionProgress?: {
    status: string
    budget: number
    targetViews: number
    achievedViews: number
    percentage: number
    remainingViews: number
    startDate: string
    endDate: string | null
  }
}
```

### 1.4. Componentes e Layout

#### 1.4.1. Header com Resumo Geral
- **Background:** Gradiente roxo (`linear-gradient(135deg, #667eea 0%, #764ba2 100%)`)
- **Título:** "📊 Resumo Geral" (usar i18n: `analytics.summary.title`)
- **Métricas em Grid (5 colunas):**
  1. **Total de Posts** (`analytics.summary.totalPosts`)
  2. **Total de Visualizações** (`analytics.summary.views`) - formatar com `toLocaleString()`
  3. **Total de Engajamento** (`analytics.summary.engagement`)
  4. **Novos Seguidores** (`analytics.summary.newFollowers`)
  5. **Taxa Média de Engajamento** (`analytics.summary.avgRate`) - formatar com `.toFixed(1)%`

#### 1.4.2. Filtros e Título
- **Título:** "Posts" (`analytics.posts.title`)
- **Select de Ordenação:**
  - Label: `analytics.posts.sortBy`
  - Opções:
    - `recent` → `analytics.posts.recent`
    - `most-viewed` → `analytics.posts.mostViewed`
    - `most-engagement` → `analytics.posts.mostEngagement`
    - `most-comments` → `analytics.posts.mostComments`
    - `most-reactions` → `analytics.posts.mostReactions`
  - **Comportamento:** Ao mudar, resetar `page` para 1

#### 1.4.3. Lista de Posts
Cada post exibe:

**Card do Post:**
- **Badge de Promoção** (se `hasPromotion === true`):
  - Posição: `absolute`, `top: -12`, `right: 16`
  - Cor: `success.main`
  - Ícone: `CampaignIcon`
  - Label: `analytics.promotion.promoted`

**Conteúdo do Post (Grid 4/12):**
- Imagem (se `imageUrl`): `Avatar` rounded, 60x60
- Preview do texto: Primeiros 100 caracteres + "..."
- Data: `toLocaleDateString('pt-BR')`

**Métricas (Grid 8/12):**
- Grid 4 colunas:
  1. **Visualizações:**
     - Ícone: `VisibilityIcon` (cor: `primary.main`)
     - Valor: `viewsCount`
     - Label: `analytics.metrics.views`
  2. **Comentários:**
     - Ícone: `CommentIcon` (cor: `info.main`)
     - Valor: `commentsCount`
     - Label: `analytics.metrics.comments`
  3. **Novos Seguidores:**
     - Ícone: `PersonAddIcon` (cor: `success.main`)
     - Valor: `newFollowers`
     - Label: `analytics.metrics.followers`
  4. **Taxa de Engajamento:**
     - Ícone: `TrendingUpIcon` (cor: `warning.main`)
     - Valor: `engagementRate.toFixed(1)%`
     - Label: `analytics.metrics.engagement`

**Progresso de Promoção ou Botão Promover:**
- **Se tem promoção ativa (`hasPromotion && promotionProgress`):**
  - Barra de progresso (`LinearProgress`):
    - Altura: 8px
    - Valor: `promotionProgress.percentage`
    - Label superior: `analytics.promotion.progress`
    - Texto: `achievedViews / targetViews views`
    - Texto inferior: `remainingViews views restantes • Orçamento: R$ budget.toFixed(2)`
- **Se não tem promoção:**
  - Botão: `analytics.promotion.promoteButton`
  - Ícone: `RocketLaunchIcon`
  - Cor: `warning.main`
  - **Ação:** TODO - Abrir modal de promoção (por enquanto toast)

#### 1.4.4. Paginação
- Exibir apenas se `pagination.pages > 1`
- Chips clicáveis numerados (1, 2, 3...)
- Chip ativo: `color="primary"`

#### 1.4.5. Estados Vazios
- **Loading:** `CircularProgress` centralizado
- **Sem posts:** 
  - Título: `analytics.empty.noPosts`
  - Subtítulo: `analytics.empty.createFirst`

### 1.5. Validações e Comportamentos
- ✅ Resetar página para 1 ao mudar filtro
- ✅ Formatar números grandes com `toLocaleString()`
- ✅ Calcular `engagementRate` como: `(totalEngagement / uniqueViewsCount) * 100`
- ✅ Tratar casos onde `uniqueViewsCount === 0` (evitar divisão por zero)
- ✅ Exibir badge de promoção apenas se `hasPromotion === true`
- ✅ Calcular `promotionProgress.percentage` como: `(achievedViews / targetViews) * 100`

### 1.6. Checklist de Implementação
- [x] Criar `AnalyticsScreen.tsx`
- [x] Adicionar endpoint `postsApi.getAnalytics(page, limit, sortBy)` em `api.ts`
- [x] Implementar header com resumo (gradiente roxo)
- [x] Implementar select de ordenação
- [x] Implementar lista de posts com cards
- [x] Implementar métricas por post (4 colunas)
- [x] Implementar badge de promoção
- [x] Implementar barra de progresso de promoção
- [x] Implementar botão "Promover" (TODO: modal)
- [x] Implementar paginação
- [x] Implementar estados vazios (loading, sem posts)
- [ ] Adicionar i18n keys necessárias
- [ ] Testar todas as ordenações
- [ ] Testar paginação
- [ ] Validar cálculos de engajamento

---

## 🎁 2. PROMOÇÕES (Campanhas Publicitárias)

### 2.1. Visão Geral
Página para criar e gerenciar campanhas publicitárias (anúncios) para promover marcas/produtos. Inclui sistema de cálculo de custos baseado em categorias, dias e visualizações.

### 2.2. Endpoints da API

#### 2.2.1. Listar Campanhas
- **GET** `/api/ads/list?myAds=true`
- **Retorna:** Array de `Ad[]`

#### 2.2.2. Criar Campanha
- **POST** `/api/ads/create`
- **Body:** `createAdSchema` (ver validações)

#### 2.2.3. Reativar Campanha
- **POST** `/api/ads/reactivate/:adId`
- **Body:** Mesmo schema de criação

#### 2.2.4. Estender Campanha
- **POST** `/api/ads/extend/:adId`
- **Body:** `{ days: number }`

#### 2.2.5. Deletar Campanha
- **DELETE** `/api/ads/delete/:adId`

#### 2.2.6. Upload de Mídia
- **POST** `/api/ads/upload-media`
- **FormData:** `{ file: File }`
- **Timeout:** 60s
- **Max size:** Configurado no backend

#### 2.2.7. Configuração de Campanha
- **GET** `/api/ads/campaign-config`
- **Retorna:** `{ pricePerView: number, averages: Map<string, number> }`

#### 2.2.8. Histórico
- **GET** `/api/ads/history`
- **DELETE** `/api/ads/history/clear`

### 2.3. Estrutura de Dados

```typescript
interface Ad {
  _id: string
  title?: string
  description?: string
  type: 'IMAGE' | 'VIDEO'
  mediaUrl: string
  link?: string
  status: 'ACTIVE' | 'INACTIVE' | 'PAUSED'
  views: number
  clicks: number
  createdAt: string
  endDate?: string
  startDate?: string
  estimatedCost: number
  actualCost: number
  campaignDays?: number
  targetViews?: number
  targetCategories?: string[]
  pendingApproval: boolean
  approvedAt?: string
  rejectedAt?: string
  rejectionReason?: string
}

interface CampaignConfig {
  pricePerView: number // Ex: 0.10
  averages: Map<string, number> // Categoria ID → Média de views por dia
}
```

### 2.4. Componentes e Layout

#### 2.4.1. Header e Tabs
- **Título:** `promotions.title`
- **Botão "Criar Anúncio":** Apenas na tab "Campanhas" (tab 0)
- **Tabs:**
  1. **Campanhas** (`promotions.tabs.campaigns`)
  2. **Histórico** (`promotions.tabs.history`)

#### 2.4.2. Filtros (Tab Campanhas)
Exibir apenas se `ads.length > 0`:

- **Busca por texto:**
  - Placeholder: `promotions.filters.searchPlaceholder`
  - Busca em: `title` e `description`
  
- **Filtro por categoria:**
  - Label: `promotions.filters.category`
  - Opções: "Todas" + `FIXED_CATEGORIES`
  
- **Filtro por status:**
  - Label: `promotions.filters.status`
  - Opções: "Todos", "Ativo", "Inativo", "Pendente"
  - **Lógica:** "Pendente" = `pendingApproval === true`
  
- **Filtro por data:**
  - Tipo: `date`
  - Filtra por `createdAt`
  
- **Botão "Limpar Filtros":**
  - Exibir apenas se algum filtro ativo
  - Resetar todos os filtros

#### 2.4.3. Lista de Campanhas

**Versão Mobile (Cards):**
- Card por campanha com:
  - **Preview da mídia:** 80x80, rounded
  - **Título** (ou `promotions.table.noTitle`)
  - **Chip de status** (cor baseada em `getStatusColor`)
  - **Categorias:** Chips das categorias selecionadas
  - **Métricas (Grid 2x2):**
    - Visualizações (ícone `VisibilityIcon`)
    - Cliques (ícone `TouchAppIcon`)
    - CTR: `(clicks / views) * 100` (2 decimais)
    - Período: Data de término ou "Sem prazo"
  - **Ações:**
    - **Estender:** Apenas se `status === 'ACTIVE' && !isExpired && !pendingApproval`
    - **Reativar:** Apenas se `status === 'INACTIVE' && !pendingApproval`
    - **Deletar:** Sempre disponível

**Versão Desktop (Tabela):**
- Colunas:
  1. Mídia (60x60)
  2. Título
  3. Categorias (chips)
  4. Status (chip colorido)
  5. Visualizações (alinhado à direita)
  6. Cliques (alinhado à direita)
  7. CTR (alinhado à direita)
  8. Início (`startDate` formatado ou "Imediato")
  9. Término (`endDate` formatado ou "Sem prazo")
  10. Ações (alinhado à direita)

#### 2.4.4. Modal de Criar/Reativar Campanha

**Campos do Formulário:**

1. **Título** (opcional):
   - Tipo: `TextField`
   - Max: 200 caracteres
   - Placeholder: `promotions.dialog.title`

2. **Descrição** (opcional):
   - Tipo: `TextField` multiline
   - Max: 500 caracteres
   - Placeholder: `promotions.dialog.description`

3. **Mídia (OBRIGATÓRIO):**
   - **Opção 1: Upload**
     - Botão: `promotions.dialog.upload`
     - Aceita: Imagens e vídeos
     - Validação: Apenas imagens/vídeos
     - Progresso durante upload
   - **Opção 2: URL**
     - Input: URL da mídia
     - Validação: URL válida
   - **Detecção automática de tipo:**
     - Vídeo: `.mp4`, `.webm`, `.ogg`, `.mov`, `.avi`, `.mkv`, `.flv`, `.wmv`, `.m4v`, `youtube.com`, `youtu.be`, `vimeo.com`, `dailymotion.com`
     - Imagem: Demais casos

4. **Link** (opcional):
   - Tipo: `TextField`
   - Validação: URL válida (se preenchido)
   - Max: 500 caracteres
   - Placeholder: `promotions.dialog.link`

5. **Categorias Alvo (OBRIGATÓRIO):**
   - **Mínimo:** 1 categoria
   - **Máximo:** Múltiplas
   - **UI:** Menu dropdown com checkboxes ou chips selecionáveis
   - **Validação:** Pelo menos 1 categoria selecionada
   - **Importante:** Recalcula custo quando categorias mudam

6. **Duração da Campanha:**
   - **Opção 1: Por Dias**
     - Input: `number`
     - Min: 1
     - Max: 365
     - **Comportamento:** Ao preencher, calcula `targetViews` e `estimatedCost` automaticamente
   - **Opção 2: Por Visualizações**
     - Input: `number`
     - Min: 0
     - Max: 10.000.000
     - **Comportamento:** Ao preencher, calcula `campaignDays` e `estimatedCost` automaticamente
   - **Validação:** Pelo menos um dos dois deve ser preenchido

7. **Data e Hora de Início (OBRIGATÓRIO):**
   - **Data:** Input tipo `date`
   - **Hora:** Input tipo `time` (formato HH:mm)
   - **Default:** Data/hora atual
   - **Validação:** Não pode ser no passado (ou permitir?)

8. **Data e Hora de Término (OBRIGATÓRIO):**
   - **Data:** Input tipo `date`
   - **Hora:** Input tipo `time` (formato HH:mm)
   - **Auto-cálculo:** Se `campaignDays` preenchido, calcula automaticamente baseado em `startDate + startTime + campaignDays`
   - **Validações:**
     - `endDate` não pode ser antes de `startDate`
     - Se mesma data, `endTime` não pode ser antes de `startTime`

9. **Custo Estimado:**
   - **Display:** R$ `estimatedCost.toFixed(2)`
   - **Cálculo:** Baseado em `targetViews * pricePerView` ou `campaignDays * avgViewsPerDay * pricePerView`
   - **Atualização:** Automática quando categorias, dias ou views mudam

**Validações do Formulário:**
- ✅ `mediaUrl` obrigatório
- ✅ Pelo menos 1 categoria selecionada
- ✅ Pelo menos um: `campaignDays` OU `targetViews`
- ✅ `startDate` e `startTime` obrigatórios
- ✅ `endDate` e `endTime` obrigatórios
- ✅ `endDate >= startDate`
- ✅ Se `startDate === endDate`, então `endTime >= startTime`
- ✅ Saldo suficiente: `user.wallet.balance >= estimatedCost`
- ✅ Se saldo insuficiente, abrir modal de adicionar saldo

**Cálculo de Custos:**
- **Método 1 (Por Dias):**
  1. Buscar `campaignConfig` (se não tiver, buscar do endpoint)
  2. Para cada categoria selecionada, buscar média de views/dia
  3. **SOMAR** as médias (não fazer média aritmética)
  4. `targetViews = totalAvg * campaignDays`
  5. `estimatedCost = targetViews * pricePerView`

- **Método 2 (Por Views):**
  1. Buscar `campaignConfig`
  2. Calcular `totalAvg` (soma das médias das categorias)
  3. `campaignDays = Math.ceil(targetViews / totalAvg)`
  4. `estimatedCost = targetViews * pricePerView`

**Comportamentos Especiais:**
- Se remover todas as categorias, limpar `targetViews` e `estimatedCost`
- Evitar loops infinitos ao recalcular (usar flags `updatingFromDays`, `updatingFromViews`)
- Recalcular quando categorias mudam (apenas se já tiver valores)

#### 2.4.5. Modal de Estender Campanha
- **Input:** Número de dias (min: 1)
- **Cálculo de custo:**
  - `avgViewsPerDay = getAvgViewsPerDay(categories, 'TARGETED', config)`
  - `costPerDay = avgViewsPerDay * pricePerView`
  - `extendCost = costPerDay * extendDays`
- **Validação:** Saldo suficiente
- **Ação:** POST `/api/ads/extend/:adId` com `{ days: number }`

#### 2.4.6. Modal de Deletar Campanha
- **Confirmação:** Dialog de confirmação
- **Ação:** DELETE `/api/ads/delete/:adId`
- **Feedback:** Toast de sucesso/erro

#### 2.4.7. Tab Histórico
- **Botão "Limpar Histórico":** Topo direito (apenas se `history.length > 0`)
- **Tabela:**
  - Colunas: Data, Ação, Mídia, Título, Custo, Status
  - **Ações possíveis:**
    - `CREATED` → `promotions.history.actions.created` (verde)
    - `REACTIVATED` → `promotions.history.actions.reactivated` (azul)
    - `DELETED` → `promotions.history.actions.deleted` (vermelho)
    - `APPROVED` → `promotions.history.actions.approved` (verde)
    - `REJECTED` → `promotions.history.actions.rejected` (vermelho)
    - `EXTENDED` → `promotions.history.actions.extended` (azul)
  - **Formatação de data:** `dd/MM/yyyy HH:mm`
- **Estado vazio:** `promotions.history.noHistory`
- **Limpar histórico:** Dialog de confirmação → DELETE `/api/ads/history/clear`

### 2.5. Validações e Regras de Negócio

#### 2.5.1. Validações de Formulário
- ✅ `mediaUrl` obrigatório
- ✅ `targetCategories.length >= 1`
- ✅ `campaignDays > 0` OU `targetViews > 0` (pelo menos um)
- ✅ `startDate` e `startTime` obrigatórios
- ✅ `endDate` e `endTime` obrigatórios
- ✅ `endDate >= startDate`
- ✅ Se `startDate === endDate`, então `endTime >= startTime`
- ✅ `title` max 200 caracteres (se preenchido)
- ✅ `description` max 500 caracteres (se preenchido)
- ✅ `link` URL válida (se preenchido)
- ✅ `campaignDays` entre 1 e 365
- ✅ `targetViews` entre 0 e 10.000.000

#### 2.5.2. Validações de Saldo
- ✅ Verificar saldo antes de criar: `user.wallet.balance >= estimatedCost`
- ✅ Se insuficiente, abrir modal de adicionar saldo
- ✅ Mesma validação para estender campanha

#### 2.5.3. Validações de Upload
- ✅ Apenas imagens e vídeos
- ✅ Tamanho máximo: Configurado no backend
- ✅ Feedback de progresso durante upload
- ✅ Timeout: 60s

#### 2.5.4. Regras de Status
- **ACTIVE:** Campanha ativa e rodando
- **INACTIVE:** Campanha pausada ou finalizada
- **PENDING:** Aguardando aprovação do admin
- **Cores:**
  - `pendingApproval` → `warning`
  - `ACTIVE` → `success`
  - `INACTIVE` (não expirada) → `info`
  - `INACTIVE` (expirada) → `default`

#### 2.5.5. Regras de Ações
- **Estender:** Apenas para `ACTIVE && !isExpired && !pendingApproval`
- **Reativar:** Apenas para `INACTIVE && !pendingApproval`
- **Deletar:** Sempre disponível

### 2.6. Checklist de Implementação
- [ ] Criar `PromotionsScreen.tsx`
- [ ] Adicionar endpoints em `api.ts`:
  - [ ] `adsApi.listMyAds()`
  - [ ] `adsApi.createAd(payload)`
  - [ ] `adsApi.reactivateAd(adId, payload)`
  - [ ] `adsApi.extendAd(adId, days)`
  - [ ] `adsApi.deleteAd(adId)`
  - [ ] `adsApi.uploadMedia(file)`
  - [ ] `adsApi.getCampaignConfig()`
  - [ ] `adsApi.getHistory()`
  - [ ] `adsApi.clearHistory()`
- [ ] Implementar tabs (Campanhas / Histórico)
- [ ] Implementar filtros (busca, categoria, status, data)
- [ ] Implementar lista de campanhas (cards mobile / tabela desktop)
- [ ] Implementar modal de criar campanha
- [ ] Implementar upload de mídia
- [ ] Implementar seleção de categorias
- [ ] Implementar cálculo dinâmico de custos
- [ ] Implementar validações de formulário
- [ ] Implementar validação de saldo
- [ ] Implementar modal de estender campanha
- [ ] Implementar modal de reativar campanha
- [ ] Implementar modal de deletar campanha
- [ ] Implementar tab de histórico
- [ ] Implementar limpar histórico
- [ ] Adicionar i18n keys necessárias
- [ ] Testar todos os cálculos de custo
- [ ] Testar todas as validações
- [ ] Testar upload de mídia
- [ ] Testar filtros
- [ ] Testar ações (estender, reativar, deletar)

---

## 🔒 3. SEGURANÇA

### 3.1. Visão Geral
Página para gerenciar segurança da conta: alterar senha, configurar 2FA (autenticação de dois fatores) e verificar badge de verificação.

### 3.2. Endpoints da API

#### 3.2.1. Alterar Senha
- **POST** `/api/users/change-password`
- **Body:**
  ```typescript
  {
    currentPassword: string
    newPassword: string
    twoFactorCode?: string // Obrigatório se 2FA ativado
    logoutAllDevices: boolean
  }
  ```
- **Response (se `logoutAllDevices === true`):**
  ```typescript
  {
    success: boolean
    message: string
    newToken?: string // Novo token se deslogou todos os dispositivos
  }
  ```

#### 3.2.2. Setup 2FA
- **POST** `/api/users/2fa/setup`
- **Body:** `{}`
- **Response:**
  ```typescript
  {
    success: boolean
    data: {
      qrCode: string // Data URL da imagem QR Code
      secret: string // Secret para entrada manual
    }
  }
  ```

#### 3.2.3. Verificar e Ativar 2FA
- **POST** `/api/users/2fa/verify`
- **Body:**
  ```typescript
  {
    code: string // 6 dígitos do autenticador
  }
  ```
- **Response:**
  ```typescript
  {
    success: boolean
    message: string
    data: {
      backupCodes: string[] // 8 códigos de backup (mostrar apenas uma vez)
    }
  }
  ```

### 3.3. Componentes e Layout

#### 3.3.1. Header
- **Título:** `security.title` com ícone `ShieldIcon`
- **Descrição:** `security.description`

#### 3.3.2. Seção: Alterar Senha
**Card completo (Grid 12/12):**

- **Header do Card:**
  - Ícone: `LockIcon` (cor: `primary.main`)
  - Título: `security.changePassword.title`
  - Descrição: `security.changePassword.description`

- **Campos:**
  1. **Senha Atual** (Grid 6/12):
     - Tipo: `password` (toggle de visibilidade)
     - Label: `security.changePassword.currentPassword`
     - Obrigatório
  
  2. **Toggle "Deslogar todos os dispositivos"** (Grid 6/12):
     - Ícone: `DevicesIcon`
     - Label: `security.changePassword.logoutAllDevices`
     - Default: `true`
     - **Comportamento:** Se `true`, gera novo token e invalida todos os outros
  
  3. **Nova Senha** (Grid 6/12):
     - Tipo: `password` (toggle de visibilidade)
     - Label: `security.changePassword.newPassword`
     - Helper text: `security.changePassword.minLength`
     - Obrigatório
  
  4. **Confirmar Senha** (Grid 6/12):
     - Tipo: `password` (toggle de visibilidade)
     - Label: `security.changePassword.confirmPassword`
     - Validação em tempo real: Mostrar erro se diferente de `newPassword`
     - Helper text: Erro ou espaço vazio
     - Obrigatório
  
  5. **Código 2FA** (Grid 6/12, condicional):
     - Exibir apenas se `requires2FAForPassword === true`
     - Tipo: `text` (apenas números)
     - Label: `security.changePassword.twoFactorCode`
     - Placeholder: "000000"
     - Max length: 6
     - Helper text: `security.changePassword.twoFactorCodeHelper`
     - **Comportamento:** Aparece após primeira tentativa de alterar senha se 2FA estiver ativado

- **Botão:**
  - Label: `security.changePassword.button`
  - Desabilitado se: `loading || !currentPassword || !newPassword || !confirmPassword`
  - Loading: `CircularProgress` durante requisição

**Validações:**
- ✅ Todos os campos obrigatórios preenchidos
- ✅ `newPassword === confirmPassword`
- ✅ `newPassword.length >= 6 && newPassword.length <= 20`
- ✅ Se 2FA ativado, `twoFactorCode` obrigatório (após primeira tentativa)
- ✅ `currentPassword` correto

**Comportamentos:**
- Se 2FA ativado e não forneceu código, API retorna `requires2FA: true`
- Mostrar campo de código 2FA e mensagem de erro
- Se `logoutAllDevices === true` e sucesso, salvar `newToken` no AsyncStorage
- Limpar todos os campos após sucesso
- Mostrar toast de sucesso/erro

#### 3.3.3. Seção: 2FA (Grid 6/12)
**Card:**

- **Header:**
  - Ícone: `SecurityIcon` (cor: verde se ativado, amarelo se não)
  - Título: `security.twoFactor.title`
  - Chip de status:
    - Se ativado: `security.twoFactor.active` (verde)
    - Se não: `security.twoFactor.inactive` (amarelo)

- **Conteúdo:**
  - Descrição: `security.twoFactor.description`
  - **Se ativado:**
    - Alert de sucesso: `security.twoFactor.enabled`
  - **Se não ativado:**
    - Botão: `security.twoFactor.setupButton`
    - Ação: Abrir modal de setup

#### 3.3.4. Seção: Verificação (Grid 6/12)
**Card:**

- **Header:**
  - Ícone: `VerifiedIcon` (cor: verde se verificado, cinza se não)
  - Título: `security.verification.title`
  - Chip de status:
    - Se verificado: `security.verification.verified` (verde)
    - Se não: `security.verification.notVerified` (cinza)

- **Conteúdo:**
  - Descrição: `security.verification.description`
  - **Se verificado:**
    - Alert de sucesso: `security.verification.verifiedMessage`
  - **Se não verificado:**
    - Botão: `security.verification.verifyButton`
    - Ação: Navegar para `/plans` (ou tela de planos no mobile)

#### 3.3.5. Modal de Setup 2FA

**Etapa 1: Escanear QR Code**

- **Título:** `security.twoFactor.setupDialogTitle` com ícone `SecurityIcon`
- **Conteúdo:**
  - Texto: `security.twoFactor.scanQRCode`
  - **QR Code:**
    - Imagem: `twoFAQRCode` (Data URL)
    - Tamanho: 180x180
    - Rounded corners
  - **Secret Manual:**
    - Alert info com: `security.twoFactor.manualEntry`
    - Secret em fonte monospace: `twoFASecret`
  - **Input de Código:**
    - Label: `security.twoFactor.verificationCode`
    - Placeholder: "000000"
    - Max length: 6
    - Apenas números
    - Text align: center
    - Letter spacing: 0.5em
  - **Botão:**
    - Label: `security.twoFactor.verifyAndActivate`
    - Desabilitado se: `loading || setupCode.length !== 6`
    - Loading durante verificação

**Etapa 2: Códigos de Backup**

- **Após verificação bem-sucedida:**
  - Alert de sucesso: `security.twoFactor.setupSuccess`
  - Alert de aviso: `security.twoFactor.backupCodesTitle`
  - **Grid de códigos:**
    - 2 colunas
    - Background: `grey.100`
    - Fonte: monospace
    - **8 códigos** exibidos
    - **IMPORTANTE:** Mostrar apenas uma vez, usuário deve salvar
  - **Botão:** `security.twoFactor.close`

**Comportamentos:**
- Ao fechar modal, limpar todos os estados
- Se já tem `backupCodes`, não mostrar QR Code novamente
- Após ativar, atualizar `user` via `refreshUser()`
- Mostrar toast de sucesso/erro

### 3.4. Validações e Regras de Negócio

#### 3.4.1. Alterar Senha
- ✅ `currentPassword` obrigatório
- ✅ `newPassword` obrigatório
- ✅ `confirmPassword` obrigatório
- ✅ `newPassword === confirmPassword`
- ✅ `newPassword.length >= 6 && newPassword.length <= 20`
- ✅ Se 2FA ativado, `twoFactorCode` obrigatório (6 dígitos)
- ✅ `currentPassword` deve estar correto
- ✅ Se `logoutAllDevices === true`, salvar novo token

#### 3.4.2. Setup 2FA
- ✅ Verificar código TOTP de 6 dígitos
- ✅ Se código inválido, mostrar erro
- ✅ Após sucesso, mostrar códigos de backup (apenas uma vez)
- ✅ Atualizar estado do usuário

#### 3.4.3. Verificação de Badge
- ✅ Verificar status de `user.verifiedBadge.isVerified`
- ✅ Se não verificado, redirecionar para planos

### 3.5. Checklist de Implementação
- [ ] Criar `SecurityScreen.tsx`
- [ ] Adicionar endpoints em `api.ts`:
  - [ ] `userApi.changePassword(currentPassword, newPassword, twoFactorCode, logoutAllDevices)`
  - [ ] `userApi.setup2FA()`
  - [ ] `userApi.verify2FA(code)`
- [ ] Implementar seção "Alterar Senha"
- [ ] Implementar toggles de visibilidade de senha
- [ ] Implementar toggle "Deslogar todos os dispositivos"
- [ ] Implementar validação em tempo real de confirmação de senha
- [ ] Implementar campo condicional de código 2FA
- [ ] Implementar seção "2FA"
- [ ] Implementar modal de setup 2FA
- [ ] Implementar exibição de QR Code
- [ ] Implementar entrada manual de secret
- [ ] Implementar verificação de código
- [ ] Implementar exibição de códigos de backup
- [ ] Implementar seção "Verificação"
- [ ] Implementar navegação para planos (se não verificado)
- [ ] Adicionar i18n keys necessárias
- [ ] Testar alteração de senha sem 2FA
- [ ] Testar alteração de senha com 2FA
- [ ] Testar setup completo de 2FA
- [ ] Testar validações de senha
- [ ] Testar logout de todos os dispositivos
- [ ] Testar salvamento de novo token

---

## 📝 Notas Importantes

### Sistema de Pontuação por Categoria (Ads no Feed)

**Como funciona:**
1. Quando o usuário curte posts, o sistema registra a categoria do post em `categoryInteractions`
2. Isso cria um ranking de categorias baseado no número de interações (mais curtidas = maior ranking)
3. Quando busca ads no feed (`/api/ads`):
   - **Ads PUBLIC:** Sempre aparecem para todos (peso base: 0.5)
   - **Ads TARGETED:** Só aparecem se o usuário tem interesse na categoria (baseado no ranking)
   - **Cálculo de peso:**
     - 60% baseado em categorias (`categoryProbabilities`)
     - 40% baseado em tags (`tagProbabilities`)
   - Ads são ordenados por peso e os mais relevantes aparecem mais frequentemente
4. **Se usuário nunca curtiu nada:** Só vê ads PUBLIC
5. **Categorias bloqueadas:** Não aparecem em ads TARGETED (mesmo que tenha interações)

**Importante:** Este sistema é usado automaticamente no feed. A página de Preferências (não implementada neste README) permite ao usuário bloquear/desbloquear categorias manualmente, o que afeta quais ads TARGETED ele verá.

### APIs a Criar no Mobile
1. **Analytics:**
   - `postsApi.getAnalytics(page, limit, sortBy)`

2. **Promoções:**
   - `adsApi.listMyAds()`
   - `adsApi.createAd(payload)`
   - `adsApi.reactivateAd(adId, payload)`
   - `adsApi.extendAd(adId, days)`
   - `adsApi.deleteAd(adId)`
   - `adsApi.uploadMedia(file)` (FormData)
   - `adsApi.getCampaignConfig()`
   - `adsApi.getHistory()`
   - `adsApi.clearHistory()`

3. **Segurança:**
   - `userApi.changePassword(currentPassword, newPassword, twoFactorCode, logoutAllDevices)`
   - `userApi.setup2FA()`
   - `userApi.verify2FA(code)`

### Dependências Externas
- **QR Code:** Usar biblioteca para gerar QR Code a partir do secret (ou usar imagem do backend)
- **Image Picker:** `expo-image-picker` (já usado no projeto)
- **Date/Time Pickers:** Componentes nativos do React Native ou biblioteca

### Componentes Reutilizáveis
- `CustomToast` (já existe)
- `Header` (já existe)
- `SettingsScreenTemplate` (já existe, mas pode precisar customização)
- Toggle de visibilidade de senha (criar componente reutilizável)
- Modal de confirmação (criar se não existir)

### i18n Keys Necessárias
Todas as keys mencionadas nos componentes acima devem ser adicionadas ao sistema de i18n do mobile.

---

## ✅ Status de Implementação

- [ ] Analytics Screen
- [ ] Promotions Screen  
- [ ] Security Screen
- [ ] APIs implementadas
- [ ] Validações implementadas
- [ ] i18n keys adicionadas
- [ ] Testes realizados

