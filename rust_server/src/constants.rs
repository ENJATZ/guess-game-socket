pub const PASSWORD: &str = "secret";
pub const MSG_INIT: u8 = 0x01;
pub const MSG_PASSWORD_RESPONSE: u8 = 0x02;
pub const MSG_ASSIGN_ID: u8 = 0x03;
pub const MSG_REQUEST_OPPONENTS: u8 = 0x04;
pub const MSG_OPPONENTS_RESPONSE: u8 = 0x05;
pub const MSG_REQUEST_MATCH: u8 = 0x06;
pub const MSG_MATCH_CONFIRM: u8 = 0x07;
pub const MSG_GUESS_WORD: u8 = 0x08;
pub const MSG_HINT: u8 = 0x09;
pub const MSG_PROGRESS_UPDATE: u8 = 0x0a;
pub const MSG_TEXT: u8 = 0x0b;
pub const MSG_ERROR: u8 = 0xff;
