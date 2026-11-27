import { describe, expect, it } from "vitest";
import { clampVolume, playSound } from "./sound";

describe("clampVolume", () => {
  it("合法音量原样返回", () => {
    expect(clampVolume(0)).toBe(0);
    expect(clampVolume(0.6)).toBe(0.6);
    expect(clampVolume(1)).toBe(1);
  });

  it("越界或非法值收敛到 0~1", () => {
    expect(clampVolume(-1)).toBe(0);
    expect(clampVolume(2)).toBe(1);
    expect(clampVolume(Number.NaN)).toBe(0);
    expect(clampVolume(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe("playSound 降级", () => {
  it("无浏览器音频环境时不抛异常（Node 测试环境）", () => {
    expect(() => playSound("correct", 0.6)).not.toThrow();
    expect(() => playSound("wrong", 0.6)).not.toThrow();
    expect(() => playSound("complete", 0.6)).not.toThrow();
  });

  it("音量为 0 时直接跳过", () => {
    expect(() => playSound("correct", 0)).not.toThrow();
  });
});
