# BNMB-android · 变にまび 安卓版

日语动词活用训练应用「变にまび」的安卓版本。前端沿用 Web 版（React + Vite），外层是原生 WebView 壳，所有资源内置在 APK 中，完全离线运行，不申请联网权限。

## 功能

- 12 种活用形训练，支持选择题与输入题，按形态分批解锁
- 词库 597 词（JLPT N5–N1），含复合动词注音
- 学习页：动词三分类教程、活用速查表、内置配套视频
- 学习进度、连续天数等数据保存在本地 `localStorage`
- 数据管理页支持 JSON 导入（导出为浏览器 blob 下载，见「已知限制」）

## 目录结构

| 路径 | 说明 |
| --- | --- |
| `src/` | Web 前端源码（页面、活用引擎、题库、持久化） |
| `video.mp4` | 学习页配套视频，构建时作为资源打进 APK |
| `android/` | Android 工程（Gradle + Java WebView 壳） |
| `android/app/src/main/assets/www/` | Web 构建产物（由 `npm run build` 生成） |
| `android/app/src/main/java/com/kenaut/bnmb/MainActivity.java` | WebView 容器、视频 Range 支持、文件导入 |
| `android/app/build.gradle.kts` | 版本号、SDK 与依赖配置 |
| `BNMB_android-v*.apk` | 打包产物 |

## 构建

环境要求：Node.js 18+、JDK 17+、Android SDK（compileSdk 36）。

```bash
# 1. 安装依赖并构建 Web 资源（输出到 android/app/src/main/assets/www）
npm install
npm run build

# 2. 打包 APK
cd android
./gradlew assembleDebug
```

`android/local.properties` 需指向本机 SDK，例如：

```properties
sdk.dir=/home/web/Android/Sdk
```

> 若本机 Gradle 全局缓存异常，可让本项目使用独立缓存目录：
> `GRADLE_USER_HOME=/home/web/repos/BNMB-android/.gradle-home ./gradlew assembleDebug`
> （该目录已加入 `.gitignore`）

## 覆盖升级

- `applicationId` 固定为 `com.kenaut.bnmb`，并使用同一签名证书
- 每次发版在 `android/app/build.gradle.kts` 中递增 `versionCode`
- 满足以上条件的新 APK 可直接覆盖安装旧版本，本地学习进度保留

## 版本记录

| 版本 | versionCode | 说明 |
| --- | --- | --- |
| v0.2.0 | 2 | 同步网页版 597 词库与首页文案；学习页视频改为本地内置，WebView 支持视频 Range 拖动 |
| v0.1.0 | 1 | 首个安卓版本，完成 Web 版迁移与移动端尺寸适配 |

## 测试

```bash
npm test                              # 单元测试（129 项）
npm run preview -- --port 4173        # 本地预览构建产物
```

## 已知限制

- 数据管理页的「导出数据」依赖浏览器 blob 下载，在 WebView 内不会真正写入文件；「导入数据」已通过系统文件选择器支持。
- 安卓包为 debug 签名，适合个人安装与分发测试；如需上架，请替换为正式签名并配置 release 构建。
