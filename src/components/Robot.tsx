import { useEffect, useState } from 'react';

export type RobotMood = 'idle' | 'thinking' | 'happy' | 'sad' | 'error';

interface RobotProps {
  mood: RobotMood;
}

export function Robot({ mood }: RobotProps) {
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 140);
    }, 2600 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, []);

  const isThinking = mood === 'thinking';
  const isHappy = mood === 'happy';
  const isSad = mood === 'sad';
  const isError = mood === 'error';

  const eyeShape = isError || isSad ? 'x' : isHappy ? 'happy' : blink ? 'blink' : 'normal';

  return (
    <div className={`robot-stage mood-${mood}`}>
      {/* Antenna with glowing light */}
      <div className="robot-antenna">
        <div className={`robot-antenna-bulb ${isThinking || isHappy ? 'glowing' : ''}`} />
      </div>

      {/* Head */}
      <div className={`robot-head ${isThinking ? 'thinking' : ''} ${isHappy ? 'celebrate' : ''} ${isSad || isError ? 'droop' : ''}`}>
        {/* Eyes screen */}
        <div className="robot-eyes">
          <div className={`robot-eye eye-left ${eyeShape === 'blink' ? 'blinking' : ''} ${eyeShape === 'x' ? 'x-eye' : ''} ${eyeShape === 'happy' ? 'happy-eye' : ''}`}>
            {eyeShape === 'x' ? '×' : eyeShape === 'happy' ? '◠' : ''}
          </div>
          <div className={`robot-eye eye-right ${eyeShape === 'blink' ? 'blinking' : ''} ${eyeShape === 'x' ? 'x-eye' : ''} ${eyeShape === 'happy' ? 'happy-eye' : ''}`}>
            {eyeShape === 'x' ? '×' : eyeShape === 'happy' ? '◡' : ''}
          </div>
        </div>

        {/* Mouth */}
        <div className={`robot-mouth ${isHappy ? 'mouth-happy' : ''} ${isSad || isError ? 'mouth-sad' : ''} ${isThinking ? 'mouth-thinking' : ''}`} />

        {/* Ear bolts */}
        <div className="robot-bolt bolt-left" />
        <div className="robot-bolt bolt-right" />
      </div>

      {/* Neck */}
      <div className="robot-neck" />

      {/* Body */}
      <div className={`robot-body ${isThinking ? 'thinking' : ''} ${isHappy ? 'celebrate' : ''}`}>
        {/* Chest gauge */}
        <div className="robot-chest">
          <div className={`robot-chest-light ${mood}`} />
        </div>
        {/* Gear */}
        <div className={`robot-gear ${isThinking ? 'spinning' : ''}`} />
      </div>

      {/* Arms */}
      <div className={`robot-arm arm-left ${isHappy ? 'arm-wave-left' : ''} ${isSad || isError ? 'arm-droop-left' : ''}`} />
      <div className={`robot-arm arm-right ${isHappy ? 'arm-wave-right' : ''} ${isSad || isError ? 'arm-droop-right' : ''}`} />

      {/* Legs / base */}
      <div className="robot-base">
        <div className={`robot-track ${isThinking ? 'track-moving' : ''}`} />
      </div>
    </div>
  );
}
