import { music, sfx } from './audio';
import { getSpriteFrame, spriteBank } from './sprites';
import type { Loadout, Snapshot } from './types';

type EnemyKind = 'bug' | 'virus' | 'trojan';

interface Enemy {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  radius: number;
  speed: number;
  damage: number;
  attackTimer: number;
  hitFlash: number;
  wobble: number;
  spawnAnim: number;
  attackAnim: number;
  seed: number;
  elite: boolean;
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  life: number;
  pierce: number;
  hitIds: number[];
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  shape: 'dot' | 'spark';
  gravity: number;
}

interface Floater {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

interface Ring {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
  width: number;
}

interface Slash {
  x: number;
  y: number;
  angle: number;
  radius: number;
  life: number;
  maxLife: number;
  color: string;
}

interface CodeGlyph {
  x: number;
  y: number;
  speed: number;
  size: number;
  phase: number;
  glyph: string;
  color: string;
}

interface BoardTrace {
  points: { x: number; y: number }[];
  length: number;
  phase: number;
  color: string;
}

interface BoardChip {
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  label: string;
}

function tracePoint(trace: BoardTrace, distance: number): { x: number; y: number } {
  let remaining = distance;
  for (let i = 0; i < trace.points.length - 1; i++) {
    const a = trace.points[i]!;
    const b = trace.points[i + 1]!;
    const segment = Math.hypot(b.x - a.x, b.y - a.y);
    if (remaining <= segment || i === trace.points.length - 2) {
      const t = segment > 0 ? clamp(remaining / segment, 0, 1) : 0;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    remaining -= segment;
  }
  return trace.points[0] ?? { x: 0, y: 0 };
}

export interface EngineCallbacks {
  onKill: (xp: number) => void;
  onDeath: () => void;
  onSnapshot: (snapshot: Snapshot) => void;
}

const TAU = Math.PI * 2;

const ENEMY_XP: Record<EnemyKind, number> = {
  bug: 14,
  virus: 20,
  trojan: 36,
};

export const WAVE_DURATION = 45;
const WAVE_HP_SCALE = 1.35;
const WAVE_DAMAGE_SCALE = 1.18;
const WAVE_SPAWN_SCALE = 0.94;


const ENEMY_STYLE: Record<
  EnemyKind,
  { body: string; dark: string; glow: string; accent: string; eye: string }
> = {
  bug: {
    body: '#66e05f',
    dark: '#123d22',
    glow: '#b8ff8f',
    accent: '#ffd166',
    eye: '#07240f',
  },
  virus: {
    body: '#c05cff',
    dark: '#341050',
    glow: '#e7b8ff',
    accent: '#ff4d6d',
    eye: '#ff3355',
  },
  trojan: {
    body: '#a9743f',
    dark: '#402512',
    glow: '#ffcf8a',
    accent: '#ff6b4a',
    eye: '#ff5d3a',
  },
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeOutCubic(t: number): number {
  const value = clamp(t, 0, 1);
  return 1 - Math.pow(1 - value, 3);
}

function easeOutBack(t: number): number {
  const value = clamp(t, 0, 1);
  const c1 = 1.9;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(value - 1, 3) + c1 * Math.pow(value - 1, 2);
}

/** Convierte #rrggbb a rgba() para reutilizar la paleta con alfa. */
function rgba(hex: string, alpha: number): string {
  const raw = hex.replace('#', '');
  if (raw.length !== 6) return hex;
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export interface ViewTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

/**
 * Calcula la cámara que encaja un mundo fijo dentro de la vista actual.
 * Se usa escala uniforme y centrado para que el zoom nunca deforme ni
 * desplace las entidades del mundo.
 */
export function computeViewTransform(
  worldWidth: number,
  worldHeight: number,
  viewWidth: number,
  viewHeight: number,
): ViewTransform {
  const safeWorldWidth = Math.max(1, worldWidth);
  const safeWorldHeight = Math.max(1, worldHeight);
  const scale = Math.min(
    viewWidth / safeWorldWidth,
    viewHeight / safeWorldHeight,
  );
  return {
    scale,
    offsetX: (viewWidth - safeWorldWidth * scale) / 2,
    offsetY: (viewHeight - safeWorldHeight * scale) / 2,
  };
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: EngineCallbacks;
  // Dimensiones del mundo lógico: se fijan al arrancar y no cambian con el zoom.
  private width = 0;
  private height = 0;
  // Dimensiones de la vista (canvas CSS) y transformación mundo -> vista.
  private viewWidth = 0;
  private viewHeight = 0;
  private viewScale = 1;
  private viewOffsetX = 0;
  private viewOffsetY = 0;
  private worldInitialized = false;
  private dpr = 1;
  private raf = 0;
  private lastTs = 0;
  private destroyed = false;
  private active = false;
  private paused = true;
  private resizeObserver: ResizeObserver | null = null;
  private bgTime = 0;

  private loadout: Loadout = {
    maxHp: 128,
    damage: 8,
    attackInterval: 0.5,
    range: 256,
    projectileSpeed: 512,
    damageReduction: 0,
    critChance: 0,
    critMultiplier: 2,
    extraProjectiles: 0,
    pierce: 0,
    lifesteal: 0,
    xpGain: 1,
    regen: 0,
  };

  private level = 1;
  private hero = {
    x: 0,
    y: 0,
    hp: 128,
    maxHp: 128,
    attackTimer: 0.4,
    flash: 0,
    angle: -Math.PI / 2,
    swing: 0,
    attackAnim: 0,
  };

  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private particles: Particle[] = [];
  private floaters: Floater[] = [];
  private rings: Ring[] = [];
  private slashes: Slash[] = [];
  private codeGlyphs: CodeGlyph[] = [];
  private boardTraces: BoardTrace[] = [];
  private boardChips: BoardChip[] = [];
  private scanlinePattern: CanvasPattern | null = null;
  private time = 0;
  private kills = 0;
  private spawnTimer = 0;
  private shake = 0;
  private combo = 0;
  private comboTimer = 0;
  private wave = 1;
  private waveTimer = WAVE_DURATION;
  private waveBanner = 0;
  private flashAlpha = 0;
  private flashColor = '#ff5d73';
  private lowHpTimer = 0;
  private idSeq = 1;
  private snapshotTimer = 0;

  constructor(canvas: HTMLCanvasElement, callbacks: EngineCallbacks) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D no disponible');
    this.ctx = ctx;
    this.callbacks = callbacks;
    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.raf = requestAnimationFrame(this.frame);
  }

  begin(loadout: Loadout, hp: number, level: number, kills = 0, time = 0): void {
    this.loadout = loadout;
    this.level = level;
    this.hero = {
      x: this.width / 2,
      y: this.height / 2,
      hp: clamp(hp, 1, loadout.maxHp),
      maxHp: loadout.maxHp,
      attackTimer: 0.4,
      flash: 0,
      angle: -Math.PI / 2,
      swing: 0,
      attackAnim: 0,
    };
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.floaters = [];
    this.rings = [];
    this.slashes = [];
    this.time = time;
    this.kills = kills;
    const safeTime = Math.max(0, time);
    this.wave = 1 + Math.floor(safeTime / WAVE_DURATION);
    this.waveTimer = WAVE_DURATION - (safeTime % WAVE_DURATION);
    this.waveBanner = 0;
    this.spawnTimer = 0.5;
    this.shake = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.flashAlpha = 0;
    this.lowHpTimer = 0;
    this.snapshotTimer = 0;
    this.active = true;
    this.paused = false;
    this.setMusicLevel();
    this.pushSnapshot();
  }

  setLoadout(loadout: Loadout, healDifference = true): void {
    if (healDifference) {
      const diff = loadout.maxHp - this.hero.maxHp;
      if (diff > 0) this.hero.hp += diff;
    }
    this.loadout = loadout;
    this.hero.maxHp = loadout.maxHp;
    this.hero.hp = Math.min(this.hero.hp, loadout.maxHp);
    this.pushSnapshot();
  }

  setDifficulty(level: number): void {
    this.level = level;
    this.setMusicLevel();
  }

  /** Estallido visual al elegir una mejora o subir de nivel. */
  levelUpBurst(): void {
    if (!this.active) return;
    this.rings.push({
      x: this.hero.x,
      y: this.hero.y,
      radius: 18,
      maxRadius: 132,
      life: 0.75,
      maxLife: 0.75,
      color: '#f5c451',
      width: 5,
    });
    this.rings.push({
      x: this.hero.x,
      y: this.hero.y,
      radius: 8,
      maxRadius: 88,
      life: 0.55,
      maxLife: 0.55,
      color: '#4de2c5',
      width: 3,
    });
    this.spawnParticles(this.hero.x, this.hero.y, '#f5c451', 16, 170, {
      shape: 'spark',
      gravity: 34,
    });
    this.spawnParticles(this.hero.x, this.hero.y, '#4de2c5', 12, 120);
    this.floaters.push({
      x: this.hero.x,
      y: this.hero.y - 62,
      text: 'COMPILED',
      color: '#4de2c5',
      life: 1.15,
      maxLife: 1.15,
      size: 14,
    });
    this.flash('#f5c451', 0.2);
    this.shake = Math.min(7, this.shake + 2);
  }

  heal(amount: number): void {
    if (!this.active) return;
    this.hero.hp = Math.min(this.hero.maxHp, this.hero.hp + amount);
    this.spawnParticles(this.hero.x, this.hero.y, '#7cf5c9', 6, 70);
    this.pushSnapshot();
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    if (this.active) this.paused = false;
  }

  destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObserver?.disconnect();
  }

  getSnapshot(): Snapshot {
    return {
      hp: Math.max(0, Math.round(this.hero.hp)),
      maxHp: this.hero.maxHp,
      kills: this.kills,
      time: this.time,
      enemyCount: this.enemies.length,
      combo: this.combo,
      comboMult: this.comboMultiplier(),
      wave: this.wave,
      waveTimer: this.waveTimer,
      waveDuration: WAVE_DURATION,
    };
  }

  private frame = (ts: number): void => {
    if (this.destroyed) return;
    this.raf = requestAnimationFrame(this.frame);
    const dt = this.lastTs ? Math.min(0.05, Math.max(0, (ts - this.lastTs) / 1000)) : 0;
    this.lastTs = ts;
    this.bgTime += dt;
    this.updateAmbient(dt);
    if (this.active && !this.paused) this.update(dt);
    this.render();
  };

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const viewWidth = Math.max(1, Math.round(rect.width || window.innerWidth));
    const viewHeight = Math.max(1, Math.round(rect.height || window.innerHeight));
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    // El mundo se define una sola vez con el tamaño inicial de la vista.
    // A partir de ahí, el zoom o el redimensionado solo escalan la cámara.
    if (!this.worldInitialized) {
      this.worldInitialized = true;
      this.width = viewWidth;
      this.height = viewHeight;
      this.hero.x = viewWidth / 2;
      this.hero.y = viewHeight / 2;
      this.initDecor();
    }

    if (
      viewWidth === this.viewWidth &&
      viewHeight === this.viewHeight &&
      dpr === this.dpr
    ) {
      return;
    }

    this.viewWidth = viewWidth;
    this.viewHeight = viewHeight;
    this.dpr = dpr;
    this.canvas.width = Math.round(viewWidth * dpr);
    this.canvas.height = Math.round(viewHeight * dpr);

    // Escala uniforme para que el mundo nunca se deforme ni salte.
    const camera = computeViewTransform(
      this.width,
      this.height,
      viewWidth,
      viewHeight,
    );
    this.viewScale = camera.scale;
    this.viewOffsetX = camera.offsetX;
    this.viewOffsetY = camera.offsetY;
    this.applyViewTransform();
  }

  /** Aplica la cámara mundo -> vista (incluye DPR). */
  private applyViewTransform(): void {
    const scale = this.viewScale * this.dpr;
    this.ctx.setTransform(
      scale,
      0,
      0,
      scale,
      this.viewOffsetX * this.dpr,
      this.viewOffsetY * this.dpr,
    );
  }

  private initDecor(): void {
    const glyphs = ['0', '1', '01', '10', '0x1', '</>', '{ }', ';', '#', '$', '&&', '=>'];
    const colors = ['#4de2c5', '#7dd3fc', '#f5c451', '#8bffcf'];
    this.codeGlyphs = Array.from({ length: 36 }, () => ({
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      speed: 5 + Math.random() * 13,
      size: 8 + Math.random() * 4,
      phase: Math.random() * TAU,
      glyph: glyphs[Math.floor(Math.random() * glyphs.length)]!,
      color: colors[Math.floor(Math.random() * colors.length)]!,
    }));

    // Pistas de circuito con recorridos ortogonales.
    const traceColors = ['#4de2c5', '#7dd3fc', '#f5c451'];
    this.boardTraces = [];
    for (let i = 0; i < 22; i++) {
      let x = 24 + Math.random() * (this.width - 48);
      let y = 24 + Math.random() * (this.height - 48);
      const points = [{ x, y }];
      let horizontal = Math.random() > 0.5;
      const segments = 2 + Math.floor(Math.random() * 3);

      for (let seg = 0; seg < segments; seg++) {
        const step = (2 + Math.floor(Math.random() * 4)) * 32;
        const direction = Math.random() > 0.5 ? 1 : -1;
        if (horizontal) x += step * direction;
        else y += step * direction;
        x = clamp(x, 22, this.width - 22);
        y = clamp(y, 22, this.height - 22);
        points.push({ x, y });
        horizontal = !horizontal;
      }

      let length = 0;
      for (let seg = 0; seg < points.length - 1; seg++) {
        const a = points[seg]!;
        const b = points[seg + 1]!;
        length += Math.hypot(b.x - a.x, b.y - a.y);
      }
      if (length < 40) continue;

      this.boardTraces.push({
        points,
        length,
        phase: Math.random(),
        color: traceColors[i % traceColors.length]!,
      });
    }

    // Chips/IC repartidos por el tablero, lejos del centro.
    const labels = ['CPU', 'RAM', 'GPU', 'NET', 'I/O', 'SSD', 'BIOS', 'BUS', 'CACHE', 'ROM'];
    this.boardChips = [];
    for (let i = 0; i < 9; i++) {
      let x = 0;
      let y = 0;
      for (let attempt = 0; attempt < 20; attempt++) {
        x = 40 + Math.random() * (this.width - 80);
        y = 40 + Math.random() * (this.height - 80);
        if (Math.hypot(x - this.width / 2, y - this.height / 2) > Math.min(this.width, this.height) * 0.3) {
          break;
        }
      }
      this.boardChips.push({
        x,
        y,
        w: 52 + Math.random() * 68,
        h: 32 + Math.random() * 44,
        rot: (Math.random() - 0.5) * 0.16,
        label: labels[i % labels.length]!,
      });
    }

    // Scanlines de monitor CRT.
    if (typeof document !== 'undefined') {
      const scan = document.createElement('canvas');
      scan.width = 1;
      scan.height = 4;
      const scanCtx = scan.getContext('2d');
      if (scanCtx) {
        scanCtx.fillStyle = 'rgba(0, 0, 0, 0.16)';
        scanCtx.fillRect(0, 0, 1, 1);
        this.scanlinePattern = this.ctx.createPattern(scan, 'repeat');
      }
    }
  }

  private updateAmbient(dt: number): void {
    for (const glyph of this.codeGlyphs) {
      glyph.y += glyph.speed * dt;
      glyph.x += Math.sin(this.bgTime * 0.7 + glyph.phase) * 3 * dt;
      if (glyph.y > this.height + 14) {
        glyph.y = -14;
        glyph.x = Math.random() * this.width;
      }
      if (glyph.x < -12) glyph.x = this.width + 12;
      if (glyph.x > this.width + 12) glyph.x = -12;
    }
  }

  private comboMultiplier(): number {
    return 1 + Math.min(0.75, Math.max(0, this.combo - 1) * 0.05);
  }

  private setMusicLevel(): void {
    const intensity = clamp((this.level - 1) / 14 + (this.wave - 1) * 0.04, 0, 1);
    music.setIntensity(intensity);
  }

  private maxEnemies(): number {
    return Math.min(40, 8 + this.wave * 2);
  }

  private pushSnapshot(): void {
    this.callbacks.onSnapshot(this.getSnapshot());
  }

  private flash(color: string, alpha: number): void {
    this.flashColor = color;
    this.flashAlpha = Math.max(this.flashAlpha, alpha);
  }

  private update(dt: number): void {
    this.time += dt;
    this.snapshotTimer += dt;
    if (this.snapshotTimer >= 0.1) {
      this.snapshotTimer = 0;
      this.pushSnapshot();
    }

    if (this.hero.hp > 0 && this.hero.hp < this.hero.maxHp) {
      this.hero.hp = Math.min(
        this.hero.maxHp,
        this.hero.hp + (0.45 + this.loadout.regen) * dt,
      );
    }

    // Latido cuando la vida está crítica.
    this.lowHpTimer -= dt;
    if (this.hero.hp > 0 && this.hero.hp / this.hero.maxHp < 0.3) {
      if (this.lowHpTimer <= 0) {
        this.lowHpTimer = 1.25;
        sfx.lowHp();
      }
    } else {
      this.lowHpTimer = 0;
    }

    this.comboTimer = Math.max(0, this.comboTimer - dt);
    if (this.comboTimer <= 0 && this.combo > 0) this.combo = 0;

    this.waveTimer -= dt;
    while (this.waveTimer <= 0) {
      this.wave += 1;
      this.waveTimer += WAVE_DURATION;
      this.waveBanner = 2.4;
      this.setMusicLevel();
      this.rings.push({
        x: this.hero.x,
        y: this.hero.y,
        radius: 20,
        maxRadius: 180,
        life: 0.7,
        maxLife: 0.7,
        color: '#f5c451',
        width: 4,
      });
      this.flash('#4de2c5', 0.1);
      sfx.wave();
    }
    this.waveBanner = Math.max(0, this.waveBanner - dt);

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      if (this.enemies.length < this.maxEnemies()) this.spawnEnemy();
      const base = Math.max(0.5, 1.7 - this.level * 0.045);
      const waveRate = Math.pow(WAVE_SPAWN_SCALE, this.wave - 1);
      this.spawnTimer = Math.max(
        0.32,
        base * waveRate * (0.8 + Math.random() * 0.45),
      );
    }

    this.hero.flash = Math.max(0, this.hero.flash - dt);
    this.hero.swing = Math.max(0, this.hero.swing - dt * 4);
    this.hero.attackAnim = Math.max(0, this.hero.attackAnim - dt);
    this.hero.attackTimer -= dt;
    if (this.hero.attackTimer <= 0) {
      const target = this.nearestEnemy();
      if (target) {
        this.hero.angle = Math.atan2(target.y - this.hero.y, target.x - this.hero.x);
        this.fireAt(target);
        this.hero.attackTimer = this.loadout.attackInterval;
        this.hero.swing = 1;
        this.hero.attackAnim = 0.5;
        this.slashes.push({
          x: this.hero.x,
          y: this.hero.y,
          angle: this.hero.angle,
          radius: 36,
          life: 0.2,
          maxLife: 0.2,
          color: '#b8fff0',
        });
        this.spawnParticles(
          this.hero.x + Math.cos(this.hero.angle) * 28,
          this.hero.y + Math.sin(this.hero.angle) * 28,
          '#9dfff0',
          3,
          60,
          { shape: 'spark' },
        );
        sfx.shoot();
      } else {
        this.hero.attackTimer = 0.05;
      }
    }

    for (const enemy of this.enemies) {
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt * 4);
      enemy.wobble += dt;
      enemy.spawnAnim = Math.min(1, enemy.spawnAnim + dt * 3.2);
      enemy.attackAnim = Math.max(0, enemy.attackAnim - dt);

      const dx = this.hero.x - enemy.x;
      const dy = this.hero.y - enemy.y;
      const dist = Math.hypot(dx, dy) || 1;
      const ready = enemy.spawnAnim >= 0.8;

      if (ready && dist > enemy.radius + 18) {
        let mx = dx / dist;
        let my = dy / dist;

        for (const other of this.enemies) {
          if (other === enemy) continue;
          const ox = enemy.x - other.x;
          const oy = enemy.y - other.y;
          const od = Math.hypot(ox, oy);
          const minDist = enemy.radius + other.radius;
          if (od > 0 && od < minDist) {
            mx += (ox / od) * 0.7;
            my += (oy / od) * 0.7;
          }
        }

        const len = Math.hypot(mx, my) || 1;
        enemy.x += (mx / len) * enemy.speed * dt;
        enemy.y += (my / len) * enemy.speed * dt;
      } else if (ready) {
        enemy.attackTimer -= dt;
        if (enemy.attackTimer <= 0) {
          enemy.attackTimer = 1.1;
          enemy.attackAnim = 0.6;
          const incoming = enemy.damage * (1 - this.loadout.damageReduction);
          this.hero.hp -= incoming;
          this.hero.flash = 0.24;
          this.shake = Math.min(9, this.shake + 3);
          this.flash('#ff5d73', 0.16);
          this.spawnParticles(this.hero.x, this.hero.y, '#ff5d73', 7, 105, {
            shape: 'spark',
          });
          this.rings.push({
            x: this.hero.x,
            y: this.hero.y,
            radius: 12,
            maxRadius: 46,
            life: 0.35,
            maxLife: 0.35,
            color: '#ff5d73',
            width: 2.5,
          });
          this.floaters.push({
            x: this.hero.x,
            y: this.hero.y - 30,
            text: `-${Math.round(incoming)}`,
            color: '#ff8a9a',
            life: 0.8,
            maxLife: 0.8,
            size: 13,
          });
          sfx.enemyAttack(enemy.kind);
          sfx.heroHit();
          this.pushSnapshot();
          if (this.hero.hp <= 0) {
            this.die();
            return;
          }
        }
      }
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]!;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;

      let remove = false;
      for (const enemy of [...this.enemies]) {
        if (p.hitIds.includes(enemy.id)) continue;
        if (Math.hypot(enemy.x - p.x, enemy.y - p.y) < enemy.radius + 5) {
          p.hitIds.push(enemy.id);
          this.damageEnemy(enemy, p.damage);
          if (p.pierce <= 0) {
            remove = true;
            break;
          }
          p.pierce -= 1;
        }
      }

      if (
        remove ||
        p.life <= 0 ||
        p.x < -40 ||
        p.x > this.width + 40 ||
        p.y < -40 ||
        p.y > this.height + 40
      ) {
        this.projectiles.splice(i, 1);
      }

      if (this.paused) return;
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i]!;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += particle.gravity * dt;
      particle.vx *= 0.96;
      particle.vy *= 0.96;
      particle.life -= dt;
      if (particle.life <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const floater = this.floaters[i]!;
      floater.y -= 26 * dt;
      floater.life -= dt;
      if (floater.life <= 0) this.floaters.splice(i, 1);
    }

    for (let i = this.rings.length - 1; i >= 0; i--) {
      const ring = this.rings[i]!;
      ring.life -= dt;
      ring.radius = lerp(ring.radius, ring.maxRadius, Math.min(1, dt * 8));
      if (ring.life <= 0) this.rings.splice(i, 1);
    }

    for (let i = this.slashes.length - 1; i >= 0; i--) {
      const slash = this.slashes[i]!;
      slash.life -= dt;
      slash.radius += 46 * dt;
      if (slash.life <= 0) this.slashes.splice(i, 1);
    }

    this.shake = Math.max(0, this.shake - dt * 26);
    this.flashAlpha = Math.max(0, this.flashAlpha - dt * 2.6);
  }

  private pickKind(): EnemyKind {
    const roll = Math.random();
    if (this.level >= 5 && roll < 0.2) return 'trojan';
    if (this.level >= 2 && roll < 0.52) return 'virus';
    return 'bug';
  }

  private spawnEnemy(): void {
    const kind = this.pickKind();
    const edge = Math.floor(Math.random() * 4);
    const margin = 24;
    let x = 0;
    let y = 0;

    if (edge === 0) {
      x = Math.random() * this.width;
      y = -margin;
    } else if (edge === 1) {
      x = this.width + margin;
      y = Math.random() * this.height;
    } else if (edge === 2) {
      x = Math.random() * this.width;
      y = this.height + margin;
    } else {
      x = -margin;
      y = Math.random() * this.height;
    }

    const lvl = this.level;
    let maxHp: number;
    let speed: number;
    let damage: number;
    let radius: number;

    if (kind === 'virus') {
      maxHp = 11 + lvl * 4;
      speed = 64 + Math.min(30, lvl * 1.5);
      damage = 3 + lvl * 0.9;
      radius = 12;
    } else if (kind === 'trojan') {
      maxHp = 38 + lvl * 13;
      speed = 24 + Math.min(14, lvl * 0.8);
      damage = 8 + lvl * 1.9;
      radius = 23;
    } else {
      maxHp = 16 + lvl * 6;
      speed = 46 + Math.min(28, lvl * 2.2);
      damage = 4 + lvl * 1.1;
      radius = 17;
    }

    maxHp *= Math.pow(WAVE_HP_SCALE, this.wave - 1);
    damage *= Math.pow(WAVE_DAMAGE_SCALE, this.wave - 1);
    speed *= 1 + Math.min(0.45, (this.wave - 1) * 0.015);

    const eliteChance = Math.min(
      0.3,
      0.03 + this.level * 0.003 + (this.wave - 1) * 0.01,
    );
    const elite = this.level >= 3 && Math.random() < eliteChance;
    if (elite) {
      maxHp *= 1.8;
      damage *= 1.25;
      radius *= 1.12;
      speed *= 0.92;
    }

    this.enemies.push({
      id: this.idSeq++,
      kind,
      x,
      y,
      hp: maxHp,
      maxHp,
      radius,
      speed,
      damage,
      attackTimer: 0.4,
      hitFlash: 0,
      wobble: Math.random() * 10,
      spawnAnim: 0,
      attackAnim: 0,
      seed: Math.random() * TAU,
      elite,
    });

    const style = ENEMY_STYLE[kind];
    this.rings.push({
      x,
      y,
      radius: radius * 0.8,
      maxRadius: radius * (elite ? 3.6 : 2.9),
      life: 0.5,
      maxLife: 0.5,
      color: elite ? '#f5c451' : style.glow,
      width: elite ? 3 : 2,
    });
    sfx.spawn();
  }

  private nearestEnemy(): Enemy | null {
    let best: Enemy | null = null;
    let bestDist = this.loadout.range;

    for (const enemy of this.enemies) {
      const dist = Math.hypot(enemy.x - this.hero.x, enemy.y - this.hero.y);
      if (dist <= bestDist) {
        best = enemy;
        bestDist = dist;
      }
    }

    return best;
  }

  private fireAt(target: Enemy): void {
    const baseAngle = Math.atan2(target.y - this.hero.y, target.x - this.hero.x);
    const count = 1 + this.loadout.extraProjectiles;
    const spread = count > 1 ? 0.12 : 0;
    const speed = this.loadout.projectileSpeed;

    for (let i = 0; i < count; i++) {
      const angle = baseAngle + (i - (count - 1) / 2) * spread;
      this.projectiles.push({
        x: this.hero.x + Math.cos(angle) * 18,
        y: this.hero.y + Math.sin(angle) * 18,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        damage: this.loadout.damage * (i === 0 ? 1 : 0.75),
        life: this.loadout.range / speed + 0.35,
        pierce: this.loadout.pierce,
        hitIds: [],
      });
    }
  }

  private damageEnemy(enemy: Enemy, damage: number): void {
    const style = ENEMY_STYLE[enemy.kind];
    const crit = Math.random() < this.loadout.critChance;
    const finalDamage = crit ? damage * this.loadout.critMultiplier : damage;

    enemy.hp -= finalDamage;
    enemy.hitFlash = 1;
    this.floaters.push({
      x: enemy.x + (Math.random() - 0.5) * 8,
      y: enemy.y - enemy.radius - 6,
      text: crit ? `${Math.round(finalDamage)}!` : `${Math.round(finalDamage)}`,
      color: crit ? '#f5c451' : '#e7f6ff',
      life: 0.7,
      maxLife: 0.7,
      size: crit ? 14 : 12,
    });
    this.spawnParticles(enemy.x, enemy.y, crit ? '#f5c451' : style.glow, crit ? 8 : 5, crit ? 110 : 80, {
      shape: 'spark',
    });
    this.rings.push({
      x: enemy.x,
      y: enemy.y,
      radius: enemy.radius * 0.4,
      maxRadius: enemy.radius * (crit ? 2 : 1.5),
      life: 0.28,
      maxLife: 0.28,
      color: crit ? '#f5c451' : style.glow,
      width: crit ? 3 : 2,
    });
    sfx.hit();
    if (crit) sfx.crit();

    if (this.loadout.lifesteal > 0 && finalDamage > 0) {
      this.hero.hp = Math.min(
        this.hero.maxHp,
        this.hero.hp + finalDamage * this.loadout.lifesteal,
      );
    }

    if (enemy.hp <= 0) {
      this.kills += 1;
      this.combo += 1;
      this.comboTimer = 3.5;
      const comboMult = this.comboMultiplier();
      const xp = Math.round(
        ENEMY_XP[enemy.kind] *
          (enemy.elite ? 2.5 : 1) *
          comboMult *
          this.loadout.xpGain,
      );
      this.spawnParticles(enemy.x, enemy.y, style.body, 18, 190, {
        gravity: 60,
      });
      this.spawnParticles(enemy.x, enemy.y, style.glow, 8, 140, {
        shape: 'spark',
      });
      this.spawnParticles(enemy.x, enemy.y, '#ffffff', 5, 95, {
        shape: 'spark',
      });
      this.rings.push({
        x: enemy.x,
        y: enemy.y,
        radius: enemy.radius * 0.5,
        maxRadius: enemy.radius * 3.4,
        life: 0.55,
        maxLife: 0.55,
        color: style.glow,
        width: 3.5,
      });
      this.floaters.push({
        x: enemy.x,
        y: enemy.y - enemy.radius - 14,
        text: `+${xp} DATA`,
        color: '#f5c451',
        life: 0.95,
        maxLife: 0.95,
        size: 13,
      });
      if (Math.random() < 0.65) {
        this.floaters.push({
          x: enemy.x + (Math.random() - 0.5) * 22,
          y: enemy.y + (Math.random() - 0.5) * 12,
          text: Math.random() < 0.5 ? '0' : '1',
          color: style.glow,
          life: 0.55,
          maxLife: 0.55,
          size: 9,
        });
      }
      const index = this.enemies.indexOf(enemy);
      if (index >= 0) this.enemies.splice(index, 1);
      this.shake = Math.min(6, this.shake + 1.2);
      this.flash(style.glow, 0.07);
      sfx.kill();
      this.callbacks.onKill(xp);
      this.pushSnapshot();
    }
  }

  private spawnParticles(
    x: number,
    y: number,
    color: string,
    count: number,
    speed: number,
    options: { shape?: 'dot' | 'spark'; gravity?: number } = {},
  ): void {
    const shape = options.shape ?? 'dot';
    const gravity = options.gravity ?? 0;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * TAU;
      const velocity = speed * (0.35 + Math.random() * 0.8);
      const life = 0.3 + Math.random() * 0.45;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life,
        maxLife: life,
        size: 1.5 + Math.random() * 3,
        color,
        shape,
        gravity,
      });
    }
  }

  private die(): void {
    this.hero.hp = 0;
    this.paused = true;
    this.spawnParticles(this.hero.x, this.hero.y, '#ff5d73', 28, 210, {
      gravity: 40,
    });
    this.spawnParticles(this.hero.x, this.hero.y, '#ffffff', 10, 150, {
      shape: 'spark',
    });
    this.rings.push({
      x: this.hero.x,
      y: this.hero.y,
      radius: 14,
      maxRadius: 150,
      life: 0.8,
      maxLife: 0.8,
      color: '#ff5d73',
      width: 5,
    });
    this.flash('#ffffff', 0.34);
    this.shake = 9;
    this.pushSnapshot();
    this.callbacks.onDeath();
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  private render(): void {
    const { ctx } = this;

    // Limpiar la vista completa (incluidas las barras si hay letterboxing).
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = '#05080f';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Todo el dibujo del juego usa coordenadas del mundo fijo.
    this.applyViewTransform();
    const w = this.width;
    const h = this.height;

    this.drawBackground(w, h);
    this.drawServers(w, h);
    this.drawCodeGlyphs();
    this.drawProcessor();

    if (!this.active) {
      this.drawHero();
      this.drawVignette();
      this.drawScanlines();
      return;
    }

    ctx.save();
    if (this.shake > 0.1) {
      ctx.translate(
        (Math.random() - 0.5) * this.shake,
        (Math.random() - 0.5) * this.shake,
      );
    }

    this.drawRange();
    this.drawSlashes();
    const sorted = [...this.enemies].sort((a, b) => a.y - b.y);
    for (const enemy of sorted) this.drawEnemy(enemy);
    this.drawProjectiles();
    this.drawRings();
    this.drawParticles();
    this.drawHero();
    this.drawFloaters();
    ctx.restore();

    this.drawVignette();
    this.drawScanlines();
    if (this.waveBanner > 0.01) this.drawWaveBanner();
    this.drawFlash(w, h);
  }

  private drawBackground(w: number, h: number): void {
    const { ctx } = this;

    const background = ctx.createRadialGradient(
      w / 2,
      h / 2,
      30,
      w / 2,
      h / 2,
      Math.max(w, h) * 0.78,
    );
    background.addColorStop(0, '#0c2230');
    background.addColorStop(0.5, '#07121c');
    background.addColorStop(1, '#04080d');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, w, h);

    // Rejilla de placa base.
    ctx.save();
    ctx.strokeStyle = 'rgba(92, 170, 200, 0.035)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 32) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, h);
    }
    for (let y = 0; y <= h; y += 32) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
    }
    ctx.stroke();

    ctx.strokeStyle = 'rgba(77, 226, 197, 0.055)';
    ctx.beginPath();
    for (let x = 0; x <= w; x += 128) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, h);
    }
    for (let y = 0; y <= h; y += 128) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
    }
    ctx.stroke();
    ctx.restore();

    // Chips e integrados.
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const chip of this.boardChips) {
      ctx.save();
      ctx.translate(chip.x, chip.y);
      ctx.rotate(chip.rot);
      const hw = chip.w / 2;
      const hh = chip.h / 2;

      ctx.fillStyle = 'rgba(8, 20, 30, 0.58)';
      ctx.strokeStyle = 'rgba(77, 226, 197, 0.1)';
      ctx.lineWidth = 1;
      roundRect(ctx, -hw, -hh, chip.w, chip.h, 3);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = 'rgba(125, 211, 252, 0.09)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let px = -hw + 6; px <= hw - 6; px += 8) {
        ctx.moveTo(px, -hh);
        ctx.lineTo(px, -hh - 4);
        ctx.moveTo(px, hh);
        ctx.lineTo(px, hh + 4);
      }
      ctx.stroke();

      ctx.fillStyle = 'rgba(125, 211, 252, 0.16)';
      ctx.font = '7px ui-monospace, monospace';
      ctx.fillText(chip.label, 0, 1);
      ctx.restore();
    }
    ctx.restore();

    // Pistas de circuito, pads y pulsos de datos.
    ctx.save();
    for (const trace of this.boardTraces) {
      ctx.strokeStyle = rgba(trace.color, 0.12);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let i = 0; i < trace.points.length; i++) {
        const point = trace.points[i]!;
        if (i === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      }
      ctx.stroke();

      ctx.fillStyle = rgba(trace.color, 0.16);
      for (const point of trace.points) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 2.2, 0, TAU);
        ctx.fill();
      }

      const distance =
        (this.bgTime * 46 + trace.phase * trace.length) % trace.length;
      const pulse = tracePoint(trace, distance);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = rgba(trace.color, 0.8);
      ctx.shadowColor = trace.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(pulse.x, pulse.y, 2.4, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    // Chasis de la arena.
    ctx.save();
    roundRect(ctx, 14, 14, w - 28, h - 28, 24);
    ctx.strokeStyle = 'rgba(77, 226, 197, 0.18)';
    ctx.lineWidth = 2;
    ctx.stroke();
    roundRect(ctx, 22, 22, w - 44, h - 44, 18);
    ctx.strokeStyle = 'rgba(77, 226, 197, 0.05)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const corner = 46;
    const corners: [number, number, number, number][] = [
      [22, 22, 1, 1],
      [w - 22, 22, -1, 1],
      [22, h - 22, 1, -1],
      [w - 22, h - 22, -1, -1],
    ];
    ctx.strokeStyle = 'rgba(245, 196, 81, 0.22)';
    ctx.lineWidth = 2;
    for (const [x, y, sx, sy] of corners) {
      ctx.beginPath();
      ctx.moveTo(x, y + sy * corner);
      ctx.lineTo(x, y);
      ctx.lineTo(x + sx * corner, y);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(77, 226, 197, 0.35)';
    for (let i = 0; i < corners.length; i++) {
      const [x, y, sx, sy] = corners[i]!;
      ctx.save();
      ctx.shadowColor = '#4de2c5';
      ctx.shadowBlur = 7;
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(this.bgTime * 2.4 + i);
      ctx.beginPath();
      ctx.arc(x + sx * 14, y + sy * 14, 2, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    ctx.textAlign = 'center';
    ctx.font = '8px ui-monospace, monospace';
    ctx.fillStyle = 'rgba(125, 211, 252, 0.18)';
    ctx.fillText('MOTHERBOARD // SECTOR 01', w / 2, h - 24);
    ctx.restore();
  }

  private drawServers(w: number, h: number): void {
    const { ctx } = this;
    const spots: [number, number, number][] = [
      [w * 0.1, h * 0.79, 0],
      [w * 0.9, h * 0.79, 1.7],
    ];

    for (const [x, y, offset] of spots) {
      const flicker =
        0.85 + Math.sin(this.bgTime * 3 + offset) * 0.08 +
        Math.sin(this.bgTime * 7.3 + offset) * 0.04;

      // Halo frío de servidor.
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const glow = ctx.createRadialGradient(x, y - 38, 4, x, y - 38, 105 * flicker);
      glow.addColorStop(0, 'rgba(77, 226, 197, 0.18)');
      glow.addColorStop(0.45, 'rgba(70, 130, 220, 0.06)');
      glow.addColorStop(1, 'rgba(40, 80, 150, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y - 38, 105 * flicker, 0, TAU);
      ctx.fill();
      ctx.restore();

      const rw = 58;
      const rh = 112;
      ctx.save();
      ctx.translate(x, y);

      ctx.fillStyle = 'rgba(6, 14, 24, 0.92)';
      ctx.strokeStyle = 'rgba(77, 226, 197, 0.28)';
      ctx.lineWidth = 1.5;
      roundRect(ctx, -rw / 2, -rh, rw, rh, 5);
      ctx.fill();
      ctx.stroke();

      // Cabecera.
      ctx.fillStyle = 'rgba(77, 226, 197, 0.06)';
      roundRect(ctx, -rw / 2 + 5, -rh + 5, rw - 10, 14, 3);
      ctx.fill();
      ctx.fillStyle = 'rgba(125, 211, 252, 0.38)';
      ctx.font = '6px ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(offset ? 'NODE-02' : 'NODE-01', -rw / 2 + 8, -rh + 12);

      // Bahías, LEDs y rejillas.
      for (let i = 0; i < 6; i++) {
        const sy = -rh + 25 + i * 13;
        ctx.fillStyle = 'rgba(16, 36, 48, 0.95)';
        roundRect(ctx, -rw / 2 + 6, sy, rw - 12, 9, 2);
        ctx.fill();

        for (let j = 0; j < 3; j++) {
          const on = Math.sin(this.bgTime * 3.2 + offset + i * 1.7 + j * 2.1) > 0.15;
          const color = j === 0 ? '#4de2c5' : j === 1 ? '#f5c451' : '#ff5d73';
          ctx.save();
          if (on) {
            ctx.shadowColor = color;
            ctx.shadowBlur = 6;
          }
          ctx.fillStyle = on ? color : 'rgba(255, 255, 255, 0.08)';
          ctx.beginPath();
          ctx.arc(-rw / 2 + 13 + j * 6, sy + 4.5, 1.6, 0, TAU);
          ctx.fill();
          ctx.restore();
        }

        ctx.strokeStyle = 'rgba(125, 211, 252, 0.18)';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        for (let k = 0; k < 3; k++) {
          const vx = rw / 2 - 22 + k * 5;
          ctx.moveTo(vx, sy + 2);
          ctx.lineTo(vx, sy + 7);
        }
        ctx.stroke();
      }

      // Ventilación inferior.
      ctx.strokeStyle = 'rgba(77, 226, 197, 0.12)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let k = 0; k < 8; k++) {
        const vx = -rw / 2 + 9 + k * 6;
        ctx.moveTo(vx, -8);
        ctx.lineTo(vx, -2);
      }
      ctx.stroke();

      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(0, 3, rw * 0.55, 5, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawCodeGlyphs(): void {
    const { ctx } = this;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const glyph of this.codeGlyphs) {
      const pulse = 0.5 + 0.5 * Math.sin(this.bgTime * 2.2 + glyph.phase);
      ctx.globalAlpha = 0.07 + pulse * 0.16;
      ctx.fillStyle = glyph.color;
      ctx.font = `${glyph.size}px ui-monospace, monospace`;
      ctx.fillText(glyph.glyph, glyph.x, glyph.y);
    }
    ctx.restore();
  }

  private drawProcessor(): void {
    const { ctx } = this;
    const cx = this.width / 2;
    const cy = this.height / 2;

    ctx.save();
    ctx.translate(cx, cy);

    const glow = ctx.createRadialGradient(0, 0, 20, 0, 0, 210);
    glow.addColorStop(0, 'rgba(77, 226, 197, 0.08)');
    glow.addColorStop(0.55, 'rgba(77, 226, 197, 0.025)');
    glow.addColorStop(1, 'rgba(77, 226, 197, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 210, 0, TAU);
    ctx.fill();

    // Anillos de escaneo.
    ctx.save();
    ctx.rotate(this.bgTime * 0.12);
    ctx.setLineDash([8, 12]);
    ctx.strokeStyle = 'rgba(77, 226, 197, 0.16)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, 158, 0, TAU);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.rotate(-this.bgTime * 0.2);
    ctx.setLineDash([3, 9]);
    ctx.strokeStyle = 'rgba(245, 196, 81, 0.13)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 136, 0, TAU);
    ctx.stroke();
    ctx.restore();

    // Zócalo.
    const socket = 196;
    const half = socket / 2;
    ctx.fillStyle = 'rgba(5, 14, 22, 0.38)';
    ctx.strokeStyle = 'rgba(77, 226, 197, 0.12)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, -half, -half, socket, socket, 18);
    ctx.fill();
    ctx.stroke();

    // Pines del zócalo.
    ctx.strokeStyle = 'rgba(245, 196, 81, 0.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let p = -half + 16; p <= half - 16; p += 12) {
      ctx.moveTo(p, -half);
      ctx.lineTo(p, -half - 7);
      ctx.moveTo(p, half);
      ctx.lineTo(p, half + 7);
      ctx.moveTo(-half, p);
      ctx.lineTo(-half - 7, p);
      ctx.moveTo(half, p);
      ctx.lineTo(half + 7, p);
    }
    ctx.stroke();

    // Chip.
    const chip = 150;
    const chipHalf = chip / 2;
    const chipGrad = ctx.createLinearGradient(-chipHalf, -chipHalf, chipHalf, chipHalf);
    chipGrad.addColorStop(0, '#102b3c');
    chipGrad.addColorStop(1, '#07131e');
    ctx.fillStyle = chipGrad;
    ctx.strokeStyle = 'rgba(77, 226, 197, 0.3)';
    ctx.lineWidth = 1.4;
    roundRect(ctx, -chipHalf, -chipHalf, chip, chip, 12);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(77, 226, 197, 0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = -2; i <= 2; i++) {
      ctx.moveTo(i * 25, -chipHalf + 10);
      ctx.lineTo(i * 25, chipHalf - 10);
      ctx.moveTo(-chipHalf + 10, i * 25);
      ctx.lineTo(chipHalf - 10, i * 25);
    }
    ctx.stroke();

    // Die central.
    const die = 54;
    const dieGrad = ctx.createRadialGradient(-8, -8, 2, 0, 0, die * 0.75);
    dieGrad.addColorStop(0, 'rgba(160, 255, 235, 0.95)');
    dieGrad.addColorStop(0.35, 'rgba(77, 226, 197, 0.75)');
    dieGrad.addColorStop(1, 'rgba(77, 226, 197, 0.04)');
    ctx.save();
    ctx.shadowColor = '#4de2c5';
    ctx.shadowBlur = 18;
    ctx.fillStyle = dieGrad;
    roundRect(ctx, -die / 2, -die / 2, die, die, 4);
    ctx.fill();
    ctx.restore();

    // Barrido de escaneo sobre el chip.
    ctx.save();
    roundRect(ctx, -chipHalf, -chipHalf, chip, chip, 12);
    ctx.clip();
    const bandY = -chipHalf + ((this.bgTime * 42) % chip);
    const band = ctx.createLinearGradient(0, bandY - 12, 0, bandY + 12);
    band.addColorStop(0, 'rgba(77, 226, 197, 0)');
    band.addColorStop(0.5, 'rgba(77, 226, 197, 0.12)');
    band.addColorStop(1, 'rgba(77, 226, 197, 0)');
    ctx.fillStyle = band;
    ctx.fillRect(-chipHalf, bandY - 12, chip, 24);
    ctx.restore();

    // Tornillos y etiqueta.
    ctx.fillStyle = 'rgba(10, 24, 34, 0.9)';
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.2)';
    ctx.lineWidth = 0.8;
    for (const sx of [-86, 86]) {
      for (const sy of [-86, 86]) {
        ctx.beginPath();
        ctx.arc(sx, sy, 3.2, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '7px ui-monospace, monospace';
    ctx.fillStyle = 'rgba(125, 211, 252, 0.22)';
    ctx.fillText('BK-01 // CORE', 0, chipHalf + 14);

    ctx.restore();
  }

  private drawScanlines(): void {
    const { ctx, width: w, height: h } = this;
    if (this.scanlinePattern) {
      ctx.save();
      ctx.fillStyle = this.scanlinePattern;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    const y = ((this.bgTime * 38) % (h + 120)) - 60;
    const band = ctx.createLinearGradient(0, y - 40, 0, y + 40);
    band.addColorStop(0, 'rgba(77, 226, 197, 0)');
    band.addColorStop(0.5, 'rgba(77, 226, 197, 0.03)');
    band.addColorStop(1, 'rgba(77, 226, 197, 0)');
    ctx.fillStyle = band;
    ctx.fillRect(0, y - 40, w, 80);
  }

  private drawRange(): void {
    const { ctx } = this;
    ctx.save();
    ctx.strokeStyle = 'rgba(77, 226, 197, 0.07)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 10]);
    ctx.lineDashOffset = -this.bgTime * 16;
    ctx.beginPath();
    ctx.arc(this.hero.x, this.hero.y, this.loadout.range, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(77, 226, 197, 0.035)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(this.hero.x, this.hero.y, this.loadout.range - 6, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  private drawSlashes(): void {
    const { ctx } = this;
    for (const slash of this.slashes) {
      const t = clamp(slash.life / slash.maxLife, 0, 1);
      ctx.save();
      ctx.translate(slash.x, slash.y - 1);
      ctx.rotate(slash.angle);
      ctx.scale(1.32, 1.32);
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba(slash.color, t * 0.85);
      ctx.lineWidth = 2 + t * 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, slash.radius, -0.85, 0.85);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255, 255, 255, ${t * 0.55})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, slash.radius - 3, -0.75, 0.75);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawHeroSpriteLocal(): boolean {
    const sheet = spriteBank.get('hero');
    if (!sheet) return false;
    const ctx = this.ctx;
    const attacking = this.hero.attackAnim > 0;
    const progress = attacking
      ? clamp(1 - this.hero.attackAnim / 0.5, 0, 1)
      : 0;
    const frame = getSpriteFrame(
      sheet,
      attacking ? 'attack' : 'idle',
      this.bgTime,
      progress,
    );
    const dx = -sheet.anchorX * frame.dw;
    const dy = 19 - sheet.anchorY * frame.dh;
    ctx.drawImage(
      sheet.image,
      frame.sx,
      frame.sy,
      frame.sw,
      frame.sh,
      dx,
      dy,
      frame.dw,
      frame.dh,
    );
    return true;
  }

  private drawEnemySprite(enemy: Enemy): boolean {
    const sheet = spriteBank.get(enemy.kind);
    if (!sheet) return false;
    const ctx = this.ctx;
    const attacking = enemy.attackAnim > 0;
    const progress = attacking
      ? clamp(1 - enemy.attackAnim / 0.6, 0, 1)
      : 0;
    const frame = getSpriteFrame(
      sheet,
      attacking ? 'attack' : 'idle',
      enemy.wobble,
      progress,
    );

    const groundY =
      enemy.kind === 'virus'
        ? enemy.radius * 0.35
        : enemy.kind === 'trojan'
          ? enemy.radius
          : enemy.radius * 0.92;
    const dx = -sheet.anchorX * frame.dw;
    const dy = groundY - sheet.anchorY * frame.dh;

    ctx.drawImage(
      sheet.image,
      frame.sx,
      frame.sy,
      frame.sw,
      frame.sh,
      dx,
      dy,
      frame.dw,
      frame.dh,
    );

    if (enemy.hitFlash > 0) {
      const tint = spriteBank.tintFrame(
        sheet,
        frame.sx,
        frame.sy,
        frame.sw,
        frame.sh,
      );
      ctx.save();
      ctx.globalAlpha = Math.min(0.6, enemy.hitFlash * 0.55);
      ctx.drawImage(
        tint,
        0,
        0,
        frame.sw,
        frame.sh,
        dx,
        dy,
        frame.dw,
        frame.dh,
      );
      ctx.restore();
    }

    return true;
  }

  private drawHero(): void {
    const { ctx, hero } = this;
    const t = this.bgTime;
    const moving = this.active && !this.paused;
    const bob = Math.sin(t * (moving ? 3 : 1.5)) * (moving ? 2 : 1.2);
    const low = hero.hp <= hero.maxHp * 0.32;
    const accent = low ? '#ff5d73' : '#4de2c5';
    const swingPhase = Math.sin(clamp(hero.swing, 0, 1) * Math.PI);

    // Sombra en el suelo.
    ctx.save();
    ctx.translate(hero.x, hero.y + 21);
    ctx.scale(1, 0.36);
    const shadow = ctx.createRadialGradient(0, 0, 1, 0, 0, 25);
    shadow.addColorStop(0, 'rgba(0, 0, 0, 0.52)');
    shadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.arc(0, 0, 25, 0, TAU);
    ctx.fill();
    ctx.restore();

    // Aura del suelo.
    ctx.save();
    ctx.translate(hero.x, hero.y + 19);
    ctx.scale(1, 0.4);
    ctx.rotate(t * 0.5);
    ctx.strokeStyle = rgba(accent, low ? 0.4 : 0.26);
    ctx.lineWidth = 2;
    ctx.setLineDash([9, 9]);
    ctx.beginPath();
    ctx.arc(0, 0, 31, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = rgba(accent, 0.1);
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(0, 0, 35, 0, TAU);
    ctx.stroke();
    ctx.restore();

    // Arco de ataque (detrás del desarrollador).
    if (hero.swing > 0.02) {
      const alpha = clamp(hero.swing * 1.4, 0, 1);
      ctx.save();
      ctx.translate(hero.x, hero.y - 1);
      ctx.rotate(hero.angle);
      ctx.scale(1.32, 1.32);
      ctx.globalCompositeOperation = 'lighter';
      const radius = 35 + (1 - hero.swing) * 10;
      const arcGrad = ctx.createLinearGradient(radius * 0.55, 0, radius + 18, 0);
      arcGrad.addColorStop(0, rgba(accent, 0));
      arcGrad.addColorStop(1, rgba(accent, alpha * 0.9));
      ctx.strokeStyle = arcGrad;
      ctx.lineWidth = 2 + 5 * alpha;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, radius, -0.9, 0.9);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, radius - 3, -0.8, 0.8);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(hero.x, hero.y + bob);

    const aura = ctx.createRadialGradient(0, 0, 4, 0, 0, 46);
    aura.addColorStop(0, rgba(accent, 0.18));
    aura.addColorStop(0.6, rgba(accent, 0.06));
    aura.addColorStop(1, rgba(accent, 0));
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, 46, 0, TAU);
    ctx.fill();

    const spriteDrawn = this.drawHeroSpriteLocal();
    ctx.scale(1.32, 1.32);

    if (!spriteDrawn) {
    // Capa ondeante.
    const wave = Math.sin(t * 3.4) * 2.4;
    const capeGrad = ctx.createLinearGradient(0, -6, 0, 30);
    capeGrad.addColorStop(0, '#334d78');
    capeGrad.addColorStop(0.55, '#1a2740');
    capeGrad.addColorStop(1, '#0b1322');
    ctx.fillStyle = capeGrad;
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.26)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-9, -3);
    ctx.bezierCurveTo(-20, 6, -17, 22 + wave, -3, 29 + wave);
    ctx.lineTo(3, 29 - wave);
    ctx.bezierCurveTo(17, 22 - wave, 20, 6, 9, -3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(245, 196, 81, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-7, 18 + wave * 0.5);
    ctx.quadraticCurveTo(0, 24.5, 7, 18 - wave * 0.5);
    ctx.stroke();

    // Hombreras.
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * 12, -8);
      ctx.rotate(side * 0.22);
      const pauldron = ctx.createLinearGradient(0, -6, 0, 6);
      pauldron.addColorStop(0, '#51749f');
      pauldron.addColorStop(1, '#22314a');
      ctx.fillStyle = pauldron;
      ctx.strokeStyle = 'rgba(245, 196, 81, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 5, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Torso.
    const bodyGrad = ctx.createLinearGradient(0, -13, 0, 15);
    bodyGrad.addColorStop(0, '#4b6d9e');
    bodyGrad.addColorStop(0.5, '#2f4468');
    bodyGrad.addColorStop(1, '#1a2740');
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.72)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, -10.5, -12, 21, 25, 8);
    ctx.fill();
    ctx.stroke();

    // Cinturón.
    ctx.strokeStyle = 'rgba(245, 196, 81, 0.55)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-9, 7);
    ctx.lineTo(9, 7);
    ctx.stroke();

    // Emblema del pecho.
    ctx.fillStyle = 'rgba(9, 15, 26, 0.85)';
    ctx.strokeStyle = rgba(accent, 0.85);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(6, -4);
    ctx.lineTo(0, 7);
    ctx.lineTo(-6, -4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = rgba(accent, 0.85);
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(2.2, 0);
    ctx.lineTo(0, 4);
    ctx.lineTo(-2.2, 0);
    ctx.closePath();
    ctx.fill();

    // Casco.
    const helmGrad = ctx.createLinearGradient(0, -24, 0, -8);
    helmGrad.addColorStop(0, '#f1f6ff');
    helmGrad.addColorStop(0.55, '#a9bdd8');
    helmGrad.addColorStop(1, '#5f7594');
    ctx.fillStyle = helmGrad;
    ctx.strokeStyle = 'rgba(200, 228, 255, 0.8)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, -16, 8, 0, TAU);
    ctx.fill();
    ctx.stroke();

    // Visor.
    ctx.fillStyle = '#0a1220';
    roundRect(ctx, -6, -18.5, 12, 5, 2.5);
    ctx.fill();
    ctx.save();
    ctx.shadowColor = accent;
    ctx.shadowBlur = 8;
    ctx.fillStyle = rgba(accent, 0.95);
    roundRect(ctx, -4.5, -17.4, 9, 2.2, 1.1);
    ctx.fill();
    ctx.restore();

    // Cresta dorada.
    ctx.fillStyle = '#f5c451';
    ctx.beginPath();
    ctx.moveTo(0, -29);
    ctx.lineTo(3.4, -23);
    ctx.lineTo(0, -19);
    ctx.lineTo(-3.4, -23);
    ctx.closePath();
    ctx.fill();

    // Escudo.
    ctx.save();
    ctx.translate(-13.5, 4);
    ctx.rotate(-0.18 + Math.sin(t * 2) * 0.03);
    const shieldGrad = ctx.createLinearGradient(-7, -10, 7, 12);
    shieldGrad.addColorStop(0, '#3d5a86');
    shieldGrad.addColorStop(1, '#1a2740');
    ctx.fillStyle = shieldGrad;
    ctx.strokeStyle = '#f5c451';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.quadraticCurveTo(8, -6, 7, 3);
    ctx.quadraticCurveTo(6, 10, 0, 13);
    ctx.quadraticCurveTo(-6, 10, -7, 3);
    ctx.quadraticCurveTo(-8, -6, 0, -10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = rgba(accent, 0.85);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(0, 7);
    ctx.moveTo(-3.2, 0);
    ctx.lineTo(3.2, 0);
    ctx.stroke();
    ctx.restore();
    } // fin del cuerpo procedural

    // Espada.
    ctx.save();
    ctx.rotate(hero.angle + swingPhase * 0.85);
    // La empuñadura queda a un lado del cuerpo para que la hoja no lo atraviese.
    ctx.translate(0, 16);

    ctx.fillStyle = '#dbe7f5';
    ctx.beginPath();
    ctx.arc(9, 0, 3, 0, TAU);
    ctx.fill();

    ctx.save();
    ctx.translate(5.5, 0);
    ctx.fillStyle = '#f5c451';
    ctx.beginPath();
    ctx.arc(0, 0, 2.4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.arc(-0.6, -0.6, 0.9, 0, TAU);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = '#8a5a2b';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(11, 0);
    ctx.stroke();

    ctx.strokeStyle = '#f5c451';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(11, -5.5);
    ctx.lineTo(11, 5.5);
    ctx.stroke();

    ctx.save();
    ctx.shadowColor = accent;
    ctx.shadowBlur = 9;
    const bladeGrad = ctx.createLinearGradient(12, 0, 47, 0);
    bladeGrad.addColorStop(0, '#cfe6ff');
    bladeGrad.addColorStop(0.55, '#f4fbff');
    bladeGrad.addColorStop(1, '#9dfff0');
    ctx.fillStyle = bladeGrad;
    ctx.strokeStyle = 'rgba(200, 245, 255, 0.85)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(12, -3);
    ctx.lineTo(38, -2);
    ctx.lineTo(47, 0);
    ctx.lineTo(38, 2);
    ctx.lineTo(12, 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = 'rgba(77, 226, 197, 0.75)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(37, 0);
    ctx.stroke();

    ctx.restore();

    // Flash al recibir daño.
    if (hero.flash > 0) {
      ctx.strokeStyle = `rgba(255, 93, 115, ${clamp(hero.flash * 3.2, 0, 1)})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 27, 0, TAU);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawEnemy(enemy: Enemy): void {
    const { ctx } = this;
    const style = ENEMY_STYLE[enemy.kind];

    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    // Sombra.
    ctx.save();
    const shadowY = enemy.kind === 'virus' ? enemy.radius + 10 : enemy.radius + 5;
    const shadowScale =
      enemy.kind === 'trojan' ? 2.1 : enemy.kind === 'bug' ? 1.35 : 1.15;
    ctx.translate(0, shadowY);
    ctx.scale(1, 0.32);
    const shadow = ctx.createRadialGradient(
      0,
      0,
      1,
      0,
      0,
      enemy.radius * shadowScale,
    );
    shadow.addColorStop(0, 'rgba(0, 0, 0, 0.42)');
    shadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius * shadowScale, 0, TAU);
    ctx.fill();
    ctx.restore();

    // Portal de aparición.
    const spawn = clamp(enemy.spawnAnim, 0, 1);
    if (spawn < 1) {
      const alpha = 1 - spawn;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba(style.glow, alpha * 0.75);
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 6]);
      ctx.lineDashOffset = -this.bgTime * 24;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius * (1.1 + (1 - spawn) * 1.7), 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = rgba(style.glow, alpha * 0.08);
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius * (1.1 + (1 - spawn) * 1.7), 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    const scale = spawn >= 1 ? 1 : easeOutBack(spawn);
    ctx.scale(scale, scale);

    if (enemy.elite) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(245, 196, 81, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 5]);
      ctx.lineDashOffset = -this.bgTime * 18;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius * (1.45 + Math.sin(this.bgTime * 4 + enemy.seed) * 0.08), 0, TAU);
      ctx.stroke();
      ctx.restore();
      ctx.scale(1.12, 1.12);
    }

    if (!this.drawEnemySprite(enemy)) {
      if (enemy.kind === 'bug') {
        this.drawBug(enemy, style);
      } else if (enemy.kind === 'virus') {
        this.drawVirus(enemy, style);
      } else {
        this.drawTrojan(enemy, style);
      }

      if (enemy.hitFlash > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${enemy.hitFlash * 0.55})`;
        if (enemy.kind === 'bug') {
          ctx.beginPath();
          ctx.ellipse(0, 0, enemy.radius, enemy.radius * 0.92, 0, 0, TAU);
          ctx.fill();
        } else if (enemy.kind === 'virus') {
          ctx.beginPath();
          ctx.arc(0, -2, enemy.radius, 0, TAU);
          ctx.fill();
        } else {
          roundRect(
            ctx,
            -enemy.radius,
            -enemy.radius,
            enemy.radius * 2,
            enemy.radius * 2,
            8,
          );
          ctx.fill();
        }
      }
    }

    ctx.restore();

    // Barra de vida.
    if (enemy.hp < enemy.maxHp) {
      const barWidth = Math.max(26, enemy.radius * 2.2);
      const barX = enemy.x - barWidth / 2;
      const barY = enemy.y - enemy.radius - 17;
      const ratio = clamp(enemy.hp / enemy.maxHp, 0, 1);
      ctx.save();
      ctx.fillStyle = 'rgba(4, 8, 16, 0.72)';
      roundRect(ctx, barX - 1, barY - 1, barWidth + 2, 6, 3);
      ctx.fill();
      ctx.strokeStyle = enemy.elite
        ? 'rgba(245, 196, 81, 0.55)'
        : 'rgba(180, 210, 240, 0.16)';
      ctx.lineWidth = 1;
      ctx.stroke();
      const color = ratio > 0.5 ? '#4ade80' : ratio > 0.25 ? '#fbbf24' : '#ff5d73';
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      roundRect(ctx, barX, barY, barWidth * ratio, 4, 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawBug(
    enemy: Enemy,
    style: (typeof ENEMY_STYLE)[EnemyKind],
  ): void {
    const { ctx, hero } = this;
    const r = enemy.radius;
    const wiggle = Math.sin(enemy.wobble * 8 + enemy.seed);

    ctx.save();

    // Patas.
    ctx.strokeStyle = rgba(style.dark, 0.95);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const baseX = side * r * 0.35;
        const baseY = -r * 0.3 + i * r * 0.34;
        const twitch = Math.sin(enemy.wobble * 9 + i * 1.7 + side) * 2;
        const footX = side * (r * 1.15 + i * 2) + twitch;
        const footY = r * 0.55 + (i - 1) * 3;
        ctx.beginPath();
        ctx.moveTo(baseX, baseY);
        ctx.quadraticCurveTo(side * r * 0.95, baseY + 3, footX, footY);
        ctx.stroke();
      }
    }

    // Abdomen.
    const bodyGrad = ctx.createRadialGradient(
      -r * 0.3,
      -r * 0.35,
      2,
      0,
      0,
      r * 1.15,
    );
    bodyGrad.addColorStop(0, style.glow);
    bodyGrad.addColorStop(0.45, style.body);
    bodyGrad.addColorStop(1, style.dark);
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = rgba(style.glow, 0.75);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.82, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();

    // Caparazón.
    const shellGrad = ctx.createLinearGradient(0, -r * 0.7, 0, r * 0.2);
    shellGrad.addColorStop(0, rgba(style.body, 0.95));
    shellGrad.addColorStop(1, rgba(style.dark, 0.95));
    ctx.fillStyle = shellGrad;
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.12, r * 0.92, r * 0.58, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = rgba(style.accent, 0.35);
    ctx.lineWidth = 1;
    ctx.stroke();

    // Seams del caparazón.
    ctx.strokeStyle = rgba(style.dark, 0.85);
    ctx.lineWidth = 1.2;
    for (const x of [-0.45, 0, 0.45]) {
      ctx.beginPath();
      ctx.moveTo(x * r, -r * 0.63);
      ctx.lineTo(x * r * 0.72, r * 0.16);
      ctx.stroke();
    }

    // Tórax y cabeza.
    ctx.fillStyle = style.body;
    ctx.strokeStyle = rgba(style.glow, 0.55);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.72, r * 0.5, r * 0.32, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -r * 1.02, r * 0.34, 0, TAU);
    ctx.fill();
    ctx.stroke();

    // Ojos.
    const look = Math.atan2(hero.y - enemy.y, hero.x - enemy.x);
    const lx = Math.cos(look) * 1.4;
    const ly = Math.sin(look) * 1.4;
    for (const side of [-1, 1]) {
      ctx.fillStyle = "#f8fcff";
      ctx.beginPath();
      ctx.arc(side * r * 0.14, -r * 1.06, r * 0.13, 0, TAU);
      ctx.fill();
      ctx.fillStyle = style.eye;
      ctx.beginPath();
      ctx.arc(
        side * r * 0.14 + lx,
        -r * 1.06 + ly,
        r * 0.065,
        0,
        TAU,
      );
      ctx.fill();
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.beginPath();
      ctx.arc(side * r * 0.14 + lx - 0.6, -r * 1.06 + ly - 0.7, 0.8, 0, TAU);
      ctx.fill();
    }

    // Antenas.
    ctx.strokeStyle = rgba(style.dark, 0.9);
    ctx.lineWidth = 1.3;
    for (const side of [-1, 1]) {
      const sway = Math.sin(enemy.wobble * 5 + side) * 1.5;
      ctx.beginPath();
      ctx.moveTo(side * r * 0.12, -r * 1.28);
      ctx.quadraticCurveTo(
        side * r * 0.3,
        -r * 1.65,
        side * r * 0.38 + sway,
        -r * 1.88,
      );
      ctx.stroke();
      ctx.fillStyle = style.accent;
      ctx.beginPath();
      ctx.arc(side * r * 0.38 + sway, -r * 1.88, r * 0.07, 0, TAU);
      ctx.fill();
    }

    // Mandíbulas.
    ctx.strokeStyle = rgba(style.dark, 0.95);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-r * 0.12, -r * 0.95);
    ctx.lineTo(-r * 0.22, -r * 0.75 + wiggle);
    ctx.moveTo(r * 0.12, -r * 0.95);
    ctx.lineTo(r * 0.22, -r * 0.75 - wiggle);
    ctx.stroke();

    ctx.restore();
  }

  private drawVirus(
    enemy: Enemy,
    style: (typeof ENEMY_STYLE)[EnemyKind],
  ): void {
    const { ctx } = this;
    const r = enemy.radius;
    const hover = -3 + Math.sin(enemy.wobble * 5 + enemy.seed) * 2.5;
    const spin = enemy.wobble * 0.35 + enemy.seed;

    ctx.save();
    ctx.translate(0, hover);

    // Espigas.
    ctx.strokeStyle = rgba(style.body, 0.95);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * TAU + spin;
      const length = r * (1.45 + (i % 2) * 0.18);
      const sx = Math.cos(angle) * r * 0.72;
      const sy = Math.sin(angle) * r * 0.72;
      const tx = Math.cos(angle) * length;
      const ty = Math.sin(angle) * length;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.fillStyle = rgba(style.glow, 0.85);
      ctx.beginPath();
      ctx.arc(tx, ty, 2.2, 0, TAU);
      ctx.fill();
    }

    // Cuerpo.
    const body = ctx.createRadialGradient(
      -r * 0.3,
      -r * 0.35,
      2,
      0,
      0,
      r * 1.2,
    );
    body.addColorStop(0, style.glow);
    body.addColorStop(0.4, style.body);
    body.addColorStop(1, style.dark);
    ctx.fillStyle = body;
    ctx.strokeStyle = rgba(style.glow, 0.7);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.78, 0, TAU);
    ctx.fill();
    ctx.stroke();

    // Ojos y boca.
    ctx.save();
    ctx.shadowColor = style.eye;
    ctx.shadowBlur = 8;
    ctx.fillStyle = style.eye;
    ctx.beginPath();
    ctx.ellipse(-r * 0.26, -r * 0.12, r * 0.15, r * 0.1, 0, 0, TAU);
    ctx.ellipse(r * 0.26, -r * 0.12, r * 0.15, r * 0.1, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = rgba(style.dark, 0.95);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, r * 0.12, r * 0.24, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    ctx.restore();
  }

  private drawTrojan(
    enemy: Enemy,
    style: (typeof ENEMY_STYLE)[EnemyKind],
  ): void {
    const { ctx } = this;
    const r = enemy.radius;
    const sway = Math.sin(enemy.wobble * 1.8 + enemy.seed) * 1.2;

    ctx.save();

    // Patas y ruedas.
    ctx.strokeStyle = rgba(style.dark, 0.95);
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    for (const side of [-1, 1]) {
      for (const y of [-r * 0.3, r * 0.35]) {
        ctx.beginPath();
        ctx.moveTo(side * r * 0.62, r * 0.35);
        ctx.lineTo(side * r * 0.82, y * 0.4 + r * 0.55);
        ctx.stroke();
      }
    }
    for (const side of [-1, 1]) {
      ctx.fillStyle = style.dark;
      ctx.beginPath();
      ctx.arc(side * r * 0.86, r * 0.6, r * 0.16, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = rgba(style.accent, 0.7);
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    // Cuerpo de madera.
    const woodGrad = ctx.createLinearGradient(0, -r * 1.15, 0, r * 0.6);
    woodGrad.addColorStop(0, style.body);
    woodGrad.addColorStop(0.55, "#8a5a33");
    woodGrad.addColorStop(1, style.dark);
    ctx.fillStyle = woodGrad;
    ctx.strokeStyle = rgba(style.glow, 0.55);
    ctx.lineWidth = 1.8;
    roundRect(ctx, -r * 0.95, -r * 0.85, r * 1.9, r * 1.5, 5);
    ctx.fill();
    ctx.stroke();

    // Tablones.
    ctx.strokeStyle = rgba(style.dark, 0.75);
    ctx.lineWidth = 1.2;
    for (const y of [-0.55, -0.15, 0.25]) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.86, y * r);
      ctx.lineTo(r * 0.86, y * r);
      ctx.stroke();
    }

    // Compuerta y núcleo.
    ctx.fillStyle = "rgba(20, 12, 6, 0.85)";
    roundRect(ctx, -r * 0.40, -r * 0.68, r * 0.8, r * 0.5, 3);
    ctx.fill();
    ctx.save();
    ctx.translate(0, -r * 0.43);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = style.accent;
    ctx.shadowColor = style.accent;
    ctx.shadowBlur = 10;
    ctx.fillRect(-r * 0.11, -r * 0.11, r * 0.22, r * 0.22);
    ctx.restore();

    // Cuello y cabeza de caballo.
    ctx.fillStyle = style.body;
    ctx.strokeStyle = rgba(style.glow, 0.5);
    ctx.lineWidth = 1.5;
    roundRect(ctx, -r * 0.28, -r * 1.55, r * 0.56, r * 0.85, 5);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(sway * 0.2, -r * 1.62, r * 0.42, r * 0.32, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();

    // Orejas.
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * r * 0.22, -r * 1.82);
      ctx.lineTo(side * r * 0.34, -r * 2.12);
      ctx.lineTo(side * r * 0.05, -r * 1.9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Ojos.
    ctx.save();
    ctx.shadowColor = style.eye;
    ctx.shadowBlur = 8;
    ctx.fillStyle = style.eye;
    ctx.beginPath();
    ctx.arc(-r * 0.16, -r * 1.62, r * 0.075, 0, TAU);
    ctx.arc(r * 0.16, -r * 1.62, r * 0.075, 0, TAU);
    ctx.fill();
    ctx.restore();

    // Hocico.
    ctx.fillStyle = rgba(style.dark, 0.85);
    roundRect(ctx, -r * 0.24, -r * 1.58, r * 0.48, r * 0.2, 3);
    ctx.fill();

    ctx.restore();
  }

  private drawProjectiles(): void {
    const { ctx } = this;
    ctx.save();
    ctx.lineCap = 'round';
    for (const projectile of this.projectiles) {
      const speed = Math.hypot(projectile.vx, projectile.vy) || 1;
      const nx = projectile.vx / speed;
      const ny = projectile.vy / speed;
      const tailX = projectile.x - nx * 24;
      const tailY = projectile.y - ny * 24;

      const trail = ctx.createLinearGradient(tailX, tailY, projectile.x, projectile.y);
      trail.addColorStop(0, 'rgba(77, 226, 197, 0)');
      trail.addColorStop(0.65, 'rgba(125, 247, 224, 0.45)');
      trail.addColorStop(1, 'rgba(220, 255, 250, 0.95)');
      ctx.strokeStyle = trail;
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(projectile.x, projectile.y);
      ctx.stroke();

      ctx.save();
      ctx.translate(projectile.x, projectile.y);
      ctx.rotate(this.bgTime * 7 + projectile.x * 0.01);
      ctx.shadowColor = '#4de2c5';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#eafff9';
      ctx.fillRect(-2.8, -2.8, 5.6, 5.6);
      ctx.strokeStyle = 'rgba(77, 226, 197, 0.9)';
      ctx.lineWidth = 1;
      ctx.strokeRect(-4.2, -4.2, 8.4, 8.4);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(-1, -1, 2, 2);
      ctx.restore();
    }
    ctx.restore();
  }

  private drawRings(): void {
    const { ctx } = this;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const ring of this.rings) {
      const t = clamp(ring.life / ring.maxLife, 0, 1);
      ctx.strokeStyle = rgba(ring.color, t * 0.8);
      ctx.lineWidth = ring.width * t + 0.5;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.radius, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawParticles(): void {
    const { ctx } = this;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const particle of this.particles) {
      const alpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      if (particle.shape === 'spark') {
        const speed = Math.hypot(particle.vx, particle.vy) || 1;
        ctx.strokeStyle = particle.color;
        ctx.lineWidth = Math.max(0.8, particle.size * 0.5);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(particle.x, particle.y);
        ctx.lineTo(
          particle.x - (particle.vx / speed) * particle.size * 2.4,
          particle.y - (particle.vy / speed) * particle.size * 2.4,
        );
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 0.5, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private drawFloaters(): void {
    const { ctx } = this;
    ctx.save();
    ctx.textAlign = 'center';
    for (const floater of this.floaters) {
      const alpha = clamp(floater.life / floater.maxLife, 0, 1);
      const pop = 1 + (1 - alpha) * 0.15;
      ctx.globalAlpha = alpha;
      ctx.font = `900 ${Math.round(floater.size * pop)}px ui-monospace, monospace`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(3, 7, 14, 0.75)';
      ctx.strokeText(floater.text, floater.x, floater.y);
      ctx.fillStyle = floater.color;
      ctx.fillText(floater.text, floater.x, floater.y);
    }
    ctx.restore();
  }

  private drawWaveBanner(): void {
    const { ctx } = this;
    const w = this.width;
    const h = this.height;
    const alpha = Math.min(1, this.waveBanner * 1.3);
    const cx = w / 2;
    const cy =
      w < 640 ? Math.max(240, h * 0.26) : Math.max(190, h * 0.2);
    const panelW = Math.min(300, w - 32);
    const panelH = 80;
    const titleSize = w < 380 ? 22 : 27;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = 'rgba(4, 12, 20, 0.86)';
    ctx.strokeStyle = 'rgba(77, 226, 197, 0.55)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, cx - panelW / 2, cy - panelH / 2, panelW, panelH, 12);
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.shadowColor = '#4de2c5';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#4de2c5';
    ctx.font = `800 ${titleSize}px ui-monospace, monospace`;
    ctx.fillText(`OLEADA ${String(this.wave).padStart(2, '0')}`, cx, cy - 10);
    ctx.restore();

    ctx.fillStyle = '#f5c451';
    ctx.font = '10px ui-monospace, monospace';
    ctx.fillText(
      `AMENAZA ×${Math.pow(WAVE_HP_SCALE, this.wave - 1).toFixed(2)}`,
      cx,
      cy + 22,
    );
    ctx.restore();
  }

  private drawVignette(): void {
    const { ctx, width: w, height: h } = this;
    const vignette = ctx.createRadialGradient(
      w / 2,
      h / 2,
      Math.min(w, h) * 0.35,
      w / 2,
      h / 2,
      Math.max(w, h) * 0.78,
    );
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.62)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  }

  private drawFlash(w: number, h: number): void {
    if (this.flashAlpha <= 0.005) return;
    this.ctx.fillStyle = rgba(this.flashColor, this.flashAlpha);
    this.ctx.fillRect(0, 0, w, h);
  }
}
