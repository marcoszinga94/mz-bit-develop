import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { setMuted as applyAudioMuted, sfx, unlockAudio } from '../game/audio';
import { GameEngine } from '../game/engine';
import { loadoutFromRun } from '../game/equipment';
import {
  KILL_XP,
  applyReward,
  createRun,
  generateRewards,
  xpNeeded,
} from '../game/progression';
import { pickQuestion } from '../game/questions';
import { clearSave, loadGame, loadMuted, saveMuted, saveRun } from '../game/save';
import type {
  Phase,
  Question,
  Reward,
  RunState,
  SaveData,
  Snapshot,
} from '../game/types';
import EquipmentPanel from './EquipmentPanel';
import GameOver from './GameOver';
import HUD from './HUD';
import QuestionModal, { type Feedback } from './QuestionModal';
import RewardModal from './RewardModal';
import StartScreen from './StartScreen';

const DEFAULT_SNAPSHOT: Snapshot = {
  hp: 100,
  maxHp: 100,
  kills: 0,
  time: 0,
  enemyCount: 0,
};

export default function GameShell() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [phase, setPhase] = useState<Phase>('start');
  const [run, setRun] = useState<RunState>(createRun);
  const [snapshot, setSnapshot] = useState<Snapshot>(DEFAULT_SNAPSHOT);
  const [question, setQuestion] = useState<Question | null>(null);
  const [feedback, setFeedback] = useState<Feedback>('idle');
  const [selected, setSelected] = useState<number | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [used, setUsed] = useState<string[]>([]);
  const [save, setSave] = useState<SaveData | null>(null);
  const [muted, setMutedState] = useState(false);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);

  const phaseRef = useRef(phase);
  const runRef = useRef(run);
  const snapshotRef = useRef(snapshot);
  const questionRef = useRef(question);
  const feedbackRef = useRef(feedback);
  const usedRef = useRef(used);
  const saveRef = useRef(save);

  phaseRef.current = phase;
  runRef.current = run;
  snapshotRef.current = snapshot;
  questionRef.current = question;
  feedbackRef.current = feedback;
  usedRef.current = used;
  saveRef.current = save;

  const loadout = useMemo(() => loadoutFromRun(run), [run]);

  const changePhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const persist = useCallback(() => {
    const currentPhase = phaseRef.current;
    if (
      currentPhase !== 'playing' &&
      currentPhase !== 'question' &&
      currentPhase !== 'reward'
    ) {
      return;
    }
    const currentRun = runRef.current;
    const currentSnapshot = snapshotRef.current;
    saveRun({
      level: currentRun.level,
      xp: currentRun.xp,
      upgrades: currentRun.upgrades,
      equipment: currentRun.equipment,
      hp: currentSnapshot.hp,
      kills: currentSnapshot.kills,
      time: currentSnapshot.time,
      usedQuestions: usedRef.current,
    });
  }, []);

  const handleKill = useCallback(() => {
    if (phaseRef.current !== 'playing') return;

    const current = runRef.current;
    const need = xpNeeded(current.level);
    const nextXp = current.xp + KILL_XP;

    if (nextXp < need) {
      const next = { ...current, xp: nextXp };
      runRef.current = next;
      setRun(next);
      return;
    }

    const next = { ...current, xp: nextXp };
    runRef.current = next;
    setRun(next);
    engineRef.current?.pause();

    const nextQuestion = pickQuestion(current.level, usedRef.current);
    const nextUsed = [...usedRef.current, nextQuestion.id];
    usedRef.current = nextUsed;
    setUsed(nextUsed);
    questionRef.current = nextQuestion;
    setQuestion(nextQuestion);
    feedbackRef.current = 'idle';
    setFeedback('idle');
    setSelected(null);
    changePhase('question');
    sfx.levelUp();
    persist();
  }, [changePhase, persist]);

  const handleDeath = useCallback(() => {
    if (phaseRef.current === 'dead') return;
    changePhase('dead');
    clearSave();
    setSave(null);
    sfx.death();
  }, [changePhase]);

  const handleAnswer = useCallback(
    (index: number) => {
      const currentQuestion = questionRef.current;
      if (!currentQuestion || feedbackRef.current !== 'idle') return;

      setSelected(index);

      if (index === currentQuestion.answer) {
        feedbackRef.current = 'correct';
        setFeedback('correct');
        sfx.correct();
        return;
      }

      feedbackRef.current = 'wrong';
      setFeedback('wrong');
      sfx.wrong();

      const need = xpNeeded(runRef.current.level);
      const next = { ...runRef.current, xp: Math.floor(need * 0.5) };
      runRef.current = next;
      setRun(next);
      persist();
    },
    [persist],
  );

  const handleContinue = useCallback(() => {
    if (feedbackRef.current === 'correct') {
      const nextRewards = generateRewards(runRef.current);
      setRewards(nextRewards);
      changePhase('reward');
      return;
    }

    questionRef.current = null;
    setQuestion(null);
    feedbackRef.current = 'idle';
    setFeedback('idle');
    setSelected(null);
    changePhase('playing');
    engineRef.current?.resume();
  }, [changePhase]);

  const handlePickReward = useCallback(
    (reward: Reward) => {
      const result = applyReward(runRef.current, reward);
      const next = result.run;
      runRef.current = next;
      setRun(next);

      const nextLoadout = loadoutFromRun(next);
      engineRef.current?.setDifficulty(next.level);
      engineRef.current?.setLoadout(nextLoadout);
      engineRef.current?.heal(nextLoadout.maxHp * 0.15);

      setRewards([]);
      questionRef.current = null;
      setQuestion(null);
      feedbackRef.current = 'idle';
      setFeedback('idle');
      setSelected(null);
      changePhase('playing');
      engineRef.current?.resume();

      setToast({ id: Date.now(), message: result.message });
      if (reward.kind === 'item') sfx.merge();
      else sfx.click();
      persist();
    },
    [changePhase, persist],
  );

  const startNew = useCallback(() => {
    unlockAudio();
    sfx.click();

    const fresh = createRun();
    const freshLoadout = loadoutFromRun(fresh);

    runRef.current = fresh;
    setRun(fresh);
    usedRef.current = [];
    setUsed([]);
    questionRef.current = null;
    setQuestion(null);
    feedbackRef.current = 'idle';
    setFeedback('idle');
    setSelected(null);
    setRewards([]);
    clearSave();
    setSave(null);

    const engine = engineRef.current;
    engine?.setDifficulty(1);
    engine?.setLoadout(freshLoadout, false);
    engine?.begin(freshLoadout, freshLoadout.maxHp, 1);
    setSnapshot({
      hp: freshLoadout.maxHp,
      maxHp: freshLoadout.maxHp,
      kills: 0,
      time: 0,
      enemyCount: 0,
    });
    changePhase('playing');
  }, [changePhase]);

  const continueRun = useCallback(() => {
    const data = saveRef.current;
    if (!data) return;

    unlockAudio();
    sfx.click();

    const restored: RunState = {
      level: data.level,
      xp: data.xp,
      upgrades: data.upgrades,
      equipment: data.equipment,
    };
    const restoredLoadout = loadoutFromRun(restored);

    runRef.current = restored;
    setRun(restored);
    usedRef.current = data.usedQuestions ?? [];
    setUsed(usedRef.current);
    questionRef.current = null;
    setQuestion(null);
    feedbackRef.current = 'idle';
    setFeedback('idle');
    setSelected(null);
    setRewards([]);

    const engine = engineRef.current;
    engine?.setDifficulty(restored.level);
    engine?.setLoadout(restoredLoadout, false);
    engine?.begin(
      restoredLoadout,
      Math.max(1, data.hp),
      restored.level,
      data.kills ?? 0,
      data.time ?? 0,
    );
    changePhase('playing');
  }, [changePhase]);

  const toggleMute = useCallback(() => {
    unlockAudio();
    setMutedState((previous) => {
      const next = !previous;
      applyAudioMuted(next);
      saveMuted(next);
      return next;
    });
  }, []);

  const handleKillRef = useRef(handleKill);
  const handleDeathRef = useRef(handleDeath);
  handleKillRef.current = handleKill;
  handleDeathRef.current = handleDeath;

  // Crear el motor una sola vez.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new GameEngine(canvas, {
      onKill: () => handleKillRef.current(),
      onDeath: () => handleDeathRef.current(),
      onSnapshot: (next) => {
        snapshotRef.current = next;
        setSnapshot(next);
      },
    });
    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Sincronizar stats derivadas con el motor.
  useEffect(() => {
    engineRef.current?.setLoadout(loadout);
  }, [loadout]);

  // Cargar guardado y preferencia de sonido.
  useEffect(() => {
    const loaded = loadGame();
    setSave(loaded);
    saveRef.current = loaded;
    const mutedPreference = loadMuted();
    setMutedState(mutedPreference);
    applyAudioMuted(mutedPreference);
  }, []);

  // Autoguardado periódico y al cerrar la pestaña.
  useEffect(() => {
    const interval = window.setInterval(persist, 4000);
    const onBeforeUnload = () => persist();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [persist]);

  // Pausar el combate cuando la pestaña no está visible.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) {
        engineRef.current?.pause();
      } else if (phaseRef.current === 'playing') {
        engineRef.current?.resume();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-ink text-slate-100">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block h-full w-full"
        role="img"
        aria-label="Arena de combate automático de Bit Knight"
      />

      {phase !== 'start' && (
        <HUD
          snapshot={snapshot}
          level={run.level}
          xp={run.xp}
          xpNeed={xpNeeded(run.level)}
          muted={muted}
          onToggleMute={toggleMute}
        />
      )}

      {phase !== 'start' && (
        <EquipmentPanel equipment={run.equipment} loadout={loadout} />
      )}

      {phase === 'playing' && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-20 hidden sm:block">
          <div className="panel-soft flex items-center gap-2 rounded-full px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-mint" />
            Combate automático
          </div>
        </div>
      )}

      {phase === 'start' && (
        <StartScreen
          save={save}
          muted={muted}
          onStart={startNew}
          onContinue={continueRun}
          onToggleMute={toggleMute}
        />
      )}

      {phase === 'question' && question && (
        <QuestionModal
          question={question}
          level={run.level}
          feedback={feedback}
          selected={selected}
          onAnswer={handleAnswer}
          onContinue={handleContinue}
        />
      )}

      {phase === 'reward' && rewards.length > 0 && (
        <RewardModal
          rewards={rewards}
          level={run.level}
          onPick={handlePickReward}
        />
      )}

      {phase === 'dead' && (
        <GameOver snapshot={snapshot} level={run.level} onRetry={startNew} />
      )}

      {toast && (
        <div
          key={toast.id}
          className="animate-toast pointer-events-none absolute bottom-3 left-3 z-40 max-w-[min(360px,calc(100vw-1.5rem))]"
          role="status"
        >
          <div className="panel rounded-xl border border-gold/35 px-3.5 py-2.5 text-xs font-semibold text-gold shadow-xl">
            ✨ {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
