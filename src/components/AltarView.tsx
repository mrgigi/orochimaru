import { 
  Users, 
  Droplet, 
  Leaf, 
  Activity, 
  Flame, 
  Plus
} from 'lucide-react';
import type { Reanimation } from '../hooks/useGameStore';
import { synth } from '../audio/SynthManager';

interface AltarViewProps {
  forbiddenCells: number;
  passiveRate: number;
  reanimations: Record<string, Reanimation>;
  buyReanimation: (id: string) => boolean;
}

export function AltarView({
  forbiddenCells,
  passiveRate,
  reanimations,
  buyReanimation
}: AltarViewProps) {

  const handleReanimate = (id: string) => {
    const success = buyReanimation(id);
    if (success) {
      synth.playRumble();
    } else {
      synth.playSnake();
    }
  };

  const getReanimIcon = (id: string) => {
    switch (id) {
      case 'soundFour':
        return <Users size={24} className="text-purple" />;
      case 'kimimaro':
        return <Flame size={24} className="text-silver animate-pulse" />;
      case 'tobirama':
        return <Droplet size={24} className="text-blue" />;
      case 'hashirama':
        return <Leaf size={24} className="text-green" />;
      default:
        return <Activity size={24} />;
    }
  };

  return (
    <div className="altar-view-container">
      {/* Metrics Header */}
      <div className="altar-metrics-bar">
        <div className="metric-box">
          <span className="metric-label">Forbidden Cells</span>
          <span className="metric-val">{Math.floor(forbiddenCells).toLocaleString()}</span>
        </div>
        <div className="metric-box">
          <span className="metric-label">Passive Extraction Rate</span>
          <span className="metric-val">+{passiveRate.toLocaleString()}/s</span>
        </div>
      </div>

      {/* Edo Tensei Summoning Circle */}
      <div className="ritual-circle-container">
        <div className="ritual-circle-glow"></div>
        <div className="summoning-runes-outer"></div>
        <div className="summoning-runes-inner"></div>
        <div className="ritual-core">
          <span className="altar-title">EDO TENSEI</span>
          <span className="altar-subtitle">Reanimation Altar</span>
        </div>
      </div>

      {/* Reanimations List */}
      <section className="summonings-section">
        <h3 className="section-title">REANIMATION TARGETS</h3>
        <div className="summonings-list">
          {Object.values(reanimations).map(shinobi => {
            const canAfford = forbiddenCells >= shinobi.cost;
            const active = shinobi.count > 0;
            return (
              <div 
                key={shinobi.id}
                className={`summon-card ${active ? 'active-summon' : 'inactive-summon'} ${canAfford ? 'afford' : 'locked'}`}
              >
                <div className="summon-card-header">
                  <div className="summon-avatar-circle">
                    {getReanimIcon(shinobi.id)}
                  </div>
                  <div className="summon-header-info">
                    <h4 className="summon-name">{shinobi.name}</h4>
                    <span className="summon-count">Active Coffins: {shinobi.count}</span>
                  </div>
                </div>

                <div className="summon-card-body">
                  <p className="summon-desc">{shinobi.description}</p>
                  <p className="summon-lore">"{shinobi.lore}"</p>
                  
                  <div className="summon-stats-row">
                    <div className="summon-production">
                      <span>Rate:</span>
                      <strong className="text-green">+{shinobi.rate.toLocaleString()} DNA/s</strong>
                    </div>
                    {active && (
                      <div className="summon-total-contribution">
                        <span>Total:</span>
                        <strong className="text-purple">
                          +{(shinobi.count * shinobi.rate).toLocaleString()} DNA/s
                        </strong>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleReanimate(shinobi.id)}
                  disabled={!canAfford}
                  className="reanimate-btn"
                >
                  <Plus size={16} />
                  <span>REANIMATE ({shinobi.cost.toLocaleString()} DNA)</span>
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
export default AltarView;
