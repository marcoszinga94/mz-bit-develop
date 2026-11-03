import { sfx } from './audio';
import type { Loadout, Snapshot } from './types';

type EnemyKind = 'slime' | 'bat' | 'golem';

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
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  life: number;
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
}

interface Floater {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface EngineCallbacks {
  onKill: () => void;
  onDeath: () => void;
  onSnapshot: (snapshot: Snapshot) => void;
}

const ENEMY_STYLE: Record<
  EnemyKind,
  { body: string; dark: string; glow: string; accent: string }
> = {
  slime: { body: '#3ddc97', dark: '#116b4b', glow: '#6ef7bd', accent: '#0b3d2c' },
  bat: { body: '#a78bfa', dark: '#4c2a86', glow: '#c4b5fd', accent: '#2a1650' },
  golem: { body: '#7c93b8', dark: '#2b3a52', glow: '#9ec5f5', accent: '#182536' },
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
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
    maxHp: 100,
    damage: 10,
    attackInterval: 0.8,
    range: 260,
    projectileSpeed: 560,
  };

  private level = 1;
  private hero = {
    x: 0,
    y: 0,
    hp: 100,
    maxHp: 100,
    attackTimer: 0.4,
    flash: 0,
    angle: -Math.PI / 2,
    swing: 0,
  };

  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private particles: Particle[] = [];
  private floaters: Floater[] = [];
  private time = 0;
  private kills = 0;
  private spawnTimer = 0;
  private shake = 0;
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
    };
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.floaters = [];
    this.time = time;
    this.kills = kills;
    this.spawnTimer = 0.5;
    this.shake = 0;
    this.snapshotTimer = 0;
    this.active = true;
    this.paused = false;
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
  }

  heal(amount: number): void {
    if (!this.active) return;
    this.hero.hp = Math.min(this.hero.maxHp, this.hero.hp + amount);
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
    };
  }

  private frame = (ts: number): void => {
    if (this.destroyed) return;
    this.raf = requestAnimationFrame(this.frame);
    const dt = this.lastTs ? Math.min(0.05, Math.max(0, (ts - this.lastTs) / 1000)) : 0;
    this.lastTs = ts;
    this.bgTime += dt;
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

  private pushSnapshot(): void {
    this.callbacks.onSnapshot(this.getSnapshot());
  }

  private update(dt: number): void {
    this.time += dt;
    this.snapshotTimer += dt;
    if (this.snapshotTimer >= 0.1) {
      this.snapshotTimer = 0;
      this.pushSnapshot();
    }

    if (this.hero.hp > 0 && this.hero.hp < this.hero.maxHp) {
      this.hero.hp = Math.min(this.hero.maxHp, this.hero.hp + 0.45 * dt);
    }

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnEnemy();
      this.spawnTimer =
        Math.max(0.62, 1.7 - this.level * 0.045) * (0.8 + Math.random() * 0.45);
    }

    this.hero.flash = Math.max(0, this.hero.flash - dt);
    this.hero.swing = Math.max(0, this.hero.swing - dt * 4);
    this.hero.attackTimer -= dt;
    if (this.hero.attackTimer <= 0) {
      const target = this.nearestEnemy();
      if (target) {
        this.hero.angle = Math.atan2(target.y - this.hero.y, target.x - this.hero.x);
        this.fireAt(target);
        this.hero.attackTimer = this.loadout.attackInterval;
        this.hero.swing = 1;
        sfx.shoot();
      } else {
        this.hero.attackTimer = 0.05;
      }
    }

    for (const enemy of this.enemies) {
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt * 4);
      enemy.wobble += dt;

      const dx = this.hero.x - enemy.x;
      const dy = this.hero.y - enemy.y;
      const dist = Math.hypot(dx, dy) || 1;

      if (dist > enemy.radius + 18) {
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
      } else {
        enemy.attackTimer -= dt;
        if (enemy.attackTimer <= 0) {
          enemy.attackTimer = 1.1;
          this.hero.hp -= enemy.damage;
          this.hero.flash = 0.22;
          this.shake = Math.min(9, this.shake + 3);
          this.spawnParticles(this.hero.x, this.hero.y, '#ff5d73', 5, 90);
          this.floaters.push({
            x: this.hero.x,
            y: this.hero.y - 30,
            text: `-${Math.round(enemy.damage)}`,
            color: '#ff8a9a',
            life: 0.8,
            maxLife: 0.8,
          });
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

      let hit = false;
      for (const enemy of this.enemies) {
        if (Math.hypot(enemy.x - p.x, enemy.y - p.y) < enemy.radius + 5) {
          hit = true;
          this.damageEnemy(enemy, p.damage);
          break;
        }
      }

      if (
        hit ||
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

    this.shake = Math.max(0, this.shake - dt * 26);
  }

  private pickKind(): EnemyKind {
    const roll = Math.random();
    if (this.level >= 5 && roll < 0.2) return 'golem';
    if (this.level >= 2 && roll < 0.52) return 'bat';
    return 'slime';
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

    if (kind === 'bat') {
      maxHp = 11 + lvl * 4;
      speed = 64 + Math.min(30, lvl * 1.5);
      damage = 3 + lvl * 0.9;
      radius = 12;
    } else if (kind === 'golem') {
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
    });
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
    const dx = target.x - this.hero.x;
    const dy = target.y - this.hero.y;
    const dist = Math.hypot(dx, dy) || 1;
    const speed = this.loadout.projectileSpeed;
    this.projectiles.push({
      x: this.hero.x + (dx / dist) * 18,
      y: this.hero.y + (dy / dist) * 18,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      damage: this.loadout.damage,
      life: this.loadout.range / speed + 0.35,
    });
  }

  private damageEnemy(enemy: Enemy, damage: number): void {
    const style = ENEMY_STYLE[enemy.kind];
    enemy.hp -= damage;
    enemy.hitFlash = 1;
    this.floaters.push({
      x: enemy.x,
      y: enemy.y - enemy.radius - 6,
      text: `${Math.round(damage)}`,
      color: '#e7f6ff',
      life: 0.65,
      maxLife: 0.65,
    });
    this.spawnParticles(enemy.x, enemy.y, style.glow, 4, 70);
    sfx.hit();

    if (enemy.hp <= 0) {
      this.kills += 1;
      this.spawnParticles(enemy.x, enemy.y, style.body, 16, 170);
      this.spawnParticles(enemy.x, enemy.y, '#ffffff', 4, 90);
      this.floaters.push({
        x: enemy.x,
        y: enemy.y - enemy.radius - 14,
        text: '+XP',
        color: '#f5c451',
        life: 0.9,
        maxLife: 0.9,
      });
      const index = this.enemies.indexOf(enemy);
      if (index >= 0) this.enemies.splice(index, 1);
      this.shake = Math.min(6, this.shake + 1.2);
      sfx.kill();
      this.callbacks.onKill();
      this.pushSnapshot();
    }
  }

  private spawnParticles(
    x: number,
    y: number,
    color: string,
    count: number,
    speed: number,
  ): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
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
      });
    }
  }

  private die(): void {
    this.hero.hp = 0;
    this.paused = true;
    this.spawnParticles(this.hero.x, this.hero.y, '#ff5d73', 24, 200);
    this.shake = 9;
    this.pushSnapshot();
    this.callbacks.onDeath();
  }

  private render(): void {
    const { ctx } = this;

    // Limpiar la vista completa (incluidas las barras si hay letterboxing).
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = '#060910';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Todo el dibujo del juego usa coordenadas del mundo fijo.
    this.applyViewTransform();
    const w = this.width;
    const h = this.height;

    const background = ctx.createRadialGradient(
      w / 2,
      h / 2,
      20,
      w / 2,
      h / 2,
      Math.max(w, h) * 0.75,
    );
    background.addColorStop(0, '#0e1828');
    background.addColorStop(0.55, '#0a101c');
    background.addColorStop(1, '#060910');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, w, h);

    this.drawGrid();
    this.drawRune();

    if (!this.active) {
      this.drawHero();
      this.drawVignette();
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
    for (const enemy of this.enemies) this.drawEnemy(enemy);
    this.drawProjectiles();
    this.drawParticles();
    this.drawHero();
    this.drawFloaters();
    ctx.restore();

    this.drawVignette();
  }

  private drawGrid(): void {
    const { ctx } = this;
    const spacing = 56;
    ctx.save();
    ctx.strokeStyle = 'rgba(90, 140, 190, 0.055)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= this.width; x += spacing) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, this.height);
    }
    for (let y = 0; y <= this.height; y += spacing) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(this.width, y + 0.5);
    }
    ctx.stroke();

    ctx.strokeStyle = 'rgba(77, 226, 197, 0.05)';
    ctx.beginPath();
    ctx.moveTo(0, this.height / 2 + 0.5);
    ctx.lineTo(this.width, this.height / 2 + 0.5);
    ctx.moveTo(this.width / 2 + 0.5, 0);
    ctx.lineTo(this.width / 2 + 0.5, this.height);
    ctx.stroke();
    ctx.restore();
  }

  private drawRune(): void {
    const { ctx } = this;
    const cx = this.width / 2;
    const cy = this.height / 2;
    ctx.save();
    ctx.translate(cx, cy);

    ctx.strokeStyle = 'rgba(77, 226, 197, 0.10)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 104, 0, Math.PI * 2);
    ctx.stroke();

    ctx.rotate(this.bgTime * 0.18);
    ctx.setLineDash([10, 14]);
    ctx.strokeStyle = 'rgba(77, 226, 197, 0.16)';
    ctx.beginPath();
    ctx.arc(0, 0, 132, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.rotate(-this.bgTime * 0.45);
    ctx.strokeStyle = 'rgba(245, 196, 81, 0.10)';
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const inner = 116;
      const outer = 124;
      ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    }
    ctx.stroke();
    ctx.restore();
  }

  private drawRange(): void {
    const { ctx } = this;
    ctx.save();
    ctx.strokeStyle = 'rgba(77, 226, 197, 0.07)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 10]);
    ctx.beginPath();
    ctx.arc(this.hero.x, this.hero.y, this.loadout.range, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private drawHero(): void {
    const { ctx, hero } = this;
    const bob = Math.sin(this.bgTime * 3) * 2;
    const swing = Math.sin(hero.swing * Math.PI) * 0.65;

    ctx.save();
    ctx.translate(hero.x, hero.y + bob);
    ctx.scale(1.2, 1.2);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 20, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    const aura = ctx.createRadialGradient(0, 0, 4, 0, 0, 42);
    aura.addColorStop(0, 'rgba(77, 226, 197, 0.22)');
    aura.addColorStop(1, 'rgba(77, 226, 197, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, 42, 0, Math.PI * 2);
    ctx.fill();

    // Capa
    ctx.fillStyle = '#1d2a44';
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-15, 10);
    ctx.lineTo(0, -12);
    ctx.lineTo(15, 10);
    ctx.lineTo(0, 17);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cuerpo
    ctx.fillStyle = '#2f4468';
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Cabeza y visor
    ctx.fillStyle = '#dbe7f5';
    ctx.beginPath();
    ctx.arc(0, -11, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e293b';
    roundRect(ctx, -5.5, -13.5, 11, 4.5, 2);
    ctx.fill();

    // Escudo
    ctx.save();
    ctx.translate(-10, 7);
    ctx.rotate(-0.3);
    ctx.fillStyle = '#22314a';
    ctx.strokeStyle = '#f5c451';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 7, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(245, 196, 81, 0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(0, 6);
    ctx.moveTo(-4, 0);
    ctx.lineTo(4, 0);
    ctx.stroke();
    ctx.restore();

    // Espada
    ctx.save();
    ctx.rotate(hero.angle + swing);
    ctx.strokeStyle = '#f5c451';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(7, 0);
    ctx.lineTo(13, 0);
    ctx.stroke();
    ctx.strokeStyle = '#dbe7f5';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(13, 0);
    ctx.lineTo(33, 0);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(15, -1.5);
    ctx.lineTo(31, -1.5);
    ctx.stroke();
    ctx.restore();

    if (hero.flash > 0) {
      ctx.strokeStyle = `rgba(255, 93, 115, ${hero.flash * 3})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawEnemy(enemy: Enemy): void {
    const { ctx } = this;
    const style = ENEMY_STYLE[enemy.kind];

    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(0, enemy.radius + 5, enemy.radius * 0.9, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    if (enemy.kind === 'slime') {
      const squash = 1 + Math.sin(enemy.wobble * 6) * 0.08;
      ctx.save();
      ctx.scale(1 / squash, squash);
      const gradient = ctx.createRadialGradient(
        -enemy.radius * 0.3,
        -enemy.radius * 0.4,
        2,
        0,
        0,
        enemy.radius * 1.3,
      );
      gradient.addColorStop(0, style.glow);
      gradient.addColorStop(1, style.dark);
      ctx.fillStyle = gradient;
      ctx.strokeStyle = style.body;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, enemy.radius, enemy.radius * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(-5, -3, 3, 0, Math.PI * 2);
      ctx.arc(5, -3, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = style.accent;
      ctx.beginPath();
      ctx.arc(-5, -2.5, 1.4, 0, Math.PI * 2);
      ctx.arc(5, -2.5, 1.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (enemy.kind === 'bat') {
      const flap = Math.sin(enemy.wobble * 12) * 0.5;
      ctx.fillStyle = style.dark;
      ctx.strokeStyle = style.body;
      ctx.lineWidth = 1.5;

      ctx.save();
      ctx.rotate(-0.4 - flap);
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.lineTo(-enemy.radius * 2.1, -6);
      ctx.lineTo(-enemy.radius * 1.5, 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.rotate(0.4 + flap);
      ctx.beginPath();
      ctx.moveTo(4, 0);
      ctx.lineTo(enemy.radius * 2.1, -6);
      ctx.lineTo(enemy.radius * 1.5, 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = style.body;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(-6, -8);
      ctx.lineTo(-2, -16);
      ctx.lineTo(0, -8);
      ctx.moveTo(6, -8);
      ctx.lineTo(2, -16);
      ctx.lineTo(0, -8);
      ctx.fill();

      ctx.fillStyle = '#ff5d73';
      ctx.beginPath();
      ctx.arc(-4, -2, 2.2, 0, Math.PI * 2);
      ctx.arc(4, -2, 2.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const gradient = ctx.createLinearGradient(0, -enemy.radius, 0, enemy.radius);
      gradient.addColorStop(0, style.body);
      gradient.addColorStop(1, style.dark);
      ctx.fillStyle = gradient;
      ctx.strokeStyle = style.glow;
      ctx.lineWidth = 2;
      roundRect(ctx, -enemy.radius, -enemy.radius, enemy.radius * 2, enemy.radius * 2, 7);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = 'rgba(158, 197, 245, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-enemy.radius + 6, -4);
      ctx.lineTo(-4, 4);
      ctx.lineTo(2, -3);
      ctx.lineTo(enemy.radius - 6, 6);
      ctx.stroke();

      ctx.fillStyle = '#ffb86b';
      ctx.beginPath();
      ctx.arc(-7, -5, 2.8, 0, Math.PI * 2);
      ctx.arc(7, -5, 2.8, 0, Math.PI * 2);
      ctx.fill();
    }

    if (enemy.hitFlash > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${enemy.hitFlash * 0.55})`;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius + 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    if (enemy.hp < enemy.maxHp) {
      const barWidth = Math.max(22, enemy.radius * 2);
      const barX = enemy.x - barWidth / 2;
      const barY = enemy.y - enemy.radius - 12;
      const ratio = clamp(enemy.hp / enemy.maxHp, 0, 1);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      roundRect(ctx, barX, barY, barWidth, 4, 2);
      ctx.fill();
      ctx.fillStyle = ratio > 0.5 ? '#4ade80' : ratio > 0.25 ? '#fbbf24' : '#ff5d73';
      roundRect(ctx, barX, barY, barWidth * ratio, 4, 2);
      ctx.fill();
    }
  }

  private drawProjectiles(): void {
    const { ctx } = this;
    ctx.save();
    for (const projectile of this.projectiles) {
      ctx.strokeStyle = 'rgba(158, 247, 228, 0.45)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(projectile.x - projectile.vx * 0.02, projectile.y - projectile.vy * 0.02);
      ctx.lineTo(projectile.x, projectile.y);
      ctx.stroke();

      ctx.fillStyle = '#e6fffb';
      ctx.shadowColor = '#4de2c5';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(projectile.x, projectile.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawParticles(): void {
    const { ctx } = this;
    ctx.save();
    for (const particle of this.particles) {
      const alpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.fillRect(
        particle.x - particle.size / 2,
        particle.y - particle.size / 2,
        particle.size,
        particle.size,
      );
    }
    ctx.restore();
  }

  private drawFloaters(): void {
    const { ctx } = this;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 12px ui-monospace, monospace';
    for (const floater of this.floaters) {
      const alpha = clamp(floater.life / floater.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = floater.color;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText(floater.text, floater.x, floater.y);
    }
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
}
