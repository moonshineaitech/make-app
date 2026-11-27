// One-file project executable. The payload is appended by executable.cjs.
// Windows platform APIs and Rust standard library only; no discovery/build UI.
#![cfg_attr(windows, windows_subsystem = "windows")]
use std::{fs::{self,File},io::{Read,Seek,SeekFrom,Write},path::{Path,PathBuf},process::{Command,Stdio}};
#[cfg(windows)] use std::os::windows::process::CommandExt;
#[cfg(windows)]
#[link(name="bcrypt")]
unsafe extern "system" {
 fn BCryptOpenAlgorithmProvider(h:*mut usize,name:*const u16,implementation:*const u16,flags:u32)->i32;
 fn BCryptGetProperty(h:usize,name:*const u16,output:*mut u8,size:u32,result:*mut u32,flags:u32)->i32;
 fn BCryptCreateHash(h:usize,hash:*mut usize,object:*mut u8,size:u32,secret:*const u8,secret_size:u32,flags:u32)->i32;
 fn BCryptHashData(h:usize,data:*const u8,size:u32,flags:u32)->i32;
 fn BCryptFinishHash(h:usize,output:*mut u8,size:u32,flags:u32)->i32;
 fn BCryptDestroyHash(h:usize)->i32;
 fn BCryptCloseAlgorithmProvider(h:usize,flags:u32)->i32;
}
#[cfg(windows)] #[link(name="user32")] unsafe extern "system"{fn MessageBoxW(window:usize,text:*const u16,title:*const u16,flags:u32)->i32;}
#[cfg(windows)]
fn wide(s:&str)->Vec<u16>{s.encode_utf16().chain(Some(0)).collect()}
#[cfg(windows)]
fn digest(mut input:impl Read)->Result<[u8;32],String>{
 unsafe {let mut provider=0;let mut hash=0;let mut size=0u32;let mut returned=0;let mut object=Vec::new();
  if BCryptOpenAlgorithmProvider(&mut provider,wide("SHA256").as_ptr(),std::ptr::null(),0)!=0{return Err("Windows SHA-256 is unavailable".into());}
  let result:Result<[u8;32],String>=(||{if BCryptGetProperty(provider,wide("ObjectLength").as_ptr(),(&mut size as *mut u32).cast(),4,&mut returned,0)!=0{return Err("Cannot initialize SHA-256".into());}object.resize(size as usize,0);
   if BCryptCreateHash(provider,&mut hash,object.as_mut_ptr(),size,std::ptr::null(),0,0)!=0{return Err("Cannot create integrity check".into());}
   let mut buffer=[0u8;65536];loop{let n=input.read(&mut buffer).map_err(|e|e.to_string())?;if n==0{break;}if BCryptHashData(hash,buffer.as_ptr(),n as u32,0)!=0{return Err("Integrity check failed".into());}}
   let mut output=[0;32];if BCryptFinishHash(hash,output.as_mut_ptr(),32,0)!=0{return Err("Integrity check failed".into());}Ok(output)
  })();if hash!=0{BCryptDestroyHash(hash);}BCryptCloseAlgorithmProvider(provider,0);result
 }
}
#[cfg(not(windows))]mod sha256;
#[cfg(not(windows))]use sha256::digest;
fn hex(bytes:&[u8])->String{bytes.iter().map(|v|format!("{v:02x}")).collect()}
fn read_part(file:&mut File,start:u64,size:u64)->Result<Vec<u8>,String>{file.seek(SeekFrom::Start(start)).map_err(|e|e.to_string())?;let mut output=vec![0;size as usize];file.read_exact(&mut output).map_err(|e|e.to_string())?;Ok(output)}
fn checked(file:&Path,hash:&[u8])->bool{File::open(file).ok().and_then(|f|digest(f).ok()).map(|v|v.as_slice()==hash).unwrap_or(false)}
fn main_run()->Result<i32,String>{
 let own=std::env::current_exe().map_err(|e|e.to_string())?;let mut file=File::open(&own).map_err(|e|e.to_string())?;let length=file.metadata().map_err(|e|e.to_string())?.len();if length<96{return Err("This executable is incomplete".into());}
 let footer=read_part(&mut file,length-96,96)?;if &footer[80..]!=b"APPDOCKEXE000001"{return Err("This file has no project payload".into());}
 let runtime_len=u64::from_le_bytes(footer[0..8].try_into().unwrap());let config_len=u64::from_le_bytes(footer[8..16].try_into().unwrap());
 if runtime_len==0||runtime_len>512*1024*1024||config_len==0||config_len>4*1024*1024||runtime_len+config_len+96>=length{return Err("Invalid executable payload lengths".into());}
 let start=length-96-config_len-runtime_len;let config=read_part(&mut file,start+runtime_len,config_len)?;if digest(config.as_slice())?.as_slice()!=&footer[48..80]{return Err("Project settings failed their integrity check".into());}
 #[cfg(windows)] let cache=PathBuf::from(std::env::var_os("LOCALAPPDATA").ok_or("Local application storage is unavailable")?).join("GoldRock").join("Project Apps");
 #[cfg(not(windows))] let cache=std::env::var_os("XDG_CACHE_HOME").map(PathBuf::from).or_else(||std::env::var_os("HOME").map(|h|PathBuf::from(h).join(".cache"))).ok_or("Home cache storage is unavailable")?.join("make-app");let runtime_dir=cache.join("Runtime");let app_dir=cache.join("Apps").join(hex(&footer[48..80]));fs::create_dir_all(&runtime_dir).and_then(|_|fs::create_dir_all(&app_dir)).map_err(|e|e.to_string())?;
 let runtime=runtime_dir.join(format!("{}{}",hex(&footer[16..48]),if cfg!(windows){".exe"}else{".AppImage"}));
 if !checked(&runtime,&footer[16..48]){let pending=runtime.with_extension(format!("{}.tmp",std::process::id()));let result:Result<(),String>=(||{let mut output=File::create(&pending).map_err(|e|e.to_string())?;file.seek(SeekFrom::Start(start)).map_err(|e|e.to_string())?;std::io::copy(&mut (&mut file).take(runtime_len),&mut output).map_err(|e|e.to_string())?;output.flush().map_err(|e|e.to_string())?;drop(output);if !checked(&pending,&footer[16..48]){return Err("Bundled runtime failed its integrity check".into());}if checked(&runtime,&footer[16..48]){fs::remove_file(&pending).map_err(|e|e.to_string())?;}else{if runtime.exists(){fs::remove_file(&runtime).map_err(|e|e.to_string())?;}if let Err(error)=fs::rename(&pending,&runtime){if checked(&runtime,&footer[16..48]){let _=fs::remove_file(&pending);}else{return Err(error.to_string());}}}Ok(())})();if result.is_err(){let _=fs::remove_file(&pending);}result?;}
 #[cfg(unix)]{use std::os::unix::fs::PermissionsExt;for directory in [&cache,&runtime_dir,&app_dir]{fs::set_permissions(directory,fs::Permissions::from_mode(0o700)).map_err(|e|e.to_string())?;}fs::set_permissions(&runtime,fs::Permissions::from_mode(0o700)).map_err(|e|e.to_string())?;}
 let spec=app_dir.join("launch.json");if !checked(&spec,&footer[48..80]){let pending=app_dir.join(format!("launch-{}.tmp",std::process::id()));fs::write(&pending,&config).map_err(|e|e.to_string())?;if spec.exists(){fs::remove_file(&spec).map_err(|e|e.to_string())?;}if let Err(error)=fs::rename(&pending,&spec){if checked(&spec,&footer[48..80]){let _=fs::remove_file(&pending);}else{return Err(error.to_string());}}}
 #[cfg(unix)]{use std::os::unix::fs::PermissionsExt;fs::set_permissions(&spec,fs::Permissions::from_mode(0o600)).map_err(|e|e.to_string())?;}
 let mut command=Command::new(&runtime);command.arg("--direct-project-app").args(std::env::args_os().skip(1)).env("APPDOCK_EMBEDDED_SPEC",&spec).env("APPDOCK_LAUNCHER_FILE",&own).stdin(Stdio::null()).stdout(Stdio::null()).stderr(Stdio::null());
 #[cfg(target_os="linux")] command.env("APPIMAGE_EXTRACT_AND_RUN","1");
 #[cfg(windows)] command.creation_flags(0x08000000);
 Ok(command.status().map_err(|e|format!("Cannot start the bundled runtime: {e}"))?.code().unwrap_or(1))
}
fn main(){match main_run(){Ok(code)=>std::process::exit(code),Err(error)=>{if std::env::var_os("APPDOCK_LAUNCHER_NO_DIALOG").is_none(){#[cfg(windows)]unsafe{MessageBoxW(0,wide(&error).as_ptr(),wide("Could not start this app").as_ptr(),0x10);}#[cfg(not(windows))]eprintln!("Could not start this app: {error}");}std::process::exit(1);}}}
