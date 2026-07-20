package dev.html2apk.bridge;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.util.Base64;
import android.view.View;
import android.widget.RemoteViews;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.json.JSONObject;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class Html2ApkWidgetManager {
    public static void atualizarWidget(CordovaPlugin plugin, JSONObject options, CallbackContext callbackContext) {
        plugin.cordova.getThreadPool().execute(new Runnable() {
            @Override
            public void run() {
                try {
                    Context context = plugin.cordova.getActivity().getApplicationContext();
                    AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
                    ComponentName thisWidget = new ComponentName(context, Html2ApkWidgetProvider.class);
                    int[] appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);

                    if (appWidgetIds == null || appWidgetIds.length == 0) {
                        callbackContext.error("Nenhum widget ativo na tela inicial.");
                        return;
                    }

                    int layoutId = context.getResources().getIdentifier("html2apk_widget_layout", "layout", context.getPackageName());
                    RemoteViews views = new RemoteViews(context.getPackageName(), layoutId);

                    int rootId = context.getResources().getIdentifier("widget_root", "id", context.getPackageName());
                    int titleId = context.getResources().getIdentifier("widget_title", "id", context.getPackageName());
                    int descId = context.getResources().getIdentifier("widget_description", "id", context.getPackageName());
                    int iconId = context.getResources().getIdentifier("widget_icon", "id", context.getPackageName());
                    int bgImgId = context.getResources().getIdentifier("widget_background_image", "id", context.getPackageName());

                    // Título e Descrição
                    if (options.has("titulo")) {
                        views.setTextViewText(titleId, options.optString("titulo"));
                    }
                    if (options.has("descricao")) {
                        views.setTextViewText(descId, options.optString("descricao"));
                    }

                    // Cores de texto
                    if (options.has("corTexto")) {
                        try {
                            int color = Color.parseColor(options.optString("corTexto"));
                            views.setTextColor(titleId, color);
                            views.setTextColor(descId, color);
                        } catch (Exception e) {}
                    }
                    
                    if (options.has("corTitulo")) {
                        try { views.setTextColor(titleId, Color.parseColor(options.optString("corTitulo"))); } catch (Exception e) {}
                    }
                    if (options.has("corDescricao")) {
                        try { views.setTextColor(descId, Color.parseColor(options.optString("corDescricao"))); } catch (Exception e) {}
                    }

                    // Fundo (Cor ou Transparente)
                    if (options.has("fundo") && !options.optBoolean("fundo", true)) {
                        views.setInt(rootId, "setBackgroundColor", Color.TRANSPARENT);
                        views.setViewVisibility(bgImgId, View.GONE);
                    } else if (options.has("fundoCor")) {
                        try {
                            String colorStr = options.optString("fundoCor");
                            int color = "transparent".equalsIgnoreCase(colorStr) ? Color.TRANSPARENT : Color.parseColor(colorStr);
                            views.setInt(rootId, "setBackgroundColor", color);
                            views.setViewVisibility(bgImgId, View.GONE);
                        } catch (Exception e) {}
                    }

                    if (options.has("fundoImagem")) {
                        Bitmap bgBitmap = decodeImage(options.optString("fundoImagem"));
                        if (bgBitmap != null) {
                            if (options.has("fundoBlur")) {
                                int radius = options.optInt("fundoBlur", 10);
                                if (radius > 0) bgBitmap = blurBitmap(bgBitmap, radius);
                            }
                            views.setImageViewBitmap(bgImgId, bgBitmap);
                            views.setViewVisibility(bgImgId, View.VISIBLE);
                        }
                    }

                    // Botões (ação customizada)
                    int buttonsContainerId = context.getResources().getIdentifier("widget_buttons_container", "id", context.getPackageName());
                    int btn1Id = context.getResources().getIdentifier("widget_button_1", "id", context.getPackageName());
                    int btn2Id = context.getResources().getIdentifier("widget_button_2", "id", context.getPackageName());
                    
                    boolean hasButtons = false;
                    
                    if (options.has("botao1")) {
                        JSONObject b1 = options.optJSONObject("botao1");
                        if (b1 != null) {
                            hasButtons = true;
                            views.setViewVisibility(btn1Id, View.VISIBLE);
                            views.setTextViewText(btn1Id, b1.optString("texto", "Ação 1"));
                            
                            android.content.Intent intentBtn1 = new android.content.Intent(context, Html2ApkWidgetProvider.class);
                            intentBtn1.setAction(Html2ApkWidgetProvider.ACTION_WIDGET_BUTTON);
                            intentBtn1.putExtra("acao_js", b1.optString("acao"));
                            android.app.PendingIntent pIntent1 = android.app.PendingIntent.getBroadcast(
                                    context, 1, intentBtn1, android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE);
                            views.setOnClickPendingIntent(btn1Id, pIntent1);
                        }
                    } else {
                        views.setViewVisibility(btn1Id, View.GONE);
                    }
                    
                    if (options.has("botao2")) {
                        JSONObject b2 = options.optJSONObject("botao2");
                        if (b2 != null) {
                            hasButtons = true;
                            views.setViewVisibility(btn2Id, View.VISIBLE);
                            views.setTextViewText(btn2Id, b2.optString("texto", "Ação 2"));
                            
                            android.content.Intent intentBtn2 = new android.content.Intent(context, Html2ApkWidgetProvider.class);
                            intentBtn2.setAction(Html2ApkWidgetProvider.ACTION_WIDGET_BUTTON);
                            intentBtn2.putExtra("acao_js", b2.optString("acao"));
                            android.app.PendingIntent pIntent2 = android.app.PendingIntent.getBroadcast(
                                    context, 2, intentBtn2, android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE);
                            views.setOnClickPendingIntent(btn2Id, pIntent2);
                        }
                    } else {
                        views.setViewVisibility(btn2Id, View.GONE);
                    }
                    
                    views.setViewVisibility(buttonsContainerId, hasButtons ? View.VISIBLE : View.GONE);

                    // Ícone (opcional)
                    if (options.has("imagemBase64") || options.has("imagem")) {
                        String imgStr = options.has("imagem") ? options.optString("imagem") : options.optString("imagemBase64");
                        Bitmap iconBitmap = decodeImage(imgStr);
                        if (iconBitmap != null) {
                            views.setImageViewBitmap(iconId, iconBitmap);
                            views.setViewVisibility(iconId, View.VISIBLE);
                        } else {
                            views.setViewVisibility(iconId, View.GONE);
                        }
                    }

                    // Atualiza widgets
                    appWidgetManager.updateAppWidget(thisWidget, views);
                    callbackContext.success();
                    
                } catch (Exception e) {
                    callbackContext.error("Erro ao atualizar widget: " + e.getMessage());
                }
            }
        });
    }

    private static Bitmap decodeImage(String input) {
        if (input == null || input.isEmpty()) return null;
        try {
            if (input.startsWith("http://") || input.startsWith("https://")) {
                URL url = new URL(input);
                HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                connection.setDoInput(true);
                connection.connect();
                InputStream inputStr = connection.getInputStream();
                return BitmapFactory.decodeStream(inputStr);
            } else if (input.startsWith("data:image")) {
                String base64Image = input.split(",")[1];
                byte[] decodedString = Base64.decode(base64Image, Base64.DEFAULT);
                return BitmapFactory.decodeByteArray(decodedString, 0, decodedString.length);
            } else {
                byte[] decodedString = Base64.decode(input, Base64.DEFAULT);
                return BitmapFactory.decodeByteArray(decodedString, 0, decodedString.length);
            }
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    public static void solicitarCriacaoWidget(CordovaPlugin plugin, CallbackContext callbackContext) {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            Context context = plugin.cordova.getActivity().getApplicationContext();
            AppWidgetManager appWidgetManager = context.getSystemService(AppWidgetManager.class);
            if (appWidgetManager != null && appWidgetManager.isRequestPinAppWidgetSupported()) {
                ComponentName thisWidget = new ComponentName(context, Html2ApkWidgetProvider.class);
                appWidgetManager.requestPinAppWidget(thisWidget, null, null);
                callbackContext.success();
            } else {
                callbackContext.error("Lançador não suporta fixação de widget via código.");
            }
        } else {
            callbackContext.error("Requer Android 8 (Oreo) ou superior para solicitar criação do widget.");
        }
    }

    private static Bitmap blurBitmap(Bitmap bitmap, int radius) {
        if (radius < 1) return (null);
        Bitmap bitmapOut = bitmap.copy(bitmap.getConfig(), true);
        
        int w = bitmapOut.getWidth();
        int h = bitmapOut.getHeight();
        
        int[] pix = new int[w * h];
        bitmapOut.getPixels(pix, 0, w, 0, 0, w, h);

        int wm = w - 1;
        int hm = h - 1;
        int wh = w * h;
        int div = radius + radius + 1;

        int r[] = new int[wh];
        int g[] = new int[wh];
        int b[] = new int[wh];
        int rsum, gsum, bsum, x, y, i, p, yp, yi, yw;
        int vmin[] = new int[Math.max(w, h)];

        int divsum = (div + 1) >> 1;
        divsum *= divsum;
        int dv[] = new int[256 * divsum];
        for (i = 0; i < 256 * divsum; i++) {
            dv[i] = (i / divsum);
        }

        yw = yi = 0;

        int[][] stack = new int[div][3];
        int stackpointer;
        int stackstart;
        int[] sir;
        int rbs;
        int r1 = radius + 1;
        int routsum, goutsum, boutsum;
        int rinsum, ginsum, binsum;

        for (y = 0; y < h; y++) {
            rinsum = ginsum = binsum = routsum = goutsum = boutsum = rsum = gsum = bsum = 0;
            for (i = -radius; i <= radius; i++) {
                p = pix[yi + Math.min(wm, Math.max(i, 0))];
                sir = stack[i + radius];
                sir[0] = (p & 0xff0000) >> 16;
                sir[1] = (p & 0x00ff00) >> 8;
                sir[2] = (p & 0x0000ff);
                rbs = r1 - Math.abs(i);
                rsum += sir[0] * rbs;
                gsum += sir[1] * rbs;
                bsum += sir[2] * rbs;
                if (i > 0) {
                    rinsum += sir[0];
                    ginsum += sir[1];
                    binsum += sir[2];
                } else {
                    routsum += sir[0];
                    goutsum += sir[1];
                    boutsum += sir[2];
                }
            }
            stackpointer = radius;

            for (x = 0; x < w; x++) {

                r[yi] = dv[rsum];
                g[yi] = dv[gsum];
                b[yi] = dv[bsum];

                rsum -= routsum;
                gsum -= goutsum;
                bsum -= boutsum;

                stackstart = stackpointer - radius + div;
                sir = stack[stackstart % div];

                routsum -= sir[0];
                goutsum -= sir[1];
                boutsum -= sir[2];

                if (y == 0) {
                    vmin[x] = Math.min(x + radius + 1, wm);
                }
                p = pix[yw + vmin[x]];

                sir[0] = (p & 0xff0000) >> 16;
                sir[1] = (p & 0x00ff00) >> 8;
                sir[2] = (p & 0x0000ff);

                rinsum += sir[0];
                ginsum += sir[1];
                binsum += sir[2];

                rsum += rinsum;
                gsum += ginsum;
                bsum += binsum;

                stackpointer = (stackpointer + 1) % div;
                sir = stack[(stackpointer) % div];

                routsum += sir[0];
                goutsum += sir[1];
                boutsum += sir[2];

                rinsum -= sir[0];
                ginsum -= sir[1];
                binsum -= sir[2];

                yi++;
            }
            yw += w;
        }
        for (x = 0; x < w; x++) {
            rinsum = ginsum = binsum = routsum = goutsum = boutsum = rsum = gsum = bsum = 0;
            yp = -radius * w;
            for (i = -radius; i <= radius; i++) {
                yi = Math.max(0, yp) + x;

                sir = stack[i + radius];

                sir[0] = r[yi];
                sir[1] = g[yi];
                sir[2] = b[yi];

                rbs = r1 - Math.abs(i);

                rsum += r[yi] * rbs;
                gsum += g[yi] * rbs;
                bsum += b[yi] * rbs;

                if (i > 0) {
                    rinsum += sir[0];
                    ginsum += sir[1];
                    binsum += sir[2];
                } else {
                    routsum += sir[0];
                    goutsum += sir[1];
                    boutsum += sir[2];
                }

                if (i < hm) {
                    yp += w;
                }
            }
            yi = x;
            stackpointer = radius;
            for (y = 0; y < h; y++) {
                pix[yi] = (0xff000000 & pix[yi]) | (dv[rsum] << 16) | (dv[gsum] << 8) | dv[bsum];
                rsum -= routsum;
                gsum -= goutsum;
                bsum -= boutsum;
                stackstart = stackpointer - radius + div;
                sir = stack[stackstart % div];
                routsum -= sir[0];
                goutsum -= sir[1];
                boutsum -= sir[2];
                if (x == 0) {
                    vmin[y] = Math.min(y + r1, hm) * w;
                }
                p = x + vmin[y];
                sir[0] = r[p];
                sir[1] = g[p];
                sir[2] = b[p];
                rinsum += sir[0];
                ginsum += sir[1];
                binsum += sir[2];
                rsum += rinsum;
                gsum += ginsum;
                bsum += binsum;
                stackpointer = (stackpointer + 1) % div;
                sir = stack[stackpointer];
                routsum += sir[0];
                goutsum += sir[1];
                boutsum += sir[2];
                rinsum -= sir[0];
                ginsum -= sir[1];
                binsum -= sir[2];
                yi += w;
            }
        }

        bitmapOut.setPixels(pix, 0, w, 0, 0, w, h);
        return (bitmapOut);
    }
}
