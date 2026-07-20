package dev.html2apk.bridge;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import androidx.core.app.NotificationCompat;

public class BackgroundService extends Service {
    private static final String CHANNEL_ID = "html2apk_bg_channel";
    private static final int NOTIFICATION_ID = 2001;
    private PowerManager.WakeLock wakeLock;

    @Override
    public void onCreate() {
        super.onCreate();
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Html2Apk:BgServiceWakeLock");
            wakeLock.acquire();
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String appName = getAppName();
        createNotificationChannel(appName);

        String titulo = intent != null && intent.hasExtra("titulo") ? intent.getStringExtra("titulo") : appName;
        String texto = intent != null && intent.hasExtra("texto") ? intent.getStringExtra("texto") : appName;

        if (titulo == null || titulo.isEmpty()) titulo = appName;
        if (texto == null || texto.isEmpty()) texto = appName;

        int iconId = getApplicationInfo().icon;
        if (iconId == 0) {
            iconId = android.R.drawable.sym_def_app_icon;
        }

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(titulo)
                .setContentText(texto)
                .setSmallIcon(iconId)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setOngoing(true)
                .build();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            try {
                // ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC = 1;
                startForeground(NOTIFICATION_ID, notification, 1);
            } catch (Exception e) {
                try {
                    startForeground(NOTIFICATION_ID, notification);
                } catch(Exception e2) {}
            }
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }

        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
        stopForeground(true);
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private String getAppName() {
        PackageManager pm = getPackageManager();
        ApplicationInfo ai = getApplicationInfo();
        CharSequence label = pm.getApplicationLabel(ai);
        return label != null ? label.toString() : "App";
    }

    private void createNotificationChannel(String appName) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    appName,
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription(appName);
            channel.setShowBadge(false);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
}
