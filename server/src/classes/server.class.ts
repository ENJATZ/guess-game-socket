import * as net from "net";
import { MessageHandler } from "./message-handler.class";

export class Server {
  private clients: Map<number, net.Socket>;
  private messageHandler: MessageHandler;

  constructor() {
    this.clients = new Map();
    this.messageHandler = new MessageHandler(this.clients);
  }

  start(port: number) {
    const server = net.createServer((socket) => this.handleConnection(socket));
    server.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  }

  handleConnection(socket: net.Socket) {
    console.log("New client connected");

    socket.on("data", (data) => {
      this.messageHandler.handleMessage(socket, data);
    });

    socket.on("close", () => {
      this.removeClient(socket);
    });
  }

  removeClient(socket: net.Socket) {
    const clientId = this.messageHandler.getClientId(socket);
    if (clientId !== null) {
      this.clients.delete(clientId);
      console.log(`Client ${clientId} disconnected`);
    }
  }
}
