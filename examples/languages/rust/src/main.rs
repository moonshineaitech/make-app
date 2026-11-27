fn main() { let nums: Vec<i32> = std::env::args().skip(1).map(|x| x.parse().unwrap()).collect(); println!("APPDOCK_SUM={}", nums.iter().sum::<i32>()); }
