/**
 * 训练回合状态机（纯函数，不依赖 React / Date.now，时间由调用方注入）。
 *
 * phase:
 * - idle     首页（未开始）
 * - playing  训练中（含「已判分、等待进入下一题」的反馈瞬间）
 * - finished 结果页
 *
 * 计时口径（要求 9）：只保存 Date.now() 产生的 startedAt / endedAt 两个时间戳，
 * 已用时间一律由时间戳相减得到；UI 的定时刷新只是重新读取 Date.now()，
 * 不存在「每秒 +1」的计时变量。以后加连击 / XP / 历史成绩时，
 * 在 SessionState 上扩展字段或在 finished 时产出 SessionResult 即可。
 */

export type SessionPhase = "idle" | "playing" | "finished";

/** 单题答题明细（用于学习分析：分形态正确率、弱项动词） */
export interface AnswerRecord {
  verbId: string;
  form: string;
  correct: boolean;
}

export interface SessionState {
  phase: SessionPhase;
  /** 本回合总题数（默认 10） */
  total: number;
  /** 当前题目下标（0 起）；finished 时等于 total */
  index: number;
  /** 已判分题数 */
  answered: number;
  /** 已判分题中答对的数量 */
  correct: number;
  /** 回合开始时间戳（Date.now） */
  startedAt: number | null;
  /** 回合结束时间戳：最后一题判分瞬间写入，因此即使反馈仍在显示，计时也已冻结 */
  endedAt: number | null;
  /** 当前题是否已判分（true 时显示正误反馈，等待用户继续） */
  feedback: boolean;
  /** 当前题的判分结果 */
  lastCorrect: boolean;
  /** 每题答题明细，与判分顺序一致 */
  records: AnswerRecord[];
}

export const DEFAULT_QUESTION_COUNT = 10;

export function createIdleSession(): SessionState {
  return {
    phase: "idle",
    total: DEFAULT_QUESTION_COUNT,
    index: 0,
    answered: 0,
    correct: 0,
    startedAt: null,
    endedAt: null,
    feedback: false,
    lastCorrect: false,
    records: [],
  };
}

/** 开始训练：立即记录开始时间戳 */
export function startSession(total: number, now: number): SessionState {
  return {
    ...createIdleSession(),
    total,
    phase: "playing",
    startedAt: now,
  };
}

/**
 * 判分当前题。最后一题判分的瞬间写入 endedAt（结束计时），
 * 但仍保持 playing + feedback，让用户看到该题反馈；
 * 调用 continueSession 后才切到 finished。
 */
export function answerSession(
  state: SessionState,
  isCorrect: boolean,
  now: number,
  record?: { verbId: string; form: string },
): SessionState {
  if (state.phase !== "playing" || state.feedback) return state;

  const answered = state.answered + 1;
  const correct = state.correct + (isCorrect ? 1 : 0);
  const isLast = answered >= state.total;

  return {
    ...state,
    answered,
    correct,
    feedback: true,
    lastCorrect: isCorrect,
    endedAt: isLast ? now : state.endedAt,
    records: record ? [...state.records, { ...record, correct: isCorrect }] : state.records,
  };
}

/** 看完反馈后继续：最后一题 → finished，否则进入下一题 */
export function continueSession(state: SessionState): SessionState {
  if (state.phase !== "playing" || !state.feedback) return state;

  if (state.answered >= state.total) {
    return { ...state, phase: "finished", index: state.total };
  }
  return { ...state, index: state.index + 1, feedback: false, lastCorrect: false };
}

/** 中途退出 / 从结果页返回首页 */
export function resetSession(state: SessionState = createIdleSession()): SessionState {
  return { ...createIdleSession(), total: state.total };
}

// ---------- 选择器（派生数据，不存状态） ----------

/** 当前是第几题（1 起） */
export function getCurrentNumber(state: SessionState): number {
  return Math.min(state.index + 1, state.total);
}

/** 已用毫秒：进行中 = now - startedAt；已结束 = endedAt - startedAt */
export function getElapsedMs(state: SessionState, now: number): number {
  if (state.startedAt === null) return 0;
  const end = state.endedAt ?? now;
  return Math.max(0, end - state.startedAt);
}

/** 正确率 0~1；未答题时为 0 */
export function getAccuracy(state: SessionState): number {
  return state.answered === 0 ? 0 : state.correct / state.answered;
}

/** 平均每题毫秒；回合结束（endedAt 已记录）后才有值 */
export function getAverageMs(state: SessionState): number | null {
  if (state.startedAt === null || state.endedAt === null || state.total === 0) return null;
  return (state.endedAt - state.startedAt) / state.total;
}

/** 回合结果（供以后持久化历史成绩 / XP 使用） */
export interface SessionResult {
  total: number;
  correct: number;
  accuracy: number;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  averageMs: number;
  /** 每题答题明细（分形态/弱项分析的数据来源） */
  records: AnswerRecord[];
}

export function getResult(state: SessionState): SessionResult | null {
  if (state.phase !== "finished" || state.startedAt === null || state.endedAt === null) {
    return null;
  }
  const durationMs = state.endedAt - state.startedAt;
  return {
    total: state.total,
    correct: state.correct,
    accuracy: getAccuracy(state),
    startedAt: state.startedAt,
    endedAt: state.endedAt,
    durationMs,
    averageMs: durationMs / state.total,
    records: state.records,
  };
}
