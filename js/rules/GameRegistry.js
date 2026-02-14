import { KlondikeGame } from './KlondikeGame.js';
import { SpiderGame } from './SpiderGame.js';
import { FreeCellGame } from './FreeCellGame.js';

const games = {
  'klondike': {
    name: 'Klondike',
    description: 'Klassinen pasianssi - nostetaan yksi kerrallaan',
    create: () => new KlondikeGame(1)
  },
  'klondike-draw3': {
    name: 'Klondike, nosto 3',
    description: 'Klassinen pasianssi - nostetaan kolme kerrallan',
    create: () => new KlondikeGame(3)
  },
  'spider-1': {
    name: 'Spider 1',
    description: 'Helpoin versio, vain yksi maa',
    create: () => new SpiderGame(1)
  },
  'spider-2': {
    name: 'Spider 2 ',
    description: 'Keskivaikea, kaksi maata',
    create: () => new SpiderGame(2)
  },
  'spider-4': {
    name: 'Spider 4',
    description: 'Vaikein versio, neljä maata',
    create: () => new SpiderGame(4)
  },
  'freecell': {
    name: 'FreeCell',
    description: 'FreeCell-pasianssi',
    create: () => new FreeCellGame()
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
