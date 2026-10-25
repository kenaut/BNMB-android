import { useEffect, useRef, useState } from "react";
import { FORM_LABELS, VERB_TYPE_LABELS } from "../domain/conjugate";
import type { Question } from "../quiz/quiz";
import { checkAnswer, checkChoice } from "../quiz/quiz";
import RubyText from "./RubyText";
import { useImeEnter } from "./useImeEnter";

interface QuestionCardProps {
  question: Question;
  /** 判分瞬间回调（每题恰好一次） */
  onAnswered?: (isCorrect: boolean) => void;
  /** 看完反馈后点按钮 / 按回车继续 */
  onContinue: () => void;
  /** 继续按钮文案（训练中最后一题传「查看结果」） */
  continueLabel?: string;
}

/** 单个题目的作答卡片：输入 → 即时判分 → 继续。自由练习与训练回合共用。 */
export default function QuestionCard({
  question,
  onAnswered,
  onContinue,
  continueLabel = "下一题",
}: QuestionCardProps) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<boolean | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const continueRef = useRef<HTMLButtonElement>(null);
  const isChoice = question.kind === "choice";
  const isReverse = question.direction === "reverse";
  /** 目标形态标签：逆向题的目标是辞书形 */
  const targetLabel = isReverse ? FORM_LABELS.dictionary : FORM_LABELS[question.form];

  const check = () => {
    if (result !== null || input.trim() === "") return;
    const ok = checkAnswer(input, question.answer);
    setResult(ok);
    onAnswered?.(ok);
  };

  /** 选择题：点选项立即判分 */
  const choose = (index: number) => {
    if (result !== null || !question.options) return;
    const ok = checkChoice(question.options[index], question.answer);
    setSelected(index);
    setResult(ok);
    onAnswered?.(ok);
  };

  const ime = useImeEnter(() => (result === null ? check() : onContinue()));

  // 选择题判分后聚焦「下一题」，按 Enter 即可继续（无 IME 干扰）
  useEffect(() => {
    if (isChoice && result !== null) continueRef.current?.focus();
  }, [isChoice, result]);

  return (
    <section
      style={{
        backgroundColor: "#fff",
        border: "1px solid #d0d7de",
        borderRadius: 8,
        padding: 24,
      }}
    >
      <span
        style={{
          display: "inline-block",
          backgroundColor: isReverse ? "#fff8c5" : "#ddf4ff",
          color: isReverse ? "#9a6700" : "#0969da",
          borderRadius: 12,
          padding: "2px 12px",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        {targetLabel}
      </span>
      {isReverse && (
        <span
          style={{
            display: "inline-block",
            marginLeft: 8,
            backgroundColor: "#f6f8fa",
            color: "#57606a",
            border: "1px solid #d0d7de",
            borderRadius: 12,
            padding: "2px 12px",
            fontSize: 14,
          }}
        >
          给出：{FORM_LABELS[question.form]}
        </span>
      )}

      <h2 style={{ margin: "16px 0 4px", fontSize: 40 }}>
        <RubyText kanji={question.given.kanji} kana={question.given.kana} />
      </h2>
      <p style={{ margin: "0 0 16px", color: "#57606a" }}>
        {question.verb.meaning} · {VERB_TYPE_LABELS[question.verb.type]}
      </p>

      <p style={{ margin: "0 0 8px" }}>
        {isReverse
          ? isChoice
            ? "以上是它的活用形，请选择它的辞书形（原形）："
            : "以上是它的活用形，请写出它的辞书形（原形）："
          : isChoice
            ? `请选择它的${targetLabel}：`
            : `请写出它的${targetLabel}（汉字或假名均可）：`}
      </p>

      {isChoice && question.options ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 8,
          }}
        >
          {question.options.map((opt, i) => {
            const isAnswer =
              opt.kanji === question.answer.kanji && opt.kana === question.answer.kana;
            const judged = result !== null;
            let bg = "#fff";
            let border = "#d0d7de";
            if (judged && isAnswer) {
              bg = "#dafbe1";
              border = "#2da44e";
            } else if (judged && i === selected) {
              bg = "#ffebe9";
              border = "#cf222e";
            } else if (judged) {
              bg = "#f6f8fa";
            }
            return (
              <button
                key={`${opt.kanji}-${opt.kana}`}
                onClick={() => choose(i)}
                disabled={judged}
                style={{
                  fontSize: 22,
                  padding: "12px 8px",
                  backgroundColor: bg,
                  border: `2px solid ${border}`,
                  borderRadius: 8,
                  cursor: judged ? "default" : "pointer",
                  color: "#1f2328",
                  opacity: judged && !isAnswer && i !== selected ? 0.55 : 1,
                }}
              >
                <RubyText kanji={opt.kanji} kana={opt.kana} />
              </button>
            );
          })}
        </div>
      ) : (
        <input
          autoFocus
          value={input}
          readOnly={result !== null}
          onChange={(e) => setInput(e.target.value)}
          {...ime.compositionProps}
          onKeyDown={ime.onKeyDown}
          placeholder="例如：書いて / かいて"
          aria-label="活用形作答输入框"
          style={{
            width: "100%",
            boxSizing: "border-box",
            fontSize: 20,
            padding: "8px 12px",
            border: "1px solid #d0d7de",
            borderRadius: 6,
            outline: "none",
          }}
        />
      )}

      <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {result === null ? (
          !isChoice && (
            <button
              onClick={check}
              disabled={input.trim() === ""}
              className="btn-primary"
              style={{ minWidth: 120 }}
            >
              检查
            </button>
          )
        ) : (
          <button ref={continueRef} onClick={onContinue} className="btn-primary" style={{ minWidth: 120 }}>
            {continueLabel}
          </button>
        )}
      </div>

      {result !== null && (
        <p
          style={{
            marginTop: 16,
            marginBottom: 0,
            padding: "10px 14px",
            borderRadius: 6,
            fontSize: 16,
            ...(result
              ? { backgroundColor: "#dafbe1", color: "#1a7f37", border: "1px solid #2da44e" }
              : { backgroundColor: "#ffebe9", color: "#cf222e", border: "1px solid #cf222e" }),
          }}
        >
          {result ? (
            "回答正确！"
          ) : (
            <>
              正确答案：
              <b>
                <RubyText kanji={question.answer.kanji} kana={question.answer.kana} />
              </b>
            </>
          )}
        </p>
      )}
    </section>
  );
}
