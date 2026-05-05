export const createSoundPlayer = () => {
  let audioContext = null;
  let currentVoice = null;
  let globalVolume = 0.5;
  
  const getContext = () => {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
  };

  const playVoice = (url, volume = 1.0) => {
    if (globalVolume <= 0) return;
    
    if (currentVoice) {
      try {
        currentVoice.pause();
        currentVoice.currentTime = 0;
      } catch (e) {}
    }
    try {
      const audio = new Audio(url);
      audio.volume = volume * globalVolume;
      audio.play().catch(e => console.log("Voice play failed", e));
      currentVoice = audio;
      
      audio.onended = () => {
        if (currentVoice === audio) currentVoice = null;
      };
    } catch (e) {
      console.error("Failed to play voice", e);
    }
  };

  return {
    setVolume: (v) => { globalVolume = v; },
    playShoot: (weaponType) => {
      if (globalVolume <= 0) return;
      try {
        const ctx = getContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        switch(weaponType) {
          case 'laser':
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(800, ctx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);
            break;
          case 'plasma':
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(400, ctx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.15);
            break;
          case 'rocket':
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(150, ctx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.2);
            break;
          default:
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(600, ctx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.08);
        }
        
        gainNode.gain.setValueAtTime(0.15 * globalVolume, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.2);
      } catch (e) {}
    },
    
    playExplosion: () => {
      if (globalVolume <= 0) return;
      try {
        const ctx = getContext();
        const bufferSize = ctx.sampleRate * 0.3;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
        }
        
        const source = ctx.createBufferSource();
        const gainNode = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        
        source.buffer = buffer;
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
        
        source.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        gainNode.gain.setValueAtTime(0.3 * globalVolume, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        
        source.start();
      } catch (e) {}
    },
    
    playCoin: () => {
      if (globalVolume <= 0) return;
      try {
        const ctx = getContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, ctx.currentTime);
        oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.05);
        
        gainNode.gain.setValueAtTime(0.1 * globalVolume, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.15);
      } catch (e) {}
    },
    
    playPowerup: () => {
      if (globalVolume <= 0) return;
      try {
        const ctx = getContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(400, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.2);

        gainNode.gain.setValueAtTime(0.15 * globalVolume, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.25);
      } catch (e) {}
    },

    playBossTaunt: () => {
      playVoice('/public/wav/crush+you.wav', 0.8);
    },

    playPersistenceTaunt: () => {
      playVoice('/public/wav/persistance.wav', 1.0);
    },

    playNeverStopTaunt: () => {
      playVoice('/public/wav/neverstop.wav', 1.0);
    },

    playMercyTaunt: () => {
      playVoice('/public/wav/mercy.wav', 1.0);
    },

    playDefeatTaunt: () => {
      playVoice('/public/wav/not+possible.wav', 1.0);
    }
  };
};