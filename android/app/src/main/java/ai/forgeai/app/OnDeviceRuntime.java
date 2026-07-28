package ai.forgeai.app;

import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.RandomAccessFile;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.UUID;

@CapacitorPlugin(name = "OnDeviceRuntime")
public class OnDeviceRuntime extends Plugin {
    static { System.loadLibrary("ondevice_runtime"); }
    private static native boolean nativeLoad(String path);
    private static native void nativeUnload();
    private static native boolean nativeIsLoaded();
    private static native String nativeGenerate(String prompt, int maxTokens);
    private static native void nativeCancel();
    private final ExecutorService inferenceExecutor = Executors.newSingleThreadExecutor();
    private volatile String activeRequestId = null;
    private volatile String runtimeState = "IDLE";

    /** Tracks which downloads are paused. Key = filename. */
    private final Map<String, Boolean> pausedDownloads = new ConcurrentHashMap<>();
    /** Tracks active download threads so we can signal them. Key = filename. */
    private final Map<String, Thread> activeDownloads = new ConcurrentHashMap<>();
    private final Map<String, HttpURLConnection> activeConnections = new ConcurrentHashMap<>();

    @PluginMethod
    public void getInfo(PluginCall call) {
        JSObject result = new JSObject();
        result.put("available", true);
        result.put("backend", "llama.cpp-cpu");
        result.put("abi", Build.SUPPORTED_ABIS.length > 0 ? Build.SUPPORTED_ABIS[0] : "unknown");
        result.put("loaded", nativeIsLoaded());
        result.put("state", runtimeState);
        result.put("activeRequestId", activeRequestId == null ? "" : activeRequestId);
        call.resolve(result);
    }

    @PluginMethod
    public void load(PluginCall call) {
        synchronized (this) {
            if ("GENERATING".equals(runtimeState) || "CANCELLING".equals(runtimeState)) { call.reject("Cannot load a model during generation"); return; }
            runtimeState = "LOADING";
        }
        String path = call.getString("path", "");
        if (path.isEmpty()) { runtimeState = nativeIsLoaded() ? "READY" : "IDLE"; call.reject("A model path is required"); return; }
        File model = new File(path);
        if (!model.isFile()) { runtimeState = "ERROR"; call.reject("Model file does not exist: " + path); return; }
        if (model.length() < 4096) { runtimeState = "ERROR"; call.reject("Model file is too small or incomplete: " + model.length() + " bytes"); return; }
        try (RandomAccessFile input = new RandomAccessFile(model, "r")) {
            byte[] magic = new byte[4]; input.readFully(magic);
            if (magic[0] != 'G' || magic[1] != 'G' || magic[2] != 'U' || magic[3] != 'F') { runtimeState = "ERROR"; call.reject("Invalid GGUF header; file may be corrupted or not a GGUF model"); return; }
        } catch (Exception error) { runtimeState = "ERROR"; call.reject("Unable to inspect model file: " + error.getMessage()); return; }
        if (nativeLoad(path)) { runtimeState = "READY"; call.resolve(); } else { runtimeState = "ERROR"; call.reject("llama.cpp rejected the GGUF model. File size: " + model.length() + " bytes"); }
    }

    @PluginMethod
    public void unload(PluginCall call) {
        synchronized (this) {
            if ("GENERATING".equals(runtimeState) || "CANCELLING".equals(runtimeState)) { call.reject("Cancel generation before unloading"); return; }
            nativeUnload(); runtimeState = "IDLE"; activeRequestId = null;
        }
        call.resolve();
    }

    @PluginMethod
    public void download(PluginCall call) {
        String urlString = call.getString("url", "");
        String filename = call.getString("filename", "model.gguf").replaceAll("[^A-Za-z0-9._-]", "_");
        if (urlString.isEmpty()) { call.reject("A model URL is required"); return; }

        // Prevent concurrent downloads
        if (activeDownloads.containsKey(filename)) {
            call.reject("A download for this file is already in progress.");
            return;
        }

        pausedDownloads.remove(filename);

        Thread downloadThread = new Thread(() -> {
            try {
                File dir = new File(getContext().getFilesDir(), "models");
                if (!dir.exists() && !dir.mkdirs()) throw new Exception("Unable to create model directory");
                File target = new File(dir, filename);
                File temp = new File(dir, filename + ".part");

                // Support resume: check existing partial file
                long existingBytes = temp.exists() ? temp.length() : 0;

                HttpURLConnection connection = (HttpURLConnection) new URL(urlString).openConnection();
                connection.setConnectTimeout(15000);
                connection.setReadTimeout(120000);
                connection.setInstanceFollowRedirects(true);
                if (existingBytes > 0) {
                    connection.setRequestProperty("Range", "bytes=" + existingBytes + "-");
                }
                connection.connect();
                activeConnections.put(filename, connection);

                int code = connection.getResponseCode();
                boolean supportsResume = (code == 206);
                long totalBytes = connection.getContentLengthLong();
                if (!supportsResume && existingBytes > 0) {
                    // Server doesn't support resume, start fresh
                    existingBytes = 0;
                    temp.delete();
                }
                if (totalBytes > 0) totalBytes += existingBytes;

                if (code < 200 || (code >= 300 && code != 206)) {
                    throw new Exception("Download failed: HTTP " + code);
                }

                long downloaded = existingBytes;
                try (InputStream input = connection.getInputStream();
                     FileOutputStream output = new FileOutputStream(temp, supportsResume && existingBytes > 0)) {
                    byte[] buffer = new byte[256 * 1024];
                    int read;
                    long lastEmit = 0;
                    while ((read = input.read(buffer)) != -1) {
                        // Check for cancellation or pause
                        if (Thread.currentThread().isInterrupted()) {
                            output.flush();
                            temp.delete();
                            throw new InterruptedException("Download cancelled");
                        }
                        if (pausedDownloads.containsKey(filename)) {
                            output.flush();
                            JSObject pauseResult = new JSObject();
                            pauseResult.put("paused", true);
                            pauseResult.put("filename", filename);
                            pauseResult.put("completed", downloaded);
                            new Handler(Looper.getMainLooper()).post(() -> call.resolve(pauseResult));
                            return;
                        }
                        output.write(buffer, 0, read);
                        downloaded += read;

                        // Emit progress at most every 500ms
                        long now = System.currentTimeMillis();
                        if (now - lastEmit > 500) {
                            lastEmit = now;
                            int progress = totalBytes > 0 ? (int) (downloaded * 100 / totalBytes) : 0;
                            JSObject progressEvent = new JSObject();
                            progressEvent.put("filename", filename);
                            progressEvent.put("progress", progress);
                            progressEvent.put("completed", downloaded);
                            progressEvent.put("total", totalBytes);
                            notifyListeners("downloadProgress", progressEvent);
                        }
                    }
                } finally {
                    activeConnections.remove(filename);
                    connection.disconnect();
                }

                if (!temp.renameTo(target)) throw new Exception("Unable to finalize model file");

                // Final 100% progress event
                JSObject finalProgress = new JSObject();
                finalProgress.put("filename", filename);
                finalProgress.put("progress", 100);
                finalProgress.put("completed", downloaded);
                finalProgress.put("total", downloaded);
                notifyListeners("downloadProgress", finalProgress);

                JSObject result = new JSObject();
                result.put("path", target.getAbsolutePath());
                result.put("size", target.length());
                new Handler(Looper.getMainLooper()).post(() -> call.resolve(result));
            } catch (Exception error) {
                new Handler(Looper.getMainLooper()).post(() -> call.reject(error.getMessage()));
            } finally {
                activeDownloads.remove(filename);
                pausedDownloads.remove(filename);
            }
        });

        activeDownloads.put(filename, downloadThread);
        downloadThread.start();
    }

    @PluginMethod
    public void pauseDownload(PluginCall call) {
        String filename = call.getString("filename", "");
        if (filename.isEmpty()) { call.reject("A filename is required"); return; }
        pausedDownloads.put(filename, true);
        JSObject result = new JSObject();
        result.put("paused", true);
        result.put("filename", filename);
        call.resolve(result);
    }

    @PluginMethod
    public void deleteModel(PluginCall call) {
        synchronized (this) {
            if ("GENERATING".equals(runtimeState) || "CANCELLING".equals(runtimeState)) { call.reject("Cancel generation before deleting a model"); return; }
        }
        String path = call.getString("path", "");
        File models = new File(getContext().getFilesDir(), "models").getAbsoluteFile();
        File target = new File(path).getAbsoluteFile();
        try {
            if (!target.toPath().startsWith(models.toPath()) || target.equals(models)) { call.reject("Model path is outside app-private storage"); return; }
            if (target.exists() && !target.delete()) { call.reject("Unable to delete model"); return; }
            call.resolve();
        } catch (Exception e) { call.reject("Unable to delete model safely"); }
    }

    @PluginMethod
    public void cancelDownload(PluginCall call) {
        String filename = call.getString("filename", "");
        Thread thread = activeDownloads.remove(filename);
        if (thread != null) { thread.interrupt(); }
        HttpURLConnection connection = activeConnections.remove(filename);
        if (connection != null) connection.disconnect();
        pausedDownloads.remove(filename);
        call.resolve();
    }

    @PluginMethod
    public void generate(PluginCall call) {
        String prompt = call.getString("prompt", "");
        int maxTokens = Math.min(Math.max(call.getInt("maxTokens", 128), 1), 512);
        String requestId = call.getString("requestId", UUID.randomUUID().toString());
        if (prompt.isEmpty()) { call.reject("A prompt is required"); return; }
        synchronized (this) {
            if (!"IDLE".equals(runtimeState) && !"READY".equals(runtimeState)) { call.reject("A generation is already active"); return; }
            if (!nativeIsLoaded()) { call.reject("The model is not loaded"); return; }
            activeRequestId = requestId; runtimeState = "GENERATING";
        }
        inferenceExecutor.execute(() -> {
            try {
                String output = nativeGenerate(prompt, maxTokens);
                JSObject result = new JSObject();
                result.put("requestId", requestId);
                result.put("text", output == null ? "" : output);
                result.put("cancelled", output == null);
                new Handler(Looper.getMainLooper()).post(() -> call.resolve(result));
            } catch (Exception error) {
                new Handler(Looper.getMainLooper()).post(() -> call.reject(error.getMessage()));
            } finally {
                synchronized (this) { activeRequestId = null; runtimeState = nativeIsLoaded() ? "READY" : "IDLE"; }
            }
        });
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        String requestId = call.getString("requestId", "");
        if (activeRequestId == null || !activeRequestId.equals(requestId)) { call.resolve(); return; }
        runtimeState = "CANCELLING";
        nativeCancel();
        call.resolve();
    }
}
