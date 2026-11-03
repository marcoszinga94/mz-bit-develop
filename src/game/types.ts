export type Phase = 'start' | 'playing' | 'question' | 'reward' | 'dead';

export type Slot = 'weapon' | 'armor' | 'ring' | 'boots';

export type UpgradeKey = 'damage' | 'attackSpeed' | 'vitality' | 'range';

export type ItemStat = 'damage' | 'maxHp' | 'attackSpeed' | 'range';

export interface ItemDef {
  id: string;
  name: string;
  slot: Slot;
  icon: string;
  stat: ItemStat;
  base: number;
  flavor: string;
}

export interface Item {
  defId: string;
  tier: number;
}

export type Equipment = Record<Slot, Item | null>;

export interface Upgrades {
  damage: number;
  attackSpeed: number;
  vitality: number;
  range: number;
}

export interface Loadout {
  maxHp: number;
  damage: number;
  attackInterval: number;
  range: number;
  projectileSpeed: number;
}

export interface RunState {
  level: number;
  xp: number;
  upgrades: Upgrades;
  equipment: Equipment;
}

export interface Snapshot {
  hp: number;
  maxHp: number;
  kills: number;
  time: number;
  enemyCount: number;
}

export interface Question {
  id: string;
  topic: string;
  difficulty: 1 | 2 | 3;
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
}

export type Reward =
  | {
      kind: 'upgrade';
      key: UpgradeKey;
      title: string;
      desc: string;
      icon: string;
    }
  | {
      kind: 'item';
      defId: string;
      title: string;
      desc: string;
      icon: string;
      tier: number;
    };

export interface SaveData {
  version: 1;
  level: number;
  xp: number;
  upgrades: Upgrades;
  equipment: Equipment;
  hp: number;
  kills: number;
  time: number;
  usedQuestions: string[];
  savedAt: number;
}
