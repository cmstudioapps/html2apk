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
        
        boolean isWeb2Apk = preferences.getBoolean("html2apkisweb2apk", false);
        if (isWeb2Apk) {
            cordova.getActivity().runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    android.view.View view = webView.getView();
                    if (view instanceof android.webkit.WebView) {
                        android.webkit.WebView web = (android.webkit.WebView) view;
                        web.getSettings().setCacheMode(android.webkit.WebSettings.LOAD_NO_CACHE);
                        web.clearCache(true);
                    }
                }
            });
        }
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
            "  var c = document.createElement('script');" +
            "  c.src = 'https://localhost/html2apk-runtime-console.js';" +
            "  document.head.appendChild(c);" +
            "  var b = document.createElement('script');" +
            "  b.src = 'https://localhost/html2apk-early-bridge.js';" +
            "  document.head.appendChild(b);" +
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
