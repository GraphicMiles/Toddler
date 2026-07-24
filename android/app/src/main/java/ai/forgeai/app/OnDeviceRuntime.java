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
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ConcurrentHashMap;

@CapacitorPlugin(name = "OnDeviceRuntime")
public class OnDeviceRuntime extends Plugin {
    private static final ConcurrentHashMap<String, Boolean> pauseFlags = new ConcurrentHashMap<>();
    static { System.loadLibrary("ondevice_runtime"); }
    private static native boolean nativeLoad(String path);
    private static native void nativeUnload();
    private static native boolean nativeIsLoaded();
    private static native String nativeGenerate(String prompt, int maxTokens);

    @PluginMethod
    public void getInfo(PluginCall call) {
        JSObject result = new JSObject();
        result.put("available", true);
        result.put("backend", "llama.cpp-cpu");
        result.put("abi", Build.SUPPORTED_ABIS.length > 0 ? Build.SUPPORTED_ABIS[0] : "unknown");
        result.put("loaded", nativeIsLoaded());
        call.resolve(result);
    }

    @PluginMethod
    public void load(PluginCall call) {
        String path = call.getString("path", "");
        if (path.isEmpty()) { call.reject("A model path is required"); return; }
        if (nativeLoad(path)) call.resolve(); else call.reject("Model could not be loaded safely");
    }

    @PluginMethod
    public void unload(PluginCall call) { nativeUnload(); call.resolve(); }

    @PluginMethod
    public void download(PluginCall call) {
        String urlString = call.getString("url", "");
        String filename = call.getString("filename", "model.gguf").replaceAll("[^A-Za-z0-9._-]", "_");
        if (urlString.isEmpty()) { call.reject("A model URL is required"); return; }
        new Thread(() -> {
            try {
                File dir = new File(getContext().getFilesDir(), "models");
                if (!dir.exists() && !dir.mkdirs()) throw new Exception("Unable to create model directory");
                File target = new File(dir, filename);
                File temp = new File(dir, filename + ".part");
                long existing = temp.exists() ? temp.length() : 0;
                HttpURLConnection connection = (HttpURLConnection) new URL(urlString).openConnection();
                connection.setConnectTimeout(15000); connection.setReadTimeout(120000); connection.setInstanceFollowRedirects(true);
                if (existing > 0) connection.setRequestProperty("Range", "bytes=" + existing + "-");
                connection.connect();
                int code = connection.getResponseCode();
                if (code < 200 || code >= 300) throw new Exception("Download failed: HTTP " + code);
                boolean append = existing > 0 && code == HttpURLConnection.HTTP_PARTIAL;
                if (!append && existing > 0) { temp.delete(); existing = 0; }
                pauseFlags.put(filename, false);
                try (InputStream input = connection.getInputStream(); FileOutputStream output = new FileOutputStream(temp, append)) {
                    byte[] buffer = new byte[1024 * 1024]; int read;
                    while ((read = input.read(buffer)) != -1) {
                        output.write(buffer, 0, read);
                        if (Boolean.TRUE.equals(pauseFlags.get(filename))) break;
                    }
                } finally { connection.disconnect(); }
                if (Boolean.TRUE.equals(pauseFlags.get(filename))) {
                    JSObject paused = new JSObject(); paused.put("paused", true); paused.put("path", temp.getAbsolutePath()); paused.put("size", temp.length());
                    new Handler(Looper.getMainLooper()).post(() -> call.resolve(paused)); return;
                }
                if (!temp.renameTo(target)) throw new Exception("Unable to finalize model file");
                pauseFlags.remove(filename);
                JSObject result = new JSObject(); result.put("path", target.getAbsolutePath()); result.put("size", target.length());
                new Handler(Looper.getMainLooper()).post(() -> call.resolve(result));
            } catch (Exception error) { new Handler(Looper.getMainLooper()).post(() -> call.reject(error.getMessage())); }
        });
    }

    @PluginMethod
    public void pauseDownload(PluginCall call) {
        String filename = call.getString("filename", "");
        if (filename.isEmpty()) { call.reject("A filename is required"); return; }
        pauseFlags.put(filename, true); call.resolve();
    }

    @PluginMethod
    public void generate(PluginCall call) {
        String prompt = call.getString("prompt", "");
        int maxTokens = Math.min(Math.max(call.getInt("maxTokens", 128), 1), 512);
        if (prompt.isEmpty()) { call.reject("A prompt is required"); return; }
        String output = nativeGenerate(prompt, maxTokens);
        if (output == null) { call.reject("The model is not loaded or could not generate safely"); return; }
        JSObject result = new JSObject(); result.put("text", output); call.resolve(result);
    }
}
