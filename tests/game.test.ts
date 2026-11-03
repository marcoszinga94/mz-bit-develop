import { describe, expect, it } from 'vitest';
import { computeViewTransform } from '../src/game/engine';
import {
  MAX_TIER,
  applyItem,
  emptyEquipment,
  equipmentBonuses,
  itemValue,
} from '../src/game/equipment';
import { applyReward, createRun, xpNeeded } from '../src/game/progression';
import { QUESTIONS } from '../src/game/questions';

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
    expect(bonus.damage).toBe(5);
    expect(bonus.maxHp).toBe(18);
    expect(bonus.attackSpeed).toBeCloseTo(0.08);
    expect(bonus.range).toBe(14);
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

describe('banco de preguntas', () => {
  it('todas las preguntas tienen 4 opciones y una respuesta válida', () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(20);
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
});
