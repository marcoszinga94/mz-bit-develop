import { describe, expect, it } from 'vitest';
import { computeViewTransform } from '../src/game/engine';
import {
  MAX_TIER,
  applyItem,
  emptyEquipment,
  equipmentBonuses,
  itemValue,
  loadoutFromRun,
} from '../src/game/equipment';
import {
  applyReward,
  createRun,
  generateRewards,
  randomHardwareDrop,
  xpNeeded,
} from '../src/game/progression';
import { pow2Label } from '../src/game/format';
import {
  addRunRewards,
  applyMetaToLoadout,
  buyMetaUpgrade,
  coinsForRun,
  defaultMeta,
  MAX_META_LEVEL,
  metaBonuses,
  metaUpgradeCost,
} from '../src/game/meta';
import {
  QUESTION_COUNT,
  QUESTIONS,
  pickQuestion,
} from '../src/game/questions';

describe('equipamiento', () => {
  it('equipa una pieza en un slot vacío', () => {
    const result = applyItem(emptyEquipment(), 'rusty-sword');
    expect(result.equipment.weapon).toEqual({ defId: 'rusty-sword', tier: 1 });
    expect(result.merged).toBe(false);
  });

  it('fusiona dos piezas iguales y sube un tier', () => {
    const first = applyItem(emptyEquipment(), 'rusty-sword');
    const second = applyItem(first.equipment, 'rusty-sword');
    expect(second.equipment.weapon).toEqual({ defId: 'rusty-sword', tier: 2 });
    expect(second.merged).toBe(true);
    expect(itemValue(second.equipment.weapon!)).toBeGreaterThan(
      itemValue(first.equipment.weapon!),
    );
  });

  it('no supera el tier máximo', () => {
    let equipment = emptyEquipment();
    for (let i = 0; i < MAX_TIER + 3; i++) {
      equipment = applyItem(equipment, 'rusty-sword').equipment;
    }
    expect(equipment.weapon?.tier).toBe(MAX_TIER);
  });

  it('reemplaza una pieza distinta del mismo slot', () => {
    const first = applyItem(emptyEquipment(), 'rusty-sword');
    const second = applyItem(first.equipment, 'iron-axe');
    expect(second.equipment.weapon).toEqual({ defId: 'iron-axe', tier: 1 });
    expect(second.merged).toBe(false);
  });

  it('suma los bonuses de todos los slots', () => {
    let equipment = emptyEquipment();
    equipment = applyItem(equipment, 'iron-axe').equipment;
    equipment = applyItem(equipment, 'leather-vest').equipment;
    equipment = applyItem(equipment, 'copper-ring').equipment;
    equipment = applyItem(equipment, 'leather-boots').equipment;

    const bonus = equipmentBonuses(equipment);
    expect(bonus.damage).toBe(16);
    expect(bonus.maxHp).toBe(32);
    expect(bonus.attackSpeed).toBeCloseTo(0.125);
    expect(bonus.range).toBe(32);
  });
});

describe('progresión', () => {
  it('la XP necesaria crece con el nivel', () => {
    expect(xpNeeded(1)).toBe(30);
    expect(xpNeeded(5)).toBe(70);
    expect(xpNeeded(5)).toBeGreaterThan(xpNeeded(4));
  });

  it('aplicar una recompensa sube de nivel y descuenta la XP', () => {
    const run = { ...createRun(), xp: 30 };
    const result = applyReward(run, {
      kind: 'upgrade',
      key: 'damage',
      title: 'Filo afilado',
      desc: '+15%',
      icon: '⚔️',
    });
    expect(result.run.level).toBe(2);
    expect(result.run.xp).toBe(0);
    expect(result.run.upgrades.damage).toBe(1);
  });

  it('las estadísticas base son potencias de dos', () => {
    const loadout = loadoutFromRun(createRun());
    expect(loadout.maxHp).toBe(128);
    expect(loadout.damage).toBe(8);
    expect(loadout.attackInterval).toBe(0.5);
    expect(loadout.range).toBe(256);
    expect(loadout.projectileSpeed).toBe(512);
  });

  it('formatea las estadísticas como potencias de dos', () => {
    expect(pow2Label(8)).toBe('2**3');
    expect(pow2Label(128)).toBe('2**7');
    expect(pow2Label(256)).toBe('2**8');
  });

  it('ofrece siempre 3 mejoras de software distintas', () => {
    for (let i = 0; i < 30; i++) {
      const rewards = generateRewards(createRun());
      expect(rewards).toHaveLength(3);
      expect(rewards.every((reward) => reward.kind === 'upgrade')).toBe(true);
      const keys = new Set(
        rewards.map((reward) => (reward.kind === 'upgrade' ? reward.key : '')),
      );
      expect(keys.size).toBe(3);
    }
  });

  it('instala hardware automáticamente en el drop de nivel', () => {
    const drop = randomHardwareDrop(createRun());
    expect(drop).not.toBeNull();
    const equipped = Object.values(drop!.run.equipment).filter(Boolean);
    expect(equipped).toHaveLength(1);
  });

  it('Multihilo se detiene al llegar a 5 proyectiles', () => {
    const base = createRun();
    const maxed = {
      ...base,
      upgrades: { ...base.upgrades, multishot: 4 },
    };

    for (let i = 0; i < 80; i++) {
      const rewards = generateRewards(maxed);
      expect(
        rewards.some((reward) => reward.kind === 'upgrade' && reward.key === 'multishot'),
      ).toBe(false);
    }

    const loadout = loadoutFromRun({
      ...maxed,
      upgrades: { ...maxed.upgrades, multishot: 99 },
    });
    expect(loadout.extraProjectiles).toBe(4);
  });

  it('las mejoras de build se reflejan en el loadout', () => {
    const run = { ...createRun(), xp: 30 };
    const result = applyReward(run, {
      kind: 'upgrade',
      key: 'crit',
      title: 'Overclock',
      desc: '+6%',
      icon: '🌀',
    });
    expect(result.run.upgrades.crit).toBe(1);
    const loadout = loadoutFromRun(result.run);
    expect(loadout.critChance).toBeGreaterThan(0);
    expect(loadout.critMultiplier).toBeGreaterThan(1.8);
  });

  it('aplicar una pieza de equipo la incorpora al inventario', () => {
    const run = { ...createRun(), xp: 30 };
    const result = applyReward(run, {
      kind: 'item',
      defId: 'leather-boots',
      title: 'Botas de cuero',
      desc: 'Equipa',
      icon: '🥾',
      tier: 1,
    });
    expect(result.run.equipment.boots).toEqual({
      defId: 'leather-boots',
      tier: 1,
    });
  });
});

describe('cámara del mundo', () => {
  it('escala 1:1 cuando la vista tiene el mismo tamaño que el mundo', () => {
    const camera = computeViewTransform(1440, 900, 1440, 900);
    expect(camera.scale).toBe(1);
    expect(camera.offsetX).toBe(0);
    expect(camera.offsetY).toBe(0);
  });

  it('al reducir la vista mantiene el centro del mundo en el centro de la vista', () => {
    const world = { width: 1440, height: 900 };
    const view = { width: 1000, height: 700 };
    const camera = computeViewTransform(world.width, world.height, view.width, view.height);

    const centerX = camera.offsetX + (world.width / 2) * camera.scale;
    const centerY = camera.offsetY + (world.height / 2) * camera.scale;
    expect(centerX).toBeCloseTo(view.width / 2);
    expect(centerY).toBeCloseTo(view.height / 2);
  });

  it('no deforma el mundo cuando cambia la relación de aspecto', () => {
    const camera = computeViewTransform(1440, 900, 800, 1000);
    expect(camera.scale).toBeCloseTo(800 / 1440);
    expect(camera.offsetY).toBeGreaterThan(0);
  });

  it('el zoom simulado (mitad de viewport) escala el mundo a la mitad', () => {
    const camera = computeViewTransform(1440, 900, 720, 450);
    expect(camera.scale).toBeCloseTo(0.5);
    expect(camera.offsetX).toBeCloseTo(0);
    expect(camera.offsetY).toBeCloseTo(0);
  });
});

describe('meta-progresión', () => {
  it('las monedas crecen con el nivel alcanzado', () => {
    expect(coinsForRun(5, 20)).toBeGreaterThan(coinsForRun(1, 0));
    expect(coinsForRun(1, 0)).toBeGreaterThanOrEqual(5);
  });

  it('comprar una mejora descuenta monedas y sube el nivel', () => {
    const meta = { ...defaultMeta(), coins: 200 };
    const cost = metaUpgradeCost('refactor', 0);
    const result = buyMetaUpgrade(meta, 'refactor');
    expect(result.ok).toBe(true);
    expect(result.meta.coins).toBe(200 - cost);
    expect(result.meta.upgrades.refactor).toBe(1);
  });

  it('no permite comprar sin monedas ni pasar del máximo', () => {
    const poor = buyMetaUpgrade(defaultMeta(), 'docs');
    expect(poor.ok).toBe(false);

    let maxed = { ...defaultMeta(), coins: 999999 };
    for (let i = 0; i < MAX_META_LEVEL + 2; i++) {
      maxed = buyMetaUpgrade(maxed, 'linter').meta;
    }
    expect(maxed.upgrades.linter).toBe(MAX_META_LEVEL);
    expect(buyMetaUpgrade(maxed, 'linter').ok).toBe(false);
  });

  it('las mejoras permanentes se aplican al loadout', () => {
    const meta = {
      ...defaultMeta(),
      upgrades: { refactor: 2, coffee: 2, docs: 3, linter: 1, firewall: 2 },
    };
    const base = {
      maxHp: 100,
      damage: 10,
      attackInterval: 1,
      range: 280,
      projectileSpeed: 560,
      damageReduction: 0,
      critChance: 0,
      critMultiplier: 1.8,
      extraProjectiles: 0,
      pierce: 0,
      lifesteal: 0,
      xpGain: 1,
      regen: 0,
    };
    const boosted = applyMetaToLoadout(base, meta);
    const bonus = metaBonuses(meta);
    expect(boosted.maxHp).toBe(100 + bonus.maxHp);
    expect(boosted.damage).toBeGreaterThan(base.damage);
    expect(boosted.attackInterval).toBeLessThan(base.attackInterval);
    expect(boosted.range).toBeGreaterThan(base.range);
    expect(boosted.damageReduction).toBeCloseTo(bonus.damageReduction);
  });

  it('al terminar una partida sube el récord y el contador de runs', () => {
    const meta = addRunRewards(defaultMeta(), 42, 7);
    expect(meta.coins).toBe(42);
    expect(meta.bestLevel).toBe(7);
    expect(meta.runs).toBe(1);
  });
});

describe('banco de preguntas', () => {  it('todas las preguntas tienen 4 opciones y una respuesta válida', () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(40);
    expect(QUESTION_COUNT).toBe(QUESTIONS.length);
    for (const question of QUESTIONS) {
      expect(question.options).toHaveLength(4);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
      expect(question.explanation.length).toBeGreaterThan(10);
    }
  });

  it('no hay ids repetidos', () => {
    const ids = new Set(QUESTIONS.map((question) => question.id));
    expect(ids.size).toBe(QUESTIONS.length);
  });

  it('baraja las opciones sin romper la respuesta correcta', () => {
    for (let i = 0; i < 60; i++) {
      const picked = pickQuestion([]);
      const original = QUESTIONS.find((question) => question.id === picked.id)!;
      expect(picked.options).toHaveLength(4);
      expect(new Set(picked.options).size).toBe(4);
      expect(picked.options[picked.answer]).toBe(original.options[original.answer]);
    }
  });

  it('respeta el ciclo sin repetir hasta agotar el banco', () => {
    const used = QUESTIONS.slice(0, QUESTION_COUNT - 1).map((question) => question.id);
    const last = QUESTIONS[QUESTION_COUNT - 1]!;
    const picked = pickQuestion(used);
    expect(picked.id).toBe(last.id);
  });
});
