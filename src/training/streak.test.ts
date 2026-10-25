import { describe, expect, it } from "vitest";
import { previousDay, toLocalDate, toLocalDateTime, updateStreak } from "./streak";
import type { Streak } from "../storage/progress";

describe("toLocalDate / toLocalDateTime", () => {
  it("格式为 YYYY-MM-DD", () => {
    expect(toLocalDate(new Date(2026, 9, 16, 22, 30).getTime())).toBe("2026-10-16");
    expect(toLocalDate(new Date(2026, 0, 5).getTime())).toBe("2026-01-05");
  });

  it("时间部分补零", () => {
    expect(toLocalDateTime(new Date(2026, 9, 16, 8, 5).getTime())).toBe("2026-10-16 08:05");
  });
});

describe("previousDay", () => {
  it("跨月与跨年都正确", () => {
    expect(previousDay("2026-10-16")).toBe("2026-10-15");
    expect(previousDay("2026-03-01")).toBe("2026-02-28");
    expect(previousDay("2026-01-01")).toBe("2025-12-31");
  });
});

describe("updateStreak", () => {
  const base: Streak = { current: 3, longest: 5, lastStudyDate: "2026-10-15" };

  it("同一天重复学习：不增加", () => {
    const s = updateStreak(base, "2026-10-15");
    expect(s).toBe(base);
    expect(s.current).toBe(3);
  });

  it("连续日期：current + 1", () => {
    const s = updateStreak(base, "2026-10-16");
    expect(s.current).toBe(4);
    expect(s.lastStudyDate).toBe("2026-10-16");
  });

  it("中断一天以上：current 重置为 1", () => {
    const s = updateStreak(base, "2026-10-20");
    expect(s.current).toBe(1);
    expect(s.longest).toBe(5); // 历史最高保留
  });

  it("current 超过历史最高时刷新 longest", () => {
    const s = updateStreak({ current: 5, longest: 5, lastStudyDate: "2026-10-15" }, "2026-10-16");
    expect(s.current).toBe(6);
    expect(s.longest).toBe(6);
  });

  it("首次学习：current = longest = 1", () => {
    const s = updateStreak({ current: 0, longest: 0, lastStudyDate: null }, "2026-10-16");
    expect(s).toEqual({ current: 1, longest: 1, lastStudyDate: "2026-10-16" });
  });

  it("跨月连续也算连续", () => {
    const s = updateStreak({ current: 2, longest: 2, lastStudyDate: "2026-02-28" }, "2026-03-01");
    expect(s.current).toBe(3);
  });
});
