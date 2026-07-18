package ai.toddler.app;

import android.content.Context;
import android.content.Intent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "TrainingService")
public class TrainingPlugin extends Plugin {

    @PluginMethod
    public void start(PluginCall call) {
        Context ctx = getContext();
        Intent i = new Intent(ctx, TrainingService.class);
        i.setAction("start");
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            ctx.startForegroundService(i);
        } else {
            ctx.startService(i);
        }
        call.resolve(new JSObject().put("ok", true));
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Context ctx = getContext();
        ctx.stopService(new Intent(ctx, TrainingService.class));
        call.resolve(new JSObject().put("ok", true));
    }
}
