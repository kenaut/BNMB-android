import java.io.FileInputStream
import java.util.Properties

plugins {
    id("com.android.application")
}

// 正式签名信息：优先读环境变量（CI 用），其次读本地 keystore.properties（已被 .gitignore 忽略）
val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("keystore.properties")
if (keystorePropertiesFile.exists()) {
    FileInputStream(keystorePropertiesFile).use { keystoreProperties.load(it) }
}

fun signingValue(propertyKey: String, envKey: String): String? =
    System.getenv(envKey)?.takeIf { it.isNotBlank() }
        ?: keystoreProperties.getProperty(propertyKey)?.takeIf { it.isNotBlank() }

val releaseStoreFile = signingValue("storeFile", "BNMB_KEYSTORE_PATH")
val releaseStorePassword = signingValue("storePassword", "BNMB_KEYSTORE_PASSWORD")
val releaseKeyAlias = signingValue("keyAlias", "BNMB_KEY_ALIAS")
val releaseKeyPassword = signingValue("keyPassword", "BNMB_KEY_PASSWORD")
val hasReleaseSigning = !releaseStoreFile.isNullOrBlank() &&
    !releaseStorePassword.isNullOrBlank() &&
    !releaseKeyAlias.isNullOrBlank() &&
    !releaseKeyPassword.isNullOrBlank()

android {
    namespace = "com.kenaut.bnmb"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.kenaut.bnmb"
        minSdk = 24
        targetSdk = 34
        versionCode = 4
        versionName = "0.3.1"
    }

    signingConfigs {
        if (hasReleaseSigning) {
            create("release") {
                // storeFile 支持绝对路径；相对路径以 android/ 为基准
                storeFile = rootProject.file(releaseStoreFile!!)
                storePassword = releaseStorePassword
                keyAlias = releaseKeyAlias
                keyPassword = releaseKeyPassword
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            // 未配置签名时产出 app-release-unsigned.apk，Debug 构建不受影响
            if (hasReleaseSigning) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    // 以 https 虚拟域名托管本地 assets，避免 file:// 下 ES Module/localStorage 的兼容问题
    implementation("androidx.webkit:webkit:1.12.1")
}
