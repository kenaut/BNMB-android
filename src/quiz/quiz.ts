import { conjugate, CONJUGATABLE_FORMS } from "../domain/conjugate";
import type { ConjugatedForm, FormId, Verb } from "../domain/types";
import { verbs } from "../data/verbs";

/** 题型：填空变形 / 四选一选择 */
export type QuestionKind = "input" | "choice";

/**
 * 出题方向：
 * - forward：给出辞书形 → 写出目标活用形
 * - reverse：给出某个活用形 → 还原辞书形（辞书形借此加入学习）
 */
export type QuestionDirection = "forward" | "reverse";

/** 一道练习题（选择题附带 4 个选项） */
export interface Question {
  kind: QuestionKind;
  direction: QuestionDirection;
  verb: Verb;
  /** forward：目标活用形；reverse：题面给出的活用形 */
  form: FormId;
  /** 题面展示的形（forward=辞书形，reverse=conjugate(verb, form)） */
  given: ConjugatedForm;
  answer: ConjugatedForm;
  /** kind === "choice" 时为 4 个选项（含 1 个正确答案），顺序已打乱 */
  options?: ConjugatedForm[];
}

function shuffled<T>(arr: readonly T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const dict = (v: Verb): ConjugatedForm => ({ kanji: v.kanji, kana: v.kana });

/**
 * 正向选择题的 4 个选项（含正确答案，已打乱）。
 * 干扰项优先取「同一动词的其他形态」（如考 て形 时混入 た形/ます形，迷惑性最强），
 * 不够 3 个再用「其他动词的同一形态」补足。按 汉字+读音 去重。
 */
export function createChoiceOptions(
  verb: Verb,
  form: FormId,
  pool: Verb[] = verbs,
  forms: readonly FormId[] = CONJUGATABLE_FORMS,
  rng: () => number = Math.random,
): ConjugatedForm[] {
  const key = (c: ConjugatedForm) => `${c.kanji}|${c.kana}`;
  const correct = conjugate(verb, form);
  const seen = new Set([key(correct)]);
  const distractors: ConjugatedForm[] = [];

  for (const f of forms) {
    if (f === form) continue;
    const c = conjugate(verb, f);
    if (!seen.has(key(c))) {
      seen.add(key(c));
      distractors.push(c);
    }
  }
  for (const v of shuffled(pool.filter((x) => x.id !== verb.id), rng)) {
    if (distractors.length >= 3) break;
    const c = conjugate(v, form);
    if (!seen.has(key(c))) {
      seen.add(key(c));
      distractors.push(c);
    }
  }
  return shuffled([correct, ...distractors.slice(0, 3)], rng);
}

/** 逆向选择题的 4 个选项：1 个正确辞书形 + 3 个其他动词的辞书形 */
export function createReverseOptions(
  verb: Verb,
  pool: Verb[] = verbs,
  rng: () => number = Math.random,
): ConjugatedForm[] {
  const key = (c: ConjugatedForm) => `${c.kanji}|${c.kana}`;
  const correct = dict(verb);
  const seen = new Set([key(correct)]);
  const distractors: ConjugatedForm[] = [];
  for (const v of shuffled(pool.filter((x) => x.id !== verb.id), rng)) {
    if (distractors.length >= 3) break;
    const c = dict(v);
    if (!seen.has(key(c))) {
      seen.add(key(c));
      distractors.push(c);
    }
  }
  return shuffled([correct, ...distractors], rng);
}

function buildQuestion(
  verb: Verb,
  form: FormId,
  direction: QuestionDirection,
  kind: QuestionKind,
  pool: Verb[],
  forms: readonly FormId[],
  rng: () => number,
): Question {
  const given = direction === "reverse" ? conjugate(verb, form) : dict(verb);
  const answer = direction === "reverse" ? dict(verb) : conjugate(verb, form);
  const options =
    kind === "choice"
      ? direction === "reverse"
        ? createReverseOptions(verb, pool, rng)
        : createChoiceOptions(verb, form, pool, forms, rng)
      : undefined;
  return { kind, direction, verb, form, given, answer, options };
}

/**
 * 随机出一道题。可注入词库 / 形态范围 / 随机源（测试时可固定）。
 * direction="reverse" 时给出活用形、要求还原辞书形（form 不可为 dictionary）。
 */
export function createQuestion(
  pool: Verb[] = verbs,
  forms: readonly FormId[] = CONJUGATABLE_FORMS,
  rng: () => number = Math.random,
  kind: QuestionKind = "input",
  direction: QuestionDirection = "forward",
): Question {
  const verb = pool[Math.floor(rng() * pool.length)];
  const form = forms[Math.floor(rng() * forms.length)];
  if (form === "dictionary") throw new Error("dictionary 不能作为出题形态");
  return buildQuestion(verb, form, direction, kind, pool, forms, rng);
}

/**
 * 生成 count 道组合互不重复的题目（组合 = 动词 × 活用形 × 出题方向），
 * 正向（辞书形→活用形）与逆向（活用形→辞书形）各占约一半。
 * choiceRatio 控制选择题占比（默认一半）。
 */
export function createQuestions(
  count: number,
  pool: Verb[] = verbs,
  forms: readonly FormId[] = CONJUGATABLE_FORMS,
  rng: () => number = Math.random,
  choiceRatio = 0.5,
): Question[] {
  const combos: Array<{ verb: Verb; form: FormId; direction: QuestionDirection }> = [];
  for (const verb of pool) {
    for (const form of forms) {
      if (form === "dictionary") continue;
      combos.push({ verb, form, direction: "forward" });
      combos.push({ verb, form, direction: "reverse" });
    }
  }
  if (count > combos.length) {
    throw new Error(`题目数 ${count} 超过可用组合数 ${combos.length}`);
  }
  return shuffled(combos, rng)
    .slice(0, count)
    .map(({ verb, form, direction }) =>
      buildQuestion(verb, form, direction, rng() < choiceRatio ? "choice" : "input", pool, forms, rng),
    );
}

/**
 * 判分：汉字作答或假名作答都算对（忽略首尾与中间空白）。
 * 例如 て形「来て」答「きて」也正确。
 */
export function checkAnswer(input: string, answer: ConjugatedForm): boolean {
  const normalized = input.replace(/\s+/g, "");
  return normalized.length > 0 && (normalized === answer.kanji || normalized === answer.kana);
}

/** 选择题判分：选中项与标准答案的 汉字+读音 完全一致 */
export function checkChoice(selected: ConjugatedForm, answer: ConjugatedForm): boolean {
  return selected.kanji === answer.kanji && selected.kana === answer.kana;
}
