import platform
import torch
import psutil

def get_hardware_stats():
    """
    Caramelizing the hardware metadata...
    """
    stats = {
        "os": platform.system(),
        "processor": platform.processor(),
        "ram": f"{round(psutil.virtual_memory().total / (1024**3), 2)} GB",
        "device": "cpu",
        "gpu_name": None
    }

    if torch.cuda.is_available():
        stats["device"] = "cuda"
        stats["gpu_name"] = torch.cuda.get_device_name(0)
    elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        # For iOS/Mac Silicon support
        stats["device"] = "mps"
        stats["gpu_name"] = "Apple Silicon"
    
    return stats

if __name__ == "__main__":
    print("--- Toddler Hardware Audit ---")
    info = get_hardware_stats()
    for key, value in info.items():
        print(f"{key.upper()}: {value}")
