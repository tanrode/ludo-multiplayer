const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

let gameState = {
  status: 'LOBBY', // LOBBY, PLAYING, ENDED
  players: [], // { id, name, colors: [] }
  mode: null, // "2-color" or "4-color"
  turn: 0, // 0 for player 1, 1 for player 2
  dice: null,
  diceRolled: false,
  pawns: {}, // "color_index": "start" or 0-56
  winner: null,
};

const ALL_COLORS = ['Blue', 'Red', 'Green', 'Yellow'];
const COLOR_OFFSETS = {
  Red: 0,
  Green: 13,
  Yellow: 26,
  Blue: 39,
};
const SAFE_ZONES_GLOBAL = [0, 8, 13, 21, 26, 34, 39, 47];

function resetGame() {
  gameState = {
    status: 'LOBBY',
    players: [],
    mode: null,
    turn: 0,
    dice: null,
    diceRolled: false,
    pawns: {},
    winner: null,
  };
}

function initializePawns(mode, players) {
  let pawns = {};
  players.forEach(p => {
    p.colors.forEach(color => {
      for (let i = 0; i < 4; i++) {
        pawns[`${color}_${i}`] = 'start';
      }
    });
  });
  return pawns;
}

function getGlobalPosition(color, relPos) {
  if (relPos === 'start' || relPos > 50) return null; // Safe or in home stretch
  return (relPos + COLOR_OFFSETS[color]) % 52;
}

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  socket.emit('state_update', gameState);

  socket.on('join_game', ({ name, mode, colors }) => {
    if (gameState.players.length >= 2 || gameState.status !== 'LOBBY') {
      socket.emit('error', 'Game is already full or running.');
      return;
    }

    if (gameState.players.length === 0) {
      gameState.mode = mode; // "2-color" or "4-color"
      gameState.players.push({ id: socket.id, name, colors });
    } else {
      // Second player takes the remaining available colors based on mode
      const selectedColorsSet = new Set(gameState.players[0].colors);
      let remainingColors = [];
      if (gameState.mode === '4-color') {
          remainingColors = ALL_COLORS.filter(c => !selectedColorsSet.has(c));
      } else {
          // 2-color mode, player 2 chooses from 1 remaining color among the unused, for now auto-assign remaining 1 if client allows
          remainingColors = colors; // Trusting frontend, or validate here
      }
      gameState.players.push({ id: socket.id, name, colors: remainingColors });
      
      // Start game
      gameState.status = 'PLAYING';
      gameState.turn = Math.floor(Math.random() * 2);
      gameState.pawns = initializePawns(gameState.mode, gameState.players);
    }

    io.emit('state_update', gameState);
  });

  socket.on('roll_dice', () => {
    const playerIndex = gameState.players.findIndex(p => p.id === socket.id);
    if (playerIndex !== gameState.turn || gameState.diceRolled || gameState.status !== 'PLAYING') {
      return;
    }

    const diceValue = Math.floor(Math.random() * 6) + 1;
    gameState.dice = diceValue;
    gameState.diceRolled = true;

    // Check if player has any valid moves. If no valid moves, switch turn.
    const hasValidMove = checkValidMoves(gameState.players[playerIndex], diceValue);
    
    io.emit('state_update', gameState);

    if (!hasValidMove) {
      setTimeout(() => {
        if (diceValue !== 6) {
          gameState.turn = (gameState.turn + 1) % gameState.players.length;
        }
        gameState.dice = null;
        gameState.diceRolled = false;
        io.emit('state_update', gameState);
      }, 1500); // 1.5 seconds delay so they see the dice before it skips turn
    }
  });

  function checkValidMoves(player, dice) {
    for (let c of player.colors) {
      for (let i = 0; i < 4; i++) {
        let pos = gameState.pawns[`${c}_${i}`];
        if (pos === 'start' && dice === 6) return true;
        if (pos !== 'start' && pos + dice <= 57) return true;
      }
    }
    return false;
  }

  // Removed old nextTurn function since we inline it above and in move_pawn

  function checkWinCondition() {
      for (let i = 0; i < gameState.players.length; i++) {
          let p = gameState.players[i];
          let allHome = true;
          for (let c of p.colors) {
              for (let pawnIdx = 0; pawnIdx < 4; pawnIdx++) {
                  if (gameState.pawns[`${c}_${pawnIdx}`] !== 57) {
                      allHome = false;
                  }
              }
          }
          if (allHome) {
              gameState.status = 'ENDED';
              gameState.winner = p.name;
              return true;
          }
      }
      return false;
  }

  socket.on('move_pawn', ({ color, index }) => {
    const pId = `${color}_${index}`;
    const playerIndex = gameState.players.findIndex(p => p.id === socket.id);
    
    if (playerIndex !== gameState.turn || !gameState.diceRolled || gameState.status !== 'PLAYING') return;

    let pos = gameState.pawns[pId];
    const dice = gameState.dice;

    let validMove = false;
    let newPos = pos;

    if (pos === 'start' && dice === 6) {
        newPos = 0;
        validMove = true;
    } else if (pos !== 'start' && pos + dice <= 57) {
        newPos = pos + dice;
        validMove = true;
    }

    if (validMove) {
        gameState.pawns[pId] = newPos;
        let killedOpponent = false;

        // Check Kill
        if (newPos <= 50) {
            const globalP = getGlobalPosition(color, newPos);
            if (!SAFE_ZONES_GLOBAL.includes(globalP)) {
                // Check if any opponent pawn is here
                Object.keys(gameState.pawns).forEach(key => {
                    const [otherColor] = key.split('_');
                    if (!gameState.players[playerIndex].colors.includes(otherColor)) {
                        const otherPos = gameState.pawns[key];
                        if (otherPos !== 'start' && otherPos <= 50) {
                            const otherGlobal = getGlobalPosition(otherColor, otherPos);
                            if (globalP === otherGlobal) {
                                // Kill it!
                                gameState.pawns[key] = 'start';
                                killedOpponent = true;
                            }
                        }
                    }
                });
            }
        }

        const won = checkWinCondition();

        if (!won) {
            if (dice === 6 || killedOpponent) {
                // Player gets another turn for rolling 6 OR getting a kill
                gameState.dice = null;
                gameState.diceRolled = false;
            } else {
                gameState.turn = (gameState.turn + 1) % gameState.players.length;
                gameState.dice = null;
                gameState.diceRolled = false;
            }
        }
        
        io.emit('state_update', gameState);
    }
  });

  socket.on('exit_game', () => {
    resetGame();
    io.emit('state_update', gameState);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    const index = gameState.players.findIndex(p => p.id === socket.id);
    if (index !== -1) {
        // One player disconnected, end game for everyone
        resetGame();
        io.emit('state_update', gameState);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
