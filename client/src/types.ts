export interface Player {
  id: string;
  name: string;
  colors: string[];
}

export interface GameState {
  status: 'LOBBY' | 'PLAYING' | 'ENDED';
  players: Player[];
  mode: '2-color' | '4-color' | null;
  turn: number;
  dice: number | null;
  diceRolled: boolean;
  rollCounter: number;
  pawns: Record<string, 'start' | number>;
  winner: string | null;
  disconnectedPlayerId: string | null;
}
