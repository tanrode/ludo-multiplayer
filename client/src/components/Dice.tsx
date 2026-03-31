import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface Props {
  diceValue: number | null;
  onRoll: () => void;
  disabled: boolean;
  isRolling: boolean;
}

const diceFaces = [
  // 1
  [{x: 50, y: 50}],
  // 2
  [{x: 25, y: 25}, {x: 75, y: 75}],
  // 3
  [{x: 25, y: 25}, {x: 50, y: 50}, {x: 75, y: 75}],
  // 4
  [{x: 25, y: 25}, {x: 75, y: 25}, {x: 25, y: 75}, {x: 75, y: 75}],
  // 5
  [{x: 25, y: 25}, {x: 75, y: 25}, {x: 50, y: 50}, {x: 25, y: 75}, {x: 75, y: 75}],
  // 6
  [{x: 25, y: 20}, {x: 25, y: 50}, {x: 25, y: 80}, {x: 75, y: 20}, {x: 75, y: 50}, {x: 75, y: 80}],
];

export default function Dice({ diceValue, onRoll, disabled, isRolling }: Props) {
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });
  const [displayValue, setDisplayValue] = useState(1);

  useEffect(() => {
    if (isRolling) {
      const interval = setInterval(() => {
        setRotation({
          x: Math.random() * 720,
          y: Math.random() * 720,
          z: Math.random() * 720,
        });
        setDisplayValue(Math.floor(Math.random() * 6) + 1);
      }, 100);

      return () => clearInterval(interval);
    } else if (diceValue) {
      setRotation({ x: 0, y: 0, z: 0 });
      setDisplayValue(diceValue);
    }
  }, [isRolling, diceValue]);

  const dots = diceFaces[displayValue - 1];

  return (
    <div className="relative w-24 h-24 perspective-[1000px]">
      <motion.button
        disabled={disabled || isRolling}
        onClick={onRoll}
        animate={{
          rotateX: rotation.x,
          rotateY: rotation.y,
          rotateZ: rotation.z,
          scale: isRolling ? 1.2 : (disabled && !diceValue) ? 0.9 : 1,
        }}
        transition={{ 
          type: isRolling ? 'tween' : 'spring', 
          stiffness: 200, 
          damping: 15,
          duration: isRolling ? 0.2 : undefined,
        }}
        className={`w-full h-full bg-white rounded-2xl shadow-[inset_0_-8px_15px_rgba(0,0,0,0.2),0_10px_20px_rgba(0,0,0,0.3)] relative transform-style-3d cursor-pointer ${
          (disabled && !isRolling && !diceValue) ? 'opacity-50 grayscale' : 'hover:scale-105 shadow-[0_15px_30px_rgba(255,255,255,0.4)]'
        }`}
      >
        {dots.map((dot, i) => (
          <div
            key={i}
            className="absolute w-4 h-4 rounded-full bg-slate-900 shadow-[inset_0_3px_5px_rgba(0,0,0,0.5)] transform -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${dot.x}%`, top: `${dot.y}%` }}
          />
        ))}
        {(!disabled && !isRolling && !diceValue) && (
          <div className="absolute -top-3 -right-3">
             <span className="flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
            </span>
          </div>
        )}
      </motion.button>
    </div>
  );
}
