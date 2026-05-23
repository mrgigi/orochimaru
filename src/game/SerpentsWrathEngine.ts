// SerpentsWrathEngine.ts
// Side-scrolling battle arena engine for Orochimaru: Serpent's Wrath

export type AttackType = 'snake_strike' | 'shadow_snake' | 'kusanagi' | 'edo_tensei';
export type EnemyType = 'genin' | 'chunin' | 'anbu' | 'jonin';

export interface AttackDef {
  key: string;
  label: string;
  damage: number;
  chakraCost: number;
  cooldown: number; // ms
  range: number;
  projectileSpeed: number;
  color: string;
  aoeRadius: number; // 0 = no AOE
  description: string;
}

export const ATTACK_DEFS: Record<AttackType, AttackDef> = {
  snake_strike: {
    key: 'Q',
    label: 'Snake Strike',
    damage: 18,
    chakraCost: 8,
    cooldown: 400,
    range: 120,
    projectileSpeed: 9,
    color: '#39ff14',
    aoeRadius: 0,
    description: 'Quick venom bite'
  },
  shadow_snake: {
    key: 'E',
    label: 'Shadow Hands',
    damage: 38,
    chakraCost: 20,
    cooldown: 800,
    range: 200,
    projectileSpeed: 7,
    color: '#a855f7',
    aoeRadius: 30,
    description: 'Shadow Snake Hands'
  },
  kusanagi: {
    key: 'R',
    label: 'Kusanagi',
    damage: 70,
    chakraCost: 35,
    cooldown: 1600,
    range: 280,
    projectileSpeed: 12,
    color: '#818cf8',
    aoeRadius: 0,
    description: 'Legendary sword slash'
  },
  edo_tensei: {
    key: 'Space',
    label: 'Edo Tensei',
    damage: 200,
    chakraCost: 75,
    cooldown: 5000,
    range: 500,
    projectileSpeed: 0,
    color: '#ff6b00',
    aoeRadius: 180,
    description: 'Ultimate reanimation'
  }
};

export interface WaveDef {
  wave: number;
  label: string;
  enemies: Array<{ type: EnemyType; count: number }>;
  spawnInterval: number; // ms between spawns
}

export const WAVE_DEFS: WaveDef[] = [
  { wave: 1, label: 'Leaf Village Genin', enemies: [{ type: 'genin', count: 8 }], spawnInterval: 1200 },
  { wave: 2, label: 'Chunin Assault', enemies: [{ type: 'genin', count: 5 }, { type: 'chunin', count: 4 }], spawnInterval: 1000 },
  { wave: 3, label: 'ANBU Black Ops', enemies: [{ type: 'chunin', count: 4 }, { type: 'anbu', count: 4 }], spawnInterval: 900 },
  { wave: 4, label: 'Jonin Strike Force', enemies: [{ type: 'chunin', count: 3 }, { type: 'anbu', count: 3 }, { type: 'jonin', count: 2 }], spawnInterval: 800 },
  { wave: 5, label: 'Elite Guard', enemies: [{ type: 'anbu', count: 4 }, { type: 'jonin', count: 4 }], spawnInterval: 700 },
  { wave: 6, label: 'Konoha Full Assault', enemies: [{ type: 'anbu', count: 4 }, { type: 'jonin', count: 6 }], spawnInterval: 600 }
];

export interface EnemyConfig {
  hp: number;
  speed: number;
  damage: number;
  size: number;
  color: string;
  scoreValue: number;
  attackRange: number;
  attackCooldown: number;
}

export const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  genin: { hp: 40, speed: 1.4, damage: 8, size: 18, color: '#4ade80', scoreValue: 50, attackRange: 28, attackCooldown: 1200 },
  chunin: { hp: 80, speed: 1.8, damage: 15, size: 20, color: '#fbbf24', scoreValue: 120, attackRange: 30, attackCooldown: 1000 },
  anbu: { hp: 140, speed: 2.5, damage: 22, size: 22, color: '#e2e8f0', scoreValue: 250, attackRange: 35, attackCooldown: 900 },
  jonin: { hp: 240, speed: 2.0, damage: 35, size: 26, color: '#f43f5e', scoreValue: 500, attackRange: 38, attackCooldown: 800 }
};

// ── Core entities ────────────────────────────────────────────────────────────

interface Vec2 { x: number; y: number; }

class Particle {
  pos: Vec2; vel: Vec2;
  color: string; alpha = 1; size: number; life: number; maxLife: number;
  constructor(x: number, y: number, color: string, speed = 3, size = 4, life = 30) {
    this.pos = { x, y };
    const ang = Math.random() * Math.PI * 2;
    this.vel = { x: Math.cos(ang) * speed * Math.random(), y: Math.sin(ang) * speed * Math.random() };
    this.color = color; this.size = size + Math.random() * 2;
    this.life = life + Math.floor(Math.random() * 15); this.maxLife = this.life;
  }
  update() { this.pos.x += this.vel.x; this.pos.y += this.vel.y; this.vel.x *= 0.92; this.vel.y *= 0.92; this.life--; this.alpha = this.life / this.maxLife; }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.save(); ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 8; ctx.shadowColor = this.color;
    ctx.beginPath(); ctx.arc(this.pos.x, this.pos.y, this.size, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

class FloatText {
  pos: Vec2; text: string; color: string; alpha = 1; life = 60; vy = -1.2;
  constructor(x: number, y: number, text: string, color = '#fff') { this.pos = { x, y }; this.text = text; this.color = color; }
  update() { this.pos.y += this.vy; this.life--; this.alpha = this.life / 60; }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.save(); ctx.globalAlpha = this.alpha;
    ctx.font = 'bold 14px Orbitron, sans-serif'; ctx.fillStyle = this.color;
    ctx.textAlign = 'center'; ctx.shadowBlur = 10; ctx.shadowColor = this.color;
    ctx.fillText(this.text, this.pos.x, this.pos.y); ctx.restore();
  }
}

class Projectile {
  pos: Vec2; vel: Vec2;
  damage: number; color: string; radius: number; aoeRadius: number;
  alive = true; type: AttackType;
  trail: Vec2[] = [];

  constructor(x: number, y: number, dir: number, atk: AttackDef, type: AttackType) {
    this.pos = { x, y };
    this.vel = { x: Math.cos(dir) * atk.projectileSpeed, y: Math.sin(dir) * atk.projectileSpeed };
    this.damage = atk.damage; this.color = atk.color; this.type = type;
    this.radius = type === 'edo_tensei' ? atk.aoeRadius : 7;
    this.aoeRadius = atk.aoeRadius;
  }

  update() {
    if (this.type === 'edo_tensei') return; // AOE is instant
    this.trail.push({ x: this.pos.x, y: this.pos.y });
    if (this.trail.length > 8) this.trail.shift();
    this.pos.x += this.vel.x; this.pos.y += this.vel.y;
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Draw trail
    this.trail.forEach((pt, i) => {
      ctx.save();
      ctx.globalAlpha = (i / this.trail.length) * 0.4;
      ctx.fillStyle = this.color;
      ctx.shadowBlur = 6; ctx.shadowColor = this.color;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, this.radius * 0.6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });

    ctx.save();
    ctx.shadowBlur = 18; ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2); ctx.fill();
    // Inner bright core
    ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.7;
    ctx.beginPath(); ctx.arc(this.pos.x, this.pos.y, this.radius * 0.35, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

class Enemy {
  pos: Vec2; vel: Vec2 = { x: 0, y: 0 };
  hp: number; maxHp: number; type: EnemyType;
  config: EnemyConfig;
  alive = true; stunTimer = 0;
  lastAttack = 0; hitFlash = 0;
  groundY: number;

  constructor(x: number, groundY: number, type: EnemyType) {
    this.pos = { x, y: groundY - ENEMY_CONFIGS[type].size };
    this.groundY = groundY;
    this.type = type;
    this.config = ENEMY_CONFIGS[type];
    this.hp = this.maxHp = this.config.hp;
  }

  update(playerX: number, playerY: number) {
    if (this.stunTimer > 0) { this.stunTimer--; return; }
    const dx = playerX - this.pos.x;
    const dy = playerY - this.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 2) {
      this.pos.x += (dx / dist) * this.config.speed;
      this.pos.y += (dy / dist) * this.config.speed;
    }
    if (this.hitFlash > 0) this.hitFlash--;
  }

  takeDamage(amount: number) {
    this.hp = Math.max(0, this.hp - amount);
    this.hitFlash = 8;
    this.stunTimer = 4;
    if (this.hp <= 0) this.alive = false;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const { x, y } = this.pos;
    const sz = this.config.size;

    ctx.save();
    if (this.hitFlash > 0 && this.hitFlash % 2 === 0) {
      ctx.shadowBlur = 20; ctx.shadowColor = '#fff';
    }

    // Body
    ctx.fillStyle = this.hitFlash > 0 ? '#fff' : this.config.color;
    ctx.beginPath(); ctx.arc(x, y, sz, 0, Math.PI * 2); ctx.fill();

    // Headband
    ctx.fillStyle = '#166534';
    ctx.fillRect(x - sz * 0.8, y - sz * 0.3, sz * 1.6, sz * 0.35);

    // Eyes
    ctx.fillStyle = '#1a0a2e';
    ctx.beginPath(); ctx.arc(x - 5, y - 4, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 5, y - 4, 3, 0, Math.PI * 2); ctx.fill();

    // HP bar
    const barW = sz * 2.2; const barH = 4;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - barW / 2, y - sz - 12, barW, barH);
    ctx.fillStyle = this.hp / this.maxHp > 0.5 ? '#22c55e' : this.hp / this.maxHp > 0.25 ? '#f59e0b' : '#ef4444';
    ctx.fillRect(x - barW / 2, y - sz - 12, barW * (this.hp / this.maxHp), barH);

    ctx.restore();
  }
}

class Player {
  pos: Vec2;
  vel: Vec2 = { x: 0, y: 0 };
  hp = 100; maxHp = 100;
  chakra = 100; maxChakra = 100;
  chakraRegen = 0.04; // per frame
  speed = 3.5;
  facing = 1; // 1 = right, -1 = left
  groundY: number;
  isJumping = false;
  jumpVel = 0;
  gravity = 0.5;
  hitFlash = 0;
  invincibleTimer = 0;
  cooldowns: Record<AttackType, number> = { snake_strike: 0, shadow_snake: 0, kusanagi: 0, edo_tensei: 0 };

  constructor(x: number, groundY: number) {
    this.pos = { x, y: groundY - 28 };
    this.groundY = groundY;
  }

  update() {
    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;
    this.chakra = Math.min(this.maxChakra, this.chakra + this.chakraRegen);

    // Cooldown countdown
    (Object.keys(this.cooldowns) as AttackType[]).forEach(k => {
      if (this.cooldowns[k] > 0) this.cooldowns[k]--;
    });
    if (this.hitFlash > 0) this.hitFlash--;
    if (this.invincibleTimer > 0) this.invincibleTimer--;
  }

  jump() {
    // No-op in 2D free movement mode
  }

  canAttack(type: AttackType): boolean {
    return this.cooldowns[type] === 0 && this.chakra >= ATTACK_DEFS[type].chakraCost;
  }

  useAttack(type: AttackType): boolean {
    if (!this.canAttack(type)) return false;
    const def = ATTACK_DEFS[type];
    this.chakra -= def.chakraCost;
    this.cooldowns[type] = Math.ceil(def.cooldown / (1000 / 60)); // convert ms → frames
    return true;
  }

  takeDamage(amount: number) {
    if (this.invincibleTimer > 0) return;
    this.hp = Math.max(0, this.hp - amount);
    this.hitFlash = 12;
    this.invincibleTimer = 40; // short iframe after hit
  }

  draw(ctx: CanvasRenderingContext2D) {
    const { x, y } = this.pos;
    ctx.save();

    // Glow aura
    const grad = ctx.createRadialGradient(x, y, 4, x, y, 45);
    grad.addColorStop(0, 'rgba(189,0,255,0.3)');
    grad.addColorStop(1, 'rgba(189,0,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(x, y, 45, 0, Math.PI * 2); ctx.fill();

    if (this.hitFlash > 0 && this.hitFlash % 2 === 0) {
      ctx.shadowBlur = 25; ctx.shadowColor = '#ef4444';
    } else {
      ctx.shadowBlur = 15; ctx.shadowColor = '#bd00ff';
    }

    // Robe body
    ctx.fillStyle = '#d1dbe5';
    ctx.beginPath();
    ctx.ellipse(x, y, 18, 26, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sash / belt (purple)
    ctx.fillStyle = '#5c00a3';
    ctx.fillRect(x - 15, y + 4, 30, 8);

    // Face / Head (pale)
    ctx.fillStyle = '#f0e8d5';
    ctx.beginPath(); ctx.arc(x, y - 18, 13, 0, Math.PI * 2); ctx.fill();

    // Hair
    ctx.fillStyle = '#0f172a';
    ctx.beginPath(); ctx.arc(x, y - 22, 11, 0, Math.PI * 0.8, true); ctx.fill();
    // Side hair strands
    ctx.fillRect(x - 12, y - 24, 4, 18);
    ctx.fillRect(x + 8, y - 24, 4, 18);

    // Purple eye markings
    ctx.fillStyle = '#7c3aed';
    ctx.beginPath(); ctx.arc(x - 4, y - 18, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 4, y - 18, 2.5, 0, Math.PI * 2); ctx.fill();

    // Yellow snake eyes
    ctx.fillStyle = '#eab308';
    ctx.beginPath(); ctx.arc(x - 4, y - 18, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 4, y - 18, 1.2, 0, Math.PI * 2); ctx.fill();

    // Kusanagi sword (always visible on right side)
    ctx.strokeStyle = '#818cf8'; ctx.lineWidth = 3; ctx.shadowColor = '#818cf8'; ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(x + 14 * this.facing, y - 5);
    ctx.lineTo(x + 55 * this.facing, y - 22);
    ctx.stroke();

    ctx.restore();
  }
}

// ── Screen shake ─────────────────────────────────────────────────────────────
class ScreenShake {
  intensity = 0; duration = 0;
  trigger(intensity: number, duration: number) {
    this.intensity = Math.max(this.intensity, intensity);
    this.duration = Math.max(this.duration, duration);
  }
  update(): Vec2 {
    if (this.duration <= 0) return { x: 0, y: 0 };
    this.duration--;
    const mag = this.intensity * (this.duration / 20);
    return { x: (Math.random() - 0.5) * mag * 2, y: (Math.random() - 0.5) * mag * 2 };
  }
}

// ── Main Engine ──────────────────────────────────────────────────────────────

export interface SerpentsWrathConfig {
  canvas: HTMLCanvasElement;
  onGameOver: (score: number, kills: number, wavesCleared: number) => void;
  onVictory: (score: number, kills: number) => void;
  onPlaySound: (type: 'hit' | 'attack' | 'ultimate' | 'death' | 'wave') => void;
  showHUD?: boolean;
}

export class SerpentsWrathEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private onGameOver: SerpentsWrathConfig['onGameOver'];
  private onVictory: SerpentsWrathConfig['onVictory'];
  private onPlaySound: SerpentsWrathConfig['onPlaySound'];

  private player: Player;
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private particles: Particle[] = [];
  private floatTexts: FloatText[] = [];
  private shake = new ScreenShake();
  private showHUD = true;

  private keys: Record<string, boolean> = {};
  public touchVector: Vec2 | null = null;
  public pendingAttack: AttackType | null = null;

  private currentWave = 0;
  private waveEnemiesSpawned = 0;
  private waveEnemiesToSpawn: Array<{ type: EnemyType }> = [];
  private spawnTimer = 0;
  private waveClearDelay = 0;
  private betweenWaves = false;
  private score = 0;
  private kills = 0;

  private running = false;
  private frameId = 0;

  // scrolling background offset
  private bgOffset = 0;

  // Ground position (80% down)
  private get groundY() { return this.canvas.height * 0.78; }

  constructor(cfg: SerpentsWrathConfig) {
    this.canvas = cfg.canvas;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('No 2D context');
    this.ctx = ctx;
    this.onGameOver = cfg.onGameOver;
    this.onVictory = cfg.onVictory;
    this.onPlaySound = cfg.onPlaySound;
    this.showHUD = cfg.showHUD !== false;

    this.player = new Player(this.canvas.width * 0.25, this.groundY);
    this.setupListeners();
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    this.keys[e.key.toLowerCase()] = true;
    // Attack keys (Q / E / R / Space)
    if (e.key.toLowerCase() === 'q') this.pendingAttack = 'snake_strike';
    if (e.key.toLowerCase() === 'e') this.pendingAttack = 'shadow_snake';
    if (e.key.toLowerCase() === 'r') this.pendingAttack = 'kusanagi';
    if (e.key === ' ' || e.key.toLowerCase() === 'spacebar') {
      this.pendingAttack = 'edo_tensei';
      e.preventDefault(); // Prevent page scrolling
    }
  };
  private handleKeyUp = (e: KeyboardEvent) => { this.keys[e.key.toLowerCase()] = false; };

  private setupListeners() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  cleanup() {
    this.running = false;
    if (this.frameId) cancelAnimationFrame(this.frameId);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  start() {
    this.running = true;
    this.loadWave(0);
    this.loop();
  }

  private loadWave(index: number) {
    this.currentWave = index;
    const waveDef = WAVE_DEFS[index];
    this.waveEnemiesToSpawn = [];
    waveDef.enemies.forEach(e => {
      for (let i = 0; i < e.count; i++) this.waveEnemiesToSpawn.push({ type: e.type });
    });
    // Shuffle spawn order
    this.waveEnemiesToSpawn.sort(() => Math.random() - 0.5);
    this.waveEnemiesSpawned = 0;
    this.spawnTimer = 60; // initial delay before first spawn
    this.betweenWaves = false;
    this.onPlaySound('wave');
    this.spawnFloatText(this.canvas.width / 2, this.canvas.height / 2 - 40, `WAVE ${index + 1}: ${waveDef.label}`, '#bd00ff');
  }

  private spawnEnemy() {
    if (this.waveEnemiesSpawned >= this.waveEnemiesToSpawn.length) return;
    const enemyDef = this.waveEnemiesToSpawn[this.waveEnemiesSpawned++];
    // Spawn from right side
    const x = this.canvas.width + 50;
    this.enemies.push(new Enemy(x, this.groundY, enemyDef.type));
  }

  private spawnParticles(x: number, y: number, color: string, count = 8, speed = 4) {
    for (let i = 0; i < count; i++) this.particles.push(new Particle(x, y, color, speed));
  }

  private spawnFloatText(x: number, y: number, text: string, color = '#fff') {
    this.floatTexts.push(new FloatText(x, y, text, color));
  }

  private get spawnInterval() {
    return Math.ceil(WAVE_DEFS[this.currentWave].spawnInterval / (1000 / 60));
  }

  private update() {
    // Scroll BG
    this.bgOffset = (this.bgOffset + 0.4) % this.canvas.width;

    // Player movement
    let moveX = 0;
    let moveY = 0;
    if (this.keys['a'] || this.keys['arrowleft']) moveX -= 1;
    if (this.keys['d'] || this.keys['arrowright']) moveX += 1;
    if (this.keys['w'] || this.keys['arrowup']) moveY -= 1;
    if (this.keys['s'] || this.keys['arrowdown']) moveY += 1;
    
    if (this.touchVector) {
      moveX = this.touchVector.x;
      moveY = this.touchVector.y;
    }

    if (moveX !== 0) this.player.facing = moveX > 0 ? 1 : -1;
    this.player.vel.x = moveX * this.player.speed;
    this.player.vel.y = moveY * this.player.speed;

    // Clamp player to canvas (leaving padding for HUD)
    this.player.pos.x = Math.max(30, Math.min(this.canvas.width - 30, this.player.pos.x));
    this.player.pos.y = Math.max(80, Math.min(this.canvas.height - 80, this.player.pos.y));

    this.player.update();

    // Process pending attack
    if (this.pendingAttack) {
      this.tryAttack(this.pendingAttack);
      this.pendingAttack = null;
    }

    // Spawn enemies
    if (!this.betweenWaves) {
      if (this.waveEnemiesSpawned < this.waveEnemiesToSpawn.length) {
        this.spawnTimer--;
        if (this.spawnTimer <= 0) {
          this.spawnEnemy();
          this.spawnTimer = this.spawnInterval;
        }
      }
    }

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update();
      // Out of bounds
      if (p.pos.x < -100 || p.pos.x > this.canvas.width + 100) {
        this.projectiles.splice(i, 1); continue;
      }

      // AOE: instant damage all in range
      if (p.type === 'edo_tensei') {
        this.enemies.forEach(e => {
          const dx = e.pos.x - p.pos.x;
          const dy = e.pos.y - p.pos.y;
          if (Math.sqrt(dx * dx + dy * dy) < p.aoeRadius) {
            this.hitEnemy(e, p.damage, p.color);
          }
        });
        this.spawnParticles(p.pos.x, p.pos.y, p.color, 30, 8);
        this.shake.trigger(10, 25);
        this.projectiles.splice(i, 1); continue;
      }

      // Normal projectile vs enemy collision
      let hit = false;
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        const dx = e.pos.x - p.pos.x; const dy = e.pos.y - p.pos.y;
        if (Math.sqrt(dx * dx + dy * dy) < e.config.size + p.radius) {
          this.hitEnemy(e, p.damage, p.color);
          if (p.aoeRadius > 0) {
            // splash neighbours
            this.enemies.forEach(other => {
              if (other === e) return;
              const dx2 = other.pos.x - p.pos.x; const dy2 = other.pos.y - p.pos.y;
              if (Math.sqrt(dx2 * dx2 + dy2 * dy2) < p.aoeRadius) {
                this.hitEnemy(other, p.damage * 0.5, p.color);
              }
            });
            this.spawnParticles(p.pos.x, p.pos.y, p.color, 15, 5);
            this.shake.trigger(5, 12);
          }
          hit = true; break;
        }
      }
      if (hit) { this.projectiles.splice(i, 1); }
    }

    // Update enemies
    this.enemies.forEach(e => {
      e.update(this.player.pos.x, this.player.pos.y);
      // Enemy attacks player on contact
      const dx = e.pos.x - this.player.pos.x; const dy = e.pos.y - this.player.pos.y;
      if (Math.sqrt(dx * dx + dy * dy) < e.config.attackRange + 18) {
        const now = performance.now();
        if (now - e.lastAttack > e.config.attackCooldown) {
          e.lastAttack = now;
          this.player.takeDamage(e.config.damage);
          this.shake.trigger(6, 15);
          this.onPlaySound('hit');
          if (this.player.hp <= 0) {
            this.triggerGameOver();
          }
        }
      }
    });

    // Remove dead enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (!this.enemies[i].alive) {
        this.score += this.enemies[i].config.scoreValue;
        this.kills++;
        this.spawnParticles(this.enemies[i].pos.x, this.enemies[i].pos.y, this.enemies[i].config.color, 14, 5);
        this.spawnFloatText(this.enemies[i].pos.x, this.enemies[i].pos.y - 20, `+${this.enemies[i].config.scoreValue}`, '#eab308');
        this.onPlaySound('death');
        this.enemies.splice(i, 1);
      }
    }

    // Update particles / floatTexts
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update();
      if (this.particles[i].life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.floatTexts.length - 1; i >= 0; i--) {
      this.floatTexts[i].update();
      if (this.floatTexts[i].life <= 0) this.floatTexts.splice(i, 1);
    }

    // Wave complete?
    if (!this.betweenWaves && this.waveEnemiesSpawned >= this.waveEnemiesToSpawn.length && this.enemies.length === 0) {
      this.betweenWaves = true;
      this.waveClearDelay = 120; // 2s
      this.spawnFloatText(this.canvas.width / 2, this.canvas.height / 2 - 60, 'WAVE CLEARED!', '#39ff14');
      this.score += 1000 * (this.currentWave + 1);
    }

    if (this.betweenWaves) {
      this.waveClearDelay--;
      if (this.waveClearDelay <= 0) {
        if (this.currentWave + 1 >= WAVE_DEFS.length) {
          this.triggerVictory();
        } else {
          this.loadWave(this.currentWave + 1);
        }
      }
    }
  }

  private hitEnemy(e: Enemy, damage: number, color: string) {
    e.takeDamage(damage);
    this.spawnParticles(e.pos.x, e.pos.y - 10, color, 6, 3);
    this.spawnFloatText(e.pos.x, e.pos.y - e.config.size - 15, `-${damage}`, '#fff');
    this.shake.trigger(3, 8);
    this.onPlaySound('attack');
  }

  private tryAttack(type: AttackType) {
    if (!this.player.canAttack(type)) return;
    const def = ATTACK_DEFS[type];

    if (type === 'edo_tensei') {
      // Instant AOE centred on player
      const proj = new Projectile(this.player.pos.x, this.player.pos.y, 0, def, type);
      proj.pos = { ...this.player.pos };
      this.projectiles.push(proj);
      this.spawnParticles(this.player.pos.x, this.player.pos.y, def.color, 40, 10);
      this.shake.trigger(15, 35);
      this.onPlaySound('ultimate');
      this.spawnFloatText(this.player.pos.x, this.player.pos.y - 50, 'EDO TENSEI!', def.color);
    } else {
      // Directional projectile
      const dir = this.player.facing > 0 ? 0 : Math.PI;
      const proj = new Projectile(
        this.player.pos.x + this.player.facing * 22,
        this.player.pos.y - 8,
        dir, def, type
      );
      this.projectiles.push(proj);
    }
    this.player.useAttack(type);
  }

  // Public method for mobile attack buttons
  triggerAttack(type: AttackType) {
    this.pendingAttack = type;
  }

  // Getter for React overlay HUD
  getHUDState() {
    return {
      hp: this.player.hp,
      maxHp: this.player.maxHp,
      chakra: this.player.chakra,
      maxChakra: this.player.maxChakra,
      score: this.score,
      wave: this.currentWave,
      kills: this.kills,
      cooldowns: {
        snake_strike: this.player.cooldowns.snake_strike,
        shadow_snake: this.player.cooldowns.shadow_snake,
        kusanagi: this.player.cooldowns.kusanagi,
        edo_tensei: this.player.cooldowns.edo_tensei
      },
      enemiesRemaining: (this.waveEnemiesToSpawn.length - this.waveEnemiesSpawned) + this.enemies.length
    };
  }

  private triggerGameOver() {
    this.running = false;
    this.onGameOver(this.score, this.kills, this.currentWave);
  }

  private triggerVictory() {
    this.running = false;
    this.onVictory(this.score, this.kills);
  }

  // ── Rendering ─────────────────────────────────────────────────────────────

  private draw() {
    const w = this.canvas.width; const h = this.canvas.height;
    const shakeOff = this.shake.update();

    this.ctx.save();
    this.ctx.translate(shakeOff.x, shakeOff.y);

    // Background
    this.drawBackground(w, h);

    // Ground
    this.drawGround(w);

    // Particles (behind entities)
    this.particles.forEach(p => p.draw(this.ctx));

    // Enemies
    this.enemies.forEach(e => e.draw(this.ctx));

    // Projectiles
    this.projectiles.forEach(p => p.draw(this.ctx));

    // Player
    this.player.draw(this.ctx);

    // Float texts
    this.floatTexts.forEach(t => t.draw(this.ctx));

    // HUD (drawn without shake)
    this.ctx.restore();
    if (this.showHUD) {
      this.drawHUD(w, h);
    }
  }

  private drawBackground(w: number, h: number) {
    // Deep purple sky gradient
    const skyGrad = this.ctx.createLinearGradient(0, 0, 0, h * 0.78);
    skyGrad.addColorStop(0, '#050210');
    skyGrad.addColorStop(0.5, '#1a0a2e');
    skyGrad.addColorStop(1, '#0d0520');
    this.ctx.fillStyle = skyGrad;
    this.ctx.fillRect(0, 0, w, h * 0.78);

    // Scrolling background ruined columns
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(189,0,255,0.08)';
    this.ctx.lineWidth = 2;
    for (let i = -1; i < 8; i++) {
      const x = ((i * 130 + this.bgOffset * 0.3) % (w + 130)) - 65;
      // Column
      this.ctx.fillStyle = 'rgba(30,15,60,0.5)';
      this.ctx.fillRect(x - 12, h * 0.35, 24, h * 0.43);
      // Capital
      this.ctx.fillRect(x - 20, h * 0.33, 40, 12);
    }
    this.ctx.restore();

    // Glowing moon
    this.ctx.save();
    const moonGrad = this.ctx.createRadialGradient(w * 0.82, 60, 5, w * 0.82, 60, 45);
    moonGrad.addColorStop(0, 'rgba(220,200,255,0.9)');
    moonGrad.addColorStop(0.6, 'rgba(189,0,255,0.3)');
    moonGrad.addColorStop(1, 'rgba(189,0,255,0)');
    this.ctx.fillStyle = moonGrad;
    this.ctx.shadowBlur = 30; this.ctx.shadowColor = '#bd00ff';
    this.ctx.beginPath(); this.ctx.arc(w * 0.82, 60, 45, 0, Math.PI * 2); this.ctx.fill();
    this.ctx.restore();

    // Scrolling snake silhouettes on ground
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(57,255,20,0.06)';
    this.ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      const ox = ((i * 200 + this.bgOffset * 0.6) % (w + 200)) - 100;
      this.ctx.beginPath();
      for (let x = 0; x < 200; x++) {
        const y = h * 0.72 + Math.sin((x + this.bgOffset * 2 + i * 70) * 0.08) * 18;
        if (x === 0) this.ctx.moveTo(ox + x, y); else this.ctx.lineTo(ox + x, y);
      }
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  private drawGround(w: number) {
    const gy = this.groundY;
    // Ground layer
    const gGrad = this.ctx.createLinearGradient(0, gy, 0, this.canvas.height);
    gGrad.addColorStop(0, '#1a0a2e');
    gGrad.addColorStop(0.3, '#0d0a1a');
    gGrad.addColorStop(1, '#050210');
    this.ctx.fillStyle = gGrad;
    this.ctx.fillRect(0, gy, w, this.canvas.height - gy);

    // Ground line with glow
    this.ctx.save();
    this.ctx.strokeStyle = '#39ff14';
    this.ctx.lineWidth = 2;
    this.ctx.shadowBlur = 12; this.ctx.shadowColor = '#39ff14';
    this.ctx.beginPath(); this.ctx.moveTo(0, gy); this.ctx.lineTo(w, gy); this.ctx.stroke();
    // Subtle grid pattern on ground
    this.ctx.strokeStyle = 'rgba(57,255,20,0.04)';
    this.ctx.shadowBlur = 0; this.ctx.lineWidth = 1;
    for (let x = (-this.bgOffset % 60) - 60; x < w + 60; x += 60) {
      this.ctx.beginPath(); this.ctx.moveTo(x, gy); this.ctx.lineTo(x, this.canvas.height); this.ctx.stroke();
    }
    this.ctx.restore();
  }

  private drawHUD(w: number, _h: number) {
    // Dark HUD panel at bottom
    const hudH = this.canvas.height - this.groundY;
    this.ctx.fillStyle = 'rgba(5,2,16,0.92)';
    this.ctx.fillRect(0, this.groundY, w, hudH);
    this.ctx.strokeStyle = 'rgba(189,0,255,0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(0, this.groundY, w, hudH);

    const gy = this.groundY + 10;

    // HP Bar
    this.drawBar(this.ctx, 10, gy, 160, 14, this.player.hp / this.player.maxHp, '#ef4444', '#ff0000', '❤ HP');

    // Chakra Bar
    this.drawBar(this.ctx, 10, gy + 20, 160, 14, this.player.chakra / this.player.maxChakra, '#6366f1', '#818cf8', '⚡ CHAKRA');

    // Score / Wave / Kills
    this.ctx.font = 'bold 10px Orbitron, sans-serif';
    this.ctx.fillStyle = '#eab308';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`SCORE: ${this.score.toLocaleString()}`, 185, gy + 10);
    this.ctx.fillStyle = '#bd00ff';
    this.ctx.fillText(`WAVE: ${this.currentWave + 1} / ${WAVE_DEFS.length}`, 185, gy + 24);
    this.ctx.fillStyle = '#39ff14';
    this.ctx.fillText(`KILLS: ${this.kills}`, 300, gy + 10);

    // Remaining enemies count
    const remaining = (this.waveEnemiesToSpawn.length - this.waveEnemiesSpawned) + this.enemies.length;
    this.ctx.fillStyle = '#f43f5e';
    this.ctx.fillText(`ENEMIES: ${remaining}`, 300, gy + 24);

    // Attack buttons on right side
    const attacks: AttackType[] = ['snake_strike', 'shadow_snake', 'kusanagi', 'edo_tensei'];
    const btnW = 62; const btnH = 38; const btnGap = 4;
    const totalW = attacks.length * btnW + (attacks.length - 1) * btnGap;
    let bx = w - totalW - 8;
    const by = gy;

    attacks.forEach(type => {
      const def = ATTACK_DEFS[type];
      const ready = this.player.canAttack(type);
      const cdFrac = 1 - (this.player.cooldowns[type] / Math.ceil(def.cooldown / (1000 / 60)));

      // Background
      this.ctx.fillStyle = ready ? 'rgba(30,15,60,0.8)' : 'rgba(10,8,20,0.8)';
      this.ctx.strokeStyle = ready ? def.color : 'rgba(100,100,100,0.3)';
      this.ctx.lineWidth = 1.5;
      this.ctx.fillRect(bx, by, btnW, btnH);
      this.ctx.strokeRect(bx, by, btnW, btnH);

      // Cooldown overlay
      if (!ready) {
        this.ctx.fillStyle = `rgba(0,0,0,0.55)`;
        this.ctx.fillRect(bx, by + btnH * cdFrac, btnW, btnH * (1 - cdFrac));
      }

      // Glow when ready
      if (ready) {
        this.ctx.shadowBlur = 8; this.ctx.shadowColor = def.color;
      }

      // Key label
      this.ctx.font = 'bold 11px Orbitron, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillStyle = ready ? def.color : '#555';
      this.ctx.fillText(`[${def.key}]`, bx + btnW / 2, by + 12);

      // Attack name
      this.ctx.font = '8px Orbitron, sans-serif';
      this.ctx.fillStyle = ready ? '#ddd' : '#444';
      const shortName = def.label.split(' ')[0];
      this.ctx.fillText(shortName, bx + btnW / 2, by + 24);

      // Chakra cost
      this.ctx.fillStyle = ready ? '#818cf8' : '#333';
      this.ctx.fillText(`-${def.chakraCost}⚡`, bx + btnW / 2, by + 35);

      this.ctx.shadowBlur = 0;
      bx += btnW + btnGap;
    });
  }

  private drawBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, pct: number, color: string, glowColor: string, label: string) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x, y, w, h);
    ctx.shadowBlur = 8; ctx.shadowColor = glowColor;
    ctx.fillStyle = color; ctx.fillRect(x, y, w * Math.max(0, pct), h);
    ctx.shadowBlur = 0;
    ctx.font = 'bold 9px Orbitron, sans-serif';
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
    ctx.fillText(label, x + 3, y + h - 3);
    ctx.restore();
  }

  private loop = () => {
    if (!this.running) return;
    this.update();
    this.draw();
    this.frameId = requestAnimationFrame(this.loop);
  };

  // Public getters for React state sync
  getState() {
    return {
      hp: this.player.hp,
      chakra: this.player.chakra,
      score: this.score,
      kills: this.kills,
      wave: this.currentWave + 1,
      cooldowns: { ...this.player.cooldowns }
    };
  }
}
