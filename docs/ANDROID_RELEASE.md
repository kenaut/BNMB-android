# Android 正式签名与发布

本文档记录 `变にまび` 安卓版的签名配置、Release 构建、覆盖升级规则与 GitHub Actions 自动构建方法。

## 1. 当前发布信息

| 项目 | 值 |
| --- | --- |
| applicationId | `com.kenaut.bnmb`（不可更改，否则会被视为新应用） |
| versionCode | 4 |
| versionName | 0.3.1 |
| 签名别名 | `bnmb` |
| 证书 SHA-256 | `f74f26481a5d7756345b12b0658542a3d817a0fec843a850b6aff343140d03b3` |
| 数据存储 | WebView `localStorage`，key 为 `bnmb-progress`，位于应用私有目录 |

> 证书指纹是升级兼容性的唯一凭据。更换签名后，已安装用户无法覆盖升级，数据也会随卸载被系统清除。

## 2. 密钥文件与密码（绝不入库）

| 文件 | 说明 | 是否提交 |
| --- | --- | --- |
| `android/keystore/bnmb-release.jks` | 正式签名密钥库（JKS） | 否（`.gitignore` 已忽略） |
| `android/keystore.properties` | 本地签名参数与密码 | 否（`.gitignore` 已忽略） |

`android/keystore.properties` 格式：

```properties
storeFile=keystore/bnmb-release.jks
storePassword=你的密钥库密码
keyAlias=bnmb
keyPassword=你的密钥密码
```

请把 JKS 与密码另外备份到安全位置（如密码管理器、离线加密盘）。密钥丢失后只能生成新证书，代价是所有用户必须卸载重装并手动迁移数据。

## 3. 生成新的 JKS（仅首次或密钥遗失时）

> 本仓库已存在正式密钥，**不要执行本命令覆盖**，否则会导致已发布版本无法升级。

```bash
cd android
mkdir -p keystore
keytool -genkeypair -v \
  -keystore keystore/bnmb-release.jks \
  -alias bnmb \
  -keyalg RSA -keysize 4096 -validity 10000 \
  -storetype JKS \
  -dname "CN=BNMB, OU=Android, O=Kenaut, L=Shanghai, ST=Shanghai, C=CN"
```

按提示设置密钥库密码与密钥密码（两者保持一致最省事），随后按上一节写入 `android/keystore.properties`。

## 4. 本地构建 Release

```bash
# 1. 构建 Web 资源（输出到 android/app/src/main/assets/www）
npm ci
npm test
npm run build

# 2. 构建已签名的 Release APK
cd android
./gradlew assembleRelease
```

签名信息读取顺序：**环境变量优先，其次 `keystore.properties`**。

| 环境变量 | 对应配置项 |
| --- | --- |
| `BNMB_KEYSTORE_PATH` | storeFile（相对路径以 `android/` 为基准，也支持绝对路径） |
| `BNMB_KEYSTORE_PASSWORD` | storePassword |
| `BNMB_KEY_ALIAS` | keyAlias |
| `BNMB_KEY_PASSWORD` | keyPassword |

示例：

```bash
cd android
BNMB_KEYSTORE_PATH=keystore/bnmb-release.jks \
BNMB_KEYSTORE_PASSWORD='***' \
BNMB_KEY_ALIAS=bnmb \
BNMB_KEY_PASSWORD='***' \
./gradlew assembleRelease
```

未提供任何签名参数时，构建仍会成功，但产物为 `app-release-unsigned.apk`（不可直接分发）。Debug 构建始终使用系统 debug 签名，不受影响。

产物路径：`android/app/build/outputs/apk/release/app-release.apk`

## 5. 验证签名

```bash
APK=android/app/build/outputs/apk/release/app-release.apk
APKSIGNER=$(ls -d "$ANDROID_HOME"/build-tools/*/apksigner | sort -V | tail -1)

"$APKSIGNER" verify --verbose --print-certs "$APK"
"$ANDROID_HOME"/build-tools/*/aapt dump badging "$APK" | grep -E "^package:|application-debuggable"
```

检查要点：

- 输出的证书 SHA-256 与第 1 节一致
- `package` 行显示期望的 `versionCode` / `versionName`
- 不出现 `application-debuggable`

## 6. 版本号与覆盖升级规则

1. `applicationId` 永久保持 `com.kenaut.bnmb`
2. 始终使用同一份 `bnmb-release.jks` 签名
3. 每次发版 `versionCode` 必须严格递增（当前为 5）

同时满足以上三点，新 APK 才能直接覆盖安装旧版本，并保留 `localStorage` 中的学习数据。

## 7. 0.3.0（Debug 签名）→ 0.3.1（正式签名）迁移

两个版本的签名证书不同，系统会拒绝覆盖安装，错误类似 `INSTALL_FAILED_UPDATE_INCOMPATIBLE`。**必须先备份数据，再卸载重装。**

0.3.0 的「导出数据」依赖浏览器 blob 下载，在 WebView 中不会真正落盘，因此无法直接备份。仓库 `apks/` 目录提供了同签名（debug）、同版本号（3）的迁移包：

1. 安装 [BNMB_android-v0.3.0-migrate.apk](../../apks/BNMB_android-v0.3.0-migrate.apk)（可直接覆盖当前 0.3.0，数据保留）
2. 打开「设置 → 数据管理 → 导出数据」，选择保存位置，得到 `bnmb-backup-YYYY-MM-DD.json`
3. 卸载应用（系统会清除应用私有数据）
4. 安装 `apks/BNMB_android-v0.3.1.apk`
5. 打开「设置 → 数据管理 → 导入数据」，选择刚导出的 JSON

迁移完成后可删除迁移包。此步骤仅适用于 0.3.0 → 0.3.1 这一次签名切换；之后的版本同签名，可直接覆盖安装。

## 8. GitHub Actions 自动构建

工作流：[`.github/workflows/android-release.yml`](../../.github/workflows/android-release.yml)，支持手动触发与推送 `v*` 标签触发。

在仓库 `Settings → Secrets and variables → Actions` 中添加：

| Secret | 内容 |
| --- | --- |
| `BNMB_KEYSTORE_BASE64` | JKS 的 Base64 文本 |
| `BNMB_KEYSTORE_PASSWORD` | 密钥库密码 |
| `BNMB_KEY_ALIAS` | `bnmb` |
| `BNMB_KEY_PASSWORD` | 密钥密码 |

生成 Base64：

```bash
base64 -w0 android/keystore/bnmb-release.jks > keystore.b64
# 将 keystore.b64 的内容粘贴到 BNMB_KEYSTORE_BASE64
```

工作流会依次执行：安装依赖 → 单元测试 → 构建 Web 资源 → 解码密钥 → `assembleRelease` → 校验签名 → 上传 APK 附件。密钥仅在运行器临时目录生成，构建结束后随运行器销毁。

## 9. 发版检查清单

- [ ] 同步网页版最新代码并通过 `npm test`
- [ ] 递增 `versionCode`、更新 `versionName`
- [ ] `npm run build` 更新 `android/app/src/main/assets/www`
- [ ] `./gradlew assembleRelease` 且产物已签名
- [ ] 核对证书 SHA-256、versionCode、非 debuggable
- [ ] 在旧版本设备上实测覆盖安装，确认学习数据保留
- [ ] 备份 JKS 与密码，确认未被 `git status` 跟踪
- [ ] 在 GitHub 与 Gitee 同时发布正式版（不勾「预发行版」），附件含 APK，更新日志写入发行版说明
- [ ] 用旧版本客户端实测能检查到新版本并完成安装

## 10. 版本更新检查与镜像源

客户端「设置 → 版本更新」会同时请求两个镜像源的发行版接口，地址硬编码在
[`UpdateManager.java`](../android/app/src/main/java/com/kenaut/bnmb/UpdateManager.java)：

| 源 | 接口 |
| --- | --- |
| GitHub | `https://api.github.com/repos/kenaut/BNMB-android/releases/latest` |
| Gitee 镜像 | `https://gitee.com/api/v5/repos/kenaut/bnmb-augm/releases/latest` |

两个接口返回的字段一致（`tag_name`、`body`、`assets[].browser_download_url`），
客户端取版本号较高且可用的一个；页面会同时展示两源的连通状态。

发布时必须满足以下约定，否则客户端检查不到更新：

1. 发行版为正式版，**不能勾选「预发行版」**，否则 `latest` 接口不会返回它
2. tag 使用 `v<versionName>`，例如 `v0.3.2`
3. 附件命名匹配 `BNMB_android-v<数字版本>.apk`，客户端会排除名称含 `migrate` 的产物
4. 更新日志写在发行版说明（`body`）中，客户端原样展示

Gitee 仓库名与 GitHub 不同（`bnmb-augm`），若仓库改名需同步修改 `UpdateManager.GITEE_API`。

下载完成后客户端会校验包名、签名证书与 `versionCode`：签名不一致或版本不高于当前版本时直接拒绝安装，
因此 `-migrate` 包（debug 签名、versionCode 3）不会被误装。
