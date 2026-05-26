import { useEffect, useRef, useState } from 'react';
import { 
  Swords, 
  Gamepad2, 
  Trophy,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';
import { GameEngine } from '../game/GameEngine';
import { synth } from '../audio/SynthManager';
import type { Reanimation } from '../hooks/useGameStore';

interface CombatViewProps {
  reanimations: Record<string, Reanimation>;
  combatHighScore: number;
  updateCombatHighScore: (wave: number) => boolean;
  addTokens: (amount: number) => void;
  onExit: () => void;
}

export function CombatView({
  reanimations,
  combatHighScore,
  updateCombatHighScore,
  addTokens,
  onExit
}: CombatViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // UI state
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [waveReached, setWaveReached] = useState(1);
  const [tokensWon, setTokensWon] = useState(0);

  // Joystick touch tracking
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickStart, setJoystickStart] = useState({ x: 0, y: 0 });
  const [joystickCurrent, setJoystickCurrent] = useState({ x: 0, y: 0 });

  // Canvas size state
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 360, height: 420 });

  // Map reanimation counts to simpler object for engine
  const getReanimationsCount = () => {
    return {
      soundFourCount: reanimations.soundFour.count,
      kimimaroCount: reanimations.kimimaro.count,
      tobiramaCount: reanimations.tobirama.count,
      hashiramaCount: reanimations.hashirama.count
    };
  };

  // Adjust canvas size for aspect ratio lock on load/resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        // Lock aspect ratio height based on screen size
        const height = Math.min(window.innerHeight - 200, 480);
        setCanvasDimensions({ width, height });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle battle initialization
  const startBattle = () => {
    synth.playRumble();
    setGameState('playing');
    setTokensWon(0);
    setWaveReached(1);

    // Short timeout to let state update and render canvas
    setTimeout(() => {
      if (!canvasRef.current) return;

      const engine = new GameEngine({
        canvas: canvasRef.current,
        reanimations: getReanimationsCount(),
        onGameOver: (wave, tokens) => {
          setWaveReached(wave);
          setTokensWon(tokens);
          setGameState('gameover');
          
          // Save high score and award tokens
          updateCombatHighScore(wave);
          addTokens(tokens);
        },
        onWaveComplete: (wave) => {
          setWaveReached(wave + 1);
        },
        onPlaySound: (type) => {
          if (type === 'slash') synth.playSlash();
          if (type === 'snake') synth.playSnake();
          if (type === 'rumble') synth.playRumble();
        }
      });

      engineRef.current = engine;
      engine.start();
    }, 100);
  };

  // Cleanup engine on unmount
  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.cleanup();
      }
    };
  }, []);

  // Joystick touch handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (gameState !== 'playing') return;
    const touch = e.touches[0];
    setJoystickActive(true);
    setJoystickStart({ x: touch.clientX, y: touch.clientY });
    setJoystickCurrent({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!joystickActive || gameState !== 'playing') return;
    const touch = e.touches[0];
    setJoystickCurrent({ x: touch.clientX, y: touch.clientY });

    // Calculate displacement vector
    const dx = touch.clientX - joystickStart.x;
    const dy = touch.clientY - joystickStart.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Normalize to max range (e.g. 50px)
    const maxRange = 50;
    const factor = dist > maxRange ? maxRange / dist : 1;
    
    const vectorX = (dx * factor) / maxRange;
    const vectorY = (dy * factor) / maxRange;

    if (engineRef.current) {
      engineRef.current.touchVector = { x: vectorX, y: vectorY };
    }
  };

  const handleTouchEnd = () => {
    setJoystickActive(false);
    if (engineRef.current) {
      engineRef.current.touchVector = null;
    }
  };

  // Click drag emulator for desktop testing
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (gameState !== 'playing') return;
    setJoystickActive(true);
    setJoystickStart({ x: e.clientX, y: e.clientY });
    setJoystickCurrent({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!joystickActive || gameState !== 'playing') return;
    setJoystickCurrent({ x: e.clientX, y: e.clientY });

    const dx = e.clientX - joystickStart.x;
    const dy = e.clientY - joystickStart.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    const maxRange = 50;
    const factor = dist > maxRange ? maxRange / dist : 1;
    
    const vectorX = (dx * factor) / maxRange;
    const vectorY = (dy * factor) / maxRange;

    if (engineRef.current) {
      engineRef.current.touchVector = { x: vectorX, y: vectorY };
    }
  };

  const handleMouseUp = () => {
    setJoystickActive(false);
    if (engineRef.current) {
      engineRef.current.touchVector = null;
    }
  };

  // Helper values
  const hasSummons = Object.values(getReanimationsCount()).some(val => val > 0);

  return (
    <div className="combat-view-container" ref={containerRef}>
      {/* Header navigations */}
      <div className="combat-nav-bar">
        <button onClick={onExit} className="back-btn-hub">
          <ArrowLeft size={16} />
          <span>Exit Lair</span>
        </button>
        <span className="combat-title">Ryuchi Cave Trials</span>
      </div>

      {gameState === 'menu' && (
        <div className="combat-menu-card">
          <div className="menu-icon-glow animate-pulse">
            <Swords size={48} className="text-purple" />
          </div>
          
          <h2 className="menu-header">Survive the Raid!</h2>
          <p className="menu-desc">
            Anbu scouts have tracked your laboratory! Control Orochimaru to defend the ritual chamber and secure your points.
          </p>

          {/* Reanimation modifiers indicators */}
          <div className="modifiers-panel">
            <h4 className="modifiers-title">Reanimated Shinobi Modifiers:</h4>
            {hasSummons ? (
              <div className="modifiers-grid">
                {reanimations.soundFour.count > 0 && (
                  <div className="mod-badge">
                    🎵 Tayuya Lvl {reanimations.soundFour.count} (Sound Note Bullets)
                  </div>
                )}
                {reanimations.kimimaro.count > 0 && (
                  <div className="mod-badge">
                    🦴 Kimimaro Lvl {reanimations.kimimaro.count} (4-Way Bone Shards)
                  </div>
                )}
                {reanimations.tobirama.count > 0 && (
                  <div className="mod-badge">
                    🌊 Tobirama Lvl {reanimations.tobirama.count} (Piercing Water Dragon)
                  </div>
                )}
                {reanimations.hashirama.count > 0 && (
                  <div className="mod-badge">
                    🌳 Hashirama Lvl {reanimations.hashirama.count} (Continuous Wood Shield)
                  </div>
                )}
              </div>
            ) : (
              <p className="no-modifiers-text">
                No active Edo Tensei shinobis. Reanimate Hokages in the Altar tab to gain defensive auto-attacks!
              </p>
            )}
          </div>

          {/* Instructions */}
          <div className="control-guide">
            <div className="guide-item">
              <span className="key-icon">W A S D</span>
              <span>or virtual joystick to move Orochimaru.</span>
            </div>
            <div className="guide-item">
              <span className="key-icon">AUTO</span>
              <span>Attacks trigger automatically.</span>
            </div>
          </div>

          {/* Highscore Info */}
          <div className="combat-highscore-badge">
            <Trophy size={14} className="text-yellow" />
            <span>High Score: Wave {combatHighScore}</span>
          </div>

          <button onClick={startBattle} className="start-battle-btn">
            <Gamepad2 size={18} />
            <span>START TRIALS</span>
          </button>
        </div>
      )}

      {gameState === 'playing' && (
        <div 
          className="canvas-container"
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
            width={canvasDimensions.width} 
            height={canvasDimensions.height}
            className="combat-canvas"
          />

          {/* Touch Joystick Overlay Graphic */}
          {joystickActive && (
            <div 
              className="joystick-ring"
              style={{
                left: joystickStart.x - 40,
                top: joystickStart.y - 40
              }}
            >
              <div 
                className="joystick-handle"
                style={{
                  transform: `translate(${
                    Math.min(Math.max(joystickCurrent.x - joystickStart.x, -40), 40)
                  }px, ${
                    Math.min(Math.max(joystickCurrent.y - joystickStart.y, -40), 40)
                  }px)`
                }}
              />
            </div>
          )}

          {/* Small floating hint on mobile */}
          <p className="mobile-touch-hint">Drag anywhere to move</p>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="combat-gameover-card">
          <h2 className="gameover-header text-red animate-pulse">DEFEAT</h2>
          <p className="gameover-desc">
            Your clone cells collapsed under pressure, but you collected enough data!
          </p>

          <div className="results-panel">
            <div className="result-row">
              <span>Wave Reached:</span>
              <strong>Wave {waveReached}</strong>
            </div>
            <div className="result-row">
              <span>Points Earned:</span>
              <strong className="text-gold">+{tokensWon.toLocaleString()} PTS</strong>
            </div>
          </div>

          <div className="action-buttons-column">
            <button onClick={startBattle} className="retry-battle-btn">
              <RefreshCw size={16} />
              <span>Retry Trial</span>
            </button>
            <button onClick={onExit} className="back-to-menu-btn">
              <span>Return to Hub</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
export default CombatView;
