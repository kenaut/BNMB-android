import type { ConjugatedForm } from "./types";

/**
 * 振假名片段：
 * - 纯文本片段（送り仮名、助词、纯假名词）不注音
 * - 汉字片段（可含多个汉字，如「勉強」）整体标注读音，避免逐字强切
 */
export interface FuriganaSegment {
  text: string;
  reading?: string;
}

/** 汉字（含 CJK 扩展 A 与叠字符号々）的前导连续段 */
const LEADING_KANJI = /^([\u3400-\u4dbf\u4e00-\u9fff々]+)([\s\S]*)$/;

/** 单个汉字 */
const KANJI_CHAR = /[\u3400-\u4dbf\u4e00-\u9fff々]/;

/**
 * 复合动词逐字注音表。
 *
 * 「受け取る」「思い出す」这类「汉字＋送り仮名＋汉字」结构的词无法用
 * 前导汉字规则对齐，需要按字补齐读音。键为该词汉字的**出现序列**
 * （如 受け取る →「受取」，其活用形 受け取った 序列相同，可复用），
 * 值为每个汉字各自的读音（同一汉字在不同词中读音可能不同，如 出す 的「出」读 だ）。
 * 活用后的送り仮名部分按原样逐字对齐，对不上即抛错，由全库测试守护。
 */
const COMPOUND_READINGS: Record<string, Record<string, string>> = {
  受取: { 受: "う", 取: "と" },
  受付: { 受: "う", 付: "つ" },
  落着: { 落: "お", 着: "つ" },
  落込: { 落: "お", 込: "こ" },
  思出: { 思: "おも", 出: "だ" },
  思付: { 思: "おも", 付: "つ" },
  思込: { 思: "おも", 込: "こ" },
  押付: { 押: "お", 付: "つ" },
  追越: { 追: "お", 越: "こ" },
  噛合: { 噛: "か", 合: "あ" },
  繰返: { 繰: "く", 返: "かえ" },
  差出: { 差: "さ", 出: "だ" },
  差引: { 差: "さ", 引: "ひ" },
  飛出: { 飛: "と", 出: "だ" },
  飛込: { 飛: "と", 込: "こ" },
  飛立: { 飛: "と", 立: "た" },
  取消: { 取: "と", 消: "け" },
  取出: { 取: "と", 出: "だ" },
  取入: { 取: "と", 入: "い" },
  取替: { 取: "と", 替: "か" },
  取組: { 取: "と", 組: "く" },
  通過: { 通: "とお", 過: "す" },
  溶込: { 溶: "と", 込: "こ" },
};

/** 取形态中的汉字序列，如「思い出される」→「思出」 */
function kanjiSeq(kanji: string): string {
  return [...kanji].filter((c) => KANJI_CHAR.test(c)).join("");
}

/** 复合动词：汉字逐字按表注音，送り仮名逐字原样对齐 */
function alignWithReadings(
  kanji: string,
  kana: string,
  readings: Record<string, string>,
): FuriganaSegment[] {
  const segments: FuriganaSegment[] = [];
  let j = 0;
  for (const ch of kanji) {
    if (KANJI_CHAR.test(ch)) {
      const r = readings[ch];
      if (r === undefined || !kana.startsWith(r, j)) {
        throw new Error(
          `复合动词注音失败：「${kanji}」的「${ch}」在读音「${kana}」第 ${j} 字处无法对齐`,
        );
      }
      segments.push({ text: ch, reading: r });
      j += r.length;
    } else {
      if (ch !== kana[j]) {
        throw new Error(
          `复合动词注音失败：「${kanji}」的送り仮名「${ch}」与读音「${kana}」第 ${j} 字不一致`,
        );
      }
      const last = segments[segments.length - 1];
      if (last && last.reading === undefined) last.text += ch;
      else segments.push({ text: ch });
      j += 1;
    }
  }
  if (j !== kana.length) {
    throw new Error(`复合动词注音失败：「${kanji}」对齐后读音有剩余「${kana.slice(j)}」`);
  }
  return segments;
}

/**
 * 由「汉字表记 + 假名表记」推导振假名分段。
 *
 * 原理：日语动词的汉字集中在词头，其后的送り仮名与假名表记的尾部完全相同。
 * 例如 食べます/たべます → 汉字段「食」读「た」，尾部「べます」为纯文本。
 * 对 行った/いった、勉強します/べんきょうします、来ない/こない 等同样成立。
 *
 * 注意：「引っ越す」这类汉字夹假名的词无法自动对齐，会直接抛错，
 * 应在数据层补充手工注音（第一阶段词库不含此类词，并有全库测试守护）。
 */
export function toFurigana(kanji: string, kana: string): FuriganaSegment[] {
  // 无汉字（する、ある 等）：整段纯假名，不注音
  if (kanji === kana) return [{ text: kanji }];

  // 复合动词：查逐字读音表
  const readings = COMPOUND_READINGS[kanjiSeq(kanji)];
  if (readings) return alignWithReadings(kanji, kana, readings);

  const match = LEADING_KANJI.exec(kanji);
  if (!match) return [{ text: kanji }];

  const [, head, tail] = match;
  if (!kana.endsWith(tail)) {
    throw new Error(
      `无法对齐振假名：「${kanji}」的送り仮名「${tail}」与读音「${kana}」不匹配，需要手工注音`,
    );
  }
  const reading = kana.slice(0, kana.length - tail.length);

  const segments: FuriganaSegment[] = [{ text: head, reading }];
  if (tail) segments.push({ text: tail });
  return segments;
}

/** 便捷重载：直接接收活用结果 */
export function formToFurigana(form: ConjugatedForm): FuriganaSegment[] {
  return toFurigana(form.kanji, form.kana);
}
