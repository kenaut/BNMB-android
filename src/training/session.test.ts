import { describe, expect, it } from "vitest";
import {
  answerSession,
  continueSession,
  createIdleSession,
  getAccuracy,
  getAverageMs,
  getCurrentNumber,
  getElapsedMs,
  getResult,
  resetSession,
  startSession,
  type SessionState,
} from "./session";

const T0 = 1_000_000;

/** 打完整场：answers 每题正误；返回 finished 状态 */
function playFull(answers: boolean[], now = T0): SessionState {
  let s = startSession(answers.length, now);
  answers.forEach((ok, i) => {
    s = answerSession(s, ok, now + (i + 1) * 1000);
    s = continueSession(s);
  });
  return s;
}

describe("训练回合状态机", () => {
  it("初始为 idle，计数与时间戳均为空", () => {
    const s = createIdleSession();
    expect(s.phase).toBe("idle");
    expect(s.total).toBe(10);
    expect(s.startedAt).toBeNull();
    expect(getElapsedMs(s, T0)).toBe(0);
  });

  it("startSession：立即进入 playing 并记录开始时间戳", () => {
    const s = startSession(10, T0);
    expect(s.phase).toBe("playing");
    expect(s.startedAt).toBe(T0);
    expect(s.index).toBe(0);
    expect(s.answered).toBe(0);
    expect(getCurrentNumber(s)).toBe(1);
  });

  it("判分后立即计数并进入反馈态；继续后才推进到下一题", () => {
    let s = startSession(10, T0);
    s = answerSession(s, true, T0 + 1500);
    expect(s.feedback).toBe(true);
    expect(s.answered).toBe(1);
    expect(s.correct).toBe(1);
    expect(s.index).toBe(0); // 反馈期间仍停留在当前题
    expect(getAccuracy(s)).toBe(1);

    s = continueSession(s);
    expect(s.feedback).toBe(false);
    expect(s.index).toBe(1);
    expect(getCurrentNumber(s)).toBe(2);
  });

  it("反馈态重复判分不会被重复计数", () => {
    let s = startSession(10, T0);
    s = answerSession(s, true, T0 + 1000);
    s = answerSession(s, false, T0 + 2000); // 应被忽略
    expect(s.answered).toBe(1);
    expect(s.correct).toBe(1);
  });

  it("已用时间由时间戳相减得到（不依赖递增计时变量）", () => {
    const s = startSession(10, T0);
    expect(getElapsedMs(s, T0 + 5000)).toBe(5000);
    expect(getElapsedMs(s, T0 + 8200)).toBe(8200);
  });

  it("最后一题判分瞬间冻结计时（endedAt 写入），看完反馈再结束", () => {
    let s = startSession(2, T0);
    s = answerSession(s, true, T0 + 1000);
    s = continueSession(s);
    s = answerSession(s, false, T0 + 3000); // 最后一题判分 → 结束计时

    expect(s.endedAt).toBe(T0 + 3000);
    expect(s.phase).toBe("playing"); // 反馈仍在显示
    // 即使外部时间继续流逝，已用时间也冻结在 endedAt
    expect(getElapsedMs(s, T0 + 999_999)).toBe(3000);

    s = continueSession(s);
    expect(s.phase).toBe("finished");
    expect(s.index).toBe(2);
  });

  it("完整 10 题回合的统计：10 题中对 7 题、总用时 10s、平均 1s/题", () => {
    const answers = [true, false, true, true, true, false, true, true, false, true];
    const s = playFull(answers, T0);
    const result = getResult(s);

    expect(s.phase).toBe("finished");
    expect(result).not.toBeNull();
    expect(result!.total).toBe(10);
    expect(result!.correct).toBe(7);
    expect(result!.accuracy).toBeCloseTo(0.7);
    expect(result!.durationMs).toBe(10_000);
    expect(result!.averageMs).toBe(1000);
    expect(getAverageMs(s)).toBe(1000);
  });

  it("resetSession 回到 idle 并保留题量设置", () => {
    const s = resetSession(startSession(15, T0));
    expect(s.phase).toBe("idle");
    expect(s.total).toBe(15);
    expect(s.startedAt).toBeNull();
  });

  it("finished 之后不能再判分", () => {
    const s = playFull([true], T0);
    expect(answerSession(s, true, T0 + 9999)).toBe(s);
  });

  it("传入题目信息时逐题记录明细，并随结果导出", () => {
    let s = startSession(2, T0);
    s = answerSession(s, true, T0 + 1000, { verbId: "taberu", form: "te" });
    s = continueSession(s);
    s = answerSession(s, false, T0 + 2000, { verbId: "kuru", form: "nai" });
    s = continueSession(s);

    expect(s.records).toEqual([
      { verbId: "taberu", form: "te", correct: true },
      { verbId: "kuru", form: "nai", correct: false },
    ]);
    expect(getResult(s)!.records).toHaveLength(2);
  });
});
