import { describe, expect, it } from "vitest";
import { createDefaultProgress, type UserProgress } from "../storage/progress";
import {
  allFormsUnlocked,
  countMasteredForms,
  FORM_BATCHES,
  FORM_MASTERY_CORRECT,
  getUnlockedForms,
  isFormMastered,
  unmasteredInCurrentBatch,
} from "./mastery";

/** 构造：把指定形态标记为答对 n 次 */
function withForms(entries: Record<string, number>): UserProgress {
  const p = createDefaultProgress();
  for (const [form, correct] of Object.entries(entries)) {
    p.forms[form] = { attempts: correct + 1, correct };
  }
  return p;
}

const FIRST_BATCH = FORM_BATCHES[0]; // ["masu", "nai", "te", "ta"]

describe("形态掌握判定", () => {
  it(`累计答对 ${FORM_MASTERY_CORRECT} 次算掌握`, () => {
    expect(isFormMastered(undefined)).toBe(false);
    expect(isFormMastered({ attempts: 9, correct: 4 })).toBe(false);
    expect(isFormMastered({ attempts: 5, correct: 5 })).toBe(true);
  });
});

describe("形态分批解锁", () => {
  it("新用户只解锁首批 4 个基础形态", () => {
    const p = createDefaultProgress();
    expect(getUnlockedForms(p)).toEqual([...FIRST_BATCH]);
    expect(allFormsUnlocked(p)).toBe(false);
  });

  it("首批未全部掌握时不解锁下一批", () => {
    const p = withForms({ masu: 5, nai: 5, te: 5 }); // ta 未掌握
    expect(getUnlockedForms(p)).toHaveLength(4);
  });

  it("首批全部掌握后解锁第二批（共 8 个）", () => {
    const p = withForms({ masu: 5, nai: 5, te: 5, ta: 6 });
    expect(getUnlockedForms(p)).toHaveLength(8);
    expect(getUnlockedForms(p)).toContain("potential");
    expect(getUnlockedForms(p)).toContain("conditional");
    expect(getUnlockedForms(p)).not.toContain("passive");
  });

  it("前两批全部掌握后全部 11 个形态解锁", () => {
    const p = withForms({
      masu: 5, nai: 5, te: 5, ta: 5,
      potential: 5, volitional: 5, imperative: 5, conditional: 5,
    });
    expect(getUnlockedForms(p)).toHaveLength(11);
    expect(allFormsUnlocked(p)).toBe(true);
    expect(countMasteredForms(p)).toBe(8);
  });
});

describe("当前批次进度提示", () => {
  it("新用户还需掌握 4 个；掌握 2 个后还需 2 个", () => {
    expect(unmasteredInCurrentBatch(createDefaultProgress())).toBe(4);
    expect(unmasteredInCurrentBatch(withForms({ masu: 5, nai: 5 }))).toBe(2);
  });

  it("全部解锁后返回 0", () => {
    const p = withForms({
      masu: 5, nai: 5, te: 5, ta: 5,
      potential: 5, volitional: 5, imperative: 5, conditional: 5,
    });
    expect(unmasteredInCurrentBatch(p)).toBe(0);
  });
});
