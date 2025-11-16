FROM ubuntu:24.04 as build

# Install Node.js 24 and build dependencies
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    python3 \
    make \
    g++ \
    && curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json* ./
COPY packages/game-shared/package.json ./packages/game-shared/
COPY packages/game-server/package.json ./packages/game-server/
COPY tsconfig.json ./

# Copy all tsconfig files first
COPY packages/game-shared/tsconfig.json ./packages/game-shared/
COPY packages/game-server/tsconfig.json ./packages/game-server/

# Install dependencies (this will compile uwebsockets.js from source)
RUN npm ci

# Copy source files
COPY packages/game-shared ./packages/game-shared
COPY packages/game-server ./packages/game-server

WORKDIR /app/packages/game-server

RUN npm run build

FROM ubuntu:24.04

# Install Node.js 24
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json* ./
COPY packages/game-shared/package.json ./packages/game-shared/
COPY packages/game-server/package.json ./packages/game-server/

# Copy built files and compiled node_modules from build stage
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/game-shared ./packages/game-shared
COPY --from=build /app/packages/game-server/dist ./packages/game-server/dist

WORKDIR /app/packages/game-server

CMD ["node", "dist/server.cjs"]
