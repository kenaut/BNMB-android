import { collectFormTails, conjugate, CONJUGATABLE_FORMS } from "../domain/conjugate";
import type { ConjugatedForm, FormId, Verb, VerbType } from "../domain/types";
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

/** 编辑距离：用于挑出与正确词尾最接近的干扰项 */
function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[b.length];
}

/**
 * 类型互换：只做「一段 ↔ 五段」互换（学习者最经典的混淆）。
 * サ变 / カ变互换会产出不自然的词，不参与。
 */
const WRONG_TYPE_OF: Partial<Record<VerbType, VerbType>> = {
  ichidan: "godan",
  godan: "ichidan",
};

/**
 * 「错误动词类型活用」陷阱：把一段当五段活用（見る→見って，可能形 食べれる），
 * 或把五段当一段活用（書く→書ます、書て）。
 *
 * 这类错误是真实的日语学习错误，且每个形态都适用，比随机错词尾更具迷惑性。
 */
export function wrongTypeForms(verb: Verb, form: FormId): ConjugatedForm[] {
  if (form === "dictionary") return [];
  const type = WRONG_TYPE_OF[verb.type];
  if (!type) return [];
  try {
    const c = conjugate({ ...verb, type }, form);
    return c.kanji && c.kana ? [c] : [];
  } catch {
    return [];
  }
}

/** 拆分词干与正确词尾（来る / 无词干 / 例外动词返回 null） */
function stemSplit(
  verb: Verb,
  form: FormId,
): { stemKanji: string; stemKana: string; correctTail: string } | null {
  if (form === "dictionary" || verb.type === "kuru") return null;
  const drop = verb.type === "suru" ? 2 : 1;
  const stemKanji = verb.kanji.slice(0, -drop);
  const stemKana = verb.kana.slice(0, -drop);
  if (stemKana.length === 0) return null;
  const correct = conjugate(verb, form);
  if (!correct.kana.startsWith(stemKana)) return null;
  return { stemKanji, stemKana, correctTail: correct.kana.slice(stemKana.length) };
}

/**
 * 「同词干 × 错误词尾」陷阱干扰项：保留词干，把其他动词类型的词尾拼上去。
 * 如 見る→て形 出 見って/見んで/見いて（五段词尾错接到一段词干）、
 * 食べる→て形 出 食べで（浊音错误）。
 *
 * 来る（汉字与读音错位，词干拼接会产出汉字/假名不配对的选项）
 * 与 ある 等例外（ない形不含词干）、する 本体（词干为空）返回空数组，走回退逻辑。
 */
export function sameStemWrongTails(verb: Verb, form: FormId): ConjugatedForm[] {
  const split = stemSplit(verb, form);
  if (!split || form === "dictionary") return [];

  const tails = new Set(collectFormTails(form));
  // 经典浊音错误：て→で、た→だ（食べで / 食べだ）
  if (split.correctTail === "て") tails.add("で");
  if (split.correctTail === "た") tails.add("だ");
  tails.delete(split.correctTail);

  return [...tails].map((t) => ({
    kanji: split.stemKanji + t,
    kana: split.stemKana + t,
  }));
}

/**
 * 正向选择题的 4 个选项（含正确答案，已打乱）。
 *
 * 干扰项按迷惑度分三层取用：
 * 1. 错误动词类型活用（一段↔五段，如 見って / 書ます）
 * 2. 同词干 × 错误词尾，**按与正确词尾的编辑距离排序**，最像的优先
 *    （避免随机挑到「食べして」这类一眼假的词尾）
 * 3. 保底：其他动词的同形态（来る、例外动词等）
 * 全部按 汉字+读音 去重。
 */
export function createChoiceOptions(
  verb: Verb,
  form: FormId,
  pool: Verb[] = verbs,
  rng: () => number = Math.random,
): ConjugatedForm[] {
  const key = (c: ConjugatedForm) => `${c.kanji}|${c.kana}`;
  const correct = conjugate(verb, form);
  const seen = new Set([key(correct)]);
  const distractors: ConjugatedForm[] = [];
  const take = (c: ConjugatedForm) => {
    if (distractors.length >= 3) return;
    const k = key(c);
    if (seen.has(k)) return;
    seen.add(k);
    distractors.push(c);
  };

  // 第一层：错误动词类型活用
  for (const c of wrongTypeForms(verb, form)) take(c);

  // 第二层：同词干错误词尾，离正确词尾越近越优先（随机微扰保留变化）
  const split = stemSplit(verb, form);
  if (split) {
    const ranked = sameStemWrongTails(verb, form)
      .map((c) => ({
        c,
        score:
          -editDistance(c.kana.slice(split.stemKana.length), split.correctTail) + rng() * 0.4,
      }))
      .sort((x, y) => y.score - x.score);
    for (const { c } of ranked) take(c);
  }

  // 第三层：其他动词的同形态
  for (const v of shuffled(pool.filter((x) => x.id !== verb.id), rng)) {
    if (distractors.length >= 3) break;
    take(conjugate(v, form));
  }
  return shuffled([correct, ...distractors], rng);
}

function buildQuestion(
  verb: Verb,
  form: FormId,
  direction: QuestionDirection,
  kind: QuestionKind,
  pool: Verb[],
  rng: () => number,
): Question {
  const given = direction === "reverse" ? conjugate(verb, form) : dict(verb);
  const answer = direction === "reverse" ? dict(verb) : conjugate(verb, form);
  // 逆向题只出填空：题面的活用形已显示汉字，4 选 1 的正确答案在选项里一眼可见
  const effectiveKind: QuestionKind = direction === "reverse" ? "input" : kind;
  const options =
    effectiveKind === "choice" ? createChoiceOptions(verb, form, pool, rng) : undefined;
  return { kind: effectiveKind, direction, verb, form, given, answer, options };
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
  return buildQuestion(verb, form, direction, kind, pool, rng);
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
      buildQuestion(verb, form, direction, rng() < choiceRatio ? "choice" : "input", pool, rng),
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
