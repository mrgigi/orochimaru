import { GameState, EnemyType } from './types';
import type { GameStats, Projectile, Particle, EnemyData, DyingEnemy, DeathParticle } from './types';
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

  // Images
  bgImg: HTMLImageElement | null = null;
  playerImg: HTMLImageElement | null = null;
  enemyImg: HTMLImageElement | null = null;

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
  }

  setupInput(): void {
    window.addEventListener('keydown', this.handleKeyDownBound);
    window.addEventListener('keyup', this.handleKeyUpBound);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.gameState !== GameState.PLAYING) return;
    const key = e.key.toLowerCase();

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
      } else {
        // Fallback to first available
        for (let i = 0; i < 4; i++) {
          proj = this.player.tryAttack(i);
          if (proj) {
            this.projectiles.push(proj);
            this.spawnAttackParticles(proj);
            this.audio.playAttackSound(i);
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
    }
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
        this.player.takeDamage(enemy.damage);
        this.spawnHitParticles(
          this.player.state.x + this.player.state.width / 2,
          this.player.state.y + this.player.state.height / 2,
          '#ff0000'
        );
        this.audio.playPlayerHit();
      }
    }

    // Update projectiles
    this.projectiles = this.projectiles.filter(p => {
      p.x += p.speed;
      if (now - p.createdAt > p.lifetime) return false;
      if (p.x < -100 || p.x > this.canvas.width + 100) return false;
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

        if (
          proj.x < enemy.x + enemy.width &&
          proj.x + proj.width > enemy.x &&
          proj.y < enemy.y + enemy.height &&
          proj.y + proj.height > enemy.y
        ) {
          enemy.hp -= proj.damage;
          enemy.isHit = true;
          enemy.hitTime = now;
          this.spawnHitParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, proj.color);
          this.audio.playEnemyHit();

          proj.hitEnemyIds.push(enemy.id);

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
      this.stats.wave++;
      this.waveSpawned = false;
      this.audio.playWaveComplete();
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

    // Update particles
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
      enemiesRemaining: this.enemies.length
    };
  }

  draw(): void {
    const { ctx, canvas } = this;

    // Background
    if (this.bgImg && this.bgImg.complete && this.bgImg.naturalWidth > 0) {
      ctx.drawImage(this.bgImg, 0, 0, canvas.width, canvas.height);
    } else {
      // Fallback gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#0a0a0a');
      gradient.addColorStop(0.5, '#1a0a2e');
      gradient.addColorStop(1, '#0d1117');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Ground
    ctx.fillStyle = '#1a0a2e';
    ctx.fillRect(0, canvas.height - 20, canvas.width, 20);

    // Draw enemies
    for (const enemy of this.enemies) {
      drawEnemy(ctx, enemy, this.enemyImg);
    }

    // Draw dying enemies (death animations)
    for (const de of this.dyingEnemies) {
      const elapsed = Date.now() - de.deathTime;
      const progress = Math.min(elapsed / de.duration, 1);

      // Fading ghost of the enemy body
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

      // Draw death particles
      for (const p of de.particles) {
        ctx.save();
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;

        // Draw as small squares/shards for dissolve effect
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
      ctx.fillStyle = proj.color;

      // Different shapes based on attack
      if (proj.attackName === 'Kusanagi') {
        ctx.fillRect(proj.x, proj.y, proj.width, proj.height * 0.4);
      } else if (proj.attackName === 'Edo Tensei') {
        ctx.beginPath();
        ctx.arc(proj.x + proj.width / 2, proj.y, proj.height, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Snake-like projectile
        ctx.beginPath();
        ctx.moveTo(proj.x, proj.y);
        ctx.quadraticCurveTo(
          proj.x + proj.width / 2,
          proj.y - 10,
          proj.x + proj.width,
          proj.y
        );
        ctx.quadraticCurveTo(
          proj.x + proj.width / 2,
          proj.y + 10,
          proj.x,
          proj.y
        );
        ctx.fill();
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
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }
}