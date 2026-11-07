import type { Loadout } from './types';

export type MetaUpgradeKey =
  | 'refactor'
  | 'coffee'
  | 'docs'
  | 'linter'
  | 'firewall';

export type MetaUpgrades = Record<MetaUpgradeKey, number>;

export interface MetaState {
  version: 1;
  coins: number;
  upgrades: MetaUpgrades;
  bestLevel: number;
  runs: number;
}

export interface MetaUpgradeDef {
  key: MetaUpgradeKey;
  name: string;
  icon: string;
  description: string;
  stat: string;
  baseCost: number;
  maxLevel: number;
}

export const MAX_META_LEVEL = 5;

export const META_UPGRADES: MetaUpgradeDef[] = [
  {
    key: 'refactor',
    name: 'Refactor',
    icon: '🧹',
    description: '+6.25% de daño por nivel. Código más limpio, golpes más fuertes.',
    stat: 'Daño',
    baseCost: 40,
    maxLevel: MAX_META_LEVEL,
  },
  {
    key: 'coffee',
    name: 'Cafeína',
    icon: '☕',
    description: '+6.25% de velocidad de ataque por nivel. El café compila más rápido.',
    stat: 'Velocidad',
    baseCost: 45,
    maxLevel: MAX_META_LEVEL,
  },
  {
    key: 'docs',
    name: 'Documentación',
    icon: '📚',
    description: '+16 de vida máxima por nivel. Menos bugs inesperados.',
    stat: 'Vida',
    baseCost: 35,
    maxLevel: MAX_META_LEVEL,
  },
  {
    key: 'linter',
    name: 'Linter',
    icon: '🔍',
    description: '+16 de alcance por nivel. Detecta problemas desde lejos.',
    stat: 'Alcance',
    baseCost: 30,
    maxLevel: MAX_META_LEVEL,
  },
  {
    key: 'firewall',
    name: 'Firewall',
    icon: '🧱',
    description: '+3.125% de reducción de daño por nivel. Bloquea ataques maliciosos.',
    stat: 'Defensa',
    baseCost: 50,
    maxLevel: MAX_META_LEVEL,
  },
];

export const META_BY_KEY: Record<MetaUpgradeKey, MetaUpgradeDef> =
  Object.fromEntries(META_UPGRADES.map((def) => [def.key, def])) as Record<
    MetaUpgradeKey,
    MetaUpgradeDef
  >;

const META_KEY = 'bit-develop-meta-v1';
const LEGACY_META_KEY = 'bit-knight-meta-v1';

function emptyUpgrades(): MetaUpgrades {
  return {
    refactor: 0,
    coffee: 0,
    docs: 0,
    linter: 0,
    firewall: 0,
  };
}

export function defaultMeta(): MetaState {
  return {
    version: 1,
    coins: 0,
    upgrades: emptyUpgrades(),
    bestLevel: 1,
    runs: 0,
  };
}

function clampLevel(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(MAX_META_LEVEL, Math.floor(value)));
}

export function loadMeta(): MetaState {
  if (typeof window === 'undefined') return defaultMeta();
  try {
    let raw = window.localStorage.getItem(META_KEY);
    if (!raw) {
      raw = window.localStorage.getItem(LEGACY_META_KEY);
      if (raw) window.localStorage.setItem(META_KEY, raw);
    }
    if (!raw) return defaultMeta();
    const parsed = JSON.parse(raw) as Partial<MetaState>;

    const upgrades = emptyUpgrades();
    if (parsed.upgrades && typeof parsed.upgrades === 'object') {
      const rawUpgrades = parsed.upgrades as Record<string, unknown>;
      for (const def of META_UPGRADES) {
        upgrades[def.key] = clampLevel(rawUpgrades[def.key]);
      }
    }

    return {
      version: 1,
      coins:
        typeof parsed.coins === 'number' && Number.isFinite(parsed.coins)
          ? Math.max(0, Math.floor(parsed.coins))
          : 0,
      upgrades,
      bestLevel:
        typeof parsed.bestLevel === 'number' && Number.isFinite(parsed.bestLevel)
          ? Math.max(1, Math.floor(parsed.bestLevel))
          : 1,
      runs:
        typeof parsed.runs === 'number' && Number.isFinite(parsed.runs)
          ? Math.max(0, Math.floor(parsed.runs))
          : 0,
    };
  } catch {
    return defaultMeta();
  }
}

export function saveMeta(meta: MetaState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    // Sin almacenamiento: la meta-progresión no persiste.
  }
}

/** Monedas ganadas al morir: premia el nivel alcanzado y los kills. */
export function coinsForRun(level: number, kills: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  const safeKills = Math.max(0, Math.floor(kills));
  return Math.max(5, 8 + safeLevel * 5 + Math.floor(safeKills / 4));
}

export function metaUpgradeCost(key: MetaUpgradeKey, level: number): number {
  const def = META_BY_KEY[key];
  return def.baseCost * (Math.max(0, Math.floor(level)) + 1);
}

export interface MetaBonuses {
  damagePct: number;
  attackSpeedPct: number;
  maxHp: number;
  range: number;
  damageReduction: number;
}

export function metaBonuses(meta: MetaState): MetaBonuses {
  const u = meta.upgrades;
  return {
    damagePct: u.refactor * 0.0625,
    attackSpeedPct: u.coffee * 0.0625,
    maxHp: u.docs * 16,
    range: u.linter * 16,
    damageReduction: Math.min(0.25, u.firewall * 0.03125),
  };
}

export function applyMetaToLoadout(loadout: Loadout, meta: MetaState): Loadout {
  const bonus = metaBonuses(meta);
  return {
    ...loadout,
    maxHp: Math.round(loadout.maxHp + bonus.maxHp),
    damage:
      Math.round(loadout.damage * (1 + bonus.damagePct) * 10) / 10,
    attackInterval:
      Math.round((loadout.attackInterval / (1 + bonus.attackSpeedPct)) * 1000) /
      1000,
    range: Math.round(loadout.range + bonus.range),
    damageReduction: Math.min(
      0.6,
      loadout.damageReduction + bonus.damageReduction,
    ),
  };
}

export interface BuyMetaResult {
  meta: MetaState;
  ok: boolean;
  message: string;
}

export function buyMetaUpgrade(
  meta: MetaState,
  key: MetaUpgradeKey,
): BuyMetaResult {
  const def = META_BY_KEY[key];
  const level = meta.upgrades[key];
  if (level >= def.maxLevel) {
    return { meta, ok: false, message: `${def.name} ya está al máximo` };
  }

  const cost = metaUpgradeCost(key, level);
  if (meta.coins < cost) {
    return {
      meta,
      ok: false,
      message: `Faltan ${cost - meta.coins} monedas para ${def.name}`,
    };
  }

  const next: MetaState = {
    ...meta,
    coins: meta.coins - cost,
    upgrades: { ...meta.upgrades, [key]: level + 1 },
  };
  return { meta: next, ok: true, message: `${def.name} mejorado a nivel ${level + 1}` };
}

export function addRunRewards(
  meta: MetaState,
  coins: number,
  level: number,
): MetaState {
  return {
    ...meta,
    coins: meta.coins + Math.max(0, Math.floor(coins)),
    bestLevel: Math.max(meta.bestLevel, Math.max(1, Math.floor(level))),
    runs: meta.runs + 1,
  };
}
