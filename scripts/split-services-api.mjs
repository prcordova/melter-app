import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/services')
const src = fs.readFileSync(path.join(dir, 'api.ts'), 'utf8')
const lines = src.split(/\r?\n/)

const ifaceIdx = lines.findIndex((l) => l.includes('// Interface para resposta'))
const firstApiIdx = lines.findIndex((l) => /^export const \w+Api = \{/.test(l))

fs.writeFileSync(path.join(dir, 'http-client.ts'), `${lines.slice(0, ifaceIdx).join('\n')}\n`)

const typeBlock = lines.slice(ifaceIdx, firstApiIdx).join('\n')
fs.writeFileSync(
  path.join(dir, 'types.ts'),
  `${typeBlock}\n\nexport type { ApiResponse, SendFriendRequestApiResponse, LoginResult, AuthResponse }\n`
)

const exports = []
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/^export const (\w+) = \{/)
  if (m && m[1] !== 'api') exports.push({ name: m[1], line: i })
}

const fileMap = {
  authApi: 'auth',
  userApi: 'users',
  postsApi: 'posts',
  messageApi: 'messages',
  storiesApi: 'stories',
  paymentApi: 'payments',
  linksApi: 'links',
  profileApi: 'profile',
  platformFeedInfoApi: 'platform-feed-info',
  adsApi: 'ads',
  walletApi: 'wallet',
  shopsApi: 'shops',
  ordersApi: 'orders',
  shopApi: 'shop',
  sellerVerificationApi: 'seller-verification',
  productsApi: 'products',
  categoriesApi: 'categories',
  subscriptionPlansApi: 'subscription-plans',
  shopAnalyticsApi: 'shop-analytics',
  shopCommunityApi: 'shop-community',
  supportTicketsApi: 'support-tickets',
  referralsApi: 'referrals',
}

const sharedImports = `import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api.config';
import { api } from './http-client';
import type {
  ApiResponse,
  SendFriendRequestApiResponse,
  LoginResult,
  AuthResponse,
} from './types';
`

for (let e = 0; e < exports.length; e++) {
  const { name, line } = exports[e]
  const end = e + 1 < exports.length ? exports[e + 1].line : lines.length
  let chunk = lines.slice(line, end).join('\n')
  const base = fileMap[name] || name.replace(/Api$/, '').toLowerCase()
  const needsAxios = chunk.includes('axios.create') || chunk.includes('axios.post')
  const needsAsync = chunk.includes('AsyncStorage')
  const needsApiConfig = chunk.includes('API_CONFIG')
  const needsAuthPaths = chunk.includes('AUTH_API')
  const needsUsersPaths = chunk.includes('USERS_API')
  const needsMessagesPaths = chunk.includes('MESSAGES_API')
  const needsShopPaths = chunk.includes('SHOP_API')

  let imports = "import { api } from './http-client';\n"
  if (needsAxios) imports = "import axios from 'axios';\n" + imports
  if (needsAsync) imports += "import AsyncStorage from '@react-native-async-storage/async-storage';\n"
  if (needsApiConfig) imports += "import { API_CONFIG } from '../config/api.config';\n"
  if (needsAuthPaths) imports += "import { AUTH_API } from '../config/auth/api-paths';\n"
  if (needsUsersPaths) imports += "import { USERS_API } from '../config/users/api-paths';\n"
  if (needsMessagesPaths) imports += "import { MESSAGES_API } from '../config/messages/api-paths';\n"
  if (needsShopPaths) imports += "import { SHOP_API } from '../config/shops/api-paths';\n"
  imports += "import type { ApiResponse, SendFriendRequestApiResponse, LoginResult, AuthResponse } from './types';\n\n"

  fs.writeFileSync(path.join(dir, `${base}.api.ts`), imports + chunk + '\n')
  console.log(`${base}.api.ts (${end - line} lines)`)
}

const indexExports = [
  "export { api } from './http-client';",
  "export type * from './types';",
  ...exports.map(({ name }) => {
    const base = fileMap[name]
    const exportName = name
    return `export { ${exportName} } from './${base}.api';`
  }),
].join('\n')

fs.writeFileSync(path.join(dir, 'index.ts'), `${indexExports}\n`)

const legacyApi = `/** @deprecated Use imports from @/services/<domain>.api */\nexport * from './index';\n`
fs.writeFileSync(path.join(dir, 'api.ts'), legacyApi)

console.log('done')
