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
import { useGameStore, WEEKLY_CHALLENGE } from '../hooks/useGameStore';
import { supabase } from '../lib/supabaseClient';
import { COUNTRIES } from '../lib/countries';

type ScreenState = 'start' | 'playing' | 'gameover' | 'victory';

interface SerpentsWrathWebViewProps {
  onExit: () => void;
  onGoToLeaderboard: () => void;
}

const ATTACK_DEFS_SW = {
  snake_strike: { key: 'Q', label: 'Snake Strike', color: '#39ff14', cooldown: 500 },
  shadow_snake: { key: 'E', label: 'Shadow Snake', color: '#8b00ff', cooldown: 1000 },
  kusanagi: { key: 'R', label: 'Kusanagi', color: '#ffd700', cooldown: 2000 },
  edo_tensei: { key: 'Space', label: 'Edo Tensei', color: '#ff0066', cooldown: 12000 },
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
  const [swHighScore, setSwHighScore] = useState(0);


  // Leaderboard and high score reset
  useEffect(() => {
    const isReset = localStorage.getItem('orochimaru_leaderboard_reset_v5');
    if (!isReset) {
      localStorage.setItem('orochimaru_leaderboard', JSON.stringify([]));
      localStorage.setItem('orochimaru_highscore', '0');
      localStorage.setItem('orochimaru_leaderboard_reset_v5', 'true');
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

  const [canvasDim, setCanvasDim] = useState({ w: 1000, h: 600 });
  
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

  // HUD DOM Refs for 60 FPS direct updates
  const hpBarRef = useRef<HTMLDivElement>(null);
  const hpTextRef = useRef<HTMLSpanElement>(null);
  const ckBarRef = useRef<HTMLDivElement>(null);
  const ckTextRef = useRef<HTMLSpanElement>(null);
  const scoreTextRef = useRef<HTMLSpanElement>(null);
  const waveTextRef = useRef<HTMLSpanElement>(null);
  const killsTextRef = useRef<HTMLSpanElement>(null);

  // New refs for pause and boss HP
  const pauseOverlayRef = useRef<HTMLDivElement>(null);
  const bossHpContainerRef = useRef<HTMLDivElement>(null);
  const bossHpBarRef = useRef<HTMLDivElement>(null);
  const bossHpTextRef = useRef<HTMLSpanElement>(null);
  const summonBarRef = useRef<HTMLDivElement>(null);

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
          
          let earned = 0;
          if (stats.wave > 3) earned += 25;
          if (stats.weeklyChallengeCompleted) earned += 50; // Weekly challenge bonus
          if (earned > 0) store.addTokens(earned);
          store.recordRun(stats.wave);
          
          setScreen('gameover');
          synth.playSnake();
        } else if (state === GameState.VICTORY) {
          setFinalScore(stats.score);
          setFinalKills(stats.kills);
          setFinalWaves(7);
          
          let earned = 25 + 100 + 50; // Wave 3 + Victory + Boss
          if (stats.weeklyChallengeCompleted) earned += 50; // Weekly challenge bonus
          store.addTokens(earned);
          store.recordRun(8);
          
          setScreen('victory');
          synth.playRumble();
        }
      }, store.unlockedItems);

      engine.audio.setMuted(store.muteAudio);
      engineRef.current = engine;
      engine.start();
    }, 100);
  }, [store.muteAudio, store.unlockedItems]);

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

        // Summon bar
        if (summonBarRef.current && state.maxSummonCharge) {
          const pct = Math.min(100, ((state.summonCharge ?? 0) / state.maxSummonCharge) * 100);
          summonBarRef.current.style.width = `${pct}%`;
          summonBarRef.current.style.background = pct >= 100
            ? 'linear-gradient(90deg, #ffd700, #ff8c00)'
            : 'linear-gradient(90deg, #a855f7, #6d28d9)';
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

      // Check if wallet exists on leaderboard
      const { data: existingData, error: fetchError } = await supabase
        .from('leaderboard')
        .select('*')
        .eq('wallet_address', trimmedWallet)
        .limit(1);

      if (fetchError) throw fetchError;

      if (existingData && existingData.length > 0) {
        const existingRecord = existingData[0];
        if (finalScore > existingRecord.score) {
          // Update existing score if the new score is higher
          const { error: updateError } = await supabase
            .from('leaderboard')
            .update({
              name: trimmedName,
              score: finalScore,
              kills: finalKills,
              waves: finalWaves,
              platform: 'web',
              email: trimmedEmail,
              country: playerCountry
            })
            .eq('wallet_address', trimmedWallet);
          if (updateError) throw updateError;
        }
      } else {
        // Insert new record
        const { error: insertError } = await supabase.from('leaderboard').insert({
          name: trimmedName,
          score: finalScore,
          kills: finalKills,
          waves: finalWaves,
          platform: 'web',
          email: trimmedEmail,
          wallet_address: trimmedWallet,
          country: playerCountry
        });
        if (insertError) throw insertError;
      }
      
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

  const attackKeys = ['snake_strike', 'shadow_snake', 'kusanagi', 'edo_tensei'] as const;

  return (
    <div className="sw-web-wrapper" ref={containerRef}>
      {/* Web Header Bar */}
      <div className="sw-web-topbar">
        <button onClick={onExit} className="back-btn-hub">
          <ArrowLeft size={15} />
          <span>Hub</span>
        </button>
        <div className="sw-web-title-center" style={{ opacity: screen === 'playing' ? 1 : 0, pointerEvents: 'none', transition: 'opacity 0.25s ease' }}>
          <span className="sw-web-subtitle">ECOSYSTEM COMBAT SIMULATOR</span>
          <h2 className="sw-web-game-title">SERPENT FURY</h2>
        </div>
        <div className="sw-web-badges">
          <span className="sw-web-badge platform">🖥️ WEB CONSOLE</span>
          {screen === 'playing' && (
            <button 
              onClick={() => engineRef.current?.togglePause()}
              className="sound-toggle-mini-web"
              title="Pause Game (P)"
            >
              <span style={{ fontWeight: 'bold', fontSize: '10px' }}>PAUSE</span>
            </button>
          )}
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
              {/* Left Column: Hero & Core Action */}
              <div className="sw-start-col-left">
                {/* Circular Avatar */}
                <div className="sw-start-avatar-wrap">
                  <img src={orochimaruFace} alt="Orochimaru" className="sw-start-avatar" />
                  <div className="sw-start-avatar-glow"></div>
                </div>

                {/* Title & Subtitle */}
                <h1 className="sw-start-title">SERPENT FURY</h1>
                <p className="sw-start-subtitle">UNLEASH THE IMMORTAL</p>

                {/* Sleek Pill Badge */}
                <div className="sw-start-pill-badge">
                  <span>🐍 Powered by </span>
                  <a href="https://orochimaru.live" target="_blank" rel="noopener noreferrer" className="sw-start-pill-badge-link">
                    $orochimaru.live
                  </a>
                </div>

                {/* Enter Arena Button */}
                <button onClick={startGame} className="sw-start-arena-btn" style={{ marginTop: '10px' }}>
                  <span>⚔️ ENTER THE ARENA</span>
                </button>

                {/* High Score */}
                <div className="sw-start-highscore" style={{ marginTop: '5px' }}>
                  🏆 High Score: {swHighScore.toLocaleString()}
                </div>

                {/* Instructions text */}
                <p className="sw-start-instructions" style={{ marginTop: '5px' }}>
                  WASD/Arrows to move | 1 2 3 4 or Space to attack<br />
                  Survive 7 waves + defeat the <strong>BOSS</strong> to claim victory
                </p>
              </div>

              {/* Right Column: Dashboard (Streak, Challenge, Leaderboard) */}
              <div className="sw-start-col-right">
                {/* Dashboard Stats (Streak + Challenge) */}
                <div className="sw-dashboard-stats-card">
                  {store.survivalStreak > 0 && (
                    <div className="sw-streak-indicator-row">
                      <span className="streak-fire">🔥 RUN STREAK:</span>
                      <span className="streak-val">{store.survivalStreak} / 3 Runs</span>
                    </div>
                  )}

                  <div className="sw-weekly-challenge-box">
                    <div className="challenge-header">🏆 WEEKLY CHALLENGE</div>
                    <div className="challenge-title">{WEEKLY_CHALLENGE.title}</div>
                    <div className="challenge-desc">{WEEKLY_CHALLENGE.description}</div>
                    <div className="challenge-points">+{WEEKLY_CHALLENGE.bonusPts} PTS bonus · Expires {WEEKLY_CHALLENGE.expiresAt}</div>
                  </div>
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

            {/* Top-Center Boss HP HUD */}
            <div ref={bossHpContainerRef} className="web-hud-boss-container" style={{ display: 'none', position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', width: '50%', zIndex: 10 }}>
              <div style={{ textAlign: 'center', marginBottom: '5px' }}>
                <span ref={bossHpTextRef} style={{ color: '#ff0044', fontFamily: 'var(--font-heading)', fontSize: '14px', textShadow: '0 0 5px #ff0000' }}>BOSS HP</span>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.7)', border: '2px solid #ff0044', height: '14px', width: '100%' }}>
                <div ref={bossHpBarRef} style={{ background: 'linear-gradient(90deg, #8b0000, #ff0044)', height: '100%', width: '100%', transition: 'width 0.1s linear' }}></div>
              </div>
            </div>

            {/* Summon Bar */}
            <div style={{ position: 'absolute', bottom: '70px', left: '50%', transform: 'translateX(-50%)', width: '260px', zIndex: 20, textAlign: 'center' }}>
              <div style={{ fontSize: '9px', color: '#a855f7', fontFamily: 'var(--font-heading)', letterSpacing: '2px', marginBottom: '3px', textShadow: '0 0 6px #a855f7' }}>
                ⚡ REANIMATION SUMMON
              </div>
              <div style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(168,85,247,0.4)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                <div ref={summonBarRef} style={{ height: '100%', width: '0%', transition: 'width 0.3s ease', borderRadius: '4px' }} />
              </div>
              <div style={{ fontSize: '8px', color: 'rgba(168,85,247,0.6)', marginTop: '2px' }}>Fill by getting kills — 5 to summon</div>
            </div>

            {/* Pause Overlay */}
            <div ref={pauseOverlayRef} style={{ display: 'none', position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50, alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
              <div style={{ textAlign: 'center' }}>
                <h1 style={{ color: '#fff', fontSize: '48px', fontFamily: 'var(--font-heading)', letterSpacing: '4px', textShadow: '0 0 20px #bd00ff', margin: 0 }}>PAUSED</h1>
                <p style={{ color: '#ccc', marginTop: '10px' }}>Press P or click PAUSE to resume</p>
                <button 
                  onClick={() => engineRef.current?.togglePause()}
                  style={{ marginTop: '20px', padding: '10px 30px', background: 'linear-gradient(135deg, #bd00ff, #ff0066)', border: 'none', color: '#fff', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px' }}
                >
                  RESUME
                </button>
              </div>
            </div>

            {/* Bottom-Center HUD (Q / W / E / R Combat cards) */}
            <div className="web-hud-bottom-center" style={{ zIndex: 40 }}>
              {attackKeys.map((type, index) => {
                const def = ATTACK_DEFS_SW[type];
                let colorClass = 'green-glow';
                if (type === 'shadow_snake') colorClass = 'purple-glow';
                else if (type === 'kusanagi') colorClass = 'gold-glow';
                else if (type === 'edo_tensei') colorClass = 'red-glow';

                return (
                  <button
                    key={type}
                    className={`web-hud-key-card ${colorClass}`}
                    onClick={() => {
                      engineRef.current?.triggerAttack(index);
                      synth.playClick();
                    }}
                    style={{ cursor: 'pointer', background: 'none', border: 'none', textAlign: 'center', position: 'relative', overflow: 'hidden' }}
                  >
                    {/* Cooldown Overlay */}
                    <div ref={cdRefs[type]} className="web-hud-key-cooldown" style={{ height: '0%' }} />
                    
                    {/* Key bind */}
                    <span className="whk-key">[{def.key}]</span>
                    {/* Label */}
                    <span className="whk-label">{def.label}</span>
                  </button>
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
                  {scoreSubmitted ? 'SUBMITTING...' : 'SUBMIT SCORE'}
                </button>
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
                  {scoreSubmitted ? 'SUBMITTING...' : 'RECORD SCORE'}
                </button>
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
