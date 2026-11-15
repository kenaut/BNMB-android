import { useState } from "react";
import LearnScreen from "./components/LearnScreen";
import Training from "./training/Training";
import VerbTable from "./components/VerbTable";
import SettingsScreen, { ModeSelectModal } from "./components/SettingsScreen";
import UpdateScreen from "./components/UpdateScreen";
import { loadProgress, saveProgress } from "./storage/persistence";
import type { PracticeMode } from "./storage/progress";

type Tab = "home" | "learn" | "table" | "settings";

export default function App() {
  const [tab, setTab] = useState<Tab>("home");
  // 设置页内部的二级页面：版本更新
  const [settingsPage, setSettingsPage] = useState<"root" | "update">("root");
  // undefined = 用户尚未选择练习模式 → 首次打开弹窗询问
  const [mode, setMode] = useState<PracticeMode | undefined>(
    () => loadProgress().practiceMode,
  );

  const chooseMode = (m: PracticeMode) => {
    saveProgress({ ...loadProgress(), practiceMode: m });
    setMode(m);
  };

  // 切换主标签时回到设置首页，避免下次进入设置仍停留在版本更新页
  const openTab = (next: Tab) => {
    setTab(next);
    setSettingsPage("root");
  };

  return (
    <main className="app-shell">
      <h1 style={{ marginBottom: 4 }}>变にまび</h1>
      <p className="subtitle">天天变，烦不烦？</p>

      <nav className="tabs" aria-label="主导航">
        <TabButton active={tab === "home"} onClick={() => openTab("home")}>
          主页
        </TabButton>
        <TabButton active={tab === "learn"} onClick={() => openTab("learn")}>
          学习
        </TabButton>
        <TabButton active={tab === "table"} onClick={() => openTab("table")}>
          动词一览
        </TabButton>
        <TabButton active={tab === "settings"} onClick={() => openTab("settings")}>
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
      {tab === "settings" &&
        (settingsPage === "update" ? (
          <UpdateScreen onBack={() => setSettingsPage("root")} />
        ) : (
          <SettingsScreen onOpenUpdate={() => setSettingsPage("update")} />
        ))}

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
