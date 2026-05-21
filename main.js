import { Cake } from './cake.js';
import { BlowDetector } from './audio.js';

const canvas = document.getElementById('canvas');
const statusEl = document.getElementById('status');
const micFill = document.getElementById('mic-fill');
const counterEl = document.getElementById('counter');
const relightBtn = document.getElementById('relight');

const cake = new Cake(canvas);
const detector = new BlowDetector();

function updateCounter() {
  const lit = cake.lit();
  counterEl.textContent = lit === 0
    ? '🎉 All candles out! Make a wish!'
    : `${lit} candle${lit === 1 ? '' : 's'} lit`;
}

function loop(time) {
  detector.tick((strength) => {
    const count = cake.blow(strength);
    if (count > 0) updateCounter();
  });

  // Mic meter
  micFill.style.width = `${Math.min(100, detector.currentLevel * 200)}%`;

  cake.render(time);
  requestAnimationFrame(loop);
}

async function init() {
  try {
    await detector.start();
    statusEl.textContent = '🎤 Blow on your screen to extinguish candles';
    statusEl.className = 'ready';
    requestAnimationFrame(loop);
  } catch (err) {
    statusEl.textContent = `Microphone error: ${err.message}`;
    statusEl.className = 'error';
    console.error(err);
  }
}

// Microphone access requires user gesture — wait for click
document.body.addEventListener('click', () => {
  if (!detector.running) init();
}, { once: true });

relightBtn.addEventListener('click', () => {
  cake.relightAll();
  updateCounter();
});

// Initial render so cake is visible before mic is enabled
function preLoop(time) {
  cake.render(time);
  if (!detector.running) requestAnimationFrame(preLoop);
}
requestAnimationFrame(preLoop);