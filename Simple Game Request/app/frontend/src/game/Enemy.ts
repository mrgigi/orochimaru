import { EnemyData, EnemyType, ENEMY_CONFIGS, WAVE_CONFIG, PlayerState } from './types';

let enemyIdCounter = 0;

export function createEnemy(type: EnemyType, canvasWidth: number, canvasHeight: number): EnemyData {
  const config = ENEMY_CONFIGS[type];
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

  // Move toward player
  if (dist > 60) {
    enemy.x += (dx / dist) * enemy.speed;
    enemy.y += (dy / dist) * enemy.speed * 0.5;
  }

  // Reset hit flash
  if (enemy.isHit && now - enemy.hitTime > 150) {
    enemy.isHit = false;
  }

  // Attack if close enough
  let attacking = false;
  if (dist < 70 && now - enemy.lastAttack > enemy.attackCooldown) {
    enemy.lastAttack = now;
    attacking = true;
  }

  return { attacking };
}

export function drawEnemy(
  ctx: CanvasRenderingContext2D,
  enemy: EnemyData,
  enemyImg: HTMLImageElement | null
): void {
  const { x, y, width, height, isHit, hp, maxHp, type, color } = enemy;

  ctx.save();

  if (isHit) {
    ctx.globalAlpha = 0.6;
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

  // HP bar
  const hpBarWidth = width;
  const hpRatio = hp / maxHp;
  ctx.fillStyle = '#333';
  ctx.fillRect(x, y - 10, hpBarWidth, 5);
  ctx.fillStyle = hpRatio > 0.5 ? '#00ff41' : hpRatio > 0.25 ? '#ffaa00' : '#ff0000';
  ctx.fillRect(x, y - 10, hpBarWidth * hpRatio, 5);

  ctx.restore();
}