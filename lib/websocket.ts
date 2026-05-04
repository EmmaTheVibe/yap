import { Message } from "@/types/message";

const WS_BASE = "wss://whisperbox.koyeb.app/ws";

type WSEventMap = {
  "message.receive": (msg: Message) => void;
  "user.online": (userId: string) => void;
  "user.offline": (userId: string) => void;
  connected: () => void;
  disconnected: () => void;
};

type Listeners = {
  [K in keyof WSEventMap]: Set<WSEventMap[K]>;
};

class WebSocketManager {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private shouldReconnect = false;

  private listeners: Listeners = {
    "message.receive": new Set(),
    "user.online": new Set(),
    "user.offline": new Set(),
    connected: new Set(),
    disconnected: new Set(),
  };

  connect(token: string) {
    this.token = token;
    this.shouldReconnect = true;
    this._open();
  }

  updateToken(token: string) {
    this.token = token;

    if (this.shouldReconnect && this.ws) {
      this.ws.close();
    }
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  send(event: string, data: Record<string, unknown>) {
    const socket = this.ws;

    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ event, ...data }));
      return true;
    }
    return false;
  }

  on<K extends keyof WSEventMap>(event: K, cb: WSEventMap[K]) {
    (this.listeners[event] as Set<WSEventMap[K]>).add(cb);
    return () => (this.listeners[event] as Set<WSEventMap[K]>).delete(cb);
  }

  private _open() {
    if (!this.token) return;
    this.ws = new WebSocket(`${WS_BASE}?token=${this.token}`);

    this.ws.onopen = () => {
      this.reconnectDelay = 1000;
      this.listeners["connected"].forEach((cb) => cb());
    };

    this.ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        const { event, ...rest } = data;

        if (event === "message.receive") {
          this.listeners["message.receive"].forEach((cb) =>
            cb(rest as Message),
          );
        } else if (event === "user.online") {
          this.listeners["user.online"].forEach((cb) => cb(rest.user_id));
        } else if (event === "user.offline") {
          this.listeners["user.offline"].forEach((cb) => cb(rest.user_id));
        }
      } catch {
        // ignore
      }
    };

    this.ws.onclose = () => {
      this.listeners["disconnected"].forEach((cb) => cb());
      if (this.shouldReconnect) {
        this.reconnectTimer = setTimeout(() => {
          this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
          this._open();
        }, this.reconnectDelay);
      }
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }
}

export const wsManager = new WebSocketManager();
