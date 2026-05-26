export interface Position {
  x: number;
  y: number;
}

export interface Dimensions {
  width: number;
  height: number;
}

export interface Attack {
  id: string;
  name: string;
  key: string;
  damage: number;
  chakraCost: number;
  cooldown: number;
  lastUsed: number;
  range: number;
  color: string;
  description: string;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  damage: number;
  color: string;
  attackName: string;
  lifetime: number;
  createdAt: number;
  hitEnemyIds?: string[];
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface DyingEnemy {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  type: EnemyType;
  deathTime: number;
  duration: number;
  particles: DeathParticle[];
}

export interface DeathParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  size: number;
  lifetime: number;
  maxLifetime: number;
}

export const DropType = {
  HEALTH: 'health',
  CHAKRA: 'chakra',
} as const;
export type DropType = typeof DropType[keyof typeof DropType];

export interface DropItem {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: DropType;
  amount: number;
  color: string;
  createdAt: number;
}

export interface EnemyData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  type: EnemyType;
  lastAttack: number;
  attackCooldown: number;
  color: string;
  isHit: boolean;
  hitTime: number;
  isWarning?: boolean;
  warningTime?: number;
  warningDuration?: number;
}

export const EnemyType = {
  GENIN: 'Genin',
  CHUNIN: 'Chunin',
  ANBU: 'ANBU',
  JONIN: 'Jonin',
  KAGE: 'Kage',
} as const;
export type EnemyType = typeof EnemyType[keyof typeof EnemyType];

export const GameState = {
  START: 'start',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'game_over',
  VICTORY: 'victory',
} as const;
export type GameState = typeof GameState[keyof typeof GameState];

export interface PlayerState {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  chakra: number;
  maxChakra: number;
  isHit: boolean;
  hitTime: number;
  facingRight: boolean;
}

export interface GameStats {
  score: number;
  kills: number;
  wave: number;
  maxWave: number;
  highScore: number;
  bossHp?: number;
  bossMaxHp?: number;
  bossName?: string;
  isBossWave?: boolean;
}

export const ATTACKS: Attack[] = [
  {
    id: 'snake_strike',
    name: 'Snake Strike',
    key: '1',
    damage: 15,
    chakraCost: 10,
    cooldown: 500,
    lastUsed: 0,
    range: 200,
    color: '#39ff14',
    description: 'Quick snake bite attack',
  },
  {
    id: 'shadow_snake',
    name: 'Shadow Snake',
    key: '2',
    damage: 25,
    chakraCost: 20,
    cooldown: 1000,
    lastUsed: 0,
    range: 350,
    color: '#8b00ff',
    description: 'Multiple shadow snakes',
  },
  {
    id: 'kusanagi',
    name: 'Kusanagi',
    key: '3',
    damage: 40,
    chakraCost: 35,
    cooldown: 2000,
    lastUsed: 0,
    range: 300,
    color: '#ffd700',
    description: 'Legendary sword slash',
  },
  {
    id: 'edo_tensei',
    name: 'Edo Tensei',
    key: '4',
    damage: 60,
    chakraCost: 50,
    cooldown: 5000,
    lastUsed: 0,
    range: 500,
    color: '#ff0066',
    description: 'Forbidden reanimation blast',
  },
];

export const ENEMY_CONFIGS = {
  [EnemyType.GENIN]: {
    hp: 30,
    speed: 1.5,
    damage: 5,
    attackCooldown: 2000,
    color: '#4a9eff',
    width: 40,
    height: 60,
  },
  [EnemyType.CHUNIN]: {
    hp: 50,
    speed: 2,
    damage: 10,
    attackCooldown: 1500,
    color: '#ff8c00',
    width: 45,
    height: 65,
  },
  [EnemyType.ANBU]: {
    hp: 80,
    speed: 2.5,
    damage: 15,
    attackCooldown: 1200,
    color: '#e0e0e0',
    width: 45,
    height: 65,
  },
  [EnemyType.JONIN]: {
    hp: 120,
    speed: 3,
    damage: 20,
    attackCooldown: 1000,
    color: '#ff2222',
    width: 50,
    height: 70,
  },
  [EnemyType.KAGE]: {
    hp: 600,
    speed: 1.8,
    damage: 30,
    attackCooldown: 800,
    color: '#ff0044',
    width: 90,
    height: 120,
  },
};

export const WAVE_CONFIG = [
  { enemies: [EnemyType.GENIN, EnemyType.GENIN, EnemyType.GENIN] },
  { enemies: [EnemyType.GENIN, EnemyType.GENIN, EnemyType.CHUNIN, EnemyType.CHUNIN] },
  { enemies: [EnemyType.CHUNIN, EnemyType.CHUNIN, EnemyType.CHUNIN, EnemyType.ANBU] },
  { enemies: [EnemyType.CHUNIN, EnemyType.ANBU, EnemyType.ANBU, EnemyType.ANBU] },
  { enemies: [EnemyType.ANBU, EnemyType.ANBU, EnemyType.JONIN, EnemyType.JONIN] },
  { enemies: [EnemyType.ANBU, EnemyType.JONIN, EnemyType.JONIN, EnemyType.JONIN, EnemyType.JONIN] },
  { enemies: [EnemyType.KAGE], isBoss: true },
];