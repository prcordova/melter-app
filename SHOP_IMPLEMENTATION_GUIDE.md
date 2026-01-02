# 📋 Guia Completo de Implementação - Sistema de Loja (Minha Loja)

## 📌 Visão Geral

Este documento mapeia **TODAS** as funcionalidades, condições, permissões e sistemas da página de loja (`/user/[username]/shop`) para implementação no app mobile. A loja possui dois modos principais:

1. **Modo Dono** (`user.username === shopOwner.username`): Acesso completo com todas as funcionalidades de gerenciamento
2. **Modo Visitante**: Visualização e compra de produtos

---

## 🎯 Índice de Funcionalidades

1. [Sistema de Verificação de Vendedor](#1-sistema-de-verificação-de-vendedor)
2. [Sistema de Visibilidade da Loja](#2-sistema-de-visibilidade-da-loja)
3. [Sistema de Tabs (Produtos, Analytics, Comunidade, Planos)](#3-sistema-de-tabs)
4. [Sistema de Produtos](#4-sistema-de-produtos)
5. [Sistema de Planos de Assinatura](#5-sistema-de-planos-de-assinatura)
6. [Sistema de Analytics](#6-sistema-de-analytics)
7. [Sistema de Comunidade](#7-sistema-de-comunidade)
8. [Sistema de Compra](#8-sistema-de-compra)
9. [Sistema de Vídeo e Visualização](#9-sistema-de-vídeo-e-visualização)
10. [Sistema de Configurações](#10-sistema-de-configurações)

---

## 1. Sistema de Verificação de Vendedor

### 1.1 Estados de Verificação

A loja só pode ser ativada se o vendedor estiver **aprovado**. Estados possíveis:

- **`null`**: Sem verificação (mostrar "Criar Loja")
- **`pending`**: Aguardando aprovação
- **`approved`**: ✅ Aprovado (pode ativar loja)
- **`rejected`**: Rejeitado (pode reenviar)
- **`disabled`**: Loja desabilitada (pode solicitar reativação)
- **`needs_review`**: Revisão necessária
- **`appeal`**: Reivindicação em análise

### 1.2 Condições de Exibição

```typescript
// Mostrar área de status apenas se:
- user.username === shopOwner.username
- (!sellerVerification || sellerVerification.status !== 'approved')
```

### 1.3 Funcionalidades por Estado

#### Estado: `null` (Sem Verificação)
- **Exibir**: Card com título "Criar sua Loja"
- **Ação**: Botão "Criar Loja" → Abrir `SellerVerificationForm`
- **API**: `GET /api/users/seller-verification` (verificar se existe)
- **API**: `POST /api/users/seller-verification` (criar)

#### Estado: `pending`
- **Exibir**: Alert info "Aguardando Aprovação"
- **Mostrar**: Data de envio (`submittedAt`)
- **Ação**: Nenhuma (apenas aguardar)

#### Estado: `rejected`
- **Exibir**: Alert error "Cadastro Rejeitado"
- **Mostrar**: `rejectionReason` (motivo da rejeição)
- **Ação**: Botão "Reenviar Cadastro" → Abrir `SellerVerificationForm` com dados existentes

#### Estado: `disabled`
- **Exibir**: Alert error "Loja Desabilitada"
- **Mostrar**: `needsReviewReason` ou `rejectionReason`
- **Verificar**: `appealBlockedUntil` (bloqueio de reivindicação)
- **Ação**: 
  - Se **não bloqueado**: Botão "Solicitar Reativação" → Abrir modal de appeal
  - Se **bloqueado**: Mostrar data de expiração do bloqueio

#### Estado: `appeal`
- **Exibir**: Alert warning "Reivindicação em Análise"
- **Mostrar**: `appealReason` (justificativa enviada), `appealSubmittedAt`
- **Ação**: Nenhuma (apenas aguardar)

#### Estado: `needs_review`
- **Exibir**: Alert warning "Revisão Necessária"
- **Mostrar**: `needsReviewReason` (observações do admin)
- **Ação**: Botão "Abrir para Revisão" → Abrir `SellerVerificationForm`

### 1.4 Modal de Reivindicação (Appeal)

**Condição**: `sellerVerification.status === 'disabled'` e não bloqueado

**Campos**:
- `appealReason` (TextArea, obrigatório, multiline, 8 rows)
- `termsAccepted` (Checkbox, obrigatório)

**Validações**:
- `appealReason.trim()` não pode estar vazio
- `termsAccepted` deve ser `true`

**API**: `POST /api/users/seller-verification/appeal`
```json
{
  "appealReason": "string"
}
```

---

## 2. Sistema de Visibilidade da Loja

### 2.1 Tipos de Visibilidade

```typescript
type ShopVisibility = 'public' | 'preview' | 'friends' | 'followers'
```

### 2.2 Verificações de Acesso (Visitante)

**Antes de carregar produtos**, verificar:

1. **Loja Habilitada?**
   ```typescript
   if (!owner.shop?.isEnabled && !isOwner && !isAdmin) {
     // Redirecionar: "Esta loja não está disponível no momento"
   }
   ```

2. **Visibilidade = 'preview'?**
   ```typescript
   if (shopVisibility === 'preview' && !isOwner && !isAdmin) {
     // Redirecionar: "Esta loja está em modo preview"
   }
   ```

3. **Visibilidade = 'followers'?**
   ```typescript
   // Verificar se user.id está em owner.followers
   GET /api/users/{username}/followers
   // Se não seguir → Redirecionar: "Esta loja é restrita apenas para seguidores"
   ```

4. **Visibilidade = 'friends'?**
   ```typescript
   // Verificar se são amigos
   GET /api/friends/list
   // Se não for amigo → Redirecionar: "Esta loja é restrita apenas para amigos"
   ```

### 2.3 Modo Preview

**Query Param**: `?preview=true`

**Exibir Banner** (apenas para dono):
- Título: "👁️ Modo Preview"
- Mensagem: "Esta é uma prévia da sua loja"
- Se loja desabilitada: "Sua loja está DESATIVADA - apenas você pode ver"
- Botões:
  - "Atualizar" (recarregar página)
  - "Configurar Loja" (abrir `/profile/config`)

---

## 3. Sistema de Tabs

### 3.1 Condição de Exibição

**Tabs aparecem apenas se**:
```typescript
(user?.username === resolvedParams.username && sellerVerification?.status === 'approved') || 
(user?.accountType === 'admin')
```

### 3.2 Tabs Disponíveis

1. **Produtos** (`products`)
   - Sempre visível (para dono aprovado ou admin)

2. **Analytics** (`analytics`)
   - Requer: Plano PRO (`hasShopAnalytics`)
   - Badge "PRO" se não tiver acesso
   - Ao clicar sem acesso → Redirecionar para `/plans`

3. **Comunidade** (`community`)
   - Sempre visível (para dono aprovado ou admin)

4. **Planos** (`plans`)
   - Visível apenas se: `user.username === resolvedParams.username && sellerVerification.status === 'approved'`
   - Gerenciamento de planos de assinatura

### 3.3 Query Params para Abrir Tabs

- `?tab=analytics` → Abrir tab Analytics
- `?tab=plans` → Abrir tab Planos
- `?openProduct={productId}` → Abrir modal de compra do produto
- `?openPlan={planId}` → Abrir modal de assinatura do plano

---

## 4. Sistema de Produtos

### 4.1 Limites por Plano

```typescript
const getProductLimits = () => {
  const planType = user?.plan?.type || 'FREE'
  const currentProducts = totalActiveProducts + pendingProducts // Inclui pendentes!
  
  switch (planType) {
    case 'FREE': return { max: 1, current: currentProducts }
    case 'STARTER': return { max: 3, current: currentProducts }
    case 'PRO': return { max: 20, current: currentProducts }
    default: return { max: 1, current: currentProducts }
  }
}
```

**Importante**: Produtos pendentes (`PENDING`) **contam** no limite!

### 4.2 Verificação de Criação

```typescript
const canCreateProduct = () => {
  const limits = getProductLimits()
  return limits.current < limits.max
}
```

### 4.3 Estados de Produto

```typescript
type ProductStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REQUIRES_CHANGES' | 'INACTIVE'
```

**Exibição para Dono**:
- Mostrar: `APPROVED`, `PENDING`, `REQUIRES_CHANGES`
- **Não mostrar**: `INACTIVE` (soft deleted), `REJECTED` (pode mostrar com chip de erro)

**Exibição para Visitante**:
- Mostrar apenas: `APPROVED`

### 4.4 Filtros de Produtos

#### Para Dono:
```typescript
filteredProducts = products.filter(p => 
  p.status === 'APPROVED' || 
  p.status === 'PENDING' || 
  p.status === 'REQUIRES_CHANGES'
)
```

#### Para Visitante:
```typescript
filteredProducts = products.filter(p => p.status === 'APPROVED')
```

### 4.5 Funcionalidades de Produto

#### 4.5.1 Criar Produto

**Condições**:
- `sellerVerification.status === 'approved'`
- `canCreateProduct() === true`
- Se não pode criar → Mostrar `PlanLocker` com `getRequiredPlan()`

**Modal**: `ProductFormDialog`
- Wizard de criação
- Upload de imagem de capa
- Upload de arquivos (imagens, vídeos, documentos)
- Seleção de categoria
- Configuração de preço
- Modo de pagamento: `UNICO` ou `ASSINATURA`
- Validações de conteúdo (+18, termos, etc.)

**API**: `POST /api/products`

#### 4.5.2 Editar Produto

**Modal**: `ProductEditModal` (edição simples) ou `ProductFormDialog` (edição completa)

**Ações disponíveis**:
- Editar título, descrição, preço
- Alterar imagem de capa
- Gerenciar arquivos
- Alterar categoria
- Alterar status (ativar/desativar)

**API**: `PUT /api/products/{productId}`

#### 4.5.3 Deletar Produto

**Ação**: Soft delete (marcar como `INACTIVE`)

**Modal de Confirmação**:
- Título: "Confirmar Remoção do Produto"
- Mensagem: "Tem certeza que deseja remover este produto da sua loja?"
- Alert com consequências:
  - Produto removido da visualização pública
  - Não ficará mais disponível para compra
  - Admin ainda pode gerenciar

**API**: `PATCH /api/products/{productId}`
```json
{
  "status": "INACTIVE"
}
```

### 4.6 Status de Compra do Produto

**Para cada produto**, verificar status de compra (se usuário logado):

**API**: `GET /api/products/{productId}/purchase-status`

**Resposta**:
```typescript
{
  hasPurchased: boolean
  canPurchase: boolean
  isActive?: boolean
  expiresAt?: string
  orderId?: string
  accessVia?: 'DIRECT_PURCHASE' | 'SUBSCRIPTION_PLAN'
  subscriptionPlanId?: string
}
```

**Lógica de Acesso**:
```typescript
const canAccess = isOwner || isAdmin || hasPurchased || hasAccessViaPlan
```

### 4.7 Ações por Tipo de Usuário

#### Dono (`isOwner === true`):
- **Botão Principal**: "Editar" → Abrir modal de edição
- **Ação do Card**: Navegar para `/product/{productId}` (ver detalhes completos)
- **Chip de Status**: Mostrar status do produto (PENDING, APPROVED, etc.)

#### Visitante com Compra (`hasPurchased === true`):
- **Botão Principal**: "Entrar" → Navegar para `/product/{productId}`
- **Chip**: "Ativo" ou "Comprado"

#### Visitante sem Compra:
- **Botão Principal**: 
  - Se `paymentMode === 'ASSINATURA'`: "Assinar" → Abrir modal de assinatura
  - Se `paymentMode === 'UNICO'`: "Comprar" → Abrir `ProductCheckoutDialog`

### 4.8 Filtros e Ordenação

**Filtros**:
- **Categoria**: Tabs horizontais com contagem `{categoryName} ({productsCount})`
- **Busca**: Campo de texto (busca por título)
- **Ordenação**: "Mais recentes" ou "Mais antigos"

**API de Categorias**: `GET /api/categories?username={username}`

---

## 5. Sistema de Planos de Assinatura

### 5.1 Limites por Plano

```typescript
const maxSubscriptionPlans = getFeatureLimit(planType, 'maxSubscriptionPlans')
// FREE: 1
// STARTER: 1
// PRO: 3
// PRO_PLUS: 10
```

### 5.2 Funcionalidades

#### 5.2.1 Criar Plano

**Condições**:
- `sellerVerification.status === 'approved'`
- `plans.length < maxSubscriptionPlans`
- Se limite atingido → Mostrar `PlanLocker`

**Campos do Plano**:
- `name`: Nome do plano
- `description`: Descrição (opcional)
- `price`: Preço mensal
- `intervalDays`: Intervalo em dias (30, 60, 90, etc.)
- `isActive`: Ativo/Inativo
- `order`: Ordem de exibição
- `discounts`: Descontos por duração
  - `oneMonth`, `twoMonths`, `threeMonths`, `sixMonths`, `oneYear`
- `visibleDurations`: Quais durações mostrar
  - `oneMonth`, `twoMonths`, `threeMonths`, `sixMonths`, `oneYear`

**API**: `POST /api/subscription-plans`

#### 5.2.2 Editar Plano

**API**: `PUT /api/subscription-plans/{planId}`

#### 5.2.3 Deletar Plano

**Verificações antes de deletar**:
- Verificar produtos vinculados: `GET /api/subscription-plans/{planId}/products`
- Verificar assinaturas ativas: Contar `activeSubscriptions`
- Se houver produtos vinculados ou assinaturas ativas → Mostrar aviso

**API**: `DELETE /api/subscription-plans/{planId}`

#### 5.2.4 Vincular Produtos ao Plano

**API**: `GET /api/subscription-plans/{planId}/products` (listar produtos vinculados)

**Ao criar/editar produto**:
- Se `paymentMode === 'ASSINATURA'` → Selecionar `subscriptionPlanId`

### 5.3 Visualização para Visitantes

**Componente**: `ShopSubscriptionPlans`

**Funcionalidades**:
- Listar planos ativos da loja
- Mostrar preços com descontos
- Selecionar duração (1 mês, 3 meses, etc.)
- Comprar assinatura

**API**: `GET /api/subscription-plans/shop/{username}`

**API de Compra**: `POST /api/subscription-plans/{planId}/purchase`
```json
{
  "duration": "oneMonth" | "twoMonths" | "threeMonths" | "sixMonths" | "oneYear"
}
```

---

## 6. Sistema de Analytics

### 6.1 Condições de Acesso

**Requer**: Plano PRO (`hasShopAnalytics === true`) ou `accountType === 'admin'`

**Componente**: `ShopAnalyticsContent`

### 6.2 Dados Exibidos

**API**: `GET /api/shop/analytics?startDate={date}&endDate={date}&productId={id}`

**Resposta**:
```typescript
{
  summary: {
    totalSales: number
    totalRevenue: number
    totalFees: number
    netProfit: number
    currentFeePercentage: number
    activeSubscribers: number
    subscriptionPlansSold?: number
    shopVisits: number
    productsCreated: number
    productsDeleted: number
    checkoutClicksWithoutPurchase: number
    totalCheckoutClicks: number
    totalBilling: number
    shopCreatedAt: string | Date
  }
  last30Days: {
    salesCount: number
    totalRevenue: number
    totalFees: number
  }
  salesByProduct: Array<{
    productTitle: string
    salesCount: number
    totalRevenue: number
    totalFees: number
  }>
  productViewsByProduct: Array<{
    productId: string
    productTitle: string
    viewsCount: number
    uniqueViewersCount: number
  }>
  productsList: Array<{
    productId: string
    productTitle: string
    status: string
    createdAt: string | Date
    updatedAt: string | Date
    deletedAt: string | Date | null
    price: number
    salesCount: number
    revenue: number
    fees: number
    netProfit: number
    viewsCount: number
    uniqueViewersCount: number
    checkoutClicks: number
    checkoutClicksWithoutPurchase: number
  }>
  recentSales: Array<{
    id: string
    date: string
    productTitle: string
    grossAmount: number
    platformFee: number
    netAmount: number
    buyerUsername: string
  }>
  monthlyGrowth: Array<{
    month: string
    sales: number
    productSales: number
    subscriptionSales: number
    revenue: number
    productRevenue: number
    subscriptionRevenue: number
    fees: number
    topSeller: {
      title: string
      sales: number
      type: 'PRODUCT' | 'PLAN'
    } | null
  }>
  feeStructure: {
    platformFeePercentage: number
    description: string
  }
}
```

### 6.3 Filtros

- **Mês**: Dropdown com últimos 12 meses
- **Produto**: Dropdown "Todos" ou produtos específicos
- **Range de Datas**: Date picker (padrão: mês atual)

### 6.4 Gráficos

- **Vendas por Mês**: Line chart
- **Receita por Mês**: Line chart
- **Vendas por Produto**: Bar chart
- **Crescimento Mensal**: Line chart com múltiplas séries

---

## 7. Sistema de Comunidade

### 7.1 Condições de Acesso

**Requer**: `user.username === resolvedParams.username` (apenas dono)

**Componente**: `ShopCommunityContent`

### 7.2 Funcionalidades

#### 7.2.1 Moderação de Comentários

**API**: `GET /api/shop/comments/moderation`

**Resposta**:
```typescript
{
  comments: Array<{
    _id: string
    content: string
    status: 'PENDING' | 'APPROVED' | 'REJECTED'
    videoTimestamp?: number
    fileId: string
    fileName: string
    productTitle: string
    productId: string
    userId: {
      _id: string
      username: string
      avatar?: string
    }
    createdAt: string
  }>
}
```

**Ações**:
- **Aprovar**: `POST /api/shop/comments/{commentId}/approve`
- **Rejeitar**: `POST /api/shop/comments/{commentId}/reject`
- **Ver Detalhes**: Modal com comentário, produto, arquivo, timestamp

**Tabs**:
- **Pendentes**: `status === 'PENDING'`
- **Aprovados**: `status === 'APPROVED'`
- **Rejeitados**: `status === 'REJECTED'`

#### 7.2.2 Likes por Produto

**API**: `GET /api/shop/products/likes`

**Resposta**:
```typescript
{
  likesByProduct: Array<{
    fileId: string
    fileName: string
    productTitle: string
    productId: string
    totalLikes: number
    users: Array<{
      _id: string
      username: string
      avatar?: string
    }>
  }>
}
```

**Exibição**: Lista de produtos com contagem de likes e lista de usuários que curtiram

### 7.3 Estatísticas

- **Comentários Pendentes**: Contagem de `status === 'PENDING'`
- **Comentários Aprovados**: Contagem de `status === 'APPROVED'`
- **Total de Likes**: Soma de todos os likes

---

## 8. Sistema de Compra

### 8.1 Modal de Checkout

**Componente**: `ProductCheckoutDialog`

**Condições**:
- Produto deve estar `APPROVED`
- Usuário deve estar logado
- Verificar saldo: `user.wallet.balance >= productPrice`

**Dados Exibidos**:
- Imagem do produto
- Título e descrição
- Preço (ou preço do plano se for assinatura)
- Saldo atual do usuário
- Saldo após compra
- Taxa da plataforma (se aplicável)

**API de Compra**: `POST /api/orders/checkout`
```json
{
  "productId": "string",
  "quantity": 1
}
```

**Após Compra**:
- Atualizar saldo do usuário
- Recarregar lista de produtos
- Fechar modal
- Mostrar toast de sucesso

### 8.2 Compra de Assinatura

**Modal**: Componente específico para planos de assinatura

**Seleção de Duração**:
- 1 mês, 2 meses, 3 meses, 6 meses, 1 ano
- Mostrar preços com descontos (se aplicável)

**API**: `POST /api/subscription-plans/{planId}/purchase`
```json
{
  "duration": "oneMonth" | "twoMonths" | "threeMonths" | "sixMonths" | "oneYear"
}
```

---

## 9. Sistema de Vídeo e Visualização

### 9.1 Estrutura de Arquivos do Produto

```typescript
digital: {
  files: Array<{
    url: string
    fileName: string
    customFileName?: string | null
    description?: string | null
    fileSize: number
    fileType: 'image' | 'video' | 'document'
    thumbnail?: string | null
    duration?: number | null // Para vídeos
    order: number
    allowComments?: boolean
  }>
  allowDownload: boolean
  maxFileSize: number
}
```

### 9.2 Visualização de Produto

**Rota**: `/product/{productId}`

**Condições de Acesso**:
- `isOwner === true` → Sempre pode ver
- `hasPurchased === true` → Pode ver
- `hasAccessViaPlan === true` → Pode ver (acesso via plano de assinatura)
- Caso contrário → Mostrar preview limitado e botão de compra

**Funcionalidades**:
- Player de vídeo (para arquivos `fileType === 'video'`)
- Visualizador de imagens (para arquivos `fileType === 'image'`)
- Download de documentos (se `allowDownload === true`)
- Comentários em arquivos (se `allowComments === true`)
- Likes em arquivos
- Navegação entre arquivos (próximo/anterior)
- Progresso de visualização (salvar onde parou)

### 9.3 Upload de Arquivos

**No `ProductFormDialog`**:
- Upload múltiplo de arquivos
- Tipos suportados: imagem, vídeo, documento (PDF, DOC, etc.)
- Validação de tamanho: `maxFileSizePerFile` e `maxTotalFileSize` (por plano)
- Geração de thumbnail para vídeos
- Ordenação de arquivos (drag & drop)
- Descrição por arquivo
- Nome customizado por arquivo

**API**: `POST /api/products/{productId}/files` (upload)
**API**: `DELETE /api/products/{productId}/files/{fileId}` (deletar)

---

## 10. Sistema de Configurações

### 10.1 Modal de Configurações

**Acesso**: Botão de engrenagem (ícone) no header (apenas para dono)

### 10.2 Configurações Disponíveis

#### 10.2.1 Visibilidade da Loja

**Opções**:
- `public`: Qualquer pessoa pode ver
- `followers`: Apenas seguidores
- `friends`: Apenas amigos
- `preview`: Apenas você (modo teste)

**API**: `PUT /api/users/shop/settings`
```json
{
  "isEnabled": boolean,
  "visibility": "public" | "followers" | "friends" | "preview",
  "saleNotifications": boolean
}
```

**Validação ao Ativar**:
- Se `isEnabled === true` e loja estava desabilitada → Verificar `sellerVerification.status === 'approved'`
- Se não aprovado → Mostrar erro e abrir formulário de verificação

#### 10.2.2 Notificações de Vendas

**Toggle**: `saleNotifications` (boolean)
- Receber notificações quando alguém comprar produtos

#### 10.2.3 Gerenciar Planos de Assinatura

**Botão**: "Gerenciar Planos de Assinatura"
- Fecha modal de configurações
- Abre tab "Planos"

#### 10.2.4 Excluir Loja

**Zona de Perigo**:
- Botão "Excluir Loja" (vermelho)
- Modal de confirmação com avisos:
  - Todos os produtos serão desativados
  - Loja removida da visualização pública
  - Precisa solicitar abertura novamente
  - Dados de vendedor mantidos, mas precisa novo cadastro

**API**: `DELETE /api/users/shop/settings`

---

## 11. APIs Necessárias

### 11.1 Verificação de Vendedor
- `GET /api/users/seller-verification` - Buscar status
- `POST /api/users/seller-verification` - Criar/atualizar
- `POST /api/users/seller-verification/appeal` - Solicitar reativação

### 11.2 Configurações da Loja
- `GET /api/users/shop/settings` - Buscar configurações
- `PUT /api/users/shop/settings` - Atualizar configurações
- `DELETE /api/users/shop/settings` - Excluir loja

### 11.3 Produtos
- `GET /api/products?isActive=true` - Listar produtos (dono)
- `GET /api/products?username={username}&isActive=true` - Listar produtos públicos
- `GET /api/products/{productId}` - Detalhes do produto
- `POST /api/products` - Criar produto
- `PUT /api/products/{productId}` - Atualizar produto
- `PATCH /api/products/{productId}` - Atualizar status
- `GET /api/products/{productId}/purchase-status` - Status de compra
- `POST /api/products/{productId}/files` - Upload de arquivo
- `DELETE /api/products/{productId}/files/{fileId}` - Deletar arquivo

### 11.4 Categorias
- `GET /api/categories?username={username}` - Listar categorias

### 11.5 Planos de Assinatura
- `GET /api/subscription-plans` - Listar planos do vendedor
- `GET /api/subscription-plans/shop/{username}` - Listar planos públicos
- `POST /api/subscription-plans` - Criar plano
- `PUT /api/subscription-plans/{planId}` - Atualizar plano
- `DELETE /api/subscription-plans/{planId}` - Deletar plano
- `GET /api/subscription-plans/{planId}/products` - Produtos vinculados
- `POST /api/subscription-plans/{planId}/purchase` - Comprar assinatura

### 11.6 Compras
- `POST /api/orders/checkout` - Checkout de produto único

### 11.7 Analytics
- `GET /api/shop/analytics?startDate={date}&endDate={date}&productId={id}` - Dados de analytics

### 11.8 Comunidade
- `GET /api/shop/comments/moderation` - Comentários para moderação
- `POST /api/shop/comments/{commentId}/approve` - Aprovar comentário
- `POST /api/shop/comments/{commentId}/reject` - Rejeitar comentário
- `GET /api/shop/products/likes` - Likes por produto

### 11.9 Usuários e Seguidores
- `GET /api/users/{username}` - Dados do usuário
- `GET /api/users/{username}/followers` - Lista de seguidores
- `GET /api/friends/list` - Lista de amigos

---

## 12. Fluxos Principais

### 12.1 Fluxo: Criar Loja (Primeira Vez)

1. Usuário acessa `/user/{username}/shop`
2. Sistema verifica: `sellerVerification === null`
3. Mostra card "Criar sua Loja"
4. Usuário clica "Criar Loja"
5. Abre `SellerVerificationForm`
6. Usuário preenche e envia
7. Status muda para `pending`
8. Mostra "Aguardando Aprovação"
9. Após aprovação → Status `approved` → Pode ativar loja

### 12.2 Fluxo: Criar Produto

1. Verificar: `sellerVerification.status === 'approved'`
2. Verificar: `canCreateProduct() === true`
3. Se não pode → Mostrar `PlanLocker`
4. Abrir `ProductFormDialog`
5. Preencher dados (título, descrição, preço, categoria)
6. Upload de imagem de capa
7. Upload de arquivos (opcional)
8. Selecionar modo de pagamento (`UNICO` ou `ASSINATURA`)
9. Se `ASSINATURA` → Selecionar plano
10. Enviar → Status `PENDING`
11. Aguardar aprovação

### 12.3 Fluxo: Compra de Produto (Visitante)

1. Visitante acessa loja
2. Verifica visibilidade (public/followers/friends)
3. Lista produtos `APPROVED`
4. Clica em produto
5. Verifica `purchaseStatus.hasPurchased`
6. Se não comprou → Abre `ProductCheckoutDialog`
7. Verifica saldo: `user.wallet.balance >= product.price`
8. Confirma compra
9. API: `POST /api/orders/checkout`
10. Atualiza saldo
11. Produto fica acessível

### 12.4 Fluxo: Compra de Assinatura

1. Visitante acessa loja
2. Vê seção de planos de assinatura
3. Seleciona plano
4. Seleciona duração (1 mês, 3 meses, etc.)
5. Vê preço com desconto (se aplicável)
6. Confirma compra
7. API: `POST /api/subscription-plans/{planId}/purchase`
8. Acesso a todos os produtos do plano

---

## 13. Checklist de Implementação

### Fase 1: Estrutura Base
- [ ] Criar tela `MyShopScreen.tsx`
- [ ] Implementar verificação de acesso (visibilidade)
- [ ] Implementar sistema de tabs
- [ ] Implementar header com botão de configurações

### Fase 2: Sistema de Verificação
- [ ] Card de status de verificação
- [ ] Formulário de verificação de vendedor
- [ ] Modal de reivindicação (appeal)
- [ ] Tratamento de todos os estados

### Fase 3: Sistema de Produtos
- [ ] Listagem de produtos (com filtros)
- [ ] Modal de criação de produto
- [ ] Modal de edição de produto
- [ ] Upload de imagem de capa
- [ ] Upload de arquivos
- [ ] Sistema de status (chips, tooltips)
- [ ] Modal de confirmação de exclusão

### Fase 4: Sistema de Planos
- [ ] Listagem de planos
- [ ] Modal de criação/edição de plano
- [ ] Sistema de descontos
- [ ] Visualização para visitantes
- [ ] Compra de assinatura

### Fase 5: Sistema de Compra
- [ ] Modal de checkout
- [ ] Verificação de saldo
- [ ] Processamento de compra
- [ ] Atualização de status de acesso

### Fase 6: Analytics
- [ ] Verificação de acesso (PRO)
- [ ] Dashboard de analytics
- [ ] Gráficos
- [ ] Filtros de data/produto

### Fase 7: Comunidade
- [ ] Moderação de comentários
- [ ] Likes por produto
- [ ] Estatísticas

### Fase 8: Configurações
- [ ] Modal de configurações
- [ ] Alteração de visibilidade
- [ ] Toggle de notificações
- [ ] Exclusão de loja

### Fase 9: Vídeo e Visualização
- [ ] Player de vídeo
- [ ] Visualizador de imagens
- [ ] Sistema de comentários em arquivos
- [ ] Sistema de likes em arquivos
- [ ] Progresso de visualização

### Fase 10: Polimento
- [ ] Loading states
- [ ] Error handling
- [ ] Empty states
- [ ] Validações
- [ ] Feedback visual (toasts)
- [ ] Responsividade mobile

---

## 14. Observações Importantes

1. **Produtos Pendentes**: Sempre incluir no limite de produtos
2. **Visibilidade**: Verificar antes de carregar qualquer dado
3. **Status de Compra**: Verificar para cada produto se usuário logado
4. **Planos**: Limites diferentes por plano (FREE: 1, STARTER: 1, PRO: 3, PRO_PLUS: 10)
5. **Analytics**: Apenas PRO ou admin
6. **Soft Delete**: Produtos deletados ficam `INACTIVE`, não são removidos do banco
7. **Query Params**: Suportar `?preview=true`, `?tab=analytics`, `?openProduct={id}`, `?openPlan={id}`
8. **Modo Preview**: Apenas dono vê, com banner informativo
9. **Seller Verification**: Obrigatório para ativar loja
10. **Taxas**: Mostrar taxas da plataforma nas compras

---

## 15. Próximos Passos

1. Revisar este documento
2. Priorizar fases de implementação
3. Criar componentes base
4. Implementar APIs no `api.ts`
5. Testar cada funcionalidade isoladamente
6. Integrar com sistema de navegação
7. Testes de integração
8. Polimento e otimizações

---

**Última atualização**: Baseado na análise completa de `/user/[username]/shop/page.tsx` e componentes relacionados.

