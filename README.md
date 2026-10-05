# Passwuts

Generate strong passwords anywhere, keep them zero-knowledge everywhere — web vault + browser extension, your key never leaves your device.

![Passwuts demo](https://github.com/user-attachments/assets/1cc351fa-696f-4e55-ab0d-6815a423ffb8)
<!-- Video demo above. Full explanation: https://youtu.be/G1m7K7ZG1M0 -->

## Video Explanation
[Youtube Link](https://youtu.be/G1m7K7ZG1M0)

## What is this?

You know that feeling? You reuse the same 2 passwords everywhere, Chrome offers a generator but Firefox doesn't, and every new device means lost logins or a plaintext notes file. Passwuts fixes that.

Passwuts is three small pieces that work together:

1. **A Next.js app** (`apps/web`) — vault UI, generator, Firebase session-cookie auth, Firestore-backed API.
2. **A Vite extension** (`apps/extension`) — popup / background / content, one build for Chrome and Firefox.
3. **Shared crypto + Firebase** — `@pm/crypto` (PBKDF2 + AES-GCM) and Firestore (`users/{uid}/vault`, `users/{uid}/vaultMeta/main`).

The trick is simple: set one master password and Passwuts derives a 256-bit key in your browser (PBKDF2-SHA256, 100k iterations). Every password is encrypted with AES-GCM + random 12-byte IV before it hits the server. Then unlocking on any device is just re-derive + decrypt the verifier. So the server only ever sees ciphertext + IV, for every login you save.

         Think 1Password, but you hold the key.

## Motivation

Password reuse is still the breach multiplier — one leak compromises everything — `grep`-ing a notes file finds text, not security, and built-in generators don't travel across browsers, so people fall back to weak, repeated passwords.

- Shared primitives: one `@pm/crypto` package, same encrypt/decrypt on web and extension.
- Faster logins: generate → save once in `/accounts`, reuse from the popup instead of remembering 50 passwords.
- Stay in flow: favorites on top, copy username/password, toggle visibility, open URL without tab-hopping.

## Quick Start

First visit this link: [https://passwuts-web.vercel.app/](https://passwuts-web.vercel.app/)

No install needed — just a browser and a Firebase login. For local dev, have a Firebase project ready.

### 1. Sign in

Open the live link above → Sign up / Sign in → you'll land on `/login` then `/accounts`. The client posts the Firebase ID token to `/api/auth/login`, which sets an `httpOnly Secure SameSite=Strict` session cookie.

### 2. Set up your vault

- First visit triggers `vault-setup-modal.tsx` → pick a master password
- Passwuts derives your key + stores an encrypted verifier at `users/{uid}/vaultMeta/main` (`POST /api/vault/setup`)
- Returning visits trigger `vault-unlock-modal.tsx` → same master password re-derives the key locally

### 3. Save and reuse logins

- Stay on `/accounts` → open the generator (`password-generator-modal.tsx`) → save site + username + encrypted password (`POST /api/vault`)
- Star what you use daily → `PATCH /api/vault/:id/favorite` keeps it on top
- Copy / reveal / open URL inline, delete via `DELETE /api/vault/:id/delete`

### 4. Extension, team model, and keys

- `apps/extension` — popup for lookup, content script for pages, background for session; same `@pm/crypto` decrypt path
- No sharing / orgs yet — one Firebase user = one vault (`GET /api/vault` is UID-scoped)
- No key recovery — if you lose the master password the ciphertext can't be decrypted

See `## Usage` below for the daily loop. Want to run it locally instead? See `## Contributing`.

## Usage

Available pages (auth required via `proxy.ts` + `AuthProvider` + `VaultGate`):

- `/login` — Firebase client sign-in, exchanges ID token for session cookie
- `/accounts` — vault grid UI, generator modal, setup/unlock gates, favorites sorted first
- `/extension` — helper page under `(auth)/extension` for extension handoff
- `/api/auth/login` — body `{ idToken }` → sets `session` cookie
- `/api/auth/logout` — revokes tokens, clears cookie
- `/api/me` — returns `{ user }` from verified session
- `/api/vault` — `GET` list, `POST` add `{ encryptedPassword, iv, ...metadata }`
- `/api/vault/setup` — saves initial verifier
- `/api/vault/meta/exists` — has this user initialized a vault?
- `/api/vault/[id]/favorite` — `PATCH` favorite state
- `/api/vault/[id]/delete` — `DELETE` entry

Behavior notes:

- Zero-knowledge by construction — `deriveKey` / `encryptPassword` / `decryptPassword` run in WebCrypto, key is non-extractable, never sent.
- Verifier model — wrong master password fails AES-GCM auth on decrypt, no plaintext oracle.
- All `/api/vault*` routes verify the session cookie per-request (`lib/verify-admin-token.ts` + `lib/firebaseAdmin.ts`).
- Extension upload/build goes via Vite `dist/`, load unpacked — no store publish yet.

> [!NOTE]
> **Master password = encryption key.** There is no reset flow by design. Lose it and vault items are unrecoverable.

## Examples

Generate and save a login:

```text
/accounts > New > "github.com" + username + Generate(20, symbols)
-> AES-GCM encrypt in browser -> POST /api/vault { encryptedPassword, iv }
-> appears in grid, star to pin to top
```

Unlock on a new device:

```text
/login > sign in with Firebase > Vault locked
-> enter master password -> deriveKey(password, uid-salt) -> decrypt verifier
-> GET /api/vault -> decrypt rows locally for copy/reveal
```

Use the extension:

```text
Build: BROWSER=chrome pnpm --filter @pm/extension build:prod
Chrome: chrome://extensions > Load unpacked > apps/extension/dist
Firefox: about:debugging > Load Temporary Add-on > dist/manifest.json
```

## What's in the repo?

```
pnpm-workspace.yaml        -> apps/web, apps/extension, packages/*
Passwuts.drawio / Passwuts Archetectural Diagram.drawio -> architecture diagrams
Technical_Documentation.md  -> architecture, security model, API, decisions
packages/
  crypto/src/index.ts       -> deriveKey, encryptPassword, decryptPassword (@pm/crypto)
  types/                    -> shared types (@pm/types)
apps/web/
  app/page.tsx              -> redirects to /login
  app/layout.tsx            -> global layout + AuthProvider
  app/(app)/layout.tsx       -> authed layout + VaultGate
  app/(app)/accounts/        -> vault grid UI
  app/(auth)/login/ + extension/ -> sign-in, extension helper
  app/api/auth/login|logout/ -> session cookie issue / revoke
  app/api/me/               -> current user from session
  app/api/vault/route.ts    -> GET list, POST add
  app/api/vault/setup/      -> initial verifier save
  app/api/vault/meta/exists/-> vault initialized check
  app/api/vault/[id]/favorite|delete/ -> star, remove
  components/               -> AuthProvider, ClientGuard, VaultGate, header, password-generator-modal, vault-setup-modal, vault-unlock-modal, ui/*
  lib/                      -> Firebase/initialize.ts, firebaseAdmin.ts, verify-admin-token.ts, firestore.ts, vault.ts
  store/                    -> authStore.ts, vaultStore.ts (zustand)
  proxy.ts                  -> guards /accounts/* -> /login when no session
apps/extension/
  public/manifest.chrome.json / manifest.firefox.json -> MV3 / Firefox manifests
  src/popup/*               -> popup UI
  src/background/ + src/content/ -> background + content entries
  shared/firebase.ts        -> Firebase client init (VITE_* envs)
  vite.config.ts            -> popup/background/content build + manifest copy
  dist/                     -> build output (load as unpacked extension)
```

## For more technical info

Skipping the deep dive here on purpose. For security model, Firestore layout, session flow, extension builds, challenges, and deployment — checkout `Technical_Documentation.md` and the `.drawio` diagrams.

## Contributing

### Clone the repo

```bash
git clone https://github.com/SplinterSword/passwuts.git
cd passwuts
```

### Local dev

Prereqs: Node.js 18+ (20+ recommended), pnpm 10+, a Firebase project with Auth + Firestore Native mode enabled.

```bash
pnpm install
# create apps/web/.env.local (see below)
# create apps/extension/.env (see below)
pnpm --filter web dev
```

Condensed env — full table lives in `Technical_Documentation.md`:

```bash
# apps/web/.env.local
NEXT_PUBLIC_FIREBASE_API_KEY= / NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID= / NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID= / NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
FIREBASE_PROJECT_ID= / FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# apps/extension/.env
VITE_APP_URL=http://localhost:3000
```

Starts Next.js on `http://localhost:3000`. Sign in, set a master password on a test account first — vault ciphertext is per-user.

Point the extension at local: build with `VITE_APP_URL=http://localhost:3000`, then:

```bash
BROWSER=chrome pnpm --filter @pm/extension build:prod  # -> apps/extension/dist/manifest.json
BROWSER=firefox pnpm --filter @pm/extension build:prod # -> firefox manifest variant
```

Load in Chrome via `chrome://extensions` → Load unpacked → `apps/extension/dist`. Load in Firefox via `about:debugging` → Load Temporary Add-on → `dist/manifest.json`.

### Run checks

```bash
pnpm --filter web lint    # eslint
pnpm --filter web build   # production build
pnpm --filter @pm/extension build:prod # extension bundle check
```

### Submit a pull request

Fork the repo and open a PR to `main`. Keep it scoped — one feature / fix per PR.
