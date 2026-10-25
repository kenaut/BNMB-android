import { getAccuracy, getCurrentNumber, type SessionState } from "../training/session";
import { formatClock } from "../training/format";
import QuestionCard from "./QuestionCard";
import type { Question } from "../quiz/quiz";

interface TrainingScreenProps {
  state: SessionState;
  question: Question;
  elapsedMs: number;
  onAnswered: (isCorrect: boolean) => void;
  onContinue: () => void;
  onQuit: () => void;
}

/** 训练中：进度 / 计时 / 正确数 + 作答题卡 */
export default function TrainingScreen({
  state,
  question,
  elapsedMs,
  onAnswered,
  onContinue,
  onQuit,
}: TrainingScreenProps) {
  const current = getCurrentNumber(state);
  // 继续按钮只在判分后出现；最后一题判分后按钮变为「查看结果」
  const isLast = state.feedback && state.answered === state.total;
  const progress = Math.min(100, (state.answered / state.total) * 100);

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 8,
        }}
      >
        <div style={{ display: "flex", gap: 16, fontSize: 15, fontWeight: 600, flexWrap: "wrap" }}>
          <span>
            第 {current} / {state.total} 题
          </span>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>⏱ {formatClock(elapsedMs)}</span>
          <span style={{ color: "#1a7f37" }}>✓ {state.correct} 题正确</span>
        </div>
        <button
          onClick={onQuit}
          style={{
            border: "none",
            background: "none",
            color: "#57606a",
            cursor: "pointer",
            fontSize: 14,
            padding: 4,
          }}
        >
          退出训练
        </button>
      </div>

      <div style={{ height: 8, backgroundColor: "#eaeef2", borderRadius: 4, overflow: "hidden", marginBottom: 16 }}>
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            backgroundColor: "#1f883d",
            transition: "width 0.2s ease",
          }}
        />
      </div>

      <QuestionCard
        key={`${state.index}-${question.verb.id}-${question.form}`}
        question={question}
        onAnswered={onAnswered}
        onContinue={onContinue}
        continueLabel={isLast ? "查看结果" : "下一题"}
      />

      <p style={{ color: "#8c959f", fontSize: 13, textAlign: "center", marginTop: 10 }}>
        正确率 {Math.round(getAccuracy(state) * 100)}%
      </p>
    </div>
  );
}
