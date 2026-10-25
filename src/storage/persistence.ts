/**
 * 统一持久化入口：所有 localStorage 读写都经过本模块，
 * 组件不直接触碰 localStorage。存储不可用时静默降级（应用照常运行，只是不保存）。
 */
import {
  createDefaultProgress,
  sanitizeProgress,
  PROGRESS_VERSION,
  type UserProgress,
} from "./progress";

export const STORAGE_KEY = "bnmb-progress";

/** 与 localStorage 同形的最小接口，测试可注入内存实现 */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** 探测 localStorage 是否可用（隐私模式 / 禁用时不报错） */
export function getSafeStorage(): StorageLike | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const probe = "__bnmb_probe__";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return null;
  }
}

/**
 * 读取学习进度。四种异常一律返回默认数据：
 * 1. 没有存档  2. JSON 损坏  3. 字段缺失（补默认值）  4. version 不兼容
 */
export function loadProgress(storage: StorageLike | null = getSafeStorage()): UserProgress {
  if (!storage) return createDefaultProgress();
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return createDefaultProgress();
  }
  if (!raw) return createDefaultProgress();
  try {
    const sanitized = sanitizeProgress(JSON.parse(raw));
    return sanitized ?? createDefaultProgress();
  } catch {
    return createDefaultProgress();
  }
}

/** 保存进度；存储不可用时返回 false（不抛异常） */
export function saveProgress(
  progress: UserProgress,
  storage: StorageLike | null = getSafeStorage(),
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

export function clearProgress(storage: StorageLike | null = getSafeStorage()): void {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    /* 忽略 */
  }
}

// ---------- 导入 / 导出 ----------

export type ImportResult =
  | { ok: true; progress: UserProgress }
  | { ok: false; error: string };

/** 解析导入文件内容：验证 JSON、结构、version；失败返回明确错误信息 */
export function parseImport(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "文件不是有效的 JSON，请选择正确的备份文件。" };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: "数据结构不正确：根节点必须是对象。" };
  }
  const version = (parsed as Record<string, unknown>).version;
  if (version !== PROGRESS_VERSION) {
    return {
      ok: false,
      error: `数据版本不兼容：期望 v${PROGRESS_VERSION}，实际为 ${JSON.stringify(version ?? "缺失")}。`,
    };
  }
  // version 已匹配，sanitize 必然成功；缺字段会被补默认值
  return { ok: true, progress: sanitizeProgress(parsed)! };
}

/** 导出文件名：bnmb-backup-YYYY-MM-DD.json（本地日期） */
export function exportFileName(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `bnmb-backup-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.json`;
}

/** 导出为格式化 JSON 文本 */
export function serializeProgress(progress: UserProgress): string {
  return JSON.stringify(progress, null, 2);
}
