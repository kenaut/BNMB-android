import { useState } from "react";
import { loadProgress, saveProgress } from "../storage/persistence";
import type { PracticeMode, Preferences } from "../storage/progress";

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

/** 做题偏好开关定义 */
const PREF_ITEMS: Array<{ key: keyof Preferences; title: string; desc: string }> = [
  {
    key: "showFurigana",
    title: "假名显示",
    desc: "在汉字上方标注振假名；关闭后只显示汉字，更接近真实考试。",
  },
  {
    key: "showFormLabel",
    title: "形态显示",
    desc: "显示本题考查的目标形态徽章（如「て形」）。",
  },
  {
    key: "showVerbType",
    title: "动词属性",
    desc: "显示动词类别（五段 / 一段 / サ变 / カ变）。",
  },
];

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

/** 设置页：切换练习模式 + 做题偏好（立即生效）+ 版本更新入口 */
export default function SettingsScreen({ onOpenUpdate }: { onOpenUpdate: () => void }) {
  const [mode, setMode] = useState<PracticeMode | undefined>(
    () => loadProgress().practiceMode,
  );
  const [prefs, setPrefs] = useState<Preferences>(() => loadProgress().preferences);

  const pick = (m: PracticeMode) => {
    persistMode(m);
    setMode(m);
  };

  const togglePref = (key: keyof Preferences, value: boolean) => {
    const next = { ...prefs, [key]: value };
    saveProgress({ ...loadProgress(), preferences: next });
    setPrefs(next);
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
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

      <section
        style={{
          backgroundColor: "#fff",
          border: "1px solid #d0d7de",
          borderRadius: 8,
          padding: 24,
        }}
      >
        <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>做题偏好</h2>
        <p style={{ margin: "0 0 8px", fontSize: 14, color: "#57606a" }}>
          控制题目界面显示的提示，默认全部开启；修改后从主页重新进入练习即生效。
        </p>
        {PREF_ITEMS.map((item) => (
          <label
            key={item.key}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              padding: "12px 0",
              borderTop: "1px solid #eaeef2",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={prefs[item.key]}
              onChange={(e) => togglePref(item.key, e.target.checked)}
              style={{
                marginTop: 3,
                width: 18,
                height: 18,
                accentColor: "#0969da",
                cursor: "pointer",
              }}
            />
            <span>
              <span style={{ fontSize: 15, fontWeight: 600 }}>{item.title}</span>
              <span style={{ display: "block", fontSize: 13, color: "#57606a", marginTop: 2 }}>
                {item.desc}
              </span>
            </span>
          </label>
        ))}
      </section>

      <section
        style={{
          backgroundColor: "#fff",
          border: "1px solid #d0d7de",
          borderRadius: 8,
          padding: 24,
        }}
      >
        <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>版本更新</h2>
        <p style={{ margin: "0 0 16px", fontSize: 14, color: "#57606a" }}>
          检查 GitHub 与 Gitee 镜像上的最新发行版，发现新版本可直接下载安装。
        </p>
        <button
          onClick={onOpenUpdate}
          style={{
            cursor: "pointer",
            backgroundColor: "#fff",
            border: "1px solid #d0d7de",
            borderRadius: 6,
            padding: "10px 18px",
            fontSize: 15,
            color: "#1f2328",
          }}
        >
          检查更新
        </button>
      </section>
    </div>
  );
}
