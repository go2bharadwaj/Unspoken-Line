let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!sharedAudioCtx) {
    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (AudioCtxClass) {
      sharedAudioCtx = new AudioCtxClass();
    }
  }
  return sharedAudioCtx;
}

export async function unlockAudio(): Promise<void> {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      // Audio unlock will retry on user gesture
    }
  }
}

interface ChimeOptions {
  fundamental?: number;
  gain?: number;
}

export function playChime({
  fundamental = 196,
  gain = 0.35,
}: ChimeOptions = {}): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(gain, now);
  master.connect(ctx.destination);

  // Partial ratios: [1, 2.76, 5.40, 8.93] with gains [1, 0.5, 0.25, 0.12]
  // Detune pair on the fundamental (+-1.5 Hz) for gentle beating
  const partialConfigs = [
    { freq: fundamental - 1.5, amp: 0.5, decay: 6.0 },
    { freq: fundamental + 1.5, amp: 0.5, decay: 6.0 },
    { freq: fundamental * 2.76, amp: 0.5, decay: 4.8 },
    { freq: fundamental * 5.4, amp: 0.25, decay: 3.5 },
    { freq: fundamental * 8.93, amp: 0.12, decay: 2.2 },
  ];

  partialConfigs.forEach((cfg) => {
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(cfg.freq, now);

    // Attack 0.02s
    oscGain.gain.setValueAtTime(0.0001, now);
    oscGain.gain.linearRampToValueAtTime(cfg.amp, now + 0.02);
    // Exponential decay over duration
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + cfg.decay);

    osc.connect(oscGain);
    oscGain.connect(master);

    osc.start(now);
    osc.stop(now + cfg.decay + 0.1);

    setTimeout(() => {
      try {
        osc.disconnect();
        oscGain.disconnect();
      } catch {
        // Disconnect cleanup
      }
    }, (cfg.decay + 0.2) * 1000);
  });

  setTimeout(() => {
    try {
      master.disconnect();
    } catch {
      // Disconnect cleanup
    }
  }, 6500);
}

export function startBinauralDrone(
  leftHz = 174,
  rightHz = 180
): () => void {
  const ctx = getAudioContext();
  if (!ctx) return () => {};
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.linearRampToValueAtTime(0.18, now + 3);
  master.connect(ctx.destination);

  // Left channel
  const oscLeft = ctx.createOscillator();
  oscLeft.type = 'sine';
  oscLeft.frequency.setValueAtTime(leftHz, now);
  const panLeft = ctx.createStereoPanner();
  panLeft.pan.setValueAtTime(-1, now);
  oscLeft.connect(panLeft);
  panLeft.connect(master);
  oscLeft.start(now);

  // Right channel
  const oscRight = ctx.createOscillator();
  oscRight.type = 'sine';
  oscRight.frequency.setValueAtTime(rightHz, now);
  const panRight = ctx.createStereoPanner();
  panRight.pan.setValueAtTime(1, now);
  oscRight.connect(panRight);
  panRight.connect(master);
  oscRight.start(now);

  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    const stopNow = ctx.currentTime;
    master.gain.cancelScheduledValues(stopNow);
    master.gain.setValueAtTime(master.gain.value, stopNow);
    master.gain.exponentialRampToValueAtTime(0.0001, stopNow + 1.5);

    setTimeout(() => {
      try {
        oscLeft.stop();
        oscRight.stop();
        oscLeft.disconnect();
        oscRight.disconnect();
        panLeft.disconnect();
        panRight.disconnect();
        master.disconnect();
      } catch {
        // Cleanup ignore
      }
    }, 1600);
  };
}

export function startPinkNoise(): () => void {
  const ctx = getAudioContext();
  if (!ctx) return () => {};
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const sampleRate = ctx.sampleRate;
  const bufferSize = sampleRate * 4;
  const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
  const data = buffer.getChannelData(0);

  // Paul Kellet pink noise filter method
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;

  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }

  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = buffer;
  noiseSource.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(900, ctx.currentTime);

  // Slow LFO for breeze on filter frequency
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(0.1, ctx.currentTime);
  const lfoGain = ctx.createGain();
  lfoGain.gain.setValueAtTime(250, ctx.currentTime);
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);

  const master = ctx.createGain();
  const now = ctx.currentTime;
  master.gain.setValueAtTime(0.0001, now);
  master.gain.linearRampToValueAtTime(0.12, now + 2);

  noiseSource.connect(filter);
  filter.connect(master);
  master.connect(ctx.destination);

  noiseSource.start(now);
  lfo.start(now);

  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    const stopNow = ctx.currentTime;
    master.gain.cancelScheduledValues(stopNow);
    master.gain.setValueAtTime(master.gain.value, stopNow);
    master.gain.exponentialRampToValueAtTime(0.0001, stopNow + 1.5);

    setTimeout(() => {
      try {
        noiseSource.stop();
        lfo.stop();
        noiseSource.disconnect();
        filter.disconnect();
        lfo.disconnect();
        lfoGain.disconnect();
        master.disconnect();
      } catch {
        // Cleanup ignore
      }
    }, 1600);
  };
}

export function playFifth(rootHz: number): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const now = ctx.currentTime;
  const notes = [rootHz, rootHz * 1.5];

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    const targetGain = idx === 0 ? 0.22 : 0.16;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(targetGain, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 2.6);

    setTimeout(() => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {
        // Cleanup
      }
    }, 2700);
  });
}
