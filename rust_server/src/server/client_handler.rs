use std::io::{ Read, Write };
use std::net::TcpStream;
use std::sync::Arc;
use crate::server::{ Server, game::start_guessing_game };
use crate::constants::{
    MSG_INIT,
    MSG_PASSWORD_RESPONSE,
    MSG_ASSIGN_ID,
    MSG_ERROR,
    MSG_MATCH_CONFIRM,
    MSG_REQUEST_OPPONENTS,
    MSG_OPPONENTS_RESPONSE,
    MSG_REQUEST_MATCH,
    PASSWORD,
};
pub fn handle_client(server: Arc<Server>, mut stream: TcpStream) {
    println!("New client connected");

    let mut buffer = [0; 512];

    let bytes_read = stream.read(&mut buffer).unwrap();

    if buffer[0] == MSG_INIT {
        let response = [MSG_INIT, 0x00];
        stream.write_all(&response);
        stream.flush();

        let bytes_read = stream.read(&mut buffer).unwrap();
        println!("Password response bytes read: {}", bytes_read);
        if buffer[0] == MSG_PASSWORD_RESPONSE {
            let password = String::from_utf8(buffer[1..bytes_read].to_vec()).unwrap();
            let trimmed_password = password.trim();
            println!("Received password: {:?}", trimmed_password);

            if trimmed_password == PASSWORD {
                let client_id = {
                    let mut id = server.next_id.lock().unwrap();
                    let client_id = *id;
                    *id += 1;
                    client_id
                };

                {
                    let mut clients = server.clients.lock().unwrap();
                    clients.insert(client_id, stream.try_clone().unwrap());
                }

                let mut response = vec![MSG_ASSIGN_ID];
                response.extend_from_slice(&client_id.to_be_bytes());
                stream.write_all(&response);
                stream.flush();
                println!("Client ID sent: {:?}", client_id);

                loop {
                    let bytes_read = match stream.read(&mut buffer) {
                        Ok(n) if n == 0 => {
                            println!("Client {:?} disconnected", client_id);
                            break;
                        }
                        Ok(n) => n,
                        Err(e) => {
                            println!("Error reading from client {:?}: {:?}", client_id, e);
                            break;
                        }
                    };

                    match buffer[0] {
                        MSG_REQUEST_OPPONENTS => {
                            let clients = server.clients.lock().unwrap();
                            let opponent_ids: Vec<u32> = clients
                                .keys()
                                .filter(|&&id| id != client_id)
                                .cloned()
                                .collect();
                            drop(clients);

                            let mut response = vec![MSG_OPPONENTS_RESPONSE];
                            response.extend_from_slice(&(opponent_ids.len() as u32).to_be_bytes());
                            for &id in &opponent_ids {
                                response.extend_from_slice(&id.to_be_bytes());
                            }

                            stream.write_all(&response);
                            stream.flush();
                        }
                        MSG_REQUEST_MATCH => {
                            let opponent_id = u32::from_be_bytes([
                                buffer[1],
                                buffer[2],
                                buffer[3],
                                buffer[4],
                            ]);
                            let word_length = u32::from_be_bytes([
                                buffer[5],
                                buffer[6],
                                buffer[7],
                                buffer[8],
                            ]) as usize;
                            let word = String::from_utf8(
                                buffer[9..9 + word_length].to_vec()
                            ).unwrap();

                            let clients = server.clients.lock().unwrap();
                            if let Some(mut opponent_stream) = clients.get(&opponent_id) {
                                let response = vec![MSG_MATCH_CONFIRM];
                                stream.write_all(&response);
                                stream.flush();

                                let opponent_response = vec![MSG_MATCH_CONFIRM];

                                opponent_stream.write_all(&response);
                                opponent_stream.flush();

                                drop(clients);

                                start_guessing_game(server.clone(), client_id, opponent_id, word);
                            } else {
                                let response = [MSG_ERROR, 0x02];
                                if let Err(e) = stream.write_all(&response) {
                                    println!("Error sending opponent not found message: {:?}", e);
                                }
                                if let Err(e) = stream.flush() {
                                    println!("Error flushing opponent not found message: {:?}", e);
                                }
                            }
                        }
                        MSG_HINT => {}
                        _ => {
                            println!("Unknown message type: {:?}", buffer[0]);
                        }
                    }
                }
            } else {
                let response = [MSG_ERROR, 0x01];
                stream.write_all(&response);
                stream.flush();
                println!("Wrong password, closing connection");
                return;
            }
        } else {
            println!("Unexpected message after handshake: {:?}", buffer[0]);
        }
    } else {
        println!("Unexpected initial message: {:?}", buffer[0]);
    }
}
