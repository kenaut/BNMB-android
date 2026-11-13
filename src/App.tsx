import { useState } from "react";
import LearnScreen from "./components/LearnScreen";
import Training from "./training/Training";
import VerbTable from "./components/VerbTable";
import SettingsScreen, { ModeSelectModal } from "./components/SettingsScreen";
import { loadProgress, saveProgress } from "./storage/persistence";
import type { PracticeMode } from "./storage/progress";

type Tab = "home" | "learn" | "table" | "settings";

export default function App() {
  const [tab, setTab] = useState<Tab>("home");
  // undefined = 用户尚未选择练习模式 → 首次打开弹窗询问
  const [mode, setMode] = useState<PracticeMode | undefined>(
    () => loadProgress().practiceMode,
  );

  const chooseMode = (m: PracticeMode) => {
    saveProgress({ ...loadProgress(), practiceMode: m });
    setMode(m);
  };

  return (
    <main className="app-shell">
      <h1 style={{ marginBottom: 4 }}>变にまび</h1>
      <p className="subtitle">天天变，烦不烦？</p>

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
        <TabButton active={tab === "settings"} onClick={() => setTab("settings")}>
          设置
        </TabButton>
      </nav>

      {tab === "home" && <Training />}
      {tab === "learn" && <LearnScreen />}
      {tab === "table" && (
        <div className="table-scroll">
          <VerbTable />
        </div>
      )}
      {tab === "settings" && <SettingsScreen />}

      {mode === undefined && <ModeSelectModal onChoose={chooseMode} />}
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
