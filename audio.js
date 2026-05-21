export class BlowDetector {
    constructor() {
      this.audioCtx = null;
      this.analyser = null;
      this.dataArray = null;
      this.running = false;
  
      // Tuning — adjust if too sensitive or not sensitive enough
      this.threshold = 0.25;         // 0-1, RMS of low-freq band must exceed this
      this.minSustainMs = 120;       // must hold above threshold this long to count as a blow
      this.cooldownMs = 600;         // ignore further blows for this long after detection
  
      // State
      this.aboveThresholdSince = 0;
      this.lastBlowAt = 0;
      this.currentLevel = 0;          // for UI meter
    }
  
    async start() {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,    // ← critical: noise suppression KILLS breath sounds
          autoGainControl: false,
        },
        video: false,
      });
  
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = this.audioCtx.createMediaStreamSource(stream);
  
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.6;
  
      source.connect(this.analyser);
  
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.running = true;
    }
  
    /**
     * Call this from your render loop. Returns blow strength (0-1)
     * if a blow was detected on this frame, otherwise null.
     */
    tick(onBlow) {
      if (!this.running) return;
  
      this.analyser.getByteFrequencyData(this.dataArray);
  
      // Bin frequency: sampleRate / fftSize. At 44.1kHz / 2048 = 21.5 Hz per bin.
      // Breath/blow energy lives below ~600 Hz. Use bins 1-28 (skip DC bin 0).
      const lowBandStart = 1;
      const lowBandEnd = 28;
      let sum = 0;
      for (let i = lowBandStart; i < lowBandEnd; i++) {
        sum += this.dataArray[i];
      }
      const lowBandAvg = sum / (lowBandEnd - lowBandStart) / 255;  // normalize 0-1
  
      // Also check high band — speech has formants up there, breath doesn't
      let highSum = 0;
      for (let i = 100; i < 300; i++) {
        highSum += this.dataArray[i];
      }
      const highBandAvg = highSum / 200 / 255;
  
      // Breath signature: strong low band, weak high band
      // Ratio > 1.5 means low energy dominates → likely breath
      const isBreathLike = lowBandAvg > highBandAvg * 1.3;
  
      this.currentLevel = lowBandAvg;
  
      const now = performance.now();
  
      // Cooldown — don't double-fire
      if (now - this.lastBlowAt < this.cooldownMs) {
        this.aboveThresholdSince = 0;
        return;
      }
  
      if (lowBandAvg > this.threshold && isBreathLike) {
        if (this.aboveThresholdSince === 0) {
          this.aboveThresholdSince = now;
        } else if (now - this.aboveThresholdSince > this.minSustainMs) {
          // Confirmed blow
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