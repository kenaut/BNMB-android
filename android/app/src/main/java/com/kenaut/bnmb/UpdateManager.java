package com.kenaut.bnmb;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.content.pm.SigningInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

/**
 * 版本更新检查与安装。
 *
 * <p>同时请求 GitHub 与 Gitee 两个镜像源的 Release 接口，取版本较高的可用结果；
 * 下载完成后先校验包名、签名证书与 versionCode，再交给系统安装器，
 * 避免误装迁移包（debug 签名）或降级安装导致数据丢失。
 */
class UpdateManager {

    /** 所有回调都在主线程执行 */
    interface Listener {
        void onCheckResult(JSONObject result);

        void onProgress(int percent, String status);

        void onDownloadResult(JSONObject result);
    }

    private static final String SOURCE_GITHUB = "github";
    private static final String SOURCE_GITEE = "gitee";

    /** GitHub 为主源，Gitee 为国内镜像源（仓库名与 GitHub 不同，勿写错） */
    private static final String GITHUB_API =
            "https://api.github.com/repos/kenaut/BNMB-android/releases/latest";
    private static final String GITEE_API =
            "https://gitee.com/api/v5/repos/kenaut/bnmb-augm/releases/latest";

    /** 正式安装包的命名约定，需排除 -migrate 等特殊产物 */
    private static final String APK_PREFIX = "BNMB_android-v";
    private static final String APK_SUFFIX = ".apk";

    private static final int CONNECT_TIMEOUT_MS = 8000;
    private static final int READ_TIMEOUT_MS = 10000;

    private final Context context;
    private final Listener listener;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final ExecutorService executor = Executors.newFixedThreadPool(3);

    UpdateManager(Context context, Listener listener) {
        this.context = context.getApplicationContext();
        this.listener = listener;
    }

    void shutdown() {
        executor.shutdownNow();
    }

    /** 两个镜像源并行检查，全部返回后再统一决策 */
    void check() {
        executor.execute(() -> {
            ExecutorService pool = Executors.newFixedThreadPool(2);
            SourceResult github;
            SourceResult gitee;
            try {
                Future<SourceResult> a = pool.submit(() -> fetch(SOURCE_GITHUB, GITHUB_API));
                Future<SourceResult> b = pool.submit(() -> fetch(SOURCE_GITEE, GITEE_API));
                github = await(a);
                gitee = await(b);
            } finally {
                pool.shutdown();
            }
            postCheckResult(github, gitee);
        });
    }

    /** 下载并安装；sha256 为空时跳过摘要校验，签名校验始终执行 */
    void download(String url, String apkName, String sha256) {
        executor.execute(() -> {
            JSONObject result = new JSONObject();
            try {
                File apk = downloadApk(url, apkName);
                listenerOnProgress(100, "正在校验安装包…");

                if (sha256 != null && !sha256.isEmpty()) {
                    String actual = sha256(apk);
                    if (!sha256.equalsIgnoreCase(actual)) {
                        // 摘要不符说明下载被截断或被篡改，直接删除避免误装
                        apk.delete();
                        throw new IOException("安装包校验失败，请重试");
                    }
                }

                verifyPackage(apk);
                String hint = install(apk);
                result.put("ok", hint == null);
                result.put("message", hint == null ? "已启动安装程序，请在系统弹窗中确认" : hint);
                result.put("needsPermission", hint != null);
            } catch (Exception e) {
                try {
                    result.put("ok", false);
                    result.put("message",
                            e.getMessage() == null ? "更新失败，请稍后重试" : e.getMessage());
                } catch (Exception ignored) {
                    // put 字符串不会失败，这里仅满足编译期的异常声明
                }
            }
            postDownloadResult(result);
        });
    }

    // ---------------------------------------------------------------- 检查更新

    private SourceResult fetch(String source, String api) {
        SourceResult result = new SourceResult(source);
        long start = SystemClock.elapsedRealtime();
        try {
            JSONObject json = new JSONObject(httpGet(api));
            result.version = json.optString("tag_name", "").trim();
            result.changelog = json.optString("body", "").trim();

            JSONArray assets = json.optJSONArray("assets");
            if (assets != null) {
                for (int i = 0; i < assets.length(); i++) {
                    JSONObject asset = assets.optJSONObject(i);
                    if (asset == null) {
                        continue;
                    }
                    String name = asset.optString("name", "");
                    if (!isReleaseApk(name)) {
                        continue;
                    }
                    result.apkName = name;
                    result.apkUrl = asset.optString("browser_download_url", "");
                    result.apkSize = asset.optLong("size", 0);
                    break;
                }
            }

            if (result.version.isEmpty()) {
                result.error = "返回数据缺少版本号";
            } else if (result.apkUrl == null || result.apkUrl.isEmpty()) {
                result.error = "该发行版未附带安装包";
            } else {
                result.ok = true;
            }
        } catch (Exception e) {
            result.error = describe(e);
        }
        result.ms = SystemClock.elapsedRealtime() - start;
        return result;
    }

    private void postCheckResult(SourceResult github, SourceResult gitee) {
        JSONObject out;
        try {
            out = buildCheckResult(github, gitee);
        } catch (Exception e) {
            out = new JSONObject();
            try {
                out.put("ok", false);
                out.put("currentVersion", currentVersionName());
                out.put("error", "检查更新失败：" + describe(e));
            } catch (Exception ignored) {
                // JSONObject 写入字符串不会失败，此处仅防御
            }
        }
        JSONObject result = out;
        // 回调统一切回主线程，evaluateJavascript 只能在 UI 线程调用
        mainHandler.post(() -> listener.onCheckResult(result));
    }

    private JSONObject buildCheckResult(SourceResult github, SourceResult gitee) throws Exception {
        JSONObject out = new JSONObject();
        String current = currentVersionName();
        out.put("currentVersion", current);
        out.put("currentVersionCode", currentVersionCode());
        out.put("sources", toSourcesJson(github, gitee));

        SourceResult best = pickBest(github, gitee);
        if (best == null) {
            out.put("ok", false);
            out.put("error", "两个镜像源均无法访问，请检查网络后重试");
            return out;
        }

        String latest = normalizeVersion(best.version);
        out.put("ok", true);
        out.put("source", best.source);
        out.put("latestVersion", latest);
        out.put("hasUpdate", compareVersion(latest, current) > 0);
        out.put("changelog", best.changelog);
        out.put("apkUrl", best.apkUrl);
        out.put("apkName", best.apkName);
        out.put("apkSize", best.apkSize);
        return out;
    }

    /** 取版本号更高的可用源；版本相同时优先 GitHub */
    private SourceResult pickBest(SourceResult github, SourceResult gitee) {
        boolean gh = github != null && github.ok;
        boolean ge = gitee != null && gitee.ok;
        if (gh && ge) {
            int cmp = compareVersion(normalizeVersion(gitee.version), normalizeVersion(github.version));
            return cmp > 0 ? gitee : github;
        }
        if (gh) {
            return github;
        }
        return ge ? gitee : null;
    }

    private JSONArray toSourcesJson(SourceResult github, SourceResult gitee) throws Exception {
        JSONArray array = new JSONArray();
        for (SourceResult item : new SourceResult[]{github, gitee}) {
            if (item == null) {
                continue;
            }
            JSONObject entry = new JSONObject();
            entry.put("name", item.source);
            entry.put("ok", item.ok);
            entry.put("ms", item.ms);
            if (!item.ok) {
                entry.put("error", item.error == null ? "无法访问" : item.error);
            }
            array.put(entry);
        }
        return array;
    }

    // ---------------------------------------------------------------- 下载安装

    private File downloadApk(String url, String apkName) throws IOException {
        if (url == null || url.isEmpty()) {
            throw new IOException("下载地址为空");
        }
        File dir = new File(context.getCacheDir(), "updates");
        if (!dir.exists() && !dir.mkdirs()) {
            throw new IOException("无法创建缓存目录");
        }
        // 清理上一次的残留文件
        File[] stale = dir.listFiles();
        if (stale != null) {
            for (File file : stale) {
                file.delete();
            }
        }

        File target = new File(dir, sanitizeName(apkName));
        HttpURLConnection conn = null;
        try {
            conn = openConnection(url);
            int code = conn.getResponseCode();
            if (code != HttpURLConnection.HTTP_OK) {
                throw new IOException("下载失败（HTTP " + code + "）");
            }
            long total = conn.getContentLengthLong();
            long read = 0;
            int lastPercent = -1;
            try (InputStream input = new BufferedInputStream(conn.getInputStream());
                 OutputStream output = new FileOutputStream(target)) {
                byte[] buffer = new byte[16 * 1024];
                int len;
                while ((len = input.read(buffer)) != -1) {
                    output.write(buffer, 0, len);
                    read += len;
                    if (total > 0) {
                        int percent = (int) (read * 100 / total);
                        if (percent >= lastPercent + 2 || percent == 100) {
                            lastPercent = percent;
                            listenerOnProgress(percent, "正在下载 " + percent + "%");
                        }
                    }
                }
            }
            if (total > 0 && read != total) {
                target.delete();
                throw new IOException("下载不完整，请重试");
            }
            return target;
        } catch (IOException e) {
            target.delete();
            throw e;
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
    }

    /** 校验包名、签名与版本号：签名不同或版本更低都会导致安装失败或数据丢失 */
    private void verifyPackage(File apk) throws Exception {
        PackageManager pm = context.getPackageManager();
        int flags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                ? PackageManager.GET_SIGNING_CERTIFICATES
                : PackageManager.GET_SIGNATURES;
        PackageInfo archive = pm.getPackageArchiveInfo(apk.getAbsolutePath(), flags);
        if (archive == null) {
            apk.delete();
            throw new IOException("安装包已损坏，请重试");
        }
        if (!context.getPackageName().equals(archive.packageName)) {
            apk.delete();
            throw new IOException("安装包与当前应用不匹配");
        }

        PackageInfo installed = pm.getPackageInfo(context.getPackageName(), flags);
        long archiveCode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                ? archive.getLongVersionCode()
                : archive.versionCode;
        long installedCode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                ? installed.getLongVersionCode()
                : installed.versionCode;
        if (archiveCode <= installedCode) {
            apk.delete();
            throw new IOException("该安装包版本不高于当前版本，已取消");
        }

        List<byte[]> archiveCerts = certificateBytes(archive);
        List<byte[]> installedCerts = certificateBytes(installed);
        for (byte[] a : archiveCerts) {
            for (byte[] b : installedCerts) {
                if (Arrays.equals(a, b)) {
                    return;
                }
            }
        }
        apk.delete();
        throw new IOException("安装包签名与当前版本不一致，无法覆盖安装");
    }

    @SuppressWarnings("deprecation")
    private List<byte[]> certificateBytes(PackageInfo info) {
        List<byte[]> result = new ArrayList<>();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            SigningInfo signingInfo = info.signingInfo;
            if (signingInfo != null) {
                Signature[] signatures = signingInfo.hasMultipleSigners()
                        ? signingInfo.getApkContentsSigners()
                        : signingInfo.getSigningCertificateHistory();
                if (signatures != null) {
                    for (Signature signature : signatures) {
                        result.add(signature.toByteArray());
                    }
                }
            }
        } else if (info.signatures != null) {
            for (Signature signature : info.signatures) {
                result.add(signature.toByteArray());
            }
        }
        return result;
    }

    /**
     * 拉起系统安装器。
     *
     * @return 需要用户手动处理的提示；返回 null 表示已成功调起安装界面
     */
    private String install(File apk) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                && !context.getPackageManager().canRequestPackageInstalls()) {
            Intent settings = new Intent(
                    Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + context.getPackageName()));
            settings.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try {
                context.startActivity(settings);
                return "请先允许「安装未知应用」，然后返回重试";
            } catch (Exception e) {
                return "请到系统设置中允许本应用安装未知应用后重试";
            }
        }
        Uri uri = FileProvider.getUriForFile(
                context, context.getPackageName() + ".fileprovider", apk);
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(uri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION
                | Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            context.startActivity(intent);
            return null;
        } catch (Exception e) {
            return "无法启动安装程序，请检查系统权限设置";
        }
    }

    // ---------------------------------------------------------------- 工具方法

    private HttpURLConnection openConnection(String url) throws IOException {
        HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
        conn.setConnectTimeout(CONNECT_TIMEOUT_MS);
        conn.setReadTimeout(READ_TIMEOUT_MS);
        conn.setInstanceFollowRedirects(true);
        // GitHub API 要求携带 User-Agent，否则直接返回 403
        conn.setRequestProperty("User-Agent", "BNMB-Android-UpdateChecker");
        conn.setRequestProperty("Accept", "application/json, application/octet-stream");
        conn.setRequestProperty("Cache-Control", "no-cache");
        return conn;
    }

    private String httpGet(String url) throws IOException {
        HttpURLConnection conn = null;
        try {
            conn = openConnection(url);
            int code = conn.getResponseCode();
            if (code != HttpURLConnection.HTTP_OK) {
                throw new IOException("HTTP " + code);
            }
            try (InputStream input = conn.getInputStream()) {
                ByteArrayOutputStream output = new ByteArrayOutputStream();
                byte[] buffer = new byte[8192];
                int len;
                while ((len = input.read(buffer)) != -1) {
                    output.write(buffer, 0, len);
                }
                return output.toString("UTF-8");
            }
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
    }

    private String sha256(File file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream input = new FileInputStream(file)) {
            byte[] buffer = new byte[16 * 1024];
            int len;
            while ((len = input.read(buffer)) != -1) {
                digest.update(buffer, 0, len);
            }
        }
        StringBuilder sb = new StringBuilder();
        for (byte b : digest.digest()) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    private String currentVersionName() {
        try {
            return context.getPackageManager()
                    .getPackageInfo(context.getPackageName(), 0).versionName;
        } catch (PackageManager.NameNotFoundException e) {
            return "0.0.0";
        }
    }

    private long currentVersionCode() {
        try {
            PackageInfo info = context.getPackageManager()
                    .getPackageInfo(context.getPackageName(), 0);
            return Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                    ? info.getLongVersionCode()
                    : info.versionCode;
        } catch (PackageManager.NameNotFoundException e) {
            return 0;
        }
    }

    private static boolean isReleaseApk(String name) {
        return name != null
                && name.startsWith(APK_PREFIX)
                && name.endsWith(APK_SUFFIX)
                && !name.contains("migrate");
    }

    /** tag 可能带 v 前缀，统一去掉后再比较 */
    private static String normalizeVersion(String version) {
        if (version == null) {
            return "";
        }
        String value = version.trim();
        return value.startsWith("v") || value.startsWith("V") ? value.substring(1) : value;
    }

    /** 逐段比较数字版本号，避免字符串比较下 "0.10.0" 小于 "0.9.0" 的错误 */
    static int compareVersion(String a, String b) {
        String[] left = a.split("\\.");
        String[] right = b.split("\\.");
        int length = Math.max(left.length, right.length);
        for (int i = 0; i < length; i++) {
            int l = i < left.length ? parseNumber(left[i]) : 0;
            int r = i < right.length ? parseNumber(right[i]) : 0;
            if (l != r) {
                return l > r ? 1 : -1;
            }
        }
        return 0;
    }

    private static int parseNumber(String value) {
        try {
            return Integer.parseInt(value.replaceAll("[^0-9]", ""));
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private static String sanitizeName(String apkName) {
        if (apkName == null || apkName.isEmpty()) {
            return "update.apk";
        }
        String cleaned = apkName.replaceAll("[^A-Za-z0-9._-]", "");
        if (cleaned.isEmpty()) {
            return "update.apk";
        }
        return cleaned.endsWith(APK_SUFFIX) ? cleaned : cleaned + APK_SUFFIX;
    }

    private static String describe(Exception e) {
        if (e instanceof java.net.SocketTimeoutException) {
            return "连接超时";
        }
        if (e instanceof java.net.UnknownHostException) {
            return "无法解析域名";
        }
        if (e instanceof IOException && e.getMessage() != null) {
            return e.getMessage();
        }
        return e.getClass().getSimpleName();
    }

    private static SourceResult await(Future<SourceResult> future) {
        try {
            return future.get();
        } catch (Exception e) {
            return null;
        }
    }

    private void listenerOnProgress(int percent, String status) {
        mainHandler.post(() -> listener.onProgress(percent, status));
    }

    private void postDownloadResult(JSONObject result) {
        mainHandler.post(() -> listener.onDownloadResult(result));
    }

    /** 单个镜像源的一次查询结果 */
    private static final class SourceResult {
        final String source;
        boolean ok;
        long ms;
        String error;
        String version;
        String changelog;
        String apkUrl;
        String apkName;
        long apkSize;

        SourceResult(String source) {
            this.source = source;
        }
    }
}
