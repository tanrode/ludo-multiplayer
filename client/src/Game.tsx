import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import type { GameState } from './types';
import Board from './components/Board';
import Dice from './components/Dice';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  gameState: GameState;
  socket: Socket;
}

export default function Game({ gameState, socket }: Props) {
  const [isRolling, setIsRolling] = useState(false);
  const playerId = socket.id;
  const isMyTurn = gameState.players[gameState.turn]?.id === playerId;

  useEffect(() => {
    if (gameState.diceRolled) {
      // If backend says dice is rolled, stop rolling animation after a short delay
      setTimeout(() => setIsRolling(false), 800);
    } else {
      setIsRolling(false);
    }
  }, [gameState.diceRolled]);

  const handleRollDice = () => {
    if (!isMyTurn || gameState.diceRolled) return;
    setIsRolling(true);
    socket.emit('roll_dice');
  };

  const handlePawnClick = (color: string, index: number) => {
    if (!isMyTurn || !gameState.diceRolled || isRolling) return;
    socket.emit('move_pawn', { color, index });
  };

  const p1 = gameState.players[0];
  const p2 = gameState.players[1];

  return (
    <div className="w-full max-w-6xl h-full mx-auto p-4 flex flex-col md:flex-row items-center justify-between gap-8 h-screen pt-12 md:pt-0">
      
      {/* Player 1 Panel */}
      <div className={`glass-panel p-6 rounded-3xl w-full md:w-64 transition-all duration-300 ${gameState.turn === 0 ? 'scale-105 shadow-[0_0_30px_rgba(255,255,255,0.2)] border-white/50' : 'opacity-70 grayscale-[30%]'}`}>
        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-green-400">{p1.name}</h2>
        <div className="flex gap-2 mt-4">
          {p1.colors.map(c => (
            <div key={c} className="w-8 h-8 rounded-full shadow-inner border-2 border-white/20" style={{ backgroundColor: `var(--accent-${c.toLowerCase()})` }} />
          ))}
        </div>
        {gameState.turn === 0 && <p className="mt-4 text-sm font-bold text-green-400 animate-pulse">Taking turn...</p>}
      </div>

      {/* Main Board Container */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        <Board gameState={gameState} onPawnClick={handlePawnClick} me={playerId || ''} />
        
        {/* Dice Area overlayed or next to board */}
        <div className="mt-8 flex items-center justify-center gap-6">
          <Dice 
            diceValue={gameState.dice} 
            onRoll={handleRollDice} 
            disabled={!isMyTurn || gameState.diceRolled} 
            isRolling={isRolling && isMyTurn} 
          />
          <button 
            onClick={() => socket.emit('exit_game')}
            className="px-6 py-3 bg-red-500/80 hover:bg-red-500 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 shadow-lg border border-red-400/50"
          >
            EXIT GAME
          </button>
        </div>
      </div>

      {/* Player 2 Panel */}
      <div className={`glass-panel p-6 rounded-3xl w-full md:w-64 transition-all duration-300 ${gameState.turn === 1 ? 'scale-105 shadow-[0_0_30px_rgba(255,255,255,0.2)] border-white/50' : 'opacity-70 grayscale-[30%]'}`}>
        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-green-400">{p2.name}</h2>
        <div className="flex gap-2 mt-4">
          {p2.colors.map(c => (
             <div key={c} className="w-8 h-8 rounded-full shadow-inner border-2 border-white/20" style={{ backgroundColor: `var(--accent-${c.toLowerCase()})` }} />
          ))}
        </div>
        {gameState.turn === 1 && <p className="mt-4 text-sm font-bold text-green-400 animate-pulse">Taking turn...</p>}
      </div>

      {/* WINNER MODAL */}
      <AnimatePresence>
        {gameState.status === 'ENDED' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              className="glass-panel p-12 rounded-3xl text-center max-w-lg w-full"
            >
              <h1 className="text-6xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]">
                VICTORY!
              </h1>
              <p className="text-2xl font-bold text-white mb-8">{gameState.winner} has won the game!</p>
              <button 
                onClick={() => socket.emit('exit_game')}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl font-bold shadow-lg hover:scale-105 transition-all text-xl"
              >
                Return to Lobby
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
