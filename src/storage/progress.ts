/**
 * 学习数据统一结构（localStorage 单 key：bnmb-progress）。
 * version 字段用于未来迁移；读取时经 sanitizeProgress 校验修复，
 * 任何缺字段/坏结构都不会传入应用层。
 */

export const PROGRESS_VERSION = 1;

export interface Streak {
  /** 当前连续学习天数 */
  current: number;
  /** 历史最长连续学习天数 */
  longest: number;
  /** 最后学习日期（本地日历 YYYY-MM-DD），从未学习为 null */
  lastStudyDate: string | null;
}

/** 答题计数（分形态 / 分动词共用） */
export interface Counter {
  attempts: number;
  correct: number;
}

/** 单次训练结果（recentResults 元素） */
export interface RecentResult {
  /** 本地时间 "YYYY-MM-DD HH:mm" */
  date: string;
  totalQuestions: number;
  correctAnswers: number;
  /** 0~1 */
  accuracy: number;
  elapsedMs: number;
}

/** 个人资料（仅本地，不含任何敏感信息） */
export interface Profile {
  nickname: string;
  /**
   * 头像：
   * - undefined：默认头像
   * - 预设 ID（如 "cat"）：内置 SVG 头像
   * - data:image/...：用户上传的本地图片（已压缩为小尺寸 data URL）
   */
  avatar?: string;
}

/** 头像数据最大长度（防止 localStorage 被大图撑爆，约 200KB） */
export const MAX_AVATAR_LENGTH = 200_000;

/** 做题偏好：控制题目界面显示的提示信息，默认全部开启 */
export interface Preferences {
  /** 汉字上方是否显示振假名 */
  showFurigana: boolean;
  /** 是否显示目标形态徽章（如「て形」） */
  showFormLabel: boolean;
  /** 是否显示动词属性（五段 / 一段 / サ变 / カ变） */
  showVerbType: boolean;
  /** 是否显示特殊变化标签（如 行く 的促音便例外） */
  showSpecialTag: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  showFurigana: true,
  showFormLabel: true,
  showVerbType: true,
  showSpecialTag: true,
};

/**
 * 练习模式：
 * - adventure：闯关模式，形态按批解锁（初始 4 形，掌握后解锁下一批）
 * - free：自由模式，全部形态直接开放练习
 */
export type PracticeMode = "adventure" | "free";

/**
 * 界面主题：
 * - system：跟随系统深浅色（默认）
 * - light：固定浅色
 * - dark：固定深色
 */
export type ThemeMode = "system" | "light" | "dark";

export const DEFAULT_THEME: ThemeMode = "system";

/** 默认提示音音量（0~1） */
export const DEFAULT_SOUND_VOLUME = 0.6;

export interface UserProgress {
  version: number;
  profile: Profile;
  /** 做题偏好 */
  preferences: Preferences;
  totalQuestions: number;
  correctAnswers: number;
  totalSessions: number;
  /** 累计训练毫秒数 */
  totalElapsedMs: number;
  streak: Streak;
  /** 分形态统计，key 为 FormId */
  forms: Record<string, Counter>;
  /** 分动词统计，key 为动词 id（弱项分析用） */
  verbs: Record<string, Counter>;
  /** 最近训练结果，新的在前 */
  recentResults: RecentResult[];
  /**
   * 练习模式。可选字段：undefined 表示用户尚未选择
   * （首次打开应用时弹窗询问，之后可在设置页切换）。
   */
  practiceMode?: PracticeMode;
  /** 界面主题，默认跟随系统 */
  theme: ThemeMode;
  /** 提示音音量（0~1），0 表示静音 */
  soundVolume: number;
}

export const MAX_RECENT_RESULTS = 50;

export function createDefaultProgress(): UserProgress {
  return {
    version: PROGRESS_VERSION,
    profile: { nickname: "学习者" },
    preferences: { ...DEFAULT_PREFERENCES },
    totalQuestions: 0,
    correctAnswers: 0,
    totalSessions: 0,
    totalElapsedMs: 0,
    streak: { current: 0, longest: 0, lastStudyDate: null },
    forms: {},
    verbs: {},
    recentResults: [],
    theme: DEFAULT_THEME,
    soundVolume: DEFAULT_SOUND_VOLUME,
  };
}

function num(x: unknown): number {
  return typeof x === "number" && Number.isFinite(x) && x >= 0 ? x : 0;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function sanitizeCounter(x: unknown): Counter {
  const o = isRecord(x) ? x : {};
  return { attempts: num(o.attempts), correct: num(o.correct) };
}

function sanitizeCounterMap(x: unknown): Record<string, Counter> {
  const map: Record<string, Counter> = {};
  if (isRecord(x)) {
    for (const [k, v] of Object.entries(x)) map[k] = sanitizeCounter(v);
  }
  return map;
}

function isRecentResult(x: unknown): x is RecentResult {
  if (!isRecord(x)) return false;
  return (
    typeof x.date === "string" &&
    typeof x.totalQuestions === "number" &&
    typeof x.correctAnswers === "number" &&
    typeof x.accuracy === "number" &&
    typeof x.elapsedMs === "number"
  );
}

/**
 * 校验并修复外部数据：
 * - 结构不是对象 / version 不兼容 → 返回 null（调用方改用默认值）
 * - 字段缺失或类型错误 → 用默认值补全，绝不抛异常
 */
export function sanitizeProgress(raw: unknown): UserProgress | null {
  if (!isRecord(raw)) return null;
  if (raw.version !== PROGRESS_VERSION) return null;

  const streakRaw = isRecord(raw.streak) ? raw.streak : {};
  const prefsRaw = isRecord(raw.preferences) ? raw.preferences : {};
  const profileRaw = isRecord(raw.profile) ? raw.profile : {};
  const recentResults = Array.isArray(raw.recentResults)
    ? raw.recentResults.filter(isRecentResult).slice(0, MAX_RECENT_RESULTS)
    : [];

  return {
    version: PROGRESS_VERSION,
    profile: {
      nickname:
        typeof profileRaw.nickname === "string"
          ? profileRaw.nickname.slice(0, 24)
          : "学习者",
      avatar:
        typeof profileRaw.avatar === "string" &&
        profileRaw.avatar.length > 0 &&
        profileRaw.avatar.length <= MAX_AVATAR_LENGTH
          ? profileRaw.avatar
          : undefined,
    },
    preferences: {
      showFurigana:
        typeof prefsRaw.showFurigana === "boolean"
          ? prefsRaw.showFurigana
          : DEFAULT_PREFERENCES.showFurigana,
      showFormLabel:
        typeof prefsRaw.showFormLabel === "boolean"
          ? prefsRaw.showFormLabel
          : DEFAULT_PREFERENCES.showFormLabel,
      showVerbType:
        typeof prefsRaw.showVerbType === "boolean"
          ? prefsRaw.showVerbType
          : DEFAULT_PREFERENCES.showVerbType,
      showSpecialTag:
        typeof prefsRaw.showSpecialTag === "boolean"
          ? prefsRaw.showSpecialTag
          : DEFAULT_PREFERENCES.showSpecialTag,
    },
    totalQuestions: num(raw.totalQuestions),
    correctAnswers: num(raw.correctAnswers),
    totalSessions: num(raw.totalSessions),
    totalElapsedMs: num(raw.totalElapsedMs),
    streak: {
      current: num(streakRaw.current),
      longest: num(streakRaw.longest),
      lastStudyDate:
        typeof streakRaw.lastStudyDate === "string" ? streakRaw.lastStudyDate : null,
    },
    forms: sanitizeCounterMap(raw.forms),
    verbs: sanitizeCounterMap(raw.verbs),
    recentResults,
    practiceMode:
      raw.practiceMode === "adventure" || raw.practiceMode === "free"
        ? raw.practiceMode
        : undefined,
    theme:
      raw.theme === "light" || raw.theme === "dark" || raw.theme === "system"
        ? raw.theme
        : DEFAULT_THEME,
    soundVolume:
      typeof raw.soundVolume === "number" &&
      Number.isFinite(raw.soundVolume) &&
      raw.soundVolume >= 0 &&
      raw.soundVolume <= 1
        ? raw.soundVolume
        : DEFAULT_SOUND_VOLUME,
  };
}
