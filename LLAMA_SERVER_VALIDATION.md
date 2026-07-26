# llama-server Standalone Validation Guide

This guide helps you validate that `llama-server` (from llama.cpp) can run on a real Android device before integrating it into the app.

## Step 1: Build llama-server for Android (arm64-v8a)

### Prerequisites
- Android NDK (r25 or newer recommended)
- CMake 3.22+
- A Linux/macOS machine (or WSL on Windows)

### Build Commands

```bash
# Clone llama.cpp (if not already done)
git clone https://github.com/ggml-org/llama.cpp.git
cd llama.cpp

# Configure for Android arm64
cmake -B build-android \
  -DCMAKE_TOOLCHAIN_FILE=$ANDROID_NDK/build/cmake/android.toolchain.cmake \
  -DANDROID_ABI=arm64-v8a \
  -DANDROID_PLATFORM=android-26 \
  -DLLAMA_BUILD_EXAMPLES=ON \
  -DLLAMA_BUILD_SERVER=ON \
  -DLLAMA_CUBLAS=OFF \
  -DLLAMA_METAL=OFF

# Build
cmake --build build-android --config Release -j$(nproc)

# The binary will be at:
# build-android/bin/llama-server
```

### Alternative: Use Prebuilt Releases

Check the [llama.cpp releases](https://github.com/ggml-org/llama.cpp/releases) — some versions include Android builds.

---

## Step 2: Push and Test on Device

### 1. Push the binary and a small model

```bash
# Connect your Android device via USB (enable USB debugging)
adb devices

# Create a directory on the device
adb shell mkdir -p /data/local/tmp/llama

# Push the binary (rename it so Android can execute it)
adb push build-android/bin/llama-server /data/local/tmp/llama/llama-server
adb shell chmod +x /data/local/tmp/llama/llama-server

# Push a small GGUF model (example: SmolLM 135M)
adb push SmolLM-135M-Q4_K_M.gguf /data/local/tmp/llama/model.gguf
```

### 2. Run llama-server manually

```bash
adb shell
cd /data/local/tmp/llama

# Run the server
./llama-server \
  --model model.gguf \
  --port 8080 \
  --host 127.0.0.1 \
  --ctx-size 2048 \
  --threads 4
```

You should see output like:
```
llama server listening on 127.0.0.1:8080
```

### 3. Test from your computer (or via adb)

From your development machine:

```bash
# Health check
curl http://127.0.0.1:8080/health

# Simple completion
curl http://127.0.0.1:8080/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Hello, my name is",
    "max_tokens": 20
  }'
```

If you get a JSON response with generated text, **validation is successful**.

---

## Step 3: Troubleshooting

| Problem | Solution |
|--------|----------|
| `Permission denied` when running binary | Run `chmod +x llama-server` on device |
| Binary crashes immediately | Check if the model is compatible (try a very small one first) |
| Port already in use | Change port with `--port 8081` |
| Out of memory | Use a smaller model (135M–360M recommended for testing) |
| `exec format error` | Make sure you built for `arm64-v8a` |

---

## Next Steps After Validation

Once the above works:

1. Rename the binary to `libllama-server.so` and place it in:
   ```
   android/app/src/main/jniLibs/arm64-v8a/libllama-server.so
   ```

2. The `LlamaServerService.java` we created will be able to find and execute it.

3. Proceed to integrate `LocalServerProvider` in JavaScript.
