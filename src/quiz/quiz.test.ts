import { describe, expect, it } from "vitest";
import { conjugate, CONJUGATABLE_FORMS } from "../domain/conjugate";
import { verbs } from "../data/verbs";
import {
  checkAnswer,
  checkChoice,
  createChoiceOptions,
  createQuestion,
  createQuestions,
  createReverseOptions,
} from "./quiz";

describe("createQuestion", () => {
  it("rng=0 时选中词库第一个动词与第一个形态（ます形）", () => {
    const q = createQuestion(verbs, undefined, () => 0);
    expect(q.verb).toBe(verbs[0]);
    expect(q.form).toBe("masu");
    expect(q.answer).toEqual(conjugate(verbs[0], "masu"));
  });

  it("随机出题的答案始终与活用引擎一致", () => {
    for (let i = 0; i < 50; i++) {
      const q = createQuestion();
      expect(q.answer).toEqual(conjugate(q.verb, q.form));
    }
  });

  it("支持限定词库范围出题", () => {
    const pool = verbs.filter((v) => v.type === "kuru");
    for (let i = 0; i < 10; i++) {
      expect(createQuestion(pool).verb.type).toBe("kuru");
    }
  });
});

describe("选择题", () => {
  const kaku = verbs.find((v) => v.id === "kaku")!;

  it("选项恰好 4 个、互不重复、且包含正确答案", () => {
    for (let i = 0; i < 30; i++) {
      const q = createQuestion(verbs, undefined, Math.random, "choice");
      expect(q.kind).toBe("choice");
      expect(q.options).toHaveLength(4);
      const keys = q.options!.map((o) => `${o.kanji}|${o.kana}`);
      expect(new Set(keys).size).toBe(4);
      const correct = q.options!.filter(
        (o) => o.kanji === q.answer.kanji && o.kana === q.answer.kana,
      );
      expect(correct).toHaveLength(1);
    }
  });

  it("词库只有 1 个动词时，干扰项全部来自该动词的其他形态", () => {
    const options = createChoiceOptions(kaku, "te", [kaku], CONJUGATABLE_FORMS, () => 0.5);
    expect(options).toHaveLength(4);
    // 单词库时干扰项必须全部是该动词的其他形态（ます/ない/た/可能…中任取 3 个）
    const allForms = CONJUGATABLE_FORMS.map((f) => conjugate(kaku, f));
    for (const o of options) {
      expect(allForms).toContainEqual(o);
    }
  });

  it("checkChoice：汉字+读音一致才算对", () => {
    const answer = conjugate(kaku, "te"); // 書いて / かいて
    expect(checkChoice({ kanji: "書いて", kana: "かいて" }, answer)).toBe(true);
    // 同字形不同读音（如把 来て 读错）不算对
    expect(checkChoice({ kanji: "書いて", kana: "かいた" }, answer)).toBe(false);
  });

  it("createQuestions：choiceRatio=1 全为选择题，=0 全为填空，且组合仍不重复", () => {
    const allChoice = createQuestions(10, verbs, undefined, Math.random, 1);
    expect(allChoice.every((q) => q.kind === "choice" && q.options?.length === 4)).toBe(true);

    const allInput = createQuestions(10, verbs, undefined, Math.random, 0);
    expect(allInput.every((q) => q.kind === "input" && q.options === undefined)).toBe(true);

    const keys = allChoice.map((q) => `${q.verb.id}:${q.form}`);
    expect(new Set(keys).size).toBe(10);
  });
});

describe("逆向题（活用形 → 辞书形）", () => {
  it("题面是活用形，答案是辞书形", () => {
    const kaku = verbs.find((v) => v.id === "kaku")!;
    const q = createQuestion([kaku], ["te"], () => 0, "input", "reverse");
    expect(q.direction).toBe("reverse");
    expect(q.given).toEqual({ kanji: "書いて", kana: "かいて" });
    expect(q.answer).toEqual({ kanji: "書く", kana: "かく" });
    expect(checkAnswer("書く", q.answer)).toBe(true);
    expect(checkAnswer("かく", q.answer)).toBe(true); // 假名作答也算对
  });

  it("来る 的逆向题：题面带正确读音（来て/きて → 来る/くる）", () => {
    const kuru = verbs.find((v) => v.id === "kuru")!;
    const q = createQuestion([kuru], ["te"], () => 0, "input", "reverse");
    expect(q.given).toEqual({ kanji: "来て", kana: "きて" });
    expect(q.answer).toEqual({ kanji: "来る", kana: "くる" });
  });

  it("逆向选择题：4 个选项都是辞书形且含正确答案", () => {
    for (let i = 0; i < 30; i++) {
      const q = createQuestion(verbs, undefined, Math.random, "choice", "reverse");
      expect(q.options).toHaveLength(4);
      const keys = q.options!.map((o) => `${o.kanji}|${o.kana}`);
      expect(new Set(keys).size).toBe(4);
      expect(q.options).toContainEqual({ kanji: q.verb.kanji, kana: q.verb.kana });
    }
  });

  it("createReverseOptions 不重复且包含正确辞书形", () => {
    const kaku = verbs.find((v) => v.id === "kaku")!;
    const options = createReverseOptions(kaku, verbs, () => 0.5);
    expect(options).toHaveLength(4);
    expect(options).toContainEqual({ kanji: "書く", kana: "かく" });
  });

  it("dictionary 不能作为出题形态", () => {
    expect(() => createQuestion(verbs, ["dictionary"], () => 0)).toThrow(/dictionary/);
  });
});

describe("createQuestions（回合内不重复）", () => {
  it("10 题的 动词×形态×方向 组合两两不同，且答案与引擎一致", () => {
    const questions = createQuestions(10);
    expect(questions).toHaveLength(10);
    const keys = questions.map((q) => `${q.verb.id}:${q.form}:${q.direction}`);
    expect(new Set(keys).size).toBe(10);
    for (const q of questions) {
      const expected =
        q.direction === "reverse"
          ? { kanji: q.verb.kanji, kana: q.verb.kana }
          : conjugate(q.verb, q.form);
      expect(q.answer).toEqual(expected);
    }
  });

  it("可以取满全部组合（动词数 × 11 活用形 × 2 方向）", () => {
    const total = verbs.length * 11 * 2;
    const questions = createQuestions(total);
    expect(new Set(questions.map((q) => `${q.verb.id}:${q.form}:${q.direction}`)).size).toBe(total);
  });

  it("超出组合数时抛错", () => {
    expect(() => createQuestions(verbs.length * 11 * 2 + 1)).toThrow(/超过可用组合数/);
  });

  it("限定词库后组合数按词库计算（1 词 × 11 × 2 = 22）", () => {
    const pool = verbs.filter((v) => v.type === "kuru");
    expect(createQuestions(22, pool).every((q) => q.verb.type === "kuru")).toBe(true);
    expect(() => createQuestions(23, pool)).toThrow();
  });

  it("正向与逆向题都会出现在回合中", () => {
    const questions = createQuestions(40);
    const directions = new Set(questions.map((q) => q.direction));
    expect(directions).toEqual(new Set(["forward", "reverse"]));
  });
});

describe("checkAnswer", () => {
  const answer = { kanji: "書いて", kana: "かいて" };

  it("接受汉字作答", () => {
    expect(checkAnswer("書いて", answer)).toBe(true);
  });

  it("接受假名作答", () => {
    expect(checkAnswer("かいて", answer)).toBe(true);
  });

  it("忽略首尾与中间的空白（含全角空格）", () => {
    expect(checkAnswer("　書いて ", answer)).toBe(true);
  });

  it("拒绝错误答案与空输入", () => {
    expect(checkAnswer("書きて", answer)).toBe(false);
    expect(checkAnswer("", answer)).toBe(false);
    expect(checkAnswer("   ", answer)).toBe(false);
  });

  it("来る：汉字与读音两种表记都接受", () => {
    const kite = { kanji: "来て", kana: "きて" };
    expect(checkAnswer("来て", kite)).toBe(true);
    expect(checkAnswer("きて", kite)).toBe(true);
  });
});
