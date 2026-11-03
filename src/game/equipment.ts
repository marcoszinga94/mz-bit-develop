import type { Equipment, Item, ItemDef, Loadout, RunState, Slot } from './types';

export const MAX_TIER = 4;
export const TIER_MULT = 1.6;

export const SLOT_LABEL: Record<Slot, string> = {
  weapon: 'Arma',
  armor: 'Armadura',
  ring: 'Anillo',
  boots: 'Botas',
};

export const SLOT_ORDER: Slot[] = ['weapon', 'armor', 'ring', 'boots'];

export const ITEM_DEFS: ItemDef[] = [
  {
    id: 'rusty-sword',
    name: 'Espada oxidada',
    slot: 'weapon',
    icon: '🗡️',
    stat: 'damage',
    base: 3,
    flavor: 'Corta, pero corta.',
  },
  {
    id: 'apprentice-staff',
    name: 'Bastón de aprendiz',
    slot: 'weapon',
    icon: '🪄',
    stat: 'damage',
    base: 4,
    flavor: 'Huele a magia reciclada.',
  },
  {
    id: 'iron-axe',
    name: 'Hacha de hierro',
    slot: 'weapon',
    icon: '🪓',
    stat: 'damage',
    base: 5,
    flavor: 'Pesada, honesta y afilada.',
  },
  {
    id: 'leather-vest',
    name: 'Chaleco de cuero',
    slot: 'armor',
    icon: '🥋',
    stat: 'maxHp',
    base: 18,
    flavor: 'Aprobado por el gremio de aventureros.',
  },
  {
    id: 'chain-mail',
    name: 'Cota de malla',
    slot: 'armor',
    icon: '🛡️',
    stat: 'maxHp',
    base: 28,
    flavor: 'Muchos anillos, cero bodas.',
  },
  {
    id: 'arcane-robe',
    name: 'Túnica arcana',
    slot: 'armor',
    icon: '🧥',
    stat: 'maxHp',
    base: 22,
    flavor: 'Ligera, cómoda y con bolsillos infinitos.',
  },
  {
    id: 'copper-ring',
    name: 'Anillo de cobre',
    slot: 'ring',
    icon: '💍',
    stat: 'attackSpeed',
    base: 0.08,
    flavor: 'Brilla poco. Acelera mucho.',
  },
  {
    id: 'ruby-ring',
    name: 'Anillo de rubí',
    slot: 'ring',
    icon: '💎',
    stat: 'attackSpeed',
    base: 0.12,
    flavor: 'El rojo va más rápido.',
  },
  {
    id: 'leather-boots',
    name: 'Botas de cuero',
    slot: 'boots',
    icon: '🥾',
    stat: 'range',
    base: 14,
    flavor: 'Para mantener distancia de los bugs.',
  },
  {
    id: 'swift-boots',
    name: 'Botas veloces',
    slot: 'boots',
    icon: '👟',
    stat: 'range',
    base: 22,
    flavor: 'Alcance extendido, sin sudor.',
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
    maxHp: Math.round(100 + u.vitality * 20 + gear.maxHp),
    damage: Math.round((10 + gear.damage) * (1 + u.damage * 0.15) * 10) / 10,
    attackInterval:
      Math.round((0.8 / ((1 + u.attackSpeed * 0.12) * (1 + gear.attackSpeed))) * 1000) / 1000,
    range: Math.round((280 + gear.range) * (1 + u.range * 0.1)),
    projectileSpeed: 560,
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
