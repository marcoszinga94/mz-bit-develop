import {
  MAX_META_LEVEL,
  META_UPGRADES,
  metaUpgradeCost,
  type MetaState,
  type MetaUpgradeKey,
} from '../game/meta';

interface MetaShopProps {
  meta: MetaState;
  onBuy: (key: MetaUpgradeKey) => void;
  onClose: () => void;
}

export default function MetaShop({ meta, onBuy, onClose }: MetaShopProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6">
      <div className="animate-pop panel flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-mint/25 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-6">
          <div>
            <p className="font-mono text-[10px] text-mint/70">
              root@bitdevelop:~$ <span className="text-slate-400">./upgrades</span>
              <span className="cursor-blink text-mint">▌</span>
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-50 sm:text-3xl">
              Mejoras permanentes
            </h2>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-400">
              Invierte las monedas que ganas al caer. Estas mejoras se aplican a
              todas tus próximas partidas.
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <div className="rounded-full border border-gold/35 bg-gold/10 px-3 py-1.5 font-mono text-sm font-bold text-gold">
              🪙 {meta.coins}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost px-3 py-1.5 text-xs"
              aria-label="Cerrar mejoras permanentes"
            >
              ✕ Cerrar
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-2.5 overflow-y-auto p-3 sm:grid-cols-2 sm:p-5">
          {META_UPGRADES.map((def) => {
            const level = meta.upgrades[def.key];
            const maxed = level >= MAX_META_LEVEL;
            const cost = metaUpgradeCost(def.key, level);
            const affordable = meta.coins >= cost;
            const disabled = maxed || !affordable;

            return (
              <div
                key={def.key}
                className={`rounded-xl border p-3.5 transition ${
                  maxed
                    ? 'border-mint/30 bg-mint/5'
                    : 'border-white/10 bg-black/25'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-lg">
                    <span aria-hidden="true">{def.icon}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                      <p className="text-sm font-bold text-slate-100">{def.name}</p>
                      <span className="font-mono text-[10px] text-slate-400">
                        {level}/{MAX_META_LEVEL}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
                      {def.description}
                    </p>

                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex gap-1" aria-hidden="true">
                        {Array.from({ length: MAX_META_LEVEL }, (_, index) => (
                          <span
                            key={index}
                            className={`h-1.5 w-4 rounded-full ${
                              index < level ? 'bg-mint' : 'bg-white/10'
                            }`}
                          />
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => onBuy(def.key)}
                        disabled={disabled}
                        className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition ${
                          maxed
                            ? 'border-mint/30 bg-mint/10 text-mint/70'
                            : affordable
                              ? 'border-gold/40 bg-gold/10 text-gold hover:bg-gold/20'
                              : 'border-white/10 bg-white/5 text-slate-500'
                        } disabled:cursor-not-allowed`}
                      >
                        {maxed ? 'Máximo' : `🪙 ${cost}`}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-white/10 px-4 py-3 text-[11px] text-slate-500 sm:px-6">
          Récord: build {meta.bestLevel} · Runs: {meta.runs}. Ganas monedas
          según el nivel alcanzado y los enemigos derrotados.
        </div>
      </div>
    </div>
  );
}
