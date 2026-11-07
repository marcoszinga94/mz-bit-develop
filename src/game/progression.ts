import { ITEM_DEFS, MAX_TIER, applyItem, emptyEquipment } from './equipment';
import type { Item, Reward, RunState, UpgradeKey, Upgrades } from './types';

export function xpNeeded(level: number): number {
  return 20 + level * 10;
}

export function createRun(): RunState {
  return {
    level: 1,
    xp: 0,
    upgrades: {
      damage: 0,
      attackSpeed: 0,
      vitality: 0,
      range: 0,
      crit: 0,
      multishot: 0,
      pierce: 0,
      lifesteal: 0,
      xpGain: 0,
      critDamage: 0,
      regen: 0,
      armor: 0,
      projectileSpeed: 0,
    },
    equipment: emptyEquipment(),
  };
}

export const UPGRADE_META: Record<
  UpgradeKey,
  { title: string; icon: string; desc: string }
> = {
  damage: {
    title: 'Filo afilado',
    icon: '⚔️',
    desc: '+25% de daño base',
  },
  attackSpeed: {
    title: 'Ritmo de combate',
    icon: '⚡',
    desc: '+25% de velocidad de ataque',
  },
  vitality: {
    title: 'Corazón de hierro',
    icon: '❤️',
    desc: '+32 de vida máxima y cura',
  },
  range: {
    title: 'Ojo de halcón',
    icon: '🎯',
    desc: '+12.5% de alcance de ataque',
  },
  crit: {
    title: 'Overclock',
    icon: '🌀',
    desc: '+6.25% de probabilidad de crítico (x2)',
  },
  multishot: {
    title: 'Multihilo',
    icon: '🧵',
    desc: '+1 proyectil por ataque (75% de daño, máx. 5)',
  },
  pierce: {
    title: 'Paquete perforante',
    icon: '📡',
    desc: 'Los proyectiles atraviesan 1 enemigo más',
  },
  lifesteal: {
    title: 'Auto-reparación',
    icon: '♻️',
    desc: '+3.125% del daño infligido se convierte en vida',
  },
  xpGain: {
    title: 'Compilación -O2',
    icon: '📈',
    desc: '+12.5% de compilación (XP) por kill',
  },
  critDamage: {
    title: 'Golpe cuántico',
    icon: '💥',
    desc: '+0.25× al multiplicador de crítico',
  },
  regen: {
    title: 'Parche en caliente',
    icon: '🩹',
    desc: '+0.5 de vida por segundo',
  },
  armor: {
    title: 'Firewall local',
    icon: '🧱',
    desc: '+3% de reducción de daño',
  },
  projectileSpeed: {
    title: 'Fibra óptica',
    icon: '🛰️',
    desc: '+15% de velocidad de proyectil',
  },
};

const UPGRADE_KEYS: UpgradeKey[] = [
  'damage',
  'attackSpeed',
  'vitality',
  'range',
  'crit',
  'multishot',
  'pierce',
  'lifesteal',
  'xpGain',
  'critDamage',
  'regen',
  'armor',
  'projectileSpeed',
];

/** Mejoras con un límite de stacks. Multihilo llega a 5 proyectiles en total. */
const UPGRADE_MAX: Partial<Record<UpgradeKey, number>> = {
  multishot: 4,
};

function isUpgradeAvailable(run: RunState, key: UpgradeKey): boolean {
  const max = UPGRADE_MAX[key];
  return max === undefined || run.upgrades[key] < max;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function upgradeReward(key: UpgradeKey): Reward {
  const meta = UPGRADE_META[key];
  return {
    kind: 'upgrade',
    key,
    title: meta.title,
    desc: meta.desc,
    icon: meta.icon,
  };
}

function pickEquipmentDef(run: RunState, excluded: Set<string>): string | null {
  const owned: Item[] = Object.values(run.equipment).filter(
    (item): item is Item => item !== null && item.tier < MAX_TIER,
  );

  // Con frecuencia ofrece una pieza que ya tienes para fomentar la fusión.
  if (owned.length > 0 && Math.random() < 0.55) {
    const pick = owned[Math.floor(Math.random() * owned.length)]!;
    return pick.defId;
  }

  const candidates = ITEM_DEFS.filter((def) => {
    if (excluded.has(def.id)) return false;
    const equipped = run.equipment[def.slot];
    // No ofrecer una pieza que ya está equipada al tier máximo.
    return !(equipped && equipped.defId === def.id && equipped.tier >= MAX_TIER);
  });
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)]!.id;
}

/** Genera 3 mejoras de software distintas, elegidas del pool completo disponible. */
export function generateRewards(run: RunState): Reward[] {
  const availableKeys = UPGRADE_KEYS.filter((key) => isUpgradeAvailable(run, key));
  return shuffle(availableKeys).slice(0, 3).map(upgradeReward);
}

/** Drop automático de hardware (cada 2 niveles) para mantener la fusión de equipo. */
export function randomHardwareDrop(
  run: RunState,
): { run: RunState; message: string } | null {
  const defId = pickEquipmentDef(run, new Set());
  if (!defId) return null;
  const result = applyItem(run.equipment, defId, 1);
  return {
    run: { ...run, equipment: result.equipment },
    message: result.message,
  };
}

export function applyUpgrade(run: RunState, key: UpgradeKey): RunState {
  const max = UPGRADE_MAX[key];
  if (max !== undefined && run.upgrades[key] >= max) return run;
  const upgrades: Upgrades = { ...run.upgrades, [key]: run.upgrades[key] + 1 };
  return { ...run, upgrades };
}

/** Aplica la recompensa elegida y concede el nivel pendiente. */
export function applyReward(
  run: RunState,
  reward: Reward,
): { run: RunState; message: string } {
  const need = xpNeeded(run.level);
  const base: RunState = {
    ...run,
    level: run.level + 1,
    xp: Math.max(0, run.xp - need),
  };

  if (reward.kind === 'upgrade') {
    const meta = UPGRADE_META[reward.key];
    return {
      run: applyUpgrade(base, reward.key),
      message: `Mejora: ${meta.title}`,
    };
  }

  const result = applyItem(base.equipment, reward.defId, reward.tier);
  return {
    run: { ...base, equipment: result.equipment },
    message: result.message,
  };
}
