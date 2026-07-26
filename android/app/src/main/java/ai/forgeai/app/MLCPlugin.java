package ai.forgeai.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Placeholder Capacitor plugin for MLC-LLM.
 * 
 * When MLC-LLM Android SDK is added, this plugin should be replaced
 * with actual implementation that calls MLC runtime.
 */
@CapacitorPlugin(name = "MLC")
public class MLCPlugin extends Plugin {

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject result = new JSObject();
        result.put("available", false);
        result.put("ready", false);
        result.put("reason", "MLC-LLM not integrated yet");
        call.resolve(result);
    }

    @PluginMethod
    public void loadModel(PluginCall call) {
        String model = call.getString("model");
        JSObject result = new JSObject();
        result.put("loaded", false);
        result.put("error", "MLC-LLM not integrated");
        call.resolve(result);
    }

    @PluginMethod
    public void stream(PluginCall call) {
        call.reject("MLC-LLM streaming not implemented yet");
    }

    @PluginMethod
    public void stop(PluginCall call) {
        call.resolve();
    }

    @PluginMethod
    public void unload(PluginCall call) {
        call.resolve();
    }
}