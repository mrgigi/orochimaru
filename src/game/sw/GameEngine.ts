import { GameState, EnemyType, DropType } from './types';
import type { GameStats, Projectile, Particle, EnemyData, DyingEnemy, DeathParticle, FloatingText, DropItem } from './types';
import { Player } from './Player';
import { spawnWave, updateEnemy, drawEnemy } from './Enemy';
import { AudioManager } from './AudioManager';

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  player: Player;
  enemies: EnemyData[] = [];
  dyingEnemies: DyingEnemy[] = [];
  projectiles: Projectile[] = [];
  particles: Particle[] = [];
  gameState: GameState = GameState.START;
  stats: GameStats;
  animationId: number = 0;
  lastTime: number = 0;
  waveDelay: number = 0;
  waveSpawned: boolean = false;

  // Visual Juice & Feedback Properties
  floatingTexts: FloatingText[] = [];
  dropItems: DropItem[] = [];
  shakeIntensity: number = 0;
  shakeDecay: number = 0.9;
  jutsuCallout: { text: string; color: string; time: number; duration: number } | null = null;
  private dropIdCounter = 0;
  private textIdCounter = 0;

  // Images
  bgImg: HTMLImageElement | null = null;
  playerImg: HTMLImageElement | null = null;
  enemyImg: HTMLImageElement | null = null;
  bossImg: HTMLImageElement | null = null;

  // Audio
  audio: AudioManager;

  // Callbacks
  onStateChange: (state: GameState, stats: GameStats) => void;

  // Touch vector support
  public touchVector: { x: number; y: number } | null = null;

  // Bound event handlers for key listener removal
  private handleKeyDownBound = (e: KeyboardEvent) => this.handleKeyDown(e);
  private handleKeyUpBound = (e: KeyboardEvent) => this.handleKeyUp(e);

  constructor(
    canvas: HTMLCanvasElement,
    onStateChange: (state: GameState, stats: GameStats) => void
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.player = new Player(canvas.width, canvas.height);
    this.onStateChange = onStateChange;

    const highScore = parseInt(localStorage.getItem('orochimaru_highscore') || '0', 10);
    this.stats = { score: 0, kills: 0, wave: 1, maxWave: 7, highScore };

    this.audio = new AudioManager();
    this.loadImages();
    this.setupInput();
  }

  loadImages(): void {
    this.bgImg = new Image();
    this.bgImg.src = '/assets/battle-arena-background.png';

    this.playerImg = new Image();
    this.playerImg.src = '/assets/orochimaru-character.png';

    this.enemyImg = new Image();
    this.enemyImg.src = '/assets/enemy-anbu-ninja.png';

    this.bossImg = new Image();
    this.bossImg.src = '/assets/hokage-boss.png';
  }

  setupInput(): void {
    window.addEventListener('keydown', this.handleKeyDownBound);
    window.addEventListener('keyup', this.handleKeyUpBound);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.gameState !== GameState.PLAYING) return;
    const key = e.key.toLowerCase();

    // Pause toggle
    if (key === 'p' || key === 'escape') {
      this.togglePause();
      return;
    }

    // Dash activation
    if (key === 'shift') {
      e.preventDefault();
      this.player.triggerDash(this.touchVector);
    }

    // Add to movement keys (all keys tracked for movement)
    this.player.keys.add(key);

    // Support 1/2/3/4, alternative J/K/L/; AND custom Q/E/R for attacks
    const attackMap: Record<string, number> = {
      '1': 0, '2': 1, '3': 2, '4': 3,
      'q': 0, 'e': 1, 'r': 2,
      'j': 0, 'k': 1, 'l': 2, ';': 3
    };

    if (key in attackMap) {
      const attackIndex = attackMap[key];
      const proj = this.player.tryAttack(attackIndex);
      if (proj) {
        this.projectiles.push(proj);
        this.spawnAttackParticles(proj);
        this.audio.playAttackSound(attackIndex);
        this.spawnJutsuCallout(attackIndex);
      }
    }

    // Space bar fires Edo Tensei (index 3) first, fallback to first available
    if (key === ' ' || key === 'spacebar') {
      e.preventDefault();
      let proj = this.player.tryAttack(3);
      if (proj) {
        this.projectiles.push(proj);
        this.spawnAttackParticles(proj);
        this.audio.playAttackSound(3);
        this.spawnJutsuCallout(3);
      } else {
        // Fallback to first available
        for (let i = 0; i < 4; i++) {
          proj = this.player.tryAttack(i);
          if (proj) {
            this.projectiles.push(proj);
            this.spawnAttackParticles(proj);
            this.audio.playAttackSound(i);
            this.spawnJutsuCallout(i);
            break;
          }
        }
      }
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.player.keys.delete(e.key.toLowerCase());
  }

  triggerAttack(attackIndex: number): void {
    if (this.gameState !== GameState.PLAYING) return;
    const proj = this.player.tryAttack(attackIndex);
    if (proj) {
      this.projectiles.push(proj);
      this.spawnAttackParticles(proj);
      this.audio.playAttackSound(attackIndex);
      this.spawnJutsuCallout(attackIndex);
    }
  }

  // Visual juice generators
  spawnJutsuCallout(attackIndex: number): void {
    const attacksInfo = [
      { text: 'SNAKE STRIKE', color: '#39ff14', shake: 6 },
      { text: 'SHADOW SNAKE', color: '#8b00ff', shake: 10 },
      { text: 'KUSANAGI SWORD', color: '#ffd700', shake: 14 },
      { text: 'EDO TENSEI!', color: '#ff0066', shake: 28 },
    ];
    const info = attacksInfo[attackIndex];
    if (info) {
      this.shakeIntensity = info.shake;
      this.jutsuCallout = {
        text: info.text,
        color: info.color,
        time: Date.now(),
        duration: 800,
      };
    }
  }

  spawnFloatingText(text: string, x: number, y: number, color: string, size: number = 16): void {
    this.floatingTexts.push({
      id: `text_${this.textIdCounter++}`,
      text,
      x,
      y,
      color,
      size,
      lifetime: 1000,
      maxLifetime: 1000,
    });
  }

  trySpawnDrop(x: number, y: number): void {
    // 35% chance to drop
    if (Math.random() > 0.35) return;

    const type = DropType.HEALTH;
    const color = '#ff3333';
    const amount = 20;

    this.dropItems.push({
      id: `drop_${this.dropIdCounter++}`,
      x: x - 15,
      y: y - 15,
      width: 30,
      height: 30,
      type,
      amount,
      color,
      createdAt: Date.now(),
    });
  }

  spawnAttackParticles(proj: Projectile): void {
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: proj.x,
        y: proj.y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        life: 30,
        maxLife: 30,
        color: proj.color,
        size: Math.random() * 4 + 2,
      });
    }
  }

  spawnHitParticles(x: number, y: number, color: string): void {
    for (let i = 0; i < 12; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        life: 25,
        maxLife: 25,
        color,
        size: Math.random() * 5 + 2,
      });
    }
  }

  spawnDeathAnimation(enemy: EnemyData): void {
    const cx = enemy.x + enemy.width / 2;
    const cy = enemy.y + enemy.height / 2;
    const particleCount = 18;
    const deathParticles: DeathParticle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
      const speed = 2 + Math.random() * 4;
      deathParticles.push({
        x: cx + (Math.random() - 0.5) * enemy.width * 0.6,
        y: cy + (Math.random() - 0.5) * enemy.height * 0.6,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        size: 3 + Math.random() * 6,
        life: 40 + Math.random() * 20,
        maxLife: 40 + Math.random() * 20,
        color: enemy.color,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
      });
    }

    // Add some bright white/yellow flash particles
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      deathParticles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        life: 20 + Math.random() * 10,
        maxLife: 20 + Math.random() * 10,
        color: '#ffffff',
        rotation: 0,
        rotationSpeed: 0,
      });
    }

    this.dyingEnemies.push({
      x: enemy.x,
      y: enemy.y,
      width: enemy.width,
      height: enemy.height,
      color: enemy.color,
      type: enemy.type,
      deathTime: Date.now(),
      duration: 600,
      particles: deathParticles,
    });
  }

  start(): void {
    this.gameState = GameState.PLAYING;
    this.player = new Player(this.canvas.width, this.canvas.height);
    this.enemies = [];
    this.dyingEnemies = [];
    this.projectiles = [];
    this.particles = [];
    this.stats = { ...this.stats, score: 0, kills: 0, wave: 1, bossHp: undefined, bossMaxHp: undefined, bossName: undefined, isBossWave: false };
    this.waveSpawned = false;
    this.waveDelay = 0;
    this.onStateChange(this.gameState, this.stats);
    this.lastTime = performance.now();
    this.gameLoop();
  }

  stop(): void {
    this.cleanup();
  }

  resume(): void {
    if (this.gameState === GameState.PAUSED) {
      this.gameState = GameState.PLAYING;
      this.lastTime = performance.now();
      this.onStateChange(this.gameState, this.stats);
    }
  }

  togglePause(): void {
    if (this.gameState === GameState.PLAYING) {
      this.gameState = GameState.PAUSED;
      this.onStateChange(this.gameState, this.stats);
    } else if (this.gameState === GameState.PAUSED) {
      this.resume();
    }
  }

  cleanup(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('keydown', this.handleKeyDownBound);
    window.removeEventListener('keyup', this.handleKeyUpBound);
    this.audio.setMuted(true);
  }

  gameLoop = (): void => {
    this.animationId = requestAnimationFrame(this.gameLoop);
    const now = Date.now();

    this.update(now);
    this.draw();
  };

  update(now: number): void {
    if (this.gameState !== GameState.PLAYING) return;

    // Spawn wave
    if (!this.waveSpawned) {
      this.enemies = spawnWave(this.stats.wave, this.canvas.width, this.canvas.height);
      this.waveSpawned = true;
    }

    // Update player (incorporating touchVector for free 2D movement)
    this.player.update(this.canvas.width, this.canvas.height, this.touchVector);

    // Update enemies
    for (const enemy of this.enemies) {
      const result = updateEnemy(enemy, this.player.state, now);
      if (result.attacking) {
        if (!this.player.isDashing) {
          this.player.takeDamage(enemy.damage);
          this.shakeIntensity = 12; // Shake camera!
          this.spawnFloatingText(`-${enemy.damage}`, this.player.state.x + this.player.state.width / 2, this.player.state.y - 15, '#ff3333', 18);
          this.spawnHitParticles(
            this.player.state.x + this.player.state.width / 2,
            this.player.state.y + this.player.state.height / 2,
            '#ff0000'
          );
          this.audio.playPlayerHit();
        }
      }
    }

    // Update projectiles
    this.projectiles = this.projectiles.filter(p => {
      if (p.attackName === 'Edo Tensei') {
        p.width += 8; // expand radius
        if (p.width >= 250) return false; // expire when reaches max radius
      } else {
        p.x += p.speed;
        if (p.x < -100 || p.x > this.canvas.width + 100) return false;
      }
      
      if (now - p.createdAt > p.lifetime) return false;
      return true;
    });

    // Collision: projectiles vs enemies
    for (const proj of this.projectiles) {
      if (!proj.hitEnemyIds) {
        proj.hitEnemyIds = [];
      }
      for (const enemy of this.enemies) {
        // Skip if this enemy has already been hit by this projectile
        if (proj.hitEnemyIds.includes(enemy.id)) continue;

        const isEdo = proj.attackName === 'Edo Tensei';
        let collided = false;

        if (isEdo) {
          // Circle collision check: dist from cast center to enemy center
          const ecx = enemy.x + enemy.width / 2;
          const ecy = enemy.y + enemy.height / 2;
          const dist = Math.hypot(ecx - proj.x, ecy - proj.y);
          collided = dist <= proj.width; // width acts as radius
        } else {
          collided = (
            proj.x < enemy.x + enemy.width &&
            proj.x + proj.width > enemy.x &&
            proj.y < enemy.y + enemy.height &&
            proj.y + proj.height > enemy.y
          );
        }

        if (collided) {
          enemy.hp -= proj.damage;
          enemy.isHit = true;
          enemy.hitTime = now;
          this.spawnHitParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, proj.color);
          this.audio.playEnemyHit();

          proj.hitEnemyIds.push(enemy.id);

          const isUlt = proj.attackName === 'Edo Tensei';
          this.spawnFloatingText(`-${proj.damage}`, enemy.x + enemy.width / 2, enemy.y - 10, proj.color, isUlt ? 22 : 16);

          // If it's not a piercing attack, destroy the projectile
          const isPiercing = proj.attackName === 'Kusanagi' || proj.attackName === 'Edo Tensei';
          if (!isPiercing) {
            proj.lifetime = 0; // Remove projectile
            break; // Stop checking other enemies for this projectile
          }
        }
      }
    }

    // Remove dead enemies and spawn death animations
    const deadEnemies = this.enemies.filter(e => e.hp <= 0);
    for (const dead of deadEnemies) {
      this.spawnDeathAnimation(dead);
      this.trySpawnDrop(dead.x + dead.width / 2, dead.y + dead.height - 10);
    }
    this.enemies = this.enemies.filter(e => e.hp > 0);
    const killed = deadEnemies.length;
    this.stats.kills += killed;
    this.stats.score += killed * 100 * this.stats.wave;

    // Track boss HP for HUD
    const isBossWave = this.stats.wave === 7;
    if (isBossWave) {
      const boss = this.enemies.find(e => e.type === EnemyType.KAGE);
      this.stats.isBossWave = true;
      this.stats.bossName = '🔥 SHADOW KAGE';
      if (boss) {
        this.stats.bossHp = boss.hp;
        this.stats.bossMaxHp = boss.maxHp;
      } else {
        this.stats.bossHp = 0;
        this.stats.bossMaxHp = undefined;
      }
    } else {
      this.stats.isBossWave = false;
      this.stats.bossHp = undefined;
      this.stats.bossMaxHp = undefined;
      this.stats.bossName = undefined;
    }

    // Check wave complete
    if (this.enemies.length === 0 && this.waveSpawned) {
      if (this.stats.wave >= this.stats.maxWave) {
        this.gameState = GameState.VICTORY;
        this.saveHighScore();
        this.audio.playVictory();
        this.onStateChange(this.gameState, this.stats);
        cancelAnimationFrame(this.animationId);
        return;
      }
      const completedWave = this.stats.wave;
      this.stats.wave++;
      this.waveSpawned = false;
      this.audio.playWaveComplete();
      
      if (completedWave === 1) {
        this.gameState = GameState.PAUSED;
      }
      
      this.onStateChange(this.gameState, this.stats);
    }

    // Check player death
    if (this.player.state.hp <= 0) {
      this.gameState = GameState.GAME_OVER;
      this.saveHighScore();
      this.audio.playGameOver();
      this.onStateChange(this.gameState, this.stats);
      cancelAnimationFrame(this.animationId);
      return;
    }

    // Decay camera shake
    if (this.shakeIntensity > 0) {
      this.shakeIntensity *= this.shakeDecay;
    }

    // Update drop items
    this.dropItems = this.dropItems.filter(item => {
      if (now - item.createdAt > 10000) return false;

      const p = this.player.state;
      if (
        item.x < p.x + p.width &&
        item.x + item.width > p.x &&
        item.y < p.y + p.height &&
        item.y + item.height > p.y
      ) {
        if (item.type === DropType.HEALTH) {
          this.player.state.hp = Math.min(this.player.state.maxHp, this.player.state.hp + item.amount);
          this.spawnFloatingText(`+${item.amount} HP`, p.x + p.width / 2, p.y - 15, '#00ff41', 18);
        } else {
          this.player.state.chakra = Math.min(this.player.state.maxChakra, this.player.state.chakra + item.amount);
          this.spawnFloatingText(`+${item.amount} CK`, p.x + p.width / 2, p.y - 15, '#a855f7', 18);
        }
        this.audio.playEnemyHit(); // Play sound
        return false;
      }
      return true;
    });

    // Update floating texts
    this.floatingTexts = this.floatingTexts.filter(text => {
      text.y -= 0.8;
      text.lifetime -= 16;
      return text.lifetime > 0;
    });

    // Update active particles
    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      return p.life > 0;
    });

    // Update dying enemies
    this.dyingEnemies = this.dyingEnemies.filter(de => {
      const elapsed = now - de.deathTime;
      if (elapsed > de.duration) return false;

      for (const p of de.particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1; // gravity
        p.vx *= 0.97; // friction
        p.rotation += p.rotationSpeed;
        p.life--;
      }
      de.particles = de.particles.filter(p => p.life > 0);
      return true;
    });

    this.onStateChange(this.gameState, this.stats);
  }

  saveHighScore(): void {
    if (this.stats.score > this.stats.highScore) {
      this.stats.highScore = this.stats.score;
      localStorage.setItem('orochimaru_highscore', this.stats.score.toString());
    }
  }

  getHUDState() {
    const now = Date.now();
    return {
      hp: this.player.state.hp,
      maxHp: this.player.state.maxHp,
      chakra: this.player.state.chakra,
      maxChakra: this.player.state.maxChakra,
      score: this.stats.score,
      wave: this.stats.wave - 1, // 0-based index
      kills: this.stats.kills,
      cooldowns: {
        snake_strike: Math.max(0, Math.ceil(((this.player.attacks[0].cooldown - (now - this.player.attacks[0].lastUsed)) / 1000) * 60)),
        shadow_snake: Math.max(0, Math.ceil(((this.player.attacks[1].cooldown - (now - this.player.attacks[1].lastUsed)) / 1000) * 60)),
        kusanagi: Math.max(0, Math.ceil(((this.player.attacks[2].cooldown - (now - this.player.attacks[2].lastUsed)) / 1000) * 60)),
        edo_tensei: Math.max(0, Math.ceil(((this.player.attacks[3].cooldown - (now - this.player.attacks[3].lastUsed)) / 1000) * 60)),
      },
      enemiesRemaining: this.enemies.length,
      gameState: this.gameState,
      isBossWave: this.stats.isBossWave,
      bossName: this.stats.bossName,
      bossHp: this.stats.bossHp,
      bossMaxHp: this.stats.bossMaxHp
    };
  }

  draw(): void {
    const { ctx, canvas } = this;

    // Apply Screen Shake camera translation offset
    ctx.save();
    if (this.shakeIntensity > 0.5) {
      const dx = (Math.random() - 0.5) * this.shakeIntensity;
      const dy = (Math.random() - 0.5) * this.shakeIntensity;
      ctx.translate(dx, dy);
    }

    // Background
    if (this.bgImg && this.bgImg.complete && this.bgImg.naturalWidth > 0) {
      ctx.drawImage(this.bgImg, 0, 0, canvas.width, canvas.height);
    } else {
      // Atmospheric Laboratory Stone Floor / Walls Gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#05040a');
      gradient.addColorStop(0.3, '#100a20');
      gradient.addColorStop(0.7, '#1b0d2b');
      gradient.addColorStop(1, '#08050c');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw stylized stone floor grid in the playable walking area
      const playAreaStartY = canvas.height * 0.3;
      ctx.strokeStyle = '#281a42';
      ctx.lineWidth = 1.5;
      const tileW = 90;
      const tileH = 45;

      for (let y = playAreaStartY; y < canvas.height; y += tileH) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();

        const offset = (Math.floor((y - playAreaStartY) / tileH) % 2 === 0) ? 0 : tileW / 2;
        for (let x = -offset; x < canvas.width + tileW; x += tileW) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + tileH);
          ctx.stroke();
        }
      }
    }

    // Ground line border
    ctx.fillStyle = '#22113d';
    ctx.fillRect(0, canvas.height - 20, canvas.width, 20);

    // Draw drop items
    for (const item of this.dropItems) {
      ctx.save();
      const pulse = Math.sin((Date.now() - item.createdAt) * 0.007) * 0.15 + 0.85;
      ctx.shadowColor = item.color;
      ctx.shadowBlur = 12 * pulse;
      ctx.fillStyle = item.color;

      ctx.translate(item.x + item.width / 2, item.y + item.height / 2);
      ctx.scale(pulse, pulse);

      if (item.type === DropType.HEALTH) {
        // Red diamond representing health elixir
        ctx.beginPath();
        ctx.moveTo(0, -item.height / 2);
        ctx.lineTo(item.width / 2, 0);
        ctx.lineTo(0, item.height / 2);
        ctx.lineTo(-item.width / 2, 0);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-2, -6, 4, 12);
        ctx.fillRect(-6, -2, 12, 4);
      } else {
        // Glowing purple orb representing chakra scroll
        ctx.beginPath();
        ctx.arc(0, 0, item.width / 2 - 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffd700';
        ctx.fillRect(-3, -item.height / 2 + 3, 6, item.height - 6);
      }
      ctx.restore();
    }

    // Draw enemies
    for (const enemy of this.enemies) {
      drawEnemy(ctx, enemy, this.enemyImg, this.bossImg);
    }

    // Draw dying enemies (death animations)
    for (const de of this.dyingEnemies) {
      const elapsed = Date.now() - de.deathTime;
      const progress = Math.min(elapsed / de.duration, 1);

      if (progress < 0.5) {
        ctx.save();
        ctx.globalAlpha = 1 - progress * 2;
        const scale = 1 + progress * 0.5;
        const cx = de.x + de.width / 2;
        const cy = de.y + de.height / 2;
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);
        ctx.fillStyle = de.color;
        ctx.shadowColor = de.color;
        ctx.shadowBlur = 20 + progress * 30;
        ctx.fillRect(-de.width / 2, -de.height / 2, de.width, de.height);
        ctx.restore();
      }

      for (const p of de.particles) {
        ctx.save();
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;

        const size = p.size * (0.5 + alpha * 0.5);
        ctx.fillRect(-size / 2, -size / 2, size, size);
        ctx.restore();
      }
    }

    // Draw projectiles
    for (const proj of this.projectiles) {
      ctx.save();
      ctx.shadowColor = proj.color;
      ctx.shadowBlur = 15;

      if (proj.attackName === 'Kusanagi') {
        ctx.save();
        ctx.translate(proj.x, proj.y + proj.height / 2);
        if (proj.speed < 0) {
          ctx.scale(-1, 1);
        }

        // Draw legendary Kusanagi sword
        // Steel blade
        ctx.fillStyle = '#e5e9f0';
        ctx.strokeStyle = '#4c566a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(15, -4);
        ctx.lineTo(proj.width - 6, -3);
        ctx.lineTo(proj.width, 0); // Pointy tip
        ctx.lineTo(proj.width - 6, 3);
        ctx.lineTo(15, 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Fuller (center blade line groove)
        ctx.strokeStyle = '#8892b0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(25, 0);
        ctx.lineTo(proj.width - 15, 0);
        ctx.stroke();

        // Purple Guard (tsuba)
        ctx.fillStyle = '#8b00ff';
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.rect(10, -10, 5, 20);
        ctx.fill();
        ctx.stroke();

        // Pommel / Hilt wraps
        ctx.fillStyle = '#1c1b29';
        ctx.fillRect(0, -3, 10, 6);
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      } else if (proj.attackName === 'Edo Tensei') {
        // Draw an expanding reanimation dome (360 degrees)
        ctx.beginPath();
        const grad = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, proj.width);
        grad.addColorStop(0, 'rgba(255, 0, 102, 0.05)');
        grad.addColorStop(0.85, 'rgba(255, 0, 102, 0.4)');
        grad.addColorStop(1, '#ff0066');
        ctx.fillStyle = grad;
        ctx.arc(proj.x, proj.y, proj.width, 0, Math.PI * 2);
        ctx.fill();

        // Main outer shockwave ring
        ctx.strokeStyle = '#ff0066';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.width, 0, Math.PI * 2);
        ctx.stroke();

        // Inner glowing ring
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, Math.max(0, proj.width - 15), 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Draw serpentine snake strike projectile!
        ctx.save();
        ctx.translate(proj.x, proj.y + proj.height / 2);
        if (proj.speed < 0) {
          ctx.scale(-1, 1);
        }

        const len = proj.width;
        // Winding snake body path
        ctx.strokeStyle = proj.color;
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);

        const segments = 16;
        for (let i = 0; i <= segments; i++) {
          const sx = (i / segments) * (len - 15);
          // Sine wave oscillation matching current frame
          const sy = Math.sin(i * 0.9 + Date.now() * 0.015) * 6;
          ctx.lineTo(sx, sy);
        }
        ctx.stroke();

        // Dark scale overlay details
        ctx.strokeStyle = '#0a0815';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        for (let i = 0; i <= segments; i++) {
          const sx = (i / segments) * (len - 15);
          const sy = Math.sin(i * 0.9 + Date.now() * 0.015) * 6;
          ctx.lineTo(sx, sy);
        }
        ctx.stroke();

        // Draw snake head
        const headX = len - 12;
        const headY = Math.sin(segments * 0.9 + Date.now() * 0.015) * 6;

        ctx.fillStyle = proj.color;
        ctx.beginPath();
        ctx.arc(headX, headY, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(headX, headY - 5);
        ctx.lineTo(headX + 11, headY);
        ctx.lineTo(headX, headY + 5);
        ctx.closePath();
        ctx.fill();

        // Glowing snake eyes
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(headX + 1, headY - 2.5, 1.8, 0, Math.PI * 2);
        ctx.arc(headX + 1, headY + 2.5, 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Forked tongue extending from snout
        ctx.strokeStyle = '#ff2222';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(headX + 10, headY);
        ctx.lineTo(headX + 18, headY);
        ctx.lineTo(headX + 21, headY - 2.5);
        ctx.moveTo(headX + 18, headY);
        ctx.lineTo(headX + 21, headY + 2.5);
        ctx.stroke();

        ctx.restore();
      }
      ctx.restore();
    }

    // Draw particles
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Draw player
    this.player.draw(ctx, this.playerImg);

    // Draw floating damage numbers
    for (const text of this.floatingTexts) {
      ctx.save();
      const alpha = text.lifetime / text.maxLifetime;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = text.color;
      ctx.font = `bold ${text.size}px Impact, sans-serif`;
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeText(text.text, text.x, text.y);
      ctx.fillText(text.text, text.x, text.y);
      ctx.restore();
    }

    // Draw Jutsu Callout popups
    if (this.jutsuCallout) {
      const elapsed = Date.now() - this.jutsuCallout.time;
      if (elapsed > this.jutsuCallout.duration) {
        this.jutsuCallout = null;
      } else {
        ctx.save();
        const alpha = Math.min(1, (this.jutsuCallout.duration - elapsed) / 200);
        ctx.globalAlpha = alpha;
        ctx.textAlign = 'center';
        ctx.fillStyle = this.jutsuCallout.color;
        ctx.font = 'bold italic 30px Impact, sans-serif';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.strokeText(this.jutsuCallout.text, canvas.width / 2, canvas.height * 0.22);
        ctx.fillText(this.jutsuCallout.text, canvas.width / 2, canvas.height * 0.22);
        ctx.restore();
      }
    }

    // Restore screen shake offsets
    ctx.restore();
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }
}