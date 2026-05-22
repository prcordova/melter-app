import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/services')

const fileToFolder = {
  'auth.api.ts': 'auth',
  'users.api.ts': 'users',
  'posts.api.ts': 'posts',
  'messages.api.ts': 'messages',
  'stories.api.ts': 'stories',
  'payments.api.ts': 'payments',
  'links.api.ts': 'links',
  'profile.api.ts': 'profile',
  'platform-feed-info.api.ts': 'platform-feed-info',
  'ads.api.ts': 'ads',
  'wallet.api.ts': 'wallet',
  'shops.api.ts': 'shops',
  'orders.api.ts': 'orders',
  'shop.api.ts': 'shop',
  'seller-verification.api.ts': 'seller-verification',
  'products.api.ts': 'products',
  'categories.api.ts': 'categories',
  'subscription-plans.api.ts': 'subscription-plans',
  'shop-analytics.api.ts': 'shop-analytics',
  'shop-community.api.ts': 'shop-community',
  'support-tickets.api.ts': 'support-tickets',
  'referrals.api.ts': 'referrals',
}

const exportNames = {
  auth: 'authApi',
  users: 'userApi',
  posts: 'postsApi',
  messages: 'messageApi',
  stories: 'storiesApi',
  payments: 'paymentApi',
  links: 'linksApi',
  profile: 'profileApi',
  'platform-feed-info': 'platformFeedInfoApi',
  ads: 'adsApi',
  wallet: 'walletApi',
  shops: 'shopsApi',
  orders: 'ordersApi',
  shop: 'shopApi',
  'seller-verification': 'sellerVerificationApi',
  products: 'productsApi',
  categories: 'categoriesApi',
  'subscription-plans': 'subscriptionPlansApi',
  'shop-analytics': 'shopAnalyticsApi',
  'shop-community': 'shopCommunityApi',
  'support-tickets': 'supportTicketsApi',
  referrals: 'referralsApi',
}

// shared types
fs.mkdirSync(path.join(dir, 'shared'), { recursive: true })
if (fs.existsSync(path.join(dir, 'types.ts'))) {
  fs.renameSync(path.join(dir, 'types.ts'), path.join(dir, 'shared', 'types.ts'))
}

// SupportTicket from shop-community -> support-tickets/types.ts
const shopCommunityPath = path.join(dir, 'shop-community.api.ts')
if (fs.existsSync(shopCommunityPath)) {
  const sc = fs.readFileSync(shopCommunityPath, 'utf8')
  const ticketMatch = sc.match(
    /\/\*\* Ticket[\s\S]*?export interface SupportTicket \{[\s\S]*?\}\n/
  )
  if (ticketMatch) {
    fs.mkdirSync(path.join(dir, 'support-tickets'), { recursive: true })
    fs.writeFileSync(
      path.join(dir, 'support-tickets', 'types.ts'),
      ticketMatch[0].replace(/^\/\*\* Ticket[^\n]*\n/, '') + '\n'
    )
    fs.writeFileSync(
      shopCommunityPath,
      sc.replace(ticketMatch[0], '').replace(/\n\/\/ API de Referrals[\s\S]*$/, '\n')
    )
  }
}

function patchImports(content) {
  return content
    .replace(/from '\.\/http-client'/g, "from '../http-client'")
    .replace(/from '\.\/types'/g, "from '../shared/types'")
    .replace(/from '\.\.\/config\//g, "from '../../config/")
    .replace(/from '\.\.\/constants\//g, "from '../../constants/")
    .replace(/from '\.\.\/types\//g, "from '../../types/")
}

for (const [file, folder] of Object.entries(fileToFolder)) {
  const src = path.join(dir, file)
  if (!fs.existsSync(src)) continue

  const folderDir = path.join(dir, folder)
  fs.mkdirSync(folderDir, { recursive: true })

  let content = patchImports(fs.readFileSync(src, 'utf8'))

  if (folder === 'support-tickets' && content.includes('SupportTicket')) {
    content =
      "import type { SupportTicket } from './types';\n" +
      content.replace(
        /import type \{ ApiResponse, SendFriendRequestApiResponse, LoginResult, AuthResponse \} from '\.\.\/shared\/types';/,
        "import type { ApiResponse } from '../shared/types';"
      )
  }

  fs.writeFileSync(path.join(folderDir, 'api.ts'), content)

  const exp = exportNames[folder]
  const indexLines = [`export { ${exp} } from './api'`]
  if (folder === 'support-tickets') {
    indexLines.push("export type { SupportTicket } from './types'")
  }
  fs.writeFileSync(path.join(folderDir, 'index.ts'), indexLines.join('\n') + '\n')

  fs.unlinkSync(src)
  console.log('ok', folder)
}

const indexExports = [
  "export { api } from './http-client';",
  "export type * from './shared/types';",
  ...Object.values(fileToFolder).map((folder) => {
    const exp = exportNames[folder]
    const extra =
      folder === 'support-tickets'
        ? "\nexport type { SupportTicket } from './support-tickets'"
        : ''
    return `export { ${exp} } from './${folder}';${extra}`
  }),
]

fs.writeFileSync(path.join(dir, 'index.ts'), indexExports.join('\n') + '\n')
fs.writeFileSync(
  path.join(dir, 'api.ts'),
  `/** @deprecated Prefira @/services/<domínio> */\nexport * from './index';\n`
)

console.log('app done')
