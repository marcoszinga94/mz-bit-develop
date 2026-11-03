import { useEffect } from 'react';
import type { Question } from '../game/types';

export type Feedback = 'idle' | 'correct' | 'wrong';

interface QuestionModalProps {
  question: Question;
  level: number;
  feedback: Feedback;
  selected: number | null;
  onAnswer: (index: number) => void;
  onContinue: () => void;
}

export default function QuestionModal({
  question,
  level,
  feedback,
  selected,
  onAnswer,
  onContinue,
}: QuestionModalProps) {
  const answered = feedback !== 'idle';

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (answered) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onContinue();
        }
        return;
      }
      const index = Number(event.key) - 1;
      if (Number.isInteger(index) && index >= 0 && index < question.options.length) {
        event.preventDefault();
        onAnswer(index);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [answered, question, onAnswer, onContinue]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="question-title"
    >
      <div className="animate-pop panel max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-mint/25 p-5 shadow-2xl sm:p-7">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <span className="badge">⚡ Sube de nivel</span>
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Nv. {level} → {level + 1}
          </span>
        </div>

        <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          <span className="rounded-md bg-white/5 px-2 py-0.5">{question.topic}</span>
          <span
            className="flex gap-0.5"
            title={`Dificultad ${question.difficulty} de 3`}
            aria-label={`Dificultad ${question.difficulty} de 3`}
          >
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className={n <= question.difficulty ? 'text-gold' : 'text-slate-700'}
              >
                ◆
              </span>
            ))}
          </span>
        </div>

        <h2
          id="question-title"
          className="mb-5 text-lg font-bold leading-snug text-slate-50 sm:text-xl"
        >
          {question.prompt}
        </h2>

        <div className="space-y-2">
          {question.options.map((option, index) => {
            const isAnswer = index === question.answer;
            const isSelected = index === selected;
            let tone = 'border-edge bg-panel2/60 hover:border-mint/60 hover:bg-panel2';
            if (answered && isAnswer) {
              tone = 'border-emerald-400/70 bg-emerald-400/10';
            } else if (answered && isSelected) {
              tone = 'border-danger/70 bg-danger/10';
            } else if (answered) {
              tone = 'border-edge/60 bg-panel2/30 opacity-55';
            }

            return (
              <button
                key={index}
                type="button"
                disabled={answered}
                onClick={() => onAnswer(index)}
                className={`flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition ${tone} ${
                  answered ? 'cursor-default' : 'cursor-pointer'
                }`}
              >
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-[11px] font-bold ${
                    answered && isAnswer
                      ? 'border-emerald-400/60 bg-emerald-400/15 text-emerald-300'
                      : answered && isSelected
                        ? 'border-danger/60 bg-danger/15 text-danger'
                        : 'border-white/10 bg-black/30 text-slate-400'
                  }`}
                >
                  {index + 1}
                </span>
                <span className="text-sm leading-relaxed text-slate-200">{option}</span>
                {answered && isAnswer && (
                  <span className="ml-auto font-bold text-emerald-400" aria-hidden="true">
                    ✓
                  </span>
                )}
                {answered && isSelected && !isAnswer && (
                  <span className="ml-auto font-bold text-danger" aria-hidden="true">
                    ✕
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {answered ? (
          <div
            className={`mt-4 rounded-xl border p-3.5 ${
              feedback === 'correct'
                ? 'border-emerald-400/30 bg-emerald-400/5'
                : 'border-danger/30 bg-danger/5'
            }`}
          >
            <p
              className={`text-sm font-bold ${
                feedback === 'correct' ? 'text-emerald-300' : 'text-danger'
              }`}
            >
              {feedback === 'correct'
                ? '¡Correcto! Nivel superado.'
                : 'Incorrecto.'}
            </p>
            {feedback === 'wrong' && (
              <p className="mt-1 text-xs leading-relaxed text-slate-300">
                La respuesta correcta era{' '}
                <b className="text-emerald-300">{question.options[question.answer]}</b>.
                Pierdes el nivel pendiente y el 50% del XP.
              </p>
            )}
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              {question.explanation}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-center text-[11px] text-slate-500">
            Elige una respuesta · teclas 1-{question.options.length}
          </p>
        )}

        {answered && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onContinue}
              className={feedback === 'correct' ? 'btn-primary' : 'btn-ghost'}
            >
              {feedback === 'correct' ? 'Elegir recompensa →' : 'Continuar'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
