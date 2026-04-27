# Plan de migration — services `front-stealf` → `stealf-app`

Document de design pour la migration des services et de la logique métier
depuis `front-stealf` (ancien repo, fonctionnel) vers `stealf-app` (refonte UI/UX).

**Auteurs** : Thomas + Claude (office-hours)
**Date** : 2026-04-27
**Statut** : Plan validé, prêt pour exécution

---

## 1. Contexte

`front-stealf` est l'app Stealf actuelle (Expo 54 + RN 0.81 + TS strict),
fonctionnelle, qui gère :
- Auth Turnkey (passkeys)
- Wallets duals : cash (Turnkey) + privacy (ED25519 local)
- Solana RPC + signing (deux modes)
- Yield Arcium (x25519 + RescueCipher + memo chiffré)
- Privacy Umbra (SDK + ZK provers Mopro Rust FFI)
- Real-time via Socket.io
- React Query pour le cache

`stealf-app` est la refonte UI/UX. Stack identique (Expo 54 / RN 0.81 /
TS strict), conventions différentes :
- Architecture **feature-first** (`src/features/<X>/screens/...`)
- Path alias `@/*` strict (jamais de `../../../`)
- Tailwind/NativeWind + design system mature (`src/design-system/`)
- Aucun service backend câblé pour l'instant
- ~10 écrans déjà implémentés en mock data, ~10 manquants (hors-périmètre)

**Objectif** : transposer tous les services métier de `front-stealf` vers
`stealf-app`, en respectant les conventions du nouveau repo et en améliorant
la qualité du code (typage strict, validation Zod systématique, séparation
des responsabilités, error handling cohérent).

---

## 2. Décisions prises

| # | Décision | Choix |
|---|----------|-------|
| 1 | Organisation des services | **Hybride** : `services/` infra partagée + `features/<X>/{api,hooks,types}/` métier local |
| 2 | Pattern data fetching | **Strict 3 couches** : `api/` (fonctions pures + Zod) → `hooks/` (React Query) → `screens/` (UI) |
| 3 | Auth & bridge socket | AuthContext minimal (état pur) + `<DataBootstrap />` orchestrateur + `subscribeXxx()` par feature avec cleanup automatique |
| 4 | Stratégie de migration | **Hybride C** : 1j d'infra universelle (Phase 0) puis 5 slices verticaux feature-par-feature |

**Sources de vérité (côté client)** :
- **Turnkey SDK** : `userId`, `email`, `cashWallet` (jamais persisté manuellement)
- **SecureStore** : `stealfWallet` (clé privée locale), `subOrgId` (bootstrap rapide)
- **Backend (via React Query)** : `username`, `points`, KYC, etc. — fetché au login via `useUserProfile()`, jamais persisté manuellement
- **Backend serveur** : continue de stocker `cash_wallet`, `subOrgId`, `email` côté DB (besoin propre, ne change rien au client)

---

## 3. Architecture cible

### 3.1 Arborescence

```
src/
├── services/                          # Infra partagée — singletons, clients SDK
│   ├── api/
│   │   ├── client.ts                  # apiGet/apiPost/apiDelete + Bearer
│   │   ├── errors.ts                  # ApiError + parsing
│   │   └── types.ts                   # AuthenticatedApi type
│   ├── auth/
│   │   └── secureStore.ts             # wrapper expo-secure-store typé
│   ├── cache/
│   │   └── walletKeyCache.ts          # RAM (15min TTL) + Keychain
│   ├── real-time/
│   │   └── socket.ts                  # socket.io singleton + types events
│   ├── solana/
│   │   ├── kit.ts                     # RPC clients @solana/kit + utils
│   │   └── transactionsGuard.ts       # validateAddress/Amount/Balance/Mnemonic
│   ├── turnkey/
│   │   ├── config.ts                  # TURNKEY_CONFIG, callbacks
│   │   └── signer.ts                  # IUmbraSigner adapter (Slice 5)
│   ├── umbra/                         # (Slice 5)
│   │   ├── client.ts                  # SDK init
│   │   └── seed.ts                    # master seed (Keychain)
│   └── env.ts                         # validateEnv() au boot
│
├── features/
│   ├── onboarding/                    # Auth & welcome
│   │   ├── api/
│   │   │   └── userProfile.ts         # GET /api/users/me (backend)
│   │   ├── context/
│   │   │   └── AuthContext.tsx        # ÉTAT pur : { user, session, isAuthenticated, logout }
│   │   ├── hooks/
│   │   │   ├── useAuth.ts             # consommer AuthContext
│   │   │   ├── useSignIn.ts           # passkey login
│   │   │   ├── useSignUp.ts           # multi-step signup
│   │   │   ├── useEmailVerificationPolling.ts
│   │   │   └── useUserProfile.ts      # backend profile (username, points)
│   │   ├── types.ts                   # User, Session
│   │   ├── AuthFlow.tsx               # (existant, à câbler)
│   │   ├── OnboardWizard.tsx          # (existant, à câbler)
│   │   └── screens/{Welcome,Login}.tsx
│   │
│   ├── bank/                          # Cash wallet
│   │   ├── api/
│   │   │   ├── balance.ts             # fetchBalance + BalanceSchema + queryKeys
│   │   │   ├── history.ts             # fetchHistory + HistorySchema
│   │   │   └── subscriptions.ts       # subscribeToWalletUpdates
│   │   ├── hooks/
│   │   │   ├── useBalance.ts
│   │   │   └── useHistory.ts
│   │   ├── types.ts                   # TokenBalance, Transaction (dérivés Zod)
│   │   └── screens/BankWallet.tsx
│   │
│   ├── send/                          # Envoi (cash + private)
│   │   ├── api/
│   │   │   └── solPrice.ts            # GET /api/users/sol-price
│   │   ├── hooks/
│   │   │   ├── useSendSimple.ts       # transactionTurnkey + transactionSimple
│   │   │   ├── useSendPrivate.ts      # (Slice 5)
│   │   │   └── useSolPrice.ts
│   │   ├── components/                # (existants : AssetPill, Numpad, etc.)
│   │   └── SendFlow.tsx
│   │
│   ├── grow/                          # Yield Arcium
│   │   ├── api/
│   │   │   ├── yield.ts               # fetchYieldBalance/Stats + Zod
│   │   │   └── subscriptions.ts       # subscribeToYieldUpdates
│   │   ├── hooks/
│   │   │   ├── useYieldBalance.ts
│   │   │   ├── useYieldStats.ts
│   │   │   ├── useYieldDeposit.ts     # mutation : Arcium encrypt + tx + memo
│   │   │   └── useYieldWithdraw.ts    # mutation : POST /api/yield/withdraw
│   │   ├── lib/
│   │   │   └── arciumMemo.ts          # encryptDepositMemo, getUserIdHash
│   │   ├── types.ts
│   │   └── screens/GrowHub.tsx
│   │
│   ├── stealth/                       # Privacy / Umbra (Slice 5)
│   │   ├── api/
│   │   │   ├── balances.ts            # fetchEncryptedBalances
│   │   │   ├── claims.ts              # fetchPendingClaims, fetchPendingClaimsForCash
│   │   │   └── subscriptions.ts
│   │   ├── hooks/
│   │   │   ├── useUmbra.ts
│   │   │   ├── useShieldedBalance.ts
│   │   │   ├── usePendingClaims.ts
│   │   │   └── usePendingClaimsForCash.ts
│   │   ├── lib/
│   │   │   ├── operations/{deposit,withdraw,transfer,claim}.ts
│   │   │   ├── burntUtxos.ts
│   │   │   └── errors.ts              # UmbraError
│   │   ├── zk/                        # Mopro provers + circuits
│   │   │   ├── provers/{prover,createUtxos,claimsUtxos,register}.ts
│   │   │   ├── services/zkAssetService.ts
│   │   │   └── utils/{moproInputs,proofConverter}.ts
│   │   ├── PrivacyModeContext.tsx     # (existant)
│   │   └── screens/StealthHub.tsx
│   │
│   ├── shield/, unshield/, moove/, add-funds/, transactions/
│   │   └── (écrans existants à câbler dans leurs slices respectifs)
│   │
│   └── profile/screens/ProfileHub.tsx # consomme useUserProfile + soldes
│
├── shared/
│   ├── types/                         # User, Wallet (utilisés par >1 feature)
│   ├── schemas/                       # Zod schemas partagés (rare)
│   └── lib/                           # helpers transverses (formatAmount, etc.)
│
├── constants/                         # SOL_MINT, USDC_MINT, STEALF_JITO_VAULT, TURNKEY_CONFIG
│
└── components/
    ├── DataBootstrap.tsx              # orchestre prefetch + socket subs au login
    ├── ErrorBoundary.tsx
    ├── OfflineBanner.tsx
    └── (autres composants transverses, pas dans une feature)
```

### 3.2 Pattern strict — flow d'un appel API

**Couche 1 — `features/<X>/api/<resource>.ts`** : fonction pure
```ts
import { z } from 'zod';
import type { AuthenticatedApi } from '@/src/services/api/types';

export const BalanceSchema = z.object({
  address: z.string(),
  tokens: z.array(TokenBalanceSchema),
  totalUSD: z.number(),
});
export type Balance = z.infer<typeof BalanceSchema>;

export const balanceQueries = {
  all: ['balance'] as const,
  byAddress: (address: string) => [...balanceQueries.all, address] as const,
};

export async function fetchBalance(api: AuthenticatedApi, address: string): Promise<Balance> {
  const raw = await api.get(`/api/wallet/balance/${address}`);
  return BalanceSchema.parse(raw); // throw si malformé
}
```

**Couche 2 — `features/<X>/hooks/useResource.ts`** : React Query
```ts
export function useBalance(address: string) {
  const api = useAuthenticatedApi();
  return useQuery({
    queryKey: balanceQueries.byAddress(address),
    queryFn: () => fetchBalance(api, address),
    enabled: !!address,
    staleTime: Infinity, // mis à jour via socket
  });
}
```

**Couche 3 — `screens/Resource.tsx`** : UI uniquement
```ts
const { data, isLoading, error } = useBalance(cashWallet);
```

**Pour les actions (mutations)** : `useMutation` partout. Plus de
`[loading, setLoading, error, setError]` manuels comme dans front-stealf.

### 3.3 Bridge socket ↔ React Query (pattern feature-local)

```ts
// features/bank/api/subscriptions.ts
export function subscribeToWalletUpdates(
  queryClient: QueryClient,
  address: string,
): () => void {
  const onBalance = (raw: unknown) => {
    const data = BalanceEventSchema.parse(raw); // Zod sur events socket aussi
    queryClient.setQueryData(balanceQueries.byAddress(address), data);
  };
  socketService.on('balance:updated', onBalance);
  return () => socketService.off('balance:updated', onBalance);
}
```

**Composé dans `<DataBootstrap />`** :
```tsx
useEffect(() => {
  if (!user) return;
  const cleanups = [
    subscribeToWalletUpdates(qc, user.cashWallet),
    subscribeToWalletUpdates(qc, user.stealfWallet),
    subscribeToYieldUpdates(qc, user.subOrgId),
  ];
  return () => cleanups.forEach(fn => fn());
}, [user]);
```

### 3.4 Providers du root layout (`app/_layout.tsx`)

```tsx
<QueryClientProvider client={queryClient}>
  <TurnkeyProvider config={TURNKEY_CONFIG} callbacks={TURNKEY_CALLBACKS}>
    <AuthProvider>
      <SocketProvider>
        <DataBootstrap />
        <SafeAreaProvider>
          <Stack screenOptions={{ ... }} />
        </SafeAreaProvider>
      </SocketProvider>
    </AuthProvider>
  </TurnkeyProvider>
</QueryClientProvider>
```

L'auth guard (redirect sign-in si non auth) reste dans `_layout.tsx` via
`useEffect` + `router.replace` (cf. front-stealf).

---

## 4. Phasage

### Phase 0 — Foundations universelles (≈ 1 jour)

Briques utilisées par **toutes** les slices. Aucune logique métier ici.

**Livrables** :
- [ ] `services/api/{client,errors,types}.ts` — `apiGet/apiPost/apiDelete` + `ApiError`
- [ ] `services/auth/secureStore.ts` — wrapper typé sur expo-secure-store
- [ ] `services/cache/walletKeyCache.ts` — singleton TTL + Keychain
- [ ] `services/real-time/socket.ts` — singleton Socket.io + types events
- [ ] `services/solana/kit.ts` — RPC singletons + utils (`getRpc`, `getRpcSubscriptions`, `LAMPORTS_PER_SOL`, `solToLamports`, `lamportsToSol`, `createSignerFromBase58`)
- [ ] `services/solana/transactionsGuard.ts` — `validateAddress/Amount/Balance/Mnemonic`, `guardTransaction`
- [ ] `services/turnkey/config.ts` — `TURNKEY_CONFIG`, `TURNKEY_CALLBACKS`, `CASH_WALLET_CONFIG`
- [ ] `services/env.ts` — `validateEnv()` appelé au démarrage (var manquante → throw clair)
- [ ] `constants/solana.ts` — `SOL_MINT`, `USDC_MINT`, `STEALF_JITO_VAULT`
- [ ] `app/_layout.tsx` — providers (QueryClient + Turnkey + Auth squelette + Socket squelette) + `validateEnv()` + auth guard
- [ ] `polyfills.ts`, `crypto-shim.js`, `fs-shim.js`, `metro.config.js` adaptations — copier-coller depuis front-stealf, vérifier compat avec NativeWind metro config existant
- [ ] `package.json` — ajouter les deps manquantes (Turnkey, @solana/kit, @arcium-hq/client, @umbra-privacy/sdk, axios? non — on garde fetch, react-native-keychain, bip39, ed25519-hd-key, etc.)

**Definition of Done** :
- L'app démarre, `validateEnv` passe, le QueryClient est dispo, le SocketProvider est en place mais inactif (pas de connexion tant que pas auth).
- `npm run lint` passe.
- TS strict OK partout.

**⚠ Points d'attention** :
- **Metro config conflict** : stealf-app a déjà un `metro.config.js` qui wrap NativeWind. Il faut composer les deux configs (NativeWind + shims crypto/fs + svg transformer).
- **Babel config conflict** : pareil, jsxImportSource NativeWind + reanimated plugin. À vérifier.
- **Polyfills** : ils doivent s'appliquer avant tout import de `@solana/kit`. Le fichier `index.js` racine doit charger les polyfills en premier (cf. front-stealf).

---

### Slice 1 — Auth & Onboarding (≈ 3-4 jours)

**Objectif** : un user peut s'inscrire, vérifier son email, créer une passkey,
se connecter, se déconnecter. À la fin, on est dans `(tabs)/bank` avec un user
authentifié réel.

**Services additionnels nécessaires** : aucun (Phase 0 suffit).

**Livrables** :
- [ ] `features/onboarding/context/AuthContext.tsx` — état pur (user, session, isAuthenticated, loading, logout)
- [ ] `features/onboarding/types.ts` — `User`, `Session` (Zod-derived)
- [ ] `features/onboarding/api/userProfile.ts` — `fetchUserProfile`, schema, queryKeys
- [ ] `features/onboarding/hooks/useAuth.ts`
- [ ] `features/onboarding/hooks/useUserProfile.ts`
- [ ] `features/onboarding/hooks/useSignIn.ts` — Turnkey passkey login + cleanup keychain orphelins
- [ ] `features/onboarding/hooks/useSignUp.ts` — multi-step (email → passkey → wallet setup) **via reducer** (pas de useReducer-spaghetti comme front-stealf, à propre-iser)
- [ ] `features/onboarding/hooks/useEmailVerificationPolling.ts`
- [ ] `components/DataBootstrap.tsx` (squelette : prefetch userProfile au login)
- [ ] Câbler `AuthFlow.tsx`, `OnboardWizard.tsx`, `Login.tsx` aux hooks réels (remplacer la nav fake par les vrais flows)
- [ ] Logout dans `ProfileHub` (futur slice mais hook prêt)

**Definition of Done** :
- Login + signup end-to-end testé sur device physique (passkeys requièrent device).
- L'auth guard du root layout fonctionne (redirect sign-in / (tabs)).
- `walletKeyCache.warmup()` au login OK.
- Logout : nettoie SecureStore + walletKeyCache + Turnkey + state.
- 1 test unitaire sur `fetchUserProfile` (mock api, vérifie Zod parse).

**⚠ Points d'attention** :
- L'onboarding wizard existant a 5 étapes (invite → handle → email → accept → done). À mapper sur le flow Turnkey réel : email → passkey creation → email verification polling → wallet creation/import. Ce mapping mérite une discussion brève avant exécution (les UI/UX de l'onboarding a peut-être divergé du flow technique).
- **Wallet setup** (créer 24 mots vs importer mnemonic) → l'écran existant ? À vérifier. Si non, c'est une **dépendance bloquante** documentée mais on ne crée pas l'écran.
- `useSignUp.ts` dans front-stealf est 327 lignes de spaghetti — c'est une opportunité de refacto. Diviser en : `signUpReducer.ts`, `passkeyHelpers.ts`, hook orchestrateur.

---

### Slice 2 — Bank (cash wallet) (≈ 2-3 jours)

**Objectif** : `BankWallet` affiche le vrai solde et les vraies transactions
du `cashWallet`, mises à jour en temps réel via socket.

**Services additionnels nécessaires** : connexion socket activée au login.

**Livrables** :
- [ ] `features/bank/api/balance.ts` — schema, queryKeys, `fetchBalance`
- [ ] `features/bank/api/history.ts` — schema, queryKeys, `fetchHistory`
- [ ] `features/bank/api/subscriptions.ts` — `subscribeToWalletUpdates` (events `balance:updated` + `transaction:new`, **avec validation Zod**)
- [ ] `features/bank/hooks/{useBalance,useHistory}.ts`
- [ ] `features/bank/types.ts` — `TokenBalance`, `Transaction` (dérivés Zod, plus de duplication)
- [ ] `components/DataBootstrap.tsx` étendu : socket connect au login, `subscribeToWalletUpdates(cashWallet)` + `subscribeToWalletUpdates(stealfWallet)` (pour pouvoir afficher le solde privacy aussi)
- [ ] Câbler `BankWallet.tsx` à `useBalance` + `useHistory` (remplacer mock data)
- [ ] Loading skeletons + error states (utiliser primitives existantes)
- [ ] Câbler `tx/[id].tsx` si l'écran existe, sinon noter dépendance

**Definition of Done** :
- Solde affiché = solde réel du backend.
- Une nouvelle transaction apparaît en temps réel sans refresh.
- Mode offline (NetInfo + React Query `onlineManager`) géré : `OfflineBanner` affiché.
- 2 tests unitaires sur `fetchBalance` et `fetchHistory` (Zod parse OK / Zod parse fail).

**⚠ Points d'attention** :
- Les types `TokenBalance` et `Transaction` étaient **dupliqués** dans front-stealf (`schemas.ts` + inline dans `useWalletInfos`). On les unifie via `z.infer`.
- Le `globalQueryClient` top-level de `useWalletInfos` disparaît : on utilise `useQueryClient()` proprement à l'intérieur de `subscribeToWalletUpdates` (passé en argument depuis `<DataBootstrap />`).

---

### Slice 3 — Send (cash) (≈ 2 jours)

**Objectif** : `SendFlow` peut envoyer du SOL/SPL depuis le cashWallet (Turnkey
signing) ou stealfWallet (local signing). Send privé (Umbra) reporté au Slice 5.

**Services additionnels nécessaires** : aucun (kit + transactionsGuard sont en Phase 0).

**Livrables** :
- [ ] `features/send/api/solPrice.ts` — `fetchSolPrice` + Zod
- [ ] `features/send/hooks/useSolPrice.ts`
- [ ] `features/send/hooks/useSendSimple.ts` — encapsule `transactionTurnkey` (cash) + `transactionSimple` (stealf) en **un seul hook** qui choisit le signer selon le wallet d'origine. Mutation React Query.
- [ ] `features/send/lib/buildTransaction.ts` — extrait la logique commune (pas dupliquée comme dans front-stealf entre `useSendSimpleTransaction` et `useYieldDeposit`)
- [ ] Câbler `SendFlow.tsx` (4 étapes : asset → recipient → amount → confirm) :
  - étape "select asset" : utiliser `useBalance` pour les soldes réels au lieu du mock `ASSETS`
  - étape "recipient" : valider l'adresse via `validateAddress` du guard
  - étape "amount" : valider via `validateAmount` + `validateBalance` + `validateNotSelf`
  - étape "swipe to send" : trigger `useSendSimple` mutation, naviguer vers `SuccessScreen` au succès
- [ ] Invalidation React Query post-send (balance + history)

**Definition of Done** :
- Envoi de SOL en devnet réussi (depuis cash wallet via Turnkey).
- Envoi de SOL en devnet réussi (depuis stealf wallet via clé locale).
- Validation pre-flight bloque les cas invalides (auto-send, balance insuffisante, mnemonic invalide pour les imports).
- Le solde se met à jour en temps réel après succès (via socket Slice 2).
- 2 tests unitaires sur `validateBalance` et `guardTransaction`.

**⚠ Points d'attention** :
- `transactionTurnkey` dans front-stealf est un hook factory bizarre (`return async () => {}`). On normalise en mutation React Query standard.
- `SuccessScreen` (321 lignes) existe déjà — vérifier qu'elle accepte des params via router (signature, montant, recipient).

---

### Slice 4 — Grow (yield Arcium) (≈ 2 jours)

**Objectif** : `GrowHub` affiche le vrai solde yield + APY, deposit/withdraw
fonctionnels.

**Services additionnels nécessaires** : `@arcium-hq/client` (déjà en deps, à
vérifier).

**Livrables** :
- [ ] `features/grow/api/yield.ts` — `fetchYieldBalance`, `fetchYieldStats`, `fetchMxePubkey` + Zod schemas
- [ ] `features/grow/api/subscriptions.ts` — `subscribeToYieldUpdates` (event `yield:balance-updated`)
- [ ] `features/grow/lib/arciumMemo.ts` — `encryptDepositMemo`, `getUserIdHash`, `serializeDepositMemo` (extraits de front-stealf, code Arcium pur, pas de dépendance React)
- [ ] `features/grow/hooks/{useYieldBalance,useYieldStats}.ts`
- [ ] `features/grow/hooks/useYieldDeposit.ts` — mutation : fetch mxePubkey → encrypt memo → build tx (transfer + memo instructions) → sign avec stealfWallet → send → invalidate
- [ ] `features/grow/hooks/useYieldWithdraw.ts` — mutation : POST /api/yield/withdraw
- [ ] `<DataBootstrap />` étendu : `subscribeToYieldUpdates(subOrgId)` au login + `prefetchYieldData` (refacto plus propre que front-stealf qui fait un fetch raw bypass du client api)
- [ ] Câbler `GrowHub.tsx` au real data
- [ ] Câbler `add-funds.tsx` (modal) si pertinent pour déposer dans yield

**Definition of Done** :
- Deposit yield testé sur devnet (encrypt + tx + memo confirmé).
- Withdraw yield testé.
- APY/balance s'actualisent en temps réel.
- 1 test unitaire sur `encryptDepositMemo` (vérifie qu'on encode bien u128 LE).

**⚠ Points d'attention** :
- L'utilisation de `Buffer` et `crypto.randomBytes` requiert que les polyfills soient bien chargés (Phase 0).
- `prefetchYieldData` dans front-stealf bypass le client API — à refacto pour utiliser `apiGet` proprement.

---

### Slice 5 — Stealth (Umbra + ZK) (≈ 3-4 jours)

**Objectif** : `StealthHub` affiche les soldes shielded, claims fonctionnent,
shield/unshield/send-private fonctionnent. C'est le slice le plus lourd
techniquement (Mopro FFI Rust, ZK provers).

**Services additionnels nécessaires** :
- `@umbra-privacy/sdk` + `@umbra-privacy/rn-zk-prover`
- `mopro-ffi` natif Rust (xcframework iOS + JNI Android) — **doit être copié depuis front-stealf**
- ZK circuits (téléchargés depuis CDN, cachés via expo-file-system)

**Livrables** :
- [ ] **Modules natifs** : copier `modules/mopro-ffi/` depuis front-stealf, vérifier les build settings iOS + Android
- [ ] `services/umbra/{client,seed}.ts` — SDK init + master seed (Keychain)
- [ ] `services/turnkey/signer.ts` — `createTurnkeyUmbraSigner` (IUmbraSigner adapter)
- [ ] `features/stealth/lib/operations/{deposit,withdraw,transfer,claim}.ts`
- [ ] `features/stealth/lib/{burntUtxos,errors}.ts` — `UmbraError` + parsing
- [ ] `features/stealth/zk/` — provers Mopro, services circuits, utils (extraction de `src/zk/` de front-stealf)
- [ ] `features/stealth/api/{balances,claims,subscriptions}.ts`
- [ ] `features/stealth/hooks/{useUmbra,useShieldedBalance,usePendingClaims,usePendingClaimsForCash}.ts`
- [ ] `features/send/hooks/useSendPrivate.ts` (transfer Umbra)
- [ ] `features/shield/ShieldFlow.tsx` câblé (deposit Umbra)
- [ ] `app/unshield.tsx` + `features/stealth/UnshieldFlow.tsx` (withdraw Umbra) — vérifier si écran existe ou dépendance
- [ ] Câbler `StealthHub.tsx`
- [ ] `usePreloadZKeysOnMount` hook au root layout (préchargement circuits)

**Definition of Done** :
- Shield (deposit) testé sur devnet (génération ZK proof + tx).
- Send privé testé.
- Claim received / claim self-to-public testés.
- Unshield (withdraw) testé.
- Le solde shielded s'actualise via socket.
- Logout nettoie le master seed et les utxos burnt.

**⚠ Points d'attention majeurs** :
- **Build natif** : ajouter mopro-ffi peut casser le build iOS/Android. Tester très tôt avec `npx expo prebuild --clean && npx expo run:ios`.
- **ZK proofs longues** : la génération peut prendre plusieurs secondes. Bien afficher loading states.
- **Umbra mainnet pas dispo** : on reste sur testnet/devnet. Documenter dans le code.
- C'est le slice où on découvrira potentiellement des bugs de polyfills (Hermes + crypto.subtle + etc.).

---

### Slice 6 — Polish & Profile (≈ 1-2 jours)

**Objectif** : tout ce qui est transverse + l'écran profile.

**Livrables** :
- [ ] `components/ErrorBoundary.tsx` (copie + adaptation)
- [ ] `components/OfflineBanner.tsx` (copie + adaptation NativeWind)
- [ ] Câbler `ProfileHub.tsx` :
  - `useUserProfile` (username, points)
  - sommer balances (cash + privacy + yield) pour "Capital Summary"
  - logout button → `useAuth().logout()`
  - `useExportWallet` hook (mnemonic export)
- [ ] `features/onboarding/hooks/useExportWallet.ts`
- [ ] Vérifier toutes les routes (`card.tsx`, `lock.tsx`, `unshield.tsx`) — placeholders ou câblage
- [ ] Tests E2E manuels checklist (signup → bank → send → grow deposit → shield → logout)
- [ ] Cleanup : supprimer tout mock data restant, tout `console.log` non gardé par `__DEV__`
- [ ] CLAUDE.md du nouveau repo : documenter l'architecture cible (1 page)

**Definition of Done** :
- ErrorBoundary capture les crashes → écran d'erreur propre.
- OfflineBanner s'affiche quand pas de connexion.
- Profile complet et fonctionnel.
- Aucun mock data restant.
- `npm run lint` zéro warning.
- TS `strict` zéro erreur.

---

## 5. Cross-cutting concerns

### 5.1 Validation Zod

- **Toutes** les réponses API parsées via `Schema.parse(raw)`.
- **Tous** les events socket parsés via `EventSchema.parse(raw)`.
- Types métier dérivés via `z.infer<typeof Schema>` — jamais déclarés deux fois.
- En cas d'erreur de parsing : `ApiError` ou log + fallback selon criticité.

### 5.2 Error handling

- API : `ApiError` levée dans `apiGet/Post/Delete`, propagée dans React Query → consommée comme `error` dans les composants.
- Mutations : utiliser `onError` callback pour montrer toast/alerte à l'utilisateur.
- Crashes inattendus : `<ErrorBoundary>` au root.
- Umbra : `UmbraError` typé avec `code` (déjà dans front-stealf).

### 5.3 Logging

- Garder le pattern `if (__DEV__) console.log/error` de front-stealf.
- En prod : aucun console.log. Si besoin futur : Sentry / OpenTelemetry (hors-périmètre).

### 5.4 Tests

Pas de framework de tests pour l'instant dans stealf-app. **Décision actée :
Vitest** (config minimale, démarrage rapide, syntaxe Jest-compatible, ESM-friendly).
Installé en Phase 0. On teste prioritairement :
- Fonctions `api/` pures (mock api, vérifie Zod parse)
- Validation guards (`validateAddress`, etc.)
- Crypto helpers (`encryptDepositMemo`, `u128ToLE`)
- Pas de tests de composants RN (nécessiterait React Native Testing Library, hors-périmètre).

Pas de tests d'intégration React Query (overhead trop élevé pour un MVP, à
ajouter plus tard si besoin).

### 5.5 Variables d'environnement

`services/env.ts` valide au boot :
```ts
const required = [
  'EXPO_PUBLIC_API_URL',
  'EXPO_PUBLIC_SOLANA_RPC_URL',
  'EXPO_PUBLIC_SOLANA_WSS_URL',
  'EXPO_PUBLIC_ORGANIZATION_ID',
  'EXPO_PUBLIC_AUTH_PROXY_CONFIG_ID',
  'EXPO_PUBLIC_UMBRA_RELAYER_URL',
];
```
Variable manquante → throw clair en console au lieu d'un `undefined` qui
cause un bug obscur 5 écrans plus tard (problème actuel de front-stealf qui
ne valide jamais).

### 5.6 Dépendances bloquantes (écrans non implémentés)

Liste à mettre à jour au fur et à mesure. Si un slice nécessite un écran
manquant, on note ici sans le créer :
- (à compléter pendant l'exécution)

---

## 6. Documentation

**Langue : anglais** (cohérence avec le code, code review-friendly, lisible
par des contributeurs externes/agents IA).

**Principe** : 4-5 docs vivants > 10 docs morts. Chaque doc est nourrie
par du vrai code, pas écrite à blanc. Une doc qui n'est pas mise à jour à
chaque PR pertinente sera supprimée — on ne tolère pas la doc-rot.

### 6.1 Structure cible

```
docs/
├── architecture.md            # Big-picture: layers, principles, data flow
├── pipeline.md                # Critical end-to-end flows (sequence diagrams)
├── conventions.md             # Coding conventions, naming, imports, patterns
├── decisions.md               # Append-only ADR log (why we made choices)
├── glossary.md                # Stealf-specific terms (cash_wallet, MXE, claim, moove…)
├── audit-security.md          # Sensitive surfaces + mitigations
└── services-migration-plan.md # This document
```

Plus un mini `README.md` (3-5 lignes max) **dans chaque `src/features/<X>/`**
décrivant : ce que fait la feature, les endpoints API consommés, les events
socket écoutés. Co-localisé pour rester maintenu.

### 6.2 Quand on les écrit

| Doc | Quand | Contenu initial |
|-----|-------|-----------------|
| `glossary.md` | Phase 0 | Tous les termes Stealf-spécifiques rencontrés en exploration |
| `conventions.md` | Phase 0 | Règles décidées dans ce plan (3-layer pattern, Zod boundaries, naming, imports `@/*`) |
| `architecture.md` | Phase 0 | Squelette: layered architecture, data flow diagram |
| `decisions.md` | Phase 0 | ADR #001 = ce plan résumé (les 4 décisions actées + rationale) |
| `pipeline.md` | À chaque slice | +1 flow par slice (auth signup, balance fetch+socket, send, yield deposit, shield…) |
| `README.md` par feature | À chaque slice | Créé en fin de slice quand la feature est câblée |
| `audit-security.md` | Fin Slice 5 | Revue complète une fois toute la surface crypto en place |

### 6.3 Format ADR (decisions.md)

Chaque entrée suit le format léger :
```
## ADR-NNN — Title
Date · Status (Accepted / Superseded by ADR-XXX)

### Context
What problem are we solving?

### Decision
What we chose.

### Consequences
What this enables / costs.
```

### 6.4 Maintenance rules

- Toute PR qui change une couche `services/` ou `features/<X>/api/` met à jour
  la doc concernée si pertinent.
- Toute décision non triviale (choix d'archi, dépendance externe, refacto
  structurant) ajoute une entrée dans `decisions.md`.
- Pas de doc générique copy-pasted depuis ailleurs (pas de "What is React
  Query?" — on link vers la doc officielle si besoin).

---

## 7. Risques et mitigations

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Conflit Metro config (NativeWind + shims crypto) | Moyenne | Bloquant Phase 0 | Tester très tôt, revenir à un metro.config minimal si besoin |
| Mopro FFI Rust incompatible avec une dep différente du nouveau repo | Faible | Bloquant Slice 5 | Slice 5 en dernier, possibilité de slice 5a (tout sauf ZK) si blocage |
| Turnkey SDK qui se comporte différemment dans nouveau repo | Faible | Bloquant Slice 1 | Tester sur device physique dès Slice 1 |
| Zod parse failures sur des réponses backend non documentées | Moyenne | Localisé | Logger + ajuster les schemas + ouvrir tickets backend si besoin |
| Refacto en cours de route qui casse une slice précédente | Moyenne | Modéré | À chaque slice, lancer la régression manuelle des slices précédentes |

---

## 8. Definition of Done globale

La migration est terminée quand :

- [ ] Toutes les fonctionnalités de front-stealf sont disponibles dans stealf-app
- [ ] Aucun mock data restant
- [ ] `npm run lint` zéro warning, TS strict zéro erreur
- [ ] Tous les services/hooks suivent le pattern strict 3 couches
- [ ] Validation Zod appliquée sur 100 % des frontières (API + socket events)
- [ ] `docs/` à jour : architecture, pipeline, conventions, decisions, glossary, audit-security
- [ ] Chaque `src/features/<X>/` a son `README.md`
- [ ] Test E2E manuel passé sur device physique : signup → bank → send → yield deposit → shield → unshield → send privé → logout
- [ ] Build iOS + Android passe (`expo run:ios` + `expo run:android`)

---

## 9. Estimation totale

| Phase / Slice | Estimation | Cumul |
|---------------|-----------:|------:|
| Phase 0 — Foundations | 1j | 1j |
| Slice 1 — Auth | 3-4j | 4-5j |
| Slice 2 — Bank | 2-3j | 6-8j |
| Slice 3 — Send | 2j | 8-10j |
| Slice 4 — Grow | 2j | 10-12j |
| Slice 5 — Stealth | 3-4j | 13-16j |
| Slice 6 — Polish | 1-2j | **14-18j** |

≈ 3 semaines de travail focus à 1 dev temps plein. Le slice 5 est le plus
risqué, à attaquer avec marge.

---

## 10. Prochaines étapes immédiates

1. **Validation finale du plan** par Thomas
2. **Exécution Phase 0** — créer une PR dédiée, review focus sur la metro/babel config et les polyfills
3. À la fin de Phase 0 : démo rapide (l'app démarre, Turnkey initialisé, validateEnv passe)
4. Démarrer Slice 1
