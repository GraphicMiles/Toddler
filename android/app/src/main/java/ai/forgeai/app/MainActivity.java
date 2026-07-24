package ai.forgeai.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(OnDeviceRuntime.class);
        super.onCreate(savedInstanceState);
    }
}
