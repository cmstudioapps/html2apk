package dev.html2apk.bridge;

import android.app.PictureInPictureParams;
import android.os.Build;
import android.util.Rational;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.json.JSONObject;

public class Html2ApkPipManager {
    public static boolean enterPip(CordovaPlugin plugin, CallbackContext callbackContext, JSONObject options) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                PictureInPictureParams.Builder pipBuilder = new PictureInPictureParams.Builder();
                
                if (options != null && options.has("aspectRatio")) {
                    String ratio = options.optString("aspectRatio", "16:9");
                    String[] parts = ratio.split(":");
                    if (parts.length == 2) {
                        int num = Integer.parseInt(parts[0]);
                        int den = Integer.parseInt(parts[1]);
                        pipBuilder.setAspectRatio(new Rational(num, den));
                    }
                }
                
                boolean entered = plugin.cordova.getActivity().enterPictureInPictureMode(pipBuilder.build());
                if (entered) {
                    callbackContext.success();
                } else {
                    callbackContext.error("Failed to enter PiP mode. Check if device supports it or if it's enabled in settings.");
                }
                return true;
            } catch (Exception e) {
                callbackContext.error("Error entering PiP mode: " + e.getMessage());
                return true;
            }
        } else {
            callbackContext.error("Picture-in-Picture mode requires Android 8.0 (API level 26) or higher.");
            return true;
        }
    }
}
