/**
 * 安卓本地 TTS（系统 TextToSpeech 引擎）桥接。
 *
 * 原生在 MainActivity 中以 "BNMBTts" 注入：
 * - getStatus(): 同步返回 {"ready":boolean,"japanese":boolean}
 * - speak(text, volume) / stop() / refresh() / openSettings()
 *
 * 浏览器或旧版安卓壳没有此桥，所有函数都安全降级（返回 null / false）。
 */
import { getSafeStorage, type StorageLike } from "../storage/persistence";
import {
  DEFAULT_TTS_CONFIG,
  loadTtsConfig,
  saveTtsConfig,
  type TtsConfig,
} from "./config";

export interface AndroidTtsStatus {
  /** 引擎初始化成功 */
  ready: boolean;
  /** 引擎支持日语（含已下载语音数据） */
  japanese: boolean;
}

interface AndroidTtsBridge {
  getStatus?: () => string;
  speak?: (text: string, volume: number) => void;
  stop?: () => void;
  refresh?: () => void;
  openSettings?: () => void;
}

declare global {
  interface Window {
    BNMBTts?: AndroidTtsBridge;
  }
}

function bridge(): AndroidTtsBridge | null {
  if (typeof window === "undefined") return null;
  return window.BNMBTts ?? null;
}

/** 读取原生引擎状态；不在安卓壳内或数据异常时返回 null */
export function getAndroidTtsStatus(): AndroidTtsStatus | null {
  const b = bridge();
  if (!b || typeof b.getStatus !== "function") return null;
  try {
    const raw: unknown = JSON.parse(b.getStatus());
    if (typeof raw !== "object" || raw === null) return null;
    const o = raw as Record<string, unknown>;
    return { ready: o.ready === true, japanese: o.japanese === true };
  } catch {
    return null;
  }
}

/** 引擎可用 = 初始化成功且支持日语 */
export function isAndroidTtsUsable(status: AndroidTtsStatus | null): boolean {
  return status !== null && status.ready && status.japanese;
}

/** 通过系统引擎朗读；成功发起返回 true（异步播放，无网络请求） */
export function speakAndroid(text: string, volume: number): boolean {
  const b = bridge();
  if (!b || typeof b.speak !== "function") return false;
  try {
    b.stop?.();
    b.speak(text, Math.min(1, Math.max(0, volume)));
    return true;
  } catch {
    return false;
  }
}

/** 重新初始化引擎（安装引擎 / 下载语音数据后使用） */
export function refreshAndroidTts(): void {
  try {
    bridge()?.refresh?.();
  } catch {
    /* 忽略：桥不可用时由状态查询继续返回不可用 */
  }
}

/** 打开系统「文字转语音输出」设置页 */
export function openAndroidTtsSettings(): void {
  try {
    bridge()?.openSettings?.();
  } catch {
    /* 忽略 */
  }
}

/** 本地 TTS 的默认配置：可用即启用（verified），字段一律留空 */
export function androidDefaultConfig(status: AndroidTtsStatus): TtsConfig {
  return {
    ...DEFAULT_TTS_CONFIG,
    provider: "android",
    baseUrl: "",
    model: "",
    voice: "",
    verified: isAndroidTtsUsable(status),
  };
}

/**
 * 首次启动默认启用本地 TTS：
 * - 非安卓壳（status 为 null）不处理，网页版维持云端 AI 配置流程；
 * - 已有任何配置（含用户选择的 AI API）不覆盖；
 * - 引擎初始化是异步的，若暂不可用则有限重试，可用后自动启用；
 *   永久不可用时保持未启用，由设置页展示安装指引。
 */
export function ensureDefaultTts(
  status: AndroidTtsStatus | null = getAndroidTtsStatus(),
  storage: StorageLike | null = getSafeStorage(),
): void {
  if (!status || !storage) return;
  if (loadTtsConfig(storage)) return;
  saveTtsConfig(androidDefaultConfig(status), storage);
  if (!isAndroidTtsUsable(status)) {
    retryEnable(0, storage);
  }
}

/** 引擎初始化完成前的有限重试；只升级默认本地配置，用户改选其他服务商后立即停止 */
function retryEnable(attempt: number, storage: StorageLike): void {
  if (attempt >= 5) return;
  setTimeout(() => {
    const current = loadTtsConfig(storage);
    if (!current || current.provider !== "android" || current.verified) return;
    const status = getAndroidTtsStatus();
    if (!status) return;
    if (isAndroidTtsUsable(status)) {
      saveTtsConfig({ ...current, verified: true }, storage);
      return;
    }
    retryEnable(attempt + 1, storage);
  }, 700);
}
