/**
 * TTS 服务商预设。
 *
 * 分两类：
 * 1. OpenAI 兼容（openaiCompatible: true）：走标准 POST /audio/speech，
 *    地址、模型、音色可以直接沿用现有请求逻辑。
 * 2. 原生协议（openaiCompatible: false）：请求地址 / 鉴权头 / 请求体 / 返回格式
 *    各自不同，由 speech.ts 里的适配分支处理。
 */

export type TtsProviderId =
  | "openai"
  | "siliconflow"
  | "deepinfra"
  | "openrouter"
  | "groq"
  | "elevenlabs"
  | "minimax"
  | "qwen";

export interface TtsProviderPreset {
  id: TtsProviderId;
  /** 设置页下拉里显示的名称 */
  label: string;
  /** 是否使用 OpenAI /audio/speech 协议 */
  openaiCompatible: boolean;
  /** 选中后自动填入的接口地址 */
  baseUrl: string;
  /** 选中后自动填入的模型 */
  model: string;
  /** 选中后自动填入的音色 */
  voice: string;
  /** 音色字段的标题（不同厂商叫法不同） */
  voiceLabel?: string;
  /** 该服务商的配置说明 */
  note?: string;
  /** 语言/能力限制提醒（显示为警示色） */
  warning?: string;
  /** 官方文档链接 */
  docsUrl?: string;
}

/** 服务商列表：顺序即设置页下拉的显示顺序 */
export const TTS_PROVIDERS: readonly TtsProviderPreset[] = [
  {
    id: "openai",
    label: "OpenAI / 兼容接口",
    openaiCompatible: true,
    baseUrl: "https://api.openai.com/v1",
    model: "tts-1",
    voice: "alloy",
    note: "标准 POST /audio/speech 协议，任何 OpenAI 兼容服务都可以直接改地址后使用。",
  },
  {
    id: "siliconflow",
    label: "硅基流动 SiliconFlow",
    openaiCompatible: true,
    baseUrl: "https://api.siliconflow.cn/v1",
    model: "FunAudioLLM/CosyVoice2-0.5B",
    voice: "claire",
    note: "国内直连、注册赠送额度；音色可选 alex / benjamin / charles / david / anna / bella / claire / diana。",
    docsUrl: "https://docs.siliconflow.cn/cn/userguide/capabilities/text-to-speech",
  },
  {
    id: "deepinfra",
    label: "DeepInfra（Kokoro）",
    openaiCompatible: true,
    baseUrl: "https://api.deepinfra.com/v1/openai",
    model: "hexgrad/Kokoro-82M",
    voice: "jf_alpha",
    note: "按字符计费、延迟低；日语音色可用 jf_alpha / jf_gongitsune / jm_kumo 等。",
    docsUrl: "https://deepinfra.com/hexgrad/Kokoro-82M/api",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    openaiCompatible: true,
    baseUrl: "https://openrouter.ai/api/v1",
    model: "openai/gpt-4o-mini-tts-2025-12-15",
    voice: "alloy",
    note: "一个 Key 可切换多个厂商的语音模型；也可改用 hexgrad/kokoro-82m + jf_alpha。",
    docsUrl: "https://openrouter.ai/docs/guides/overview/multimodal/tts",
  },
  {
    id: "groq",
    label: "Groq（PlayAI）",
    openaiCompatible: true,
    baseUrl: "https://api.groq.com/openai/v1",
    model: "playai-tts",
    voice: "Arista-PlayAI",
    warning: "Groq 的 PlayAI 音色仅支持英语与阿拉伯语，无法朗读日语假名，不建议在本项目使用。",
  },
  {
    id: "elevenlabs",
    label: "ElevenLabs",
    openaiCompatible: false,
    baseUrl: "https://api.elevenlabs.io",
    model: "eleven_multilingual_v2",
    voice: "JBFqnCBsd6RMkjVDRZzb",
    voiceLabel: "音色（Voice ID）",
    note: "日语自然度最好的一档，音色栏填 Voice ID（可在音色库复制）；每月有免费字符额度。",
    docsUrl: "https://elevenlabs.io/docs/api-reference/text-to-speech/convert",
  },
  {
    id: "minimax",
    label: "MiniMax（海螺）",
    openaiCompatible: false,
    baseUrl: "https://api.minimax.cn",
    model: "speech-2.8-turbo",
    voice: "female-shaonv",
    voiceLabel: "音色（voice_id）",
    note: "支持中日英等 40 种语言；音色栏填 voice_id，模型可用 speech-2.8-turbo（快）或 speech-2.8-hd（高质量）。",
    docsUrl: "https://platform.minimaxi.com/docs/api-reference/speech-t2a-http",
  },
  {
    id: "qwen",
    label: "阿里百炼 通义千问 TTS",
    openaiCompatible: false,
    baseUrl:
      "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation",
    model: "qwen-tts",
    voice: "Cherry",
    note: "接口地址可填完整 URL；返回音频 URL 后会自动下载播放。音色可选 Cherry / Serena / Ethan / Chelsie。",
    docsUrl: "https://help.aliyun.com/zh/model-studio/qwen-tts-api",
  },
];

/** 所有合法的服务商 id（用于存档校验） */
export const TTS_PROVIDER_IDS: readonly TtsProviderId[] = TTS_PROVIDERS.map((p) => p.id);

export function isTtsProviderId(value: unknown): value is TtsProviderId {
  return typeof value === "string" && (TTS_PROVIDER_IDS as readonly string[]).includes(value);
}

/** 按 id 取预设；未知 id 回退到第一项（OpenAI 兼容） */
export function getTtsProvider(id: TtsProviderId): TtsProviderPreset {
  return TTS_PROVIDERS.find((p) => p.id === id) ?? TTS_PROVIDERS[0];
}
