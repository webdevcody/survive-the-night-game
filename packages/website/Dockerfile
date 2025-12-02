FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN mkdir -p ./packages/website ./packages/game-client ./packages/game-shared
COPY packages/website/package*.json ./packages/website/
COPY packages/game-client/package*.json ./packages/game-client/
COPY packages/game-shared/package*.json ./packages/game-shared/
RUN npm ci
COPY . .
RUN npm run build -w packages/website && \
    npm ci --omit=dev -w packages/website
WORKDIR /app/packages/website
CMD ["npm", "run", "start"]


