/**
 * PODER & GLORIA — Game Engine
 * Manages all game state, regions, resources, and turn logic.
 */

const REGIONS = [
  { id: 'capital',    name: 'La Capital',        population: 12, icon: '🏛️' },
  { id: 'norte',      name: 'Región Norte',      population: 8,  icon: '🏔️' },
  { id: 'sur',        name: 'Región Sur',        population: 7,  icon: '🌾' },
  { id: 'costa',      name: 'Costa Dorada',      population: 9,  icon: '🏖️' },
  { id: 'industrial', name: 'Zona Industrial',   population: 10, icon: '🏭' },
  { id: 'frontera',   name: 'La Frontera',       population: 6,  icon: '🛡️' },
  { id: 'selva',      name: 'Selva Profunda',    population: 5,  icon: '🌿' },
  { id: 'desierto',   name: 'El Desierto',       population: 4,  icon: '🏜️' },
  { id: 'islas',      name: 'Las Islas',         population: 3,  icon: '🏝️' },
];

const ACTIONS = [
  {
    id: 'campaign',
    name: '📢 Campaña',
    desc: 'Haz campaña en una región para ganar influencia.',
    cost: { money: 10 },
    effect: (game, region) => {
      const amount = 12 + Math.floor(Math.random() * 8);
      region.influence[game.currentTurn] = Math.min(100, (region.influence[game.currentTurn] || 0) + amount);
      return `📢 Campaña en ${region.name}: +${amount} influencia`;
    }
  },
  {
    id: 'advertise',
    name: '📺 Publicidad',
    desc: 'Lanza anuncios para ganar popularidad global.',
    cost: { money: 20 },
    effect: (game) => {
      const amount = 8 + Math.floor(Math.random() * 7);
      game.players[game.currentTurn].popularity = Math.min(100, game.players[game.currentTurn].popularity + amount);
      return `📺 Publicidad lanzada: +${amount} popularidad`;
    }
  },
  {
    id: 'bribe',
    name: '💰 Soborno',
    desc: 'Usa dinero para robar influencia al oponente en una región.',
    cost: { money: 30 },
    effect: (game, region) => {
      const opp = game.currentTurn === 0 ? 1 : 0;
      const stolen = Math.min(region.influence[opp] || 0, 10 + Math.floor(Math.random() * 10));
      region.influence[opp] = Math.max(0, (region.influence[opp] || 0) - stolen);
      region.influence[game.currentTurn] = Math.min(100, (region.influence[game.currentTurn] || 0) + Math.floor(stolen * 0.6));
      return `💰 Soborno en ${region.name}: -${stolen} rival, +${Math.floor(stolen * 0.6)} tuyo`;
    }
  },
  {
    id: 'scandal',
    name: '🗞️ Escándalo',
    desc: 'Difunde un escándalo que reduce la popularidad del rival.',
    cost: { money: 25 },
    effect: (game) => {
      const opp = game.currentTurn === 0 ? 1 : 0;
      const damage = 10 + Math.floor(Math.random() * 10);
      game.players[opp].popularity = Math.max(0, game.players[opp].popularity - damage);
      return `🗞️ ¡Escándalo! El rival pierde ${damage} popularidad`;
    }
  },
  {
    id: 'fundraise',
    name: '🏦 Recaudar',
    desc: 'Organiza un evento para recaudar fondos.',
    cost: { money: 0 },
    effect: (game) => {
      const amount = 15 + Math.floor(Math.random() * 15);
      game.players[game.currentTurn].money += amount;
      return `🏦 Recaudación exitosa: +$${amount}`;
    }
  },
  {
    id: 'rally',
    name: '✊ Mitin',
    desc: 'Realiza un mitin que gana influencia y popularidad moderada.',
    cost: { money: 15 },
    effect: (game, region) => {
      const inf = 8 + Math.floor(Math.random() * 5);
      const pop = 4 + Math.floor(Math.random() * 4);
      region.influence[game.currentTurn] = Math.min(100, (region.influence[game.currentTurn] || 0) + inf);
      game.players[game.currentTurn].popularity = Math.min(100, game.players[game.currentTurn].popularity + pop);
      return `✊ Mitin en ${region.name}: +${inf} influencia, +${pop} popularidad`;
    }
  },
];

const MAX_ROUNDS = 10;
const ACTIONS_PER_TURN = 2;

export function createGameState(player0Name, player1Name) {
  const regions = REGIONS.map(r => ({
    ...r,
    influence: [0, 0], // [player0, player1]
  }));

  return {
    players: [
      { name: player0Name, money: 50, popularity: 30, color: 'gold' },
      { name: player1Name, money: 50, popularity: 30, color: 'blue' },
    ],
    regions,
    currentTurn: 0,      // 0 or 1
    round: 1,
    actionsLeft: ACTIONS_PER_TURN,
    log: [],
    gameOver: false,
    winner: null,
  };
}

export function getActions() {
  return ACTIONS;
}

export function getMaxRounds() {
  return MAX_ROUNDS;
}

export function getActionsPerTurn() {
  return ACTIONS_PER_TURN;
}

export function canAfford(game, actionId) {
  const action = ACTIONS.find(a => a.id === actionId);
  if (!action) return false;
  const player = game.players[game.currentTurn];
  return player.money >= (action.cost.money || 0);
}

export function performAction(game, actionId, regionId) {
  const action = ACTIONS.find(a => a.id === actionId);
  if (!action || !canAfford(game, actionId)) return null;
  if (game.actionsLeft <= 0) return null;

  const player = game.players[game.currentTurn];
  player.money -= (action.cost.money || 0);

  const region = regionId ? game.regions.find(r => r.id === regionId) : null;
  const needsRegion = ['campaign', 'bribe', 'rally'].includes(actionId);
  if (needsRegion && !region) return null;

  const message = action.effect(game, region);
  game.actionsLeft -= 1;

  const logEntry = {
    round: game.round,
    player: game.currentTurn,
    message,
    timestamp: Date.now(),
  };
  game.log.push(logEntry);

  return logEntry;
}

export function endTurn(game) {
  // Give passive income
  const current = game.players[game.currentTurn];
  const regionsOwned = countRegions(game, game.currentTurn);
  current.money += 5 + regionsOwned * 3;

  // Popularity decay
  game.players.forEach(p => {
    p.popularity = Math.max(0, p.popularity - 2);
  });

  // Switch turn
  if (game.currentTurn === 1) {
    game.round += 1;
  }
  game.currentTurn = game.currentTurn === 0 ? 1 : 0;
  game.actionsLeft = ACTIONS_PER_TURN;

  // Check game over
  if (game.round > MAX_ROUNDS) {
    game.gameOver = true;
    game.winner = determineWinner(game);
  }

  // Trigger a random event at start of each round (when switching to player 0)
  if (game.currentTurn === 0 && !game.gameOver && game.round > 1) {
    const event = triggerRandomEvent(game);
    if (event) {
      game.lastEvent = event;
    }
  }

  return game;
}

// ===== RANDOM EVENTS =====
const RANDOM_EVENTS = [
  {
    name: '📰 Escándalo Mediático',
    desc: 'Los medios publican un escándalo que afecta al jugador con más popularidad.',
    effect: (game) => {
      const target = game.players[0].popularity >= game.players[1].popularity ? 0 : 1;
      const loss = 5 + Math.floor(Math.random() * 8);
      game.players[target].popularity = Math.max(0, game.players[target].popularity - loss);
      return `${game.players[target].name} pierde ${loss} popularidad por escándalo mediático`;
    }
  },
  {
    name: '💹 Boom Económico',
    desc: 'La economía prospera. Ambos jugadores ganan dinero extra.',
    effect: (game) => {
      const bonus = 10 + Math.floor(Math.random() * 10);
      game.players[0].money += bonus;
      game.players[1].money += bonus;
      return `Boom económico: ambos jugadores ganan +$${bonus}`;
    }
  },
  {
    name: '🪧 Protesta Popular',
    desc: 'Una protesta estalla en una región aleatoria, reduciendo la influencia dominante.',
    effect: (game) => {
      const region = game.regions[Math.floor(Math.random() * game.regions.length)];
      const owner = getRegionOwner(region);
      if (owner >= 0) {
        const loss = 8 + Math.floor(Math.random() * 10);
        region.influence[owner] = Math.max(0, region.influence[owner] - loss);
        return `Protesta en ${region.name}: ${game.players[owner].name} pierde ${loss} influencia`;
      }
      return `Protesta en ${region.name}, pero no tiene efecto (neutral)`;
    }
  },
  {
    name: '🤝 Alianza Inesperada',
    desc: 'Un grupo político independiente apoya al jugador con menos regiones.',
    effect: (game) => {
      const r0 = countRegions(game, 0);
      const r1 = countRegions(game, 1);
      const target = r0 <= r1 ? 0 : 1;
      const region = game.regions[Math.floor(Math.random() * game.regions.length)];
      const boost = 10 + Math.floor(Math.random() * 8);
      region.influence[target] = Math.min(100, (region.influence[target] || 0) + boost);
      return `Alianza inesperada: ${game.players[target].name} gana +${boost} influencia en ${region.name}`;
    }
  },
  {
    name: '🏦 Crisis Financiera',
    desc: 'Una crisis reduce el dinero del jugador más rico.',
    effect: (game) => {
      const target = game.players[0].money >= game.players[1].money ? 0 : 1;
      const loss = Math.floor(game.players[target].money * 0.2);
      game.players[target].money = Math.max(0, game.players[target].money - loss);
      return `Crisis financiera: ${game.players[target].name} pierde $${loss}`;
    }
  },
  {
    name: '🎉 Fiesta Nacional',
    desc: 'Día festivo. Ambos jugadores ganan un poco de popularidad.',
    effect: (game) => {
      const bonus = 3 + Math.floor(Math.random() * 5);
      game.players[0].popularity = Math.min(100, game.players[0].popularity + bonus);
      game.players[1].popularity = Math.min(100, game.players[1].popularity + bonus);
      return `¡Fiesta Nacional! Ambos ganan +${bonus} popularidad`;
    }
  },
  null, // No event this round
  null, // No event — quiet round
];

export function triggerRandomEvent(game) {
  const event = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
  if (!event) return null;

  const message = event.effect(game);
  const logEntry = {
    round: game.round,
    player: -1,
    message: `⚡ ${event.name}: ${message}`,
    timestamp: Date.now(),
    isEvent: true,
  };
  game.log.push(logEntry);
  return { name: event.name, desc: event.desc, message, logEntry };
}

export function getRegionOwner(region) {
  const p0 = region.influence[0];
  const p1 = region.influence[1];
  if (p0 > p1 && p0 >= 20) return 0;
  if (p1 > p0 && p1 >= 20) return 1;
  return -1; // neutral
}

export function countRegions(game, playerIndex) {
  return game.regions.filter(r => getRegionOwner(r) === playerIndex).length;
}

export function determineWinner(game) {
  const r0 = countRegions(game, 0);
  const r1 = countRegions(game, 1);
  if (r0 > r1) return 0;
  if (r1 > r0) return 1;
  // tiebreaker: popularity
  if (game.players[0].popularity > game.players[1].popularity) return 0;
  if (game.players[1].popularity > game.players[0].popularity) return 1;
  // money tiebreaker
  return game.players[0].money >= game.players[1].money ? 0 : 1;
}

export function getTotalScore(game, playerIndex) {
  const regions = countRegions(game, playerIndex);
  const pop = game.players[playerIndex].popularity;
  return regions * 10 + pop;
}
