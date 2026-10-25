import type { SessionResult } from "./session";

/**
 * 训练历史持久化（localStorage）。
 * 存储格式带版本号，最多保留最近 100 局；读取时对损坏数据静默降级为空表。
 */

const STORAGE_KEY = "hennimabi.history.v1";
const MAX_ENTRIES = 100;

/** 与 localStorage 同形的最小接口，测试可注入内存实现 */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function defaultStorage(): StorageLike | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

function isValidEntry(x: unknown): x is SessionResult {
  if (typeof x !== "object" || x === null) return false;
  const r = x as Record<string, unknown>;
  return (
    typeof r.total === "number" &&
    typeof r.correct === "number" &&
    typeof r.accuracy === "number" &&
    typeof r.startedAt === "number" &&
    typeof r.endedAt === "number" &&
    typeof r.durationMs === "number" &&
    Array.isArray(r.records)
  );
}

/** 读取全部历史（按时间先后，旧→新） */
export function loadHistory(storage: StorageLike | null = defaultStorage()): SessionResult[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter(isValidEntry);
  } catch {
    return [];
  }
}

/** 追加一局成绩，返回更新后的完整历史；超出上限时丢弃最旧的 */
export function appendHistory(
  result: SessionResult,
  storage: StorageLike | null = defaultStorage(),
): SessionResult[] {
  const list = [...loadHistory(storage), result].slice(-MAX_ENTRIES);
  storage?.setItem(STORAGE_KEY, JSON.stringify(list));
  return list;
}

export function clearHistory(storage: StorageLike | null = defaultStorage()): void {
  storage?.removeItem(STORAGE_KEY);
}
