// GameEngine.ts
// Standard 2D Action Survival engine for the HTML5 Canvas

export interface GameEngineConfig {
  canvas: HTMLCanvasElement;
  reanimations: {
    soundFourCount: number;
    kimimaroCount: number;
    tobiramaCount: number;
    hashiramaCount: number;
  };
  onGameOver: (wave: number, tokensEarned: number) => void;
  onWaveComplete: (wave: number) => void;
  onPlaySound: (type: 'slash' | 'snake' | 'rumble') => void;
}

class Player {
  x: number;
  y: number;
  radius: number = 18;
  speed: number = 3.5;
  hp: number = 100;
  maxHp: number = 100;
  chakra: number = 100;
  maxChakra: number = 100;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

class Enemy {
  x: number;
  y: number;
  radius: number;
  speed: number;
  hp: number;
  maxHp: number;
  type: 'genin' | 'anbu' | 'kakashi';
  color: string;
  damage: number;

  constructor(x: number, y: number, type: 'genin' | 'anbu' | 'kakashi', wave: number) {
    this.x = x;
    this.y = y;
    this.type = type;

    // Scale stats with waves
    const multiplier = 1 + (wave - 1) * 0.15;

    if (type === 'genin') {
      this.radius = 12;
      this.speed = 1.2 + Math.random() * 0.4;
      this.hp = 15 * multiplier;
      this.color = '#38bdf8'; // Blue Leaf Headband
      this.damage = 8;
    } else if (type === 'anbu') {
      this.radius = 11;
      this.speed = 2.0 + Math.random() * 0.5;
      this.hp = 25 * multiplier;
      this.color = '#e2e8f0'; // White Mask ANBU
      this.damage = 15;
    } else {
      // Kakashi/Boss
      this.radius = 16;
      this.speed = 1.0;
      this.hp = 120 * multiplier;
      this.color = '#f43f5e'; // Red Kakashi Sharingan eye indicator
      this.damage = 30;
    }
    this.maxHp = this.hp;
  }
}

class Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  color: string;
  pierce: number = 1;
  type: 'kusanagi' | 'bone' | 'water' | 'music';

  constructor(
    x: number, 
    y: number, 
    vx: number, 
    vy: number, 
    damage: number, 
    type: 'kusanagi' | 'bone' | 'water' | 'music'
  ) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.type = type;
    this.damage = damage;

    if (type === 'kusanagi') {
      this.radius = 6;
      this.color = '#a5b4fc'; // Silver/white sword slash
      this.pierce = 2;
    } else if (type === 'bone') {
      this.radius = 4;
      this.color = '#f3f4f6'; // Pale white bone shard
      this.pierce = 1;
    } else if (type === 'water') {
      this.radius = 8;
      this.color = '#60a5fa'; // Blue water ball
      this.pierce = 3;
    } else {
      this.radius = 5;
      this.color = '#c084fc'; // Purple sound note
      this.pierce = 1;
    }
  }
}

class MeleeSwipe {
  x: number;
  y: number;
  angle: number;
  progress: number = 0; // 0 to 1
  maxProgress: number = 0.25; // short duration (0.25s)
  radius: number = 45;
  damage: number = 30;

  constructor(x: number, y: number, angle: number, damage: number) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.damage = damage;
  }
}

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number = 1;
  life: number = 30; // frames

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 4;
    this.vy = (Math.random() - 0.5) * 4;
    this.radius = Math.random() * 3 + 1;
    this.color = color;
  }
}

class DamageNumber {
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number = 1;
  life: number = 40;

  constructor(x: number, y: number, text: string, color: string = '#ffffff') {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
  }
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private onGameOver: (wave: number, tokensEarned: number) => void;
  private onWaveComplete: (wave: number) => void;
  private onPlaySound: (type: 'slash' | 'snake' | 'rumble') => void;

  private player: Player;
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private meleeSwipes: MeleeSwipe[] = [];
  private particles: Particle[] = [];
  private damageNumbers: DamageNumber[] = [];

  // Reanimations affecting weapon rates/power
  private soundFourCount: number;
  private kimimaroCount: number;
  private tobiramaCount: number;
  private hashiramaCount: number;

  // Game states
  private running: boolean = false;
  private currentWave: number = 1;
  private waveEnemiesSpawned: number = 0;
  private waveTotalEnemies: number = 15;
  private enemiesDefeated: number = 0;
  private tokensEarned: number = 0;
  private spawnTimer: number = 0;
  
  // Player attacks timers
  private lastKusanagiTime: number = 0;
  private lastSnakeMeleeTime: number = 0;
  private lastSoundFourTime: number = 0;
  private lastKimimaroTime: number = 0;
  private lastTobiramaTime: number = 0;

  // Input control vectors
  private keys: Record<string, boolean> = {};
  public touchVector: { x: number; y: number } | null = null; // for mobile virtual analog stick

  // Hashirama wood barrier angle
  private woodBarrierAngle: number = 0;

  constructor(config: GameEngineConfig) {
    this.canvas = config.canvas;
    const context = this.canvas.getContext('2d');
    if (!context) throw new Error("Could not acquire 2D Canvas context");
    this.ctx = context;

    this.onGameOver = config.onGameOver;
    this.onWaveComplete = config.onWaveComplete;
    this.onPlaySound = config.onPlaySound;

    this.soundFourCount = config.reanimations.soundFourCount;
    this.kimimaroCount = config.reanimations.kimimaroCount;
    this.tobiramaCount = config.reanimations.tobiramaCount;
    this.hashiramaCount = config.reanimations.hashiramaCount;

    // Start player in center
    this.player = new Player(this.canvas.width / 2, this.canvas.height / 2);
    
    this.setupListeners();
  }

  private setupListeners() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  public cleanup() {
    this.running = false;
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    this.keys[e.key.toLowerCase()] = true;
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys[e.key.toLowerCase()] = false;
  };

  public start() {
    this.running = true;
    this.resetWave(1);
    this.loop();
  }

  public stop() {
    this.running = false;
  }

  private resetWave(wave: number) {
    this.currentWave = wave;
    this.waveEnemiesSpawned = 0;
    this.waveTotalEnemies = 10 + wave * 5;
    this.enemiesDefeated = 0;
    this.enemies = [];
    this.projectiles = [];
    this.meleeSwipes = [];
    this.spawnTimer = 0;

    // Visual notification
    this.damageNumbers.push(new DamageNumber(
      this.canvas.width / 2,
      this.canvas.height / 3,
      `WAVE ${wave} BEGINS`,
      '#bd00ff'
    ));
    this.onPlaySound('rumble');
  }

  private loop = () => {
    if (!this.running) return;

    this.update();
    this.draw();

    requestAnimationFrame(this.loop);
  };

  private update() {
    this.updatePlayerMovement();
    this.updateSpawns();
    
    // Auto weapon fire
    this.fireWeapons();

    // Update game elements
    this.updateProjectiles();
    this.updateMeleeSwipes();
    this.updateEnemies();
    this.updateParticles();
    this.updateDamageNumbers();

    // Check collisions
    this.checkCollisions();

    // Check wave complete
    this.checkWaveProgress();
  }

  private updatePlayerMovement() {
    let dx = 0;
    let dy = 0;

    // Keyboard inputs
    if (this.keys['w'] || this.keys['arrowup']) dy -= 1;
    if (this.keys['s'] || this.keys['arrowdown']) dy += 1;
    if (this.keys['a'] || this.keys['arrowleft']) dx -= 1;
    if (this.keys['d'] || this.keys['arrowright']) dx += 1;

    // Normalize keyboard vector
    if (dx !== 0 && dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
    }

    // Touch stick override
    if (this.touchVector) {
      dx = this.touchVector.x;
      dy = this.touchVector.y;
    }

    // Apply movement
    this.player.x += dx * this.player.speed;
    this.player.y += dy * this.player.speed;

    // Bound player to canvas
    const margin = this.player.radius;
    if (this.player.x < margin) this.player.x = margin;
    if (this.player.x > this.canvas.width - margin) this.player.x = this.canvas.width - margin;
    if (this.player.y < margin) this.player.y = margin;
    if (this.player.y > this.canvas.height - margin) this.player.y = this.canvas.height - margin;

    // Rotate Hashirama barrier angle
    if (this.hashiramaCount > 0) {
      this.woodBarrierAngle += 0.04;
    }
  }

  private updateSpawns() {
    this.spawnTimer++;
    // Spawn enemy every few frames, depending on wave number
    const spawnRate = Math.max(40 - this.currentWave * 2, 20);

    if (this.spawnTimer >= spawnRate && this.waveEnemiesSpawned < this.waveTotalEnemies) {
      this.spawnTimer = 0;
      this.spawnEnemy();
    }
  }

  private spawnEnemy() {
    // Determine spawn side (0: top, 1: right, 2: bottom, 3: left)
    const side = Math.floor(Math.random() * 4);
    let x = 0;
    let y = 0;
    const padding = 20;

    switch (side) {
      case 0:
        x = Math.random() * this.canvas.width;
        y = -padding;
        break;
      case 1:
        x = this.canvas.width + padding;
        y = Math.random() * this.canvas.height;
        break;
      case 2:
        x = Math.random() * this.canvas.width;
        y = this.canvas.height + padding;
        break;
      case 3:
        x = -padding;
        y = Math.random() * this.canvas.height;
        break;
    }

    // Determine type
    let type: 'genin' | 'anbu' | 'kakashi' = 'genin';
    const rand = Math.random();

    if (this.currentWave >= 3 && rand > 0.8) {
      type = 'anbu';
    } else if (this.currentWave >= 5 && rand > 0.95) {
      type = 'kakashi';
    } else if (this.currentWave >= 2 && rand > 0.9) {
      type = 'anbu';
    }

    // Force Boss (Kakashi) spawn at end of waves 5, 10, 15
    if (this.waveEnemiesSpawned === this.waveTotalEnemies - 1 && this.currentWave % 5 === 0) {
      type = 'kakashi';
    }

    this.enemies.push(new Enemy(x, y, type, this.currentWave));
    this.waveEnemiesSpawned++;
  }

  private fireWeapons() {
    const now = Date.now();

    // 1. Kusanagi Slash (Shoots forward towards nearest enemy)
    const kusanagiCooldown = 800; // ms
    if (now - this.lastKusanagiTime > kusanagiCooldown && this.enemies.length > 0) {
      const nearest = this.getNearestEnemy();
      if (nearest) {
        const dx = nearest.x - this.player.x;
        const dy = nearest.y - this.player.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        
        // Speed: 8
        const vx = (dx / len) * 8;
        const vy = (dy / len) * 8;

        this.projectiles.push(new Projectile(
          this.player.x,
          this.player.y,
          vx,
          vy,
          15, // Damage
          'kusanagi'
        ));
        this.lastKusanagiTime = now;
        this.onPlaySound('slash');
      }
    }

    // 2. Striking Shadow Snakes (Short range sweeping melee swipe)
    // Upgraded by passive cell speed? Or default
    const snakeCooldown = 1500; // ms
    if (now - this.lastSnakeMeleeTime > snakeCooldown && this.enemies.length > 0) {
      const nearest = this.getNearestEnemy();
      if (nearest) {
        const dx = nearest.x - this.player.x;
        const dy = nearest.y - this.player.y;
        const angle = Math.atan2(dy, dx);

        // Creates a slashing arc swipe
        this.meleeSwipes.push(new MeleeSwipe(
          this.player.x,
          this.player.y,
          angle,
          35
        ));

        this.lastSnakeMeleeTime = now;
        this.onPlaySound('snake');
      }
    }

    // 3. EDO TENSEI: Tayuya Sound Notes (Co-Summon fires purple notes in random directions)
    if (this.soundFourCount > 0) {
      const soundCooldown = Math.max(2000 - this.soundFourCount * 100, 500);
      if (now - this.lastSoundFourTime > soundCooldown) {
        // Fire 2 to 6 notes depending on Tayuya coffins
        const notesToFire = Math.min(2 + this.soundFourCount, 8);
        for (let i = 0; i < notesToFire; i++) {
          const angle = (Math.PI * 2 / notesToFire) * i + Math.random() * 0.5;
          const vx = Math.cos(angle) * 5;
          const vy = Math.sin(angle) * 5;

          this.projectiles.push(new Projectile(
            this.player.x,
            this.player.y,
            vx,
            vy,
            10 + this.soundFourCount * 2, // Scales damage
            'music'
          ));
        }
        this.lastSoundFourTime = now;
      }
    }

    // 4. EDO TENSEI: Kimimaro Bone Shards (Fires bone shards crossways)
    if (this.kimimaroCount > 0) {
      const boneCooldown = Math.max(1800 - this.kimimaroCount * 150, 400);
      if (now - this.lastKimimaroTime > boneCooldown) {
        // Shoot cross pattern: Up, Right, Down, Left
        const directions = [
          { vx: 0, vy: -7 },
          { vx: 7, vy: 0 },
          { vx: 0, vy: 7 },
          { vx: -7, vy: 0 }
        ];

        directions.forEach(dir => {
          this.projectiles.push(new Projectile(
            this.player.x,
            this.player.y,
            dir.vx,
            dir.vy,
            25 + this.kimimaroCount * 5,
            'bone'
          ));
        });
        this.lastKimimaroTime = now;
      }
    }

    // 5. EDO TENSEI: Second Hokage Tobirama (Water Dragon Ball - Pierces multiple enemies)
    if (this.tobiramaCount > 0) {
      const waterCooldown = Math.max(3000 - this.tobiramaCount * 250, 800);
      if (now - this.lastTobiramaTime > waterCooldown && this.enemies.length > 0) {
        // Seek the healthies enemy and blast water orb
        const targets = [...this.enemies].sort((a, b) => b.hp - a.hp);
        const target = targets[0];
        
        if (target) {
          const dx = target.x - this.player.x;
          const dy = target.y - this.player.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const vx = (dx / len) * 6;
          const vy = (dy / len) * 6;

          const proj = new Projectile(
            this.player.x,
            this.player.y,
            vx,
            vy,
            50 + this.tobiramaCount * 15,
            'water'
          );
          proj.pierce = 5 + this.tobiramaCount; // highly piercing water style!
          this.projectiles.push(proj);
          this.lastTobiramaTime = now;
        }
      }
    }
  }

  private getNearestEnemy(): Enemy | null {
    let nearest: Enemy | null = null;
    let minDist = Infinity;

    this.enemies.forEach(e => {
      const dx = e.x - this.player.x;
      const dy = e.y - this.player.y;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) {
        minDist = dist;
        nearest = e;
      }
    });

    return nearest;
  }

  private updateProjectiles() {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx;
      p.y += p.vy;

      // Check bounds
      if (
        p.x < -50 || p.x > this.canvas.width + 50 ||
        p.y < -50 || p.y > this.canvas.height + 50
      ) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  private updateMeleeSwipes() {
    for (let i = this.meleeSwipes.length - 1; i >= 0; i--) {
      const s = this.meleeSwipes[i];
      
      // Update swipe origin lock onto player position
      s.x = this.player.x;
      s.y = this.player.y;
      
      s.progress += 0.015; // advances animation

      if (s.progress >= s.maxProgress) {
        this.meleeSwipes.splice(i, 1);
      }
    }
  }

  private updateEnemies() {
    this.enemies.forEach(e => {
      // Seek player
      const dx = this.player.x - e.x;
      const dy = this.player.y - e.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      
      if (len > 0) {
        e.x += (dx / len) * e.speed;
        e.y += (dy / len) * e.speed;
      }
    });
  }

  private updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha = Math.max(p.alpha - 0.03, 0);
      p.life--;

      if (p.life <= 0 || p.alpha === 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private updateDamageNumbers() {
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const d = this.damageNumbers[i];
      d.y -= 0.5; // floats up
      d.alpha = Math.max(d.alpha - 0.02, 0);
      d.life--;

      if (d.life <= 0 || d.alpha === 0) {
        this.damageNumbers.splice(i, 1);
      }
    }
  }

  private checkCollisions() {
    // 1. Projectiles vs Enemies
    for (let pi = this.projectiles.length - 1; pi >= 0; pi--) {
      const p = this.projectiles[pi];

      for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
        const e = this.enemies[ei];
        
        // Circular collision
        const dx = p.x - e.x;
        const dy = p.y - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < p.radius + e.radius) {
          // HIT!
          e.hp -= p.damage;
          this.spawnHitParticles(p.x, p.y, e.color);
          this.damageNumbers.push(new DamageNumber(e.x, e.y - 10, `${Math.floor(p.damage)}`, '#ffffff'));

          p.pierce--;
          if (p.pierce <= 0) {
            this.projectiles.splice(pi, 1);
            break; // breakout to next projectile
          }
        }
      }
    }

    // 2. Melee Swipes vs Enemies
    this.meleeSwipes.forEach(s => {
      this.enemies.forEach(e => {
        const dx = e.x - s.x;
        const dy = e.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < s.radius + e.radius) {
          // Angle check to see if within swipe arc (roughly 120 degrees / PI*2/3)
          const angleToEnemy = Math.atan2(dy, dx);
          let diff = Math.abs(angleToEnemy - s.angle);
          if (diff > Math.PI) diff = Math.PI * 2 - diff;

          if (diff < Math.PI / 3) {
            // Apply damage and pushback!
            const damage = s.damage;
            e.hp -= damage;
            
            // Push back
            e.x += Math.cos(angleToEnemy) * 15;
            e.y += Math.sin(angleToEnemy) * 15;

            this.spawnHitParticles(e.x, e.y, '#00ff88'); // Green snake splash
            this.damageNumbers.push(new DamageNumber(e.x, e.y - 12, `${damage}`, '#00ff88'));
          }
        }
      });
    });

    // 3. Hashirama Wood Barrier (Passive ring vs Enemies)
    if (this.hashiramaCount > 0) {
      const radius = 60;
      this.enemies.forEach(e => {
        const dx = e.x - this.player.x;
        const dy = e.y - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // If touching wood boundary
        if (Math.abs(dist - radius) < e.radius + 5) {
          const dmg = 0.5 * this.hashiramaCount; // Deals continuous damage
          e.hp -= dmg;

          if (Math.random() < 0.1) {
            this.spawnHitParticles(e.x, e.y, '#10b981'); // Emerald wood dust
            this.damageNumbers.push(new DamageNumber(e.x, e.y - 10, `WOOD`, '#10b981'));
          }
        }
      });
    }

    // 4. Enemies vs Player
    for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
      const e = this.enemies[ei];
      
      const dx = this.player.x - e.x;
      const dy = this.player.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.player.radius + e.radius) {
        // ENEMY MELEE PLAYER
        this.player.hp -= e.damage;
        this.spawnHitParticles(this.player.x, this.player.y, '#ef4444');
        this.damageNumbers.push(new DamageNumber(this.player.x, this.player.y - 15, `-${e.damage}`, '#ef4444'));

        // Knock back enemy slightly so they don't instant-kill
        const angle = Math.atan2(dy, dx);
        e.x -= Math.cos(angle) * 30;
        e.y -= Math.sin(angle) * 30;

        // Sound indicator
        this.onPlaySound('snake');

        // Check death
        if (this.player.hp <= 0) {
          this.triggerGameOver();
          return;
        }
      }
    }

    // Clean dead enemies
    for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
      const e = this.enemies[ei];
      if (e.hp <= 0) {
        this.spawnHitParticles(e.x, e.y, e.color, 12);
        
        // Award tokens directly based on type
        let reward = 2; // base
        if (e.type === 'anbu') reward = 5;
        if (e.type === 'kakashi') reward = 50; // boss bonus!
        
        this.tokensEarned += reward;
        this.enemiesDefeated++;
        this.enemies.splice(ei, 1);
      }
    }
  }

  private spawnHitParticles(x: number, y: number, color: string, count: number = 5) {
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(x, y, color));
    }
  }

  private checkWaveProgress() {
    // If all spawned and all dead
    if (this.waveEnemiesSpawned >= this.waveTotalEnemies && this.enemies.length === 0) {
      const completed = this.currentWave;
      
      // Bonus tokens for wave completion
      const waveBonus = completed * 25;
      this.tokensEarned += waveBonus;
      
      this.damageNumbers.push(new DamageNumber(
        this.canvas.width / 2,
        this.canvas.height / 2,
        `WAVE COMPLETE! +${waveBonus} OROCHI`,
        '#00ff88'
      ));

      this.onWaveComplete(completed);
      
      // Load next wave after 3 seconds delay
      this.running = false;
      setTimeout(() => {
        if (this.running || this.player.hp <= 0) return; // avoid multiple triggers
        this.running = true;
        this.resetWave(completed + 1);
        this.loop();
      }, 3000);
    }
  }

  private triggerGameOver() {
    this.running = false;
    this.onPlaySound('rumble');
    this.onGameOver(this.currentWave, this.tokensEarned);
  }

  private draw() {
    // Clear canvas
    this.ctx.fillStyle = '#0a0814'; // Dark purple-black void
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw Laboratory grid background (glowing web3 grid)
    this.drawGrid();

    // Draw Hashirama wood barrier range indicator
    if (this.hashiramaCount > 0) {
      this.drawHashiramaBarrier();
    }

    // Draw Melee arc swings (Shadow snakes)
    this.drawMeleeSwipes();

    // Draw Projectiles
    this.drawProjectiles();

    // Draw Enemies
    this.drawEnemies();

    // Draw Particles
    this.drawParticles();

    // Draw Player (Orochimaru)
    this.drawPlayer();

    // Draw Damage / Info text numbers
    this.drawDamageNumbers();

    // Draw HUD metrics
    this.drawHUD();
  }

  private drawGrid() {
    this.ctx.strokeStyle = '#1d173c';
    this.ctx.lineWidth = 1;
    const size = 40;

    for (let x = 0; x < this.canvas.width; x += size) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }

    for (let y = 0; y < this.canvas.height; y += size) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }

    // Circle seals decorations in background corners
    this.ctx.strokeStyle = 'rgba(189, 0, 255, 0.05)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 100, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.arc(this.canvas.width, this.canvas.height, 100, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  private drawPlayer() {
    // 1. Draw custom Pale skin glowing base
    this.ctx.save();
    
    // Draw Purple Rope bow (Orochimaru's sash) behind him
    this.ctx.fillStyle = '#5c00a3'; // deep purple rope sash
    this.ctx.beginPath();
    this.ctx.arc(this.player.x - 12, this.player.y + 6, 8, 0, Math.PI * 2);
    this.ctx.arc(this.player.x + 12, this.player.y + 6, 8, 0, Math.PI * 2);
    this.ctx.fill();

    // Outer aura glow
    const grad = this.ctx.createRadialGradient(
      this.player.x, this.player.y, 2,
      this.player.x, this.player.y, this.player.radius + 8
    );
    grad.addColorStop(0, 'rgba(220, 240, 250, 0.8)'); // Pale silver-blue
    grad.addColorStop(0.5, 'rgba(189, 0, 255, 0.3)'); // Curse Purple
    grad.addColorStop(1, 'rgba(189, 0, 255, 0)');

    this.ctx.fillStyle = grad;
    this.ctx.beginPath();
    this.ctx.arc(this.player.x, this.player.y, this.player.radius + 8, 0, Math.PI * 2);
    this.ctx.fill();

    // Body/Outfit (White grey robe)
    this.ctx.fillStyle = '#d1dbe5';
    this.ctx.beginPath();
    this.ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
    this.ctx.fill();

    // Draw Orochimaru purple eye shadow markings on face
    this.ctx.fillStyle = '#9d4edd';
    this.ctx.beginPath();
    this.ctx.arc(this.player.x - 5, this.player.y - 2, 3, 0, Math.PI * 2);
    this.ctx.arc(this.player.x + 5, this.player.y - 2, 3, 0, Math.PI * 2);
    this.ctx.fill();

    // Eyes (Piercing Yellow snake eyes)
    this.ctx.fillStyle = '#eab308';
    this.ctx.beginPath();
    this.ctx.arc(this.player.x - 4, this.player.y - 2, 1.5, 0, Math.PI * 2);
    this.ctx.arc(this.player.x + 4, this.player.y - 2, 1.5, 0, Math.PI * 2);
    this.ctx.fill();

    // Hair (Black locks framing face)
    this.ctx.fillStyle = '#0f172a';
    this.ctx.beginPath();
    this.ctx.arc(this.player.x, this.player.y - 8, 11, 0, Math.PI); // hair top
    this.ctx.fill();

    this.ctx.restore();
  }

  private drawEnemies() {
    this.enemies.forEach(e => {
      this.ctx.save();

      // Shadow glow
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = e.color;

      // Base body
      this.ctx.fillStyle = e.color;
      this.ctx.beginPath();
      this.ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      this.ctx.fill();

      // Draw Leaf village headband outline (grey plate)
      this.ctx.fillStyle = '#94a3b8';
      this.ctx.fillRect(e.x - 7, e.y - 5, 14, 3);
      this.ctx.fillStyle = '#020617';
      this.ctx.fillRect(e.x - 1, e.y - 4, 2, 1); // tiny swirl dot representation

      // Health bar above enemy
      const barW = e.radius * 2;
      const barH = 3;
      const hpPct = e.hp / e.maxHp;

      this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
      this.ctx.fillRect(e.x - barW/2, e.y - e.radius - 8, barW, barH);
      
      this.ctx.fillStyle = e.type === 'kakashi' ? '#ef4444' : '#22c55e';
      this.ctx.fillRect(e.x - barW/2, e.y - e.radius - 8, barW * hpPct, barH);

      this.ctx.restore();
    });
  }

  private drawProjectiles() {
    this.projectiles.forEach(p => {
      this.ctx.save();
      this.ctx.shadowBlur = 8;
      this.ctx.shadowColor = p.color;
      this.ctx.fillStyle = p.color;

      this.ctx.beginPath();
      
      if (p.type === 'kusanagi') {
        // Draw slice oval
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      } else if (p.type === 'music') {
        // Draw music note symbol
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        this.ctx.fillRect(p.x + p.radius - 2, p.y - p.radius * 1.5, 2, p.radius * 1.5);
      } else if (p.type === 'bone') {
        // Draw rectangular sharp shard
        this.ctx.rect(p.x - 2, p.y - 5, 4, 10);
      } else {
        // Water orb
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      }
      
      this.ctx.fill();
      this.ctx.restore();
    });
  }

  private drawMeleeSwipes() {
    this.meleeSwipes.forEach(s => {
      this.ctx.save();
      this.ctx.strokeStyle = 'rgba(0, 230, 118, 0.4)'; // glowing toxic green
      this.ctx.lineWidth = 10;
      this.ctx.lineCap = 'round';
      
      this.ctx.beginPath();
      // Draw arc representing swinging snakes
      this.ctx.arc(
        s.x,
        s.y,
        s.radius,
        s.angle - Math.PI / 3,
        s.angle + Math.PI / 3
      );
      this.ctx.stroke();

      // Nested purple cursed arc inside
      this.ctx.strokeStyle = 'rgba(189, 0, 255, 0.7)';
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      this.ctx.arc(
        s.x,
        s.y,
        s.radius,
        s.angle - Math.PI / 4,
        s.angle + Math.PI / 4
      );
      this.ctx.stroke();

      this.ctx.restore();
    });
  }

  private drawHashiramaBarrier() {
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(16, 185, 129, 0.2)'; // wood green ring
    this.ctx.lineWidth = 4;
    this.ctx.setLineDash([10, 15]); // dashes represent roots
    
    // Rotate root dashes
    this.ctx.translate(this.player.x, this.player.y);
    this.ctx.rotate(this.woodBarrierAngle);

    this.ctx.beginPath();
    this.ctx.arc(0, 0, 60, 0, Math.PI * 2);
    this.ctx.stroke();

    // Draw little leaf nodes around the ring
    this.ctx.fillStyle = '#10b981';
    const leaves = 4 + Math.min(this.hashiramaCount, 6);
    for (let i = 0; i < leaves; i++) {
      const angle = (Math.PI * 2 / leaves) * i;
      this.ctx.beginPath();
      this.ctx.arc(Math.cos(angle) * 60, Math.sin(angle) * 60, 4, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  private drawParticles() {
    this.particles.forEach(p => {
      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });
  }

  private drawDamageNumbers() {
    this.ctx.save();
    this.ctx.font = 'bold 11px Inter, sans-serif';
    
    this.damageNumbers.forEach(d => {
      this.ctx.globalAlpha = d.alpha;
      this.ctx.fillStyle = d.color;
      this.ctx.textAlign = 'center';
      this.ctx.fillText(d.text, d.x, d.y);
    });

    this.ctx.restore();
  }

  private drawHUD() {
    // Draw top status bar inside canvas
    this.ctx.fillStyle = 'rgba(10, 8, 20, 0.85)';
    this.ctx.fillRect(0, 0, this.canvas.width, 35);
    
    // Wave display
    this.ctx.font = 'bold 12px Orbitron, sans-serif';
    this.ctx.fillStyle = '#bd00ff'; // Purple
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`WAVE: ${this.currentWave}`, 10, 22);

    // Kills/Defeated
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText(`SHINOBI DEFEATED: ${this.enemiesDefeated}`, 90, 22);

    // Tokens Earned
    this.ctx.fillStyle = '#eab308'; // Gold
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`+${this.tokensEarned} $OROCHIMARU`, this.canvas.width - 10, 22);

    // Draw Player HP bar bottom boundary
    const hpBarW = this.canvas.width - 20;
    const hpBarH = 6;
    const pct = Math.max(this.player.hp / this.player.maxHp, 0);

    // Background bar
    this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
    this.ctx.fillRect(10, this.canvas.height - 15, hpBarW, hpBarH);

    // Green HP indicator
    this.ctx.fillStyle = '#00e676';
    this.ctx.fillRect(10, this.canvas.height - 15, hpBarW * pct, hpBarH);
  }
}
export default GameEngine;
