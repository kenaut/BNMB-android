import type { Streak } from "../storage/progress";

/** 连续学习天数规则（只使用本地日历日期，格式 YYYY-MM-DD） */

/** 时间戳 → 本地日历日期 "YYYY-MM-DD" */
export function toLocalDate(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 时间戳 → 本地 "YYYY-MM-DD HH:mm"（recentResults.date 用） */
export function toLocalDateTime(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${toLocalDate(ms)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 某本地日期的前一天（跨月/跨年安全，交给 Date 归一化） */
export function previousDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return toLocalDate(new Date(y, m - 1, d - 1).getTime());
}

/**
 * 学习一天后更新连续记录：
 * - 同一天重复学习：不变
 * - 昨天学过（连续）：current + 1
 * - 中断一天以上：current 重置为 1
 * - longest 始终保留历史最高
 */
export function updateStreak(streak: Streak, studyDate: string): Streak {
  if (streak.lastStudyDate === studyDate) return streak;
  const current =
    streak.lastStudyDate !== null && previousDay(studyDate) === streak.lastStudyDate
      ? streak.current + 1
      : 1;
  return {
    current,
    longest: Math.max(streak.longest, current),
    lastStudyDate: studyDate,
  };
}
