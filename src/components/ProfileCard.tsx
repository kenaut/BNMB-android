import { useState } from "react";
import { loadProgress, saveProgress } from "../storage/persistence";
import { toLocalDate } from "../training/streak";
import { Avatar, AVATAR_PRESETS, readImageAsAvatar } from "./Avatar";

/** 简约编辑铅笔（SVG） */
function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4L16.5 3.5z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 火焰连胜：今天已学习 → 点亮；今天还没学 → 灰暗（天数仍显示 current） */
export function StreakFlame({
  current,
  longest,
  lastStudyDate,
  large,
}: {
  current: number;
  longest: number;
  lastStudyDate: string | null;
  large?: boolean;
}) {
  const lit = lastStudyDate !== null && lastStudyDate === toLocalDate(Date.now());
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <svg
        width={large ? 36 : 24}
        height={large ? 36 : 24}
        viewBox="0 0 24 24"
        aria-hidden
        style={{ opacity: lit ? 1 : 0.4, filter: lit ? "none" : "grayscale(1)" }}
      >
        <path
          d="M12 2c1 4-3 5-3 9a3 3 0 0 0 6 .5C16.5 10 18 11.5 18 14a6 6 0 1 1-12 0c0-5 5-7 6-12z"
          style={{ fill: lit ? "var(--flame-outer)" : "var(--text-tertiary)" }}
        />
        <path d="M12 22a3.5 3.5 0 0 1-3.5-3.5c0-2 2-3 3.5-6 1.5 3 3.5 4 3.5 6A3.5 3.5 0 0 1 12 22z"
          style={{ fill: lit ? "var(--flame-inner)" : "var(--flame-off-inner)" }} />
      </svg>
      <span>
        <b style={{ fontSize: large ? 26 : 18, color: lit ? "var(--flame-text)" : "var(--text-tertiary)" }}>
          {current} 天
        </b>
        <span style={{ display: "block", fontSize: 12, color: "var(--text-tertiary)" }}>
          火花连胜 · 最长 {longest} 天
        </span>
      </span>
    </span>
  );
}

/** 头像选择弹窗：内置头像 / 上传本地图片 / 恢复默认 */
function AvatarPicker({
  current,
  onPick,
  onClose,
}: {
  current?: string;
  onPick: (avatar?: string) => void;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    try {
      onPick(await readImageAsAvatar(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "图片处理失败");
    }
  };

  return (
    <div
      className="overlay-fade"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "var(--overlay)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 100,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="更换头像"
        className="modal-pop"
        style={{
          backgroundColor: "var(--surface)",
          borderRadius: 12,
          padding: 24,
          maxWidth: 440,
          width: "100%",
        }}
      >
        <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>更换头像</h2>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-secondary)" }}>
          选择内置头像，或上传一张本地图片（自动压缩，仅保存在本设备）。
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {AVATAR_PRESETS.map((preset) => {
            const active = current === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => onPick(preset.id)}
                aria-pressed={active}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  cursor: "pointer",
                  padding: "10px 4px",
                  borderRadius: 8,
                  backgroundColor: active ? "var(--accent-bg)" : "var(--surface)",
                  border: active ? "2px solid var(--accent)" : "1px solid var(--border)",
                  color: "var(--text)",
                }}
              >
                <Avatar avatar={preset.id} size={40} />
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {preset.label}
                </span>
              </button>
            );
          })}
        </div>

        {error && (
          <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--danger)" }}>{error}</p>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
          <label
            style={{
              cursor: "pointer",
              fontSize: 14,
              padding: "8px 16px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              backgroundColor: "var(--surface-subtle)",
            }}
          >
            上传本地图片
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                setError(null);
                void upload(file);
              }}
            />
          </label>
          <button
            onClick={() => onPick(undefined)}
            style={{
              cursor: "pointer",
              fontSize: 14,
              padding: "8px 16px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              backgroundColor: "var(--surface)",
              color: "var(--text)",
            }}
          >
            恢复默认
          </button>
          <button
            onClick={onClose}
            style={{ marginLeft: "auto", ...linkBtnStyle, fontSize: 14 }}
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
}

/** 个人信息卡：昵称（可编辑）+ 火花连胜 + 关键累计数据 */
export default function ProfileCard() {
  const [progress, setProgress] = useState(() => loadProgress());
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [picking, setPicking] = useState(false);

  const saveNickname = () => {
    const nickname = draft.trim().slice(0, 24) || "学习者";
    const current = loadProgress();
    const next = { ...current, profile: { ...current.profile, nickname } };
    if (saveProgress(next)) setProgress(next);
    setEditing(false);
  };

  const saveAvatar = (avatar?: string) => {
    const current = loadProgress();
    const next = { ...current, profile: { ...current.profile, avatar } };
    if (saveProgress(next)) setProgress(next);
    setPicking(false);
  };

  return (
    <>
      <section
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <button
            onClick={() => setPicking(true)}
            aria-label="更换头像"
            title="更换头像"
            style={{
              border: "none",
              background: "none",
              padding: 0,
              cursor: "pointer",
              borderRadius: "50%",
              lineHeight: 0,
            }}
          >
            <Avatar avatar={progress.profile.avatar} />
          </button>
          <div style={{ minWidth: 0 }}>
            {editing ? (
              <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <input
                  autoFocus
                  value={draft}
                  maxLength={24}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveNickname();
                    if (e.key === "Escape") setEditing(false);
                  }}
                  style={{
                    fontSize: 16,
                    padding: "2px 8px",
                    border: "1px solid var(--accent)",
                    borderRadius: 6,
                    outline: "none",
                    width: 140,
                  }}
                />
                <button onClick={saveNickname} style={linkBtnStyle}>保存</button>
              </span>
            ) : (
              <span style={{ fontSize: 18, fontWeight: 700 }}>
                {progress.profile.nickname}
                <button
                  onClick={() => {
                    setDraft(progress.profile.nickname);
                    setEditing(true);
                  }}
                  style={linkBtnStyle}
                  aria-label="编辑昵称"
                >
                  <PencilIcon />
                </button>
              </span>
            )}
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              已完成 {progress.totalSessions} 局 · {progress.totalQuestions} 题
            </div>
            <button
              onClick={() => setPicking(true)}
              style={{ ...linkBtnStyle, padding: "2px 0", fontSize: 12 }}
            >
              更换头像
            </button>
          </div>
        </div>

        <StreakFlame
          current={progress.streak.current}
          longest={progress.streak.longest}
          lastStudyDate={progress.streak.lastStudyDate}
          large
        />
      </section>

      {picking && (
        <AvatarPicker
          current={progress.profile.avatar}
          onPick={saveAvatar}
          onClose={() => setPicking(false)}
        />
      )}
    </>
  );
}

const linkBtnStyle: React.CSSProperties = {
  border: "none",
  background: "none",
  color: "var(--accent)",
  cursor: "pointer",
  fontSize: 13,
  padding: "0 4px",
};
