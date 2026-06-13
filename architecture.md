# System Architecture — Atomberg Video Support Platform

## Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                               │
│                                                                     │
│  ┌─────────────────┐          ┌─────────────────────────────────┐  │
│  │   Agent Browser │          │        Customer Browser         │  │
│  │                 │          │                                 │  │
│  │  Login Page     │          │  Join Page (/join?token=...)    │  │
│  │  Agent Dashboard│          │  CallRoom (video + chat)        │  │
│  │  Admin Dashboard│          │                                 │  │
│  │  CallRoom       │          │  Auth: sessionStorage only      │  │
│  │                 │          │  (invite token, no password)    │  │
│  │  Auth: JWT in   │          └─────────────────────────────────┘  │
│  │  localStorage   │                                               │
│  └────────┬────────┘                                               │
│           │  React (Vite) + TailwindCSS                            │
│           │  mediasoup-client + socket.io-client                   │
└───────────┼─────────────────────────────────────────────────────────┘
            │  HTTPS / WSS (TLS)
            │
┌───────────▼─────────────────────────────────────────────────────────┐
│                      NODE.JS / EXPRESS SERVER                       │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  REST API    │  │  Socket.IO   │  │     mediasoup SFU        │  │
│  │              │  │  (Signaling) │  │                          │  │
│  │ POST /login  │  │              │  │  Worker (single process) │  │
│  │ POST /session│  │ join-room    │  │  Router (per session)    │  │
│  │ GET  /session│  │ leave-room   │  │  WebRtcTransport (×4     │  │
│  │ POST /end    │  │ end-session  │  │    per participant)      │  │
│  │ GET  /metrics│  │ produce      │  │  Producer (audio+video)  │  │
│  │ POST /files  │  │ consume      │  │  Consumer (per viewer)   │  │
│  │ POST /record │  │ send-message │  │                          │  │
│  │              │  │ peer-action  │  │  All media routed        │  │
│  └──────┬───────┘  └──────┬───────┘  │  through server.        │  │
│         │                 │          │  Zero P2P connections.   │  │
│  ┌──────▼─────────────────▼────────┐ └──────────┬───────────────┘  │
│  │           Auth Middleware        │            │                  │
│  │  requireAgent / requireAdmin     │     UDP 10000–10200           │
│  │  JWT verification (agents)       │     (RTP/RTCP media)         │
│  │  Invite token check (customers)  │                              │
│  └──────────────────────────────────┘                              │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                        MongoDB                               │  │
│  │                                                              │  │
│  │  Primary: mongodb://127.0.0.1:27017/atomberg                 │  │
│  │  Fallback: MongoMemoryServer (embedded, persistent WiredTiger│  │
│  │            stored at server/data/mongodb)                    │  │
│  │                                                              │  │
│  │  Collections:                                                │  │
│  │    users        → agents & admins (bcrypt hashed passwords)  │  │
│  │    sessions     → session state, invite token, recording     │  │
│  │    participants → join/leave timestamps per session          │  │
│  │    messages     → chat messages + file metadata              │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### Frontend (React + Vite)
| Page | Role | Access |
|---|---|---|
| `/login` | Agent login with JWT | Public |
| `/dashboard` | Agent — create sessions, view history, copy invite links | Agent only |
| `/admin` | Admin — view all sessions, force-end, live stats | Admin only |
| `/join?token=...` | Customer — enter name and join via invite link | Public (token required) |
| `/call/:sessionId` | Live call room — video tiles, chat, controls | Both roles |

### Backend (Node.js + Express + Socket.IO)
| Layer | Responsibility |
|---|---|
| REST routes | Session CRUD, auth, file upload, recording upload |
| Socket.IO handlers | WebRTC signaling (join, transport, produce, consume) |
| mediasoup SFU | Media routing — receives all streams, fans out to consumers |
| Auth middleware | JWT validation for agents, invite token validation for customers |
| MongoDB models | Persistent storage of sessions, participants, messages |

### Media Flow (SFU)
```
Agent Browser                 mediasoup Server               Customer Browser
     │                              │                               │
     │── send transport ──────────► │                               │
     │── produce (audio) ─────────► │                               │
     │── produce (video) ─────────► │                               │
     │                              │ ◄── recv transport ───────────│
     │                              │ ◄── consume (agent audio) ────│
     │                              │ ◄── consume (agent video) ────│
     │                              │                               │
     │ ◄── consumer (customer audio)│                               │
     │ ◄── consumer (customer video)│ ──── produce (audio) ────────►│
     │                              │ ──── produce (video) ────────►│
```

### Data Flow — Session Lifecycle
```
1. Agent logs in → JWT issued
2. Agent creates session → Session document created, invite_token generated
3. Agent copies invite link → /join?token={invite_token}
4. Customer opens link → server validates token, returns session info
5. Customer enters name → joins call room via Socket.IO
6. Both negotiate WebRTC through mediasoup signaling
7. Media streams flow through mediasoup (never P2P)
8. Agent ends session → session-ended event broadcast, room destroyed
9. Session history persisted in MongoDB (participants, messages, duration)
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TailwindCSS 4 |
| Realtime | Socket.IO 4 (signaling), mediasoup 3 (SFU) |
| Backend | Node.js, Express 4 |
| Database | MongoDB + MongoMemoryServer (embedded fallback) |
| Auth | JWT (agents), UUID invite tokens (customers) |
| Media | WebRTC via mediasoup SFU — VP8/VP9/H.264 + Opus |
| Recording | MediaRecorder API (client-side), uploaded as WebM |
| File sharing | Multer (20MB limit), served as static files |
| Observability | Prometheus-format `/api/admin/metrics` endpoint |
| HTTPS (dev) | @vitejs/plugin-basic-ssl (self-signed) |
