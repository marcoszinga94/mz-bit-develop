import { formatTime } from '../game/format';
import type { Snapshot } from '../game/types';

interface GameOverProps {
  snapshot: Snapshot;
  level: number;
  coinsEarned: number;
  totalCoins: number;
  onRetry: () => void;
  onOpenShop: () => void;
}

export default function GameOver({
  snapshot,
  level,
  coinsEarned,
  totalCoins,
  onRetry,
  onOpenShop,
}: GameOverProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="animate-pop panel w-full max-w-md rounded-2xl border border-danger/30 p-6 text-center shadow-2xl sm:p-8">
        <div className="mb-3 text-4xl" aria-hidden="true">
          🐛
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-danger/80">
          Fin de la partida
        </p>
        <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-50">
          TE COMIÓ UN BUG
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          La horda de bugs pudo contigo. El build y el hardware se reinician,
          pero las monedas y las mejoras permanentes se conservan.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-black/25 px-2 py-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">
              Build
            </p>
            <p className="mt-1 font-mono text-xl font-bold text-mint">{level}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/25 px-2 py-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">
              Oleada
            </p>
            <p className="mt-1 font-mono text-xl font-bold text-mint">
              {snapshot.wave}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/25 px-2 py-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">
              Bugs
            </p>
            <p className="mt-1 font-mono text-xl font-bold text-gold">
              {snapshot.kills}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/25 px-2 py-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">
              Uptime
            </p>
            <p className="mt-1 font-mono text-xl font-bold text-slate-200">
              {formatTime(snapshot.time)}
            </p>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-gold/30 bg-gold/5 px-3 py-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-gold/80">
            Monedas ganadas
          </p>
          <p className="mt-1 font-mono text-2xl font-black text-gold">
            +{coinsEarned} 🪙
          </p>
          <p className="mt-0.5 text-[10px] text-slate-400">
            Cartera total: <b className="font-mono text-slate-200">{totalCoins}</b>
          </p>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={onOpenShop} className="btn-ghost px-4 py-3">
            🧪 Upgrades
          </button>
          <button type="button" onClick={onRetry} className="btn-primary px-4 py-3">
            Reiniciar <span aria-hidden="true">→</span>
          </button>
        </div>
        <p className="mt-3 text-[10px] text-slate-500">
          Consejo: documenta el código, toma café y no abras adjuntos sospechosos.
        </p>
        <p className="mt-1 font-mono text-[9px] text-slate-600">
          $ core dumped · retry --hard
        </p>
      </div>
    </div>
  );
}
