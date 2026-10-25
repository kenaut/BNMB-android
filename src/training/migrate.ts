import { createDefaultProgress } from "../storage/progress";
import {
  getSafeStorage,
  loadProgress,
  saveProgress,
  STORAGE_KEY,
  type StorageLike,
} from "../storage/persistence";
import { loadHistory } from "./history";
import { applySessionResult } from "./progressUpdate";

/**
 * 一次性迁移：把旧版历史（key: hennimabi.history.v1，SessionResult[]）
 * 按时间顺序重放进统一的 UserProgress（key: bnmb-progress）。
 * 已有新数据或无旧数据时不做任何事；旧 key 保留不删（非破坏性）。
 */
export function migrateLegacyHistory(storage: StorageLike | null = getSafeStorage()): boolean {
  if (!storage) return false;
  try {
    if (storage.getItem(STORAGE_KEY) !== null) return false; // 已有新格式数据
  } catch {
    return false;
  }
  const legacy = loadHistory(storage);
  if (legacy.length === 0) return false;

  let progress = loadProgress(storage); // 此时必为默认值，走一遍 sanitize 保底
  if (progress.totalSessions !== 0) progress = createDefaultProgress();
  const sorted = [...legacy].sort((a, b) => a.endedAt - b.endedAt);
  for (const result of sorted) {
    progress = applySessionResult(progress, result);
  }
  return saveProgress(progress, storage);
}
