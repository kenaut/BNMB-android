import { describe, expect, it } from "vitest";
import { getSpecialTags } from "./special";
import { verbs } from "../data/verbs";

const find = (kana: string) => {
  const v = verbs.find((x) => x.kana === kana);
  if (!v) throw new Error(`词库缺少 ${kana}`);
  return v;
};

describe("特例标签", () => {
  it("行く 标记促音便例外", () => {
    expect(getSpecialTags(find("いく"))).toEqual(["促音便例外（て・た）"]);
  });

  it("ある 标记否定特殊与可能形特殊", () => {
    expect(getSpecialTags(find("ある"))).toEqual([
      "否定特殊（ない）",
      "可能形特殊（ありえる）",
    ]);
  });

  it("普通动词没有特例标签", () => {
    expect(getSpecialTags(find("かく"))).toEqual([]);
    expect(getSpecialTags(find("たべる"))).toEqual([]);
  });

  it("词库中只有 行く 与 ある 带标签", () => {
    const tagged = verbs.filter((v) => getSpecialTags(v).length > 0).map((v) => v.kana);
    expect(tagged.sort()).toEqual(["ある", "いく"]);
  });
});
