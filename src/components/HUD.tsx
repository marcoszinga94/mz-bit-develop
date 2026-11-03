import { formatTime } from '../game/format';
import type { Snapshot } from '../game/types';

interface HUDProps {
  snapshot: Snapshot;
  level: number;
  xp: number;
  xpNeed: number;
  muted: boolean;
  musicOn: boolean;
  onToggleMute: () => void;
  onToggleMusic: () => void;
}

export default function HUD({
  snapshot,
  level,
  xp,
  xpNeed,
  muted,
  musicOn,
  onToggleMute,
  onToggleMusic,
}: HUDProps) {
  const hpRatio = Math.max(0, Math.min(1, snapshot.hp / Math.max(1, snapshot.maxHp)));
  const xpRatio = Math.max(0, Math.min(1, xp / Math.max(1, xpNeed)));

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-2 p-3 sm:p-5 md:flex-row md:items-start md:justify-between md:gap-3">
      <div className="panel-soft w-full rounded-2xl p-3 sm:p-4 md:w-[min(460px,74vw)]">
        <div className="mb-2 flex items-center justify-between gap-2 text-[8px] font-bold uppercase tracking-[0.18em] text-mint/60">
          <span className="flex items-center gap-1.5">
            <span className="h-1 w-1 animate-pulse rounded-full bg-mint" />
            SISTEMA ONLINE
          </span>
          <span className="font-mono text-slate-500">BUILD {level}.0</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border border-mint/40 bg-mint/10">
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-mint/80">
              LVL
            </span>
            <span className="text-xl font-black leading-none text-white">{level}</span>
          </div>

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.14em]">
              <span className="text-danger/90">Integridad</span>
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
              <span className="text-mint/80">Compilación</span>
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

      <div className="flex flex-wrap items-center justify-between gap-2 md:flex-col md:items-end">
        <div className="panel-soft flex items-center gap-3 rounded-xl px-3 py-2 text-xs text-slate-300">
          {snapshot.combo >= 2 && (
            <span
              className="flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-gold"
              title="Racha de bugs eliminados: multiplica la compilación"
            >
              <span aria-hidden="true">⚡</span>
              <b className="font-mono text-[10px]">x{snapshot.comboMult.toFixed(2)}</b>
              <span className="hidden text-[8px] font-bold uppercase tracking-[0.12em] sm:inline">
                combo
              </span>
            </span>
          )}
          <span className="flex items-center gap-1.5" title="Bugs eliminados">
            <span aria-hidden="true">🐛</span>
            <b className="font-mono text-slate-100">{snapshot.kills}</b>
            <span className="hidden text-[9px] uppercase tracking-[0.12em] text-slate-500 sm:inline">
              bugs
            </span>
          </span>
          <span className="h-3 w-px bg-white/10" />
          <span className="flex items-center gap-1.5" title="Tiempo de ejecución">
            <span aria-hidden="true">⏱️</span>
            <b className="font-mono text-slate-100">{formatTime(snapshot.time)}</b>
            <span className="hidden text-[9px] uppercase tracking-[0.12em] text-slate-500 sm:inline">
              uptime
            </span>
          </span>
        </div>

        <div className="panel-soft flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px]">
          <span className="flex items-center gap-1.5 text-mint">
            <span aria-hidden="true">🌊</span>
            <b className="font-mono text-slate-100">{snapshot.wave}</b>
            <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">
              oleada
            </span>
          </span>
          <span className="h-2.5 w-px bg-white/10" />
          <span
            className="font-mono text-slate-400"
            title="Tiempo hasta la siguiente oleada"
          >
            {formatTime(snapshot.waveTimer)}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <button
            type="button"
            onClick={onToggleMute}
            className="btn-ghost pointer-events-auto px-2.5 py-1.5 text-[11px]"
            aria-label={muted ? 'Activar sonido' : 'Silenciar sonido'}
            aria-pressed={!muted}
          >
            <span aria-hidden="true">{muted ? '🔇' : '🔊'}</span>
            <span className="hidden sm:inline">{muted ? 'MUTE' : 'AUDIO'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleMusic}
            className="btn-ghost pointer-events-auto px-2.5 py-1.5 text-[11px]"
            aria-label={musicOn ? 'Silenciar música' : 'Activar música'}
            aria-pressed={musicOn}
          >
            <span aria-hidden="true" className={musicOn ? undefined : 'opacity-40'}>
              🎵
            </span>
            <span className="hidden sm:inline">
              {musicOn ? 'MÚSICA' : 'MÚSICA OFF'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
