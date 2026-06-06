package dev.html2apk.bridge;

import android.Manifest;
import android.app.Activity;
import android.app.AlarmManager;
import android.app.ActivityManager;
import android.app.KeyguardManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.WallpaperManager;
import android.content.ActivityNotFoundException;
import android.content.BroadcastReceiver;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraManager;
import android.hardware.biometrics.BiometricPrompt;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.media.MediaRecorder;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.Debug;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.os.StatFs;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.Settings;
import android.provider.MediaStore;
import android.provider.OpenableColumns;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Toast;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaInterface;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaWebView;
import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.FileInputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.KeyStore;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Executor;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

public class Html2ApkBridge extends CordovaPlugin {
    static final String CHANNEL_ID = "html2apk_default";
    static final String EXTRA_NOTIFICATION_CLICKED = "html2apk_notification_clicked";
    static final String EXTRA_NOTIFICATION_DETAIL = "html2apk_notification_detail";

    private static final int REQUEST_POST_NOTIFICATIONS = 7311;
    private static final int REQUEST_CAMERA = 7312;
    private static final int REQUEST_RECORD_AUDIO = 7313;
    private static final int REQUEST_LOCATION = 7314;
    private static final int REQUEST_PICK_FILE = 7411;
    private static final int REQUEST_SAVE_FILE = 7412;
    private static final int REQUEST_PICK_FOLDER = 7413;
    private static final int REQUEST_CAPTURE_PHOTO = 7414;
    private static final int REQUEST_CAPTURE_VIDEO = 7415;
    private static final String PREFS_NAME = "html2apk_bridge";
    private static final String PREF_PERMISSION_PREFIX = "permission_requested_";
    private static final String STORED_FILES_DIR = "html2apk-files";
    private static final String STORED_FILE_META_SUFFIX = ".html2apk-meta.json";
    private static final String SECURE_PREFS_NAME = "html2apk_secure_storage";
    private static final String SECURE_KEY_ALIAS = "html2apk_secure_storage_key";
    private static final String SECURE_VALUE_PREFIX = "value:";
    private static final String SECURE_IV_PREFIX = "iv:";
    private static final String SECURE_TYPE_PREFIX = "type:";
    private static Html2ApkBridge activeBridge;

    private CallbackContext notificationPermissionCallback;
    private CallbackContext cameraPermissionCallback;
    private CallbackContext pendingNotificationCallback;
    private CallbackContext pendingFlashlightCallback;
    private CallbackContext microphonePermissionCallback;
    private CallbackContext pendingMicStartCallback;
    private CallbackContext filePickerCallback;
    private CallbackContext saveFileCallback;
    private CallbackContext folderPickerCallback;
    private CallbackContext mediaCaptureCallback;
    private CallbackContext pendingLocationCallback;
    private CallbackContext biometricCallback;
    private CallbackContext pendingDownloadCallback;
    private JSONObject pendingSaveFile;
    private JSONObject pendingMediaCaptureOptions;
    private JSONObject pendingLocationOptions;
    private JSONObject pendingNotificationOptions;
    private JSONObject pendingDownloadOptions;
    private JSONObject initialNotification;
    private JSONObject initialLink;
    private File pendingMediaCaptureFile;
    private Uri pendingMediaCaptureUri;
    private String pendingMediaCaptureKind;
    private Boolean pendingFlashlightEnabled;
    private boolean pendingNotificationSchedule;
    private boolean pendingFlashlightToggle;
    private boolean pendingLocationWatch;
    private boolean overlaySettingsOpened;
    private boolean torchEnabled;
    private int locationWatchCounter;
    private MediaRecorder micRecorder;
    private File micRecordingFile;
    private long micRecordingStartedAt;
    private BroadcastReceiver systemReceiver;
    private CancellationSignal biometricCancellationSignal;
    private final Map<String, LocationListener> locationListeners = new HashMap<String, LocationListener>();

    @Override
    public void initialize(CordovaInterface cordova, CordovaWebView webView) {
        super.initialize(cordova, webView);
        activeBridge = this;
        handleNotificationIntent(cordova.getActivity().getIntent(), false);
        handleLinkIntent(cordova.getActivity().getIntent(), false);
        registerSystemReceiver();
        startFloatingModeIfNeeded();
    }

    @Override
    public void onNewIntent(Intent intent) {
        handleNotificationIntent(intent, true);
        handleLinkIntent(intent, true);
    }

    @Override
    public void onResume(boolean multitasking) {
        super.onResume(multitasking);
        dispatchEvent("app:voltou", baseEvent("app:voltou"));
        startFloatingModeIfNeeded();
    }

    @Override
    public void onPause(boolean multitasking) {
        dispatchEvent("app:pausado", baseEvent("app:pausado"));
        dispatchEvent("app:background", baseEvent("app:background"));
        super.onPause(multitasking);
    }

    @Override
    public void onDestroy() {
        stopMicRecorderSilently();
        stopAllLocationWatches();
        cancelBiometricPrompt();
        unregisterSystemReceiver();
        dispatchEvent("app:fechado", baseEvent("app:fechado"));
        if (activeBridge == this) {
            activeBridge = null;
        }
        super.onDestroy();
    }

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) {
        try {
            if ("notify".equals(action)) {
                JSONObject options = args.optJSONObject(0);
                if (requestNotificationPermissionForAction(options == null ? new JSONObject() : options, false, callbackContext)) {
                    return true;
                }
                showNotification(options == null ? new JSONObject() : options);
                callbackContext.success();
                return true;
            }

            if ("scheduleNotification".equals(action)) {
                JSONObject options = args.optJSONObject(0);
                if (requestNotificationPermissionForAction(options == null ? new JSONObject() : options, true, callbackContext)) {
                    return true;
                }
                callbackContext.success(scheduleNotification(options == null ? new JSONObject() : options));
                return true;
            }

            if ("cancelNotification".equals(action)) {
                cancelNotification(args.opt(0));
                callbackContext.success();
                return true;
            }

            if ("vibrate".equals(action)) {
                vibrate(args.optLong(0, 200));
                callbackContext.success();
                return true;
            }

            if ("toast".equals(action)) {
                toast(args.optString(0, ""));
                callbackContext.success();
                return true;
            }

            if ("fullscreen".equals(action)) {
                setFullscreen(args.optBoolean(0, true));
                callbackContext.success();
                return true;
            }

            if ("keepScreenAwake".equals(action)) {
                keepScreenAwake(args.optBoolean(0, true));
                callbackContext.success();
                return true;
            }

            if ("setScreenBrightness".equals(action)) {
                setScreenBrightness(args.optDouble(0, -1));
                callbackContext.success();
                return true;
            }

            if ("setSystemBarsColor".equals(action)) {
                callbackContext.success(setSystemBarsColor(args.opt(0)));
                return true;
            }

            if ("flashlight".equals(action)) {
                setFlashlightWithPermission(args.optBoolean(0, true), false, callbackContext);
                return true;
            }

            if ("toggleFlashlight".equals(action)) {
                setFlashlightWithPermission(false, true, callbackContext);
                return true;
            }

            if ("flashlightStatus".equals(action)) {
                callbackContext.success(flashlightStatus());
                return true;
            }

            if ("capturePhoto".equals(action)) {
                captureMedia("photo", args.optJSONObject(0), callbackContext);
                return true;
            }

            if ("captureVideo".equals(action)) {
                captureMedia("video", args.optJSONObject(0), callbackContext);
                return true;
            }

            if ("requestCameraPermission".equals(action)) {
                requestCameraPermission(callbackContext);
                return true;
            }

            if ("requestMicrophonePermission".equals(action)) {
                requestMicrophonePermission(callbackContext);
                return true;
            }

            if ("microphoneStatus".equals(action)) {
                callbackContext.success(microphoneStatus());
                return true;
            }

            if ("startMic".equals(action)) {
                startMicRecording(callbackContext);
                return true;
            }

            if ("stopMic".equals(action)) {
                callbackContext.success(stopMicRecording());
                return true;
            }

            if ("copyText".equals(action)) {
                copyText(args.optString(0, ""));
                callbackContext.success();
                return true;
            }

            if ("readText".equals(action)) {
                callbackContext.success(readText());
                return true;
            }

            if ("shareText".equals(action)) {
                shareText(args.optString(0, ""));
                callbackContext.success();
                return true;
            }

            if ("share".equals(action)) {
                share(args.optJSONObject(0));
                callbackContext.success();
                return true;
            }

            if ("openUrl".equals(action)) {
                openUrl(args.optString(0, ""));
                callbackContext.success();
                return true;
            }

            if ("dial".equals(action)) {
                dial(args.optString(0, ""));
                callbackContext.success();
                return true;
            }

            if ("openMap".equals(action)) {
                openMap(args.optString(0, ""));
                callbackContext.success();
                return true;
            }

            if ("openWhatsapp".equals(action)) {
                openWhatsapp(args.optString(0, ""), args.optString(1, ""));
                callbackContext.success();
                return true;
            }

            if ("pickFile".equals(action)) {
                pickFile(args.optJSONObject(0), callbackContext);
                return true;
            }

            if ("pickFolder".equals(action)) {
                pickFolder(callbackContext);
                return true;
            }

            if ("saveFile".equals(action)) {
                saveFile(args.optJSONObject(0), callbackContext);
                return true;
            }

            if ("saveStoredFile".equals(action)) {
                callbackContext.success(saveStoredFile(args.optJSONObject(0)));
                return true;
            }

            if ("readStoredFile".equals(action)) {
                callbackContext.success(readStoredFile(args.optJSONObject(0)));
                return true;
            }

            if ("deleteStoredFile".equals(action)) {
                callbackContext.success(deleteStoredFile(args.optJSONObject(0)));
                return true;
            }

            if ("storedFileInfo".equals(action)) {
                callbackContext.success(storedFileInfo(args.optJSONObject(0)));
                return true;
            }

            if ("listStoredFiles".equals(action)) {
                callbackContext.success(listStoredFiles());
                return true;
            }

            if ("openStoredFile".equals(action)) {
                openStoredFile(args.optJSONObject(0));
                callbackContext.success();
                return true;
            }

            if ("shareStoredFile".equals(action)) {
                shareStoredFile(args.optJSONObject(0));
                callbackContext.success();
                return true;
            }

            if ("downloadFile".equals(action)) {
                downloadFile(args.optJSONObject(0), callbackContext);
                return true;
            }

            if ("setWallpaper".equals(action)) {
                callbackContext.success(setWallpaper(args.optJSONObject(0)));
                return true;
            }

            if ("wallpaperInfo".equals(action)) {
                callbackContext.success(wallpaperInfo());
                return true;
            }

            if ("openWallpaperSettings".equals(action)) {
                callbackContext.success(openWallpaperSettings());
                return true;
            }

            if ("deviceInfo".equals(action)) {
                callbackContext.success(deviceInfo());
                return true;
            }

            if ("networkInfo".equals(action)) {
                callbackContext.success(networkInfo());
                return true;
            }

            if ("batteryInfo".equals(action)) {
                callbackContext.success(batteryInfo());
                return true;
            }

            if ("memoryInfo".equals(action)) {
                callbackContext.success(memoryInfo());
                return true;
            }

            if ("storageInfo".equals(action)) {
                callbackContext.success(storageInfo());
                return true;
            }

            if ("performanceInfo".equals(action)) {
                callbackContext.success(performanceInfo());
                return true;
            }

            if ("openAppsMemory".equals(action)) {
                callbackContext.success(openAppsMemoryInfo());
                return true;
            }

            if ("getLocation".equals(action)) {
                getLocation(args.optJSONObject(0), callbackContext);
                return true;
            }

            if ("watchLocation".equals(action)) {
                watchLocation(args.optJSONObject(0), callbackContext);
                return true;
            }

            if ("stopLocationWatch".equals(action)) {
                callbackContext.success(stopLocationWatch(args.optString(0, "")));
                return true;
            }

            if ("permissionStatus".equals(action)) {
                callbackContext.success(permissionStatus(args.optJSONArray(0)));
                return true;
            }

            if ("requestNotificationPermission".equals(action)) {
                requestNotificationPermission(callbackContext);
                return true;
            }

            if ("notificationPermissionStatus".equals(action)) {
                callbackContext.success(notificationPermissionStatus());
                return true;
            }

            if ("canScheduleExactAlarms".equals(action)) {
                callbackContext.success(canScheduleExactAlarms() ? 1 : 0);
                return true;
            }

            if ("openExactAlarmSettings".equals(action)) {
                openExactAlarmSettings();
                JSONObject result = new JSONObject();
                result.put("permission", "android.permission.SCHEDULE_EXACT_ALARM");
                result.put("required", Build.VERSION.SDK_INT >= Build.VERSION_CODES.S);
                result.put("granted", canScheduleExactAlarms());
                result.put("permissionGranted", canScheduleExactAlarms());
                result.put("requiresSettings", Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !canScheduleExactAlarms());
                result.put("settingsOpened", Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !canScheduleExactAlarms());
                callbackContext.success(result);
                return true;
            }

            if ("overlayPermissionStatus".equals(action)) {
                callbackContext.success(overlayPermissionStatus());
                return true;
            }

            if ("requestOverlayPermission".equals(action) || "openOverlaySettings".equals(action)) {
                openOverlaySettings();
                JSONObject result = overlayPermissionStatus();
                result.put("requested", true);
                result.put("settingsOpened", result.optBoolean("requiresSettings"));
                callbackContext.success(result);
                return true;
            }

            if ("startFloatingIcon".equals(action)) {
                if (!canDrawOverlays()) {
                    openOverlaySettings();
                    JSONObject result = overlayPermissionStatus();
                    result.put("requested", true);
                    result.put("requiresSettings", true);
                    callbackContext.success(result);
                    return true;
                }
                startFloatingIcon();
                callbackContext.success(overlayPermissionStatus());
                return true;
            }

            if ("stopFloatingIcon".equals(action)) {
                stopFloatingIcon();
                callbackContext.success();
                return true;
            }

            if ("getInitialNotification".equals(action)) {
                callbackContext.success(initialNotification == null ? new JSONObject() : initialNotification);
                initialNotification = null;
                return true;
            }

            if ("getInitialLink".equals(action)) {
                callbackContext.success(initialLink == null ? new JSONObject() : initialLink);
                initialLink = null;
                return true;
            }

            if ("authenticateBiometric".equals(action)) {
                authenticateBiometric(args.optJSONObject(0), callbackContext);
                return true;
            }

            if ("saveSecureItem".equals(action)) {
                callbackContext.success(saveSecureItem(args.optJSONObject(0)));
                return true;
            }

            if ("readSecureItem".equals(action)) {
                callbackContext.success(readSecureItem(args.optJSONObject(0)));
                return true;
            }

            if ("deleteSecureItem".equals(action)) {
                callbackContext.success(deleteSecureItem(args.optJSONObject(0)));
                return true;
            }

            if ("listSecureKeys".equals(action)) {
                callbackContext.success(listSecureKeys());
                return true;
            }

            if ("clearSecureStorage".equals(action)) {
                callbackContext.success(clearSecureStorage());
                return true;
            }
        } catch (Exception error) {
            callbackContext.error(error.getMessage());
            return true;
        }

        return false;
    }

    private void rejectBusyCallback(CallbackContext callbackContext, String operation) {
        callbackContext.error(operation + " is already waiting for Android. Wait for the previous call to finish.");
    }

    private boolean hasPendingNotificationPermissionRequest() {
        return pendingNotificationCallback != null || notificationPermissionCallback != null || pendingDownloadCallback != null;
    }

    private boolean hasPendingCameraPermissionRequest() {
        return pendingFlashlightCallback != null || cameraPermissionCallback != null || mediaCaptureCallback != null;
    }

    private boolean hasPendingMicrophonePermissionRequest() {
        return pendingMicStartCallback != null || microphonePermissionCallback != null;
    }

    @Override
    public void onRequestPermissionResult(int requestCode, String[] permissions, int[] grantResults) {
        if (requestCode == REQUEST_CAMERA) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            if (pendingFlashlightCallback != null) {
                CallbackContext callback = pendingFlashlightCallback;
                Boolean enabled = pendingFlashlightEnabled;
                boolean toggle = pendingFlashlightToggle;
                pendingFlashlightCallback = null;
                pendingFlashlightEnabled = null;
                pendingFlashlightToggle = false;

                try {
                    if (!granted) {
                        JSONObject result = shouldOpenSettingsForRuntimePermission(Manifest.permission.CAMERA)
                            ? openSettingsForRuntimePermission(Manifest.permission.CAMERA, true, true)
                            : flashlightStatus();
                        result.put("requested", true);
                        result.put("granted", false);
                        callback.success(result);
                        return;
                    }

                    setFlashlight(toggle ? !torchEnabled : Boolean.TRUE.equals(enabled));
                    JSONObject result = flashlightStatus();
                    result.put("requested", true);
                    result.put("granted", true);
                    callback.success(result);
                } catch (Exception error) {
                    callback.error(error.getMessage());
                }
                return;
            }

            if (mediaCaptureCallback != null && pendingMediaCaptureKind != null) {
                CallbackContext callback = mediaCaptureCallback;
                String kind = pendingMediaCaptureKind;
                JSONObject options = pendingMediaCaptureOptions == null ? new JSONObject() : pendingMediaCaptureOptions;
                mediaCaptureCallback = null;
                pendingMediaCaptureKind = null;
                pendingMediaCaptureOptions = null;

                try {
                    if (!granted) {
                        JSONObject result = shouldOpenSettingsForRuntimePermission(Manifest.permission.CAMERA)
                            ? openSettingsForRuntimePermission(Manifest.permission.CAMERA, true, true)
                            : runtimePermissionResult(Manifest.permission.CAMERA, true, true, false);
                        result.put("requested", true);
                        result.put("granted", false);
                        callback.success(result);
                        return;
                    }

                    startMediaCapture(kind, options, callback);
                } catch (Exception error) {
                    callback.error(error.getMessage());
                }
                return;
            }

            if (cameraPermissionCallback == null) {
                return;
            }

            try {
                JSONObject result = granted
                    ? runtimePermissionResult(Manifest.permission.CAMERA, true, true, true)
                    : (
                        shouldOpenSettingsForRuntimePermission(Manifest.permission.CAMERA)
                            ? openSettingsForRuntimePermission(Manifest.permission.CAMERA, true, true)
                            : runtimePermissionResult(Manifest.permission.CAMERA, true, true, false)
                    );
                cameraPermissionCallback.success(result);
            } catch (Exception error) {
                cameraPermissionCallback.error(error.getMessage());
            } finally {
                cameraPermissionCallback = null;
            }
            return;
        }

        if (requestCode == REQUEST_RECORD_AUDIO) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            CallbackContext callback = pendingMicStartCallback != null ? pendingMicStartCallback : microphonePermissionCallback;
            boolean shouldStartRecording = pendingMicStartCallback != null;
            pendingMicStartCallback = null;
            microphonePermissionCallback = null;

            if (callback == null) {
                return;
            }

            try {
                if (shouldStartRecording && granted) {
                    startMicRecorder(callback);
                } else {
                    JSONObject result = granted
                        ? microphoneStatus()
                        : (
                            shouldOpenSettingsForRuntimePermission(Manifest.permission.RECORD_AUDIO)
                                ? openSettingsForRuntimePermission(Manifest.permission.RECORD_AUDIO, true, true)
                                : microphoneStatus()
                        );
                    result.put("requested", true);
                    result.put("granted", granted);
                    callback.success(result);
                }
            } catch (Exception error) {
                callback.error(error.getMessage());
            }
            return;
        }

        if (requestCode == REQUEST_LOCATION) {
            boolean granted = hasLocationPermission();
            CallbackContext callback = pendingLocationCallback;
            JSONObject options = pendingLocationOptions == null ? new JSONObject() : pendingLocationOptions;
            boolean shouldWatch = pendingLocationWatch;
            pendingLocationCallback = null;
            pendingLocationOptions = null;
            pendingLocationWatch = false;

            if (callback == null) {
                return;
            }

            try {
                if (granted) {
                    if (shouldWatch) {
                        startLocationWatch(options, callback);
                    } else {
                        resolveCurrentLocation(options, callback);
                    }
                    return;
                }

                String permission = locationPermissionName(options);
                JSONObject result = shouldOpenSettingsForRuntimePermission(permission)
                    ? openSettingsForRuntimePermission(permission, true, true)
                    : runtimePermissionResult(permission, true, true, false);
                result.put("requested", true);
                result.put("granted", false);
                callback.success(result);
            } catch (Exception error) {
                callback.error(error.getMessage());
            }
            return;
        }

        if (requestCode != REQUEST_POST_NOTIFICATIONS) {
            return;
        }

        boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
        if (pendingNotificationCallback != null) {
            CallbackContext callback = pendingNotificationCallback;
            JSONObject options = pendingNotificationOptions == null ? new JSONObject() : pendingNotificationOptions;
            boolean schedule = pendingNotificationSchedule;
            pendingNotificationCallback = null;
            pendingNotificationOptions = null;
            pendingNotificationSchedule = false;

            try {
                if (!granted) {
                    JSONObject result = shouldOpenSettingsForRuntimePermission(Manifest.permission.POST_NOTIFICATIONS)
                        ? openSettingsForRuntimePermission(Manifest.permission.POST_NOTIFICATIONS, true, true)
                        : notificationPermissionStatus();
                    result.put("requested", true);
                    result.put("granted", false);
                    callback.success(result);
                    return;
                }

                if (schedule) {
                    JSONObject result = scheduleNotification(options);
                    result.put("requested", true);
                    result.put("granted", true);
                    callback.success(result);
                } else {
                    showNotification(options);
                    callback.success();
                }
            } catch (Exception error) {
                callback.error(error.getMessage());
            }
            return;
        }

        if (pendingDownloadCallback != null) {
            CallbackContext callback = pendingDownloadCallback;
            JSONObject options = pendingDownloadOptions == null ? new JSONObject() : pendingDownloadOptions;
            pendingDownloadCallback = null;
            pendingDownloadOptions = null;

            try {
                options.put("notificationPermissionRequested", true);
                options.put("permissaoNotificacaoSolicitada", true);
                options.put("notificationPermissionGranted", granted);
                options.put("permissaoNotificacaoConcedida", granted);
                startDownloadFile(options, callback);
            } catch (Exception error) {
                callback.error(error.getMessage());
            }
            return;
        }

        if (notificationPermissionCallback == null) {
            return;
        }

        try {
            JSONObject result = granted
                ? notificationPermissionStatus()
                : (
                    shouldOpenSettingsForRuntimePermission(Manifest.permission.POST_NOTIFICATIONS)
                        ? openSettingsForRuntimePermission(Manifest.permission.POST_NOTIFICATIONS, true, true)
                        : notificationPermissionStatus()
                );
            result.put("requested", true);
            result.put("granted", granted);
            notificationPermissionCallback.success(result);
        } catch (Exception error) {
            notificationPermissionCallback.error(error.getMessage());
        } finally {
            notificationPermissionCallback = null;
        }
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent intent) {
        if (requestCode == REQUEST_PICK_FILE) {
            handlePickFileResult(resultCode, intent);
            return;
        }

        if (requestCode == REQUEST_SAVE_FILE) {
            handleSaveFileResult(resultCode, intent);
            return;
        }

        if (requestCode == REQUEST_PICK_FOLDER) {
            handlePickFolderResult(resultCode, intent);
            return;
        }

        if (requestCode == REQUEST_CAPTURE_PHOTO || requestCode == REQUEST_CAPTURE_VIDEO) {
            handleMediaCaptureResult(resultCode, intent);
        }
    }

    private Context context() {
        return this.cordova.getActivity().getApplicationContext();
    }

    private SharedPreferences preferencesStore() {
        return context().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    private boolean wasRuntimePermissionRequested(String permission) {
        return preferencesStore().getBoolean(PREF_PERMISSION_PREFIX + permission, false);
    }

    private void rememberRuntimePermissionRequest(String permission) {
        preferencesStore().edit().putBoolean(PREF_PERMISSION_PREFIX + permission, true).apply();
    }

    private boolean shouldOpenSettingsForRuntimePermission(String permission) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M || !wasRuntimePermissionRequested(permission)) {
            return false;
        }

        return !cordova.getActivity().shouldShowRequestPermissionRationale(permission);
    }

    private JSONObject runtimePermissionResult(String permission, boolean required, boolean requested, boolean granted) throws Exception {
        JSONObject result = new JSONObject();
        result.put("permission", permission);
        result.put("required", required);
        result.put("requested", requested);
        result.put("granted", granted);
        result.put("permissionGranted", granted);
        result.put("requiresSettings", required && !granted && shouldOpenSettingsForRuntimePermission(permission));
        result.put("settingsOpened", false);
        return result;
    }

    private JSONObject openSettingsForRuntimePermission(String permission, boolean required, boolean requested) throws Exception {
        JSONObject result = runtimePermissionResult(permission, required, requested, false);
        openPermissionSettings(permission);
        result.put("requiresSettings", true);
        result.put("settingsOpened", true);
        result.put("settingsScreen", Manifest.permission.POST_NOTIFICATIONS.equals(permission) ? "notifications" : "app");
        result.put("telaConfiguracao", result.optString("settingsScreen"));
        return result;
    }

    private void openPermissionSettings(String permission) {
        if (Manifest.permission.POST_NOTIFICATIONS.equals(permission)) {
            openNotificationSettings();
            return;
        }

        openAppSettings();
    }

    private void openAppSettings() {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        intent.setData(Uri.parse("package:" + context().getPackageName()));
        cordova.getActivity().startActivity(intent);
    }

    private void openNotificationSettings() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            openAppSettings();
            return;
        }

        Intent intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
        intent.putExtra(Settings.EXTRA_APP_PACKAGE, context().getPackageName());
        try {
            cordova.getActivity().startActivity(intent);
        } catch (ActivityNotFoundException error) {
            openAppSettings();
        }
    }

    private boolean isFloatingMode() {
        return "floating".equals(preferences.getString("Html2ApkMode", ""));
    }

    private void startFloatingModeIfNeeded() {
        if (!isFloatingMode()) {
            return;
        }

        this.cordova.getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    if (canDrawOverlays()) {
                        startFloatingIcon();
                        cordova.getActivity().moveTaskToBack(true);
                    } else if (!overlaySettingsOpened) {
                        overlaySettingsOpened = true;
                        openOverlaySettings();
                    }
                } catch (Exception ignored) {
                }
            }
        });
    }

    private boolean canDrawOverlays() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(context());
    }

    private JSONObject overlayPermissionStatus() throws Exception {
        JSONObject result = new JSONObject();
        result.put("required", Build.VERSION.SDK_INT >= Build.VERSION_CODES.M);
        result.put("granted", canDrawOverlays());
        result.put("permission", "android.permission.SYSTEM_ALERT_WINDOW");
        result.put("permissionGranted", canDrawOverlays());
        result.put("requiresSettings", Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !canDrawOverlays());
        result.put("settingsOpened", false);
        return result;
    }

    private void openOverlaySettings() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M || canDrawOverlays()) {
            return;
        }

        Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION);
        intent.setData(Uri.parse("package:" + context().getPackageName()));
        try {
            cordova.getActivity().startActivity(intent);
        } catch (ActivityNotFoundException error) {
            openAppSettings();
        }
    }

    private void startFloatingIcon() throws Exception {
        if (!canDrawOverlays()) {
            openOverlaySettings();
            throw new Exception("SYSTEM_ALERT_WINDOW permission is not granted.");
        }

        Intent intent = new Intent(context(), FloatingIconService.class);
        context().startService(intent);
    }

    private void stopFloatingIcon() {
        Intent intent = new Intent(context(), FloatingIconService.class);
        context().stopService(intent);
    }

    static void ensureNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "html2apk",
                NotificationManager.IMPORTANCE_DEFAULT
            );
            channel.setDescription("Default channel for html2apk notifications.");
            NotificationManager manager = context.getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private boolean hasNotificationPermission() {
        return Build.VERSION.SDK_INT < 33
            || context().checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
    }

    private void requestNotificationPermission(CallbackContext callbackContext) throws Exception {
        if (Build.VERSION.SDK_INT < 33 || hasNotificationPermission()) {
            callbackContext.success(notificationPermissionStatus());
            return;
        }
        if (hasPendingNotificationPermissionRequest()) {
            rejectBusyCallback(callbackContext, "POST_NOTIFICATIONS permission");
            return;
        }

        notificationPermissionCallback = callbackContext;
        rememberRuntimePermissionRequest(Manifest.permission.POST_NOTIFICATIONS);
        cordova.requestPermission(this, REQUEST_POST_NOTIFICATIONS, Manifest.permission.POST_NOTIFICATIONS);
    }

    private JSONObject notificationPermissionStatus() throws Exception {
        boolean required = Build.VERSION.SDK_INT >= 33;
        return runtimePermissionResult(Manifest.permission.POST_NOTIFICATIONS, required, false, hasNotificationPermission());
    }

    private boolean requestNotificationPermissionForAction(JSONObject options, boolean schedule, CallbackContext callbackContext) throws Exception {
        if (hasNotificationPermission()) {
            return false;
        }
        if (hasPendingNotificationPermissionRequest()) {
            rejectBusyCallback(callbackContext, "POST_NOTIFICATIONS permission");
            return true;
        }

        pendingNotificationOptions = options;
        pendingNotificationSchedule = schedule;
        pendingNotificationCallback = callbackContext;
        rememberRuntimePermissionRequest(Manifest.permission.POST_NOTIFICATIONS);
        cordova.requestPermission(this, REQUEST_POST_NOTIFICATIONS, Manifest.permission.POST_NOTIFICATIONS);
        return true;
    }

    private void showNotification(JSONObject options) throws Exception {
        if (!hasNotificationPermission()) {
            throw new Exception("POST_NOTIFICATIONS permission is not granted.");
        }

        ensureNotificationChannel(context());
        int id = notificationId(options);
        String title = title(options);
        String text = text(options);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context(), CHANNEL_ID)
            .setSmallIcon(context().getApplicationInfo().icon)
            .setContentTitle(title)
            .setContentText(text)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(text))
            .setAutoCancel(true)
            .setContentIntent(createNotificationClickIntent(context(), id, detailPayload(options)))
            .setPriority(NotificationCompat.PRIORITY_DEFAULT);

        addNotificationActions(builder, context(), id, options);
        NotificationManagerCompat.from(context()).notify(id, builder.build());
        dispatchEvent("notificacao:recebida", detailPayload(options));
    }

    private JSONObject scheduleNotification(JSONObject options) throws Exception {
        long when = options.optLong("quando", options.optLong("when", System.currentTimeMillis() + 60000));
        if (when < System.currentTimeMillis()) {
            when = System.currentTimeMillis() + 1000;
        }

        int id = notificationId(options);
        options.put("id", id);
        options.put("quando", when);
        options.put("when", when);
        boolean exactRequested = wantsExactAlarm(options);
        boolean exactAllowed = canScheduleExactAlarms();
        boolean settingsOpened = false;
        if (exactRequested && !exactAllowed) {
            openExactAlarmSettings();
            settingsOpened = true;
        }
        NotificationStore.save(context(), id, when, options);
        NotificationReceiver.schedule(context(), id, when, options, exactAllowed);

        JSONObject result = new JSONObject();
        result.put("id", id);
        result.put("when", when);
        result.put("quando", when);
        result.put("repeating", repeatInterval(options) > 0);
        result.put("loop", loopNotifications(options).length() > 0);
        result.put("exactRequested", exactRequested);
        result.put("exatoSolicitado", exactRequested);
        result.put("exactAllowed", exactAllowed);
        result.put("exatoPermitido", exactAllowed);
        result.put("requiresSettings", exactRequested && !exactAllowed);
        result.put("settingsOpened", settingsOpened);
        return result;
    }

    private boolean wantsExactAlarm(JSONObject options) {
        return options.optBoolean("exato",
            options.optBoolean("exact",
                options.optBoolean("alarmeExato",
                    options.optBoolean("exactAlarm",
                        options.optBoolean("preciso",
                            options.optBoolean("precise", false))))));
    }

    private void cancelNotification(Object input) throws Exception {
        int id = notificationIdFromObject(input);
        if (id == 0) {
            throw new Exception("Notification id is required.");
        }

        NotificationReceiver.cancel(context(), id);
        NotificationStore.remove(context(), id);
        NotificationManagerCompat.from(context()).cancel(id);
    }

    private boolean canScheduleExactAlarms() {
        return canScheduleExactAlarms(context());
    }

    private void openExactAlarmSettings() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || canScheduleExactAlarms()) {
            return;
        }

        Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
        intent.setData(Uri.parse("package:" + context().getPackageName()));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            context().startActivity(intent);
        } catch (ActivityNotFoundException error) {
            openAppSettings();
        }
    }

    private void vibrate(long ms) {
        Vibrator vibrator = (Vibrator) context().getSystemService(Context.VIBRATOR_SERVICE);
        if (vibrator == null) {
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE));
        } else {
            vibrator.vibrate(ms);
        }
    }

    private void toast(final String message) {
        this.cordova.getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                Toast.makeText(context(), message, Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void setFullscreen(final boolean enabled) {
        this.cordova.getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                View decor = cordova.getActivity().getWindow().getDecorView();
                if (enabled) {
                    decor.setSystemUiVisibility(
                        View.SYSTEM_UI_FLAG_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    );
                } else {
                    decor.setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE);
                }
            }
        });
    }

    private void keepScreenAwake(final boolean enabled) {
        this.cordova.getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (enabled) {
                    cordova.getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                } else {
                    cordova.getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                }
            }
        });
    }

    private void setScreenBrightness(final double value) {
        this.cordova.getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                WindowManager.LayoutParams attributes = cordova.getActivity().getWindow().getAttributes();
                if (value < 0) {
                    attributes.screenBrightness = WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE;
                } else {
                    attributes.screenBrightness = (float) Math.max(0.01, Math.min(1, value));
                }
                cordova.getActivity().getWindow().setAttributes(attributes);
            }
        });
    }

    private JSONObject setSystemBarsColor(Object input) throws Exception {
        final JSONObject options = normalizeSystemBarsOptions(input);
        final String statusColor = options.optString("statusBarColor", options.optString("color", options.optString("cor", "#126fff")));
        final String navigationColor = options.optString("navigationBarColor", options.optString("navigationColor", statusColor));
        final boolean darkStatusIcons = options.optBoolean("darkIcons", isLightColor(statusColor));
        final boolean darkNavigationIcons = options.optBoolean("darkNavigationIcons", isLightColor(navigationColor));
        final int statusBarColor = Color.parseColor(statusColor);
        final int navigationBarColor = Color.parseColor(navigationColor);

        this.cordova.getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                Window window = cordova.getActivity().getWindow();
                window.setStatusBarColor(statusBarColor);
                window.setNavigationBarColor(navigationBarColor);
                applySystemBarIconContrast(window, darkStatusIcons, darkNavigationIcons);
            }
        });

        JSONObject result = new JSONObject();
        result.put("statusBarColor", statusColor);
        result.put("navigationBarColor", navigationColor);
        result.put("darkIcons", darkStatusIcons);
        result.put("darkNavigationIcons", darkNavigationIcons);
        result.put("applied", true);
        return result;
    }

    private JSONObject normalizeSystemBarsOptions(Object input) throws Exception {
        if (input instanceof JSONObject) {
            return (JSONObject) input;
        }

        JSONObject options = new JSONObject();
        String color = input == null ? "#126fff" : String.valueOf(input);
        options.put("color", color);
        options.put("statusBarColor", color);
        options.put("navigationBarColor", color);
        return options;
    }

    private boolean isLightColor(String color) {
        try {
            int parsed = Color.parseColor(color);
            int red = Color.red(parsed);
            int green = Color.green(parsed);
            int blue = Color.blue(parsed);
            double luminance = (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
            return luminance > 158;
        } catch (Exception ignored) {
            return false;
        }
    }

    private void applySystemBarIconContrast(Window window, boolean darkStatusIcons, boolean darkNavigationIcons) {
        View decor = window.getDecorView();
        int flags = decor.getSystemUiVisibility();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (darkStatusIcons) {
                flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            } else {
                flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            }
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (darkNavigationIcons) {
                flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            } else {
                flags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            }
        }

        decor.setSystemUiVisibility(flags);
    }

    private void copyText(String text) {
        ClipboardManager clipboard = (ClipboardManager) context().getSystemService(Context.CLIPBOARD_SERVICE);
        if (clipboard != null) {
            clipboard.setPrimaryClip(ClipData.newPlainText("html2apk", text));
        }
    }

    private void shareText(String text) {
        Intent intent = new Intent(Intent.ACTION_SEND);
        intent.setType("text/plain");
        intent.putExtra(Intent.EXTRA_TEXT, text);
        cordova.getActivity().startActivity(Intent.createChooser(intent, "Compartilhar"));
    }

    private void openUrl(String url) throws Exception {
        if (url == null || url.trim().length() == 0) {
            throw new Exception("URL is required.");
        }

        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
        cordova.getActivity().startActivity(intent);
    }

    private boolean hasCameraPermission() {
        return ContextCompat.checkSelfPermission(context(), Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
    }

    private void requestCameraPermission(CallbackContext callbackContext) throws Exception {
        if (hasCameraPermission()) {
            callbackContext.success(runtimePermissionResult(Manifest.permission.CAMERA, true, false, true));
            return;
        }
        if (hasPendingCameraPermissionRequest()) {
            rejectBusyCallback(callbackContext, "CAMERA permission");
            return;
        }

        cameraPermissionCallback = callbackContext;
        rememberRuntimePermissionRequest(Manifest.permission.CAMERA);
        cordova.requestPermission(this, REQUEST_CAMERA, Manifest.permission.CAMERA);
    }

    private boolean hasMicrophonePermission() {
        return ContextCompat.checkSelfPermission(context(), Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
    }

    private void requestMicrophonePermission(CallbackContext callbackContext) throws Exception {
        if (hasMicrophonePermission()) {
            JSONObject result = microphoneStatus();
            result.put("requested", false);
            result.put("granted", true);
            callbackContext.success(result);
            return;
        }
        if (hasPendingMicrophonePermissionRequest()) {
            rejectBusyCallback(callbackContext, "RECORD_AUDIO permission");
            return;
        }

        microphonePermissionCallback = callbackContext;
        rememberRuntimePermissionRequest(Manifest.permission.RECORD_AUDIO);
        cordova.requestPermission(this, REQUEST_RECORD_AUDIO, Manifest.permission.RECORD_AUDIO);
    }

    private JSONObject microphoneStatus() throws Exception {
        JSONObject result = new JSONObject();
        result.put("permission", "android.permission.RECORD_AUDIO");
        result.put("required", true);
        result.put("granted", hasMicrophonePermission());
        result.put("permissionGranted", hasMicrophonePermission());
        result.put("requiresSettings", !hasMicrophonePermission() && shouldOpenSettingsForRuntimePermission(Manifest.permission.RECORD_AUDIO));
        result.put("settingsOpened", false);
        result.put("recording", micRecorder != null);
        result.put("gravando", micRecorder != null);
        if (micRecorder != null) {
            result.put("startedAt", micRecordingStartedAt);
            result.put("iniciadoEm", micRecordingStartedAt);
            result.put("durationMs", System.currentTimeMillis() - micRecordingStartedAt);
            result.put("duracaoMs", System.currentTimeMillis() - micRecordingStartedAt);
        }
        return result;
    }

    private void startMicRecording(CallbackContext callbackContext) throws Exception {
        if (micRecorder != null) {
            JSONObject result = microphoneStatus();
            result.put("alreadyRecording", true);
            result.put("jaGravando", true);
            callbackContext.success(result);
            return;
        }

        if (!hasMicrophonePermission()) {
            if (hasPendingMicrophonePermissionRequest()) {
                rejectBusyCallback(callbackContext, "RECORD_AUDIO permission");
                return;
            }
            pendingMicStartCallback = callbackContext;
            rememberRuntimePermissionRequest(Manifest.permission.RECORD_AUDIO);
            cordova.requestPermission(this, REQUEST_RECORD_AUDIO, Manifest.permission.RECORD_AUDIO);
            return;
        }

        startMicRecorder(callbackContext);
    }

    private void startMicRecorder(CallbackContext callbackContext) throws Exception {
        File audioDir = new File(context().getCacheDir(), "html2apk-audio");
        if (!audioDir.exists() && !audioDir.mkdirs()) {
            throw new Exception("Could not create audio cache directory.");
        }

        File audioFile = File.createTempFile("mic-", ".m4a", audioDir);
        MediaRecorder recorder = new MediaRecorder();
        try {
            recorder.setAudioSource(MediaRecorder.AudioSource.MIC);
            recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
            recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
            recorder.setAudioEncodingBitRate(128000);
            recorder.setAudioSamplingRate(44100);
            recorder.setOutputFile(audioFile.getAbsolutePath());
            recorder.prepare();
            recorder.start();
        } catch (Exception error) {
            try {
                recorder.release();
            } catch (Exception ignored) {
            }
            audioFile.delete();
            throw error;
        }

        micRecordingFile = audioFile;
        micRecordingStartedAt = System.currentTimeMillis();
        micRecorder = recorder;

        JSONObject result = microphoneStatus();
        result.put("mimeType", "audio/mp4");
        result.put("extension", "m4a");
        result.put("extensao", "m4a");
        result.put("fileName", micRecordingFile.getName());
        result.put("nomeArquivo", micRecordingFile.getName());
        callbackContext.success(result);
    }

    private JSONObject stopMicRecording() throws Exception {
        if (micRecorder == null || micRecordingFile == null) {
            throw new Exception("Microphone is not recording. Call ouvirMic() first.");
        }

        MediaRecorder recorder = micRecorder;
        File audioFile = micRecordingFile;
        long startedAt = micRecordingStartedAt;
        long endedAt;
        Exception stopError = null;

        micRecorder = null;
        micRecordingFile = null;
        micRecordingStartedAt = 0;

        try {
            recorder.stop();
        } catch (RuntimeException error) {
            stopError = new Exception("Could not finalize audio recording. Wait a little longer before calling pararMic().");
        } finally {
            try {
                recorder.reset();
            } catch (Exception ignored) {
            }
            try {
                recorder.release();
            } catch (Exception ignored) {
            }
        }

        if (stopError != null) {
            audioFile.delete();
            throw stopError;
        }

        endedAt = System.currentTimeMillis();
        byte[] audioBytes = readFileBytes(audioFile);
        String base64 = Base64.encodeToString(audioBytes, Base64.NO_WRAP);
        audioFile.delete();

        JSONObject result = new JSONObject();
        result.put("base64", base64);
        result.put("mimeType", "audio/mp4");
        result.put("extension", "m4a");
        result.put("extensao", "m4a");
        result.put("size", audioBytes.length);
        result.put("tamanho", audioBytes.length);
        result.put("startedAt", startedAt);
        result.put("iniciadoEm", startedAt);
        result.put("endedAt", endedAt);
        result.put("finalizadoEm", endedAt);
        result.put("durationMs", endedAt - startedAt);
        result.put("duracaoMs", endedAt - startedAt);
        result.put("recording", false);
        result.put("gravando", false);
        return result;
    }

    private byte[] readFileBytes(File file) throws Exception {
        InputStream inputStream = new FileInputStream(file);
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        try {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = inputStream.read(buffer)) != -1) {
                outputStream.write(buffer, 0, read);
            }
            return outputStream.toByteArray();
        } finally {
            inputStream.close();
            outputStream.close();
        }
    }

    private void stopMicRecorderSilently() {
        if (micRecorder == null) {
            return;
        }

        MediaRecorder recorder = micRecorder;
        File audioFile = micRecordingFile;
        micRecorder = null;
        micRecordingFile = null;
        micRecordingStartedAt = 0;

        try {
            recorder.stop();
        } catch (Exception ignored) {
        }
        try {
            recorder.reset();
        } catch (Exception ignored) {
        }
        try {
            recorder.release();
        } catch (Exception ignored) {
        }
        if (audioFile != null) {
            audioFile.delete();
        }
    }

    private String torchCameraId() throws Exception {
        CameraManager manager = (CameraManager) context().getSystemService(Context.CAMERA_SERVICE);
        if (manager == null) {
            throw new Exception("Camera service is not available.");
        }

        for (String cameraId : manager.getCameraIdList()) {
            CameraCharacteristics characteristics = manager.getCameraCharacteristics(cameraId);
            Boolean flashAvailable = characteristics.get(CameraCharacteristics.FLASH_INFO_AVAILABLE);
            if (Boolean.TRUE.equals(flashAvailable)) {
                return cameraId;
            }
        }

        throw new Exception("This device does not expose a flashlight.");
    }

    private void setFlashlight(boolean enabled) throws Exception {
        if (!hasCameraPermission()) {
            throw new Exception("CAMERA permission is not granted.");
        }

        CameraManager manager = (CameraManager) context().getSystemService(Context.CAMERA_SERVICE);
        if (manager == null) {
            throw new Exception("Camera service is not available.");
        }

        manager.setTorchMode(torchCameraId(), enabled);
        torchEnabled = enabled;
    }

    private void setFlashlightWithPermission(boolean enabled, boolean toggle, CallbackContext callbackContext) throws Exception {
        if (!hasCameraPermission()) {
            if (hasPendingCameraPermissionRequest()) {
                rejectBusyCallback(callbackContext, "CAMERA permission");
                return;
            }
            pendingFlashlightCallback = callbackContext;
            pendingFlashlightEnabled = enabled;
            pendingFlashlightToggle = toggle;
            rememberRuntimePermissionRequest(Manifest.permission.CAMERA);
            cordova.requestPermission(this, REQUEST_CAMERA, Manifest.permission.CAMERA);
            return;
        }

        setFlashlight(toggle ? !torchEnabled : enabled);
        callbackContext.success(flashlightStatus());
    }

    private JSONObject flashlightStatus() throws Exception {
        JSONObject result = new JSONObject();
        result.put("available", context().getPackageManager().hasSystemFeature(PackageManager.FEATURE_CAMERA_FLASH));
        result.put("enabled", torchEnabled);
        result.put("permission", "android.permission.CAMERA");
        result.put("permissionGranted", hasCameraPermission());
        result.put("requiresSettings", !hasCameraPermission() && shouldOpenSettingsForRuntimePermission(Manifest.permission.CAMERA));
        result.put("settingsOpened", false);
        return result;
    }

    private void captureMedia(String kind, JSONObject options, CallbackContext callbackContext) throws Exception {
        if (mediaCaptureCallback != null) {
            rejectBusyCallback(callbackContext, "Camera capture");
            return;
        }

        if (!hasCameraPermission()) {
            mediaCaptureCallback = callbackContext;
            pendingMediaCaptureKind = kind;
            pendingMediaCaptureOptions = options == null ? new JSONObject() : options;
            rememberRuntimePermissionRequest(Manifest.permission.CAMERA);
            cordova.requestPermission(this, REQUEST_CAMERA, Manifest.permission.CAMERA);
            return;
        }

        startMediaCapture(kind, options == null ? new JSONObject() : options, callbackContext);
    }

    private void startMediaCapture(String kind, JSONObject options, CallbackContext callbackContext) throws Exception {
        boolean video = "video".equals(kind);
        Intent intent = new Intent(video ? MediaStore.ACTION_VIDEO_CAPTURE : MediaStore.ACTION_IMAGE_CAPTURE);
        if (intent.resolveActivity(context().getPackageManager()) == null) {
            throw new Exception(video ? "No video camera app is available." : "No camera app is available.");
        }

        File outputFile = createMediaCaptureFile(video ? "video" : "photo");
        Uri outputUri = fileProviderUri(outputFile);
        intent.putExtra(MediaStore.EXTRA_OUTPUT, outputUri);
        intent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);

        if (video) {
            if (options.has("durationSeconds") || options.has("duracaoSegundos")) {
                intent.putExtra(MediaStore.EXTRA_DURATION_LIMIT, Math.max(1, options.optInt("durationSeconds", options.optInt("duracaoSegundos", 0))));
            }
            if (options.has("quality") || options.has("qualidade")) {
                intent.putExtra(MediaStore.EXTRA_VIDEO_QUALITY, Math.max(0, Math.min(1, options.optInt("quality", options.optInt("qualidade", 1)))));
            }
        }

        pendingMediaCaptureFile = outputFile;
        pendingMediaCaptureUri = outputUri;
        pendingMediaCaptureKind = video ? "video" : "photo";
        pendingMediaCaptureOptions = options;
        mediaCaptureCallback = callbackContext;
        cordova.startActivityForResult(this, intent, video ? REQUEST_CAPTURE_VIDEO : REQUEST_CAPTURE_PHOTO);
    }

    private File createMediaCaptureFile(String kind) throws Exception {
        File baseDir = "video".equals(kind)
            ? context().getExternalFilesDir(Environment.DIRECTORY_MOVIES)
            : context().getExternalFilesDir(Environment.DIRECTORY_PICTURES);
        if (baseDir == null) {
            baseDir = new File(context().getCacheDir(), "html2apk-media");
        }
        if (!baseDir.exists() && !baseDir.mkdirs()) {
            throw new Exception("Could not create media directory.");
        }

        String extension = "video".equals(kind) ? ".mp4" : ".jpg";
        return File.createTempFile("html2apk-" + kind + "-", extension, baseDir);
    }

    private Uri fileProviderUri(File file) {
        return FileProvider.getUriForFile(context(), context().getPackageName() + ".html2apk.fileprovider", file);
    }

    private void handleMediaCaptureResult(int resultCode, Intent intent) {
        CallbackContext callback = mediaCaptureCallback;
        JSONObject options = pendingMediaCaptureOptions == null ? new JSONObject() : pendingMediaCaptureOptions;
        File outputFile = pendingMediaCaptureFile;
        String kind = pendingMediaCaptureKind;
        mediaCaptureCallback = null;
        pendingMediaCaptureOptions = null;
        pendingMediaCaptureFile = null;
        pendingMediaCaptureUri = null;
        pendingMediaCaptureKind = null;

        if (callback == null) {
            return;
        }
        if (resultCode != Activity.RESULT_OK) {
            if (outputFile != null && outputFile.exists()) {
                outputFile.delete();
            }
            callback.success(new JSONObject());
            return;
        }

        try {
            JSONObject result;
            if (outputFile != null && outputFile.exists() && outputFile.length() > 0) {
                result = storedFileResult(outputFile, mediaMimeType(kind), kind);
                if (options.optBoolean("base64", false)) {
                    result.put("base64", Base64.encodeToString(readFileBytes(outputFile), Base64.NO_WRAP));
                }
            } else if (intent != null && intent.getData() != null) {
                result = fileInfo(intent.getData());
                if (options.optBoolean("base64", false)) {
                    result.put("base64", Base64.encodeToString(readUriBytes(intent.getData()), Base64.NO_WRAP));
                }
            } else {
                if (outputFile != null && outputFile.exists()) {
                    outputFile.delete();
                }
                result = new JSONObject();
            }

            result.put("kind", kind);
            result.put("tipo", kind);
            result.put("captured", true);
            result.put("capturado", true);
            callback.success(result);
        } catch (Exception error) {
            callback.error(error.getMessage());
        }
    }

    private String mediaMimeType(String kind) {
        return "video".equals(kind) ? "video/mp4" : "image/jpeg";
    }

    private String readText() {
        ClipboardManager clipboard = (ClipboardManager) context().getSystemService(Context.CLIPBOARD_SERVICE);
        if (clipboard == null || !clipboard.hasPrimaryClip() || clipboard.getPrimaryClip() == null) {
            return "";
        }

        ClipData clip = clipboard.getPrimaryClip();
        if (clip.getItemCount() == 0 || clip.getItemAt(0) == null) {
            return "";
        }

        CharSequence text = clip.getItemAt(0).coerceToText(context());
        return text == null ? "" : text.toString();
    }

    private void share(JSONObject options) {
        JSONObject safeOptions = options == null ? new JSONObject() : options;
        String text = safeOptions.optString("texto", safeOptions.optString("text", ""));
        String url = safeOptions.optString("url", "");
        String title = safeOptions.optString("titulo", safeOptions.optString("title", "Compartilhar"));
        StringBuilder content = new StringBuilder();
        if (text.length() > 0) {
            content.append(text);
        }
        if (url.length() > 0) {
            if (content.length() > 0) {
                content.append("\n");
            }
            content.append(url);
        }

        Intent intent = new Intent(Intent.ACTION_SEND);
        intent.setType(safeOptions.optString("mimeType", "text/plain"));
        intent.putExtra(Intent.EXTRA_TEXT, content.toString());
        intent.putExtra(Intent.EXTRA_TITLE, title);
        cordova.getActivity().startActivity(Intent.createChooser(intent, title));
    }

    private void dial(String phone) throws Exception {
        String cleaned = phone == null ? "" : phone.trim();
        if (cleaned.length() == 0) {
            throw new Exception("Phone number is required.");
        }

        Intent intent = new Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + Uri.encode(cleaned)));
        cordova.getActivity().startActivity(intent);
    }

    private void openMap(String query) throws Exception {
        String cleaned = query == null ? "" : query.trim();
        if (cleaned.length() == 0) {
            throw new Exception("Map query is required.");
        }

        Uri uri = cleaned.startsWith("geo:") || cleaned.startsWith("http")
            ? Uri.parse(cleaned)
            : Uri.parse("geo:0,0?q=" + Uri.encode(cleaned));
        Intent intent = new Intent(Intent.ACTION_VIEW, uri);
        cordova.getActivity().startActivity(intent);
    }

    private void openWhatsapp(String phone, String message) throws Exception {
        String digits = phone == null ? "" : phone.replaceAll("[^0-9]", "");
        if (digits.length() == 0) {
            throw new Exception("WhatsApp phone number is required.");
        }

        String url = "https://wa.me/" + digits;
        if (message != null && message.trim().length() > 0) {
            url += "?text=" + Uri.encode(message.trim());
        }
        openUrl(url);
    }

    private void pickFile(JSONObject options, CallbackContext callbackContext) {
        if (filePickerCallback != null) {
            rejectBusyCallback(callbackContext, "File picker");
            return;
        }

        JSONObject safeOptions = options == null ? new JSONObject() : options;
        String kind = safeOptions.optString("tipo", safeOptions.optString("kind", "file"));
        boolean multiple = safeOptions.optBoolean("multiplo", safeOptions.optBoolean("multiple", false));
        String mimeType = mimeTypeForPicker(kind, safeOptions);

        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mimeType);
        intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, multiple);

        filePickerCallback = callbackContext;
        cordova.startActivityForResult(this, intent, REQUEST_PICK_FILE);
    }

    private String mimeTypeForPicker(String kind, JSONObject options) {
        String type = options.optString("mimeType", options.optString("tipoMime", ""));
        if (type.length() > 0) {
            return type;
        }

        JSONArray types = options.optJSONArray("tipos");
        if (types == null) {
            types = options.optJSONArray("types");
        }
        if (types != null && types.length() == 1) {
            return types.optString(0, "*/*");
        }

        if ("image".equals(kind)) {
            return "image/*";
        }
        if ("video".equals(kind)) {
            return "video/*";
        }
        if ("media".equals(kind)) {
            return "image/*";
        }
        return "*/*";
    }

    private void pickFolder(CallbackContext callbackContext) {
        if (folderPickerCallback != null) {
            rejectBusyCallback(callbackContext, "Folder picker");
            return;
        }

        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        folderPickerCallback = callbackContext;
        cordova.startActivityForResult(this, intent, REQUEST_PICK_FOLDER);
    }

    private void saveFile(JSONObject options, CallbackContext callbackContext) throws Exception {
        if (saveFileCallback != null) {
            rejectBusyCallback(callbackContext, "File save dialog");
            return;
        }

        JSONObject safeOptions = options == null ? new JSONObject() : options;
        String name = safeOptions.optString("nome", safeOptions.optString("name", "arquivo.txt"));
        String mimeType = safeOptions.optString("mimeType", "text/plain");

        pendingSaveFile = safeOptions;
        saveFileCallback = callbackContext;

        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mimeType);
        intent.putExtra(Intent.EXTRA_TITLE, name);
        cordova.startActivityForResult(this, intent, REQUEST_SAVE_FILE);
    }

    private void handlePickFileResult(int resultCode, Intent intent) {
        CallbackContext callback = filePickerCallback;
        filePickerCallback = null;
        if (callback == null) {
            return;
        }
        if (resultCode != Activity.RESULT_OK || intent == null) {
            callback.success(new JSONArray());
            return;
        }

        try {
            JSONArray items = new JSONArray();
            if (intent.getClipData() != null) {
                ClipData clipData = intent.getClipData();
                for (int index = 0; index < clipData.getItemCount(); index += 1) {
                    items.put(fileInfo(clipData.getItemAt(index).getUri()));
                }
            } else if (intent.getData() != null) {
                items.put(fileInfo(intent.getData()));
            }
            callback.success(items);
        } catch (Exception error) {
            callback.error(error.getMessage());
        }
    }

    private void handlePickFolderResult(int resultCode, Intent intent) {
        CallbackContext callback = folderPickerCallback;
        folderPickerCallback = null;
        if (callback == null) {
            return;
        }
        if (resultCode != Activity.RESULT_OK || intent == null || intent.getData() == null) {
            callback.success(new JSONObject());
            return;
        }

        try {
            JSONObject result = new JSONObject();
            result.put("uri", intent.getData().toString());
            callback.success(result);
        } catch (Exception error) {
            callback.error(error.getMessage());
        }
    }

    private void handleSaveFileResult(int resultCode, Intent intent) {
        CallbackContext callback = saveFileCallback;
        JSONObject options = pendingSaveFile;
        saveFileCallback = null;
        pendingSaveFile = null;
        if (callback == null) {
            return;
        }
        if (resultCode != Activity.RESULT_OK || intent == null || intent.getData() == null) {
            callback.success(new JSONObject());
            return;
        }

        try {
            Uri uri = intent.getData();
            writePickedFile(uri, options == null ? new JSONObject() : options);
            JSONObject result = fileInfo(uri);
            result.put("saved", true);
            callback.success(result);
        } catch (Exception error) {
            callback.error(error.getMessage());
        }
    }

    private JSONObject fileInfo(Uri uri) throws Exception {
        JSONObject result = new JSONObject();
        result.put("uri", uri.toString());
        result.put("mimeType", context().getContentResolver().getType(uri));

        Cursor cursor = context().getContentResolver().query(uri, null, null, null, null);
        if (cursor != null) {
            try {
                int nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                int sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE);
                if (cursor.moveToFirst()) {
                    if (nameIndex >= 0) {
                        result.put("name", cursor.getString(nameIndex));
                        result.put("nome", cursor.getString(nameIndex));
                    }
                    if (sizeIndex >= 0) {
                        result.put("size", cursor.getLong(sizeIndex));
                        result.put("tamanho", cursor.getLong(sizeIndex));
                    }
                }
            } finally {
                cursor.close();
            }
        }
        return result;
    }

    private void writePickedFile(Uri uri, JSONObject options) throws Exception {
        OutputStream outputStream = context().getContentResolver().openOutputStream(uri);
        if (outputStream == null) {
            throw new Exception("Could not open output stream.");
        }

        try {
            InputStream inputStream;
            String base64 = options.optString("base64", "");
            if (base64.length() > 0) {
                inputStream = new ByteArrayInputStream(Base64.decode(base64, Base64.DEFAULT));
            } else {
                String content = options.optString("conteudo", options.optString("content", ""));
                inputStream = new ByteArrayInputStream(content.getBytes("UTF-8"));
            }

            byte[] buffer = new byte[8192];
            int read;
            while ((read = inputStream.read(buffer)) != -1) {
                outputStream.write(buffer, 0, read);
            }
            inputStream.close();
        } finally {
            outputStream.close();
        }
    }

    private JSONObject saveStoredFile(JSONObject options) throws Exception {
        JSONObject safeOptions = options == null ? new JSONObject() : options;
        File file = storedFileFromOptions(safeOptions);
        boolean existed = file.exists();
        StoredContent content = storedContentFromOptions(safeOptions);

        File parent = file.getParentFile();
        if (parent != null && !parent.exists() && !parent.mkdirs()) {
            throw new Exception("Could not create storage directory.");
        }

        FileOutputStream outputStream = new FileOutputStream(file);
        try {
            outputStream.write(content.bytes);
        } finally {
            outputStream.close();
        }

        JSONObject meta = new JSONObject();
        meta.put("name", file.getName());
        meta.put("nome", file.getName());
        meta.put("mimeType", safeOptions.optString("mimeType", content.mimeType));
        meta.put("type", content.type);
        meta.put("tipo", content.type);
        meta.put("updatedAt", System.currentTimeMillis());
        meta.put("atualizadoEm", meta.optLong("updatedAt"));
        writeStoredFileMeta(file, meta);

        JSONObject result = storedFileResult(file, meta.optString("mimeType", content.mimeType), content.type);
        result.put("saved", true);
        result.put("salvo", true);
        result.put("created", !existed);
        result.put("criado", !existed);
        result.put("updated", existed);
        result.put("atualizado", existed);
        return result;
    }

    private JSONObject readStoredFile(JSONObject options) throws Exception {
        JSONObject safeOptions = options == null ? new JSONObject() : options;
        File file = storedFileFromOptions(safeOptions);
        if (!file.exists()) {
            JSONObject result = storedFileResult(file, safeOptions.optString("mimeType", "text/plain"), "missing");
            result.put("exists", false);
            result.put("existe", false);
            return result;
        }

        JSONObject meta = readStoredFileMeta(file);
        String type = meta.optString("type", "string");
        String mimeType = meta.optString("mimeType", safeOptions.optString("mimeType", "text/plain"));
        byte[] bytes = readFileBytes(file);
        JSONObject result = storedFileResult(file, mimeType, type);
        result.put("exists", true);
        result.put("existe", true);

        if ("base64".equals(type) || safeOptions.optBoolean("base64", false)) {
            result.put("base64", Base64.encodeToString(bytes, Base64.NO_WRAP));
            return result;
        }

        String content = new String(bytes, "UTF-8");
        result.put("content", content);
        result.put("conteudo", content);
        result.put("value", storedValueFromContent(content, type));
        result.put("valor", result.opt("value"));
        return result;
    }

    private JSONObject deleteStoredFile(JSONObject options) throws Exception {
        JSONObject safeOptions = options == null ? new JSONObject() : options;
        File file = storedFileFromOptions(safeOptions);
        boolean existed = file.exists();
        boolean deleted = !file.exists() || file.delete();
        File meta = storedFileMeta(file);
        if (meta.exists()) {
            meta.delete();
        }

        JSONObject result = new JSONObject();
        result.put("name", file.getName());
        result.put("nome", file.getName());
        result.put("existsBefore", existed);
        result.put("existiaAntes", existed);
        result.put("deleted", deleted);
        result.put("excluido", deleted);
        return result;
    }

    private JSONObject storedFileInfo(JSONObject options) throws Exception {
        JSONObject safeOptions = options == null ? new JSONObject() : options;
        File file = storedFileFromOptions(safeOptions);
        JSONObject meta = readStoredFileMeta(file);
        JSONObject result = storedFileResult(file, meta.optString("mimeType", safeOptions.optString("mimeType", guessMimeType(file.getName()))), meta.optString("type", "string"));
        result.put("exists", file.exists());
        result.put("existe", file.exists());
        return result;
    }

    private JSONArray listStoredFiles() throws Exception {
        File dir = storedFilesDir();
        JSONArray files = new JSONArray();
        File[] items = dir.listFiles();
        if (items == null) {
            return files;
        }

        for (File item : items) {
            if (!item.isFile() || item.getName().endsWith(STORED_FILE_META_SUFFIX)) {
                continue;
            }
            JSONObject meta = readStoredFileMeta(item);
            JSONObject info = storedFileResult(item, meta.optString("mimeType", guessMimeType(item.getName())), meta.optString("type", "string"));
            info.put("exists", true);
            info.put("existe", true);
            files.put(info);
        }
        return files;
    }

    private void openStoredFile(JSONObject options) throws Exception {
        JSONObject safeOptions = options == null ? new JSONObject() : options;
        File file = storedFileFromOptions(safeOptions);
        if (!file.exists()) {
            throw new Exception("Stored file does not exist.");
        }

        String mimeType = readStoredFileMeta(file).optString("mimeType", safeOptions.optString("mimeType", guessMimeType(file.getName())));
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(fileProviderUri(file), mimeType);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        cordova.getActivity().startActivity(intent);
    }

    private void shareStoredFile(JSONObject options) throws Exception {
        JSONObject safeOptions = options == null ? new JSONObject() : options;
        File file = storedFileFromOptions(safeOptions);
        if (!file.exists()) {
            throw new Exception("Stored file does not exist.");
        }

        String mimeType = readStoredFileMeta(file).optString("mimeType", safeOptions.optString("mimeType", guessMimeType(file.getName())));
        String title = safeOptions.optString("titulo", safeOptions.optString("title", "Compartilhar"));
        Intent intent = new Intent(Intent.ACTION_SEND);
        intent.setType(mimeType);
        intent.putExtra(Intent.EXTRA_STREAM, fileProviderUri(file));
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        cordova.getActivity().startActivity(Intent.createChooser(intent, title));
    }

    private void downloadFile(JSONObject options, CallbackContext callbackContext) {
        JSONObject safeOptions = options == null ? new JSONObject() : options;
        try {
            if (shouldRequestDownloadNotificationPermission(safeOptions)) {
                if (hasPendingNotificationPermissionRequest()) {
                    rejectBusyCallback(callbackContext, "POST_NOTIFICATIONS permission");
                    return;
                }
                pendingDownloadCallback = callbackContext;
                pendingDownloadOptions = safeOptions;
                rememberRuntimePermissionRequest(Manifest.permission.POST_NOTIFICATIONS);
                cordova.requestPermission(this, REQUEST_POST_NOTIFICATIONS, Manifest.permission.POST_NOTIFICATIONS);
                return;
            }
            startDownloadFile(safeOptions, callbackContext);
        } catch (Exception error) {
            callbackContext.error(error.getMessage());
        }
    }

    private boolean shouldRequestDownloadNotificationPermission(JSONObject options) {
        if (!wantsDownloadNotification(options) || hasNotificationPermission()) {
            return false;
        }
        return options.optBoolean("pedirPermissaoNotificacao",
            options.optBoolean("requestNotificationPermission",
                options.optBoolean("solicitarPermissaoNotificacao", true)));
    }

    private void startDownloadFile(final JSONObject options, final CallbackContext callbackContext) {
        final JSONObject safeOptions = options == null ? new JSONObject() : options;
        cordova.getThreadPool().execute(new Runnable() {
            @Override
            public void run() {
                DownloadSource source = null;
                InputStream inputStream = null;
                FileOutputStream outputStream = null;
                boolean notificationShown = false;
                int downloadNotificationId = downloadNotificationId(safeOptions);
                try {
                    source = openDownloadSource(safeOptions);
                    String name = downloadDestinationName(safeOptions, source);
                    File file = storedFile(name);
                    File parent = file.getParentFile();
                    if (parent != null && !parent.exists() && !parent.mkdirs()) {
                        throw new Exception("Could not create storage directory.");
                    }

                    if (source.file != null && sameFile(source.file, file)) {
                        JSONObject result = storedFileInfo(new JSONObject().put("name", file.getName()));
                        result.put("downloaded", true);
                        result.put("baixado", true);
                        result.put("sourceType", source.type);
                        result.put("tipoOrigem", source.type);
                        result.put("progressNotification", wantsDownloadNotification(safeOptions));
                        result.put("notificacaoProgresso", wantsDownloadNotification(safeOptions));
                        result.put("notificationShown", false);
                        result.put("notificacaoMostrada", false);
                        result.put("notificationPermissionGranted", hasNotificationPermission());
                        result.put("permissaoNotificacaoConcedida", hasNotificationPermission());
                        result.put("notificationPermissionRequested", safeOptions.optBoolean("notificationPermissionRequested", false));
                        result.put("permissaoNotificacaoSolicitada", safeOptions.optBoolean("permissaoNotificacaoSolicitada", false));
                        callbackContext.success(result);
                        return;
                    }

                    boolean progressNotification = wantsDownloadNotification(safeOptions);
                    boolean notificationPermissionGranted = hasNotificationPermission();
                    String notificationTitle = downloadNotificationTitle(safeOptions);
                    String progressText = downloadProgressText(safeOptions, name);
                    if (progressNotification && notificationPermissionGranted) {
                        notificationShown = notifyDownloadProgress(downloadNotificationId, notificationTitle, progressText, source.totalBytes, 0, false, null);
                    }

                    inputStream = source.inputStream;
                    outputStream = new FileOutputStream(file);
                    long size = 0;
                    int lastPercent = -1;
                    long lastNotifyAt = 0;
                    byte[] buffer = new byte[8192];
                    int read;
                    while ((read = inputStream.read(buffer)) != -1) {
                        outputStream.write(buffer, 0, read);
                        size += read;
                        if (notificationShown) {
                            int percent = source.totalBytes > 0 ? (int) Math.min(100, (size * 100) / source.totalBytes) : -1;
                            long now = System.currentTimeMillis();
                            if (percent != lastPercent && (percent < 0 || percent - lastPercent >= 2 || now - lastNotifyAt > 700)) {
                                notifyDownloadProgress(downloadNotificationId, notificationTitle, progressText, source.totalBytes, size, false, null);
                                lastPercent = percent;
                                lastNotifyAt = now;
                            }
                        }
                    }
                    outputStream.getFD().sync();

                    String mimeType = source.mimeType;
                    if (mimeType == null || mimeType.length() == 0) {
                        mimeType = guessMimeType(file.getName());
                    }
                    JSONObject meta = new JSONObject();
                    meta.put("name", file.getName());
                    meta.put("nome", file.getName());
                    meta.put("mimeType", mimeType);
                    meta.put("type", "base64");
                    meta.put("tipo", "base64");
                    meta.put("sourceType", source.type);
                    meta.put("tipoOrigem", source.type);
                    if (source.url.length() > 0) {
                        meta.put("sourceUrl", source.url);
                        meta.put("urlOrigem", source.url);
                    }
                    meta.put("updatedAt", System.currentTimeMillis());
                    writeStoredFileMeta(file, meta);

                    JSONObject result = storedFileResult(file, mimeType, "base64");
                    result.put("downloaded", true);
                    result.put("baixado", true);
                    result.put("sourceType", source.type);
                    result.put("tipoOrigem", source.type);
                    if (source.url.length() > 0) {
                        result.put("sourceUrl", source.url);
                        result.put("urlOrigem", source.url);
                    }
                    result.put("size", size);
                    result.put("tamanho", size);
                    result.put("totalBytes", source.totalBytes);
                    result.put("totalBytesOrigem", source.totalBytes);
                    result.put("progressNotification", progressNotification);
                    result.put("notificacaoProgresso", progressNotification);
                    result.put("notificationShown", notificationShown);
                    result.put("notificacaoMostrada", notificationShown);
                    result.put("notificationId", downloadNotificationId);
                    result.put("idNotificacao", downloadNotificationId);
                    result.put("notificationPermissionGranted", notificationPermissionGranted);
                    result.put("permissaoNotificacaoConcedida", notificationPermissionGranted);
                    result.put("notificationPermissionRequested", safeOptions.optBoolean("notificationPermissionRequested", false));
                    result.put("permissaoNotificacaoSolicitada", safeOptions.optBoolean("permissaoNotificacaoSolicitada", false));
                    if (notificationShown) {
                        notifyDownloadProgress(downloadNotificationId, notificationTitle, downloadCompleteText(safeOptions, name), source.totalBytes, size, true, null);
                    }
                    callbackContext.success(result);
                } catch (Exception error) {
                    if (notificationShown) {
                        notifyDownloadProgress(downloadNotificationId, downloadNotificationTitle(safeOptions), null, 0, 0, true, error);
                    }
                    callbackContext.error(error.getMessage());
                } finally {
                    closeSilently(outputStream);
                    closeSilently(inputStream);
                    if (source != null && source.inputStream != inputStream) {
                        closeSilently(source.inputStream);
                    }
                    if (source != null && source.connection != null) {
                        source.connection.disconnect();
                    }
                }
            }
        });
    }

    private DownloadSource openDownloadSource(JSONObject options) throws Exception {
        String url = options.optString("url", "");
        if (url.trim().length() > 0) {
            URL parsedUrl = new URL(url);
            HttpURLConnection connection = (HttpURLConnection) parsedUrl.openConnection();
            connection.setConnectTimeout(Math.max(1000, options.optInt("connectTimeoutMs", 15000)));
            connection.setReadTimeout(Math.max(1000, options.optInt("readTimeoutMs", 30000)));
            connection.connect();
            int status = connection.getResponseCode();
            if (status < 200 || status >= 300) {
                connection.disconnect();
                throw new Exception("Download failed with HTTP " + status + ".");
            }
            String mimeType = options.optString("mimeType", options.optString("tipoMime", connection.getContentType()));
            return new DownloadSource(connection.getInputStream(), connection, connection.getContentLengthLong(), mimeType, "url", url, downloadedFileName(parsedUrl), null);
        }

        String base64 = options.optString("base64", "");
        if (base64.length() > 0) {
            byte[] bytes = Base64.decode(stripDataUrlBase64(base64), Base64.DEFAULT);
            String mimeType = options.optString("mimeType", options.optString("tipoMime", dataUrlMimeType(base64)));
            if (mimeType.length() == 0) {
                mimeType = "application/octet-stream";
            }
            return new DownloadSource(new ByteArrayInputStream(bytes), null, bytes.length, mimeType, "base64", "", "", null);
        }

        String uriText = options.optString("contentUri", options.optString("uri", ""));
        if (uriText.length() > 0) {
            Uri uri = Uri.parse(uriText);
            InputStream inputStream = context().getContentResolver().openInputStream(uri);
            if (inputStream == null) {
                throw new Exception("Could not open file URI.");
            }
            JSONObject info = fileInfo(uri);
            long size = info.optLong("size", info.optLong("tamanho", -1));
            String mimeType = options.optString("mimeType", options.optString("tipoMime", info.optString("mimeType", context().getContentResolver().getType(uri))));
            String name = info.optString("name", info.optString("nome", ""));
            return new DownloadSource(inputStream, null, size, mimeType, "file", "", name, null);
        }

        String pathText = options.optString("caminho", options.optString("path", ""));
        if (pathText.length() > 0) {
            File sourceFile = new File(pathText);
            if (!sourceFile.exists() || !sourceFile.isFile()) {
                throw new Exception("Source file does not exist.");
            }
            String mimeType = options.optString("mimeType", options.optString("tipoMime", guessMimeType(sourceFile.getName())));
            return new DownloadSource(new FileInputStream(sourceFile), null, sourceFile.length(), mimeType, "file", "", sourceFile.getName(), sourceFile);
        }

        String sourceName = options.optString("arquivoOrigem",
            options.optString("sourceName",
                options.optString("sourceFile",
                    options.optString("nomeArquivoOrigem", ""))));
        if (sourceName.length() > 0) {
            File sourceFile = storedFile(sourceName);
            if (!sourceFile.exists() || !sourceFile.isFile()) {
                throw new Exception("Stored source file does not exist.");
            }
            String mimeType = readStoredFileMeta(sourceFile).optString("mimeType", options.optString("mimeType", guessMimeType(sourceFile.getName())));
            return new DownloadSource(new FileInputStream(sourceFile), null, sourceFile.length(), mimeType, "stored-file", "", sourceFile.getName(), sourceFile);
        }

        throw new Exception("Download source is required. Use url, base64, uri, path or sourceName.");
    }

    private String downloadDestinationName(JSONObject options, DownloadSource source) throws Exception {
        String name = options.optString("nome",
            options.optString("name",
                options.optString("fileName",
                    options.optString("nomeArquivo", ""))));
        if (name.trim().length() == 0 && source != null) {
            name = source.defaultName;
        }
        if (name == null || name.trim().length() == 0) {
            name = "download-" + System.currentTimeMillis() + ".bin";
        }
        return safeStoredFileName(name);
    }

    private boolean wantsDownloadNotification(JSONObject options) {
        return options.optBoolean("notificacao",
            options.optBoolean("notification",
                options.optBoolean("notificacaoProgresso",
                    options.optBoolean("progressNotification",
                        options.optBoolean("mostrarNotificacao", true)))));
    }

    private int downloadNotificationId(JSONObject options) {
        int id = options.optInt("notificationId", options.optInt("idNotificacao", 0));
        if (id != 0) {
            return id;
        }
        return (int) ((System.currentTimeMillis() + Math.abs(UUID.randomUUID().hashCode())) & 0x0fffffff);
    }

    private String downloadNotificationTitle(JSONObject options) {
        return options.optString("tituloNotificacao",
            options.optString("notificationTitle",
                options.optString("titulo", options.optString("title", "Baixando arquivo"))));
    }

    private String downloadProgressText(JSONObject options, String name) {
        return options.optString("textoNotificacao",
            options.optString("notificationText", "Baixando " + name));
    }

    private String downloadCompleteText(JSONObject options, String name) {
        return options.optString("textoConcluido",
            options.optString("completeText", "Download concluido: " + name));
    }

    private boolean notifyDownloadProgress(int id, String title, String text, long totalBytes, long currentBytes, boolean done, Exception error) {
        if (!hasNotificationPermission()) {
            return false;
        }

        try {
            String errorText = error == null || error.getMessage() == null || error.getMessage().length() == 0
                ? "Download falhou."
                : error.getMessage();
            String bodyText = error == null ? text : errorText;
            ensureNotificationChannel(context());
            JSONObject detail = new JSONObject();
            detail.put("type", "download");
            detail.put("tipo", "download");
            detail.put("id", id);
            detail.put("title", title);
            detail.put("titulo", title);
            detail.put("text", bodyText);
            detail.put("texto", bodyText);

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context(), CHANNEL_ID)
                .setSmallIcon(context().getApplicationInfo().icon)
                .setContentTitle(error == null ? title : "Download falhou")
                .setContentText(bodyText == null || bodyText.length() == 0 ? title : bodyText)
                .setOnlyAlertOnce(true)
                .setOngoing(!done && error == null)
                .setAutoCancel(done)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setContentIntent(createNotificationClickIntent(context(), id, detail));

            if (error != null) {
                builder.setStyle(new NotificationCompat.BigTextStyle().bigText(errorText));
                builder.setProgress(0, 0, false);
            } else if (!done && totalBytes > 0) {
                int progress = (int) Math.min(100, (currentBytes * 100) / totalBytes);
                builder.setProgress(100, progress, false);
            } else if (!done) {
                builder.setProgress(0, 0, true);
            } else {
                builder.setProgress(0, 0, false);
            }

            NotificationManagerCompat.from(context()).notify(id, builder.build());
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }

    private boolean sameFile(File first, File second) {
        try {
            return first.getCanonicalPath().equals(second.getCanonicalPath());
        } catch (Exception ignored) {
            return false;
        }
    }

    private void closeSilently(InputStream inputStream) {
        if (inputStream == null) {
            return;
        }
        try {
            inputStream.close();
        } catch (Exception ignored) {
        }
    }

    private void closeSilently(OutputStream outputStream) {
        if (outputStream == null) {
            return;
        }
        try {
            outputStream.close();
        } catch (Exception ignored) {
        }
    }

    private JSONObject setWallpaper(JSONObject options) throws Exception {
        JSONObject safeOptions = options == null ? new JSONObject() : options;
        String target = wallpaperTarget(safeOptions);
        String mimeType = wallpaperMimeType(safeOptions);

        if ("call".equals(target)) {
            return unsupportedWallpaperResult(safeOptions, target, mimeType, "Call screen backgrounds are controlled by the phone/dialer app and do not have a stable public Android API.");
        }

        if (mimeType.toLowerCase().startsWith("video/")) {
            return unsupportedWallpaperResult(safeOptions, target, mimeType, "Video wallpapers require an Android live wallpaper flow. Open the wallpaper settings and let the user choose a live wallpaper app.");
        }

        Bitmap bitmap = decodeWallpaperBitmap(safeOptions);
        if (bitmap == null) {
            throw new Exception("Could not decode wallpaper image.");
        }

        WallpaperManager manager = WallpaperManager.getInstance(context());
        boolean wantsSystem = "system".equals(target) || "both".equals(target);
        boolean wantsLock = "lock".equals(target) || "both".equals(target);
        boolean systemApplied = false;
        boolean lockApplied = false;
        String systemError = "";
        String lockError = "";

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                if (wantsSystem) {
                    try {
                        manager.setBitmap(bitmap, null, true, WallpaperManager.FLAG_SYSTEM);
                        systemApplied = true;
                    } catch (Exception error) {
                        systemError = error.getMessage() == null ? error.getClass().getSimpleName() : error.getMessage();
                    }
                }
                if (wantsLock) {
                    try {
                        manager.setBitmap(bitmap, null, true, WallpaperManager.FLAG_LOCK);
                        lockApplied = true;
                    } catch (Exception error) {
                        lockError = error.getMessage() == null ? error.getClass().getSimpleName() : error.getMessage();
                    }
                }
            } else if (wantsLock && !wantsSystem) {
                lockError = "Lock screen wallpaper is supported only on Android 7.0+.";
            } else {
                try {
                    manager.setBitmap(bitmap);
                    systemApplied = true;
                    if (wantsLock) {
                        lockError = "Lock screen wallpaper is supported only on Android 7.0+.";
                    }
                } catch (Exception error) {
                    systemError = error.getMessage() == null ? error.getClass().getSimpleName() : error.getMessage();
                }
            }
        } finally {
            bitmap.recycle();
        }

        JSONObject result = wallpaperInfo();
        boolean applied = systemApplied || lockApplied;
        result.put("target", target);
        result.put("alvo", target);
        result.put("mimeType", mimeType);
        result.put("applied", applied);
        result.put("aplicado", applied);
        result.put("requiresUserAction", !applied);
        result.put("precisaAcaoUsuario", !applied);
        result.put("systemApplied", systemApplied);
        result.put("inicioAplicado", systemApplied);
        result.put("homeApplied", systemApplied);
        result.put("lockApplied", lockApplied);
        result.put("bloqueioAplicado", lockApplied);
        result.put("settingsOpened", false);
        result.put("configuracaoAberta", false);
        if (systemError.length() > 0) {
            result.put("systemError", systemError);
            result.put("erroInicio", systemError);
        }
        if (lockError.length() > 0) {
            result.put("lockError", lockError);
            result.put("erroBloqueio", lockError);
        }
        return result;
    }

    private JSONObject wallpaperInfo() throws Exception {
        boolean lockSupported = Build.VERSION.SDK_INT >= Build.VERSION_CODES.N;
        JSONObject result = new JSONObject();
        result.put("permission", "android.permission.SET_WALLPAPER");
        result.put("supported", true);
        result.put("suportado", true);
        result.put("imageSupported", true);
        result.put("imagemSuportada", true);
        result.put("lockSupported", lockSupported);
        result.put("bloqueioSuportado", lockSupported);
        result.put("videoSupported", false);
        result.put("videoSuportado", false);
        result.put("callBackgroundSupported", false);
        result.put("fundoChamadasSuportado", false);
        result.put("requiresUserAction", false);
        result.put("precisaAcaoUsuario", false);
        result.put("requiresUserActionForVideo", true);
        result.put("videoPrecisaAcaoUsuario", true);
        result.put("settingsOpened", false);
        result.put("configuracaoAberta", false);
        return result;
    }

    private JSONObject openWallpaperSettings() throws Exception {
        JSONObject result = wallpaperInfo();
        Intent settingsIntent = new Intent("android.settings.WALLPAPER_SETTINGS");
        boolean opened = tryOpenWallpaperIntent(settingsIntent);
        String screen = opened ? "wallpaper-settings" : "";

        if (!opened) {
            Intent chooserIntent = new Intent(Intent.ACTION_SET_WALLPAPER);
            opened = tryOpenWallpaperIntent(chooserIntent);
            screen = opened ? "set-wallpaper" : "";
        }

        result.put("settingsOpened", opened);
        result.put("configuracaoAberta", opened);
        result.put("settingsScreen", screen);
        result.put("telaConfiguracao", screen);
        return result;
    }

    private boolean tryOpenWallpaperIntent(Intent intent) {
        if (intent.resolveActivity(context().getPackageManager()) == null) {
            return false;
        }
        try {
            cordova.getActivity().startActivity(intent);
            return true;
        } catch (ActivityNotFoundException error) {
            return false;
        }
    }

    private JSONObject unsupportedWallpaperResult(JSONObject options, String target, String mimeType, String message) throws Exception {
        JSONObject result = wallpaperInfo();
        result.put("target", target);
        result.put("alvo", target);
        result.put("mimeType", mimeType);
        result.put("applied", false);
        result.put("aplicado", false);
        result.put("supported", false);
        result.put("suportado", false);
        result.put("requiresUserAction", true);
        result.put("precisaAcaoUsuario", true);
        result.put("message", message);
        result.put("mensagem", message);
        if (wallpaperShouldOpenSettings(options)) {
            JSONObject settings = openWallpaperSettings();
            result.put("settingsOpened", settings.optBoolean("settingsOpened", false));
            result.put("configuracaoAberta", settings.optBoolean("configuracaoAberta", false));
            result.put("settingsScreen", settings.optString("settingsScreen", ""));
            result.put("telaConfiguracao", settings.optString("telaConfiguracao", ""));
        }
        return result;
    }

    private boolean wallpaperShouldOpenSettings(JSONObject options) {
        return options.optBoolean("abrirConfiguracao",
            options.optBoolean("openSettings",
                options.optBoolean("abrirAjustes", false)));
    }

    private String wallpaperTarget(JSONObject options) {
        String target = options.optString("alvo",
            options.optString("target",
                options.optString("tela",
                    options.optString("screen", "inicio"))));
        String lower = target == null ? "" : target.toLowerCase();
        if (lower.indexOf("call") >= 0 || lower.indexOf("chamada") >= 0) {
            return "call";
        }
        if (lower.indexOf("lock") >= 0 || lower.indexOf("bloque") >= 0) {
            return "lock";
        }
        if (lower.indexOf("both") >= 0 || lower.indexOf("amb") >= 0 || lower.indexOf("all") >= 0 || lower.indexOf("tudo") >= 0) {
            return "both";
        }
        return "system";
    }

    private String wallpaperMimeType(JSONObject options) {
        String mimeType = options.optString("mimeType", options.optString("tipoMime", ""));
        if (mimeType.indexOf('/') > 0) {
            return mimeType;
        }

        String base64 = options.optString("base64", "");
        if (base64.startsWith("data:")) {
            int end = base64.indexOf(';');
            int comma = base64.indexOf(',');
            if (end < 0 || (comma >= 0 && comma < end)) {
                end = comma;
            }
            if (end > 5) {
                return base64.substring(5, end);
            }
        }

        String uriText = options.optString("contentUri", options.optString("uri", ""));
        if (uriText.length() > 0) {
            try {
                String uriType = context().getContentResolver().getType(Uri.parse(uriText));
                if (uriType != null && uriType.length() > 0) {
                    return uriType;
                }
            } catch (Exception ignored) {
            }
        }

        String name = options.optString("nomeArquivo", options.optString("fileName", options.optString("nome", options.optString("name", ""))));
        if (name.length() > 0) {
            return guessMimeType(name);
        }
        String path = options.optString("caminho", options.optString("path", ""));
        if (path.length() > 0) {
            return guessMimeType(path);
        }
        return "application/octet-stream";
    }

    private Bitmap decodeWallpaperBitmap(JSONObject options) throws Exception {
        InputStream inputStream = wallpaperInputStream(options);
        try {
            return BitmapFactory.decodeStream(inputStream);
        } finally {
            inputStream.close();
        }
    }

    private InputStream wallpaperInputStream(JSONObject options) throws Exception {
        String base64 = options.optString("base64", "");
        if (base64.length() > 0) {
            return new ByteArrayInputStream(Base64.decode(stripDataUrlBase64(base64), Base64.DEFAULT));
        }

        String uriText = options.optString("contentUri", options.optString("uri", ""));
        if (uriText.length() > 0) {
            Uri uri = Uri.parse(uriText);
            InputStream inputStream = context().getContentResolver().openInputStream(uri);
            if (inputStream == null) {
                throw new Exception("Could not open wallpaper URI.");
            }
            return inputStream;
        }

        String path = options.optString("caminho", options.optString("path", ""));
        if (path.length() > 0) {
            return new FileInputStream(new File(path));
        }

        String name = options.optString("nomeArquivo", options.optString("fileName", options.optString("nome", options.optString("name", ""))));
        if (name.length() > 0) {
            File file = storedFile(name);
            if (!file.exists()) {
                throw new Exception("Stored wallpaper file does not exist.");
            }
            return new FileInputStream(file);
        }

        throw new Exception("Wallpaper image source is required.");
    }

    private String stripDataUrlBase64(String value) {
        int comma = value.indexOf(',');
        if (value.startsWith("data:") && comma >= 0) {
            return value.substring(comma + 1);
        }
        return value;
    }

    private String dataUrlMimeType(String value) {
        if (value == null || !value.startsWith("data:")) {
            return "";
        }
        int comma = value.indexOf(',');
        int semicolon = value.indexOf(';');
        int end = semicolon >= 0 ? semicolon : comma;
        if (end > 5) {
            return value.substring(5, end);
        }
        return "";
    }

    private File storedFilesDir() throws Exception {
        File dir = context().getExternalFilesDir(STORED_FILES_DIR);
        if (dir == null) {
            dir = new File(context().getFilesDir(), STORED_FILES_DIR);
        }
        if (!dir.exists() && !dir.mkdirs()) {
            throw new Exception("Could not create stored files directory.");
        }
        return dir;
    }

    private File storedFileFromOptions(JSONObject options) throws Exception {
        String name = options.optString("nome", options.optString("name", options.optString("fileName", options.optString("nomeArquivo", ""))));
        return storedFile(name);
    }

    private File storedFile(String name) throws Exception {
        String safeName = safeStoredFileName(name);
        File dir = storedFilesDir();
        File file = new File(dir, safeName);
        String dirPath = dir.getCanonicalPath();
        String filePath = file.getCanonicalPath();
        if (!filePath.equals(dirPath) && !filePath.startsWith(dirPath + File.separator)) {
            throw new Exception("Invalid stored file name.");
        }
        return file;
    }

    private String safeStoredFileName(String name) throws Exception {
        String value = name == null ? "" : name.trim();
        if (value.length() == 0) {
            throw new Exception("File name is required.");
        }
        if (value.indexOf('/') >= 0 || value.indexOf('\\') >= 0 || value.indexOf(':') >= 0 || value.contains("..")) {
            throw new Exception("File name must not contain path separators.");
        }
        return value;
    }

    private StoredContent storedContentFromOptions(JSONObject options) throws Exception {
        if (options.has("base64")) {
            return new StoredContent(Base64.decode(options.optString("base64", ""), Base64.DEFAULT), "base64", options.optString("mimeType", "application/octet-stream"));
        }

        Object value = options.has("value") ? options.opt("value") : options.opt("valor");
        if (value == null || value == JSONObject.NULL) {
            value = options.optString("conteudo", options.optString("content", ""));
        }

        if (value instanceof JSONObject || value instanceof JSONArray) {
            return new StoredContent(String.valueOf(value).getBytes("UTF-8"), "json", options.optString("mimeType", "application/json"));
        }
        if (value instanceof Number) {
            return new StoredContent(String.valueOf(value).getBytes("UTF-8"), "number", options.optString("mimeType", "text/plain"));
        }
        if (value instanceof Boolean) {
            return new StoredContent(String.valueOf(value).getBytes("UTF-8"), "boolean", options.optString("mimeType", "text/plain"));
        }
        if (options.optBoolean("json", false)) {
            return new StoredContent(String.valueOf(value).getBytes("UTF-8"), "json", options.optString("mimeType", "application/json"));
        }
        return new StoredContent(String.valueOf(value).getBytes("UTF-8"), "string", options.optString("mimeType", "text/plain"));
    }

    private Object storedValueFromContent(String content, String type) {
        try {
            if ("json".equals(type)) {
                String text = content.trim();
                if (text.startsWith("[")) {
                    return new JSONArray(text);
                }
                if (text.startsWith("{")) {
                    return new JSONObject(text);
                }
                return text;
            }
            if ("number".equals(type)) {
                return Double.valueOf(content);
            }
            if ("boolean".equals(type)) {
                return Boolean.valueOf(content);
            }
        } catch (Exception ignored) {
        }
        return content;
    }

    private JSONObject storedFileResult(File file, String mimeType, String type) throws Exception {
        JSONObject result = new JSONObject();
        result.put("name", file.getName());
        result.put("nome", file.getName());
        result.put("uri", fileProviderUri(file).toString());
        result.put("contentUri", result.optString("uri"));
        result.put("path", file.getAbsolutePath());
        result.put("caminho", file.getAbsolutePath());
        result.put("mimeType", mimeType == null || mimeType.length() == 0 ? guessMimeType(file.getName()) : mimeType);
        result.put("type", type);
        result.put("tipo", type);
        result.put("size", file.exists() ? file.length() : 0);
        result.put("tamanho", file.exists() ? file.length() : 0);
        result.put("lastModified", file.exists() ? file.lastModified() : 0);
        result.put("modificadoEm", file.exists() ? file.lastModified() : 0);
        return result;
    }

    private File storedFileMeta(File file) {
        return new File(file.getParentFile(), file.getName() + STORED_FILE_META_SUFFIX);
    }

    private void writeStoredFileMeta(File file, JSONObject meta) throws Exception {
        File metaFile = storedFileMeta(file);
        FileOutputStream outputStream = new FileOutputStream(metaFile);
        try {
            outputStream.write(meta.toString().getBytes("UTF-8"));
        } finally {
            outputStream.close();
        }
    }

    private JSONObject readStoredFileMeta(File file) {
        File metaFile = storedFileMeta(file);
        if (!metaFile.exists()) {
            return new JSONObject();
        }
        try {
            return new JSONObject(new String(readFileBytes(metaFile), "UTF-8"));
        } catch (Exception ignored) {
            return new JSONObject();
        }
    }

    private byte[] readUriBytes(Uri uri) throws Exception {
        InputStream inputStream = context().getContentResolver().openInputStream(uri);
        if (inputStream == null) {
            throw new Exception("Could not open input stream.");
        }
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        try {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = inputStream.read(buffer)) != -1) {
                outputStream.write(buffer, 0, read);
            }
            return outputStream.toByteArray();
        } finally {
            inputStream.close();
            outputStream.close();
        }
    }

    private String downloadedFileName(URL url) {
        String path = url.getPath();
        int slash = path == null ? -1 : path.lastIndexOf('/');
        String name = slash >= 0 ? path.substring(slash + 1) : path;
        if (name == null || name.trim().length() == 0) {
            return "download-" + System.currentTimeMillis();
        }
        return name;
    }

    private String guessMimeType(String name) {
        String lower = name == null ? "" : name.toLowerCase();
        if (lower.endsWith(".html") || lower.endsWith(".htm")) {
            return "text/html";
        }
        if (lower.endsWith(".json")) {
            return "application/json";
        }
        if (lower.endsWith(".pdf")) {
            return "application/pdf";
        }
        if (lower.endsWith(".png")) {
            return "image/png";
        }
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
            return "image/jpeg";
        }
        if (lower.endsWith(".mp4")) {
            return "video/mp4";
        }
        if (lower.endsWith(".mp3")) {
            return "audio/mpeg";
        }
        if (lower.endsWith(".txt") || lower.endsWith(".log")) {
            return "text/plain";
        }
        return "application/octet-stream";
    }

    private static class StoredContent {
        final byte[] bytes;
        final String type;
        final String mimeType;

        StoredContent(byte[] bytes, String type, String mimeType) {
            this.bytes = bytes;
            this.type = type;
            this.mimeType = mimeType;
        }
    }

    private static class DownloadSource {
        final InputStream inputStream;
        final HttpURLConnection connection;
        final long totalBytes;
        final String mimeType;
        final String type;
        final String url;
        final String defaultName;
        final File file;

        DownloadSource(InputStream inputStream, HttpURLConnection connection, long totalBytes, String mimeType, String type, String url, String defaultName, File file) {
            this.inputStream = inputStream;
            this.connection = connection;
            this.totalBytes = totalBytes;
            this.mimeType = mimeType == null ? "" : mimeType;
            this.type = type == null ? "file" : type;
            this.url = url == null ? "" : url;
            this.defaultName = defaultName == null ? "" : defaultName;
            this.file = file;
        }
    }

    private JSONObject saveSecureItem(JSONObject options) throws Exception {
        JSONObject safeOptions = options == null ? new JSONObject() : options;
        String key = secureKeyFromOptions(safeOptions);
        StoredContent content = storedContentFromOptions(safeOptions);
        EncryptedValue encrypted = encryptSecureText(new String(content.bytes, "UTF-8"));
        SharedPreferences.Editor editor = secureStore().edit();
        editor.putString(SECURE_VALUE_PREFIX + key, encrypted.cipherText);
        editor.putString(SECURE_IV_PREFIX + key, encrypted.iv);
        editor.putString(SECURE_TYPE_PREFIX + key, content.type);
        editor.apply();

        JSONObject result = new JSONObject();
        result.put("key", key);
        result.put("chave", key);
        result.put("saved", true);
        result.put("salvo", true);
        result.put("type", content.type);
        result.put("tipo", content.type);
        return result;
    }

    private JSONObject readSecureItem(JSONObject options) throws Exception {
        JSONObject safeOptions = options == null ? new JSONObject() : options;
        String key = secureKeyFromOptions(safeOptions);
        SharedPreferences store = secureStore();
        JSONObject result = new JSONObject();
        result.put("key", key);
        result.put("chave", key);
        if (!store.contains(SECURE_VALUE_PREFIX + key)) {
            result.put("exists", false);
            result.put("existe", false);
            return result;
        }

        String content = decryptSecureText(store.getString(SECURE_VALUE_PREFIX + key, ""), store.getString(SECURE_IV_PREFIX + key, ""));
        String type = store.getString(SECURE_TYPE_PREFIX + key, "string");
        result.put("exists", true);
        result.put("existe", true);
        result.put("type", type);
        result.put("tipo", type);
        result.put("value", storedValueFromContent(content, type));
        result.put("valor", result.opt("value"));
        return result;
    }

    private JSONObject deleteSecureItem(JSONObject options) throws Exception {
        JSONObject safeOptions = options == null ? new JSONObject() : options;
        String key = secureKeyFromOptions(safeOptions);
        SharedPreferences store = secureStore();
        boolean existed = store.contains(SECURE_VALUE_PREFIX + key);
        store.edit()
            .remove(SECURE_VALUE_PREFIX + key)
            .remove(SECURE_IV_PREFIX + key)
            .remove(SECURE_TYPE_PREFIX + key)
            .apply();

        JSONObject result = new JSONObject();
        result.put("key", key);
        result.put("chave", key);
        result.put("existsBefore", existed);
        result.put("existiaAntes", existed);
        result.put("deleted", true);
        result.put("excluido", true);
        return result;
    }

    private JSONArray listSecureKeys() {
        JSONArray result = new JSONArray();
        Map<String, ?> values = secureStore().getAll();
        for (String key : values.keySet()) {
            if (key.startsWith(SECURE_VALUE_PREFIX)) {
                result.put(key.substring(SECURE_VALUE_PREFIX.length()));
            }
        }
        return result;
    }

    private JSONObject clearSecureStorage() {
        SharedPreferences store = secureStore();
        Map<String, ?> values = store.getAll();
        SharedPreferences.Editor editor = store.edit();
        int count = 0;
        for (String key : values.keySet()) {
            if (key.startsWith(SECURE_VALUE_PREFIX) || key.startsWith(SECURE_IV_PREFIX) || key.startsWith(SECURE_TYPE_PREFIX)) {
                editor.remove(key);
                count += key.startsWith(SECURE_VALUE_PREFIX) ? 1 : 0;
            }
        }
        editor.apply();

        JSONObject result = new JSONObject();
        try {
            result.put("cleared", true);
            result.put("limpo", true);
            result.put("count", count);
            result.put("total", count);
        } catch (Exception ignored) {
        }
        return result;
    }

    private SharedPreferences secureStore() {
        return context().getSharedPreferences(SECURE_PREFS_NAME, Context.MODE_PRIVATE);
    }

    private String secureKeyFromOptions(JSONObject options) throws Exception {
        String key = options.optString("chave", options.optString("key", options.optString("name", options.optString("nome", ""))));
        if (key.trim().length() == 0 || key.indexOf('/') >= 0 || key.indexOf('\\') >= 0 || key.contains("..")) {
            throw new Exception("Secure storage key is invalid.");
        }
        return key.trim();
    }

    private EncryptedValue encryptSecureText(String value) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, secureStorageSecretKey());
        byte[] encrypted = cipher.doFinal(value.getBytes("UTF-8"));
        return new EncryptedValue(
            Base64.encodeToString(encrypted, Base64.NO_WRAP),
            Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP)
        );
    }

    private String decryptSecureText(String cipherText, String iv) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        GCMParameterSpec spec = new GCMParameterSpec(128, Base64.decode(iv, Base64.DEFAULT));
        cipher.init(Cipher.DECRYPT_MODE, secureStorageSecretKey(), spec);
        byte[] plain = cipher.doFinal(Base64.decode(cipherText, Base64.DEFAULT));
        return new String(plain, "UTF-8");
    }

    private SecretKey secureStorageSecretKey() throws Exception {
        KeyStore keyStore = KeyStore.getInstance("AndroidKeyStore");
        keyStore.load(null);
        if (!keyStore.containsAlias(SECURE_KEY_ALIAS)) {
            KeyGenerator keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
            keyGenerator.init(new KeyGenParameterSpec.Builder(
                SECURE_KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true)
                .build());
            return keyGenerator.generateKey();
        }

        KeyStore.SecretKeyEntry entry = (KeyStore.SecretKeyEntry) keyStore.getEntry(SECURE_KEY_ALIAS, null);
        return entry.getSecretKey();
    }

    private static class EncryptedValue {
        final String cipherText;
        final String iv;

        EncryptedValue(String cipherText, String iv) {
            this.cipherText = cipherText;
            this.iv = iv;
        }
    }

    private JSONObject deviceInfo() throws Exception {
        JSONObject result = new JSONObject();
        result.put("manufacturer", Build.MANUFACTURER);
        result.put("fabricante", Build.MANUFACTURER);
        result.put("model", Build.MODEL);
        result.put("modelo", Build.MODEL);
        result.put("brand", Build.BRAND);
        result.put("androidVersion", Build.VERSION.RELEASE);
        result.put("sdkInt", Build.VERSION.SDK_INT);
        result.put("packageName", context().getPackageName());
        return result;
    }

    private JSONObject networkInfo() throws Exception {
        JSONObject result = new JSONObject();
        ConnectivityManager manager = (ConnectivityManager) context().getSystemService(Context.CONNECTIVITY_SERVICE);
        boolean connected = false;
        String type = "unknown";

        if (manager != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Network network = manager.getActiveNetwork();
                NetworkCapabilities capabilities = network == null ? null : manager.getNetworkCapabilities(network);
                connected = capabilities != null && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
                if (capabilities != null && capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) {
                    type = "wifi";
                } else if (capabilities != null && capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)) {
                    type = "cellular";
                } else if (capabilities != null && capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)) {
                    type = "ethernet";
                }
            } else if (manager.getActiveNetworkInfo() != null) {
                connected = manager.getActiveNetworkInfo().isConnected();
                type = manager.getActiveNetworkInfo().getTypeName().toLowerCase();
            }
        }

        result.put("online", connected);
        result.put("connected", connected);
        result.put("tipo", type);
        result.put("type", type);
        return result;
    }

    private JSONObject batteryInfo() throws Exception {
        Intent intent = context().registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
        JSONObject result = new JSONObject();
        if (intent == null) {
            result.put("level", -1);
            result.put("nivel", -1);
            result.put("charging", false);
            return result;
        }

        int level = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
        int scale = intent.getIntExtra(BatteryManager.EXTRA_SCALE, 100);
        int status = intent.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
        boolean charging = status == BatteryManager.BATTERY_STATUS_CHARGING
            || status == BatteryManager.BATTERY_STATUS_FULL;
        double percent = scale <= 0 ? -1 : (level * 100.0 / scale);

        result.put("level", percent);
        result.put("nivel", percent);
        result.put("charging", charging);
        result.put("carregando", charging);
        return result;
    }

    private JSONObject memoryInfo() throws Exception {
        ActivityManager manager = (ActivityManager) context().getSystemService(Context.ACTIVITY_SERVICE);
        ActivityManager.MemoryInfo info = new ActivityManager.MemoryInfo();
        if (manager != null) {
            manager.getMemoryInfo(info);
        }

        Runtime runtime = Runtime.getRuntime();
        JSONObject result = new JSONObject();
        result.put("availableBytes", info.availMem);
        result.put("totalBytes", Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN ? info.totalMem : -1);
        result.put("lowMemory", info.lowMemory);
        result.put("thresholdBytes", info.threshold);
        result.put("appUsedBytes", runtime.totalMemory() - runtime.freeMemory());
        result.put("appMaxBytes", runtime.maxMemory());
        return result;
    }

    private JSONObject storageInfo() throws Exception {
        JSONObject result = new JSONObject();
        result.put("internal", statFsInfo(Environment.getDataDirectory()));
        result.put("cache", statFsInfo(context().getCacheDir()));
        if (context().getExternalFilesDir(null) != null) {
            result.put("appExternal", statFsInfo(context().getExternalFilesDir(null)));
        }
        return result;
    }

    private JSONObject statFsInfo(java.io.File file) throws Exception {
        StatFs statFs = new StatFs(file.getAbsolutePath());
        long blockSize = statFs.getBlockSizeLong();
        long total = statFs.getBlockCountLong() * blockSize;
        long available = statFs.getAvailableBlocksLong() * blockSize;
        JSONObject result = new JSONObject();
        result.put("path", file.getAbsolutePath());
        result.put("totalBytes", total);
        result.put("availableBytes", available);
        result.put("usedBytes", total - available);
        return result;
    }

    private JSONObject performanceInfo() throws Exception {
        JSONObject result = new JSONObject();
        result.put("timestamp", System.currentTimeMillis());
        result.put("memory", memoryInfo());
        result.put("storage", storageInfo());
        result.put("battery", batteryInfo());
        result.put("network", networkInfo());
        return result;
    }

    private JSONObject openAppsMemoryInfo() throws Exception {
        ActivityManager manager = (ActivityManager) context().getSystemService(Context.ACTIVITY_SERVICE);
        JSONArray apps = new JSONArray();
        JSONObject byName = new JSONObject();
        JSONObject result = new JSONObject();

        result.put("timestamp", System.currentTimeMillis());
        result.put("limited", true);
        result.put("observacao", "Android moderno limita a lista de apps de terceiros por privacidade; o retorno mostra apenas processos visiveis para este app.");
        result.put("note", "Modern Android limits third-party app process visibility for privacy; this returns only processes visible to this app.");

        if (manager == null) {
            result.put("apps", apps);
            result.put("porNome", byName);
            result.put("byName", byName);
            return result;
        }

        List<ActivityManager.RunningAppProcessInfo> processes = manager.getRunningAppProcesses();
        if (processes == null) {
            result.put("apps", apps);
            result.put("porNome", byName);
            result.put("byName", byName);
            return result;
        }

        for (ActivityManager.RunningAppProcessInfo process : processes) {
            Debug.MemoryInfo[] memoryInfos = manager.getProcessMemoryInfo(new int[] { process.pid });
            Debug.MemoryInfo memory = memoryInfos != null && memoryInfos.length > 0 ? memoryInfos[0] : null;
            long pssKb = memory == null ? 0 : memory.getTotalPss();
            long ramBytes = pssKb * 1024L;
            String packageName = process.pkgList != null && process.pkgList.length > 0 ? process.pkgList[0] : process.processName;
            String name = appLabel(packageName, process.processName);

            JSONObject item = new JSONObject();
            item.put("name", name);
            item.put("nome", name);
            item.put("packageName", packageName);
            item.put("pacote", packageName);
            item.put("processName", process.processName);
            item.put("pid", process.pid);
            item.put("importance", process.importance);
            item.put("importanceName", importanceName(process.importance));
            item.put("ramBytes", ramBytes);
            item.put("ramMb", Math.round((ramBytes / 1024.0 / 1024.0) * 100.0) / 100.0);
            item.put("pssKb", pssKb);
            if (memory != null) {
                item.put("privateDirtyKb", memory.getTotalPrivateDirty());
                item.put("sharedDirtyKb", memory.getTotalSharedDirty());
            }

            JSONArray packages = new JSONArray();
            if (process.pkgList != null) {
                for (String packageItem : process.pkgList) {
                    packages.put(packageItem);
                }
            }
            item.put("packages", packages);
            item.put("pacotes", packages);
            apps.put(item);

            JSONObject summary = new JSONObject();
            summary.put("ramBytes", ramBytes);
            summary.put("ramMb", Math.round((ramBytes / 1024.0 / 1024.0) * 100.0) / 100.0);
            summary.put("packageName", packageName);
            summary.put("processName", process.processName);
            byName.put(name, summary);
        }

        result.put("apps", apps);
        result.put("porNome", byName);
        result.put("byName", byName);
        return result;
    }

    private String appLabel(String packageName, String fallback) {
        try {
            PackageManager packageManager = context().getPackageManager();
            ApplicationInfo info = packageManager.getApplicationInfo(packageName, 0);
            CharSequence label = packageManager.getApplicationLabel(info);
            return label == null ? fallback : label.toString();
        } catch (Exception ignored) {
            return fallback == null ? packageName : fallback;
        }
    }

    private String importanceName(int importance) {
        if (importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND) {
            return "foreground";
        }
        if (importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_VISIBLE) {
            return "visible";
        }
        if (importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_SERVICE) {
            return "service";
        }
        if (importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_CACHED) {
            return "cached";
        }
        return "other";
    }

    private boolean hasLocationPermission() {
        return ContextCompat.checkSelfPermission(context(), Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
            || ContextCompat.checkSelfPermission(context(), Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private String locationPermissionName(JSONObject options) {
        boolean highAccuracy = options != null && options.optBoolean("altaPrecisao", options.optBoolean("highAccuracy", false));
        return highAccuracy ? Manifest.permission.ACCESS_FINE_LOCATION : Manifest.permission.ACCESS_COARSE_LOCATION;
    }

    private void getLocation(JSONObject options, CallbackContext callbackContext) throws Exception {
        JSONObject safeOptions = options == null ? new JSONObject() : options;
        if (!hasLocationPermission()) {
            requestLocationPermission(safeOptions, false, callbackContext);
            return;
        }
        resolveCurrentLocation(safeOptions, callbackContext);
    }

    private void watchLocation(JSONObject options, CallbackContext callbackContext) throws Exception {
        JSONObject safeOptions = options == null ? new JSONObject() : options;
        if (!hasLocationPermission()) {
            requestLocationPermission(safeOptions, true, callbackContext);
            return;
        }
        startLocationWatch(safeOptions, callbackContext);
    }

    private void requestLocationPermission(JSONObject options, boolean watch, CallbackContext callbackContext) throws Exception {
        if (pendingLocationCallback != null) {
            rejectBusyCallback(callbackContext, "Location permission");
            return;
        }

        pendingLocationCallback = callbackContext;
        pendingLocationOptions = options;
        pendingLocationWatch = watch;
        rememberRuntimePermissionRequest(Manifest.permission.ACCESS_FINE_LOCATION);
        rememberRuntimePermissionRequest(Manifest.permission.ACCESS_COARSE_LOCATION);
        cordova.requestPermissions(this, REQUEST_LOCATION, new String[] {
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        });
    }

    private void resolveCurrentLocation(final JSONObject options, final CallbackContext callbackContext) throws Exception {
        final LocationManager manager = locationManager();
        Location lastKnown = bestLastKnownLocation(manager, options);
        if (lastKnown != null) {
            callbackContext.success(locationResult(lastKnown, "lastKnown"));
            return;
        }

        final String provider = bestLocationProvider(manager, options);
        if (provider.length() == 0) {
            callbackContext.success(locationUnavailableResult("No location provider is enabled."));
            return;
        }

        final boolean[] finished = new boolean[] { false };
        final LocationListener listener = new LocationListener() {
            @Override
            public void onLocationChanged(Location location) {
                if (finished[0]) {
                    return;
                }
                finished[0] = true;
                try {
                    manager.removeUpdates(this);
                } catch (Exception ignored) {
                }
                try {
                    callbackContext.success(locationResult(location, "singleUpdate"));
                } catch (Exception error) {
                    callbackContext.error(error.getMessage());
                }
            }

            @Override
            public void onStatusChanged(String provider, int status, Bundle extras) {
            }

            @Override
            public void onProviderEnabled(String provider) {
            }

            @Override
            public void onProviderDisabled(String provider) {
            }
        };

        manager.requestSingleUpdate(provider, listener, Looper.getMainLooper());
        new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
            @Override
            public void run() {
                if (finished[0]) {
                    return;
                }
                finished[0] = true;
                try {
                    manager.removeUpdates(listener);
                } catch (Exception ignored) {
                }
                try {
                    callbackContext.success(locationUnavailableResult("Location timeout."));
                } catch (Exception error) {
                    callbackContext.error(error.getMessage());
                }
            }
        }, Math.max(1000, options.optLong("timeoutMs", options.optLong("tempoLimiteMs", 10000))));
    }

    private void startLocationWatch(final JSONObject options, CallbackContext callbackContext) throws Exception {
        final LocationManager manager = locationManager();
        final String provider = bestLocationProvider(manager, options);
        if (provider.length() == 0) {
            callbackContext.success(locationUnavailableResult("No location provider is enabled."));
            return;
        }

        final String id = "loc-" + System.currentTimeMillis() + "-" + (++locationWatchCounter);
        final LocationListener listener = new LocationListener() {
            @Override
            public void onLocationChanged(Location location) {
                try {
                    JSONObject detail = locationResult(location, "watch");
                    detail.put("watchId", id);
                    detail.put("idObservador", id);
                    dispatchEvent("localizacao:mudou", detail);
                } catch (Exception ignored) {
                }
            }

            @Override
            public void onStatusChanged(String provider, int status, Bundle extras) {
            }

            @Override
            public void onProviderEnabled(String provider) {
            }

            @Override
            public void onProviderDisabled(String provider) {
                try {
                    JSONObject detail = locationUnavailableResult("Location provider disabled.");
                    detail.put("watchId", id);
                    detail.put("idObservador", id);
                    dispatchEvent("localizacao:mudou", detail);
                } catch (Exception ignored) {
                }
            }
        };

        long minTime = Math.max(1000, options.optLong("intervaloMs", options.optLong("intervalMs", 5000)));
        float minDistance = (float) Math.max(0, options.optDouble("distanciaMetros", options.optDouble("distanceMeters", 0)));
        manager.requestLocationUpdates(provider, minTime, minDistance, listener, Looper.getMainLooper());
        locationListeners.put(id, listener);

        Location lastKnown = bestLastKnownLocation(manager, options);
        if (lastKnown != null) {
            JSONObject detail = locationResult(lastKnown, "lastKnown");
            detail.put("watchId", id);
            detail.put("idObservador", id);
            dispatchEvent("localizacao:mudou", detail);
        }

        JSONObject result = new JSONObject();
        result.put("id", id);
        result.put("watchId", id);
        result.put("idObservador", id);
        result.put("watching", true);
        result.put("observando", true);
        result.put("provider", provider);
        result.put("provedor", provider);
        callbackContext.success(result);
    }

    private JSONObject stopLocationWatch(String id) throws Exception {
        JSONObject result = new JSONObject();
        if (id == null || id.trim().length() == 0) {
            int count = stopAllLocationWatches();
            result.put("stopped", count);
            result.put("parados", count);
            return result;
        }

        LocationListener listener = locationListeners.remove(id);
        boolean stopped = false;
        if (listener != null) {
            locationManager().removeUpdates(listener);
            stopped = true;
        }
        result.put("id", id);
        result.put("watchId", id);
        result.put("stopped", stopped);
        result.put("parado", stopped);
        return result;
    }

    private int stopAllLocationWatches() {
        int count = 0;
        try {
            LocationManager manager = locationManager();
            for (LocationListener listener : locationListeners.values()) {
                try {
                    manager.removeUpdates(listener);
                    count += 1;
                } catch (Exception ignored) {
                }
            }
        } catch (Exception ignored) {
        }
        locationListeners.clear();
        return count;
    }

    private LocationManager locationManager() throws Exception {
        LocationManager manager = (LocationManager) context().getSystemService(Context.LOCATION_SERVICE);
        if (manager == null) {
            throw new Exception("Location service is not available.");
        }
        return manager;
    }

    private String bestLocationProvider(LocationManager manager, JSONObject options) {
        boolean highAccuracy = options != null && options.optBoolean("altaPrecisao", options.optBoolean("highAccuracy", false));
        if (highAccuracy && manager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
            return LocationManager.GPS_PROVIDER;
        }
        if (manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
            return LocationManager.NETWORK_PROVIDER;
        }
        if (manager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
            return LocationManager.GPS_PROVIDER;
        }
        if (manager.isProviderEnabled(LocationManager.PASSIVE_PROVIDER)) {
            return LocationManager.PASSIVE_PROVIDER;
        }
        return "";
    }

    private Location bestLastKnownLocation(LocationManager manager, JSONObject options) {
        Location best = null;
        String[] providers = new String[] {
            LocationManager.GPS_PROVIDER,
            LocationManager.NETWORK_PROVIDER,
            LocationManager.PASSIVE_PROVIDER
        };
        for (String provider : providers) {
            try {
                if (!manager.isProviderEnabled(provider)) {
                    continue;
                }
                Location location = manager.getLastKnownLocation(provider);
                if (location == null) {
                    continue;
                }
                if (best == null || location.getTime() > best.getTime() || location.getAccuracy() < best.getAccuracy()) {
                    best = location;
                }
            } catch (Exception ignored) {
            }
        }
        return best;
    }

    private JSONObject locationResult(Location location, String source) throws Exception {
        JSONObject result = new JSONObject();
        result.put("available", true);
        result.put("disponivel", true);
        result.put("permission", "android.permission.ACCESS_FINE_LOCATION");
        result.put("permissionGranted", hasLocationPermission());
        result.put("latitude", location.getLatitude());
        result.put("longitude", location.getLongitude());
        result.put("accuracy", location.hasAccuracy() ? location.getAccuracy() : JSONObject.NULL);
        result.put("precisao", location.hasAccuracy() ? location.getAccuracy() : JSONObject.NULL);
        result.put("altitude", location.hasAltitude() ? location.getAltitude() : JSONObject.NULL);
        result.put("speed", location.hasSpeed() ? location.getSpeed() : JSONObject.NULL);
        result.put("velocidade", location.hasSpeed() ? location.getSpeed() : JSONObject.NULL);
        result.put("provider", location.getProvider());
        result.put("provedor", location.getProvider());
        result.put("timestamp", location.getTime());
        result.put("source", source);
        result.put("fonte", source);
        result.put("requiresSettings", false);
        result.put("settingsOpened", false);
        return result;
    }

    private JSONObject locationUnavailableResult(String message) throws Exception {
        JSONObject result = new JSONObject();
        result.put("available", false);
        result.put("disponivel", false);
        result.put("permission", "android.permission.ACCESS_FINE_LOCATION");
        result.put("permissionGranted", hasLocationPermission());
        result.put("requiresSettings", true);
        result.put("settingsOpened", false);
        result.put("message", message);
        result.put("mensagem", message);
        result.put("timestamp", System.currentTimeMillis());
        return result;
    }

    private void authenticateBiometric(final JSONObject options, final CallbackContext callbackContext) throws Exception {
        if (biometricCallback != null) {
            rejectBusyCallback(callbackContext, "Biometric authentication");
            return;
        }

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) {
            callbackContext.success(biometricUnavailableResult("BiometricPrompt requires Android 9 or newer."));
            return;
        }

        KeyguardManager keyguardManager = (KeyguardManager) context().getSystemService(Context.KEYGUARD_SERVICE);
        if (keyguardManager == null || !keyguardManager.isDeviceSecure()) {
            callbackContext.success(biometricUnavailableResult("Device secure lock screen is not configured."));
            return;
        }

        biometricCallback = callbackContext;
        biometricCancellationSignal = new CancellationSignal();

        final JSONObject safeOptions = options == null ? new JSONObject() : options;
        final Activity activity = cordova.getActivity();
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    Executor executor = ContextCompat.getMainExecutor(activity);
                    BiometricPrompt prompt = new BiometricPrompt.Builder(activity)
                        .setTitle(safeOptions.optString("titulo", safeOptions.optString("title", "Autenticacao")))
                        .setSubtitle(safeOptions.optString("subtitulo", safeOptions.optString("subtitle", "")))
                        .setDescription(safeOptions.optString("descricao", safeOptions.optString("description", "")))
                        .setNegativeButton(
                            safeOptions.optString("cancelar", safeOptions.optString("cancel", "Cancelar")),
                            executor,
                            new android.content.DialogInterface.OnClickListener() {
                                @Override
                                public void onClick(android.content.DialogInterface dialog, int which) {
                                    finishBiometric(false, true, "Canceled by user.");
                                }
                            }
                        )
                        .build();

                    prompt.authenticate(
                        biometricCancellationSignal,
                        executor,
                        new BiometricPrompt.AuthenticationCallback() {
                            @Override
                            public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                                finishBiometric(true, false, "");
                            }

                            @Override
                            public void onAuthenticationError(int errorCode, CharSequence errString) {
                                String message = errString == null ? "" : errString.toString();
                                finishBiometric(false, message.toLowerCase().contains("cancel"), message);
                            }

                            @Override
                            public void onAuthenticationFailed() {
                                dispatchEvent("biometria:falhou", baseEvent("biometria:falhou"));
                            }
                        }
                    );
                } catch (Exception error) {
                    finishBiometric(false, false, error.getMessage());
                }
            }
        });
    }

    private void finishBiometric(boolean authenticated, boolean canceled, String message) {
        CallbackContext callback = biometricCallback;
        biometricCallback = null;
        biometricCancellationSignal = null;
        if (callback == null) {
            return;
        }

        try {
            JSONObject result = new JSONObject();
            result.put("supported", true);
            result.put("suportado", true);
            result.put("authenticated", authenticated);
            result.put("autenticado", authenticated);
            result.put("canceled", canceled);
            result.put("cancelado", canceled);
            result.put("message", message == null ? "" : message);
            result.put("mensagem", message == null ? "" : message);
            callback.success(result);
        } catch (Exception error) {
            callback.error(error.getMessage());
        }
    }

    private JSONObject biometricUnavailableResult(String message) throws Exception {
        JSONObject result = new JSONObject();
        result.put("supported", false);
        result.put("suportado", false);
        result.put("authenticated", false);
        result.put("autenticado", false);
        result.put("requiresSettings", true);
        result.put("settingsOpened", false);
        result.put("message", message);
        result.put("mensagem", message);
        return result;
    }

    private void cancelBiometricPrompt() {
        if (biometricCancellationSignal != null) {
            try {
                biometricCancellationSignal.cancel();
            } catch (Exception ignored) {
            }
        }
        biometricCancellationSignal = null;
        biometricCallback = null;
    }

    private JSONObject permissionStatus(JSONArray requested) throws Exception {
        JSONArray permissions = requested == null ? new JSONArray() : requested;
        JSONObject result = new JSONObject();
        for (int index = 0; index < permissions.length(); index += 1) {
            String permission = androidPermissionName(permissions.optString(index, ""));
            if (permission.length() == 0) {
                continue;
            }
            result.put(permission, ContextCompat.checkSelfPermission(context(), permission) == PackageManager.PERMISSION_GRANTED);
        }
        return result;
    }

    private String androidPermissionName(String permission) {
        String value = permission == null ? "" : permission.trim();
        if (value.length() == 0 || value.indexOf('.') >= 0) {
            return value;
        }
        return "android.permission." + value;
    }

    private JSONObject baseEvent(String type) {
        JSONObject detail = new JSONObject();
        try {
            detail.put("type", type);
            detail.put("tipo", type);
            detail.put("timestamp", System.currentTimeMillis());
        } catch (Exception ignored) {
        }
        return detail;
    }

    private void registerSystemReceiver() {
        if (systemReceiver != null) {
            return;
        }

        systemReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (intent == null || intent.getAction() == null) {
                    return;
                }

                try {
                    if (Intent.ACTION_BATTERY_CHANGED.equals(intent.getAction())) {
                        dispatchEvent("bateria:mudou", batteryInfo());
                    } else if (ConnectivityManager.CONNECTIVITY_ACTION.equals(intent.getAction())) {
                        dispatchEvent("rede:mudou", networkInfo());
                    }
                } catch (Exception ignored) {
                }
            }
        };

        IntentFilter filter = new IntentFilter();
        filter.addAction(Intent.ACTION_BATTERY_CHANGED);
        filter.addAction(ConnectivityManager.CONNECTIVITY_ACTION);
        ContextCompat.registerReceiver(context(), systemReceiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED);
    }

    private void unregisterSystemReceiver() {
        if (systemReceiver == null) {
            return;
        }

        try {
            context().unregisterReceiver(systemReceiver);
        } catch (Exception ignored) {
        }
        systemReceiver = null;
    }

    private void handleLinkIntent(Intent intent, boolean dispatchToJs) {
        if (intent == null || intent.getData() == null) {
            return;
        }

        JSONObject detail = new JSONObject();
        try {
            Uri uri = intent.getData();
            detail.put("url", uri.toString());
            detail.put("scheme", uri.getScheme());
            detail.put("host", uri.getHost());
            detail.put("path", uri.getPath());
            detail.put("query", uri.getQuery());
            detail.put("timestamp", System.currentTimeMillis());
        } catch (Exception ignored) {
        }

        initialLink = detail;
        if (dispatchToJs) {
            dispatchEvent("link:aberto", detail);
        }
    }

    private void dispatchEvent(String type, JSONObject detail) {
        if (webView == null) {
            return;
        }

        JSONObject payload = detail == null ? baseEvent(type) : detail;
        try {
            payload.put("type", type);
            payload.put("tipo", type);
            if (!payload.has("timestamp")) {
                payload.put("timestamp", System.currentTimeMillis());
            }
        } catch (Exception ignored) {
        }

        final String script = "(function(){var detail=" + payload.toString()
            + ";window.dispatchEvent(new CustomEvent('html2apk:event',{detail:detail}));"
            + "window.dispatchEvent(new CustomEvent('html2apk:'+detail.type,{detail:detail}));})();";

        cordova.getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                webView.getEngine().evaluateJavascript(script, null);
            }
        });
    }

    private void handleNotificationIntent(Intent intent, boolean dispatchToJs) {
        if (intent == null || !intent.getBooleanExtra(EXTRA_NOTIFICATION_CLICKED, false)) {
            return;
        }

        JSONObject detail = parseDetail(intent.getStringExtra(EXTRA_NOTIFICATION_DETAIL));
        initialNotification = detail;

        if (dispatchToJs) {
            dispatchNotificationClick(detail);
        }

        intent.removeExtra(EXTRA_NOTIFICATION_CLICKED);
        intent.removeExtra(EXTRA_NOTIFICATION_DETAIL);
    }

    private void dispatchNotificationClick(JSONObject detail) {
        if (detail == null || webView == null) {
            return;
        }

        dispatchEvent("notificacao:clicada", detail);

        final String script = "(function(){var detail=" + detail.toString()
            + ";window.dispatchEvent(new CustomEvent('html2apk:notification',{detail:detail}));})();";

        cordova.getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                webView.getEngine().evaluateJavascript(script, null);
            }
        });
    }

    private JSONObject parseDetail(String raw) {
        try {
            if (raw == null || raw.length() == 0) {
                return null;
            }
            return new JSONObject(raw);
        } catch (Exception ignored) {
            return null;
        }
    }

    static PendingIntent createContentIntent(Context context, int id, JSONObject detail) {
        Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launchIntent == null) {
            launchIntent = new Intent();
            launchIntent.setPackage(context.getPackageName());
        }

        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        launchIntent.putExtra(EXTRA_NOTIFICATION_CLICKED, true);
        launchIntent.putExtra(EXTRA_NOTIFICATION_DETAIL, detail == null ? "{}" : detail.toString());

        return PendingIntent.getActivity(
            context,
            id,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    static PendingIntent createNotificationClickIntent(Context context, int id, JSONObject detail) {
        if (shouldOpenAppForNotificationClick(detail)) {
            return createContentIntent(context, id, detail);
        }

        Intent intent = new Intent(context, NotificationClickReceiver.class);
        intent.putExtra(EXTRA_NOTIFICATION_CLICKED, true);
        intent.putExtra(EXTRA_NOTIFICATION_DETAIL, detail == null ? "{}" : detail.toString());

        return PendingIntent.getBroadcast(
            context,
            id,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    static void handleNotificationClickBroadcast(Context context, JSONObject detail) {
        if (detail == null) {
            return;
        }

        if (activeBridge != null && activeBridge.webView != null) {
            activeBridge.dispatchNotificationClick(detail);
            return;
        }

        handleNativeNotificationAction(context, detail);
    }

    private static void handleNativeNotificationAction(Context context, JSONObject detail) {
        JSONObject action = notificationClickAction(detail);
        if (action == null) {
            return;
        }

        String functionName = action.optString("funcao",
            action.optString("functionName",
                action.optString("function",
                    action.optString("fn", action.optString("nomeFuncao", "")))));

        if (!isExternalUrlFunction(functionName)) {
            return;
        }

        String url = firstActionArgument(action);
        if (url.length() == 0) {
            url = action.optString("url", action.optString("href", ""));
        }
        if (url.length() == 0) {
            return;
        }

        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            context.startActivity(intent);
        } catch (Exception ignored) {
        }
    }

    private static boolean isExternalUrlFunction(String functionName) {
        return "abrirForaDoApp".equals(functionName)
            || "abrirUrlExterno".equals(functionName)
            || "abrirUrl".equals(functionName)
            || "openOutsideApp".equals(functionName)
            || "openExternalUrl".equals(functionName)
            || "openUrl".equals(functionName);
    }

    private static String firstActionArgument(JSONObject action) {
        JSONArray args = action.optJSONArray("argumentos");
        if (args == null) {
            args = action.optJSONArray("args");
        }
        if (args == null) {
            args = action.optJSONArray("parametros");
        }
        if (args == null) {
            args = action.optJSONArray("params");
        }
        if (args == null || args.length() == 0) {
            return "";
        }
        return args.optString(0, "");
    }

    private static JSONObject notificationClickAction(JSONObject detail) {
        if (detail == null) {
            return null;
        }

        JSONObject action = detail.optJSONObject("action");
        if (action != null) {
            JSONObject nested = action.optJSONObject("aoClicar");
            if (nested == null) {
                nested = action.optJSONObject("onClick");
            }
            return nested == null ? action : nested;
        }

        action = detail.optJSONObject("acao");
        if (action != null) {
            JSONObject nested = action.optJSONObject("aoClicar");
            if (nested == null) {
                nested = action.optJSONObject("onClick");
            }
            return nested == null ? action : nested;
        }

        action = detail.optJSONObject("aoClicar");
        if (action == null) {
            action = detail.optJSONObject("onClick");
        }
        return action;
    }

    private static boolean shouldOpenAppForNotificationClick(JSONObject detail) {
        Boolean open = openFlag(detail);
        JSONObject action;

        if (open != null) {
            return open.booleanValue();
        }

        action = detail == null ? null : detail.optJSONObject("action");
        open = openFlag(action);
        if (open != null) {
            return open.booleanValue();
        }

        action = detail == null ? null : detail.optJSONObject("acao");
        open = openFlag(action);
        if (open != null) {
            return open.booleanValue();
        }

        action = notificationClickAction(detail);
        open = openFlag(action);
        return open == null || open.booleanValue();
    }

    private static Boolean openFlag(JSONObject object) {
        if (object == null) {
            return null;
        }
        if (object.has("open")) {
            return Boolean.valueOf(object.optBoolean("open", true));
        }
        if (object.has("abrir")) {
            return Boolean.valueOf(object.optBoolean("abrir", true));
        }
        if (object.has("openApp")) {
            return Boolean.valueOf(object.optBoolean("openApp", true));
        }
        if (object.has("abrirApp")) {
            return Boolean.valueOf(object.optBoolean("abrirApp", true));
        }
        return null;
    }

    static boolean canScheduleExactAlarms(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            return true;
        }

        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        return alarmManager != null && alarmManager.canScheduleExactAlarms();
    }

    static JSONArray loopNotifications(JSONObject options) {
        JSONArray notifications = options.optJSONArray("notificacoes");
        if (notifications == null) {
            notifications = options.optJSONArray("notifications");
        }
        if (notifications == null) {
            notifications = options.optJSONArray("items");
        }
        return notifications == null ? new JSONArray() : notifications;
    }

    static JSONObject notificationDisplayOptions(JSONObject options) throws Exception {
        JSONArray notifications = loopNotifications(options);
        if (notifications.length() == 0) {
            return options;
        }

        int index = Math.max(0, options.optInt("loopIndex", options.optInt("indiceLoop", 0)));
        JSONObject current = notifications.optJSONObject(index % notifications.length());
        JSONObject displayOptions = new JSONObject(options.toString());
        if (current != null) {
            JSONArray names = current.names();
            if (names != null) {
                for (int nameIndex = 0; nameIndex < names.length(); nameIndex += 1) {
                    String name = names.optString(nameIndex);
                    displayOptions.put(name, current.opt(name));
                }
            }
        }

        displayOptions.put("id", notificationId(options));
        displayOptions.put("loopIndex", index);
        displayOptions.put("indiceLoop", index);
        displayOptions.put("loopTotal", notifications.length());
        displayOptions.put("totalLoop", notifications.length());
        return displayOptions;
    }

    static long repeatInterval(JSONObject options) {
        long interval = intervalFromObject(options.opt("intervalo"));
        if (interval <= 0) {
            interval = intervalFromObject(options.opt("interval"));
        }
        if (interval <= 0) {
            interval = intervalFromObject(options.opt("aCada"));
        }
        if (interval <= 0) {
            interval = intervalFromObject(options.opt("every"));
        }
        if (interval <= 0) {
            interval = intervalFromObject(options.opt("repetir"));
        }
        if (interval <= 0) {
            interval = intervalFromObject(options.opt("repeat"));
        }
        return interval;
    }

    static long nextRepeatTime(JSONObject options, long after) {
        long interval = repeatInterval(options);
        if (interval <= 0) {
            return 0;
        }

        long next = options.optLong("when", options.optLong("quando", after)) + interval;
        while (next <= after) {
            next += interval;
        }
        return next;
    }

    static JSONObject nextRepeatOptions(JSONObject options, long nextWhen) throws Exception {
        JSONObject next = new JSONObject(options.toString());
        JSONArray notifications = loopNotifications(options);
        int nextIndex = Math.max(0, options.optInt("loopIndex", options.optInt("indiceLoop", 0))) + 1;
        int runCount = Math.max(0, options.optInt("_runCount", options.optInt("runCount", 0))) + 1;

        next.put("when", nextWhen);
        next.put("quando", nextWhen);
        next.put("loopIndex", notifications.length() == 0 ? nextIndex : nextIndex % notifications.length());
        next.put("indiceLoop", notifications.length() == 0 ? nextIndex : nextIndex % notifications.length());
        next.put("_runCount", runCount);
        next.put("runCount", runCount);
        return next;
    }

    static boolean shouldStopRepeating(JSONObject options, long nextWhen) {
        long until = options.optLong("ate", options.optLong("until", 0));
        if (until > 0 && nextWhen > until) {
            return true;
        }

        int maxRuns = options.optInt("vezes", options.optInt("times", options.optInt("count", options.optInt("limit", 0))));
        int runCount = Math.max(0, options.optInt("_runCount", options.optInt("runCount", 0))) + 1;
        return maxRuns > 0 && runCount >= maxRuns;
    }

    static void rescheduleRepeatingNotification(Context context, int id, JSONObject options, boolean exactAllowed) {
        try {
            long nextWhen = nextRepeatTime(options, System.currentTimeMillis());
            if (nextWhen <= 0 || shouldStopRepeating(options, nextWhen)) {
                NotificationStore.remove(context, id);
                return;
            }

            JSONObject nextOptions = nextRepeatOptions(options, nextWhen);
            nextOptions.put("id", id);
            NotificationStore.save(context, id, nextWhen, nextOptions);
            NotificationReceiver.schedule(context, id, nextWhen, nextOptions, exactAllowed);
        } catch (Exception ignored) {
        }
    }

    private static long intervalFromObject(Object value) {
        if (value == null || value == JSONObject.NULL) {
            return 0;
        }
        if (value instanceof Number) {
            return Math.max(0, ((Number) value).longValue());
        }
        if (value instanceof JSONObject) {
            JSONObject object = (JSONObject) value;
            long nested = intervalFromObject(object.opt("intervalo"));
            if (nested <= 0) {
                nested = intervalFromObject(object.opt("interval"));
            }
            if (nested <= 0) {
                nested = intervalFromObject(object.opt("aCada"));
            }
            if (nested <= 0) {
                nested = intervalFromObject(object.opt("every"));
            }
            return nested;
        }
        if (value instanceof Boolean) {
            return 0;
        }

        return parseIntervalString(String.valueOf(value));
    }

    private static long parseIntervalString(String value) {
        String text = value == null ? "" : value.trim().toLowerCase();
        if (text.length() == 0) {
            return 0;
        }

        int unitStart = text.length();
        for (int index = 0; index < text.length(); index += 1) {
            char character = text.charAt(index);
            if (!(Character.isDigit(character) || character == '.')) {
                unitStart = index;
                break;
            }
        }

        try {
            double amount = Double.parseDouble(text.substring(0, unitStart).trim());
            String unit = text.substring(unitStart).trim();
            if ("s".equals(unit) || "seg".equals(unit)) {
                return Math.round(amount * 1000);
            }
            if ("m".equals(unit) || "min".equals(unit)) {
                return Math.round(amount * 60 * 1000);
            }
            if ("h".equals(unit) || "hr".equals(unit)) {
                return Math.round(amount * 60 * 60 * 1000);
            }
            if ("d".equals(unit) || "dia".equals(unit) || "dias".equals(unit)) {
                return Math.round(amount * 24 * 60 * 60 * 1000);
            }
            return Math.round(amount);
        } catch (Exception ignored) {
            return 0;
        }
    }

    private static int notificationIdFromObject(Object input) {
        if (input instanceof Number) {
            return ((Number) input).intValue();
        }
        if (input instanceof JSONObject) {
            return notificationId((JSONObject) input);
        }
        try {
            return Integer.parseInt(String.valueOf(input));
        } catch (Exception ignored) {
            return 0;
        }
    }

    static JSONObject detailPayload(JSONObject options) throws Exception {
        JSONObject detail = new JSONObject();
        JSONObject click = options.optJSONObject("aoClicar");
        Boolean open = openFlag(options);
        if (click == null) {
            click = options.optJSONObject("onClick");
        }
        if (open == null) {
            open = openFlag(click);
        }

        detail.put("id", notificationId(options));
        detail.put("title", title(options));
        detail.put("titulo", title(options));
        detail.put("text", text(options));
        detail.put("texto", text(options));
        detail.put("when", options.optLong("quando", options.optLong("when", System.currentTimeMillis())));
        detail.put("clickedAt", System.currentTimeMillis());
        detail.put("onClick", click == null ? new JSONObject().put("action", "open-app") : click);
        detail.put("aoClicar", click == null ? new JSONObject().put("acao", "abrir-app") : click);
        if (open != null) {
            detail.put("open", open.booleanValue());
            detail.put("abrir", open.booleanValue());
        }
        return detail;
    }

    static void addNotificationActions(NotificationCompat.Builder builder, Context context, int notificationId, JSONObject options) {
        JSONArray actions = options.optJSONArray("acoes");
        if (actions == null) {
            actions = options.optJSONArray("actions");
        }
        if (actions == null) {
            return;
        }

        for (int index = 0; index < actions.length(); index += 1) {
            JSONObject action = actions.optJSONObject(index);
            if (action == null) {
                continue;
            }

            try {
                String title = action.optString("titulo", action.optString("title", action.optString("id", "Abrir")));
                JSONObject detail = detailPayload(options);
                detail.put("notificationAction", action.optString("id", String.valueOf(index)));
                detail.put("acaoNotificacao", action.optString("id", String.valueOf(index)));
                detail.put("action", action);
                builder.addAction(
                    context.getApplicationInfo().icon,
                    title,
                    createNotificationClickIntent(context, notificationId * 100 + index + 1, detail)
                );
            } catch (Exception ignored) {
            }
        }
    }

    static int notificationId(JSONObject options) {
        int id = options.optInt("id", 0);
        if (id != 0) {
            return id;
        }
        return (int) (System.currentTimeMillis() & 0x0fffffff);
    }

    static String title(JSONObject options) {
        return options.optString("titulo", options.optString("title", "Notificacao"));
    }

    static String text(JSONObject options) {
        return options.optString("texto", options.optString("text", ""));
    }
}
