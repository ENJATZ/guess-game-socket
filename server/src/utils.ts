import * as net from "net";

export function sendMessage(
  socket: net.Socket,
  messageType: number,
  message: Buffer
) {
  const buffer = Buffer.alloc(1 + message.length);
  buffer.writeUInt8(messageType, 0);
  message.copy(buffer, 1);
  socket.write(buffer);
}

export function sendError(socket: net.Socket, error: string) {
  const message = Buffer.from(error);
  sendMessage(socket, 0xff, message);
}
