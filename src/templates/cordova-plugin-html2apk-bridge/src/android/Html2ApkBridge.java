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
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothServerSocket;
import android.bluetooth.BluetoothSocket;
import android.content.ActivityNotFoundException;
import android.content.BroadcastReceiver;
import android.content.ContentValues;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.res.Configuration;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.database.ContentObserver;
import android.database.Cursor;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraManager;
import android.hardware.biometrics.BiometricPrompt;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Rect;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.media.AudioDeviceCallback;
import android.media.AudioDeviceInfo;
import android.media.AudioManager;
import android.media.MediaRecorder;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.net.nsd.NsdManager;
import android.net.nsd.NsdServiceInfo;
import android.net.wifi.WifiManager;
import android.nfc.NdefMessage;
import android.nfc.NdefRecord;
import android.nfc.NfcAdapter;
import android.nfc.Tag;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.Debug;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.os.Parcelable;
import android.os.StatFs;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.Settings;
import android.provider.MediaStore;
import android.provider.DocumentsContract;
import android.provider.OpenableColumns;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.speech.RecognizerIntent;
import android.speech.tts.TextToSpeech;
import android.util.Base64;
import android.view.View;
import android.view.ViewTreeObserver;
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

import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.FileInputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.Charset;
import java.security.KeyStore;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Executor;
import java.util.concurrent.ConcurrentHashMap;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

public class Html2ApkBridge extends CordovaPlugin {
    static final String CHANNEL_ID = "html2apk_default";
    static final String EXTRA_NOTIFICATION_CLICKED = "html2apk_notification_clicked";
    static final String EXTRA_NOTIFICATION_DETAIL = "html2apk_notification_detail";
    static final String EXTRA_INITIAL_LINK = "html2apk_initial_link";

    private static final int REQUEST_POST_NOTIFICATIONS = 7311;
    private static final int REQUEST_CAMERA = 7312;
    private static final int REQUEST_RECORD_AUDIO = 7313;
    private static final int REQUEST_LOCATION = 7314;
    private static final int REQUEST_BLUETOOTH = 7315;
    private static final int REQUEST_PICK_FILE = 7411;
    private static final int REQUEST_SAVE_FILE = 7412;
    private static final int REQUEST_PICK_FOLDER = 7413;
    private static final int REQUEST_CAPTURE_PHOTO = 7414;
    private static final int REQUEST_CAPTURE_VIDEO = 7415;
    private static final int REQUEST_SPEECH_RECOGNITION = 7416;
    private static final int REQUEST_DEVICE_CREDENTIAL = 7417;
    private static final int REQUEST_INSTALL_PACKAGE_PICK = 7418;
    static final String PREFS_NAME = "html2apk_bridge";
    private static final String PREF_PERMISSION_PREFIX = "permission_requested_";
    private static final String STORED_FILES_DIR = "html2apk-files";
    private static final String STORED_FILE_META_SUFFIX = ".html2apk-meta.json";
    private static final String SECURE_PREFS_NAME = "html2apk_secure_storage";
    private static final String SECURE_KEY_ALIAS = "html2apk_secure_storage_key";
    private static final String SECURE_VALUE_PREFIX = "value:";
    private static final String SECURE_IV_PREFIX = "iv:";
    private static final String SECURE_TYPE_PREFIX = "type:";
    private static final String FLOATING_ICON_OPACITY_KEY = "floating_icon_opacity";
    private static final UUID BLUETOOTH_UUID = UUID.fromString("00001101-0000-1000-8000-00805f9b34fb");
    private static final String WIFI_SERVICE_TYPE = "_html2apk._tcp.";
    private static Html2ApkBridge activeBridge;
    private java.util.Timer notificationPollerTimer;

    private CallbackContext notificationPermissionCallback;
    private CallbackContext cameraPermissionCallback;
    private CallbackContext pendingNotificationCallback;
    private CallbackContext pendingFlashlightCallback;
    private CallbackContext microphonePermissionCallback;
    private CallbackContext pendingMicStartCallback;
    private CallbackContext filePickerCallback;
    private static final int REQUEST_CONTACTS = 7320;
    private CallbackContext contactsPermissionCallback;
    private CallbackContext saveFileCallback;
    private CallbackContext folderPickerCallback;
    private CallbackContext mediaCaptureCallback;
    private CallbackContext pendingLocationCallback;
    private CallbackContext pendingBluetoothCallback;
    private CallbackContext biometricCallback;
    private CallbackContext deviceCredentialCallback;
    private CallbackContext installPackageCallbackContext;
    private CallbackContext pendingDownloadCallback;
    private CallbackContext speechRecognitionCallback;
    private CallbackContext pendingSpeakCallback;
    private CallbackContext bluetoothDiscoveryCallback;
    private CallbackContext wifiDiscoveryCallback;
    private JSONObject pendingSaveFile;
    private JSONObject pendingMediaCaptureOptions;
    private JSONObject pendingLocationOptions;
    private JSONObject pendingNotificationOptions;
    private JSONObject pendingDownloadOptions;
    private JSONObject pendingSpeakOptions;
    private JSONObject pendingBluetoothPayload;
    private JSONObject initialNotification;
    private JSONObject initialLink;
    private JSONObject initialShare;
    private String pendingSpeakText;
    private String pendingBluetoothAction;
    private String pendingBluetoothDeviceId;
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
    private BroadcastReceiver usbReceiver;
    private BroadcastReceiver headphoneReceiver;
    private BroadcastReceiver bluetoothDiscoveryReceiver;
    private AudioDeviceCallback audioDeviceCallback;
    private ContentObserver volumeObserver;
    private ContentObserver screenshotObserver;
    private ViewTreeObserver.OnGlobalLayoutListener layoutListener;
    private CancellationSignal biometricCancellationSignal;
    private TextToSpeech textToSpeech;
    private SensorManager sensorManager;
    private SensorEventListener motionSensorListener;
    private SensorEventListener proximitySensorListener;
    private NfcAdapter nfcAdapter;
    private PendingIntent nfcPendingIntent;
    private boolean textToSpeechReady;
    private boolean bluetoothServerRunning;
    private BluetoothServerSocket bluetoothServerSocket;
    private final ConcurrentHashMap<String, BluetoothConnection> activeBluetoothConnections = new ConcurrentHashMap<>();
    private ServerSocket wifiServerSocket;
    private Socket wifiSocket;
    private OutputStream wifiOutputStream;
    private Thread bluetoothServerThread;
    private Thread wifiServerThread;
    private Thread wifiReadThread;
    private Handler bluetoothDiscoveryTimeout;
    private Handler wifiDiscoveryTimeout;
    private NsdManager.DiscoveryListener wifiDiscoveryListener;
    private NsdManager.RegistrationListener wifiRegistrationListener;
    private WifiManager.MulticastLock wifiMulticastLock;
    private boolean wifiServerRunning;
    private int wifiServerPort;
    private String wifiServiceName;
    private Boolean usbPowerConnected;
    private Boolean headphoneConnected;
    private Boolean keyboardOpen;
    private Boolean proximityNear;
    private boolean faceDownDispatched;
    private long lastShakeAt;
    private long faceDownStartedAt;
    private long lastScreenshotAt;
    private String currentOrientation;
    private String lastScreenshotUri;
    private JSONObject lastVolumeState;
    private final Map<String, JSONObject> bluetoothDiscoveredDevices = new HashMap<String, JSONObject>();
    private final Map<String, JSONObject> wifiDiscoveredDevices = new HashMap<String, JSONObject>();
    private final Map<String, LocationListener> locationListeners = new HashMap<String, LocationListener>();

    @Override
    public void initialize(CordovaInterface cordova, CordovaWebView webView) {
        super.initialize(cordova, webView);
        activeBridge = this;
        handleNotificationIntent(cordova.getActivity().getIntent(), false);
        handleLinkIntent(cordova.getActivity().getIntent(), false);
        handleSharedIntent(cordova.getActivity().getIntent(), false);
        handleNfcIntent(cordova.getActivity().getIntent(), false);
        registerSystemReceiver();
        registerUsbReceiver();
        registerHeadphoneWatchers();
        registerVolumeObserver();
        registerScreenshotObserver();
        registerLayoutListener();
        startFloatingModeIfNeeded();
        startNotificationPollerIfNeeded();
    }

    @Override
    public void onNewIntent(Intent intent) {
        handleNotificationIntent(intent, true);
        handleLinkIntent(intent, true);
        handleSharedIntent(intent, true);
        handleNfcIntent(intent, true);
    }

    @Override
    public void onResume(boolean multitasking) {
        super.onResume(multitasking);
        dispatchEvent("app:voltou", baseEvent("app:voltou"));
        registerSensorListeners();
        enableNfcForegroundDispatch();
        startFloatingModeIfNeeded();
    }

    @Override
    public void onPause(boolean multitasking) {
        dispatchEvent("app:pausado", baseEvent("app:pausado"));
        dispatchEvent("app:background", baseEvent("app:background"));
        disableNfcForegroundDispatch();
        unregisterSensorListeners();
        super.onPause(multitasking);
    }

    @Override
    public void onDestroy() {
        stopNotificationPoller();
        stopMicRecorderSilently();
        stopAllLocationWatches();
        cancelBiometricPrompt();
        shutdownTextToSpeech();
        shutdownBluetooth();
        shutdownWifi();
        unregisterSensorListeners();
        disableNfcForegroundDispatch();
        unregisterLayoutListener();
        unregisterScreenshotObserver();
        unregisterVolumeObserver();
        unregisterHeadphoneWatchers();
        unregisterSystemReceiver();
        unregisterUsbReceiver();
        dispatchEvent("app:fechado", baseEvent("app:fechado"));
        if (activeBridge == this) {
            activeBridge = null;
        }
        super.onDestroy();
    }

    private static final java.util.HashMap<String, String> sessionStore = new java.util.HashMap<>();

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) {
        try {
            if ("sessionSet".equals(action)) {
                String key = args.optString(0, "");
                String value = args.isNull(1) ? null : args.optString(1, null);
                if (value == null) {
                    sessionStore.remove(key);
                } else {
                    sessionStore.put(key, value);
                }
                callbackContext.success();
                return true;
            }
            if ("enterPip".equals(action)) {
                JSONObject options = args.optJSONObject(0);
                return Html2ApkPipManager.enterPip(this, callbackContext, options);
            }
            if ("solicitarPermissaoContatos".equals(action)) {
                if (cordova.hasPermission(android.Manifest.permission.READ_CONTACTS)) {
                    callbackContext.success();
                } else {
                    contactsPermissionCallback = callbackContext;
                    cordova.requestPermission(this, REQUEST_CONTACTS, android.Manifest.permission.READ_CONTACTS);
                }
                return true;
            }
            if ("pesquisarContato".equals(action)) {
                String query = args.optString(0, "");
                Html2ApkContactsManager.pesquisarContato(this, query, callbackContext);
                return true;
            }
            if ("sessionGet".equals(action)) {
                String key = args.optString(0, "");
                String value = sessionStore.get(key);
                if (value == null) {
                    callbackContext.sendPluginResult(new org.apache.cordova.PluginResult(org.apache.cordova.PluginResult.Status.OK, (String) null));
                } else {
                    callbackContext.success(value);
                }
                return true;
            }
            if ("sessionRemove".equals(action)) {
                String key = args.optString(0, "");
                sessionStore.remove(key);
                callbackContext.success();
                return true;
            }
            if ("sessionClear".equals(action)) {
                sessionStore.clear();
                callbackContext.success();
                return true;
            }
            if ("sessionGetAll".equals(action)) {
                callbackContext.success(new JSONObject(sessionStore));
                return true;
            }
            if ("openPackage".equals(action)) {
                String packageName = args.optString(0, "");
                android.content.Intent launchIntent = cordova.getActivity().getPackageManager().getLaunchIntentForPackage(packageName);
                JSONObject result = new JSONObject();
                if (launchIntent != null) {
                    cordova.getActivity().startActivity(launchIntent);
                    result.put("success", true);
                } else {
                    result.put("success", false);
                }
                callbackContext.success(result);
                return true;
            }
            if ("checkPackage".equals(action)) {
                String packageName = args.optString(0, "");
                JSONObject result = new JSONObject();
                android.content.pm.PackageInfo info = findMostSimilarPackage(packageName);
                
                if (info != null) {
                    result.put("exists", true);
                    result.put("version", info.versionName != null ? info.versionName : "0.0.0");
                    result.put("packageId", info.packageName);
                    CharSequence appLabel = cordova.getActivity().getPackageManager().getApplicationLabel(info.applicationInfo);
                    result.put("appName", appLabel != null ? appLabel.toString() : "");
                } else {
                    result.put("exists", false);
                }
                
                callbackContext.success(result);
                return true;
            }
            if ("installPackage".equals(action)) {
                String param = args.optString(0, "");
                if ("select".equalsIgnoreCase(param)) {
                    cordova.setActivityResultCallback(this);
                    android.content.Intent intent = new android.content.Intent(android.content.Intent.ACTION_GET_CONTENT);
                    intent.setType("application/vnd.android.package-archive");
                    intent.addCategory(android.content.Intent.CATEGORY_OPENABLE);
                    cordova.getActivity().startActivityForResult(intent, REQUEST_INSTALL_PACKAGE_PICK);
                    installPackageCallbackContext = callbackContext;
                } else {
                    java.io.File targetFile = new java.io.File(param);
                    if (targetFile.exists() && targetFile.isFile()) {
                        try {
                            android.content.Intent intent = new android.content.Intent(android.content.Intent.ACTION_VIEW);
                            android.net.Uri fileUri = fileProviderUri(targetFile);
                            intent.setDataAndType(fileUri, "application/vnd.android.package-archive");
                            intent.addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION);
                            intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
                            intent.addFlags(android.content.Intent.FLAG_ACTIVITY_CLEAR_TOP);
                            
                            // Explicitly grant permission to all apps that can handle this intent (PackageInstaller)
                            java.util.List<android.content.pm.ResolveInfo> resInfoList = cordova.getActivity().getPackageManager().queryIntentActivities(intent, android.content.pm.PackageManager.MATCH_DEFAULT_ONLY);
                            for (android.content.pm.ResolveInfo resolveInfo : resInfoList) {
                                String packageName = resolveInfo.activityInfo.packageName;
                                cordova.getActivity().grantUriPermission(packageName, fileUri, android.content.Intent.FLAG_GRANT_WRITE_URI_PERMISSION | android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION);
                            }
                            
                            cordova.getActivity().startActivity(intent);
                            JSONObject res = new JSONObject();
                            res.put("success", true);
                            callbackContext.success(res);
                        } catch (Exception e) {
                            callbackContext.error(e.getMessage());
                        }
                    } else {
                        callbackContext.error("Arquivo não encontrado no caminho fornecido: " + param);
                    }
                }
                return true;
            }
            if ("pointFile".equals(action)) {
                String filename = args.optString(0, "");
                String type = args.optString(1, "").toLowerCase();
                boolean executeOnFind = args.optBoolean(2, false);
                
                java.io.File downloadsDir = android.os.Environment.getExternalStoragePublicDirectory(android.os.Environment.DIRECTORY_DOWNLOADS);
                java.io.File targetFile = findMostSimilarFile(downloadsDir, filename);
                JSONObject result = new JSONObject();
                
                if (targetFile != null && targetFile.exists() && targetFile.isFile()) {
                    result.put("exists", true);
                    result.put("path", targetFile.getAbsolutePath());
                    
                    if (executeOnFind) {
                        try {
                            android.content.Intent intent = new android.content.Intent(android.content.Intent.ACTION_VIEW);
                            android.net.Uri fileUri = fileProviderUri(targetFile);
                            String mimeType = "*/*";
                            if (type.equals("apk")) {
                                mimeType = "application/vnd.android.package-archive";
                            } else if (type.equals("pdf")) {
                                mimeType = "application/pdf";
                            } else if (type.length() > 0) {
                                mimeType = type; // fallback custom
                            }
                            intent.setDataAndType(fileUri, mimeType);
                            intent.addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION);
                            intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
                            intent.addFlags(android.content.Intent.FLAG_ACTIVITY_CLEAR_TOP);
                            
                            java.util.List<android.content.pm.ResolveInfo> resInfoList = cordova.getActivity().getPackageManager().queryIntentActivities(intent, android.content.pm.PackageManager.MATCH_DEFAULT_ONLY);
                            for (android.content.pm.ResolveInfo resolveInfo : resInfoList) {
                                String packageName = resolveInfo.activityInfo.packageName;
                                cordova.getActivity().grantUriPermission(packageName, fileUri, android.content.Intent.FLAG_GRANT_WRITE_URI_PERMISSION | android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION);
                            }
                            
                            cordova.getActivity().startActivity(intent);
                            result.put("opened", true);
                        } catch (Exception e) {
                            result.put("opened", false);
                            result.put("error", e.getMessage());
                        }
                    }
                } else {
                    result.put("exists", false);
                }
                callbackContext.success(result);
                return true;
            }
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
                callbackContext.success(share(args.optJSONObject(0)));
                return true;
            }

            if ("shareCurrentApp".equals(action)) {
                callbackContext.success(shareCurrentApp(args.optJSONObject(0)));
                return true;
            }

            if ("scanBluetooth".equals(action)) {
                scanBluetooth(args.optJSONObject(0), callbackContext);
                return true;
            }

            if ("connectBluetooth".equals(action)) {
                connectBluetooth(args.optString(0, ""), callbackContext);
                return true;
            }

            if ("sendBluetooth".equals(action)) {
                sendBluetooth(args.opt(0), callbackContext);
                return true;
            }

            if ("startBluetoothServer".equals(action)) {
                startBluetoothServerWithPermission(callbackContext);
                return true;
            }

            if ("scanWifi".equals(action)) {
                scanWifi(args.optJSONObject(0), callbackContext);
                return true;
            }

            if ("connectWifi".equals(action)) {
                connectWifi(args.optString(0, ""), callbackContext);
                return true;
            }

            if ("sendWifi".equals(action)) {
                sendWifi(args.opt(0), callbackContext);
                return true;
            }

            if ("startWifiServer".equals(action)) {
                callbackContext.success(startWifiServer());
                return true;
            }

            if ("ocr".equals(action)) {
                runOcr(args.optJSONObject(0), callbackContext);
                return true;
            }

            if ("speakText".equals(action)) {
                speakText(args.optString(0, ""), args.optJSONObject(1), callbackContext);
                return true;
            }

            if ("stopSpeaking".equals(action)) {
                callbackContext.success(stopSpeaking());
                return true;
            }

            if ("recognizeSpeech".equals(action)) {
                recognizeSpeech(args.optJSONObject(0), callbackContext);
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

            if ("installUpdate".equals(action)) {
                installUpdate(args.optString(0, ""), args.optJSONObject(1), callbackContext);
                return true;
            }

            if ("requestInstallPermission".equals(action)) {
                callbackContext.success(requestInstallPermission());
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

            if ("captureScreen".equals(action)) {
                captureScreen(args.optJSONObject(0), callbackContext);
                return true;
            }

            if ("getVolume".equals(action)) {
                callbackContext.success(volumeState());
                return true;
            }

            if ("setVolume".equals(action)) {
                callbackContext.success(setVolume(args.optJSONObject(0)));
                return true;
            }

            if ("adjustVolume".equals(action)) {
                callbackContext.success(adjustVolume(args.optJSONObject(0)));
                return true;
            }

            if ("storagePermissionStatus".equals(action)) {
                callbackContext.success(storagePermissionStatus());
                return true;
            }

            if ("requestStoragePermission".equals(action)) {
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
                    if (!android.os.Environment.isExternalStorageManager()) {
                        try {
                            android.content.Intent intent = new android.content.Intent(android.provider.Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
                            intent.addCategory("android.intent.category.DEFAULT");
                            intent.setData(android.net.Uri.parse(String.format("package:%s", context().getPackageName())));
                            cordova.getActivity().startActivity(intent);
                        } catch (Exception e) {
                            android.content.Intent intent = new android.content.Intent();
                            intent.setAction(android.provider.Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION);
                            cordova.getActivity().startActivity(intent);
                        }
                    }
                } else {
                    if (!cordova.hasPermission(android.Manifest.permission.READ_EXTERNAL_STORAGE) || !cordova.hasPermission(android.Manifest.permission.WRITE_EXTERNAL_STORAGE)) {
                        cordova.requestPermissions(this, 2296, new String[]{android.Manifest.permission.READ_EXTERNAL_STORAGE, android.Manifest.permission.WRITE_EXTERNAL_STORAGE});
                    }
                }
                JSONObject result = storagePermissionStatus();
                result.put("requested", true);
                result.put("settingsOpened", result.optBoolean("requiresSettings"));
                callbackContext.success(result);
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
                startFloatingIcon(args.optJSONObject(0));
                callbackContext.success(floatingIconStatus());
                return true;
            }

            if ("configureFloatingIcon".equals(action)) {
                if (!canDrawOverlays()) {
                    openOverlaySettings();
                    JSONObject result = floatingIconStatus();
                    result.put("requested", true);
                    result.put("requiresSettings", true);
                    callbackContext.success(result);
                    return true;
                }
                startFloatingIcon(args.optJSONObject(0));
                callbackContext.success(floatingIconStatus());
                return true;
            }

            if ("stopFloatingIcon".equals(action)) {
                stopFloatingIcon();
                callbackContext.success();
                return true;
            }

            if ("minimizeApp".equals(action)) {
                minimizeApp(callbackContext);
                return true;
            }

            if ("closeApp".equals(action)) {
                closeApp(callbackContext);
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

            if ("getInitialShare".equals(action)) {
                callbackContext.success(initialShare == null ? new JSONObject() : initialShare);
                initialShare = null;
                return true;
            }

            if ("authenticateBiometric".equals(action)) {
                authenticateBiometric(args.optJSONObject(0), callbackContext);
                return true;
            }

            if ("requestDeviceLock".equals(action)) {
                requestDeviceLock(args.optJSONObject(0), callbackContext);
                return true;
            }

            if ("requestBackgroundExecution".equals(action)) {
                requestBackgroundExecution(args.optJSONObject(0), callbackContext);
                return true;
            }

            if ("setAutoStartOnBoot".equals(action)) {
                setAutoStartOnBoot(args.optJSONObject(0), callbackContext);
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
        if (requestCode == REQUEST_CONTACTS) {
            if (contactsPermissionCallback != null) {
                boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
                try {
                    JSONObject result = new JSONObject();
                    result.put("requested", true);
                    result.put("granted", granted);
                    if (!granted && shouldOpenSettingsForRuntimePermission(android.Manifest.permission.READ_CONTACTS)) {
                        result = openSettingsForRuntimePermission(android.Manifest.permission.READ_CONTACTS, true, true);
                        result.put("requested", true);
                        result.put("granted", false);
                    }
                    contactsPermissionCallback.success(result);
                } catch (Exception e) {
                    contactsPermissionCallback.error(e.getMessage());
                }
                contactsPermissionCallback = null;
            }
            return;
        }
        
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

        if (requestCode == REQUEST_BLUETOOTH) {
            continuePendingBluetoothAfterPermission(grantResults);
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
        if (requestCode == REQUEST_INSTALL_PACKAGE_PICK) {
            handleInstallPackagePickResult(resultCode, intent);
            return;
        }

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

        if (requestCode == REQUEST_SPEECH_RECOGNITION) {
            handleSpeechRecognitionResult(resultCode, intent);
            return;
        }

        if (requestCode == REQUEST_CAPTURE_PHOTO || requestCode == REQUEST_CAPTURE_VIDEO) {
            handleMediaCaptureResult(resultCode, intent);
            return;
        }

        if (requestCode == REQUEST_DEVICE_CREDENTIAL) {
            handleDeviceCredentialResult(resultCode);
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

    private java.io.File findMostSimilarFile(java.io.File dir, String query) {
        if (!dir.exists() || !dir.isDirectory()) return null;
        java.io.File[] files = dir.listFiles();
        if (files == null) return null;
        
        String q = query.toLowerCase();
        
        // 1. Exact match
        for (java.io.File f : files) {
            if (f.getName().equalsIgnoreCase(query)) return f;
        }
        
        // 2. Contains match (prioritize smallest length difference)
        java.io.File bestMatch = null;
        int bestDiff = Integer.MAX_VALUE;
        for (java.io.File f : files) {
            String name = f.getName().toLowerCase();
            if (name.contains(q)) {
                int diff = Math.abs(name.length() - q.length());
                if (diff < bestDiff) {
                    bestDiff = diff;
                    bestMatch = f;
                }
            }
        }
        
        return bestMatch;
    }

    private android.content.pm.PackageInfo findMostSimilarPackage(String query) {
        android.content.pm.PackageManager pm = cordova.getActivity().getPackageManager();
        try {
            // 1. Exact match
            return pm.getPackageInfo(query, 0);
        } catch (android.content.pm.PackageManager.NameNotFoundException e) {
            // Fuzzy search below
        }

        String q = query.toLowerCase();
        java.util.List<android.content.pm.PackageInfo> packages = pm.getInstalledPackages(0);
        android.content.pm.PackageInfo bestMatch = null;
        int bestDiff = Integer.MAX_VALUE;

        for (android.content.pm.PackageInfo info : packages) {
            String pkgName = info.packageName.toLowerCase();
            CharSequence appLabelSeq = pm.getApplicationLabel(info.applicationInfo);
            String appName = appLabelSeq != null ? appLabelSeq.toString().toLowerCase() : "";

            if (pkgName.contains(q) || appName.contains(q)) {
                int diff = Math.min(
                    pkgName.contains(q) ? Math.abs(pkgName.length() - q.length()) : Integer.MAX_VALUE,
                    appName.contains(q) ? Math.abs(appName.length() - q.length()) : Integer.MAX_VALUE
                );
                
                if (diff < bestDiff) {
                    bestDiff = diff;
                    bestMatch = info;
                }
            }
        }
        
        return bestMatch;
    }

    private JSONObject storagePermissionStatus() throws Exception {
        JSONObject result = new JSONObject();
        result.put("permission", "android.permission.MANAGE_EXTERNAL_STORAGE");
        
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
            result.put("granted", android.os.Environment.isExternalStorageManager());
            result.put("permissionGranted", android.os.Environment.isExternalStorageManager());
            result.put("requiresSettings", true);
        } else {
            boolean granted = cordova.hasPermission(android.Manifest.permission.READ_EXTERNAL_STORAGE) && cordova.hasPermission(android.Manifest.permission.WRITE_EXTERNAL_STORAGE);
            result.put("granted", granted);
            result.put("permissionGranted", granted);
            result.put("requiresSettings", false);
        }
        return result;
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
        startFloatingIcon(new JSONObject());
    }

    private void startFloatingIcon(JSONObject options) throws Exception {
        if (!canDrawOverlays()) {
            openOverlaySettings();
            throw new Exception("SYSTEM_ALERT_WINDOW permission is not granted.");
        }

        double opacity = floatingIconOpacity(options);
        Intent intent = new Intent(context(), FloatingIconService.class);
        intent.putExtra("opacity", (float) opacity);
        context().startService(intent);
    }

    private void stopFloatingIcon() {
        Intent intent = new Intent(context(), FloatingIconService.class);
        context().stopService(intent);
    }

    private JSONObject floatingIconStatus() throws Exception {
        JSONObject result = overlayPermissionStatus();
        double opacity = preferencesStore().getFloat(FLOATING_ICON_OPACITY_KEY, 1f);
        result.put("opacity", opacity);
        result.put("opacidade", opacity);
        return result;
    }

    private double floatingIconOpacity(JSONObject options) {
        double current = preferencesStore().getFloat(FLOATING_ICON_OPACITY_KEY, 1f);
        if (options == null) {
            return current;
        }

        Object raw = options.opt("opacity");
        if (raw == null || raw == JSONObject.NULL) {
            raw = options.opt("opacidade");
        }
        if (raw == null || raw == JSONObject.NULL) {
            return current;
        }

        double next = numberOrDefault(raw, current);
        if (next > 1 && next <= 100) {
            next = next / 100;
        }
        next = Math.max(0.1, Math.min(1, next));
        preferencesStore().edit().putFloat(FLOATING_ICON_OPACITY_KEY, (float) next).apply();
        return next;
    }

    private void captureScreen(final JSONObject options, final CallbackContext callbackContext) {
        cordova.getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    callbackContext.success(captureScreenOnUiThread(options == null ? new JSONObject() : options));
                } catch (Exception error) {
                    callbackContext.error(error.getMessage());
                }
            }
        });
    }

    private JSONObject captureScreenOnUiThread(JSONObject options) throws Exception {
        View root = cordova.getActivity().getWindow().getDecorView().getRootView();
        int width = root.getWidth();
        int height = root.getHeight();
        if (width <= 0 || height <= 0) {
            throw new Exception("Screen is not ready to capture.");
        }

        Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        try {
            Canvas canvas = new Canvas(bitmap);
            root.draw(canvas);

            String formatText = options.optString("formato", options.optString("format", "png")).toLowerCase(Locale.US);
            boolean jpeg = "jpg".equals(formatText) || "jpeg".equals(formatText);
            Bitmap.CompressFormat format = jpeg ? Bitmap.CompressFormat.JPEG : Bitmap.CompressFormat.PNG;
            String mimeType = jpeg ? "image/jpeg" : "image/png";
            int quality = Math.max(1, Math.min(100, options.optInt("qualidade", options.optInt("quality", jpeg ? 92 : 100))));
            bitmap.compress(format, quality, output);

            String base64 = Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP);
            JSONObject result = new JSONObject();
            result.put("ok", true);
            result.put("captured", true);
            result.put("capturado", true);
            result.put("width", width);
            result.put("largura", width);
            result.put("height", height);
            result.put("altura", height);
            result.put("format", jpeg ? "jpeg" : "png");
            result.put("formato", jpeg ? "jpeg" : "png");
            result.put("mimeType", mimeType);
            result.put("base64", base64);
            result.put("dataUrl", "data:" + mimeType + ";base64," + base64);
            return result;
        } finally {
            bitmap.recycle();
            try {
                output.close();
            } catch (Exception ignored) {
            }
        }
    }

    private void minimizeApp(final CallbackContext callbackContext) {
        cordova.getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    JSONObject result = new JSONObject();
                    result.put("minimized", true);
                    result.put("minimizado", true);
                    callbackContext.success(result);
                    cordova.getActivity().moveTaskToBack(true);
                } catch (Exception error) {
                    callbackContext.error(error.getMessage());
                }
            }
        });
    }

    private void closeApp(final CallbackContext callbackContext) {
        cordova.getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    JSONObject result = new JSONObject();
                    result.put("closed", true);
                    result.put("fechado", true);
                    callbackContext.success(result);
                    new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
                        @Override
                        public void run() {
                            Activity activity = cordova.getActivity();
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                                activity.finishAndRemoveTask();
                            } else {
                                activity.finish();
                            }
                        }
                    }, 120);
                } catch (Exception error) {
                    callbackContext.error(error.getMessage());
                }
            }
        });
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

    private JSONObject share(JSONObject options) throws Exception {
        JSONObject safeOptions = options == null ? new JSONObject() : options;
        String text = safeOptions.optString("texto", safeOptions.optString("text", ""));
        String url = safeOptions.optString("url", "");
        String title = safeOptions.optString("titulo", safeOptions.optString("title", "Compartilhar"));
        StringBuilder content = new StringBuilder();
        ArrayList<Uri> streams = shareStreamsFromOptions(safeOptions);
        String mimeType = shareMimeType(safeOptions, streams);
        if (text.length() > 0) {
            content.append(text);
        }
        if (url.length() > 0) {
            if (content.length() > 0) {
                content.append("\n");
            }
            content.append(url);
        }

        Intent intent = new Intent(streams.size() > 1 ? Intent.ACTION_SEND_MULTIPLE : Intent.ACTION_SEND);
        intent.setType(mimeType);
        if (content.length() > 0) {
            intent.putExtra(Intent.EXTRA_TEXT, content.toString());
        }
        intent.putExtra(Intent.EXTRA_TITLE, title);
        if (streams.size() == 1) {
            intent.putExtra(Intent.EXTRA_STREAM, streams.get(0));
            intent.setClipData(ClipData.newRawUri("File", streams.get(0)));
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        } else if (streams.size() > 1) {
            intent.putParcelableArrayListExtra(Intent.EXTRA_STREAM, streams);
            ClipData clipData = ClipData.newRawUri("Files", streams.get(0));
            for (int i = 1; i < streams.size(); i++) {
                clipData.addItem(new ClipData.Item(streams.get(i)));
            }
            intent.setClipData(clipData);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        }

        List<android.content.pm.ResolveInfo> resInfoList = context().getPackageManager().queryIntentActivities(intent, android.content.pm.PackageManager.MATCH_DEFAULT_ONLY);
        for (android.content.pm.ResolveInfo resolveInfo : resInfoList) {
            String packageName = resolveInfo.activityInfo.packageName;
            for (Uri u : streams) {
                context().grantUriPermission(packageName, u, Intent.FLAG_GRANT_READ_URI_PERMISSION);
            }
        }

        Intent chooser = Intent.createChooser(intent, title);
        chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.JELLY_BEAN) {
            chooser.setClipData(intent.getClipData());
        }
        cordova.getActivity().startActivity(chooser);

        JSONObject result = new JSONObject();
        result.put("ok", true);
        result.put("shared", true);
        result.put("compartilhado", true);
        result.put("items", streams.size());
        result.put("itens", streams.size());
        result.put("mimeType", mimeType);
        return result;
    }

    private ArrayList<Uri> shareStreamsFromOptions(JSONObject options) throws Exception {
        ArrayList<Uri> streams = new ArrayList<Uri>();
        appendShareValue(streams, options.opt("arquivo"));
        appendShareValue(streams, options.opt("file"));
        appendShareValue(streams, options.opt("anexo"));
        appendShareValue(streams, options.opt("attachment"));
        appendShareValue(streams, options.opt("uri"));
        appendShareValue(streams, options.opt("uris"));
        appendShareValue(streams, options.opt("arquivos"));
        appendShareValue(streams, options.opt("files"));
        appendShareValue(streams, options.opt("anexos"));
        appendShareValue(streams, options.opt("attachments"));
        return streams;
    }

    private void appendShareValue(ArrayList<Uri> streams, Object value) throws Exception {
        if (value == null || value == JSONObject.NULL) {
            return;
        }
        if (value instanceof JSONArray) {
            JSONArray array = (JSONArray) value;
            for (int index = 0; index < array.length(); index += 1) {
                appendShareValue(streams, array.opt(index));
            }
            return;
        }
        if (value instanceof JSONObject) {
            Uri uri = uriFromFileLikeObject((JSONObject) value);
            if (uri != null) {
                streams.add(uri);
            }
            return;
        }
        Uri uri = uriFromFileLikeString(String.valueOf(value));
        if (uri != null) {
            streams.add(uri);
        }
    }

    private Uri uriFromFileLikeObject(JSONObject object) throws Exception {
        String uriText = object.optString("uri",
            object.optString("contentUri",
                object.optString("url", "")));
        if (uriText.length() > 0 && (uriText.startsWith("content://") || uriText.startsWith("file://"))) {
            return Uri.parse(uriText);
        }

        String pathText = object.optString("caminho", object.optString("path", ""));
        if (pathText.length() > 0) {
            File file = new File(pathText);
            if (file.exists() && file.isFile()) {
                return fileProviderUri(file);
            }
        }

        String name = object.optString("nome",
            object.optString("name",
                object.optString("fileName",
                    object.optString("nomeArquivo", ""))));
        if (name.length() > 0) {
            File stored = storedFile(name);
            if (stored.exists() && stored.isFile()) {
                return fileProviderUri(stored);
            }
        }
        return null;
    }

    private Uri uriFromFileLikeString(String value) throws Exception {
        String text = value == null ? "" : value.trim();
        if (text.length() == 0) {
            return null;
        }
        if (text.startsWith("content://") || text.startsWith("file://")) {
            return Uri.parse(text);
        }
        try {
            File stored = storedFile(text);
            if (stored.exists() && stored.isFile()) {
                return fileProviderUri(stored);
            }
        } catch (Exception ignored) {
        }
        File file = new File(text);
        if (file.exists() && file.isFile()) {
            return fileProviderUri(file);
        }
        return null;
    }

    private String shareMimeType(JSONObject options, ArrayList<Uri> streams) {
        String explicit = options.optString("mimeType", options.optString("tipoMime", ""));
        if (explicit.length() > 0) {
            return explicit;
        }
        if (streams.size() == 0) {
            return "text/plain";
        }
        if (streams.size() > 1) {
            return "*/*";
        }
        String resolved = context().getContentResolver().getType(streams.get(0));
        return resolved == null || resolved.length() == 0 ? "*/*" : resolved;
    }

    private void scanBluetooth(JSONObject options, CallbackContext callbackContext) {
        JSONObject safeOptions = options == null ? new JSONObject() : options;
        if (!hasBluetoothPermission(true)) {
            requestBluetoothPermission("scan", "", safeOptions, callbackContext, true);
            return;
        }
        if (bluetoothDiscoveryCallback != null) {
            rejectBusyCallback(callbackContext, "Bluetooth discovery");
            return;
        }

        try {
            final BluetoothAdapter adapter = bluetoothAdapter();
            if (!adapter.isEnabled()) {
                callbackContext.error("Bluetooth is disabled.");
                return;
            }

            bluetoothDiscoveredDevices.clear();
            addBondedBluetoothDevices(adapter);
            registerBluetoothDiscoveryReceiver();
            bluetoothDiscoveryCallback = callbackContext;

            long timeoutMs = Math.max(3000, safeOptions.optLong("timeoutMs", safeOptions.optLong("tempoMs", 12000)));
            bluetoothDiscoveryTimeout = new Handler(Looper.getMainLooper());
            bluetoothDiscoveryTimeout.postDelayed(new Runnable() {
                @Override
                public void run() {
                    finishBluetoothDiscovery();
                }
            }, timeoutMs);

            try {
                if (adapter.isDiscovering()) {
                    adapter.cancelDiscovery();
                }
            } catch (Exception ignored) {
            }

            if (!adapter.startDiscovery()) {
                finishBluetoothDiscovery();
            }
        } catch (Exception error) {
            bluetoothDiscoveryCallback = null;
            unregisterBluetoothDiscoveryReceiver();
            callbackContext.error(error.getMessage());
        }
    }

    private void connectBluetooth(final String deviceId, final CallbackContext callbackContext) {
        final String address = deviceId == null ? "" : deviceId.trim();
        if (address.length() == 0) {
            callbackContext.error("Bluetooth device id is required.");
            return;
        }
        if (!hasBluetoothPermission(false)) {
            requestBluetoothPermission("connect", address, new JSONObject(), callbackContext, false);
            return;
        }

        cordova.getThreadPool().execute(new Runnable() {
            @Override
            public void run() {
                try {
                    BluetoothAdapter adapter = bluetoothAdapter();
                    if (!adapter.isEnabled()) {
                        callbackContext.error("Bluetooth is disabled.");
                        return;
                    }
                    try {
                        adapter.cancelDiscovery();
                    } catch (Exception ignored) {
                    }
                    BluetoothDevice device = adapter.getRemoteDevice(address);
                    BluetoothSocket socket = device.createRfcommSocketToServiceRecord(BLUETOOTH_UUID);
                    socket.connect();
                    JSONObject info = bindBluetoothSocket(socket, false);
                    callbackContext.success(info);
                } catch (Exception error) {
                    callbackContext.error(error.getMessage());
                }
            }
        });
    }

    private void sendBluetooth(Object data, final CallbackContext callbackContext) {
        if (!hasBluetoothPermission(false)) {
            JSONObject pending = new JSONObject();
            try {
                pending.put("dados", data == null ? JSONObject.NULL : data);
            } catch (Exception ignored) {
            }
            requestBluetoothPermission("send", "", pending, callbackContext, false);
            return;
        }

        final Object payload = data == null ? JSONObject.NULL : data;
        cordova.getThreadPool().execute(new Runnable() {
            @Override
            public void run() {
                try {
                    if (activeBluetoothConnections.isEmpty()) {
                        callbackContext.error("Bluetooth is not connected.");
                        return;
                    }

                    JSONObject message = new JSONObject();
                    message.put("dados", payload);
                    message.put("data", payload);
                    message.put("timestamp", System.currentTimeMillis());
                    byte[] bytes = (message.toString() + "\n").getBytes("UTF-8");

                    int sentCount = 0;
                    synchronized (Html2ApkBridge.this) {
                        for (BluetoothConnection conn : activeBluetoothConnections.values()) {
                            try {
                                conn.outputStream.write(bytes);
                                conn.outputStream.flush();
                                sentCount++;
                            } catch (Exception ignored) {
                            }
                        }
                    }

                    if (sentCount == 0) {
                        callbackContext.error("Failed to send data to any connected device.");
                        return;
                    }

                    JSONObject result = new JSONObject();
                    result.put("ok", true);
                    result.put("sent", true);
                    result.put("enviado", true);
                    result.put("bytes", bytes.length);
                    result.put("receivers", sentCount);
                    callbackContext.success(result);
                } catch (Exception error) {
                    callbackContext.error(error.getMessage());
                }
            }
        });
    }

    private void startBluetoothServerWithPermission(CallbackContext callbackContext) {
        if (!hasBluetoothPermission(false)) {
            requestBluetoothPermission("server", "", new JSONObject(), callbackContext, false);
            return;
        }
        try {
            callbackContext.success(startBluetoothServer());
        } catch (Exception error) {
            callbackContext.error(error.getMessage());
        }
    }

    private JSONObject startBluetoothServer() throws Exception {
        final BluetoothAdapter adapter = bluetoothAdapter();
        if (!adapter.isEnabled()) {
            throw new Exception("Bluetooth is disabled.");
        }
        synchronized (this) {
            if (bluetoothServerRunning) {
                return bluetoothServerStatus(true);
            }
            bluetoothServerSocket = adapter.listenUsingRfcommWithServiceRecord("html2apk", BLUETOOTH_UUID);
            bluetoothServerRunning = true;
        }

        bluetoothServerThread = new Thread(new Runnable() {
            @Override
            public void run() {
                while (bluetoothServerRunning) {
                    try {
                        BluetoothServerSocket server;
                        synchronized (Html2ApkBridge.this) {
                            server = bluetoothServerSocket;
                        }
                        if (server == null) {
                            return;
                        }
                        BluetoothSocket socket = server.accept();
                        if (socket != null) {
                            try {
                                bindBluetoothSocket(socket, true);
                            } catch (Exception e) {
                                dispatchBluetoothError("Falha ao aceitar conexão: " + e.getMessage());
                            }
                        }
                    } catch (Exception error) {
                        if (bluetoothServerRunning) {
                            dispatchBluetoothError(error.getMessage());
                        }
                        return;
                    }
                }
            }
        }, "html2apk-bluetooth-server");
        bluetoothServerThread.start();
        return bluetoothServerStatus(true);
    }

    private JSONObject bluetoothServerStatus(boolean started) throws Exception {
        JSONObject result = new JSONObject();
        result.put("ok", true);
        result.put("started", started);
        result.put("iniciado", started);
        result.put("listening", bluetoothServerRunning);
        result.put("escutando", bluetoothServerRunning);
        result.put("uuid", BLUETOOTH_UUID.toString());
        return result;
    }

    private BluetoothAdapter bluetoothAdapter() throws Exception {
        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
        if (adapter == null) {
            throw new Exception("Bluetooth is not available on this device.");
        }
        return adapter;
    }

    private boolean hasBluetoothPermission(boolean scan) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (ContextCompat.checkSelfPermission(context(), Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                return false;
            }
            return !scan || ContextCompat.checkSelfPermission(context(), Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED;
        }
        return !scan || Build.VERSION.SDK_INT < Build.VERSION_CODES.M
            || ContextCompat.checkSelfPermission(context(), Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private String[] bluetoothPermissions(boolean scan) {
        ArrayList<String> permissions = new ArrayList<String>();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            permissions.add(Manifest.permission.BLUETOOTH_CONNECT);
            if (scan) {
                permissions.add(Manifest.permission.BLUETOOTH_SCAN);
            }
        } else if (scan && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            permissions.add(Manifest.permission.ACCESS_FINE_LOCATION);
        }
        return permissions.toArray(new String[permissions.size()]);
    }

    private void requestBluetoothPermission(String action, String deviceId, JSONObject payload, CallbackContext callbackContext, boolean scan) {
        String[] permissions = bluetoothPermissions(scan);
        if (permissions.length == 0) {
            callbackContext.error("Bluetooth permission is not available.");
            return;
        }
        if (pendingBluetoothCallback != null) {
            rejectBusyCallback(callbackContext, "Bluetooth permission");
            return;
        }
        pendingBluetoothAction = action;
        pendingBluetoothDeviceId = deviceId;
        pendingBluetoothPayload = payload == null ? new JSONObject() : payload;
        pendingBluetoothCallback = callbackContext;
        for (String permission : permissions) {
            rememberRuntimePermissionRequest(permission);
        }
        cordova.requestPermissions(this, REQUEST_BLUETOOTH, permissions);
    }

    private void continuePendingBluetoothAfterPermission(int[] grantResults) {
        CallbackContext callback = pendingBluetoothCallback;
        String action = pendingBluetoothAction;
        String deviceId = pendingBluetoothDeviceId;
        JSONObject payload = pendingBluetoothPayload == null ? new JSONObject() : pendingBluetoothPayload;
        pendingBluetoothCallback = null;
        pendingBluetoothAction = null;
        pendingBluetoothDeviceId = null;
        pendingBluetoothPayload = null;

        if (callback == null) {
            return;
        }
        for (int result : grantResults) {
            if (result != PackageManager.PERMISSION_GRANTED) {
                callback.error("Bluetooth permission is not granted.");
                return;
            }
        }

        if ("scan".equals(action)) {
            scanBluetooth(payload, callback);
        } else if ("connect".equals(action)) {
            connectBluetooth(deviceId, callback);
        } else if ("send".equals(action)) {
            sendBluetooth(payload.opt("dados"), callback);
        } else if ("server".equals(action)) {
            startBluetoothServerWithPermission(callback);
        } else {
            callback.error("Unknown Bluetooth operation.");
        }
    }

    private void registerBluetoothDiscoveryReceiver() {
        unregisterBluetoothDiscoveryReceiver();
        bluetoothDiscoveryReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context receiverContext, Intent intent) {
                if (intent == null || intent.getAction() == null) {
                    return;
                }
                try {
                    if (BluetoothDevice.ACTION_FOUND.equals(intent.getAction())) {
                        BluetoothDevice device = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
                        addBluetoothDevice(device);
                    } else if (BluetoothAdapter.ACTION_DISCOVERY_FINISHED.equals(intent.getAction())) {
                        finishBluetoothDiscovery();
                    }
                } catch (Exception ignored) {
                }
            }
        };
        IntentFilter filter = new IntentFilter();
        filter.addAction(BluetoothDevice.ACTION_FOUND);
        filter.addAction(BluetoothAdapter.ACTION_DISCOVERY_FINISHED);
        ContextCompat.registerReceiver(context(), bluetoothDiscoveryReceiver, filter, ContextCompat.RECEIVER_EXPORTED);
    }

    private void unregisterBluetoothDiscoveryReceiver() {
        if (bluetoothDiscoveryReceiver == null) {
            return;
        }
        try {
            context().unregisterReceiver(bluetoothDiscoveryReceiver);
        } catch (Exception ignored) {
        }
        bluetoothDiscoveryReceiver = null;
    }

    private void finishBluetoothDiscovery() {
        CallbackContext callback = bluetoothDiscoveryCallback;
        bluetoothDiscoveryCallback = null;
        if (bluetoothDiscoveryTimeout != null) {
            bluetoothDiscoveryTimeout.removeCallbacksAndMessages(null);
            bluetoothDiscoveryTimeout = null;
        }
        try {
            BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
            if (adapter != null && adapter.isDiscovering()) {
                adapter.cancelDiscovery();
            }
        } catch (Exception ignored) {
        }
        unregisterBluetoothDiscoveryReceiver();
        if (callback != null) {
            callback.success(bluetoothDeviceList());
        }
    }

    private void addBondedBluetoothDevices(BluetoothAdapter adapter) {
        try {
            for (BluetoothDevice device : adapter.getBondedDevices()) {
                addBluetoothDevice(device);
            }
        } catch (Exception ignored) {
        }
    }

    private void addBluetoothDevice(BluetoothDevice device) throws Exception {
        if (device == null) {
            return;
        }
        JSONObject info = bluetoothDeviceInfo(device);
        String id = info.optString("id");
        if (id.length() > 0) {
            bluetoothDiscoveredDevices.put(id, info);
        }
    }

    private JSONArray bluetoothDeviceList() {
        JSONArray list = new JSONArray();
        for (JSONObject item : bluetoothDiscoveredDevices.values()) {
            list.put(item);
        }
        return list;
    }

    private JSONObject bluetoothDeviceInfo(BluetoothDevice device) throws Exception {
        JSONObject info = new JSONObject();
        String address = "";
        String name = "";
        int bondState = BluetoothDevice.BOND_NONE;
        int type = BluetoothDevice.DEVICE_TYPE_UNKNOWN;
        try {
            address = device.getAddress();
        } catch (Exception ignored) {
        }
        try {
            name = device.getName();
        } catch (Exception ignored) {
        }
        try {
            bondState = device.getBondState();
        } catch (Exception ignored) {
        }
        try {
            type = device.getType();
        } catch (Exception ignored) {
        }
        info.put("id", address);
        info.put("idDispositivo", address);
        info.put("address", address);
        info.put("endereco", address);
        info.put("name", name == null || name.length() == 0 ? address : name);
        info.put("nome", info.optString("name"));
        info.put("bonded", bondState == BluetoothDevice.BOND_BONDED);
        info.put("pareado", info.optBoolean("bonded"));
        info.put("type", type);
        info.put("tipo", type);
        return info;
    }

    private JSONObject bindBluetoothSocket(final BluetoothSocket socket, boolean incoming) throws Exception {
        JSONObject device = bluetoothDeviceInfo(socket.getRemoteDevice());
        device.put("connected", true);
        device.put("conectado", true);
        device.put("incoming", incoming);
        device.put("entrada", incoming);
        String id = device.optString("id");

        BluetoothConnection conn;
        synchronized (this) {
            conn = new BluetoothConnection(id, socket, socket.getOutputStream(), device);
            activeBluetoothConnections.put(id, conn);
        }
        startBluetoothReadThread(conn);
        dispatchEvent("bluetooth:conectado", device);
        return device;
    }

    private void startBluetoothReadThread(final BluetoothConnection conn) {
        conn.readThread = new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    BufferedReader reader = new BufferedReader(new InputStreamReader(conn.socket.getInputStream(), "UTF-8"));
                    String line;
                    while ((line = reader.readLine()) != null) {
                        JSONObject detail = new JSONObject();
                        Object data = parseBluetoothData(line);
                        detail.put("dados", data);
                        detail.put("data", data);
                        detail.put("raw", line);
                        detail.put("bruto", line);
                        detail.put("device", conn.device);
                        detail.put("dispositivo", conn.device);
                        detail.put("timestamp", System.currentTimeMillis());
                        dispatchEvent("bluetooth:dados", detail);
                    }
                } catch (Exception ignored) {
                } finally {
                    handleBluetoothDisconnected(conn.id, conn.device);
                }
            }
        }, "html2apk-bluetooth-read-" + conn.id);
        conn.readThread.start();
    }

    private Object parseBluetoothData(String line) {
        String text = line == null ? "" : line;
        try {
            JSONObject object = new JSONObject(text);
            if (object.has("dados")) {
                return object.opt("dados");
            }
            if (object.has("data")) {
                return object.opt("data");
            }
            return object;
        } catch (Exception ignored) {
        }
        try {
            return new JSONArray(text);
        } catch (Exception ignored) {
        }
        return text;
    }

    private void handleBluetoothDisconnected(String id, JSONObject device) {
        boolean wasCurrent = false;
        synchronized (this) {
            BluetoothConnection conn = activeBluetoothConnections.remove(id);
            if (conn != null) {
                closeConnectionLocked(conn);
                wasCurrent = true;
            }
        }
        if (wasCurrent) {
            try {
                JSONObject detail = device == null ? new JSONObject() : new JSONObject(device.toString());
                detail.put("connected", false);
                detail.put("conectado", false);
                detail.put("timestamp", System.currentTimeMillis());
                dispatchEvent("bluetooth:desconectado", detail);
            } catch (Exception ignored) {
            }
        }
    }

    private void dispatchBluetoothError(String message) {
        try {
            JSONObject detail = new JSONObject();
            detail.put("message", message == null ? "" : message);
            detail.put("mensagem", detail.optString("message"));
            detail.put("timestamp", System.currentTimeMillis());
            dispatchEvent("bluetooth:erro", detail);
        } catch (Exception ignored) {
        }
    }

    private void shutdownBluetooth() {
        bluetoothServerRunning = false;
        if (bluetoothDiscoveryCallback != null) {
            bluetoothDiscoveryCallback = null;
        }
        if (bluetoothDiscoveryTimeout != null) {
            bluetoothDiscoveryTimeout.removeCallbacksAndMessages(null);
            bluetoothDiscoveryTimeout = null;
        }
        unregisterBluetoothDiscoveryReceiver();
        try {
            BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
            if (adapter != null && adapter.isDiscovering()) {
                adapter.cancelDiscovery();
            }
        } catch (Exception ignored) {
        }
        synchronized (this) {
            closeAllBluetoothConnectionsLocked();
            if (bluetoothServerSocket != null) {
                try {
                    bluetoothServerSocket.close();
                } catch (Exception ignored) {
                }
                bluetoothServerSocket = null;
            }
        }
    }

    private void closeAllBluetoothConnectionsLocked() {
        for (BluetoothConnection conn : activeBluetoothConnections.values()) {
            closeConnectionLocked(conn);
        }
        activeBluetoothConnections.clear();
    }

    private void closeConnectionLocked(BluetoothConnection conn) {
        if (conn.outputStream != null) {
            try {
                conn.outputStream.close();
            } catch (Exception ignored) {
            }
        }
        if (conn.socket != null) {
            try {
                conn.socket.close();
            } catch (Exception ignored) {
            }
        }
    }
    private void scanWifi(JSONObject options, CallbackContext callbackContext) {
        JSONObject safeOptions = options == null ? new JSONObject() : options;
        if (wifiDiscoveryCallback != null) {
            rejectBusyCallback(callbackContext, "Wi-Fi discovery");
            return;
        }

        try {
            wifiDiscoveredDevices.clear();
            wifiDiscoveryCallback = callbackContext;
            acquireWifiMulticastLock();
            registerWifiDiscoveryListener();

            long timeoutMs = Math.max(3000, safeOptions.optLong("timeoutMs", safeOptions.optLong("tempoMs", 8000)));
            wifiDiscoveryTimeout = new Handler(Looper.getMainLooper());
            wifiDiscoveryTimeout.postDelayed(new Runnable() {
                @Override
                public void run() {
                    finishWifiDiscovery();
                }
            }, timeoutMs);

            nsdManager().discoverServices(WIFI_SERVICE_TYPE, NsdManager.PROTOCOL_DNS_SD, wifiDiscoveryListener);
        } catch (Exception error) {
            failWifiDiscovery(error.getMessage());
        }
    }

    private void connectWifi(final String deviceId, final CallbackContext callbackContext) {
        final String id = deviceId == null ? "" : deviceId.trim();
        if (id.length() == 0) {
            callbackContext.error("Wi-Fi device id is required.");
            return;
        }

        cordova.getThreadPool().execute(new Runnable() {
            @Override
            public void run() {
                try {
                    JSONObject endpoint = wifiEndpointFromId(id);
                    String host = endpoint.optString("host", endpoint.optString("ip", ""));
                    int port = endpoint.optInt("port", endpoint.optInt("porta", 0));
                    if (host.length() == 0 || port <= 0) {
                        callbackContext.error("Invalid Wi-Fi endpoint.");
                        return;
                    }

                    Socket socket = new Socket(host, port);
                    socket.setTcpNoDelay(true);
                    JSONObject info = bindWifiSocket(socket, false, endpoint);
                    callbackContext.success(info);
                } catch (Exception error) {
                    callbackContext.error(error.getMessage());
                }
            }
        });
    }

    private void sendWifi(Object data, final CallbackContext callbackContext) {
        final Object payload = data == null ? JSONObject.NULL : data;
        cordova.getThreadPool().execute(new Runnable() {
            @Override
            public void run() {
                try {
                    OutputStream output;
                    synchronized (Html2ApkBridge.this) {
                        output = wifiOutputStream;
                    }
                    if (output == null) {
                        callbackContext.error("Wi-Fi is not connected.");
                        return;
                    }

                    JSONObject message = new JSONObject();
                    message.put("dados", payload);
                    message.put("data", payload);
                    message.put("timestamp", System.currentTimeMillis());
                    byte[] bytes = (message.toString() + "\n").getBytes("UTF-8");
                    synchronized (Html2ApkBridge.this) {
                        output.write(bytes);
                        output.flush();
                    }

                    JSONObject result = new JSONObject();
                    result.put("ok", true);
                    result.put("sent", true);
                    result.put("enviado", true);
                    result.put("bytes", bytes.length);
                    callbackContext.success(result);
                } catch (Exception error) {
                    callbackContext.error(error.getMessage());
                }
            }
        });
    }

    private JSONObject startWifiServer() throws Exception {
        synchronized (this) {
            if (wifiServerRunning) {
                return wifiServerStatus(true);
            }
            wifiServerSocket = new ServerSocket(0);
            wifiServerPort = wifiServerSocket.getLocalPort();
            wifiServerRunning = true;
        }

        registerWifiService(wifiServerPort);
        wifiServerThread = new Thread(new Runnable() {
            @Override
            public void run() {
                while (wifiServerRunning) {
                    try {
                        ServerSocket server;
                        synchronized (Html2ApkBridge.this) {
                            server = wifiServerSocket;
                        }
                        if (server == null) {
                            return;
                        }
                        Socket socket = server.accept();
                        if (socket != null) {
                            socket.setTcpNoDelay(true);
                            bindWifiSocket(socket, true, null);
                        }
                    } catch (Exception error) {
                        if (wifiServerRunning) {
                            dispatchWifiError(error.getMessage());
                        }
                        return;
                    }
                }
            }
        }, "html2apk-wifi-server");
        wifiServerThread.start();
        return wifiServerStatus(true);
    }

    private JSONObject wifiServerStatus(boolean started) throws Exception {
        JSONObject result = new JSONObject();
        result.put("ok", true);
        result.put("started", started);
        result.put("iniciado", started);
        result.put("listening", wifiServerRunning);
        result.put("escutando", wifiServerRunning);
        result.put("serviceType", WIFI_SERVICE_TYPE);
        result.put("tipoServico", WIFI_SERVICE_TYPE);
        result.put("serviceName", wifiServiceName == null ? "" : wifiServiceName);
        result.put("nomeServico", result.optString("serviceName"));
        result.put("port", wifiServerPort);
        result.put("porta", wifiServerPort);
        return result;
    }

    private NsdManager nsdManager() throws Exception {
        NsdManager manager = (NsdManager) context().getSystemService(Context.NSD_SERVICE);
        if (manager == null) {
            throw new Exception("Network service discovery is not available on this device.");
        }
        return manager;
    }

    private void registerWifiService(int port) throws Exception {
        unregisterWifiService();
        wifiServiceName = wifiServiceNameBase();
        NsdServiceInfo serviceInfo = new NsdServiceInfo();
        serviceInfo.setServiceName(wifiServiceName);
        serviceInfo.setServiceType(WIFI_SERVICE_TYPE);
        serviceInfo.setPort(port);
        wifiRegistrationListener = new NsdManager.RegistrationListener() {
            @Override
            public void onServiceRegistered(NsdServiceInfo registeredServiceInfo) {
                wifiServiceName = registeredServiceInfo.getServiceName();
            }

            @Override
            public void onRegistrationFailed(NsdServiceInfo serviceInfo, int errorCode) {
                dispatchWifiError("Wi-Fi service registration failed: " + errorCode);
            }

            @Override
            public void onServiceUnregistered(NsdServiceInfo serviceInfo) {
            }

            @Override
            public void onUnregistrationFailed(NsdServiceInfo serviceInfo, int errorCode) {
            }
        };
        nsdManager().registerService(serviceInfo, NsdManager.PROTOCOL_DNS_SD, wifiRegistrationListener);
    }

    private String wifiServiceNameBase() {
        String packageName = context().getPackageName();
        String safeName = packageName == null ? "app" : packageName.replaceAll("[^A-Za-z0-9-]", "-");
        return "html2apk-" + safeName + "-" + System.currentTimeMillis();
    }

    private void unregisterWifiService() {
        if (wifiRegistrationListener == null) {
            return;
        }
        try {
            nsdManager().unregisterService(wifiRegistrationListener);
        } catch (Exception ignored) {
        }
        wifiRegistrationListener = null;
    }

    private void registerWifiDiscoveryListener() {
        unregisterWifiDiscoveryListener();
        wifiDiscoveryListener = new NsdManager.DiscoveryListener() {
            @Override
            public void onStartDiscoveryFailed(String serviceType, int errorCode) {
                failWifiDiscovery("Wi-Fi discovery failed: " + errorCode);
            }

            @Override
            public void onStopDiscoveryFailed(String serviceType, int errorCode) {
            }

            @Override
            public void onDiscoveryStarted(String serviceType) {
            }

            @Override
            public void onDiscoveryStopped(String serviceType) {
            }

            @Override
            public void onServiceFound(NsdServiceInfo serviceInfo) {
                if (serviceInfo == null || !WIFI_SERVICE_TYPE.equals(serviceInfo.getServiceType())) {
                    return;
                }
                String serviceName = serviceInfo.getServiceName();
                if (serviceName != null && serviceName.equals(wifiServiceName)) {
                    return;
                }
                resolveWifiService(serviceInfo);
            }

            @Override
            public void onServiceLost(NsdServiceInfo serviceInfo) {
            }
        };
    }

    private void resolveWifiService(final NsdServiceInfo serviceInfo) {
        try {
            nsdManager().resolveService(serviceInfo, new NsdManager.ResolveListener() {
                @Override
                public void onResolveFailed(NsdServiceInfo failedServiceInfo, int errorCode) {
                }

                @Override
                public void onServiceResolved(NsdServiceInfo resolvedServiceInfo) {
                    try {
                        addWifiDevice(resolvedServiceInfo);
                    } catch (Exception ignored) {
                    }
                }
            });
        } catch (Exception ignored) {
        }
    }

    private void unregisterWifiDiscoveryListener() {
        if (wifiDiscoveryListener == null) {
            return;
        }
        try {
            nsdManager().stopServiceDiscovery(wifiDiscoveryListener);
        } catch (Exception ignored) {
        }
        wifiDiscoveryListener = null;
    }

    private void finishWifiDiscovery() {
        CallbackContext callback = wifiDiscoveryCallback;
        wifiDiscoveryCallback = null;
        if (wifiDiscoveryTimeout != null) {
            wifiDiscoveryTimeout.removeCallbacksAndMessages(null);
            wifiDiscoveryTimeout = null;
        }
        unregisterWifiDiscoveryListener();
        releaseWifiMulticastLock();
        if (callback != null) {
            callback.success(wifiDeviceList());
        }
    }

    private void failWifiDiscovery(String message) {
        CallbackContext callback = wifiDiscoveryCallback;
        wifiDiscoveryCallback = null;
        if (wifiDiscoveryTimeout != null) {
            wifiDiscoveryTimeout.removeCallbacksAndMessages(null);
            wifiDiscoveryTimeout = null;
        }
        unregisterWifiDiscoveryListener();
        releaseWifiMulticastLock();
        if (callback != null) {
            callback.error(message == null ? "Wi-Fi discovery failed." : message);
        }
    }

    private void addWifiDevice(NsdServiceInfo serviceInfo) throws Exception {
        if (serviceInfo == null || serviceInfo.getHost() == null || serviceInfo.getPort() <= 0) {
            return;
        }
        JSONObject info = wifiDeviceInfo(serviceInfo);
        String id = info.optString("id");
        if (id.length() > 0) {
            wifiDiscoveredDevices.put(id, info);
        }
        String serviceName = info.optString("serviceName");
        if (serviceName.length() > 0) {
            wifiDiscoveredDevices.put(serviceName, info);
        }
    }

    private JSONArray wifiDeviceList() {
        JSONArray list = new JSONArray();
        Map<String, Boolean> seen = new HashMap<String, Boolean>();
        for (JSONObject item : wifiDiscoveredDevices.values()) {
            String id = item.optString("id");
            if (id.length() == 0 || seen.containsKey(id)) {
                continue;
            }
            seen.put(id, Boolean.TRUE);
            list.put(item);
        }
        return list;
    }

    private JSONObject wifiDeviceInfo(NsdServiceInfo serviceInfo) throws Exception {
        InetAddress host = serviceInfo.getHost();
        String address = host == null ? "" : host.getHostAddress();
        int port = serviceInfo.getPort();
        JSONObject info = new JSONObject();
        info.put("id", address + ":" + port);
        info.put("idDispositivo", info.optString("id"));
        info.put("host", address);
        info.put("ip", address);
        info.put("port", port);
        info.put("porta", port);
        info.put("name", serviceInfo.getServiceName());
        info.put("nome", serviceInfo.getServiceName());
        info.put("serviceName", serviceInfo.getServiceName());
        info.put("nomeServico", serviceInfo.getServiceName());
        info.put("serviceType", serviceInfo.getServiceType());
        info.put("tipoServico", serviceInfo.getServiceType());
        info.put("wifi", true);
        return info;
    }

    private JSONObject wifiEndpointFromId(String input) throws Exception {
        String id = input == null ? "" : input.trim();
        JSONObject known = wifiDiscoveredDevices.get(id);
        if (known != null) {
            return new JSONObject(known.toString());
        }

        int separator = id.lastIndexOf(":");
        if (separator <= 0 || separator >= id.length() - 1) {
            throw new Exception("Wi-Fi endpoint must be host:port.");
        }

        String host = id.substring(0, separator).replace("[", "").replace("]", "");
        int port = Integer.parseInt(id.substring(separator + 1));
        JSONObject endpoint = new JSONObject();
        endpoint.put("id", host + ":" + port);
        endpoint.put("idDispositivo", endpoint.optString("id"));
        endpoint.put("host", host);
        endpoint.put("ip", host);
        endpoint.put("port", port);
        endpoint.put("porta", port);
        endpoint.put("name", endpoint.optString("id"));
        endpoint.put("nome", endpoint.optString("name"));
        endpoint.put("wifi", true);
        return endpoint;
    }

    private JSONObject bindWifiSocket(final Socket socket, boolean incoming, JSONObject endpoint) throws Exception {
        JSONObject device = endpoint == null ? new JSONObject() : new JSONObject(endpoint.toString());
        String host = socket.getInetAddress() == null ? device.optString("host") : socket.getInetAddress().getHostAddress();
        int port = socket.getPort();
        if (!device.has("id")) {
            device.put("id", host + ":" + port);
            device.put("idDispositivo", device.optString("id"));
        }
        device.put("host", host);
        device.put("ip", host);
        device.put("port", device.optInt("port", port));
        device.put("porta", device.optInt("port"));
        device.put("name", device.optString("name", device.optString("id")));
        device.put("nome", device.optString("name"));
        device.put("connected", true);
        device.put("conectado", true);
        device.put("incoming", incoming);
        device.put("entrada", incoming);
        device.put("wifi", true);
        synchronized (this) {
            closeWifiConnectionLocked();
            wifiSocket = socket;
            wifiOutputStream = socket.getOutputStream();
        }
        startWifiReadThread(socket, device);
        dispatchEvent("wifi:conectado", device);
        return device;
    }

    private void startWifiReadThread(final Socket socket, final JSONObject device) {
        wifiReadThread = new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    BufferedReader reader = new BufferedReader(new InputStreamReader(socket.getInputStream(), "UTF-8"));
                    String line;
                    while ((line = reader.readLine()) != null) {
                        JSONObject detail = new JSONObject();
                        Object data = parseWifiData(line);
                        detail.put("dados", data);
                        detail.put("data", data);
                        detail.put("raw", line);
                        detail.put("bruto", line);
                        detail.put("device", device);
                        detail.put("dispositivo", device);
                        detail.put("timestamp", System.currentTimeMillis());
                        dispatchEvent("wifi:dados", detail);
                    }
                } catch (Exception ignored) {
                } finally {
                    handleWifiDisconnected(socket, device);
                }
            }
        }, "html2apk-wifi-read");
        wifiReadThread.start();
    }

    private Object parseWifiData(String line) {
        String text = line == null ? "" : line;
        try {
            JSONObject object = new JSONObject(text);
            if (object.has("dados")) {
                return object.opt("dados");
            }
            if (object.has("data")) {
                return object.opt("data");
            }
            return object;
        } catch (Exception ignored) {
        }
        try {
            return new JSONArray(text);
        } catch (Exception ignored) {
        }
        return text;
    }

    private void handleWifiDisconnected(Socket socket, JSONObject device) {
        boolean wasCurrent = false;
        synchronized (this) {
            if (socket == wifiSocket) {
                closeWifiConnectionLocked();
                wasCurrent = true;
            }
        }
        if (wasCurrent) {
            try {
                JSONObject detail = device == null ? new JSONObject() : new JSONObject(device.toString());
                detail.put("connected", false);
                detail.put("conectado", false);
                detail.put("timestamp", System.currentTimeMillis());
                dispatchEvent("wifi:desconectado", detail);
            } catch (Exception ignored) {
            }
        }
    }

    private void dispatchWifiError(String message) {
        try {
            JSONObject detail = new JSONObject();
            detail.put("message", message == null ? "" : message);
            detail.put("mensagem", detail.optString("message"));
            detail.put("timestamp", System.currentTimeMillis());
            dispatchEvent("wifi:erro", detail);
        } catch (Exception ignored) {
        }
    }

    private void acquireWifiMulticastLock() {
        try {
            WifiManager manager = (WifiManager) context().getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            if (manager == null) {
                return;
            }
            if (wifiMulticastLock == null) {
                wifiMulticastLock = manager.createMulticastLock("html2apk-wifi-discovery");
                wifiMulticastLock.setReferenceCounted(false);
            }
            if (!wifiMulticastLock.isHeld()) {
                wifiMulticastLock.acquire();
            }
        } catch (Exception ignored) {
        }
    }

    private void releaseWifiMulticastLock() {
        try {
            if (wifiMulticastLock != null && wifiMulticastLock.isHeld()) {
                wifiMulticastLock.release();
            }
        } catch (Exception ignored) {
        }
    }

    private void shutdownWifi() {
        wifiServerRunning = false;
        wifiDiscoveryCallback = null;
        if (wifiDiscoveryTimeout != null) {
            wifiDiscoveryTimeout.removeCallbacksAndMessages(null);
            wifiDiscoveryTimeout = null;
        }
        unregisterWifiDiscoveryListener();
        unregisterWifiService();
        releaseWifiMulticastLock();
        synchronized (this) {
            closeWifiConnectionLocked();
            if (wifiServerSocket != null) {
                try {
                    wifiServerSocket.close();
                } catch (Exception ignored) {
                }
                wifiServerSocket = null;
            }
        }
    }

    private void closeWifiConnectionLocked() {
        if (wifiOutputStream != null) {
            try {
                wifiOutputStream.close();
            } catch (Exception ignored) {
            }
            wifiOutputStream = null;
        }
        if (wifiSocket != null) {
            try {
                wifiSocket.close();
            } catch (Exception ignored) {
            }
            wifiSocket = null;
        }
    }

    private void runOcr(JSONObject options, final CallbackContext callbackContext) {
        final JSONObject safeOptions = options == null ? new JSONObject() : options;
        cordova.getThreadPool().execute(new Runnable() {
            @Override
            public void run() {
                final TextRecognizer recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
                try {
                    InputImage image = inputImageFromOptions(safeOptions);
                    recognizer.process(image)
                        .addOnSuccessListener(new com.google.android.gms.tasks.OnSuccessListener<Text>() {
                            @Override
                            public void onSuccess(Text text) {
                                try {
                                    callbackContext.success(ocrResult(text));
                                } catch (Exception error) {
                                    callbackContext.error(error.getMessage());
                                } finally {
                                    recognizer.close();
                                }
                            }
                        })
                        .addOnFailureListener(new com.google.android.gms.tasks.OnFailureListener() {
                            @Override
                            public void onFailure(Exception error) {
                                recognizer.close();
                                callbackContext.error(error.getMessage());
                            }
                        });
                } catch (Exception error) {
                    recognizer.close();
                    callbackContext.error(error.getMessage());
                }
            }
        });
    }

    private InputImage inputImageFromOptions(JSONObject options) throws Exception {
        String uriText = options.optString("uri",
            options.optString("contentUri",
                options.optString("url", "")));
        if (uriText.startsWith("content://") || uriText.startsWith("file://")) {
            return InputImage.fromFilePath(context(), Uri.parse(uriText));
        }

        String pathText = options.optString("caminho", options.optString("path", ""));
        if (pathText.length() > 0) {
            return InputImage.fromFilePath(context(), Uri.fromFile(new File(pathText)));
        }

        String name = options.optString("nome",
            options.optString("name",
                options.optString("fileName",
                    options.optString("nomeArquivo", ""))));
        if (name.length() > 0) {
            File file = storedFile(name);
            if (file.exists() && file.isFile()) {
                return InputImage.fromFilePath(context(), Uri.fromFile(file));
            }
        }

        String base64 = options.optString("base64",
            options.optString("dataUrl",
                options.optString("data", "")));
        if (base64.length() > 0) {
            byte[] bytes = Base64.decode(stripDataUrlBase64(base64), Base64.DEFAULT);
            Bitmap bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
            if (bitmap == null) {
                throw new Exception("Could not decode OCR image.");
            }
            return InputImage.fromBitmap(bitmap, 0);
        }

        throw new Exception("OCR image source is required.");
    }

    private JSONObject ocrResult(Text text) throws Exception {
        JSONObject result = new JSONObject();
        result.put("texto", text == null ? "" : text.getText());
        result.put("text", result.optString("texto"));
        result.put("offline", true);
        result.put("local", true);
        JSONArray blocks = new JSONArray();
        if (text != null) {
            for (Text.TextBlock block : text.getTextBlocks()) {
                JSONObject blockJson = new JSONObject();
                blockJson.put("texto", block.getText());
                blockJson.put("text", block.getText());
                blocks.put(blockJson);
            }
        }
        result.put("blocks", blocks);
        result.put("blocos", blocks);
        return result;
    }

    private void speakText(final String text, final JSONObject options, final CallbackContext callbackContext) {
        final JSONObject safeOptions = options == null ? new JSONObject() : options;
        if (text == null || text.trim().length() == 0) {
            callbackContext.error("Text is required.");
            return;
        }
        if (textToSpeechReady && textToSpeech != null) {
            speakWithReadyEngine(text, safeOptions, callbackContext);
            return;
        }
        if (pendingSpeakCallback != null) {
            rejectBusyCallback(callbackContext, "Text to speech");
            return;
        }

        pendingSpeakText = text;
        pendingSpeakOptions = safeOptions;
        pendingSpeakCallback = callbackContext;
        cordova.getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (textToSpeech == null) {
                    textToSpeech = new TextToSpeech(context(), new TextToSpeech.OnInitListener() {
                        @Override
                        public void onInit(int status) {
                            handleTextToSpeechReady(status);
                        }
                    });
                }
            }
        });
    }

    private void handleTextToSpeechReady(int status) {
        CallbackContext callback = pendingSpeakCallback;
        String text = pendingSpeakText;
        JSONObject options = pendingSpeakOptions == null ? new JSONObject() : pendingSpeakOptions;
        pendingSpeakCallback = null;
        pendingSpeakText = null;
        pendingSpeakOptions = null;

        if (callback == null) {
            return;
        }
        if (status != TextToSpeech.SUCCESS || textToSpeech == null) {
            callback.error("Text to speech is not available.");
            return;
        }

        textToSpeechReady = true;
        speakWithReadyEngine(text, options, callback);
    }

    private void speakWithReadyEngine(String text, JSONObject options, CallbackContext callbackContext) {
        try {
            Locale locale = localeFromOptions(options);
            int languageResult = textToSpeech.setLanguage(locale);
            if (languageResult == TextToSpeech.LANG_MISSING_DATA || languageResult == TextToSpeech.LANG_NOT_SUPPORTED) {
                callbackContext.error("TTS language is not supported: " + locale.toLanguageTag());
                return;
            }
            float speed = (float) Math.max(0.1, Math.min(3.0, options.optDouble("velocidade", options.optDouble("speed", options.optDouble("rate", 1.0)))));
            float pitch = (float) Math.max(0.1, Math.min(3.0, options.optDouble("tom", options.optDouble("pitch", 1.0))));
            textToSpeech.setSpeechRate(speed);
            textToSpeech.setPitch(pitch);

            String utteranceId = "html2apk-tts-" + System.currentTimeMillis();
            int speakResult = textToSpeech.speak(text, TextToSpeech.QUEUE_FLUSH, null, utteranceId);
            if (speakResult == TextToSpeech.ERROR) {
                callbackContext.error("Text to speech failed.");
                return;
            }

            JSONObject result = new JSONObject();
            result.put("ok", true);
            result.put("speaking", true);
            result.put("falando", true);
            result.put("idioma", locale.toLanguageTag());
            result.put("language", locale.toLanguageTag());
            result.put("velocidade", speed);
            result.put("speed", speed);
            callbackContext.success(result);
        } catch (Exception error) {
            callbackContext.error(error.getMessage());
        }
    }

    private JSONObject stopSpeaking() throws Exception {
        boolean stopped = false;
        if (textToSpeech != null) {
            textToSpeech.stop();
            stopped = true;
        }
        JSONObject result = new JSONObject();
        result.put("ok", true);
        result.put("stopped", stopped);
        result.put("parado", stopped);
        return result;
    }

    private void shutdownTextToSpeech() {
        if (textToSpeech == null) {
            return;
        }
        try {
            textToSpeech.stop();
            textToSpeech.shutdown();
        } catch (Exception ignored) {
        }
        textToSpeech = null;
        textToSpeechReady = false;
    }

    private Locale localeFromOptions(JSONObject options) {
        String language = options.optString("idioma",
            options.optString("language",
                options.optString("locale", "")));
        if (language.length() == 0 || "auto".equalsIgnoreCase(language)) {
            return Locale.getDefault();
        }
        return Locale.forLanguageTag(language.replace('_', '-'));
    }

    private void recognizeSpeech(JSONObject options, CallbackContext callbackContext) {
        if (speechRecognitionCallback != null) {
            rejectBusyCallback(callbackContext, "Speech recognition");
            return;
        }
        JSONObject safeOptions = options == null ? new JSONObject() : options;
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, Math.max(1, safeOptions.optInt("maxResultados", safeOptions.optInt("maxResults", 5))));
        String prompt = safeOptions.optString("prompt", safeOptions.optString("titulo", safeOptions.optString("title", "")));
        if (prompt.length() > 0) {
            intent.putExtra(RecognizerIntent.EXTRA_PROMPT, prompt);
        }
        String language = safeOptions.optString("idioma", safeOptions.optString("language", ""));
        if (language.length() > 0 && !"auto".equalsIgnoreCase(language)) {
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, language);
        }
        if (intent.resolveActivity(context().getPackageManager()) == null) {
            callbackContext.error("Speech recognition is not available on this device.");
            return;
        }
        speechRecognitionCallback = callbackContext;
        cordova.startActivityForResult(this, intent, REQUEST_SPEECH_RECOGNITION);
    }

    private void handleSpeechRecognitionResult(int resultCode, Intent intent) {
        CallbackContext callback = speechRecognitionCallback;
        speechRecognitionCallback = null;
        if (callback == null) {
            return;
        }
        try {
            JSONObject result = new JSONObject();
            if (resultCode != Activity.RESULT_OK || intent == null) {
                result.put("texto", "");
                result.put("text", "");
                result.put("canceled", true);
                result.put("cancelado", true);
                callback.success(result);
                return;
            }

            ArrayList<String> matches = intent.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
            JSONArray items = new JSONArray();
            if (matches != null) {
                for (String match : matches) {
                    items.put(match);
                }
            }
            String first = matches != null && matches.size() > 0 ? matches.get(0) : "";
            result.put("texto", first);
            result.put("text", first);
            result.put("resultados", items);
            result.put("results", items);
            result.put("canceled", false);
            result.put("cancelado", false);

            float[] confidence = intent.getFloatArrayExtra(RecognizerIntent.EXTRA_CONFIDENCE_SCORES);
            if (confidence != null && confidence.length > 0) {
                result.put("confidence", confidence[0]);
                result.put("confianca", confidence[0]);
            }
            callback.success(result);
        } catch (Exception error) {
            callback.error(error.getMessage());
        }
    }

    private JSONObject shareCurrentApp(JSONObject options) throws Exception {
        JSONObject safeOptions = options == null ? new JSONObject() : options;
        ApplicationInfo appInfo = context().getApplicationInfo();
        File sourceFile = new File(appInfo.sourceDir);
        if (!sourceFile.exists() || !sourceFile.isFile()) {
            throw new Exception("Current APK file was not found.");
        }

        String appLabel = String.valueOf(context().getPackageManager().getApplicationLabel(appInfo));
        if (appLabel == null || appLabel.trim().length() == 0) {
            appLabel = context().getPackageName();
        }

        String fileName = safeOptions.optString("nome",
            safeOptions.optString("name", sanitizeShareFileName(appLabel) + ".apk"));
        if (!fileName.toLowerCase().endsWith(".apk")) {
            fileName += ".apk";
        }

        File externalFiles = context().getExternalFilesDir(null);
        File shareDir = new File(externalFiles != null ? externalFiles : context().getCacheDir(), "html2apk-share");
        if (!shareDir.exists() && !shareDir.mkdirs()) {
            throw new Exception("Could not create share directory.");
        }

        File outputFile = new File(shareDir, sanitizeShareFileName(fileName));
        copyFile(sourceFile, outputFile);

        String title = safeOptions.optString("titulo",
            safeOptions.optString("title", "Compartilhar app"));
        String text = safeOptions.optString("texto",
            safeOptions.optString("text", appLabel));
        Uri uri = fileProviderUri(outputFile);

        Intent intent = new Intent(Intent.ACTION_SEND);
        intent.setType("application/vnd.android.package-archive");
        intent.putExtra(Intent.EXTRA_STREAM, uri);
        intent.setClipData(ClipData.newRawUri("APK", uri));
        intent.putExtra(Intent.EXTRA_TITLE, title);
        if (text.length() > 0) {
            intent.putExtra(Intent.EXTRA_TEXT, text);
        }
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        
        // Explicitly grant read permission to all possible target apps
        List<android.content.pm.ResolveInfo> resInfoList = context().getPackageManager().queryIntentActivities(intent, android.content.pm.PackageManager.MATCH_DEFAULT_ONLY);
        for (android.content.pm.ResolveInfo resolveInfo : resInfoList) {
            String packageName = resolveInfo.activityInfo.packageName;
            context().grantUriPermission(packageName, uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
        }

        Intent chooser = Intent.createChooser(intent, title);
        chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.JELLY_BEAN) {
            chooser.setClipData(intent.getClipData());
        }
        cordova.getActivity().startActivity(chooser);

        JSONObject result = storedFileResult(outputFile, "application/vnd.android.package-archive", "apk");
        String[] splitSourceDirs = appInfo.splitSourceDirs;
        boolean hasSplits = splitSourceDirs != null && splitSourceDirs.length > 0;
        result.put("shared", true);
        result.put("compartilhado", true);
        result.put("appName", appLabel);
        result.put("appNome", appLabel);
        result.put("packageName", context().getPackageName());
        result.put("apkSource", sourceFile.getAbsolutePath());
        result.put("origemApk", sourceFile.getAbsolutePath());
        result.put("splitApks", hasSplits);
        result.put("apkDividido", hasSplits);
        result.put("installableAsSingleApk", !hasSplits);
        result.put("instalavelComoApkUnico", !hasSplits);
        if (hasSplits) {
            JSONArray splits = new JSONArray();
            for (String split : splitSourceDirs) {
                splits.put(split);
            }
            result.put("splitSourceDirs", splits);
            result.put("observacao", "O app usa split APKs; compartilhar apenas o APK base pode nao reinstalar todos os recursos.");
            result.put("note", "This app uses split APKs; sharing only the base APK may not reinstall every feature.");
        }
        return result;
    }

    private String sanitizeShareFileName(String value) {
        String cleaned = value == null ? "" : value.trim();
        cleaned = cleaned.replaceAll("[\\\\/:*?\"<>|]+", "-");
        cleaned = cleaned.replaceAll("\\s+", "-");
        cleaned = cleaned.replaceAll("-+", "-");
        cleaned = cleaned.replaceAll("(^-+|-+$)", "");
        return cleaned.length() == 0 ? "app.apk" : cleaned;
    }

    private void copyFile(File sourceFile, File outputFile) throws Exception {
        FileOutputStream outputStream = new FileOutputStream(outputFile);
        try {
            copyFileToStream(sourceFile, outputStream);
        } finally {
            outputStream.close();
        }
    }

    private void copyFileToStream(File sourceFile, OutputStream outputStream) throws Exception {
        InputStream inputStream = new FileInputStream(sourceFile);
        try {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = inputStream.read(buffer)) != -1) {
                outputStream.write(buffer, 0, read);
            }
            outputStream.flush();
        } finally {
            inputStream.close();
        }
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
        boolean multiple = safeOptions.optBoolean("multiplo",
            safeOptions.optBoolean("multiplas",
                safeOptions.optBoolean("multiple",
                    safeOptions.optBoolean("multiples", false))));
        String mimeType = mimeTypeForPicker(kind, safeOptions);

        Intent intent = shouldUsePhotoPicker(kind, safeOptions)
            ? photoPickerIntent(mimeType, multiple, safeOptions)
            : documentPickerIntent(mimeType, multiple);

        filePickerCallback = callbackContext;
        cordova.startActivityForResult(this, intent, REQUEST_PICK_FILE);
    }

    private boolean shouldUsePhotoPicker(String kind, JSONObject options) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            return false;
        }
        if (options.optBoolean("saf", options.optBoolean("useSaf", false))) {
            return false;
        }
        return "image".equals(kind) || "video".equals(kind) || "media".equals(kind);
    }

    private Intent photoPickerIntent(String mimeType, boolean multiple, JSONObject options) {
        Intent intent = new Intent(MediaStore.ACTION_PICK_IMAGES);
        if ("video/*".equals(mimeType)) {
            intent.setType("video/*");
        } else {
            intent.setType("image/*");
        }
        if (multiple) {
            int requestedMax = Math.max(2, options.optInt("maximo",
                options.optInt("max",
                    options.optInt("limit", 20))));
            int maxAllowed = MediaStore.getPickImagesMaxLimit();
            intent.putExtra(MediaStore.EXTRA_PICK_IMAGES_MAX, Math.max(2, Math.min(requestedMax, maxAllowed)));
        }
        return intent;
    }

    private Intent documentPickerIntent(String mimeType, boolean multiple) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mimeType);
        intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, multiple);
        return intent;
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
                    Uri uri = clipData.getItemAt(index).getUri();
                    takeReadPermission(intent, uri);
                    items.put(fileInfo(uri));
                }
            } else if (intent.getData() != null) {
                takeReadPermission(intent, intent.getData());
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
            Uri uri = intent.getData();
            takeTreePermission(intent, uri);
            JSONObject result = new JSONObject();
            result.put("uri", uri.toString());
            result.put("name", folderDisplayName(uri));
            result.put("nome", result.optString("name"));
            callback.success(result);
        } catch (Exception error) {
            callback.error(error.getMessage());
        }
    }

    private void takeReadPermission(Intent intent, Uri uri) {
        if (intent == null || uri == null) {
            return;
        }
        int flags = intent.getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        if ((flags & Intent.FLAG_GRANT_READ_URI_PERMISSION) == 0) {
            return;
        }
        try {
            context().getContentResolver().takePersistableUriPermission(uri, flags);
        } catch (Exception ignored) {
        }
    }

    private void takeTreePermission(Intent intent, Uri uri) {
        if (intent == null || uri == null) {
            return;
        }
        int flags = intent.getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        try {
            context().getContentResolver().takePersistableUriPermission(uri, flags);
        } catch (Exception ignored) {
        }
    }

    private String folderDisplayName(Uri uri) {
        try {
            String treeId = DocumentsContract.getTreeDocumentId(uri);
            if (treeId != null && treeId.length() > 0) {
                int colon = treeId.lastIndexOf(':');
                String value = colon >= 0 ? treeId.substring(colon + 1) : treeId;
                if (value.length() == 0) {
                    return "Armazenamento";
                }
                int slash = value.lastIndexOf('/');
                return slash >= 0 ? value.substring(slash + 1) : value;
            }
        } catch (Exception ignored) {
        }
        String segment = uri == null ? "" : uri.getLastPathSegment();
        return segment == null || segment.length() == 0 ? "Pasta" : segment;
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
        String mimeType = context().getContentResolver().getType(uri);
        String fallbackName = uri.getLastPathSegment();
        result.put("mimeType", mimeType == null || mimeType.length() == 0 ? guessMimeType(fallbackName) : mimeType);

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
        if (!result.has("name")) {
            result.put("name", fallbackName == null || fallbackName.length() == 0 ? "arquivo" : fallbackName);
            result.put("nome", result.optString("name"));
        }
        if (!result.has("size")) {
            result.put("size", 0);
            result.put("tamanho", 0);
        }
        result.put("type", contentKind(result.optString("mimeType")));
        result.put("tipo", result.optString("type"));
        return result;
    }

    private String contentKind(String mimeType) {
        String lower = mimeType == null ? "" : mimeType.toLowerCase();
        if (lower.startsWith("image/")) {
            return "imagem";
        }
        if (lower.startsWith("video/")) {
            return "video";
        }
        if (lower.startsWith("audio/")) {
            return "audio";
        }
        if ("application/pdf".equals(lower)) {
            return "pdf";
        }
        if (lower.startsWith("text/")) {
            return "texto";
        }
        return "arquivo";
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
        Uri uri = fileProviderUri(file);
        intent.putExtra(Intent.EXTRA_STREAM, uri);
        intent.setClipData(ClipData.newRawUri("File", uri));
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

        List<android.content.pm.ResolveInfo> resInfoList = context().getPackageManager().queryIntentActivities(intent, android.content.pm.PackageManager.MATCH_DEFAULT_ONLY);
        for (android.content.pm.ResolveInfo resolveInfo : resInfoList) {
            String packageName = resolveInfo.activityInfo.packageName;
            context().grantUriPermission(packageName, uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
        }

        Intent chooser = Intent.createChooser(intent, title);
        chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        cordova.getActivity().startActivity(chooser);
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
                        String mimeType = readStoredFileMeta(file).optString("mimeType", source.mimeType);
                        if (mimeType == null || mimeType.length() == 0) {
                            mimeType = guessMimeType(file.getName());
                        }
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
                        appendDownloadPublication(result, file, mimeType, safeOptions);
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
                    long lastNotifyAt = notificationShown ? System.currentTimeMillis() : 0;
                    byte[] buffer = new byte[8192];
                    int read;
                    while ((read = inputStream.read(buffer)) != -1) {
                        outputStream.write(buffer, 0, read);
                        size += read;
                        if (notificationShown) {
                            int percent = source.totalBytes > 0 ? (int) Math.min(100, (size * 100) / source.totalBytes) : -1;
                            long now = System.currentTimeMillis();
                            boolean shouldUpdateKnownProgress = percent >= 0 && percent != lastPercent && (percent - lastPercent >= 2 || now - lastNotifyAt > 700);
                            boolean shouldRefreshIndeterminateProgress = percent < 0 && now - lastNotifyAt > 900;
                            if (shouldUpdateKnownProgress || shouldRefreshIndeterminateProgress) {
                                notifyDownloadProgress(downloadNotificationId, notificationTitle, progressText, source.totalBytes, size, false, null);
                                lastPercent = percent;
                                lastNotifyAt = now;
                            }
                        }
                    }
                    outputStream.getFD().sync();
                    closeSilently(outputStream);
                    outputStream = null;

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
                    appendDownloadPublication(result, file, mimeType, safeOptions);
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

    private void appendDownloadPublication(JSONObject result, File file, String mimeType, JSONObject options) throws Exception {
        boolean requested = shouldPublishDownloadToPublicMedia(options);
        boolean galleryMime = isGalleryVisibleMime(mimeType);
        result.put("publicRequested", requested);
        result.put("publicoSolicitado", requested);
        result.put("galleryRequested", requested);
        result.put("galeriaSolicitada", requested);
        if (!requested) {
            result.put("publicPublished", false);
            result.put("publicadoPublico", false);
            result.put("galleryPublished", false);
            result.put("publicadoGaleria", false);
            result.put("visibleInGallery", false);
            result.put("visivelNaGaleria", false);
            if (galleryMime) {
                result.put("galleryHint", "Use { galeria: true } to publish a copy to the Android gallery.");
                result.put("dicaGaleria", "Use { galeria: true } para publicar uma copia na galeria do Android.");
            }
            return;
        }

        try {
            JSONObject published = publishDownloadedFile(file, mimeType, options);
            boolean visibleInGallery = published.optBoolean("visibleInGallery", false);
            result.put("publicPublished", true);
            result.put("publicadoPublico", true);
            result.put("galleryPublished", visibleInGallery);
            result.put("publicadoGaleria", visibleInGallery);
            result.put("visibleInGallery", visibleInGallery);
            result.put("visivelNaGaleria", visibleInGallery);
            result.put("publicUri", published.optString("uri"));
            result.put("uriPublica", published.optString("uri"));
            result.put("galleryUri", published.optString("uri"));
            result.put("uriGaleria", published.optString("uri"));
            result.put("publicName", published.optString("name"));
            result.put("nomePublico", published.optString("name"));
            result.put("publicRelativePath", published.optString("relativePath"));
            result.put("caminhoRelativoPublico", published.optString("relativePath"));
        } catch (Exception error) {
            result.put("publicPublished", false);
            result.put("publicadoPublico", false);
            result.put("galleryPublished", false);
            result.put("publicadoGaleria", false);
            result.put("visibleInGallery", false);
            result.put("visivelNaGaleria", false);
            result.put("publicError", error.getMessage());
            result.put("erroPublicacao", error.getMessage());
            if (shouldFailOnPublicMediaError(options)) {
                throw error;
            }
        }
    }

    private boolean shouldPublishDownloadToPublicMedia(JSONObject options) {
        return optBooleanAlias(options, false,
            "galeria",
            "gallery",
            "mostrarNaGaleria",
            "showInGallery",
            "publico",
            "public",
            "salvarPublico",
            "savePublic",
            "publicar",
            "publish");
    }

    private boolean shouldFailOnPublicMediaError(JSONObject options) {
        return optBooleanAlias(options, false,
            "falharAoPublicarGaleria",
            "failOnGalleryError",
            "falharAoSalvarPublico",
            "failOnPublicError");
    }

    private boolean optBooleanAlias(JSONObject options, boolean defaultValue, String... keys) {
        if (options == null) {
            return defaultValue;
        }
        for (String key : keys) {
            if (options.has(key)) {
                return options.optBoolean(key, defaultValue);
            }
        }
        return defaultValue;
    }

    private JSONObject publishDownloadedFile(File file, String mimeType, JSONObject options) throws Exception {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            throw new Exception("Public gallery/download publication requires Android 10 or newer.");
        }

        String safeMimeType = mimeType == null || mimeType.length() == 0 ? guessMimeType(file.getName()) : mimeType;
        String publicName = downloadPublicName(options, file);
        String relativePath = downloadPublicRelativePath(options, safeMimeType);
        ContentValues values = new ContentValues();
        values.put(MediaStore.MediaColumns.DISPLAY_NAME, publicName);
        values.put(MediaStore.MediaColumns.MIME_TYPE, safeMimeType);
        values.put(MediaStore.MediaColumns.RELATIVE_PATH, relativePath);
        values.put(MediaStore.MediaColumns.IS_PENDING, 1);

        Uri uri = context().getContentResolver().insert(downloadPublicCollection(safeMimeType), values);
        if (uri == null) {
            throw new Exception("Could not create public media entry.");
        }

        OutputStream outputStream = null;
        try {
            outputStream = context().getContentResolver().openOutputStream(uri);
            if (outputStream == null) {
                throw new Exception("Could not open public media output stream.");
            }
            copyFileToStream(file, outputStream);
        } catch (Exception error) {
            context().getContentResolver().delete(uri, null, null);
            throw error;
        } finally {
            closeSilently(outputStream);
        }

        ContentValues publishedValues = new ContentValues();
        publishedValues.put(MediaStore.MediaColumns.IS_PENDING, 0);
        context().getContentResolver().update(uri, publishedValues, null, null);

        JSONObject published = new JSONObject();
        published.put("uri", uri.toString());
        published.put("name", publicName);
        published.put("relativePath", relativePath);
        published.put("mimeType", safeMimeType);
        published.put("visibleInGallery", isGalleryVisibleMime(safeMimeType));
        return published;
    }

    private Uri downloadPublicCollection(String mimeType) throws Exception {
        String lower = normalizedMimeType(mimeType);
        if (lower.startsWith("image/")) {
            return MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
        }
        if (lower.startsWith("video/")) {
            return MediaStore.Video.Media.EXTERNAL_CONTENT_URI;
        }
        if (lower.startsWith("audio/")) {
            return MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;
        }
        return MediaStore.Downloads.EXTERNAL_CONTENT_URI;
    }

    private String downloadPublicName(JSONObject options, File file) throws Exception {
        String name = options.optString("nomePublico",
            options.optString("publicName",
                options.optString("nomeGaleria",
                    options.optString("galleryName", file.getName()))));
        if (name == null || name.trim().length() == 0) {
            name = file.getName();
        }
        return safeStoredFileName(name);
    }

    private String downloadPublicRelativePath(JSONObject options, String mimeType) {
        String explicit = options.optString("caminhoRelativo",
            options.optString("relativePath", ""));
        String folder = options.optString("album",
            options.optString("pastaGaleria",
                options.optString("galleryFolder",
                    options.optString("folder", "html2apk"))));
        String fallback = downloadPublicBaseDirectory(mimeType) + "/" + sanitizePublicFolderName(folder);
        if (explicit.length() == 0) {
            return fallback;
        }
        return safePublicRelativePath(explicit, fallback);
    }

    private String downloadPublicBaseDirectory(String mimeType) {
        String lower = normalizedMimeType(mimeType);
        if (lower.startsWith("image/")) {
            return Environment.DIRECTORY_PICTURES;
        }
        if (lower.startsWith("video/")) {
            return Environment.DIRECTORY_MOVIES;
        }
        if (lower.startsWith("audio/")) {
            return Environment.DIRECTORY_MUSIC;
        }
        return Environment.DIRECTORY_DOWNLOADS;
    }

    private String safePublicRelativePath(String value, String fallback) {
        String cleaned = value == null ? "" : value.trim().replace('\\', '/');
        while (cleaned.startsWith("/")) {
            cleaned = cleaned.substring(1);
        }
        while (cleaned.endsWith("/")) {
            cleaned = cleaned.substring(0, cleaned.length() - 1);
        }
        cleaned = cleaned.replaceAll("/{2,}", "/");
        if (cleaned.length() == 0 || cleaned.indexOf("..") >= 0 || cleaned.indexOf(':') >= 0) {
            return fallback;
        }
        return cleaned;
    }

    private String sanitizePublicFolderName(String value) {
        String cleaned = value == null ? "" : value.trim();
        cleaned = cleaned.replaceAll("[\\\\/:*?\"<>|]+", "-");
        cleaned = cleaned.replaceAll("\\s+", "-");
        cleaned = cleaned.replaceAll("-+", "-");
        cleaned = cleaned.replaceAll("(^-+|-+$)", "");
        return cleaned.length() == 0 ? "html2apk" : cleaned;
    }

    private boolean isGalleryVisibleMime(String mimeType) {
        String lower = normalizedMimeType(mimeType);
        return lower.startsWith("image/") || lower.startsWith("video/");
    }

    private String normalizedMimeType(String mimeType) {
        return mimeType == null ? "" : mimeType.toLowerCase();
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

    private JSONObject requestInstallPermission() throws Exception {
        JSONObject res = new JSONObject();
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            boolean canRequest = context().getPackageManager().canRequestPackageInstalls();
            res.put("suportado", true);
            res.put("supported", true);
            if (!canRequest) {
                Intent intent = new Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                intent.setData(Uri.parse("package:" + context().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                cordova.getActivity().startActivity(intent);
                res.put("solicitado", true);
                res.put("requested", true);
                res.put("permitido", false);
                res.put("granted", false);
            } else {
                res.put("solicitado", false);
                res.put("requested", false);
                res.put("permitido", true);
                res.put("granted", true);
            }
        } else {
            res.put("suportado", false);
            res.put("supported", false);
            res.put("solicitado", false);
            res.put("requested", false);
            res.put("permitido", true);
            res.put("granted", true);
        }
        return res;
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

    private void installUpdate(final String url, final JSONObject options, final CallbackContext callbackContext) {
        if (url == null || url.length() == 0) {
            callbackContext.error("URL is required");
            return;
        }

        JSONObject safeOptions = options == null ? new JSONObject() : options;
        final String title = safeOptions.optString("titulo", safeOptions.optString("title", "Baixando atualização..."));
        final String message = safeOptions.optString("mensagem", safeOptions.optString("message", "Por favor, aguarde."));

        cordova.getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                android.app.AlertDialog.Builder builder = new android.app.AlertDialog.Builder(cordova.getActivity());
                builder.setTitle(title);
                builder.setMessage(message);
                builder.setCancelable(false);
                
                android.widget.ProgressBar progressBar = new android.widget.ProgressBar(cordova.getActivity());
                progressBar.setPadding(50, 50, 50, 50);
                progressBar.setIndeterminate(true);
                builder.setView(progressBar);
                
                final android.app.AlertDialog dialog = builder.create();
                dialog.show();

                cordova.getThreadPool().execute(new Runnable() {
                    @Override
                    public void run() {
                        InputStream inputStream = null;
                        FileOutputStream fileOut = null;
                        try {
                            // --- DOWNLOAD ---
                            URL downloadUrl = new URL(url);
                            HttpURLConnection connection = (HttpURLConnection) downloadUrl.openConnection();
                            connection.setRequestProperty("User-Agent", "Mozilla/5.0 (Android; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36");
                            connection.setRequestMethod("GET");
                            connection.setConnectTimeout(30000);
                            connection.setReadTimeout(60000);
                            connection.setInstanceFollowRedirects(true);
                            connection.connect();

                            if (connection.getResponseCode() != HttpURLConnection.HTTP_OK) {
                                throw new Exception("Server returned HTTP " + connection.getResponseCode() + " " + connection.getResponseMessage());
                            }

                            File cacheDir = context().getCacheDir();
                            File apkFile = new File(cacheDir, "update.apk");

                            inputStream = connection.getInputStream();
                            fileOut = new FileOutputStream(apkFile);

                            byte[] data = new byte[65536];
                            int count;
                            while ((count = inputStream.read(data)) != -1) {
                                fileOut.write(data, 0, count);
                            }

                            fileOut.flush();
                            fileOut.close();
                            fileOut = null;
                            inputStream.close();
                            inputStream = null;

                            if (apkFile.length() < 1000) {
                                throw new Exception("Downloaded file is too small to be a valid APK (" + apkFile.length() + " bytes).");
                            }

                            // --- INSTALL VIA PackageInstaller Session API ---
                            android.content.pm.PackageInstaller packageInstaller = context().getPackageManager().getPackageInstaller();
                            android.content.pm.PackageInstaller.SessionParams params = new android.content.pm.PackageInstaller.SessionParams(
                                android.content.pm.PackageInstaller.SessionParams.MODE_FULL_INSTALL
                            );
                            params.setSize(apkFile.length());

                            int sessionId = packageInstaller.createSession(params);
                            android.content.pm.PackageInstaller.Session session = packageInstaller.openSession(sessionId);

                            OutputStream sessionOut = session.openWrite("html2apk_update", 0, apkFile.length());
                            FileInputStream fis = new FileInputStream(apkFile);
                            byte[] buf = new byte[65536];
                            int c;
                            while ((c = fis.read(buf)) != -1) {
                                sessionOut.write(buf, 0, c);
                            }
                            session.fsync(sessionOut);
                            sessionOut.close();
                            fis.close();

                            // Register receiver to handle the install confirmation
                            final String ACTION_INSTALL = "dev.html2apk.INSTALL_STATUS_" + sessionId;
                            android.content.BroadcastReceiver installReceiver = new android.content.BroadcastReceiver() {
                                @Override
                                public void onReceive(Context ctx, Intent intent) {
                                    int status = intent.getIntExtra(android.content.pm.PackageInstaller.EXTRA_STATUS, android.content.pm.PackageInstaller.STATUS_FAILURE);
                                    if (status == android.content.pm.PackageInstaller.STATUS_PENDING_USER_ACTION) {
                                        // The system requires user confirmation - launch the confirm dialog
                                        Intent confirmActivity = intent.getParcelableExtra(Intent.EXTRA_INTENT);
                                        if (confirmActivity != null) {
                                            confirmActivity.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                            ctx.startActivity(confirmActivity);
                                        }
                                    }
                                    try { ctx.unregisterReceiver(this); } catch (Exception ignored) {}
                                }
                            };

                            if (android.os.Build.VERSION.SDK_INT >= 33) {
                                context().registerReceiver(installReceiver, new android.content.IntentFilter(ACTION_INSTALL), android.content.Context.RECEIVER_EXPORTED);
                            } else {
                                context().registerReceiver(installReceiver, new android.content.IntentFilter(ACTION_INSTALL));
                            }

                            Intent statusIntent = new Intent(ACTION_INSTALL);
                            int intentFlags = android.app.PendingIntent.FLAG_UPDATE_CURRENT;
                            if (android.os.Build.VERSION.SDK_INT >= 31) {
                                intentFlags |= android.app.PendingIntent.FLAG_MUTABLE;
                            }
                            android.app.PendingIntent pi = android.app.PendingIntent.getBroadcast(
                                context(), sessionId, statusIntent, intentFlags
                            );
                            session.commit(pi.getIntentSender());

                            JSONObject result = new JSONObject();
                            result.put("ok", true);
                            callbackContext.success(result);
                        } catch (Exception e) {
                            String msg = e.getMessage();
                            callbackContext.error(msg != null ? msg : e.toString());
                        } finally {
                            try { if (fileOut != null) fileOut.close(); } catch (Exception ignored) {}
                            try { if (inputStream != null) inputStream.close(); } catch (Exception ignored) {}
                            
                            cordova.getActivity().runOnUiThread(new Runnable() {
                                @Override
                                public void run() {
                                    if (dialog != null && dialog.isShowing()) {
                                        dialog.dismiss();
                                    }
                                }
                            });
                        }
                    }
                });
            }
        });
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
        if (location.hasSpeed()) {
            float ms = location.getSpeed();
            float kmh = ms * 3.6f;
            result.put("speed", ms); // Keep backwards compatibility
            result.put("speedMs", ms);
            result.put("speedKmh", kmh);
            result.put("velocidade", ms); // Keep backwards compatibility
            result.put("velocidadeMs", ms);
            result.put("velocidadeKmh", kmh);
        } else {
            result.put("speed", JSONObject.NULL);
            result.put("speedMs", JSONObject.NULL);
            result.put("speedKmh", JSONObject.NULL);
            result.put("velocidade", JSONObject.NULL);
            result.put("velocidadeMs", JSONObject.NULL);
            result.put("velocidadeKmh", JSONObject.NULL);
        }
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

    private long lastDeviceLockRequestTime = 0;

    private void requestDeviceLock(final JSONObject options, final CallbackContext callbackContext) throws Exception {
        long now = System.currentTimeMillis();
        if (now - lastDeviceLockRequestTime < 5000) { // max 1 request every 5 seconds
            JSONObject result = new JSONObject();
            result.put("supported", true);
            result.put("suportado", true);
            result.put("authenticated", false);
            result.put("autenticado", false);
            result.put("canceled", true);
            result.put("cancelado", true);
            result.put("rateLimited", true);
            result.put("limiteExcedido", true);
            result.put("message", "Rate limit exceeded. Please wait before requesting again.");
            result.put("mensagem", "Limite de solicitacoes excedido. Aguarde antes de tentar novamente.");
            callbackContext.success(result);
            return;
        }

        if (deviceCredentialCallback != null) {
            rejectBusyCallback(callbackContext, "Device lock authentication");
            return;
        }

        KeyguardManager keyguardManager = (KeyguardManager) context().getSystemService(Context.KEYGUARD_SERVICE);
        if (keyguardManager == null || !keyguardManager.isDeviceSecure()) {
            JSONObject result = new JSONObject();
            result.put("supported", false);
            result.put("suportado", false);
            result.put("authenticated", false);
            result.put("autenticado", false);
            result.put("canceled", false);
            result.put("cancelado", false);
            result.put("message", "Device secure lock screen is not configured.");
            result.put("mensagem", "A tela de bloqueio do dispositivo nao esta configurada.");
            callbackContext.success(result);
            return;
        }

        final JSONObject safeOptions = options == null ? new JSONObject() : options;
        String title = safeOptions.optString("titulo", safeOptions.optString("title", "Autenticacao"));
        String description = safeOptions.optString("descricao", safeOptions.optString("description", ""));

        Intent intent = keyguardManager.createConfirmDeviceCredentialIntent(title, description);
        if (intent == null) {
            JSONObject result = new JSONObject();
            result.put("supported", false);
            result.put("suportado", false);
            result.put("authenticated", false);
            result.put("autenticado", false);
            result.put("canceled", false);
            result.put("cancelado", false);
            result.put("message", "Could not create device credential intent.");
            result.put("mensagem", "Nao foi possivel criar a tela de autenticacao.");
            callbackContext.success(result);
            return;
        }

        deviceCredentialCallback = callbackContext;
        cordova.setActivityResultCallback(this);
        cordova.getActivity().startActivityForResult(intent, REQUEST_DEVICE_CREDENTIAL);
    }

    private void handleInstallPackagePickResult(int resultCode, Intent intent) {
        CallbackContext callback = installPackageCallbackContext;
        installPackageCallbackContext = null;
        if (callback == null) return;
        
        if (resultCode == Activity.RESULT_OK && intent != null) {
            android.net.Uri uri = intent.getData();
            if (uri != null) {
                try {
                    Intent installIntent = new Intent(Intent.ACTION_VIEW);
                    installIntent.setDataAndType(uri, "application/vnd.android.package-archive");
                    installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    cordova.getActivity().startActivity(installIntent);
                    JSONObject res = new JSONObject();
                    res.put("success", true);
                    callback.success(res);
                } catch (Exception e) {
                    callback.error("Falha ao abrir a tela de instalação: " + e.getMessage());
                }
            } else {
                callback.error("URI de arquivo inválido.");
            }
        } else {
            callback.error("Seleção de arquivo cancelada.");
        }
    }

    private void handleDeviceCredentialResult(int resultCode) {
        CallbackContext callback = deviceCredentialCallback;
        deviceCredentialCallback = null;
        if (callback == null) {
            return;
        }

        try {
            boolean authenticated = resultCode == Activity.RESULT_OK;
            boolean canceled = resultCode == Activity.RESULT_CANCELED;
            
            if (authenticated) {
                lastDeviceLockRequestTime = System.currentTimeMillis();
            }
            
            JSONObject result = new JSONObject();
            result.put("supported", true);
            result.put("suportado", true);
            result.put("authenticated", authenticated);
            result.put("autenticado", authenticated);
            result.put("canceled", canceled);
            result.put("cancelado", canceled);
            result.put("message", authenticated ? "" : "Authentication failed or canceled.");
            result.put("mensagem", authenticated ? "" : "Autenticacao falhou ou cancelada.");
            callback.success(result);
        } catch (Exception error) {
            callback.error(error.getMessage());
        }
    }

    private void requestBackgroundExecution(final JSONObject options, final CallbackContext callbackContext) throws Exception {
        boolean openedAutoStart = false;
        boolean openedBatteryOpt = false;
        
        try {
            Intent intent = new Intent();
            String manufacturer = Build.MANUFACTURER;
            if ("xiaomi".equalsIgnoreCase(manufacturer)) {
                intent.setComponent(new android.content.ComponentName("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity"));
            } else if ("oppo".equalsIgnoreCase(manufacturer)) {
                intent.setComponent(new android.content.ComponentName("com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity"));
            } else if ("vivo".equalsIgnoreCase(manufacturer)) {
                intent.setComponent(new android.content.ComponentName("com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"));
            } else if ("Letv".equalsIgnoreCase(manufacturer)) {
                intent.setComponent(new android.content.ComponentName("com.letv.android.letvsafe", "com.letv.android.letvsafe.AutobootManageActivity"));
            } else if ("Honor".equalsIgnoreCase(manufacturer)) {
                intent.setComponent(new android.content.ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.optimize.process.ProtectActivity"));
            } else if ("huawei".equalsIgnoreCase(manufacturer)) {
                intent.setComponent(new android.content.ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"));
            }
            
            java.util.List<android.content.pm.ResolveInfo> list = context().getPackageManager().queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY);
            if (list.size() > 0) {
                cordova.getActivity().startActivity(intent);
                openedAutoStart = true;
            }
        } catch (Exception e) {
            // Ignorar falhas do AutoStart
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                android.os.PowerManager pm = (android.os.PowerManager) context().getSystemService(Context.POWER_SERVICE);
                String packageName = context().getPackageName();
                if (pm != null && !pm.isIgnoringBatteryOptimizations(packageName)) {
                    Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(Uri.parse("package:" + packageName));
                    cordova.getActivity().startActivity(intent);
                    openedBatteryOpt = true;
                }
            }
        } catch (Exception e) {
            // Ignorar falhas da bateria
        }

        JSONObject result = new JSONObject();
        result.put("openedAutoStart", openedAutoStart);
        result.put("abriuInicioAutomatico", openedAutoStart);
        result.put("openedBatteryOptimization", openedBatteryOpt);
        result.put("abriuOtimizacaoBateria", openedBatteryOpt);
        result.put("ok", openedAutoStart || openedBatteryOpt);
        
        callbackContext.success(result);
    }

    private void setAutoStartOnBoot(final JSONObject options, final CallbackContext callbackContext) {
        boolean enable = options != null && options.optBoolean("ativar", options.optBoolean("enable", false));
        SharedPreferences prefs = context().getSharedPreferences(Html2ApkBridge.PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putBoolean("html2apk_boot_start", enable).apply();
        
        JSONObject result = new JSONObject();
        try {
            result.put("ok", true);
            result.put("enabled", enable);
            result.put("ativado", enable);
        } catch (Exception ignored) {
        }
        callbackContext.success(result);
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

        rememberUsbPowerState();
        systemReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (intent == null || intent.getAction() == null) {
                    return;
                }

                try {
                    if (Intent.ACTION_BATTERY_CHANGED.equals(intent.getAction())) {
                        dispatchEvent("bateria:mudou", batteryInfo());
                        dispatchUsbPowerChangeIfNeeded(intent);
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

    private void registerUsbReceiver() {
        if (usbReceiver != null) {
            return;
        }

        usbReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (intent == null || intent.getAction() == null) {
                    return;
                }

                try {
                    if (UsbManager.ACTION_USB_DEVICE_ATTACHED.equals(intent.getAction())) {
                        dispatchEvent("usb:conectado", usbEventDetail(intent, true, "device"));
                    } else if (UsbManager.ACTION_USB_DEVICE_DETACHED.equals(intent.getAction())) {
                        dispatchEvent("usb:desconectado", usbEventDetail(intent, false, "device"));
                    }
                } catch (Exception ignored) {
                }
            }
        };

        IntentFilter filter = new IntentFilter();
        filter.addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED);
        filter.addAction(UsbManager.ACTION_USB_DEVICE_DETACHED);
        ContextCompat.registerReceiver(context(), usbReceiver, filter, ContextCompat.RECEIVER_EXPORTED);
    }

    private void unregisterUsbReceiver() {
        if (usbReceiver == null) {
            return;
        }

        try {
            context().unregisterReceiver(usbReceiver);
        } catch (Exception ignored) {
        }
        usbReceiver = null;
    }

    private void rememberUsbPowerState() {
        try {
            Intent intent = context().registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
            if (intent != null) {
                usbPowerConnected = isUsbPowerConnected(intent);
            }
        } catch (Exception ignored) {
        }
    }

    private void dispatchUsbPowerChangeIfNeeded(Intent intent) {
        boolean connected = isUsbPowerConnected(intent);
        if (usbPowerConnected != null && usbPowerConnected.booleanValue() == connected) {
            return;
        }
        usbPowerConnected = connected;
        try {
            dispatchEvent(connected ? "usb:conectado" : "usb:desconectado", usbEventDetail(intent, connected, "power"));
        } catch (Exception ignored) {
        }
    }

    private boolean isUsbPowerConnected(Intent intent) {
        int plugged = intent == null ? 0 : intent.getIntExtra(BatteryManager.EXTRA_PLUGGED, 0);
        return (plugged & BatteryManager.BATTERY_PLUGGED_USB) != 0;
    }

    private JSONObject usbEventDetail(Intent intent, boolean connected, String source) throws Exception {
        JSONObject detail = baseEvent(connected ? "usb:conectado" : "usb:desconectado");
        detail.put("connected", connected);
        detail.put("conectado", connected);
        detail.put("source", source);
        detail.put("origem", source);

        if ("power".equals(source)) {
            detail.put("power", true);
            detail.put("energia", true);
            detail.put("plugged", "usb");
            detail.put("conector", "usb");
        }

        UsbDevice device = usbDeviceFromIntent(intent);
        if (device != null) {
            JSONObject deviceInfo = usbDeviceInfo(device);
            detail.put("device", deviceInfo);
            detail.put("dispositivo", deviceInfo);
        }
        return detail;
    }

    private UsbDevice usbDeviceFromIntent(Intent intent) {
        if (intent == null) {
            return null;
        }
        try {
            return (UsbDevice) intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
        } catch (Exception ignored) {
            return null;
        }
    }

    private JSONObject usbDeviceInfo(UsbDevice device) throws Exception {
        JSONObject info = new JSONObject();
        info.put("id", device.getDeviceName());
        info.put("idDispositivo", device.getDeviceName());
        info.put("name", device.getDeviceName());
        info.put("nome", device.getDeviceName());
        info.put("deviceName", device.getDeviceName());
        info.put("nomeDispositivo", device.getDeviceName());
        info.put("vendorId", device.getVendorId());
        info.put("idFornecedor", device.getVendorId());
        info.put("productId", device.getProductId());
        info.put("idProduto", device.getProductId());
        info.put("deviceClass", device.getDeviceClass());
        info.put("classeDispositivo", device.getDeviceClass());
        info.put("deviceSubclass", device.getDeviceSubclass());
        info.put("subclasseDispositivo", device.getDeviceSubclass());
        info.put("deviceProtocol", device.getDeviceProtocol());
        info.put("protocoloDispositivo", device.getDeviceProtocol());
        info.put("configurationCount", device.getConfigurationCount());
        info.put("quantidadeConfiguracoes", device.getConfigurationCount());
        info.put("interfaceCount", device.getInterfaceCount());
        info.put("quantidadeInterfaces", device.getInterfaceCount());
        try {
            info.put("manufacturerName", device.getManufacturerName());
            info.put("fabricante", device.getManufacturerName());
        } catch (Exception ignored) {
        }
        try {
            info.put("productName", device.getProductName());
            info.put("nomeProduto", device.getProductName());
        } catch (Exception ignored) {
        }
        try {
            info.put("serialNumber", device.getSerialNumber());
            info.put("numeroSerial", device.getSerialNumber());
        } catch (Exception ignored) {
        }
        return info;
    }

    private void registerHeadphoneWatchers() {
        rememberHeadphoneState();

        if (headphoneReceiver == null) {
            headphoneReceiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    if (intent == null || intent.getAction() == null) {
                        return;
                    }

                    if (!Intent.ACTION_HEADSET_PLUG.equals(intent.getAction())) {
                        return;
                    }

                    JSONObject device = new JSONObject();
                    try {
                        device.put("source", "headset_plug");
                        device.put("origem", "headset_plug");
                        device.put("name", intent.getStringExtra("name"));
                        device.put("nome", intent.getStringExtra("name"));
                        device.put("microphone", intent.getIntExtra("microphone", 0) == 1);
                        device.put("microfone", intent.getIntExtra("microphone", 0) == 1);
                    } catch (Exception ignored) {
                    }
                    dispatchHeadphoneChangeIfNeeded(intent.getIntExtra("state", 0) == 1, device);
                }
            };

            IntentFilter filter = new IntentFilter(Intent.ACTION_HEADSET_PLUG);
            ContextCompat.registerReceiver(context(), headphoneReceiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && audioDeviceCallback == null) {
            audioDeviceCallback = new AudioDeviceCallback() {
                @Override
                public void onAudioDevicesAdded(AudioDeviceInfo[] addedDevices) {
                    dispatchHeadphoneChangeIfNeeded(isHeadphoneConnected(), firstAudioDeviceInfo(addedDevices, "audio_devices_added"));
                }

                @Override
                public void onAudioDevicesRemoved(AudioDeviceInfo[] removedDevices) {
                    dispatchHeadphoneChangeIfNeeded(isHeadphoneConnected(), firstAudioDeviceInfo(removedDevices, "audio_devices_removed"));
                }
            };

            try {
                audioManager().registerAudioDeviceCallback(audioDeviceCallback, new Handler(Looper.getMainLooper()));
            } catch (Exception ignored) {
            }
        }
    }

    private void unregisterHeadphoneWatchers() {
        if (headphoneReceiver != null) {
            try {
                context().unregisterReceiver(headphoneReceiver);
            } catch (Exception ignored) {
            }
            headphoneReceiver = null;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && audioDeviceCallback != null) {
            try {
                audioManager().unregisterAudioDeviceCallback(audioDeviceCallback);
            } catch (Exception ignored) {
            }
            audioDeviceCallback = null;
        }
    }

    private AudioManager audioManager() {
        return (AudioManager) context().getSystemService(Context.AUDIO_SERVICE);
    }

    private void rememberHeadphoneState() {
        try {
            headphoneConnected = isHeadphoneConnected();
        } catch (Exception ignored) {
        }
    }

    private boolean isHeadphoneConnected() {
        AudioManager manager = audioManager();
        if (manager == null) {
            return false;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            AudioDeviceInfo[] devices = manager.getDevices(AudioManager.GET_DEVICES_OUTPUTS);
            for (AudioDeviceInfo device : devices) {
                if (isHeadphoneDeviceType(device.getType())) {
                    return true;
                }
            }
            return false;
        }

        return manager.isWiredHeadsetOn();
    }

    private boolean isHeadphoneDeviceType(int type) {
        return type == AudioDeviceInfo.TYPE_WIRED_HEADPHONES
            || type == AudioDeviceInfo.TYPE_WIRED_HEADSET
            || type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP
            || type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO
            || type == AudioDeviceInfo.TYPE_USB_HEADSET
            || (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P && type == AudioDeviceInfo.TYPE_HEARING_AID);
    }

    private JSONObject firstAudioDeviceInfo(AudioDeviceInfo[] devices, String source) {
        JSONObject detail = new JSONObject();
        try {
            detail.put("source", source);
            detail.put("origem", source);
            if (devices != null && devices.length > 0) {
                AudioDeviceInfo device = devices[0];
                detail.put("id", device.getId());
                detail.put("type", device.getType());
                detail.put("tipoDispositivo", device.getType());
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    detail.put("name", String.valueOf(device.getProductName()));
                    detail.put("nome", String.valueOf(device.getProductName()));
                }
            }
        } catch (Exception ignored) {
        }
        return detail;
    }

    private void dispatchHeadphoneChangeIfNeeded(boolean connected, JSONObject device) {
        if (headphoneConnected != null && headphoneConnected.booleanValue() == connected) {
            return;
        }
        headphoneConnected = connected;

        try {
            JSONObject detail = baseEvent(connected ? "fone:conectado" : "fone:desconectado");
            detail.put("connected", connected);
            detail.put("conectado", connected);
            if (device != null) {
                detail.put("device", device);
                detail.put("dispositivo", device);
            }
            dispatchEvent(connected ? "fone:conectado" : "fone:desconectado", detail);
        } catch (Exception ignored) {
        }
    }

    private void registerVolumeObserver() {
        if (volumeObserver != null) {
            return;
        }

        try {
            lastVolumeState = volumeState();
        } catch (Exception ignored) {
        }

        volumeObserver = new ContentObserver(new Handler(Looper.getMainLooper())) {
            @Override
            public void onChange(boolean selfChange) {
                dispatchVolumeChangeIfNeeded();
            }

            @Override
            public void onChange(boolean selfChange, Uri uri) {
                dispatchVolumeChangeIfNeeded();
            }
        };

        context().getContentResolver().registerContentObserver(Settings.System.CONTENT_URI, true, volumeObserver);
    }

    private void unregisterVolumeObserver() {
        if (volumeObserver == null) {
            return;
        }

        try {
            context().getContentResolver().unregisterContentObserver(volumeObserver);
        } catch (Exception ignored) {
        }
        volumeObserver = null;
    }

    private JSONObject volumeState() throws Exception {
        AudioManager manager = audioManager();
        JSONObject result = baseEvent("volume:mudou");
        addStreamVolume(result, manager, "music", "midia", AudioManager.STREAM_MUSIC);
        addStreamVolume(result, manager, "ring", "toque", AudioManager.STREAM_RING);
        addStreamVolume(result, manager, "notification", "notificacao", AudioManager.STREAM_NOTIFICATION);
        addStreamVolume(result, manager, "alarm", "alarme", AudioManager.STREAM_ALARM);
        addStreamVolume(result, manager, "voice", "voz", AudioManager.STREAM_VOICE_CALL);
        return result;
    }

    private void addStreamVolume(JSONObject result, AudioManager manager, String key, String ptKey, int stream) throws Exception {
        JSONObject info = new JSONObject();
        int current = manager == null ? 0 : manager.getStreamVolume(stream);
        int max = manager == null ? 0 : manager.getStreamMaxVolume(stream);
        info.put("current", current);
        info.put("atual", current);
        info.put("max", max);
        info.put("maximo", max);
        result.put(key, info);
        result.put(ptKey, info);
    }

    private static Object firstOption(JSONObject options, String... keys) {
        if (options == null || keys == null) {
            return null;
        }
        for (String key : keys) {
            Object value = options.opt(key);
            if (value != null && value != JSONObject.NULL) {
                return value;
            }
        }
        return null;
    }

    private static double numberOrDefault(Object value, double fallback) {
        if (value == null || value == JSONObject.NULL) {
            return fallback;
        }
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }
        try {
            return Double.parseDouble(String.valueOf(value).trim().replace(",", "."));
        } catch (Exception ignored) {
            return fallback;
        }
    }

    private JSONObject setVolume(JSONObject options) throws Exception {
        JSONObject safeOptions = options == null ? new JSONObject() : options;
        AudioManager manager = audioManager();
        if (manager == null) {
            throw new Exception("AudioManager is not available.");
        }

        int stream = audioStream(safeOptions);
        int max = manager.getStreamMaxVolume(stream);
        int current = manager.getStreamVolume(stream);
        Object raw = firstOption(safeOptions, "value", "valor", "volume", "nivel", "level");
        Object percentRaw = firstOption(safeOptions, "percent", "porcentagem");
        boolean percentKey = raw == null && percentRaw != null;
        int next = targetVolume(percentKey ? percentRaw : raw, current, max, percentKey);
        int flags = safeOptions.optBoolean("mostrarUI", safeOptions.optBoolean("showUi", false)) ? AudioManager.FLAG_SHOW_UI : 0;
        manager.setStreamVolume(stream, next, flags);

        JSONObject result = volumeState();
        result.put("changed", true);
        result.put("alterado", true);
        result.put("stream", audioStreamName(stream));
        result.put("tipo", audioStreamName(stream));
        result.put("volume", next);
        result.put("max", max);
        result.put("maximo", max);
        return result;
    }

    private JSONObject adjustVolume(JSONObject options) throws Exception {
        JSONObject safeOptions = options == null ? new JSONObject() : options;
        AudioManager manager = audioManager();
        if (manager == null) {
            throw new Exception("AudioManager is not available.");
        }

        int stream = audioStream(safeOptions);
        int max = manager.getStreamMaxVolume(stream);
        int current = manager.getStreamVolume(stream);
        double rawAmount = Math.abs(numberOrDefault(firstOption(safeOptions, "amount", "quantidade", "passos", "steps", "valor", "value"), 1));
        int amount = rawAmount > 0 && rawAmount <= 1 ? Math.max(1, (int) Math.round(rawAmount * max)) : Math.max(1, (int) Math.round(rawAmount));
        String direction = safeOptions.optString("direction", safeOptions.optString("direcao", "up")).toLowerCase(Locale.US);
        boolean down = "down".equals(direction)
            || "decrease".equals(direction)
            || "diminuir".equals(direction)
            || "baixo".equals(direction)
            || "menos".equals(direction);
        int next = Math.max(0, Math.min(max, current + (down ? -amount : amount)));
        int flags = safeOptions.optBoolean("mostrarUI", safeOptions.optBoolean("showUi", false)) ? AudioManager.FLAG_SHOW_UI : 0;
        manager.setStreamVolume(stream, next, flags);

        JSONObject result = volumeState();
        result.put("changed", true);
        result.put("alterado", true);
        result.put("stream", audioStreamName(stream));
        result.put("tipo", audioStreamName(stream));
        result.put("volume", next);
        result.put("amount", amount);
        result.put("quantidade", amount);
        result.put("direction", down ? "down" : "up");
        result.put("direcao", down ? "down" : "up");
        return result;
    }

    private int targetVolume(Object raw, int current, int max, boolean percentKey) {
        double value = numberOrDefault(raw, current);
        if (percentKey) {
            value = value > 1 ? value / 100 : value;
            return Math.max(0, Math.min(max, (int) Math.round(value * max)));
        }
        if (value >= 0 && value <= 1) {
            return Math.max(0, Math.min(max, (int) Math.round(value * max)));
        }
        if (value > max && value <= 100) {
            return Math.max(0, Math.min(max, (int) Math.round((value / 100) * max)));
        }
        return Math.max(0, Math.min(max, (int) Math.round(value)));
    }

    private int audioStream(JSONObject options) {
        Object raw = firstOption(options, "stream", "tipo", "canal");
        String stream = raw == null || raw == JSONObject.NULL ? "music" : String.valueOf(raw).toLowerCase(Locale.US);
        if ("ring".equals(stream) || "ringer".equals(stream) || "toque".equals(stream)) {
            return AudioManager.STREAM_RING;
        }
        if ("notification".equals(stream) || "notificacao".equals(stream) || "notice".equals(stream)) {
            return AudioManager.STREAM_NOTIFICATION;
        }
        if ("alarm".equals(stream) || "alarme".equals(stream)) {
            return AudioManager.STREAM_ALARM;
        }
        if ("voice".equals(stream) || "call".equals(stream) || "voz".equals(stream) || "chamada".equals(stream)) {
            return AudioManager.STREAM_VOICE_CALL;
        }
        if ("system".equals(stream) || "sistema".equals(stream)) {
            return AudioManager.STREAM_SYSTEM;
        }
        return AudioManager.STREAM_MUSIC;
    }

    private String audioStreamName(int stream) {
        if (stream == AudioManager.STREAM_RING) {
            return "ring";
        }
        if (stream == AudioManager.STREAM_NOTIFICATION) {
            return "notification";
        }
        if (stream == AudioManager.STREAM_ALARM) {
            return "alarm";
        }
        if (stream == AudioManager.STREAM_VOICE_CALL) {
            return "voice";
        }
        if (stream == AudioManager.STREAM_SYSTEM) {
            return "system";
        }
        return "music";
    }

    private void dispatchVolumeChangeIfNeeded() {
        try {
            JSONObject current = volumeState();
            if (lastVolumeState != null && lastVolumeState.toString().equals(current.toString())) {
                return;
            }
            lastVolumeState = current;
            dispatchEvent("volume:mudou", current);
        } catch (Exception ignored) {
        }
    }

    private void registerLayoutListener() {
        if (layoutListener != null) {
            return;
        }

        cordova.getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                final View root = cordova.getActivity().getWindow().getDecorView().getRootView();
                layoutListener = new ViewTreeObserver.OnGlobalLayoutListener() {
                    @Override
                    public void onGlobalLayout() {
                        handleRootLayout(root);
                    }
                };
                root.getViewTreeObserver().addOnGlobalLayoutListener(layoutListener);
                handleRootLayout(root);
            }
        });
    }

    private void unregisterLayoutListener() {
        if (layoutListener == null) {
            return;
        }

        cordova.getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    View root = cordova.getActivity().getWindow().getDecorView().getRootView();
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
                        root.getViewTreeObserver().removeOnGlobalLayoutListener(layoutListener);
                    } else {
                        root.getViewTreeObserver().removeGlobalOnLayoutListener(layoutListener);
                    }
                } catch (Exception ignored) {
                }
                layoutListener = null;
            }
        });
    }

    private void handleRootLayout(View root) {
        if (root == null || root.getHeight() <= 0 || root.getWidth() <= 0) {
            return;
        }

        Rect visibleFrame = new Rect();
        root.getWindowVisibleDisplayFrame(visibleFrame);
        int rootHeight = root.getRootView().getHeight();
        int keyboardHeight = Math.max(0, rootHeight - visibleFrame.bottom);
        boolean open = keyboardHeight > Math.max(120, rootHeight * 15 / 100);
        dispatchKeyboardChangeIfNeeded(open, keyboardHeight, root.getWidth(), rootHeight);

        String orientation = orientationName(root.getWidth(), rootHeight);
        dispatchOrientationChangeIfNeeded(orientation, root.getWidth(), rootHeight);
    }

    private void dispatchKeyboardChangeIfNeeded(boolean open, int keyboardHeight, int width, int height) {
        if (keyboardOpen == null) {
            keyboardOpen = open;
            return;
        }
        if (keyboardOpen.booleanValue() == open) {
            return;
        }
        keyboardOpen = open;

        try {
            JSONObject detail = baseEvent(open ? "teclado:abriu" : "teclado:fechou");
            detail.put("open", open);
            detail.put("aberto", open);
            detail.put("keyboardHeight", keyboardHeight);
            detail.put("alturaTeclado", keyboardHeight);
            detail.put("width", width);
            detail.put("largura", width);
            detail.put("height", height);
            detail.put("altura", height);
            dispatchEvent(open ? "teclado:abriu" : "teclado:fechou", detail);
        } catch (Exception ignored) {
        }
    }

    private String orientationName(int width, int height) {
        if (width > height) {
            return "landscape";
        }
        if (height > width) {
            return "portrait";
        }

        int orientation = context().getResources().getConfiguration().orientation;
        return orientation == Configuration.ORIENTATION_LANDSCAPE ? "landscape" : "portrait";
    }

    private void dispatchOrientationChangeIfNeeded(String orientation, int width, int height) {
        if (orientation == null || orientation.length() == 0) {
            return;
        }
        if (currentOrientation == null) {
            currentOrientation = orientation;
            return;
        }
        if (currentOrientation.equals(orientation)) {
            return;
        }
        currentOrientation = orientation;

        try {
            JSONObject detail = baseEvent("orientacao:mudou");
            detail.put("orientation", orientation);
            detail.put("orientacao", orientation);
            detail.put("width", width);
            detail.put("largura", width);
            detail.put("height", height);
            detail.put("altura", height);
            dispatchEvent("orientacao:mudou", detail);
        } catch (Exception ignored) {
        }
    }

    private void registerSensorListeners() {
        if (sensorManager == null) {
            sensorManager = (SensorManager) context().getSystemService(Context.SENSOR_SERVICE);
        }
        if (sensorManager == null) {
            return;
        }

        if (motionSensorListener == null) {
            motionSensorListener = new SensorEventListener() {
                @Override
                public void onSensorChanged(SensorEvent event) {
                    handleMotionSensor(event);
                }

                @Override
                public void onAccuracyChanged(Sensor sensor, int accuracy) {
                }
            };
        }

        Sensor accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
        if (accelerometer != null) {
            sensorManager.registerListener(motionSensorListener, accelerometer, SensorManager.SENSOR_DELAY_UI);
        }

        if (proximitySensorListener == null) {
            proximitySensorListener = new SensorEventListener() {
                @Override
                public void onSensorChanged(SensorEvent event) {
                    handleProximitySensor(event);
                }

                @Override
                public void onAccuracyChanged(Sensor sensor, int accuracy) {
                }
            };
        }

        Sensor proximity = sensorManager.getDefaultSensor(Sensor.TYPE_PROXIMITY);
        if (proximity != null) {
            sensorManager.registerListener(proximitySensorListener, proximity, SensorManager.SENSOR_DELAY_NORMAL);
        }
    }

    private void unregisterSensorListeners() {
        if (sensorManager == null) {
            return;
        }

        try {
            if (motionSensorListener != null) {
                sensorManager.unregisterListener(motionSensorListener);
            }
            if (proximitySensorListener != null) {
                sensorManager.unregisterListener(proximitySensorListener);
            }
        } catch (Exception ignored) {
        }
    }

    private void handleMotionSensor(SensorEvent event) {
        if (event == null || event.values == null || event.values.length < 3) {
            return;
        }

        float x = event.values[0];
        float y = event.values[1];
        float z = event.values[2];
        double force = Math.sqrt((x * x) + (y * y) + (z * z));
        long now = System.currentTimeMillis();

        if (force > 22.0 && now - lastShakeAt > 900) {
            lastShakeAt = now;
            try {
                JSONObject detail = baseEvent("celular:sacudido");
                detail.put("x", x);
                detail.put("y", y);
                detail.put("z", z);
                detail.put("force", force);
                detail.put("forca", force);
                dispatchEvent("celular:sacudido", detail);
            } catch (Exception ignored) {
            }
        }

        boolean faceDown = z < -8.0 && Math.abs(x) < 5.5 && Math.abs(y) < 5.5;
        if (faceDown) {
            if (faceDownStartedAt == 0) {
                faceDownStartedAt = now;
            }
            if (!faceDownDispatched && now - faceDownStartedAt > 300) {
                faceDownDispatched = true;
                try {
                    JSONObject detail = baseEvent("celular:tela_para_baixo");
                    detail.put("x", x);
                    detail.put("y", y);
                    detail.put("z", z);
                    detail.put("screenDown", true);
                    detail.put("telaParaBaixo", true);
                    dispatchEvent("celular:tela_para_baixo", detail);
                } catch (Exception ignored) {
                }
            }
            return;
        }

        faceDownStartedAt = 0;
        faceDownDispatched = false;
    }

    private void handleProximitySensor(SensorEvent event) {
        if (event == null || event.values == null || event.values.length == 0 || event.sensor == null) {
            return;
        }

        boolean near = event.values[0] < event.sensor.getMaximumRange();
        if (proximityNear == null) {
            proximityNear = near;
            return;
        }
        if (proximityNear.booleanValue() == near) {
            return;
        }
        proximityNear = near;

        if (!near) {
            return;
        }

        try {
            JSONObject detail = baseEvent("proximidade:perto");
            detail.put("near", true);
            detail.put("perto", true);
            detail.put("distance", event.values[0]);
            detail.put("distancia", event.values[0]);
            detail.put("maximumRange", event.sensor.getMaximumRange());
            detail.put("alcanceMaximo", event.sensor.getMaximumRange());
            dispatchEvent("proximidade:perto", detail);
        } catch (Exception ignored) {
        }
    }

    private void registerScreenshotObserver() {
        if (screenshotObserver != null) {
            return;
        }

        screenshotObserver = new ContentObserver(new Handler(Looper.getMainLooper())) {
            @Override
            public void onChange(boolean selfChange) {
                handleScreenshotChange(null);
            }

            @Override
            public void onChange(boolean selfChange, Uri uri) {
                handleScreenshotChange(uri);
            }
        };

        try {
            context().getContentResolver().registerContentObserver(
                MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                true,
                screenshotObserver
            );
        } catch (Exception ignored) {
        }
    }

    private void unregisterScreenshotObserver() {
        if (screenshotObserver == null) {
            return;
        }

        try {
            context().getContentResolver().unregisterContentObserver(screenshotObserver);
        } catch (Exception ignored) {
        }
        screenshotObserver = null;
    }

    private void handleScreenshotChange(Uri uri) {
        try {
            JSONObject detail = screenshotDetail(uri);
            if (detail == null) {
                return;
            }

            String screenshotUri = detail.optString("uri", "");
            long now = System.currentTimeMillis();
            if (screenshotUri.length() > 0 && screenshotUri.equals(lastScreenshotUri) && now - lastScreenshotAt < 2500) {
                return;
            }
            lastScreenshotUri = screenshotUri;
            lastScreenshotAt = now;
            dispatchEvent("print:tela", detail);
        } catch (Exception ignored) {
        }
    }

    private JSONObject screenshotDetail(Uri changedUri) throws Exception {
        JSONObject direct = changedUri == null ? null : queryScreenshotCandidate(changedUri, true);
        if (direct != null) {
            return direct;
        }
        return queryScreenshotCandidate(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, false);
    }

    private JSONObject queryScreenshotCandidate(Uri uri, boolean direct) throws Exception {
        if (uri == null) {
            return null;
        }

        Cursor cursor = null;
        try {
            String[] projection = screenshotProjection();
            String selection = direct ? null : MediaStore.Images.Media.DATE_ADDED + ">=?";
            String[] args = direct ? null : new String[] { String.valueOf((System.currentTimeMillis() / 1000) - 15) };
            String sort = direct ? null : MediaStore.Images.Media.DATE_ADDED + " DESC";
            cursor = context().getContentResolver().query(uri, projection, selection, args, sort);
            if (cursor == null || !cursor.moveToFirst()) {
                return null;
            }

            String displayName = cursorString(cursor, MediaStore.Images.Media.DISPLAY_NAME);
            String path = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
                ? cursorString(cursor, MediaStore.Images.Media.RELATIVE_PATH)
                : cursorString(cursor, MediaStore.Images.Media.DATA);
            if (!looksLikeScreenshot(displayName, path)) {
                return null;
            }

            JSONObject detail = baseEvent("print:tela");
            String id = cursorString(cursor, MediaStore.Images.Media._ID);
            Uri itemUri = direct ? uri : Uri.withAppendedPath(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, id);
            detail.put("uri", itemUri.toString());
            detail.put("name", displayName);
            detail.put("nome", displayName);
            detail.put("path", path);
            detail.put("caminho", path);
            detail.put("source", direct ? "media_observer" : "media_observer_recent");
            detail.put("origem", direct ? "media_observer" : "media_observer_recent");
            return detail;
        } finally {
            if (cursor != null) {
                cursor.close();
            }
        }
    }

    private String[] screenshotProjection() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            return new String[] {
                MediaStore.Images.Media._ID,
                MediaStore.Images.Media.DISPLAY_NAME,
                MediaStore.Images.Media.DATE_ADDED,
                MediaStore.Images.Media.RELATIVE_PATH
            };
        }
        return new String[] {
            MediaStore.Images.Media._ID,
            MediaStore.Images.Media.DISPLAY_NAME,
            MediaStore.Images.Media.DATE_ADDED,
            MediaStore.Images.Media.DATA
        };
    }

    private String cursorString(Cursor cursor, String column) {
        try {
            int index = cursor.getColumnIndex(column);
            if (index < 0) {
                return "";
            }
            String value = cursor.getString(index);
            return value == null ? "" : value;
        } catch (Exception ignored) {
            return "";
        }
    }

    private boolean looksLikeScreenshot(String displayName, String path) {
        String value = ((displayName == null ? "" : displayName) + " " + (path == null ? "" : path)).toLowerCase(Locale.ROOT);
        return value.contains("screenshot")
            || value.contains("screen_shot")
            || value.contains("screen shot")
            || value.contains("captura")
            || value.contains("capturas de tela")
            || value.contains("screenshots");
    }

    private void enableNfcForegroundDispatch() {
        Activity activity = cordova.getActivity();
        if (activity == null) {
            return;
        }

        if (nfcAdapter == null) {
            nfcAdapter = NfcAdapter.getDefaultAdapter(activity);
        }
        if (nfcAdapter == null || !nfcAdapter.isEnabled()) {
            return;
        }

        try {
            if (nfcPendingIntent == null) {
                Intent intent = new Intent(activity, activity.getClass()).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
                int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    flags |= PendingIntent.FLAG_MUTABLE;
                }
                nfcPendingIntent = PendingIntent.getActivity(activity, 0, intent, flags);
            }
            nfcAdapter.enableForegroundDispatch(activity, nfcPendingIntent, null, null);
        } catch (Exception ignored) {
        }
    }

    private void disableNfcForegroundDispatch() {
        if (nfcAdapter == null) {
            return;
        }

        try {
            nfcAdapter.disableForegroundDispatch(cordova.getActivity());
        } catch (Exception ignored) {
        }
    }

    private void handleNfcIntent(Intent intent, boolean dispatchToJs) {
        if (intent == null || !isNfcAction(intent.getAction())) {
            return;
        }

        JSONObject detail = parseNfcIntent(intent);
        if (detail != null && dispatchToJs) {
            dispatchEvent("nfc:recebido", detail);
        }
    }

    private boolean isNfcAction(String action) {
        return NfcAdapter.ACTION_NDEF_DISCOVERED.equals(action)
            || NfcAdapter.ACTION_TECH_DISCOVERED.equals(action)
            || NfcAdapter.ACTION_TAG_DISCOVERED.equals(action);
    }

    private JSONObject parseNfcIntent(Intent intent) {
        try {
            JSONObject detail = baseEvent("nfc:recebido");
            detail.put("action", intent.getAction());
            detail.put("acao", intent.getAction());

            Tag tag = intent.getParcelableExtra(NfcAdapter.EXTRA_TAG);
            if (tag != null) {
                detail.put("id", bytesToHex(tag.getId()));
                JSONArray techs = new JSONArray();
                String[] techList = tag.getTechList();
                if (techList != null) {
                    for (String tech : techList) {
                        techs.put(tech);
                    }
                }
                detail.put("technologies", techs);
                detail.put("tecnologias", techs);
            }

            JSONArray messages = nfcMessages(intent);
            detail.put("messages", messages);
            detail.put("mensagens", messages);
            return detail;
        } catch (Exception ignored) {
            return null;
        }
    }

    private JSONArray nfcMessages(Intent intent) throws Exception {
        JSONArray messages = new JSONArray();
        Parcelable[] rawMessages = intent.getParcelableArrayExtra(NfcAdapter.EXTRA_NDEF_MESSAGES);
        if (rawMessages == null) {
            return messages;
        }

        for (Parcelable raw : rawMessages) {
            if (!(raw instanceof NdefMessage)) {
                continue;
            }
            NdefMessage message = (NdefMessage) raw;
            JSONArray records = new JSONArray();
            for (NdefRecord record : message.getRecords()) {
                records.put(nfcRecordInfo(record));
            }
            JSONObject item = new JSONObject();
            item.put("records", records);
            item.put("registros", records);
            messages.put(item);
        }
        return messages;
    }

    private JSONObject nfcRecordInfo(NdefRecord record) throws Exception {
        JSONObject info = new JSONObject();
        info.put("tnf", record.getTnf());
        info.put("type", bytesToUtf8(record.getType()));
        info.put("tipo", bytesToUtf8(record.getType()));
        info.put("id", bytesToHex(record.getId()));
        info.put("payload", Base64.encodeToString(record.getPayload(), Base64.NO_WRAP));

        String text = nfcTextPayload(record);
        if (text != null) {
            info.put("text", text);
            info.put("texto", text);
        }
        return info;
    }

    private String nfcTextPayload(NdefRecord record) {
        try {
            if (record.getTnf() != NdefRecord.TNF_WELL_KNOWN || !"T".equals(bytesToUtf8(record.getType()))) {
                return null;
            }
            byte[] payload = record.getPayload();
            if (payload == null || payload.length < 2) {
                return null;
            }
            int status = payload[0] & 0xFF;
            int languageLength = status & 0x3F;
            String encoding = (status & 0x80) == 0 ? "UTF-8" : "UTF-16";
            int textStart = 1 + languageLength;
            if (textStart >= payload.length) {
                return "";
            }
            return new String(payload, textStart, payload.length - textStart, Charset.forName(encoding));
        } catch (Exception ignored) {
            return null;
        }
    }

    private String bytesToUtf8(byte[] bytes) {
        if (bytes == null || bytes.length == 0) {
            return "";
        }
        try {
            return new String(bytes, Charset.forName("UTF-8"));
        } catch (Exception ignored) {
            return "";
        }
    }

    private String bytesToHex(byte[] bytes) {
        if (bytes == null || bytes.length == 0) {
            return "";
        }
        StringBuilder builder = new StringBuilder();
        for (byte value : bytes) {
            builder.append(String.format(Locale.US, "%02X", value));
        }
        return builder.toString();
    }

    private void handleLinkIntent(Intent intent, boolean dispatchToJs) {
        if (intent == null) {
            return;
        }

        Uri uri = intent.getData();
        if (uri == null && intent.hasExtra(EXTRA_INITIAL_LINK)) {
            String linkStr = intent.getStringExtra(EXTRA_INITIAL_LINK);
            if (linkStr != null) {
                uri = Uri.parse(linkStr);
            }
        }

        if (uri == null) {
            return;
        }

        JSONObject detail = new JSONObject();
        try {
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

    private void handleSharedIntent(Intent intent, boolean dispatchToJs) {
        JSONObject detail = parseSharedIntent(intent);
        if (detail == null) {
            return;
        }

        try {
            initialShare = new JSONObject(detail.toString());
        } catch (Exception ignored) {
            initialShare = detail;
        }
        if (dispatchToJs) {
            dispatchEvent("compartilhamento:recebido", detail);
        }
    }

    private JSONObject parseSharedIntent(Intent intent) {
        if (intent == null || intent.getAction() == null) {
            return null;
        }
        String action = intent.getAction();
        if (!Intent.ACTION_SEND.equals(action) && !Intent.ACTION_SEND_MULTIPLE.equals(action)) {
            return null;
        }

        try {
            JSONObject detail = new JSONObject();
            JSONArray items = new JSONArray();
            String text = intent.getStringExtra(Intent.EXTRA_TEXT);
            String subject = intent.getStringExtra(Intent.EXTRA_SUBJECT);
            String title = intent.getStringExtra(Intent.EXTRA_TITLE);
            String mimeType = intent.getType();

            detail.put("action", action);
            detail.put("acao", action);
            detail.put("mimeType", mimeType == null ? "" : mimeType);
            detail.put("timestamp", System.currentTimeMillis());
            if (text != null && text.length() > 0) {
                detail.put("text", text);
                detail.put("texto", text);
            }
            if (subject != null && subject.length() > 0) {
                detail.put("subject", subject);
                detail.put("assunto", subject);
            }
            if (title != null && title.length() > 0) {
                detail.put("title", title);
                detail.put("titulo", title);
            }

            if (Intent.ACTION_SEND_MULTIPLE.equals(action)) {
                ArrayList<Uri> uris = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
                if (uris != null) {
                    for (Uri uri : uris) {
                        takeReadPermission(intent, uri);
                        items.put(sharedUriInfo(uri));
                    }
                }
            } else {
                Uri uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
                if (uri != null) {
                    takeReadPermission(intent, uri);
                    items.put(sharedUriInfo(uri));
                }
            }

            detail.put("items", items);
            detail.put("itens", items);
            if (items.length() == 1) {
                JSONObject first = items.optJSONObject(0);
                copyJsonFields(first, detail);
                String kind = first.optString("tipo", contentKind(mimeType));
                detail.put("tipo", kind);
                detail.put("type", first.optString("type", kind));
                detail.put("tipoConteudo", kind);
                detail.put("contentType", kind);
            } else if (items.length() > 1) {
                detail.put("tipo", "multiplos");
                detail.put("type", "multiple");
                detail.put("tipoConteudo", "multiplos");
                detail.put("contentType", "multiple");
            } else {
                detail.put("tipo", "texto");
                detail.put("type", "text");
                detail.put("tipoConteudo", "texto");
                detail.put("contentType", "text");
            }
            return detail;
        } catch (Exception ignored) {
            return null;
        }
    }

    private JSONObject sharedUriInfo(Uri uri) throws Exception {
        JSONObject info = fileInfo(uri);
        String kind = contentKind(info.optString("mimeType"));
        info.put("tipo", kind);
        info.put("type", kind);
        return info;
    }

    private void copyJsonFields(JSONObject source, JSONObject target) throws Exception {
        if (source == null || target == null) {
            return;
        }
        Iterator<String> keys = source.keys();
        while (keys.hasNext()) {
            String key = keys.next();
            if (!target.has(key)) {
                target.put(key, source.opt(key));
            }
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

    private void startNotificationPollerIfNeeded() {
        try {
            InputStream is = cordova.getActivity().getAssets().open("www/app.json");
            int size = is.available();
            byte[] buffer = new byte[size];
            is.read(buffer);
            is.close();
            JSONObject appJson = new JSONObject(new String(buffer, "UTF-8"));
            
            final String endpoint = appJson.optString("endpointNotification", "").trim();
            if (endpoint.isEmpty()) return;
            
            int intervalSeconds = appJson.optInt("timeNotification", 180);
            if (intervalSeconds < 30) intervalSeconds = 30;
            
            final long intervalMillis = intervalSeconds * 1000L;
            
            if (notificationPollerTimer != null) {
                notificationPollerTimer.cancel();
            }
            
            android.util.Log.d("Html2ApkBridge", "[NotificationPoller] Starting timer for endpoint: " + endpoint + " every " + intervalSeconds + "s");
            notificationPollerTimer = new java.util.Timer();
            notificationPollerTimer.scheduleAtFixedRate(new java.util.TimerTask() {
                @Override
                public void run() {
                    pollNotificationEndpoint(endpoint);
                }
            }, 5000, intervalMillis);
        } catch (Exception e) {
            android.util.Log.e("Html2ApkBridge", "Notification Poller init failed: " + e.getMessage());
        }
    }

    private void stopNotificationPoller() {
        if (notificationPollerTimer != null) {
            notificationPollerTimer.cancel();
            notificationPollerTimer = null;
        }
    }

    private void pollNotificationEndpoint(String endpoint) {
        try {
            android.util.Log.d("Html2ApkBridge", "[NotificationPoller] Checking for notifications at endpoint...");
            URL url = new URL(endpoint);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);
            
            int responseCode = conn.getResponseCode();
            if (responseCode == 200) {
                InputStream in = new java.io.BufferedInputStream(conn.getInputStream());
                BufferedReader reader = new BufferedReader(new InputStreamReader(in));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line);
                }
                reader.close();
                conn.disconnect();
                
                JSONObject data = new JSONObject(sb.toString());
                String id = data.optString("id", "");
                if (id.isEmpty()) {
                    android.util.Log.w("Html2ApkBridge", "[NotificationPoller] Empty or missing ID in response.");
                    return;
                }
                
                SharedPreferences prefs = preferencesStore();
                String lastId = prefs.getString("last_notification_id", "");
                
                if (!id.equals(lastId)) {
                    android.util.Log.d("Html2ApkBridge", "[NotificationPoller] New notification! Firing alert...");
                    JSONObject notifOptions = new JSONObject();
                    
                    String customTitle = data.optString("title", "");
                    if (!customTitle.isEmpty()) {
                        notifOptions.put("title", customTitle);
                    } else {
                        notifOptions.put("title", cordova.getActivity().getString(cordova.getActivity().getApplicationInfo().labelRes));
                    }
                    
                    notifOptions.put("message", data.optString("msg", "Nova notificação"));
                    notifOptions.put("id", id.hashCode());
                    
                    if (data.optBoolean("public", false)) {
                        notifOptions.put("public", true);
                    }
                    if (data.has("image") && !data.isNull("image")) {
                        notifOptions.put("image", data.optString("image"));
                    }
                    if (data.has("clickOpen") && !data.isNull("clickOpen")) {
                        JSONObject clickAction = new JSONObject();
                        clickAction.put("action", "openUrl");
                        clickAction.put("url", data.optString("clickOpen"));
                        notifOptions.put("onClick", clickAction);
                    }
                    
                    ensureNotificationChannel(context());
                    showNotification(notifOptions);
                    
                    prefs.edit().putString("last_notification_id", id).apply();
                } else {
                    android.util.Log.d("Html2ApkBridge", "[NotificationPoller] Notification ID already seen. Ignoring.");
                }
            } else {
                android.util.Log.e("Html2ApkBridge", "[NotificationPoller] Endpoint returned HTTP " + responseCode);
            }
        } catch (Exception e) {
            android.util.Log.e("Html2ApkBridge", "Notification Poller Error: " + e.getMessage());
        }
    }

    private static class BluetoothConnection {
        public final String id;
        public final BluetoothSocket socket;
        public final OutputStream outputStream;
        public Thread readThread;
        public final JSONObject device;

        public BluetoothConnection(String id, BluetoothSocket socket, OutputStream outputStream, JSONObject device) {
            this.id = id;
            this.socket = socket;
            this.outputStream = outputStream;
            this.device = device;
        }
    }
}
