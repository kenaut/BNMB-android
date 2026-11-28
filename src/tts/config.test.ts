import { describe, expect, it } from "vitest";
import {
  clearTtsConfig,
  DEFAULT_TTS_CONFIG,
  isTtsReady,
  loadTtsConfig,
  sanitizeTtsConfig,
  saveTtsConfig,
  speechEndpoint,
  TTS_STORAGE_KEY,
} from "./config";
import type { StorageLike } from "../storage/persistence";

function fakeStorage(initial: Record<string, string> = {}): StorageLike {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

describe("isTtsReady", () => {
  it("默认配置（未验证、无密钥）不可用", () => {
    expect(isTtsReady(DEFAULT_TTS_CONFIG)).toBe(false);
    expect(isTtsReady(null)).toBe(false);
  });

  it("连接测试通过且字段齐全才可用", () => {
    const config = { ...DEFAULT_TTS_CONFIG, apiKey: "sk-test", verified: true };
    expect(isTtsReady(config)).toBe(true);
    expect(isTtsReady({ ...config, verified: false })).toBe(false);
    expect(isTtsReady({ ...config, apiKey: "  " })).toBe(false);
    expect(isTtsReady({ ...config, baseUrl: "" })).toBe(false);
  });

  it("本地 TTS 只看引擎可用标记，不要求地址和密钥", () => {
    const local = {
      ...DEFAULT_TTS_CONFIG,
      provider: "android" as const,
      baseUrl: "",
      apiKey: "",
      model: "",
      voice: "",
    };
    expect(isTtsReady({ ...local, verified: true })).toBe(true);
    expect(isTtsReady({ ...local, verified: false })).toBe(false);
  });

  it("存档中的 android provider 可正常读回", () => {
    const s = fakeStorage();
    const config = {
      ...DEFAULT_TTS_CONFIG,
      provider: "android" as const,
      baseUrl: "",
      apiKey: "",
      model: "",
      voice: "",
      verified: true,
    };
    saveTtsConfig(config, s);
    expect(loadTtsConfig(s)).toEqual(config);
  });
});

describe("speechEndpoint", () => {
  it("基础地址自动补 /audio/speech", () => {
    expect(speechEndpoint("https://api.openai.com/v1")).toBe(
      "https://api.openai.com/v1/audio/speech",
    );
    expect(speechEndpoint("https://api.openai.com/v1/")).toBe(
      "https://api.openai.com/v1/audio/speech",
    );
  });

  it("已经是完整接口地址时不重复拼接", () => {
    expect(speechEndpoint("https://example.com/v1/audio/speech")).toBe(
      "https://example.com/v1/audio/speech",
    );
  });
});

describe("TTS 配置持久化", () => {
  it("没有配置 → null", () => {
    expect(loadTtsConfig(fakeStorage())).toBeNull();
  });

  it("保存后读回一致（独立 key，不进入学习进度）", () => {
    const s = fakeStorage();
    const config = {
      ...DEFAULT_TTS_CONFIG,
      apiKey: "sk-test",
      verified: true,
      volume: 0.35,
    };
    expect(saveTtsConfig(config, s)).toBe(true);
    expect(loadTtsConfig(s)).toEqual(config);
    expect(s.getItem("bnmb-progress")).toBeNull();
  });

  it("损坏数据或非法结构 → null", () => {
    expect(loadTtsConfig(fakeStorage({ [TTS_STORAGE_KEY]: "{oops" }))).toBeNull();
    expect(loadTtsConfig(fakeStorage({ [TTS_STORAGE_KEY]: "[]" }))).toBeNull();
  });

  it("字段类型错误时回退默认；音量收敛到 0~1", () => {
    const fixed = sanitizeTtsConfig({
      baseUrl: 123,
      apiKey: "sk-test",
      model: "",
      voice: null,
      volume: 5,
      verified: "yes",
    });
    expect(fixed).toEqual({
      ...DEFAULT_TTS_CONFIG,
      apiKey: "sk-test",
      volume: 1,
      verified: false,
    });
  });

  it("服务商默认 openai，合法值保留，非法值回退", () => {
    expect(DEFAULT_TTS_CONFIG.provider).toBe("openai");
    expect(sanitizeTtsConfig({ apiKey: "k" })?.provider).toBe("openai");
    expect(
      sanitizeTtsConfig({ provider: "elevenlabs", apiKey: "k", baseUrl: "https://x" })?.provider,
    ).toBe("elevenlabs");
    expect(
      sanitizeTtsConfig({ provider: "not-a-provider", apiKey: "k" })?.provider,
    ).toBe("openai");
  });

  it("旧存档没有 provider 字段时按 OpenAI 兼容处理", () => {
    const s = fakeStorage({
      [TTS_STORAGE_KEY]: JSON.stringify({
        baseUrl: "https://api.openai.com/v1",
        apiKey: "sk-old",
        model: "tts-1",
        voice: "alloy",
        volume: 0.8,
        verified: true,
      }),
    });
    const loaded = loadTtsConfig(s);
    expect(loaded?.provider).toBe("openai");
    expect(loaded?.apiKey).toBe("sk-old");
  });

  it("清除后回到 null", () => {
    const s = fakeStorage();
    saveTtsConfig({ ...DEFAULT_TTS_CONFIG, apiKey: "sk-test", verified: true }, s);
    clearTtsConfig(s);
    expect(loadTtsConfig(s)).toBeNull();
  });
});
