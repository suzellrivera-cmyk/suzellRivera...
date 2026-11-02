import { useEffect, useState, useRef } from 'react';

export type RobotMood = 'idle' | 'thinking' | 'happy' | 'sad' | 'error' | 'moving';

export type Movimiento = 'avanzar' | 'girar_izquierda' | 'girar_derecha' | 'retroceder' | 'saltar';

interface RobotProps {
  mood: RobotMood;
  /** Index of current movement being executed in the sequence */
  currentMoveIndex: number;
  /** Full sequence of movements queued */
  sequence: Movimiento[];
}

const MOVE_DURATION = 1200;

function moveLabel(m: Movimiento): string {
  const map: Record<Movimiento, string> = {
    avanzar: 'Avanzar',
    girar_izquierda: 'Girar izquierda',
    girar_derecha: 'Girar derecha',
    retroceder: 'Retroceder',
    saltar: 'Saltar',
  };
  return map[m];
}

function moveIcon(m: Movimiento): string {
  const map: Record<Movimiento, string> = {
    avanzar: '▲',
    girar_izquierda: '↺',
    girar_derecha: '↻',
    retroceder: '▼',
    saltar: '⤴',
  };
  return map[m];
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

  return (
    <div className={`robot-stage mood-${mood}`}>
      {/* Antenna with glowing light */}
      <div className="robot-antenna">
        <div className={`robot-antenna-bulb ${isThinking || isHappy || isMoving ? 'glowing' : ''} ${isError ? 'error-bulb' : ''}`} />
      </div>

      {/* Head */}
      <div
        className={`robot-head ${isThinking ? 'thinking' : ''} ${isHappy ? 'celebrate' : ''} ${isSad || isError ? 'droop' : ''} ${isMoving ? 'move-head' : ''} ${isMoving && currentMove === 'girar_izquierda' ? 'turn-left' : ''} ${isMoving && currentMove === 'girar_derecha' ? 'turn-right' : ''}`}
        style={isMoving && currentMove === 'saltar' ? { ['--jump' as string]: `${Math.sin(progress * Math.PI) * 18}px` } : undefined}
      >
        {/* Eyes screen */}
        <div className="robot-eyes">
          <div className={`robot-eye eye-left ${eyeShape === 'blink' ? 'blinking' : ''} ${eyeShape === 'x' ? 'x-eye' : ''} ${eyeShape === 'happy' ? 'happy-eye' : ''} ${eyeShape === 'move' ? 'move-eye' : ''}`}>
            {eyeShape === 'x' ? '×' : eyeShape === 'happy' ? '◠' : eyeShape === 'move' ? '◉' : ''}
          </div>
          <div className={`robot-eye eye-right ${eyeShape === 'blink' ? 'blinking' : ''} ${eyeShape === 'x' ? 'x-eye' : ''} ${eyeShape === 'happy' ? 'happy-eye' : ''} ${eyeShape === 'move' ? 'move-eye' : ''}`}>
            {eyeShape === 'x' ? '×' : eyeShape === 'happy' ? '◡' : eyeShape === 'move' ? '◉' : ''}
          </div>
        </div>

        {/* Mouth */}
        <div className={`robot-mouth ${isHappy ? 'mouth-happy' : ''} ${isSad || isError ? 'mouth-sad' : ''} ${isThinking ? 'mouth-thinking' : ''} ${isMoving ? 'mouth-move' : ''}`} />

        {/* Ear bolts */}
        <div className="robot-bolt bolt-left" />
        <div className="robot-bolt bolt-right" />
      </div>

      {/* Neck */}
      <div className="robot-neck" />

      {/* Body */}
      <div
        className={`robot-body ${isThinking ? 'thinking' : ''} ${isHappy ? 'celebrate' : ''} ${isMoving ? 'move-body' : ''}`}
        style={isMoving && currentMove === 'saltar' ? { ['--jump' as string]: `${Math.sin(progress * Math.PI) * 18}px` } : undefined}
      >
        {/* Chest gauge */}
        <div className="robot-chest">
          <div className={`robot-chest-light ${mood === 'moving' ? 'thinking' : mood}`} />
        </div>
        {/* Gear */}
        <div className={`robot-gear ${isThinking || isMoving ? 'spinning' : ''}`} />
      </div>

      {/* Arms */}
      <div
        className={`robot-arm arm-left ${isHappy ? 'arm-wave-left' : ''} ${isSad || isError ? 'arm-droop-left' : ''} ${isMoving && currentMove === 'saltar' ? 'arm-jump-l' : ''}`}
        style={isMoving && currentMove === 'saltar' ? { ['--jump' as string]: `${Math.sin(progress * Math.PI) * 18}px` } : undefined}
      />
      <div
        className={`robot-arm arm-right ${isHappy ? 'arm-wave-right' : ''} ${isSad || isError ? 'arm-droop-right' : ''} ${isMoving && currentMove === 'saltar' ? 'arm-jump-r' : ''}`}
        style={isMoving && currentMove === 'saltar' ? { ['--jump' as string]: `${Math.sin(progress * Math.PI) * 18}px` } : undefined}
      />

      {/* Legs / base */}
      <div
        className="robot-base"
        style={isMoving && currentMove === 'saltar' ? { ['--jump' as string]: `${Math.sin(progress * Math.PI) * 18}px` } : undefined}
      >
        <div className={`robot-track ${isThinking || isMoving ? 'track-moving' : ''} ${isMoving && currentMove === 'retroceder' ? 'track-reverse' : ''}`} />
      </div>

      {/* Movement label bubble */}
      {isMoving && currentMove && (
        <div className="move-bubble animate-pop">
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

export { MOVE_DURATION, moveLabel, moveIcon };
