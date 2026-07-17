import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { listen } from "@tauri-apps/api/event";
import "./App.css";

function App() {
  const [report, setReport] = useState("Auditing hardware...");
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [status, setStatus] = useState("Idle");

  useEffect(() => {
    // Get hardware report on mount
    invoke("get_hardware_report").then(setReport);

    // Listen for download progress from Rust
    const unlisten = listen("download-progress", (event) => {
      setDownloadProgress(event.payload);
    });

    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  const syncArchitecture = async () => {
    setStatus("Downloading dependencies...");
    try {
      const result = await invoke("check_and_download_dependencies");
      setStatus(result);
      setDownloadProgress(null);
    } catch (err) {
      setStatus(`Error: ${err}`);
    }
  };

  return (
    <div className="container">
      <header>
        <div className="logo">T</div>
        <h1>Toddler Agent</h1>
      </header>

      <div className="card">
        <h3>Hardware Audit</h3>
        <p className="report">{report}</p>
      </div>

      <div className="card">
        <h3>System Status</h3>
        <p className={`status ${status.includes('Error') ? 'error' : ''}`}>{status}</p>
        
        {downloadProgress !== null && (
          <div className="progress-container">
            <div className="progress-bar" style={{ width: `${downloadProgress}%` }}></div>
            <span className="progress-text">{downloadProgress}%</span>
          </div>
        )}
      </div>

      <button onClick={syncArchitecture} disabled={status.includes('Downloading')}>
        {status === "Architecture synchronized." ? "Re-sync Engine" : "Sync Local Architecture"}
      </button>

      <footer>
        <p>Seeking wisdom from your local silicon...</p>
      </footer>
    </div>
  );
}

export default App;
