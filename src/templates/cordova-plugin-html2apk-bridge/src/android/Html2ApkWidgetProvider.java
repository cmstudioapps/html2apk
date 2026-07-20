package dev.html2apk.bridge;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

public class Html2ApkWidgetProvider extends AppWidgetProvider {

    public static final String ACTION_OPEN_APP = "dev.html2apk.bridge.WIDGET_OPEN_APP";
    public static final String ACTION_WIDGET_BUTTON = "dev.html2apk.bridge.WIDGET_BUTTON";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        super.onUpdate(context, appWidgetManager, appWidgetIds);
        
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        int layoutId = context.getResources().getIdentifier("html2apk_widget_layout", "layout", context.getPackageName());
        if (layoutId == 0) return;
        
        RemoteViews views = new RemoteViews(context.getPackageName(), layoutId);

        // Ao clicar no widget inteiro, abre o App
        Intent intent = new Intent(context, Html2ApkWidgetProvider.class);
        intent.setAction(ACTION_OPEN_APP);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context, 
                0, 
                intent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        int rootId = context.getResources().getIdentifier("widget_root", "id", context.getPackageName());
        if (rootId != 0) {
            views.setOnClickPendingIntent(rootId, pendingIntent);
        }

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        
        if (ACTION_OPEN_APP.equals(intent.getAction()) || ACTION_WIDGET_BUTTON.equals(intent.getAction())) {
            Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
            if (launchIntent != null) {
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                if (ACTION_WIDGET_BUTTON.equals(intent.getAction())) {
                    launchIntent.putExtra("html2apk_widget_action", intent.getStringExtra("acao_js"));
                }
                context.startActivity(launchIntent);
            }
        }
    }
}
