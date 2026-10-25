import { FORM_LABELS } from "../domain/conjugate";
import { verbs } from "../data/verbs";
import { loadProgress } from "../storage/persistence";
import {
  allFormsUnlocked,
  countMasteredForms,
  FORM_BATCHES,
  getUnlockedForms,
  unmasteredInCurrentBatch,
} from "../training/mastery";

interface HomeScreenProps {
  total: number;
  onStart: () => void;
  onFreePractice: () => void;
}

/** 首页：标题 + 形态解锁进度 + 开始训练入口 */
export default function HomeScreen({ total, onStart, onFreePractice }: HomeScreenProps) {
  const progress = loadProgress();
  const totalForms = FORM_BATCHES.flat().length;
  const unlockedForms = getUnlockedForms(progress);
  const mastered = countMasteredForms(progress);
  const remaining = unmasteredInCurrentBatch(progress);

  return (
    <section
      style={{
        backgroundColor: "#fff",
        border: "1px solid #d0d7de",
        borderRadius: 8,
        padding: "40px 24px",
        textAlign: "center",
      }}
    >
      <p style={{ color: "#57606a", marginTop: 0 }}>
        {verbs.length} 个动词 · 填空 / 选择 · 正向变形 / 逆向还原
      </p>
      <p style={{ fontSize: 18, marginBottom: 8 }}>
        每回合 {total} 题，随机考查动词与活用形态，即时判分并统计用时。
      </p>
      <p style={{ fontSize: 14, color: "#57606a", marginBottom: 4 }}>
        已解锁形态：{unlockedForms.map((f) => FORM_LABELS[f]).join("・")}
      </p>
      <p style={{ fontSize: 14, color: "#57606a", marginBottom: 28 }}>
        已掌握 {mastered} / {totalForms} 种形态
        {!allFormsUnlocked(progress) && remaining > 0 && `（再掌握 ${remaining} 种解锁下一批）`}
        {allFormsUnlocked(progress) && "（全部形态已解锁）"}
      </p>
      <button onClick={onStart} className="btn-primary" style={{ fontSize: 20, padding: "12px 48px" }}>
        开始训练
      </button>
      <div style={{ marginTop: 12 }}>
        <button
          onClick={onFreePractice}
          style={{
            border: "none",
            background: "none",
            color: "#0969da",
            cursor: "pointer",
            fontSize: 14,
            padding: 4,
          }}
        >
          自由练习（不计分、不限题数）
        </button>
      </div>
    </section>
  );
}
