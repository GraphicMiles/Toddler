package ai.forgeai.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import ai.forgeai.devicecapacity.DeviceCapacityPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(OnDeviceRuntime.class);
        registerPlugin(WorkspaceStorage.class);
        registerPlugin(DeviceCapacityPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
