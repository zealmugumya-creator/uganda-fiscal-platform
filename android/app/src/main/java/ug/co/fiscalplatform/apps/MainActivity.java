package ug.co.fiscalplatform.apps;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.util.HashMap;
import java.util.Map;

public class MainActivity extends Activity {
    private WebView webView;
    private static final Map<String, String> HOSTS = new HashMap<>();
    static {
        HOSTS.put("uganda-fiscal-platform.pages.dev", "portal");
        HOSTS.put("taxlink-uganda.pages.dev", "taxlink"); HOSTS.put("taxlinkconnect-uganda.pages.dev", "taxlinkconnect");
        HOSTS.put("credittrack-uganda.pages.dev", "credittrack"); HOSTS.put("verifyug-uganda.pages.dev", "verifyug");
        HOSTS.put("guardpost-uganda.pages.dev", "guardpost"); HOSTS.put("payrollguard-uganda.pages.dev", "payrollguard");
        HOSTS.put("deliverug-uganda.pages.dev", "deliverug"); HOSTS.put("procureguard-uganda.pages.dev", "procureguard");
        HOSTS.put("retailpulse-uganda.pages.dev", "retailpulse"); HOSTS.put("powercost-uganda.pages.dev", "powercost");
        HOSTS.put("efrisbridge-uganda.pages.dev", "efrisbridge"); HOSTS.put("efrisdash-uganda.pages.dev", "efrisdash");
        HOSTS.put("debtwatch-uganda.pages.dev", "debtwatch"); HOSTS.put("fiscalai-uganda.pages.dev", "fiscalai");
        HOSTS.put("customs-uganda.pages.dev", "customs");
    }

    @SuppressLint("SetJavaScriptEnabled") @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        webView = new WebView(this);
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.getSettings().setAllowFileAccess(true);
        webView.getSettings().setAllowContentAccess(true);
        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String host = request.getUrl().getHost();
                if (host != null && HOSTS.containsKey(host)) { loadLocal(HOSTS.get(host)); return true; }
                return false;
            }
        });
        setContentView(webView);
        loadLocal(BuildConfig.APP_SLUG);
    }
    private void loadLocal(String slug) {
        String path = slug.equals("portal") ? "portal/index.html" : "apps/" + slug + "/index.html";
        webView.loadUrl("file:///android_asset/" + path);
    }
    @Override public void onBackPressed() { if (webView.canGoBack()) webView.goBack(); else super.onBackPressed(); }
}
