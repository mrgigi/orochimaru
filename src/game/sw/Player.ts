import type { PlayerState, Attack, Projectile } from './types';
import { ATTACKS } from './types';

export class Player {
  state: PlayerState;
  attacks: Attack[];
  speed: number = 5;
  chakraRegen: number = 0.3;
  keys: Set<string> = new Set();
  private projectileIdCounter = 0;

  // Dash properties
  isDashing: boolean = false;
  dashDuration: number = 0;
  dashCooldown: number = 1500;
  lastDash: number = 0;
  dashDirection: { x: number; y: number } = { x: 0, y: 0 };
  dashTrail: { x: number; y: number }[] = [];

  constructor(_canvasWidth: number, canvasHeight: number) {
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

  triggerDash(touchVector?: { x: number; y: number } | null): boolean {
    const now = Date.now();
    if (now - this.lastDash < this.dashCooldown) return false;
    if (this.isDashing) return false;

    let dx = 0;
    let dy = 0;

    if (touchVector && (touchVector.x !== 0 || touchVector.y !== 0)) {
      const len = Math.hypot(touchVector.x, touchVector.y);
      dx = touchVector.x / len;
      dy = touchVector.y / len;
    } else {
      const moveLeft = this.keys.has('arrowleft') || this.keys.has('a');
      const moveRight = this.keys.has('arrowright') || this.keys.has('d');
      const moveUp = this.keys.has('arrowup') || this.keys.has('w');
      const moveDown = this.keys.has('arrowdown') || this.keys.has('s');

      if (moveLeft) dx = -1;
      else if (moveRight) dx = 1;

      if (moveUp) dy = -1;
      else if (moveDown) dy = 1;

      if (dx === 0 && dy === 0) {
        dx = this.state.facingRight ? 1 : -1;
      }

      if (dx !== 0 && dy !== 0) {
        const len = Math.hypot(dx, dy);
        dx /= len;
        dy /= len;
      }
    }

    this.isDashing = true;
    this.dashDuration = 10; // Dash lasts 10 frames
    this.lastDash = now;
    this.dashDirection = { x: dx, y: dy };
    this.dashTrail = [];
    return true;
  }

  update(canvasWidth: number, canvasHeight: number, touchVector?: { x: number; y: number } | null): void {
    if (this.isDashing) {
      // Dash physics (3.5x normal speed)
      this.state.x += this.dashDirection.x * this.speed * 3.5;
      this.state.y += this.dashDirection.y * this.speed * 3.5;
      this.dashDuration--;

      // Append current position to trail
      this.dashTrail.push({ x: this.state.x, y: this.state.y });
      if (this.dashTrail.length > 5) {
        this.dashTrail.shift();
      }

      if (this.dashDuration <= 0) {
        this.isDashing = false;
      }
    } else {
      // Decay trail slowly
      if (this.dashTrail.length > 0) {
        this.dashTrail.shift();
      }

      if (touchVector) {
        this.state.x += touchVector.x * this.speed;
        this.state.y += touchVector.y * this.speed;
        if (touchVector.x !== 0) {
          this.state.facingRight = touchVector.x > 0;
        }
      } else {
        const moveLeft = this.keys.has('arrowleft') || this.keys.has('a');
        const moveRight = this.keys.has('arrowright') || this.keys.has('d');
        const moveUp = this.keys.has('arrowup') || this.keys.has('w');
        const moveDown = this.keys.has('arrowdown') || this.keys.has('s');

        if (moveLeft) {
          this.state.x -= this.speed;
          this.state.facingRight = false;
        }
        if (moveRight) {
          this.state.x += this.speed;
          this.state.facingRight = true;
        }
        if (moveUp) {
          this.state.y -= this.speed;
        }
        if (moveDown) {
          this.state.y += this.speed;
        }
      }
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

    if (attack.id === 'edo_tensei') {
      const projectile: Projectile = {
        id: `proj_${this.projectileIdCounter++}`,
        x: this.state.x + this.state.width / 2,
        y: this.state.y + this.state.height / 2,
        width: 10, // starts at 10px radius
        height: 10,
        speed: 0, // static center
        damage: attack.damage,
        color: attack.color,
        attackName: attack.name,
        lifetime: 3000,
        createdAt: now,
        hitEnemyIds: [],
      };
      return projectile;
    }

    const facingRight = this.state.facingRight;
    const projWidth = attack.range * 0.4;
    const speed = facingRight ? 14 : -14;
    const x = facingRight ? this.state.x + this.state.width : this.state.x - projWidth;

    const projectile: Projectile = {
      id: `proj_${this.projectileIdCounter++}`,
      x,
      y: this.state.y + this.state.height / 2 - 10,
      width: projWidth,
      height: 24,
      speed,
      damage: attack.damage,
      color: attack.color,
      attackName: attack.name,
      lifetime: 3000,
      createdAt: now,
      hitEnemyIds: [],
    };

    return projectile;
  }

  takeDamage(damage: number): void {
    // Cannot take damage while dashing (invincibility frames)
    if (this.isDashing) return;

    this.state.hp -= damage;
    this.state.isHit = true;
    this.state.hitTime = Date.now();
    if (this.state.hp < 0) this.state.hp = 0;
  }

  draw(ctx: CanvasRenderingContext2D, playerImg: HTMLImageElement | null): void {
    const { x, y, width, height, isHit, facingRight } = this.state;

    // Draw dash ghost trails
    this.dashTrail.forEach((pos, idx) => {
      const alpha = ((idx + 1) / (this.dashTrail.length + 1)) * 0.25;
      ctx.save();
      ctx.globalAlpha = alpha;

      // Draw shadow glow for trail
      ctx.shadowColor = '#8b00ff';
      ctx.shadowBlur = 10;

      if (playerImg && playerImg.complete && playerImg.naturalWidth > 0) {
        if (facingRight) {
          ctx.translate(pos.x + width, pos.y);
          ctx.scale(-1, 1);
          ctx.drawImage(playerImg, 0, 0, width, height);
        } else {
          ctx.drawImage(playerImg, pos.x, pos.y, width, height);
        }
      } else {
        ctx.fillStyle = '#8b00ff';
        ctx.fillRect(pos.x, pos.y, width, height);
      }
      ctx.restore();
    });

    ctx.save();

    if (isHit) {
      ctx.globalAlpha = 0.6;
    }

    if (playerImg && playerImg.complete && playerImg.naturalWidth > 0) {
      if (facingRight) {
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

    ctx.restore();
  }
}