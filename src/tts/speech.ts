/**
 * 朗读播放：按所选服务商的协议请求语音，取回音频后播放。
 * 支持 OpenAI 兼容接口，以及 ElevenLabs / MiniMax / 通义千问三种原生协议。
 * 浏览器需要该接口允许跨域（CORS）请求；失败时抛出可读错误，由调用方决定是否提示。
 */
import { speechEndpoint, type TtsConfig } from "./config";
import { speakAndroid } from "./androidBridge";

/** 读取响应里的错误详情（最多 200 字） */
async function readError(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 200);
  } catch {
    return "";
  }
}

async function ensureOk(res: Response, action = "朗读请求"): Promise<void> {
  if (res.ok) return;
  const detail = await readError(res);
  throw new Error(`${action}失败（HTTP ${res.status}）${detail ? `：${detail}` : ""}`);
}

function ensureBlob(blob: Blob): Blob {
  if (blob.size === 0) throw new Error("朗读接口返回了空音频");
  return blob;
}

/** 十六进制音频 → ArrayBuffer（MiniMax 返回 hex） */
function hexToBuffer(hex: string): ArrayBuffer {
  const clean = hex.trim();
  if (clean === "" || clean.length % 2 !== 0 || /[^0-9a-fA-F]/.test(clean)) {
    throw new Error("朗读接口返回的音频数据格式不正确");
  }
  const buffer = new ArrayBuffer(clean.length / 2);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return buffer;
}

/** Base64 音频 → ArrayBuffer（部分接口返回 base64） */
function base64ToBuffer(base64: string): ArrayBuffer {
  const clean = base64.replace(/\s+/g, "");
  if (clean === "") throw new Error("朗读接口返回了空音频");
  let binary: string;
  try {
    binary = atob(clean);
  } catch {
    throw new Error("朗读接口返回的音频数据格式不正确");
  }
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return buffer;
}

/** 末尾去斜杠后拼接固定路径（已包含则原样使用） */
function appendPath(baseUrl: string, path: string): string {
  const base = baseUrl.trim().replace(/\/+$/, "");
  return base.endsWith(path) ? base : `${base}${path}`;
}

// ---------- OpenAI 兼容协议（OpenAI / 硅基流动 / DeepInfra / OpenRouter / Groq） ----------

async function synthesizeOpenAi(text: string, config: TtsConfig): Promise<Blob> {
  const res = await fetch(speechEndpoint(config.baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      input: text,
      voice: config.voice,
      response_format: "mp3",
    }),
  });
  await ensureOk(res);
  return ensureBlob(await res.blob());
}

// ---------- ElevenLabs：POST /v1/text-to-speech/{voice_id}，xi-api-key 鉴权 ----------

function elevenLabsEndpoint(baseUrl: string, voice: string): string {
  const base = baseUrl.trim().replace(/\/+$/, "");
  if (base.includes("/text-to-speech/")) return base;
  const root = base.endsWith("/v1") ? base.slice(0, -3) : base;
  return `${root}/v1/text-to-speech/${encodeURIComponent(voice)}`;
}

async function synthesizeElevenLabs(text: string, config: TtsConfig): Promise<Blob> {
  const res = await fetch(elevenLabsEndpoint(config.baseUrl, config.voice), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": config.apiKey,
    },
    body: JSON.stringify({ text, model_id: config.model }),
  });
  await ensureOk(res);
  return ensureBlob(await res.blob());
}

// ---------- MiniMax：POST /v1/t2a_v2，返回 JSON 里的 hex 音频 ----------

interface MiniMaxResponse {
  data?: { audio?: string };
  base_resp?: { status_msg?: string };
}

async function synthesizeMiniMax(text: string, config: TtsConfig): Promise<Blob> {
  const res = await fetch(appendPath(config.baseUrl, "/v1/t2a_v2"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      text,
      stream: false,
      voice_setting: { voice_id: config.voice, speed: 1, vol: 1, pitch: 0 },
      audio_setting: { format: "mp3", sample_rate: 32000, bitrate: 128000, channel: 1 },
    }),
  });
  await ensureOk(res);

  const data = (await res.json()) as MiniMaxResponse;
  const audio = data?.data?.audio;
  if (!audio) {
    const reason = data?.base_resp?.status_msg;
    throw new Error(`朗读接口未返回音频${reason ? `：${reason}` : ""}`);
  }
  return ensureBlob(new Blob([hexToBuffer(audio)], { type: "audio/mpeg" }));
}

// ---------- 通义千问（百炼）：返回音频 URL 或 base64，需要二次下载/解码 ----------

interface QwenResponse {
  output?: { audio?: { url?: string; data?: string } };
  code?: string;
  message?: string;
}

function qwenEndpoint(baseUrl: string): string {
  const base = baseUrl.trim().replace(/\/+$/, "");
  if (base.includes("/services/")) return base;
  return `${base}/api/v1/services/aigc/multimodal-generation/generation`;
}

async function synthesizeQwen(text: string, config: TtsConfig): Promise<Blob> {
  const res = await fetch(qwenEndpoint(config.baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      input: { text, voice: config.voice, format: "mp3", language_type: "Japanese" },
    }),
  });
  await ensureOk(res);

  const data = (await res.json()) as QwenResponse;
  if (data?.code) {
    throw new Error(`朗读接口返回错误${data.message ? `：${data.message}` : ""}`);
  }

  const url = data?.output?.audio?.url;
  if (url) {
    const audioRes = await fetch(url);
    await ensureOk(audioRes, "下载朗读音频");
    return ensureBlob(await audioRes.blob());
  }

  const base64 = data?.output?.audio?.data;
  if (base64) {
    return ensureBlob(new Blob([base64ToBuffer(base64)], { type: "audio/mpeg" }));
  }

  throw new Error("朗读接口未返回音频");
}

/** 请求 TTS 并返回音频 Blob（按服务商协议分发） */
export async function synthesizeSpeech(text: string, config: TtsConfig): Promise<Blob> {
  switch (config.provider) {
    case "elevenlabs":
      return synthesizeElevenLabs(text, config);
    case "minimax":
      return synthesizeMiniMax(text, config);
    case "qwen":
      return synthesizeQwen(text, config);
    default:
      return synthesizeOpenAi(text, config);
  }
}

/** 同时只播放一段朗读，避免上一段与新一段叠在一起 */
let currentAudio: HTMLAudioElement | null = null;

/**
 * 朗读一段文本：本地 TTS 直接调用系统引擎；云端服务请求音频 → 按配置音量播放。
 * 返回的 Promise 在开始播放时即完成，不等待音频结束。
 */
export async function playSpeech(text: string, config: TtsConfig): Promise<void> {
  if (text.trim() === "") return;

  if (config.provider === "android") {
    // 本地引擎：打断正在播放的云端音频，由原生 QUEUE_FLUSH 打断上一段本地朗读
    currentAudio?.pause();
    currentAudio = null;
    if (!speakAndroid(text, config.volume)) {
      throw new Error("本地 TTS 不可用，请在设置中检查系统语音引擎。");
    }
    return;
  }

  const blob = await synthesizeSpeech(text, config);
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.volume = config.volume;

  currentAudio?.pause();
  currentAudio = audio;

  const cleanup = () => {
    URL.revokeObjectURL(url);
    if (currentAudio === audio) currentAudio = null;
  };
  audio.addEventListener("ended", cleanup, { once: true });
  audio.addEventListener("error", cleanup, { once: true });

  try {
    await audio.play();
  } catch (err) {
    cleanup();
    throw err;
  }
}
