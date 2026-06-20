# Chessmate

A real-time, full-stack chess web app — play live games against a friend over the network or challenge a native chess engine, with synced clocks, draw/resign, and full rules enforcement.

**🔗 Live demo: [chessmate.ayushsinha.dev](https://chessmate.ayushsinha.dev)**

> Note: the backend is hosted on a free tier that sleeps when idle, so the first connection after a while may take a few seconds to wake the server.

## Features

- **Multiplayer over the network** — create a room, share the link, and play a friend in real time via Socket.IO.
- **Single-player vs a chess engine** — play the bundled native engine across five difficulty levels (beginner → expert).
- **Authoritative two-sided clocks** — server-owned time control with increment, kept in sync with the client display.
- **Full rules enforcement** — legal-move highlighting, promotion, check/checkmate, stalemate, and every draw type (threefold, fifty-move, insufficient material), powered by `chess.js`.
- **Draw offers, resignation, and disconnect handling.**

## Tech stack

| | |
| --- | --- |
| **Client** | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, Mantine, `chess.js`, `socket.io-client` |
| **Server** | Express 5, Socket.IO, TypeScript, Winston |
| **Engine** | A native chess engine binary, invoked as a child process |

## Architecture

The repository contains **two independently-installed packages** — there is no root `package.json`:

- **`client/`** — the Next.js front end. It is the **chess-rules authority**: `chess.js` decides move legality and end-of-game, and the client computes the resulting board position.
- **`server/`** — the Express + Socket.IO back end. It is the **clock and relay authority**: it owns the game clocks, relays moves between players, and wraps the native engine — but it never re-validates chess moves.

This deliberate split keeps the server lightweight (it never bundles chess logic) while the client stays the single source of truth for legality. Game state lives in memory on the server (one room map, no database), so rooms reset when the server restarts.

## Getting started

### Prerequisites

- Node.js 18+ and npm
- The two packages are installed and run separately.

### 1. Clone

```bash
git clone https://github.com/Andr0human/Chessmate.git
cd Chessmate
```

### 2. Start the server

```bash
cd server
npm install
npm start          # dev mode: ts-node + nodemon, hot reload on http://localhost:8080
```

Create `server/.env` (see [Environment variables](#environment-variables)) if you need non-default settings.

### 3. Start the client

In a second terminal:

```bash
cd client
npm install
npm run dev        # Next.js dev server on http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000) and start a game.

> Single-player mode requires the native engine binary in `server/public/` (`elsa.exe` on Windows, `elsa` otherwise), which ships with the repo.

## Environment variables

### Client (`client/.env`)

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8080` | REST base URL of the server |
| `NEXT_PUBLIC_SOCKET_URL` | `http://localhost:8080` | Socket.IO URL of the server |

### Server (`server/.env`)

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8080` | Port the server listens on |
| `FRONTEND_URL` | `http://localhost:3000` | Client origin |
| `DEV_MODE` | `development` | Run mode |
| `CORS_ORIGIN` | `"*"` | Socket.IO allowed origin — **must be valid JSON** (it is `JSON.parse`d), e.g. `"*"` or a JSON array |
| `CORS_CREDENTIALS` | `false` | Whether to allow credentialed CORS requests |
| `ADMIN_PASS` | `admin` | Password gating the `/api/engine` debug routes (`?adminPass=`) |

## Available scripts

### Client (`cd client`)

| Script | Description |
| --- | --- |
| `npm run dev` | Dev server (Next + Turbopack) on port 3000 |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` / `npm run lint:fix` | Lint (ESLint) |

### Server (`cd server`)

| Script | Description |
| --- | --- |
| `npm start` | Dev server (ts-node + nodemon, hot reload) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run server` | Run the compiled build from `dist/` |

## Deployment

The client and server deploy independently. Point the client's `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_SOCKET_URL` at the deployed server, and set the server's `CORS_ORIGIN` (valid JSON) and `FRONTEND_URL` to the client's origin. The live demo runs the client and server on separate hosts.

## License

Released under the [MIT License](LICENSE). © Ayush Sinha
