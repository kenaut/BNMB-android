import raw from "./verbs.json";
import n5 from "./verbs/n5.json";
import type { Verb, VerbBank } from "../domain/types";

const bank = raw as VerbBank;

/** 全部动词：基础词库 + JLPT N5 扩展词库 */
export const verbs: Verb[] = [...bank.verbs, ...(n5 as Verb[])];

export const verbBankMeta = bank.meta;
