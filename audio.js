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

    // ── Clap / loud-sound tuning ──
    this.clapThreshold = 0.35;       // peak amplitude (0-1)
    this.clapCooldownMs = 500;
    this.blowToClapDelay = 2000;     // ignore claps for 2s after a blow

    // State
    this.aboveThresholdSince = 0;
    this.lastBlowAt = 0;
    this.lastClapAt = 0;
    this.currentLevel = 0;

    // Debug — set to true to flood the console with audio stats
    this.debug = true;
    this._debugFrameCounter = 0;
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
    this.analyser.smoothingTimeConstant = 0.4;

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

    // ── Peak amplitude (time domain) ──
    let peak = 0;
    for (let i = 0; i < this.timeDomainArray.length; i++) {
      const v = Math.abs(this.timeDomainArray[i] - 128) / 128;
      if (v > peak) peak = v;
    }

    // ── Frequency bands ──
    let lowSum = 0;
    for (let i = 1; i < 28; i++) lowSum += this.dataArray[i];
    const lowBandAvg = lowSum / 27 / 255;

    let highSum = 0;
    for (let i = 100; i < 300; i++) highSum += this.dataArray[i];
    const highBandAvg = highSum / 200 / 255;

    this.currentLevel = lowBandAvg;

    // ── DEBUG: log every ~10 frames so console isn't completely flooded ──
    if (this.debug) {
      this._debugFrameCounter++;
      if (this._debugFrameCounter % 10 === 0) {
        console.log(
          `peak=${peak.toFixed(2)} low=${lowBandAvg.toFixed(2)} high=${highBandAvg.toFixed(3)}`
        );
      }
      // Always log significant peaks
      if (peak > 0.15) {
        console.log(`>>> LOUD: peak=${peak.toFixed(2)} low=${lowBandAvg.toFixed(2)} high=${highBandAvg.toFixed(3)}`);
      }
    }

    // ──────────────────────────────────────────────
    // LOUD-SOUND DETECTION (relights candles)
    // Triggers on any sudden loud peak — clap, snap, shout, knock.
    // Suppressed for 2s after a blow so finishing a blow doesn't relight.
    // ──────────────────────────────────────────────
    if (now - this.lastClapAt > this.clapCooldownMs
        && now - this.lastBlowAt > this.blowToClapDelay) {
      if (peak > this.clapThreshold) {
        this.lastClapAt = now;
        if (this.debug) console.log(`🔥 CLAP FIRED: peak=${peak.toFixed(2)}`);
        if (onClap) onClap(peak);
        return;
      }
    }

    // ──────────────────────────────────────────────
    // BLOW DETECTION
    // Sustained low-band energy without proportional high-band.
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
        if (this.debug) console.log(`💨 BLOW FIRED: low=${lowBandAvg.toFixed(2)}`);
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

// Backwards-compat alias
export { AudioDetector as BlowDetector };