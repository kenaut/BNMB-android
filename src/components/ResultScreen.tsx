import type { SessionResult } from "../training/session";
import { formatClock, formatPercent, formatSeconds } from "../training/format";

interface ResultScreenProps {
  result: SessionResult;
  onRestart: () => void;
  onHome: () => void;
}

/** 回合结果：正确率 / 答对数量 / 总用时 / 平均每题用时 */
export default function ResultScreen({ result, onRestart, onHome }: ResultScreenProps) {
  const allCorrect = result.correct === result.total;

  return (
    <section
      style={{
        backgroundColor: "#fff",
        border: "1px solid #d0d7de",
        borderRadius: 8,
        padding: "32px 24px",
        textAlign: "center",
      }}
    >
      <h2 style={{ marginTop: 0 }}>{allCorrect ? "全部答对，太棒了！" : "训练完成！"}</h2>

      <div style={{ fontSize: 56, fontWeight: 700, color: "#1f883d", lineHeight: 1.1 }}>
        {formatPercent(result.accuracy)}
      </div>
      <p style={{ color: "#57606a", marginTop: 4 }}>正确率</p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12,
          marginTop: 20,
        }}
      >
        <StatBox label="答对题数" value={`${result.correct} / ${result.total}`} />
        <StatBox label="总用时" value={formatClock(result.durationMs)} />
        <StatBox label="平均每题" value={formatSeconds(result.averageMs)} />
      </div>

      <div style={{ marginTop: 28, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <button onClick={onRestart} className="btn-primary" style={{ minWidth: 140 }}>
          再来一局
        </button>
        <button
          onClick={onHome}
          style={{
            minWidth: 140,
            minHeight: 40,
            padding: "8px 24px",
            fontSize: 16,
            border: "1px solid #d0d7de",
            borderRadius: 6,
            cursor: "pointer",
            backgroundColor: "#f6f8fa",
            color: "#1f2328",
          }}
        >
          返回首页
        </button>
      </div>
    </section>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: "1px solid #d0d7de",
        borderRadius: 8,
        padding: "14px 8px",
        backgroundColor: "#f6f8fa",
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ color: "#57606a", fontSize: 13, marginTop: 4 }}>{label}</div>
    </div>
  );
}
