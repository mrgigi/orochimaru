import { useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { synth } from '../audio/SynthManager';

interface SoundToggleProps {
  muteAudio: boolean;
  toggleMute: () => void;
}

export function SoundToggle({ muteAudio, toggleMute }: SoundToggleProps) {
  useEffect(() => {
    synth.setMute(muteAudio);
  }, [muteAudio]);

  const handleToggle = () => {
    toggleMute();
    // Start ambient if unmuting
    if (muteAudio) {
      // Small timeout to allow user gesture to trigger context resume
      setTimeout(() => {
        synth.startAmbient();
        synth.playClick();
      }, 50);
    }
  };

  return (
    <button
      onClick={handleToggle}
      className="sound-toggle-btn"
      title={muteAudio ? "Unmute Audio" : "Mute Audio"}
      aria-label="Toggle sound effects"
    >
      {muteAudio ? <VolumeX size={20} className="text-red" /> : <Volume2 size={20} className="text-green" />}
    </button>
  );
}
export default SoundToggle;
