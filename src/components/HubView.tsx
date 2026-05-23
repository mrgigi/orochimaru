import { useState } from 'react';
import { 
  Lock, 
  ExternalLink, 
  Copy, 
  Check, 
  Send, 
  TrendingUp, 
  Gamepad2, 
  Volume2, 
  VolumeX, 
  Skull,
  Coins,
  Swords,
  Trophy
} from 'lucide-react';
import { synth } from '../audio/SynthManager';
import orochimaruFace from '../assets/orochimaru_face.png';
import { PlatformPickerModal } from './PlatformPickerModal';

interface HubViewProps {
  orochimaruTokens: number;
  totalTokensClaimed: number;
  combatHighScore: number;
  muteAudio: boolean;
  toggleMute: () => void;
  onSelectGame: (gameId: string) => void;
}

export function HubView({ 
  orochimaruTokens, 
  totalTokensClaimed,
  combatHighScore, 
  muteAudio, 
  toggleMute,
  onSelectGame 
}: HubViewProps) {
  const [copied, setCopied] = useState(false);
  const [isPlatformModalOpen, setIsPlatformModalOpen] = useState(false);
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

  return (
    <div className="hub-container">
      {/* Header Banner Section */}
      <header className="hub-header">
        <div className="header-top-bar">
          <div className="token-badge">$OROCHIMARU</div>
          <div className="header-top-actions">
            <button 
              onClick={() => onSelectGame('leaderboard')} 
              className="leaderboard-toggle-mini"
              title="View Leaderboard Scroll"
            >
              <Trophy size={16} />
            </button>
            <button 
              onClick={toggleMute} 
              className="sound-toggle-mini"
              title={muteAudio ? "Unmute" : "Mute"}
            >
              {muteAudio ? <VolumeX size={16} /> : <Volume2 size={16} />}
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
          
          {/* Game 1: Serpent's Wrath - Playable */}
          <div 
            onClick={() => handleGameClick('game2', false)}
            className="game-card playable-card"
            style={{ borderImageSource: 'linear-gradient(135deg, #ffd700, #8b00ff)' }}
          >
            <div className="game-status active-status">BATTLE ARENA</div>
            <div className="game-card-content">
              <div className="game-icon-container">
                <div className="game-icon text-purple" style={{ fontSize: '28px' }}>🐍</div>
              </div>
              <div className="game-details">
                <h4 className="game-title">Serpent's Wrath</h4>
                <p className="game-desc">Omnidirectional 2D action game. Move freely, clear 7 waves of elite shinobi, and defeat the Hokage.</p>
              </div>
            </div>
            <button className="play-now-btn" style={{ background: 'linear-gradient(135deg, #a855f7, #ffd700)', color: '#000' }}>
              <Swords size={16} />
              <span>FIGHT NOW</span>
            </button>
          </div>

          {/* Game 2: Forbidden Lab - Playable */}
          <div 
            onClick={() => handleGameClick('game1', false)}
            className="game-card playable-card"
          >
            <div className="game-status active-status">LABORATORY</div>
            <div className="game-card-content">
              <div className="game-icon-container">
                <Skull className="game-icon text-green" size={28} />
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
              <div className="game-icon-container">
                <Swords className="game-icon text-purple" size={28} />
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

      {/* Player Rewards Dashboard */}
      <section className="player-summary-section">
        <h3 className="section-title">YOUR LAB STATUS</h3>
        <div className="summary-card">
          <div className="summary-item">
            <span>Mock $OROCHIMARU Balance</span>
            <strong>{orochimaruTokens.toLocaleString()} OROCHI</strong>
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
