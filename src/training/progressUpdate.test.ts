import { describe, expect, it } from "vitest";
import { createDefaultProgress, MAX_RECENT_RESULTS, type UserProgress } from "../storage/progress";
import { loadProgress, saveProgress, STORAGE_KEY, type StorageLike } from "../storage/persistence";
import type { SessionResult } from "./session";
import { applySessionResult } from "./progressUpdate";
import { migrateLegacyHistory } from "./migrate";

function fakeStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

function makeResult(startedAt: number, records: SessionResult["records"]): SessionResult {
  const correct = records.filter((r) => r.correct).length;
  return {
    total: records.length,
    correct,
    accuracy: records.length === 0 ? 0 : correct / records.length,
    startedAt,
    endedAt: startedAt + 60_000,
    durationMs: 60_000,
    averageMs: records.length === 0 ? 0 : 60_000 / records.length,
    records,
  };
}

const T_DAY1 = new Date(2026, 9, 14, 20, 0).getTime(); // 2026-10-14
const T_DAY2 = new Date(2026, 9, 15, 21, 0).getTime(); // 2026-10-15

describe("applySessionResult", () => {
  it("累计总数/回合数/用时，更新形态与动词统计", () => {
    const r1 = makeResult(T_DAY1, [
      { verbId: "taberu", form: "te", correct: true },
      { verbId: "iku", form: "te", correct: false },
    ]);
    const r2 = makeResult(T_DAY2, [{ verbId: "taberu", form: "masu", correct: true }]);

    let p = createDefaultProgress();
    p = applySessionResult(p, r1);
    p = applySessionResult(p, r2);

    expect(p.totalQuestions).toBe(3);
    expect(p.correctAnswers).toBe(2);
    expect(p.totalSessions).toBe(2);
    expect(p.totalElapsedMs).toBe(120_000);
    expect(p.forms.te).toEqual({ attempts: 2, correct: 1 });
    expect(p.forms.masu).toEqual({ attempts: 1, correct: 1 });
    expect(p.verbs.taberu).toEqual({ attempts: 2, correct: 2 });
    expect(p.verbs.iku).toEqual({ attempts: 1, correct: 0 });
    // 连续两天学习 → streak 2
    expect(p.streak).toEqual({ current: 2, longest: 2, lastStudyDate: "2026-10-15" });
  });

  it("recentResults 新的在前且不超过上限", () => {
    let p = createDefaultProgress();
    for (let i = 0; i < MAX_RECENT_RESULTS + 5; i++) {
      p = applySessionResult(p, makeResult(T_DAY1 + i * 1000, []));
    }
    expect(p.recentResults).toHaveLength(MAX_RECENT_RESULTS);
    expect(p.totalSessions).toBe(MAX_RECENT_RESULTS + 5);
  });

  it("同一天两局只算一次 streak，不修改原对象", () => {
    const original = createDefaultProgress();
    const p1 = applySessionResult(original, makeResult(T_DAY1, []));
    const p2 = applySessionResult(p1, makeResult(T_DAY1 + 3600_000, []));
    expect(p2.streak.current).toBe(1);
    expect(p2.totalSessions).toBe(2);
    expect(original.totalSessions).toBe(0); // 纯函数
  });
});

describe("migrateLegacyHistory", () => {
  it("旧历史按时间重放进新结构", () => {
    const storage = fakeStorage();
    const legacy = [makeResult(T_DAY2, [{ verbId: "iku", form: "te", correct: true }]), makeResult(T_DAY1, [])];
    storage.setItem("hennimabi.history.v1", JSON.stringify(legacy));

    expect(migrateLegacyHistory(storage)).toBe(true);
    const p = loadProgress(storage);
    expect(p.totalSessions).toBe(2);
    expect(p.totalQuestions).toBe(1);
    expect(p.streak.current).toBe(2); // 排序后两天连续
    expect(p.verbs.iku).toEqual({ attempts: 1, correct: 1 });
  });

  it("已有新数据时不覆盖；无旧数据时不做事", () => {
    const storage = fakeStorage();
    expect(migrateLegacyHistory(storage)).toBe(false);

    const existing: UserProgress = { ...createDefaultProgress(), totalSessions: 9 };
    saveProgress(existing, storage);
    storage.setItem("hennimabi.history.v1", JSON.stringify([makeResult(T_DAY1, [])]));
    expect(migrateLegacyHistory(storage)).toBe(false);
    expect(loadProgress(storage).totalSessions).toBe(9);
    expect(storage.getItem(STORAGE_KEY)).not.toBeNull();
  });
});
