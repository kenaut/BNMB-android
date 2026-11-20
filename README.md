# BNMB-android · 变にまび 安卓版

日语动词活用训练应用「变にまび」的安卓版本。前端沿用 Web 版（React + Vite），外层是原生 WebView 壳，所有学习资源内置在 APK 中；除「版本更新」检查外完全离线。

## 功能

- 12 种活用形训练，支持选择题与输入题，按形态分批解锁
- 词库 597 词（JLPT N5–N1），含复合动词注音
- 学习页：动词三分类教程、活用速查表、内置配套视频
- 学习进度、连续天数等数据保存在本地 `localStorage`
- 数据管理页支持 JSON 导出 / 导入（安卓端通过系统「保存到文件」选择器完成）
- 设置页「版本更新」：GitHub 与 Gitee 双镜像源检查，展示更新日志并直接下载安装

## 目录结构

| 路径 | 说明 |
| --- | --- |
| `src/` | Web 前端源码（页面、活用引擎、题库、持久化） |
| `video.mp4` | 学习页配套视频，构建时作为资源打进 APK |
| `android/` | Android 工程（Gradle + Java WebView 壳） |
| `android/app/src/main/assets/www/` | Web 构建产物（由 `npm run build` 生成） |
| `android/app/src/main/java/com/kenaut/bnmb/MainActivity.java` | WebView 容器、视频 Range 支持、文件导入 / 导出 |
| `android/app/src/main/java/com/kenaut/bnmb/UpdateManager.java` | 版本检查、APK 下载与签名校验 |
| `android/app/build.gradle.kts` | 版本号、SDK 与签名配置 |
| `docs/ANDROID_RELEASE.md` | 正式签名、Release 构建与发布流程 |
| `.github/workflows/android-release.yml` | GitHub Actions 自动构建 Release APK |
| `apks/` | 各版本 APK 归档 |
| `release/` | 发版暂存目录（APK 副本 + 元数据 + Release 说明），不入库 |

## 构建

环境要求：Node.js 18+、JDK 17+、Android SDK（compileSdk 36）。

```bash
# 1. 安装依赖并构建 Web 资源（输出到 android/app/src/main/assets/www）
npm install
npm run build

# 2. 调试包
cd android
./gradlew assembleDebug

# 3. 正式签名 Release 包（需先配置签名，见 docs/ANDROID_RELEASE.md）
./gradlew assembleRelease
```

`android/local.properties` 需指向本机 SDK，例如：

```properties
sdk.dir=/home/web/Android/Sdk
```

> 若本机 Gradle 全局缓存异常，可让本项目使用独立缓存目录：
> `GRADLE_USER_HOME=/home/web/repos/BNMB-android/.gradle-home ./gradlew assembleDebug`
> （该目录已加入 `.gitignore`）

签名参数优先读环境变量（`BNMB_KEYSTORE_PATH` / `BNMB_KEYSTORE_PASSWORD` / `BNMB_KEY_ALIAS` / `BNMB_KEY_PASSWORD`），
其次读本地 `android/keystore.properties`。两者都被 `.gitignore` 忽略，切勿提交。

## 覆盖升级

- `applicationId` 固定为 `com.kenaut.bnmb`，并使用同一签名证书
- 每次发版在 `android/app/build.gradle.kts` 中递增 `versionCode`
- 满足以上条件的新 APK 可直接覆盖安装旧版本，本地学习进度保留

0.3.0 为 debug 签名、0.3.1 切换为正式签名，两者无法互相覆盖，迁移步骤见
[docs/ANDROID_RELEASE.md](docs/ANDROID_RELEASE.md#7-030debug-签名--031正式签名迁移)。

## 版本记录

| 版本 | versionCode | 说明 |
| --- | --- | --- |
| v0.4.0 | 6 | 学习页活用速查表改为竖屏折叠列表；动词一览支持搜索筛选；设置页新增做题偏好 |
| v0.3.2 | 5 | 新增「版本更新」：GitHub + Gitee 双镜像检查更新、展示更新日志、下载并安装 |
| v0.3.1 | 4 | 切换正式签名（JKS，alias `bnmb`），新增原生备份导出；同签名的后续版本可直接覆盖升级 |
| v0.3.0 | 3 | 同步网页版新功能：闯关/自由双模式、自选变形专练、选择题「同词干 × 错误词尾」干扰项，新增设置页 |
| v0.2.0 | 2 | 同步网页版 597 词库与首页文案；学习页视频改为本地内置，WebView 支持视频 Range 拖动 |
| v0.1.0 | 1 | 首个安卓版本，完成 Web 版迁移与移动端尺寸适配 |

## 测试

```bash
npm test                              # 单元测试（144 项）
npm run preview -- --port 4173        # 本地预览构建产物
```

## 已知限制

- 0.3.0 → 0.3.1 因签名变更必须卸载重装，需先用迁移包导出备份（详见 `docs/ANDROID_RELEASE.md`）。
- 首次通过「版本更新」安装时，需在系统设置中允许本应用「安装未知应用」。
