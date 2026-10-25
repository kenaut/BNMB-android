/** 时间与比率的展示格式化（入参统一为毫秒整数 / 0~1 比率） */

/** 毫秒 → "m:ss"（如 65000 → "1:05"）；超过 1 小时为 "h:mm:ss" */
export function formatClock(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const ss = String(seconds).padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${ss}`;
  }
  return `${minutes}:${ss}`;
}

/** 0~1 → 百分比整数（如 0.7 → "70%"） */
export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

/** 毫秒 → 秒（一位小数，如 12500 → "12.5 秒"） */
export function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)} 秒`;
}
