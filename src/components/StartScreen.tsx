import type { SaveData } from '../game/types';

interface StartScreenProps {
  save: SaveData | null;
  muted: boolean;
  onStart: () => void;
  onContinue: () => void;
  onToggleMute: () => void;
}

const FEATURES = [
  {
    icon: '⚔️',
    title: 'Combate automático',
    text: 'Tu caballero ataca solo al enemigo más cercano. Tú solo piensas.',
  },
  {
    icon: '🧠',
    title: 'Sube de nivel',
    text: 'Cada nivel es una pregunta de programación. Acierta para elegir recompensa.',
  },
  {
    icon: '🧬',
    title: 'Fusiona equipo',
    text: 'Dos piezas iguales se combinan y suben de tier. Junta cuatro slots.',
  },
];

export default function StartScreen({
  save,
  muted,
  onStart,
  onContinue,
  onToggleMute,
}: StartScreenProps) {
  return (
    <div className="absolute inset-0 z-30 overflow-y-auto bg-gradient-to-b from-ink/95 via-ink/90 to-ink/95">
      <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col items-center justify-center px-4 py-8 text-center sm:py-10">
        <button
          type="button"
          onClick={onToggleMute}
          className="btn-ghost absolute right-4 top-4 px-3 py-2 text-xs"
          aria-label={muted ? 'Activar sonido' : 'Silenciar sonido'}
        >
          {muted ? '🔇' : '🔊'}
          <span className="hidden sm:inline">{muted ? 'Sonido off' : 'Sonido on'}</span>
        </button>

        <span className="badge animate-fade-up mb-4 sm:mb-6">
          Prototipo · 20 preguntas · 1 zona
        </span>

        <div className="animate-float mb-2 text-4xl sm:mb-4 sm:text-6xl" aria-hidden="true">
          ⚔️
        </div>

        <h1 className="animate-fade-up title-glow text-5xl font-black tracking-tight sm:text-8xl">
          <span className="text-slate-50">BIT</span>{' '}
          <span className="text-mint">KNIGHT</span>
        </h1>

        <p className="animate-fade-up mt-3 max-w-xl text-balance text-sm leading-relaxed text-slate-300 sm:mt-4 sm:text-base">
          Un action RPG idle donde el héroe pelea solo. Cada subida de nivel te
          lanza una pregunta de programación: acierta, elige mejora o
          equipamiento, y aguanta la siguiente oleada.
        </p>

        <div className="animate-fade-up mt-6 hidden w-full gap-3 sm:mt-8 sm:grid sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="panel rounded-2xl px-4 py-4 text-left"
            >
              <div className="mb-2 text-xl" aria-hidden="true">
                {feature.icon}
              </div>
              <p className="text-sm font-bold text-slate-100">{feature.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                {feature.text}
              </p>
            </div>
          ))}
        </div>

        <div className="animate-fade-up mt-6 grid w-full grid-cols-3 gap-2 sm:hidden">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="panel rounded-xl px-2 py-2.5 text-center"
            >
              <div className="text-lg" aria-hidden="true">
                {feature.icon}
              </div>
              <p className="mt-1 text-[9px] font-bold leading-tight text-slate-300">
                {feature.title}
              </p>
            </div>
          ))}
        </div>

        <div className="animate-fade-up mt-6 flex w-full flex-col items-center justify-center gap-3 sm:mt-8 sm:flex-row">
          <button type="button" onClick={onStart} className="btn-primary w-full sm:w-auto">
            {save ? 'Nueva partida' : 'Jugar'} <span aria-hidden="true">→</span>
          </button>

          {save && (
            <button
              type="button"
              onClick={onContinue}
              className="btn-ghost w-full px-6 py-3 sm:w-auto"
            >
              Continuar · Nv. {save.level}
              <span className="font-mono text-xs text-slate-500">
                {save.kills} kills
              </span>
            </button>
          )}
        </div>

        <p className="animate-fade-up mt-4 max-w-md text-[11px] leading-relaxed text-slate-500 sm:mt-6">
          Fallar una pregunta te hace perder el nivel pendiente y el 50% del XP.
          La partida se guarda automáticamente en este navegador.
        </p>
      </div>
    </div>
  );
}
