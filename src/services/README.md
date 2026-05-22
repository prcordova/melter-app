# Services (cliente HTTP — app)

Cada segmento = pasta com `api.ts` (+ `types.ts` quando houver tipos do domínio).

```
services/
  http-client.ts
  shared/types.ts       # ApiResponse, LoginResult, …
  messages/
    api.ts
    index.ts
  users/
    api.ts
    index.ts
  support-tickets/
    types.ts
    api.ts
    index.ts
  …
```

## Imports

```ts
import { messageApi } from '../services/messages'
import { userApi } from '../services/users'
import type { SupportTicket } from '../services/support-tickets'

// Legado
import { messageApi } from '../services/api'
```

Paths: `src/config/<domínio>/api-paths.ts`.
