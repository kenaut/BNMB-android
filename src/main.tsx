import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { migrateLegacyHistory } from "./training/migrate";
import "./index.css";

// 首次启动：把旧版历史（hennimabi.history.v1）一次性迁移到统一存档（bnmb-progress）
migrateLegacyHistory();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
