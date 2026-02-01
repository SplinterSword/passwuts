# Passwuts – Password Manager (Web + Browser Extension)

Passwuts is a modern, client-first password generator and vault built with Next.js App Router. It uses Firebase Authentication and Firestore with a secure, user-held encryption model: passwords are encrypted/decrypted in the browser using a key derived from the user's master password. The server never sees the plaintext passwords or the user's encryption key.

## Features
- **Client-side encryption** using Web Crypto (`AES-GCM`) and PBKDF2 key derivation.
- **Password vault** per user stored in Firestore (`users/{uid}/vault`).
- **Master password verifier** stored server-side (`users/{uid}/vaultMeta/main`) to prevent master password reset attacks.
- **Favorites** and quick actions (copy username/password, toggle visibility, open URL).
- **Session-cookie auth** for API routes using Firebase Admin SDK.
- **Route protection** for app pages (client guard + middleware-style proxy).
- **Shadcn/UI + Tailwind CSS v4** for a clean, responsive UI.
- **Analytics (optional)** via `@vercel/analytics`.

## Problem it solves
- **Rampant password reuse**: Many people reuse the same or weak passwords across sites, dramatically increasing breach impact when one site is compromised.
- **Limited built-in generators**: The built-in Chrome password generator is Chrome-only. Users on Firefox and other browsers lack a consistent, portable way to generate and manage strong passwords.
- **Cross-browser, third‑party solution**: Passwuts provides a browser-agnostic manager with client-side encryption and a companion web app. The extension works across major browsers, so everyone can create and use secure passwords regardless of their browser.

## How I built it
- **Architecture & monorepo**
  - Chose a pnpm workspace to host a Next.js web app (apps/web), a Vite browser extension (apps/extension), and shared packages (packages/crypto).
  - Shared crypto logic lives in an internal package `@pm/crypto` to keep the encryption API consistent across web and extension.

- **Security model first**
  - Implemented client-side encryption with Web Crypto: PBKDF2 (SHA-256, 100k iterations) derives a 256-bit AES-GCM key from a master password and per-user salt.
  - Designed a vault verifier stored in Firestore (`vaultMeta`) so the client can confirm the correct key without revealing it.
  - Server only stores ciphertext + IV; plaintext and keys never leave the client.

- **Authentication & sessions**
  - Frontend authenticates with Firebase client SDK and obtains a short-lived ID token.
  - `/api/auth/login` exchanges that ID token for a long-lived, httpOnly, secure session cookie via Firebase Admin SDK.
  - API routes verify the session cookie on each request to guard Firestore access by user UID.

- **Web app UX**
  - Used shadcn/ui, Radix, and Tailwind v4 for accessible, responsive components.
  - Implemented guards: an `AuthProvider` to hydrate user state from `/api/me`, a layout guard for auth, and a `VaultGate` to ensure the vault is initialized/unlocked before accessing pages.
  - Added quality-of-life features: favorites, copy-to-clipboard with inline feedback, and masked/unmasked passwords.

- **API design & data model**
  - Firestore layout: `users/{uid}/vault` for items, `users/{uid}/vaultMeta/main` for the verifier.
  - RESTful endpoints for listing/creating items, setup, existence checks, and toggling favorites.

- **Browser extension**
  - Built with Vite into three entries (popup, background, content) and selected the proper manifest per target (`BROWSER=chrome|firefox`).
  - Reused the same Firebase client setup and `@pm/crypto` primitives for consistent auth and encryption behavior.

- **Tooling & DX**
  - TypeScript across the codebase, strict configs, and path aliases.
  - pnpm filters for targeted builds/dev flows; Vercel for deploying the web app.

## Tech Stack
- **Framework**: Next.js 16 App Router, React 19, TypeScript
- **UI**: Tailwind CSS v4, shadcn/ui, Radix UI, lucide-react icons
- **State**: Zustand
- **Auth/DB**: Firebase (client SDK) + Firebase Admin (server) + Firestore
- **Validation**: zod, react-hook-form

## Monorepo Structure
This is a pnpm workspace with a web app and a browser extension.

```
apps/
  web/                  -> Next.js app (primary web UI)
  extension/            -> Browser extension (Chrome/Firefox) built with Vite
packages/
  crypto/               -> Shared crypto utilities (internal: @pm/crypto)
  types/                -> Shared types
```

### apps/web (Next.js)
```
app/
  page.tsx              -> redirects to /login
  layout.tsx            -> global layout, loads AuthProvider
  (app)/
    layout.tsx          -> authenticated layout + VaultGate
    accounts/page.tsx   -> accounts grid UI
  api/
    auth/login/route.ts -> creates long-lived session cookie from Firebase ID token
    auth/logout/route.ts-> revokes session and clears cookie
    me/route.ts         -> returns current user from session cookie
    vault/route.ts      -> GET (list), POST (add) encrypted vault items
    vault/setup/route.ts-> stores initial vault verifier metadata
    vault/meta/exists   -> checks if vault exists for user
    vault/[id]/favorite -> PATCH favorite state (see client usage)
components/
  AuthProvider.tsx      -> loads user from /api/me into Zustand
  ClientGuard.tsx       -> client-side guard (used by pages)
  VaultGate.tsx         -> ensures vault is initialized/unlocked
  header.tsx, password-generator-modal.tsx, vault-setup-modal.tsx, vault-unlock-modal.tsx ui/*
lib/
  Firebase/initialize.ts-> Firebase client SDK init (NEXT_PUBLIC_* envs)
  firebaseAdmin.ts      -> Admin SDK init (service account envs)
  verify-admin-token.ts -> session cookie verification helper
  crypto.ts             -> deriveKey, encryptPassword, decryptPassword
store/
  authStore.ts, vaultStore.ts
proxy.ts                -> middleware-like guard for /accounts (matcher config)
```

### apps/extension (Vite)
```
public/
  manifest.chrome.json  -> MV3 manifest for Chromium
  manifest.firefox.json -> Manifest for Firefox (background as scripts)
src/
  background/index.ts   -> background script entry
  content/index.ts      -> content script entry
  popup/*               -> popup UI
shared/firebase.ts      -> Firebase client init (VITE_* envs)
vite.config.ts          -> builds popup, background, content; copies manifest
dist/                   -> build output (load as unpacked extension)
```

## Security Model
- The encryption key is derived from the user's master password using PBKDF2 with a per-user salt. The key never leaves the browser.
- Passwords are encrypted with `AES-GCM` and a randomly generated IV before being sent to the server. The server only stores ciphertext and IV in Firestore.
- A vault “verifier” (encrypted check value + IV) is stored in `vaultMeta` to confirm the correct key on unlock without revealing the key or password.
- API routes require a valid Firebase session cookie; the cookie is httpOnly, secure, same-site strict.

## Prerequisites
- Node.js 18+ (recommended 20+)
- A Firebase project with:
  - Web App credentials (client SDK) for the frontend
  - Service Account credentials (Admin SDK) for server-side session verification and Firestore access
  - Firestore enabled (in Native mode)

## Environment Variables

### Web app (apps/web)
Create `apps/web/.env.local` with the following keys.

Client (exposed):
```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

Server (Admin SDK):
```
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
# Note: Make sure to escape newlines with \n if pasting JSON key material
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Notes:
- These values populate `apps/web/lib/Firebase/initialize.ts` (client SDK) and `apps/web/lib/firebaseAdmin.ts` (Admin SDK).
- If deploying on a platform like Vercel, set these as project environment variables for the web app.

### Browser extension (apps/extension)
Create `apps/extension/.env` with the following keys (Vite format):

```
VITE_APP_URL=YOUR_WEB_APP_URL
```

## Getting Started (Local Dev)
This is a pnpm workspace.

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Configure env files for the web app and optionally the extension as shown above.
3. Run the web app dev server:
   ```bash
   pnpm --filter web dev
   ```
4. Open http://localhost:3000. You’ll be redirected to `/login`; on success the client posts the ID token to `/api/auth/login` which issues a long-lived session cookie.
5. Navigate to `/accounts` to view and manage entries once the vault is initialized/unlocked.

## Common Scripts
- `pnpm --filter web dev` – start Next.js dev server
- `pnpm --filter web build` – build the web app for production
- `pnpm --filter @pm/extension dev` – run Vite dev for the extension
- `pnpm --filter @pm/extension build` – build the extension into `apps/extension/dist`

## Firebase Setup Tips
- Enable Email/Password or your chosen providers in Firebase Authentication.
- Create a Web App in the Firebase console and copy the config into the NEXT_PUBLIC_* variables.
- Create a Service Account key (JSON) for the Admin SDK; use its fields for `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.
- Ensure Firestore is enabled. Collections used:
  - `users/{uid}/vault` for encrypted entries
  - `users/{uid}/vaultMeta/main` for the verifier document

## API Overview
- `POST /api/auth/login` – body `{ idToken }`; verifies token and sets `session` cookie
- `POST /api/auth/logout` – revokes tokens, clears `session` cookie
- `GET /api/me` – returns `{ user }` from verified session
- `GET /api/vault` – list encrypted items for current user
- `POST /api/vault` – add a new encrypted item (expects fields including `encryptedPassword`, `iv`, metadata)
- `POST /api/vault/setup` – save vault verifier on first-time setup
- `GET /api/vault/meta/exists` – returns whether the user's vault has been initialized
- `PATCH /api/vault/:id/favorite` – toggle favorite (see client code)

All `/api/vault*` routes require a valid `session` cookie. See `lib/verify-admin-token.ts` and `lib/firebaseAdmin.ts`.

## UI/UX Notes
- Password visibility toggling and clipboard copy with inline feedback
- Favorites sorting keeps starred items on top
- Responsive grid and modern design via shadcn/ui + Tailwind v4

## Browser Extension
- The extension is in `apps/extension` and builds three entries: popup, background, and content scripts. `vite.config.ts` emits files into predictable folders (popup/, background/, content/).
- The manifest is selected based on `BROWSER` env when building:
  - `BROWSER=chrome pnpm --filter @pm/extension build` → copies `public/manifest.chrome.json` to `dist/manifest.json`
  - `BROWSER=firefox pnpm --filter @pm/extension build` → copies `public/manifest.firefox.json` to `dist/manifest.json`

### Load in Chrome (Developer Mode)
1. Build: `BROWSER=chrome pnpm --filter @pm/extension build`
2. Open chrome://extensions, enable Developer mode
3. Click “Load unpacked” and select `apps/extension/dist`

### Load in Firefox (about:debugging)
1. Build: `BROWSER=firefox pnpm --filter @pm/extension build`
2. Open about:debugging#/runtime/this-firefox
3. Click “Load Temporary Add-on…” and select `apps/extension/dist/manifest.json`

### Dev mode
- You can run `pnpm --filter @pm/extension dev` to iterate; for full extension testing you’ll typically build and load the `dist` output.

## Internal package: @pm/crypto
Shared crypto utilities used by both web and extension. Uses the Web Crypto SubtleCrypto API.

### API
- `async deriveKey(masterPassword: string, salt: string): Promise<CryptoKey>`
  - Derives an AES-GCM 256-bit key using PBKDF2 with SHA-256 and 100,000 iterations.
  - Returns a `CryptoKey` with usages `encrypt` and `decrypt`.

- `async encryptPassword(password: string, key: CryptoKey): Promise<{ encryptedPassword: string; iv: string }>`
  - Encrypts the UTF-8 `password` with `AES-GCM` using a random 12-byte IV.
  - Returns Base64 strings: `encryptedPassword` and `iv`.

- `async decryptPassword(encryptedPassword: string, iv: string, key: CryptoKey): Promise<string>`
  - Decrypts Base64-encoded ciphertext with `AES-GCM` and the provided IV.
  - Throws if authentication fails (wrong key/iv or corrupted data).

### Usage example
```ts
import { deriveKey, encryptPassword, decryptPassword } from "@pm/crypto";

const key = await deriveKey(masterPassword, userSalt);
const { encryptedPassword, iv } = await encryptPassword("s3cret", key);
const plain = await decryptPassword(encryptedPassword, iv, key);
```

### Notes
- Web Crypto is available in modern browsers and recent Node runtimes. For Node, ensure a compatible version (v18+ recommended) and a Web Crypto global is available.
- Ciphertext and IV are Base64 strings for transport/storage convenience.

## Deployment
- The Next.js web app is deployed using Vercel. Ensure project environment variables are configured in Vercel, then build with `pnpm --filter web build` (Vercel will build automatically on deploy).
- The browser extension will be deployed/published later. For now, build as described above and load it as an unpacked/temporary add-on during development.

## Video
https://github.com/user-attachments/assets/1cc351fa-696f-4e55-ab0d-6815a423ffb8



