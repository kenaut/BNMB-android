import { describe, expect, it } from "vitest";
import { applyTheme, resolveTheme, THEME_MODES } from "./theme";

describe("resolveTheme", () => {
  it("跟随系统时取系统偏好", () => {
    expect(resolveTheme("system", "dark")).toBe("dark");
    expect(resolveTheme("system", "light")).toBe("light");
  });

  it("固定模式忽略系统偏好", () => {
    expect(resolveTheme("light", "dark")).toBe("light");
    expect(resolveTheme("dark", "light")).toBe("dark");
  });
});

describe("applyTheme", () => {
  it("无 document 环境不抛异常，返回实际生效主题", () => {
    expect(applyTheme("dark")).toBe("dark");
    expect(applyTheme("light")).toBe("light");
  });
});

describe("THEME_MODES", () => {
  it("包含跟随系统 / 浅色 / 深色三种模式，默认项为跟随系统", () => {
    expect([...THEME_MODES]).toEqual(["system", "light", "dark"]);
  });
});
