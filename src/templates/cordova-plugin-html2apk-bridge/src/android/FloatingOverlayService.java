package dev.html2apk.bridge;

import android.annotation.SuppressLint;
import android.app.Service;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.IBinder;
import android.provider.Settings;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.RelativeLayout;
import android.widget.TextView;
import android.util.Log;

public class FloatingOverlayService extends Service {
    private WindowManager windowManager;
    private RelativeLayout floatingLayout;
    private WebView webView;
    private WindowManager.LayoutParams params;

    private int startX;
    private int startY;
    private float touchStartX;
    private float touchStartY;

    public static final String ACTION_CLOSE_OVERLAY = "dev.html2apk.bridge.CLOSE_OVERLAY";

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_CLOSE_OVERLAY.equals(intent.getAction())) {
            stopSelf();
            return START_NOT_STICKY;
        }

        if (floatingLayout != null) {
            return START_NOT_STICKY; // Já está aberto
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            Log.e("Html2ApkOverlay", "Permission denied for SYSTEM_ALERT_WINDOW");
            stopSelf();
            return START_NOT_STICKY;
        }

        String url = intent != null && intent.hasExtra("url") ? intent.getStringExtra("url") : "file:///android_asset/www/bolha.html";
        int widthDp = intent != null && intent.hasExtra("largura") ? intent.getIntExtra("largura", 300) : 300;
        int heightDp = intent != null && intent.hasExtra("altura") ? intent.getIntExtra("altura", 400) : 400;

        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        if (windowManager == null) {
            stopSelf();
            return START_NOT_STICKY;
        }

        floatingLayout = new RelativeLayout(this);
        floatingLayout.setBackgroundColor(Color.TRANSPARENT);

        // Layout do conteúdo
        LinearLayout contentLayout = new LinearLayout(this);
        contentLayout.setOrientation(LinearLayout.VERTICAL);
        contentLayout.setBackgroundColor(Color.WHITE);

        // Barra de título arrastável
        LinearLayout headerLayout = new LinearLayout(this);
        headerLayout.setOrientation(LinearLayout.HORIZONTAL);
        headerLayout.setBackgroundColor(Color.parseColor("#333333"));
        headerLayout.setGravity(Gravity.CENTER_VERTICAL);
        headerLayout.setPadding(dp(8), dp(4), dp(8), dp(4));

        TextView titleView = new TextView(this);
        titleView.setText("...");
        titleView.setTextColor(Color.WHITE);
        titleView.setTextSize(12);
        LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1);
        headerLayout.addView(titleView, titleParams);

        Button closeBtn = new Button(this);
        closeBtn.setText("X");
        closeBtn.setTextColor(Color.WHITE);
        closeBtn.setBackgroundColor(Color.TRANSPARENT);
        closeBtn.setPadding(0, 0, 0, 0);
        closeBtn.setOnClickListener(v -> stopSelf());
        LinearLayout.LayoutParams closeParams = new LinearLayout.LayoutParams(dp(30), dp(30));
        headerLayout.addView(closeBtn, closeParams);

        contentLayout.addView(headerLayout, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(35)));

        // WebView
        webView = new WebView(this);
        setupWebView(webView);
        webView.loadUrl(url);

        contentLayout.addView(webView, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.MATCH_PARENT));

        floatingLayout.addView(contentLayout, new RelativeLayout.LayoutParams(dp(widthDp), dp(heightDp)));

        // Lógica de arrastar pelo header
        headerLayout.setOnTouchListener((v, event) -> {
            switch (event.getAction()) {
                case MotionEvent.ACTION_DOWN:
                    startX = params.x;
                    startY = params.y;
                    touchStartX = event.getRawX();
                    touchStartY = event.getRawY();
                    return true;
                case MotionEvent.ACTION_MOVE:
                    params.x = startX + Math.round(event.getRawX() - touchStartX);
                    params.y = startY + Math.round(event.getRawY() - touchStartY);
                    windowManager.updateViewLayout(floatingLayout, params);
                    return true;
            }
            return false;
        });

        int windowType = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                : WindowManager.LayoutParams.TYPE_PHONE;

        params = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                windowType,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.TOP | Gravity.START;
        params.x = dp(20);
        params.y = dp(100);

        windowManager.addView(floatingLayout, params);

        return START_NOT_STICKY;
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView(WebView webView) {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());
    }

    @Override
    public void onDestroy() {
        if (floatingLayout != null && windowManager != null) {
            windowManager.removeView(floatingLayout);
        }
        if (webView != null) {
            webView.destroy();
        }
        floatingLayout = null;
        super.onDestroy();
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
