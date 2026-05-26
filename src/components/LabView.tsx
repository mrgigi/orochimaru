import { useState, useRef } from 'react';
import { 
  Activity, 
  Eye, 
  FlaskConical, 
  BookOpen, 
  Coins, 
  Plus,
  ArrowRight
} from 'lucide-react';
import type { Upgrade } from '../hooks/useGameStore';
import { synth } from '../audio/SynthManager';

interface LabViewProps {
  forbiddenCells: number;
  clickPower: number;
  passiveRate: number;
  upgrades: Record<string, Upgrade>;
  buyUpgrade: (id: string) => boolean;
  convertCellsToTokens: () => number | false;
  clickCurseMark: (mult?: number) => number;
}

interface FloatingParticle {
  id: number;
  x: number;
  y: number;
  value: number;
}

export function LabView({
  forbiddenCells,
  clickPower,
  passiveRate,
  upgrades,
  buyUpgrade,
  convertCellsToTokens,
  clickCurseMark
}: LabViewProps) {
  const [particles, setParticles] = useState<FloatingParticle[]>([]);
  const nextParticleId = useRef(0);
  const clickTargetRef = useRef<HTMLDivElement>(null);

  const handleCurseClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    // Play snake hiss randomly or standard click sound
    if (Math.random() < 0.2) {
      synth.playSnake();
    } else {
      synth.playClick();
    }

    const valueGained = clickCurseMark();

    // Spawn floating particle at click position relative to the clicked target
    if (clickTargetRef.current) {
      const rect = clickTargetRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const newParticle: FloatingParticle = {
        id: nextParticleId.current++,
        x: clickX,
        y: clickY,
        value: valueGained
      };

      setParticles(prev => [...prev, newParticle]);

      // Remove after animation completes (1s)
      setTimeout(() => {
        setParticles(prev => prev.filter(p => p.id !== newParticle.id));
      }, 1000);
    }
  };

  const handleBuy = (id: string) => {
    const success = buyUpgrade(id);
    if (success) {
      synth.playPurchase();
    } else {
      synth.playSnake();
    }
  };

  const handleConvert = () => {
    const tokens = convertCellsToTokens();
    if (tokens) {
      synth.playRumble();
      alert(`Successfully purified cells and claimed ${tokens.toLocaleString()} Shinobi Points!`);
    } else {
      synth.playSnake();
      alert("Insufficient Forbidden Cells! You need at least 10,000 cells to perform purification.");
    }
  };

  // Helper to map upgrade icons
  const getUpgradeIcon = (id: string) => {
    switch (id) {
      case 'ryuchiCaveScroll':
        return <BookOpen size={20} className="text-purple" />;
      case 'venomCentrifuge':
        return <FlaskConical size={20} className="text-green" />;
      case 'regenerationPod':
        return <Activity size={20} className="text-silver" />;
      case 'sharinganSpecimen':
        return <Eye size={20} className="text-red animate-pulse" />;
      default:
        return <FlaskConical size={20} />;
    }
  };

  return (
    <div className="lab-view-container">
      {/* Metrics Banner */}
      <div className="lab-metrics-bar">
        <div className="metric-box">
          <span className="metric-label">Forbidden Cells (DNA)</span>
          <span className="metric-val">{Math.floor(forbiddenCells).toLocaleString()}</span>
        </div>
        <div className="metric-box">
          <span className="metric-label">Production Rate</span>
          <span className="metric-val">+{passiveRate.toLocaleString()}/s</span>
        </div>
      </div>

      {/* Clicker Area */}
      <div className="clicker-section">
        <div 
          ref={clickTargetRef}
          onClick={handleCurseClick}
          className="curse-mark-clicker-container"
        >
          {/* Glowing background runes */}
          <div className="clicker-glow-ring"></div>
          <div className="clicker-runes"></div>
          
          {/* Main click button - Heavenly Curse Mark shape representation */}
          <div className="curse-mark-button">
            <div className="curse-mark-symbol">
              <span className="comma-1"></span>
              <span className="comma-2"></span>
              <span className="comma-3"></span>
            </div>
            <div className="curse-mark-inner-glow"></div>
          </div>

          {/* Render floating particles */}
          {particles.map(p => (
            <span
              key={p.id}
              className="floating-cell-particle"
              style={{ left: p.x, top: p.y }}
            >
              +{p.value} DNA
            </span>
          ))}
        </div>
        
        <p className="clicker-instruction">Tap the Curse Mark to synthesize DNA cells (+{clickPower}/click)</p>
      </div>

      {/* Purification / Token conversion section */}
      <section className="purify-section">
        <div className="purify-card">
          <div className="purify-info">
            <h3 className="card-title">DNA Purification</h3>
            <p className="card-subtitle">Purify DNA cells to accumulate Shinobi Points</p>
            <div className="conversion-rate">
              <span>10,000 Cells</span>
              <ArrowRight size={14} className="text-muted" />
              <span className="token-text">1 Point (PTS)</span>
            </div>
          </div>
          <button 
            onClick={handleConvert} 
            disabled={forbiddenCells < 10000}
            className="purify-btn"
          >
            <Coins size={16} />
            <span>PURIFY</span>
          </button>
        </div>
      </section>

      {/* Upgrades Section */}
      <section className="upgrades-section">
        <h3 className="section-title">LAB UPGRADES</h3>
        <div className="upgrades-list">
          {Object.values(upgrades).map(upgrade => {
            const canAfford = forbiddenCells >= upgrade.cost;
            return (
              <div 
                key={upgrade.id}
                className={`upgrade-item-card ${canAfford ? 'afford' : 'locked'}`}
              >
                <div className="upgrade-icon-box">
                  {getUpgradeIcon(upgrade.id)}
                </div>
                <div className="upgrade-body">
                  <div className="upgrade-header-row">
                    <span className="upgrade-name">{upgrade.name}</span>
                    <span className="upgrade-count">Lvl {upgrade.count}</span>
                  </div>
                  <p className="upgrade-desc">{upgrade.description}</p>
                  <div className="upgrade-footer-row">
                    <div className="upgrade-cost">
                      <span>🧪</span>
                      <span>{upgrade.cost.toLocaleString()} DNA</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleBuy(upgrade.id)}
                  disabled={!canAfford}
                  className="buy-upgrade-btn"
                >
                  <Plus size={16} />
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
export default LabView;
