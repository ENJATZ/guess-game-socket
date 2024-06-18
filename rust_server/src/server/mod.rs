pub mod client_handler;
pub mod game;

use std::collections::HashMap;
use std::net::{ TcpListener, TcpStream };
use std::sync::{ Arc, Mutex };
use std::thread;

use self::client_handler::handle_client;

pub struct Server {
    clients: Arc<Mutex<HashMap<u32, TcpStream>>>,
    next_id: Arc<Mutex<u32>>,
}

impl Server {
    pub fn new() -> Server {
        Server {
            clients: Arc::new(Mutex::new(HashMap::new())),
            next_id: Arc::new(Mutex::new(1)),
        }
    }

    pub fn run(self: Arc<Self>, address: &str) {
        let listener = TcpListener::bind(address).unwrap();
        println!("Server listening on {}", address);

        for stream in listener.incoming() {
            match stream {
                Ok(stream) => {
                    let server = Arc::clone(&self);
                    thread::spawn(move || {
                        handle_client(server, stream);
                    });
                }
                Err(e) => {
                    println!("Error: {}", e);
                }
            }
        }
    }
}
