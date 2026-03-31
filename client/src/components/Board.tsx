import type { GameState } from '../types';
import { motion } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';

interface Props {
  gameState: GameState;
  onPawnClick: (color: string, index: number) => void;
  me: string;
}

const colorStyles: Record<string, string> = {
  Red: 'var(--accent-red)',
  Green: 'var(--accent-green)',
  Yellow: 'var(--accent-yellow)',
  Blue: 'var(--accent-blue)',
};

const offsets: Record<string, number> = {
  Red: 0,
  Green: 13,
  Yellow: 26,
  Blue: 39,
};

// Map the 52 outer track tiles to grid coordinates on a 15x15 grid.
// Top-Left (Red), Top-Right (Green), Bottom-Right (Yellow), Bottom-Left (Blue)
// Following path clockwise starting from Red start zone.
// Red start is at col 1, row 6.
const globalPath: {c: number, r: number}[] = [
  // Red start arm
  {c:1, r:6}, {c:2, r:6}, {c:3, r:6}, {c:4, r:6}, {c:5, r:6},
  // Up Top arm
  {c:6, r:5}, {c:6, r:4}, {c:6, r:3}, {c:6, r:2}, {c:6, r:1}, {c:6, r:0},
  // Across Top
  {c:7, r:0}, {c:8, r:0},
  // Down Top arm
  {c:8, r:1}, {c:8, r:2}, {c:8, r:3}, {c:8, r:4}, {c:8, r:5},
  // Right Green arm
  {c:9, r:6}, {c:10, r:6}, {c:11, r:6}, {c:12, r:6}, {c:13, r:6}, {c:14, r:6},
  // Down Right
  {c:14, r:7}, {c:14, r:8},
  // Left Yellow arm
  {c:13, r:8}, {c:12, r:8}, {c:11, r:8}, {c:10, r:8}, {c:9, r:8},
  // Down Bottom arm
  {c:8, r:9}, {c:8, r:10}, {c:8, r:11}, {c:8, r:12}, {c:8, r:13}, {c:8, r:14},
  // Left Bottom
  {c:7, r:14}, {c:6, r:14},
  // Up Bottom arm
  {c:6, r:13}, {c:6, r:12}, {c:6, r:11}, {c:6, r:10}, {c:6, r:9},
  // Left Blue arm
  {c:5, r:8}, {c:4, r:8}, {c:3, r:8}, {c:2, r:8}, {c:1, r:8}, {c:0, r:8},
  // Up Left
  {c:0, r:7}, {c:0, r:6}
];

// Home stretches (51 to 56 are the 6 tiles leading into the center)
const homeStretches: Record<string, {c: number, r: number}[]> = {
  Red: [{c:1, r:7}, {c:2, r:7}, {c:3, r:7}, {c:4, r:7}, {c:5, r:7}, {c:7, r:7}],
  Green: [{c:7, r:1}, {c:7, r:2}, {c:7, r:3}, {c:7, r:4}, {c:7, r:5}, {c:7, r:7}],
  Yellow: [{c:13, r:7}, {c:12, r:7}, {c:11, r:7}, {c:10, r:7}, {c:9, r:7}, {c:7, r:7}],
  Blue: [{c:7, r:13}, {c:7, r:12}, {c:7, r:11}, {c:7, r:10}, {c:7, r:9}, {c:7, r:7}],
};

// Quadrant start positions (where pawns wait to be rolled 6)
const startBase: Record<string, {c: number, r: number}[]> = {
  Red: [{c:2, r:2}, {c:4, r:2}, {c:2, r:4}, {c:4, r:4}],
  Green: [{c:10, r:2}, {c:12, r:2}, {c:10, r:4}, {c:12, r:4}],
  Yellow: [{c:10, r:10}, {c:12, r:10}, {c:10, r:12}, {c:12, r:12}],
  Blue: [{c:2, r:10}, {c:4, r:10}, {c:2, r:12}, {c:4, r:12}],
};

export default function Board({ gameState, onPawnClick, me }: Props) {
  const isMyTurn = gameState.players[gameState.turn]?.id === me;
  const prevPawnsRef = useRef<Record<string, number | 'start'>>({});
  const [movingPawn, setMovingPawn] = useState<string | null>(null);

  useEffect(() => {
    // Detect which pawn moved
    const currentPawns = gameState.pawns;
    const movedKey = Object.keys(currentPawns).find(key => currentPawns[key] !== prevPawnsRef.current[key]);
    
    if (movedKey) {
        setMovingPawn(movedKey);
        // Clear moving state after animation
        const timer = setTimeout(() => setMovingPawn(null), 2000); // Allow time for animation
        return () => clearTimeout(timer);
    }
    prevPawnsRef.current = { ...currentPawns };
  }, [gameState.pawns]);

  const getPawnPos = (color: string, index: number, posId: number | 'start') => {
    let result = { c: 0, r: 0 };
    if (posId === 'start') {
      result = startBase[color][index];
    } else if (posId > 50) {
      const idx = posId - 51;
      result = homeStretches[color][Math.min(idx, 5)];
    } else {
      const globalIdx = (posId + offsets[color]) % 52;
      result = globalPath[globalIdx];
    }
    return result;
  };

  const getPawnPath = (color: string, index: number, from: number | 'start', to: number | 'start') => {
      const path: {c: number, r: number}[] = [];
      
      if (from === 'start') {
          if (to === 0) {
              path.push(startBase[color][index]);
              path.push(getPawnPos(color, index, 0));
          } else {
              path.push(startBase[color][index]);
          }
      } else if (to === 'start') {
          // Quick jump back to start
          path.push(getPawnPos(color, index, from));
          path.push(startBase[color][index]);
      } else if (typeof from === 'number' && typeof to === 'number') {
          for (let i = from; i <= to; i++) {
              path.push(getPawnPos(color, index, i));
          }
      } else {
          path.push(getPawnPos(color, index, to));
      }
      return path;
  };

  const getPawnsWithPaths = () => {
    return Object.keys(gameState.pawns).map(key => {
      const [color, i] = key.split('_');
      const index = parseInt(i, 10);
      const posId = gameState.pawns[key];
      const pos = getPawnPos(color, index, posId);
      
      // For simplicity, we'll just animate to the current position if we don't have a specific "move" event
      // But we can check if the current dice was used to move this pawn.
      // However, framer-motion keyframes when 'pos' changes will handle the "step" if we provide the intermediate coords.
      
      return { id: key, color, index, pos, posId };
    });
  };

  const getPawnsGroupedByTile = () => {
    const tileMap: Record<string, { id: string; color: string; index: number; pos: {c:number, r:number}, posId: number | 'start' }[]> = {};
    
    getPawnsWithPaths().forEach(p => {
      const posKey = `${p.pos.c}_${p.pos.r}`;
      if (!tileMap[posKey]) tileMap[posKey] = [];
      tileMap[posKey].push(p);
    });
    return tileMap;
  };

  const myColors = gameState.players.find(p => p.id === me)?.colors || [];

  return (
    <div className="relative w-full max-w-[600px] aspect-square rounded-xl bg-board-bg shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden border-8 border-slate-800 perspective-board">
      
      {/* Underlying CSS Grid for layout drawing */}
      <div className="absolute inset-0 grid grid-cols-15 grid-rows-15 w-full h-full" style={{ gridTemplateColumns: 'repeat(15, minmax(0, 1fr))', gridTemplateRows: 'repeat(15, minmax(0, 1fr))' }}>
        {Array.from({ length: 225 }).map((_, i) => {
          const col = i % 15;
          const row = Math.floor(i / 15);

          // Quadrants
          const isTopLeft = col < 6 && row < 6;
          const isTopRight = col > 8 && row < 6;
          const isBottomLeft = col < 6 && row > 8;
          const isBottomRight = col > 8 && row > 8;

          let bg = 'border border-slate-700/20';
          
          if (isTopLeft) bg = 'bg-red-500/20';
          else if (isTopRight) bg = 'bg-green-500/20';
          else if (isBottomLeft) bg = 'bg-blue-500/20';
          else if (isBottomRight) bg = 'bg-yellow-500/20';

          // Center
          if (col >= 6 && col <= 8 && row >= 6 && row <= 8) {
             bg = 'bg-gradient-to-br from-red-500 via-yellow-500 to-blue-500';
          }

          // Path coloring
          if (row === 7 && col !== 0 && col < 6) bg = 'bg-red-500/60 shadow-inner border border-red-600/50';
          if (col === 7 && row !== 0 && row < 6) bg = 'bg-green-500/60 shadow-inner border border-green-600/50';
          if (row === 7 && col > 8 && col !== 14) bg = 'bg-yellow-500/60 shadow-inner border border-yellow-600/50';
          if (col === 7 && row > 8 && row !== 14) bg = 'bg-blue-500/60 shadow-inner border border-blue-600/50';

          // Safe zones (Stars)
          const isSafe = (col === 1 && row === 6) || (col === 6 && row === 2) || (col === 8 && row === 1) || (col === 12 && row === 6) || (col === 13 && row === 8) || (col === 8 && row === 12) || (col === 6 && row === 13) || (col === 2 && row === 8);
          // 4 main starts and 4 distinct stars
          
          return (
            <div key={i} className={`${bg} relative flex items-center justify-center`}>
              {isSafe && <div className="text-xl opacity-30">★</div>}
              {/* Quadrant Inner Squares */}
              {(isTopLeft || isTopRight || isBottomLeft || isBottomRight) && 
                (startBase['Red'].some(s => s.c === col && s.r === row) ||
                 startBase['Green'].some(s => s.c === col && s.r === row) ||
                 startBase['Yellow'].some(s => s.c === col && s.r === row) ||
                 startBase['Blue'].some(s => s.c === col && s.r === row)) && 
                <div className="w-[60%] h-[60%] bg-white/40 rounded-full shadow-inner shadow-slate-900/50" />
              }
            </div>
          );
        })}
      </div>

      {/* Dynamic Overlay for pawns using absolute position matching grid percentage */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        {getPawnsWithPaths().map((p) => {
            const group = Object.values(getPawnsGroupedByTile()).find(g => g.some(item => item.id === p.id)) || [p];
            const idxInGroup = group.findIndex(item => item.id === p.id);

            // Offset slightly if multiple pawns are on the exact same tile
            const offsetDist = group.length > 1 ? 12 : 0;
            const angle = (idxInGroup * (360 / group.length)) * (Math.PI / 180);
            const offsetX = Math.cos(angle) * offsetDist;
            const offsetY = Math.sin(angle) * offsetDist;

            const isMyPawn = myColors.includes(p.color);
            const canMove = isMyPawn && isMyTurn && gameState.diceRolled;

            // Step-by-step keyframes
            const prevPosId = prevPawnsRef.current[p.id] || p.posId;
            const path = (movingPawn === p.id) ? getPawnPath(p.color, p.index, prevPosId, p.posId) : [p.pos];
            
            const lefts = path.map(pt => `${(pt.c * 100) / 15}%`);
            const tops = path.map(pt => `${(pt.r * 100) / 15}%`);

            return (
              <motion.div
                key={p.id}
                initial={false}
                animate={{
                  left: lefts,
                  top: tops,
                  x: offsetX,
                  y: offsetY,
                  scale: canMove ? [1, 1.15, 1] : 1,
                }}
                transition={{
                  scale: { repeat: canMove ? Infinity : 0, duration: 1.5, ease: 'easeInOut' },
                  left: { duration: path.length * 0.4, ease: "linear" },
                  top: { duration: path.length * 0.4, ease: "linear" },
                  x: { duration: 0.2 },
                  y: { duration: 0.2 }
                }}
                className={`absolute w-[6.66%] h-[6.66%] flex items-center justify-center pawn-shadow ${canMove ? 'pointer-events-auto cursor-pointer z-20' : 'pointer-events-none z-10'}`}
                style={{
                  transformOrigin: 'bottom center'
                }}
                onClick={() => canMove && onPawnClick(p.color, p.index)}
              >
                {/* 3D Pawn Shape using CSS */}
                <motion.div 
                  animate={movingPawn === p.id ? {
                     y: path.map((_, i) => i % 2 === 0 ? 0 : -15),
                     scale: path.map((_, i) => i % 2 === 0 ? 1 : 1.1),
                  } : { y: 0, scale: 1 }}
                  transition={{
                     duration: path.length * 0.4,
                     ease: "linear"
                  }}
                  className="relative w-[30px] h-[36px] mt-[-10px] rounded-t-full shadow-[inset_-2px_-6px_6px_rgba(0,0,0,0.4),0_8px_6px_rgba(0,0,0,0.5)] border border-white/40 shadow-xl"
                  style={{
                    backgroundColor: colorStyles[p.color],
                  }}
                >
                  <div className="absolute top-[2px] right-[4px] w-[8px] h-[8px] bg-white/40 rounded-full blur-[2px]" />
                  <div className="absolute bottom-[-4px] left-[-4px] right-[-4px] h-[8px] rounded-full" style={{ backgroundColor: colorStyles[p.color], filter: 'brightness(0.6)' }}/>
                </motion.div>
              </motion.div>
            );
          })}
      </div>
    </div>
  );
}
