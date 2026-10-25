import { MAX_RECENT_RESULTS, type Counter, type UserProgress } from "../storage/progress";
import type { SessionResult } from "./session";
import { toLocalDate, toLocalDateTime, updateStreak } from "./streak";

/**
 * 把一局的 SessionResult 汇总进 UserProgress（纯函数，返回新对象）。
 * 只在回合结束时调用一次；每题过程中不写最终成绩。
 */
export function applySessionResult(progress: UserProgress, result: SessionResult): UserProgress {
  const forms: Record<string, Counter> = { ...progress.forms };
  const verbs: Record<string, Counter> = { ...progress.verbs };

  for (const r of result.records) {
    const f = forms[r.form] ?? { attempts: 0, correct: 0 };
    forms[r.form] = { attempts: f.attempts + 1, correct: f.correct + (r.correct ? 1 : 0) };
    const v = verbs[r.verbId] ?? { attempts: 0, correct: 0 };
    verbs[r.verbId] = { attempts: v.attempts + 1, correct: v.correct + (r.correct ? 1 : 0) };
  }

  const entry = {
    date: toLocalDateTime(result.endedAt),
    totalQuestions: result.total,
    correctAnswers: result.correct,
    accuracy: result.accuracy,
    elapsedMs: result.durationMs,
  };

  return {
    ...progress,
    totalQuestions: progress.totalQuestions + result.total,
    correctAnswers: progress.correctAnswers + result.correct,
    totalSessions: progress.totalSessions + 1,
    totalElapsedMs: progress.totalElapsedMs + result.durationMs,
    streak: updateStreak(progress.streak, toLocalDate(result.endedAt)),
    forms,
    verbs,
    recentResults: [entry, ...progress.recentResults].slice(0, MAX_RECENT_RESULTS),
  };
}
