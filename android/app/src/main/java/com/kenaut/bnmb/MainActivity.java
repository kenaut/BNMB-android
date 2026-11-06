package com.kenaut.bnmb;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.JsResult;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * 用 WebView 承载内置的 Web 版《变にまび》。
 * 页面资源通过 WebViewAssetLoader 以 https 虚拟域名提供，
 * 这样 ES Module、localStorage 等都能像普通网页一样正常工作。
 */
public class MainActivity extends Activity {

    private static final String START_URL =
            "https://appassets.androidplatform.net/assets/www/index.html";
    private static final int FILE_CHOOSER_REQUEST = 100;
    private static final int BACKGROUND_COLOR = Color.parseColor("#f7f7f5");

    private WebView webView;
    private ValueCallback<Uri[]> fileChooserCallback;
    private String cachedVideoPath;
    private byte[] cachedVideoBytes;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        configureSystemBars();

        WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView = new WebView(this);
        webView.setBackgroundColor(BACKGROUND_COLOR);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        // 学习进度保存在 localStorage 中，必须开启 DOM Storage
        settings.setDomStorageEnabled(true);
        // 网页已自带 viewport 与移动端适配，禁止额外的缩放操作
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            // 应用固定浅色主题，禁止系统深色模式强制反色
            settings.setForceDark(WebSettings.FORCE_DARK_OFF);
        }

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String path = request.getUrl().getPath();
                // WebViewAssetLoader 不支持 HTTP Range，内置视频需要单独处理才能拖动进度
                if (path != null && path.endsWith(".mp4")) {
                    WebResourceResponse response = serveVideo(request, path);
                    if (response != null) {
                        return response;
                    }
                }
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onJsAlert(WebView view, String url, String message, JsResult result) {
                showJsDialog(message, result, false);
                return true;
            }

            @Override
            public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {
                showJsDialog(message, result, true);
                return true;
            }

            /** 支持数据管理页的「导入数据」文件选择 */
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (fileChooserCallback != null) {
                    fileChooserCallback.onReceiveValue(null);
                }
                fileChooserCallback = callback;
                try {
                    startActivityForResult(params.createIntent(), FILE_CHOOSER_REQUEST);
                    return true;
                } catch (Exception e) {
                    fileChooserCallback = null;
                    callback.onReceiveValue(null);
                    return false;
                }
            }
        });

        setContentView(webView);
        webView.loadUrl(START_URL);
    }

    /** 以支持 HTTP Range 的方式返回内置视频，保证播放器可以拖动进度 */
    private WebResourceResponse serveVideo(WebResourceRequest request, String path) {
        String assetPath = path.startsWith("/") ? path.substring(1) : path;
        if (assetPath.startsWith("assets/")) {
            assetPath = assetPath.substring("assets/".length());
        }

        byte[] data;
        try {
            data = readVideoAsset(assetPath);
        } catch (IOException e) {
            return null;
        }

        long total = data.length;
        long start = 0;
        long end = total - 1;
        int status = 200;
        String reason = "OK";
        Map<String, String> headers = new HashMap<>();
        headers.put("Accept-Ranges", "bytes");
        headers.put("Content-Type", "video/mp4");

        String range = findRangeHeader(request);
        if (range != null && range.startsWith("bytes=")) {
            String[] parts = range.substring("bytes=".length()).trim().split("-", -1);
            try {
                if (parts[0].isEmpty() && parts.length > 1) {
                    long suffix = Long.parseLong(parts[1]);
                    start = Math.max(0, total - suffix);
                } else {
                    start = Long.parseLong(parts[0]);
                    if (parts.length > 1 && !parts[1].isEmpty()) {
                        end = Long.parseLong(parts[1]);
                    }
                }
                if (start >= total || start > end) {
                    Map<String, String> invalidHeaders = new HashMap<>();
                    invalidHeaders.put("Content-Range", "bytes */" + total);
                    return new WebResourceResponse("video/mp4", null, 416,
                            "Range Not Satisfiable", invalidHeaders,
                            new ByteArrayInputStream(new byte[0]));
                }
                end = Math.min(end, total - 1);
                status = 206;
                reason = "Partial Content";
                headers.put("Content-Range", "bytes " + start + "-" + end + "/" + total);
            } catch (NumberFormatException ignored) {
                start = 0;
                end = total - 1;
            }
        }

        headers.put("Content-Length", String.valueOf(end - start + 1));
        return new WebResourceResponse("video/mp4", null, status, reason, headers,
                new ByteArrayInputStream(data, (int) start, (int) (end - start + 1)));
    }

    private String findRangeHeader(WebResourceRequest request) {
        for (Map.Entry<String, String> entry : request.getRequestHeaders().entrySet()) {
            if ("range".equalsIgnoreCase(entry.getKey())) {
                return entry.getValue();
            }
        }
        return null;
    }

    /** 视频读取一次后缓存在内存中，避免拖动进度时反复解压 11MB 资源 */
    private byte[] readVideoAsset(String assetPath) throws IOException {
        if (cachedVideoBytes != null && assetPath.equals(cachedVideoPath)) {
            return cachedVideoBytes;
        }
        try (InputStream input = getAssets().open(assetPath)) {
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            byte[] buffer = new byte[8192];
            int read;
            while ((read = input.read(buffer)) != -1) {
                output.write(buffer, 0, read);
            }
            cachedVideoPath = assetPath;
            cachedVideoBytes = output.toByteArray();
            return cachedVideoBytes;
        }
    }

    /** 状态栏/导航栏与应用背景同色，并让图标适配浅色背景（含刘海屏情况） */
    private void configureSystemBars() {
        getWindow().setStatusBarColor(BACKGROUND_COLOR);
        int flags = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getWindow().setNavigationBarColor(BACKGROUND_COLOR);
            flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        } else {
            // Android 7.x 不支持浅色导航栏图标，改用深色导航栏
            getWindow().setNavigationBarColor(Color.parseColor("#1f2328"));
        }
        getWindow().getDecorView().setSystemUiVisibility(flags);
    }

    private void showJsDialog(String message, JsResult result, boolean confirm) {
        AlertDialog.Builder builder = new AlertDialog.Builder(this)
                .setMessage(message)
                .setPositiveButton(android.R.string.ok, (dialog, which) -> result.confirm())
                .setOnCancelListener(dialog -> result.cancel());
        if (confirm) {
            builder.setNegativeButton(android.R.string.cancel, (dialog, which) -> result.cancel());
        }
        builder.show();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode != FILE_CHOOSER_REQUEST) {
            super.onActivityResult(requestCode, resultCode, data);
            return;
        }
        if (fileChooserCallback != null) {
            Uri[] results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
            fileChooserCallback.onReceiveValue(results);
            fileChooserCallback = null;
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
