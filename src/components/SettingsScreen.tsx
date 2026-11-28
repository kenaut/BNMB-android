import { useState } from "react";
import { playSound } from "../audio/sound";
import { loadProgress, saveProgress } from "../storage/persistence";
import type { PracticeMode, Preferences, ThemeMode } from "../storage/progress";
import { THEME_LABELS, THEME_MODES } from "../theme/theme";
import {
  clearTtsConfig,
  DEFAULT_TTS_CONFIG,
  isTtsReady,
  loadTtsConfig,
  saveTtsConfig,
  type TtsConfig,
} from "../tts/config";
import { getTtsProvider, TTS_PROVIDERS, type TtsProviderId } from "../tts/providers";
import { playSpeech } from "../tts/speech";
import {
  getAndroidTtsStatus,
  isAndroidTtsUsable,
  openAndroidTtsSettings,
  refreshAndroidTts,
  type AndroidTtsStatus,
} from "../tts/androidBridge";

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
  {
    key: "showSpecialTag",
    title: "特例标签",
    desc: "标注特殊变化（如 行く 的促音便例外、ある 的特殊否定与可能形）。",
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
              backgroundColor: active ? "var(--accent-bg)" : "var(--surface)",
              border: active ? "2px solid var(--accent)" : "1px solid var(--border)",
              borderRadius: 8,
              padding: "16px 20px",
              color: "var(--text)",
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
                  color: "var(--accent)",
                  border: "1px solid var(--accent)",
                  borderRadius: 10,
                  padding: "1px 8px",
                }}
              >
                当前
              </span>
            )}
            <p style={{ margin: "8px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>
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
        aria-label="选择练习模式"
        className="modal-pop"
        style={{
          backgroundColor: "var(--surface)",
          borderRadius: 12,
          padding: 24,
          maxWidth: 480,
          width: "100%",
        }}
      >
        <h2 style={{ margin: "0 0 8px", fontSize: 22 }}>选择练习模式</h2>
        <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--text-secondary)" }}>
          两种模式随时可以在「设置」页切换，学习进度两种模式通用。
        </p>
        <ModeCards current={undefined} onPick={onChoose} />
      </div>
    </div>
  );
}

/** 各主题的说明文字 */
const THEME_INFO: Record<ThemeMode, string> = {
  system: "跟随设备 / 浏览器的深浅色设置自动切换。",
  light: "始终使用浅色界面。",
  dark: "始终使用深色界面，适合夜间练习。",
};

/** 主题预览用的固定色（不跟随当前主题，保证每种方案都能看出效果） */
const THEME_PREVIEW = {
  light: { bg: "#f7f7f5", surface: "#ffffff", text: "#1f2328", accent: "#0969da" },
  dark: { bg: "#0d1117", surface: "#161b22", text: "#e6edf3", accent: "#4493f8" },
};

function ThemePreview({ mode }: { mode: ThemeMode }) {
  const schemes: Array<"light" | "dark"> = mode === "system" ? ["light", "dark"] : [mode];
  return (
    <span
      aria-hidden
      style={{
        display: "flex",
        marginTop: 10,
        border: "1px solid #d0d7de",
        borderRadius: 6,
        overflow: "hidden",
        height: 46,
      }}
    >
      {schemes.map((s) => (
        <span
          key={s}
          style={{
            flex: 1,
            backgroundColor: THEME_PREVIEW[s].bg,
            padding: "7px 8px",
            display: "flex",
            flexDirection: "column",
            gap: 5,
          }}
        >
          <span
            style={{
              height: 6,
              width: "60%",
              borderRadius: 3,
              backgroundColor: THEME_PREVIEW[s].text,
              opacity: 0.85,
            }}
          />
          <span
            style={{
              height: 12,
              borderRadius: 3,
              backgroundColor: THEME_PREVIEW[s].surface,
              border: `1px solid ${THEME_PREVIEW[s].accent}`,
            }}
          />
        </span>
      ))}
    </span>
  );
}

/** 主题选择卡片（跟随系统 / 浅色 / 深色） */
function AppearanceCards({
  current,
  onPick,
}: {
  current: ThemeMode;
  onPick: (mode: ThemeMode) => void;
}) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {THEME_MODES.map((mode) => {
        const active = current === mode;
        return (
          <button
            key={mode}
            onClick={() => onPick(mode)}
            aria-pressed={active}
            style={{
              textAlign: "left",
              cursor: "pointer",
              backgroundColor: active ? "var(--accent-bg)" : "var(--surface)",
              border: active ? "2px solid var(--accent)" : "1px solid var(--border)",
              borderRadius: 8,
              padding: "16px 20px",
              color: "var(--text)",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18, fontWeight: 600 }}>{THEME_LABELS[mode]}</span>
              {active && (
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--accent)",
                    border: "1px solid var(--accent)",
                    borderRadius: 10,
                    padding: "1px 8px",
                  }}
                >
                  当前
                </span>
              )}
            </span>
            <p style={{ margin: "8px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>
              {THEME_INFO[mode]}
            </p>
            <ThemePreview mode={mode} />
          </button>
        );
      })}
    </div>
  );
}

interface SettingsScreenProps {
  themeMode: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
  /** 安卓专属：打开版本更新页；未传时不渲染该入口（与网页端保持组件通用） */
  onOpenUpdate?: () => void;
}

/** 设置子页面返回按钮 */
function BackToSettings({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        justifySelf: "start",
        border: "none",
        background: "none",
        color: "var(--accent)",
        cursor: "pointer",
        fontSize: 14,
        padding: 0,
      }}
    >
      ← 返回设置
    </button>
  );
}

/** TTS 表单字段样式 */
const ttsLabelStyle = { display: "grid", gap: 4, fontSize: 14 } as const;
/** TTS 页次要按钮（重新检测 / 系统设置 / 清除配置共用） */
const secondaryBtnStyle = {
  padding: "8px 16px",
  fontSize: 14,
  borderRadius: 6,
  border: "1px solid var(--border)",
  backgroundColor: "var(--surface)",
  color: "var(--text)",
  cursor: "pointer",
} as const;
const ttsInputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 12px",
  fontSize: 14,
  border: "1px solid var(--border)",
  borderRadius: 6,
  outline: "none",
  backgroundColor: "var(--surface)",
  color: "var(--text)",
} as const;

/** 设置页：练习模式 + 界面外观 + 音量控制 + AI 接入 + 做题偏好（立即生效） */
export default function SettingsScreen({
  themeMode,
  onThemeChange,
  onOpenUpdate,
}: SettingsScreenProps) {
  const [page, setPage] = useState<"main" | "appearance" | "volume" | "tts">("main");
  const [mode, setMode] = useState<PracticeMode | undefined>(
    () => loadProgress().practiceMode,
  );
  const [prefs, setPrefs] = useState<Preferences>(() => loadProgress().preferences);
  const [soundVolume, setSoundVolume] = useState(() => loadProgress().soundVolume);
  const [tts, setTts] = useState<TtsConfig>(() => loadTtsConfig() ?? DEFAULT_TTS_CONFIG);
  const [ttsTesting, setTtsTesting] = useState(false);
  const [ttsMessage, setTtsMessage] = useState<{ ok: boolean; text: string } | null>(null);
  /** 本地 TTS 引擎的实时状态（null = 非安卓壳），与配置里的 verified 分开展示 */
  const [androidStatus, setAndroidStatus] = useState<AndroidTtsStatus | null>(() =>
    getAndroidTtsStatus(),
  );

  const pick = (m: PracticeMode) => {
    persistMode(m);
    setMode(m);
  };

  const togglePref = (key: keyof Preferences, value: boolean) => {
    const next = { ...prefs, [key]: value };
    saveProgress({ ...loadProgress(), preferences: next });
    setPrefs(next);
  };

  const changeVolume = (value: number) => {
    saveProgress({ ...loadProgress(), soundVolume: value });
    setSoundVolume(value);
  };

  /** 切换服务商：自动带出该服务商的默认地址、模型与音色；本地 TTS 按引擎实时状态直接启用 */
  const changeProvider = (id: TtsProviderId) => {
    const preset = getTtsProvider(id);
    const status = preset.local ? getAndroidTtsStatus() : null;
    if (preset.local) setAndroidStatus(status);
    const next: TtsConfig = {
      ...tts,
      provider: id,
      baseUrl: preset.baseUrl,
      model: preset.model,
      voice: preset.voice,
      verified: preset.local ? isAndroidTtsUsable(status) : false,
    };
    setTts(next);
    saveTtsConfig(next);
    setTtsMessage(null);
  };

  /** 修改连接字段后必须重新测试，旧的「可用」状态作废 */
  const patchTtsField = (
    patch: Partial<Pick<TtsConfig, "baseUrl" | "apiKey" | "model" | "voice">>,
  ) => {
    const next = { ...tts, ...patch, verified: false };
    setTts(next);
    saveTtsConfig(next);
    setTtsMessage(null);
  };

  const patchTtsVolume = (volume: number) => {
    const next = { ...tts, volume };
    setTts(next);
    saveTtsConfig(next);
  };

  /** 测试连接：成功则启用朗读并试听，失败保留输入但保持未启用 */
  const testTts = async () => {
    if (
      tts.baseUrl.trim() === "" ||
      tts.apiKey.trim() === "" ||
      tts.model.trim() === "" ||
      tts.voice.trim() === ""
    ) {
      setTtsMessage({ ok: false, text: "请先填写接口地址、API Key、模型与音色。" });
      return;
    }
    setTtsTesting(true);
    setTtsMessage(null);
    try {
      await playSpeech("書きます", tts);
      const next = { ...tts, verified: true };
      setTts(next);
      saveTtsConfig(next);
      setTtsMessage({ ok: true, text: "连接成功，朗读已启用。" });
    } catch (err) {
      const next = { ...tts, verified: false };
      setTts(next);
      saveTtsConfig(next);
      setTtsMessage({
        ok: false,
        text: err instanceof Error ? err.message : "连接失败，请检查配置。",
      });
    } finally {
      setTtsTesting(false);
    }
  };

  /** 本地 TTS 试听：成功即启用（无需连接测试，引擎状态已在原生侧确认） */
  const testLocalTts = async () => {
    setTtsTesting(true);
    setTtsMessage(null);
    try {
      await playSpeech("書きます", tts);
      const next = { ...tts, verified: true };
      setTts(next);
      saveTtsConfig(next);
      setTtsMessage({ ok: true, text: "本地朗读已启用。" });
    } catch (err) {
      const next = { ...tts, verified: false };
      setTts(next);
      saveTtsConfig(next);
      setTtsMessage({
        ok: false,
        text: err instanceof Error ? err.message : "本地朗读失败，请检查语音引擎。",
      });
    } finally {
      setTtsTesting(false);
    }
  };

  /** 重新检测：原生重建引擎（异步），稍后读取状态并更新启用标记 */
  const recheckLocalTts = () => {
    refreshAndroidTts();
    setTtsMessage(null);
    window.setTimeout(() => {
      const status = getAndroidTtsStatus();
      setAndroidStatus(status);
      const usable = isAndroidTtsUsable(status);
      const next = { ...tts, verified: usable };
      setTts(next);
      saveTtsConfig(next);
      setTtsMessage(
        usable
          ? { ok: true, text: "检测成功，本地朗读已启用。" }
          : { ok: false, text: "仍不可用：请按上方指引安装引擎并下载日语语音数据，然后再试。" },
      );
    }, 800);
  };

  const resetTts = () => {
    clearTtsConfig();
    setTts(DEFAULT_TTS_CONFIG);
    setTtsMessage(null);
  };

  if (page === "appearance") {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <BackToSettings onClick={() => setPage("main")} />
        <section
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: 24,
          }}
        >
          <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>界面外观</h2>
          <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--text-secondary)" }}>
            选择应用配色，修改立即生效；「跟随系统」会随设备深浅色设置自动切换。
          </p>
          <AppearanceCards current={themeMode} onPick={onThemeChange} />
        </section>
      </div>
    );
  }

  if (page === "volume") {
    const percent = Math.round(soundVolume * 100);
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <BackToSettings onClick={() => setPage("main")} />
        <section
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: 24,
          }}
        >
          <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>音量控制</h2>
          <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--text-secondary)" }}>
            控制答对、答错与完成训练时的提示音音量，修改立即生效；拖到最左边即静音。
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={percent}
              onChange={(e) => changeVolume(Number(e.target.value) / 100)}
              aria-label="提示音音量"
              style={{
                flex: 1,
                accentColor: "var(--accent)",
                cursor: "pointer",
              }}
            />
            <span
              style={{
                minWidth: 52,
                textAlign: "right",
                fontVariantNumeric: "tabular-nums",
                fontWeight: 600,
              }}
            >
              {percent === 0 ? "静音" : `${percent}%`}
            </span>
          </div>
          <button
            onClick={() => playSound("correct", soundVolume)}
            disabled={soundVolume === 0}
            style={{
              marginTop: 16,
              padding: "8px 20px",
              fontSize: 14,
              borderRadius: 6,
              border: "1px solid var(--border)",
              backgroundColor: "var(--surface-subtle)",
              color: "var(--text)",
              cursor: soundVolume === 0 ? "not-allowed" : "pointer",
              opacity: soundVolume === 0 ? 0.5 : 1,
            }}
          >
            试听答对音
          </button>
        </section>
      </div>
    );
  }

  if (page === "tts") {
    const enabled = isTtsReady(tts);
    const preset = getTtsProvider(tts.provider);
    const isLocal = preset.local === true;
    const localUsable = isAndroidTtsUsable(androidStatus);
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <BackToSettings onClick={() => setPage("main")} />
        <section
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: 24,
          }}
        >
          <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>朗读（TTS）</h2>
          <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--text-secondary)" }}>
            安卓本地 TTS 使用系统引擎离线朗读，可用时默认开启；也可切换 OpenAI 兼容接口与 ElevenLabs / MiniMax / 通义千问 等云端 AI 服务。题目出现时自动朗读题面一次，答对后再朗读正确答案。
          </p>

          <div style={{ display: "grid", gap: 12 }}>
            <label style={ttsLabelStyle}>
              <span>服务商</span>
              <select
                value={tts.provider}
                onChange={(e) => changeProvider(e.target.value as TtsProviderId)}
                style={ttsInputStyle}
              >
                {TTS_PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            {preset.note && (
              <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                {preset.note}
                {preset.docsUrl && (
                  <>
                    {" "}
                    <a
                      href={preset.docsUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "var(--accent)" }}
                    >
                      查看文档
                    </a>
                  </>
                )}
              </p>
            )}
            {preset.warning && (
              <p style={{ margin: 0, fontSize: 12, color: "var(--danger)", lineHeight: 1.6 }}>
                {preset.warning}
              </p>
            )}
            {isLocal && (
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--surface-subtle)",
                  fontSize: 13,
                  lineHeight: 1.7,
                }}
              >
                {androidStatus === null ? (
                  <span>本地 TTS 仅在安卓应用中可用；当前环境请改用下方云端服务。</span>
                ) : localUsable ? (
                  <span style={{ color: "var(--success)" }}>
                    系统语音引擎可用，可离线朗读日语，无需网络与 API Key。
                  </span>
                ) : (
                  <>
                    <span style={{ color: "var(--warning-text)", fontWeight: 600 }}>
                      未检测到可用的日语语音引擎。
                    </span>
                    <br />
                    请安装或启用 <strong>Speech Services（Google 语音服务）</strong>{" "}
                    等 TTS 引擎，并在系统「文字转语音输出」设置中将其设为首选引擎、下载「日语（日本）」语音数据；完成后点下方「重新检测」。
                  </>
                )}
              </div>
            )}
            {!isLocal && (
              <>
                <label style={ttsLabelStyle}>
                  <span>接口地址</span>
                  <input
                    value={tts.baseUrl}
                    onChange={(e) => patchTtsField({ baseUrl: e.target.value })}
                    placeholder={preset.baseUrl}
                    style={ttsInputStyle}
                  />
                </label>
                <label style={ttsLabelStyle}>
                  <span>API Key</span>
                  <input
                    type="password"
                    value={tts.apiKey}
                    autoComplete="off"
                    onChange={(e) => patchTtsField({ apiKey: e.target.value })}
                    placeholder="sk-..."
                    style={ttsInputStyle}
                  />
                </label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                    gap: 12,
                  }}
                >
                  <label style={ttsLabelStyle}>
                    <span>模型</span>
                    <input
                      value={tts.model}
                      onChange={(e) => patchTtsField({ model: e.target.value })}
                      placeholder={preset.model}
                      style={ttsInputStyle}
                    />
                  </label>
                  <label style={ttsLabelStyle}>
                    <span>{preset.voiceLabel ?? "音色"}</span>
                    <input
                      value={tts.voice}
                      onChange={(e) => patchTtsField({ voice: e.target.value })}
                      placeholder={preset.voice}
                      style={ttsInputStyle}
                    />
                  </label>
                </div>
              </>
            )}
            <label style={ttsLabelStyle}>
              <span>朗读音量</span>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={Math.round(tts.volume * 100)}
                  onChange={(e) => patchTtsVolume(Number(e.target.value) / 100)}
                  aria-label="朗读音量"
                  style={{ flex: 1, accentColor: "var(--accent)", cursor: "pointer" }}
                />
                <span
                  style={{
                    minWidth: 52,
                    textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                    fontWeight: 600,
                  }}
                >
                  {Math.round(tts.volume * 100)}%
                </span>
              </div>
            </label>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginTop: 20,
              flexWrap: "wrap",
            }}
          >
            {isLocal ? (
              <>
                <button
                  onClick={() => void testLocalTts()}
                  disabled={!localUsable || ttsTesting}
                  className="btn-primary"
                  style={{ minWidth: 140 }}
                >
                  {ttsTesting ? "播放中…" : "试听"}
                </button>
                <button onClick={recheckLocalTts} style={secondaryBtnStyle}>
                  重新检测
                </button>
                {androidStatus !== null && (
                  <button onClick={openAndroidTtsSettings} style={secondaryBtnStyle}>
                    系统 TTS 设置
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={() => void testTts()}
                disabled={ttsTesting}
                className="btn-primary"
                style={{ minWidth: 140 }}
              >
                {ttsTesting ? "测试中…" : "测试并启用"}
              </button>
            )}
            <button onClick={resetTts} style={secondaryBtnStyle}>
              清除配置
            </button>
            <span
              style={{
                fontSize: 13,
                color: enabled ? "var(--success)" : "var(--text-secondary)",
              }}
            >
              {enabled ? "当前已启用" : "当前未启用"}
            </span>
          </div>

          {ttsMessage && (
            <p
              style={{
                margin: "12px 0 0",
                fontSize: 13,
                color: ttsMessage.ok ? "var(--success)" : "var(--danger)",
              }}
            >
              {ttsMessage.text}
            </p>
          )}

          {!isLocal && (
            <p
              style={{
                margin: "16px 0 0",
                fontSize: 12,
                color: "var(--text-tertiary)",
                lineHeight: 1.6,
              }}
            >
              API Key 仅保存在本设备浏览器中，不会写入学习进度备份；朗读请求会直接发送到你填写的服务，请使用支持浏览器跨域（CORS）的接口，并注意额度消耗。
            </p>
          )}
        </section>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: 24,
        }}
      >
        <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>练习模式</h2>
        <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--text-secondary)" }}>
          点击即可切换，立即生效；历史成绩与形态掌握进度不受影响。
        </p>
        <ModeCards current={mode} onPick={pick} />
      </section>

      <section
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: 24,
        }}
      >
        <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>界面外观</h2>
        <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--text-secondary)" }}>
          浅色 / 深色 / 跟随系统，修改立即生效。
        </p>
        <button
          onClick={() => setPage("appearance")}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            textAlign: "left",
            cursor: "pointer",
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "14px 18px",
            color: "var(--text)",
            fontSize: 15,
          }}
        >
          <span>外观模式</span>
          <span style={{ color: "var(--text-secondary)" }}>
            {THEME_LABELS[themeMode]} ›
          </span>
        </button>
      </section>

      <section
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: 24,
        }}
      >
        <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>声音</h2>
        <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--text-secondary)" }}>
          答题反馈提示音，音量可随时调整。
        </p>
        <button
          onClick={() => setPage("volume")}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            textAlign: "left",
            cursor: "pointer",
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "14px 18px",
            color: "var(--text)",
            fontSize: 15,
          }}
        >
          <span>音量控制</span>
          <span style={{ color: "var(--text-secondary)" }}>
            {soundVolume === 0 ? "静音" : `${Math.round(soundVolume * 100)}%`} ›
          </span>
        </button>
      </section>

      <section
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: 24,
        }}
      >
        <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>AI 接入</h2>
        <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--text-secondary)" }}>
          接入你自己的第三方 AI 服务，配置只保存在本设备。
        </p>
        <button
          onClick={() => setPage("tts")}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            textAlign: "left",
            cursor: "pointer",
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "14px 18px",
            color: "var(--text)",
            fontSize: 15,
          }}
        >
          <span>朗读（TTS）</span>
          <span style={{ color: "var(--text-secondary)" }}>
            {isTtsReady(tts) ? "已启用" : "未配置"} ›
          </span>
        </button>
      </section>

      <section
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: 24,
        }}
      >
        <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>做题偏好</h2>
        <p style={{ margin: "0 0 8px", fontSize: 14, color: "var(--text-secondary)" }}>
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
              borderTop: "1px solid var(--border-muted)",
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
                accentColor: "var(--accent)",
                cursor: "pointer",
              }}
            />
            <span>
              <span style={{ fontSize: 15, fontWeight: 600 }}>{item.title}</span>
              <span style={{ display: "block", fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
                {item.desc}
              </span>
            </span>
          </label>
        ))}
      </section>

      {onOpenUpdate && (
        <section
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: 24,
          }}
        >
          <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>版本更新</h2>
          <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--text-secondary)" }}>
            检查 GitHub 与 Gitee 镜像上的最新发行版，发现新版本可直接下载安装。
          </p>
          <button
            onClick={onOpenUpdate}
            style={{
              cursor: "pointer",
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "10px 18px",
              fontSize: 15,
              color: "var(--text)",
            }}
          >
            检查更新
          </button>
        </section>
      )}
    </div>
  );
}
