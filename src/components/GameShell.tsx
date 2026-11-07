import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  music,
  setMusicMuted as applyMusicMuted,
  setMuted as applyAudioMuted,
  sfx,
  unlockAudio,
} from '../game/audio';
import { GameEngine, WAVE_DURATION } from '../game/engine';
import { loadoutFromRun } from '../game/equipment';
import {
  addRunRewards,
  applyMetaToLoadout,
  buyMetaUpgrade,
  coinsForRun,
  loadMeta,
  saveMeta,
  type MetaState,
  type MetaUpgradeKey,
} from '../game/meta';
import {
  applyReward,
  createRun,
  generateRewards,
  randomHardwareDrop,
  xpNeeded,
} from '../game/progression';
import { QUESTION_COUNT, pickQuestion } from '../game/questions';
import { spriteBank } from '../game/sprites';
import {
  clearSave,
  loadGame,
  loadMusicEnabled,
  loadMuted,
  saveMusicEnabled,
  saveMuted,
  saveRun,
} from '../game/save';
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
import MetaShop from './MetaShop';
import QuestionModal, { type Feedback } from './QuestionModal';
import RewardModal from './RewardModal';
import StartScreen from './StartScreen';

const DEFAULT_SNAPSHOT: Snapshot = {
  hp: 128,
  maxHp: 128,
  kills: 0,
  time: 0,
  enemyCount: 0,
  combo: 0,
  comboMult: 1,
  wave: 1,
  waveTimer: WAVE_DURATION,
  waveDuration: WAVE_DURATION,
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
  const [musicOn, setMusicOn] = useState(true);
  const [meta, setMeta] = useState<MetaState>(() => loadMeta());
  const [shopOpen, setShopOpen] = useState(false);
  const [lastReward, setLastReward] = useState(0);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);

  const phaseRef = useRef(phase);
  const runRef = useRef(run);
  const snapshotRef = useRef(snapshot);
  const questionRef = useRef(question);
  const feedbackRef = useRef(feedback);
  const usedRef = useRef(used);
  const saveRef = useRef(save);
  const metaRef = useRef(meta);

  phaseRef.current = phase;
  runRef.current = run;
  snapshotRef.current = snapshot;
  questionRef.current = question;
  feedbackRef.current = feedback;
  usedRef.current = used;
  saveRef.current = save;
  metaRef.current = meta;

  const baseLoadout = useMemo(() => loadoutFromRun(run), [run]);
  const loadout = useMemo(
    () => applyMetaToLoadout(baseLoadout, meta),
    [baseLoadout, meta],
  );

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

  const handleKill = useCallback((xp: number) => {
    if (phaseRef.current !== 'playing') return;

    const current = runRef.current;
    const need = xpNeeded(current.level);
    const nextXp = current.xp + Math.max(1, Math.round(xp));

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

    const nextQuestion = pickQuestion(usedRef.current);
    const nextUsed =
      usedRef.current.length >= QUESTION_COUNT
        ? [nextQuestion.id]
        : usedRef.current.includes(nextQuestion.id)
          ? usedRef.current
          : [...usedRef.current, nextQuestion.id];
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

    const reachedLevel = runRef.current.level;
    const earned = coinsForRun(reachedLevel, snapshotRef.current.kills);
    const nextMeta = addRunRewards(metaRef.current, earned, reachedLevel);
    metaRef.current = nextMeta;
    setMeta(nextMeta);
    saveMeta(nextMeta);
    setLastReward(earned);

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
      let next = result.run;
      let message = result.message;
      let hardwareDropped = false;

      // Drop automático de hardware cada 2 niveles.
      if (next.level % 2 === 0) {
        const drop = randomHardwareDrop(next);
        if (drop) {
          next = drop.run;
          message = `${message} · ${drop.message}`;
          hardwareDropped = true;
        }
      }

      runRef.current = next;
      setRun(next);

      const nextLoadout = applyMetaToLoadout(
        loadoutFromRun(next),
        metaRef.current,
      );
      engineRef.current?.setDifficulty(next.level);
      engineRef.current?.setLoadout(nextLoadout);
      engineRef.current?.heal(nextLoadout.maxHp * 0.15);
      engineRef.current?.levelUpBurst();

      setRewards([]);
      questionRef.current = null;
      setQuestion(null);
      feedbackRef.current = 'idle';
      setFeedback('idle');
      setSelected(null);
      changePhase('playing');
      engineRef.current?.resume();

      setToast({ id: Date.now(), message });
      if (reward.kind === 'item' || hardwareDropped) sfx.merge();
      if (reward.kind === 'upgrade') sfx.empower();
      persist();
    },
    [changePhase, persist],
  );

  const startNew = useCallback(() => {
    unlockAudio();
    sfx.click();
    music.start();

    const fresh = createRun();
    const freshLoadout = applyMetaToLoadout(loadoutFromRun(fresh), metaRef.current);

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
    setLastReward(0);
    setShopOpen(false);
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
      combo: 0,
      comboMult: 1,
      wave: 1,
      waveTimer: WAVE_DURATION,
      waveDuration: WAVE_DURATION,
    });
    changePhase('playing');
  }, [changePhase]);

  const continueRun = useCallback(() => {
    const data = saveRef.current;
    if (!data) return;

    unlockAudio();
    sfx.click();
    music.start();

    const restored: RunState = {
      level: data.level,
      xp: data.xp,
      upgrades: data.upgrades,
      equipment: data.equipment,
    };
    const restoredLoadout = applyMetaToLoadout(
      loadoutFromRun(restored),
      metaRef.current,
    );

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
    setLastReward(0);
    setShopOpen(false);

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

  const toggleMusic = useCallback(() => {
    unlockAudio();
    setMusicOn((previous) => {
      const next = !previous;
      applyMusicMuted(!next);
      saveMusicEnabled(next);
      if (next) music.start();
      return next;
    });
  }, []);

  const openShop = useCallback(() => {
    unlockAudio();
    sfx.click();
    setShopOpen(true);
  }, []);

  const closeShop = useCallback(() => {
    sfx.click();
    setShopOpen(false);
  }, []);

  const handleBuyMeta = useCallback((key: MetaUpgradeKey) => {
    unlockAudio();
    const result = buyMetaUpgrade(metaRef.current, key);
    if (!result.ok) {
      sfx.wrong();
      setToast({ id: Date.now(), message: result.message });
      return;
    }

    metaRef.current = result.meta;
    setMeta(result.meta);
    saveMeta(result.meta);
    engineRef.current?.setLoadout(
      applyMetaToLoadout(loadoutFromRun(runRef.current), result.meta),
      false,
    );
    sfx.merge();
    setToast({ id: Date.now(), message: result.message });
  }, []);

  const handleKillRef = useRef(handleKill);
  const handleDeathRef = useRef(handleDeath);
  handleKillRef.current = handleKill;
  handleDeathRef.current = handleDeath;

  // Cargar los sprites 2D renderizados en Blender (con fallback procedural).
  useEffect(() => {
    void spriteBank.load();
  }, []);

  // Crear el motor una sola vez.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new GameEngine(canvas, {
      onKill: (xp) => handleKillRef.current(xp),
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

  // Cargar guardado y preferencias de sonido.
  useEffect(() => {
    const loaded = loadGame();
    setSave(loaded);
    saveRef.current = loaded;
    const mutedPreference = loadMuted();
    setMutedState(mutedPreference);
    applyAudioMuted(mutedPreference);
    const musicPreference = loadMusicEnabled();
    setMusicOn(musicPreference);
    applyMusicMuted(!musicPreference);
  }, []);

  // La música sigue el estado de la partida: suena en combate, se atenúa en
  // los modales y se detiene al morir o volver al menú.
  useEffect(() => {
    if (phase === 'playing') {
      music.start();
      music.duck(false);
    } else if (phase === 'question' || phase === 'reward') {
      music.duck(true);
    } else {
      music.stop();
    }
  }, [phase]);

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
        aria-label="Arena de combate automático de Bit Develop"
      />

      {phase !== 'start' && (
        <HUD
          snapshot={snapshot}
          level={run.level}
          xp={run.xp}
          xpNeed={xpNeeded(run.level)}
          muted={muted}
          musicOn={musicOn}
          onToggleMute={toggleMute}
          onToggleMusic={toggleMusic}
        />
      )}

      {phase !== 'start' && (
        <EquipmentPanel equipment={run.equipment} loadout={loadout} />
      )}

      {phase === 'playing' && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-20 hidden sm:block">
          <div className="panel-soft flex items-center gap-2 rounded-full px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-mint" />
            AUTO-EXEC // Combate autónomo
          </div>
        </div>
      )}

      {phase === 'start' && (
        <StartScreen
          save={save}
          muted={muted}
          musicOn={musicOn}
          coins={meta.coins}
          bestLevel={meta.bestLevel}
          onStart={startNew}
          onContinue={continueRun}
          onToggleMute={toggleMute}
          onToggleMusic={toggleMusic}
          onOpenShop={openShop}
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
        <GameOver
          snapshot={snapshot}
          level={run.level}
          coinsEarned={lastReward}
          totalCoins={meta.coins}
          onRetry={startNew}
          onOpenShop={openShop}
        />
      )}

      {shopOpen && (
        <MetaShop meta={meta} onBuy={handleBuyMeta} onClose={closeShop} />
      )}

      {toast && (
        <div
          key={toast.id}
          className="animate-toast pointer-events-none fixed bottom-3 left-3 z-[70] max-w-[min(360px,calc(100vw-1.5rem))]"
          role="status"
        >
          <div className="panel rounded-xl border border-gold/35 px-3.5 py-2.5 text-xs font-semibold text-gold shadow-xl">
            <span className="font-mono text-mint/80">&gt;</span> {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
