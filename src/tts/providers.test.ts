import { describe, expect, it } from "vitest";
import {
  getTtsProvider,
  isTtsProviderId,
  TTS_PROVIDERS,
  TTS_PROVIDER_IDS,
} from "./providers";

describe("TTS 服务商预设", () => {
  it("id 唯一且预设字段齐全", () => {
    expect(new Set(TTS_PROVIDER_IDS).size).toBe(TTS_PROVIDERS.length);
    for (const p of TTS_PROVIDERS) {
      expect(p.label.trim()).not.toBe("");
      expect(p.baseUrl.trim()).not.toBe("");
      expect(p.model.trim()).not.toBe("");
      expect(p.voice.trim()).not.toBe("");
    }
  });

  it("覆盖 OpenAI 兼容与三种原生协议", () => {
    const ids = TTS_PROVIDER_IDS;
    expect(ids).toEqual(
      expect.arrayContaining(["openai", "siliconflow", "deepinfra", "openrouter", "groq"]),
    );
    expect(ids).toEqual(expect.arrayContaining(["elevenlabs", "minimax", "qwen"]));
    expect(getTtsProvider("elevenlabs").openaiCompatible).toBe(false);
    expect(getTtsProvider("minimax").openaiCompatible).toBe(false);
    expect(getTtsProvider("qwen").openaiCompatible).toBe(false);
    expect(getTtsProvider("siliconflow").openaiCompatible).toBe(true);
  });

  it("isTtsProviderId 只认合法 id", () => {
    expect(isTtsProviderId("openai")).toBe(true);
    expect(isTtsProviderId("elevenlabs")).toBe(true);
    expect(isTtsProviderId("unknown")).toBe(false);
    expect(isTtsProviderId(123)).toBe(false);
    expect(isTtsProviderId(null)).toBe(false);
  });

  it("未知 id 回退到 OpenAI 兼容预设", () => {
    expect(getTtsProvider("unknown" as never).id).toBe("openai");
  });
});
