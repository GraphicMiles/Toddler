package ai.toddler.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import androidx.core.app.NotificationCompat;

/**
 * Minimal foreground service that the JS layer can start/stop when a BYOC
 * training job is running. Holds a partial wake lock so training continues
 * with the screen off, and posts an ongoing notification so Android doesn't
 * kill the process mid-training.
 *
 * Called from JS via Capacitor's native bridge in MobileDashboard.
 */
public class TrainingService extends Service {
    public static final String CHANNEL_ID = "toddler_training";
    private static final int NOTIFICATION_ID = 4242;
    private static PowerManager.WakeLock wakeLock = null;

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : "start";
        if ("stop".equals(action)) {
            stopForeground(true);
            stopSelf();
            releaseWakeLock();
            return START_NOT_STICKY;
        }
        Notification n = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Toddler")
                .setContentText("Training a model on your device…")
                .setSmallIcon(R.drawable.ic_stat_training)
                .setColor(0xFFC6FF33)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();
        startForeground(NOTIFICATION_ID, n);
        acquireWakeLock();
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }

    @Override
    public void onDestroy() {
        releaseWakeLock();
        super.onDestroy();
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                    CHANNEL_ID, "Toddler Training",
                    NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("Shown while on-device training is running.");
            NotificationManager mgr = getSystemService(NotificationManager.class);
            if (mgr != null) mgr.createNotificationChannel(ch);
        }
    }

    private void acquireWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) return;
        PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
        if (pm == null) return;
        wakeLock = pm.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK, "toddler:training");
        wakeLock.setReferenceCounted(false);
        wakeLock.acquire(30 * 60 * 1000L); // 30 min max safety
    }

    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            try { wakeLock.release(); } catch (Exception ignored) {}
        }
        wakeLock = null;
    }
}
