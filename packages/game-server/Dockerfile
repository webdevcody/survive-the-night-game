FROM node:20-alpine as build

WORKDIR /app

COPY . .

RUN npm install
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=build /app/package*.json .

RUN npm install --only=production

COPY --from=build /app/dist dist

CMD ["node", "dist/server.js"]
