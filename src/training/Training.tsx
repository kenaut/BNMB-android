import { useState } from "react";
import type { ConjugatableFormId } from "../domain/conjugate";
import HomeScreen from "../components/HomeScreen";
import ProfileCard from "../components/ProfileCard";
import Quiz from "../components/Quiz";
import ResultScreen from "../components/ResultScreen";
import StatsScreen from "../components/StatsScreen";
import TrainingScreen from "../components/TrainingScreen";
import { getResult } from "./session";
import { useTrainingSession } from "./useTrainingSession";

/**
 * 训练模块容器：idle（首页/自由练习）→ playing（训练回合）→ finished（结果页）。
 * 以后接入连击 / XP / 每日任务时，在本层订阅 useTrainingSession 即可。
 */
export default function Training() {
  const session = useTrainingSession();
  // 自由练习的形态范围：null = 关闭；[] = 按练习模式默认；数组 = 自选变形
  const [quizForms, setQuizForms] = useState<ConjugatableFormId[] | null>(null);

  if (quizForms !== null) {
    return <Quiz forms={quizForms} onBack={() => setQuizForms(null)} />;
  }

  switch (session.state.phase) {
    case "playing":
      return session.currentQuestion ? (
        <TrainingScreen
          state={session.state}
          question={session.currentQuestion}
          elapsedMs={session.elapsedMs}
          onAnswered={session.answer}
          onContinue={session.next}
          onQuit={session.home}
        />
      ) : null;
    case "finished": {
      const result = getResult(session.state);
      return result ? (
        <ResultScreen result={result} onRestart={session.restart} onHome={session.home} />
      ) : null;
    }
    case "idle":
    default:
      // 主页 = 训练入口 + 学习进度（完成回合返回时 StatsScreen 重新挂载并载入最新历史）
      return (
        <div style={{ display: "grid", gap: 16 }}>
          <ProfileCard />
          <HomeScreen
            total={session.state.total}
            onStart={() => session.start()}
            onFreePractice={() => setQuizForms([])}
            onCustomStart={(forms) => session.start(session.state.total, forms)}
            onCustomPractice={(forms) => setQuizForms(forms)}
          />
          <StatsScreen />
        </div>
      );
  }
}
