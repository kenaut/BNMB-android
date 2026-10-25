import { useState } from "react";
import { CONJUGATABLE_FORMS, FORM_LABELS } from "../domain/conjugate";
import { verbs } from "../data/verbs";
import { loadProgress } from "../storage/persistence";
import type { UserProgress } from "../storage/progress";
import { formatClock, formatPercent } from "../training/format";
import RubyText from "./RubyText";
import DataSettings from "./DataSettings";

const verbById = new Map(verbs.map((v) => [v.id, v]));

/** 学习进度：总体统计（含连续学习）+ 分形态正确率 + 弱项动词 + 历史成绩 + 数据管理 */
export default function StatsScreen() {
  const [progress, setProgress] = useState<UserProgress>(() => loadProgress());
  const refresh = () => setProgress(loadProgress());

  const accuracy = progress.totalQuestions === 0 ? 0 : progress.correctAnswers / progress.totalQuestions;
  const bestAccuracy = progress.recentResults.reduce((m, r) => Math.max(m, r.accuracy), 0);

  const formStats = CONJUGATABLE_FORMS.map((f) => ({
    key: f as string,
    label: FORM_LABELS[f],
    ...(progress.forms[f as string] ?? { attempts: 0, correct: 0 }),
  })).filter((s) => s.attempts > 0);

  const weakVerbs = Object.entries(progress.verbs)
    .map(([key, c]) => ({ key, ...c, accuracy: c.attempts === 0 ? 0 : c.correct / c.attempts }))
    .filter((s) => s.attempts >= 2 && s.accuracy < 1)
    .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts)
    .slice(0, 5);

  if (progress.totalSessions === 0) {
    return (
      <>
        <section style={cardStyle}>
          <p style={{ color: "#57606a", textAlign: "center", margin: 0 }}>
            还没有训练记录。完成一次训练回合后，这里会显示正确率走势、弱项分析和历史成绩。
          </p>
        </section>
        <DataSettings onChanged={refresh} />
      </>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={cardStyle}>
        <h3 style={sectionTitleStyle}>总体进度</h3>
        <div style={statGridStyle}>
          <StatBox label="训练局数" value={String(progress.totalSessions)} />
          <StatBox label="累计题数" value={String(progress.totalQuestions)} />
          <StatBox label="总正确率" value={formatPercent(accuracy)} />
          <StatBox label="最佳单局" value={formatPercent(bestAccuracy)} />
          <StatBox label="累计用时" value={formatClock(progress.totalElapsedMs)} />
          <StatBox
            label="火花连胜"
            value={`🔥 ${progress.streak.current} 天`}
            sub={`最长 ${progress.streak.longest} 天`}
          />
        </div>
      </section>

      {formStats.length > 0 && (
        <section style={cardStyle}>
          <h3 style={sectionTitleStyle}>分形态正确率</h3>
          <div style={{ display: "grid", gap: 8 }}>
            {formStats.map((s) => (
              <AccuracyBar
                key={s.key}
                label={s.label}
                attempts={s.attempts}
                correct={s.correct}
                accuracy={s.correct / s.attempts}
              />
            ))}
          </div>
        </section>
      )}

      {weakVerbs.length > 0 && (
        <section style={cardStyle}>
          <h3 style={sectionTitleStyle}>需要复习的动词</h3>
          <div style={{ display: "grid", gap: 6 }}>
            {weakVerbs.map((s) => {
              const verb = verbById.get(s.key);
              return (
                <div
                  key={s.key}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}
                >
                  <span style={{ fontSize: 18 }}>
                    {verb ? <RubyText kanji={verb.kanji} kana={verb.kana} /> : s.key}
                    <span style={{ color: "#57606a", fontSize: 13, marginLeft: 8 }}>
                      {verb?.meaning ?? ""}
                    </span>
                  </span>
                  <span style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                    <b style={{ color: s.accuracy < 0.5 ? "#cf222e" : "#bf8700" }}>
                      {formatPercent(s.accuracy)}
                    </b>
                    <span style={{ color: "#8c959f", fontSize: 13 }}>
                      （{s.correct}/{s.attempts}）
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section style={cardStyle}>
        <h3 style={sectionTitleStyle}>最近成绩</h3>
        <div style={{ display: "grid", gap: 6 }}>
          {progress.recentResults.slice(0, 10).map((r, i) => (
            <div
              key={`${r.date}-${i}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                flexWrap: "wrap",
                padding: "6px 0",
                borderBottom: "1px solid #eaeef2",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <span style={{ color: "#57606a" }}>{r.date}</span>
              <span>
                <b style={{ color: r.accuracy >= 0.8 ? "#1a7f37" : r.accuracy >= 0.5 ? "#bf8700" : "#cf222e" }}>
                  {formatPercent(r.accuracy)}
                </b>
                <span style={{ color: "#57606a", marginLeft: 8 }}>
                  {r.correctAnswers}/{r.totalQuestions} 题 · {formatClock(r.elapsedMs)}
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <DataSettings onChanged={refresh} />
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  border: "1px solid #d0d7de",
  borderRadius: 8,
  padding: 20,
};

const sectionTitleStyle: React.CSSProperties = { margin: "0 0 12px", fontSize: 17 };

const statGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
  gap: 10,
};

function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ border: "1px solid #d0d7de", borderRadius: 8, padding: "12px 8px", backgroundColor: "#f6f8fa", textAlign: "center" }}>
      <div style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ color: "#57606a", fontSize: 13, marginTop: 4 }}>
        {label}
        {sub && <div style={{ fontSize: 12, color: "#8c959f" }}>{sub}</div>}
      </div>
    </div>
  );
}

function AccuracyBar({
  label,
  attempts,
  correct,
  accuracy,
}: {
  label: string;
  attempts: number;
  correct: number;
  accuracy: number;
}) {
  const percent = Math.round(accuracy * 100);
  const color = accuracy >= 0.8 ? "#1f883d" : accuracy >= 0.5 ? "#bf8700" : "#cf222e";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ width: 56, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 10, backgroundColor: "#eaeef2", borderRadius: 5, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${percent}%`, backgroundColor: color }} />
      </div>
      <span style={{ width: 96, flexShrink: 0, textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: 14 }}>
        <b style={{ color }}>{percent}%</b>
        <span style={{ color: "#8c959f" }}>（{correct}/{attempts}）</span>
      </span>
    </div>
  );
}
