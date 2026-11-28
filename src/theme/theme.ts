import type { ThemeMode } from "../storage/progress";

/** 实际生效的主题（system 已解析为 light / dark） */
export type ResolvedTheme = "light" | "dark";

/** 主题选项（设置页展示顺序） */
export const THEME_MODES: readonly ThemeMode[] = ["system", "light", "dark"];

export const THEME_LABELS: Record<ThemeMode, string> = {
  system: "跟随系统",
  light: "浅色",
  dark: "深色",
};

/** 当前系统的深浅色偏好；无 matchMedia（测试 / 老浏览器）时按浅色处理 */
export function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** 把用户选择解析为实际主题（纯函数，便于测试） */
export function resolveTheme(mode: ThemeMode, system: ResolvedTheme): ResolvedTheme {
  return mode === "system" ? system : mode;
}

/**
 * 把主题写入 <html data-theme="light|dark">，同时设置 color-scheme
 * （影响滚动条、表单控件等浏览器原生 UI）。返回实际生效的主题。
 */
export function applyTheme(mode: ThemeMode): ResolvedTheme {
  const resolved = resolveTheme(mode, getSystemTheme());
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
  }
  // 安卓壳同步状态栏 / 导航栏颜色；纯浏览器或旧版壳没有此桥时静默跳过
  if (typeof window !== "undefined") {
    window.BNMBNative?.setSystemBarsDark?.(resolved === "dark");
  }
  return resolved;
}

/**
 * 监听系统深浅色切换，返回取消订阅函数。
 * 仅当用户选择「跟随系统」时调用方需要订阅；回调里重新 applyTheme 即可。
 */
export function watchSystemTheme(onChange: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {};
  }
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => onChange();
  media.addEventListener("change", handler);
  return () => media.removeEventListener("change", handler);
}
