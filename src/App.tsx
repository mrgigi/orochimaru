import { useGameStore } from './hooks/useGameStore';
import { HubView } from './components/HubView';
import { LabView } from './components/LabView';
import { AltarView } from './components/AltarView';
import { CombatView } from './components/CombatView';
import { SoundToggle } from './components/SoundToggle';
import { SerpentsWrathView } from './components/SerpentsWrathView';
import { SerpentsWrathWebView } from './components/SerpentsWrathWebView';
import { LeaderboardView } from './components/LeaderboardView';
import { 
  Coins, 
  Home, 
  Play
} from 'lucide-react';
import './App.css';

function App() {
  const store = useGameStore();

  const handleSelectGame = (gameId: string) => {
    if (gameId === 'game1') {
      store.setCurrentView('game1');
      store.setActiveTab('lab');
    } else if (gameId === 'game2_web') {
      store.setCurrentView('game2_web');
    } else if (gameId === 'game2_mobile') {
      store.setCurrentView('game2_mobile');
    } else if (gameId === 'leaderboard') {
      store.setCurrentView('leaderboard');
    }
  };

  const isWidescreen = store.currentView === 'game2_web' || store.currentView === 'leaderboard';
  const containerClass = isWidescreen ? 'widescreen-viewport-container' : 'mobile-viewport-container';

  return (
    <div className="app-viewport-wrapper">
      <div className={containerClass}>
        
        {/* Floating Sound Toggle */}
        <SoundToggle 
          muteAudio={store.muteAudio} 
          toggleMute={store.toggleMute} 
        />

        {store.currentView === 'hub' ? (
          /* Hub Landing Page */
          <HubView
            orochimaruTokens={store.orochimaruTokens}
            totalTokensClaimed={store.totalTokensClaimed}
            combatHighScore={store.combatHighScore}
            muteAudio={store.muteAudio}
            toggleMute={store.toggleMute}
            onSelectGame={handleSelectGame}
          />
        ) : store.currentView === 'game2_web' ? (
          /* Game V2 Web Version */
          <SerpentsWrathWebView 
            onExit={() => store.setCurrentView('hub')} 
            onGoToLeaderboard={() => store.setCurrentView('leaderboard')}
          />
        ) : store.currentView === 'game2_mobile' ? (
          /* Game V2 Mobile Version */
          <SerpentsWrathView 
            onExit={() => store.setCurrentView('hub')} 
            onGoToLeaderboard={() => store.setCurrentView('leaderboard')}
          />
        ) : store.currentView === 'leaderboard' ? (
          /* Shared Ecosystem Leaderboard */
          <LeaderboardView onExit={() => store.setCurrentView('hub')} />
        ) : (
          /* Game V1 view container */
          <div className="game-v1-wrapper">
            
            {/* Header display (only if not actively in combat canvas) */}
            {store.activeTab !== 'combat' && (
              <header className="game-v1-header">
                <button 
                  onClick={() => store.setCurrentView('hub')} 
                  className="nav-home-btn"
                  title="Return to Hub"
                >
                  <Home size={18} />
                </button>
                
                <div className="game-v1-title-area">
                  <span className="game-v1-subtitle">GAME V1</span>
                  <h2 className="game-v1-title">Forbidden Lab</h2>
                </div>

                <div className="header-tokens-display">
                  <Coins size={14} className="text-gold" />
                  <span>{store.orochimaruTokens.toLocaleString()}</span>
                </div>
              </header>
            )}

            {/* Main view based on active tab */}
            <main className={`game-v1-main ${store.activeTab === 'combat' ? 'combat-mode-active' : ''}`}>
              {store.activeTab === 'lab' && (
                <LabView
                  forbiddenCells={store.forbiddenCells}
                  clickPower={store.clickPower}
                  passiveRate={store.passiveRate}
                  upgrades={store.upgrades}
                  buyUpgrade={store.buyUpgrade}
                  convertCellsToTokens={store.convertCellsToTokens}
                  clickCurseMark={store.clickCurseMark}
                />
              )}

              {store.activeTab === 'altar' && (
                <AltarView
                  forbiddenCells={store.forbiddenCells}
                  passiveRate={store.passiveRate}
                  reanimations={store.reanimations}
                  buyReanimation={store.buyReanimation}
                />
              )}

              {store.activeTab === 'combat' && (
                <CombatView
                  reanimations={store.reanimations}
                  combatHighScore={store.combatHighScore}
                  updateCombatHighScore={store.updateCombatHighScore}
                  addTokens={store.addTokens}
                  onExit={() => store.setActiveTab('lab')}
                />
              )}
            </main>

            {/* Bottom tabs selector (hidden when canvas combat is active) */}
            {store.activeTab !== 'combat' && (
              <nav className="game-v1-bottom-nav">
                <button
                  onClick={() => store.setActiveTab('lab')}
                  className={`nav-tab-item ${store.activeTab === 'lab' ? 'active' : ''}`}
                >
                  <span>🧪</span>
                  <span className="tab-label">Laboratory</span>
                </button>

                <button
                  onClick={() => store.setActiveTab('altar')}
                  className={`nav-tab-item ${store.activeTab === 'altar' ? 'active' : ''}`}
                >
                  <span>⚰️</span>
                  <span className="tab-label">Edo Altar</span>
                </button>

                <button
                  onClick={() => store.setActiveTab('combat')}
                  className="nav-tab-item combat-tab-btn"
                >
                  <Play size={14} className="play-icon-glow" />
                  <span className="tab-label">Cave Trials</span>
                </button>
              </nav>
            )}

            {/* Reset progress button (for convenience / developer ease) */}
            {store.activeTab !== 'combat' && (
              <div className="reset-bar">
                <button onClick={store.resetGame} className="reset-game-btn">
                  Reset Lab Research Data
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
