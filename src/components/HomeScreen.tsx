import { useState } from "react";
import { FORM_LABELS, type ConjugatableFormId } from "../domain/conjugate";
import { verbs } from "../data/verbs";
import { loadProgress } from "../storage/persistence";
import {
  countMasteredForms,
  FORM_BATCHES,
  getAvailableForms,
  unmasteredInCurrentBatch,
  allFormsUnlocked,
} from "../training/mastery";

interface HomeScreenProps {
  total: number;
  onStart: () => void;
  onFreePractice: () => void;
  /** 自选变形：计分训练（计入正确率与掌握进度） */
  onCustomStart: (forms: ConjugatableFormId[]) => void;
  /** 自选变形：不计分自由练习 */
  onCustomPractice: (forms: ConjugatableFormId[]) => void;
}

/** 首页：标题 + 形态解锁进度 + 开始训练入口 + 自选变形 */
export default function HomeScreen({
  total,
  onStart,
  onFreePractice,
  onCustomStart,
  onCustomPractice,
}: HomeScreenProps) {
  const progress = loadProgress();
  const totalForms = FORM_BATCHES.flat().length;
  const isFree = progress.practiceMode === "free";
  const availableForms = getAvailableForms(progress);
  const mastered = countMasteredForms(progress);
  const remaining = unmasteredInCurrentBatch(progress);

  const [picking, setPicking] = useState(false);
  const [selected, setSelected] = useState<ConjugatableFormId[]>([]);

  const toggle = (f: ConjugatableFormId) =>
    setSelected((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f],
    );
  const allPicked = selected.length === availableForms.length;

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
        {isFree ? "可练习形态（自由模式）：" : "已解锁形态："}
        {availableForms.map((f) => FORM_LABELS[f]).join("・")}
      </p>
      <p style={{ fontSize: 14, color: "#57606a", marginBottom: 28 }}>
        已掌握 {mastered} / {totalForms} 种形态
        {isFree
          ? "（自由模式：全部形态开放练习）"
          : !allFormsUnlocked(progress) && remaining > 0
            ? `（再掌握 ${remaining} 种解锁下一批）`
            : "（全部形态已解锁）"}
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

      <div style={{ marginTop: 20, borderTop: "1px solid #eaeef2", paddingTop: 20 }}>
        <button
          onClick={() => setPicking((v) => !v)}
          style={{
            border: "none",
            background: "none",
            color: "#0969da",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600,
            padding: 4,
          }}
        >
          {picking ? "▼ 收起自选变形" : "▶ 自选变形（专练指定形态）"}
        </button>

        {picking && (
          <div
            style={{
              marginTop: 8,
              border: "1px solid #d0d7de",
              borderRadius: 8,
              padding: 16,
              textAlign: "left",
            }}
          >
            <p style={{ margin: "0 0 4px", fontSize: 14, color: "#57606a" }}>
              {isFree
                ? "自由模式：全部形态可选"
                : "闯关模式：仅已解锁形态可选（可在设置页切换模式）"}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {availableForms.map((f) => {
                const active = selected.includes(f);
                return (
                  <button
                    key={f}
                    onClick={() => toggle(f)}
                    aria-pressed={active}
                    style={{
                      cursor: "pointer",
                      fontSize: 14,
                      padding: "6px 14px",
                      borderRadius: 16,
                      backgroundColor: active ? "#ddf4ff" : "#fff",
                      color: active ? "#0969da" : "#1f2328",
                      border: active ? "2px solid #0969da" : "1px solid #d0d7de",
                    }}
                  >
                    {FORM_LABELS[f]}
                  </button>
                );
              })}
              <button
                onClick={() => setSelected(allPicked ? [] : [...availableForms])}
                style={{
                  cursor: "pointer",
                  fontSize: 13,
                  padding: "6px 10px",
                  borderRadius: 16,
                  border: "none",
                  background: "none",
                  color: "#57606a",
                }}
              >
                {allPicked ? "清空" : "全选"}
              </button>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
              <button
                onClick={() => onCustomStart(selected)}
                disabled={selected.length === 0}
                className="btn-primary"
                style={{ opacity: selected.length === 0 ? 0.5 : 1 }}
              >
                计分训练（{total} 题）
              </button>
              <button
                onClick={() => onCustomPractice(selected)}
                disabled={selected.length === 0}
                style={{
                  cursor: selected.length === 0 ? "default" : "pointer",
                  fontSize: 14,
                  padding: "8px 16px",
                  borderRadius: 6,
                  border: "1px solid #d0d7de",
                  backgroundColor: "#f6f8fa",
                  color: "#1f2328",
                  opacity: selected.length === 0 ? 0.5 : 1,
                }}
              >
                自由练习（不计分）
              </button>
            </div>
            <p style={{ margin: "12px 0 0", fontSize: 13, color: "#8c959f" }}>
              计分训练计入正确率、形态掌握进度与火花连胜；自由练习不计入任何统计。
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
