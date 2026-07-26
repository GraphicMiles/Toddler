package ai.forgeai.app;

import android.content.Intent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Capacitor plugin wrapper for LlamaServerService.
 * Exposes mount/unmount functionality to JavaScript.
 */
@CapacitorPlugin(name = "LlamaServerService")
public class LlamaServerPlugin extends Plugin {

    @PluginMethod
    public void start(PluginCall call) {
        String modelPath = call.getString("modelPath");
        int port = call.getInt("port", 8080);

        if (modelPath == null || modelPath.isEmpty()) {
            call.reject("modelPath is required");
            return;
        }

        Intent intent = new Intent(getContext(), LlamaServerService.class);
        intent.setAction("START_SERVER");
        intent.putExtra("modelPath", modelPath);
        intent.putExtra("port", port);

        getContext().startForegroundService(intent);

        JSObject result = new JSObject();
        result.put("success", true);
        result.put("port", port);
        result.put("modelPath", modelPath);
        call.resolve(result);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Intent intent = new Intent(getContext(), LlamaServerService.class);
        intent.setAction("STOP_SERVER");
        getContext().startService(intent);

        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        // This would require binding to the service for real status
        // For now we return a basic response
        JSObject result = new JSObject();
        result.put("running", false); // Would be dynamic in real implementation
        result.put("port", 8080);
        call.resolve(result);
    }
}