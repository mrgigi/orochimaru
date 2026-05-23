import { PlayerState, Attack, ATTACKS, Projectile } from './types';

export class Player {
  state: PlayerState;
  attacks: Attack[];
  speed: number = 5;
  chakraRegen: number = 0.3;
  keys: Set<string> = new Set();
  private projectileIdCounter = 0;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.state = {
      x: 100,
      y: canvasHeight - 150,
      width: 60,
      height: 80,
      hp: 100,
      maxHp: 100,
      chakra: 100,
      maxChakra: 100,
      isHit: false,
      hitTime: 0,
      facingRight: true,
    };
    this.attacks = ATTACKS.map(a => ({ ...a }));
  }

  update(canvasWidth: number, canvasHeight: number): void {
    // Movement
    if (this.keys.has('ArrowLeft') || this.keys.has('a')) {
      this.state.x -= this.speed;
      this.state.facingRight = false;
    }
    if (this.keys.has('ArrowRight') || this.keys.has('d')) {
      this.state.x += this.speed;
      this.state.facingRight = true;
    }
    if (this.keys.has('ArrowUp') || this.keys.has('w')) {
      this.state.y -= this.speed;
    }
    if (this.keys.has('ArrowDown') || this.keys.has('s')) {
      this.state.y += this.speed;
    }

    // Bounds
    this.state.x = Math.max(0, Math.min(canvasWidth - this.state.width, this.state.x));
    this.state.y = Math.max(canvasHeight * 0.3, Math.min(canvasHeight - this.state.height - 20, this.state.y));

    // Chakra regen
    this.state.chakra = Math.min(this.state.maxChakra, this.state.chakra + this.chakraRegen);

    // Reset hit flash
    if (this.state.isHit && Date.now() - this.state.hitTime > 200) {
      this.state.isHit = false;
    }
  }

  tryAttack(attackIndex: number): Projectile | null {
    const now = Date.now();
    const attack = this.attacks[attackIndex];
    if (!attack) return null;

    if (now - attack.lastUsed < attack.cooldown) return null;
    if (this.state.chakra < attack.chakraCost) return null;

    attack.lastUsed = now;
    this.state.chakra -= attack.chakraCost;

    const projectile: Projectile = {
      id: `proj_${this.projectileIdCounter++}`,
      x: this.state.facingRight ? this.state.x + this.state.width : this.state.x - 20,
      y: this.state.y + this.state.height / 2 - 10,
      width: attack.range * 0.3,
      height: 20,
      speed: this.state.facingRight ? 10 : -10,
      damage: attack.damage,
      color: attack.color,
      attackName: attack.name,
      lifetime: 2000,
      createdAt: now,
    };

    return projectile;
  }

  takeDamage(damage: number): void {
    this.state.hp -= damage;
    this.state.isHit = true;
    this.state.hitTime = Date.now();
    if (this.state.hp < 0) this.state.hp = 0;
  }

  draw(ctx: CanvasRenderingContext2D, playerImg: HTMLImageElement | null): void {
    const { x, y, width, height, isHit, facingRight } = this.state;

    ctx.save();

    if (isHit) {
      ctx.globalAlpha = 0.6;
    }

    if (playerImg && playerImg.complete && playerImg.naturalWidth > 0) {
      if (!facingRight) {
        ctx.translate(x + width, y);
        ctx.scale(-1, 1);
        ctx.drawImage(playerImg, 0, 0, width, height);
      } else {
        ctx.drawImage(playerImg, x, y, width, height);
      }
    } else {
      // Fallback: draw Orochimaru-styled character
      ctx.fillStyle = '#2d1b4e';
      ctx.fillRect(x, y, width, height);

      // Hair
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(x + 10, y - 10, width - 20, 25);

      // Eyes
      ctx.fillStyle = '#ffd700';
      const eyeX = facingRight ? x + width - 20 : x + 10;
      ctx.beginPath();
      ctx.ellipse(eyeX, y + 20, 4, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Purple rope belt
      ctx.fillStyle = '#8b00ff';
      ctx.fillRect(x, y + height * 0.5, width, 8);
    }

    // Glow effect
    ctx.shadowColor = '#39ff14';
    ctx.shadowBlur = 15;
    ctx.strokeStyle = '#39ff1440';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 2, y - 2, width + 4, height + 4);

    ctx.restore();
  }
}