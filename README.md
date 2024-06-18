## Guess Game

### Overview

This project implements a multiplayer "Guess the Word" game using a client-server architecture. The server is built with TypeScript and Node.js, providing game logic. The client connects to the server to participate in the game. The communication between the client and server is done over TCP sockets.


### Technologies Used

- **Node.js**: JavaScript runtime for the server.
- **TypeScript**: Typed superset of JavaScript for both client and server.
- **net**: Node.js module for creating TCP servers and clients.
- **Rust**: Used for the rust server that is still WIP, not working as it should, use the node.js server instead.

### Game Flow

1. **Client connects to the server.**
2. **Server sends an initial message.**
3. **Client sends a password to authenticate.**
4. **Server assigns an ID to the client upon successful authentication.**
5. **Client can request a list of possible opponents.**
6. **Client can request a match with an opponent by specifying a word to guess.**
7. **The opponent is informed of the match and begins guessing.**
8. **Client A (initiator) is informed of the progress of Client B (guesser).**
9. **Client A can send hints to Client B.**
10. **Match ends when Client B guesses the word or gives up.**
11. **Both clients are informed of the match result and return to the main menu.**

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/enjatz/guess-game-socket.git
   cd guess-game-socket
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

### Building the Project

1. **Build the client**:
   ```bash
   npm run build:client
   ```

2. **Build the server**:
   ```bash
   npm run build:server
   ```
### Running the Project

   ```bash
   npm run start:server
   npm run start:client (2 clients needed)
   ```

### Similar Projects
- [Simple C Socket](https://github.com/ENJATZ/pi_simple_socket)


### License

MIT License

Copyright (c) 2024 Sebastian Deme

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.