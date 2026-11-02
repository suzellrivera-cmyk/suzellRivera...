import { useEffect, useState, useRef } from 'react';

export type RobotMood = 'idle' | 'thinking' | 'happy' | 'sad' | 'error' | 'moving';

export type Movimiento =
  | 'avanzar'
  | 'girar_izquierda'
  | 'girar_derecha'
  | 'girar_completo'
  | 'retroceder'
  | 'saltar'
  | 'bailar'
  | 'agacharse'
  | 'correr'
  | 'detenerse'
  | 'inclinarse'
  | 'celebrar'
  | 'encender'
  | 'apagar';

interface RobotProps {
  mood: RobotMood;
  currentMoveIndex: number;
  sequence: Movimiento[];
}

const MOVE_DURATION = 1200;

const MOVE_LABELS: Record<Movimiento, string> = {
  avanzar: 'Avanzar',
  girar_izquierda: 'Girar izq.',
  girar_derecha: 'Girar der.',
  girar_completo: 'Giro 360°',
  retroceder: 'Retroceder',
  saltar: 'Saltar',
  bailar: 'Bailar',
  agacharse: 'Agacharse',
  correr: 'Correr',
  detenerse: 'Detenerse',
  inclinarse: 'Inclinarse',
  celebrar: 'Celebrar',
  encender: 'Encender',
  apagar: 'Apagar',
};

const MOVE_ICONS: Record<Movimiento, string> = {
  avanzar: '▲',
  girar_izquierda: '↺',
  girar_derecha: '↻',
  girar_completo: '⟲',
  retroceder: '▼',
  saltar: '⤴',
  bailar: '♪',
  agacharse: '⤓',
  correr: '⏵',
  detenerse: '■',
  inclinarse: '⤢',
  celebrar: '✦',
  encender: '◎',
  apagar: '◌',
};

export function moveLabel(m: Movimiento): string {
  return MOVE_LABELS[m];
}

export function moveIcon(m: Movimiento): string {
  return MOVE_ICONS[m];
}

export function Robot({ mood, currentMoveIndex, sequence }: RobotProps) {
  const [blink, setBlink] = useState(false);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  const currentMove: Movimiento | null =
    mood === 'moving' && currentMoveIndex >= 0 && currentMoveIndex < sequence.length
      ? sequence[currentMoveIndex]
      : null;

  useEffect(() => {
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 140);
    }, 2600 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (mood !== 'moving' || !currentMove) {
      setProgress(0);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    startRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      const p = Math.min(elapsed / MOVE_DURATION, 1);
      setProgress(p);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [mood, currentMoveIndex, currentMove]);

  const isThinking = mood === 'thinking';
  const isHappy = mood === 'happy';
  const isSad = mood === 'sad';
  const isError = mood === 'error';
  const isMoving = mood === 'moving';

  const eyeShape = isError || isSad ? 'x' : isHappy ? 'happy' : isMoving ? 'move' : blink ? 'blink' : 'normal';

  const jumpOffset = Math.sin(progress * Math.PI) * 18;

  // Stage-level animation class based on current move
  const stageAnimClass =
    isMoving && currentMove
      ? `anim-${currentMove}`
      : '';

  return (
    <div className={`robot-stage mood-${mood} ${stageAnimClass}`}>
      {/* Antenna with glowing light */}
      <div className="robot-antenna">
        <div
          className={`robot-antenna-bulb ${
            isThinking || isHappy || isMoving || currentMove === 'encender' ? 'glowing' : ''
          } ${isError ? 'error-bulb' : ''} ${currentMove === 'apagar' ? 'bulb-off' : ''}`}
        />
      </div>

      {/* Head */}
      <div
        className={`robot-head ${isThinking ? 'thinking' : ''} ${isHappy ? 'celebrate' : ''} ${
          isSad || isError ? 'droop' : ''
        } ${isMoving ? 'move-head' : ''}`}
        style={isMoving && currentMove === 'saltar' ? { ['--jump' as string]: `${jumpOffset}px` } : undefined}
      >
        {/* Eyes screen */}
        <div className="robot-eyes">
          <div
            className={`robot-eye eye-left ${eyeShape === 'blink' ? 'blinking' : ''} ${
              eyeShape === 'x' ? 'x-eye' : ''
            } ${eyeShape === 'happy' ? 'happy-eye' : ''} ${eyeShape === 'move' ? 'move-eye' : ''} ${
              currentMove === 'apagar' ? 'eye-off' : ''
            }`}
          >
            {eyeShape === 'x' ? '×' : eyeShape === 'happy' ? '◠' : eyeShape === 'move' ? '◉' : ''}
          </div>
          <div
            className={`robot-eye eye-right ${eyeShape === 'blink' ? 'blinking' : ''} ${
              eyeShape === 'x' ? 'x-eye' : ''
            } ${eyeShape === 'happy' ? 'happy-eye' : ''} ${eyeShape === 'move' ? 'move-eye' : ''} ${
              currentMove === 'apagar' ? 'eye-off' : ''
            }`}
          >
            {eyeShape === 'x' ? '×' : eyeShape === 'happy' ? '◡' : eyeShape === 'move' ? '◉' : ''}
          </div>
        </div>

        {/* Mouth */}
        <div
          className={`robot-mouth ${isHappy ? 'mouth-happy' : ''} ${isSad || isError ? 'mouth-sad' : ''} ${
            isThinking ? 'mouth-thinking' : ''
          } ${isMoving ? 'mouth-move' : ''} ${currentMove === 'bailar' ? 'mouth-happy' : ''}`}
        />

        {/* Ear bolts */}
        <div className="robot-bolt bolt-left" />
        <div className="robot-bolt bolt-right" />
      </div>

      {/* Neck */}
      <div className="robot-neck" />

      {/* Body */}
      <div
        className={`robot-body ${isThinking ? 'thinking' : ''} ${isHappy ? 'celebrate' : ''} ${
          isMoving ? 'move-body' : ''
        } ${currentMove === 'celebrar' ? 'celebrate' : ''}`}
        style={isMoving && currentMove === 'saltar' ? { ['--jump' as string]: `${jumpOffset}px` } : undefined}
      >
        {/* Chest gauge */}
        <div className="robot-chest">
          <div
            className={`robot-chest-light ${
              mood === 'moving' ? 'thinking' : mood
            } ${currentMove === 'encender' ? 'super-bright' : ''} ${currentMove === 'apagar' ? 'light-off' : ''}`}
          />
        </div>
        {/* Gear */}
        <div
          className={`robot-gear ${isThinking || isMoving ? 'spinning' : ''} ${
            currentMove === 'correr' ? 'spinning-fast' : ''
          }`}
        />
      </div>

      {/* Arms */}
      <div
        className={`robot-arm arm-left ${isHappy ? 'arm-wave-left' : ''} ${isSad || isError ? 'arm-droop-left' : ''} ${
          currentMove === 'saltar' ? 'arm-jump-l' : ''
        } ${currentMove === 'celebrar' || currentMove === 'bailar' ? 'arm-celebrate-l' : ''}`}
        style={isMoving && currentMove === 'saltar' ? { ['--jump' as string]: `${jumpOffset}px` } : undefined}
      />
      <div
        className={`robot-arm arm-right ${isHappy ? 'arm-wave-right' : ''} ${
          isSad || isError ? 'arm-droop-right' : ''
        } ${currentMove === 'saltar' ? 'arm-jump-r' : ''} ${
          currentMove === 'celebrar' || currentMove === 'bailar' ? 'arm-celebrate-r' : ''
        }`}
        style={isMoving && currentMove === 'saltar' ? { ['--jump' as string]: `${jumpOffset}px` } : undefined}
      />

      {/* Legs / base */}
      <div
        className="robot-base"
        style={isMoving && currentMove === 'saltar' ? { ['--jump' as string]: `${jumpOffset}px` } : undefined}
      >
        <div
          className={`robot-track ${isThinking || isMoving ? 'track-moving' : ''} ${
            currentMove === 'retroceder' ? 'track-reverse' : ''
          } ${currentMove === 'correr' ? 'track-fast' : ''} ${currentMove === 'detenerse' ? 'track-brake' : ''}`}
        />
      </div>

      {/* Movement label bubble */}
      {isMoving && currentMove && (
        <div className="move-bubble animate-pop" key={currentMoveIndex}>
          <span className="move-bubble-icon">{moveIcon(currentMove)}</span>
          <span className="move-bubble-label">{moveLabel(currentMove)}</span>
        </div>
      )}

      {/* Progress bar */}
      {isMoving && (
        <div className="move-progress">
          <div className="move-progress-fill" style={{ width: `${progress * 100}%` }} />
        </div>
      )}
    </div>
  );
}

export { MOVE_DURATION };
