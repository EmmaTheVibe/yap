// In-memory session store — private key lives here only, never persisted

import { Session } from "@/types/auth";

let _session: Session | null = null;

export function getSession(): Session | null {
  return _session;
}

export function setSession(session: Session): void {
  _session = session;
}

export function clearSession(): void {
  _session = null;
}

export function getAccessToken(): string | null {
  return _session?.accessToken ?? null;
}

export function updateAccessToken(token: string): void {
  if (_session) _session = { ..._session, accessToken: token };
}
