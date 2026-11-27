import { CONJUGATABLE_FORMS, type ConjugatableFormId } from "../domain/conjugate";
import type { UserProgress } from "../storage/progress";

/**
 * 形态分批解锁顺序：全部动词始终可用，活用形态按批解锁。
 * 首批是基础 4 形；当前批次全部掌握后解锁下一批。
 */
export const FORM_BATCHES: readonly (readonly ConjugatableFormId[])[] = [
  ["masu", "nai", "te", "ta"],
  ["potential", "volitional", "imperative", "conditional"],
  ["passive", "causative", "causative_passive"],
];

/** 掌握标准：某形态累计答对次数达到该值 */
export const FORM_MASTERY_CORRECT = 5;

/** 形态是否已掌握（累计答对 ≥ FORM_MASTERY_CORRECT） */
export function isFormMastered(
  stats: { attempts: number; correct: number } | undefined,
): boolean {
  return (stats?.correct ?? 0) >= FORM_MASTERY_CORRECT;
}

/** 已掌握的形态总数 */
export function countMasteredForms(progress: UserProgress): number {
  return FORM_BATCHES.flat().filter((f) => isFormMastered(progress.forms[f])).length;
}

/**
 * 已解锁的形态列表：首批始终解锁；
 * 逐批检查，当前批次全部掌握才把下一批并入，遇到未全掌握的批次即停止。
 */
export function getUnlockedForms(progress: UserProgress): ConjugatableFormId[] {
  const unlocked: ConjugatableFormId[] = [];
  for (const batch of FORM_BATCHES) {
    unlocked.push(...batch);
    if (!batch.every((f) => isFormMastered(progress.forms[f]))) break;
  }
  return unlocked;
}

/** 全部形态是否都已解锁 */
export function allFormsUnlocked(progress: UserProgress): boolean {
  return getUnlockedForms(progress).length === FORM_BATCHES.flat().length;
}

/** 当前批次中还未掌握的形态数（0 = 已可解锁/已解锁下一批；全部解锁后返回 0） */
export function unmasteredInCurrentBatch(progress: UserProgress): number {
  if (allFormsUnlocked(progress)) return 0;
  const unlockedCount = getUnlockedForms(progress).length;
  let acc = 0;
  for (const batch of FORM_BATCHES) {
    if (acc + batch.length > unlockedCount) break;
    acc += batch.length;
    if (acc === unlockedCount) {
      return batch.filter((f) => !isFormMastered(progress.forms[f])).length;
    }
  }
  return 0;
}

/**
 * 当前可练习的形态（出题范围，按练习模式区分）：
 * - free（自由模式）：全部 11 种活用形直接开放
 * - adventure（闯关模式，含未选择时的默认）：按分批解锁规则
 */
export function getAvailableForms(progress: UserProgress): ConjugatableFormId[] {
  return progress.practiceMode === "free" ? [...CONJUGATABLE_FORMS] : getUnlockedForms(progress);
}

/**
 * 出题实际使用的形态范围：
 * - 未自选：当前模式的可用形态（闯关=已解锁 / 自由=全部）
 * - 自选：与当前模式的可用形态取交集（闯关模式下即便自选里有未解锁形态也会被剔除）
 * - 若交集为空（例如存档里残留了未解锁形态），退回可用形态，保证能正常出题
 *
 * 正向题与逆向题共用这一范围，避免「正向不出、逆向却出现未解锁形态」。
 */
export function resolveQuestionForms(
  progress: UserProgress,
  selected?: readonly ConjugatableFormId[],
): ConjugatableFormId[] {
  const allowed = getAvailableForms(progress);
  if (!selected || selected.length === 0) return allowed;
  const filtered = allowed.filter((f) => selected.includes(f));
  return filtered.length > 0 ? filtered : allowed;
}
