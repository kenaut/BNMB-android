import { describe, expect, it } from "vitest";
import { formatClock, formatPercent, formatSeconds } from "./format";

describe("formatClock", () => {
  it("秒以内显示 0:0x", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(4999)).toBe("0:04");
  });

  it("分钟与秒", () => {
    expect(formatClock(65_000)).toBe("1:05");
    expect(formatClock(125_000)).toBe("2:05");
  });

  it("超过 1 小时显示 h:mm:ss", () => {
    expect(formatClock(3_725_000)).toBe("1:02:05");
  });
});

describe("formatPercent", () => {
  it("比率转整数百分比并四舍五入", () => {
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(0.7)).toBe("70%");
    expect(formatPercent(2 / 3)).toBe("67%");
    expect(formatPercent(1)).toBe("100%");
  });
});

describe("formatSeconds", () => {
  it("毫秒转一位小数秒", () => {
    expect(formatSeconds(12_500)).toBe("12.5 秒");
    expect(formatSeconds(1000)).toBe("1.0 秒");
  });
});
