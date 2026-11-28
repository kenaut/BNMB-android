import { describe, expect, it } from "vitest";
import {
  androidDefaultConfig,
  ensureDefaultTts,
  isAndroidTtsUsable,
  type AndroidTtsStatus,
} from "./androidBridge";
import { DEFAULT_TTS_CONFIG, loadTtsConfig, saveTtsConfig } from "./config";
import type { StorageLike } from "../storage/persistence";

function fakeStorage(initial: Record<string, string> = {}): StorageLike {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

const usable: AndroidTtsStatus = { ready: true, japanese: true };
const noEngine: AndroidTtsStatus = { ready: false, japanese: false };
const noJapanese: AndroidTtsStatus = { ready: true, japanese: false };

describe("isAndroidTtsUsable", () => {
  it("引擎就绪且支持日语才可用", () => {
    expect(isAndroidTtsUsable(usable)).toBe(true);
    expect(isAndroidTtsUsable(noEngine)).toBe(false);
    expect(isAndroidTtsUsable(noJapanese)).toBe(false);
    expect(isAndroidTtsUsable(null)).toBe(false);
  });
});

describe("androidDefaultConfig", () => {
  it("可用即默认启用，字段留空", () => {
    const config = androidDefaultConfig(usable);
    expect(config.provider).toBe("android");
    expect(config.verified).toBe(true);
    expect(config.baseUrl).toBe("");
    expect(config.apiKey).toBe("");
    expect(config.model).toBe("");
    expect(config.voice).toBe("");
  });

  it("不可用时不启用", () => {
    expect(androidDefaultConfig(noEngine).verified).toBe(false);
    expect(androidDefaultConfig(noJapanese).verified).toBe(false);
  });
});

describe("ensureDefaultTts", () => {
  it("非安卓壳（status 为 null）不写入任何配置", () => {
    const s = fakeStorage();
    ensureDefaultTts(null, s);
    expect(loadTtsConfig(s)).toBeNull();
  });

  it("首次启动且引擎可用：默认启用本地 TTS", () => {
    const s = fakeStorage();
    ensureDefaultTts(usable, s);
    const config = loadTtsConfig(s);
    expect(config?.provider).toBe("android");
    expect(config?.verified).toBe(true);
  });

  it("首次启动但引擎不可用：写入本地配置但不启用", () => {
    const s = fakeStorage();
    ensureDefaultTts(noEngine, s);
    const config = loadTtsConfig(s);
    expect(config?.provider).toBe("android");
    expect(config?.verified).toBe(false);
  });

  it("已有 AI API 配置时不覆盖", () => {
    const s = fakeStorage();
    const ai = { ...DEFAULT_TTS_CONFIG, provider: "openai" as const, apiKey: "sk-test", verified: true };
    saveTtsConfig(ai, s);
    ensureDefaultTts(usable, s);
    expect(loadTtsConfig(s)).toEqual(ai);
  });
});
