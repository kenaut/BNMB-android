import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { conjugate, CONJUGATABLE_FORMS, FORM_LABELS, VERB_TYPE_LABELS } from "../domain/conjugate";
import { verbs } from "../data/verbs";
import type { FormId, Verb, VerbType } from "../domain/types";
import RubyText from "./RubyText";

type TypeFilter = VerbType | "all";
type LevelFilter = "all" | NonNullable<Verb["level"]>;
type FormFilter = FormId | "all";

const TYPE_OPTIONS: ReadonlyArray<{ value: TypeFilter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "godan", label: VERB_TYPE_LABELS.godan },
  { value: "ichidan", label: VERB_TYPE_LABELS.ichidan },
  { value: "suru", label: VERB_TYPE_LABELS.suru },
  { value: "kuru", label: VERB_TYPE_LABELS.kuru },
];

const LEVEL_OPTIONS: ReadonlyArray<{ value: LevelFilter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "N5", label: "N5" },
  { value: "N4", label: "N4" },
  { value: "N3", label: "N3" },
  { value: "N2", label: "N2" },
  { value: "N1", label: "N1" },
];

/** 片假名 → 平假名，让「タベル」也能搜到「たべる」 */
function toHiragana(s: string): string {
  return s.replace(/[\u30a1-\u30f6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

/** 模糊搜索：空格分隔的多个关键词须全部命中（汉字 / 假名 / 中文意思） */
function matchesQuery(v: Verb, query: string): boolean {
  const keywords = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (keywords.length === 0) return true;
  const kanji = toHiragana(v.kanji.toLowerCase());
  const kana = toHiragana(v.kana.toLowerCase());
  const meaning = v.meaning.toLowerCase();
  return keywords.every((raw) => {
    const k = toHiragana(raw.toLowerCase());
    return kanji.includes(k) || kana.includes(k) || meaning.includes(k);
  });
}

/** 动词活用一览表（参考页）：支持模糊搜索、类型/级别筛选、只看指定形态 */
export default function VerbTable() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");
  const [formFilter, setFormFilter] = useState<FormFilter>("all");

  const columns: FormId[] = formFilter === "all" ? [...CONJUGATABLE_FORMS] : [formFilter];

  const filtered = useMemo(
    () =>
      verbs.filter(
        (v) =>
          (typeFilter === "all" || v.type === typeFilter) &&
          (levelFilter === "all" || v.level === levelFilter) &&
          matchesQuery(v, query),
      ),
    [query, typeFilter, levelFilter],
  );

  const filtering =
    query.trim() !== "" || typeFilter !== "all" || levelFilter !== "all" || formFilter !== "all";
  const clearFilters = () => {
    setQuery("");
    setTypeFilter("all");
    setLevelFilter("all");
    setFormFilter("all");
  };

  return (
    <div>
      <div
        style={{
          backgroundColor: "#fff",
          border: "1px solid #d0d7de",
          borderRadius: 8,
          padding: 16,
          marginBottom: 12,
          display: "grid",
          gap: 12,
        }}
      >
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索汉字 / 假名 / 中文意思（空格分隔多个关键词）"
          aria-label="搜索动词"
          style={{
            width: "100%",
            fontSize: 16,
            padding: "8px 12px",
            border: "1px solid #d0d7de",
            borderRadius: 6,
            outline: "none",
            color: "#1f2328",
          }}
        />

        <Chips label="类型" options={TYPE_OPTIONS} value={typeFilter} onChange={setTypeFilter} />
        <Chips label="级别" options={LEVEL_OPTIONS} value={levelFilter} onChange={setLevelFilter} />

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, color: "#57606a" }}>显示形态</span>
          <select
            value={formFilter}
            onChange={(e) => setFormFilter(e.target.value as FormFilter)}
            aria-label="选择只显示的形态列"
            style={{
              fontSize: 14,
              padding: "6px 10px",
              border: "1px solid #d0d7de",
              borderRadius: 6,
              backgroundColor: "#fff",
              color: "#1f2328",
            }}
          >
            <option value="all">全部形态</option>
            {CONJUGATABLE_FORMS.map((f) => (
              <option key={f} value={f}>
                {FORM_LABELS[f]}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, color: "#57606a" }}>
            共 {filtered.length} / {verbs.length} 个动词
          </span>
          {filtering && (
            <button
              onClick={clearFilters}
              style={{
                cursor: "pointer",
                fontSize: 13,
                padding: "3px 12px",
                borderRadius: 12,
                border: "1px solid #d0d7de",
                backgroundColor: "#f6f8fa",
                color: "#57606a",
              }}
            >
              清空搜索与筛选
            </button>
          )}
        </div>
      </div>

      <div className="table-scroll">
        <table style={{ borderCollapse: "collapse", width: "100%", backgroundColor: "#fff" }}>
          <thead>
            <tr>
              <Th>辞书形</Th>
              <Th>读音</Th>
              <Th>类型</Th>
              <Th>意思</Th>
              {columns.map((f) => (
                <Th key={f}>{FORM_LABELS[f]}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={4 + columns.length}
                  style={{
                    padding: "32px 12px",
                    textAlign: "center",
                    color: "#57606a",
                    backgroundColor: "#fff",
                  }}
                >
                  没有匹配的动词，试试换个关键词或筛选条件。
                </td>
              </tr>
            ) : (
              filtered.map((v) => (
                <tr key={v.id}>
                  <Td>
                    <RubyText kanji={v.kanji} kana={v.kana} />
                  </Td>
                  <Td>{v.kana}</Td>
                  <Td>{VERB_TYPE_LABELS[v.type]}</Td>
                  <Td>{v.meaning}</Td>
                  {columns.map((f) => {
                    const c = conjugate(v, f);
                    return (
                      <Td key={f}>
                        <RubyText kanji={c.kanji} kana={c.kana} />
                      </Td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Chips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <span style={{ fontSize: 14, color: "#57606a", minWidth: 28 }}>{label}</span>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            style={chipStyle(active)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function chipStyle(active: boolean): CSSProperties {
  return {
    cursor: "pointer",
    fontSize: 14,
    padding: "5px 14px",
    borderRadius: 16,
    border: `1px solid ${active ? "#0969da" : "#d0d7de"}`,
    backgroundColor: active ? "#ddf4ff" : "#fff",
    color: active ? "#0969da" : "#1f2328",
    fontWeight: active ? 600 : 400,
  };
}

function Th({ children }: { children: ReactNode }) {
  return (
    <th style={{ borderBottom: "2px solid #ccc", textAlign: "left", padding: "6px 10px", whiteSpace: "nowrap" }}>
      {children}
    </th>
  );
}

function Td({ children }: { children: ReactNode }) {
  return <td style={{ borderBottom: "1px solid #eee", padding: "6px 10px", whiteSpace: "nowrap" }}>{children}</td>;
}
