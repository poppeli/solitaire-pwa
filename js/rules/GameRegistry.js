import { KlondikeGame } from './KlondikeGame.js';

const games = {
  'klondike': {
    name: 'Klondike',
    description: 'Classic solitaire - draw 1',
    create: () => new KlondikeGame(1)
  },
  'klondike-draw3': {
    name: 'Klondike (Draw 3)',
    description: 'Classic solitaire - draw 3',
    create: () => new KlondikeGame(3)
  }
};

export function createGame(id) {
  const entry = games[id];
  if (!entry) throw new Error(`Unknown game: ${id}`);
  const game = entry.create();
  game.setup();
  return game;
}

export function getGameList() {
  return Object.entries(games).map(([id, info]) => ({
    id,
    name: info.name,
    description: info.description
  }));
}
