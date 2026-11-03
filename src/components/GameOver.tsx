import { formatTime } from '../game/format';
import type { Snapshot } from '../game/types';

interface GameOverProps {
  snapshot: Snapshot;
  level: number;
  onRetry: () => void;
}

export default function GameOver({ snapshot, level, onRetry }: GameOverProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="animate-pop panel w-full max-w-md rounded-2xl border border-danger/30 p-6 text-center shadow-2xl sm:p-8">
        <div className="mb-3 text-4xl" aria-hidden="true">
          💀
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-danger/80">
          Fin de la partida
        </p>
        <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-50">
          HAS CAÍDO
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          La horda pudo contigo. El nivel y el equipo se reinician.
        </p>

        <div className="mt-6 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-white/10 bg-black/25 px-2 py-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">
              Nivel
            </p>
            <p className="mt-1 font-mono text-xl font-bold text-mint">{level}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/25 px-2 py-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">
              Kills
            </p>
            <p className="mt-1 font-mono text-xl font-bold text-gold">
              {snapshot.kills}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/25 px-2 py-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">
              Tiempo
            </p>
            <p className="mt-1 font-mono text-xl font-bold text-slate-200">
              {formatTime(snapshot.time)}
            </p>
          </div>
        </div>

        <button type="button" onClick={onRetry} className="btn-primary mt-6 w-full">
          Intentar de nuevo <span aria-hidden="true">→</span>
        </button>
        <p className="mt-3 text-[10px] text-slate-500">
          Consejo: prioriza vida y daño, y responde con calma.
        </p>
      </div>
    </div>
  );
}
