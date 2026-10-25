import type { ConjugatableFormId } from "../domain/conjugate";
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
