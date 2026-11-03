import { useEffect } from 'react';
import { ITEM_BY_ID, itemValue } from '../game/equipment';
import type { Reward } from '../game/types';

interface RewardModalProps {
  rewards: Reward[];
  level: number;
  onPick: (reward: Reward) => void;
}

function rewardDetail(reward: Reward): string {
  if (reward.kind === 'upgrade') return reward.desc;
  const def = ITEM_BY_ID[reward.defId];
  if (!def) return reward.desc;
  const value = itemValue({ defId: reward.defId, tier: reward.tier });
  if (def.stat === 'attackSpeed') return `+${Math.round(value * 1000) / 10}% velocidad de ataque`;
  if (def.stat === 'maxHp') return `+${value} vida máxima`;
  if (def.stat === 'range') return `+${value} alcance`;
  return `+${value} daño`;
}

export default function RewardModal({ rewards, level, onPick }: RewardModalProps) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const index = Number(event.key) - 1;
      if (Number.isInteger(index) && index >= 0 && index < rewards.length) {
        event.preventDefault();
        onPick(rewards[index]!);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [rewards, onPick]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reward-title"
    >
      <div className="animate-pop panel max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-gold/25 p-5 shadow-2xl sm:p-7">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <span className="badge border-gold/35 bg-gold/10 text-gold">
            🏆 BUILD {level} OK
          </span>
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Selecciona 1 parche
          </span>
        </div>
        <h2
          id="reward-title"
          className="mt-3 text-xl font-black tracking-tight text-slate-50 sm:text-2xl"
        >
          Deploy de sistema
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Aplica un parche al sistema. Las piezas iguales de hardware se
          fusionan solas al recogerlas.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {rewards.map((reward, index) => {
            const isItem = reward.kind === 'item';
            return (
              <button
                key={`${reward.kind}-${reward.title}-${index}`}
                type="button"
                onClick={() => onPick(reward)}
                className={`group relative flex flex-col rounded-2xl border p-4 text-left transition duration-150 hover:-translate-y-1 ${
                  isItem
                    ? 'border-gold/30 bg-gold/[0.05] hover:border-gold/70 hover:bg-gold/[0.1]'
                    : 'border-mint/25 bg-mint/[0.04] hover:border-mint/70 hover:bg-mint/[0.09]'
                }`}
              >
                <span
                  className={`mb-3 inline-flex w-fit items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] ${
                    isItem
                      ? 'bg-gold/15 text-gold'
                      : 'bg-mint/15 text-mint'
                  }`}
                >
                  {isItem ? 'Hardware' : 'Software'}
                </span>

                <span className="mb-2 text-3xl" aria-hidden="true">
                  {reward.icon}
                </span>
                <span className="text-sm font-bold leading-tight text-slate-50">
                  {reward.title}
                </span>
                <span className="mt-1.5 text-xs leading-relaxed text-slate-400">
                  {isItem ? reward.desc : rewardDetail(reward)}
                </span>

                {isItem && (
                  <span className="mt-3 border-t border-white/5 pt-2 text-[11px] font-semibold text-slate-300">
                    {rewardDetail(reward)}
                  </span>
                )}

                <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 transition group-hover:text-slate-200">
                  Instalar <span aria-hidden="true">→</span>
                </span>

                <span className="absolute right-3 top-3 font-mono text-[10px] text-slate-600">
                  [{index + 1}]
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-center text-[11px] text-slate-500">
          Atajos de teclado: 1, 2 o 3
        </p>
      </div>
    </div>
  );
}
