package dev.html2apk.bridge;

import android.Manifest;
import android.app.AlarmManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import org.json.JSONObject;

public class NotificationReceiver extends BroadcastReceiver {
    private static final String EXTRA_NOTIFICATION_ID = "html2apk_notification_id";
    private static final String EXTRA_NOTIFICATION_OPTIONS = "html2apk_notification_options";

    @Override
    public void onReceive(Context context, Intent intent) {
        JSONObject options = parseOptions(intent);
        int id = intent.getIntExtra(EXTRA_NOTIFICATION_ID, Html2ApkBridge.notificationId(options));

        if (Build.VERSION.SDK_INT >= 33 && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            if (Html2ApkBridge.repeatInterval(options) > 0) {
                Html2ApkBridge.rescheduleRepeatingNotification(context, id, options, Html2ApkBridge.canScheduleExactAlarms(context));
            } else {
                NotificationStore.remove(context, id);
            }
            return;
        }

        JSONObject displayOptions;
        try {
            displayOptions = Html2ApkBridge.notificationDisplayOptions(options);
        } catch (Exception error) {
            displayOptions = options;
        }
        NotificationStore.remove(context, id);

        Html2ApkBridge.ensureNotificationChannel(context);

        String title = Html2ApkBridge.title(displayOptions);
        String text = Html2ApkBridge.text(displayOptions);
        JSONObject detail;
        try {
            detail = Html2ApkBridge.detailPayload(displayOptions);
        } catch (Exception error) {
            detail = new JSONObject();
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, Html2ApkBridge.CHANNEL_ID)
            .setSmallIcon(context.getApplicationInfo().icon)
            .setContentTitle(title)
            .setContentText(text)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(text))
            .setAutoCancel(true)
            .setContentIntent(Html2ApkBridge.createNotificationClickIntent(context, id, detail))
            .setPriority(NotificationCompat.PRIORITY_DEFAULT);

        Html2ApkBridge.addNotificationActions(builder, context, id, displayOptions);
        NotificationManagerCompat.from(context).notify(id, builder.build());
        Html2ApkBridge.rescheduleRepeatingNotification(context, id, options, Html2ApkBridge.canScheduleExactAlarms(context));
    }

    static void schedule(Context context, int id, long when, JSONObject options, boolean exactAllowed) {
        Intent intent = new Intent(context, NotificationReceiver.class);
        intent.putExtra(EXTRA_NOTIFICATION_ID, id);
        intent.putExtra(EXTRA_NOTIFICATION_OPTIONS, options.toString());

        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            context,
            id,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) {
            return;
        }

        if (exactAllowed) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, pendingIntent);
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, when, pendingIntent);
            }
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, pendingIntent);
        } else {
            alarmManager.set(AlarmManager.RTC_WAKEUP, when, pendingIntent);
        }
    }

    static void cancel(Context context, int id) {
        Intent intent = new Intent(context, NotificationReceiver.class);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            context,
            id,
            intent,
            PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
        );

        if (pendingIntent == null) {
            return;
        }

        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager != null) {
            alarmManager.cancel(pendingIntent);
        }
        pendingIntent.cancel();
    }

    private static JSONObject parseOptions(Intent intent) {
        try {
            return new JSONObject(intent.getStringExtra(EXTRA_NOTIFICATION_OPTIONS));
        } catch (Exception ignored) {
            return new JSONObject();
        }
    }
}
