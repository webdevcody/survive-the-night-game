FROM node:22-alpine

WORKDIR /app
COPY package*.json ./
COPY packages/website/package*.json ./packages/website/
COPY packages/game-client/package*.json ./packages/game-client/
COPY packages/game-shared/package*.json ./packages/game-shared/
RUN npm ci
COPY . .
# Website bundles game-client and game-shared directly from source
RUN npm run build -w packages/website && \
    npm i -w packages/website
WORKDIR /app/packages/website
CMD ["npm", "run", "start"]


