/**
 * 提示音：用 Web Audio API 实时合成，不加载任何音频文件，
 * 因此不增加体积、不发网络请求，离线与 GitHub Pages 部署均可用。
 * 浏览器不支持 AudioContext 时静默降级（不抛异常）。
 */

/** 提示音类型：答对 / 答错 / 完成一轮训练 */
export type SoundKind = "correct" | "wrong" | "complete";

interface Note {
  /** 频率（Hz） */
  freq: number;
  /** 相对整段提示音的起始秒数 */
  start: number;
  /** 持续秒数 */
  duration: number;
  type: OscillatorType;
}

const PATTERNS: Record<SoundKind, Note[]> = {
  // 上行两音：清脆的「叮－叮」
  correct: [
    { freq: 659.25, start: 0, duration: 0.12, type: "sine" },
    { freq: 987.77, start: 0.1, duration: 0.22, type: "sine" },
  ],
  // 下行两音：低沉的「咚－」表示错误
  wrong: [
    { freq: 220, start: 0, duration: 0.18, type: "triangle" },
    { freq: 174.61, start: 0.14, duration: 0.26, type: "triangle" },
  ],
  // 四音琶音：完成训练的收尾提示
  complete: [
    { freq: 523.25, start: 0, duration: 0.16, type: "sine" },
    { freq: 659.25, start: 0.11, duration: 0.16, type: "sine" },
    { freq: 783.99, start: 0.22, duration: 0.16, type: "sine" },
    { freq: 1046.5, start: 0.33, duration: 0.34, type: "sine" },
  ],
};

/** 每种提示音的基准音量（再乘以用户设置的音量） */
const BASE_GAIN: Record<SoundKind, number> = {
  correct: 0.35,
  wrong: 0.28,
  complete: 0.32,
};

/** 把任意输入收敛到 0~1 的音量 */
export function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

type AudioContextCtor = new () => AudioContext;

/** 复用同一个 AudioContext（浏览器限制同时存在的实例数量） */
let context: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const ctor: AudioContextCtor | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
  if (!ctor) return null;
  if (!context) {
    try {
      context = new ctor();
    } catch {
      return null;
    }
  }
  return context;
}

/**
 * 播放提示音。
 * @param kind 提示音类型
 * @param volume 用户音量（0~1，0 表示静音；越界自动收敛）
 */
export function playSound(kind: SoundKind, volume: number): void {
  const v = clampVolume(volume);
  if (v <= 0) return;

  const ctx = getContext();
  if (!ctx) return;
  // 自动播放策略：用户首次交互前的上下文是 suspended，恢复后即可发声
  if (ctx.state === "suspended") {
    void ctx.resume().catch(() => {});
  }

  const master = ctx.createGain();
  master.gain.value = BASE_GAIN[kind] * v;
  master.connect(ctx.destination);

  const notes = PATTERNS[kind];
  const lastEnd = Math.max(...notes.map((n) => n.start + n.duration));
  const now = ctx.currentTime;

  for (const note of notes) {
    const startAt = now + note.start;
    const endAt = startAt + note.duration;
    const osc = ctx.createOscillator();
    const envelope = ctx.createGain();
    osc.type = note.type;
    osc.frequency.setValueAtTime(note.freq, startAt);
    // 短促淡入淡出，避免起止爆音
    envelope.gain.setValueAtTime(0.0001, startAt);
    envelope.gain.exponentialRampToValueAtTime(1, startAt + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, endAt);
    osc.connect(envelope);
    envelope.connect(master);
    osc.start(startAt);
    osc.stop(endAt + 0.02);
    osc.onended = () => {
      osc.disconnect();
      envelope.disconnect();
      // 最后一个音符结束后释放总增益节点，避免长期累积
      if (note.start + note.duration === lastEnd) master.disconnect();
    };
  }
}
