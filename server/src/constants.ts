export const MessageType = {
  Init: 0x01,
  PasswordResponse: 0x02,
  AssignId: 0x03,
  RequestOpponents: 0x04,
  OpponentsResponse: 0x05,
  RequestMatch: 0x06,
  MatchConfirm: 0x07,
  GuessWord: 0x08,
  Hint: 0x09,
  ProgressUpdate: 0x0a,
  TextMessage: 0x0b,
  Error: 0xff,
  EndMatch: 0x0c,
};

export const Config = {
  host: "127.0.0.1",
  port: 4000,
};

export const PASSWORD = "secret";
