package dev.html2apk.bridge;

import android.app.AlarmManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        boolean exactAllowed = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            exactAllowed = alarmManager != null && alarmManager.canScheduleExactAlarms();
        }

        NotificationStore.rescheduleAll(context, exactAllowed);

        android.content.SharedPreferences prefs = context.getSharedPreferences(Html2ApkBridge.PREFS_NAME, Context.MODE_PRIVATE);
        if (prefs.getBoolean("html2apk_boot_start", false)) {
            try {
                Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
                if (launchIntent != null) {
                    launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    launchIntent.putExtra(Html2ApkBridge.EXTRA_INITIAL_LINK, "html2apk://boot");
                    context.startActivity(launchIntent);
                }
            } catch (Exception ignored) {
            }
        }
    }
}
