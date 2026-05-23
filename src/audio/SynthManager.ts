class SynthManager {
  private ctx: AudioContext | null = null;
  private ambientOsc: OscillatorNode | null = null;
  private ambientGain: GainNode | null = null;
  private isMuted: boolean = false;

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMute(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopAmbient();
    } else {
      this.startAmbient();
    }
  }

  // Play a simple bubble pop click sound
  playClick() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // Deep liquid bubble pop
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  // Play a snake hiss sound (filtered noise)
  playSnake() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const bufferSize = this.ctx.sampleRate * 0.3; // 0.3 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(8000, this.ctx.currentTime);
    filter.Q.setValueAtTime(3, this.ctx.currentTime);
    // Hiss sweep down
    filter.frequency.exponentialRampToValueAtTime(3000, this.ctx.currentTime + 0.3);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
    noise.stop(this.ctx.currentTime + 0.3);
  }

  // Play a sword slash sound (sharp noise sweep)
  playSlash() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const bufferSize = this.ctx.sampleRate * 0.15; // 0.15 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(4000, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.15);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
    noise.stop(this.ctx.currentTime + 0.15);
  }

  // Play upgrade purchase success sound (upward arpeggio)
  playPurchase() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5

    notes.forEach((freq, index) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + index * 0.08);

      gain.gain.setValueAtTime(0.15, now + index * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, now + index * 0.08 + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(now + index * 0.08);
      osc.stop(now + index * 0.08 + 0.16);
    });
  }

  // Play Reanimation Rumble (low rumbling sound)
  playRumble() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const duration = 1.2;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const lowpass = this.ctx.createBiquadFilter();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(50, this.ctx.currentTime);
    osc1.frequency.linearRampToValueAtTime(30, this.ctx.currentTime + duration);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(52, this.ctx.currentTime); // detuned slightly for beating
    osc2.frequency.linearRampToValueAtTime(31, this.ctx.currentTime + duration);

    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(100, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc1.connect(lowpass);
    osc2.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(this.ctx.currentTime + duration);
    osc2.stop(this.ctx.currentTime + duration);
  }

  // Start background ambient noise (spooky hum)
  startAmbient() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    if (this.ambientOsc) return; // Already running

    this.ambientOsc = this.ctx.createOscillator();
    this.ambientGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    this.ambientOsc.type = 'sine';
    this.ambientOsc.frequency.setValueAtTime(65.41, this.ctx.currentTime); // C2 chord hum

    // Low-frequency filter sweep for "breathing" cave effect
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(150, this.ctx.currentTime);

    this.ambientGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    this.ambientOsc.connect(filter);
    filter.connect(this.ambientGain);
    this.ambientGain.connect(this.ctx.destination);

    this.ambientOsc.start();
  }

  stopAmbient() {
    if (this.ambientOsc) {
      try {
        this.ambientOsc.stop();
      } catch (e) {}
      this.ambientOsc = null;
    }
    this.ambientGain = null;
  }
}

export const synth = new SynthManager();
