mod server;
mod constants;

use std::sync::Arc;

use server::Server;

fn main() {
    let server = Arc::new(Server::new());
    server.run("127.0.0.1:4000");
}
