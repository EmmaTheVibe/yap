import { getAccessToken, updateAccessToken } from "./session";
import {
  AuthRefreshResponse,
  AuthResponse,
  UserProfile,
  UserPublicInfo,
} from "@/types/auth";
import {
  ConversationSummary,
  EncryptedPayload,
  Message,
} from "@/types/message";
import { wsManager } from "./websocket";

const BASE = "/api/whisper";

let refreshToken: string | null = null;
let refreshPromise: Promise<string> | null = null;

type ApiRequestOptions = RequestInit & {
  auth?: boolean;
  accessToken?: string;
  refreshOnUnauthorized?: boolean;
};

export function setRefreshToken(token: string | null) {
  refreshToken = token;
}

async function parseResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text);
}

async function errorFromResponse(res: Response): Promise<Error> {
  const text = await res.text();
  if (!text) return new Error(`Request failed: ${res.status}`);

  try {
    const data = JSON.parse(text);
    const detail = data.detail;
    if (Array.isArray(detail)) {
      const message = detail
        .map((item) => item.msg)
        .filter(Boolean)
        .join(", ");
      return new Error(message || `Request failed: ${res.status}`);
    }
    const message =
      typeof detail === "string" ? detail : `Request failed: ${res.status}`;
    return new Error(`${message} (${res.status})`);
  } catch {
    return new Error(`${text} (${res.status})`);
  }
}

async function refreshAccessToken(): Promise<string> {
  if (!refreshToken) throw new Error("No refresh token available");

  refreshPromise ??= fetch(`${BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
    .then(async (res) => {
      if (!res.ok) throw await errorFromResponse(res);
      const data = await parseResponse<{ access_token: string }>(res);
      updateAccessToken(data.access_token);
      wsManager.updateToken(data.access_token);
      return data.access_token;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

async function request<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const {
    auth = true,
    accessToken,
    refreshOnUnauthorized = auth,
    headers,
    ...fetchOptions
  } = options;
  const token = auth ? (accessToken ?? getAccessToken()) : null;
  const requestHeaders = {
    ...(fetchOptions.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };

  const res = await fetch(`${BASE}${path}`, {
    ...fetchOptions,
    headers: requestHeaders,
  });

  if (res.status === 401 && refreshOnUnauthorized && refreshToken) {
    try {
      const accessToken = await refreshAccessToken();

      const retryRes = await fetch(`${BASE}${path}`, {
        ...fetchOptions,
        headers: {
          ...(fetchOptions.body ? { "Content-Type": "application/json" } : {}),
          Authorization: `Bearer ${accessToken}`,
          ...headers,
        },
      });

      if (!retryRes.ok) throw await errorFromResponse(retryRes);
      return parseResponse(retryRes);
    } catch {
      setRefreshToken(null);
      updateAccessToken("");
      throw new Error("Session expired. Please log in again.");
    }
  }

  if (!res.ok) {
    throw await errorFromResponse(res);
  }

  return parseResponse(res);
}

export async function apiRegister(body: {
  username: string;
  display_name: string;
  password: string;
  public_key: string;
  wrapped_private_key: string;
  pbkdf2_salt: string;
}): Promise<AuthResponse> {
  return request("/auth/register", {
    auth: false,
    refreshOnUnauthorized: false,
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function apiLogin(body: {
  username: string;
  password: string;
}): Promise<AuthResponse> {
  return request("/auth/login", {
    auth: false,
    refreshOnUnauthorized: false,
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function apiRefresh(
  refresh_token: string,
): Promise<AuthRefreshResponse> {
  const data = await request<AuthRefreshResponse>("/auth/refresh", {
    auth: false,
    refreshOnUnauthorized: false,
    method: "POST",
    body: JSON.stringify({ refresh_token }),
  });
  setRefreshToken(refresh_token);
  updateAccessToken(data.access_token);
  return data;
}

export async function apiMe(accessToken?: string): Promise<UserProfile> {
  return request("/auth/me", { accessToken });
}

export async function apiLogout(refresh_token: string): Promise<void> {
  return request("/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refresh_token }),
  });
}

export async function apiSearchUsers(q: string): Promise<UserPublicInfo[]> {
  return request(`/users/search?q=${encodeURIComponent(q)}`);
}

export async function apiGetPublicKey(userId: string): Promise<string> {
  const res = await request<{ public_key: string }>(
    `/users/${userId}/public-key`,
  );
  return res.public_key;
}

export async function apiGetConversations(): Promise<ConversationSummary[]> {
  return request("/conversations");
}

export async function apiGetMessages(
  userId: string,
  params?: { limit?: number; before?: string },
): Promise<Message[]> {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.before) qs.set("before", params.before);
  const query = qs.toString() ? `?${qs}` : "";
  return request(`/conversations/${userId}/messages${query}`);
}

export async function apiSendMessage(
  to: string,
  payload: EncryptedPayload,
): Promise<Message> {
  return request("/messages", {
    method: "POST",
    body: JSON.stringify({ to, payload }),
  });
}
