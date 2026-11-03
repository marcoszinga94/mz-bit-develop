import { formatTime } from '../game/format';
import type { Snapshot } from '../game/types';

interface HUDProps {
  snapshot: Snapshot;
  level: number;
  xp: number;
  xpNeed: number;
  muted: boolean;
  onToggleMute: () => void;
}

export default function HUD({
  snapshot,
  level,
  xp,
  xpNeed,
  muted,
  onToggleMute,
}: HUDProps) {
  const hpRatio = Math.max(0, Math.min(1, snapshot.hp / Math.max(1, snapshot.maxHp)));
  const xpRatio = Math.max(0, Math.min(1, xp / Math.max(1, xpNeed)));

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3 sm:p-5">
      <div className="panel-soft w-[min(460px,74vw)] rounded-2xl p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border border-mint/40 bg-mint/10">
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-mint/80">
              Nv
            </span>
            <span className="text-xl font-black leading-none text-white">{level}</span>
          </div>

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.14em]">
              <span className="text-danger/90">Vida</span>
              <span className="font-mono text-[11px] text-slate-300">
                {snapshot.hp} / {snapshot.maxHp}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full border border-white/10 bg-black/50">
              <div
                className="stat-bar bg-gradient-to-r from-rose-500 to-danger shadow-[0_0_12px_rgba(255,93,115,0.45)]"
                style={{ width: `${hpRatio * 100}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.14em]">
              <span className="text-mint/80">Experiencia</span>
              <span className="font-mono text-[10px] text-slate-400">
                {Math.min(xp, xpNeed)} / {xpNeed}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full border border-white/10 bg-black/50">
              <div
                className="stat-bar bg-gradient-to-r from-mint to-cyan-400 shadow-[0_0_10px_rgba(77,226,197,0.45)]"
                style={{ width: `${xpRatio * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-end gap-2">
        <div className="panel-soft flex items-center gap-3 rounded-xl px-3 py-2 text-xs text-slate-300">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true">☠️</span>
            <b className="font-mono text-slate-100">{snapshot.kills}</b>
          </span>
          <span className="h-3 w-px bg-white/10" />
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true">⏱️</span>
            <b className="font-mono text-slate-100">{formatTime(snapshot.time)}</b>
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleMute}
          className="btn-ghost pointer-events-auto px-2.5 py-1.5 text-[11px]"
          aria-label={muted ? 'Activar sonido' : 'Silenciar sonido'}
        >
          <span aria-hidden="true">{muted ? '🔇' : '🔊'}</span>
          <span className="hidden sm:inline">{muted ? 'Off' : 'On'}</span>
        </button>
      </div>
    </div>
  );
}
