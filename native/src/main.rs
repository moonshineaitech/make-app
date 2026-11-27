// AppDock Windows process lifetime supervisor. MIT; no third-party Rust crates.
// Job Objects provide lifetime containment, not a filesystem/security sandbox.
#[cfg(windows)]
mod windows {
    use std::ffi::c_void;
    use std::io::{Read, Write};
    use std::os::windows::process::{CommandExt, ChildExt};
    use std::os::windows::io::AsRawHandle;
    use std::process::{Command, Stdio};
    use std::sync::mpsc;
    use std::time::Duration;

    type Handle = *mut c_void;
    #[repr(C)]
    #[derive(Default)]
    struct BasicLimits {
        process_time: i64, job_time: i64, flags: u32,
        min_working_set: usize, max_working_set: usize,
        active_processes: u32, affinity: usize, priority: u32, scheduling: u32,
    }
    #[repr(C)]
    #[derive(Default)]
    struct IoCounters { read_ops: u64, write_ops: u64, other_ops: u64, read_bytes: u64, write_bytes: u64, other_bytes: u64 }
    #[repr(C)]
    #[derive(Default)]
    struct ExtendedLimits {
        basic: BasicLimits, io: IoCounters,
        process_memory: usize, job_memory: usize, peak_process: usize, peak_job: usize,
    }
    #[repr(C)]
    #[derive(Default)]
    struct Accounting { user:i64,kernel:i64,period_user:i64,period_kernel:i64,page_faults:u32,total:u32,active:u32,terminated:u32 }
    #[repr(C)]
    struct CpuRate { flags:u32, rate:u32 }
    #[link(name="kernel32")]
    unsafe extern "system" {
        fn CreateJobObjectW(attributes: *const c_void, name: *const u16) -> Handle;
        fn SetInformationJobObject(job: Handle, class: i32, data: *const c_void, size: u32) -> i32;
        fn AssignProcessToJobObject(job: Handle, process: Handle) -> i32;
        fn CloseHandle(handle: Handle) -> i32;
        fn TerminateJobObject(job:Handle,code:u32) -> i32;
        fn QueryInformationJobObject(job:Handle,class:i32,data:*mut c_void,size:u32,length:*mut u32) -> i32;
        fn ResumeThread(thread:Handle) -> u32;
        fn OpenProcess(access:u32,inherit:i32,id:u32) -> Handle;
        fn WaitForSingleObject(handle:Handle,milliseconds:u32) -> u32;
    }

    pub fn run() -> Result<i32, Box<dyn std::error::Error>> {
        let mut args: Vec<_> = std::env::args_os().skip(1).collect();
        let terminal=args.first().is_some_and(|value|value=="--terminal");
        if terminal {args.remove(0);}
        let raw = args.first().is_some_and(|value| value == "--windows-verbatim");
        if raw { args.remove(0); }
        if args.is_empty() { return Err("Provide an executable and its arguments".into()); }
        assert_eq!(std::mem::size_of::<ExtendedLimits>(), 144, "Unexpected Windows ABI");
        let job = unsafe { CreateJobObjectW(std::ptr::null(), std::ptr::null()) };
        if job.is_null() { return Err(std::io::Error::last_os_error().into()); }
        let mut limits = ExtendedLimits::default();
        limits.basic.flags = 0x2000; // JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
        if let Ok(value)=std::env::var("APPDOCK_LIMIT_MEMORY_MB") {
            let megabytes:usize=value.parse()?;
            if !(32..=1048576).contains(&megabytes) {return Err("Invalid memory limit".into());}
            limits.basic.flags |= 0x200; // JOB_OBJECT_LIMIT_JOB_MEMORY
            limits.job_memory=megabytes.checked_mul(1024*1024).ok_or("Memory limit overflow")?;
        }
        if let Ok(value)=std::env::var("APPDOCK_LIMIT_PROCESSES") {
            let count:u32=value.parse()?;
            if !(1..=4096).contains(&count) {return Err("Invalid process limit".into());}
            limits.basic.flags |= 0x8; limits.basic.active_processes=count;
        }
        if unsafe { SetInformationJobObject(job, 9, &limits as *const _ as *const c_void, std::mem::size_of_val(&limits) as u32) } == 0 {
            unsafe { CloseHandle(job); }
            return Err(std::io::Error::last_os_error().into());
        }
        if let Ok(value)=std::env::var("APPDOCK_LIMIT_CPU_PERCENT") {
            let percent:u32=value.parse()?;
            if !(1..=100).contains(&percent) {return Err("Invalid CPU limit".into());}
            let cpu=CpuRate {flags:5,rate:percent*100};
            if unsafe {SetInformationJobObject(job,15,&cpu as *const _ as *const c_void,std::mem::size_of_val(&cpu) as u32)}==0 {
                unsafe {CloseHandle(job);} return Err(std::io::Error::last_os_error().into());
            }
        }
        let mut command = Command::new(&args[0]);
        if raw {
            let joined = args[1..].iter().map(|x| x.to_string_lossy()).collect::<Vec<_>>().join(" ");
            command.raw_arg(joined);
        } else { command.args(&args[1..]); }
        if terminal {
            command.stdin(Stdio::inherit()).stdout(Stdio::inherit()).stderr(Stdio::inherit());
            command.creation_flags(4); // Inherit ConPTY and suspend the initial thread.
        } else {
            command.stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped());
            command.creation_flags(0x08000004); // CREATE_NO_WINDOW | CREATE_SUSPENDED
        }
        let owner=if terminal {
            let pid:u32=std::env::var("APPDOCK_OWNER_PID")?.parse()?;
            let handle=unsafe {OpenProcess(0x100000,0,pid)}; // SYNCHRONIZE only
            if handle.is_null()||unsafe {WaitForSingleObject(handle,0)}!=258 {
                unsafe {CloseHandle(job);} return Err("Terminal owner is unavailable".into());
            }
            handle
        } else {std::ptr::null_mut()};
        let mut child = command.spawn()?;
        // Assign the suspended child before any application code can run.
        // The supervisor itself stays outside the job to avoid shutdown races.
        if unsafe { AssignProcessToJobObject(job, child.as_raw_handle()) } == 0 {
            let error=std::io::Error::last_os_error(); let _=child.kill(); let _=child.wait();
            unsafe { CloseHandle(job); }
            return Err(format!("Could not enable Windows process containment: {error}").into());
        }
        // Rust 1.100 exposes the exact initial thread handle. Enumerating threads
        // can select a loader worker whose suspend count is already zero.
        let previous=unsafe {ResumeThread(child.main_thread_handle().as_raw_handle())};
        if previous!=1 {
            let _=child.kill(); let _=child.wait(); unsafe {CloseHandle(job);}
            return Err(format!("Could not resume the contained application's initial thread (count {previous})").into());
        }
        if terminal {
            let owner_value=owner as usize; let job_value=job as usize;
            std::thread::spawn(move || {
                unsafe {WaitForSingleObject(owner_value as Handle,u32::MAX);TerminateJobObject(job_value as Handle,125);CloseHandle(owner_value as Handle);}
            });
            let status=child.wait()?;
            unsafe {TerminateJobObject(job,status.code().unwrap_or(1) as u32);}
            let deadline=std::time::Instant::now()+Duration::from_secs(3);
            while std::time::Instant::now()<deadline {
                let mut accounting=Accounting::default();
                let ok=unsafe {QueryInformationJobObject(job,1,&mut accounting as *mut _ as *mut c_void,std::mem::size_of_val(&accounting) as u32,std::ptr::null_mut())};
                if ok==0||accounting.active==0 {break;}
                std::thread::sleep(Duration::from_millis(10));
            }
            unsafe {CloseHandle(job);}
            return Ok(status.code().unwrap_or(1));
        }
        let mut input = child.stdin.take().unwrap();
        let mut output = child.stdout.take().unwrap();
        let mut error = child.stderr.take().unwrap();
        let job_value = job as usize;
        std::thread::spawn(move || {
            let mut buffer = [0; 8192];
            loop {
                match std::io::stdin().read(&mut buffer) {
                    Ok(0) | Err(_) => {
                        // The parent owns this pipe. EOF also happens when it crashes.
                        unsafe { TerminateJobObject(job_value as Handle,125); }
                        break;
                    }
                    Ok(count) => { let _ = input.write_all(&buffer[..count]); let _ = input.flush(); }
                }
            }
        });
        let (done, complete) = mpsc::channel();
        let out_done = done.clone();
        std::thread::spawn(move || { let mut target=std::io::stdout(); let mut buffer=[0;8192]; while let Ok(count)=output.read(&mut buffer) { if count==0 {break;} if target.write_all(&buffer[..count]).and_then(|_|target.flush()).is_err(){break;} } let _ = out_done.send(()); });
        std::thread::spawn(move || { let mut target=std::io::stderr(); let mut buffer=[0;8192]; while let Ok(count)=error.read(&mut buffer) { if count==0 {break;} if target.write_all(&buffer[..count]).and_then(|_|target.flush()).is_err(){break;} } let _ = done.send(()); });
        let status = child.wait()?;
        unsafe { TerminateJobObject(job,status.code().unwrap_or(1) as u32); }
        let deadline=std::time::Instant::now()+Duration::from_secs(3);
        while std::time::Instant::now()<deadline {
            let mut accounting=Accounting::default();
            let ok=unsafe {QueryInformationJobObject(job,1,&mut accounting as *mut _ as *mut c_void,std::mem::size_of_val(&accounting) as u32,std::ptr::null_mut())};
            if ok==0 || accounting.active==0 {break;}
            std::thread::sleep(Duration::from_millis(10));
        }
        // Do not hang if a descendant retains a pipe after its parent exits.
        let _ = complete.recv_timeout(Duration::from_secs(1));
        let _ = complete.recv_timeout(Duration::from_secs(1));
        // ExitProcess closes the only job handle and stops remaining descendants.
        Ok(status.code().unwrap_or(1))
    }
}
fn main() {
    #[cfg(windows)]
    match windows::run() {
        Ok(code) => std::process::exit(code),
        Err(error) => { eprintln!("AppDock process supervisor: {error}"); std::process::exit(125); }
    }
    #[cfg(not(windows))]
    { eprintln!("This supervisor target is Windows-only."); std::process::exit(125); }
}
