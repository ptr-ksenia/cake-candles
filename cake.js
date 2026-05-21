const CANDLE_COUNT = 24;
const CANDLE_COLORS = ['#ff3366', '#ffaa00', '#66ddff', '#aaff66', '#ff66cc', '#ffee44'];

export class Cake {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.candles = this.createCandles();
    this.smokeParticles = [];
    this.confettiParticles = [];
    this.celebrating = false;
  }

  createCandles() {
    // Arrange 24 candles in 3 rows of 8 on top of the cake
    const candles = [];
    const rows = 3;
    const cols = 8;
    const cakeTop = 230;
    const cakeLeft = 120;
    const cakeRight = 680;
    const rowSpacing = 25;
    const colSpacing = (cakeRight - cakeLeft) / (cols + 1);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        candles.push({
          x: cakeLeft + colSpacing * (c + 1),
          y: cakeTop - 60 + r * rowSpacing,
          lit: true,
          color: CANDLE_COLORS[(r * cols + c) % CANDLE_COLORS.length],
          flicker: Math.random() * Math.PI * 2,
          extinguishedAt: 0,
        });
      }
    }
    return candles;
  }

  lit() { return this.candles.filter(c => c.lit).length; }

  relightAll() {
    this.candles.forEach(c => { c.lit = true; c.extinguishedAt = 0; });
    this.smokeParticles = [];
    this.confettiParticles = [];
    this.celebrating = false;
  }

  /**
   * Blow out a fraction of currently-lit candles.
   * Returns the number extinguished this blow.
   */
  blow(strength = 1) {
    const litCandles = this.candles.filter(c => c.lit);
    if (litCandles.length === 0) return 0;

    // Blow out 40-70% of lit candles per blow, scaled by strength
    const fraction = 0.4 + Math.random() * 0.3;
    const count = Math.min(litCandles.length, Math.ceil(litCandles.length * fraction * strength));

    // Shuffle and pick
    const shuffled = [...litCandles].sort(() => Math.random() - 0.5);
    const toExtinguish = shuffled.slice(0, count);

    const now = performance.now();
    toExtinguish.forEach(c => {
      c.lit = false;
      c.extinguishedAt = now;
      // Spawn smoke
      for (let i = 0; i < 6; i++) {
        this.smokeParticles.push({
          x: c.x + (Math.random() - 0.5) * 6,
          y: c.y - 18,
          vx: (Math.random() - 0.5) * 0.5,
          vy: -0.5 - Math.random(),
          life: 1,
          size: 4 + Math.random() * 6,
        });
      }
    });

    if (this.lit() === 0 && !this.celebrating) {
      this.celebrating = true;
      this.spawnConfetti();
    }

    return count;
  }

  spawnConfetti() {
    for (let i = 0; i < 200; i++) {
      this.confettiParticles.push({
        x: 400 + (Math.random() - 0.5) * 400,
        y: 250,
        vx: (Math.random() - 0.5) * 8,
        vy: -8 - Math.random() * 8,
        gravity: 0.2,
        life: 1,
        decay: 0.005,
        size: 4 + Math.random() * 6,
        color: CANDLE_COLORS[Math.floor(Math.random() * CANDLE_COLORS.length)],
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.2,
      });
    }
  }

  drawCake() {
    const ctx = this.ctx;

    // Cake base (bottom tier) — chocolate
    ctx.fillStyle = '#4a2818';
    ctx.fillRect(100, 280, 600, 120);
    ctx.fillStyle = '#3a1d10';
    ctx.fillRect(100, 380, 600, 20);

    // Frosting drips on base
    ctx.fillStyle = '#fff0e8';
    ctx.beginPath();
    ctx.moveTo(100, 280);
    for (let x = 100; x <= 700; x += 30) {
      ctx.lineTo(x, 280);
      ctx.quadraticCurveTo(x + 15, 305, x + 30, 280);
    }
    ctx.lineTo(700, 280);
    ctx.lineTo(700, 270);
    ctx.lineTo(100, 270);
    ctx.closePath();
    ctx.fill();

    // Cake top tier (smaller, pink)
    ctx.fillStyle = '#ff9ec7';
    ctx.fillRect(180, 200, 440, 80);
    ctx.fillStyle = '#e57aa8';
    ctx.fillRect(180, 270, 440, 10);

    // Top frosting trim
    ctx.fillStyle = '#ffe0ee';
    ctx.beginPath();
    ctx.moveTo(180, 200);
    for (let x = 180; x <= 620; x += 22) {
      ctx.lineTo(x, 200);
      ctx.quadraticCurveTo(x + 11, 218, x + 22, 200);
    }
    ctx.lineTo(620, 200);
    ctx.lineTo(620, 195);
    ctx.lineTo(180, 195);
    ctx.closePath();
    ctx.fill();

    // Decorative dots on cake
    ctx.fillStyle = '#ff3366';
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      ctx.arc(140 + i * 50, 340, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawCandle(candle, time) {
    const ctx = this.ctx;

    // Candle body
    ctx.fillStyle = candle.color;
    ctx.fillRect(candle.x - 4, candle.y - 18, 8, 22);

    // Candle stripes (decorative)
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(candle.x - 4, candle.y - 14, 8, 2);
    ctx.fillRect(candle.x - 4, candle.y - 6, 8, 2);

    // Wick
    ctx.fillStyle = '#333';
    ctx.fillRect(candle.x - 0.5, candle.y - 22, 1, 4);

    // Flame (only if lit)
    if (candle.lit) {
      const flickerX = Math.sin(time * 0.01 + candle.flicker) * 1.5;
      const flickerScale = 0.9 + Math.sin(time * 0.02 + candle.flicker) * 0.1;

      // Outer glow
      const glow = ctx.createRadialGradient(
        candle.x + flickerX, candle.y - 28,
        0,
        candle.x + flickerX, candle.y - 28,
        20
      );
      glow.addColorStop(0, 'rgba(255, 200, 100, 0.6)');
      glow.addColorStop(1, 'rgba(255, 200, 100, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(candle.x - 25, candle.y - 50, 50, 40);

      // Flame outer (orange)
      ctx.fillStyle = '#ff8c00';
      ctx.beginPath();
      ctx.ellipse(
        candle.x + flickerX,
        candle.y - 28,
        4 * flickerScale,
        9 * flickerScale,
        0, 0, Math.PI * 2
      );
      ctx.fill();

      // Flame inner (yellow)
      ctx.fillStyle = '#ffee44';
      ctx.beginPath();
      ctx.ellipse(
        candle.x + flickerX,
        candle.y - 27,
        2 * flickerScale,
        6 * flickerScale,
        0, 0, Math.PI * 2
      );
      ctx.fill();

      // Hot center (white)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(
        candle.x + flickerX,
        candle.y - 26,
        1 * flickerScale,
        2.5 * flickerScale,
        0, 0, Math.PI * 2
      );
      ctx.fill();
    }
  }

  drawSmoke() {
    const ctx = this.ctx;
    for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
      const p = this.smokeParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy *= 0.99;
      p.life -= 0.015;
      p.size += 0.3;

      if (p.life <= 0) {
        this.smokeParticles.splice(i, 1);
        continue;
      }

      ctx.fillStyle = `rgba(200, 200, 200, ${p.life * 0.5})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawConfetti() {
    const ctx = this.ctx;
    for (let i = this.confettiParticles.length - 1; i >= 0; i--) {
      const p = this.confettiParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.rotation += p.spin;
      p.life -= p.decay;

      if (p.life <= 0 || p.y > 600) {
        this.confettiParticles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }
  }

  render(time) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawCake();
    this.candles.forEach(c => this.drawCandle(c, time));
    this.drawSmoke();
    this.drawConfetti();

    // "Happy Birthday" text when all candles out
    if (this.celebrating) {
      ctx.save();
      ctx.font = 'bold 48px Helvetica';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.shadowBlur = 30;
      ctx.shadowColor = '#ff66cc';
      ctx.fillText('🎉 Happy Birthday! 🎉', this.canvas.width / 2, 100);
      ctx.restore();
    }
  }
}