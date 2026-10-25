import type { CSSProperties, ReactNode } from "react";
import type { FormId, Verb, VerbType } from "../domain/types";
import { ALL_FORMS, conjugate, FORM_LABELS, VERB_TYPE_LABELS } from "../domain/conjugate";
import { verbs } from "../data/verbs";
import RubyText from "./RubyText";

const card: CSSProperties = {
  backgroundColor: "#fff",
  border: "1px solid #d0d7de",
  borderRadius: 8,
  padding: "16px 20px",
};

const muted: CSSProperties = { color: "#57606a" };

/** 四类动词的固定展示顺序（五段 → 一段 → サ变 → カ变） */
const TYPE_ORDER: VerbType[] = ["godan", "ichidan", "suru", "kuru"];

/** 教程演示动词：直接取自词库，示例永远与活用引擎输出一致 */
function pickVerb(id: string): Verb {
  const v = verbs.find((x) => x.id === id);
  if (!v) throw new Error(`教程演示动词缺失: ${id}`);
  return v;
}

const DEMO: Record<VerbType, Verb> = {
  godan: pickVerb("kaku"), // 書く
  ichidan: pickVerb("taberu"), // 食べる
  suru: pickVerb("suru"),
  kuru: pickVerb("kuru"),
};

interface FormRuleDoc {
  rule: string;
  note?: string;
}

interface FormDoc {
  form: FormId;
  usage: string;
  rules: Record<VerbType, FormRuleDoc>;
}

/** 各活用形的教程文案（示例通过 conjugate 实时计算，保证正确） */
const FORM_DOCS: FormDoc[] = [
  {
    form: "dictionary",
    usage: "动词的原形，词典与教材中的标准形式；简体口语、从句中也直接使用。",
    rules: {
      godan: { rule: "动词本身，无需变化" },
      ichidan: { rule: "动词本身，无需变化" },
      suru: { rule: "动词本身，无需变化" },
      kuru: { rule: "动词本身，无需变化" },
    },
  },
  {
    form: "masu",
    usage: "礼貌体（敬体）。对长辈、不熟的人、正式场合使用，是初学者最先掌握的形态。",
    rules: {
      godan: { rule: "词尾变成 い段假名 + ます" },
      ichidan: { rule: "去掉词尾 る + ます" },
      suru: { rule: "する → します" },
      kuru: { rule: "来る → 来ます", note: "读音是 きます" },
    },
  },
  {
    form: "nai",
    usage: "否定形，相当于「不～」。",
    rules: {
      godan: { rule: "词尾变成 あ段假名 + ない", note: "わ行动词（買う）词尾是「わ」：買わない" },
      ichidan: { rule: "去掉词尾 る + ない" },
      suru: { rule: "する → しない" },
      kuru: { rule: "来る → 来ない", note: "读音是 こない" },
    },
  },
  {
    form: "te",
    usage: "接续形。请求（～てください）、正在进行（～ている）、动作先后（～てから）都靠它连接。",
    rules: {
      godan: {
        rule: "词尾发生音便 + て",
        note: "く/ぐ→いて/いで、う/つ/る→って、む/ぶ/ぬ→んで、す→して",
      },
      ichidan: { rule: "る → て" },
      suru: { rule: "する → して" },
      kuru: { rule: "来る → 来て", note: "读音是 きて" },
    },
  },
  {
    form: "ta",
    usage: "过去/完成形，表示已发生的动作。变化规则与て形完全相同（て→た、で→だ）。",
    rules: {
      godan: { rule: "音便 + た", note: "音便规则同て形" },
      ichidan: { rule: "る → た" },
      suru: { rule: "する → した" },
      kuru: { rule: "来る → 来た", note: "读音是 きた" },
    },
  },
  {
    form: "potential",
    usage: "可能形，表示能力「会～、能～」。",
    rules: {
      godan: { rule: "词尾变成 え段假名 + る" },
      ichidan: { rule: "る → られる", note: "与受身形同形，靠语境区分" },
      suru: { rule: "する → できる", note: "サ变可能形只能用「できる」" },
      kuru: { rule: "来る → 来られる", note: "读音是 こられる" },
    },
  },
  {
    form: "volitional",
    usage: "意向形，表意志「～吧！」，或与 と思う／とする 搭配表示「打算～」。",
    rules: {
      godan: { rule: "词尾变成 お段假名 + う" },
      ichidan: { rule: "る → よう" },
      suru: { rule: "する → しよう" },
      kuru: { rule: "来る → 来よう", note: "读音是 こよう" },
    },
  },
  {
    form: "imperative",
    usage: "命令形，语气强硬的命令，多见于口号、体育指导、紧急警告。",
    rules: {
      godan: { rule: "词尾变成 え段假名" },
      ichidan: { rule: "る → ろ" },
      suru: { rule: "する → しろ" },
      kuru: { rule: "来る → 来い", note: "读音是 こい" },
    },
  },
  {
    form: "conditional",
    usage: "条件形（ば形），「如果～的话（就）～」。",
    rules: {
      godan: { rule: "词尾变成 え段假名 + ば" },
      ichidan: { rule: "る → れば" },
      suru: { rule: "する → すれば" },
      kuru: { rule: "来る → 来れば", note: "读音是 くれば" },
    },
  },
  {
    form: "passive",
    usage: "受身形，表被动「被～、受到～」。",
    rules: {
      godan: { rule: "词尾变成 あ段假名 + れる", note: "わ行动词：買われる" },
      ichidan: { rule: "る → られる" },
      suru: { rule: "する → される" },
      kuru: { rule: "来る → 来られる", note: "读音是 こられる" },
    },
  },
  {
    form: "causative",
    usage: "使役形，表示「让／使（别人）做～」。",
    rules: {
      godan: { rule: "词尾变成 あ段假名 + せる" },
      ichidan: { rule: "る → させる" },
      suru: { rule: "する → させる" },
      kuru: { rule: "来る → 来させる", note: "读音是 こさせる" },
    },
  },
  {
    form: "causative_passive",
    usage: "使役受身形，「被迫做～」「不得不～」，在使役形上再叠加被动。",
    rules: {
      godan: { rule: "词尾变成 あ段假名 + せられる" },
      ichidan: { rule: "る → させられる" },
      suru: { rule: "する → させられる" },
      kuru: { rule: "来る → 来させられる", note: "读音是 こさせられる" },
    },
  },
];

/** 三分类介绍（例词全部取自词库） */
const CLASS_DOCS: {
  type: VerbType;
  title: string;
  desc: string;
  examples: { kanji: string; kana: string }[];
  warn?: string;
}[] = [
  {
    type: "godan",
    title: "一类动词（五段动词）",
    desc: "辞书形词尾在 う 段。活用时词尾在 あ・い・う・え・お 五段之间变化，因此得名「五段」。て形／た形有音便，变化最复杂。",
    examples: [
      { kanji: "書く", kana: "かく" },
      { kanji: "飲む", kana: "のむ" },
      { kanji: "話す", kana: "はなす" },
      { kanji: "買う", kana: "かう" },
    ],
    warn: "帰る・走る・切る・知る・要る 等长得像二类，实际是一类（五段），需要逐个记忆。",
  },
  {
    type: "ichidan",
    title: "二类动词（一段动词）",
    desc: "词尾「る」前是 い段或 え段假名。活用时只去掉 る、词干始终不变，因此得名「一段」。变形最简单。",
    examples: [
      { kanji: "食べる", kana: "たべる" },
      { kanji: "見る", kana: "みる" },
      { kanji: "起きる", kana: "おきる" },
    ],
  },
  {
    type: "suru",
    title: "三类动词（サ变动词）",
    desc: "「する」及「名词 + する」型复合动词。可能形特殊：只能用「できる」。",
    examples: [
      { kanji: "する", kana: "する" },
      { kanji: "勉強する", kana: "べんきょうする" },
    ],
  },
  {
    type: "kuru",
    title: "三类动词（カ变动词）",
    desc: "「来る」是日语中唯一的カ变动词。汉字读音随形态变化（来ます＝きます、来ない＝こない），必须单独记忆。",
    examples: [{ kanji: "来る", kana: "くる" }],
  },
];

/** 学习页：动词三分类 + 全部活用形教程 */
export default function LearnScreen() {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={card}>
        <h2 style={{ marginTop: 0 }}>动词三分类</h2>
        <p style={muted}>日语动词按活用规则分为三类。分类决定变形规则，做题前先学会判断类别。</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 12 }}>
          {CLASS_DOCS.map((c) => (
            <div key={c.type} style={{ border: "1px solid #eaeef2", borderRadius: 6, padding: "12px 16px" }}>
              <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 16 }}>{c.title}</h3>
              <p style={{ ...muted, fontSize: 14, margin: "0 0 8px" }}>{c.desc}</p>
              <p style={{ fontSize: 15, margin: "0 0 4px" }}>
                例词：
                {c.examples.map((e, i) => (
                  <span key={e.kanji} style={{ marginRight: i === c.examples.length - 1 ? 0 : 10 }}>
                    <RubyText kanji={e.kanji} kana={e.kana} />
                  </span>
                ))}
              </p>
              {c.warn && <p style={{ fontSize: 13, color: "#9a6700", margin: 0 }}>注意：{c.warn}</p>}
            </div>
          ))}
        </div>
        <h3 style={{ fontSize: 16 }}>判别流程</h3>
        <ol style={{ margin: 0, paddingLeft: 24, lineHeight: 1.9 }}>
          <li>以「する」结尾 → <strong>サ变</strong>（三类）。</li>
          <li>是「来る」→ <strong>カ变</strong>（三类）。</li>
          <li>词尾不是「る」→ 一定是 <strong>五段</strong>（一类）。</li>
          <li>词尾是「る」，且 る 前是 あ／う／お 段假名 → 一定是 <strong>五段</strong>（一类）。</li>
          <li>
            词尾是「る」，且 る 前是 い／え 段假名 → 大概率是 <strong>一段</strong>（二类），
            但存在 帰る・走る・切る 等五段例外，需逐个记忆。
          </li>
        </ol>
      </section>

      <section style={card}>
        <h2 style={{ marginTop: 0 }}>活用速查表</h2>
        <p style={muted}>
          四类代表动词在全部 {ALL_FORMS.length} 种形态下的变化，示例由应用内的活用引擎实时计算。
        </p>
        <div className="table-scroll">
          <table style={{ borderCollapse: "collapse", width: "100%", backgroundColor: "#fff" }}>
            <thead>
              <tr>
                <Th>形态</Th>
                {TYPE_ORDER.map((t) => (
                  <Th key={t}>
                    {VERB_TYPE_LABELS[t]}
                    <RubyText kanji={DEMO[t].kanji} kana={DEMO[t].kana} />
                  </Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_FORMS.map((f) => (
                <tr key={f}>
                  <Td>
                    <strong>{FORM_LABELS[f]}</strong>
                  </Td>
                  {TYPE_ORDER.map((t) => {
                    const c = conjugate(DEMO[t], f);
                    return (
                      <Td key={t}>
                        <RubyText kanji={c.kanji} kana={c.kana} />
                      </Td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={card}>
        <h2 style={{ marginTop: 0 }}>各形态详解</h2>
        <p style={muted}>括号内为演示动词的变形结果：五段＝書く、一段＝食べる、サ变＝する、カ变＝来る。</p>
        <div style={{ display: "grid", gap: 12 }}>
          {FORM_DOCS.map((doc) => (
            <article key={doc.form} style={{ border: "1px solid #eaeef2", borderRadius: 6, padding: "12px 16px" }}>
              <h3 style={{ margin: "0 0 4px", fontSize: 16 }}>{FORM_LABELS[doc.form]}</h3>
              <p style={{ ...muted, fontSize: 14, margin: "0 0 8px" }}>{doc.usage}</p>
              <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.9 }}>
                {TYPE_ORDER.map((t) => {
                  const r = doc.rules[t];
                  const c = conjugate(DEMO[t], doc.form);
                  return (
                    <li key={t} style={{ fontSize: 14 }}>
                      <strong>{VERB_TYPE_LABELS[t]}</strong>：{r.rule}（
                      <RubyText kanji={c.kanji} kana={c.kana} />
                      ）
                      {r.note && <span style={{ color: "#9a6700" }}>　※ {r.note}</span>}
                    </li>
                  );
                })}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section style={card}>
        <h2 style={{ marginTop: 0 }}>特殊变化</h2>
        <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.9 }}>
          <li>行く：て形／た形是「行って／行った」，而不是音便规则的「行いて／行いた」。</li>
          <li>ある：否定形是「ない」（没有 あらない）；可能形是「ありえる」。</li>
          <li>サ变动词的可能形是「できる」：勉強する → 勉強できる。</li>
          <li>二类动词的「られる」一形多用：可能（食べられる＝能吃）、受身（＝被吃）、尊敬，靠语境区分。</li>
          <li>来る 的读音随形态变化：来ます（きます）、来ない（こない）、来て（きて）。</li>
        </ul>
      </section>
    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  return (
    <th style={{ borderBottom: "2px solid #ccc", textAlign: "left", padding: "6px 10px", whiteSpace: "nowrap" }}>
      {children}
    </th>
  );
}

function Td({ children }: { children: ReactNode }) {
  return (
    <td style={{ borderBottom: "1px solid #eee", padding: "6px 10px", whiteSpace: "nowrap" }}>{children}</td>
  );
}
