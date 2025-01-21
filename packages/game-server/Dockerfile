FROM node:20-alpine as build

WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json* ./
COPY packages/game-shared/package.json ./packages/game-shared/
COPY packages/game-server/package.json ./packages/game-server/
COPY tsconfig.json ./

# Copy all tsconfig files first
COPY packages/game-shared/tsconfig.json ./packages/game-shared/
COPY packages/game-server/tsconfig.json ./packages/game-server/

# Install dependencies
RUN npm ci

# Copy source files
COPY packages/game-shared ./packages/game-shared
COPY packages/game-server ./packages/game-server

WORKDIR /app/packages/game-server

RUN npm run build

FROM node:20-alpine

WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json* ./
COPY packages/game-shared/package.json ./packages/game-shared/
COPY packages/game-server/package.json ./packages/game-server/
COPY tsconfig.json ./

# Copy tsconfig files
COPY packages/game-shared/tsconfig.json ./packages/game-shared/
COPY packages/game-server/tsconfig.json ./packages/game-server/

# Install production dependencies
RUN npm ci --only=production

# Copy built files
COPY --from=build /app/packages/game-shared ./packages/game-shared
COPY --from=build /app/packages/game-server/dist ./packages/game-server/dist

WORKDIR /app/packages/game-server

CMD ["node", "dist/server.cjs"]
