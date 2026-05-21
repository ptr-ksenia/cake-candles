export class AudioDetector {
  constructor() {
    this.audioCtx = null;
    this.analyser = null;
    this.dataArray = null;
    this.timeDomainArray = null;
    this.running = false;

    this.blowThreshold = 0.25;
    this.blowMinSustainMs = 120;
    this.blowCooldownMs = 600;

    this.loudThreshold = 0.3;
    this.loudCooldownMs = 500;
    this.blowToLoudDelay = 2500;

    this.aboveThresholdSince = 0;
    this.lastBlowAt = 0;
    this.lastLoudAt = 0;
    this.currentLevel = 0;
  }

  async start() {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
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

    let peak = 0;
    for (let i = 0; i < this.timeDomainArray.length; i++) {
      const v = Math.abs(this.timeDomainArray[i] - 128) / 128;
      if (v > peak) peak = v;
    }

    let lowSum = 0;
    for (let i = 1; i < 28; i++) lowSum += this.dataArray[i];
    const lowBandAvg = lowSum / 27 / 255;

    let highSum = 0;
    for (let i = 100; i < 300; i++) highSum += this.dataArray[i];
    const highBandAvg = highSum / 200 / 255;

    this.currentLevel = lowBandAvg;

    // Loud sound → relight (clap, shout, knock, anything sharp)
    if (now - this.lastLoudAt > this.loudCooldownMs
        && now - this.lastBlowAt > this.blowToLoudDelay
        && peak > this.loudThreshold) {
      this.lastLoudAt = now;
      if (onClap) onClap(peak);
      return;
    }

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
        if (onBlow) onBlow(Math.min(1, lowBandAvg * 2));
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

export { AudioDetector as BlowDetector };