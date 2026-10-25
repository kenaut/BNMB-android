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

/** 数据管理：导出 / 导入 / 清除学习数据（只操作本地，不涉及任何服务器） */
export default function DataSettings({ onChanged }: { onChanged: () => void }) {
  const [status, setStatus] = useState<Status>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    try {
      const blob = new Blob([serializeProgress(loadProgress())], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = exportFileName();
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
      <p style={{ margin: "0 0 12px", color: "#57606a", fontSize: 13 }}>
        数据仅保存在本设备浏览器中（localStorage），不会上传到任何服务器。
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={handleExport} style={btnStyle}>导出数据</button>
        <button onClick={() => fileRef.current?.click()} style={btnStyle}>导入数据</button>
        <button onClick={handleClear} style={{ ...btnStyle, color: "#cf222e" }}>清除数据</button>
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
              ? { backgroundColor: "#dafbe1", color: "#1a7f37", border: "1px solid #2da44e" }
              : { backgroundColor: "#ffebe9", color: "#cf222e", border: "1px solid #cf222e" }),
          }}
        >
          {status.text}
        </p>
      )}
    </section>
  );
}

const cardStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  border: "1px solid #d0d7de",
  borderRadius: 8,
  padding: 20,
};

const sectionTitleStyle: React.CSSProperties = { margin: "0 0 8px", fontSize: 17 };

const btnStyle: React.CSSProperties = {
  minHeight: 36,
  padding: "6px 16px",
  fontSize: 14,
  border: "1px solid #d0d7de",
  borderRadius: 6,
  cursor: "pointer",
  backgroundColor: "#f6f8fa",
  color: "#1f2328",
};
