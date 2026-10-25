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
