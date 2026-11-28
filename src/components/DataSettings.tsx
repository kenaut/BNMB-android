import { useRef, useState } from "react";
import {
  clearProgress,
  exportFileName,
  loadProgress,
  parseImport,
  saveProgress,
  serializeProgress,
} from "../storage/persistence";

type Status = { type: "ok" | "error"; text: string } | null;

/** 安卓壳通过 addJavascriptInterface 注入的原生桥 */
interface NativeExportBridge {
  /** WebView 内 blob 下载不会真正落盘，由原生写文件 */
  saveTextFile: (fileName: string, content: string) => void;
  /** 同步状态栏 / 导航栏深浅色（旧版安卓壳没有此方法，可选） */
  setSystemBarsDark?: (dark: boolean) => void;
}

declare global {
  interface Window {
    BNMBNative?: NativeExportBridge;
    __bnmbExportResult?: (ok: boolean) => void;
  }
}

/** 数据管理：导出 / 导入 / 清除学习数据（只操作本地，不涉及任何服务器） */
export default function DataSettings({ onChanged }: { onChanged: () => void }) {
  const [status, setStatus] = useState<Status>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    try {
      const text = serializeProgress(loadProgress());
      const fileName = exportFileName();
      const native = window.BNMBNative;
      if (native && typeof native.saveTextFile === "function") {
        window.__bnmbExportResult = (ok) => {
          window.__bnmbExportResult = undefined;
          setStatus(
            ok
              ? { type: "ok", text: `已保存备份文件：${fileName}` }
              : { type: "error", text: "未能保存备份文件，请重试。" },
          );
        };
        setStatus({ type: "ok", text: "请选择备份文件的保存位置…" });
        native.saveTextFile(fileName, text);
        return;
      }
      const blob = new Blob([text], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      setStatus({ type: "ok", text: "已导出备份文件。" });
    } catch {
      setStatus({ type: "error", text: "导出失败，请重试。" });
    }
  };

  const handleImportFile = async (file: File) => {
    const result = parseImport(await file.text());
    if (!result.ok) {
      setStatus({ type: "error", text: `导入失败：${result.error}` });
      return;
    }
    if (!window.confirm("导入将覆盖当前全部学习数据（累计统计、连续天数、历史成绩），确定继续吗？")) {
      setStatus(null);
      return;
    }
    if (saveProgress(result.progress)) {
      setStatus({ type: "ok", text: "导入成功，数据已更新。" });
      onChanged();
    } else {
      setStatus({ type: "error", text: "导入失败：当前浏览器无法写入本地存储。" });
    }
  };

  const handleClear = () => {
    if (!window.confirm("确定要清除全部学习数据吗？")) return;
    if (!window.confirm("再次确认：清除后无法恢复（可先导出备份）。真的要清除吗？")) return;
    clearProgress();
    setStatus({ type: "ok", text: "已清除全部学习数据。" });
    onChanged();
  };

  return (
    <section style={cardStyle}>
      <h3 style={sectionTitleStyle}>数据管理</h3>
      <p style={{ margin: "0 0 12px", color: "var(--text-secondary)", fontSize: 13 }}>
        数据仅保存在本设备浏览器中（localStorage），不会上传到任何服务器。
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={handleExport} style={btnStyle}>导出数据</button>
        <button onClick={() => fileRef.current?.click()} style={btnStyle}>导入数据</button>
        <button onClick={handleClear} style={{ ...btnStyle, color: "var(--danger)" }}>清除数据</button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleImportFile(file);
          e.target.value = ""; // 允许重复选择同一文件
        }}
      />
      {status && (
        <p
          role="status"
          style={{
            margin: "12px 0 0",
            padding: "8px 12px",
            borderRadius: 6,
            fontSize: 14,
            ...(status.type === "ok"
              ? { backgroundColor: "var(--success-bg)", color: "var(--success)", border: "1px solid var(--success-border)" }
              : { backgroundColor: "var(--danger-bg)", color: "var(--danger)", border: "1px solid var(--danger)" }),
          }}
        >
          {status.text}
        </p>
      )}
    </section>
  );
}

const cardStyle: React.CSSProperties = {
  backgroundColor: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: 20,
};

const sectionTitleStyle: React.CSSProperties = { margin: "0 0 8px", fontSize: 17 };

const btnStyle: React.CSSProperties = {
  minHeight: 36,
  padding: "6px 16px",
  fontSize: 14,
  border: "1px solid var(--border)",
  borderRadius: 6,
  cursor: "pointer",
  backgroundColor: "var(--surface-subtle)",
  color: "var(--text)",
};
