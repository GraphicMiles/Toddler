package ai.forgeai.app;

import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;

import androidx.webkit.WebSettingsCompat;
import androidx.webkit.WebView;
import androidx.webkit.WebViewClient;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Keep screen on while using AI
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // Configure WebView settings for better performance
        View webViewView = findViewById(getWebView().getId());
        if (webViewView instanceof WebView) {
            webView = (WebView) webViewView;
            webView.getSettings().setDomStorageEnabled(true);
            webView.getSettings().setDatabaseEnabled(true);
            webView.getSettings().setCacheMode(WebView.LOAD_DEFAULT);
            webView.getSettings().setMixedContentMode(WebSettingsCompat.MIXED_CONTENT_COMPATIBILITY_MODE);
            webView.getSettings().setUserAgentString(webView.getSettings().getUserAgentString() + " ForgeAI/1.0");
        }
    }

    @Override
    public void onBackPressed() {
        // Check if WebView can go back
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
