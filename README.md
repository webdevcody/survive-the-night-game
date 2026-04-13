# Survive the Night

Monorepo: **website** (TanStack Start on port **3000**) + **game-server** (WebSocket on port **3001**).

## Prerequisites

- [Node.js](https://nodejs.org/)20+ and npm
- [Docker](https://www.docker.com/) (for PostgreSQL)

## Setup

From the repo root:

```bash
npm install
```

### 1. Database

Start Postgres:

```bash
npm run db:up
```

### 2. Environment

Copy the examples and fill in values:

| Package | Copy from |
|--------|-----------|
| Website | `packages/website/.env.example` → `packages/website/.env` |
| Game server | `packages/game-server/.env.example` → `packages/game-server/.env` |

**Minimum for local dev**

- `packages/website/.env`: set `DATABASE_URL` (matches the Docker DB from `db:up`), `BETTER_AUTH_SECRET`, and **`GAME_SERVER_API_KEY`** (any shared secret string).
- `packages/game-server/.env`: set **`GAME_SERVER_API_KEY`** to the **same** value as the website.

Run migrations (also runs automatically when you start the website dev server):

```bash
npm run db:migrate
```

## Run

From the repo root, start website + game server together:

```bash
npm run dev
```

- App: [http://localhost:3000](http://localhost:3000)
- Game WebSocket server: port **3001** (used by the client in the browser)

### Run packages separately (optional)

```bash
npm run dev:website   # website only
npm run dev:server    # game server only
```
