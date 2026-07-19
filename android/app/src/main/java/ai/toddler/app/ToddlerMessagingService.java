package ai.toddler.app;

import android.content.Intent;
import android.util.Log;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

public class ToddlerMessagingService extends FirebaseMessagingService {

    private static final String TAG = "ToddlerFCM";

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        
        // This receives the silent data payload from backend/main.py
        Map<String, String> data = remoteMessage.getData();
        Log.d(TAG, "Message received from FCM: " + data);
        
        if (data != null && "WAKE_WORKER".equals(data.get("action"))) {
            String jobId = data.get("job_id");
            Log.i(TAG, "Waking up worker for Job ID: " + jobId);
            
            // Spawn the Foreground Service to prevent OS sleep while downloading/training
            Intent serviceIntent = new Intent(this, TrainingService.class);
            serviceIntent.setAction("start");
            serviceIntent.putExtra("job_id", jobId);
            serviceIntent.putExtra("project_id", data.get("project_id"));
            
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent);
            } else {
                startService(serviceIntent);
            }
        }
    }

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        Log.d(TAG, "New FCM Token generated: " + token);
        // We handle saving this token to Firestore via JS right after auth, 
        // but we could also do it natively here.
    }
}
