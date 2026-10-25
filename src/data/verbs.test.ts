import { describe, expect, it } from "vitest";
import { conjugate, ALL_FORMS } from "../domain/conjugate";
import { verbs } from "./verbs";

describe("verbs.json 数据完整性", () => {
  it("id 唯一", () => {
    const ids = verbs.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("每个动词都有 kanji / kana / meaning", () => {
    for (const v of verbs) {
      expect(v.kanji.length).toBeGreaterThan(0);
      expect(v.kana.length).toBeGreaterThan(0);
      expect(v.meaning.length).toBeGreaterThan(0);
    }
  });

  it("type 与词尾自洽（五段以う段结尾 / 一段以る结尾 / サ变以する结尾 / カ变是くる）", () => {
    const godanEndings = ["う", "く", "ぐ", "す", "つ", "ぬ", "ぶ", "む", "る"];
    for (const v of verbs) {
      switch (v.type) {
        case "godan":
          expect(godanEndings).toContain(v.kana.slice(-1));
          break;
        case "ichidan":
          expect(v.kana.endsWith("る")).toBe(true);
          break;
        case "suru":
          expect(v.kana.endsWith("する")).toBe(true);
          break;
        case "kuru":
          expect(v.kana).toBe("くる");
          break;
      }
    }
  });

  it("汉字表记的送假名与假名表记对齐（词尾最后一个字符一致）", () => {
    for (const v of verbs) {
      expect(v.kanji.slice(-1)).toBe(v.kana.slice(-1));
    }
  });

  it("库中每个动词在全部 12 种形态下都能无错活用", () => {
    for (const v of verbs) {
      for (const form of ALL_FORMS) {
        const result = conjugate(v, form);
        expect(result.kanji.length).toBeGreaterThan(0);
        expect(result.kana.length).toBeGreaterThan(0);
      }
    }
  });

  it("覆盖了全部 9 种五段词尾", () => {
    const endings = new Set(
      verbs.filter((v) => v.type === "godan").map((v) => v.kana.slice(-1)),
    );
    expect(endings).toEqual(new Set(["う", "く", "ぐ", "す", "つ", "ぬ", "ぶ", "む", "る"]));
  });
});
