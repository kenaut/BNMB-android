import { useState } from "react";
import LearnScreen from "./components/LearnScreen";
import Training from "./training/Training";
import VerbTable from "./components/VerbTable";

type Tab = "home" | "learn" | "table";

export default function App() {
  const [tab, setTab] = useState<Tab>("home");

  return (
    <main className="app-shell">
      <h1 style={{ marginBottom: 4 }}>变にまび</h1>
      <p className="subtitle">日语动词活用训练 · 第一阶段（ます形 / ない形 / て形 / た形）</p>

      <nav className="tabs" aria-label="主导航">
        <TabButton active={tab === "home"} onClick={() => setTab("home")}>
          主页
        </TabButton>
        <TabButton active={tab === "learn"} onClick={() => setTab("learn")}>
          学习
        </TabButton>
        <TabButton active={tab === "table"} onClick={() => setTab("table")}>
          动词一览
        </TabButton>
      </nav>

      {tab === "home" && <Training />}
      {tab === "learn" && <LearnScreen />}
      {tab === "table" && (
        <div className="table-scroll">
          <VerbTable />
        </div>
      )}
    </main>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      onClick={onClick}
      className={active ? "tab-button tab-button-active" : "tab-button"}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}
