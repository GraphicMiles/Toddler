package ai.forgeai.app;

import android.app.Application;
import android.content.Context;

import com.getcapacitor.Bridge;
import com.getcapacitor.CorePlugin;
import com.getcapacitor.android.plugins.Filesystem;
import com.getcapacitor.android.plugins.Haptics;
import com.getcapacitor.android.plugins.LocalNotifications;
import com.getcapacitor.plugin.CapacitorCookies;
import com.getcapacitor.plugin.CapacitorHttp;
import com.getcapacitor.plugin.CapacitorStatusBar;
import com.getcapacitor.plugin.WebViewPlugin;

public class MainApplication extends Application {

    @Override
    public void onCreate() {
        super.onCreate();
    }

    @Override
    protected void attachBaseContext(Context base) {
        super.attachBaseContext(base);
        // Initialize Capacitor
        Bridge.LIFECYCLE_CALLBACK = new Bridge.LifecycleCallback() {
            @Override
            public void onBridgeCreate() {
                // Register core plugins
            }

            @Override
            public void onNativeReady() {
                // Native side is ready
            }

            @Override
            public void onResume() {
                // App resumed
            }

            @Override
            public void onPause() {
                // App paused
            }
        };
    }
}
