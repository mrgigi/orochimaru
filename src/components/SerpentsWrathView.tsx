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
import { GameEngine } from '../game/sw/GameEngine';
import { GameState } from '../game/sw/types';
import { synth } from '../audio/SynthManager';
import serpentsBanner from '../assets/serpents_wrath_banner.png';
import { useGameStore } from '../hooks/useGameStore';

type ScreenState = 'start' | 'playing' | 'gameover' | 'victory';

interface SerpentsWrathViewProps {
  onExit: () => void;
  onGoToLeaderboard: () => void;
}

const ATTACK_DEFS_SW = {
  snake_strike: { key: 'Q', label: 'Snake Strike', color: '#39ff14', cooldown: 500 },
  shadow_snake: { key: 'E', label: 'Shadow Snake', color: '#8b00ff', cooldown: 1000 },
  kusanagi: { key: 'R', label: 'Kusanagi', color: '#ffd700', cooldown: 2000 },
  edo_tensei: { key: 'Space', label: 'Edo Tensei', color: '#ff0066', cooldown: 5000 },
};

const WAVE_DEFS_SW = [
  { label: 'Leaf Genin' },
  { label: 'Chunin Assault' },
  { label: 'ANBU Black Ops' },
  { label: 'Jonin Strike' },
  { label: 'Elite Guard' },
  { label: 'Full Assault' },
  { label: 'Shadow Kage (Boss)' },
];

export function SerpentsWrathView({ onExit, onGoToLeaderboard }: SerpentsWrathViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const store = useGameStore();

  const [screen, setScreen] = useState<ScreenState>('start');

  // Handle background music playback during gameplay
  useEffect(() => {
    if (screen === 'playing' && !store.muteAudio) {
      if (!audioRef.current) {
        audioRef.current = new Audio('/assets/orochimaru_theme.mp3');
        audioRef.current.loop = true;
        audioRef.current.volume = 0.4;
      }
      audioRef.current.play().catch(err => {
        console.warn('Failed to play background music:', err);
      });
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [screen, store.muteAudio]);
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

  // HUD DOM Refs for 60 FPS direct updates on mobile
  const hpBarRef = useRef<HTMLDivElement>(null);
  const ckBarRef = useRef<HTMLDivElement>(null);
  const scoreTextRef = useRef<HTMLSpanElement>(null);
  const waveTextRef = useRef<HTMLSpanElement>(null);

  const cdRefs = {
    snake_strike: useRef<HTMLDivElement>(null),
    shadow_snake: useRef<HTMLDivElement>(null),
    kusanagi: useRef<HTMLDivElement>(null),
    edo_tensei: useRef<HTMLDivElement>(null),
  };

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

      const engine = new GameEngine(canvasRef.current, (state, stats) => {
        if (state === GameState.GAME_OVER) {
          setFinalScore(stats.score);
          setFinalKills(stats.kills);
          setFinalWaves(stats.wave);
          setScreen('gameover');
          synth.playSnake();
        } else if (state === GameState.VICTORY) {
          setFinalScore(stats.score);
          setFinalKills(stats.kills);
          setFinalWaves(7);
          setScreen('victory');
          synth.playRumble();
        }
      });

      engine.audio.setMuted(store.muteAudio);
      engineRef.current = engine;
      engine.start();
    }, 80);
  }, [store.muteAudio]);

  // Synchronize audio mute state with the engine
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.audio.setMuted(store.muteAudio);
    }
  }, [store.muteAudio]);

  // Frame loop in React to update the overlay HUD elements directly
  useEffect(() => {
    if (screen !== 'playing' || !engineRef.current) return;

    let frameId: number;
    const updateOverlayHUD = () => {
      const engine = engineRef.current;
      if (!engine) return;

      const state = engine.getHUDState();

      // HP Bar width
      if (hpBarRef.current) {
        hpBarRef.current.style.width = `${Math.max(0, (state.hp / state.maxHp) * 100)}%`;
      }

      // Chakra Bar width
      if (ckBarRef.current) {
        ckBarRef.current.style.width = `${Math.max(0, (state.chakra / state.maxChakra) * 100)}%`;
      }

      // Metrics in Top Right
      if (scoreTextRef.current) {
        scoreTextRef.current.innerText = `SCORE: ${state.score}`;
      }
      if (waveTextRef.current) {
        waveTextRef.current.innerText = `WAVE ${state.wave + 1}/7`;
      }

      // Attack cooldown overlay sliders
      const attackKeys = ['snake_strike', 'shadow_snake', 'kusanagi', 'edo_tensei'] as const;
      attackKeys.forEach(type => {
        const ref = cdRefs[type].current;
        if (ref) {
          const framesRemaining = state.cooldowns[type];
          const def = ATTACK_DEFS_SW[type];
          const maxFrames = Math.ceil(def.cooldown / (1000 / 60));
          const fraction = framesRemaining / maxFrames;

          if (framesRemaining > 0) {
            ref.style.height = `${fraction * 100}%`;
          } else {
            ref.style.height = '0%';
          }
        }
      });

      frameId = requestAnimationFrame(updateOverlayHUD);
    };

    frameId = requestAnimationFrame(updateOverlayHUD);
    return () => cancelAnimationFrame(frameId);
  }, [screen]);

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

  // Touch joystick handlers (supporting 2D omnidirectional movement coordinates)
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
      engineRef.current.touchVector = { x: (dx * factor) / max, y: (dy * factor) / max };
    }
  };

  const handleMouseUp = () => {
    setJoyActive(false);
    if (engineRef.current) engineRef.current.touchVector = null;
  };

  const handleAttackBtn = (index: number) => {
    engineRef.current?.triggerAttack(index);
    synth.playClick();
  };

  const attackTypes = ['snake_strike', 'shadow_snake', 'kusanagi', 'edo_tensei'] as const;

  return (
    <div className="sw-wrapper" ref={containerRef}>
      {/* Back button */}
      <div className="sw-topbar">
        <button onClick={onExit} className="back-btn-hub">
          <ArrowLeft size={15} />
          <span>Hub</span>
        </button>
        <span className="sw-game-title">SERPENT FURY</span>
        <span className="sw-badge">GAME V2</span>
      </div>

      {/* ── START SCREEN ─────────────────────────────────── */}
      {screen === 'start' && (
        <div className="sw-screen start-screen">
          <div className="sw-banner-wrap">
            <img src={serpentsBanner} alt="Serpent Fury" className="sw-banner-img" />
            <div className="sw-banner-overlay" />
          </div>

          <div className="sw-start-content">
            <div className="sw-logo-block">
              <span className="sw-token-pill">TOKEN: OROCHIMARU</span>
              <h1 className="sw-title">SERPENT FURY</h1>
              <p className="sw-tagline">"The Forbidden Jutsu of DeFi"</p>
            </div>

            <div className="sw-wave-preview">
              {WAVE_DEFS_SW.map((w, i) => (
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
                <p>2D Free Roam in Lab</p>
              </div>
              <div className="sw-ctrl-col">
                <h4>ATTACKS</h4>
                {attackTypes.map(t => (
                  <p key={t} style={{ color: ATTACK_DEFS_SW[t].color }}>
                    [{ATTACK_DEFS_SW[t].key}] {ATTACK_DEFS_SW[t].label}
                  </p>
                ))}
              </div>
            </div>

            <button onClick={startGame} className="sw-start-btn">
              <Play size={20} />
              <span>BEGIN THE ASSAULT</span>
            </button>

            <p className="sw-sub-tagline">"Immortality awaits those who hold OROCHIMARU"</p>
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

          {/* HUD - Health & Chakra bars overlay */}
          <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', flexDirection: 'column', gap: 6, zIndex: 10, pointerEvents: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#ff4a4a', fontSize: '10px', fontWeight: 'bold', width: 16 }}>HP</span>
              <div style={{ width: 100, height: 8, backgroundColor: 'rgba(9,9,9,0.7)', borderRadius: 4, border: '1px solid rgba(255,74,74,0.3)', overflow: 'hidden' }}>
                <div ref={hpBarRef} style={{ height: '100%', backgroundColor: '#ff4a4a', width: '100%', borderRadius: 4 }} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#a855f7', fontSize: '10px', fontWeight: 'bold', width: 16 }}>CK</span>
              <div style={{ width: 100, height: 8, backgroundColor: 'rgba(9,9,9,0.7)', borderRadius: 4, border: '1px solid rgba(168,85,247,0.3)', overflow: 'hidden' }}>
                <div ref={ckBarRef} style={{ height: '100%', backgroundColor: '#a855f7', width: '100%', borderRadius: 4 }} />
              </div>
            </div>
          </div>

          {/* HUD - Score & Wave Metrics overlay */}
          <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', zIndex: 10, pointerEvents: 'none', fontFamily: 'monospace' }}>
            <span ref={scoreTextRef} style={{ color: '#4ade80', fontSize: '12px', fontWeight: 'bold', textShadow: '0 0 6px rgba(74,222,128,0.4)' }}>SCORE: 0</span>
            <span ref={waveTextRef} style={{ color: '#fbbf24', fontSize: '10px', fontWeight: 'bold' }}>WAVE 1/7</span>
          </div>

          {/* Touch joystick visual */}
          {joyActive && (
            <div
              className="joystick-ring"
              style={{ left: joyStart.x - 40, top: joyStart.y - 40 }}
            >
              <div
                className="joystick-handle"
                style={{
                  transform: `translate(${Math.max(-40, Math.min(40, joyCurrent.x - joyStart.x))}px, ${Math.max(-40, Math.min(40, joyCurrent.y - joyStart.y))}px)`
                }}
              />
            </div>
          )}

          {/* Mobile attack buttons */}
          <div className="sw-mobile-attacks">
            {attackTypes.map((type, index) => {
              const def = ATTACK_DEFS_SW[type];
              return (
                <button
                  key={type}
                  className="sw-attack-mobile-btn"
                  style={{ borderColor: def.color, color: def.color, position: 'relative', overflow: 'hidden' }}
                  onTouchStart={(e) => { e.stopPropagation(); handleAttackBtn(index); }}
                  onClick={() => handleAttackBtn(index)}
                >
                  <div
                    ref={cdRefs[type]}
                    style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', height: '0%', transition: 'height 0.1s' }}
                  />
                  <span className="sw-btn-key" style={{ position: 'relative', zIndex: 10 }}>[{def.key}]</span>
                  <span className="sw-btn-name" style={{ position: 'relative', zIndex: 10 }}>{def.label.split(' ')[0]}</span>
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
                <span className="sw-stat-val">{finalWaves} / 7</span>
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
              <p>Hold <strong>OROCHIMARU</strong> to unlock special jutsu in future updates</p>
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
              All 7 waves defeated. The Hidden Leaf Village lies in ruin. Orochimaru reigns supreme.
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
                <span className="sw-stat-val sw-gold">7 / 7</span>
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
              <div className="sw-victory-badge">OROCHIMARU</div>
              <h3>The Forbidden Jutsu of DeFi</h3>
              <p>Immortality awaits those who hold.</p>
              <div className="sw-victory-metrics">
                <div className="sw-vm-item"><span>Supply</span><strong>690B</strong></div>
                <div className="sw-victory-metrics-divider" style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', height: 20 }} />
                <div className="sw-vm-item"><span>Network</span><strong>Ethereum</strong></div>
                <div className="sw-victory-metrics-divider" style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', height: 20 }} />
                <div className="sw-vm-item"><span>Target</span><strong>$5BN</strong></div>
              </div>
              <div className="sw-victory-btns">
                <a href="https://app.uniswap.org/swap?outputCurrency=0x89fabE8405CFDE3f6aEeD8804e3BA4a10b7e21d3" target="_blank" rel="noopener noreferrer" className="sw-buy-btn">
                  Buy OROCHIMARU
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
