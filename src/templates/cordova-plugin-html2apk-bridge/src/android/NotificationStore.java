package dev.html2apk.bridge;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

public final class NotificationStore {
    private static final String PREFS = "html2apk_notifications";
    private static final String KEY_ITEMS = "items";

    private NotificationStore() {}

    static void save(Context context, int id, long when, JSONObject options) throws Exception {
        JSONArray items = all(context);
        JSONArray next = new JSONArray();

        for (int index = 0; index < items.length(); index += 1) {
            JSONObject item = items.optJSONObject(index);
            if (item != null && item.optInt("id") != id) {
                next.put(item);
            }
        }

        JSONObject item = new JSONObject();
        item.put("id", id);
        item.put("when", when);
        item.put("options", options);
        next.put(item);
        write(context, next);
    }

    static void remove(Context context, int id) {
        try {
            JSONArray items = all(context);
            JSONArray next = new JSONArray();

            for (int index = 0; index < items.length(); index += 1) {
                JSONObject item = items.optJSONObject(index);
                if (item != null && item.optInt("id") != id) {
                    next.put(item);
                }
            }

            write(context, next);
        } catch (Exception ignored) {
        }
    }

    static void rescheduleAll(Context context, boolean exactAllowed) {
        try {
            long now = System.currentTimeMillis();
            JSONArray items = all(context);
            JSONArray futureItems = new JSONArray();

            for (int index = 0; index < items.length(); index += 1) {
                JSONObject item = items.optJSONObject(index);
                if (item == null) {
                    continue;
                }

                int id = item.optInt("id");
                long when = item.optLong("when");
                JSONObject options = item.optJSONObject("options");
                if (options == null) {
                    continue;
                }

                if (when <= now && Html2ApkBridge.repeatInterval(options) > 0) {
                    when = Html2ApkBridge.nextRepeatTime(options, now);
                    options = Html2ApkBridge.nextRepeatOptions(options, when);
                    options.put("id", id);
                    item.put("when", when);
                    item.put("options", options);
                }

                if (when <= now) {
                    continue;
                }

                NotificationReceiver.schedule(context, id, when, options, exactAllowed);
                futureItems.put(item);
            }

            write(context, futureItems);
        } catch (Exception ignored) {
        }
    }

    private static JSONArray all(Context context) throws Exception {
        String raw = prefs(context).getString(KEY_ITEMS, "[]");
        return new JSONArray(raw);
    }

    private static void write(Context context, JSONArray items) {
        prefs(context).edit().putString(KEY_ITEMS, items.toString()).apply();
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
