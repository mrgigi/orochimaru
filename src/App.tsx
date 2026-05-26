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
  Home
} from 'lucide-react';
import './App.css';

import { useState, useEffect } from 'react';

function App() {
  const store = useGameStore();
  const [isPhone, setIsPhone] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      const ua = navigator.userAgent.toLowerCase();
      const isMobileUA = /mobile|iphone|ipod|android|blackberry|opera mini|iemobile|webos/i.test(ua);
      const isTabletUA = /ipad|tablet|playbook|silk/i.test(ua);
      
      // Phone check: has mobile UA, is NOT a tablet, and is small screen width/height
      const isSmallScreen = window.innerWidth < 768 && window.innerHeight < 1024;
      const isIPadSpam = /macintosh/i.test(ua) && navigator.maxTouchPoints > 1;

      if (isMobileUA && !isTabletUA && !isIPadSpam && isSmallScreen) {
        setIsPhone(true);
      } else {
        setIsPhone(false);
      }
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

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
    } else if (gameId === 'cave_trials') {
      store.setCurrentView('cave_trials');
    }
  };

  if (isPhone) {
    return (
      <div className="phone-restricted-bg">
        <div className="phone-restricted-card">
          <div className="restricted-badge">ACCESS DENIED</div>
          <h2 className="restricted-title">⚠️ SYSTEM LOCK</h2>
          <p className="restricted-desc">
            The simulation portal <strong>Serpent's Wrath</strong> has disabled access for mobile phone terminals.
          </p>
          <div className="restricted-divider" />
          <p className="restricted-detail">
            Phone displays are too compact to synchronize Orochimaru's complex combat seals.
          </p>
          <div className="authorized-platforms">
            <div className="platform-auth-item">🖥️ PC & Laptop (Authorized)</div>
            <div className="platform-auth-item">📟 Tablet & iPad (Authorized)</div>
          </div>
          <p className="restricted-footer">
            Please log in from a Tablet or PC terminal to participate in the simulation.
          </p>
        </div>
      </div>
    );
  }

  const isWidescreen = store.currentView === 'game2_web' || store.currentView === 'leaderboard';
  const containerClass = isWidescreen ? 'widescreen-viewport-container' : 'mobile-viewport-container';

  return (
    <div className="app-viewport-wrapper">
      <div className={containerClass}>
        
        {/* Floating Sound Toggle */}
        {store.currentView !== 'game2_web' && store.currentView !== 'game2_mobile' && (
          <SoundToggle 
            muteAudio={store.muteAudio} 
            toggleMute={store.toggleMute} 
          />
        )}

        {store.currentView === 'hub' ? (
          /* Hub Landing Page */
          <HubView
            orochimaruTokens={store.orochimaruTokens}
            totalTokensClaimed={store.totalTokensClaimed}
            combatHighScore={store.combatHighScore}
            onSelectGame={handleSelectGame}
            unlockedItems={store.unlockedItems}
            onUnlockItem={store.unlockItem}
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
          /* Orochi Ledger — Shared Ecosystem Leaderboard */
          <LeaderboardView
            onExit={() => store.setCurrentView('hub')}
            localPlayerPts={store.orochimaruTokens}
          />
        ) : store.currentView === 'cave_trials' ? (
          /* Game V3: Ryuchi Cave Survival (Standalone) */
          <div className="game-v1-wrapper">
            <CombatView
              reanimations={store.reanimations}
              combatHighScore={store.combatHighScore}
              updateCombatHighScore={store.updateCombatHighScore}
              addTokens={store.addTokens}
              onExit={() => store.setCurrentView('hub')}
            />
          </div>
        ) : (
          /* Game V1 view container (Laboratory & Edo Altar) */
          <div className="game-v1-wrapper">
            
            {/* Header display */}
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

              <div className="header-tokens-display" title="Shinobi Points">
                <Coins size={14} className="text-gold" />
                <span>{store.orochimaruTokens.toLocaleString()} PTS</span>
              </div>
            </header>

            {/* Main view based on active tab */}
            <main className="game-v1-main">
              {store.activeTab === 'lab' && (
                <LabView
                  forbiddenCells={store.forbiddenCells}
                  clickPower={store.clickPower}
                  passiveRate={store.passiveRate}
                  upgrades={store.upgrades}
                  buyUpgrade={store.buyUpgrade}
                  convertCellsToTokens={store.convertCellsToTokens}
                  clickCurseMark={store.clickCurseMark}
                  dailyPtsEarned={store.dailyPtsEarned}
                  dailyPtsRemaining={store.dailyPtsRemaining}
                  dailyPtsCap={store.dailyPtsCap}
                />
              )}

              {store.activeTab === 'altar' && (
                <AltarView
                  forbiddenCells={store.forbiddenCells}
                  passiveRate={store.passiveRate}
                  reanimations={store.reanimations}
                  buyReanimation={store.buyReanimation}
                  orochimaruTokens={store.orochimaruTokens}
                />
              )}
            </main>

            {/* Bottom tabs selector */}
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
            </nav>

            {/* Reset progress button */}
            <div className="reset-bar">
              <button onClick={store.resetGame} className="reset-game-btn">
                Reset Lab Research Data
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
