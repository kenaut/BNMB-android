import { describe, expect, it } from "vitest";
import { conjugate, ALL_FORMS } from "./conjugate";
import { formToFurigana, toFurigana } from "./furigana";
import { verbs } from "../data/verbs";

describe("toFurigana", () => {
  it("单汉字 + 送り仮名：食べる/たべる", () => {
    expect(toFurigana("食べる", "たべる")).toEqual([
      { text: "食", reading: "た" },
      { text: "べる" },
    ]);
  });

  it("多汉字整体注音：勉強する/べんきょうする", () => {
    expect(toFurigana("勉強する", "べんきょうする")).toEqual([
      { text: "勉強", reading: "べんきょう" },
      { text: "する" },
    ]);
  });

  it("含促音便：行った/いった", () => {
    expect(toFurigana("行った", "いった")).toEqual([
      { text: "行", reading: "い" },
      { text: "った" },
    ]);
  });

  it("含拨音便与浊音：読んで/よんで", () => {
    expect(toFurigana("読んで", "よんで")).toEqual([
      { text: "読", reading: "よ" },
      { text: "んで" },
    ]);
  });

  it("イ音便（ぐ行浊音）：泳いで/およいで", () => {
    expect(toFurigana("泳いで", "およいで")).toEqual([
      { text: "泳", reading: "およ" },
      { text: "いで" },
    ]);
  });

  it("来る 的汉字/读音分离：来ない/こない", () => {
    expect(toFurigana("来ない", "こない")).toEqual([
      { text: "来", reading: "こ" },
      { text: "ない" },
    ]);
  });

  it("纯假名词不注音：する / ある", () => {
    expect(toFurigana("する", "する")).toEqual([{ text: "する" }]);
    expect(toFurigana("ある", "ある")).toEqual([{ text: "ある" }]);
  });

  it("ある 的ない形「ない」整段无注音", () => {
    expect(formToFurigana({ kanji: "ない", kana: "ない" })).toEqual([{ text: "ない" }]);
  });

  it("无法对齐时抛错（汉字夹假名的词）", () => {
    expect(() => toFurigana("引っ越す", "ひっこす")).toThrow(/无法对齐振假名/);
  });
});

describe("全库×全部形态：振假名均可自动推导且不丢字", () => {
  it("每个形态的分段拼回后与原 kanji/kana 一致", () => {
    for (const verb of verbs) {
      for (const form of ALL_FORMS) {
        const result = conjugate(verb, form);
        const segments = toFurigana(result.kanji, result.kana);
        // 拼回汉字表记
        expect(segments.map((s) => s.text).join("")).toBe(result.kanji);
        // 拼回假名表记（带读音的段用读音）
        expect(segments.map((s) => s.reading ?? s.text).join("")).toBe(result.kana);
        // 只有汉字段带读音，纯文本段一律不带
        for (const s of segments) {
          if (s.reading === undefined) {
            expect(/[\u3400-\u4dbf\u4e00-\u9fff々]/.test(s.text)).toBe(false);
          }
        }
      }
    }
  });
});
