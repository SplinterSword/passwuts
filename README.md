# Passwuts – Password Generator and Vault

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

## Tech Stack
- **Framework**: Next.js 16 App Router, React 19, TypeScript
- **UI**: Tailwind CSS v4, shadcn/ui, Radix UI, lucide-react icons
- **State**: Zustand
- **Auth/DB**: Firebase (client SDK) + Firebase Admin (server) + Firestore
- **Validation**: zod, react-hook-form

## Project Structure
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
  vault.ts, firestore.ts, utils.ts
store/
  authStore.ts, vaultStore.ts
proxy.ts                -> middleware-like guard for /accounts (matcher config)
```

## Security Model
- The encryption key is derived from the user's master password using PBKDF2 with a per-user salt. The key never leaves the browser.
- Passwords are encrypted with `AES-GCM` before being sent to the server. The server only stores ciphertext and IV in Firestore.
- A vault “verifier” (encrypted check value + IV) is stored in `vaultMeta` to confirm the correct key on unlock without revealing the key or password.
- API routes require a valid Firebase session cookie; the cookie is httpOnly, secure, same-site strict.

## Prerequisites
- Node.js 18+ (recommended 20+)
- A Firebase project with:
  - Web App credentials (client SDK) for the frontend
  - Service Account credentials (Admin SDK) for server-side session verification and Firestore access
  - Firestore enabled (in Native mode)

## Environment Variables
Create `.env.local` in the project root with the following keys.

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
- These values populate `lib/Firebase/initialize.ts` (client SDK) and `lib/firebaseAdmin.ts` (Admin SDK).
- If deploying on a platform like Vercel, set these as project environment variables.

## Getting Started (Local Dev)
1. Install dependencies:
   ```bash
   npm install
   ```
2. Add `.env.local` with the variables above.
3. Run the dev server:
   ```bash
   npm run dev
   ```
4. Open http://localhost:3000. You’ll be redirected to `/login` where Firebase Auth UI/flow should authenticate the user; on success the client posts the ID token to `/api/auth/login` which issues a long-lived session cookie.
5. Navigate to `/accounts` to view and manage entries once the vault is initialized/unlocked.

## Common Scripts
- `npm run dev` – start Next.js dev server
- `npm run build` – build for production
- `npm start` – run production build
- `npm run lint` – run ESLint

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
- `PATCH /api/vault/:id/favorite` – toggle favorite (see client code)

All `/api/vault*` routes require a valid `session` cookie. See `lib/verify-admin-token.ts` and `lib/firebaseAdmin.ts`.

## UI/UX Notes
- Password visibility toggling and clipboard copy with inline feedback
- Favorites sorting keeps starred items on top
- Responsive grid and modern design via shadcn/ui + Tailwind v4

## Deployment
- Build with `npm run build` and run `npm start`, or deploy to Vercel.
- Set the same environment variables in your hosting platform.
