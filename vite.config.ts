import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // APK 内通过 WebViewAssetLoader 以相对路径加载，资源使用 ./ 前缀
  base: "./",
  plugins: [react()],
  build: {
    // 直接输出到 Android 工程的 assets，打包 APK 时随应用一起内置
    outDir: "android/app/src/main/assets/www",
    emptyOutDir: true,
  },
  test: {
    environment: "node",
  },
});
