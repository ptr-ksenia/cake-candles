import * as THREE from 'three';

const CANDLE_COUNT = 24;
const CANDLE_COLORS = [
  0xffb3ba, 0xffdfba, 0xffffba, 0xbaffc9,
  0xbae1ff, 0xd4baff, 0xffbae1, 0xc9c9c9,
];

export class Cake {
  constructor(canvas) {
    this.canvas = canvas;
    this.celebrating = false;

    // ── Scene setup ──
    this.scene = new THREE.Scene();
    this.scene.background = null;  // transparent so body gradient shows

    this.camera = new THREE.PerspectiveCamera(40, canvas.width / canvas.height, 0.1, 100);
    this.camera.position.set(0, 4.5, 8);
    this.camera.lookAt(0, 0.5, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(canvas.width, canvas.height, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // ── Lighting ──
    const ambient = new THREE.AmbientLight(0xfff0e0, 0.4);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(5, 10, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffcccc, 0.4);
    fillLight.position.set(-5, 3, -5);
    this.scene.add(fillLight);

    // Per-candle flame point lights — combined for performance
    this.candleLight = new THREE.PointLight(0xffaa44, 1.5, 8);
    this.candleLight.position.set(0, 2.5, 0);
    this.scene.add(this.candleLight);

    // ── Build the cake ──
    this.cakeGroup = new THREE.Group();
    this.scene.add(this.cakeGroup);
    this.buildPlatter();
    this.buildCakeBody();
    this.buildTruffles();
    this.candles = this.buildCandles();

    // ── Particles (smoke + confetti) ──
    this.smokeParticles = [];
    this.confettiParticles = [];
    this.smokeGroup = new THREE.Group();
    this.confettiGroup = new THREE.Group();
    this.scene.add(this.smokeGroup, this.confettiGroup);

    // ── Resize handling ──
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  buildPlatter() {
    // Yellow outer ring
    const outerRing = new THREE.Mesh(
      new THREE.CylinderGeometry(3.2, 3.2, 0.15, 64),
      new THREE.MeshStandardMaterial({ color: 0xffee33, roughness: 0.4 })
    );
    outerRing.position.y = -0.6;
    outerRing.receiveShadow = true;
    this.cakeGroup.add(outerRing);

    // Pink middle ring
    const pinkRing = new THREE.Mesh(
      new THREE.CylinderGeometry(2.85, 2.85, 0.17, 64),
      new THREE.MeshStandardMaterial({ color: 0xff2266, roughness: 0.4 })
    );
    pinkRing.position.y = -0.59;
    pinkRing.receiveShadow = true;
    this.cakeGroup.add(pinkRing);

    // Gray inner platter
    const innerPlatter = new THREE.Mesh(
      new THREE.CylinderGeometry(2.5, 2.5, 0.18, 64),
      new THREE.MeshStandardMaterial({ color: 0xb8b8b8, roughness: 0.6, metalness: 0.3 })
    );
    innerPlatter.position.y = -0.58;
    innerPlatter.receiveShadow = true;
    this.cakeGroup.add(innerPlatter);
  }

  buildCakeBody() {
    // Main cake cylinder — white frosted body
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(2.0, 2.0, 1.0, 48),
      new THREE.MeshStandardMaterial({ color: 0xeeeae0, roughness: 0.85 })
    );
    body.position.y = 0;
    body.castShadow = true;
    body.receiveShadow = true;
    this.cakeGroup.add(body);

    // Jagged frosting peaks on top — random triangular spikes
    const topY = 0.5;
    const peakCount = 60;
    const peakGeometry = new THREE.ConeGeometry(0.18, 0.35, 4);
    const peakMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5f0e6,
      roughness: 0.9,
    });

    for (let i = 0; i < peakCount; i++) {
      const peak = new THREE.Mesh(peakGeometry, peakMaterial);
      const r = Math.random() * 1.85;
      const angle = Math.random() * Math.PI * 2;
      peak.position.set(
        Math.cos(angle) * r,
        topY + 0.15 + Math.random() * 0.1,
        Math.sin(angle) * r,
      );
      peak.rotation.set(
        (Math.random() - 0.5) * 0.6,
        Math.random() * Math.PI,
        (Math.random() - 0.5) * 0.6,
      );
      peak.castShadow = true;
      this.cakeGroup.add(peak);
    }
  }

  buildTruffles() {
    // Chocolate truffles around the perimeter at base, and a few on top
    const truffleMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a1d10,
      roughness: 0.3,
      metalness: 0.1,
    });

    // Bottom ring of truffles (around the cake base)
    const bottomCount = 14;
    for (let i = 0; i < bottomCount; i++) {
      const t = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), truffleMaterial);
      const angle = (i / bottomCount) * Math.PI * 2;
      t.position.set(Math.cos(angle) * 2.2, -0.35, Math.sin(angle) * 2.2);
      t.castShadow = true;
      this.cakeGroup.add(t);
    }

    // Scatter a few on top
    const topPositions = [
      [0.7, 0.7, -0.5], [-1.0, 0.7, 0.3], [0.2, 0.7, 1.2],
      [-0.5, 0.7, -1.2], [1.3, 0.7, 0.6], [-1.4, 0.7, -0.5],
    ];
    topPositions.forEach(([x, y, z]) => {
      const t = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), truffleMaterial);
      t.position.set(x, y, z);
      t.castShadow = true;
      this.cakeGroup.add(t);
    });
  }

  buildCandles() {
    const candles = [];

    // Two concentric rings — inner ring of 8, outer ring of 16
    const inner = { count: 8, radius: 0.6 };
    const outer = { count: 16, radius: 1.4 };

    const arrangements = [];
    for (let i = 0; i < inner.count; i++) {
      const angle = (i / inner.count) * Math.PI * 2;
      arrangements.push({
        x: Math.cos(angle) * inner.radius,
        z: Math.sin(angle) * inner.radius,
      });
    }
    for (let i = 0; i < outer.count; i++) {
      const angle = (i / outer.count) * Math.PI * 2;
      arrangements.push({
        x: Math.cos(angle) * outer.radius,
        z: Math.sin(angle) * outer.radius,
      });
    }

    arrangements.forEach((pos, idx) => {
      const candle = this.makeCandle(CANDLE_COLORS[idx % CANDLE_COLORS.length]);
      candle.group.position.set(pos.x, 0.5, pos.z);
      this.cakeGroup.add(candle.group);
      candles.push(candle);
    });

    return candles;
  }

  makeCandle(color) {
    const group = new THREE.Group();

    // Candle body — thin tall cylinder
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.5,
      metalness: 0.05,
    });
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.95, 12),
      bodyMaterial
    );
    body.position.y = 0.475;
    body.castShadow = true;
    group.add(body);

    // Wick
    const wick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.08, 6),
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    wick.position.y = 0.99;
    group.add(wick);

    // Flame — small ellipsoid sphere with emissive material
    const flameMaterial = new THREE.MeshStandardMaterial({
      color: 0xffcc00,
      emissive: 0xff8800,
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 0.95,
    });
    const flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 12, 12),
      flameMaterial
    );
    flame.scale.set(0.8, 1.8, 0.8);
    flame.position.y = 1.12;
    group.add(flame);

    // Inner hot core
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
    });
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 8, 8),
      coreMaterial
    );
    core.scale.set(0.6, 1.4, 0.6);
    core.position.y = 1.10;
    group.add(core);

    return {
      group,
      flame,
      core,
      lit: true,
      flickerSeed: Math.random() * Math.PI * 2,
    };
  }

  lit() { return this.candles.filter(c => c.lit).length; }

  relightAll() {
    this.candles.forEach(c => {
      c.lit = true;
      c.flame.visible = true;
      c.core.visible = true;
    });
    this.celebrating = false;
    // Clear particles
    this.smokeParticles.forEach(p => this.smokeGroup.remove(p.mesh));
    this.smokeParticles = [];
    this.confettiParticles.forEach(p => this.confettiGroup.remove(p.mesh));
    this.confettiParticles = [];
  }

  blow(strength = 1) {
    const litCandles = this.candles.filter(c => c.lit);
    if (litCandles.length === 0) return 0;

    const fraction = 0.4 + Math.random() * 0.3;
    const count = Math.min(litCandles.length, Math.ceil(litCandles.length * fraction * strength));

    const shuffled = [...litCandles].sort(() => Math.random() - 0.5);
    const toExtinguish = shuffled.slice(0, count);

    toExtinguish.forEach(c => {
      c.lit = false;
      c.flame.visible = false;
      c.core.visible = false;

      // Spawn smoke at the candle's world position
      const worldPos = new THREE.Vector3();
      c.group.getWorldPosition(worldPos);

      for (let i = 0; i < 4; i++) {
        const smokeMesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.08, 8, 8),
          new THREE.MeshBasicMaterial({
            color: 0xaaaaaa,
            transparent: true,
            opacity: 0.4,
          })
        );
        smokeMesh.position.copy(worldPos);
        smokeMesh.position.y += 1.15;
        this.smokeGroup.add(smokeMesh);
        this.smokeParticles.push({
          mesh: smokeMesh,
          vy: 0.015 + Math.random() * 0.02,
          vx: (Math.random() - 0.5) * 0.01,
          vz: (Math.random() - 0.5) * 0.01,
          life: 1,
          growthRate: 0.008,
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
    for (let i = 0; i < 150; i++) {
      const confettiMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.1, 0.05),
        new THREE.MeshStandardMaterial({
          color: CANDLE_COLORS[Math.floor(Math.random() * CANDLE_COLORS.length)],
          side: THREE.DoubleSide,
        })
      );
      confettiMesh.position.set(
        (Math.random() - 0.5) * 4,
        1.5,
        (Math.random() - 0.5) * 4,
      );
      this.confettiGroup.add(confettiMesh);
      this.confettiParticles.push({
        mesh: confettiMesh,
        vx: (Math.random() - 0.5) * 0.08,
        vy: 0.08 + Math.random() * 0.08,
        vz: (Math.random() - 0.5) * 0.08,
        spinX: (Math.random() - 0.5) * 0.2,
        spinZ: (Math.random() - 0.5) * 0.2,
        life: 1,
      });
    }
  }

  updateParticles() {
    // Smoke
    for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
      const p = this.smokeParticles[i];
      p.mesh.position.y += p.vy;
      p.mesh.position.x += p.vx;
      p.mesh.position.z += p.vz;
      p.mesh.scale.x += p.growthRate;
      p.mesh.scale.y += p.growthRate;
      p.mesh.scale.z += p.growthRate;
      p.life -= 0.015;
      p.mesh.material.opacity = p.life * 0.4;
      if (p.life <= 0) {
        this.smokeGroup.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.smokeParticles.splice(i, 1);
      }
    }

    // Confetti
    for (let i = this.confettiParticles.length - 1; i >= 0; i--) {
      const p = this.confettiParticles[i];
      p.mesh.position.x += p.vx;
      p.mesh.position.y += p.vy;
      p.mesh.position.z += p.vz;
      p.vy -= 0.004;
      p.mesh.rotation.x += p.spinX;
      p.mesh.rotation.z += p.spinZ;
      p.life -= 0.006;
      if (p.life <= 0 || p.mesh.position.y < -1) {
        this.confettiGroup.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.confettiParticles.splice(i, 1);
      }
    }
  }

  render(time) {
    const t = time * 0.001;

    // Animate flame flicker for each lit candle
    let anyLit = false;
    this.candles.forEach(c => {
      if (!c.lit) return;
      anyLit = true;
      const flicker = 0.85 + Math.sin(t * 8 + c.flickerSeed) * 0.1 + Math.random() * 0.05;
      c.flame.scale.set(0.8 * flicker, 1.8 * flicker, 0.8 * flicker);
      c.flame.material.emissiveIntensity = 1.2 + Math.sin(t * 10 + c.flickerSeed) * 0.4;
    });

    // Combined candle light intensity scales with lit count
    if (this.candleLight) {
      const intensity = (this.lit() / CANDLE_COUNT) * 2.0;
      this.candleLight.intensity = intensity * (0.85 + Math.sin(t * 6) * 0.15);
    }

    // Slow rotation of the whole cake — gives the 3D feel
    this.cakeGroup.rotation.y = Math.sin(t * 0.15) * 0.15;

    this.updateParticles();
    this.renderer.render(this.scene, this.camera);
  }
}