import type { Equipment, Item, ItemDef, Loadout, RunState, Slot } from './types';

export const MAX_TIER = 4;
export const TIER_MULT = 2;

export const SLOT_LABEL: Record<Slot, string> = {
  weapon: 'Periférico',
  armor: 'Chasis',
  ring: 'Módulo I/O',
  boots: 'Acelerador',
};

export const SLOT_SHORT_LABEL: Record<Slot, string> = {
  weapon: 'Perif.',
  armor: 'Chasis',
  ring: 'Módulo',
  boots: 'Acel.',
};

export const SLOT_ORDER: Slot[] = ['weapon', 'armor', 'ring', 'boots'];

export const ITEM_DEFS: ItemDef[] = [
  {
    id: 'rusty-sword',
    name: 'Teclado',
    slot: 'weapon',
    icon: '⌨️',
    stat: 'damage',
    base: 4,
    flavor: 'Teclas gastadas, bugs temblorosos.',
  },
  {
    id: 'apprentice-staff',
    name: 'Script',
    slot: 'weapon',
    icon: '📜',
    stat: 'damage',
    base: 8,
    flavor: 'Ejecuta más rápido de lo que lees.',
  },
  {
    id: 'iron-axe',
    name: 'Compilador',
    slot: 'weapon',
    icon: '⚙️',
    stat: 'damage',
    base: 16,
    flavor: 'Convierte intenciones en binarios.',
  },
  {
    id: 'leather-vest',
    name: 'Hoodie',
    slot: 'armor',
    icon: '🧥',
    stat: 'maxHp',
    base: 32,
    flavor: 'Aprobado por el comité de code review.',
  },
  {
    id: 'chain-mail',
    name: 'Tests',
    slot: 'armor',
    icon: '🧪',
    stat: 'maxHp',
    base: 64,
    flavor: 'Cobertura del 100 %, bugs al 0 %.',
  },
  {
    id: 'arcane-robe',
    name: 'Sudadera',
    slot: 'armor',
    icon: '🔮',
    stat: 'maxHp',
    base: 64,
    flavor: 'Ligera, cómoda y con bolsillos infinitos.',
  },
  {
    id: 'copper-ring',
    name: 'USB cobre',
    slot: 'ring',
    icon: '🔌',
    stat: 'attackSpeed',
    base: 0.125,
    flavor: 'Conecta y acelera. Sin drivers.',
  },
  {
    id: 'ruby-ring',
    name: 'USB rubí',
    slot: 'ring',
    icon: '💎',
    stat: 'attackSpeed',
    base: 0.25,
    flavor: 'El rojo compila más rápido.',
  },
  {
    id: 'leather-boots',
    name: 'Zapatillas',
    slot: 'boots',
    icon: '👟',
    stat: 'range',
    base: 32,
    flavor: 'Para mantener distancia de los bugs.',
  },
  {
    id: 'swift-boots',
    name: 'Deploy',
    slot: 'boots',
    icon: '🚀',
    stat: 'range',
    base: 64,
    flavor: 'Alcance extendido, cero downtime.',
  },
];

export const ITEM_BY_ID: Record<string, ItemDef> = Object.fromEntries(
  ITEM_DEFS.map((def) => [def.id, def]),
);

export function emptyEquipment(): Equipment {
  return { weapon: null, armor: null, ring: null, boots: null };
}

export function itemValue(item: Item): number {
  const def = ITEM_BY_ID[item.defId];
  if (!def) return 0;
  const raw = def.base * Math.pow(TIER_MULT, item.tier - 1);
  // Las estadísticas porcentuales necesitan decimales; el resto son enteros.
  if (def.stat === 'attackSpeed') return Math.round(raw * 1000) / 1000;
  return Math.round(raw);
}

export function itemLabel(item: Item): string {
  const def = ITEM_BY_ID[item.defId];
  return `${def?.name ?? 'Pieza'} ${'★'.repeat(item.tier)}`;
}

export function equipmentBonuses(equipment: Equipment): {
  damage: number;
  maxHp: number;
  attackSpeed: number;
  range: number;
} {
  const bonus = { damage: 0, maxHp: 0, attackSpeed: 0, range: 0 };
  for (const slot of SLOT_ORDER) {
    const item = equipment[slot];
    if (!item) continue;
    const def = ITEM_BY_ID[item.defId];
    if (!def) continue;
    bonus[def.stat] += itemValue(item);
  }
  return bonus;
}

export function loadoutFromRun(run: RunState): Loadout {
  const gear = equipmentBonuses(run.equipment);
  const u = run.upgrades;
  return {
    maxHp: Math.round(128 + u.vitality * 32 + gear.maxHp),
    damage: Math.round((8 + gear.damage) * (1 + u.damage * 0.25) * 10) / 10,
    attackInterval:
      Math.round((0.5 / ((1 + u.attackSpeed * 0.25) * (1 + gear.attackSpeed))) * 1000) / 1000,
    range: Math.round((256 + gear.range) * (1 + u.range * 0.125)),
    projectileSpeed: Math.round(512 * (1 + u.projectileSpeed * 0.15)),
    damageReduction: Math.min(0.6, u.armor * 0.03),
    critChance: Math.min(0.5, u.crit * 0.0625),
    critMultiplier: 2 + u.crit * 0.05 + u.critDamage * 0.25,
    extraProjectiles: Math.min(4, u.multishot),
    pierce: Math.min(3, u.pierce),
    lifesteal: Math.min(0.25, u.lifesteal * 0.03125),
    xpGain: 1 + u.xpGain * 0.125,
    regen: u.regen * 0.5,
  };
}

export interface ApplyItemResult {
  equipment: Equipment;
  message: string;
  merged: boolean;
}

/** Añade una pieza al equipo. Si ya existe la misma pieza, sube un tier (fusión). */
export function applyItem(
  equipment: Equipment,
  defId: string,
  offeredTier = 1,
): ApplyItemResult {
  const def = ITEM_BY_ID[defId];
  if (!def) return { equipment, message: 'Pieza desconocida', merged: false };

  const current = equipment[def.slot];
  if (!current) {
    return {
      equipment: { ...equipment, [def.slot]: { defId, tier: offeredTier } },
      message: `Equipado: ${def.name} ${'★'.repeat(offeredTier)}`,
      merged: false,
    };
  }

  if (current.defId === defId) {
    if (current.tier >= MAX_TIER) {
      return {
        equipment,
        message: `${def.name} ya está en el tier máximo`,
        merged: false,
      };
    }
    const tier = Math.min(MAX_TIER, current.tier + 1);
    return {
      equipment: { ...equipment, [def.slot]: { defId, tier } },
      message: `¡Fusión! ${def.name} ★${current.tier} → ★${tier}`,
      merged: true,
    };
  }

  const oldDef = ITEM_BY_ID[current.defId];
  return {
    equipment: { ...equipment, [def.slot]: { defId, tier: offeredTier } },
    message: `Equipado: ${def.name} (reemplaza ${oldDef?.name ?? 'la pieza anterior'})`,
    merged: false,
  };
}
