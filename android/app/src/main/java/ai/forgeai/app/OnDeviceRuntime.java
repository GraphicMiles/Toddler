package ai.forgeai.app;

import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "OnDeviceRuntime")
public class OnDeviceRuntime extends Plugin {
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
    public void generate(PluginCall call) {
        String prompt = call.getString("prompt", "");
        int maxTokens = Math.min(Math.max(call.getInt("maxTokens", 128), 1), 512);
        if (prompt.isEmpty()) { call.reject("A prompt is required"); return; }
        String output = nativeGenerate(prompt, maxTokens);
        if (output == null) { call.reject("The model is not loaded or could not generate safely"); return; }
        JSObject result = new JSObject(); result.put("text", output); call.resolve(result);
    }
}
