import { Cake } from './cake.js';
import { AudioDetector } from './audio.js';

const canvas = document.getElementById('canvas');
const statusEl = document.getElementById('status');
const micFill = document.getElementById('mic-fill');
const counterEl = document.getElementById('counter');
const relightBtn = document.getElementById('relight');

const cake = new Cake(canvas);
const detector = new AudioDetector();

function updateCounter() {
  const lit = cake.lit();
  counterEl.textContent = lit === 0
    ? '🎉 All candles out! Clap to relight 👏'
    : `${lit} candle${lit === 1 ? '' : 's'} lit`;
}

function flashStatus(msg, ms = 1500) {
  const original = statusEl.textContent;
  const originalClass = statusEl.className;
  statusEl.textContent = msg;
  statusEl.className = 'ready';
  setTimeout(() => {
    statusEl.textContent = original;
    statusEl.className = originalClass;
  }, ms);
}

function loop(time) {
  detector.tick(
    // onBlow
    (strength) => {
      const count = cake.blow(strength);
      if (count > 0) updateCounter();
    },
    // onClap
    () => {
      if (cake.lit() < 24) {
        cake.relightAll();
        updateCounter();
        flashStatus('🔥 Candles relit!');
      }
    }
  );

  micFill.style.width = `${Math.min(100, detector.currentLevel * 200)}%`;

  cake.render(time);
  requestAnimationFrame(loop);
}

async function init() {
  try {
    await detector.start();
    statusEl.textContent = '🎤 Blow to extinguish, clap to relight';
    statusEl.className = 'ready';
    requestAnimationFrame(loop);
  } catch (err) {
    statusEl.textContent = `Microphone error: ${err.message}`;
    statusEl.className = 'error';
    console.error(err);
  }
}

// Microphone needs user gesture — start on first click anywhere
document.body.addEventListener('click', () => {
  if (!detector.running) init();
}, { once: true });

// Keep the button as a backup
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