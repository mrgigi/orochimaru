import type { EnemyData, PlayerState } from './types';
import { EnemyType, ENEMY_CONFIGS, WAVE_CONFIG } from './types';

let enemyIdCounter = 0;

export function createEnemy(type: EnemyType, canvasWidth: number, canvasHeight: number): EnemyData {
  const config = ENEMY_CONFIGS[type];

  // Boss always spawns from the right, centered vertically
  if (type === EnemyType.KAGE) {
    return {
      id: `enemy_${enemyIdCounter++}`,
      x: canvasWidth + 50,
      y: canvasHeight - config.height - 40,
      width: config.width,
      height: config.height,
      hp: config.hp,
      maxHp: config.hp,
      speed: config.speed,
      damage: config.damage,
      type,
      lastAttack: 0,
      attackCooldown: config.attackCooldown,
      color: config.color,
      isHit: false,
      hitTime: 0,
    };
  }

  const spawnRight = Math.random() > 0.5;

  return {
    id: `enemy_${enemyIdCounter++}`,
    x: spawnRight ? canvasWidth + 50 : -50,
    y: canvasHeight - config.height - 20 - Math.random() * (canvasHeight * 0.4),
    width: config.width,
    height: config.height,
    hp: config.hp,
    maxHp: config.hp,
    speed: config.speed,
    damage: config.damage,
    type,
    lastAttack: 0,
    attackCooldown: config.attackCooldown,
    color: config.color,
    isHit: false,
    hitTime: 0,
  };
}

export function spawnWave(wave: number, canvasWidth: number, canvasHeight: number): EnemyData[] {
  const waveIndex = Math.min(wave - 1, WAVE_CONFIG.length - 1);
  const config = WAVE_CONFIG[waveIndex];
  return config.enemies.map(type => createEnemy(type, canvasWidth, canvasHeight));
}

export function updateEnemy(enemy: EnemyData, player: PlayerState, now: number): { attacking: boolean } {
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  let attacking = false;

  // Initialize warning properties if they don't exist
  if (enemy.isWarning === undefined) enemy.isWarning = false;
  if (enemy.warningTime === undefined) enemy.warningTime = 0;
  if (enemy.warningDuration === undefined) enemy.warningDuration = 0;

  if (enemy.isWarning) {
    // Enemy pauses to warning/charge attack
    if (now - enemy.warningTime >= enemy.warningDuration) {
      attacking = true;
      enemy.isWarning = false;
      enemy.lastAttack = now;
    }
  } else {
    // Movement
    if (enemy.type === EnemyType.KAGE) {
      const attackRange = 100;
      if (dist > attackRange) {
        enemy.x += (dx / dist) * enemy.speed;
        enemy.y += (dy / dist) * enemy.speed * 0.3;
      } else {
        enemy.x += Math.sin(now * 0.003) * 1.5;
        enemy.y += Math.cos(now * 0.002) * 0.8;
      }
    } else {
      if (dist > 60) {
        enemy.x += (dx / dist) * enemy.speed;
        enemy.y += (dy / dist) * enemy.speed * 0.5;
      }
    }

    // Trigger warning tell if in range and cooldown has finished
    const attackDist = enemy.type === EnemyType.KAGE ? 120 : 70;
    if (dist < attackDist && now - enemy.lastAttack > enemy.attackCooldown) {
      enemy.isWarning = true;
      enemy.warningTime = now;
      enemy.warningDuration = 400; // 400ms tell before damage occurs
    }
  }

  // Reset hit flash
  if (enemy.isHit && now - enemy.hitTime > 150) {
    enemy.isHit = false;
  }

  return { attacking };
}

export function drawEnemy(
  ctx: CanvasRenderingContext2D,
  enemy: EnemyData,
  enemyImg: HTMLImageElement | null
): void {
  const { x, y, width, height, isHit, hp, maxHp, type, color, isWarning } = enemy;

  ctx.save();

  if (isHit) {
    ctx.globalAlpha = 0.6;
  }

  if (isWarning) {
    const flash = Math.sin(Date.now() * 0.02) * 0.25 + 0.75;
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 15 * flash;
  }

  // Boss has unique drawing
  if (type === EnemyType.KAGE) {
    drawBoss(ctx, enemy);
    if (isWarning) {
      // Draw big warning indicator for boss
      ctx.fillStyle = '#ff1111';
      ctx.font = 'bold 30px sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 15;
      ctx.fillText('⚠️', x + width / 2, y - 25);
    }
    ctx.restore();
    return;
  }

  if (enemyImg && enemyImg.complete && enemyImg.naturalWidth > 0) {
    ctx.drawImage(enemyImg, x, y, width, height);
  } else {
    // Fallback colored rectangle with type indicator
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);

    // Mask for ANBU
    if (type === EnemyType.ANBU) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(x + width / 2, y + 15, 12, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#333';
      ctx.fillRect(x + width / 2 - 8, y + 10, 3, 8);
      ctx.fillRect(x + width / 2 + 5, y + 10, 3, 8);
    }

    // Type label
    ctx.fillStyle = '#fff';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(type, x + width / 2, y + height + 12);
  }

  // HP bar (for non-boss enemies)
  const hpBarWidth = width;
  const hpRatio = hp / maxHp;
  ctx.fillStyle = '#333';
  ctx.fillRect(x, y - 10, hpBarWidth, 5);
  ctx.fillStyle = hpRatio > 0.5 ? '#00ff41' : hpRatio > 0.25 ? '#ffaa00' : '#ff0000';
  ctx.fillRect(x, y - 10, hpBarWidth * hpRatio, 5);

  if (isWarning) {
    ctx.fillStyle = '#ff1111';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 10;
    ctx.fillText('!', x + width / 2, y - 20);
  }

  ctx.restore();
}

function drawBoss(ctx: CanvasRenderingContext2D, enemy: EnemyData): void {
  const { x, y, width, height, color } = enemy;
  const now = Date.now();
  const pulse = Math.sin(now * 0.005) * 0.15 + 0.85;

  // Dark aura glow
  ctx.shadowColor = color;
  ctx.shadowBlur = 25 * pulse;

  // Main body - large imposing figure
  const gradient = ctx.createLinearGradient(x, y, x, y + height);
  gradient.addColorStop(0, '#2a0015');
  gradient.addColorStop(0.3, color);
  gradient.addColorStop(0.7, '#8b0000');
  gradient.addColorStop(1, '#1a0008');
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, width, height);

  // Kage hat (triangular)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(x + width / 2, y - 20);
  ctx.lineTo(x + width * 0.15, y + 10);
  ctx.lineTo(x + width * 0.85, y + 10);
  ctx.closePath();
  ctx.fill();

  // "Fire" kanji symbol on hat
  ctx.fillStyle = color;
  ctx.font = 'bold 16px serif';
  ctx.textAlign = 'center';
  ctx.fillText('火', x + width / 2, y + 6);

  // Glowing eyes
  ctx.shadowColor = '#ff0000';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#ff0000';
  ctx.beginPath();
  ctx.ellipse(x + width * 0.35, y + 30, 5, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + width * 0.65, y + 30, 5, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Kage robe details
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + width * 0.3, y + height * 0.4);
  ctx.lineTo(x + width * 0.5, y + height * 0.5);
  ctx.lineTo(x + width * 0.7, y + height * 0.4);
  ctx.stroke();

  // Shoulder armor
  ctx.fillStyle = '#ffd700';
  ctx.fillRect(x - 5, y + 15, 15, 25);
  ctx.fillRect(x + width - 10, y + 15, 15, 25);

  // Boss name label
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#ffd700';
  ctx.shadowBlur = 8;
  ctx.fillText('★ KAGE ★', x + width / 2, y + height + 18);
}