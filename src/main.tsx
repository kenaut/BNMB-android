import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { loadProgress } from "./storage/persistence";
import { applyTheme } from "./theme/theme";
import { migrateLegacyHistory } from "./training/migrate";
import { ensureDefaultTts } from "./tts/androidBridge";
import "./index.css";

// 首次启动：把旧版历史（hennimabi.history.v1）一次性迁移到统一存档（bnmb-progress）
migrateLegacyHistory();

// 渲染前先应用主题，避免深色偏好下闪白
applyTheme(loadProgress().theme);

// 安卓本地 TTS：引擎可用且用户从未配置过朗读时默认启用（已有 AI API 配置不覆盖）
ensureDefaultTts();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
