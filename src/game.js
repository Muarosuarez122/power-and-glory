/**
 * PODER & GLORIA — Game Engine
 * Manages all game state, regions, resources, and turn logic.
 * Geopolitics Edition: Trade, War, Resources, Peace Treaties.
 */

const REGIONS = [
  { id: 'capital',       name: 'Metrópolis',       population: 15, icon: '🏛️', prod: { money: 15, resources: 2 } },
  { id: 'norte_lejano',  name: 'Tundra Alta',      population: 2,  icon: '❄️', prod: { money: 2,  resources: 10 } },
  { id: 'norte',         name: 'Montañas',         population: 5,  icon: '🏔️', prod: { money: 4,  resources: 8 } },
  { id: 'frontera_norte',name: 'Paso del Norte',   population: 6,  icon: '⛺', prod: { money: 3,  resources: 6 } },
  { id: 'desierto_norte',name: 'Dunas Rojas',      population: 3,  icon: '🏜️', prod: { money: 2,  resources: 12 } },
  { id: 'costa',         name: 'Bahía Dorada',     population: 10, icon: '🏖️', prod: { money: 12, resources: 1 } },
  { id: 'industrial',    name: 'Sector Fabril',    population: 12, icon: '🏭', prod: { money: 10, resources: 12 } },
  { id: 'delta',         name: 'Delta del Río',    population: 8,  icon: '🏞️', prod: { money: 8,  resources: 6 } },
  { id: 'selva',         name: 'Selva Profunda',   population: 4,  icon: '🌿', prod: { money: 2,  resources: 14 } },
  { id: 'sur',           name: 'Gran Valle',       population: 9,  icon: '🌾', prod: { money: 8,  resources: 8 } },
  { id: 'islas_lejanas', name: 'Atolón Sur',       population: 3,  icon: '🏝️', prod: { money: 8,  resources: 4 } },
  { id: 'archipielago',  name: 'Archipiélago',     population: 5,  icon: '🗾', prod: { money: 10, resources: 5 } },
  { id: 'estepa',        name: 'Llanura Esteparia',population: 6,  icon: '🐎', prod: { money: 5,  resources: 5 } },
  { id: 'meseta',        name: 'Antiplanicie',     population: 3,  icon: '🌄', prod: { money: 3,  resources: 9 } },
  { id: 'ruinas',        name: 'Antigua Capital',  population: 4,  icon: '🗿', prod: { money: 4,  resources: 10 } },
  { id: 'yacimiento',    name: 'Yacimiento Minero',population: 7,  icon: '⛏️', prod: { money: 15, resources: 18 } }
];

export const MAP_EDGES = [
  ['norte_lejano','norte'], ['norte_lejano','meseta'], ['norte_lejano','ruinas'],
  ['norte','capital'], ['norte','frontera_norte'], ['norte','desierto_norte'],
  ['desierto_norte','costa'], ['desierto_norte','meseta'],
  ['frontera_norte','industrial'], ['frontera_norte','ruinas'],
  ['costa','delta'], ['capital','costa'], ['capital','industrial'], ['capital','yacimiento'],
  ['industrial','selva'], ['yacimiento','delta'], ['yacimiento','selva'], ['yacimiento','sur'],
  ['delta','islas_lejanas'], ['selva','estepa'], ['sur','delta'], ['sur','selva'], 
  ['sur','archipielago'], ['sur','estepa'], ['islas_lejanas','archipielago']
];

export function areAdjacent(id1, id2) {
  return MAP_EDGES.some(edge => (edge[0] === id1 && edge[1] === id2) || (edge[0] === id2 && edge[1] === id1));
}

const ACTIONS = [
  {
    id: 'civic',
    faction: 'all',
    name: '🏗️ Infraestructura Nacional',
    desc: 'Sube la estabilidad local en 20% y baja la hostilidad rival.',
    cost: { money: 15 },
    needsRegion: true,
    effect: (game, region, myRef) => {
      const opp = myRef === 0 ? 1 : 0;
      region.influence[myRef] = Math.min(100, (region.influence[myRef] || 0) + 20);
      region.influence[opp] = Math.max(0, (region.influence[opp] || 0) - 15);
      return `🏗️ Infraestructura desarrollada en ${region.name}: +20% Estabilidad.`;
    }
  },
  {
    id: 'fortify',
    faction: 'all',
    name: '🚧 Fortificar Frontera',
    desc: 'Construye defensas. Requiere estar adyacente a territorio enemigo.',
    cost: { money: 20, military: 10 },
    needsRegion: true,
    effect: (game, region, myRef) => {
      const opp = myRef === 0 ? 1 : 0;
      if (getRegionOwner(region) !== myRef) return `❌ Operación fallida: Sin control total en la zona.`;
      
      let hasHostileNeighbor = false;
      game.regions.forEach(r => {
         if (areAdjacent(region.id, r.id) && getRegionOwner(r) === opp) hasHostileNeighbor = true;
      });
      if (!hasHostileNeighbor) return `❌ Cancelado: No hay territorio hostil colindante.`;
      
      region.troops[myRef] = (region.troops[myRef] || 0) + 15;
      region.influence[myRef] = 100;
      region.influence[opp] = 0;
      return `🚧 Frontera fortificada en ${region.name}! Defensas aseguradas.`;
    }
  },
  {
    id: 'deploy',
    faction: 'all',
    name: '🪖 Despliegue de Batallón',
    desc: 'Despliega 20 unidades desde tu reserva hacia el mapa táctico.',
    cost: { military: 20 },
    needsRegion: true,
    effect: (game, region, myRef) => {
      region.troops[myRef] = (region.troops[myRef] || 0) + 20;
      return `🪖 Batallón desplegado en ${region.name}.`;
    }
  },
  {
    id: 'combat',
    faction: 'all',
    name: '⚔️ Operación Ofensiva',
    desc: 'Inicia maniobras militares contra unidades enemigas en esta zona.',
    cost: { money: 10 },
    needsRegion: true,
    effect: (game, region, myRef) => {
      return executeCombat(game, region, myRef, myRef === 0 ? 1 : 0);
    }
  },
  {
    id: 'pr',
    faction: 'all',
    name: '📺 Cumbre Geopolítica',
    desc: 'Aumenta tu reputación global significativamente (No requiere mapa).',
    cost: { money: 25 },
    needsRegion: false,
    effect: (game, region, myRef) => {
      game.players[myRef].popularity = Math.min(100, game.players[myRef].popularity + 20);
      return `📺 Discurso nacional mejora el apoyo público global en +20.`;
    }
  },
  {
    id: 'recruit',
    faction: 'all',
    name: '🎯 Reclutamiento Nacional',
    desc: 'Incrementa tu Reserva Militar en 25 usando Presupuesto.',
    cost: { money: 15 },
    needsRegion: false,
    effect: (game, region, myRef) => {
      game.players[myRef].military += 25;
      return `🎯 +25 Soldados añadidos a la reserva de operaciones.`;
    }
  },
  {
    id: 'export',
    faction: 'all',
    name: '🚢 Exportar Materias Primas',
    desc: 'Aprovecha el Mercado Bilateral. Convierte Material/Inteligencia en Dólares.',
    cost: { resources: 15 },
    needsRegion: false,
    effect: (game, region, myRef) => {
      game.players[myRef].money += 30;
      return `🚢 El cargamento zarpó. Intercambio: +$30 de Presupuesto.`;
    }
  },
  {
    id: 'import',
    faction: 'all',
    name: '🔬 Importar Tecnología',
    desc: 'Compra de armamento e Inteligencia a través del Mercado Global.',
    cost: { money: 30 },
    needsRegion: false,
    effect: (game, region, myRef) => {
      game.players[myRef].resources += 20;
      return `🔬 Contenedores recibidos exitosamente. +20 Inteligencia y Tecnologías.`;
    }
  }
];

function executeCombat(game, region, attacker, defender) {
  const myTroops = region.troops[attacker] || 0;
  let oppTroops = region.troops[defender] || 0;
  
  if (myTroops <= 0) return `⚠️ No tienes tropas en esta región.`;
  
  const myRoll = Math.floor(Math.random() * myTroops) + Math.floor(myTroops * 0.5);
  const oppRoll = oppTroops > 0 ? (Math.floor(Math.random() * oppTroops) + Math.floor(oppTroops * 0.5)) : 0;
  
  const casualtiesMe = Math.min(myTroops, Math.floor(Math.random() * (oppRoll || 3)));
  const casualtiesOpp = Math.min(oppTroops, Math.floor(Math.random() * myRoll));
  
  region.troops[attacker] = Math.max(0, myTroops - casualtiesMe);
  region.troops[defender] = Math.max(0, oppTroops - casualtiesOpp);
  
  let resMsg = `⚔️ Combate (${region.name}): Perdiste ${casualtiesMe}, Enemigo perdió ${casualtiesOpp}. `;
  
  if (region.troops[defender] === 0 && oppTroops > 0) {
    region.influence[attacker] = Math.min(100, region.influence[attacker] + 25);
    region.influence[defender] = Math.max(0, region.influence[defender] - 40);
    resMsg += `¡FRENTE ROTO! Enemigo eliminado. Ganas Control.`;
  }
  return resMsg;
}

const MAX_ROUNDS = 12; // Extend to 12 giving time for more complex geopolitics
const ACTIONS_PER_TURN = 2;

export function createGameState(player0Name, player1Name) {
  const regions = REGIONS.map(r => {
    const isP0Start = r.id === 'norte';
    const isP1Start = r.id === 'sur';
    return {
      ...r,
      influence: { 0: isP0Start ? 100 : 0, 1: isP1Start ? 100 : 0 },
      troops: { 0: isP0Start ? 20 : 0, 1: isP1Start ? 20 : 0 }
    };
  });

  return {
    players: [
      { name: 'Federación del Norte', money: 100, popularity: 100, military: 30, resources: 20, inflation: 0, corruption: 0, color: 'blue' },
      { name: 'Alianza del Sur', money: 100, popularity: 100, military: 30, resources: 20, inflation: 0, corruption: 0, color: 'red' },
    ],
    regions,
    ready: { 0: false, 1: false },
    round: 1,
    actionsLeft: { 0: ACTIONS_PER_TURN, 1: ACTIONS_PER_TURN },
    log: [],
    gameOver: false,
    winner: null,
    peaceDuration: 0,
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

export function getActionCost(game, actionId, playerIndex) {
  const action = ACTIONS.find(a => a.id === actionId);
  if (!action) return {};
  const player = game.players[playerIndex];
  const mult = 1 + ((player.inflation || 0) / 100);
  
  return {
    money: action.cost?.money ? Math.ceil(action.cost.money * mult) : 0,
    popularity: action.cost?.popularity || 0,
    resources: action.cost?.resources || 0,
    military: action.cost?.military || 0
  };
}

export function canAfford(game, actionId, playerIndex) {
  if (actionId === 'combat' && game.peaceDuration > 0) return false;
  
  const cost = getActionCost(game, actionId, playerIndex);
  const player = game.players[playerIndex];
  
  return player.money >= cost.money && player.popularity >= cost.popularity && player.resources >= cost.resources && player.military >= cost.military;
}

export function performAction(game, actionId, regionId, playerIndex) {
  const action = ACTIONS.find(a => a.id === actionId);
  if (!action || !canAfford(game, actionId, playerIndex)) return null;
  if (game.actionsLeft[playerIndex] <= 0 || game.ready[playerIndex]) return null;

  const player = game.players[playerIndex];
  const cost = getActionCost(game, actionId, playerIndex);
  
  player.money -= cost.money;
  player.popularity -= cost.popularity;
  player.resources -= cost.resources;
  player.military -= cost.military;

  if (cost.money > 0) {
    player.inflation += cost.money; // Inflación aumenta un % según el dinero gastado
    player.corruption += cost.money * 0.3; // Corrupción aumenta ligeramente
  }

  const region = regionId ? game.regions.find(r => r.id === regionId) : null;
  if (action.needsRegion && !region) return null;

  const message = action.effect(game, region, playerIndex);
  game.actionsLeft[playerIndex] -= 1;

  const logEntry = {
    round: game.round,
    player: playerIndex,
    message,
    timestamp: Date.now(),
  };
  game.log.push(logEntry);

  return logEntry;
}

export function processRoundEnd(game) {
  if (game.gameOver) return;
  if (!game.ready[0] || !game.ready[1]) return;

  game.round += 1;
  
  if (game.peaceDuration > 0) {
    game.peaceDuration -= 1;
    if (game.peaceDuration === 0) {
      game.log.push({ round: game.round, player: -1, message: '🕊️ El tratado de paz ha expirado.', isEvent: true });
    }
  }

  // Passive Economy & Economy Dynamics
  [0, 1].forEach(playerIdx => {
    let player = game.players[playerIdx];
    let turnMoney = 0;
    let turnRes = 0;
    game.regions.forEach(r => {
      if (getRegionOwner(r) === playerIdx) {
        turnMoney += r.prod.money;
        turnRes += r.prod.resources;
      }
    });
    turnMoney += 10;
    turnRes += 5;
    
    // Inflation cool-down
    if (player.inflation > 0) {
      player.inflation = Math.max(0, player.inflation - 15);
    }
    // Corruption penalty
    if (player.corruption > 30) {
      const cPenalty = Math.floor((player.corruption - 30) / 10);
      if (cPenalty > 0) {
         player.popularity = Math.max(0, player.popularity - cPenalty);
         game.log.push({ round: game.round, player: playerIdx, message: `📉 La extrema Corrupción cuesta ${cPenalty} Reputación a ${player.name}.`, isEvent: true });
      }
    }

    player.money += turnMoney;
    player.resources += turnRes;
  });

  game.log.push({ round: game.round, player: -1, message: '🏦 Economía: Operaciones financieras procesadas.', isEvent: true });
  game.lastEvent = triggerRandomEvent(game);

  // Reset Simultaneous state
  game.ready = { 0: false, 1: false };
  game.actionsLeft = { 0: ACTIONS_PER_TURN, 1: ACTIONS_PER_TURN };

  // Immediate win conditions
  if (game.players[0].popularity <= 0 && game.players[1].popularity <= 0) {
    game.gameOver = true;
    game.winner = determineWinner(game);
  } else if (game.players[0].popularity <= 0) {
    game.gameOver = true;
    game.winner = 1;
  } else if (game.players[1].popularity <= 0) {
    game.gameOver = true;
    game.winner = 0;
  } else if (game.round > MAX_ROUNDS) {
    game.gameOver = true;
    game.winner = determineWinner(game);
  }
}

// ===== RANDOM EVENTS =====
const RANDOM_EVENTS = [
  {
    name: '📉 Devaluación Global',
    desc: 'Los mercados caen bruscamente. Cuesta dinero a la superpotencia.',
    effect: (game) => {
      const target = game.players[0].money >= game.players[1].money ? 0 : 1;
      const loss = Math.floor(game.players[target].money * 0.3);
      game.players[target].money = Math.max(0, game.players[target].money - loss);
      return `El Banco Central falló. ${game.players[target].name} pierde $${loss}`;
    }
  },
  {
    name: '🚀 Avance Tecnológico',
    desc: 'Se descubre un nuevo filón. Ambos jugadores ganan recursos masivos.',
    effect: (game) => {
      const bonus = 30 + Math.floor(Math.random() * 20);
      game.players[0].resources += bonus;
      game.players[1].resources += bonus;
      return `Boom tecnológico: Ambos ganan +${bonus} Recursos`;
    }
  },
  {
    name: '🪧 Rebelión Civil',
    desc: 'Una región neutraliza su influencia debido a una fuerte insurrección civil.',
    effect: (game) => {
      const region = game.regions[Math.floor(Math.random() * game.regions.length)];
      region.influence[0] = Math.floor(region.influence[0] * 0.5);
      region.influence[1] = Math.floor(region.influence[1] * 0.5);
      return `Rebelión en ${region.name}: la influencia de ambos bandos se redujo a la mitad.`;
    }
  },
  {
    name: '🏅 General Heroico',
    desc: 'Un general famoso se une al jugador con menos poder armamentístico.',
    effect: (game) => {
      const target = game.players[0].military <= game.players[1].military ? 0 : 1;
      const boost = 25 + Math.floor(Math.random() * 15);
      game.players[target].military = Math.min(100, game.players[target].military + boost);
      return `Llegada de héroe: ${game.players[target].name} obtiene +${boost} Ejército gratuitamente`;
    }
  },
  null, null, null // 3/7 chance of blank event
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
  if (game.players[0].popularity <= 0) return 1; // Insurgency wins
  
  const r0 = countRegions(game, 0);
  const r1 = countRegions(game, 1);
  if (r0 > r1) return 0; // Government stabilizes majority
  if (r1 > r0) return 1; // Insurgency controls majority
  
  // tiebreaker
  if (game.players[0].popularity > game.players[1].popularity) return 0;
  return 1;
}

export function getTotalScore(game, playerIndex) {
  const regions = countRegions(game, playerIndex);
  const pop = game.players[playerIndex].popularity;
  const assets = Math.floor((game.players[playerIndex].money + game.players[playerIndex].military + game.players[playerIndex].resources) / 10);
  return (regions * 20) + pop + assets;
}
