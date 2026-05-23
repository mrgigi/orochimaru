import { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from '@/game/GameEngine';
import { GameState, GameStats, ATTACKS } from '@/game/types';

const LOGO_URL = 'https://mgx-backend-cdn.metadl.com/generate/images/317302/2026-05-23/pddtd2aaagrq/game-logo-serpents-wrath.png';

export default function Index() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    kills: 0,
    wave: 1,
    maxWave: 6,
    highScore: parseInt(localStorage.getItem('orochimaru_highscore') || '0', 10),
  });
  const [playerHp, setPlayerHp] = useState(100);
  const [playerChakra, setPlayerChakra] = useState(100);

  const handleStateChange = useCallback((state: GameState, newStats: GameStats) => {
    setGameState(state);
    setStats({ ...newStats });
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (engineRef.current) {
        engineRef.current.resize(canvas.width, canvas.height);
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const engine = new GameEngine(canvas, handleStateChange);
    engineRef.current = engine;

    return () => {
      window.removeEventListener('resize', resize);
      engine.stop();
    };
  }, [handleStateChange]);

  // Poll player HP/chakra for HUD
  useEffect(() => {
    if (gameState !== GameState.PLAYING) return;
    const interval = setInterval(() => {
      if (engineRef.current) {
        setPlayerHp(engineRef.current.player.state.hp);
        setPlayerChakra(engineRef.current.player.state.chakra);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [gameState]);

  const startGame = () => {
    if (engineRef.current) {
      engineRef.current.start();
    }
  };

  const handleAttack = (index: number) => {
    if (engineRef.current) {
      engineRef.current.triggerAttack(index);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* HUD - Only show during gameplay */}
      {gameState === GameState.PLAYING && (
        <>
          {/* Top HUD */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none z-10">
            {/* Health & Chakra */}
            <div className="space-y-2">
              {/* HP Bar */}
              <div className="flex items-center gap-2">
                <span className="text-red-400 text-xs font-bold w-8">HP</span>
                <div className="w-48 h-4 bg-gray-900/80 rounded-full border border-red-900/50 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-700 to-red-500 transition-all duration-200 rounded-full"
                    style={{ width: `${playerHp}%` }}
                  />
                </div>
                <span className="text-red-300 text-xs">{Math.round(playerHp)}</span>
              </div>
              {/* Chakra Bar */}
              <div className="flex items-center gap-2">
                <span className="text-purple-400 text-xs font-bold w-8">CK</span>
                <div className="w-48 h-4 bg-gray-900/80 rounded-full border border-purple-900/50 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-700 to-purple-400 transition-all duration-200 rounded-full"
                    style={{ width: `${playerChakra}%` }}
                  />
                </div>
                <span className="text-purple-300 text-xs">{Math.round(playerChakra)}</span>
              </div>
            </div>

            {/* Score & Wave */}
            <div className="text-right">
              <div className="text-green-400 text-lg font-bold drop-shadow-[0_0_10px_#39ff14]">
                SCORE: {stats.score}
              </div>
              <div className="text-yellow-400 text-sm">
                WAVE {stats.wave}/{stats.maxWave}
              </div>
              <div className="text-gray-400 text-xs">
                KILLS: {stats.kills}
              </div>
            </div>
          </div>

          {/* Attack Buttons - Bottom */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {ATTACKS.map((attack, i) => (
              <button
                key={attack.id}
                onClick={() => handleAttack(i)}
                className="pointer-events-auto px-3 py-2 rounded-lg border-2 text-xs font-bold transition-all active:scale-95 hover:scale-105"
                style={{
                  borderColor: attack.color,
                  backgroundColor: `${attack.color}20`,
                  color: attack.color,
                  boxShadow: `0 0 10px ${attack.color}40`,
                }}
              >
                <div className="text-[10px] opacity-60">[{attack.key}]</div>
                <div>{attack.name}</div>
              </button>
            ))}
          </div>

          {/* Mobile D-Pad */}
          <div className="absolute bottom-4 left-4 grid grid-cols-3 gap-1 z-10 md:hidden">
            <div />
            <button
              onTouchStart={() => engineRef.current?.player.keys.add('arrowup')}
              onTouchEnd={() => engineRef.current?.player.keys.delete('arrowup')}
              className="pointer-events-auto w-10 h-10 bg-white/10 rounded border border-white/20 flex items-center justify-center text-white"
            >
              ↑
            </button>
            <div />
            <button
              onTouchStart={() => engineRef.current?.player.keys.add('arrowleft')}
              onTouchEnd={() => engineRef.current?.player.keys.delete('arrowleft')}
              className="pointer-events-auto w-10 h-10 bg-white/10 rounded border border-white/20 flex items-center justify-center text-white"
            >
              ←
            </button>
            <div />
            <button
              onTouchStart={() => engineRef.current?.player.keys.add('arrowright')}
              onTouchEnd={() => engineRef.current?.player.keys.delete('arrowright')}
              className="pointer-events-auto w-10 h-10 bg-white/10 rounded border border-white/20 flex items-center justify-center text-white"
            >
              →
            </button>
            <div />
            <button
              onTouchStart={() => engineRef.current?.player.keys.add('arrowdown')}
              onTouchEnd={() => engineRef.current?.player.keys.delete('arrowdown')}
              className="pointer-events-auto w-10 h-10 bg-white/10 rounded border border-white/20 flex items-center justify-center text-white"
            >
              ↓
            </button>
            <div />
          </div>
        </>
      )}

      {/* Start Screen */}
      {gameState === GameState.START && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-gradient-to-b from-black via-[#1a0a2e] to-black">
          {/* Animated background particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-green-400 rounded-full animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  opacity: Math.random() * 0.5 + 0.2,
                }}
              />
            ))}
          </div>

          {/* Logo */}
          <img
            src={LOGO_URL}
            alt="Serpent's Wrath"
            className="w-80 max-w-[90vw] mb-4 drop-shadow-[0_0_30px_#39ff14]"
          />

          <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-purple-400 to-green-400 mb-2 animate-pulse">
            OROCHIMARU
          </h1>
          <p className="text-green-400/80 text-sm mb-8 tracking-widest">
            SERPENT&apos;S WRATH
          </p>

          {/* Token Branding */}
          <div className="mb-8 px-6 py-3 border border-green-400/30 rounded-lg bg-green-400/5">
            <p className="text-green-300 text-center text-sm">
              🐍 Powered by <span className="font-bold text-green-400">$OROCHI</span> Token
            </p>
            <p className="text-gray-500 text-xs text-center mt-1">
              The Forbidden Jutsu of DeFi
            </p>
          </div>

          <button
            onClick={startGame}
            className="px-12 py-4 bg-gradient-to-r from-purple-600 to-green-600 text-white font-bold text-xl rounded-lg hover:scale-105 transition-transform shadow-[0_0_30px_#39ff1440] hover:shadow-[0_0_50px_#39ff1480]"
          >
            ⚔️ ENTER THE ARENA
          </button>

          <div className="mt-6 text-gray-500 text-xs text-center">
            <p>WASD/Arrows to move | Q W E R to attack</p>
            <p className="mt-1">Defeat all 6 waves to claim victory</p>
          </div>

          {stats.highScore > 0 && (
            <p className="mt-4 text-yellow-400/60 text-sm">
              🏆 High Score: {stats.highScore}
            </p>
          )}
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === GameState.GAME_OVER && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/90 backdrop-blur-sm">
          <h2 className="text-5xl font-bold text-red-500 mb-4 animate-pulse">
            DEFEATED
          </h2>
          <p className="text-gray-400 mb-2">Even legends fall...</p>

          <div className="my-6 space-y-2 text-center">
            <p className="text-green-400 text-2xl font-bold">Score: {stats.score}</p>
            <p className="text-gray-300">Waves Survived: {stats.wave - 1}</p>
            <p className="text-gray-300">Enemies Slain: {stats.kills}</p>
            {stats.score >= stats.highScore && stats.score > 0 && (
              <p className="text-yellow-400 font-bold animate-bounce">🏆 NEW HIGH SCORE!</p>
            )}
          </div>

          {/* Token CTA */}
          <div className="mb-6 px-6 py-3 border border-purple-400/30 rounded-lg bg-purple-400/5">
            <p className="text-purple-300 text-center text-sm">
              🐍 Join the <span className="font-bold text-green-400">$OROCHI</span> community
            </p>
            <p className="text-gray-500 text-xs text-center mt-1">
              Immortality awaits those who hold
            </p>
          </div>

          <button
            onClick={startGame}
            className="px-10 py-3 bg-gradient-to-r from-red-600 to-purple-600 text-white font-bold text-lg rounded-lg hover:scale-105 transition-transform"
          >
            🔄 TRY AGAIN
          </button>
        </div>
      )}

      {/* Victory Screen */}
      {gameState === GameState.VICTORY && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/90 backdrop-blur-sm">
          <h2 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-green-400 mb-4">
            VICTORY
          </h2>
          <p className="text-green-400 mb-2">The serpent reigns supreme!</p>

          <div className="my-6 space-y-2 text-center">
            <p className="text-green-400 text-3xl font-bold">Score: {stats.score}</p>
            <p className="text-gray-300">All {stats.maxWave} Waves Conquered</p>
            <p className="text-gray-300">Total Kills: {stats.kills}</p>
            {stats.score >= stats.highScore && (
              <p className="text-yellow-400 font-bold animate-bounce">🏆 NEW HIGH SCORE!</p>
            )}
          </div>

          {/* Token CTA */}
          <div className="mb-6 px-8 py-4 border border-green-400/50 rounded-lg bg-green-400/10 shadow-[0_0_20px_#39ff1430]">
            <p className="text-green-300 text-center font-bold">
              🐍 You&apos;ve proven your worth!
            </p>
            <p className="text-green-400 text-center text-lg font-bold mt-1">
              Join $OROCHI Token Launch
            </p>
            <p className="text-gray-400 text-xs text-center mt-2">
              The forbidden knowledge of DeFi awaits
            </p>
          </div>

          <button
            onClick={startGame}
            className="px-10 py-3 bg-gradient-to-r from-green-600 to-purple-600 text-white font-bold text-lg rounded-lg hover:scale-105 transition-transform shadow-[0_0_20px_#39ff1440]"
          >
            🎮 PLAY AGAIN
          </button>
        </div>
      )}
    </div>
  );
}