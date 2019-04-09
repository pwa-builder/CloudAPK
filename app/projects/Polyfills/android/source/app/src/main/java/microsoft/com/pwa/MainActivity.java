package microsoft.com.pwa;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.pm.ActivityInfo;
import android.content.res.AssetManager;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.webkit.*;

import org.json.*;

import java.io.*;
import java.util.Arrays;

public class MainActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        loadManifest();
        setDisplay(this);
        setOrientation(this);
        setName(this);
        setContentView(R.layout.activity_main);
        setWebView((WebView) this.findViewById(R.id.webView));
    }

    private void setDisplay(Activity activity) {
        if (this.manifestObject.optString("display").equals("fullscreen")) {
            activity.setTheme(R.style.FullscreenTheme);
        } else {
            activity.setTheme(R.style.AppTheme);
        }
    }

    private void setName(Activity activity) {
        String name = this.manifestObject.optString("name");
        if (!name.isEmpty()) {
            activity.setTitle(name);
        }
    }

    private static final String ANY = "any";
    private static final String NATURAL = "natural";
    private static final String PORTRAIT_PRIMARY = "portrait-primary";
    private static final String PORTRAIT_SECONDARY = "portrait-secondary";
    private static final String LANDSCAPE_PRIMARY = "landscape-primary";
    private static final String LANDSCAPE_SECONDARY = "landscape-secondary";
    private static final String PORTRAIT = "portrait";
    private static final String LANDSCAPE = "landscape";

    private void setOrientation(Activity activity) {
        String orientation = this.manifestObject.optString("orientation");
        switch (orientation) {
            case LANDSCAPE_PRIMARY:
                activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE);
                break;
            case PORTRAIT_PRIMARY:
                activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
                break;
            case LANDSCAPE:
                activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
                break;
            case PORTRAIT:
                activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_PORTRAIT);
                break;
            case LANDSCAPE_SECONDARY:
                activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_REVERSE_LANDSCAPE);
                break;
            case PORTRAIT_SECONDARY:
                activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_REVERSE_PORTRAIT);
                break;
            case ANY:
            case NATURAL:
            default:
                activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
                break;
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setWebView(WebView myWebView) {
        WebSettings webSettings = myWebView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        String start_url = this.manifestObject.optString("start_url");
        String scope = this.manifestObject.optString("scope");
        myWebView.setWebViewClient(new PwaWebViewClient(start_url, scope));
        myWebView.loadUrl(start_url);
    }

    private static final String DEFAULT_MANIFEST_FILE = "manifest.json";
    private JSONObject manifestObject;

    private void loadManifest() {
        if (this.assetExists((DEFAULT_MANIFEST_FILE))) {
            try {
                this.manifestObject = this.loadLocalManifest();
            } catch (JSONException e) {
                e.printStackTrace();
            }
        }
    }

    private boolean assetExists(String asset) {
        final AssetManager assetManager = this.getResources().getAssets();
        try {
            return Arrays.asList(assetManager.list("")).contains(asset);
        } catch (IOException e) {
            e.printStackTrace();
        }

        return false;
    }

    private JSONObject loadLocalManifest() throws JSONException {
        try {
            InputStream inputStream = this.getResources().getAssets().open(DEFAULT_MANIFEST_FILE);
            int size = inputStream.available();
            byte[] bytes = new byte[size];
            int readBytes = inputStream.read(bytes);
            inputStream.close();
            if (readBytes > 0) {
                String jsonString = new String(bytes, "UTF-8");
                return new JSONObject(jsonString);
            }
        } catch (IOException e) {
            e.printStackTrace();
        }

        return null;
    }
}
