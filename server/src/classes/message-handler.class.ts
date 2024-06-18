import * as net from "net";
import { EventEmitter } from "events";
import { sendMessage, sendError } from "../utils";
import { MessageType, PASSWORD } from "../constants";

class MessageHandler extends EventEmitter {
  private clients: Map<number, net.Socket>;
  private nextId: number;
  private word: string;
  private attempts: number;
  private maxAttempts: number;
  private ongoingMatches: Map<number, { opponentId: number; word: string }>;

  constructor(clients: Map<number, net.Socket>) {
    super();
    this.clients = clients;
    this.nextId = 1;
    this.word = "";
    this.attempts = 0;
    this.maxAttempts = 10;
    this.ongoingMatches = new Map();
  }

  handleMessage(socket: net.Socket, data: Buffer) {
    const messageType = data[0];

    switch (messageType) {
      case MessageType.Init:
        console.log("Received init message");
        this.sendInitMessage(socket);
        break;
      case MessageType.PasswordResponse:
        const password = data.slice(1).toString().trim();
        if (password === PASSWORD) {
          this.assignClientId(socket);
        } else {
          sendError(socket, "Invalid password");
          socket.end();
        }
        break;
      case MessageType.RequestOpponents:
        this.sendOpponentsList(socket);
        break;
      case MessageType.RequestMatch:
        const opponentId = data.readUInt32BE(1);
        const wordLength = data.readUInt32BE(5);
        const word = data
          .slice(9, 9 + wordLength)
          .toString()
          .trim();
        this.requestMatch(socket, opponentId, word);
        break;
      case MessageType.GuessWord:
        this.handleGuess(socket, data);
        break;
      case MessageType.Hint:
        this.handleHint(socket, data.slice(1).toString().trim());
        break;
      default:
        console.log("Unknown message type:", messageType);
        sendError(socket, "Unknown message type");
    }
  }

  sendInitMessage(socket: net.Socket) {
    sendMessage(socket, MessageType.Init, Buffer.from([0x00]));
  }

  assignClientId(socket: net.Socket) {
    const clientId = this.nextId++;
    this.clients.set(clientId, socket);
    const response = Buffer.alloc(5);
    response.writeUInt8(MessageType.AssignId, 0);
    response.writeUInt32BE(clientId, 1);
    socket.write(response);

    console.log(`Assigned client ID: ${clientId}`);
    this.emit("clientAssigned", clientId);
  }

  sendOpponentsList(socket: net.Socket) {
    const clientId = this.getClientId(socket);
    if (clientId === null) return;

    const opponents = Array.from(this.clients.keys()).filter(
      (id) => id !== clientId
    );
    const response = Buffer.alloc(5 + opponents.length * 4);
    response.writeUInt8(MessageType.OpponentsResponse, 0);
    response.writeUInt32BE(opponents.length, 1);

    opponents.forEach((id, index) => {
      response.writeUInt32BE(id, 5 + index * 4);
    });

    socket.write(response);
    console.log(`Sent opponents list to client ${clientId}`);
  }

  requestMatch(socket: net.Socket, opponentId: number, word: string) {
    const clientId = this.getClientId(socket);
    if (clientId === null) return;

    const opponentSocket = this.clients.get(opponentId);
    if (!opponentSocket) {
      sendError(socket, "Opponent not found");
      return;
    }

    this.ongoingMatches.set(clientId, { opponentId, word });
    this.ongoingMatches.set(opponentId, { opponentId: clientId, word });

    const confirmMessage = Buffer.from([MessageType.MatchConfirm]);
    socket.write(confirmMessage);
    opponentSocket.write(confirmMessage);

    console.log(
      `Match requested between client ${clientId} and opponent ${opponentId}`
    );
  }

  handleGuess(socket: net.Socket, data: Buffer) {
    const clientId = this.getClientId(socket);
    if (clientId === null) return;

    const match = this.ongoingMatches.get(clientId);
    if (!match) {
      sendError(socket, "No ongoing match found");
      return;
    }

    const guessLength = data.readUInt32BE(1);
    const guess = data
      .slice(5, 5 + guessLength)
      .toString()
      .trim();

    if (guess === match.word.trim()) {
      this.broadcastMessage(
        `\n\n*** WORD GUESSED ***\nClient ${clientId} guessed the word correctly!\n\n`
      );

      this.endMatch(clientId, match.opponentId);
    } else {
      this.attempts++;
      if (this.attempts >= this.maxAttempts) {
        this.sendProgressUpdate(socket, false, guess);
        this.sendProgressUpdate(
          this.clients.get(match.opponentId),
          false,
          guess
        );
        this.broadcastMessage(`Client ${clientId} failed to guess the word.`);

        this.endMatch(clientId, match.opponentId);
      } else {
        this.sendProgressUpdate(socket, false, guess);
        this.sendProgressUpdate(
          this.clients.get(match.opponentId),
          false,
          guess
        );
      }
    }
  }

  handleHint(socket: net.Socket, hint: string) {
    const clientId = this.getClientId(socket);
    if (clientId === null) return;

    const match = this.ongoingMatches.get(clientId);
    if (!match) {
      sendError(socket, "No ongoing match found");
      return;
    }

    const opponentSocket = this.clients.get(match.opponentId);
    if (!opponentSocket) {
      sendError(socket, "Opponent not found");
      return;
    }

    const message = Buffer.from([MessageType.Hint, ...Buffer.from(hint)]);
    opponentSocket.write(message);
    console.log(
      `Hint from client ${clientId} to opponent ${match.opponentId}: ${hint}`
    );
  }

  sendProgressUpdate(
    socket: net.Socket | undefined,
    success: boolean,
    guess: string
  ) {
    if (!socket) return;
    const guessBuffer = Buffer.from(guess);
    const message = Buffer.alloc(2 + guessBuffer.length);
    message.writeUInt8(MessageType.ProgressUpdate, 0);
    message.writeUInt8(success ? 1 : 0, 1);
    guessBuffer.copy(message, 2);
    socket.write(message);
  }

  endMatch(clientId: number, opponentId: number) {
    this.ongoingMatches.delete(clientId);
    this.ongoingMatches.delete(opponentId);

    const endMessage = Buffer.from([MessageType.EndMatch, 0x00]);
    const clientSocket = this.clients.get(clientId);
    const opponentSocket = this.clients.get(opponentId);

    if (clientSocket) {
      clientSocket.write(endMessage);
    }
    if (opponentSocket) {
      opponentSocket.write(endMessage);
    }

    console.log(
      `Ended match between client ${clientId} and opponent ${opponentId}`
    );
  }

  getClientId(socket: net.Socket): number | null {
    for (const [id, clientSocket] of this.clients.entries()) {
      if (clientSocket === socket) {
        return id;
      }
    }
    return null;
  }

  setWord(word: string) {
    this.word = word;
    this.attempts = 0;
    console.log(`The word to guess is: ${word}`);
  }

  broadcastMessage(message: string) {
    const bufferMessage = Buffer.from(message);
    for (const socket of this.clients.values()) {
      socket.write(bufferMessage);
    }
  }
}

export { MessageHandler };
