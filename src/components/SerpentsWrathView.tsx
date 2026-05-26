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
import { supabase } from '../lib/supabaseClient';
import { COUNTRIES } from '../lib/countries';

type ScreenState = 'start' | 'playing' | 'gameover' | 'victory';

interface SerpentsWrathViewProps {
  onExit: () => void;
  onGoToLeaderboard: () => void;
}

const ATTACK_DEFS_SW = {
  snake_strike: { key: 'Q', label: 'Snake Strike', color: '#39ff14', cooldown: 500 },
  shadow_snake: { key: 'E', label: 'Shadow Snake', color: '#8b00ff', cooldown: 1000 },
  kusanagi: { key: 'R', label: 'Kusanagi', color: '#ffd700', cooldown: 2000 },
  edo_tensei: { key: 'Space', label: 'Edo Tensei', color: '#ff0066', cooldown: 12000 },
};



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
  const [swHighScore, setSwHighScore] = useState(0);
  const [showGiftModal, setShowGiftModal] = useState(false);

  // Leaderboard and high score reset
  useEffect(() => {
    const isReset = localStorage.getItem('orochimaru_leaderboard_reset_v4');
    if (!isReset) {
      localStorage.setItem('orochimaru_leaderboard', JSON.stringify([]));
      localStorage.setItem('orochimaru_highscore', '0');
      localStorage.setItem('orochimaru_leaderboard_reset_v4', 'true');
    }
  }, []);

  useEffect(() => {
    async function loadMenuScores() {
      try {
        const { data, error } = await supabase
          .from('leaderboard')
          .select('*')
          .order('score', { ascending: false })
          .limit(4);

        if (error) throw error;

        if (data) {
          setTopScores(data.map(item => ({
            name: item.name,
            score: item.score,
            waves: item.waves
          })));
        } else {
          setTopScores([]);
        }
      } catch (err) {
        console.warn('Failed to fetch menu high scores from Supabase:', err);
        // Fallback to local cache
        try {
          const saved = localStorage.getItem('orochimaru_leaderboard');
          const list = saved ? JSON.parse(saved) : [];
          list.sort((a: any, b: any) => b.score - a.score);
          setTopScores(list.slice(0, 4).map((item: any) => ({
            name: item.name,
            score: item.score,
            waves: item.waves
          })));
        } catch {
          setTopScores([]);
        }
      }
    }
    loadMenuScores();

    const hs = localStorage.getItem('orochimaru_highscore');
    if (hs) {
      setSwHighScore(parseInt(hs, 10));
    } else {
      setSwHighScore(0);
    }
  }, [screen]);

  const [canvasDim, setCanvasDim] = useState({ w: 360, h: 500 });
  // Leaderboard entry name & metadata
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('orochimaru_player_name') || '';
  });
  const [playerEmail, setPlayerEmail] = useState(() => {
    return localStorage.getItem('orochimaru_player_email') || '';
  });
  const [playerWallet, setPlayerWallet] = useState(() => {
    return localStorage.getItem('orochimaru_player_wallet') || '';
  });
  const [playerCountry, setPlayerCountry] = useState(() => {
    return localStorage.getItem('orochimaru_player_country') || 'US';
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

  // New refs for pause and boss HP
  const pauseOverlayRef = useRef<HTMLDivElement>(null);
  const bossHpContainerRef = useRef<HTMLDivElement>(null);
  const bossHpBarRef = useRef<HTMLDivElement>(null);
  const bossHpTextRef = useRef<HTMLSpanElement>(null);

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
        } else if (state === GameState.PAUSED) {
          if (stats.wave === 2) {
            setShowGiftModal(true);
          }
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

  // Frame loop in React to update the overlay HUD elements directly.
  // NOTE: We do NOT check engineRef.current in the outer guard — the engine is
  // created inside a setTimeout AFTER setScreen('playing'), so the effect would
  // fire before the engine is ready. We let the RAF loop spin until the engine
  // becomes available, then start updating the DOM refs.
  useEffect(() => {
    if (screen !== 'playing') return;

    let frameId: number;
    const updateOverlayHUD = () => {
      const engine = engineRef.current;

      if (engine) {
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

        // Pause Overlay
        if (pauseOverlayRef.current) {
          pauseOverlayRef.current.style.display = state.gameState === 'paused' ? 'flex' : 'none';
        }

        // Boss HP
        if (bossHpContainerRef.current) {
          if (state.isBossWave && state.bossMaxHp && state.bossHp !== undefined) {
            bossHpContainerRef.current.style.display = 'block';
            if (bossHpBarRef.current) {
              bossHpBarRef.current.style.width = `${Math.max(0, (state.bossHp / state.bossMaxHp) * 100)}%`;
            }
            if (bossHpTextRef.current) {
              bossHpTextRef.current.innerText = `${state.bossName} - ${Math.ceil(state.bossHp)} / ${Math.ceil(state.bossMaxHp)}`;
            }
          } else {
            bossHpContainerRef.current.style.display = 'none';
          }
        }
      }

      // Always re-queue — the engine may not be ready yet (setTimeout delay)
      frameId = requestAnimationFrame(updateOverlayHUD);
    };

    frameId = requestAnimationFrame(updateOverlayHUD);
    return () => cancelAnimationFrame(frameId);
  }, [screen]);

  useEffect(() => {
    return () => { engineRef.current?.cleanup(); };
  }, []);

  const submitScore = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = playerName.trim();
    const trimmedEmail = playerEmail.trim();
    const trimmedWallet = playerWallet.trim();

    if (!trimmedName || trimmedName.length < 2) {
      alert('Please enter a valid Shinobi Name (at least 2 characters).');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      alert('Please enter a valid Email Address.');
      return;
    }

    const ethRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethRegex.test(trimmedWallet)) {
      alert('Please enter a valid Ethereum Wallet Address (must start with 0x and be 42 characters long, e.g., 0x71C229712aB297a7e8e50bB41A284E29037c89E1).');
      return;
    }

    if (scoreSubmitted) return;

    try {
      setScoreSubmitted(true);
      
      // Save local profile defaults for convenience
      localStorage.setItem('orochimaru_player_name', trimmedName);
      localStorage.setItem('orochimaru_player_email', trimmedEmail);
      localStorage.setItem('orochimaru_player_wallet', trimmedWallet);
      localStorage.setItem('orochimaru_player_country', playerCountry);

      // Insert into Supabase database
      const { error } = await supabase.from('leaderboard').insert({
        name: trimmedName,
        score: finalScore,
        kills: finalKills,
        waves: finalWaves,
        platform: 'mobile',
        email: trimmedEmail,
        wallet_address: trimmedWallet,
        country: playerCountry
      });

      if (error) throw error;
      
      // Fetch current board, update local cache
      try {
        const { data } = await supabase
          .from('leaderboard')
          .select('*')
          .order('score', { ascending: false })
          .limit(100);
        if (data) {
          const mapped = data.map(item => ({
            id: item.id,
            name: item.name,
            score: item.score,
            kills: item.kills,
            waves: item.waves,
            platform: item.platform,
            timestamp: new Date(item.created_at).getTime(),
            email: item.email,
            walletAddress: item.wallet_address,
            country: item.country
          }));
          localStorage.setItem('orochimaru_leaderboard', JSON.stringify(mapped));
        }
      } catch (cacheErr) {
        console.warn('Failed to update local cache:', cacheErr);
      }

      synth.playClick();
      onGoToLeaderboard();
    } catch (err: any) {
      console.error('Failed to submit score to Supabase:', err);
      setScoreSubmitted(false);
      const detail = err?.message || err?.details || JSON.stringify(err);
      alert(`Score submission failed: ${detail}\n\nPlease check your connection and try again.`);
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
        <div className="sw-badges">
          {screen === 'playing' && (
            <button 
              onClick={() => engineRef.current?.togglePause()}
              className="sound-toggle-mini"
              title="Pause Game (P)"
            >
              <span style={{ fontWeight: 'bold', fontSize: '10px' }}>PAUSE</span>
            </button>
          )}
          <button 
            onClick={store.toggleMute} 
            className="sound-toggle-mini"
            title={store.muteAudio ? "Unmute" : "Mute"}
          >
            {store.muteAudio ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <span className="sw-badge">GAME V2</span>
        </div>
      </div>

      {/* ── START SCREEN ─────────────────────────────────── */}
      {screen === 'start' && (
        <div className="sw-screen start-screen">
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
              🏆 High Score: {swHighScore.toLocaleString()}
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
                  {topScores.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-muted text-center" style={{ padding: '15px 0', textAlign: 'center' }}>
                        No rankings recorded yet.
                      </td>
                    </tr>
                  ) : (
                    topScores.map((entry, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td>{entry.name}</td>
                        <td>{entry.score.toLocaleString()}</td>
                        <td>{entry.waves}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
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

          {/* Top-Center Boss HP HUD */}
          <div ref={bossHpContainerRef} style={{ display: 'none', position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)', width: '50%', zIndex: 10 }}>
            <div style={{ textAlign: 'center', marginBottom: '2px' }}>
              <span ref={bossHpTextRef} style={{ color: '#ff0044', fontFamily: 'var(--font-heading)', fontSize: '10px', textShadow: '0 0 3px #ff0000' }}>BOSS HP</span>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid #ff0044', height: '10px', width: '100%' }}>
              <div ref={bossHpBarRef} style={{ background: 'linear-gradient(90deg, #8b0000, #ff0044)', height: '100%', width: '100%', transition: 'width 0.1s linear' }}></div>
            </div>
          </div>

          {/* Pause Overlay */}
          <div ref={pauseOverlayRef} style={{ display: 'none', position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50, alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ color: '#fff', fontSize: '32px', fontFamily: 'var(--font-heading)', letterSpacing: '2px', textShadow: '0 0 15px #bd00ff', margin: 0 }}>PAUSED</h1>
              <button 
                onClick={() => engineRef.current?.togglePause()}
                style={{ marginTop: '20px', padding: '10px 30px', background: 'linear-gradient(135deg, #bd00ff, #ff0066)', border: 'none', color: '#fff', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px' }}
              >
                RESUME
              </button>
            </div>
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
            {/* Virtual Dash Button */}
            <button
              className="sw-attack-mobile-btn"
              style={{ borderColor: '#a855f7', color: '#a855f7', position: 'relative', overflow: 'hidden' }}
              onTouchStart={(e) => { 
                e.stopPropagation(); 
                engineRef.current?.player.triggerDash(joyActive ? engineRef.current?.touchVector : null); 
                synth.playClick(); 
              }}
              onClick={() => { 
                engineRef.current?.player.triggerDash(joyActive ? engineRef.current?.touchVector : null); 
                synth.playClick(); 
              }}
            >
              <span className="sw-btn-key" style={{ position: 'relative', zIndex: 10 }}>[SHIFT]</span>
              <span className="sw-btn-name" style={{ position: 'relative', zIndex: 10 }}>DASH</span>
            </button>

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
              <div className="form-group">
                <label htmlFor="playerName">SHINOBI NAME</label>
                <input
                  type="text"
                  id="playerName"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value.slice(0, 15))}
                  placeholder="Your name..."
                  maxLength={15}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="playerEmail">EMAIL ADDRESS</label>
                <input
                  type="email"
                  id="playerEmail"
                  value={playerEmail}
                  onChange={(e) => setPlayerEmail(e.target.value)}
                  placeholder="email@domain.com"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="playerWallet">ETH WALLET ADDRESS</label>
                <input
                  type="text"
                  id="playerWallet"
                  value={playerWallet}
                  onChange={(e) => setPlayerWallet(e.target.value)}
                  placeholder="0x..."
                  pattern="^0x[a-fA-F0-9]{40}$"
                  title="Ethereum address must start with 0x and be 42 characters long"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="playerCountry">COUNTRY</label>
                <select
                  id="playerCountry"
                  value={playerCountry}
                  onChange={(e) => setPlayerCountry(e.target.value)}
                  required
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <button type="submit" className="submit-score-btn" disabled={scoreSubmitted}>
                {scoreSubmitted ? 'SAVING...' : 'RECORD'}
              </button>
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
              <div className="form-group">
                <label htmlFor="playerNameVictory">SHINOBI NAME</label>
                <input
                  type="text"
                  id="playerNameVictory"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value.slice(0, 15))}
                  placeholder="Your name..."
                  maxLength={15}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="playerEmailVictory">EMAIL ADDRESS</label>
                <input
                  type="email"
                  id="playerEmailVictory"
                  value={playerEmail}
                  onChange={(e) => setPlayerEmail(e.target.value)}
                  placeholder="email@domain.com"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="playerWalletVictory">ETH WALLET ADDRESS</label>
                <input
                  type="text"
                  id="playerWalletVictory"
                  value={playerWallet}
                  onChange={(e) => setPlayerWallet(e.target.value)}
                  placeholder="0x..."
                  pattern="^0x[a-fA-F0-9]{40}$"
                  title="Ethereum address must start with 0x and be 42 characters long"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="playerCountryVictory">COUNTRY</label>
                <select
                  id="playerCountryVictory"
                  value={playerCountry}
                  onChange={(e) => setPlayerCountry(e.target.value)}
                  required
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <button type="submit" className="submit-score-btn" disabled={scoreSubmitted}>
                {scoreSubmitted ? 'SAVING...' : 'RECORD'}
              </button>
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
      {showGiftModal && (
        <div className="gift-modal-overlay">
          <div className="gift-modal-card animate-scale-in">
            <div className="gift-icon-glow">🎁</div>
            <h2 className="gift-title">SHINOBI GIFT UNLOCKED!</h2>
            <p className="gift-desc">
              Congratulations, Genin! You successfully survived the first raid wave.
            </p>
            <div className="gift-reward-box">
              <span className="gift-reward-label">YOUR REWARD</span>
              <strong className="gift-reward-value">+250 PTS</strong>
            </div>
            <div className="gift-promo-banner">
              <div className="promo-text-highlight">🏆 LIMITED TIME QUEST:</div>
              <p className="promo-details">
                First person to gather all <strong>5 Forbidden NFTs</strong> gets a <strong>$100 Cash reward!</strong>
              </p>
              <p className="promo-encourage">
                Keep playing to win more PTS, reanimate stronger legends, and claim your glory!
              </p>
            </div>
            <button 
              onClick={() => {
                store.addTokens(250);
                if (engineRef.current) {
                  engineRef.current.resume();
                }
                setShowGiftModal(false);
              }}
              className="gift-claim-btn"
            >
              CLAIM PTS & CONTINUE BATTLE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SerpentsWrathView;
