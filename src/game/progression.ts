import {
  ITEM_BY_ID,
  ITEM_DEFS,
  MAX_TIER,
  SLOT_LABEL,
  applyItem,
  emptyEquipment,
} from './equipment';
import type { Item, Reward, RunState, UpgradeKey, Upgrades } from './types';

export const KILL_XP = 15;

export function xpNeeded(level: number): number {
  return 20 + level * 10;
}

export function createRun(): RunState {
  return {
    level: 1,
    xp: 0,
    upgrades: { damage: 0, attackSpeed: 0, vitality: 0, range: 0 },
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
    desc: '+15% de daño base',
  },
  attackSpeed: {
    title: 'Ritmo de combate',
    icon: '⚡',
    desc: '+12% de velocidad de ataque',
  },
  vitality: {
    title: 'Corazón de hierro',
    icon: '❤️',
    desc: '+20 de vida máxima y cura',
  },
  range: {
    title: 'Ojo de halcón',
    icon: '🎯',
    desc: '+10% de alcance de ataque',
  },
};

const UPGRADE_KEYS: UpgradeKey[] = ['damage', 'attackSpeed', 'vitality', 'range'];

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

function itemReward(run: RunState, defId: string): Reward {
  const def = ITEM_BY_ID[defId]!;
  const current = run.equipment[def.slot];
  let desc = `Equipa en ${SLOT_LABEL[def.slot].toLowerCase()}`;

  if (current && current.defId === defId) {
    const nextTier = Math.min(MAX_TIER, current.tier + 1);
    desc =
      current.tier >= MAX_TIER
        ? `Ya tienes ${def.name} al tier máximo`
        : `¡Fusiona! ${def.name} ★${current.tier} → ★${nextTier}`;
  } else if (current) {
    const oldDef = ITEM_BY_ID[current.defId];
    desc = `Reemplaza ${oldDef?.name ?? 'tu pieza'} ★${current.tier}`;
  }

  return {
    kind: 'item',
    defId,
    title: def.name,
    desc,
    icon: def.icon,
    tier: 1,
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

/** Genera 3 recompensas distintas: al menos una pieza de equipo y una mejora. */
export function generateRewards(run: RunState): Reward[] {
  const rewards: Reward[] = [];
  const usedDefs = new Set<string>();

  const upgradeKey = UPGRADE_KEYS[Math.floor(Math.random() * UPGRADE_KEYS.length)]!;
  rewards.push(upgradeReward(upgradeKey));

  const firstDef = pickEquipmentDef(run, usedDefs);
  if (firstDef) {
    usedDefs.add(firstDef);
    rewards.push(itemReward(run, firstDef));
  }

  if (Math.random() < 0.5) {
    const secondDef = pickEquipmentDef(run, usedDefs);
    if (secondDef) {
      usedDefs.add(secondDef);
      rewards.push(itemReward(run, secondDef));
    }
  }

  while (rewards.length < 3) {
    const remaining = UPGRADE_KEYS.filter(
      (key) => !rewards.some((r) => r.kind === 'upgrade' && r.key === key),
    );
    const key = remaining[Math.floor(Math.random() * remaining.length)];
    if (!key) break;
    rewards.push(upgradeReward(key));
  }

  return shuffle(rewards).slice(0, 3);
}

export function applyUpgrade(run: RunState, key: UpgradeKey): RunState {
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
