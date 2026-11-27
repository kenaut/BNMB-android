import type { Verb } from "./types";

/**
 * 特例标签：类型规则之外、学习者容易答错的个别动词。
 * 键为动词的假名表记（活用引擎的 exceptions 表同样按 kana 匹配），
 * 与数据层的 id 解耦，复合词等新增条目不会误标。
 */
const SPECIAL_TAGS: Record<string, readonly string[]> = {
  いく: ["促音便例外（て・た）"],
  ある: ["否定特殊（ない）", "可能形特殊（ありえる）"],
};

/** 取动词的特例标签；普通动词返回空数组 */
export function getSpecialTags(verb: Verb): readonly string[] {
  return SPECIAL_TAGS[verb.kana] ?? [];
}
