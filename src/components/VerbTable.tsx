import type { ReactNode } from "react";
import { conjugate, CONJUGATABLE_FORMS, FORM_LABELS, VERB_TYPE_LABELS } from "../domain/conjugate";
import { verbs } from "../data/verbs";
import RubyText from "./RubyText";

/** 动词活用一览表（参考页） */
export default function VerbTable() {
  return (
    <table style={{ borderCollapse: "collapse", width: "100%", backgroundColor: "#fff" }}>
      <thead>
        <tr>
          <Th>辞书形</Th>
          <Th>读音</Th>
          <Th>类型</Th>
          <Th>意思</Th>
          {CONJUGATABLE_FORMS.map((f) => (
            <Th key={f}>{FORM_LABELS[f]}</Th>
          ))}
        </tr>
      </thead>
      <tbody>
        {verbs.map((v) => (
          <tr key={v.id}>
            <Td>
              <RubyText kanji={v.kanji} kana={v.kana} />
            </Td>
            <Td>{v.kana}</Td>
            <Td>{VERB_TYPE_LABELS[v.type]}</Td>
            <Td>{v.meaning}</Td>
            {CONJUGATABLE_FORMS.map((f) => {
              const c = conjugate(v, f);
              return (
                <Td key={f}>
                  <RubyText kanji={c.kanji} kana={c.kana} />
                </Td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
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
  return <td style={{ borderBottom: "1px solid #eee", padding: "6px 10px", whiteSpace: "nowrap" }}>{children}</td>;
}
