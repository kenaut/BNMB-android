import { describe, expect, it } from "vitest";
import {
  exportFileName,
  loadProgress,
  parseImport,
  saveProgress,
  clearProgress,
  STORAGE_KEY,
  type StorageLike,
} from "./persistence";
import { createDefaultProgress, PROGRESS_VERSION, type UserProgress } from "./progress";

function fakeStorage(initial?: Record<string, string>): StorageLike {
  const map = new Map(Object.entries(initial ?? {}));
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

function sampleProgress(): UserProgress {
  const p = createDefaultProgress();
  p.totalQuestions = 10;
  p.correctAnswers = 7;
  p.totalSessions = 1;
  p.streak = { current: 1, longest: 3, lastStudyDate: "2026-10-16" };
  p.forms = { te: { attempts: 4, correct: 3 } };
  p.recentResults = [
    { date: "2026-10-16 22:00", totalQuestions: 10, correctAnswers: 7, accuracy: 0.7, elapsedMs: 60000 },
  ];
  return p;
}

describe("loadProgress 异常降级", () => {
  it("没有存档 → 默认数据", () => {
    expect(loadProgress(fakeStorage())).toEqual(createDefaultProgress());
  });

  it("JSON 损坏 → 默认数据", () => {
    const s = fakeStorage({ [STORAGE_KEY]: "{broken json" });
    expect(loadProgress(s)).toEqual(createDefaultProgress());
  });

  it("字段缺失 → 缺失部分补默认值，已有字段保留", () => {
    const s = fakeStorage({
      [STORAGE_KEY]: JSON.stringify({ version: PROGRESS_VERSION, totalQuestions: 42 }),
    });
    const p = loadProgress(s);
    expect(p.totalQuestions).toBe(42);
    expect(p.profile).toEqual({ nickname: "学习者" });
    expect(p.streak).toEqual({ current: 0, longest: 0, lastStudyDate: null });
    expect(p.recentResults).toEqual([]);
  });

  it("旧存档无 profile 字段 → 自动补默认昵称；已有昵称保留", () => {
    const s = fakeStorage({
      [STORAGE_KEY]: JSON.stringify({ version: PROGRESS_VERSION, profile: { nickname: "タロウ" } }),
    });
    expect(loadProgress(s).profile.nickname).toBe("タロウ");
  });

  it("version 不兼容 → 默认数据", () => {
    const s = fakeStorage({
      [STORAGE_KEY]: JSON.stringify({ version: 999, totalQuestions: 42 }),
    });
    expect(loadProgress(s)).toEqual(createDefaultProgress());
  });

  it("存储不可用（null）→ 默认数据", () => {
    expect(loadProgress(null)).toEqual(createDefaultProgress());
  });
});

describe("saveProgress / clearProgress", () => {
  it("保存后可完整读回", () => {
    const s = fakeStorage();
    expect(saveProgress(sampleProgress(), s)).toBe(true);
    expect(loadProgress(s)).toEqual(sampleProgress());
  });

  it("存储不可用时返回 false，不抛异常", () => {
    expect(saveProgress(sampleProgress(), null)).toBe(false);
    expect(() => clearProgress(null)).not.toThrow();
  });

  it("清除后恢复默认数据", () => {
    const s = fakeStorage();
    saveProgress(sampleProgress(), s);
    clearProgress(s);
    expect(loadProgress(s)).toEqual(createDefaultProgress());
  });
});

describe("parseImport", () => {
  it("合法备份导入成功并补全字段", () => {
    const r = parseImport(JSON.stringify({ version: PROGRESS_VERSION, totalSessions: 5 }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.progress.totalSessions).toBe(5);
      expect(r.progress.forms).toEqual({});
    }
  });

  it("非 JSON → 明确错误", () => {
    const r = parseImport("not json");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/JSON/);
  });

  it("version 不兼容 → 明确错误", () => {
    const r = parseImport(JSON.stringify({ version: 2 }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/版本不兼容/);
  });
});

describe("exportFileName", () => {
  it("格式为 bnmb-backup-YYYY-MM-DD.json", () => {
    expect(exportFileName(new Date(2026, 9, 16))).toBe("bnmb-backup-2026-10-16.json");
  });
});
