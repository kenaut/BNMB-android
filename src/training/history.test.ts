import { describe, expect, it } from "vitest";
import { appendHistory, clearHistory, loadHistory, type StorageLike } from "./history";
import type { SessionResult } from "./session";

function fakeStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

function makeResult(overrides: Partial<SessionResult> = {}): SessionResult {
  return {
    total: 10,
    correct: 8,
    accuracy: 0.8,
    startedAt: 1_000_000,
    endedAt: 1_060_000,
    durationMs: 60_000,
    averageMs: 6_000,
    records: [{ verbId: "taberu", form: "te", correct: true }],
    ...overrides,
  };
}

describe("训练历史持久化", () => {
  it("追加后可读回，内容一致", () => {
    const storage = fakeStorage();
    appendHistory(makeResult(), storage);
    const list = loadHistory(storage);
    expect(list).toHaveLength(1);
    expect(list[0]).toEqual(makeResult());
  });

  it("多局按时间先后排列，超出 100 局丢弃最旧", () => {
    const storage = fakeStorage();
    for (let i = 0; i < 105; i++) {
      appendHistory(makeResult({ startedAt: i, endedAt: i + 1 }), storage);
    }
    const list = loadHistory(storage);
    expect(list).toHaveLength(100);
    expect(list[0].startedAt).toBe(5); // 最旧的 0~4 被丢弃
    expect(list[99].startedAt).toBe(104);
  });

  it("损坏的 JSON 与错误结构都降级为空表", () => {
    const storage = fakeStorage();
    storage.setItem("hennimabi.history.v1", "{oops");
    expect(loadHistory(storage)).toEqual([]);

    storage.setItem("hennimabi.history.v1", JSON.stringify({ not: "array" }));
    expect(loadHistory(storage)).toEqual([]);

    storage.setItem(
      "hennimabi.history.v1",
      JSON.stringify([makeResult(), { broken: true }]),
    );
    const list = loadHistory(storage);
    expect(list).toHaveLength(1); // 坏条目被过滤，好条目保留
  });

  it("clearHistory 清空记录", () => {
    const storage = fakeStorage();
    appendHistory(makeResult(), storage);
    clearHistory(storage);
    expect(loadHistory(storage)).toEqual([]);
  });

  it("无存储环境（storage=null）时不报错", () => {
    expect(loadHistory(null)).toEqual([]);
    expect(appendHistory(makeResult(), null)).toHaveLength(1);
    expect(() => clearHistory(null)).not.toThrow();
  });
});
