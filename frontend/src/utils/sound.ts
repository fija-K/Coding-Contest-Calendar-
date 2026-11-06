export const MUTE_STORAGE_KEY = 'ccc_celebration_sound_muted';

/**
 * Checks whether the user has muted the celebration clapping sound.
 */
export function isCelebrationSoundMuted(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }
  try {
    return localStorage.getItem(MUTE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Persists the user's celebration sound mute preference.
 */
export function setCelebrationSoundMuted(muted: boolean): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    localStorage.setItem(MUTE_STORAGE_KEY, muted ? 'true' : 'false');
  } catch (err) {
    console.warn('Could not persist sound mute preference:', err);
  }
}

/**
 * Plays a short, soft synthesized applause clip (1.6s).
 * Volume is kept gentle (default 0.22).
 * Fails gracefully and silently if audio context is blocked or unavailable in the environment.
 */
export function playClappingSound(volume = 0.22): void {
  if (typeof window === 'undefined') return;
  if (isCelebrationSoundMuted()) return;

  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const duration = 1.6;
    const sampleRate = ctx.sampleRate || 44100;
    const bufferSize = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const channelData = buffer.getChannelData(0);

    // Generate ~42 randomized soft handclaps across 1.3s
    const clapCount = 42;
    for (let c = 0; c < clapCount; c++) {
      // Claps begin around 40ms and spread through 1.25s
      const clapStart = Math.floor((0.04 + Math.random() * 1.2) * sampleRate);
      const clapLength = Math.floor((0.025 + Math.random() * 0.035) * sampleRate);
      const intensity = 0.3 + Math.random() * 0.7;

      for (let i = 0; i < clapLength && clapStart + i < bufferSize; i++) {
        // Fast attack, exponential decay for a crisp cupped hand slap
        const envelope = Math.exp(-i / (clapLength * 0.24));
        const noise = (Math.random() * 2 - 1) * envelope * intensity;
        channelData[clapStart + i] += noise * 0.14;
      }
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // Resonant bandpass filter to simulate hollow cupped hand acoustics (~1450Hz)
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 1450;
    bandpass.Q.value = 1.8;

    // Highpass filter to eliminate sub-bass rumble
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 400;

    // Master volume control with gentle fade-out
    const gainNode = ctx.createGain();
    const now = ctx.currentTime;
    gainNode.gain.setValueAtTime(volume, now);
    gainNode.gain.setValueAtTime(volume, now + 1.1);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    source.connect(highpass);
    highpass.connect(bandpass);
    bandpass.connect(gainNode);
    gainNode.connect(ctx.destination);

    source.start(now);
    source.onended = () => {
      try {
        ctx.close().catch(() => {});
      } catch {}
    };
  } catch (err) {
    console.debug('Applause audio playback skipped:', err);
  }
}
