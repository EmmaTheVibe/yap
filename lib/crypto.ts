const BASE64 = {
  encode: (buf: ArrayBuffer) => {
    const bytes = new Uint8Array(buf);
    const chunkSize = 0x8000;
    let binary = "";

    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }

    return btoa(binary);
  },
  decode: (b64: string) => {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    return bytes.buffer;
  },
};

const WRAPPED_PRIVATE_KEY_VERSION = "akw1";

export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"],
  );
}

export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const buf = await crypto.subtle.exportKey("spki", key);
  return BASE64.encode(buf);
}

export async function importPublicKey(b64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "spki",
    BASE64.decode(b64),
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"],
  );
}

export function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return BASE64.encode(salt.buffer);
}

async function deriveWrappingKey(
  password: string,
  saltB64: string,
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: BASE64.decode(saltB64),
      iterations: 100_000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-KW", length: 256 },
    false,
    ["wrapKey", "unwrapKey"],
  );
}

export async function wrapPrivateKey(
  privateKey: CryptoKey,
  password: string,
  saltB64: string,
): Promise<string> {
  const wrappingKey = await deriveWrappingKey(password, saltB64);
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", privateKey);
  const pkcs8Bytes = new Uint8Array(pkcs8);
  const padLength = (8 - (pkcs8Bytes.byteLength % 8)) % 8;
  const paddedPkcs8 = new Uint8Array(pkcs8Bytes.byteLength + padLength);
  paddedPkcs8.set(pkcs8Bytes);

  const containerKey = await crypto.subtle.importKey(
    "raw",
    paddedPkcs8,
    { name: "HMAC", hash: "SHA-256" },
    true,
    ["sign"],
  );
  const wrapped = await crypto.subtle.wrapKey(
    "raw",
    containerKey,
    wrappingKey,
    "AES-KW",
  );
  return `${WRAPPED_PRIVATE_KEY_VERSION}.${padLength}.${BASE64.encode(wrapped)}`;
}

export async function unwrapPrivateKey(
  wrappedB64: string,
  password: string,
  saltB64: string,
): Promise<CryptoKey> {
  const wrappingKey = await deriveWrappingKey(password, saltB64);

  if (wrappedB64.startsWith(`${WRAPPED_PRIVATE_KEY_VERSION}.`)) {
    const [, padLengthRaw, wrappedKeyB64] = wrappedB64.split(".");
    const padLength = Number(padLengthRaw);

    if (!Number.isInteger(padLength) || padLength < 0 || padLength > 7) {
      throw new Error("Invalid wrapped private key metadata");
    }

    const containerKey = await crypto.subtle.unwrapKey(
      "raw",
      BASE64.decode(wrappedKeyB64),
      wrappingKey,
      "AES-KW",
      { name: "HMAC", hash: "SHA-256" },
      true,
      ["sign"],
    );
    const paddedPkcs8 = await crypto.subtle.exportKey("raw", containerKey);
    const paddedBytes = new Uint8Array(paddedPkcs8);
    const pkcs8Bytes =
      padLength > 0 ? paddedBytes.slice(0, -padLength) : paddedBytes;

    return crypto.subtle.importKey(
      "pkcs8",
      pkcs8Bytes,
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      ["decrypt"],
    );
  }

  return crypto.subtle.unwrapKey(
    "pkcs8",
    BASE64.decode(wrappedB64),
    wrappingKey,
    "AES-KW",
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["decrypt"],
  );
}

export async function makePrivateKeyNonExtractable(
  privateKey: CryptoKey,
): Promise<CryptoKey> {
  if (!privateKey.extractable) return privateKey;

  const pkcs8 = await crypto.subtle.exportKey("pkcs8", privateKey);
  return crypto.subtle.importKey(
    "pkcs8",
    pkcs8,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["decrypt"],
  );
}

export async function encryptMessage(
  plaintext: string,
  recipientPublicKeyB64: string,
  myPublicKeyB64: string,
): Promise<{
  ciphertext: string;
  iv: string;
  encryptedKey: string;
  encryptedKeyForSelf: string;
}> {
  const enc = new TextEncoder();

  const aesKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    enc.encode(plaintext),
  );

  const rawAesKey = await crypto.subtle.exportKey("raw", aesKey);

  const recipientPubKey = await importPublicKey(recipientPublicKeyB64);
  const encryptedKey = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    recipientPubKey,
    rawAesKey,
  );

  const myPubKey = await importPublicKey(myPublicKeyB64);
  const encryptedKeyForSelf = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    myPubKey,
    rawAesKey,
  );

  return {
    ciphertext: BASE64.encode(ciphertext),
    iv: BASE64.encode(iv.buffer),
    encryptedKey: BASE64.encode(encryptedKey),
    encryptedKeyForSelf: BASE64.encode(encryptedKeyForSelf),
  };
}

export async function decryptMessage(
  payload: {
    ciphertext: string;
    iv: string;
    encryptedKey: string;
    encryptedKeyForSelf: string;
  },
  privateKey: CryptoKey,
  isSender: boolean,
): Promise<string> {
  const keyToDecrypt = isSender
    ? payload.encryptedKeyForSelf
    : payload.encryptedKey;

  const rawAesKey = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    BASE64.decode(keyToDecrypt),
  );

  const aesKey = await crypto.subtle.importKey(
    "raw",
    rawAesKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: BASE64.decode(payload.iv) },
    aesKey,
    BASE64.decode(payload.ciphertext),
  );

  return new TextDecoder().decode(plaintext);
}
