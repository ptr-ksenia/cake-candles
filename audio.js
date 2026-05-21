export class AudioDetector {
  constructor() {
    this.audioCtx = null;
    this.analyser = null;
    this.dataArray = null;
    this.timeDomainArray = null;
    this.running = false;

    // ── Blow tuning ──
    this.blowThreshold = 0.25;
    this.blowMinSustainMs = 120;
    this.blowCooldownMs = 600;

    // ── Clap tuning ──
    this.clapThreshold = 0.55;       // peak amplitude (0-1)
    this.clapRiseRatio = 2.5;         // current must be N× the recent average
    this.clapCooldownMs = 400;

    // State
    this.aboveThresholdSince = 0;
    this.lastBlowAt = 0;
    this.lastClapAt = 0;
    this.recentEnergyHistory = new Array(20).fill(0);  // ~333ms @ 60fps
    this.currentLevel = 0;
  }

  async start() {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
      video: false,
    });

    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = this.audioCtx.createMediaStreamSource(stream);

    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.4;   // lower so transients pass through

    source.connect(this.analyser);

    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.timeDomainArray = new Uint8Array(this.analyser.fftSize);
    this.running = true;
  }

  tick(onBlow, onClap) {
    if (!this.running) return;

    this.analyser.getByteFrequencyData(this.dataArray);
    this.analyser.getByteTimeDomainData(this.timeDomainArray);

    const now = performance.now();

    // ── Compute time-domain peak amplitude (for clap) ──
    let peak = 0;
    for (let i = 0; i < this.timeDomainArray.length; i++) {
      const v = Math.abs(this.timeDomainArray[i] - 128) / 128;  // -1..1 → 0..1
      if (v > peak) peak = v;
    }

    // ── Compute frequency bands ──
    // Low band (1-28): breath signature
    let lowSum = 0;
    for (let i = 1; i < 28; i++) lowSum += this.dataArray[i];
    const lowBandAvg = lowSum / 27 / 255;

    // High band (100-300): speech formants / clap broadband
    let highSum = 0;
    for (let i = 100; i < 300; i++) highSum += this.dataArray[i];
    const highBandAvg = highSum / 200 / 255;

    this.currentLevel = lowBandAvg;

    // ── Energy history for clap detection (broadband peak) ──
    const recentAvg = this.recentEnergyHistory.reduce((a, b) => a + b, 0) / this.recentEnergyHistory.length;
    this.recentEnergyHistory.shift();
    this.recentEnergyHistory.push(peak);

    // ──────────────────────────────────────────────
    // CLAP DETECTION
    // Signature: sudden broadband peak — high amplitude AND high band energy,
    //            AND it's much louder than the recent baseline.
    // ──────────────────────────────────────────────
    if (now - this.lastClapAt > this.clapCooldownMs) {
      const isTransient = peak > this.clapThreshold && peak > recentAvg * this.clapRiseRatio;
      const isBroadband = highBandAvg > 0.08;  // claps have high-freq energy

      if (isTransient && isBroadband) {
        this.lastClapAt = now;
        if (onClap) onClap(peak);
        return;   // don't also evaluate blow this frame
      }
    }

    // ──────────────────────────────────────────────
    // BLOW DETECTION
    // Signature: sustained low-band energy without proportional high-band.
    // ──────────────────────────────────────────────
    if (now - this.lastBlowAt < this.blowCooldownMs) {
      this.aboveThresholdSince = 0;
      return;
    }

    const isBreathLike = lowBandAvg > highBandAvg * 1.3;

    if (lowBandAvg > this.blowThreshold && isBreathLike) {
      if (this.aboveThresholdSince === 0) {
        this.aboveThresholdSince = now;
      } else if (now - this.aboveThresholdSince > this.blowMinSustainMs) {
        this.lastBlowAt = now;
        this.aboveThresholdSince = 0;
        const strength = Math.min(1, lowBandAvg * 2);
        if (onBlow) onBlow(strength);
      }
    } else {
      this.aboveThresholdSince = 0;
    }
  }

  stop() {
    this.running = false;
    if (this.audioCtx) this.audioCtx.close();
  }
}

// Backwards-compat alias if you imported BlowDetector elsewhere
export { AudioDetector as BlowDetector };