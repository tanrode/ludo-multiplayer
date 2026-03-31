import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import Lobby from './Lobby';
import Game from './Game';
import type { GameState } from './types';

// Connect to the backend server
const socket: Socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001');

function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    socket.on('state_update', (state: GameState) => {
      setGameState(state);
    });

    socket.on('error', (msg: string) => {
      setError(msg);
      setTimeout(() => setError(null), 3000);
    });

    return () => {
      socket.off('state_update');
      socket.off('error');
    };
  }, []);

  if (!gameState) {
    return <div className="text-white text-2xl font-bold animate-pulse">Loading Game State...</div>;
  }

  const isPlayer = gameState.players.find(p => p.id === socket.id);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500/80 backdrop-blur-md text-white py-2 px-6 rounded-full shadow-lg z-50">
          {error}
        </div>
      )}

      {gameState.status === 'LOBBY' || !isPlayer ? (
        <Lobby gameState={gameState} socket={socket} />
      ) : (
        <Game gameState={gameState} socket={socket} />
      )}
    </div>
  );
}

export default App;
