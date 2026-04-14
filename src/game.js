/**
 * PODER & GLORIA — Game Engine
 * Manages all game state, regions, resources, and turn logic.
 * Geopolitics Edition: Trade, War, Resources, Peace Treaties.
 */

const REGIONS = [
  { id: 'capital',    name: 'La Capital',        population: 12, icon: '🏛️', prod: { money: 12, resources: 2 } },
  { id: 'norte',      name: 'Región Norte',      population: 8,  icon: '🏔️', prod: { money: 4, resources: 10 } },
  { id: 'sur',        name: 'Región Sur',        population: 7,  icon: '🌾', prod: { money: 6, resources: 8 } },
  { id: 'costa',      name: 'Costa Dorada',      population: 9,  icon: '🏖️', prod: { money: 15, resources: 0 } },
  { id: 'industrial', name: 'Zona Industrial',   population: 10, icon: '🏭', prod: { money: 8, resources: 15 } },
  { id: 'frontera',   name: 'La Frontera',       population: 6,  icon: '🛡️', prod: { money: 4, resources: 5 } },
  { id: 'selva',      name: 'Selva Profunda',    population: 5,  icon: '🌿', prod: { money: 2, resources: 12 } },
  { id: 'desierto',   name: 'El Desierto',       population: 4,  icon: '🏜️', prod: { money: 5, resources: 8 } },
  { id: 'islas',      name: 'Las Islas',         population: 3,  icon: '🏝️', prod: { money: 10, resources: 2 } },
];

const ACTIONS = [
  {
    id: 'campaign',
    name: '📢 Campaña Política',
    desc: 'Haz campaña pacífica en una región para ganar influencia civil.',
    cost: { money: 10 },
    needsRegion: true,
    effect: (game, region) => {
      const amount = 12 + Math.floor(Math.random() * 8);
      region.influence[game.currentTurn] = Math.min(100, (region.influence[game.currentTurn] || 0) + amount);
      return `📢 Campaña en ${region.name}: +${amount} influencia`;
    }
  },
  {
    id: 'propaganda',
    name: '📺 Propaganda Global',
    desc: 'Medios masivos para ganar apoyo popular nacional.',
    cost: { money: 15, resources: 5 },
    needsRegion: false,
    effect: (game) => {
      const amount = 10 + Math.floor(Math.random() * 5);
      game.players[game.currentTurn].popularity = Math.min(100, game.players[game.currentTurn].popularity + amount);
      return `📺 Propaganda lanzada: +${amount}% popularidad`;
    }
  },
  {
    id: 'bribe',
    name: '💰 Corrupción Regional',
    desc: 'Paga para desestabilizar la influencia rival en una zona.',
    cost: { money: 30 },
    needsRegion: true,
    effect: (game, region) => {
      const opp = game.currentTurn === 0 ? 1 : 0;
      const stolen = Math.min(region.influence[opp] || 0, 15 + Math.floor(Math.random() * 10));
      region.influence[opp] = Math.max(0, (region.influence[opp] || 0) - stolen);
      region.influence[game.currentTurn] = Math.min(100, (region.influence[game.currentTurn] || 0) + Math.floor(stolen * 0.5));
      return `💰 Corrupción en ${region.name}: -${stolen} rival, +${Math.floor(stolen * 0.5)} tuyo`;
    }
  },
  {
    id: 'military_build',
    name: '🛡️ Armamentismo',
    desc: 'Convierte tus recursos en poderío militar para atacar.',
    cost: { money: 10, resources: 20 },
    needsRegion: false,
    effect: (game) => {
      const pts = 15 + Math.floor(Math.random() * 10);
      game.players[game.currentTurn].military = Math.min(100, game.players[game.currentTurn].military + pts);
      return `🛡️ Armamentismo: +${pts} poder militar equipado`;
    }
  },
  {
    id: 'deploy_troops',
    name: '🪖 Despliegue de Tropas',
    desc: 'Usa 20 Ejército Global para establecer un Campamento de 20 Tropas en una región.',
    cost: { military: 20 },
    needsRegion: true,
    effect: (game, region) => {
      region.troops[game.currentTurn] = (region.troops[game.currentTurn] || 0) + 20;
      return `🪖 20 Unidades desplegadas en ${region.name}.`;
    }
  },
  {
    id: 'combat',
    name: '⚔️ Lanzar Ofensiva',
    desc: 'Ordena a tus tropas atacar. Cuesta popularidad. Si destruyes al enemigo, ganas su territorio.',
    cost: { money: 10, popularity: 2 },
    needsRegion: true,
    effect: (game, region) => {
      if (game.peaceDuration > 0) return `⚠️ Ofensiva fallida: Tratado de paz vigente.`;
      
      const opp = game.currentTurn === 0 ? 1 : 0;
      const myTroops = region.troops[game.currentTurn] || 0;
      let oppTroops = region.troops[opp] || 0;
      
      if (myTroops <= 0) return `⚠️ No tienes tropas desplegadas en esta región para iniciar una ofensiva.`;
      
      // Roll dice for combat casualties
      const myRoll = Math.floor(Math.random() * myTroops) + Math.floor(myTroops * 0.5);
      const oppRoll = oppTroops > 0 ? (Math.floor(Math.random() * oppTroops) + Math.floor(oppTroops * 0.5)) : 0;
      
      const casualtiesMe = Math.min(myTroops, Math.floor(Math.random() * (oppRoll || 3)));
      const casualtiesOpp = Math.min(oppTroops, Math.floor(Math.random() * myRoll));
      
      region.troops[game.currentTurn] = Math.max(0, myTroops - casualtiesMe);
      region.troops[opp] = Math.max(0, oppTroops - casualtiesOpp);
      
      let resMsg = `⚔️ Ofensiva en ${region.name}: Bajas propias (${casualtiesMe}), Bajas enemigas (${casualtiesOpp}). `;
      
      if (region.troops[opp] === 0 && oppTroops > 0) {
        region.influence[game.currentTurn] = Math.min(100, region.influence[game.currentTurn] + 25);
        region.influence[opp] = Math.max(0, region.influence[opp] - 40);
        resMsg += `¡VICTORIA! Enemigo erradicado. Ganas 25% influencia local.`;
      } else if (region.troops[opp] === 0) {
        region.influence[game.currentTurn] = Math.min(100, region.influence[game.currentTurn] + 15);
        resMsg += `Ocupación pacífica (+15% influencia local).`;
      } else {
        resMsg += `El frente se mantiene activo.`;
      }
      return resMsg;
    }
  },
  {
    id: 'peace_treaty',
    name: '🕊️ Imponer Tregua',
    desc: 'La ONU obliga a un cese al fuego por 2 rondas. Nadie puede invadir.',
    cost: { money: 25, popularity: 10 },
    needsRegion: false,
    effect: (game) => {
      game.peaceDuration = 2;
      return `🕊️ Tregua Internacional firmada. Prohibido invadir por 2 rondas.`;
    }
  },
  {
    id: 'trade',
    name: '📦 Tratado Comercial',
    desc: 'Vende tus reservas de recursos en el mercado global por oro.',
    cost: { resources: 30 },
    needsRegion: false,
    effect: (game) => {
      const gold = 40 + Math.floor(Math.random() * 20);
      game.players[game.currentTurn].money += gold;
      return `📦 Comercio exitoso: 30 Recursos exportados por $${gold}`;
    }
  },
  {
    id: 'mine',
    name: '⛏️ Explotación Intensiva',
    desc: 'Sacrifica algo de popularidad para extraer recursos rápidamente.',
    cost: { popularity: 5 },
    needsRegion: false,
    effect: (game) => {
      const res = 25 + Math.floor(Math.random() * 15);
      game.players[game.currentTurn].resources += res;
      return `⛏️ Explotación intensiva: +${res} recursos extraídos.`;
    }
  },
  {
    id: 'embargo',
    name: '🛑 Embargo Económico',
    desc: 'Sanciona fuertemente la economía y recursos del enemigo.',
    cost: { money: 40, popularity: 10 },
    needsRegion: false,
    effect: (game) => {
      const opp = game.currentTurn === 0 ? 1 : 0;
      const resDamage = 30 + Math.floor(Math.random() * 20);
      const moneyDamage = 20 + Math.floor(Math.random() * 15);
      
      game.players[opp].resources = Math.max(0, game.players[opp].resources - resDamage);
      game.players[opp].money = Math.max(0, game.players[opp].money - moneyDamage);
      
      return `🛑 Sanciones al enemigo: Pierden $${moneyDamage} y ${resDamage} Recursos.`;
    }
  }
];

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
      { name: player0Name, money: 60, popularity: 50, military: 10, resources: 20, color: 'gold' },
      { name: player1Name, money: 60, popularity: 50, military: 10, resources: 20, color: 'blue' },
    ],
    regions,
    currentTurn: 0,      // 0 or 1
    round: 1,
    actionsLeft: ACTIONS_PER_TURN,
    log: [],
    gameOver: false,
    winner: null,
    peaceDuration: 0,    // rounds left of forced peace
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
  
  const m = action.cost?.money || 0;
  const p = action.cost?.popularity || 0;
  const r = action.cost?.resources || 0;
  const mil = action.cost?.military || 0;
  
  if (actionId === 'combat' && game.peaceDuration > 0) return false; // Peace treaties block combat
  
  return player.money >= m && player.popularity >= p && player.resources >= r && player.military >= mil;
}

export function performAction(game, actionId, regionId) {
  const action = ACTIONS.find(a => a.id === actionId);
  if (!action || !canAfford(game, actionId)) return null;
  if (game.actionsLeft <= 0) return null;

  const player = game.players[game.currentTurn];
  player.money -= (action.cost?.money || 0);
  player.popularity -= (action.cost?.popularity || 0);
  player.resources -= (action.cost?.resources || 0);
  player.military -= (action.cost?.military || 0);

  const region = regionId ? game.regions.find(r => r.id === regionId) : null;
  if (action.needsRegion && !region) return null;

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
  if (game.gameOver) return;

  // Process end of round if it was player 1's turn
  if (game.currentTurn === 1) {
    game.round += 1;
    
    // Decrement peace duration
    if (game.peaceDuration > 0) {
      game.peaceDuration -= 1;
      if (game.peaceDuration === 0) {
        game.log.push({ round: game.round, player: -1, message: '🕊️ El tratado de paz ha expirado. Hay riesgo de invasiones.', isEvent: true });
      }
    }

    // Passive Economy: compute yields based on controlled regions
    [0, 1].forEach(playerIdx => {
      let turnMoney = 0;
      let turnRes = 0;
      game.regions.forEach(r => {
        if (getRegionOwner(r) === playerIdx) {
          turnMoney += r.prod.money;
          turnRes += r.prod.resources;
        }
      });
      
      // Minimum passive income
      turnMoney += 10;
      turnRes += 5;
      
      game.players[playerIdx].money += turnMoney;
      game.players[playerIdx].resources += turnRes;
    });

    game.log.push({ round: game.round, player: -1, message: '🏦 Economía: Recursos y dinero recaudados por territorios.', isEvent: true });
    
    game.lastEvent = triggerRandomEvent(game);
  }

  game.currentTurn = game.currentTurn === 0 ? 1 : 0;
  game.actionsLeft = ACTIONS_PER_TURN;

  if (game.round > MAX_ROUNDS) {
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
  const r0 = countRegions(game, 0);
  const r1 = countRegions(game, 1);
  if (r0 > r1) return 0;
  if (r1 > r0) return 1;
  // tiebreaker: popularity
  if (game.players[0].popularity > game.players[1].popularity) return 0;
  if (game.players[1].popularity > game.players[0].popularity) return 1;
  // money + resources + military tiebreaker
  const v0 = game.players[0].money + game.players[0].resources + game.players[0].military;
  const v1 = game.players[1].money + game.players[1].resources + game.players[1].military;
  return v0 >= v1 ? 0 : 1;
}

export function getTotalScore(game, playerIndex) {
  const regions = countRegions(game, playerIndex);
  const pop = game.players[playerIndex].popularity;
  const assets = Math.floor((game.players[playerIndex].money + game.players[playerIndex].military + game.players[playerIndex].resources) / 10);
  return (regions * 20) + pop + assets;
}
