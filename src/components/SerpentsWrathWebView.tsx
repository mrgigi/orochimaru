import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Skull, 
  Swords, 
  Trophy, 
  RefreshCw, 
  ArrowLeft,
  Zap,
  Volume2,
  VolumeX
} from 'lucide-react';
import { GameEngine } from '../game/sw/GameEngine';
import { GameState } from '../game/sw/types';
import { synth } from '../audio/SynthManager';
import orochimaruFace from '../assets/orochimaru_face.png';
import { useGameStore } from '../hooks/useGameStore';

type ScreenState = 'start' | 'playing' | 'gameover' | 'victory';

interface SerpentsWrathWebViewProps {
  onExit: () => void;
  onGoToLeaderboard: () => void;
}

const ATTACK_DEFS_SW = {
  snake_strike: { key: 'Q', label: 'Snake Strike', color: '#39ff14', cooldown: 500 },
  shadow_snake: { key: 'E', label: 'Shadow Snake', color: '#8b00ff', cooldown: 1000 },
  kusanagi: { key: 'R', label: 'Kusanagi', color: '#ffd700', cooldown: 2000 },
  edo_tensei: { key: 'Space', label: 'Edo Tensei', color: '#ff0066', cooldown: 5000 },
};



export function SerpentsWrathWebView({ onExit, onGoToLeaderboard }: SerpentsWrathWebViewProps) {
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
        audioRef.current.volume = 0.12;
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
  const [topScores, setTopScores] = useState<{name: string, score: number, waves: number}[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('orochimaru_leaderboard');
      let list = saved ? JSON.parse(saved) : [];
      list.sort((a: any, b: any) => b.score - a.score);
      if (list.length === 0) {
        list = [
          { name: 'SerpentKing', score: 8500, waves: 7 },
          { name: 'NinjaSlayer', score: 7200, waves: 7 },
          { name: 'SnakeMaster', score: 6100, waves: 6 },
          { name: 'ShadowViper', score: 5400, waves: 5 },
        ];
      }
      setTopScores(list.slice(0, 4));
    } catch {
      setTopScores([
        { name: 'SerpentKing', score: 8500, waves: 7 },
        { name: 'NinjaSlayer', score: 7200, waves: 7 },
        { name: 'SnakeMaster', score: 6100, waves: 6 },
        { name: 'ShadowViper', score: 5400, waves: 5 },
      ]);
    }
  }, [screen]);

  const [canvasDim, setCanvasDim] = useState({ w: 1000, h: 600 });
  
  // Leaderboard entry name
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('orochimaru_player_name') || 'Shinobi_' + Math.floor(Math.random() * 900 + 100);
  });
  const [scoreSubmitted, setScoreSubmitted] = useState(false);

  // HUD DOM Refs for 60 FPS direct updates
  const hpBarRef = useRef<HTMLDivElement>(null);
  const hpTextRef = useRef<HTMLSpanElement>(null);
  const ckBarRef = useRef<HTMLDivElement>(null);
  const ckTextRef = useRef<HTMLSpanElement>(null);
  const scoreTextRef = useRef<HTMLSpanElement>(null);
  const waveTextRef = useRef<HTMLSpanElement>(null);
  const killsTextRef = useRef<HTMLSpanElement>(null);

  const cdRefs = {
    snake_strike: useRef<HTMLDivElement>(null),
    shadow_snake: useRef<HTMLDivElement>(null),
    kusanagi: useRef<HTMLDivElement>(null),
    edo_tensei: useRef<HTMLDivElement>(null),
  };

  // Compute fullscreen canvas size from container
  useEffect(() => {
    const resize = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        const h = window.innerHeight - 50; // remaining viewport height under the topbar
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
          setFinalWaves(stats.wave); // stats.wave is 1-based (so 1 to 7)
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
    }, 100);
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

      // HP Bar width and text
      if (hpBarRef.current) {
        hpBarRef.current.style.width = `${Math.max(0, (state.hp / state.maxHp) * 100)}%`;
      }
      if (hpTextRef.current) {
        hpTextRef.current.innerText = `${Math.ceil(state.hp)}`;
      }

      // Chakra Bar width and text
      if (ckBarRef.current) {
        ckBarRef.current.style.width = `${Math.max(0, (state.chakra / state.maxChakra) * 100)}%`;
      }
      if (ckTextRef.current) {
        ckTextRef.current.innerText = `${Math.ceil(state.chakra)}`;
      }

      // Metrics in Top Right
      if (scoreTextRef.current) {
        scoreTextRef.current.innerText = `SCORE: ${state.score}`;
      }
      if (waveTextRef.current) {
        waveTextRef.current.innerText = `WAVE ${state.wave + 1}/7`;
      }
      if (killsTextRef.current) {
        killsTextRef.current.innerText = `KILLS: ${state.kills}`;
      }

      // Attack cooldown overlay sliders
      const attackTypes = ['snake_strike', 'shadow_snake', 'kusanagi', 'edo_tensei'] as const;
      attackTypes.forEach(type => {
        const ref = cdRefs[type].current;
        if (ref) {
          const framesRemaining = state.cooldowns[type];
          const def = ATTACK_DEFS_SW[type];
          const maxFrames = Math.ceil(def.cooldown / (1000 / 60));
          const fraction = framesRemaining / maxFrames;

          if (framesRemaining > 0) {
            ref.style.height = `${fraction * 100}%`;
            ref.classList.add('on-cooldown');
          } else {
            ref.style.height = '0%';
            ref.classList.remove('on-cooldown');
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
        platform: 'web',
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

  const attackKeys = ['snake_strike', 'shadow_snake', 'kusanagi', 'edo_tensei'] as const;

  return (
    <div className="sw-web-wrapper" ref={containerRef}>
      {/* Web Header Bar */}
      <div className="sw-web-topbar">
        <button onClick={onExit} className="back-btn-hub">
          <ArrowLeft size={15} />
          <span>Hub</span>
        </button>
        <div className="sw-web-title-center">
          <span className="sw-web-subtitle">ECOSYSTEM COMBAT SIMULATOR</span>
          <h2 className="sw-web-game-title">SERPENT FURY</h2>
        </div>
        <div className="sw-web-badges">
          <span className="sw-web-badge platform">🖥️ WEB CONSOLE</span>
          <button 
            onClick={store.toggleMute} 
            className="sound-toggle-mini-web"
            title={store.muteAudio ? "Unmute" : "Mute"}
          >
            {store.muteAudio ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>
      </div>

      {/* Main Full-Width Play Area */}
      <div className="sw-web-immersive-arena">
        
        {/* ── START SCREEN ─────────────────────────────────── */}
        {screen === 'start' && (
          <div className="sw-web-screen start-screen">
            <div className="sw-start-content-new">
              {/* Circular Avatar */}
              <div className="sw-start-avatar-wrap">
                <img src={orochimaruFace} alt="Orochimaru" className="sw-start-avatar" />
                <div className="sw-start-avatar-glow"></div>
              </div>

              {/* Title & Subtitle */}
              <h1 className="sw-start-title">SERPENT FURY</h1>
              <p className="sw-start-subtitle">UNLEASH THE IMMORTAL</p>

              {/* Pill Box */}
              <div className="sw-start-pill-box">
                <div className="sw-start-pill-header">
                  <span>🐍 Powered by </span>
                  <a href="https://orochimaru.live" target="_blank" rel="noopener noreferrer" className="sw-start-pill-link">
                    $orochimaru.live
                  </a>
                </div>
                <p className="sw-start-pill-desc">The Immortal Serpent of DeFi — Shedding Limits, Gaining Power</p>
              </div>

              {/* Enter Arena Button */}
              <button onClick={startGame} className="sw-start-arena-btn">
                <span>⚔️ ENTER THE ARENA</span>
              </button>

              {/* Instructions text */}
              <p className="sw-start-instructions">
                WASD/Arrows to move | 1 2 3 4 or Space to attack<br />
                Survive 7 waves + defeat the <strong>BOSS</strong> to claim victory
              </p>

              {/* High Score */}
              <div className="sw-start-highscore">
                🏆 High Score: {store.combatHighScore.toLocaleString()}
              </div>

              {/* Global Leaderboard Mini Table */}
              <div className="sw-start-leaderboard">
                <h3 className="sw-start-leaderboard-title">🏆 GLOBAL LEADERBOARD</h3>
                <table className="sw-start-leaderboard-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>PLAYER</th>
                      <th>SCORE</th>
                      <th>WAVE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topScores.map((entry, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td>{entry.name}</td>
                        <td>{entry.score.toLocaleString()}</td>
                        <td>{entry.waves}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── PLAYING SCREEN ───────────────────────────────── */}
        {screen === 'playing' && (
          <div className="sw-arena-canvas-wrap-fullscreen">
            {/* Canvas */}
            <canvas
              ref={canvasRef}
              width={canvasDim.w}
              height={canvasDim.h}
              className="sw-canvas web-immersive-canvas"
            />

            {/* Top-Left HUD (HP / CK Bars Overlay) */}
            <div className="web-hud-top-left">
              {/* HP Bar */}
              <div className="web-hud-bar-row hp-row">
                <span className="web-hud-bar-label">HP</span>
                <div className="web-hud-bar-bg">
                  <div ref={hpBarRef} className="web-hud-bar-fill hp-fill" style={{ width: '100%' }} />
                </div>
                <span ref={hpTextRef} className="web-hud-bar-value">100</span>
              </div>
              
              {/* CK Bar */}
              <div className="web-hud-bar-row ck-row">
                <span className="web-hud-bar-label">CK</span>
                <div className="web-hud-bar-bg">
                  <div ref={ckBarRef} className="web-hud-bar-fill ck-fill" style={{ width: '100%' }} />
                </div>
                <span ref={ckTextRef} className="web-hud-bar-value">100</span>
              </div>
            </div>

            {/* Top-Right HUD (Score / Wave / Kills Metrics) */}
            <div className="web-hud-top-right">
              <span ref={scoreTextRef} className="web-hud-stat score">SCORE: 0</span>
              <span ref={waveTextRef} className="web-hud-stat wave">WAVE 1/7</span>
              <span ref={killsTextRef} className="web-hud-stat kills">KILLS: 0</span>
            </div>

            {/* Bottom-Center HUD (Q / W / E / R Combat cards) */}
            <div className="web-hud-bottom-center">
              {attackKeys.map(type => {
                const def = ATTACK_DEFS_SW[type];
                let colorClass = 'green-glow';
                if (type === 'shadow_snake') colorClass = 'purple-glow';
                else if (type === 'kusanagi') colorClass = 'gold-glow';
                else if (type === 'edo_tensei') colorClass = 'red-glow';

                return (
                  <div key={type} className={`web-hud-key-card ${colorClass}`}>
                    {/* Cooldown Overlay */}
                    <div ref={cdRefs[type]} className="web-hud-key-cooldown" style={{ height: '0%' }} />
                    
                    {/* Key bind */}
                    <span className="whk-key">[{def.key}]</span>
                    {/* Label */}
                    <span className="whk-label">{def.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── GAME OVER SCREEN ─────────────────────────────── */}
        {screen === 'gameover' && (
          <div className="sw-web-screen gameover-screen">
            <div className="sw-result-content">
              <div className="sw-skull-icon">
                <Skull size={48} className="text-red animate-pulse" />
              </div>

              <h2 className="sw-result-title defeat-title">SIMULATION TERMINATED</h2>
              <p className="sw-result-desc">
                The Leaf forces have overwhelmed you. Record your legacy in the blockchain database.
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
                  <span className="sw-stat-label">WAVES CLEARED</span>
                </div>
              </div>

              {/* Score submission form */}
              <form onSubmit={submitScore} className="leaderboard-submit-form">
                <label htmlFor="playerName">RECORD LEGACY (ENTER SHINOBI NAME)</label>
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
                    {scoreSubmitted ? 'SUBMITTING...' : 'SUBMIT SCORE'}
                  </button>
                </div>
              </form>

              <div className="sw-result-btns">
                <button onClick={startGame} className="sw-retry-btn">
                  <RefreshCw size={14} />
                  <span>Try Again</span>
                </button>
                <button onClick={onExit} className="back-to-menu-btn">Return to Hub</button>
              </div>
            </div>
          </div>
        )}

        {/* ── VICTORY SCREEN ───────────────────────────────── */}
        {screen === 'victory' && (
          <div className="sw-web-screen victory-screen">
            <div className="sw-result-content">
              <div className="sw-victory-glow">
                <Trophy size={48} className="text-gold animate-bounce" />
              </div>

              <h2 className="sw-result-title victory-title">VICTORY ACHIEVED</h2>
              <p className="sw-result-desc">
                All 7 waves defeated. The Leaf Village lies in ruins. Orochimaru reigns supreme!
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

              {/* Score submission form */}
              <form onSubmit={submitScore} className="leaderboard-submit-form victory-form">
                <label htmlFor="playerName">RECORD YOUR LEGACY</label>
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
                    {scoreSubmitted ? 'SUBMITTING...' : 'RECORD SCORE'}
                  </button>
                </div>
              </form>

              <div className="sw-result-btns">
                <button onClick={startGame} className="sw-retry-btn">
                  <RefreshCw size={14} />
                  <span>Play Again</span>
                </button>
                <button onClick={onExit} className="back-to-menu-btn">Return to Hub</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default SerpentsWrathWebView;
