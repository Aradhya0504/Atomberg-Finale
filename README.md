# Atomberg Video Support Platform

> Real-time video calling platform built for **AtomQuest Hackathon 1.0 Grand Finale**

A production-grade video support system where agents create sessions and customers join via invite links. All media routes through a self-hosted mediasoup SFU — no third-party video APIs.

---

## Features

### Must-Have (All Implemented)
- **Session Management** — agents create sessions, generate invite links, track participants
- **Video & Audio Calling** — real-time via mediasoup SFU (all media through server, zero P2P)
- **Mute / Camera toggle** — both participants can control their own media
- **In-Call Chat** — real-time text, persisted after call ends
- **Role-Based Access** — agents and customers enforced at both server and client level

### Bonus Features (All 5 Implemented)
- **Call Recording** (3.1) — agent starts/stops recording with status: recording → processing → ready → download
- **File Sharing in Chat** (3.2) — images, PDFs, docs up to 20MB
- **Reconnect Handling** (3.3) — 15-second grace window on unexpected disconnect
- **Admin Dashboard** (3.4) — live sessions, history, force-end any session
- **Observability** (3.5) — Prometheus-format metrics at `/api/admin/metrics`

---

## Tech Stack

| | Technology |
|---|---|
| Frontend | React 18, Vite, TailwindCSS 4 |
| Backend | Node.js, Express 4, Socket.IO 4 |
| Media Server | mediasoup 3 (SFU) |
| Database | MongoDB (auto-falls back to embedded MongoMemoryServer) |
| Auth | JWT for agents, UUID invite tokens for customers |
| Recording | MediaRecorder API (WebM), uploaded to server |
| Dev HTTPS | @vitejs/plugin-basic-ssl (self-signed cert) |

---

## Project Structure

```
atomberg-video/
├── client/                    # React frontend (Vite)
│   └── src/
│       ├── pages/
│       │   ├── Login.jsx          # Agent login
│       │   ├── AgentDashboard.jsx # Create sessions, view history
│       │   ├── AdminDashboard.jsx # Admin — all sessions, force-end
│       │   ├── CustomerJoin.jsx   # Customer invite link landing page
│       │   └── CallRoom.jsx       # Live call — video, chat, controls
│       └── utils/
│           ├── api.js             # REST API calls
│           ├── socket.js          # Socket.IO singleton
│           └── mediasoupClient.js # SFU signaling client
│
├── server/                    # Node.js backend
│   └── src/
│       ├── routes/
│       │   ├── auth.js            # POST /login, GET /me
│       │   ├── sessions.js        # Session CRUD, file upload, recording
│       │   └── admin.js           # Admin endpoints + Prometheus metrics
│       ├── socket/
│       │   └── index.js           # All Socket.IO event handlers
│       ├── mediasoup/
│       │   ├── index.js           # Worker + transport factory
│       │   └── rooms.js           # Per-session room/peer management
│       ├── db/
│       │   ├── database.js        # MongoDB connection + embedded fallback
│       │   └── models/            # User, Session, Participant, Message
│       ├── middleware/
│       │   └── auth.js            # requireAgent, requireAdmin
│       └── config.js              # Environment config
│
├── architecture.md            # System design + diagrams
└── README.md
```

---

## Prerequisites

- **Node.js** v18 or higher
- **npm** v9 or higher
- MongoDB is **optional** — the server auto-falls back to an embedded in-memory MongoDB with persistent storage

---

## Setup & Installation

### 1. Clone the repository

```bash
git clone https://github.com/Aradhya0504/Atomberg-Finale.git
cd Atomberg-Finale
```

### 2. Install server dependencies

```bash
cd server
npm install
```

> **Note:** mediasoup will compile a native worker binary during `npm install`. This takes 1–2 minutes on first install. You need Python 3 and a C++ compiler (Visual Studio Build Tools on Windows, gcc on Linux).

### 3. Install client dependencies

```bash
cd ../client
npm install
```

### 4. Configure environment

Create `server/.env`:

```env
PORT=3001
MONGODB_URI=mongodb://127.0.0.1:27017/atomberg
JWT_SECRET=atomberg-video-secret-key-atomquest-2024
CLIENT_URL=https://localhost:5173,https://<YOUR_LAN_IP>:5173
MEDIASOUP_ANNOUNCED_IP=<YOUR_LAN_IP>
MEDIASOUP_MIN_PORT=10000
MEDIASOUP_MAX_PORT=10200
```

Replace `<YOUR_LAN_IP>` with your machine's IP (e.g. `192.168.1.9`).  
Find it with `ipconfig` (Windows) or `ifconfig` (Linux/Mac).

If you only need localhost (same machine), set both to `localhost` / `127.0.0.1`.

### 5. Start the server

```bash
cd server
npm run dev
```

Server starts at `https://localhost:3001` (or the configured PORT).

On first run, the server seeds demo accounts:

| Email | Password | Role |
|---|---|---|
| agent@demo.com | password123 | Agent |
| agent2@demo.com | password123 | Agent |
| admin@demo.com | password123 | Admin |

### 6. Start the client

```bash
cd client
npm run dev
```

Client starts at `https://localhost:5173`

> **HTTPS is required for WebRTC camera/mic access.** The client uses a self-signed certificate.  
> On first load, your browser will show a security warning — click **Advanced → Proceed to localhost**.  
> On mobile/phone: visit `https://<YOUR_LAN_IP>:5173`, tap **Advanced → Proceed** to accept the cert.

---

## Usage — Demo Flow

### Agent Flow
1. Open `https://localhost:5173` → you are redirected to `/login`
2. Log in as `agent@demo.com` / `password123`
3. Click **New Session**, give it a title (e.g. "Fan Troubleshoot")
4. Copy the generated invite link
5. Click **Join Call** to enter the call room

### Customer Flow
1. Open the invite link in a different browser or tab (or on your phone)
2. Enter your name on the join page
3. Click **Join Call**
4. Allow camera and microphone access

### In-Call
- Toggle mute / camera using the control buttons
- Send chat messages in the right panel
- Attach files via the paperclip icon in chat
- Agent can start/stop recording using the record button
- Either participant clicks the red phone button → **"Do you want to end the session?"** confirm → session ends for everyone

### Admin Flow
1. Log in as `admin@demo.com` / `password123`
2. Navigate to `/admin` for the admin dashboard
3. View all live sessions with participant details and duration
4. Force-end any session

---

## API Reference

### Auth
| Method | Route | Access | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Login with email + password, returns JWT |
| GET | `/api/auth/me` | Agent | Get current user info |

### Sessions
| Method | Route | Access | Description |
|---|---|---|---|
| POST | `/api/sessions` | Agent | Create a new session, returns invite link |
| GET | `/api/sessions` | Agent | List sessions (agent sees own, admin sees all) |
| GET | `/api/sessions/:id` | Agent | Get session details + participants + messages |
| POST | `/api/sessions/:id/end` | Agent | End a session |
| POST | `/api/sessions/:id/files` | Any | Upload file for chat sharing |
| POST | `/api/sessions/:id/recording` | Agent | Upload recording blob after call |
| GET | `/api/sessions/:id/recording` | Agent | Get recording status + download path |
| GET | `/api/sessions/join/:token` | Public | Validate an invite token |

### Admin
| Method | Route | Access | Description |
|---|---|---|---|
| GET | `/api/admin/sessions` | Agent | All sessions with participant details |
| GET | `/api/admin/stats` | Agent | Live stats (active sessions, participants, etc.) |
| POST | `/api/admin/sessions/:id/end` | Admin | Force-end any session |
| GET | `/api/admin/metrics` | Public | Prometheus-format metrics |

### Health
| Method | Route | Description |
|---|---|---|
| GET | `/health` | Server health check |

---

## Socket.IO Events

| Event | Direction | Description |
|---|---|---|
| `join-room` | Client → Server | Join a session room (auth or invite token) |
| `leave-room` | Client → Server | Explicit leave (immediate, no grace delay) |
| `create-transport` | Client → Server | Create send or recv WebRTC transport |
| `connect-transport` | Client → Server | Connect transport with DTLS parameters |
| `produce` | Client → Server | Start sending a media track |
| `consume` | Client → Server | Start receiving a remote track |
| `resume-consumer` | Client → Server | Resume a paused consumer |
| `close-producer` | Client → Server | Pause/resume a producer (mute/unmute) |
| `send-message` | Client → Server | Send a chat message |
| `end-session` | Client → Server | End session for all participants (agent or customer) |
| `peer-joined` | Server → Client | A new participant joined |
| `peer-left` | Server → Client | A participant left |
| `new-producer` | Server → Client | Remote peer started a new media track |
| `producer-state-changed` | Server → Client | Remote peer muted/unmuted |
| `new-message` | Server → Client | New chat message |
| `session-ended` | Server → Client | Session was ended (by agent or customer) |
| `consumer-closed` | Server → Client | A consumer track was closed |

---

## Architecture

See [architecture.md](./architecture.md) for the full system design diagram, component breakdown, and media flow explanation.

**Key design decisions:**

- **mediasoup SFU** — all media routes through the server. No direct peer-to-peer. Every participant sends one upstream, server fans out to all consumers.
- **No third-party video SDK** — fully self-hosted. mediasoup handles all WebRTC transport.
- **Embedded MongoDB fallback** — MongoMemoryServer with WiredTiger persistence at `server/data/mongodb`. Works with zero MongoDB installation.
- **Role security** — customers use `sessionStorage` (tab-isolated), agents use `localStorage` with JWT. Even on the same browser, customer tabs cannot access agent routes.
- **Reconnect grace window** — 15-second buffer on unexpected disconnect before broadcasting `peer-left`. Explicit `leave-room` bypasses this for immediate cleanup.

---

## Known Limitations

- **HTTPS required** — WebRTC mandates HTTPS. In dev/LAN mode, self-signed certs require a one-time browser trust prompt.
- **LAN-only by default** — mediasoup's `MEDIASOUP_ANNOUNCED_IP` must be a reachable IP. For cross-network calls, set this to a public IP/domain with proper SSL.
- **Recording is client-side** — the MediaRecorder captures the local screen composite and uploads on call end. Server-side SFU recording (via mediasoup's `PipeTransport`) is not implemented.
- **Single mediasoup worker** — suitable for a demo / small concurrent load. Production would scale workers to match CPU cores.

---

## Login Credentials (for Judges)

| Role | Email | Password |
|---|---|---|
| Agent | agent@demo.com | password123 |
| Agent 2 | agent2@demo.com | password123 |
| Admin | admin@demo.com | password123 |
| Customer | _(use invite link generated by agent)_ | _(no password — name only)_ |

---

## Built By

**Aradhya Vaish** — AtomQuest Hackathon 1.0 Grand Finale
