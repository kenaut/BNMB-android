/**
 * TTS（文本转语音）接入配置。
 * 采用 OpenAI 兼容的 /audio/speech 接口，用户可以填写自己的服务地址与密钥。
 *
 * 安全说明：密钥只保存在本设备浏览器的 localStorage（独立 key：bnmb-tts），
 * 不写入学习进度、不随备份导出、也不发送到除用户所填服务之外的任何地方。
 */
import { getSafeStorage, type StorageLike } from "../storage/persistence";
import { isTtsProviderId, type TtsProviderId } from "./providers";

export const TTS_STORAGE_KEY = "bnmb-tts";

export interface TtsConfig {
  /** 服务商，决定请求协议（OpenAI 兼容 / ElevenLabs / MiniMax / 通义千问） */
  provider: TtsProviderId;
  /** 服务基础地址，如 https://api.openai.com/v1（也接受完整 .../audio/speech） */
  baseUrl: string;
  apiKey: string;
  model: string;
  voice: string;
  /** 朗读音量 0~1 */
  volume: number;
  /** 上次连接测试是否成功 */
  verified: boolean;
}

export const DEFAULT_TTS_CONFIG: TtsConfig = {
  provider: "openai",
  baseUrl: "https://api.openai.com/v1",
  apiKey: "",
  model: "tts-1",
  voice: "alloy",
  volume: 0.8,
  verified: false,
};

function text(value: unknown, fallback: string, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : fallback;
}

/** 校验并修复配置：结构错误返回 null，字段错误回退默认值 */
export function sanitizeTtsConfig(raw: unknown): TtsConfig | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const volume =
    typeof o.volume === "number" && Number.isFinite(o.volume)
      ? Math.min(1, Math.max(0, o.volume))
      : DEFAULT_TTS_CONFIG.volume;
  const provider = isTtsProviderId(o.provider) ? o.provider : DEFAULT_TTS_CONFIG.provider;
  // 本地 TTS 没有地址 / 模型 / 音色，保留空值，不回填云端默认值
  const local = provider === "android";
  return {
    provider,
    baseUrl: local
      ? text(o.baseUrl, "", 500)
      : text(o.baseUrl, DEFAULT_TTS_CONFIG.baseUrl, 500) || DEFAULT_TTS_CONFIG.baseUrl,
    apiKey: text(o.apiKey, "", 500),
    model: local
      ? text(o.model, "", 100)
      : text(o.model, DEFAULT_TTS_CONFIG.model, 100) || DEFAULT_TTS_CONFIG.model,
    voice: local
      ? text(o.voice, "", 100)
      : text(o.voice, DEFAULT_TTS_CONFIG.voice, 100) || DEFAULT_TTS_CONFIG.voice,
    volume,
    verified: o.verified === true,
  };
}

/** 读取已保存的配置；没有配置或数据损坏返回 null */
export function loadTtsConfig(
  storage: StorageLike | null = getSafeStorage(),
): TtsConfig | null {
  if (!storage) return null;
  let raw: string | null;
  try {
    raw = storage.getItem(TTS_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    return sanitizeTtsConfig(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** 保存配置；存储不可用时返回 false（不抛异常） */
export function saveTtsConfig(
  config: TtsConfig,
  storage: StorageLike | null = getSafeStorage(),
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(TTS_STORAGE_KEY, JSON.stringify(config));
    return true;
  } catch {
    return false;
  }
}

export function clearTtsConfig(storage: StorageLike | null = getSafeStorage()): void {
  try {
    storage?.removeItem(TTS_STORAGE_KEY);
  } catch {
    /* 忽略 */
  }
}

/** 拼接朗读接口地址；已包含 /audio/speech 时原样使用 */
export function speechEndpoint(baseUrl: string): string {
  const base = baseUrl.trim().replace(/\/+$/, "");
  return base.endsWith("/audio/speech") ? base : `${base}/audio/speech`;
}

/** 只有「连接测试通过且字段齐全」才认为可用于朗读（决定是否显示播放按钮） */
export function isTtsReady(config: TtsConfig | null): config is TtsConfig {
  if (config === null) return false;
  // 本地 TTS 无地址/密钥等字段：原生报告引擎可用（verified）即可朗读
  if (config.provider === "android") return config.verified;
  return (
    config.verified &&
    config.baseUrl.trim() !== "" &&
    config.apiKey.trim() !== "" &&
    config.model.trim() !== "" &&
    config.voice.trim() !== ""
  );
}
