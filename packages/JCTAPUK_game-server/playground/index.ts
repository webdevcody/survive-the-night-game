import Game from "@/game";
import { World } from "@/manager";
import { Server } from "@/network";
import config from "./game.config";

const game = new Game(config);
const world = new World(game);
const server = new Server(world, { port: 3001 });

server.on("connection", (client) => {
  console.log("connection client");
});

game.start();
