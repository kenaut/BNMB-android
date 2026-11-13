import { useState } from "react";
import { loadProgress, saveProgress } from "../storage/persistence";
import type { PracticeMode } from "../storage/progress";

const MODE_INFO: Record<PracticeMode, { title: string; desc: string }> = {
  adventure: {
    title: "闯关模式",
    desc: "从ます・ない・て・た四种基础形态起步，掌握后逐批解锁新形态，循序渐进。",
  },
  free: {
    title: "自由模式",
    desc: "全部 11 种活用形态直接开放，随意练习，适合已掌握大部分形态的学习者。",
  },
};

/** 把练习模式写入存档（存储不可用时调用方仍会更新本地状态） */
function persistMode(mode: PracticeMode) {
  saveProgress({ ...loadProgress(), practiceMode: mode });
}

/** 两种模式的选择卡片：设置页与首开弹窗共用 */
function ModeCards({
  current,
  onPick,
}: {
  current: PracticeMode | undefined;
  onPick: (mode: PracticeMode) => void;
}) {
  const modes: PracticeMode[] = ["adventure", "free"];
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {modes.map((mode) => {
        const active = current === mode;
        return (
          <button
            key={mode}
            onClick={() => onPick(mode)}
            style={{
              textAlign: "left",
              cursor: "pointer",
              backgroundColor: active ? "#ddf4ff" : "#fff",
              border: active ? "2px solid #0969da" : "1px solid #d0d7de",
              borderRadius: 8,
              padding: "16px 20px",
              color: "#1f2328",
            }}
          >
            <span style={{ fontSize: 18, fontWeight: 600, marginRight: 8 }}>
              {MODE_INFO[mode].title}
            </span>
            {active && (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#0969da",
                  border: "1px solid #0969da",
                  borderRadius: 10,
                  padding: "1px 8px",
                }}
              >
                当前
              </span>
            )}
            <p style={{ margin: "8px 0 0", fontSize: 14, color: "#57606a" }}>
              {MODE_INFO[mode].desc}
            </p>
          </button>
        );
      })}
    </div>
  );
}

/** 首次打开的模式选择弹窗（practiceMode 未设置时显示，必须选择后进入） */
export function ModeSelectModal({ onChoose }: { onChoose: (mode: PracticeMode) => void }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(31, 35, 40, 0.5)",
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
        aria-label="选择练习模式"
        style={{
          backgroundColor: "#fff",
          borderRadius: 12,
          padding: 24,
          maxWidth: 480,
          width: "100%",
        }}
      >
        <h2 style={{ margin: "0 0 8px", fontSize: 22 }}>选择练习模式</h2>
        <p style={{ margin: "0 0 16px", fontSize: 14, color: "#57606a" }}>
          两种模式随时可以在「设置」页切换，学习进度两种模式通用。
        </p>
        <ModeCards current={undefined} onPick={onChoose} />
      </div>
    </div>
  );
}

/** 设置页：切换练习模式（立即生效） */
export default function SettingsScreen() {
  const [mode, setMode] = useState<PracticeMode | undefined>(
    () => loadProgress().practiceMode,
  );

  const pick = (m: PracticeMode) => {
    persistMode(m);
    setMode(m);
  };

  return (
    <section
      style={{
        backgroundColor: "#fff",
        border: "1px solid #d0d7de",
        borderRadius: 8,
        padding: 24,
      }}
    >
      <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>练习模式</h2>
      <p style={{ margin: "0 0 16px", fontSize: 14, color: "#57606a" }}>
        点击即可切换，立即生效；历史成绩与形态掌握进度不受影响。
      </p>
      <ModeCards current={mode} onPick={pick} />
    </section>
  );
}
