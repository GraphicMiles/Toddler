package ai.forgeai.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;

/**
 * Foreground service that manages the llama-server subprocess.
 * This keeps the local inference server alive while the app is in use.
 */
public class LlamaServerService extends Service {

    private static final String TAG = "LlamaServerService";
    private static final String CHANNEL_ID = "forgeai_llama_server";
    private static final int NOTIFICATION_ID = 1001;

    private Process llamaServerProcess;
    private int currentPort = 8080;
    private String currentModelPath = "";

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;

        if ("START_SERVER".equals(action)) {
            String modelPath = intent.getStringExtra("modelPath");
            int port = intent.getIntExtra("port", 8080);
            startLlamaServer(modelPath, port);
        } else if ("STOP_SERVER".equals(action)) {
            stopLlamaServer();
        }

        return START_NOT_STICKY;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "ForgeAI Local Inference",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Keeps local AI model running");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification buildNotification(String content) {
        Intent intent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, intent, PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("ForgeAI Local Inference")
                .setContentText(content)
                .setSmallIcon(android.R.drawable.ic_menu_info_details)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .build();
    }

    private void startLlamaServer(String modelPath, int port) {
        if (llamaServerProcess != null) {
            stopLlamaServer();
        }

        this.currentModelPath = modelPath;
        this.currentPort = port;

        try {
            File binary = new File(getApplicationInfo().nativeLibraryDir, "libllama-server.so");
            if (!binary.exists()) {
                Log.e(TAG, "llama-server binary not found at: " + binary.getAbsolutePath());
                return;
            }

            // Make sure binary is executable
            binary.setExecutable(true);

            ProcessBuilder pb = new ProcessBuilder(
                    binary.getAbsolutePath(),
                    "--model", modelPath,
                    "--port", String.valueOf(port),
                    "--host", "127.0.0.1",
                    "--n-gpu-layers", "0",           // CPU only for compatibility
                    "--ctx-size", "4096",
                    "--threads", "4"
            );

            pb.redirectErrorStream(true);
            llamaServerProcess = pb.start();

            // Start notification
            startForeground(NOTIFICATION_ID, buildNotification("Running: " + new File(modelPath).getName()));

            // Monitor process
            new Thread(() -> {
                try {
                    int exitCode = llamaServerProcess.waitFor();
                    Log.w(TAG, "llama-server exited with code: " + exitCode);
                    stopSelf();
                } catch (InterruptedException e) {
                    Log.e(TAG, "Process monitoring interrupted", e);
                }
            }).start();

            Log.i(TAG, "llama-server started on port " + port);

        } catch (Exception e) {
            Log.e(TAG, "Failed to start llama-server", e);
            stopSelf();
        }
    }

    private void stopLlamaServer() {
        if (llamaServerProcess != null) {
            try {
                llamaServerProcess.destroy();
                if (llamaServerProcess.isAlive()) {
                    llamaServerProcess.destroyForcibly();
                }
                Log.i(TAG, "llama-server stopped");
            } catch (Exception e) {
                Log.e(TAG, "Error stopping llama-server", e);
            } finally {
                llamaServerProcess = null;
            }
        }
        stopForeground(true);
        stopSelf();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        stopLlamaServer();
        super.onDestroy();
    }

    // Helper methods for JS bridge
    public boolean isRunning() {
        return llamaServerProcess != null && llamaServerProcess.isAlive();
    }

    public int getPort() {
        return currentPort;
    }

    public String getModelPath() {
        return currentModelPath;
    }
}