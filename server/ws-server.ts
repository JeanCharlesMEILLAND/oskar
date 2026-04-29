// Żarłoczne Żółwie — WebSocket chat server
// Listens on 127.0.0.1:PORT, fronted by nginx (TLS termination + WSS upgrade).
// Persists every message to Neon Postgres (`chat_messages` table — same as the
// Vercel API route, so HTTP polling and WS clients see the same history).

import { WebSocketServer, WebSocket } from "ws";
import { createServer, type IncomingMessage } from "http";
import pg from "pg";

const PORT = parseInt(process.env.PORT ?? "3001", 10);
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("FATAL: DATABASE_URL env var is required");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  max: 10,
  ssl: DATABASE_URL.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
});

// Bootstrap the table — idempotent
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id SERIAL PRIMARY KEY,
      from_name TEXT NOT NULL,
      to_name TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS chat_pair_idx ON chat_messages (from_name, to_name);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS chat_pair_reverse_idx ON chat_messages (to_name, from_name);`);
}

// Wire-format messages
type ClientMsg =
  | { type: "auth"; name: string }
  | { type: "history"; with: string }
  | { type: "send"; to: string; text: string }
  | { type: "ping" }
  // Game rooms
  | { type: "room_create" }
  | { type: "room_join"; code: string }
  | { type: "room_leave" }
  | { type: "room_broadcast"; payload: unknown }; // forwarded to other players in room

type ServerMsg =
  | { type: "ready"; name: string }
  | { type: "history"; with: string; messages: WireMessage[] }
  | { type: "msg"; from: string; to: string; text: string; ts: number }
  | { type: "error"; reason: string }
  | { type: "pong" }
  // Game rooms
  | { type: "room_created"; code: string }
  | { type: "room_joined"; code: string; isHost: boolean; players: string[] }
  | { type: "room_left" }
  | { type: "room_player_joined"; name: string; players: string[] }
  | { type: "room_player_left"; name: string; players: string[]; newHost?: string }
  | { type: "room_message"; from: string; payload: unknown };

type WireMessage = { from: string; text: string; ts: number };

// Room state
type Room = {
  code: string;
  hostNameLower: string;
  players: Map<string, WebSocket>; // nameLower → socket (one per name; multi-tab uses last connection)
  playerNames: Map<string, string>; // nameLower → original casing
  createdAt: number;
};
const rooms = new Map<string, Room>();
// Reverse lookup: which room is each connection in
const wsToRoom = new WeakMap<WebSocket, { code: string; nameLower: string }>();

const ROOM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no I/O/0/1
function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < 4; i++) code += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
  return code;
}

function getPlayersList(room: Room): string[] {
  return Array.from(room.playerNames.values());
}

function broadcastToRoom(room: Room, msg: ServerMsg, exceptNameLower?: string) {
  const json = JSON.stringify(msg);
  for (const [nameLower, ws] of room.players) {
    if (nameLower === exceptNameLower) continue;
    if (ws.readyState === WebSocket.OPEN) ws.send(json);
  }
}

function leaveRoom(ws: WebSocket) {
  const info = wsToRoom.get(ws);
  if (!info) return;
  wsToRoom.delete(ws);
  const room = rooms.get(info.code);
  if (!room) return;
  room.players.delete(info.nameLower);
  const leaverName = room.playerNames.get(info.nameLower) ?? info.nameLower;
  room.playerNames.delete(info.nameLower);
  if (room.players.size === 0) {
    rooms.delete(room.code);
    return;
  }
  // If the host left, promote first remaining player
  let newHost: string | undefined;
  if (room.hostNameLower === info.nameLower) {
    const next = room.players.keys().next().value as string | undefined;
    if (next) {
      room.hostNameLower = next;
      newHost = room.playerNames.get(next);
    }
  }
  broadcastToRoom(room, {
    type: "room_player_left",
    name: leaverName,
    players: getPlayersList(room),
    newHost,
  });
}

// userNameLower → set of active WebSockets for that user
const connections = new Map<string, Set<WebSocket>>();

const httpServer = createServer((req, res) => {
  // Tiny health endpoint for monitoring/uptime checks
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, connections: connections.size }));
    return;
  }
  res.writeHead(404);
  res.end("Use WebSocket");
});

const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
  const ip = req.socket.remoteAddress ?? "?";
  let myNameLower: string | null = null;
  let myName: string | null = null;

  const send = (m: ServerMsg) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(m));
  };
  const fail = (reason: string) => send({ type: "error", reason });

  ws.on("message", async (raw) => {
    let msg: ClientMsg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return fail("bad_json");
    }

    if (msg.type === "ping") return send({ type: "pong" });

    if (msg.type === "auth") {
      const name = msg.name?.trim();
      if (!name || name.length > 50) return fail("bad_name");
      myName = name;
      myNameLower = name.toLowerCase();
      if (!connections.has(myNameLower)) connections.set(myNameLower, new Set());
      connections.get(myNameLower)!.add(ws);
      send({ type: "ready", name });
      return;
    }

    if (!myNameLower) return fail("not_authed");

    if (msg.type === "history") {
      const peer = msg.with?.trim();
      if (!peer) return fail("bad_peer");
      try {
        const r = await pool.query<{ from_name: string; text: string; created_at: Date }>(
          `SELECT from_name, text, created_at
             FROM chat_messages
             WHERE (lower(from_name) = $1 AND lower(to_name) = $2)
                OR (lower(from_name) = $2 AND lower(to_name) = $1)
             ORDER BY created_at ASC
             LIMIT 200`,
          [myNameLower, peer.toLowerCase()],
        );
        const messages: WireMessage[] = r.rows.map((row) => ({
          from: row.from_name,
          text: row.text,
          ts: new Date(row.created_at).getTime(),
        }));
        send({ type: "history", with: peer, messages });
      } catch (e) {
        console.error("history error", e);
        fail("db_error");
      }
      return;
    }

    if (msg.type === "send") {
      const to = msg.to?.trim();
      const text = msg.text?.trim().slice(0, 500);
      if (!to || !text) return fail("bad_payload");
      if (to.toLowerCase() === myNameLower) return fail("self");
      try {
        const r = await pool.query<{ created_at: Date }>(
          `INSERT INTO chat_messages (from_name, to_name, text)
             VALUES ($1, $2, $3)
             RETURNING created_at`,
          [myName, to, text],
        );
        const ts = new Date(r.rows[0].created_at).getTime();
        const broadcast: ServerMsg = { type: "msg", from: myName!, to, text, ts };
        // Echo to sender (all their open tabs)
        const senderSet = connections.get(myNameLower);
        if (senderSet) for (const c of senderSet) c.readyState === WebSocket.OPEN && c.send(JSON.stringify(broadcast));
        // Push to recipient if connected
        const recipSet = connections.get(to.toLowerCase());
        if (recipSet) for (const c of recipSet) c.readyState === WebSocket.OPEN && c.send(JSON.stringify(broadcast));
      } catch (e) {
        console.error("send error", e);
        fail("db_error");
      }
      return;
    }

    if (msg.type === "room_create") {
      // Leave previous room if any
      leaveRoom(ws);
      let code = generateRoomCode();
      // Avoid collision (extremely rare)
      while (rooms.has(code)) code = generateRoomCode();
      const room: Room = {
        code,
        hostNameLower: myNameLower,
        players: new Map([[myNameLower, ws]]),
        playerNames: new Map([[myNameLower, myName!]]),
        createdAt: Date.now(),
      };
      rooms.set(code, room);
      wsToRoom.set(ws, { code, nameLower: myNameLower });
      send({ type: "room_created", code });
      send({ type: "room_joined", code, isHost: true, players: getPlayersList(room) });
      return;
    }

    if (msg.type === "room_join") {
      const code = msg.code?.trim().toUpperCase();
      if (!code) return fail("bad_code");
      const room = rooms.get(code);
      if (!room) return fail("room_not_found");
      if (room.players.size >= 4) return fail("room_full");
      // Leave previous room
      leaveRoom(ws);
      // Replace any existing socket for the same user
      const existing = room.players.get(myNameLower);
      if (existing && existing !== ws) {
        try { existing.close(1000, "replaced by new connection"); } catch {}
      }
      room.players.set(myNameLower, ws);
      room.playerNames.set(myNameLower, myName!);
      wsToRoom.set(ws, { code, nameLower: myNameLower });
      const isHost = room.hostNameLower === myNameLower;
      send({ type: "room_joined", code, isHost, players: getPlayersList(room) });
      // Notify other players
      broadcastToRoom(
        room,
        { type: "room_player_joined", name: myName!, players: getPlayersList(room) },
        myNameLower,
      );
      return;
    }

    if (msg.type === "room_leave") {
      leaveRoom(ws);
      send({ type: "room_left" });
      return;
    }

    if (msg.type === "room_broadcast") {
      const info = wsToRoom.get(ws);
      if (!info) return fail("not_in_room");
      const room = rooms.get(info.code);
      if (!room) return fail("room_gone");
      // Forward to other players in the room
      broadcastToRoom(
        room,
        { type: "room_message", from: myName!, payload: msg.payload },
        myNameLower,
      );
      return;
    }

    fail("unknown_type");
  });

  ws.on("close", () => {
    if (myNameLower) {
      const set = connections.get(myNameLower);
      set?.delete(ws);
      if (set && set.size === 0) connections.delete(myNameLower);
    }
    leaveRoom(ws);
    console.log(`[ws] disconnect ip=${ip} name=${myName ?? "?"}`);
  });

  ws.on("error", (e) => {
    console.error(`[ws] error ip=${ip} name=${myName ?? "?"}`, e);
  });

  console.log(`[ws] connect ip=${ip}`);
});

// Boot
ensureTable()
  .then(() => {
    httpServer.listen(PORT, "127.0.0.1", () => {
      console.log(`Żarłoczne Żółwie WS listening on 127.0.0.1:${PORT}`);
    });
  })
  .catch((e) => {
    console.error("FATAL: ensureTable failed", e);
    process.exit(1);
  });

// Graceful shutdown
function shutdown() {
  console.log("shutting down...");
  wss.clients.forEach((c) => c.close(1001, "server shutdown"));
  httpServer.close();
  pool.end();
  setTimeout(() => process.exit(0), 1000);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
