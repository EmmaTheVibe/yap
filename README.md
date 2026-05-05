# Yapp

Yapp is an end-to-end encrypted messaging client built with Next.js. Messages are encrypted in the browser before they leave the device, and decrypted only after they return to an authenticated recipient device. The backend stores and forwards encrypted payloads; it does not receive message plaintext.

## Features

- Secure registration and login with access and refresh tokens
- Client-side RSA-OAEP key generation
- Password-wrapped private key recovery with PBKDF2 and AES-KW
- AES-GCM message encryption with a fresh symmetric key per message
- Encrypted key copy for the recipient and for the sender
- Conversation list, user search, message history, and responsive chat UI
- Unlock screen after reload so the private key is restored into memory only after password entry
- Same-origin Next.js proxy for the WhisperBox API to avoid browser CORS failures

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Web Crypto API
- IndexedDB via `idb`
- WhisperBox API: `https://whisperbox.koyeb.app`

## Architecture

```txt
Browser
  |
  |  Register/Login
  v
Auth UI
  |
  |  generate RSA keys, wrap/unwrap private key
  v
Web Crypto API
  |
  |  encrypted payloads only
  v
Next.js app
  |
  |  /api/whisper/* proxy
  v
WhisperBox Backend
  |
  |  stores public keys, wrapped private keys, ciphertext, tokens
  v
Encrypted message store
```

Core client modules:

- `components/auth/*`: login and registration folders
- `components/shared/SessionContext.tsx`: session restore, unlock, logout, websocket connection
- `components/chat/useChatController.ts`: conversation loading, message encryption/decryption, sending, realtime handling
- `lib/crypto.ts`: all Web Crypto operations
- `lib/storage.ts`: IndexedDB storage for wrapped session data
- `lib/api.ts`: authenticated REST client with refresh handling
- `app/api/whisper/[...path]/route.ts`: same-origin proxy to WhisperBox

## Encryption Flow

### Registration

1. The browser generates an RSA-OAEP 2048-bit keypair.
2. The public key is exported as base64.
3. The browser generates a random PBKDF2 salt.
4. The user password and salt derive an AES-KW wrapping key.
5. The RSA private key is wrapped with AES-KW.
6. The app sends the username, password, public key, wrapped private key, and salt to the backend.

The raw private key is never sent to the server.

### Login and Unlock

1. The user logs in with username and password.
2. The API returns tokens and the user's wrapped private key metadata.
3. The browser derives the AES-KW wrapping key from the password and salt.
4. The wrapped private key is unwrapped into a non-extractable `CryptoKey`.
5. The usable private key lives in memory for the active session.

On refresh, Yapp shows an unlock screen. It stores enough encrypted session data to restore access, but requires the password before the private key is usable again.

### Sending Messages

1. The sender fetches the recipient public key.
2. The browser generates a random AES-GCM 256-bit key.
3. The message plaintext is encrypted with AES-GCM and a random IV.
4. The AES key is encrypted with the recipient RSA-OAEP public key.
5. The same AES key is also encrypted with the sender public key so sent messages can be read by the sender.
6. Only this encrypted payload is sent to the backend:

```json
{
  "ciphertext": "...",
  "iv": "...",
  "encryptedKey": "...",
  "encryptedKeyForSelf": "..."
}
```

### Receiving Messages

1. The client receives an encrypted message payload from history or realtime delivery.
2. If the current user is the sender, it decrypts `encryptedKeyForSelf`.
3. Otherwise, it decrypts `encryptedKey`.
4. The recovered AES-GCM key decrypts the ciphertext.
5. Decryption failures are shown as unreadable encrypted messages instead of crashing the UI.

## Key Management

Each user has:

- Public key: stored on the backend and used by other users for encryption.
- Wrapped private key: stored encrypted with a password-derived AES-KW key.
- Private key: unwrapped only on the client and kept as an in-memory `CryptoKey`.

IndexedDB stores:

- `wrapped_private_key`
- `pbkdf2_salt`
- `refresh_token`
- `user_id`

IndexedDB does not store plaintext messages or an exported raw private key.

## API Usage

The app uses the WhisperBox API through a local Next.js route proxy:

```txt
Browser -> /api/whisper/conversations
Next.js -> https://whisperbox.koyeb.app/conversations
```

Authenticated requests include:

```txt
Authorization: Bearer <access_token>
```

Access tokens are refreshed with `/auth/refresh` when needed. Realtime delivery uses the documented websocket endpoint:

```txt
wss://whisperbox.koyeb.app/ws?token=<access_token>
```

## Security Decisions

- Message plaintext is never sent to the backend.
- Private keys are generated in the browser.
- Raw private keys are never hardcoded or sent over the network.
- Private key recovery requires the account password.
- The usable private key is held in memory, not exported into persistent storage.
- Message encryption uses AES-GCM with random keys and IVs.
- Key wrapping uses PBKDF2 and AES-KW.
- The app avoids `localStorage` for sensitive session material.

## Trade-offs and Limitations

- No forward secrecy: if a private key is compromised, old encrypted AES keys may be decrypted.
- No explicit replay protection in the client beyond backend message IDs and timestamps.
- No encrypted local message cache.
- No attachments or media encryption.
- Password recovery is not supported; losing the password means losing access to decrypt old messages.
- WebSocket delivery depends on backend connection state, so the app falls back to REST sending when the socket is unavailable.
- The Next.js proxy is a CORS workaround for browser development and deployment compatibility.

## Running Locally

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

Build for production:

```bash
npm run build
```

Run lint:

```bash
npm run lint
```

## Submission Notes

The core E2EE flow is implemented on the client with Web Crypto. The backend receives only public keys, wrapped private keys, tokens, and encrypted message payloads. Conversation discovery uses `/conversations`; if unavailable, users can still search for a user and load that direct message history through `/conversations/{userId}/messages`.
