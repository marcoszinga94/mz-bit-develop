import {
  ITEM_BY_ID,
  SLOT_LABEL,
  SLOT_ORDER,
  SLOT_SHORT_LABEL,
  itemValue,
} from '../game/equipment';
import { pow2Label } from '../game/format';
import type { Equipment, ItemStat, Loadout } from '../game/types';

interface EquipmentPanelProps {
  equipment: Equipment;
  loadout: Loadout;
}

const STAT_LABEL: Record<ItemStat, string> = {
  damage: 'daño',
  maxHp: 'vida',
  attackSpeed: 'vel. ataque',
  range: 'alcance',
};

function formatStat(stat: ItemStat, value: number): string {
  if (stat === 'attackSpeed') return `+${Math.round(value * 1000) / 10}% ${STAT_LABEL[stat]}`;
  return `+${value} ${STAT_LABEL[stat]}`;
}

function MiniStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg bg-black/20 px-1 py-1" title={hint}>
      <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="font-mono text-[10px] font-semibold text-slate-200">{value}</p>
    </div>
  );
}

export default function EquipmentPanel({
  equipment,
  loadout,
}: EquipmentPanelProps) {
  return (
    <div className="pointer-events-auto absolute bottom-3 right-3 z-20 w-[190px] sm:w-[248px]">
      <div className="panel-soft rounded-2xl p-2 sm:p-3">
        <div className="mb-1.5 flex items-center justify-between sm:mb-2">
          <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.22em] text-slate-400">
            <span className="h-1 w-1 rounded-full bg-mint/70" />
            Hardware
          </span>
          <span className="text-[9px] font-mono text-gold/80">
            {Object.values(equipment).filter(Boolean).length}/4
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {SLOT_ORDER.map((slot) => {
            const item = equipment[slot];
            const def = item ? ITEM_BY_ID[item.defId] : null;
            return (
              <div
                key={slot}
                title={
                  item && def
                    ? `${def.name} ${'★'.repeat(item.tier)} · ${formatStat(def.stat, itemValue(item))}`
                    : `${SLOT_LABEL[slot]}: vacío`
                }
                className={`rounded-xl border px-2 py-1.5 ${
                  item
                    ? 'border-gold/30 bg-gold/[0.06]'
                    : 'border-white/10 bg-black/20'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-base leading-none" aria-hidden="true">
                    {def?.icon ?? '·'}
                  </span>
                  <div className="min-w-0">
                    <p
                      className={`truncate text-[10px] font-semibold ${
                        item ? 'text-slate-100' : 'text-slate-500'
                      }`}
                    >
                      {def?.name ?? (
                        <>
                          <span className="sm:hidden">{SLOT_SHORT_LABEL[slot]}</span>
                          <span className="hidden sm:inline">{SLOT_LABEL[slot]}</span>
                        </>
                      )}
                    </p>
                    {item && (
                      <p className="text-[9px] leading-tight text-gold">
                        {'★'.repeat(item.tier)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-2 hidden grid-cols-4 gap-1 border-t border-white/5 pt-2 sm:grid">
          <MiniStat
            label="Daño"
            value={pow2Label(loadout.damage)}
            hint={`${loadout.damage.toFixed(1)} de daño`}
          />
          <MiniStat
            label="Frec"
            value={`${pow2Label(1 / loadout.attackInterval)}/s`}
            hint={`${(1 / loadout.attackInterval).toFixed(1)} ataques/s`}
          />
          <MiniStat
            label="HP"
            value={pow2Label(loadout.maxHp)}
            hint={`${loadout.maxHp} de vida`}
          />
          <MiniStat
            label="Alcance"
            value={pow2Label(loadout.range)}
            hint={`${loadout.range} px`}
          />
        </div>
      </div>
    </div>
  );
}
