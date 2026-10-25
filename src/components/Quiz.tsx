import { useState } from "react";
import { verbs } from "../data/verbs";
import { createQuestion, type Question } from "../quiz/quiz";
import { loadProgress } from "../storage/persistence";
import { getUnlockedForms } from "../training/mastery";
import QuestionCard from "./QuestionCard";

/** 自由练习：全部动词 + 已解锁形态，混合题型与方向 */
function nextQuestion(): Question {
  return createQuestion(
    verbs,
    getUnlockedForms(loadProgress()),
    Math.random,
    Math.random() < 0.5 ? "choice" : "input",
    Math.random() < 0.5 ? "reverse" : "forward",
  );
}

/** 自由练习（不计分、不限题数）：原有功能，改为复用 QuestionCard */
export default function Quiz({ onBack }: { onBack?: () => void }) {
  const [question, setQuestion] = useState<Question>(() => nextQuestion());

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
        onContinue={() => setQuestion(nextQuestion())}
      />
    </div>
  );
}
