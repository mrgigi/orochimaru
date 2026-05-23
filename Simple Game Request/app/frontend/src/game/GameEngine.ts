import { GameState, GameStats, Projectile, Particle, EnemyData } from './types';
import { Player } from './Player';
import { spawnWave, updateEnemy, drawEnemy } from './Enemy';

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  player: Player;
  enemies: EnemyData[] = [];
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

  // Callbacks
  onStateChange: (state: GameState, stats: GameStats) => void;

  constructor(
    canvas: HTMLCanvasElement,
    onStateChange: (state: GameState, stats: GameStats) => void
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.player = new Player(canvas.width, canvas.height);
    this.onStateChange = onStateChange;

    const highScore = parseInt(localStorage.getItem('orochimaru_highscore') || '0', 10);
    this.stats = { score: 0, kills: 0, wave: 1, maxWave: 6, highScore };

    this.loadImages();
    this.setupInput();
  }

  loadImages(): void {
    this.bgImg = new Image();
    this.bgImg.crossOrigin = 'anonymous';
    this.bgImg.src = 'https://mgx-backend-cdn.metadl.com/generate/images/317302/2026-05-23/pddtcgaaagsq/battle-arena-background.png';

    this.playerImg = new Image();
    this.playerImg.crossOrigin = 'anonymous';
    this.playerImg.src = 'https://mgx-backend-cdn.metadl.com/generate/images/317302/2026-05-23/pdds5uiaagsa/orochimaru-character.png';

    this.enemyImg = new Image();
    this.enemyImg.crossOrigin = 'anonymous';
    this.enemyImg.src = 'https://mgx-backend-cdn.metadl.com/generate/images/317302/2026-05-23/pddtapiaagra/enemy-anbu-ninja.png';
  }

  setupInput(): void {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (this.gameState !== GameState.PLAYING) return;
      this.player.keys.add(e.key.toLowerCase());

      // Attack keys
      const attackMap: Record<string, number> = { q: 0, w: 1, e: 2, r: 3 };
      const attackIndex = attackMap[e.key.toLowerCase()];
      if (attackIndex !== undefined) {
        const proj = this.player.tryAttack(attackIndex);
        if (proj) {
          this.projectiles.push(proj);
          this.spawnAttackParticles(proj);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      this.player.keys.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
  }

  triggerAttack(attackIndex: number): void {
    if (this.gameState !== GameState.PLAYING) return;
    const proj = this.player.tryAttack(attackIndex);
    if (proj) {
      this.projectiles.push(proj);
      this.spawnAttackParticles(proj);
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

  start(): void {
    this.gameState = GameState.PLAYING;
    this.player = new Player(this.canvas.width, this.canvas.height);
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.stats = { ...this.stats, score: 0, kills: 0, wave: 1 };
    this.waveSpawned = false;
    this.waveDelay = 0;
    this.onStateChange(this.gameState, this.stats);
    this.lastTime = performance.now();
    this.gameLoop();
  }

  stop(): void {
    cancelAnimationFrame(this.animationId);
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

    // Update player
    this.player.update(this.canvas.width, this.canvas.height);

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
      for (const enemy of this.enemies) {
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
          proj.lifetime = 0; // Remove projectile
        }
      }
    }

    // Remove dead enemies
    const prevCount = this.enemies.length;
    this.enemies = this.enemies.filter(e => e.hp > 0);
    const killed = prevCount - this.enemies.length;
    this.stats.kills += killed;
    this.stats.score += killed * 100 * this.stats.wave;

    // Check wave complete
    if (this.enemies.length === 0 && this.waveSpawned) {
      if (this.stats.wave >= this.stats.maxWave) {
        this.gameState = GameState.VICTORY;
        this.saveHighScore();
        this.onStateChange(this.gameState, this.stats);
        cancelAnimationFrame(this.animationId);
        return;
      }
      this.stats.wave++;
      this.waveSpawned = false;
      this.onStateChange(this.gameState, this.stats);
    }

    // Check player death
    if (this.player.state.hp <= 0) {
      this.gameState = GameState.GAME_OVER;
      this.saveHighScore();
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

    this.onStateChange(this.gameState, this.stats);
  }

  saveHighScore(): void {
    if (this.stats.score > this.stats.highScore) {
      this.stats.highScore = this.stats.score;
      localStorage.setItem('orochimaru_highscore', this.stats.score.toString());
    }
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