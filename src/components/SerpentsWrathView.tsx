import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Play, 
  Skull, 
  Swords, 
  Trophy, 
  RefreshCw, 
  ArrowLeft,
  Zap
} from 'lucide-react';
import { SerpentsWrathEngine, ATTACK_DEFS, WAVE_DEFS } from '../game/SerpentsWrathEngine';
import type { AttackType } from '../game/SerpentsWrathEngine';
import { synth } from '../audio/SynthManager';
import serpentsBanner from '../assets/serpents_wrath_banner.png';

type ScreenState = 'start' | 'playing' | 'gameover' | 'victory';

interface SerpentsWrathViewProps {
  onExit: () => void;
  onGoToLeaderboard: () => void;
}

export function SerpentsWrathView({ onExit, onGoToLeaderboard }: SerpentsWrathViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<SerpentsWrathEngine | null>(null);

  const [screen, setScreen] = useState<ScreenState>('start');
  const [finalScore, setFinalScore] = useState(0);
  const [finalKills, setFinalKills] = useState(0);
  const [finalWaves, setFinalWaves] = useState(0);
  const [canvasDim, setCanvasDim] = useState({ w: 360, h: 500 });
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('orochimaru_player_name') || 'Shinobi_' + Math.floor(Math.random() * 900 + 100);
  });
  const [scoreSubmitted, setScoreSubmitted] = useState(false);

  // Touch joystick state
  const [joyActive, setJoyActive] = useState(false);
  const [joyStart, setJoyStart] = useState({ x: 0, y: 0 });
  const [joyCurrent, setJoyCurrent] = useState({ x: 0, y: 0 });

  // Compute canvas size from container
  useEffect(() => {
    const resize = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        const h = Math.min(window.innerHeight - 80, 540);
        setCanvasDim({ w, h });
      }
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const startGame = useCallback(() => {
    setScreen('playing');
    setScoreSubmitted(false);
    synth.playRumble();

    setTimeout(() => {
      if (!canvasRef.current) return;
      if (engineRef.current) { engineRef.current.cleanup(); }

      const engine = new SerpentsWrathEngine({
        canvas: canvasRef.current,
        onGameOver: (score, kills, waves) => {
          setFinalScore(score);
          setFinalKills(kills);
          setFinalWaves(waves + 1);
          setScreen('gameover');
          synth.playSnake();
        },
        onVictory: (score, kills) => {
          setFinalScore(score);
          setFinalKills(kills);
          setScreen('victory');
          synth.playRumble();
        },
        onPlaySound: (type) => {
          if (type === 'attack') synth.playSlash();
          else if (type === 'ultimate') { synth.playRumble(); }
          else if (type === 'hit' || type === 'death') synth.playSnake();
          else if (type === 'wave') { synth.playRumble(); }
        }
      });

      engineRef.current = engine;
      engine.start();
    }, 80);
  }, []);

  useEffect(() => {
    return () => { engineRef.current?.cleanup(); };
  }, []);

  const submitScore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || scoreSubmitted) return;

    try {
      localStorage.setItem('orochimaru_player_name', playerName.trim());
      const saved = localStorage.getItem('orochimaru_leaderboard');
      const leaderboard = saved ? JSON.parse(saved) : [];
      
      const newEntry = {
        id: Math.random().toString(36).substring(2, 9),
        name: playerName.trim(),
        score: finalScore,
        kills: finalKills,
        waves: finalWaves,
        platform: 'mobile',
        timestamp: Date.now()
      };

      leaderboard.push(newEntry);
      localStorage.setItem('orochimaru_leaderboard', JSON.stringify(leaderboard));
      setScoreSubmitted(true);
      
      synth.playClick();
      onGoToLeaderboard();
    } catch (err) {
      console.error('Failed to submit score:', err);
    }
  };

  // Touch joystick handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (screen !== 'playing') return;
    const t = e.touches[0];
    setJoyActive(true);
    setJoyStart({ x: t.clientX, y: t.clientY });
    setJoyCurrent({ x: t.clientX, y: t.clientY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!joyActive || screen !== 'playing') return;
    const t = e.touches[0];
    setJoyCurrent({ x: t.clientX, y: t.clientY });
    const dx = t.clientX - joyStart.x;
    const dy = t.clientY - joyStart.y;
    const dist = Math.hypot(dx, dy);
    const max = 50;
    const factor = dist > max ? max / dist : 1;
    if (engineRef.current) {
      engineRef.current.touchVector = { x: (dx * factor) / max, y: (dy * factor) / max };
    }
  };

  const handleTouchEnd = () => {
    setJoyActive(false);
    if (engineRef.current) engineRef.current.touchVector = null;
  };

  // Mouse drag (desktop joystick sim)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (screen !== 'playing') return;
    setJoyActive(true);
    setJoyStart({ x: e.clientX, y: e.clientY });
    setJoyCurrent({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!joyActive || screen !== 'playing') return;
    setJoyCurrent({ x: e.clientX, y: e.clientY });
    const dx = e.clientX - joyStart.x;
    const dy = e.clientY - joyStart.y;
    const dist = Math.hypot(dx, dy);
    const max = 50;
    const factor = dist > max ? max / dist : 1;
    if (engineRef.current) {
      engineRef.current.touchVector = { x: (dx * factor) / max, y: 0 };
    }
  };

  const handleMouseUp = () => {
    setJoyActive(false);
    if (engineRef.current) engineRef.current.touchVector = null;
  };

  const handleAttackBtn = (type: AttackType) => {
    engineRef.current?.triggerAttack(type);
    synth.playClick();
  };

  const attackTypes: AttackType[] = ['snake_strike', 'shadow_snake', 'kusanagi', 'edo_tensei'];

  return (
    <div className="sw-wrapper" ref={containerRef}>
      {/* Back button */}
      <div className="sw-topbar">
        <button onClick={onExit} className="back-btn-hub">
          <ArrowLeft size={15} />
          <span>Hub</span>
        </button>
        <span className="sw-game-title">SERPENT'S WRATH</span>
        <span className="sw-badge">GAME V2</span>
      </div>

      {/* ── START SCREEN ─────────────────────────────────── */}
      {screen === 'start' && (
        <div className="sw-screen start-screen">
          <div className="sw-banner-wrap">
            <img src={serpentsBanner} alt="Serpent's Wrath" className="sw-banner-img" />
            <div className="sw-banner-overlay" />
          </div>

          <div className="sw-start-content">
            <div className="sw-logo-block">
              <span className="sw-token-pill">$OROCHIMARU</span>
              <h1 className="sw-title">SERPENT'S WRATH</h1>
              <p className="sw-tagline">"The Forbidden Jutsu of DeFi"</p>
            </div>

            <div className="sw-wave-preview">
              {WAVE_DEFS.map((w, i) => (
                <div key={i} className="sw-wave-chip">
                  <span className="sw-wave-num">{i + 1}</span>
                  <span className="sw-wave-name">{w.label}</span>
                </div>
              ))}
            </div>

            <div className="sw-controls-grid">
              <div className="sw-ctrl-col">
                <h4>MOVEMENT</h4>
                <p>WASD / Arrow Keys</p>
                <p>W / Space = Jump</p>
              </div>
              <div className="sw-ctrl-col">
                <h4>ATTACKS</h4>
                {attackTypes.map(t => (
                  <p key={t} style={{ color: ATTACK_DEFS[t].color }}>
                    [{ATTACK_DEFS[t].key}] {ATTACK_DEFS[t].label}
                  </p>
                ))}
              </div>
            </div>

            <button onClick={startGame} className="sw-start-btn">
              <Play size={20} />
              <span>BEGIN THE ASSAULT</span>
            </button>

            <p className="sw-sub-tagline">"Immortality awaits those who hold $OROCHIMARU"</p>
          </div>
        </div>
      )}

      {/* ── PLAYING SCREEN ───────────────────────────────── */}
      {screen === 'playing' && (
        <div
          className="sw-arena"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <canvas
            ref={canvasRef}
            width={canvasDim.w}
            height={canvasDim.h}
            className="sw-canvas"
          />

          {/* Touch joystick visual */}
          {joyActive && (
            <div
              className="joystick-ring"
              style={{ left: joyStart.x - 40, top: joyStart.y - 40 }}
            >
              <div
                className="joystick-handle"
                style={{
                  transform: `translate(${Math.max(-40, Math.min(40, joyCurrent.x - joyStart.x))}px, 0px)`
                }}
              />
            </div>
          )}

          {/* Mobile attack buttons */}
          <div className="sw-mobile-attacks">
            {attackTypes.map(type => {
              const def = ATTACK_DEFS[type];
              return (
                <button
                  key={type}
                  className="sw-attack-mobile-btn"
                  style={{ borderColor: def.color, color: def.color }}
                  onTouchStart={(e) => { e.stopPropagation(); handleAttackBtn(type); }}
                  onClick={() => handleAttackBtn(type)}
                >
                  <span className="sw-btn-key">[{def.key}]</span>
                  <span className="sw-btn-name">{def.label.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>

          <p className="mobile-touch-hint">Drag left side to move · Tap buttons to attack</p>
        </div>
      )}

      {/* ── GAME OVER SCREEN ─────────────────────────────── */}
      {screen === 'gameover' && (
        <div className="sw-screen gameover-screen">
          <div className="sw-result-content">
            <div className="sw-skull-icon">
              <Skull size={56} className="text-red" />
            </div>

            <h2 className="sw-result-title defeat-title">ELIMINATED</h2>
            <p className="sw-result-desc">
              The Leaf Village's forces have overwhelmed the lab. But your research lives on...
            </p>

            <div className="sw-stats-grid">
              <div className="sw-stat-box">
                <Trophy size={16} className="text-gold" />
                <span className="sw-stat-val">{finalScore.toLocaleString()}</span>
                <span className="sw-stat-label">SCORE</span>
              </div>
              <div className="sw-stat-box">
                <Skull size={16} className="text-red" />
                <span className="sw-stat-val">{finalKills}</span>
                <span className="sw-stat-label">KILLS</span>
              </div>
              <div className="sw-stat-box">
                <Swords size={16} className="text-purple" />
                <span className="sw-stat-val">{finalWaves} / {WAVE_DEFS.length}</span>
                <span className="sw-stat-label">WAVES</span>
              </div>
            </div>

            <form onSubmit={submitScore} className="leaderboard-submit-form mobile-submit-form">
              <label htmlFor="playerName">RECORD LEGACY</label>
              <div className="form-row">
                <input
                  type="text"
                  id="playerName"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value.slice(0, 15))}
                  placeholder="Your name..."
                  maxLength={15}
                  required
                />
                <button type="submit" className="submit-score-btn" disabled={scoreSubmitted}>
                  {scoreSubmitted ? 'SAVING...' : 'RECORD'}
                </button>
              </div>
            </form>

            <div className="sw-token-cta-card">
              <Zap size={16} className="text-gold" />
              <p>Hold <strong>$OROCHIMARU</strong> to unlock special jutsu in future updates</p>
            </div>

            <div className="sw-result-btns">
              <button onClick={startGame} className="sw-retry-btn">
                <RefreshCw size={16} />
                <span>Try Again</span>
              </button>
              <button onClick={onExit} className="back-to-menu-btn">Return to Hub</button>
            </div>
          </div>
        </div>
      )}

      {/* ── VICTORY SCREEN ───────────────────────────────── */}
      {screen === 'victory' && (
        <div className="sw-screen victory-screen">
          <div className="sw-result-content">
            <div className="sw-victory-glow">
              <Trophy size={56} className="text-gold" />
            </div>

            <h2 className="sw-result-title victory-title">VICTORY!</h2>
            <p className="sw-result-desc">
              All 6 waves defeated. The Hidden Leaf Village lies in ruin. Orochimaru reigns supreme.
            </p>

            <div className="sw-stats-grid">
              <div className="sw-stat-box">
                <Trophy size={16} className="text-gold" />
                <span className="sw-stat-val sw-gold">{finalScore.toLocaleString()}</span>
                <span className="sw-stat-label">SCORE</span>
              </div>
              <div className="sw-stat-box">
                <Skull size={16} className="text-green" />
                <span className="sw-stat-val">{finalKills}</span>
                <span className="sw-stat-label">KILLS</span>
              </div>
              <div className="sw-stat-box">
                <Zap size={16} className="text-gold" />
                <span className="sw-stat-val sw-gold">6 / 6</span>
                <span className="sw-stat-label">WAVES</span>
              </div>
            </div>

            <form onSubmit={submitScore} className="leaderboard-submit-form mobile-submit-form victory-form">
              <label htmlFor="playerName">RECORD LEGACY</label>
              <div className="form-row">
                <input
                  type="text"
                  id="playerName"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value.slice(0, 15))}
                  placeholder="Your name..."
                  maxLength={15}
                  required
                />
                <button type="submit" className="submit-score-btn" disabled={scoreSubmitted}>
                  {scoreSubmitted ? 'SAVING...' : 'RECORD'}
                </button>
              </div>
            </form>

            <div className="sw-victory-token-card">
              <div className="sw-victory-badge">$OROCHIMARU</div>
              <h3>The Forbidden Jutsu of DeFi</h3>
              <p>Immortality awaits those who hold.</p>
              <div className="sw-victory-metrics">
                <div className="sw-vm-item"><span>Supply</span><strong>690B</strong></div>
                <div className="sw-vm-item"><span>Network</span><strong>Ethereum</strong></div>
                <div className="sw-vm-item"><span>Target</span><strong>$5BN</strong></div>
              </div>
              <div className="sw-victory-btns">
                <a href="https://app.uniswap.org/swap?outputCurrency=0x89fabE8405CFDE3f6aEeD8804e3BA4a10b7e21d3" target="_blank" rel="noopener noreferrer" className="sw-buy-btn">
                  Buy $OROCHIMARU
                </a>
                <button onClick={startGame} className="sw-replay-btn">
                  <RefreshCw size={14} />
                  Play Again
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SerpentsWrathView;
