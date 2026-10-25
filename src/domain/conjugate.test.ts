import { describe, expect, it } from "vitest";
import { ALL_FORMS, conjugate, conjugateAll, CONJUGATABLE_FORMS } from "./conjugate";
import type { Verb, VerbType } from "./types";

/** 测试辅助：快速构造 Verb */
function v(kanji: string, kana: string, type: VerbType): Verb {
  return { id: kana, kanji, kana, meaning: "", type };
}

describe("五段动词（9 种词尾全覆盖）", () => {
  const cases: Array<{
    kanji: string;
    kana: string;
    masu: string;
    nai: string;
    te: string;
    ta: string;
  }> = [
    // く
    { kanji: "書く", kana: "かく", masu: "書きます", nai: "書かない", te: "書いて", ta: "書いた" },
    // ぐ
    { kanji: "泳ぐ", kana: "およぐ", masu: "泳ぎます", nai: "泳がない", te: "泳いで", ta: "泳いだ" },
    // す
    { kanji: "話す", kana: "はなす", masu: "話します", nai: "話さない", te: "話して", ta: "話した" },
    // つ
    { kanji: "立つ", kana: "たつ", masu: "立ちます", nai: "立たない", te: "立って", ta: "立った" },
    { kanji: "待つ", kana: "まつ", masu: "待ちます", nai: "待たない", te: "待って", ta: "待った" },
    // ぬ
    { kanji: "死ぬ", kana: "しぬ", masu: "死にます", nai: "死なない", te: "死んで", ta: "死んだ" },
    // ぶ
    { kanji: "遊ぶ", kana: "あそぶ", masu: "遊びます", nai: "遊ばない", te: "遊んで", ta: "遊んだ" },
    // む
    { kanji: "飲む", kana: "のむ", masu: "飲みます", nai: "飲まない", te: "飲んで", ta: "飲んだ" },
    { kanji: "読む", kana: "よむ", masu: "読みます", nai: "読まない", te: "読んで", ta: "読んだ" },
    // る（帰る/走る 是五段，不是一段！）
    { kanji: "帰る", kana: "かえる", masu: "帰ります", nai: "帰らない", te: "帰って", ta: "帰った" },
    { kanji: "走る", kana: "はしる", masu: "走ります", nai: "走らない", te: "走って", ta: "走った" },
    // う（ない形是「わない」，不是「あない」）
    { kanji: "買う", kana: "かう", masu: "買います", nai: "買わない", te: "買って", ta: "買った" },
    { kanji: "会う", kana: "あう", masu: "会います", nai: "会わない", te: "会って", ta: "会った" },
  ];

  for (const c of cases) {
    it(`${c.kanji}：${c.masu} / ${c.nai} / ${c.te} / ${c.ta}`, () => {
      const verb = v(c.kanji, c.kana, "godan");
      expect(conjugate(verb, "masu").kanji).toBe(c.masu);
      expect(conjugate(verb, "nai").kanji).toBe(c.nai);
      expect(conjugate(verb, "te").kanji).toBe(c.te);
      expect(conjugate(verb, "ta").kanji).toBe(c.ta);
    });
  }

  it("汉字与假名同步变化（書く → 書いて / かいて）", () => {
    expect(conjugate(v("書く", "かく", "godan"), "te")).toEqual({
      kanji: "書いて",
      kana: "かいて",
    });
  });
});

describe("五段动词的特殊变化", () => {
  it("行く：て形/た形是促音便（行って/行った），而非イ音便", () => {
    const iku = v("行く", "いく", "godan");
    expect(conjugate(iku, "te")).toEqual({ kanji: "行って", kana: "いって" });
    expect(conjugate(iku, "ta")).toEqual({ kanji: "行った", kana: "いった" });
  });

  it("行く：ます形/ない形仍按规则变化（行きます/行かない）", () => {
    const iku = v("行く", "いく", "godan");
    expect(conjugate(iku, "masu").kanji).toBe("行きます");
    expect(conjugate(iku, "nai").kanji).toBe("行かない");
  });

  it("ある：ない形是「ない」，而非「あらない」", () => {
    expect(conjugate(v("ある", "ある", "godan"), "nai")).toEqual({
      kanji: "ない",
      kana: "ない",
    });
  });

  it("ある：其余形态按规则变化（あります/あって/あった）", () => {
    const aru = v("ある", "ある", "godan");
    expect(conjugate(aru, "masu").kanji).toBe("あります");
    expect(conjugate(aru, "te").kanji).toBe("あって");
    expect(conjugate(aru, "ta").kanji).toBe("あった");
  });
});

describe("一段动词", () => {
  const cases: Array<[string, string, string, string, string, string]> = [
    ["食べる", "たべる", "食べます", "食べない", "食べて", "食べた"],
    ["見る", "みる", "見ます", "見ない", "見て", "見た"],
    ["起きる", "おきる", "起きます", "起きない", "起きて", "起きた"],
    ["寝る", "ねる", "寝ます", "寝ない", "寝て", "寝た"],
    ["教える", "おしえる", "教えます", "教えない", "教えて", "教えた"],
  ];

  for (const [kanji, kana, masu, nai, te, ta] of cases) {
    it(`${kanji}：${masu} / ${nai} / ${te} / ${ta}`, () => {
      const verb = v(kanji, kana, "ichidan");
      expect(conjugate(verb, "masu")).toEqual({ kanji: masu, kana: kana.slice(0, -1) + "ます" });
      expect(conjugate(verb, "nai").kanji).toBe(nai);
      expect(conjugate(verb, "te").kanji).toBe(te);
      expect(conjugate(verb, "ta").kanji).toBe(ta);
    });
  }
});

describe("サ变动词（する）", () => {
  it("する：全部 12 种形态", () => {
    expect(conjugateAll(v("する", "する", "suru"))).toEqual({
      dictionary: { kanji: "する", kana: "する" },
      masu: { kanji: "します", kana: "します" },
      nai: { kanji: "しない", kana: "しない" },
      te: { kanji: "して", kana: "して" },
      ta: { kanji: "した", kana: "した" },
      potential: { kanji: "できる", kana: "できる" },
      volitional: { kanji: "しよう", kana: "しよう" },
      imperative: { kanji: "しろ", kana: "しろ" },
      conditional: { kanji: "すれば", kana: "すれば" },
      passive: { kanji: "される", kana: "される" },
      causative: { kanji: "させる", kana: "させる" },
      causative_passive: { kanji: "させられる", kana: "させられる" },
    });
  });

  it("勉強する（名词+する 复合）：可能形是「勉強できる」", () => {
    const benkyou = v("勉強する", "べんきょうする", "suru");
    expect(conjugate(benkyou, "masu")).toEqual({ kanji: "勉強します", kana: "べんきょうします" });
    expect(conjugate(benkyou, "nai")).toEqual({ kanji: "勉強しない", kana: "べんきょうしない" });
    expect(conjugate(benkyou, "te")).toEqual({ kanji: "勉強して", kana: "べんきょうして" });
    expect(conjugate(benkyou, "ta")).toEqual({ kanji: "勉強した", kana: "べんきょうした" });
    expect(conjugate(benkyou, "potential")).toEqual({ kanji: "勉強できる", kana: "べんきょうできる" });
    expect(conjugate(benkyou, "volitional")).toEqual({ kanji: "勉強しよう", kana: "べんきょうしよう" });
    expect(conjugate(benkyou, "imperative")).toEqual({ kanji: "勉強しろ", kana: "べんきょうしろ" });
    expect(conjugate(benkyou, "conditional")).toEqual({ kanji: "勉強すれば", kana: "べんきょうすれば" });
    expect(conjugate(benkyou, "passive")).toEqual({ kanji: "勉強される", kana: "べんきょうされる" });
    expect(conjugate(benkyou, "causative")).toEqual({ kanji: "勉強させる", kana: "べんきょうさせる" });
    expect(conjugate(benkyou, "causative_passive")).toEqual({
      kanji: "勉強させられる",
      kana: "べんきょうさせられる",
    });
  });
});

describe("カ变动词（来る）", () => {
  it("来る：全部 12 种形态（汉字与读音变化不一致）", () => {
    expect(conjugateAll(v("来る", "くる", "kuru"))).toEqual({
      dictionary: { kanji: "来る", kana: "くる" },
      masu: { kanji: "来ます", kana: "きます" },
      nai: { kanji: "来ない", kana: "こない" },
      te: { kanji: "来て", kana: "きて" },
      ta: { kanji: "来た", kana: "きた" },
      potential: { kanji: "来られる", kana: "こられる" },
      volitional: { kanji: "来よう", kana: "こよう" },
      imperative: { kanji: "来い", kana: "こい" },
      conditional: { kanji: "来れば", kana: "くれば" },
      passive: { kanji: "来られる", kana: "こられる" },
      causative: { kanji: "来させる", kana: "こさせる" },
      causative_passive: { kanji: "来させられる", kana: "こさせられる" },
    });
  });
});

describe("扩展形态：可能/意向/命令/条件/受身/使役/使役受身/辞书", () => {
  it("五段 書く", () => {
    const kaku = v("書く", "かく", "godan");
    expect(conjugate(kaku, "dictionary")).toEqual({ kanji: "書く", kana: "かく" });
    expect(conjugate(kaku, "potential")).toEqual({ kanji: "書ける", kana: "かける" });
    expect(conjugate(kaku, "volitional")).toEqual({ kanji: "書こう", kana: "かこう" });
    expect(conjugate(kaku, "imperative")).toEqual({ kanji: "書け", kana: "かけ" });
    expect(conjugate(kaku, "conditional")).toEqual({ kanji: "書けば", kana: "かけば" });
    expect(conjugate(kaku, "passive")).toEqual({ kanji: "書かれる", kana: "かかれる" });
    expect(conjugate(kaku, "causative")).toEqual({ kanji: "書かせる", kana: "かかせる" });
    expect(conjugate(kaku, "causative_passive")).toEqual({
      kanji: "書かせられる",
      kana: "かかせられる",
    });
  });

  it("五段う结尾 買う：未然形是 わ 行（買われる/買わせる）", () => {
    const kau = v("買う", "かう", "godan");
    expect(conjugate(kau, "potential").kanji).toBe("買える");
    expect(conjugate(kau, "volitional").kanji).toBe("買おう");
    expect(conjugate(kau, "passive").kanji).toBe("買われる");
    expect(conjugate(kau, "causative").kanji).toBe("買わせる");
  });

  it("一段 食べる", () => {
    const taberu = v("食べる", "たべる", "ichidan");
    expect(conjugate(taberu, "dictionary")).toEqual({ kanji: "食べる", kana: "たべる" });
    expect(conjugate(taberu, "potential")).toEqual({ kanji: "食べられる", kana: "たべられる" });
    expect(conjugate(taberu, "volitional")).toEqual({ kanji: "食べよう", kana: "たべよう" });
    expect(conjugate(taberu, "imperative")).toEqual({ kanji: "食べろ", kana: "たべろ" });
    expect(conjugate(taberu, "conditional")).toEqual({ kanji: "食べれば", kana: "たべれば" });
    expect(conjugate(taberu, "passive")).toEqual({ kanji: "食べられる", kana: "たべられる" });
    expect(conjugate(taberu, "causative")).toEqual({ kanji: "食べさせる", kana: "たべさせる" });
    expect(conjugate(taberu, "causative_passive")).toEqual({
      kanji: "食べさせられる",
      kana: "たべさせられる",
    });
  });

  it("行く：扩展形态按规则变化（行ける/行こう/行け/行けば/行かれる/行かせる）", () => {
    const iku = v("行く", "いく", "godan");
    expect(conjugate(iku, "potential").kanji).toBe("行ける");
    expect(conjugate(iku, "volitional").kanji).toBe("行こう");
    expect(conjugate(iku, "imperative").kanji).toBe("行け");
    expect(conjugate(iku, "conditional").kanji).toBe("行けば");
    expect(conjugate(iku, "passive").kanji).toBe("行かれる");
    expect(conjugate(iku, "causative").kanji).toBe("行かせる");
    expect(conjugate(iku, "causative_passive").kanji).toBe("行かせられる");
  });

  it("ある：可能形是「ありえる」，而非「あれる」", () => {
    expect(conjugate(v("ある", "ある", "godan"), "potential")).toEqual({
      kanji: "ありえる",
      kana: "ありえる",
    });
  });
});

describe("错误处理与常量", () => {
  it("五段词尾无法识别时抛出错误", () => {
    expect(() => conjugate(v("x", "x", "godan"), "masu")).toThrow(/五段词尾/);
  });

  it("共 12 种形态：1 辞书形 + 11 活用形", () => {
    expect(ALL_FORMS).toHaveLength(12);
    expect(CONJUGATABLE_FORMS).toHaveLength(11);
    expect(CONJUGATABLE_FORMS).not.toContain("dictionary");
  });
});
