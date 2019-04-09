package microsoft.com.pwa;

import android.content.Intent;
import android.net.Uri;
import android.webkit.*;

import java.net.MalformedURLException;
import java.net.URL;
import java.util.regex.Pattern;

class PwaWebViewClient extends WebViewClient {
    private Pattern scope_pattern;

    public PwaWebViewClient(String start_url, String scope) {
        try {
            URL baseUrl = new URL(start_url);
            URL scopeUrl = new URL(baseUrl, scope);
            if (!scopeUrl.toString().endsWith("*")) {
                scopeUrl = new URL(scopeUrl, "*");
            }

            this.scope_pattern = this.regexFromPattern(scopeUrl.toString());
        } catch (MalformedURLException e) {
            this.scope_pattern = null;
        }
    }

    @SuppressWarnings("deprecation")
    @Override
    public boolean shouldOverrideUrlLoading(WebView view, String url) {
        if (this.scoped(url)) {
            return false;
        } else {
            Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            view.getContext().startActivity(i);
            return true;
        }
    }

    private boolean scoped(String url) {
        return this.scope_pattern == null || this.scope_pattern.matcher(url).matches();
    }

    private Pattern regexFromPattern(String pattern) {
        final String toReplace = "\\.[]{}()^$?+|";
        StringBuilder regex = new StringBuilder();
        for (int i = 0; i < pattern.length(); i++) {
            char c = pattern.charAt(i);
            if (c == '*') {
                regex.append(".");
            } else if (toReplace.indexOf(c) > -1) {
                regex.append('\\');
            }
            regex.append(c);
        }
        return Pattern.compile(regex.toString());
    }
}

