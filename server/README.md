# Żarłoczne Żółwie — WebSocket server

> Auto-deployed via GitHub Actions on push to main when `server/**` changes.

Real-time chat over WebSocket, persisted to Neon. Lives on the VPS, fronted by
nginx with TLS via Let's Encrypt.

## Architecture

```
Browser  ──wss://ws.zarlocznezolwie.com──▶  nginx (TLS)  ──▶  ws://127.0.0.1:3001  ──▶  Node + ws  ──▶  Neon Postgres
                                                                                                            ▲
Vercel /api/chat/messages  ──HTTP fallback───────────────────────────────────────────────────────────────────┘
```

Same `chat_messages` table is used by both the Vercel API route (HTTP polling
fallback) and the WS server, so they're interchangeable.

## Wire protocol (JSON over WS)

Client → server:
```ts
{ type: "auth"; name: "Oskar" }                 // first message after connect
{ type: "history"; with: "Janek" }              // request thread
{ type: "send"; to: "Janek"; text: "cześć" }    // send a message
{ type: "ping" }                                // keepalive
```

Server → client:
```ts
{ type: "ready"; name: "Oskar" }
{ type: "history"; with: "Janek"; messages: [{ from, text, ts }] }
{ type: "msg"; from: "Janek"; to: "Oskar"; text: "hej"; ts: 17... }   // pushed in real time
{ type: "error"; reason: "..." }
{ type: "pong" }
```

## First-time deploy on the VPS

1. Add a DNS A record at your registrar:
   - `ws.zarlocznezolwie.com` → `147.93.63.171`
2. SSH in:
   ```
   ssh root@147.93.63.171
   ```
3. Clone and run setup:
   ```
   apt update && apt install -y git
   git clone https://github.com/JeanCharlesMEILLAND/oskar.git /opt/zolwie
   bash /opt/zolwie/server/setup.sh "<NEON_DATABASE_URL>"
   ```
   That single script installs node, nginx, certbot, builds the server, sets up systemd,
   and obtains a TLS cert. It's idempotent — safe to re-run.

## Updating the server

```
ssh root@147.93.63.171
cd /opt/zolwie && git pull
cd server && npm install && npm run build
systemctl restart zolwie-ws
```

## Logs / status

```
systemctl status zolwie-ws
journalctl -u zolwie-ws -f
curl https://ws.zarlocznezolwie.com/health
```
