# Upgrade Expo SDK 54 → 58

Branch: `chore/expo-sdk-58`. Fontes: changelogs oficiais [SDK 55](https://expo.dev/changelog/sdk-55), [56](https://expo.dev/changelog/sdk-56), [57](https://expo.dev/changelog/sdk-57), [58](https://expo.dev/changelog/sdk-58).

## Versões

| | Antes (SDK 54) | Depois (SDK 58) |
|---|---|---|
| expo | 54.0.34 | 58.0.x |
| react-native | 0.81.5 | 0.88.1 |
| react | 19.1.0 | 19.3.0 |
| typescript | 5.9 | 6.0.3 |
| react-native-gesture-handler | 2.28 | 3.3 |
| react-native-reanimated / worklets | 4.1 / 0.5 | 4.7 / 0.13 |
| react-native-screens | 4.16 | 4.30 |
| expo-* | 14–18.x, notifications 0.32 | todos `~58.x` (mesmo major do SDK desde o 55) |
| app | 1.0.18 (versionCode 18) | 1.0.19 (versionCode 19) |

## Mapeamento de mudanças × impacto no app

| SDK | Mudança | Impacto no Melter | Status |
|---|---|---|---|
| 55 | Fim da Legacy Architecture (só New Architecture) | App já não desligava a New Arch; libs nativas atualizadas pelo `expo install --fix` | ✅ |
| 55 | `expo-av` removido do Expo Go e sem patches | 8 telas com vídeo (anúncio, stories, loja, verificação de vendedor) | ✅ migrado para `expo-video` via `src/components/AppVideo.tsx` |
| 55 | Push no Expo Go Android passa a lançar erro | `usePushNotifications` registrava token e criava canais sempre (canal → `NullPointerException`) | ✅ token e canais ignorados no Expo Go Android |
| 55 | Edge-to-edge obrigatório; props `backgroundColor`/`translucent` do StatusBar sem efeito | App só usa `style` | ✅ nada a fazer |
| 55 | Campo `splash` saiu do `app.json` | Splash configurado na raiz | ✅ movido para o plugin `expo-splash-screen` |
| 56 | `expo` não depende mais de `@expo/vector-icons` | Já era dependência direta | ✅ (deprecado: migrar para `@react-native-vector-icons/*` futuramente) |
| 56 | `expo/fetch` vira o `fetch` global | App usa axios (XHR) | ✅ sem impacto esperado — testar uploads |
| 56 | TypeScript 6 (`baseUrl` deprecado) | `tsconfig.json` usava `baseUrl` | ✅ `paths` relativo ao tsconfig |
| 56 | `expo-file-system` fora das deps do `expo` | Import morto no `ChatScreen` | ✅ import removido |
| 57 | Correção da regressão de memória do Hermes V1 com reanimated/worklets | Usamos reanimated | ✅ incluído no 58 |
| 58 | RN Strict TypeScript API (refs como `ViewInstance`, `StyleSheet.absoluteFillObject` removido) | 10 arquivos com `absoluteFillObject`, refs em `SelectRow`/`ProfileScreen`, `NamedStyles` no ThemeContext | ✅ corrigido |
| 58 | Removidos `InteractionManager`, `Touchable`, `Modal.animated`, props antigas do StatusBar | Varredura no app e nas libs JS: sem uso | ✅ |
| 58 | Gesture Handler 3: `Swipeable` antigo removido | `ConversationCard` (swipe de conversa) | ✅ `ReanimatedSwipeable` |
| 58 | Notificações em foreground exibidas por padrão | Nosso `setNotificationHandler` já silencia em foreground | ✅ testar |
| 58 | R8 ligado por padrão no release Android | Pode afetar libs com reflexão | ⚠️ testar APK release |
| 58 | Node 22.13+ / 24.3+ | `eas.json` fixava Node 20.19.4 | ✅ `24.21.0` |
| 58 | `NODE_ENV` controlado pelo CLI | Config lida do `app.json > extra` | ✅ sem impacto |

## Outras mudanças feitas

- Removidos `nativewind`, `tailwindcss` e `tailwind.config.js` (não usados, conflitavam com o SDK).
- React Navigation atualizado para a última 7.x; `react-native-toast-message` 2.5.
  - Navegar para tela de navegador filho a partir do pai não funciona mais (`navigate('ProfileStack', …)` a partir do stack raiz → "not handled by any navigator"). Componentes fora do `Tab.Navigator` (`TermsGuard`, `CustomCheckpoints` no FAB) agora usam `navigate('Main', { screen: 'ProfileStack', params: { screen: … } })`. Telas dentro das abas não são afetadas.
- Pasta `android/` local apagada (gerada para o SDK 54; é regenerada no build).

## Pendências / decisões

- [x] **Lockfiles**: gerenciador único é **npm**. `yarn.lock` removido; `package-lock.json` vai para o EAS (o `.easignore` agora ignora `yarn.lock`). No primeiro build, conferir no log do EAS que o install roda com `npm ci`.
- [x] Erros de tsc pré-existentes corrigidos: `NotificationSoundsPreferencesSection` usa `React.ComponentProps<typeof Ionicons>['name']`; `ProfileGradientEffectSection` usa `PlanType` de `config/plan-features` (inclui `LITE`).
- [ ] Futuro: migrar `@expo/vector-icons` → `@react-native-vector-icons/*` (codemod oficial).
- [ ] Considerar development build (`expo-dev-client`) para não depender da versão do Expo Go.

## Validação feita

- [x] `npx expo install --fix` sem conflitos.
- [x] `npx expo-doctor`: 20/20.
- [x] `tsc --noEmit`: 0 erros.
- [x] `npx expo export --platform android`: bundle Hermes gerado (2804 módulos).

## Roteiro de testes no aparelho

Rodar no Expo Go SDK 58 (`npm run start`) e depois no APK release (`eas build -p android --profile apk`), porque R8 e push só aparecem no release.

**Inicialização e navegação**
- [ ] Splash aparece e o app abre logado/deslogado.
- [ ] Tema claro/escuro/preto e barra de status corretos em cada aba.
- [ ] Abas inferiores, voltar do Android, scroll-to-top ao tocar na aba ativa (Feed, Perfil, Mensagens).

**Vídeo (expo-video)**
- [ ] Feed: anúncio em vídeo toca mudo, mostra controles, avança ao terminar (com 2+ anúncios).
- [ ] Stories: ver story em vídeo (pausar segurando, loop, troca de story).
- [ ] Criar story com vídeo: preview em loop, duração detectada, arrastar início do corte posiciona o vídeo.
- [ ] Loja: vídeo de apresentação no checkout e no painel do vendedor (upload + preview).
- [ ] Verificação de vendedor: miniatura de exemplo em vídeo, viewer em tela cheia, preview do upload.
- [ ] Rolar o feed por vários anúncios em vídeo sem travar/fechar (decoder liberado ao desmontar).

**Gestos e listas**
- [ ] Mensagens: deslizar conversa para a esquerda → "Opções" e "Excluir" funcionam e fecham o swipe.
- [ ] Galeria de imagens (post, produto, suporte) abre, dá zoom e fecha.
- [ ] `SelectRow`: dropdown abre na posição certa.
- [ ] Perfil: campo de mensagem de status recebe foco ao tocar.

**Câmera, mídia e arquivos**
- [ ] Permissões de câmera, galeria e notificações na primeira abertura.
- [ ] Tirar foto / gravar vídeo para story; escolher da galeria; anexar documento no chat.
- [ ] Upload de post com imagem e de avatar (fetch global agora é `expo/fetch`).

**Notificações (só no APK)**
- [ ] Token de push registrado após login.
- [ ] Push com app fechado/minimizado chega com som; em foreground não mostra banner.
- [ ] Badge de mensagens não lidas atualiza ao receber push de mensagem.

**Segurança e outros**
- [ ] Desbloqueio por biometria; secure store mantém sessão após fechar o app.
- [ ] Bloqueio de print em stories e produto (`expo-screen-capture`).
- [ ] Copiar link (clipboard), abrir links externos, pagamento/carteira.
- [ ] Ícone de versão no header: verificar, alerta de atualização e modal obrigatório (versionCode no admin).
- [ ] Release (R8): repetir login, feed, chat em tempo real (Pusher/socket) e checkout no APK.
