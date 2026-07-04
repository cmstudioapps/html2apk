package dev.html2apk.bridge;

import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaWebView;
import org.apache.cordova.CordovaInterface;
import org.json.JSONArray;
import org.json.JSONException;

public class Web2ApkInjector extends CordovaPlugin {

    @Override
    public void initialize(CordovaInterface cordova, CordovaWebView webView) {
        super.initialize(cordova, webView);
    }

    @Override
    public Object onMessage(String id, Object data) {
        if ("onPageFinished".equals(id)) {
            String url = data == null ? "" : data.toString();
            if (url.startsWith("http://") || url.startsWith("https://")) {
                if (!url.startsWith("https://localhost") && !url.startsWith("http://localhost")) {
                    injectCordova();
                }
            }
        }
        return null;
    }

    private void injectCordova() {
        String js = "javascript:(function() {" +
            "  if (window.cordova) return;" +
            "  var s = document.createElement('script');" +
            "  s.src = 'https://localhost/cordova.js';" +
            "  document.head.appendChild(s);" +
            "})();";
        
        cordova.getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                webView.getEngine().evaluateJavascript(js, null);
            }
        });
    }
}
