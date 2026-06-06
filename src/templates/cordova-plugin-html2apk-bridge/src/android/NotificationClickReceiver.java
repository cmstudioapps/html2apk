package dev.html2apk.bridge;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import androidx.core.app.NotificationManagerCompat;

import org.json.JSONObject;

public class NotificationClickReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !intent.getBooleanExtra(Html2ApkBridge.EXTRA_NOTIFICATION_CLICKED, false)) {
            return;
        }

        JSONObject detail;
        try {
            detail = new JSONObject(intent.getStringExtra(Html2ApkBridge.EXTRA_NOTIFICATION_DETAIL));
        } catch (Exception ignored) {
            detail = new JSONObject();
        }

        Html2ApkBridge.handleNotificationClickBroadcast(context, detail);
        NotificationManagerCompat.from(context).cancel(detail.optInt("id", 0));
    }
}
