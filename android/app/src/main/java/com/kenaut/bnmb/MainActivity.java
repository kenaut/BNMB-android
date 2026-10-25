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
