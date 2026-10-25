import { useEffect, useReducer, useRef, useState } from "react";
import { verbs } from "../data/verbs";
import { createQuestions, type Question } from "../quiz/quiz";
import { loadProgress, saveProgress } from "../storage/persistence";
import { getUnlockedForms } from "./mastery";
import { applySessionResult } from "./progressUpdate";
import {
  answerSession,
  continueSession,
  createIdleSession,
  getElapsedMs,
  getResult,
  resetSession,
  startSession,
  DEFAULT_QUESTION_COUNT,
  type SessionState,
} from "./session";

type Action =
  | { type: "start"; total: number; now: number }
  | { type: "answer"; isCorrect: boolean; now: number; record?: { verbId: string; form: string } }
  | { type: "continue" }
  | { type: "reset" };

function reducer(state: SessionState, action: Action): SessionState {
  switch (action.type) {
    case "start":
      return startSession(action.total, action.now);
    case "answer":
      return answerSession(state, action.isCorrect, action.now, action.record);
    case "continue":
      return continueSession(state);
    case "reset":
      return resetSession(state);
    default:
      return state;
  }
}

export interface TrainingSession {
  state: SessionState;
  /** 本回合预生成的题目（开始时固定，不随答题变化） */
  questions: Question[];
  /** 当前题（finished 时为最后一题） */
  currentQuestion: Question | null;
  /** 已用毫秒（由时间戳计算，组件按此渲染） */
  elapsedMs: number;
  start: (total?: number) => void;
  answer: (isCorrect: boolean) => void;
  next: () => void;
  restart: () => void;
  home: () => void;
}

/**
 * 训练回合 Hook。
 * 计时数据只来自 startedAt/endedAt（Date.now 时间戳）；
 * 250ms 的 interval 仅用于驱动 UI 重新读取 Date.now() 显示已用时间，
 * 不参与任何计时累加。
 */
export function useTrainingSession(): TrainingSession {
  const [state, dispatch] = useReducer(reducer, undefined, createIdleSession);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const totalRef = useRef(DEFAULT_QUESTION_COUNT);
  const savedResultAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (state.phase !== "playing") return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [state.phase]);

  // 回合结束时统一写入本次成绩（每局只写一次；「再来一局」startedAt 不同不会重复累计）
  useEffect(() => {
    if (state.phase !== "finished") return;
    const result = getResult(state);
    if (!result || savedResultAtRef.current === result.startedAt) return;
    savedResultAtRef.current = result.startedAt;
    saveProgress(applySessionResult(loadProgress(), result));
  }, [state]);

  const begin = (total: number) => {
    totalRef.current = total;
    // 全部动词可用，活用形态按批解锁（首批 ます/ない/て/た）；
    // 只从已解锁形态中出题，全组合洗牌后取前 N，回合内组合不重复
    const forms = getUnlockedForms(loadProgress());
    setQuestions(createQuestions(total, verbs, forms));
    dispatch({ type: "start", total, now: Date.now() });
  };

  const currentQuestion = questions[state.index] ?? null;

  return {
    state,
    questions,
    currentQuestion,
    elapsedMs: getElapsedMs(state, now),
    start: (total = DEFAULT_QUESTION_COUNT) => begin(total),
    answer: (isCorrect) =>
      dispatch({
        type: "answer",
        isCorrect,
        now: Date.now(),
        record: currentQuestion
          ? { verbId: currentQuestion.verb.id, form: currentQuestion.form }
          : undefined,
      }),
    next: () => dispatch({ type: "continue" }),
    restart: () => begin(totalRef.current),
    home: () => dispatch({ type: "reset" }),
  };
}
