import { 
  Users, 
  Droplet, 
  Leaf, 
  Activity, 
  Flame, 
  Plus,
  Coins,
  Lock,
  ShieldAlert
} from 'lucide-react';
import type { Reanimation } from '../hooks/useGameStore';
import { synth } from '../audio/SynthManager';

interface AltarViewProps {
  forbiddenCells: number;
  passiveRate: number;
  reanimations: Record<string, Reanimation>;
  buyReanimation: (id: string) => boolean | 'pts_locked';
  orochimaruTokens: number;
}

export function AltarView({
  forbiddenCells,
  passiveRate,
  reanimations,
  buyReanimation,
  orochimaruTokens
}: AltarViewProps) {

  const handleReanimate = (id: string) => {
    const result = buyReanimation(id);
    if (result === true) {
      synth.playRumble();
    } else if (result === 'pts_locked') {
      synth.playSnake();
      const reanim = reanimations[id];
      alert(`Insufficient Shinobi Points! Reanimating ${reanim.name} requires a minimum balance of ${reanim.ptsThreshold?.toLocaleString()} PTS. Earn more Shinobi Points through gameplay.`);
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
        <div className="metric-box">
          <span className="metric-label">Shinobi Points</span>
          <span className="metric-val" style={{ color: 'var(--color-gold)' }}>
            <Coins size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
            {Math.floor(orochimaruTokens).toLocaleString()} PTS
          </span>
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
            const canAffordDna = forbiddenCells >= shinobi.cost;
            const meetsThreshold = !shinobi.ptsThreshold || orochimaruTokens >= shinobi.ptsThreshold;
            const ptsProgress = shinobi.ptsThreshold
              ? Math.min((orochimaruTokens / shinobi.ptsThreshold) * 100, 100)
              : 100;
            const active = shinobi.count > 0;
            const fullyUnlockable = canAffordDna && meetsThreshold;

            return (
              <div 
                key={shinobi.id}
                className={`summon-card ${active ? 'active-summon' : 'inactive-summon'} ${fullyUnlockable ? 'afford' : 'locked'}`}
              >
                <div className="summon-card-header">
                  <div className="summon-avatar-circle">
                    {getReanimIcon(shinobi.id)}
                  </div>
                  <div className="summon-header-info">
                    <h4 className="summon-name">{shinobi.name}</h4>
                    <span className="summon-count">Active Coffins: {shinobi.count}</span>
                  </div>
                  {/* PTS threshold badge */}
                  {shinobi.ptsThreshold && (
                    <div
                      className="summon-pts-badge"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        background: meetsThreshold
                          ? 'rgba(34, 197, 94, 0.12)'
                          : 'rgba(255, 100, 100, 0.1)',
                        border: `1px solid ${meetsThreshold ? 'rgba(34,197,94,0.35)' : 'rgba(255,100,100,0.3)'}`,
                        color: meetsThreshold ? '#22c55e' : '#f87171',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {meetsThreshold ? (
                        <Coins size={10} />
                      ) : (
                        <Lock size={10} />
                      )}
                      {shinobi.ptsThreshold.toLocaleString()} PTS MIN
                    </div>
                  )}
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

                  {/* PTS progress gate bar for threshold shinobis */}
                  {shinobi.ptsThreshold && !meetsThreshold && (
                    <div className="pts-gate-section" style={{ marginTop: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: 'var(--text-grey)', marginBottom: 4 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <ShieldAlert size={10} /> PTS requirement not met
                        </span>
                        <span>{Math.floor(orochimaruTokens).toLocaleString()} / {shinobi.ptsThreshold.toLocaleString()} PTS</span>
                      </div>
                      <div style={{
                        width: '100%',
                        height: 5,
                        background: 'rgba(255,255,255,0.07)',
                        borderRadius: 3,
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${ptsProgress}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #f87171, #fbbf24)',
                          borderRadius: 3,
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleReanimate(shinobi.id)}
                  disabled={!canAffordDna || !meetsThreshold}
                  className="reanimate-btn"
                  title={
                    !meetsThreshold
                      ? `Requires ${shinobi.ptsThreshold?.toLocaleString()} Shinobi Points`
                      : !canAffordDna
                      ? 'Not enough DNA Cells'
                      : undefined
                  }
                >
                  {!meetsThreshold ? (
                    <>
                      <Lock size={14} />
                      <span>NEEDS {shinobi.ptsThreshold?.toLocaleString()} PTS</span>
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      <span>REANIMATE ({shinobi.cost.toLocaleString()} DNA)</span>
                    </>
                  )}
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
