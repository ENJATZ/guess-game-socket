use std::sync::{ Arc, Mutex };
use std::thread;
use std::io::{ Read, Write };
use crate::server::Server;
use crate::constants::{ MSG_GUESS_WORD, MSG_HINT, MSG_PROGRESS_UPDATE };

pub fn start_guessing_game(
    server: Arc<Server>,
    client_a_id: u32,
    client_b_id: u32,
    word_to_guess: String
) {
    let clients = server.clients.lock().unwrap();
    let client_a = clients.get(&client_a_id).unwrap().try_clone().unwrap();
    let client_b = clients.get(&client_b_id).unwrap().try_clone().unwrap();
    drop(clients);

    let word = Arc::new(word_to_guess);
    let attempts = Arc::new(Mutex::new(0));
    let max_attempts = 10;

    let server_clone = Arc::clone(&server);
    let word_clone = Arc::clone(&word);
    let attempts_clone = Arc::clone(&attempts);

    thread::spawn(move || {
        handle_client_a(
            client_a_id,
            client_a,
            server_clone,
            word_clone,
            attempts_clone,
            max_attempts
        );
    });

    thread::spawn(move || {
        handle_client_b(client_b_id, client_b, server, word, attempts, max_attempts);
    });
}

fn handle_client_a(
    client_id: u32,
    mut stream: std::net::TcpStream,
    server: Arc<Server>,
    word: Arc<String>,
    attempts: Arc<Mutex<u32>>,
    max_attempts: u32
) {
    let mut buffer = [0; 512];
    loop {
        match stream.read(&mut buffer) {
            Ok(bytes_read) if bytes_read > 0 => {
                match buffer[0] {
                    MSG_HINT => {
                        let hint = String::from_utf8(buffer[1..bytes_read].to_vec())
                            .unwrap()
                            .trim()
                            .to_string();
                        println!("Received hint from client {}: {}", client_id, hint);

                        let mut clients = server.clients.lock().unwrap();
                        if let Some(mut client_b_stream) = clients.get_mut(&2) {
                            client_b_stream.write_all(&buffer[..bytes_read]).unwrap();
                            client_b_stream.flush().unwrap();
                        
                        } else {
                            println!("Client B not found to forward hint");
                        }
                    }
                    _ => {
                        println!("Unknown message type from client {}: {}", client_id, buffer[0]);
                    }
                }
            }
            Ok(_) => {
                println!("Client {} disconnected", client_id);
                break;
            }
            Err(e) => {
                println!("Error reading from client {}: {:?}", client_id, e);
                break;
            }
        }
    }
}

fn handle_client_b(
    client_id: u32,
    mut stream: std::net::TcpStream,
    server: Arc<Server>,
    word: Arc<String>,
    attempts: Arc<Mutex<u32>>,
    max_attempts: u32
) {
    let mut buffer = [0; 512];
    loop {
        match stream.read(&mut buffer) {
            Ok(bytes_read) if bytes_read > 0 => {
                match buffer[0] {
                    MSG_GUESS_WORD => {
                        let guess = String::from_utf8(buffer[1..bytes_read].to_vec())
                            .unwrap()
                            .trim()
                            .to_string();
                        let mut attempts = attempts.lock().unwrap();
                        *attempts += 1;

                        println!("Client {} guessed: {}", client_id, guess);

                        if guess == *word {
                            let success_message = [MSG_PROGRESS_UPDATE, 1];
                            stream.write_all(&success_message).unwrap();
                            stream.flush().unwrap();
                            println!("Client {} guessed the word correctly!", client_id);
                            break;
                        } else {
                            let fail_message = [MSG_PROGRESS_UPDATE, 0];
                            stream.write_all(&fail_message).unwrap();
                            stream.flush().unwrap();
                            println!("Client {} guessed incorrectly.", client_id);

                            if *attempts >= max_attempts {
                                println!(
                                    "Client {} failed to guess the word within {} attempts.",
                                    client_id,
                                    max_attempts
                                );
                                break;
                            }
                        }

                        let mut clients = server.clients.lock().unwrap();
                        if let Some(mut client_a_stream) = clients.get_mut(&1) {
                            client_a_stream.write_all(&[MSG_PROGRESS_UPDATE, 0]).unwrap();
                            client_a_stream.flush().unwrap();

                            // this does not work for some reason..
                            println!("Informed client A about the progress");
                        } else {
                            println!("Client A not found to inform progress");
                        }
                    }
                    _ => {
                        println!("Unknown message type from client {}: {}", client_id, buffer[0]);
                    }
                }
            }
            Ok(_) => {
                println!("Client {} disconnected", client_id);
                break;
            }
            Err(e) => {
                println!("Error reading from client {}: {:?}", client_id, e);
                break;
            }
        }
    }
}
