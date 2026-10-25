plugins {
    id("com.android.application")
}

android {
    namespace = "com.kenaut.bnmb"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.kenaut.bnmb"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "0.1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
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
