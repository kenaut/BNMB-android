import raw from "./verbs.json";
import type { Verb, VerbBank } from "../domain/types";

const bank = raw as VerbBank;

/** 全部动词（含基础词库与 JLPT 各级别扩展词库） */
export const verbs: Verb[] = bank.verbs;

export const verbBankMeta = bank.meta;
