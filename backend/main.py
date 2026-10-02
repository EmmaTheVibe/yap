import hashlib
import json
import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import Optional

import secrets

import libsql
import uvicorn
from fastapi import Depends, FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel



SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 30
DB_PATH = os.getenv("DB_PATH", "yap.db")
# When set, use the remote Turso database instead of the local DB_PATH file
TURSO_DATABASE_URL = os.getenv("TURSO_DATABASE_URL")
TURSO_AUTH_TOKEN = os.getenv("TURSO_AUTH_TOKEN", "")

bearer = HTTPBearer()

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 600_000)
    return f"{salt}${key.hex()}"

def verify_password(password: str, stored: str) -> bool:
    salt, key_hex = stored.split("$", 1)
    key = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 600_000)
    return secrets.compare_digest(key.hex(), key_hex)



class Result:
    """Wraps a libsql cursor so rows can be read by column name, like sqlite3.Row."""

    def __init__(self, cursor):
        self._cursor = cursor

    def _to_dict(self, row):
        if row is None:
            return None
        columns = [d[0] for d in self._cursor.description]
        return dict(zip(columns, row))

    def fetchone(self) -> Optional[dict]:
        return self._to_dict(self._cursor.fetchone())

    def fetchall(self) -> list[dict]:
        return [self._to_dict(row) for row in self._cursor.fetchall()]


class Database:
    def __init__(self):
        if TURSO_DATABASE_URL:
            self._conn = libsql.connect(database=TURSO_DATABASE_URL, auth_token=TURSO_AUTH_TOKEN)
        else:
            self._conn = libsql.connect(DB_PATH)
            self._conn.execute("PRAGMA foreign_keys=ON")

    def execute(self, sql: str, params: tuple = ()) -> Result:
        return Result(self._conn.execute(sql, params))

    def commit(self):
        self._conn.commit()

    def close(self):
        self._conn.close()


def get_db():
    db = Database()
    try:
        yield db
    finally:
        db.close()


SCHEMA = [
    """CREATE TABLE IF NOT EXISTS users (
        id                  TEXT PRIMARY KEY,
        username            TEXT UNIQUE NOT NULL,
        display_name        TEXT NOT NULL,
        password_hash       TEXT NOT NULL,
        public_key          TEXT NOT NULL,
        wrapped_private_key TEXT NOT NULL,
        pbkdf2_salt         TEXT NOT NULL,
        created_at          TEXT NOT NULL
    )""",
    """CREATE TABLE IF NOT EXISTS messages (
        id                    TEXT PRIMARY KEY,
        from_user_id          TEXT NOT NULL REFERENCES users(id),
        to_user_id            TEXT NOT NULL REFERENCES users(id),
        ciphertext            TEXT NOT NULL,
        iv                    TEXT NOT NULL,
        encrypted_key         TEXT NOT NULL,
        encrypted_key_for_self TEXT NOT NULL,
        delivered             INTEGER NOT NULL DEFAULT 0,
        created_at            TEXT NOT NULL
    )""",
    """CREATE TABLE IF NOT EXISTS refresh_tokens (
        token      TEXT PRIMARY KEY,
        user_id    TEXT NOT NULL REFERENCES users(id),
        expires_at TEXT NOT NULL
    )""",
    """CREATE INDEX IF NOT EXISTS idx_messages_conversation
        ON messages(from_user_id, to_user_id, created_at)""",
]


def init_db():
    db = Database()
    for statement in SCHEMA:
        db.execute(statement)
    db.commit()
    db.close()


# ── WebSocket manager ─────────────────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self._connections: dict[str, WebSocket] = {}

    async def connect(self, user_id: str, ws: WebSocket):
        await ws.accept()
        self._connections[user_id] = ws

    def disconnect(self, user_id: str):
        self._connections.pop(user_id, None)

    def is_online(self, user_id: str) -> bool:
        return user_id in self._connections

    async def send(self, user_id: str, data: dict):
        ws = self._connections.get(user_id)
        if ws:
            try:
                await ws.send_text(json.dumps(data))
            except Exception:
                self.disconnect(user_id)


manager = ConnectionManager()




@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Yap API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)




def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": user_id, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> str:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(bearer)) -> str:
    return decode_token(credentials.credentials)


def partner_ids_for(user_id: str) -> list[str]:
    db = Database()
    try:
        rows = db.execute("""
            SELECT DISTINCT
                CASE WHEN from_user_id = ? THEN to_user_id ELSE from_user_id END AS pid
            FROM messages
            WHERE from_user_id = ? OR to_user_id = ?
        """, (user_id, user_id, user_id)).fetchall()
        return [r["pid"] for r in rows]
    finally:
        db.close()


def store_message(from_user_id: str, to_user_id: str, payload: dict) -> Optional[dict]:
    """Saves a message and returns it, or None if the recipient doesn't exist."""
    db = Database()
    try:
        if not db.execute("SELECT 1 FROM users WHERE id = ?", (to_user_id,)).fetchone():
            return None

        msg_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        delivered = manager.is_online(to_user_id)

        db.execute(
            """INSERT INTO messages
               (id, from_user_id, to_user_id, ciphertext, iv, encrypted_key, encrypted_key_for_self, delivered, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (msg_id, from_user_id, to_user_id, payload["ciphertext"], payload["iv"],
             payload["encryptedKey"], payload["encryptedKeyForSelf"], int(delivered), now),
        )
        db.commit()
    finally:
        db.close()

    return {
        "id": msg_id,
        "from_user_id": from_user_id,
        "to_user_id": to_user_id,
        "payload": payload,
        "delivered": delivered,
        "created_at": now,
    }


def mark_delivered(user_id: str) -> list[str]:
    """Marks all undelivered messages to user_id as delivered and returns their senders."""
    db = Database()
    try:
        rows = db.execute(
            "SELECT DISTINCT from_user_id FROM messages WHERE to_user_id = ? AND delivered = 0",
            (user_id,),
        ).fetchall()
        if rows:
            db.execute(
                "UPDATE messages SET delivered = 1 WHERE to_user_id = ? AND delivered = 0",
                (user_id,),
            )
            db.commit()
        return [r["from_user_id"] for r in rows]
    finally:
        db.close()


def format_message(row: dict) -> dict:
    return {
        "id": row["id"],
        "from_user_id": row["from_user_id"],
        "to_user_id": row["to_user_id"],
        "payload": {
            "ciphertext": row["ciphertext"],
            "iv": row["iv"],
            "encryptedKey": row["encrypted_key"],
            "encryptedKeyForSelf": row["encrypted_key_for_self"],
        },
        "delivered": bool(row["delivered"]),
        "created_at": row["created_at"],
    }


def format_user(row: dict) -> dict:
    return {
        "id": row["id"],
        "username": row["username"],
        "display_name": row["display_name"],
        "public_key": row["public_key"],
        "wrapped_private_key": row["wrapped_private_key"],
        "pbkdf2_salt": row["pbkdf2_salt"],
        "created_at": row["created_at"],
    }


def auth_response(db: Database, user_id: str) -> dict:
    user = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    access_token = create_access_token(user_id)
    refresh_token = str(uuid.uuid4())
    expires_at = (datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)).isoformat()

    db.execute(
        "INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES (?, ?, ?)",
        (refresh_token, user_id, expires_at),
    )
    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": format_user(user),
    }




class RegisterRequest(BaseModel):
    username: str
    display_name: str
    password: str
    public_key: str
    wrapped_private_key: str
    pbkdf2_salt: str

class LoginRequest(BaseModel):
    username: str
    password: str

class RefreshRequest(BaseModel):
    refresh_token: str

class LogoutRequest(BaseModel):
    refresh_token: str

class SendMessageRequest(BaseModel):
    to: str
    payload: dict




@app.post("/auth/register", status_code=201)
def register(body: RegisterRequest, db: Database = Depends(get_db)):
    if db.execute("SELECT 1 FROM users WHERE username = ?", (body.username,)).fetchone():
        raise HTTPException(status_code=400, detail="Username already taken")

    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    db.execute(
        """INSERT INTO users
           (id, username, display_name, password_hash, public_key, wrapped_private_key, pbkdf2_salt, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (user_id, body.username, body.display_name, hash_password(body.password),
         body.public_key, body.wrapped_private_key, body.pbkdf2_salt, now),
    )
    db.commit()
    return auth_response(db, user_id)


@app.post("/auth/login")
def login(body: LoginRequest, db: Database = Depends(get_db)):
    user = db.execute("SELECT * FROM users WHERE username = ?", (body.username,)).fetchone()
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return auth_response(db, user["id"])


@app.post("/auth/refresh")
def refresh(body: RefreshRequest, db: Database = Depends(get_db)):
    row = db.execute(
        "SELECT * FROM refresh_tokens WHERE token = ?", (body.refresh_token,)
    ).fetchone()

    if not row:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    if datetime.now(timezone.utc) > datetime.fromisoformat(row["expires_at"]):
        db.execute("DELETE FROM refresh_tokens WHERE token = ?", (body.refresh_token,))
        db.commit()
        raise HTTPException(status_code=401, detail="Refresh token expired")

    access_token = create_access_token(row["user_id"])
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


@app.get("/auth/me")
def me(user_id: str = Depends(get_current_user_id), db: Database = Depends(get_db)):
    user = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return format_user(user)


@app.post("/auth/logout", status_code=204)
def logout(
    body: LogoutRequest,
    user_id: str = Depends(get_current_user_id),
    db: Database = Depends(get_db),
):
    db.execute(
        "DELETE FROM refresh_tokens WHERE token = ? AND user_id = ?",
        (body.refresh_token, user_id),
    )
    db.commit()




@app.get("/users/search")
def search_users(
    q: str = Query(..., min_length=1),
    user_id: str = Depends(get_current_user_id),
    db: Database = Depends(get_db),
):
    rows = db.execute(
        """SELECT id, username, display_name FROM users
           WHERE (username LIKE ? OR display_name LIKE ?) AND id != ?
           LIMIT 20""",
        (f"%{q}%", f"%{q}%", user_id),
    ).fetchall()
    return [{"id": r["id"], "username": r["username"], "display_name": r["display_name"]} for r in rows]


@app.get("/users/{target_id}/public-key")
def get_public_key(
    target_id: str,
    _: str = Depends(get_current_user_id),
    db: Database = Depends(get_db),
):
    user = db.execute("SELECT public_key FROM users WHERE id = ?", (target_id,)).fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"public_key": user["public_key"]}




@app.get("/conversations")
def get_conversations(
    user_id: str = Depends(get_current_user_id),
    db: Database = Depends(get_db),
):
    rows = db.execute("""
        SELECT
            CASE WHEN from_user_id = ? THEN to_user_id ELSE from_user_id END AS partner_id,
            MAX(created_at) as last_message_at
        FROM messages
        WHERE from_user_id = ? OR to_user_id = ?
        GROUP BY partner_id
        ORDER BY last_message_at DESC
    """, (user_id, user_id, user_id)).fetchall()

    result = []
    for row in rows:
        partner = db.execute(
            "SELECT id, username, display_name FROM users WHERE id = ?",
            (row["partner_id"],),
        ).fetchone()
        if partner:
            result.append({
                "user_id": partner["id"],
                "username": partner["username"],
                "display_name": partner["display_name"],
                "last_message_at": row["last_message_at"],
            })
    return result


@app.get("/conversations/{partner_id}/messages")
def get_messages(
    partner_id: str,
    limit: int = Query(50, ge=1, le=100),
    before: Optional[str] = None,
    user_id: str = Depends(get_current_user_id),
    db: Database = Depends(get_db),
):
    base = """
        SELECT * FROM messages
        WHERE (from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?)
    """
    if before:
        rows = db.execute(
            base + "AND created_at < ? ORDER BY created_at DESC LIMIT ?",
            (user_id, partner_id, partner_id, user_id, before, limit),
        ).fetchall()
    else:
        rows = db.execute(
            base + "ORDER BY created_at DESC LIMIT ?",
            (user_id, partner_id, partner_id, user_id, limit),
        ).fetchall()

    return [format_message(r) for r in rows]




@app.post("/messages", status_code=201)
async def send_message(
    body: SendMessageRequest,
    user_id: str = Depends(get_current_user_id),
):
    message = await run_in_threadpool(store_message, user_id, body.to, body.payload)
    if not message:
        raise HTTPException(status_code=404, detail="Recipient not found")

    if message["delivered"]:
        await manager.send(body.to, {"event": "message.receive", **message})

    return message




@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket, token: str = Query(...)):
    try:
        user_id = decode_token(token)
    except HTTPException:
        await ws.close(code=4001)
        return

    await manager.connect(user_id, ws)

    for pid in await run_in_threadpool(partner_ids_for, user_id):
        await manager.send(pid, {"event": "user.online", "user_id": user_id})

    # Mark all undelivered messages to this user as delivered and notify each sender once
    for sender_id in await run_in_threadpool(mark_delivered, user_id):
        await manager.send(sender_id, {
            "event": "messages.delivered",
            "to_user_id": user_id,
        })

    try:
        while True:
            try:
                data = json.loads(await ws.receive_text())
            except (json.JSONDecodeError, Exception):
                break

            if data.get("event") != "message.send":
                continue

            to = data.get("to")
            p = data.get("payload")
            client_id = data.get("client_id")
            if not to or not p:
                continue

            stored = await run_in_threadpool(store_message, user_id, to, p)
            if not stored:
                continue

            message = {"event": "message.receive", **stored}

            await manager.send(to, message)

            await manager.send(user_id, {**message, "client_id": client_id})

    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(user_id)
        partners = await run_in_threadpool(partner_ids_for, user_id)
        for pid in partners:
            await manager.send(pid, {"event": "user.offline", "user_id": user_id})


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
