import raw from "./verbs.json";
import type { Verb, VerbBank, VerbLevel } from "../domain/types";

const bank = raw as VerbBank;

/** 全部动词（含基础词库与 JLPT 各级别扩展词库） */
export const verbs: Verb[] = bank.verbs;

export const verbBankMeta = bank.meta;

/** 全部 JLPT 级别（由易到难） */
export const VERB_LEVELS: readonly VerbLevel[] = ["N5", "N4", "N3", "N2", "N1"];

/**
 * 按 JLPT 级别筛选动词。
 * 未传或传空数组时返回全部动词；传全部级别时同样返回全部（含无级别标记的词）。
 */
export function filterVerbsByLevels(levels?: readonly VerbLevel[]): Verb[] {
  if (!levels || levels.length === 0 || levels.length === VERB_LEVELS.length) return verbs;
  const set = new Set<VerbLevel>(levels);
  return verbs.filter((v) => v.level !== undefined && set.has(v.level));
}
