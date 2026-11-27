import { useState } from "react";
import type { ConjugatableFormId } from "../domain/conjugate";
import type { VerbLevel } from "../domain/types";
import { filterVerbsByLevels } from "../data/verbs";
import { createQuestion, type Question } from "../quiz/quiz";
import { loadProgress } from "../storage/persistence";
import { resolveQuestionForms } from "../training/mastery";
import QuestionCard from "./QuestionCard";

interface QuizProps {
  /** 自选变形范围（空/不传 = 按练习模式默认范围） */
  forms?: ConjugatableFormId[];
  /** 单词等级范围（空/不传 = 全部级别） */
  levels?: readonly VerbLevel[];
  onBack?: () => void;
}

/** 自由练习：指定等级与形态范围的词库 + 混合题型与方向 */
function nextQuestion(
  forms?: ConjugatableFormId[],
  levels?: readonly VerbLevel[],
): Question {
  // 自选形态需与当前模式的可用范围取交集：闯关模式下不会逆向考未解锁形态
  const scope = resolveQuestionForms(loadProgress(), forms);
  return createQuestion(
    filterVerbsByLevels(levels),
    scope,
    Math.random,
    Math.random() < 0.5 ? "choice" : "input",
    Math.random() < 0.5 ? "reverse" : "forward",
  );
}

/** 自由练习（不计分、不限题数）：原有功能，改为复用 QuestionCard */
export default function Quiz({ forms, levels, onBack }: QuizProps) {
  const [question, setQuestion] = useState<Question>(() => nextQuestion(forms, levels));

  return (
    <div>
      {onBack && (
        <button
          onClick={onBack}
          style={{
            marginBottom: 12,
            border: "none",
            background: "none",
            color: "var(--accent)",
            cursor: "pointer",
            fontSize: 14,
            padding: 0,
          }}
        >
          ← 返回首页
        </button>
      )}
      <QuestionCard
        key={`${question.verb.id}-${question.form}-${question.direction}-${question.kind}`}
        question={question}
        onContinue={() => setQuestion(nextQuestion(forms, levels))}
      />
    </div>
  );
}
