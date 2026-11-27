import { useEffect, useRef, useState } from "react";
import { playSound } from "../audio/sound";
import { FORM_LABELS, VERB_TYPE_LABELS } from "../domain/conjugate";
import { getSpecialTags } from "../domain/special";
import type { Question } from "../quiz/quiz";
import { checkAnswer, checkChoice } from "../quiz/quiz";
import { loadProgress } from "../storage/persistence";
import { isTtsReady, loadTtsConfig } from "../tts/config";
import { playSpeech } from "../tts/speech";
import RubyText from "./RubyText";
import { useImeEnter } from "./useImeEnter";

/** 朗读喇叭图标（仅在 TTS 接入可用时显示） */
function SpeakerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 9.5v5h3.5L12.5 18V6L7.5 9.5H4z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

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
  // 做题偏好：组件挂载时读取一次（切换设置后从主页重新进入即生效）
  const [prefs] = useState(() => loadProgress().preferences);
  // TTS 朗读：只有连接测试通过的配置才显示播放按钮、自动朗读
  const [tts] = useState(() => loadTtsConfig());
  const ttsReady = isTtsReady(tts);
  const [speakError, setSpeakError] = useState(false);
  const autoSpokenRef = useRef(false);
  const answerSpokenRef = useRef(false);
  const continueRef = useRef<HTMLButtonElement>(null);
  const isChoice = question.kind === "choice";
  const isReverse = question.direction === "reverse";
  /** 目标形态标签：逆向题的目标是辞书形 */
  const targetLabel = isReverse ? FORM_LABELS.dictionary : FORM_LABELS[question.form];
  /** 特例标签（行く / ある 等），受「做题偏好」开关控制 */
  const specialTags = prefs.showSpecialTag ? getSpecialTags(question.verb) : [];

  /** 判分反馈音（音量取当前设置，答题时读取以即时生效） */
  const playFeedback = (ok: boolean) => {
    playSound(ok ? "correct" : "wrong", loadProgress().soundVolume);
  };

  /** 手动朗读题面；失败时给出提示（自动朗读失败则静默） */
  const speakGiven = () => {
    if (!ttsReady || !tts) return;
    setSpeakError(false);
    void playSpeech(question.given.kana, tts).catch(() => setSpeakError(true));
  };

  const check = () => {
    if (result !== null || input.trim() === "") return;
    const ok = checkAnswer(input, question.answer);
    setResult(ok);
    playFeedback(ok);
    onAnswered?.(ok);
  };

  /** 选择题：点选项立即判分 */
  const choose = (index: number) => {
    if (result !== null || !question.options) return;
    const ok = checkChoice(question.options[index], question.answer);
    setSelected(index);
    setResult(ok);
    playFeedback(ok);
    onAnswered?.(ok);
  };

  const ime = useImeEnter(() => (result === null ? check() : onContinue()));

  // 自动朗读题面（每题一次；被浏览器自动播放策略拦截时静默忽略）
  useEffect(() => {
    if (!ttsReady || !tts || autoSpokenRef.current) return;
    autoSpokenRef.current = true;
    void playSpeech(question.given.kana, tts).catch(() => {});
    // 只在挂载时触发一次：QuestionCard 每题都会重新挂载
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 答对后朗读一遍正确答案
  useEffect(() => {
    if (result !== true || !ttsReady || !tts || answerSpokenRef.current) return;
    answerSpokenRef.current = true;
    void playSpeech(question.answer.kana, tts).catch(() => {});
  }, [result, ttsReady, tts, question.answer.kana]);

  // 选择题判分后聚焦「下一题」，按 Enter 即可继续（无 IME 干扰）
  useEffect(() => {
    if (isChoice && result !== null) continueRef.current?.focus();
  }, [isChoice, result]);

  return (
    <section
      className="fade-slide-in"
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: 24,
      }}
    >
      {prefs.showFormLabel && (
        <span
          style={{
            display: "inline-block",
            backgroundColor: isReverse ? "var(--warning-bg)" : "var(--accent-bg)",
            color: isReverse ? "var(--warning-text)" : "var(--accent)",
            borderRadius: 12,
            padding: "2px 12px",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {targetLabel}
        </span>
      )}
      {prefs.showFormLabel && isReverse && (
        <span
          style={{
            display: "inline-block",
            marginLeft: 8,
            backgroundColor: "var(--surface-subtle)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "2px 12px",
            fontSize: 14,
          }}
        >
          给出：{FORM_LABELS[question.form]}
        </span>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "16px 0 4px" }}>
        <h2 style={{ margin: 0, fontSize: 40 }}>
          <RubyText
            kanji={question.given.kanji}
            kana={question.given.kana}
            showReading={prefs.showFurigana}
          />
        </h2>
        {ttsReady && (
          <button
            onClick={speakGiven}
            aria-label="朗读题目"
            title="朗读题目"
            style={{
              border: "none",
              background: "none",
              color: "var(--accent)",
              cursor: "pointer",
              padding: 4,
              lineHeight: 0,
              borderRadius: 6,
            }}
          >
            <SpeakerIcon />
          </button>
        )}
      </div>
      {speakError && (
        <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--danger)" }}>
          朗读失败，请在「设置 - AI 接入 - 朗读」中检查接口。
        </p>
      )}
      <p style={{ margin: "0 0 16px", color: "var(--text-secondary)" }}>
        {question.verb.meaning}
        {prefs.showVerbType && ` · ${VERB_TYPE_LABELS[question.verb.type]}`}
        {specialTags.map((tag) => (
          <span
            key={tag}
            style={{
              marginLeft: 8,
              display: "inline-block",
              backgroundColor: "var(--warning-bg)",
              color: "var(--warning-text)",
              border: "1px solid var(--warning)",
              borderRadius: 10,
              padding: "1px 8px",
              fontSize: 12,
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            {tag}
          </span>
        ))}
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
            let bg = "var(--surface)";
            let border = "var(--border)";
            if (judged && isAnswer) {
              bg = "var(--success-bg)";
              border = "var(--success-border)";
            } else if (judged && i === selected) {
              bg = "var(--danger-bg)";
              border = "var(--danger)";
            } else if (judged) {
              bg = "var(--surface-subtle)";
            }
            return (
              <button
                key={`${opt.kanji}-${opt.kana}`}
                onClick={() => choose(i)}
                disabled={judged}
                className={
                  judged
                    ? isAnswer
                      ? "judged-correct"
                      : i === selected
                        ? "judged-wrong"
                        : undefined
                    : undefined
                }
                style={{
                  fontSize: 22,
                  padding: "12px 8px",
                  backgroundColor: bg,
                  border: `2px solid ${border}`,
                  borderRadius: 8,
                  cursor: judged ? "default" : "pointer",
                  color: "var(--text)",
                  opacity: judged && !isAnswer && i !== selected ? 0.55 : 1,
                }}
              >
                <RubyText kanji={opt.kanji} kana={opt.kana} showReading={prefs.showFurigana} />
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
            border: "1px solid var(--border)",
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
          className="feedback-in"
          style={{
            marginTop: 16,
            marginBottom: 0,
            padding: "10px 14px",
            borderRadius: 6,
            fontSize: 16,
            ...(result
              ? { backgroundColor: "var(--success-bg)", color: "var(--success)", border: "1px solid var(--success-border)" }
              : { backgroundColor: "var(--danger-bg)", color: "var(--danger)", border: "1px solid var(--danger)" }),
          }}
        >
          {result ? (
            "回答正确！"
          ) : (
            <>
              正确答案：
              <b>
                <RubyText
                  kanji={question.answer.kanji}
                  kana={question.answer.kana}
                  showReading={prefs.showFurigana}
                />
              </b>
            </>
          )}
        </p>
      )}
    </section>
  );
}
