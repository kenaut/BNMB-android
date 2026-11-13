import { useState } from "react";
import type { ConjugatableFormId } from "../domain/conjugate";
import { verbs } from "../data/verbs";
import { createQuestion, type Question } from "../quiz/quiz";
import { loadProgress } from "../storage/persistence";
import { getAvailableForms } from "../training/mastery";
import QuestionCard from "./QuestionCard";

interface QuizProps {
  /** 自选变形范围（空/不传 = 按练习模式默认范围） */
  forms?: ConjugatableFormId[];
  onBack?: () => void;
}

/** 自由练习：全部动词 + 指定形态范围，混合题型与方向 */
function nextQuestion(forms?: ConjugatableFormId[]): Question {
  const scope = forms && forms.length > 0 ? forms : getAvailableForms(loadProgress());
  return createQuestion(
    verbs,
    scope,
    Math.random,
    Math.random() < 0.5 ? "choice" : "input",
    Math.random() < 0.5 ? "reverse" : "forward",
  );
}

/** 自由练习（不计分、不限题数）：原有功能，改为复用 QuestionCard */
export default function Quiz({ forms, onBack }: QuizProps) {
  const [question, setQuestion] = useState<Question>(() => nextQuestion(forms));

  return (
    <div>
      {onBack && (
        <button
          onClick={onBack}
          style={{
            marginBottom: 12,
            border: "none",
            background: "none",
            color: "#0969da",
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
        onContinue={() => setQuestion(nextQuestion(forms))}
      />
    </div>
  );
}
