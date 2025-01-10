import { World } from "@/game";
import { Server } from "@/network";

const world = new World();
const server = new Server(world, { port: 3001 });

server.on("connection", (client) => {
  console.log("connection client");
});

setInterval(() => {
  server.tick();
});
