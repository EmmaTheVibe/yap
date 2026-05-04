import { openDB } from "idb";

const DB_NAME = "yapp-db";
const STORE = "keystore";
const WRAPPED_SESSION_KEY = "session";
const PRIVATE_KEY_KEY = "private-key";

async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE);
    },
  });
}

export async function saveWrappedSession(data: {
  wrapped_private_key: string;
  pbkdf2_salt: string;
  refresh_token: string;
  user_id: string;
}): Promise<void> {
  const db = await getDB();
  await db.put(STORE, data, WRAPPED_SESSION_KEY);
}

export async function loadWrappedSession(): Promise<{
  wrapped_private_key: string;
  pbkdf2_salt: string;
  refresh_token: string;
  user_id: string;
} | null> {
  const db = await getDB();
  return (await db.get(STORE, WRAPPED_SESSION_KEY)) ?? null;
}

export async function clearWrappedSession(): Promise<void> {
  const db = await getDB();
  await db.delete(STORE, WRAPPED_SESSION_KEY);
}

export async function clearPrivateKey(): Promise<void> {
  const db = await getDB();
  await db.delete(STORE, PRIVATE_KEY_KEY);
}

export async function clearStoredSession(): Promise<void> {
  const db = await getDB();
  await Promise.all([
    db.delete(STORE, WRAPPED_SESSION_KEY),
    db.delete(STORE, PRIVATE_KEY_KEY),
  ]);
}
