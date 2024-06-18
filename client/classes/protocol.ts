import { MessageType } from "../../../constants";

export class Protocol {
  static createInitMessage(): Buffer {
    return Buffer.from([MessageType.Init]);
  }

  static createPasswordMessage(password: string): Buffer {
    const passwordBuffer = Buffer.from(password, "utf-8");
    const message = Buffer.alloc(1 + passwordBuffer.length);
    message[0] = MessageType.PasswordResponse;
    passwordBuffer.copy(message, 1);
    return message;
  }

  static createRequestOpponentsMessage(): Buffer {
    return Buffer.from([MessageType.RequestOpponents]);
  }

  static createRequestMatchMessage(opponentId: number, word: string): Buffer {
    const wordBuffer = Buffer.from(word, "utf-8");
    const message = Buffer.alloc(1 + 4 + 4 + wordBuffer.length);
    message[0] = MessageType.RequestMatch;
    message.writeUInt32BE(opponentId, 1);
    message.writeUInt32BE(wordBuffer.length, 5);
    wordBuffer.copy(message, 9);
    return message;
  }

  static createGuessWordMessage(guess: string): Buffer {
    const guessBuffer = Buffer.from(guess, "utf-8");
    const message = Buffer.alloc(1 + 4 + guessBuffer.length);
    message[0] = MessageType.GuessWord;
    message.writeUInt32BE(guessBuffer.length, 1);
    guessBuffer.copy(message, 5);
    return message;
  }

  static createHintMessage(hint: string): Buffer {
    const hintBuffer = Buffer.from(hint, "utf-8");
    const message = Buffer.alloc(1 + 4 + hintBuffer.length);
    message[0] = MessageType.Hint;
    message.writeUInt32BE(hintBuffer.length, 1);
    hintBuffer.copy(message, 5);
    return message;
  }
}
