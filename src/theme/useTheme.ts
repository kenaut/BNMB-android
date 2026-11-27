import { useCallback, useEffect, useState } from "react";
import { loadProgress, saveProgress } from "../storage/persistence";
import type { ThemeMode } from "../storage/progress";
import { applyTheme, watchSystemTheme } from "./theme";

/**
 * 主题状态：写入存档并立即应用。
 * 「跟随系统」时订阅系统深浅色切换；切换模式或系统变化都会同步 <html data-theme>。
 */
export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => loadProgress().theme);

  useEffect(() => {
    applyTheme(mode);
    if (mode !== "system") return;
    return watchSystemTheme(() => applyTheme("system"));
  }, [mode]);

  const changeTheme = useCallback((next: ThemeMode) => {
    saveProgress({ ...loadProgress(), theme: next });
    setMode(next);
  }, []);

  return { mode, changeTheme };
}
