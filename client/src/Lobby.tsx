import React, { useState } from 'react';
import { Socket } from 'socket.io-client';
import type { GameState } from './types';
import { motion } from 'framer-motion';

interface Props {
  gameState: GameState;
  socket: Socket;
}

const ALL_COLORS = ['Blue', 'Red', 'Green', 'Yellow'];

export default function Lobby({ gameState, socket }: Props) {
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'2-color' | '4-color'>('4-color');
  const [selectedColors, setSelectedColors] = useState<string[]>([]);

  const isFirstPlayer = gameState.players.length === 0;

  const handleToggleColor = (color: string) => {
    if (selectedColors.includes(color)) {
      setSelectedColors(selectedColors.filter(c => c !== color));
    } else {
      if (mode === '2-color' && selectedColors.length >= 1) return;
      if (mode === '4-color' && selectedColors.length >= 2) return;
      setSelectedColors([...selectedColors, color]);
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (isFirstPlayer) {
      if (mode === '2-color' && selectedColors.length !== 1) return;
      if (mode === '4-color' && selectedColors.length !== 2) return;
      socket.emit('join_game', { name, mode, colors: selectedColors });
    } else {
      // Second player takes the remaining colored logic
      socket.emit('join_game', { name });
    }
  };

  const availableColors = isFirstPlayer ? ALL_COLORS : ALL_COLORS.filter(c => !gameState.players[0]?.colors.includes(c));

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-panel w-full max-w-md p-8 rounded-3xl text-center space-y-8"
    >
      <div className="space-y-2">
        <h1 className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          LUDO
        </h1>
        <p className="text-slate-300 text-sm tracking-widest font-medium uppercase">Multiplayer Real-Time</p>
      </div>

      <form onSubmit={handleJoin} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-slate-300 text-left mb-2">Display Name</label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder="Enter your name..."
            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-white placeholder-slate-500"
            required
            maxLength={12}
          />
        </div>

        {isFirstPlayer && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-300 text-left mb-2">Game Mode</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => { setMode('2-color'); setSelectedColors([]); }}
                  className={`flex-1 py-3 rounded-xl border font-bold transition-all ${mode === '2-color' ? 'bg-blue-600 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] text-white' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                >
                  2-Color Mode
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('4-color'); setSelectedColors([]); }}
                  className={`flex-1 py-3 rounded-xl border font-bold transition-all ${mode === '4-color' ? 'bg-blue-600 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] text-white' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                >
                  4-Color Mode
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 text-left mb-2">
                Choose your Color(s) {mode === '2-color' ? '(Pick 1)' : '(Pick 2)'}
              </label>
              <div className="flex gap-4 justify-center">
                {availableColors.map(color => {
                  const isSelected = selectedColors.includes(color);
                  const isFull = (mode === '2-color' && selectedColors.length >= 1) || (mode === '4-color' && selectedColors.length >= 2);
                  const disabled = !isSelected && isFull;
                  
                  return (
                    <button
                      key={color}
                      type="button"
                      disabled={disabled}
                      onClick={() => handleToggleColor(color)}
                      className={`w-14 h-14 rounded-full border-4 transition-all hover:scale-110 active:scale-95 flex items-center justify-center ${
                        isSelected ? 'border-white !scale-110 shadow-[0_0_20px_rgba(255,255,255,0.4)]' : 'border-transparent opacity-80 hover:opacity-100'
                      } ${disabled ? 'opacity-30 hover:scale-100 cursor-not-allowed' : ''}`}
                      style={{ backgroundColor: `var(--accent-${color.toLowerCase()})` }}
                    >
                      {isSelected && <svg className="w-6 h-6 text-white drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {!isFirstPlayer && (
          <div className="bg-slate-800/50 border border-slate-600 p-4 rounded-xl text-left">
            <p className="text-sm text-slate-300 font-medium">Player 1 (<span className="text-white">{gameState.players[0].name}</span>) is waiting.</p>
            <p className="text-sm mt-2 text-slate-400">Remaining colors will be assigned automatically based on their choice.</p>
          </div>
        )}

        <button
          type="submit"
          className="w-full py-4 mt-4 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 rounded-xl font-bold text-white text-lg shadow-[0_5px_20px_rgba(34,197,94,0.4)] transition-all hover:-translate-y-1 active:translate-y-0"
        >
          {isFirstPlayer ? 'CREATE GAME' : 'JOIN GAME'}
        </button>
      </form>
    </motion.div>
  );
}
