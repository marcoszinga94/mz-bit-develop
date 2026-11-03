import { ITEM_BY_ID, MAX_TIER } from './equipment';
import type { Equipment, SaveData, Slot, Upgrades } from './types';

const SAVE_KEY = 'bit-develop-save-v1';
const MUTE_KEY = 'bit-develop-muted';
const MUSIC_KEY = 'bit-develop-music';
// Claves antiguas: se migran al cargar para no perder partidas.
const LEGACY_SAVE_KEY = 'bit-knight-save-v1';
const LEGACY_MUTE_KEY = 'bit-knight-muted';
const LEGACY_MUSIC_KEY = 'bit-knight-music';

const SLOTS: Slot[] = ['weapon', 'armor', 'ring', 'boots'];

function storageAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function saveRun(
  data: Omit<SaveData, 'version' | 'savedAt'>,
): void {
  if (!storageAvailable()) return;
  try {
    const payload: SaveData = {
      ...data,
      version: 1,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  } catch {
    // Sin espacio o almacenamiento bloqueado: el juego sigue sin guardar.
  }
}

function sanitizeUpgrades(value: unknown): Upgrades | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const keys: (keyof Upgrades)[] = [
    'damage',
    'attackSpeed',
    'vitality',
    'range',
    'crit',
    'multishot',
    'pierce',
    'lifesteal',
    'xpGain',
  ];
  const result: Upgrades = {
    damage: 0,
    attackSpeed: 0,
    vitality: 0,
    range: 0,
    crit: 0,
    multishot: 0,
    pierce: 0,
    lifesteal: 0,
    xpGain: 0,
  };

  for (const key of keys) {
    const amount = raw[key];
    // Las partidas antiguas no tienen las mejoras nuevas: se asumen a 0.
    if (amount === undefined) continue;
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) {
      return null;
    }
    result[key] = Math.floor(amount);
  }

  return result;
}

function sanitizeEquipment(value: unknown): Equipment | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const result: Equipment = { weapon: null, armor: null, ring: null, boots: null };

  for (const slot of SLOTS) {
    const item = raw[slot];
    if (item === null || item === undefined) continue;
    if (typeof item !== 'object') return null;

    const candidate = item as { defId?: unknown; tier?: unknown };
    if (typeof candidate.defId !== 'string' || !ITEM_BY_ID[candidate.defId]) {
      return null;
    }
    if (typeof candidate.tier !== 'number' || !Number.isFinite(candidate.tier)) {
      return null;
    }
    const tier = Math.floor(candidate.tier);
    if (tier < 1 || tier > MAX_TIER) return null;
    result[slot] = { defId: candidate.defId, tier };
  }

  return result;
}

export function loadGame(): SaveData | null {
  if (!storageAvailable()) return null;
  try {
    let raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) {
      raw = window.localStorage.getItem(LEGACY_SAVE_KEY);
      if (raw) window.localStorage.setItem(SAVE_KEY, raw);
    }
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SaveData>;

    if (
      parsed.version !== 1 ||
      typeof parsed.level !== 'number' ||
      !Number.isFinite(parsed.level) ||
      parsed.level < 1 ||
      typeof parsed.xp !== 'number' ||
      !Number.isFinite(parsed.xp) ||
      typeof parsed.hp !== 'number' ||
      !Number.isFinite(parsed.hp) ||
      parsed.hp <= 0
    ) {
      return null;
    }

    const upgrades = sanitizeUpgrades(parsed.upgrades);
    const equipment = sanitizeEquipment(parsed.equipment);
    if (!upgrades || !equipment) return null;

    return {
      version: 1,
      level: Math.floor(parsed.level),
      xp: Math.max(0, Math.floor(parsed.xp)),
      upgrades,
      equipment,
      hp: parsed.hp,
      kills:
        typeof parsed.kills === 'number' && Number.isFinite(parsed.kills)
          ? Math.max(0, Math.floor(parsed.kills))
          : 0,
      time:
        typeof parsed.time === 'number' && Number.isFinite(parsed.time)
          ? Math.max(0, parsed.time)
          : 0,
      usedQuestions: Array.isArray(parsed.usedQuestions)
        ? parsed.usedQuestions.filter((id): id is string => typeof id === 'string')
        : [],
      savedAt:
        typeof parsed.savedAt === 'number' && Number.isFinite(parsed.savedAt)
          ? parsed.savedAt
          : 0,
    };
  } catch {
    return null;
  }
}

export function clearSave(): void {
  if (!storageAvailable()) return;
  try {
    window.localStorage.removeItem(SAVE_KEY);
    window.localStorage.removeItem(LEGACY_SAVE_KEY);
  } catch {
    // ignorado
  }
}

export function saveMuted(muted: boolean): void {
  if (!storageAvailable()) return;
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    window.localStorage.removeItem(LEGACY_MUTE_KEY);
  } catch {
    // ignorado
  }
}

export function loadMuted(): boolean {
  if (!storageAvailable()) return false;
  try {
    const value =
      window.localStorage.getItem(MUTE_KEY) ??
      window.localStorage.getItem(LEGACY_MUTE_KEY);
    return value === '1';
  } catch {
    return false;
  }
}

export function saveMusicEnabled(enabled: boolean): void {
  if (!storageAvailable()) return;
  try {
    window.localStorage.setItem(MUSIC_KEY, enabled ? '1' : '0');
    window.localStorage.removeItem(LEGACY_MUSIC_KEY);
  } catch {
    // ignorado
  }
}

export function loadMusicEnabled(): boolean {
  if (!storageAvailable()) return true;
  try {
    const value =
      window.localStorage.getItem(MUSIC_KEY) ??
      window.localStorage.getItem(LEGACY_MUSIC_KEY);
    return value !== '0';
  } catch {
    return true;
  }
}
