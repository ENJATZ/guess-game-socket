import * as net from "net";
import { Protocol } from "./protocol";
import { MessageType } from "../../../constants";

export class GameClient {
  private socket: net.Socket;
  private clientId: number | null = null;
  private isInitiator: boolean = false;
  private mode: "menu" | "game" = "menu";

  constructor(private host: string, private port: number) {
    this.socket = new net.Socket();
    this.socket.on("data", this.onData.bind(this));
    this.socket.on("close", this.onClose.bind(this));
    this.socket.on("error", this.onError.bind(this));
  }

  connect() {
    this.socket.connect(this.port, this.host, () => {
      console.log("Connected to server, sending the init message..");
      this.sendInitMessage();
    });
  }

  private sendInitMessage() {
    const message = Protocol.createInitMessage();
    this.socket.write(message);
  }

  private sendPassword() {
    const message = Protocol.createPasswordMessage("secret");
    this.socket.write(message);
  }

  private requestOpponents() {
    const message = Protocol.createRequestOpponentsMessage();
    this.socket.write(message);
  }

  private requestMatch(opponentId: number, word: string) {
    const message = Protocol.createRequestMatchMessage(opponentId, word);
    this.socket.write(message);
    this.isInitiator = true;
    this.mode = "game"; // Switch to game mode
  }

  private sendGuess(guess: string) {
    const message = Protocol.createGuessWordMessage(guess);
    this.socket.write(message);
  }

  private sendHint(hint: string) {
    const message = Protocol.createHintMessage(hint);
    this.socket.write(message);
  }

  private clientIdToPlayerId(clientId: number) {
    return String.fromCharCode(64 + clientId);
  }

  private onData(data: Buffer) {
    const messageType = data[0];
    switch (messageType) {
      case MessageType.Init:
        console.log("Welcome to the Guess Game!");
        this.sendPassword();
        break;
      case MessageType.EndMatch:
        this.displayMenu();
        break;
      case MessageType.TextMessage:
        const messageLength = data.readUInt32BE(1);
        let message = data.toString("utf-8", 5, 5 + messageLength);
        console.log("\n\n" + message + "\n\n");
        break;
      case MessageType.AssignId:
        this.clientId = data.readUInt32BE(1);
        this.displayMenu();
        break;
      case MessageType.OpponentsResponse:
        this.handleOpponentsResponse(data);
        break;
      case MessageType.MatchConfirm:
        console.log("Match confirmed with opponent");
        this.displayGameMenu();
        break;
      case MessageType.ProgressUpdate:
        const success = data[1] === 1;
        const guess = data.slice(2).toString();
        if (success) {
          if (this.isInitiator) {
            console.log(`Your opponent guessed the word '${guess}'`);
          } else {
            console.log(`Correct guess: ${guess}`);
          }
        } else {
          if (this.isInitiator) {
            console.log(
              `Your opponent typed in an incorrect guess: '${guess}'`
            );
            this.displayGameMenu();
          } else {
            console.log(`Incorrect guess: ${guess}`);
            this.displayGameMenu();
          }
        }
        break;
      case MessageType.Hint:
        this.handleHint(data);
        this.displayGameMenu();
        break;
      case MessageType.Error:
        console.error(`Error from server: ${data[1]}`);
        break;
      default:
        console.error(`Unknown message type: ${messageType}`);
    }
  }

  private handleOpponentsResponse(data: Buffer) {
    const numOpponents = data.readUInt32BE(1);
    console.log(`Number of opponents: ${numOpponents}`);
    const opponents = [];
    const opponentsAsMessage = [];
    for (let i = 0; i < numOpponents; i++) {
      let opponentId = data.readUInt32BE(5 + i * 4);
      opponents.push(opponentId);
      opponentsAsMessage.push(
        `Player ${this.clientIdToPlayerId(opponentId)}(id: ${opponentId})`
      );
    }
    // Request a match with the first opponent (for simplicity)
    if (opponents.length > 0) {
      console.log(
        `Opponents(${opponentsAsMessage.length}): ${opponentsAsMessage.join(
          ", "
        )}`
      );
    } else {
      console.log("Waiting for opponents..");
    }
    this.displayMenu();
  }

  private handleHint(data: Buffer) {
    const hintLength = data.readUInt32BE(1);
    const hint = data.toString("utf-8", 5, 5 + hintLength);
    console.log(`* Received hint: ${hint}`);
  }

  private displayMenu() {
    this.mode = "menu"; // Switch to menu mode
    console.log("[L] To list all available opponents");
    console.log(
      "[R] To request an opponent by id, and then type in the word to guess"
    );

    const stdin = process.stdin;
    stdin.setEncoding("utf-8");
    stdin.removeAllListeners("data"); // Remove previous listeners to avoid conflicts
    stdin.on("data", (input) => {
      const command = input.toString().trim().toUpperCase();
      if (this.mode === "menu") {
        if (command === "L") {
          this.requestOpponents();
        } else if (command.startsWith("R")) {
          const parts = command.split(" ");
          if (parts.length >= 3) {
            // Allow for multiple words in the guess
            const opponentId = parseInt(parts[1], 10);
            const wordToGuess = parts.slice(2).join(" ");
            this.requestMatch(opponentId, wordToGuess);
          } else {
            console.log("Invalid format. Use: R <opponentId> <wordToGuess>");
          }
        } else {
          console.log(
            "Unknown command. Please enter L to list opponents or R to request a match."
          );
        }
      }
    });
  }

  private displayGameMenu() {
    this.mode = "game"; // Switch to game mode
    const stdin = process.stdin;
    stdin.setEncoding("utf-8");
    stdin.removeAllListeners("data"); // Remove previous listeners to avoid conflicts

    if (this.isInitiator) {
      console.log("[H] To send a hint to the opponent");
      stdin.on("data", (input) => {
        const command = input.toString().trim().toUpperCase();
        if (this.mode === "game" && command.startsWith("H")) {
          const hint = command.slice(1).trim();
          if (hint.length > 0) {
            this.sendHint(hint);
          } else {
            console.log("Hint cannot be empty. Please enter a valid hint.");
          }
        } else {
          console.log("Unknown command. Please enter H to send a hint.");
        }
        this.displayGameMenu();
      });
    } else {
      console.log("[G] To send a guess");
      stdin.on("data", (input) => {
        const command = input.toString().trim().toUpperCase();
        if (this.mode === "game" && command.startsWith("G")) {
          const guess = command.slice(1).trim();
          if (guess.length > 0) {
            this.sendGuess(guess);
          } else {
            console.log("Guess cannot be empty. Please enter a valid guess.");
          }
        } else {
          console.log("Unknown command. Please enter G to send a guess.");
        }
        this.displayGameMenu();
      });
    }
  }

  private onClose() {
    console.log("Connection closed");
  }

  private onError(err: Error) {
    console.error(`Connection error: ${err.message}`);
  }
}
