import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";

interface SourceStatus {
  name: "github" | "gitee";
  ok: boolean;
  ms?: number;
  error?: string;
}

interface UpdateInfo {
  ok: boolean;
  currentVersion: string;
  latestVersion?: string;
  hasUpdate?: boolean;
  changelog?: string;
  apkUrl?: string;
  apkName?: string;
  apkSize?: number;
  source?: "github" | "gitee";
  sources?: SourceStatus[];
  error?: string;
}

/** 安卓壳注入的更新能力：检查与下载都在原生层完成，避免 WebView 跨域限制 */
interface UpdateBridge {
  checkUpdate: () => void;
  downloadUpdate: (url: string, apkName: string, sha256: string) => void;
}

declare global {
  interface Window {
    BNMBUpdater?: UpdateBridge;
    __bnmbUpdateResult?: (json: string) => void;
    __bnmbUpdateProgress?: (percent: number, status: string) => void;
    __bnmbDownloadResult?: (json: string) => void;
  }
}

const SOURCE_LABEL: Record<string, string> = {
  github: "GitHub",
  gitee: "Gitee 镜像",
};

type Notice = { type: "ok" | "error" | "info"; text: string } | null;

function formatSize(bytes?: number) {
  if (!bytes) return "";
  const mb = bytes / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

/** 版本更新：检查双镜像源、展示更新日志、下载并安装 */
export default function UpdateScreen({ onBack }: { onBack: () => void }) {
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<{ percent: number; status: string } | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const check = useCallback(() => {
    const bridge = window.BNMBUpdater;
    if (!bridge) {
      setNotice({ type: "error", text: "当前环境不支持检查更新，请在安卓版中使用该功能。" });
      return;
    }
    setChecking(true);
    setNotice(null);
    bridge.checkUpdate();
  }, []);

  useEffect(() => {
    window.__bnmbUpdateResult = (json) => {
      setChecking(false);
      try {
        const data = JSON.parse(json) as UpdateInfo;
        setInfo(data);
        if (!data.ok) {
          setNotice({ type: "error", text: data.error ?? "检查更新失败" });
        }
      } catch {
        setNotice({ type: "error", text: "更新信息解析失败" });
      }
    };
    window.__bnmbUpdateProgress = (percent, status) => {
      setProgress({ percent, status });
    };
    window.__bnmbDownloadResult = (json) => {
      setDownloading(false);
      setProgress(null);
      try {
        const data = JSON.parse(json) as { ok: boolean; message?: string };
        setNotice({
          type: data.ok ? "ok" : "error",
          text: data.message ?? (data.ok ? "已启动安装" : "更新失败"),
        });
      } catch {
        setNotice({ type: "error", text: "安装启动失败，请重试" });
      }
    };
    check();
    return () => {
      window.__bnmbUpdateResult = undefined;
      window.__bnmbUpdateProgress = undefined;
      window.__bnmbDownloadResult = undefined;
    };
  }, [check]);

  const handleDownload = () => {
    if (!info?.apkUrl || !window.BNMBUpdater) return;
    const target = info.apkName ?? `BNMB_android-v${info.latestVersion}.apk`;
    if (!window.confirm(`将下载 v${info.latestVersion}（${formatSize(info.apkSize)}）并安装，确定继续吗？`)) {
      return;
    }
    setDownloading(true);
    setNotice({ type: "info", text: `正在下载 ${target}…` });
    setProgress({ percent: 0, status: "正在连接…" });
    window.BNMBUpdater.downloadUpdate(info.apkUrl, target, "");
  };

  const hasUpdate = Boolean(info?.hasUpdate);
  // 已安装版本高于线上发行版时（本地构建），避免「最新版本」显示得比当前版本还低
  const latest = hasUpdate ? info?.latestVersion : (info?.currentVersion ?? info?.latestVersion);

  return (
    <div>
      <button
        onClick={onBack}
        style={{
          display: "inline-flex",
          alignItems: "center",
          minHeight: 44,
          padding: "6px 14px",
          marginBottom: 12,
          fontSize: 15,
          borderRadius: 6,
          border: "1px solid #d0d7de",
          backgroundColor: "#fff",
          color: "#1f2328",
          cursor: "pointer",
        }}
      >
        ← 返回设置
      </button>

      <section style={cardStyle}>
        <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>版本更新</h2>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "#57606a" }}>
          从 GitHub 与 Gitee 镜像同时检查最新发行版，下载后由系统安装器完成更新。
        </p>

        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 16 }}>
          <div>
            <div style={labelStyle}>当前版本</div>
            <div style={valueStyle}>
              {info ? `v${info.currentVersion}` : checking ? "检查中…" : "—"}
            </div>
          </div>
          <div>
            <div style={labelStyle}>最新版本</div>
            <div style={valueStyle}>{latest ? `v${latest}` : checking ? "检查中…" : "—"}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {(info?.sources ?? []).map((source) => (
            <span
              key={source.name}
              title={source.ok ? `响应 ${source.ms ?? 0} ms` : source.error}
              style={{
                fontSize: 12,
                padding: "3px 10px",
                borderRadius: 10,
                border: `1px solid ${source.ok ? "#1a7f37" : "#d0d7de"}`,
                color: source.ok ? "#1a7f37" : "#8c959f",
                backgroundColor: source.ok ? "#e8f5ec" : "#f6f8fa",
              }}
            >
              {SOURCE_LABEL[source.name] ?? source.name} {source.ok ? "可用" : "不可用"}
            </span>
          ))}
        </div>

        <div
          style={{
            border: "1px solid #d0d7de",
            borderRadius: 8,
            padding: 16,
            backgroundColor: "#f6f8fa",
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
            {hasUpdate ? `发现新版本 v${latest}` : info?.ok ? "已是最新版本" : "更新日志"}
          </div>
          <div
            style={{
              margin: 0,
              fontSize: 13,
              lineHeight: 1.7,
              color: "#57606a",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              maxHeight: 260,
              overflowY: "auto",
            }}
          >
            {info?.changelog?.trim() || (checking ? "正在获取更新日志…" : "该版本未提供更新日志。")}
          </div>
        </div>

        {notice && (
          <p
            style={{
              margin: "0 0 12px",
              fontSize: 13,
              color:
                notice.type === "error"
                  ? "#cf222e"
                  : notice.type === "ok"
                    ? "#1a7f37"
                    : "#57606a",
            }}
          >
            {notice.text}
          </p>
        )}

        {progress && (
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                height: 6,
                borderRadius: 3,
                backgroundColor: "#eaeef2",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, Math.max(0, progress.percent))}%`,
                  height: "100%",
                  backgroundColor: "#0969da",
                  transition: "width 0.2s",
                }}
              />
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: "#57606a" }}>{progress.status}</div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            className="btn-primary"
            onClick={handleDownload}
            disabled={!hasUpdate || checking || downloading || !info?.apkUrl}
            style={{ minHeight: 44 }}
          >
            {downloading ? "正在下载…" : hasUpdate ? `下载并安装 v${latest}` : "已是最新版本"}
          </button>
          <button onClick={check} disabled={checking || downloading} style={btnStyle}>
            {checking ? "检查中…" : "重新检查"}
          </button>
        </div>

        {info?.source && (
          <p style={{ margin: "12px 0 0", fontSize: 12, color: "#8c959f" }}>
            本次信息来自 {SOURCE_LABEL[info.source] ?? info.source}
          </p>
        )}
      </section>
    </div>
  );
}

const cardStyle: CSSProperties = {
  backgroundColor: "#fff",
  border: "1px solid #d0d7de",
  borderRadius: 8,
  padding: 24,
};

const labelStyle: CSSProperties = {
  fontSize: 12,
  color: "#8c959f",
  marginBottom: 2,
};

const valueStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  color: "#1f2328",
};

const btnStyle: CSSProperties = {
  minHeight: 44,
  padding: "8px 20px",
  fontSize: 15,
  borderRadius: 6,
  border: "1px solid #d0d7de",
  backgroundColor: "#fff",
  color: "#1f2328",
  cursor: "pointer",
};
