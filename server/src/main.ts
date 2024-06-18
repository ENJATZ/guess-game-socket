import { Config } from "./constants";
import { Server } from "./classes/server.class";

const server = new Server();
server.start(Config.port);
