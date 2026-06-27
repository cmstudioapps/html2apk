package dev.html2apk.bridge;

import android.app.Service;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.PixelFormat;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.IBinder;
import android.provider.Settings;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.ImageView;

public class FloatingIconService extends Service {
    private static final String PREFS_NAME = "html2apk_bridge";
    private static final String OPACITY_KEY = "floating_icon_opacity";
    private static final String EXTRA_OPACITY = "opacity";

    private WindowManager windowManager;
    private View floatingView;
    private WindowManager.LayoutParams params;
    private float opacity = 1f;
    private int startX;
    private int startY;
    private float touchStartX;
    private float touchStartY;

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        applyOptions(intent);
        if (floatingView != null) {
            applyFloatingIconStyle();
            return START_STICKY;
        }
        showFloatingIcon();
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        removeFloatingIcon();
        super.onDestroy();
    }

    private void showFloatingIcon() {
        if (floatingView != null) {
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            stopSelf();
            return;
        }

        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        if (windowManager == null) {
            stopSelf();
            return;
        }

        ImageView icon = new ImageView(this);
        int size = dp(58);
        icon.setImageDrawable(getApplicationInfo().loadIcon(getPackageManager()));
        icon.setScaleType(ImageView.ScaleType.FIT_CENTER);
        icon.setAlpha(opacity);

        int windowType = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            : WindowManager.LayoutParams.TYPE_PHONE;

        params = new WindowManager.LayoutParams(
            size,
            size,
            windowType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.TOP | Gravity.START;
        params.x = dp(16);
        params.y = dp(96);

        icon.setOnTouchListener(new View.OnTouchListener() {
            @Override
            public boolean onTouch(View view, MotionEvent event) {
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
                        windowManager.updateViewLayout(floatingView, params);
                        return true;
                    case MotionEvent.ACTION_UP:
                        float deltaX = Math.abs(event.getRawX() - touchStartX);
                        float deltaY = Math.abs(event.getRawY() - touchStartY);
                        if (deltaX < dp(6) && deltaY < dp(6)) {
                            openApp();
                        }
                        return true;
                    default:
                        return false;
                }
            }
        });

        floatingView = icon;
        try {
            windowManager.addView(floatingView, params);
        } catch (RuntimeException error) {
            floatingView = null;
            stopSelf();
        }
    }

    private void removeFloatingIcon() {
        if (windowManager != null && floatingView != null) {
            windowManager.removeView(floatingView);
        }
        floatingView = null;
    }

    private void applyOptions(Intent intent) {
        SharedPreferences preferences = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        float nextOpacity = preferences.getFloat(OPACITY_KEY, 1f);
        if (intent != null && intent.hasExtra(EXTRA_OPACITY)) {
            nextOpacity = intent.getFloatExtra(EXTRA_OPACITY, nextOpacity);
            nextOpacity = clampOpacity(nextOpacity);
            preferences.edit().putFloat(OPACITY_KEY, nextOpacity).apply();
        }
        opacity = clampOpacity(nextOpacity);
    }

    private void applyFloatingIconStyle() {
        if (floatingView != null) {
            floatingView.setAlpha(opacity);
        }
    }

    private void openApp() {
        Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (launchIntent == null) {
            return;
        }

        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivity(launchIntent);
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private float clampOpacity(float value) {
        return Math.max(0.1f, Math.min(1f, value));
    }
}
