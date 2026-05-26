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
  Trophy
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
    if (success) {
      synth.playRumble();
    } else {
      synth.playSnake();
    }
  };

  const isTrailer2Unlocked = unlockedItems.includes('trailer2');

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
              title="View Leaderboard Scroll"
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
                <span>BUY TOKEN</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>

          {/* Game 2: Forbidden Lab - Playable */}
          <div 
            onClick={() => handleGameClick('game1', false)}
            className="game-card playable-card"
          >
            <div className="game-status active-status">LABORATORY</div>
            <div className="game-card-content">
              <div className="game-icon-container" style={{ overflow: 'hidden', padding: 0 }}>
                <img 
                  src={forbiddenLabIcon} 
                  alt="Forbidden Lab" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '3px' }} 
                />
              </div>
              <div className="game-details">
                <h4 className="game-title">Forbidden Lab: DNA Idle</h4>
                <p className="game-desc">Perform experiments, harvest Forbidden Cells, and purify DNA to earn token rewards.</p>
              </div>
            </div>
            <button className="play-now-btn">
              <Gamepad2 size={16} />
              <span>PLAY NOW</span>
            </button>
          </div>

          {/* Game 3: Ryuchi Cave Survival - Playable */}
          <div 
            onClick={() => handleGameClick('cave_trials', false)}
            className="game-card playable-card game-card-v2"
          >
            <div className="game-status active-status">SURVIVAL</div>
            <div className="game-card-content">
              <div className="game-icon-container" style={{ overflow: 'hidden', padding: 0 }}>
                <img 
                  src={ryuchiCaveIcon} 
                  alt="Ryuchi Cave" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '3px' }} 
                />
              </div>
              <div className="game-details">
                <h4 className="game-title">Ryuchi Cave Survival</h4>
                <p className="game-desc">Ryuchi Cave bullet-hell survival trials. Control Orochimaru, dodge ANBU strikes, and claim tokens.</p>
              </div>
            </div>
            <button className="play-now-btn play-v2-btn">
              <Gamepad2 size={16} />
              <span>ENTER CAVE</span>
            </button>
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
        </p>
        <div className="games-grid">
          
          {/* Vault Item 1: Ryuchi Secrets (Trailer 2) */}
          <div 
            onClick={isTrailer2Unlocked ? () => setActiveWatchVideoUrl('/assets/trailer2.mp4') : handleUnlockTrailer2}
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
              <div className="game-icon-container" style={{ background: 'rgba(189, 0, 255, 0.12)', border: '1px solid rgba(189, 0, 255, 0.4)', borderRadius: '50%', color: 'var(--color-purple-primary)', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 12px rgba(189, 0, 255, 0.25)' }}>
                <Film size={20} className="animate-pulse" />
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
                  setActiveWatchVideoUrl('/assets/trailer2.mp4');
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

          {/* Vault Item 2: Edo Secrets: Minato Namikaze */}
          <div className="game-card locked-card">
            <div className="game-status locked-status">
              <Lock size={12} />
              <span>LOCKED</span>
            </div>
            
            <div className="game-card-content">
              <div className="game-icon-container" style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '50%', color: 'var(--text-grey)', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Film size={20} style={{ opacity: 0.4 }} />
              </div>
              <div className="game-details">
                <h4 className="game-title">Edo Secrets: Minato Namikaze</h4>
                <p className="game-desc">Restricted file on the Fourth Hokage reanimation. Features character sprites and speed previews.</p>
              </div>
            </div>
            
            <div className="locked-banner">COMING SOON</div>
          </div>

          {/* Vault Item 3: Wood Release Blueprint */}
          <div className="game-card locked-card">
            <div className="game-status locked-status">
              <Lock size={12} />
              <span>LOCKED</span>
            </div>
            
            <div className="game-card-content">
              <div className="game-icon-container" style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '50%', color: 'var(--text-grey)', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Film size={20} style={{ opacity: 0.4 }} />
              </div>
              <div className="game-details">
                <h4 className="game-title">Forbidden Blueprints: Wood Release</h4>
                <p className="game-desc">Secret Senju DNA molecular reconstruction blueprints. Preview the Wood Golem summoning requirements.</p>
              </div>
            </div>
            
            <div className="locked-banner">COMING SOON</div>
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
            <span>Total Claimed</span>
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
