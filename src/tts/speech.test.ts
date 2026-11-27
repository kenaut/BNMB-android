import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_TTS_CONFIG } from "./config";
import { synthesizeSpeech } from "./speech";

const config = { ...DEFAULT_TTS_CONFIG, apiKey: "sk-test", verified: true };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("synthesizeSpeech", () => {
  it("成功时返回音频 Blob，并携带鉴权与请求参数", async () => {
    const fetchMock = vi.fn(
      async (_url: string, _init: RequestInit) =>
        new Response(new Blob([new Uint8Array([1, 2, 3])], { type: "audio/mpeg" })),
    );
    vi.stubGlobal("fetch", fetchMock);

    const blob = await synthesizeSpeech("食べます", config);
    expect(blob.size).toBe(3);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/audio/speech");
    expect(init.headers).toMatchObject({ Authorization: "Bearer sk-test" });
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body).toMatchObject({
      model: "tts-1",
      input: "食べます",
      voice: "alloy",
      response_format: "mp3",
    });
  });

  it("非 2xx 响应 → 抛出带状态码的错误", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("invalid api key", { status: 401 })),
    );
    await expect(synthesizeSpeech("食べます", config)).rejects.toThrow(/HTTP 401/);
  });

  it("返回空音频 → 明确报错", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Blob([]))));
    await expect(synthesizeSpeech("食べます", config)).rejects.toThrow(/空音频/);
  });
});

describe("ElevenLabs 协议", () => {
  it("拼接 voice_id 路径，使用 xi-api-key 与 text/model_id 字段", async () => {
    const fetchMock = vi.fn(
      async (_url: string, _init: RequestInit) =>
        new Response(new Blob([new Uint8Array([1, 2, 3])], { type: "audio/mpeg" })),
    );
    vi.stubGlobal("fetch", fetchMock);

    const blob = await synthesizeSpeech("食べます", {
      ...config,
      provider: "elevenlabs",
      baseUrl: "https://api.elevenlabs.io",
      apiKey: "xi-test",
      model: "eleven_multilingual_v2",
      voice: "voice-1",
    });
    expect(blob.size).toBe(3);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.elevenlabs.io/v1/text-to-speech/voice-1");
    expect(init.headers).toMatchObject({ "xi-api-key": "xi-test" });
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body).toMatchObject({ text: "食べます", model_id: "eleven_multilingual_v2" });
  });

  it("已填完整接口地址时不重复拼接", async () => {
    const fetchMock = vi.fn(
      async (_url: string, _init: RequestInit) =>
        new Response(new Blob([new Uint8Array([1])])),
    );
    vi.stubGlobal("fetch", fetchMock);

    await synthesizeSpeech("食べます", {
      ...config,
      provider: "elevenlabs",
      baseUrl: "https://api.elevenlabs.io/v1/text-to-speech/voice-1",
    });
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.elevenlabs.io/v1/text-to-speech/voice-1",
    );
  });
});

describe("MiniMax 协议", () => {
  it("请求 /v1/t2a_v2 并把 hex 音频还原为 Blob", async () => {
    const fetchMock = vi.fn(
      async (_url: string, _init: RequestInit) =>
        new Response(JSON.stringify({ data: { audio: "000102" } })),
    );
    vi.stubGlobal("fetch", fetchMock);

    const blob = await synthesizeSpeech("食べます", {
      ...config,
      provider: "minimax",
      baseUrl: "https://api.minimax.cn",
      model: "speech-2.8-turbo",
      voice: "female-shaonv",
    });
    expect(blob.size).toBe(3);
    expect([...new Uint8Array(await blob.arrayBuffer())]).toEqual([0, 1, 2]);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.minimax.cn/v1/t2a_v2");
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body).toMatchObject({
      model: "speech-2.8-turbo",
      text: "食べます",
      stream: false,
      voice_setting: { voice_id: "female-shaonv" },
      audio_setting: { format: "mp3" },
    });
  });

  it("没有音频字段 → 明确报错并带上服务端原因", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ base_resp: { status_msg: "quota" } }))),
    );
    await expect(
      synthesizeSpeech("食べます", { ...config, provider: "minimax" }),
    ).rejects.toThrow(/未返回音频：quota/);
  });
});

describe("通义千问协议", () => {
  it("返回音频 URL 时自动二次下载", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.startsWith("https://cdn.example.com/")) {
        return new Response(new Blob([new Uint8Array([7, 8, 9])], { type: "audio/mpeg" }));
      }
      return new Response(
        JSON.stringify({ output: { audio: { url: "https://cdn.example.com/a.mp3" } } }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const blob = await synthesizeSpeech("食べます", {
      ...config,
      provider: "qwen",
      baseUrl: "https://dashscope.aliyuncs.com",
      model: "qwen-tts",
      voice: "Cherry",
    });
    expect(blob.size).toBe(3);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation",
    );
    expect(fetchMock.mock.calls[1][0]).toBe("https://cdn.example.com/a.mp3");
  });

  it("返回 base64 音频时直接解码", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ output: { audio: { data: "AQID" } } }))),
    );
    const blob = await synthesizeSpeech("食べます", { ...config, provider: "qwen" });
    expect([...new Uint8Array(await blob.arrayBuffer())]).toEqual([1, 2, 3]);
  });

  it("服务端返回错误码 → 抛错", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ code: "InvalidApiKey", message: "bad key" }))),
    );
    await expect(
      synthesizeSpeech("食べます", { ...config, provider: "qwen" }),
    ).rejects.toThrow(/bad key/);
  });
});
