# Passwuts — Technical Documentation

Scope: architecture, data model, auth/session flow, cryptography, API contract, extension build, configuration, and deployment. Narrative product context lives in `README.md`.

## 1. System overview

pnpm workspace (`pnpm-workspace.yaml`: `apps/*`, `packages/*`):

- `apps/web` — Next.js 16.0.10 App Router + React 19.2.0 vault UI and JSON API. `next.config.ts`: `output: standalone`, `transpilePackages: ["@pm/types", "@pm/crypto"]`.
- `apps/extension` — Vite 7.3.1 browser extension. Three Rollup entries: `popup`, `background`, `content`. Target-specific manifest selected at build time via `BROWSER` env.
- `packages/crypto` (`@pm/crypto` 0.0.1) — WebCrypto primitives: `deriveKey`, `encryptPassword`, `decryptPassword`. Built with `tsc` to `dist/index.js` + `dist/index.d.ts`.
- `packages/types` (`@pm/types` 0.0.1) — shared `VaultAccount`, `VaultItemFromAPI` types, re-exported from `src/index.ts`.
- Backend: Firebase Auth (client SDK) + Firebase Admin SDK 13.6.0 (session verification) + Firestore (Native mode). No custom database server.

Request paths:

- Web: browser → Firebase client SDK (ID token) → `POST /api/auth/login` → `session` cookie → `requireAuth` (`verifySessionCookie`) → `adminDb` scoped by `uid`.
- Extension: popup/background holds Firebase ID token in `browser.storage.local` → calls web API with `Authorization: Bearer <idToken>` → `requireAuth` (`verifyIdToken` branch).
- Crypto never leaves the client: plaintext and `CryptoKey` exist only in browser memory (web: Zustand store; extension: module variable with 5-minute auto-lock).

Diagrams: `Passwuts.drawio`, `Passwuts Archetectural Diagram.drawio`.

## 2. Tech stack

- Framework: Next.js 16 App Router, React 19, TypeScript 5
- UI: Tailwind CSS v4 (`@tailwindcss/postcss` 4.1.9), shadcn/ui + Radix UI, `lucide-react` 0.454.0
- State: Zustand 5.0.9 (`authStore`, `vaultStore`)
- Auth/DB: `firebase` 12.7.0 (web) / 12.8.0 (extension), `firebase-admin` 13.6.0, Firestore
- Validation/forms: `zod` 3.25.76, `react-hook-form` 7.60.0
- Extension: Vite 7.3.1, `@vitejs/plugin-react` 5.1.2, `webextension-polyfill` 0.12.0
- Analytics: `@vercel/analytics` 1.3.1 (web)

## 3. Repository layout

```
pnpm-workspace.yaml
apps/web/
  app/page.tsx                    -> redirect("/accounts")
  app/layout.tsx                  -> root layout, mounts AuthProvider
  app/(app)/layout.tsx            -> client guard (user check) + VaultGate
  app/(app)/accounts/             -> vault grid page
  app/(auth)/login/               -> sign-in page
  app/(auth)/extension/           -> extension handoff page
  app/api/auth/login/route.ts     -> POST: ID token -> session cookie
  app/api/auth/logout/route.ts    -> POST: revoke + clear cookie
  app/api/me/route.ts             -> GET: session -> { user }
  app/api/vault/route.ts          -> GET list, POST upsert
  app/api/vault/setup/route.ts    -> POST verifier (one-time)
  app/api/vault/meta/exists/route.ts -> GET verifier doc or 404
  app/api/vault/[id]/favorite/route.ts -> PATCH { isFavorite }
  app/api/vault/[id]/delete/route.ts   -> DELETE entry
  components/
    AuthProvider.tsx              -> hydrates useAuthStore from GET /api/me
    ClientGuard.tsx               -> redirects to /login when !loading && !user
    VaultGate.tsx                 -> checking | needs-setup | locked | unlocked
    header.tsx, password-generator-modal.tsx
    vault-setup-modal.tsx, vault-unlock-modal.tsx, ui/*
  lib/
    Firebase/initialize.ts        -> client SDK init (NEXT_PUBLIC_* vars)
    firebaseAdmin.ts              -> Admin SDK init (service-account vars)
    verify-admin-token.ts         -> requireAuth(): Bearer ID token or session cookie
    firestore.ts                  -> savePassword(): direct client addDoc to users/{uid}/vault
    vault.ts                      -> setupVault(), unlockVault(), doesVaultExist()
    utils.ts
  store/authStore.ts              -> { user: { uid, email } | null, loading }
  store/vaultStore.ts             -> { cryptoKey, isUnlocked, refreshCounter }
  proxy.ts                        -> guards /accounts/:path* -> /login when no session cookie
apps/extension/
  popup/index.html, src/popup/Popup.tsx, src/popup/main.tsx
  src/background/index.ts         -> message router (unlock, generate, save, lookup, lock)
  src/background/tokenHelpers.ts  -> isTokenExpired(), checkAuthToken() (60s interval), invalidateSession()
  src/background/passwordGenerator.ts -> generateSecurePassword(length=16), crypto.getRandomValues
  src/content/index.ts            -> entry (currently 0 bytes, emits content/index.js)
  shared/vaultStore.ts            -> in-memory CryptoKey + 5-min AUTO_LOCK_MS
  shared/authStorage.ts           -> browser.storage.local { idToken, loggedInAt }
  public/manifest.chrome.json     -> MV3
  public/manifest.firefox.json    -> MV2 + gecko id
  vite.config.ts                  -> entries, __APP_URL__ define, copy-manifest plugin
  dist/                           -> build output (gitignored runtime artifact)
packages/
  crypto/src/index.ts             -> deriveKey, encryptPassword, decryptPassword
  types/src/vault.ts              -> VaultAccount, VaultItemFromAPI
```

## 4. Security model

- Key derivation: `deriveKey(masterPassword: string, salt: string)` — PBKDF2, SHA-256, 100,000 iterations, salt UTF-8 encoded, output AES-GCM 256-bit `CryptoKey`, `extractable: false`, usages `["encrypt", "decrypt"]`. Call sites pass `salt = uid` (`apps/web/lib/vault.ts:9`, extension `src/background/index.ts:45` derives `uid` from ID-token `user_id` claim).
- Encryption: `encryptPassword(password, key)` — random 12-byte IV via `crypto.getRandomValues`, AES-GCM, Base64-encoded `{ encryptedPassword, iv }`.
- Decryption: `decryptPassword(encryptedPassword, iv, key)` — Base64 → bytes, `subtle.decrypt`; throws on wrong key/IV/corruption (AES-GCM auth failure). Callers map this to `Incorrect master password`.
- Verifier: constant plaintext `"vault-check"` encrypted at setup and stored server-side. Unlock re-derives the key and decrypts the verifier; equality check gates `setKey`. No password hash is stored.
- Transport/storage: server persists only `{ encrypted, iv }` verifier plus per-item `{ encryptedPassword, iv }`. Plaintext and `CryptoKey` never leave the client process.
- Key lifetime: web holds key in `useVaultStore.cryptoKey` until `lock()`; extension holds it in module state with `AUTO_LOCK_MS = 5 * 60 * 1000` enforced on `getVaultKey()`. No persistence to `localStorage` / `storage.local`.
- Constraints: no key recovery (lost master password = unrecoverable ciphertext); one verifier per user (`vaultMeta/main`, re-setup returns 409); vault doc IDs are deterministic per URL (see §6).

## 5. Authentication and route guards

- Client SDK (`apps/web/lib/Firebase/initialize.ts`): `initializeApp` + `getAuth` + `getFirestore` from `NEXT_PUBLIC_*` vars.
- Admin SDK (`apps/web/lib/firebaseAdmin.ts`): `admin.credential.cert({ projectId, clientEmail, privateKey })` with `FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')`. Exports `adminAuth`, `adminDb`.
- Login (`POST /api/auth/login`): verifies short-lived ID token, `createSessionCookie(idToken, { expiresIn: 7 days })`, sets cookie `session` with `httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: 604800`. Note: `secure: true` requires HTTPS; plain-HTTP localhost may reject the cookie.
- Me (`GET /api/me`): reads `session` cookie, `verifySessionCookie(cookie, true)` (`checkRevoked`), returns `{ user: decoded }` or `401 { user: null }`.
- Logout (`POST /api/auth/logout`): verifies session, `revokeRefreshTokens(decoded.sub)`, deletes `session` cookie.
- `requireAuth(req)` (`apps/web/lib/verify-admin-token.ts`): prefers `Authorization: Bearer <idToken>` → `verifyIdToken` (`authType: "bearer"`); else `session` cookie → `verifySessionCookie(cookie, true)` (`authType: "session"`). Throws `Invalid bearer token` / `Unauthorized` / `Invalid session cookie`.
- Edge guard (`apps/web/proxy.ts`): `matcher: ['/accounts/:path*']`; no `session` cookie → `redirect('/login')`.
- `AuthProvider`: on mount `fetch('/api/me')` → `useAuthStore.setUser(data?.user ?? null)` (`loading: false`).
- `(app)/layout.tsx`: client component; `loading || !user` renders `null` and `router.replace('/login')`; else renders `<VaultGate>`.
- `ClientGuard`: same `!loading && !user → router.replace('/login')` pattern for pages that opt in.
- `VaultGate` states: `checking` (no user or probing) → `needs-setup` (`GET /api/vault/meta/exists` → 404, or fetch failure fail-closed) → `locked` (exists, `!isUnlocked`) → `unlocked`. Renders `VaultSetupModal` (`onSetupComplete → locked`) or `VaultUnlockModal` (`onUnlockComplete → unlocked`) over `children`.

## 6. Firestore data model

All access is UID-scoped; API routes derive `uid` from verified credentials, never from client input.

- `users/{uid}/vault/{siteId}`
  - `siteId = base64url(url)` (`apps/web/app/api/vault/route.ts:21`). Consequence: one document per URL; re-saving the same URL overwrites via `set(..., { merge: true })`.
  - Fields: `name: string`, `url: string`, `username?: string`, `email: string`, `encryptedPassword: string` (Base64), `iv: string` (Base64), `hasWarning: boolean` (extension sets `password.length < 12`), `isFavorite: boolean`, `createdAt?: Timestamp`, `updatedAt: Timestamp` (server `new Date()` on write).
  - `GET /api/vault` orders by `updatedAt desc`, maps to `VaultItemFromAPI` with `createdAt`/`updatedAt` as ISO strings.
  - Alternate client-direct write: `lib/firestore.ts:savePassword()` uses `addDoc(collection(db, "users", uid, "vault"), { ...data, createdAt: serverTimestamp() })` (auto-ID, not `siteId`-keyed).
- `users/{uid}/vaultMeta/main`
  - Shape: `{ verifier: { encrypted: string, iv: string }, createdAt: Date }`.
  - `GET /api/vault/meta/exists` returns the full document (including verifier) so the client can attempt decrypt; `404 { error: "Vault not initialized" }` when absent.

Shared types (`packages/types/src/vault.ts`):

```ts
export type VaultAccount = { id, name, url, email, username?, password, hasWarning, isFavorite };
export type VaultItemFromAPI = { id, name, url, username?, email, encryptedPassword, iv, hasWarning, isFavorite, createdAt?, updatedAt? };
```

`next.config.ts` transpiles `@pm/types` for the web app.

## 7. Vault key lifecycle

Implemented in `apps/web/lib/vault.ts` (web) and mirrored in extension background:

- `setupVault(masterPassword, uid)`: `deriveKey(masterPassword, uid)` → `encryptPassword("vault-check", key)` → `POST /api/vault/setup { verifier: { encrypted, iv } }` → `useVaultStore.setKey(key)` (`isUnlocked: true`).
- `unlockVault(masterPassword, uid)`: `GET /api/vault/meta/exists` → `deriveKey` → `decryptPassword(verifier.encrypted, verifier.iv, key)` → require `=== "vault-check"` → `setKey`; any throw → `Incorrect master password`.
- `doesVaultExist()`: `GET /api/vault/meta/exists`, `res.ok → data.exists`, else `false`.
- Store (`store/vaultStore.ts`): `{ cryptoKey: CryptoKey | null, isUnlocked, refreshCounter, setKey, lock, triggerRefresh }`. `triggerRefresh` bumps `refreshCounter` to refetch lists.

## 8. API reference

All `/api/vault*` routes use `requireAuth`. Error shape is `{ error: string }`.

| Method + path | Auth | Request | Success | Errors |
|---|---|---|---|---|
| `POST /api/auth/login` | ID token in body | `{ idToken: string }` | `200 { success: true }` + `Set-Cookie: session` | `500` on verify/create failure |
| `POST /api/auth/logout` | `session` cookie (optional) | — | `200 { success: true }`, clears cookie | — |
| `GET /api/me` | `session` cookie | — | `200 { user: DecodedIdToken }` | `401 { user: null }` |
| `GET /api/vault` | `requireAuth` | — | `200 VaultItemFromAPI[]` (ordered `updatedAt desc`) | `401` |
| `POST /api/vault` | `requireAuth` | `{ url: string (required), name?, username?, email?, encryptedPassword?, iv?, ... }` | `200 { success: true }`, upsert `vault/{base64url(url)}` | `400 Missing site url`, `401` |
| `POST /api/vault/setup` | session cookie via `verifySessionCookie` | `{ verifier: { encrypted, iv } }` | `200 { success: true }` | `400 Invalid payload`, `401`, `409 Vault already exists`, `500` |
| `GET /api/vault/meta/exists` | `requireAuth` | — | `200 { verifier, createdAt }` | `404 Vault not initialized`, `401` |
| `PATCH /api/vault/[id]/favorite` | `requireAuth` | `{ isFavorite: boolean }` | `200 { success: true }` (`updatedAt` bumped) | `400` missing id / invalid value, `401` |
| `DELETE /api/vault/[id]/delete` | `requireAuth` | — | `200 { success: true }` | `400` missing id, `404` not found, `401` |

Notes: `POST /api/vault` merges on the deterministic `siteId`, so it is an upsert, not append. `DELETE` is the only supported delete verb; there is no `POST .../delete`.

## 9. Web client details

- `app/page.tsx` redirects `/` → `/accounts` (edge guard then applies).
- `password-generator-modal.tsx` collects site metadata and calls the vault POST with client-encrypted payload.
- `vault-setup-modal.tsx` / `vault-unlock-modal.tsx` call `setupVault` / `unlockVault` with `user.uid`.
- `authStore`: `{ user: { uid, email } | null, loading: boolean }`.
- Reads after unlock decrypt locally per item for copy/reveal; ciphertext is never decrypted server-side.

## 10. Extension internals

- Build (`apps/extension/vite.config.ts`): `outDir dist`, `emptyOutDir`, `target es2020`, `minify`, `sourcemap: false`, `publicDir: false`; Rollup inputs `popup/index.html`, `src/background/index.ts`, `src/content/index.ts`; outputs `[name]/index.js`, `chunks/[name]-[hash].js`; alias `@pm/crypto → packages/crypto/dist`; `define __APP_URL__ = JSON.stringify(env.VITE_APP_URL)`; `copy-manifest` plugin on `closeBundle` copies `public/manifest.chrome.json` or `manifest.firefox.json` (selected by `BROWSER === "firefox"`) to `dist/manifest.json`.
- Scripts (`apps/extension/package.json`): `dev: vite`, `build:dev: vite build --mode development`, `build:prod: vite build --mode production`. Build commands: `BROWSER=chrome|firefox pnpm --filter @pm/extension build:prod`.
- Chrome manifest (MV3): `action.default_popup: popup/index.html`, `background.service_worker: background/index.js` (`type: module`), `permissions: [storage, activeTab]`, `host_permissions: [https://passwuts-web.vercel.app/]`, content script `<all_urls> → content/index.js` (`type: module`).
- Firefox manifest (MV2): `browser_action.default_popup`, `background.scripts: [background/index.js]`, `permissions: [storage, activeTab, https://passwuts-web.vercel.app/*]`, `browser_specific_settings.gecko.id: passwuts@passwuts-web.vercel.app`, content script without `type: module`.
- Background protocol (`src/background/index.ts`, `browser.runtime.onMessage`):
  - `VERIFY_AND_UNLOCK_VAULT { masterPassword }` — requires non-expired `idToken` in `storage.local`; `GET __APP_URL__/api/vault/meta/exists` with Bearer; `needsSetup: true` when not ok; derives `uid` from JWT `user_id` claim, decrypts verifier, `setVaultKey` on `"vault-check"`.
  - `GET_ACTIVE_SITE_INFO` — returns `{ url: origin, name: hostname sans www }` for active tab.
  - `GENERATE_PASSWORD` — returns `generateSecurePassword(16)` (printable ASCII charset, `crypto.getRandomValues` modulo indexing).
  - `GENERATE_AND_SAVE_PASSWORD { payload: { name, url, username, email, password } }` — requires unlocked key + valid token; encrypts, `POST __APP_URL__/api/vault` with Bearer, `hasWarning: password.length < 12`, `isFavorite: false`.
  - `GET_CREDENTIALS_FOR_SITE` — requires key + token; `GET /api/vault` with Bearer; exact `origin` match; decrypts and returns `{ found, name, username, email, password }`.
  - `VAULT_LOCK` — `clearVaultKey()`.
- Token helpers (`tokenHelpers.ts`): `isTokenExpired` decodes JWT `exp` (`exp*1000 < Date.now()`; unparseable → expired); `checkAuthToken` runs at startup and every 60s, clears `idToken` + key and emits `SESSION_EXPIRED`.
- Storage (`shared/authStorage.ts`): `storeToken` writes `{ idToken, loggedInAt: Date.now() }`; `getToken`/`clearToken` manage `browser.storage.local`.
- Key store (`shared/vaultStore.ts`): module-level `cryptoKey` + `unlockedAt`; `getVaultKey` returns `null` and clears after 5 minutes.
- Content entry `src/content/index.ts` is currently empty (0 bytes); build still emits `content/index.js` referenced by both manifests.

## 11. Shared crypto package

`packages/crypto/src/index.ts` (WebCrypto `SubtleCrypto` only; no dependency):

- `deriveKey(masterPassword: string, salt: string): Promise<CryptoKey>` — `importKey("raw", UTF8(password), "PBKDF2", false, ["deriveKey"])` → `deriveKey({ name: "PBKDF2", salt: UTF8(salt), iterations: 100_000, hash: "SHA-256" }, keyMaterial, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"])`.
- `encryptPassword(password: string, key: CryptoKey): Promise<{ encryptedPassword: string; iv: string }>` — 12-byte IV, `encrypt({ name: "AES-GCM", iv }, key, UTF8(password))`, Base64 outputs.
- `decryptPassword(encryptedPassword: string, iv: string, key: CryptoKey): Promise<string>` — Base64 → bytes, `decrypt`, UTF-8 decode; throws on auth failure.

```ts
import { deriveKey, encryptPassword, decryptPassword } from "@pm/crypto";
const key = await deriveKey(masterPassword, uid);
const { encryptedPassword, iv } = await encryptPassword("s3cret", key);
const plain = await decryptPassword(encryptedPassword, iv, key);
```

Requires WebCrypto global (browsers; Node 18+). Ciphertext/IV are Base64 strings for Firestore/JSON transport.

## 12. Configuration

Web (`apps/web/.env.local`; no `.env.example` committed):

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

- Client vars feed `lib/Firebase/initialize.ts`; server vars feed `lib/firebaseAdmin.ts` (escape newlines as `\n`).
- Extension (`apps/extension/.env`): `VITE_APP_URL=<web origin>` (e.g. `http://localhost:3000` local, `https://passwuts-web.vercel.app` prod). Injected at build as `__APP_URL__`.

Firebase console prerequisites: Email/Password (or chosen) provider enabled; Web App config copied to `NEXT_PUBLIC_*`; Service Account JSON mapped to `FIREBASE_*`; Firestore Native mode with `users/{uid}/vault`, `users/{uid}/vaultMeta/main`.

## 13. Local development and scripts

```
pnpm install
# create apps/web/.env.local and apps/extension/.env per §12
pnpm --filter web dev        # next dev -> http://localhost:3000
pnpm --filter web build      # next build (standalone)
pnpm --filter web lint       # eslint .
pnpm --filter @pm/extension dev         # vite dev (popup iteration)
BROWSER=chrome pnpm --filter @pm/extension build:prod   # dist + chrome manifest
BROWSER=firefox pnpm --filter @pm/extension build:prod  # dist + firefox manifest
```

Root `package.json`: `dev: pnpm --filter web dev`, `build: pnpm --filter web build`. `@pm/crypto`: `build: tsc`.

Load unpacked: Chrome `chrome://extensions` (Developer mode) → `apps/extension/dist`; Firefox `about:debugging#/runtime/this-firefox` → `dist/manifest.json`. For full extension testing use `dist` output, not Vite dev server. Sign in on the web app first, then initialize/unlock the vault before saving entries.

## 14. Deployment

- Web: Vercel. Set all §12 web vars in the project environment, then `pnpm --filter web build` (automatic on Vercel deploy). Production origin referenced by extension manifests: `https://passwuts-web.vercel.app/`.
- Extension: unpublished. Distribute via `build:prod` + manual unpacked/temporary load per §13.

## 15. Known technical limits

- Deterministic vault doc ID (`base64url(url)`) allows only one entry per exact URL string; query path uses exact `origin` match in the extension.
- `GET /api/vault/meta/exists` discloses the verifier ciphertext to any holder of a valid session/bearer token (required for client-side unlock).
- `secure: true` session cookie is not set over plain HTTP; local development over `http://localhost` may need HTTPS or a cookie-flag adjustment.
- Web has no idle auto-lock; extension auto-locks after 5 minutes and on JWT `exp`.
- No multi-user sharing, rotation, attachment, or admin recovery flows.
