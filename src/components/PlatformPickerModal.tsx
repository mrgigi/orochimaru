import { Monitor, Smartphone, X } from 'lucide-react';
import { synth } from '../audio/SynthManager';

interface PlatformPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (platform: 'web' | 'mobile') => void;
  gameTitle?: string;
}

export function PlatformPickerModal({ 
  isOpen, 
  onClose, 
  onSelect, 
  gameTitle = "Serpent Fury" 
}: PlatformPickerModalProps) {
  if (!isOpen) return null;

  const handleSelect = (platform: 'web' | 'mobile') => {
    synth.playRumble();
    onSelect(platform);
  };

  const handleClose = () => {
    synth.playClick();
    onClose();
  };

  return (
    <div className="platform-modal-overlay" onClick={handleClose}>
      <div 
        className="platform-modal-content" 
        onClick={(e) => e.stopPropagation()}
      >
        <button className="platform-modal-close" onClick={handleClose} aria-label="Close modal">
          <X size={18} />
        </button>

        <div className="platform-modal-header">
          <span className="platform-modal-badge">PLATFORM SELECT</span>
          <h2 className="platform-modal-title">{gameTitle}</h2>
          <p className="platform-modal-desc">
            Choose your interface architecture to initialize the combat simulation.
          </p>
        </div>

        <div className="platform-cards-grid">
          {/* Web Version Card */}
          <div 
            className="platform-card web-card" 
            onClick={() => handleSelect('web')}
          >
            <div className="platform-card-recommended">RECOMMENDED</div>
            <div className="platform-card-icon-wrap">
              <Monitor size={36} className="text-green icon-glow-green" />
            </div>
            <h3 className="platform-card-title">Web Console</h3>
            <p className="platform-card-summary">Optimized for Desktop & Laptop PCs</p>
            <ul className="platform-card-features">
              <li>🖥️ Full Widescreen Arena</li>
              <li>⌨️ Keyboard Controls (WASD / Space)</li>
              <li>⚡ Cast Jutsu with Q / W / E / R</li>
              <li>📊 Immersive Desktop HUD Layout</li>
            </ul>
            <button className="platform-card-btn select-web-btn">
              LAUNCH WEB VIEW
            </button>
          </div>

          {/* Tablet Touch Version Card */}
          <div 
            className="platform-card mobile-card" 
            onClick={() => handleSelect('mobile')}
          >
            <div className="platform-card-icon-wrap">
              <Smartphone size={36} className="text-purple icon-glow-purple" />
            </div>
            <h3 className="platform-card-title">Touch Console</h3>
            <p className="platform-card-summary">Designed for Tablets & Touch Screens</p>
            <ul className="platform-card-features">
              <li>📟 High-Res Tablet Canvas</li>
              <li>🕹️ Virtual Touch Joystick</li>
              <li>🔘 Quick-Tap Attack Overlays</li>
              <li>🎒 Immersive Tablet HUD Layout</li>
            </ul>
            <button className="platform-card-btn select-mobile-btn">
              LAUNCH TOUCH VIEW
            </button>
          </div>
        </div>

        <div className="platform-modal-footer">
          <button className="platform-modal-cancel" onClick={handleClose}>
            ABORT INITIALIZATION
          </button>
        </div>
      </div>
    </div>
  );
}

export default PlatformPickerModal;
