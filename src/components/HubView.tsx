import { useState } from 'react';
import { 
  Lock, 
  Play,
  Film,
  ExternalLink, 
  Copy, 
  Check, 
  Send, 
  TrendingUp, 
  Gamepad2, 
  Coins,
  Swords,
  Trophy,
  Zap,
  Star,
  Crown
} from 'lucide-react';
import { synth } from '../audio/SynthManager';
import orochimaruFace from '../assets/orochimaru_face.png';
import forbiddenLabIcon from '../assets/forbidden_lab_icon.jpg';
import ryuchiCaveIcon from '../assets/ryuchi_cave_icon.jpg';
import { PlatformPickerModal } from './PlatformPickerModal';

interface HubViewProps {
  orochimaruTokens: number;
  totalTokensClaimed: number;
  combatHighScore: number;
  onSelectGame: (gameId: string) => void;
  unlockedItems?: string[];
  onUnlockItem?: (itemId: string, cost: number) => boolean;
}

// Vault tier config
const VAULT_TIERS = {
  tier1: { label: 'TIER 1', range: '100–500 PTS', icon: Zap, color: '#22c55e', glow: 'rgba(34,197,94,0.2)' },
  tier2: { label: 'TIER 2', range: '800–2,000 PTS', icon: Star, color: '#a855f7', glow: 'rgba(168,85,247,0.2)' },
  tier3: { label: 'TIER 3', range: '3,500–8,000 PTS', icon: Crown, color: '#ffd700', glow: 'rgba(255,215,0,0.2)' }
};

function TierBadge({ tier }: { tier: keyof typeof VAULT_TIERS }) {
  const config = VAULT_TIERS[tier];
  const Icon = config.icon;
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 12px',
      borderRadius: 20,
      background: config.glow,
      border: `1px solid ${config.color}40`,
      marginBottom: 10
    }}>
      <Icon size={12} style={{ color: config.color }} />
      <span style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.1em', color: config.color }}>
        {config.label}
      </span>
      <span style={{ fontSize: '0.6rem', color: 'var(--text-grey)', letterSpacing: '0.04em' }}>
        {config.range}
      </span>
    </div>
  );
}

export function HubView({ 
  orochimaruTokens, 
  totalTokensClaimed,
  combatHighScore, 
  onSelectGame,
  unlockedItems = [],
  onUnlockItem
}: HubViewProps) {
  const [copied, setCopied] = useState(false);
  const [isPlatformModalOpen, setIsPlatformModalOpen] = useState(false);
  const [activeWatchVideoUrl, setActiveWatchVideoUrl] = useState<string | null>(null);
  const contractAddress = "0x89fabE8405CFDE3f6aEeD8804e3BA4a10b7e21d3";

  const handleCopy = () => {
    navigator.clipboard.writeText(contractAddress);
    setCopied(true);
    synth.playClick();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGameClick = (gameId: string, locked: boolean) => {
    if (locked) {
      synth.playSnake();
      return;
    }
    if (gameId === 'game2') {
      setIsPlatformModalOpen(true);
      synth.playClick();
      return;
    }
    synth.playRumble();
    onSelectGame(gameId);
  };

  const handleLinkClick = () => {
    synth.playClick();
  };

  const handleUnlockTrailer2 = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUnlockItem) return;
    if (orochimaruTokens < 100) {
      synth.playSnake();
      alert("Inadequate Shinobi Points! Earn more PTS in Serpent Fury or Ryuchi Cave Trials.");
      return;
    }
    const success = onUnlockItem('trailer2', 100);
    if (success) { synth.playRumble(); } else { synth.playSnake(); }
  };

  const handleUnlockLab = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUnlockItem) return;
    if (orochimaruTokens < 50) {
      synth.playSnake();
      alert("Insufficient Shinobi Points! You need 50 PTS to access the Forbidden Lab. Earn them through Serpent Fury.");
      return;
    }
    const success = onUnlockItem('game_lab', 50);
    if (success) { synth.playRumble(); } else { synth.playSnake(); }
  };

  const handleUnlockCave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUnlockItem) return;
    if (orochimaruTokens < 200) {
      synth.playSnake();
      alert("Insufficient Shinobi Points! You need 200 PTS to enter Ryuchi Cave. Earn them through gameplay.");
      return;
    }
    const success = onUnlockItem('game_cave', 200);
    if (success) { synth.playRumble(); } else { synth.playSnake(); }
  };

  const isTrailer2Unlocked = unlockedItems.includes('trailer2');
  const isLabUnlocked = unlockedItems.includes('game_lab');
  const isCaveUnlocked = unlockedItems.includes('game_cave');

  return (
    <div className="hub-container">
      {/* Header Banner Section */}
      <header className="hub-header">
        <div className="header-top-bar">
          <div className="token-badge">{orochimaruTokens.toLocaleString()} PTS</div>
          <div className="header-top-actions">
            <button 
              onClick={() => onSelectGame('leaderboard')} 
              className="leaderboard-toggle-mini"
              title="View Orochi Ledger"
            >
              <Trophy size={16} />
            </button>
          </div>
        </div>
        
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title-main">OROCHIMARU</h1>
            <h1 className="hero-title-sub">SHINOBI PORTAL</h1>
            <p className="hero-tagline">Shed your limits, reanimate legends, and rule the leaderboard.</p>
          </div>
          <div className="hero-avatar-container">
            <img 
              src={orochimaruFace} 
              alt="Orochimaru Face" 
              className="hero-avatar-img"
            />
            <div className="hero-avatar-glow"></div>
          </div>
        </div>
      </header>

      {/* Games Catalog Section */}
      <section className="games-section">
        <h3 className="section-title">ECOSYSTEM GAMES</h3>
        <p className="section-subtitle" style={{ fontSize: '0.68rem', color: 'var(--text-grey)', marginTop: '-8px', marginBottom: '12px' }}>
          Earn Shinobi Points (PTS) through gameplay — soulbound, non-transferable, non-purchasable.
        </p>
        <div className="games-grid">
          
          {/* Featured Showcase Game 1: Serpent Fury - Playable Demo */}
          <div 
            onClick={() => handleGameClick('game2', false)}
            className="game-card playable-card featured-showcase-card"
            style={{ borderImageSource: 'linear-gradient(135deg, #ffd700, #8b00ff)' }}
          >
            <div className="game-status active-status">PLAYABLE DEMO (EARLY ACCESS)</div>
            
            {/* Centered 16:9 video player preview */}
            <div className="showcase-video-wrapper" onClick={(e) => e.stopPropagation()}>
              <video 
                src="/assets/trailer.mp4" 
                autoPlay 
                loop 
                playsInline 
                controls
                className="showcase-video-landscape"
              />
            </div>

            <div className="game-details-stacked">
              <h4 className="game-title-featured">Serpent Fury</h4>
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleGameClick('game2', false);
                }} 
                className="play-now-btn featured-play-btn" 
                style={{ background: 'linear-gradient(135deg, #a855f7, #ffd700)', color: '#000' }}
              >
                <Swords size={16} />
                <span>PLAY DEMO (FIGHT NOW)</span>
              </button>

              <a 
                href="https://app.uniswap.org/swap?outputCurrency=0x89fabE8405CFDE3f6aEeD8804e3BA4a10b7e21d3" 
                target="_blank" 
                rel="noopener noreferrer" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleLinkClick();
                }}
                className="play-now-btn featured-play-btn"
                style={{ marginTop: '4px', background: 'rgba(255, 215, 0, 0.08)', borderColor: 'rgba(255, 215, 0, 0.3)', color: 'var(--color-gold)' }}
              >
                <Coins size={16} />
                <span>BUY $TOKEN NOW!!!</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>

          {/* Game 2: Forbidden Lab — PTS-Locked */}
          <div 
            onClick={isLabUnlocked ? () => handleGameClick('game1', false) : handleUnlockLab}
            className={`game-card ${isLabUnlocked ? 'playable-card' : 'locked-card'}`}
          >
            {isLabUnlocked ? (
              <div className="game-status active-status">LABORATORY</div>
            ) : (
              <div className="game-status locked-status">
                <Lock size={12} />
                <span>50 PTS</span>
              </div>
            )}
            <div className="game-card-content">
              <div className="game-icon-container" style={{ overflow: 'hidden', padding: 0, filter: isLabUnlocked ? 'none' : 'grayscale(60%) brightness(0.6)' }}>
                <img 
                  src={forbiddenLabIcon} 
                  alt="Forbidden Lab" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '3px' }} 
                />
              </div>
              <div className="game-details">
                <h4 className="game-title">Forbidden Lab: DNA Idle</h4>
                {isLabUnlocked ? (
                  <p className="game-desc">Harvest Forbidden Cells, purify DNA, and earn Shinobi Points. Up to <strong>200 PTS/day</strong>.</p>
                ) : (
                  <p className="game-desc">Perform forbidden experiments and harvest DNA cells. Unlock access with Shinobi Points earned in Serpent Fury.</p>
                )}
              </div>
            </div>
            {isLabUnlocked ? (
              <button className="play-now-btn" onClick={(e) => { e.stopPropagation(); handleGameClick('game1', false); }}>
                <Gamepad2 size={16} />
                <span>PLAY NOW</span>
              </button>
            ) : (
              <button
                onClick={handleUnlockLab}
                className="play-now-btn"
                style={{
                  background: orochimaruTokens >= 50
                    ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                    : 'rgba(255,255,255,0.05)',
                  color: orochimaruTokens >= 50 ? '#fff' : 'var(--text-muted)',
                  borderColor: orochimaruTokens >= 50 ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.1)',
                  cursor: orochimaruTokens >= 50 ? 'pointer' : 'not-allowed'
                }}
              >
                <Coins size={14} />
                <span>UNLOCK — 50 PTS</span>
              </button>
            )}
          </div>

          {/* Game 3: Ryuchi Cave Survival — PTS-Locked */}
          <div 
            onClick={isCaveUnlocked ? () => handleGameClick('cave_trials', false) : handleUnlockCave}
            className={`game-card ${isCaveUnlocked ? 'playable-card game-card-v2' : 'locked-card'}`}
          >
            {isCaveUnlocked ? (
              <div className="game-status active-status">SURVIVAL</div>
            ) : (
              <div className="game-status locked-status">
                <Lock size={12} />
                <span>200 PTS</span>
              </div>
            )}
            <div className="game-card-content">
              <div className="game-icon-container" style={{ overflow: 'hidden', padding: 0, filter: isCaveUnlocked ? 'none' : 'grayscale(60%) brightness(0.6)' }}>
                <img 
                  src={ryuchiCaveIcon} 
                  alt="Ryuchi Cave" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '3px' }} 
                />
              </div>
              <div className="game-details">
                <h4 className="game-title">Ryuchi Cave Survival</h4>
                {isCaveUnlocked ? (
                  <p className="game-desc">Bullet-hell survival trials. Earn Shinobi Points for waves survived — daily PTS cap applies.</p>
                ) : (
                  <p className="game-desc">Forbidden territory. Prove your worth in Serpent Fury and accumulate enough Shinobi Points to gain entry.</p>
                )}
              </div>
            </div>
            {isCaveUnlocked ? (
              <button className="play-now-btn play-v2-btn" onClick={(e) => { e.stopPropagation(); handleGameClick('cave_trials', false); }}>
                <Gamepad2 size={16} />
                <span>ENTER CAVE</span>
              </button>
            ) : (
              <button
                onClick={handleUnlockCave}
                className="play-now-btn"
                style={{
                  background: orochimaruTokens >= 200
                    ? 'linear-gradient(135deg, #a855f7, #7c3aed)'
                    : 'rgba(255,255,255,0.05)',
                  color: orochimaruTokens >= 200 ? '#fff' : 'var(--text-muted)',
                  borderColor: orochimaruTokens >= 200 ? 'rgba(168,85,247,0.5)' : 'rgba(255,255,255,0.1)',
                  cursor: orochimaruTokens >= 200 ? 'pointer' : 'not-allowed'
                }}
              >
                <Coins size={14} />
                <span>UNLOCK — 200 PTS</span>
              </button>
            )}
          </div>

          {/* Game 4: Locked */}
          <div 
            onClick={() => handleGameClick('game3', true)}
            className="game-card locked-card"
          >
            <div className="game-status locked-status">
              <Lock size={12} />
              <span>LOCKED</span>
            </div>
            <div className="game-card-content">
              <div className="game-icon-container">
                <div className="game-icon text-muted">⚰️</div>
              </div>
              <div className="game-details">
                <h4 className="game-title">Edo Tensei: Shinobi War</h4>
                <p className="game-desc">Deploy your army of reanimated shinobi to fight in full scale auto-battles.</p>
              </div>
            </div>
            <div className="locked-banner">COMING SOON</div>
          </div>

        </div>
      </section>

      {/* Forbidden Vault Rewards Section */}
      <section className="vault-section">
        <h3 className="section-title">FORBIDDEN VAULT</h3>
        <p className="section-subtitle" style={{ fontSize: '0.7rem', color: 'var(--text-grey)', marginTop: '-8px', marginBottom: '15px' }}>
          Spend Shinobi Points (PTS) to unlock classified intelligence, restricted training footage, and legendary blueprints.
          No $OROCHIMARU tokens are earned through gameplay — PTS only.
        </p>

        {/* ── TIER 1 ── */}
        <div style={{ marginBottom: 6 }}>
          <TierBadge tier="tier1" />
        </div>
        <div className="games-grid" style={{ marginBottom: 20 }}>
          
          {/* Vault Item 1: Ryuchi Secrets (Trailer 2) — 100 PTS */}
          <div 
            onClick={isTrailer2Unlocked ? () => setActiveWatchVideoUrl('https://vpogqqmfqkxzdcrzakqy.supabase.co/storage/v1/object/sign/Videos/Trailer2.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lN2I4ZTRlZi1kNGI1LTRmZTYtOTY2ZC05Zjg2Njc0Zjg1MTgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJWaWRlb3MvVHJhaWxlcjIubXA0IiwiaWF0IjoxNzc5ODAzNjc2LCJleHAiOjE4MTEzMzk2NzZ9.575ZIiNn7TNBHf93d7mm4Dv65bkC5A1E1OGKAD1uiV4') : handleUnlockTrailer2}
            className={`game-card ${isTrailer2Unlocked ? 'playable-card' : 'locked-card'}`}
            style={isTrailer2Unlocked ? { borderImageSource: 'linear-gradient(135deg, #22c55e, #a855f7)' } : undefined}
          >
            {isTrailer2Unlocked ? (
              <div className="game-status active-status">UNLOCKED</div>
            ) : (
              <div className="game-status locked-status">
                <Lock size={12} />
                <span>100 PTS</span>
              </div>
            )}
            
            <div className="game-card-content">
              <div className="game-icon-container" style={{ background: 'rgba(189, 0, 255, 0.12)', border: '1px solid rgba(189, 0, 255, 0.4)', borderRadius: '50%', color: 'var(--color-purple-primary)', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 12px rgba(189, 0, 255, 0.25)', overflow: 'hidden', padding: 0 }}>
                <img src={ryuchiCaveIcon} alt="Fight Scene Trailer" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} className="animate-pulse" />
              </div>
              <div className="game-details">
                <h4 className="game-title">Fight Scene Trailer</h4>
                <p className="game-desc">Classified recording of the deep Ryuchi Cave trials. Preview legendary boss combat and mechanics.</p>
              </div>
            </div>

            {isTrailer2Unlocked ? (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveWatchVideoUrl('https://vpogqqmfqkxzdcrzakqy.supabase.co/storage/v1/object/sign/Videos/Trailer2.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lN2I4ZTRlZi1kNGI1LTRmZTYtOTY2ZC05Zjg2Njc0Zjg1MTgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJWaWRlb3MvVHJhaWxlcjIubXA0IiwiaWF0IjoxNzc5ODAzNjc2LCJleHAiOjE4MTEzMzk2NzZ9.575ZIiNn7TNBHf93d7mm4Dv65bkC5A1E1OGKAD1uiV4');
                }}
                className="play-now-btn" 
                style={{ background: 'linear-gradient(135deg, #22c55e, #a855f7)', color: '#fff' }}
              >
                <Play size={14} />
                <span>WATCH NOW</span>
              </button>
            ) : (
              <button 
                onClick={handleUnlockTrailer2}
                className="play-now-btn"
              >
                <span>UNLOCK (100 PTS)</span>
              </button>
            )}
          </div>

          {/* Vault Item 1b: Tier 1 Placeholder — 500 PTS */}
          <div className="game-card locked-card">
            <div className="game-status locked-status">
              <Lock size={12} />
              <span>500 PTS</span>
            </div>
            <div className="game-card-content">
              <div className="game-icon-container" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Film size={20} style={{ opacity: 0.4, color: '#22c55e' }} />
              </div>
              <div className="game-details">
                <h4 className="game-title" style={{ letterSpacing: '0.2em', color: 'var(--text-muted)', filter: 'blur(3.5px)', userSelect: 'none' }}>???</h4>
                <p className="game-desc" style={{ filter: 'blur(4px)', userSelect: 'none', opacity: 0.5 }}>Classified. Unlock to reveal.</p>
              </div>
            </div>
            <div className="locked-banner">COMING SOON</div>
          </div>

        </div>

        {/* ── TIER 2 ── */}
        <div style={{ marginBottom: 6 }}>
          <TierBadge tier="tier2" />
        </div>
        <div className="games-grid" style={{ marginBottom: 20 }}>

          {/* Tier 2 Item 1 — 800 PTS */}
          <div className="game-card locked-card">
            <div className="game-status locked-status">
              <Lock size={12} />
              <span>800 PTS</span>
            </div>
            <div className="game-card-content">
              <div className="game-icon-container" style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.15)', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Star size={20} style={{ opacity: 0.4, color: '#a855f7' }} />
              </div>
              <div className="game-details">
                <h4 className="game-title" style={{ letterSpacing: '0.2em', color: 'var(--text-muted)', filter: 'blur(3.5px)', userSelect: 'none' }}>???</h4>
                <p className="game-desc" style={{ filter: 'blur(4px)', userSelect: 'none', opacity: 0.5 }}>Classified. Unlock to reveal.</p>
              </div>
            </div>
            <div className="locked-banner">COMING SOON</div>
          </div>

          {/* Tier 2 Item 2 — 2,000 PTS */}
          <div className="game-card locked-card">
            <div className="game-status locked-status">
              <Lock size={12} />
              <span>2,000 PTS</span>
            </div>
            <div className="game-card-content">
              <div className="game-icon-container" style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.15)', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Star size={20} style={{ opacity: 0.4, color: '#c084fc' }} />
              </div>
              <div className="game-details">
                <h4 className="game-title" style={{ letterSpacing: '0.2em', color: 'var(--text-muted)', filter: 'blur(3.5px)', userSelect: 'none' }}>???</h4>
                <p className="game-desc" style={{ filter: 'blur(4px)', userSelect: 'none', opacity: 0.5 }}>Classified. Unlock to reveal.</p>
              </div>
            </div>
            <div className="locked-banner">COMING SOON</div>
          </div>

        </div>

        {/* ── TIER 3 ── */}
        <div style={{ marginBottom: 6 }}>
          <TierBadge tier="tier3" />
        </div>
        <div className="games-grid">

          {/* Tier 3 Item 1 — 3,500 PTS */}
          <div className="game-card locked-card">
            <div className="game-status locked-status">
              <Lock size={12} />
              <span>3,500 PTS</span>
            </div>
            <div className="game-card-content">
              <div className="game-icon-container" style={{ background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.15)', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Crown size={20} style={{ opacity: 0.4, color: '#ffd700' }} />
              </div>
              <div className="game-details">
                <h4 className="game-title" style={{ letterSpacing: '0.2em', color: 'var(--text-muted)', filter: 'blur(3.5px)', userSelect: 'none' }}>???</h4>
                <p className="game-desc" style={{ filter: 'blur(4px)', userSelect: 'none', opacity: 0.5 }}>Classified. Unlock to reveal.</p>
              </div>
            </div>
            <div className="locked-banner">COMING SOON</div>
          </div>

          {/* Tier 3 Item 2 — 8,000 PTS */}
          <div className="game-card locked-card" style={{ borderColor: 'rgba(255,215,0,0.12)' }}>
            <div className="game-status locked-status">
              <Lock size={12} />
              <span>8,000 PTS</span>
            </div>
            <div className="game-card-content">
              <div className="game-icon-container" style={{ background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.25)', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 10px rgba(255,215,0,0.15)' }}>
                <Crown size={20} style={{ color: '#ffd700', opacity: 0.7 }} />
              </div>
              <div className="game-details">
                <h4 className="game-title" style={{ letterSpacing: '0.2em', color: 'var(--text-muted)', filter: 'blur(3.5px)', userSelect: 'none' }}>???</h4>
                <p className="game-desc" style={{ filter: 'blur(4px)', userSelect: 'none', opacity: 0.5 }}>Classified. Unlock to reveal.</p>
              </div>
            </div>
            <div className="locked-banner" style={{ background: 'linear-gradient(135deg, #ffd700, #f97316)', color: '#000', fontWeight: 900 }}>LEGENDARY — COMING SOON</div>
          </div>

        </div>
      </section>

      {/* Player Rewards Dashboard */}
      <section className="player-summary-section">
        <h3 className="section-title">YOUR LAB STATUS</h3>
        <div className="summary-card">
          <div className="summary-item">
            <span>Shinobi Points Balance</span>
            <strong>{orochimaruTokens.toLocaleString()} PTS</strong>
          </div>
          <div className="summary-item">
            <span>Total PTS Claimed</span>
            <span>{totalTokensClaimed.toLocaleString()}</span>
          </div>
          <div className="summary-item">
            <span>Ryuchi Cave High Score</span>
            <span>Wave {combatHighScore}</span>
          </div>
        </div>
      </section>

      {/* Official Token Info Cards */}
      <section className="stats-section">
        <div className="stat-card">
          <div className="stat-label">Total Supply</div>
          <div className="stat-value">690B</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Current Market Cap</div>
          <div className="stat-value">$15K</div>
        </div>
        <div className="stat-card highlighted">
          <div className="stat-label">Strategic Target</div>
          <div className="stat-value">$5BN</div>
        </div>
      </section>

      {/* Contract Copy Widget */}
      <section className="contract-section">
        <div className="contract-card">
          <div className="contract-info">
            <span className="contract-label">Contract Address (ETH)</span>
            <span className="contract-address">
              {contractAddress.slice(0, 8)}...{contractAddress.slice(-8)}
            </span>
          </div>
          <button 
            onClick={handleCopy} 
            className={`copy-btn ${copied ? 'copied' : ''}`}
            aria-label="Copy contract address"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
      </section>

      {/* Web3 Action Links */}
      <section className="links-section">
        <a 
          href="https://app.uniswap.org/swap?outputCurrency=0x89fabE8405CFDE3f6aEeD8804e3BA4a10b7e21d3" 
          target="_blank" 
          rel="noopener noreferrer" 
          onClick={handleLinkClick}
          className="web3-link-btn buy-btn"
        >
          <Coins size={16} />
          <span>Buy $OROCHIMARU</span>
          <ExternalLink size={12} />
        </a>
        
        <div className="social-links-row">
          <a 
            href="https://www.dextools.io/app/ether/pair-explorer/0x49997f2a71cdea970352bb0a2924ae920f2f9ce8" 
            target="_blank" 
            rel="noopener noreferrer" 
            onClick={handleLinkClick}
            className="social-btn chart"
            title="DEX Chart"
          >
            <TrendingUp size={18} />
          </a>
          <a 
            href="https://t.me/orochimaru_28" 
            target="_blank" 
            rel="noopener noreferrer" 
            onClick={handleLinkClick}
            className="social-btn telegram"
            title="Telegram"
          >
            <Send size={18} />
          </a>
          <a 
            href="https://x.com/Orochimarutoken" 
            target="_blank" 
            rel="noopener noreferrer" 
            onClick={handleLinkClick}
            className="social-btn twitter"
            title="Twitter"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>
        </div>
      </section>

      {/* Footer Branding */}
      <footer className="hub-footer">
        <p>© 2026 OROCHIMARU Ecosystem. Developed on Ethereum.</p>
      </footer>

      {/* Widescreen Video Watch Modal Overlay */}
      {activeWatchVideoUrl && (
        <div className="video-watch-modal-overlay" onClick={() => setActiveWatchVideoUrl(null)}>
          <div className="video-watch-modal-card animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="video-watch-modal-header">
              <span className="video-watch-modal-title">RYUCHI SECRETS - PREVIEW</span>
              <button className="video-watch-modal-close" onClick={() => setActiveWatchVideoUrl(null)}>×</button>
            </div>
            <div className="video-watch-player-wrapper">
              <video 
                src={activeWatchVideoUrl} 
                controls 
                autoPlay 
                playsInline 
                className="video-watch-element"
              />
            </div>
          </div>
        </div>
      )}

      {/* Platform Selection Modal */}
      <PlatformPickerModal
        isOpen={isPlatformModalOpen}
        onClose={() => setIsPlatformModalOpen(false)}
        onSelect={(platform) => {
          setIsPlatformModalOpen(false);
          onSelectGame(platform === 'web' ? 'game2_web' : 'game2_mobile');
        }}
      />
    </div>
  );
}
export default HubView;
