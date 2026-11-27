use std::io::{Read,Write};
use std::net::TcpListener;
fn main(){let port=std::env::var("PORT").unwrap();let listener=TcpListener::bind(format!("127.0.0.1:{}",port)).unwrap();for stream in listener.incoming(){let mut stream=stream.unwrap();let mut buffer=[0;2048];let _=stream.read(&mut buffer);let body="{\"sum\":42}";let response=format!("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",body.len(),body);let _=stream.write_all(response.as_bytes());}}
