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
}

export interface UserProgress {
  version: number;
  profile: Profile;
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
}

export const MAX_RECENT_RESULTS = 50;

export function createDefaultProgress(): UserProgress {
  return {
    version: PROGRESS_VERSION,
    profile: { nickname: "学习者" },
    totalQuestions: 0,
    correctAnswers: 0,
    totalSessions: 0,
    totalElapsedMs: 0,
    streak: { current: 0, longest: 0, lastStudyDate: null },
    forms: {},
    verbs: {},
    recentResults: [],
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
  const recentResults = Array.isArray(raw.recentResults)
    ? raw.recentResults.filter(isRecentResult).slice(0, MAX_RECENT_RESULTS)
    : [];

  return {
    version: PROGRESS_VERSION,
    profile: {
      nickname:
        isRecord(raw.profile) && typeof raw.profile.nickname === "string"
          ? raw.profile.nickname.slice(0, 24)
          : "学习者",
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
  };
}
