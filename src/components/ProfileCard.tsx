import { useState } from "react";
import { loadProgress, saveProgress } from "../storage/persistence";
import { toLocalDate } from "../training/streak";

/** 简约用户头像（SVG 线条人形） */
function UserAvatar({ size = 44 }: { size?: number }) {
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: "#ddf4ff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" fill="#0969da" />
        <path d="M4 20c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" fill="#0969da" />
      </svg>
    </div>
  );
}

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
          fill={lit ? "#e8590c" : "#8c959f"}
        />
        <path d="M12 22a3.5 3.5 0 0 1-3.5-3.5c0-2 2-3 3.5-6 1.5 3 3.5 4 3.5 6A3.5 3.5 0 0 1 12 22z"
          fill={lit ? "#ffd43b" : "#c9d1d9"} />
      </svg>
      <span>
        <b style={{ fontSize: large ? 26 : 18, color: lit ? "#bf5700" : "#8c959f" }}>
          {current} 天
        </b>
        <span style={{ display: "block", fontSize: 12, color: "#8c959f" }}>
          火花连胜 · 最长 {longest} 天
        </span>
      </span>
    </span>
  );
}

/** 个人信息卡：昵称（可编辑）+ 火花连胜 + 关键累计数据 */
export default function ProfileCard() {
  const [progress, setProgress] = useState(() => loadProgress());
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const saveNickname = () => {
    const nickname = draft.trim().slice(0, 24) || "学习者";
    const next = { ...loadProgress(), profile: { nickname } };
    if (saveProgress(next)) setProgress(next);
    setEditing(false);
  };

  return (
    <section
      style={{
        backgroundColor: "#fff",
        border: "1px solid #d0d7de",
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
        <UserAvatar />
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
                  border: "1px solid #0969da",
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
          <div style={{ fontSize: 13, color: "#57606a" }}>
            已完成 {progress.totalSessions} 局 · {progress.totalQuestions} 题
          </div>
        </div>
      </div>

      <StreakFlame
        current={progress.streak.current}
        longest={progress.streak.longest}
        lastStudyDate={progress.streak.lastStudyDate}
        large
      />
    </section>
  );
}

const linkBtnStyle: React.CSSProperties = {
  border: "none",
  background: "none",
  color: "#0969da",
  cursor: "pointer",
  fontSize: 13,
  padding: "0 4px",
};
