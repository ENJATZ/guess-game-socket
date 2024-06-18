import { GameClient } from "./classes/game-client.class";
import { Config } from "./constants";

const client = new GameClient(Config.host, Config.port);
client.connect();
