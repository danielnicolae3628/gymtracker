import { useState } from 'react';
import { TabNav, type TabId } from './components/TabNav';
import { LogTab } from './components/LogTab';
import { HistoryTab } from './components/HistoryTab';
import { ProgressTab } from './components/ProgressTab';
import { ExercisesTab } from './components/ExercisesTab';
import { DataTab } from './components/DataTab';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('log');
  const [focusExerciseNameToken, setFocusExerciseNameToken] = useState(0);

  function goToExercisesAndFocus() {
    setActiveTab('exercises');
    setFocusExerciseNameToken(t => t + 1);
  }

  return (
    <div id="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-icon">🏋️</span>
          <span className="brand-name">Power Log</span>
        </div>
        <TabNav active={activeTab} onChange={setActiveTab} />
      </header>

      <main className="content">
        {activeTab === 'log' && <LogTab onGoToExercises={goToExercisesAndFocus} />}
        {activeTab === 'history' && <HistoryTab />}
        {activeTab === 'progress' && <ProgressTab />}
        {activeTab === 'exercises' && <ExercisesTab focusNameToken={focusExerciseNameToken} />}
        {activeTab === 'data' && <DataTab />}
      </main>

      <footer className="footer muted">Power Log · your data never leaves this device</footer>
    </div>
  );
}
