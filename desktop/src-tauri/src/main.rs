use tauri::{Manager, Window};
use sysinfo::{System, SystemExt, CpuExt};

// Phase 7: Tauri Desktop Agent Scaffold & Hardware Auth

#[tauri::command]
fn get_hardware_report() -> String {
    let mut sys = System::new_all();
    sys.refresh_all();
    let ram = sys.total_memory() / 1024 / 1024 / 1024; // GB
    format!("OS: Desktop | CPU: {} | RAM: {}GB", sys.global_cpu_info().brand(), ram)
}

#[tauri::command]
fn pair_device(code: String) -> Result<String, String> {
    // 1. Send the 6-digit code to the FastAPI Backend
    // 2. Exchange for Firebase Custom Token
    // 3. Register Desktop Hardware in Firestore
    if code.len() == 6 {
        Ok(format!("Successfully paired desktop agent using code: {}", code))
    } else {
        Err("Invalid pairing code".to_string())
    }
}

#[tauri::command]
async fn poll_training_queue(window: Window) -> Result<(), String> {
    // Rust WebSocket/Listener waiting for jobs from the Control Tower
    window.emit("job-received", "Llama-3.2-3B Fine-Tune").map_err(|e| e.to_string())?;
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_hardware_report,
            pair_device,
            poll_training_queue
        ])
        .run(tauri::generate_context!())
        .expect("error while running toddler-desktop");
}
